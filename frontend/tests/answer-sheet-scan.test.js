// T48 — teste de ponta a ponta do leitor de marcações (OMR).
// Gera a "foto" de uma folha preenchida a partir do layout compartilhado
// (shared/folhaRespostasLayout.js), aplicando perspectiva e ruído como uma
// câmera de celular faria, e confere se lerRespostasDaFolha devolve as
// respostas marcadas, as em branco e as com dupla marcação. Também mede o
// tempo de leitura de uma folha (RNF08).
import { describe, expect, it } from "vitest";
import layout from "../../shared/folhaRespostasLayout.js";
import { aplicarHomografia, criarHomografia, lerRespostasDaFolha } from "../src/utils/answerSheetScan";

const { PAGE, QR, BUBBLE_GRID, MARKERS } = layout;

// Espessura do contorno da bolha no PDF (pdfkit: 1pt ≈ 0,35mm, cor #777777).
const OUTLINE_MM = 0.35;
const OUTLINE_GRAY = 0x77;
const FILL_GRAY = 45;
const FILL_RADIUS_MM = BUBBLE_GRID.bubbleDiameterMm / 2 - 0.1;

// Gerador pseudoaleatório com semente, para o teste ser determinístico.
function criarAleatorio(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

// Cantos da página A4 (em pixels) na foto: um trapézio, como uma folha
// fotografada levemente de lado e de cima.
function cantosDaPaginaNaFoto(width, height, skew) {
  return [
    [width * 0.08 + skew, height * 0.05],
    [width * 0.92 - skew * 0.4, height * 0.07],
    [width * 0.95, height * 0.96],
    [width * 0.04, height * 0.93]
  ];
}

// Rótulo "Qn:" impresso em negrito à esquerda da bolha A: simulado como
// traços escuros, para o teste pegar leituras que caiam sobre o texto.
function noRotulo(point, questionCount) {
  for (let questionIndex = 0; questionIndex < questionCount; questionIndex++) {
    const row = layout.obterPosicaoQuestao(questionIndex);
    const insideX = point.x >= row.xMm && point.x <= row.xMm + 5.5;
    const insideY = point.y >= row.yMm + 1 && point.y <= row.yMm + 3.6;
    if (insideX && insideY) return Math.floor(point.x * 2.5) % 2 === 0;
  }
  return false;
}

// marks: array por questão com os índices das alternativas preenchidas.
// qrError: erro, em milímetros, nos cantos do QR devolvidos pelo jsQR.
// markers: false gera a folha antiga, sem os quadrados de leitura.
function gerarFotoDaFolha({ width, height, marks, skew = 40, noise = 18, seed = 7, qrError = 0, markers = true }) {
  const pageCorners = [[0, 0], [PAGE.widthMm, 0], [PAGE.widthMm, PAGE.heightMm], [0, PAGE.heightMm]];
  const photoCorners = cantosDaPaginaNaFoto(width, height, skew);
  const photoToPage = criarHomografia(photoCorners, pageCorners);
  const pageToPhoto = criarHomografia(pageCorners, photoCorners);

  const bubbles = [];
  marks.forEach((marked, questionIndex) => {
    for (let alternative = 0; alternative < BUBBLE_GRID.alternatives.length; alternative++) {
      const center = layout.obterPosicaoBolha(questionIndex, alternative);
      bubbles.push({ ...center, filled: marked.includes(alternative) });
    }
  });

  const radius = BUBBLE_GRID.bubbleDiameterMm / 2;
  const reach = radius + OUTLINE_MM;
  const gridBox = bubbles.reduce((box, bubble) => ({
    minX: Math.min(box.minX, bubble.xMm - reach),
    maxX: Math.max(box.maxX, bubble.xMm + reach),
    minY: Math.min(box.minY, bubble.yMm - reach),
    maxY: Math.max(box.maxY, bubble.yMm + reach)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const random = criarAleatorio(seed);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Fundo da mesa (escuro) fora da folha, papel levemente acinzentado dentro.
      let gray = 70;
      const point = aplicarHomografia(photoToPage, x, y);
      if (point && point.x >= 0 && point.x <= PAGE.widthMm && point.y >= 0 && point.y <= PAGE.heightMm) {
        gray = 235;
        const inQr = point.x >= QR.xMm && point.x <= QR.xMm + QR.sizeMm && point.y >= QR.yMm && point.y <= QR.yMm + QR.sizeMm;
        if (inQr) gray = (Math.floor(point.x) + Math.floor(point.y)) % 2 ? 20 : 235;
        if (markers && MARKERS.some((m) => point.x >= m.xMm && point.x <= m.xMm + m.sizeMm && point.y >= m.yMm && point.y <= m.yMm + m.sizeMm)) gray = 15;
        if (noRotulo(point, marks.length)) gray = 30;
        const inGrid = point.x >= gridBox.minX && point.x <= gridBox.maxX && point.y >= gridBox.minY && point.y <= gridBox.maxY;
        for (const bubble of inGrid ? bubbles : []) {
          const distance = Math.hypot(point.x - bubble.xMm, point.y - bubble.yMm);
          if (distance > reach) continue;
          if (bubble.filled && distance <= FILL_RADIUS_MM) gray = FILL_GRAY;
          else if (Math.abs(distance - radius) <= OUTLINE_MM / 2) gray = Math.min(gray, OUTLINE_GRAY);
          break;
        }
      }
      const value = gray + (random() - 0.5) * 2 * noise;
      const offset = (y * width + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }

  // Cantos do QR na foto, no formato que o jsQR devolve em qr.location. O
  // jsQR estima esses cantos a partir dos padrões de localização e costuma
  // errar alguns pixels; qrError reproduz isso empurrando cada canto.
  const qrCorner = (xMm, yMm, dx, dy) => aplicarHomografia(pageToPhoto, xMm + dx * qrError, yMm + dy * qrError);
  const qrLocation = {
    topLeftCorner: qrCorner(QR.xMm, QR.yMm, 1, 0.5),
    topRightCorner: qrCorner(QR.xMm + QR.sizeMm, QR.yMm, 0.5, -1),
    bottomRightCorner: qrCorner(QR.xMm + QR.sizeMm, QR.yMm + QR.sizeMm, -1, 0.5),
    bottomLeftCorner: qrCorner(QR.xMm, QR.yMm + QR.sizeMm, 0.5, 1)
  };
  return { data, qrLocation };
}

// 20 questões: a maioria com uma marcação, algumas em branco e algumas duplas.
const GABARITO_PREENCHIDO = [
  [0], [1], [2], [3], [4], [], [2], [0, 3], [1], [4],
  [3], [0], [], [1, 2], [4], [2], [0], [3], [1], [4]
];

function esperado(marks) {
  return marks.map((marked) => {
    if (!marked.length) return { status: "blank", markedIndex: null };
    if (marked.length > 1) return { status: "multiple", markedIndex: null };
    return { status: "marked", markedIndex: marked[0] };
  });
}

function resumo(answers) {
  return answers.map(({ status, markedIndex }) => ({ status, markedIndex }));
}

describe("leitor OMR com folha sintética (T48)", () => {
  it("lê marcadas, em branco e duplas numa foto em perspectiva (720x1280)", () => {
    const width = 720;
    const height = 1280;
    const { data, qrLocation } = gerarFotoDaFolha({ width, height, marks: GABARITO_PREENCHIDO });
    const answers = lerRespostasDaFolha(data, width, height, qrLocation, GABARITO_PREENCHIDO.length);
    expect(resumo(answers)).toEqual(esperado(GABARITO_PREENCHIDO));
  });

  it("lê a mesma folha em outra resolução e inclinação (1080x1920)", () => {
    const width = 1080;
    const height = 1920;
    const { data, qrLocation } = gerarFotoDaFolha({ width, height, marks: GABARITO_PREENCHIDO, skew: 90, seed: 42 });
    const answers = lerRespostasDaFolha(data, width, height, qrLocation, GABARITO_PREENCHIDO.length);
    expect(resumo(answers)).toEqual(esperado(GABARITO_PREENCHIDO));
  });

  it("não confunde o contorno impresso de bolhas vazias com marcação", () => {
    const vazia = Array.from({ length: 20 }, () => []);
    const width = 720;
    const height = 1280;
    const { data, qrLocation } = gerarFotoDaFolha({ width, height, marks: vazia, seed: 3 });
    const answers = lerRespostasDaFolha(data, width, height, qrLocation, vazia.length);
    expect(answers.every((answer) => answer.status === "blank")).toBe(true);
  });

  it("lê só a quantidade de questões da prova", () => {
    const width = 720;
    const height = 1280;
    const { data, qrLocation } = gerarFotoDaFolha({ width, height, marks: GABARITO_PREENCHIDO });
    expect(lerRespostasDaFolha(data, width, height, qrLocation, 5)).toHaveLength(5);
    expect(lerRespostasDaFolha(data, width, height, null, 5)).toBeNull();
  });

  // Reproduz a leitura errada da folha impressa: com os cantos do QR
  // imprecisos, a posição prevista das bolhas caía sobre o rótulo "Qn:" e quase
  // tudo era lido como A. Os marcadores ao redor da grade corrigem isso.
  it("lê corretamente mesmo com os cantos do QR imprecisos", () => {
    const marks = [[4], [4], [0], [2], [0], [2], [2], [1], [4], [0]];
    const width = 1080;
    const height = 1920;
    const { data, qrLocation } = gerarFotoDaFolha({ width, height, marks, skew: 60, seed: 11, qrError: 1.5 });
    const answers = lerRespostasDaFolha(data, width, height, qrLocation, marks.length);
    expect(resumo(answers)).toEqual(esperado(marks));
  });

  it("não lê respostas quando os marcadores da grade não aparecem na imagem", () => {
    const width = 720;
    const height = 1280;
    const { data, qrLocation } = gerarFotoDaFolha({ width, height, marks: GABARITO_PREENCHIDO, markers: false });
    expect(lerRespostasDaFolha(data, width, height, qrLocation, GABARITO_PREENCHIDO.length)).toBeNull();
  });

  it("lê uma folha de 20 questões em menos de 100 ms (RNF08)", () => {
    const width = 1080;
    const height = 1920;
    const { data, qrLocation } = gerarFotoDaFolha({ width, height, marks: GABARITO_PREENCHIDO });
    const runs = 20;
    const start = performance.now();
    for (let run = 0; run < runs; run++) {
      lerRespostasDaFolha(data, width, height, qrLocation, GABARITO_PREENCHIDO.length);
    }
    const perSheetMs = (performance.now() - start) / runs;
    console.info(`[T48] leitura das bolhas: ${perSheetMs.toFixed(2)} ms por folha (1080x1920, 20 questões)`);
    expect(perSheetMs).toBeLessThan(100);
  });
});

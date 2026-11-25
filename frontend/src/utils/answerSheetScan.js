// Import default: o módulo compartilhado é CommonJS. Com "import * as", o build
// de produção do Vite entrega um namespace vazio (layout.QR fica undefined) e a
// leitura quebra assim que o QR é encontrado.
import layout from "../../../shared/folhaRespostasLayout.js";

function solveLinearSystem(matrix, values) {
  const size = values.length;
  const augmented = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-12) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    for (let item = column; item <= size; item++) augmented[column][item] /= divisor;
    for (let row = 0; row < size; row++) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let item = column; item <= size; item++) augmented[row][item] -= factor * augmented[column][item];
    }
  }
  return augmented.map((row) => row[size]);
}

export function criarHomografia(sourcePoints, destinationPoints) {
  if (sourcePoints.length !== 4 || destinationPoints.length !== 4) return null;
  const matrix = [];
  const values = [];
  for (let index = 0; index < 4; index++) {
    const [x, y] = sourcePoints[index];
    const [u, v] = destinationPoints[index];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    values.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    values.push(v);
  }
  const coefficients = solveLinearSystem(matrix, values);
  if (!coefficients) return null;
  return [...coefficients, 1];
}

export function aplicarHomografia(homography, x, y) {
  const [h0, h1, h2, h3, h4, h5, h6, h7, h8] = homography;
  const divisor = h6 * x + h7 * y + h8;
  if (Math.abs(divisor) < 1e-12) return null;
  return {
    x: (h0 * x + h1 * y + h2) / divisor,
    y: (h3 * x + h4 * y + h5) / divisor
  };
}

function luminanceAt(imageData, width, height, x, y) {
  const px = Math.max(0, Math.min(width - 1, Math.round(x)));
  const py = Math.max(0, Math.min(height - 1, Math.round(y)));
  const offset = (py * width + px) * 4;
  const r = imageData[offset];
  const g = imageData[offset + 1];
  const b = imageData[offset + 2];
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function cornersOf(xMm, yMm, sizeMm) {
  return [[xMm, yMm], [xMm + sizeMm, yMm], [xMm + sizeMm, yMm + sizeMm], [xMm, yMm + sizeMm]];
}

// Estimativa inicial página → foto a partir do QR. É uma transformação afim
// (sem perspectiva) ajustada por mínimos quadrados aos quatro cantos: o QR tem
// só 30mm, e uma perspectiva calculada a partir dele amplifica qualquer erro
// dos cantos à medida que se afasta. A afim erra pouco e de forma previsível,
// o suficiente para achar os marcadores, que dão a medida precisa.
function qrHomography(qrLocation) {
  const source = cornersOf(layout.QR.xMm, layout.QR.yMm, layout.QR.sizeMm);
  const target = [qrLocation.topLeftCorner, qrLocation.topRightCorner, qrLocation.bottomRightCorner, qrLocation.bottomLeftCorner];
  if (target.some((point) => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y))) return null;
  const normal = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const rhsX = [0, 0, 0];
  const rhsY = [0, 0, 0];
  source.forEach(([x, y], index) => {
    const row = [x, y, 1];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) normal[i][j] += row[i] * row[j];
      rhsX[i] += row[i] * target[index].x;
      rhsY[i] += row[i] * target[index].y;
    }
  });
  const rowX = solveLinearSystem(normal, rhsX);
  const rowY = solveLinearSystem(normal, rhsY);
  if (!rowX || !rowY) return null;
  return [...rowX, ...rowY, 0, 0, 1];
}

// Pixels por milímetro na região de um ponto, medidos pela própria homografia.
function pixelsPerMm(homography, xMm, yMm) {
  const origin = aplicarHomografia(homography, xMm, yMm);
  const right = aplicarHomografia(homography, xMm + 1, yMm);
  const down = aplicarHomografia(homography, xMm, yMm + 1);
  if (!origin || !right || !down) return 0;
  return (Math.hypot(right.x - origin.x, right.y - origin.y) + Math.hypot(down.x - origin.x, down.y - origin.y)) / 2;
}

// Procura um marcador quadrado e preto perto da posição prevista. Usa uma
// imagem integral da janela para testar todas as posições de uma caixa do
// tamanho do marcador e devolve o centro da caixa mais escura.
export function localizarMarcador(imageData, width, height, expected, markerPx, searchPx) {
  const box = Math.max(3, Math.round(markerPx));
  const x0 = Math.max(0, Math.floor(expected.x - searchPx));
  const y0 = Math.max(0, Math.floor(expected.y - searchPx));
  const x1 = Math.min(width, Math.ceil(expected.x + searchPx));
  const y1 = Math.min(height, Math.ceil(expected.y + searchPx));
  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= box || h <= box) return null;

  const lum = new Float32Array(w * h);
  let sum = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const value = luminanceAt(imageData, width, height, x0 + x, y0 + y);
      lum[y * w + x] = value;
      sum += value;
    }
  }
  // Papel: brilho de referência da janela. Usa um percentil alto para não ser
  // puxado para baixo por textos, linhas e pelo próprio marcador.
  const sorted = Array.from(lum).sort((a, b) => a - b);
  const paper = sorted[Math.floor(sorted.length * 0.9)] || sum / lum.length;
  const darkLimit = paper * 0.55;

  const integral = new Uint32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += lum[y * w + x] < darkLimit ? 1 : 0;
      integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + row;
    }
  }
  let best = { fill: 0, x: 0, y: 0 };
  const area = box * box;
  for (let y = 0; y + box <= h; y++) {
    for (let x = 0; x + box <= w; x++) {
      const dark = integral[(y + box) * (w + 1) + x + box] - integral[y * (w + 1) + x + box]
        - integral[(y + box) * (w + 1) + x] + integral[y * (w + 1) + x];
      const fill = dark / area;
      if (fill > best.fill) best = { fill, x, y };
    }
  }
  // O marcador é sólido. Texto, linhas e bolhas preenchidas (redondas e
  // menores) não chegam a esse preenchimento.
  if (best.fill < 0.7) return null;

  // Centro do componente escuro na caixa encontrada, para precisão subpixel.
  let cx = 0;
  let cy = 0;
  let count = 0;
  for (let y = best.y; y < best.y + box; y++) {
    for (let x = best.x; x < best.x + box; x++) {
      if (lum[y * w + x] < darkLimit) {
        cx += x;
        cy += y;
        count++;
      }
    }
  }
  return { x: x0 + cx / count + 0.5, y: y0 + cy / count + 0.5, fill: best.fill };
}

// Homografia página (mm) → foto (px) a partir dos quatro marcadores da grade.
// Devolve null se algum marcador não estiver visível.
export function homografiaDosMarcadores(imageData, width, height, qrLocation) {
  const coarse = qrHomography(qrLocation);
  if (!coarse) return null;
  const found = [];
  for (const marker of layout.MARKERS) {
    const centerMm = { x: marker.xMm + marker.sizeMm / 2, y: marker.yMm + marker.sizeMm / 2 };
    const expected = aplicarHomografia(coarse, centerMm.x, centerMm.y);
    const scale = pixelsPerMm(coarse, centerMm.x, centerMm.y);
    if (!expected || !scale) return null;
    // A previsão pelo QR erra alguns milímetros longe dele; a janela cobre isso
    // sem alcançar o marcador vizinho, que fica a 37mm.
    const point = localizarMarcador(imageData, width, height, expected, marker.sizeMm * scale, 16 * scale);
    if (!point) return null;
    found.push({ mm: [centerMm.x, centerMm.y], px: [point.x, point.y] });
  }
  return criarHomografia(found.map((item) => item.mm), found.map((item) => item.px));
}

// Preenchimento de uma bolha entre 0 (papel) e 1 (tinta), medido só no miolo
// da bolha para não contar o contorno impresso.
function preenchimentoBolha(imageData, width, height, center, innerRadiusPx, paper) {
  let total = 0;
  let count = 0;
  const r = Math.max(1, innerRadiusPx);
  const steps = Math.max(2, Math.ceil(r));
  for (let dy = -steps; dy <= steps; dy++) {
    for (let dx = -steps; dx <= steps; dx++) {
      const x = (dx / steps) * r;
      const y = (dy / steps) * r;
      if (x * x + y * y > r * r) continue;
      total += luminanceAt(imageData, width, height, center.x + x, center.y + y);
      count++;
    }
  }
  if (!count || !paper) return 0;
  return Math.max(0, Math.min(1, 1 - total / count / paper));
}

export function pontuacaoBolha(imageData, width, height, center, radius) {
  let dark = 0;
  let total = 0;
  const pixelRadius = Math.max(2, radius);
  for (let y = -pixelRadius; y <= pixelRadius; y++) {
    for (let x = -pixelRadius; x <= pixelRadius; x++) {
      if (x * x + y * y > pixelRadius * pixelRadius) continue;
      const luminance = luminanceAt(imageData, width, height, center.x + x, center.y + y);
      if (luminance < 170) dark++;
      total++;
    }

  }
  return total ? dark / total : 0;
}

// scores: preenchimento de cada alternativa, de 0 (vazia) a 1 (totalmente
// preenchida). Uma marcação precisa ser clara e não pode ter uma segunda
// alternativa quase tão escura quanto ela.
export const LIMITE_MARCACAO = 0.3;

export function classificarMarcacao(scores) {
  const ordered = [...scores].sort((a, b) => b - a);
  const top = ordered[0] ?? 0;
  const second = ordered[1] ?? 0;
  const markedIndex = scores.indexOf(top);
  if (top < LIMITE_MARCACAO) {
    return { markedIndex: null, status: "blank", confidence: top };
  }
  if (second >= LIMITE_MARCACAO && second >= top * 0.6) {
    return { markedIndex: null, status: "multiple", confidence: top - second };
  }
  return { markedIndex, status: "marked", confidence: top - second };
}

// Brilho do papel na linha da questão, medido nos espaços entre as bolhas.
// Compensa sombras e variações de luz ao longo da folha.
function brilhoDoPapelNaLinha(imageData, width, height, homography, questionIndex, samplePx) {
  const grid = layout.BUBBLE_GRID;
  const first = layout.obterPosicaoBolha(questionIndex, 0);
  const points = [];
  for (let index = 0; index < grid.alternatives.length; index++) {
    points.push([first.xMm + (index + 0.5) * grid.bubbleSpacingMm, first.yMm]);
  }
  let paper = 0;
  for (const [xMm, yMm] of points) {
    const center = aplicarHomografia(homography, xMm, yMm);
    if (!center) continue;
    let total = 0;
    let count = 0;
    for (let dy = -samplePx; dy <= samplePx; dy++) {
      for (let dx = -samplePx; dx <= samplePx; dx++) {
        total += luminanceAt(imageData, width, height, center.x + dx, center.y + dy);
        count++;
      }
    }
    paper = Math.max(paper, total / count);
  }
  return paper;
}

// Lê as marcações da folha. Devolve null quando a área de respostas não está
// inteira na imagem (QR ausente ou algum dos quatro marcadores não encontrado),
// para que a câmera continue tentando em vez de registrar uma leitura errada.
export function lerRespostasDaFolha(imageData, width, height, qrLocation, questionCount) {
  if (!qrLocation || !questionCount) return null;
  const homography = homografiaDosMarcadores(imageData, width, height, qrLocation);
  if (!homography) return null;

  const grid = layout.BUBBLE_GRID;
  const reference = layout.obterPosicaoBolha(0, 0);
  const scale = pixelsPerMm(homography, reference.xMm, reference.yMm);
  // Bolhas com menos de ~6px de diâmetro não dão uma leitura confiável:
  // a folha está longe ou fora de foco.
  if (scale * grid.bubbleDiameterMm < 6) return null;
  const innerRadiusPx = (grid.bubbleDiameterMm / 2) * scale * 0.6;
  const samplePx = Math.max(1, Math.round(scale * 0.3));

  const answers = [];
  for (let questionIndex = 0; questionIndex < Math.min(questionCount, grid.maxQuestions); questionIndex++) {
    const paper = brilhoDoPapelNaLinha(imageData, width, height, homography, questionIndex, samplePx);
    const scores = [];
    for (let alternativeIndex = 0; alternativeIndex < grid.alternatives.length; alternativeIndex++) {
      const mmPosition = layout.obterPosicaoBolha(questionIndex, alternativeIndex);
      const center = aplicarHomografia(homography, mmPosition.xMm, mmPosition.yMm);
      scores.push(center ? preenchimentoBolha(imageData, width, height, center, innerRadiusPx, paper) : 0);
    }
    answers.push(classificarMarcacao(scores));
  }
  return answers;
}

// Duas leituras com o mesmo resultado indicam uma imagem estável.
export function leiturasIguais(first, second) {
  if (!Array.isArray(first) || !Array.isArray(second) || first.length !== second.length) return false;
  return first.every((answer, index) => answer.status === second[index].status && answer.markedIndex === second[index].markedIndex);
}

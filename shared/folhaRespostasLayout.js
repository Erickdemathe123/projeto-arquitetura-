// Layout padrão da folha de respostas (T38), em milímetros, página A4 retrato
// (210 x 297mm). Módulo compartilhado: o gerador de PDF (T43/T44) e o leitor
// de marcações no navegador (T47/T48) usam estas mesmas coordenadas para que
// o que é impresso e o que é lido concordem sobre onde cada coisa está.
//
// Uso no back-end (CommonJS):
//   const layout = require('../../shared/folhaRespostasLayout');
// Uso no front-end (Vite/ESM) — import default e desestruturação, para não
// depender de como o bundler interpreta um módulo CommonJS externo:
//   import layout from '../../../shared/folhaRespostasLayout.js';
//   const { PAGE, obterPosicaoBolha } = layout;
//
// Origem (x=0, y=0) é o canto superior esquerdo da página.

const PAGE = { widthMm: 210, heightMm: 297 };

// Margem entre a borda da página e a área de conteúdo (onde ficam os 4
// marcadores de canto, usados para corrigir a perspectiva da foto na leitura).
const MARGIN_MM = 15;
const MARKER_SIZE_MM = 10;

// Os 4 marcadores de canto ficam nos cantos da área de conteúdo (não da
// página), afastados da margem, formando o retângulo que o leitor usa como
// referência para desfazer a perspectiva da foto.
const MARKERS = [
  { id: 'topLeft', xMm: MARGIN_MM, yMm: MARGIN_MM },
  { id: 'topRight', xMm: PAGE.widthMm - MARGIN_MM - MARKER_SIZE_MM, yMm: MARGIN_MM },
  { id: 'bottomLeft', xMm: MARGIN_MM, yMm: PAGE.heightMm - MARGIN_MM - MARKER_SIZE_MM },
  { id: 'bottomRight', xMm: PAGE.widthMm - MARGIN_MM - MARKER_SIZE_MM, yMm: PAGE.heightMm - MARGIN_MM - MARKER_SIZE_MM }
].map((marker) => ({ ...marker, sizeMm: MARKER_SIZE_MM }));

// QR Code: identificador opaco da atribuição (prova x aluno), ver T58 — não
// leva RA nem nota, só a chave usada em exam_assignments.qr_code. Fica no
// canto superior direito, abaixo do marcador, para ficar visível isolado.
const QR = { xMm: PAGE.widthMm - MARGIN_MM - MARKER_SIZE_MM - 25, yMm: MARGIN_MM + MARKER_SIZE_MM + 4, sizeMm: 25 };

// Campos de identificação do aluno, impressos no canto superior esquerdo,
// abaixo do marcador. Ficam em branco quando a avaliação não tem turma
// (QR identifica só a versão, conforme T45).
const STUDENT_FIELDS = {
  name: { xMm: MARGIN_MM, yMm: MARGIN_MM + MARKER_SIZE_MM + 6, widthMm: 110 },
  ra: { xMm: MARGIN_MM, yMm: MARGIN_MM + MARKER_SIZE_MM + 14, widthMm: 60 }
};

// Grade de bolhas: até 20 questões, 5 alternativas (A-E) cada, em 2 colunas
// de 10 linhas (questões 1-10 na coluna 1, 11-20 na coluna 2).
const ALTERNATIVES = ['A', 'B', 'C', 'D', 'E'];
const BUBBLE_GRID = {
  maxQuestions: 20,
  alternatives: ALTERNATIVES,
  columns: 2,
  rowsPerColumn: 10,
  gridStartYMm: MARGIN_MM + MARKER_SIZE_MM + 25,
  rowHeightMm: 10,
  columnStartXMm: [MARGIN_MM, PAGE.widthMm / 2 + 5],
  questionLabelWidthMm: 10,
  bubbleDiameterMm: 4,
  bubbleSpacingMm: 8
};

function validarIndiceQuestao(indiceQuestao) {
  if (!Number.isInteger(indiceQuestao) || indiceQuestao < 0 || indiceQuestao >= BUBBLE_GRID.maxQuestions) {
    throw new RangeError(`indiceQuestao deve ser um inteiro entre 0 e ${BUBBLE_GRID.maxQuestions - 1}.`);
  }
}

// Posição (canto superior esquerdo da linha) da questão de índice 0-based
// dentro da grade: coluna, linha dentro da coluna e coordenadas em mm.
function obterPosicaoQuestao(indiceQuestao) {
  validarIndiceQuestao(indiceQuestao);
  const coluna = Math.floor(indiceQuestao / BUBBLE_GRID.rowsPerColumn);
  const linha = indiceQuestao % BUBBLE_GRID.rowsPerColumn;
  return {
    coluna,
    linha,
    xMm: BUBBLE_GRID.columnStartXMm[coluna],
    yMm: BUBBLE_GRID.gridStartYMm + linha * BUBBLE_GRID.rowHeightMm
  };
}

// Centro da bolha da alternativa (índice 0-based, 0=A..4=E) da questão
// (índice 0-based), em mm — é isso que o gerador de PDF desenha e o leitor
// de marcações mede o preenchimento ao redor.
function obterPosicaoBolha(indiceQuestao, indiceAlternativa) {
  if (!Number.isInteger(indiceAlternativa) || indiceAlternativa < 0 || indiceAlternativa >= ALTERNATIVES.length) {
    throw new RangeError(`indiceAlternativa deve ser um inteiro entre 0 e ${ALTERNATIVES.length - 1}.`);
  }
  const { xMm, yMm } = obterPosicaoQuestao(indiceQuestao);
  return {
    xMm: xMm + BUBBLE_GRID.questionLabelWidthMm + indiceAlternativa * BUBBLE_GRID.bubbleSpacingMm,
    yMm: yMm + BUBBLE_GRID.rowHeightMm / 2
  };
}

module.exports = {
  PAGE,
  MARGIN_MM,
  MARKERS,
  QR,
  STUDENT_FIELDS,
  BUBBLE_GRID,
  obterPosicaoQuestao,
  obterPosicaoBolha
};

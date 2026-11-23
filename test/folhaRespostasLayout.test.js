const { test } = require('node:test');
const assert = require('node:assert/strict');
const layout = require('../shared/folhaRespostasLayout');

test('página é A4 retrato e os 4 marcadores ficam dentro da margem, sem sair da página', () => {
  assert.deepEqual(layout.PAGE, { widthMm: 210, heightMm: 297 });
  assert.equal(layout.MARKERS.length, 4);
  for (const marker of layout.MARKERS) {
    assert.ok(marker.xMm >= 0 && marker.xMm + marker.sizeMm <= layout.PAGE.widthMm, `${marker.id} dentro da largura`);
    assert.ok(marker.yMm >= 0 && marker.yMm + marker.sizeMm <= layout.PAGE.heightMm, `${marker.id} dentro da altura`);
  }
  const ids = layout.MARKERS.map((m) => m.id).sort();
  assert.deepEqual(ids, ['bottomLeft', 'bottomRight', 'topLeft', 'topRight']);
});

test('QR Code fica dentro da página e não sobrepõe nenhum marcador de canto', () => {
  const { QR, MARKERS, PAGE } = layout;
  assert.ok(QR.xMm >= 0 && QR.xMm + QR.sizeMm <= PAGE.widthMm);
  assert.ok(QR.yMm >= 0 && QR.yMm + QR.sizeMm <= PAGE.heightMm);
  for (const marker of MARKERS) {
    const semSobreposicao =
      QR.xMm + QR.sizeMm <= marker.xMm ||
      marker.xMm + marker.sizeMm <= QR.xMm ||
      QR.yMm + QR.sizeMm <= marker.yMm ||
      marker.yMm + marker.sizeMm <= QR.yMm;
    assert.ok(semSobreposicao, `QR não deve sobrepor o marcador ${marker.id}`);
  }
});

test('obterPosicaoQuestao distribui 20 questões em 2 colunas de 10, sem repetir posição', () => {
  const posicoes = Array.from({ length: layout.BUBBLE_GRID.maxQuestions }, (_, indice) =>
    layout.obterPosicaoQuestao(indice)
  );
  assert.equal(posicoes.filter((p) => p.coluna === 0).length, 10);
  assert.equal(posicoes.filter((p) => p.coluna === 1).length, 10);
  const chaves = new Set(posicoes.map((p) => `${p.xMm},${p.yMm}`));
  assert.equal(chaves.size, posicoes.length);
});

test('obterPosicaoQuestao rejeita índice fora de 0..19', () => {
  assert.throws(() => layout.obterPosicaoQuestao(-1), RangeError);
  assert.throws(() => layout.obterPosicaoQuestao(20), RangeError);
  assert.throws(() => layout.obterPosicaoQuestao(1.5), RangeError);
});

test('obterPosicaoBolha dá uma posição distinta para cada uma das 5 alternativas da mesma questão', () => {
  const posicoes = layout.BUBBLE_GRID.alternatives.map((_, indice) => layout.obterPosicaoBolha(0, indice));
  assert.equal(new Set(posicoes.map((p) => `${p.xMm},${p.yMm}`)).size, 5);
  // todas as bolhas da questão 0 ficam na mesma linha (mesmo y)
  assert.equal(new Set(posicoes.map((p) => p.yMm)).size, 1);
});

test('obterPosicaoBolha rejeita alternativa fora de 0..4', () => {
  assert.throws(() => layout.obterPosicaoBolha(0, -1), RangeError);
  assert.throws(() => layout.obterPosicaoBolha(0, 5), RangeError);
});

test('campos de nome e RA do aluno ficam dentro da página e acima da grade de bolhas', () => {
  const { STUDENT_FIELDS, BUBBLE_GRID, PAGE } = layout;
  for (const campo of Object.values(STUDENT_FIELDS)) {
    assert.ok(campo.xMm >= 0 && campo.xMm + campo.widthMm <= PAGE.widthMm);
    assert.ok(campo.yMm < BUBBLE_GRID.gridStartYMm, 'campo deve ficar acima do início da grade de bolhas');
  }
});

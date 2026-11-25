
const { test } = require('node:test');
const assert = require('node:assert/strict');
const PDFDocument = require('pdfkit');

const {
  desenharQuestao
} = require('../src/utils/paginacaoQuestoesPdf');

function criarDocumento(t) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40
  });

  doc.resume();

  t.after(() => doc.end());

  return doc;
}

function larguraUtil(doc) {
  return doc.page.width -
    doc.page.margins.left -
    doc.page.margins.right;
}

test('RNF07: mantém questão curta na página atual', (t) => {
  const doc = criarDocumento(t);
  const paginaInicial = doc.page;

  desenharQuestao(
    doc,
    1,
    'Quanto é 2 + 2?',
    ['4', '5', '6'],
    larguraUtil(doc)
  );

  assert.equal(doc.page, paginaInicial);
});

test('RNF07: transfere questão inteira para a próxima página', (t) => {
  const doc = criarDocumento(t);
  const paginaInicial = doc.page;

  doc.y = doc.page.height -
    doc.page.margins.bottom - 25;

  let novasPaginas = 0;

  doc.on('pageAdded', () => novasPaginas++);

  desenharQuestao(
    doc,
    2,
    'Enunciado da questão',
    ['Alternativa A', 'Alternativa B', 'Alternativa C'],
    larguraUtil(doc)
  );

  assert.notEqual(doc.page, paginaInicial);
  assert.equal(novasPaginas, 1);
});

test('RNF07: mantém enunciado e alternativas extensas juntos', (t) => {
  const doc = criarDocumento(t);

  doc.y = doc.page.height -
    doc.page.margins.bottom - 80;

  const paginaInicial = doc.page;
  const paginasDeImpressao = [];
  const imprimir = doc.text;

  t.mock.method(doc, 'text', function (...args) {
    paginasDeImpressao.push(this.page);
    return imprimir.apply(this, args);
  });

  desenharQuestao(
    doc,
    3,
    'Questão com alternativas extensas',
    [
      'Alternativa longa com diversas informações. '.repeat(40),
      'Segunda alternativa'
    ],
    larguraUtil(doc)
  );

  assert.notEqual(doc.page, paginaInicial);
  assert.equal(paginasDeImpressao.length, 3);

  assert.ok(
    paginasDeImpressao.every(pagina => pagina === doc.page)
  );
});

test('RNF07: rejeita questão maior que uma página', (t) => {
  const doc = criarDocumento(t);
  const paginaInicial = doc.page;

  assert.throws(
    () => desenharQuestao(
      doc,
      4,
      'Enunciado muito extenso. '.repeat(5000),
      ['Alternativa A', 'Alternativa B'],
      larguraUtil(doc)
    ),
    erro => erro.status === 400 &&
      erro.message.includes('muito extensa')
  );

  assert.equal(doc.page, paginaInicial);
});

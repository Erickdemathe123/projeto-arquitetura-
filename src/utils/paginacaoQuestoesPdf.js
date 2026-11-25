
const { ErroDeNegocio } = require('../errors/appError');

function desenharQuestao(doc, numero, enunciado, alternativas, largura) {
  const opcoes = {
    width: largura,
    lineGap: 0
  };

  const titulo = `${numero}. ${enunciado}`;

  const linhas = alternativas.map(
    (texto, indice) =>
      `  ${String.fromCharCode(65 + indice)}) ${texto}`
  );

  const espacoEntre = 3;
  const espacoFinal = 6;
  const margemSeguranca = 2;

  doc.font('Helvetica-Bold').fontSize(11);

  const alturaTitulo = doc.heightOfString(titulo, opcoes);

  doc.font('Helvetica').fontSize(10);

  const alturaAlternativas = linhas.reduce(
    (total, linha) =>
      total + doc.heightOfString(linha, opcoes),
    0
  );

  const alturaTotal =
    alturaTitulo +
    espacoEntre +
    alturaAlternativas +
    espacoFinal +
    margemSeguranca;

  const alturaUtil =
    doc.page.height -
    doc.page.margins.top -
    doc.page.margins.bottom;

  if (alturaTotal > alturaUtil) {
    throw new ErroDeNegocio(
      400,
      `A questão ${numero} é muito extensa para caber em uma página. Revise o enunciado ou as alternativas.`
    );
  }

  const limiteInferior =
    doc.page.height - doc.page.margins.bottom;

  if (doc.y + alturaTotal > limiteInferior) {
    doc.addPage();
  }

  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#111111')
    .text(titulo, doc.page.margins.left, doc.y, opcoes);

  doc.y += espacoEntre;

  for (const linha of linhas) {
    doc.font('Helvetica')
      .fontSize(10)
      .text(linha, doc.page.margins.left, doc.y, opcoes);
  }

  doc.y += espacoFinal;
}

module.exports = { desenharQuestao };

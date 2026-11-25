const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const layout = require('../../shared/folhaRespostasLayout');
const answerSheetRenderer = require('./answerSheetRenderer');

function mm(value) {
  return value * 72 / 25.4;
}

function nomeArquivo(avaliacao) {
  const base = String(avaliacao.name || 'folha-respostas')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .toLowerCase().slice(0, 60) || 'folha-respostas';
  return `${base}.pdf`;
}

async function gerar(avaliacao, versoes = [], quantidadeFallback = 20) {
  const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: mm(layout.MARGIN_MM) });
  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const listaVersoes = versoes && versoes.length ? versoes : [{ label: 'Única', printedItems: [] }];

  for (let indiceVersao = 0; indiceVersao < listaVersoes.length; indiceVersao++) {
    const versao = listaVersoes[indiceVersao];
    const qrcodeText = JSON.stringify({
      examId: avaliacao.id,
      publicCode: avaliacao.publicCode,
      standalone: Boolean(avaliacao.standaloneAnswerSheet),
      versionLabel: avaliacao.standaloneAnswerSheet ? 'Única' : (versao.label || 'Única')
    });
    const qrBuffer = await QRCode.toBuffer(qrcodeText, { width: 480, margin: 0 });
    const printedItems = Array.isArray(versao.printedItems) ? versao.printedItems : [];
    const questionCount = Math.min(layout.BUBBLE_GRID.maxQuestions, avaliacao.standaloneAnswerSheet
      ? Number(avaliacao.questionCount || quantidadeFallback)
      : printedItems.length || Number(avaliacao.questionCount || quantidadeFallback));

    let questionItems = [];
    if (!avaliacao.standaloneAnswerSheet) {
      if (indiceVersao > 0) doc.addPage();
      doc.font('Helvetica-Bold').fontSize(16).text(avaliacao.name || 'Caderno de questões', { align: 'center' });
      doc.moveDown().font('Helvetica').fontSize(9).text(`Versão ${versao.label || 'Única'} · Código: ${avaliacao.publicCode || '-'}`, { align: 'center' });
      const porId = new Map((avaliacao.questionSnapshots || []).map((questao) => [Number(questao.id), questao]));
      const itens = printedItems.length
        ? printedItems.map((item) => ({ question: porId.get(Number(item.question_id)), item })).filter((row) => row.question)
        : (avaliacao.questionSnapshots || []).map((question) => ({ question, item: null }));
      questionItems = itens;
      for (let index = 0; index < itens.length; index++) {
        const { question, item } = itens[index];
        const ordem = item && Array.isArray(item.alternative_order)
          ? item.alternative_order
          : (question.alternatives || []).map((_, alternativa) => alternativa);
        doc.moveDown(0.5).font('Helvetica-Bold').fontSize(11).text(`${index + 1}. ${question.text}`);
        for (let alternativa = 0; alternativa < ordem.length; alternativa++) {
          doc.font('Helvetica').fontSize(10).text(`  ${String.fromCharCode(65 + alternativa)}. ${question.alternatives[ordem[alternativa]] || ''}`);
        }
      }
    }

    answerSheetRenderer.drawAnswerSheet(doc, {
      avaliacao,
      versionLabel: versao.label || 'Única',
      questionItems,
      questionCount,
      alternativeCounts: questionItems.length
        ? questionItems.map(({ question }) => question.alternatives?.length || 5)
        : Array.from({ length: questionCount }, () => 5),
      qrBuffer,
      config: avaliacao.answerSheet,
      addPage: !avaliacao.standaloneAnswerSheet || indiceVersao > 0
    });
  }
  doc.end();
  return finished;
}

module.exports = { gerar, nomeArquivo };

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const layout = require('../../shared/folhaRespostasLayout');

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
  const qrcodeText = JSON.stringify({
    examId: avaliacao.id,
    publicCode: avaliacao.publicCode,
    standalone: Boolean(avaliacao.standaloneAnswerSheet)
  });
  const qrBuffer = await QRCode.toBuffer(qrcodeText, { width: 240, margin: 1 });
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
    const printedItems = Array.isArray(versao.printedItems) ? versao.printedItems : [];
    const questionCount = Math.min(20, avaliacao.standaloneAnswerSheet
      ? Number(avaliacao.questionCount || quantidadeFallback)
      : printedItems.length || Number(avaliacao.questionCount || quantidadeFallback));

    if (!avaliacao.standaloneAnswerSheet) {
      if (indiceVersao > 0) doc.addPage();
      doc.font('Helvetica-Bold').fontSize(16).text(avaliacao.name || 'Caderno de questões', { align: 'center' });
      doc.moveDown().font('Helvetica').fontSize(9).text(`Versão ${versao.label || 'Única'} · Código: ${avaliacao.publicCode || '-'}`, { align: 'center' });
      const porId = new Map((avaliacao.questionSnapshots || []).map((questao) => [Number(questao.id), questao]));
      const itens = printedItems.length
        ? printedItems.map((item) => porId.get(Number(item.question_id))).filter(Boolean)
        : (avaliacao.questionSnapshots || []);
      for (let index = 0; index < itens.length; index++) {
        const questao = itens[index];
        const item = printedItems[index];
        const ordem = item && Array.isArray(item.alternative_order)
          ? item.alternative_order
          : (questao.alternatives || []).map((_, alternativa) => alternativa);
        doc.moveDown(0.5).font('Helvetica-Bold').fontSize(11).text(`${index + 1}. ${questao.text}`);
        for (let alternativa = 0; alternativa < ordem.length; alternativa++) {
          doc.font('Helvetica').fontSize(10).text(`  ${String.fromCharCode(65 + alternativa)}. ${questao.alternatives[ordem[alternativa]] || ''}`);
        }
      }
      doc.addPage();
    } else if (indiceVersao > 0) {
      doc.addPage();
    }

    doc.font('Helvetica-Bold').fontSize(15).text(avaliacao.name || 'Folha de respostas', { align: 'center' });
    doc.moveDown(0.3).font('Helvetica').fontSize(9).text(`Versão ${versao.label || 'Única'} · Código: ${avaliacao.publicCode || '-'}`, { align: 'center' });

    for (const marker of layout.MARKERS) {
      doc.save().rect(mm(marker.xMm), mm(marker.yMm), mm(marker.sizeMm), mm(marker.sizeMm)).fill('#111111').restore();
    }
    doc.image(qrBuffer, mm(layout.QR.xMm), mm(layout.QR.yMm), { width: mm(layout.QR.sizeMm), height: mm(layout.QR.sizeMm) });

    doc.font('Helvetica').fontSize(10);
    doc.text(`Aluno: ${'_'.repeat(32)}   RA: ${'_'.repeat(18)}`, mm(layout.STUDENT_FIELDS.name.xMm), mm(layout.STUDENT_FIELDS.ra.yMm), {
      width: mm(layout.PAGE.widthMm - layout.MARGIN_MM * 2)
    });

    for (let index = 0; index < questionCount; index++) {
      const position = layout.obterPosicaoQuestao(index);
      const x = mm(position.xMm);
      const y = mm(position.yMm);
      doc.font('Helvetica-Bold').fontSize(8).text(`${index + 1}`, x - mm(4), y - mm(1));
      for (let alternativa = 0; alternativa < 5; alternativa++) {
        const bolha = layout.obterPosicaoBolha(index, alternativa);
        doc.save().circle(mm(bolha.xMm), mm(bolha.yMm), mm(layout.BUBBLE_GRID.bubbleDiameterMm / 2)).stroke('#111111').restore();
        doc.font('Helvetica').fontSize(6).text(String.fromCharCode(65 + alternativa), mm(bolha.xMm - 3), mm(bolha.yMm - 1.5), { width: mm(6), align: 'center' });
      }
    }
  }
  doc.end();
  return finished;
}

module.exports = { gerar, nomeArquivo };

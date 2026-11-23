const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const layout = require('../../shared/folhaRespostasLayout');

function mm(value) {
  return value * 72 / 25.4;
}

function formatPoints(points) {
  const value = Number(points);
  if (!Number.isFinite(value) || value <= 0) return '';
  return `(${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${value === 1 ? 'ponto' : 'pontos'})`;
}

function addHeader(doc, avaliacao, versionLabel, student) {
  const institution = [avaliacao.institution, avaliacao.course, avaliacao.subject].filter(Boolean).join(' · ');
  if (institution) doc.font('Helvetica-Bold').fontSize(10).text(institution, { align: 'center' });
  doc.moveDown(0.25).font('Helvetica-Bold').fontSize(16).text(avaliacao.name || 'Avaliação', { align: 'center' });
  const meta = [avaliacao.professor, avaliacao.className, avaliacao.date].filter(Boolean).join(' · ');
  if (meta) doc.moveDown(0.2).font('Helvetica').fontSize(9).text(meta, { align: 'center' });
  doc.moveDown(0.2).font('Helvetica-Bold').fontSize(9).text(
    `Versão ${versionLabel}${student ? ` · Aluno: ${student.studentName} · RA: ${student.studentRa}` : ''}`,
    { align: 'center' }
  );
  if (avaliacao.instructions) {
    doc.moveDown(0.5).font('Helvetica-Oblique').fontSize(9).text(`Instruções: ${avaliacao.instructions}`);
  }
  doc.moveDown();
}

function drawAnswerSheet(doc, avaliacao, versionLabel, student, questionCount, qrText) {
  doc.addPage();
  doc.font('Helvetica-Bold').fontSize(15).text('Folha de respostas', { align: 'center' });
  doc.moveDown(0.25).font('Helvetica').fontSize(9).text(
    `Versão ${versionLabel}${student ? ` · ${student.studentName} · RA ${student.studentRa}` : ` · Código ${avaliacao.publicCode}`}`,
    { align: 'center' }
  );
  for (const marker of layout.MARKERS) {
    doc.rect(mm(marker.xMm), mm(marker.yMm), mm(marker.sizeMm), mm(marker.sizeMm)).fill('#111111');
  }
  const qrBuffer = Buffer.isBuffer(qrText) ? qrText : null;
  if (qrBuffer) {
    doc.image(qrBuffer, mm(layout.QR.xMm), mm(layout.QR.yMm), {
      width: mm(layout.QR.sizeMm),
      height: mm(layout.QR.sizeMm)
    });
  }
  doc.font('Helvetica').fontSize(10).text(
    `Aluno: ${student?.studentName || '_'.repeat(32)}   RA: ${student?.studentRa || '_'.repeat(18)}`,
    mm(layout.STUDENT_FIELDS.name.xMm),
    mm(layout.STUDENT_FIELDS.ra.yMm),
    { width: mm(layout.PAGE.widthMm - layout.MARGIN_MM * 2) }
  );
  for (let index = 0; index < questionCount; index++) {
    const position = layout.obterPosicaoQuestao(index);
    const x = mm(position.xMm);
    const y = mm(position.yMm);
    doc.font('Helvetica-Bold').fontSize(8).text(String(index + 1), x - mm(4), y - mm(1));
    for (let alternative = 0; alternative < 5; alternative++) {
      const bubble = layout.obterPosicaoBolha(index, alternative);
      doc.circle(mm(bubble.xMm), mm(bubble.yMm), mm(layout.BUBBLE_GRID.bubbleDiameterMm / 2)).stroke();
      doc.font('Helvetica').fontSize(6).text(
        String.fromCharCode(65 + alternative),
        mm(bubble.xMm - 3),
        mm(bubble.yMm - 1.5),
        { width: mm(6), align: 'center' }
      );
    }
  }
}

async function gerar(avaliacao, versoes = [], student = null) {
  if (!avaliacao.questionSnapshots?.length) {
    throw new Error('A avaliação não possui questões.');
  }
  const version = versoes.length ? versoes[0] : null;
  const printedItems = version?.printedItems || [];
  const byId = new Map(avaliacao.questionSnapshots.map((question) => [Number(question.id), question]));
  const items = printedItems.length
    ? printedItems.map((item) => ({ question: byId.get(Number(item.question_id)), item })).filter((row) => row.question)
    : avaliacao.questionSnapshots.map((question) => ({ question, item: null }));

  const qrText = student?.qrCode
    ? JSON.stringify({
        examId: avaliacao.id,
        publicCode: avaliacao.publicCode,
        studentId: student.studentId,
        studentRa: student.studentRa,
        versionLabel: student.versionLabel,
        qrCode: student.qrCode
      })
    : JSON.stringify({
        examId: avaliacao.id,
        publicCode: avaliacao.publicCode,
        versionLabel: version?.label || 'Única',
        standalone: Boolean(avaliacao.standaloneAnswerSheet)
      });
  const qrBuffer = await QRCode.toBuffer(student?.qrCode || qrText, { width: 240, margin: 1 });
  const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: mm(layout.MARGIN_MM) });
  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  addHeader(doc, avaliacao, version?.label || 'Única', student);
  const pointsByQuestion = new Map(
    (avaliacao.questionIds || []).map((id, index) => [Number(id), (avaliacao.questionPoints || [])[index]])
  );
  for (let index = 0; index < items.length; index++) {
    const { question, item } = items[index];
    const alternativeText = (question.alternatives || []).map((text, alternativeIndex) => ({ text, alternativeIndex }));
    const order = item?.alternative_order || alternativeText.map((row) => row.alternativeIndex);
    const ordered = order.map((originalIndex) => question.alternatives[originalIndex]).filter((text) => text !== undefined);
    const questionHeader = `${index + 1}. ${question.text} ${formatPoints(pointsByQuestion.get(Number(question.id)))}`.trim();
    const alternativesHeight = ordered.length * 16;
    const height = doc.heightOfString(questionHeader, { width: mm(layout.PAGE.widthMm - 30) }) + alternativesHeight + 18;
    if (doc.y + height > mm(layout.PAGE.heightMm - layout.MARGIN_MM)) doc.addPage();
    doc.font('Helvetica-Bold').fontSize(11).text(questionHeader, { width: mm(layout.PAGE.widthMm - 30) });
    doc.moveDown(0.2);
    for (let alternativeIndex = 0; alternativeIndex < ordered.length; alternativeIndex++) {
      doc.font('Helvetica').fontSize(10).text(
        `  ${String.fromCharCode(65 + alternativeIndex)}. ${ordered[alternativeIndex]}`,
        { width: mm(layout.PAGE.widthMm - 30), continued: false }
      );
    }
    doc.moveDown(0.5);
  }

  drawAnswerSheet(doc, avaliacao, version?.label || 'Única', student, items.length, qrBuffer);
  doc.end();
  return finished;
}

function nomeArquivo(avaliacao, student = null) {
  const base = String(avaliacao.name || 'prova')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .toLowerCase().slice(0, 60) || 'prova';
  const suffix = student ? `-${String(student.studentName || 'aluno').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}` : '';
  return `${base}${suffix}.pdf`;
}

module.exports = { gerar, nomeArquivo };

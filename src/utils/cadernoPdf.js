const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const layout = require('../../shared/folhaRespostasLayout');
const answerSheetRenderer = require('./answerSheetRenderer');
const { desenharQuestao } = require('./paginacaoQuestoesPdf');

function mm(value) {
  return value * 72 / 25.4;
}

function addHeader(doc, avaliacao, versionLabel, student) {
  const pageX = mm(layout.MARGIN_MM);
  const pageWidth = mm(layout.PAGE.widthMm - layout.MARGIN_MM * 2);
  const logo = answerSheetRenderer.imageBuffer(avaliacao.logo);
  const logoX = mm(layout.MARGIN_MM + 5);
  const logoY = mm(layout.MARGIN_MM + 2);
  const logoWidth = mm(27);
  const logoHeight = mm(24);
  const infoX = mm(layout.MARGIN_MM + 38);
  const infoWidth = pageWidth - mm(38);
  if (logo) {
    doc.image(logo, logoX, logoY, { fit: [logoWidth, logoHeight], align: 'center', valign: 'center' });
  }

  const institution = avaliacao.institution || 'Instituição';
  const course = avaliacao.course || 'Curso';
  const subject = avaliacao.subject || 'Disciplina';
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111111').text(institution, infoX, mm(18), { width: infoWidth, align: 'left' });
  doc.font('Helvetica').fontSize(9).fillColor('#526176').text(course, infoX, mm(25), { width: infoWidth, align: 'left' });
  doc.font('Helvetica').fontSize(9).fillColor('#526176').text(subject, infoX, mm(32), { width: infoWidth, align: 'left' });
  doc.moveTo(pageX, mm(47)).lineTo(pageX + pageWidth, mm(47)).stroke('#142b45');

  const title = avaliacao.name || 'Avaliação';
  const titleSize = title.length > 55 ? 15 : 17;
  const titleY = mm(55);
  doc.font('Helvetica-Bold').fontSize(titleSize).fillColor('#102a43').text(title, pageX, titleY, {
    width: pageWidth,
    align: 'center',
    lineGap: 1
  });
  const titleHeight = doc.heightOfString(title, { width: pageWidth, font: 'Helvetica-Bold', fontSize: titleSize, lineGap: 1 });
  let nextY = titleY + titleHeight + mm(3);
  const meta = [avaliacao.professor, avaliacao.className, avaliacao.date].filter(Boolean).join(' · ');
  if (meta) {
    doc.font('Helvetica').fontSize(9).fillColor('#526176').text(meta, pageX, nextY, { width: pageWidth, align: 'center' });
    nextY += mm(6);
  }
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#102a43').text(
    `Versão ${versionLabel}${student ? ` · Aluno: ${student.studentName} · RA: ${student.studentRa}` : ''}`,
    pageX, nextY, { width: pageWidth, align: 'center' }
  );
  nextY += mm(7);
  if (avaliacao.instructions) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('#526176').text(`Instruções: ${avaliacao.instructions}`, pageX, nextY, { width: pageWidth, lineGap: 1 });
    nextY = doc.y + mm(3);
  }
  doc.fillColor('#111111');
  doc.x = pageX;
  doc.y = nextY;
}

function drawAnswerSheet(doc, avaliacao, versionLabel, student, questionItems, qrBuffer) {
  answerSheetRenderer.drawAnswerSheet(doc, {
    avaliacao,
    versionLabel,
    student,
    questionItems,
    questionCount: questionItems.length,
    qrBuffer,
    config: avaliacao.answerSheet
  });
}

function createDocument() {
  const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: mm(layout.MARGIN_MM) });
  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  return { doc, finished };
}

function buildItems(avaliacao, version) {
  const printedItems = version?.printedItems || [];
  const byId = new Map(avaliacao.questionSnapshots.map((question) => [Number(question.id), question]));
  return printedItems.length
    ? printedItems.map((item) => ({ question: byId.get(Number(item.question_id)), item })).filter((row) => row.question)
    : avaliacao.questionSnapshots.map((question) => ({ question, item: null }));
}

async function renderStudentExam(doc, avaliacao, versao, student = null) {
  const versionLabel = versao?.label || 'Única';
  const items = buildItems(avaliacao, versao);
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
        versionLabel,
        standalone: Boolean(avaliacao.standaloneAnswerSheet)
      });
  const qrBuffer = await QRCode.toBuffer(student?.qrCode || qrText, { width: 480, margin: 0 });

  addHeader(doc, avaliacao, versionLabel, student);
  for (let index = 0; index < items.length; index++) {
    const { question, item } = items[index];
    const alternativeText = (question.alternatives || []).map((text, alternativeIndex) => ({ text, alternativeIndex }));
    const order = item?.alternative_order || alternativeText.map((row) => row.alternativeIndex);
    const ordered = order.map((originalIndex) => question.alternatives[originalIndex]).filter((text) => text !== undefined);
    
    desenharQuestao(
      doc,
      index + 1,
      question.text,
      ordered,
      mm(layout.PAGE.widthMm - 30)
    );
  }
  drawAnswerSheet(doc, avaliacao, versionLabel, student, items, qrBuffer);
}

async function gerar(avaliacao, versoes = [], student = null) {
  if (!avaliacao.questionSnapshots?.length) {
    throw new Error('A avaliação não possui questões.');
  }
  const { doc, finished } = createDocument();
  await renderStudentExam(doc, avaliacao, versoes.length ? versoes[0] : null, student);
  doc.end();
  return finished;
}

// Gera um único PDF com o caderno e a folha de respostas de cada aluno.
async function gerarLote(avaliacao, atribuicoes, versoes = []) {
  if (!avaliacao.questionSnapshots?.length) {
    throw new Error('A avaliação não possui questões.');
  }
  if (!Array.isArray(atribuicoes) || !atribuicoes.length) {
    throw new Error('A avaliação não possui atribuições para gerar o PDF.');
  }

  const versoesPorRotulo = new Map(versoes.map((versao) => [versao.label, versao]));
  const { doc, finished } = createDocument();
  for (let index = 0; index < atribuicoes.length; index++) {
    const atribuicao = atribuicoes[index];
    const versao = versoesPorRotulo.get(atribuicao.versionLabel);
    if (!versao) throw new Error(`A versão ${atribuicao.versionLabel} não existe nesta avaliação.`);
    if (index > 0) doc.addPage();
    await renderStudentExam(doc, avaliacao, versao, atribuicao);
  }
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

function nomeArquivoLote(avaliacao) {
  return nomeArquivo(avaliacao, { studentName: 'turma' });
}

module.exports = { gerar, gerarLote, nomeArquivo, nomeArquivoLote };

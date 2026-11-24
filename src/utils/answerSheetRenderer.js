const layout = require('../../shared/folhaRespostasLayout');

function mm(value) {
  return value * 72 / 25.4;
}

function imageBuffer(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:image\/(?:jpeg|jpg|png);base64,([A-Za-z0-9+/=]+)$/i);
  return match ? Buffer.from(match[1], 'base64') : null;
}

function asConfig(avaliacao, config = {}) {
  const hasAnswerSheetConfig = Object.keys(config || {}).length > 0 || Boolean(avaliacao.answerSheet);
  const answerSheet = hasAnswerSheetConfig ? (config || avaliacao.answerSheet || {}) : {};
  return {
    institutionName: answerSheet.institutionName || avaliacao.institution || '',
    logo: answerSheet.logo || avaliacao.logo || '',
    proofInstructions: hasAnswerSheetConfig ? (answerSheet.proofInstructions || '') : (avaliacao.instructions || ''),
    answerInstructions: answerSheet.answerInstructions || '',
    resultUrl: answerSheet.resultUrl || '',
    resultText: answerSheet.resultText || ''
  };
}

function drawPanel(doc, panel) {
  doc.roundedRect(mm(panel.xMm), mm(panel.yMm), mm(panel.widthMm), mm(panel.heightMm), mm(1.5)).stroke('#999999');
}

function drawText(doc, text, xMm, yMm, widthMm, options = {}) {
  if (!text) return;
  doc.text(String(text), mm(xMm), mm(yMm), { width: mm(widthMm), ...options });
}

function drawInstructions(doc, title, text, panel) {
  drawPanel(doc, panel);
  doc.font('Helvetica-Bold').fontSize(8).text(title, mm(panel.xMm + 4), mm(panel.yMm + 4), {
    width: mm(panel.widthMm - 8), align: 'left'
  });
  const content = String(text || ' ');
  const width = mm(panel.widthMm - 8);
  const maxHeight = mm(panel.heightMm - 16);
  let fontSize = 7.5;
  while (fontSize > 5 && doc.heightOfString(content, { width, fontSize, lineGap: 1.2 }) > maxHeight) {
    fontSize -= 0.5;
  }
  doc.font('Helvetica').fontSize(fontSize);
  drawText(doc, content, panel.xMm + 4, panel.yMm + 12, panel.widthMm - 8, { lineGap: 1.2 });
}

function drawAnswerSheet(doc, {
  avaliacao,
  versionLabel = 'Única',
  student = null,
  questionItems = [],
  questionCount = questionItems.length,
  alternativeCounts = [],
  qrBuffer,
  config,
  addPage = true
}) {
  const settings = asConfig(avaliacao, config);
  const count = Math.min(layout.BUBBLE_GRID.maxQuestions, Number(questionCount) || 0);
  if (addPage) doc.addPage();

  // Moldura principal e marcadores para a leitura pela câmera.
  doc.roundedRect(mm(layout.ANSWER_SHEET.frame.xMm), mm(layout.ANSWER_SHEET.frame.yMm), mm(layout.ANSWER_SHEET.frame.widthMm), mm(layout.ANSWER_SHEET.frame.heightMm), mm(1.5)).stroke('#777777');
  for (const marker of layout.MARKERS) {
    doc.rect(mm(marker.xMm), mm(marker.yMm), mm(marker.sizeMm), mm(marker.sizeMm)).fill('#111111');
  }

  const logo = imageBuffer(settings.logo);
  if (logo) {
    doc.image(logo, mm(layout.ANSWER_SHEET.logo.xMm), mm(layout.ANSWER_SHEET.logo.yMm), {
      fit: [mm(layout.ANSWER_SHEET.logo.widthMm), mm(layout.ANSWER_SHEET.logo.heightMm)],
      align: 'center',
      valign: 'center'
    });
  } else if (settings.institutionName) {
    doc.font('Helvetica-Bold').fontSize(9).text(settings.institutionName, mm(28), mm(27), {
      width: mm(34), align: 'center'
    });
  }

  const title = [settings.institutionName, avaliacao.course, avaliacao.subject].filter(Boolean).join(' · ');
  doc.font('Helvetica-Bold').fontSize(10).text(title || 'Instituição', mm(layout.ANSWER_SHEET.title.xMm), mm(21), {
    width: mm(layout.ANSWER_SHEET.title.widthMm), align: 'center'
  });
  doc.font('Helvetica-Bold').fontSize(14).text(avaliacao.name || 'Avaliação', mm(54), mm(31), {
    width: mm(108), align: 'center'
  });
  doc.font('Helvetica').fontSize(8).text(
    [avaliacao.date, `Versão ${versionLabel}`].filter(Boolean).join(' · '),
    mm(54), mm(40), { width: mm(108), align: 'center' }
  );

  const grade = layout.ANSWER_SHEET.grade;
  doc.rect(mm(grade.xMm), mm(grade.yMm), mm(grade.widthMm), mm(grade.heightMm)).stroke('#555555');
  doc.font('Helvetica-Bold').fontSize(8).text('NOTA', mm(grade.xMm), mm(grade.yMm + 2), { width: mm(grade.widthMm), align: 'center' });
  doc.moveTo(mm(grade.xMm), mm(grade.yMm + 8)).lineTo(mm(grade.xMm + grade.widthMm), mm(grade.yMm + 8)).stroke('#555555');

  doc.font('Helvetica-Bold').fontSize(9).text(`ESTUDANTE: ${student?.studentName || ' '.repeat(28)}`, mm(28), mm(49), { width: mm(105) });
  doc.moveTo(mm(28), mm(54)).lineTo(mm(133), mm(54)).stroke('#555555');
  doc.font('Helvetica-Bold').fontSize(9).text(`RA: ${student?.studentRa || ' '.repeat(12)}`, mm(28), mm(57), { width: mm(70) });
  doc.moveTo(mm(28), mm(62)).lineTo(mm(98), mm(62)).stroke('#555555');

  drawInstructions(doc, 'ORIENTAÇÕES PARA A REALIZAÇÃO DA PROVA', settings.proofInstructions, layout.ANSWER_SHEET.proofInstructions);
  drawInstructions(doc, 'ORIENTAÇÕES SOBRE O PREENCHIMENTO DO GABARITO', settings.answerInstructions, layout.ANSWER_SHEET.answerInstructions);

  if (settings.resultUrl || settings.resultText) {
    doc.font('Helvetica-Bold').fontSize(7.5).text('ACESSE SEU RESULTADO EM:', mm(108), mm(112), { width: mm(78) });
    if (settings.resultUrl) {
      doc.fillColor('#1769aa').font('Helvetica').fontSize(7.5).text(settings.resultUrl, mm(108), mm(117), { width: mm(78), link: settings.resultUrl, underline: true });
      doc.fillColor('black');
    }
    if (settings.resultText) {
      doc.font('Helvetica').fontSize(7).text(settings.resultText, mm(108), mm(122), { width: mm(78) });
    }
  }

  const answerPanel = layout.ANSWER_SHEET.gridPanel;
  doc.rect(mm(answerPanel.xMm), mm(answerPanel.yMm), mm(answerPanel.widthMm), mm(answerPanel.heightMm)).stroke('#777777');
  const dividerX = answerPanel.xMm + 39;
  doc.moveTo(mm(dividerX), mm(answerPanel.yMm)).lineTo(mm(dividerX), mm(answerPanel.yMm + answerPanel.heightMm)).stroke('#999999');
  if (Buffer.isBuffer(qrBuffer)) {
    doc.image(qrBuffer, mm(layout.QR.xMm), mm(layout.QR.yMm), {
      width: mm(layout.QR.sizeMm), height: mm(layout.QR.sizeMm)
    });
  }
  doc.font('Helvetica').fontSize(7).text('QR Code da prova', mm(106), mm(221), { width: mm(35), align: 'center' });
  doc.font('Helvetica').fontSize(7).text(`Código: ${avaliacao.publicCode || '-'}`, mm(106), mm(263), { width: mm(35), align: 'center' });

  const grid = answerPanel;
  doc.font('Helvetica-Bold').fontSize(7).text('RESPOSTAS', mm(dividerX + 2), mm(grid.yMm + 4), { width: mm(grid.widthMm - 43), align: 'center' });
  const legendY = layout.BUBBLE_GRID.gridStartYMm - 1;
  for (let index = 0; index < layout.BUBBLE_GRID.alternatives.length; index++) {
    const position = layout.obterPosicaoBolha(0, index);
    doc.font('Helvetica-Bold').fontSize(6.5).text(layout.BUBBLE_GRID.alternatives[index], mm(position.xMm - 2), mm(legendY), { width: mm(4), align: 'center' });
  }

  for (let index = 0; index < count; index++) {
    const position = layout.obterPosicaoQuestao(index);
    const alternativeCount = Math.max(2, Math.min(5, Number(
      alternativeCounts[index] || questionItems[index]?.question?.alternatives?.length || 5
    )));
    doc.font('Helvetica-Bold').fontSize(7).text(`Q${index + 1}:`, mm(position.xMm), mm(position.yMm + 1), { width: mm(8) });
    for (let alternative = 0; alternative < alternativeCount; alternative++) {
      const bubble = layout.obterPosicaoBolha(index, alternative);
      doc.circle(mm(bubble.xMm), mm(bubble.yMm), mm(layout.BUBBLE_GRID.bubbleDiameterMm / 2)).stroke('#777777');
    }
  }
}

module.exports = { drawAnswerSheet, imageBuffer };

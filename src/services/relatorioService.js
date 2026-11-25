
const ExcelJS = require('exceljs');
const avaliacaoRepository = require('../repositories/avaliacaoRepository');
const resultadoRepository = require('../repositories/resultadoRepository');
const versaoRepository = require('../repositories/versaoRepository');
const { ErroDeNegocio } = require('../errors/appError');

function formatarCabecalho(aba) {
  aba.getRow(1).font = {
    bold: true,
    color: { argb: 'FFFFFFFF' }
  };

  aba.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF17365D' }
  };

  aba.views = [{ state: 'frozen', ySplit: 1 }];
  aba.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: aba.columns.length }
  };
}

function letra(indice) {
  return Number.isInteger(indice) && indice >= 0 && indice <= 4
    ? String.fromCharCode(65 + indice)
    : '';
}

async function exportarExcel(professorId, examIdRaw) {
  const examId = Number(examIdRaw);

  if (!Number.isSafeInteger(examId) || examId <= 0) {
    throw new ErroDeNegocio(400, 'Id da avaliação inválido.');
  }

  const avaliacao = await avaliacaoRepository.buscarPorId(
    professorId,
    examId
  );

  if (!avaliacao) {
    throw new ErroDeNegocio(404, 'Avaliação não encontrada.');
  }

  const [resultados, versoes, respostas] = await Promise.all([
    resultadoRepository.listarPorAvaliacao(examId),
    versaoRepository.listarPorAvaliacao(examId),
    resultadoRepository.listarRespostasPorAvaliacao(examId)
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SGP - Sistema de Geração de Provas';

  const notas = workbook.addWorksheet('Notas');

  notas.columns = [
    { header: 'RA', key: 'ra', width: 20 },
    { header: 'Nome', key: 'nome', width: 40 },
    { header: 'Nota', key: 'nota', width: 15 }
  ];

  for (const resultado of resultados) {
    notas.addRow({
      ra: resultado.ra,
      nome: resultado.studentName,
      nota: resultado.score
    });
  }

  notas.getColumn('nota').numFmt = '0.00';
  formatarCabecalho(notas);

  const detalhes = workbook.addWorksheet('Respostas');

  detalhes.columns = [
    { header: 'RA', key: 'ra', width: 20 },
    { header: 'Nome', key: 'nome', width: 40 },
    { header: 'Versão', key: 'versao', width: 12 },
    { header: 'Questão', key: 'questao', width: 12 },
    { header: 'Resposta marcada', key: 'marcada', width: 22 },
    { header: 'Resposta correta', key: 'correta', width: 22 },
    { header: 'Situação', key: 'situacao', width: 25 }
  ];

  const versoesPorId = new Map(
    versoes.map(versao => [Number(versao.id), versao])
  );

  for (const resultado of resultados) {
    const respostasAluno = respostas.filter(
      resposta => Number(resposta.studentId) === Number(resultado.studentId)
    );

    if (!respostasAluno.length) {
      detalhes.addRow({
        ra: resultado.ra,
        nome: resultado.studentName,
        situacao: 'Sem respostas registradas'
      });
      continue;
    }

    const versao = versoesPorId.get(
      Number(respostasAluno[0].versionId)
    );

    if (!versao || !versao.printedItems?.length) {
      detalhes.addRow({
        ra: resultado.ra,
        nome: resultado.studentName,
        situacao: 'Versão indisponível'
      });
      continue;
    }

    const respostasPorQuestao = new Map(
      respostasAluno.map(resposta => [
        Number(resposta.questionId),
        resposta
      ])
    );

    versao.printedItems.forEach((item, index) => {
      const resposta = respostasPorQuestao.get(
        Number(item.question_id)
      );

      let situacao;
      let marcada;

      if (!resposta) {
        situacao = 'Não registrada';
        marcada = '';
      } else if (resposta.markedIndex === null) {
        situacao = 'Sem marcação válida';
        marcada = '';
      } else {
        marcada = letra(resposta.markedIndex);
        situacao = resposta.markedIndex === Number(item.correct_index)
          ? 'Acerto'
          : 'Erro';
      }

      const linha = detalhes.addRow({
        ra: resultado.ra,
        nome: resultado.studentName,
        versao: versao.label,
        questao: index + 1,
        marcada,
        correta: letra(Number(item.correct_index)),
        situacao
      });

      const celula = linha.getCell('situacao');

      celula.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: situacao === 'Acerto'
            ? 'FFC6EFCE'
            : situacao === 'Erro'
              ? 'FFFFC7CE'
              : 'FFFFEB9C'
        }
      };

      celula.font = { bold: true };
    });
  }

  formatarCabecalho(detalhes);

  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer: Buffer.from(buffer),
    filename: `relatorio-avaliacao-${examId}.xlsx`
  };
}

module.exports = { exportarExcel };

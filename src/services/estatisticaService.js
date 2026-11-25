// Serviço: estatísticas de desempenho de uma avaliação (RF11).
// Não acessa o banco diretamente, só pelos repositórios.
const avaliacaoRepository = require('../repositories/avaliacaoRepository');
const resultadoRepository = require('../repositories/resultadoRepository');
const versaoRepository = require('../repositories/versaoRepository');
const { ErroDeNegocio } = require('../errors/appError');

function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

function letra(indice) {
  return String.fromCharCode(65 + indice);
}

// Resumo das notas lançadas: média, mínima e máxima (null quando ainda não há notas)
function resumirNotas(resultados) {
  const notas = resultados
    .map((resultado) => resultado.score)
    .filter((nota) => nota !== null && nota !== undefined && Number.isFinite(Number(nota)))
    .map(Number);
  if (!notas.length) return { corrigidos: 0, media: null, minima: null, maxima: null };
  return {
    corrigidos: notas.length,
    media: arredondar(notas.reduce((total, nota) => total + nota, 0) / notas.length),
    minima: Math.min(...notas),
    maxima: Math.max(...notas)
  };
}

// Cálculo puro (sem banco). As marcações ficam na ordem impressa da versão de cada aluno,
// então cada uma é convertida de volta para a alternativa original da questão.
function calcularPorQuestao({ questoes, versoes, respostas }) {
  const itensPorVersao = new Map(
    versoes.map((versao) => [
      Number(versao.id),
      new Map((versao.printedItems || []).map((item) => [Number(item.question_id), item]))
    ])
  );

  return questoes.map((questao, posicao) => {
    const textos = questao.alternatives || [];
    const marcacoes = textos.map(() => 0);
    let corretaOriginal = Number(questao.correctAlternative);
    let brancos = 0;
    let acertos = 0;
    let total = 0;

    for (const resposta of respostas) {
      if (Number(resposta.questionId) !== Number(questao.id)) continue;
      const item = itensPorVersao.get(Number(resposta.versionId))?.get(Number(questao.id));
      if (!item) continue;
      const ordem = item.alternative_order || [];
      corretaOriginal = Number(ordem[item.correct_index]);
      total += 1;
      if (resposta.markedIndex === null || resposta.markedIndex === undefined) {
        brancos += 1;
        continue;
      }
      const original = ordem[resposta.markedIndex];
      if (original === undefined || original === null || !(original in marcacoes)) continue;
      marcacoes[original] += 1;
      if (resposta.markedIndex === item.correct_index) acertos += 1;
    }

    // Em caso de empate, vale a alternativa que aparece primeiro na questão original
    let maisMarcada = null;
    marcacoes.forEach((quantidade, indice) => {
      if (indice === corretaOriginal || quantidade === 0) return;
      if (!maisMarcada || quantidade > maisMarcada.marcacoes) {
        maisMarcada = { indice, letra: letra(indice), texto: textos[indice], marcacoes: quantidade };
      }
    });

    return {
      questionId: Number(questao.id),
      numero: posicao + 1,
      enunciado: questao.text,
      respostas: total,
      acertos,
      erros: total - acertos - brancos,
      brancos,
      taxaAcerto: total ? arredondar(acertos / total) : null,
      alternativas: textos.map((texto, indice) => ({
        indice,
        letra: letra(indice),
        texto,
        correta: indice === corretaOriginal,
        marcacoes: marcacoes[indice]
      })),
      alternativaIncorretaMaisMarcada: maisMarcada
    };
  });
}

async function estatisticas(professorId, examIdRaw) {
  const examId = Number(examIdRaw);
  if (!Number.isSafeInteger(examId) || examId <= 0) throw new ErroDeNegocio(400, 'Id da avaliação inválido.');
  const avaliacao = await avaliacaoRepository.buscarPorId(professorId, examId);
  if (!avaliacao) throw new ErroDeNegocio(404, 'Avaliação não encontrada.');

  const [resultados, versoes, respostas] = await Promise.all([
    resultadoRepository.listarPorAvaliacao(examId),
    versaoRepository.listarPorAvaliacao(examId),
    resultadoRepository.listarRespostasPorAvaliacao(examId)
  ]);

  return {
    examId,
    ...resumirNotas(resultados),
    alunosComRespostas: new Set(respostas.map((resposta) => resposta.studentId)).size,
    questoes: calcularPorQuestao({ questoes: avaliacao.questionSnapshots || [], versoes, respostas })
  };
}

module.exports = { estatisticas, calcularPorQuestao, resumirNotas };

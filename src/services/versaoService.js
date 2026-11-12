// Serviço: regras de negócio da geração de versões da prova (T42).
// Não acessa o banco diretamente, só pelos repositórios.
const avaliacaoRepository = require('../repositories/avaliacaoRepository');
const versaoRepository = require('../repositories/versaoRepository');
const { criarGerador, gerarItensImpressos, gerarRotulo } = require('../utils/embaralhamento');
const { ErroDeNegocio } = require('../errors/appError');

const MAX_VERSOES = 26;

function validarId(id, nome) {
  const value = Number(id);
  if (!Number.isSafeInteger(value) || value <= 0) throw new ErroDeNegocio(400, `${nome} inválido.`);
  return value;
}

async function buscarAvaliacaoDoProfessor(professorId, examId) {
  const avaliacao = await avaliacaoRepository.buscarPorId(professorId, examId);
  if (!avaliacao) throw new ErroDeNegocio(404, 'Avaliação não encontrada.');
  return avaliacao;
}

function validarQuantidade(valor, padrao) {
  if (valor === undefined || valor === null) return padrao;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1 || numero > MAX_VERSOES) {
    throw new ErroDeNegocio(400, `O número de versões deve ser um inteiro entre 1 e ${MAX_VERSOES}.`);
  }
  return numero;
}

async function listar(professorId, examIdRaw) {
  const examId = validarId(examIdRaw, 'Id da avaliação');
  await buscarAvaliacaoDoProfessor(professorId, examId);
  return versaoRepository.listarPorAvaliacao(examId);
}

async function gerar(professorId, examIdRaw, { versions, seed } = {}) {
  const examId = validarId(examIdRaw, 'Id da avaliação');
  const avaliacao = await buscarAvaliacaoDoProfessor(professorId, examId);

  if (!avaliacao.questionSnapshots.length) {
    throw new ErroDeNegocio(400, 'A avaliação não tem questões para gerar versões.');
  }

  const quantidade = validarQuantidade(versions, Number(avaliacao.versions) || 1);
  const sementeBase = Number.isFinite(Number(seed)) ? Number(seed) : Date.now();

  const versoes = [];
  for (let indice = 0; indice < quantidade; indice++) {
    const gerar = criarGerador(sementeBase + indice);
    const printedItems = gerarItensImpressos(avaliacao.questionSnapshots, {
      embaralharQuestoes: avaliacao.shuffleQuestions !== false,
      embaralharAlternativas: avaliacao.shuffleAlternatives !== false
    }, gerar);
    versoes.push({ label: gerarRotulo(indice), printedItems });
  }

  try {
    return await versaoRepository.substituir(examId, versoes);
  } catch (error) {
    if (error.code === 'EXAM_ALREADY_CORRECTED') throw new ErroDeNegocio(409, error.message);
    throw error;
  }
}

module.exports = { listar, gerar };

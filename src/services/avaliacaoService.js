const repository = require('../repositories/avaliacaoRepository');
const { ErroDeNegocio } = require('../errors/appError');

function validarId(id, nome) {
  const value = Number(id);
  if (!Number.isSafeInteger(value) || value <= 0) throw new ErroDeNegocio(400, `${nome} inválido.`);
  return value;
}

function validarPontos(questionPoints, total) {
  if (questionPoints === undefined || questionPoints === null) return Array(total).fill(1);
  if (!Array.isArray(questionPoints) || questionPoints.length !== total) {
    throw new ErroDeNegocio(400, 'Informe os pontos de cada questão selecionada.');
  }
  return questionPoints.map((pontos) => {
    const value = typeof pontos === 'string' && pontos.trim() !== '' ? Number(pontos) : pontos;
    const rounded = typeof value === 'number' ? Math.round(value * 100) / 100 : NaN;
    if (!Number.isFinite(rounded) || rounded <= 0) {
      throw new ErroDeNegocio(400, 'Os pontos de cada questão devem ser um número maior que zero.');
    }
    if (rounded > 9999.99) throw new ErroDeNegocio(400, 'Os pontos de cada questão devem ser no máximo 9999,99.');
    return rounded;
  });
}

function validarDados(body = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw new ErroDeNegocio(400, 'Informe o nome da avaliação.');
  if (name.length > 120) throw new ErroDeNegocio(400, 'O nome da avaliação deve ter no máximo 120 caracteres.');
  if (!Array.isArray(body.questionIds) || body.questionIds.length === 0) {
    throw new ErroDeNegocio(400, 'Selecione ao menos uma questão.');
  }
  const questionIds = body.questionIds.map((id) => validarId(id, 'Id da questão'));
  if (new Set(questionIds).size !== questionIds.length) {
    throw new ErroDeNegocio(400, 'A mesma questão não pode ser adicionada mais de uma vez.');
  }
  const questionPoints = validarPontos(body.questionPoints, questionIds.length);
  const applicationClassId = body.applicationClassId ? validarId(body.applicationClassId, 'Id da turma') : null;
  const details = {};
  for (const field of [
    'institution', 'course', 'subject', 'professor', 'className', 'date',
    'instructions', 'logo', 'layout', 'shuffleQuestions', 'shuffleAlternatives',
    'versions', 'addBlankPage', 'createdAt', 'correctionStatus', 'answerSheet'
  ]) {
    if (body[field] !== undefined) details[field] = body[field];
  }
  return { name, questionIds, questionPoints, applicationClassId, details };
}

function traduzirErroPersistencia(error) {
  if (error.code === 'QUESTION_NOT_OWNED') throw new ErroDeNegocio(400, error.message);
  if (error.code === 'CLASS_NOT_OWNED') throw new ErroDeNegocio(400, error.message);
  if (error.code === 'ER_ROW_IS_REFERENCED_2') throw new ErroDeNegocio(409, 'A avaliação já tem respostas registradas. Preserve as questões, a ordem e os pesos.');
  if (error.code === 'ER_DUP_ENTRY') throw new ErroDeNegocio(409, 'Já existe uma avaliação com esse código.');
  throw error;
}

async function criarAvulsa(professorId, body = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 120) throw new ErroDeNegocio(400, 'Informe um nome válido para a folha avulsa.');
  const questionCount = Number(body.questionCount);
  if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 25) {
    throw new ErroDeNegocio(400, 'O número de questões deve ser um inteiro entre 1 e 25.');
  }
  if (!Array.isArray(body.correctAnswers) || body.correctAnswers.length !== questionCount) {
    throw new ErroDeNegocio(400, 'Informe o gabarito com uma letra de A a E para cada questão.');
  }
  const correctAnswers = body.correctAnswers.map((answer) => {
    const letter = typeof answer === 'string' ? answer.trim().toUpperCase() : '';
    if (!/^[A-E]$/.test(letter)) throw new ErroDeNegocio(400, 'O gabarito só pode conter letras de A a E.');
    return letter;
  });
  const applicationClassId = body.applicationClassId ? validarId(body.applicationClassId, 'Id da turma') : null;
  try {
    return await repository.criarAvulsa(professorId, { name, questionCount, correctAnswers, applicationClassId });
  } catch (error) {
    traduzirErroPersistencia(error);
  }
}

async function criar(professorId, body) {
  try {
    return await repository.criar(professorId, validarDados(body));
  } catch (error) {
    traduzirErroPersistencia(error);
  }
}

async function atualizar(professorId, id, body) {
  try {
    const result = await repository.atualizar(professorId, validarId(id, 'Id da avaliação'), validarDados(body));
    if (!result) throw new ErroDeNegocio(404, 'Avaliação não encontrada.');
    return result;
  } catch (error) {
    traduzirErroPersistencia(error);
  }
}

async function definirLiberada(professorId, id, liberada) {
  if (typeof liberada !== 'boolean') {
    throw new ErroDeNegocio(400, 'Informe se o gabarito deve ficar liberado ou bloqueado.');
  }
  const result = await repository.definirLiberada(professorId, validarId(id, 'Id da avaliação'), liberada);
  if (!result) throw new ErroDeNegocio(404, 'Avaliação não encontrada.');
  return result;
}

async function remover(professorId, id) {
  const removed = await repository.remover(professorId, validarId(id, 'Id da avaliação'));
  if (!removed) throw new ErroDeNegocio(404, 'Avaliação não encontrada.');
}

function letra(indice) {
  return String.fromCharCode(65 + indice);
}

// Monta, na ordem do caderno do aluno, o acerto de cada questão e o gabarito da versão dele (T57)
function montarQuestoesDoAluno({ versionLabel, printedItems, snapshots, answers }) {
  const porQuestao = new Map(snapshots.map((questao) => [Number(questao.id), questao]));
  const marcacoes = new Map(answers.map((resposta) => [resposta.questionId, resposta.markedIndex]));

  const questoes = printedItems.map((item, posicao) => {
    const questao = porQuestao.get(Number(item.question_id));
    const textos = questao?.alternatives || [];
    const marcada = marcacoes.has(Number(item.question_id)) ? marcacoes.get(Number(item.question_id)) : null;
    return {
      numero: posicao + 1,
      enunciado: questao?.text || '',
      alternativas: (item.alternative_order || []).map((original, indice) => ({
        letra: letra(indice),
        texto: textos[original] ?? ''
      })),
      respostaAluno: marcada === null ? null : letra(marcada),
      respostaCorreta: letra(item.correct_index),
      emBranco: marcada === null,
      acertou: marcada === item.correct_index
    };
  });
  return { versao: versionLabel, acertos: questoes.filter((q) => q.acertou).length, total: questoes.length, questoes };
}

async function consultarCodigo(code, ra) {
  const normalized = typeof code === 'string' ? code.trim().toUpperCase() : '';
  if (!normalized) throw new ErroDeNegocio(400, 'Informe o código da prova.');
  const raLimpo = typeof ra === 'string' ? ra.trim() : '';
  const result = await repository.buscarPublicoPorCodigo(normalized, raLimpo || null);
  if (!result) throw new ErroDeNegocio(404, 'Código de prova não encontrado.');
  // O detalhe só existe depois da liberação do gabarito e com o RA do próprio aluno
  const { detalhe, ...publico } = result;
  return detalhe ? { ...publico, detalhes: montarQuestoesDoAluno(detalhe) } : publico;
}

module.exports = {
  listar: (professorId) => repository.listarPorProfessor(professorId),
  criar,
  criarAvulsa,
  atualizar,
  definirLiberada,
  remover,
  consultarCodigo,
  montarQuestoesDoAluno
};

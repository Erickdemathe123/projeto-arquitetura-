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
    'versions', 'addBlankPage', 'createdAt', 'correctionStatus'
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

async function consultarCodigo(code, ra) {
  const normalized = typeof code === 'string' ? code.trim().toUpperCase() : '';
  if (!normalized) throw new ErroDeNegocio(400, 'Informe o código da prova.');
  const raLimpo = typeof ra === 'string' ? ra.trim() : '';
  const result = await repository.buscarPublicoPorCodigo(normalized, raLimpo || null);
  if (!result) throw new ErroDeNegocio(404, 'Código de prova não encontrado.');
  return result;
}

module.exports = {
  listar: (professorId) => repository.listarPorProfessor(professorId),
  criar,
  atualizar,
  definirLiberada,
  remover,
  consultarCodigo
};

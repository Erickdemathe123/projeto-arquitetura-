const repository = require('../repositories/questaoRepository');
const { ErroDeNegocio } = require('../errors/appError');

function validarTexto(valor, campo, maximo = Infinity) {
  if (typeof valor !== 'string' || !valor.trim()) {
    throw new ErroDeNegocio(400, `Informe ${campo}.`);
  }
  const resultado = valor.trim();
  if (resultado.length > maximo) {
    throw new ErroDeNegocio(400, `${campo} deve ter no máximo ${maximo} caracteres.`);
  }
  return resultado;
}

function validarDados(dados) {
  const text = validarTexto(dados.text, 'o enunciado');
  const subject = validarTexto(dados.subject, 'a disciplina', 120);
  const topic = validarTexto(dados.topic, 'o assunto', 120);
  if (!Array.isArray(dados.alternatives) || dados.alternatives.length < 2 || dados.alternatives.length > 5) {
    throw new ErroDeNegocio(400, 'A questão deve ter de 2 a 5 alternativas.');
  }
  const alternatives = dados.alternatives.map((alternative, index) =>
    validarTexto(alternative, `a alternativa ${index + 1}`, 255)
  );
  const correctAlternative = Number(dados.correctAlternative);
  if (!Number.isInteger(correctAlternative) || correctAlternative < 0 || correctAlternative >= alternatives.length) {
    throw new ErroDeNegocio(400, 'Selecione uma alternativa correta válida.');
  }
  return { text, subject, topic, alternatives, correctAlternative };
}

async function listar(professorId) {
  return repository.listarPorProfessor(professorId);
}

async function criar(professorId, dados) {
  return repository.criar({ professorId, ...validarDados(dados) });
}

async function atualizar(professorId, id, dados) {
  const questao = await repository.atualizar({ professorId, id, ...validarDados(dados) });
  if (!questao) throw new ErroDeNegocio(404, 'Questão não encontrada.');
  return questao;
}

async function remover(professorId, id) {
  let removida;
  try {
    removida = await repository.remover(professorId, id);
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
      throw new ErroDeNegocio(409, 'Esta questão está vinculada a uma avaliação e não pode ser removida.');
    }
    throw error;
  }
  if (!removida) throw new ErroDeNegocio(404, 'Questão não encontrada.');
}

module.exports = { listar, criar, atualizar, remover };

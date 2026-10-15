const repository = require('../repositories/questaoRepository');
const ErroHttp = require('../errors/ErroHttp');

function validar(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new ErroHttp(400, 'Informe os dados da questão como objeto JSON.');
  }
  const campos = ['enunciado', 'disciplina', 'assunto', 'tipo', 'alternativas', 'alternativaCorreta'];
  if (Object.keys(dados).some(campo => !campos.includes(campo))) {
    throw new ErroHttp(400, 'Campo desconhecido. O professor é definido pelo token.');
  }
  function texto(valor, nome, limite) {
    if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > limite) {
      throw new ErroHttp(400, nome + ' deve conter de 1 a ' + limite + ' caracteres.');
    }
    return valor.trim();
  }
  const enunciado = texto(dados.enunciado, 'Enunciado', 10000);
  const disciplina = texto(dados.disciplina, 'Disciplina', 120);
  const assunto = texto(dados.assunto, 'Assunto', 120);
  if (dados.tipo !== undefined && dados.tipo !== 'Múltipla escolha') {
    throw new ErroHttp(400, 'O tipo deve ser Múltipla escolha.');
  }
  if (!Array.isArray(dados.alternativas) || dados.alternativas.length < 2 || dados.alternativas.length > 5) {
    throw new ErroHttp(400, 'Informe de 2 a 5 alternativas.');
  }
  const alternativas = dados.alternativas.map(valor => texto(valor, 'Alternativa', 255));
  if (!Number.isInteger(dados.alternativaCorreta) || dados.alternativaCorreta < 0 || dados.alternativaCorreta >= alternativas.length) {
    throw new ErroHttp(400, 'Indique uma única alternativa correta pelo índice, começando em zero.');
  }
  return { enunciado, disciplina, assunto, tipo: 'Múltipla escolha', alternativas, alternativaCorreta: dados.alternativaCorreta };
}
async function obter(professorId, id) {
  const questao = await repository.obter(professorId, id);
  if (!questao) throw new ErroHttp(404, 'Questão não encontrada.');
  return questao;
}
module.exports = {
  validar,
  listar: professorId => repository.listar(professorId),
  obter,
  criar: (professorId, dados) => repository.criar(professorId, validar(dados)),
  atualizar: (professorId, id, dados) => repository.atualizar(professorId, id, validar(dados)),
  remover: (professorId, id) => repository.remover(professorId, id)
};

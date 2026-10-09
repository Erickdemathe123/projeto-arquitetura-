// Serviço: regras de negócio das turmas. Não acessa o banco diretamente, só pelos repositórios.
const crypto = require('crypto');
const turmaRepository = require('../repositories/turmaRepository');
const alunoRepository = require('../repositories/alunoRepository');

// Erro com status HTTP, para o controller saber qual código devolver
class ErroDeNegocio extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

// Sem 0, O, 1 e I para evitar confusão ao digitar o código
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TAMANHO_CODIGO = 8;

function gerarCodigo() {
  let codigo = '';
  for (let i = 0; i < TAMANHO_CODIGO; i++) {
    codigo += ALFABETO[crypto.randomInt(ALFABETO.length)];
  }
  return codigo;
}

async function gerarCodigoUnico() {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = gerarCodigo();
    const existente = await turmaRepository.buscarPorCodigo(codigo);
    if (!existente) return codigo;
  }
  throw new ErroDeNegocio(500, 'Não foi possível gerar um código de convite. Tente novamente.');
}

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function validarDadosTurma({ nome, descricao }) {
  const nomeLimpo = texto(nome);
  const descricaoLimpa = texto(descricao);
  if (!nomeLimpo) throw new ErroDeNegocio(400, 'Informe o nome da turma.');
  if (nomeLimpo.length > 120) throw new ErroDeNegocio(400, 'O nome da turma deve ter no máximo 120 caracteres.');
  if (descricaoLimpa.length > 255) throw new ErroDeNegocio(400, 'A descrição deve ter no máximo 255 caracteres.');
  return { nome: nomeLimpo, descricao: descricaoLimpa || null };
}

// Garante que a turma existe e pertence ao professor que fez a requisição
async function buscarTurmaDoProfessor(professorId, turmaId) {
  const turma = await turmaRepository.buscarPorId(turmaId);
  if (!turma || turma.professorId !== professorId) {
    throw new ErroDeNegocio(404, 'Turma não encontrada.');
  }
  return turma;
}

function garantirAtiva(turma, acao) {
  if (turma.arquivada) {
    throw new ErroDeNegocio(409, `A turma está arquivada: não é possível ${acao}.`);
  }
}

// Reaproveita o aluno se o RA já existir; senão, cadastra
async function obterOuCriarAluno({ nome, ra, email }) {
  const raLimpo = texto(ra);
  if (!raLimpo) throw new ErroDeNegocio(400, 'Informe o RA do aluno.');
  if (raLimpo.length > 30) throw new ErroDeNegocio(400, 'O RA deve ter no máximo 30 caracteres.');

  const existente = await alunoRepository.buscarPorRa(raLimpo);
  if (existente) return existente;

  const nomeLimpo = texto(nome);
  const emailLimpo = texto(email);
  if (!nomeLimpo) throw new ErroDeNegocio(400, 'Aluno ainda não cadastrado: informe também o nome.');
  if (emailLimpo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
    throw new ErroDeNegocio(400, 'E-mail inválido.');
  }
  return alunoRepository.criar({ nome: nomeLimpo, ra: raLimpo, email: emailLimpo || null });
}

async function matricularNaTurma(turma, dadosAluno) {
  garantirAtiva(turma, 'matricular alunos');
  const aluno = await obterOuCriarAluno(dadosAluno);
  if (await turmaRepository.estaMatriculado(turma.id, aluno.id)) {
    throw new ErroDeNegocio(409, 'Este aluno já está matriculado nesta turma.');
  }
  await turmaRepository.matricular(turma.id, aluno.id);
  return aluno;
}

// ---------- Operações usadas pelo controller ----------

async function criarTurma(professorId, dados) {
  const { nome, descricao } = validarDadosTurma(dados);
  const codigoConvite = await gerarCodigoUnico();
  return turmaRepository.criar({ professorId, nome, descricao, codigoConvite });
}

async function listarTurmas(professorId, arquivadas = false) {
  return turmaRepository.listarPorProfessor(professorId, arquivadas);
}

async function obterTurma(professorId, turmaId) {
  return buscarTurmaDoProfessor(professorId, turmaId);
}

async function editarTurma(professorId, turmaId, dados) {
  const turma = await buscarTurmaDoProfessor(professorId, turmaId);
  garantirAtiva(turma, 'editar');
  const atualizados = validarDadosTurma({
    nome: 'nome' in dados ? dados.nome : turma.nome,
    descricao: 'descricao' in dados ? dados.descricao : turma.descricao
  });
  return turmaRepository.atualizar(turmaId, atualizados);
}

async function arquivarTurma(professorId, turmaId, arquivar = true) {
  await buscarTurmaDoProfessor(professorId, turmaId);
  return turmaRepository.definirArquivada(turmaId, arquivar);
}

async function gerarNovoCodigo(professorId, turmaId) {
  const turma = await buscarTurmaDoProfessor(professorId, turmaId);
  garantirAtiva(turma, 'gerar novo código de convite');
  const codigoConvite = await gerarCodigoUnico();
  return turmaRepository.atualizarCodigo(turmaId, codigoConvite);
}

// Usado pelo próprio aluno: entra na turma informando o código de convite
async function entrarComCodigo(dados) {
  const codigo = texto(dados.codigo).toUpperCase();
  if (!codigo) throw new ErroDeNegocio(400, 'Informe o código de convite.');
  const turma = await turmaRepository.buscarPorCodigo(codigo);
  if (!turma) throw new ErroDeNegocio(404, 'Código de convite inválido.');
  const aluno = await matricularNaTurma(turma, dados);
  return { turma: { id: turma.id, nome: turma.nome }, aluno };
}

// Usado pelo professor: matricula o aluno manualmente
async function matricularAluno(professorId, turmaId, dados) {
  const turma = await buscarTurmaDoProfessor(professorId, turmaId);
  return matricularNaTurma(turma, dados);
}

async function removerAluno(professorId, turmaId, alunoId) {
  const turma = await buscarTurmaDoProfessor(professorId, turmaId);
  garantirAtiva(turma, 'remover alunos');
  const removido = await turmaRepository.removerMatricula(turmaId, alunoId);
  if (!removido) throw new ErroDeNegocio(404, 'Este aluno não está matriculado nesta turma.');
}

async function listarAlunos(professorId, turmaId) {
  await buscarTurmaDoProfessor(professorId, turmaId);
  return turmaRepository.listarAlunos(turmaId);
}

module.exports = {
  ErroDeNegocio,
  criarTurma,
  listarTurmas,
  obterTurma,
  editarTurma,
  arquivarTurma,
  gerarNovoCodigo,
  entrarComCodigo,
  matricularAluno,
  removerAluno,
  listarAlunos
};

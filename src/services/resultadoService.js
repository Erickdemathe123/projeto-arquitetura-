// Serviço: regras de negócio da correção de provas (tela "Corrigir Provas").
// Não acessa o banco diretamente, só pelos repositórios.
const avaliacaoRepository = require('../repositories/avaliacaoRepository');
const resultadoRepository = require('../repositories/resultadoRepository');
const alunoRepository = require('../repositories/alunoRepository');
const turmaRepository = require('../repositories/turmaRepository');
const { ErroDeNegocio } = require('../errors/appError');

function validarId(id, nome) {
  const value = Number(id);
  if (!Number.isSafeInteger(value) || value <= 0) throw new ErroDeNegocio(400, `${nome} inválido.`);
  return value;
}

function validarNota(score) {
  const valor = Number(score);
  if (!Number.isFinite(valor) || valor < 0 || valor > 10) {
    throw new ErroDeNegocio(400, 'A nota deve ser um número entre 0 e 10.');
  }
  return Math.round(valor * 100) / 100;
}

// Garante que a avaliação existe e pertence ao professor que fez a requisição
async function buscarAvaliacaoDoProfessor(professorId, examId) {
  const avaliacao = await avaliacaoRepository.buscarPorId(professorId, examId);
  if (!avaliacao) throw new ErroDeNegocio(404, 'Avaliação não encontrada.');
  return avaliacao;
}

function calcularStatus(corrigidos, totalMatriculados) {
  if (!corrigidos) return 'pendente';
  if (totalMatriculados > 0 && corrigidos >= totalMatriculados) return 'concluida';
  return 'em_andamento';
}

async function listar(professorId, examIdRaw) {
  const examId = validarId(examIdRaw, 'Id da avaliação');
  await buscarAvaliacaoDoProfessor(professorId, examId);
  const [resultados, totalMatriculados] = await Promise.all([
    resultadoRepository.listarPorAvaliacao(examId),
    resultadoRepository.contarMatriculados(examId)
  ]);
  return {
    examId,
    totalMatriculados,
    corrigidos: resultados.length,
    status: calcularStatus(resultados.length, totalMatriculados),
    resultados
  };
}

async function registrar(professorId, examIdRaw, { ra, score }) {
  const examId = validarId(examIdRaw, 'Id da avaliação');
  const avaliacao = await buscarAvaliacaoDoProfessor(professorId, examId);

  const raLimpo = typeof ra === 'string' ? ra.trim() : '';
  if (!raLimpo) throw new ErroDeNegocio(400, 'Informe o RA do aluno.');
  const notaValidada = validarNota(score);

  if (!avaliacao.applicationClassId) {
    throw new ErroDeNegocio(409, 'Esta avaliação ainda não está vinculada a uma turma: aplique-a antes de corrigir.');
  }

  const aluno = await alunoRepository.buscarPorRa(raLimpo);
  if (!aluno) {
    throw new ErroDeNegocio(404, 'Aluno não encontrado para este RA. Cadastre-o na turma antes de corrigir.');
  }
  const matriculado = await turmaRepository.estaMatriculado(avaliacao.applicationClassId, aluno.id);
  if (!matriculado) {
    throw new ErroDeNegocio(409, 'Este aluno não está matriculado na turma desta avaliação.');
  }

  return resultadoRepository.registrar({ examId, teacherId: professorId, studentId: aluno.id, score: notaValidada });
}

async function remover(professorId, examIdRaw, alunoIdRaw) {
  const examId = validarId(examIdRaw, 'Id da avaliação');
  const alunoId = validarId(alunoIdRaw, 'Id do aluno');
  await buscarAvaliacaoDoProfessor(professorId, examId);
  const removido = await resultadoRepository.remover(examId, alunoId);
  if (!removido) throw new ErroDeNegocio(404, 'Resultado não encontrado para este aluno nesta avaliação.');
}

module.exports = { listar, registrar, remover };

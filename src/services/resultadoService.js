// Serviço: regras de negócio da correção de provas (tela "Corrigir Provas").
// Não acessa o banco diretamente, só pelos repositórios.
const avaliacaoRepository = require('../repositories/avaliacaoRepository');
const resultadoRepository = require('../repositories/resultadoRepository');
const alunoRepository = require('../repositories/alunoRepository');
const turmaRepository = require('../repositories/turmaRepository');
const versaoRepository = require('../repositories/versaoRepository');
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

function normalizarRespostas(respostas) {
  if (!Array.isArray(respostas) || !respostas.length) {
    throw new ErroDeNegocio(400, 'Informe as respostas da folha.');
  }
  return respostas.map((resposta) => {
    if (typeof resposta === 'string') {
      const letra = resposta.trim().toUpperCase();
      if (!/^[A-E]$/.test(letra)) throw new ErroDeNegocio(400, 'Cada resposta deve ser uma letra de A a E.');
      return letra.charCodeAt(0) - 65;
    }
    const numero = Number(resposta);
    if (!Number.isInteger(numero) || numero < 0 || numero > 4) {
      throw new ErroDeNegocio(400, 'Cada resposta deve ser um índice entre 0 e 4 ou uma letra de A a E.');
    }
    return numero;
  });
}

async function corrigirAutomaticamente(professorId, examIdRaw, body = {}) {
  const examId = validarId(examIdRaw, 'Id da avaliação');
  const avaliacao = await buscarAvaliacaoDoProfessor(professorId, examId);

  let respostas = normalizarRespostas(body.respostas);
  let questionItems = [];
  let pointsByQuestion = new Map();

  if (avaliacao.standaloneAnswerSheet) {
    const total = Number(avaliacao.questionCount);
    if (respostas.length !== total) {
      throw new ErroDeNegocio(400, `A folha avulsa deve conter exatamente ${total} respostas.`);
    }
    const gabarito = Array.isArray(avaliacao.correctAnswers) ? avaliacao.correctAnswers : [];
    if (gabarito.length !== total) throw new ErroDeNegocio(409, 'Esta folha avulsa não possui um gabarito completo.');
    questionItems = gabarito.map((answer, index) => ({
      questionId: index + 1,
      correctIndex: answer.charCodeAt(0) - 65,
      points: 1
    }));
  } else {
    const versions = await versaoRepository.listarPorAvaliacao(examId);
    if (!versions.length) throw new ErroDeNegocio(409, 'Gere as versões da avaliação antes de corrigir.');
    const versionLabel = typeof body.versao === 'string' ? body.versao.trim().toUpperCase() : '';
    const versao = versionLabel ? versions.find((item) => item.label === versionLabel) : versions[0];
    if (!versao) throw new ErroDeNegocio(404, `A versão ${versionLabel} não existe nesta avaliação.`);
    if (!Array.isArray(versao.printedItems) || !versao.printedItems.length) {
      throw new ErroDeNegocio(409, 'A versão selecionada não possui itens impressos.');
    }
    if (respostas.length !== versao.printedItems.length) {
      throw new ErroDeNegocio(400, `Informe exatamente ${versao.printedItems.length} respostas.`);
    }
    pointsByQuestion = new Map(
      (avaliacao.questionIds || []).map((id, index) => [Number(id), Number(avaliacao.questionPoints?.[index] ?? 1)])
    );
    questionItems = versao.printedItems.map((item) => ({
      questionId: Number(item.question_id),
      correctIndex: Number(item.correct_index),
      points: pointsByQuestion.get(Number(item.question_id)) || 1
    }));
  }

  let aluno = null;
  if (body.studentId) {
    const studentId = validarId(body.studentId, 'Id do aluno');
    aluno = await alunoRepository.buscarPorId ? await alunoRepository.buscarPorId(studentId) : null;
  } else {
    const ra = typeof body.ra === 'string' ? body.ra.trim() : '';
    if (!ra) throw new ErroDeNegocio(400, 'Informe o RA ou o Id do aluno.');
    aluno = await alunoRepository.buscarPorRa(ra);
  }
  if (!aluno) throw new ErroDeNegocio(404, 'Aluno não encontrado.');

  if (avaliacao.applicationClassId) {
    const matriculado = await turmaRepository.estaMatriculado(avaliacao.applicationClassId, aluno.id);
    if (!matriculado) throw new ErroDeNegocio(409, 'Este aluno não está matriculado na turma desta avaliação.');
  }

  let pontosObtidos = 0;
  let totalPontos = 0;
  const answers = questionItems.map((item, index) => {
    totalPontos += item.points;
    if (respostas[index] === item.correctIndex) pontosObtidos += item.points;
    return { questionId: item.questionId, markedIndex: respostas[index] };
  });
  const score = totalPontos > 0 ? Math.round((pontosObtidos / totalPontos) * 1000) / 100 : 0;

  return resultadoRepository.registrarAutomatico({
    examId,
    teacherId: professorId,
    studentId: aluno.id,
    score,
    answers,
    persistAnswers: !avaliacao.standaloneAnswerSheet
  });
}

module.exports = { listar, registrar, registrarAutomatico: corrigirAutomaticamente, remover, corrigirAutomaticamente };

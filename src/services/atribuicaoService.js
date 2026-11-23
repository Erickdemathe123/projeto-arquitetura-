const { randomBytes } = require('node:crypto');
const avaliacaoRepository = require('../repositories/avaliacaoRepository');
const atribuicaoRepository = require('../repositories/atribuicaoRepository');
const turmaRepository = require('../repositories/turmaRepository');
const versaoRepository = require('../repositories/versaoRepository');
const { ErroDeNegocio } = require('../errors/appError');

function gerarCodigoQrOpaco() {
  return randomBytes(32).toString('hex');
}

function validarId(id, nome) {
  const value = Number(id);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ErroDeNegocio(400, `${nome} inválido.`);
  }
  return value;
}

async function validarQr(professorId, examIdRaw, body = {}) {
  const examId = validarId(examIdRaw, 'Id da avaliação');
  const avaliacao = await avaliacaoRepository.buscarPorId(professorId, examId);
  if (!avaliacao) throw new ErroDeNegocio(404, 'Avaliação não encontrada.');

  const qrCode = typeof body.qrCode === 'string' ? body.qrCode.trim() : '';
  if (!qrCode || qrCode.length > 96 || !/^[\x21-\x7E]+$/.test(qrCode)) {
    throw new ErroDeNegocio(400, 'QR Code inválido.');
  }

  if (avaliacao.standaloneAnswerSheet && qrCode === avaliacao.publicCode) {
    return {
      examId,
      studentId: null,
      studentName: null,
      versionId: null,
      versionLabel: 'Única',
      standalone: true
    };
  }

  if (qrCode === avaliacao.publicCode) {
    return {
      examId,
      studentId: null,
      studentName: null,
      versionId: null,
      versionLabel: 'Única',
      standalone: Boolean(avaliacao.standaloneAnswerSheet)
    };
  }

  try {
    const payload = JSON.parse(qrCode);
    if (payload && Number(payload.examId) === examId && payload.publicCode === avaliacao.publicCode) {
      return {
        examId,
        studentId: null,
        studentName: null,
        versionId: null,
        versionLabel: payload.versionLabel || 'Única',
        standalone: Boolean(payload.standalone || avaliacao.standaloneAnswerSheet)
      };
    }
  } catch {
    // QR inválido será tratado pela consulta de atribuição abaixo.
  }

  const atribuicao = await atribuicaoRepository.buscarPorQrCode(examId, qrCode);
  if (!atribuicao) {
    throw new ErroDeNegocio(404, 'QR Code não pertence a esta avaliação ou não está atribuído.');
  }
  return atribuicao;
}

async function gerarAtribuicoes(professorId, examIdRaw) {
  const examId = validarId(examIdRaw, 'Id da avaliação');
  const avaliacao = await avaliacaoRepository.buscarPorId(professorId, examId);
  if (!avaliacao) throw new ErroDeNegocio(404, 'Avaliação não encontrada.');
  if (!avaliacao.applicationClassId) {
    throw new ErroDeNegocio(409, 'Esta avaliação não está vinculada a uma turma.');
  }

  const versoes = await versaoRepository.listarPorAvaliacao(examId);
  if (!versoes.length) throw new ErroDeNegocio(409, 'Gere as versões da avaliação antes de atribuí-las.');
  const alunos = await turmaRepository.listarAlunos(avaliacao.applicationClassId);
  if (!alunos.length) throw new ErroDeNegocio(409, 'Esta turma não possui alunos matriculados.');

  const atribuicoes = alunos.map((aluno, index) => {
    const versao = versoes[index % versoes.length];
    return {
      studentId: Number(aluno.id),
      studentName: aluno.nome,
      studentRa: aluno.ra,
      versionId: Number(versao.id),
      versionLabel: versao.label,
      qrCode: gerarCodigoQrOpaco()
    };
  });
  try {
    return await atribuicaoRepository.substituirPorAlunos(examId, atribuicoes);
  } catch (error) {
    if (error.code === 'EXAM_ALREADY_CORRECTED') throw new ErroDeNegocio(409, error.message);
    throw error;
  }
}

async function listarAtribuicoes(professorId, examIdRaw) {
  const examId = validarId(examIdRaw, 'Id da avaliação');
  const avaliacao = await avaliacaoRepository.buscarPorId(professorId, examId);
  if (!avaliacao) throw new ErroDeNegocio(404, 'Avaliação não encontrada.');
  return atribuicaoRepository.listarPorAvaliacao(examId);
}

module.exports = { gerarCodigoQrOpaco, validarQr, gerarAtribuicoes, listarAtribuicoes };

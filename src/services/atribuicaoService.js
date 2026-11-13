const { randomBytes } = require('node:crypto');
const avaliacaoRepository = require('../repositories/avaliacaoRepository');
const atribuicaoRepository = require('../repositories/atribuicaoRepository');
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

  const atribuicao = await atribuicaoRepository.buscarPorQrCode(examId, qrCode);
  if (!atribuicao) {
    throw new ErroDeNegocio(404, 'QR Code não pertence a esta avaliação ou não está atribuído.');
  }
  return atribuicao;
}

module.exports = { gerarCodigoQrOpaco, validarQr };

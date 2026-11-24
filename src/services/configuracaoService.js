const repository = require('../repositories/configuracaoRepository');
const { ErroDeNegocio } = require('../errors/appError');

const MAX_LOGO_LENGTH = 700 * 1024;
const DEFAULT_RESULT_TEXT = 'Acesse o endereço acima, informe o código da prova e o seu RA para consultar o resultado.';

function texto(value, max, field) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (result.length > max) throw new ErroDeNegocio(400, `O campo ${field} deve ter no máximo ${max} caracteres.`);
  return result;
}

function validarLogo(value) {
  const logo = typeof value === 'string' ? value.trim() : '';
  if (!logo) return '';
  if (logo.length > MAX_LOGO_LENGTH) {
    throw new ErroDeNegocio(400, 'A logo é muito grande. Escolha uma imagem menor.');
  }
  if (!/^data:image\/(?:jpeg|jpg|png);base64,[A-Za-z0-9+/=]+$/i.test(logo)) {
    throw new ErroDeNegocio(400, 'A logo deve ser uma imagem PNG ou JPEG válida.');
  }
  return logo;
}

function validarUrl(value) {
  const url = texto(value, 500, 'o endereço de consulta');
  if (!url) return '';
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new ErroDeNegocio(400, 'O endereço de consulta é inválido.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ErroDeNegocio(400, 'O endereço de consulta deve usar HTTP ou HTTPS.');
  }
  return url;
}

function padrao() {
  return {
    institutionName: '',
    logo: '',
    proofInstructions: '',
    answerInstructions: 'As respostas deverão ser assinaladas com caneta azul ou preta.\nPreencha completamente a área da resposta.\nAssinale somente uma alternativa por questão.',
    resultUrl: process.env.PUBLIC_STUDENT_PORTAL_URL || '',
    resultText: DEFAULT_RESULT_TEXT,
    updatedAt: null
  };
}

function comPadrao(config) {
  const base = padrao();
  return {
    ...base,
    ...config,
    answerInstructions: config.answerInstructions || base.answerInstructions,
    resultText: config.resultText || base.resultText
  };
}

async function obter(professorId) {
  return comPadrao(await repository.buscarPorProfessor(professorId));
}

async function atualizar(professorId, body = {}) {
  const dados = {
    institutionName: texto(body.institutionName, 160, 'o nome da instituição'),
    logo: validarLogo(body.logo),
    proofInstructions: texto(body.proofInstructions, 5000, 'as orientações da prova'),
    answerInstructions: texto(body.answerInstructions, 5000, 'as orientações do gabarito'),
    resultUrl: validarUrl(body.resultUrl),
    resultText: texto(body.resultText, 500, 'o texto de consulta') || DEFAULT_RESULT_TEXT
  };
  return repository.salvar(professorId, dados);
}

function normalizarParaAvaliacao(config) {
  const atual = comPadrao(config || {});
  return {
    institutionName: atual.institutionName,
    logo: atual.logo,
    proofInstructions: atual.proofInstructions,
    answerInstructions: atual.answerInstructions,
    resultUrl: atual.resultUrl,
    resultText: atual.resultText
  };
}

module.exports = { obter, atualizar, normalizarParaAvaliacao, padrao, DEFAULT_RESULT_TEXT };

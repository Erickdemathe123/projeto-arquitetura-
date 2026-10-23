// Middlewares e utilitários padronizados de validação de requisições da API
const { RequisicaoInvalidaError } = require('../errors/appError');

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;

// Middleware que valida a presença de campos obrigatórios no req.body
function validarCamposObrigatorios(campos) {
  return (req, res, next) => {
    const corpo = req.body || {};
    const faltantes = [];

    for (const campo of campos) {
      const valor = corpo[campo];
      if (valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '')) {
        faltantes.push(campo);
      }
    }

    if (faltantes.length > 0) {
      const mensagem = faltantes.length === 1
        ? `O campo '${faltantes[0]}' é obrigatório.`
        : `Os seguintes campos são obrigatórios: ${faltantes.join(', ')}.`;
      return next(new RequisicaoInvalidaError(mensagem, { camposFaltantes: faltantes }));
    }

    return next();
  };
}

// Middleware que valida se um parâmetro de rota é um ID numérico inteiro positivo
function validarParamId(nomeParam = 'id') {
  return (req, res, next) => {
    const valor = req.params[nomeParam];
    const id = Number(valor);

    if (!Number.isInteger(id) || id <= 0) {
      return next(new RequisicaoInvalidaError(`Parâmetro '${nomeParam}' deve ser um número inteiro positivo.`));
    }

    // Normaliza para number para facilitar o uso no controller
    req.params[nomeParam] = id;
    return next();
  };
}

// Middleware que sanitiza strings do body (faz trim de espaços excedentes)
function sanitizarBody(req, res, next) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    for (const chave of Object.keys(req.body)) {
      if (typeof req.body[chave] === 'string') {
        req.body[chave] = req.body[chave].trim();
      }
    }
  }
  return next();
}

// Validador de formato de e-mail e domínio
function validarFormatoEmail(email) {
  if (typeof email !== 'string') return false;
  const limpo = email.trim().toLowerCase();
  const match = limpo.match(EMAIL_REGEX);
  if (!match) return false;
  const dominio = match[1];
  if (!dominio || dominio.startsWith('.') || dominio.endsWith('.') || dominio.includes('..')) {
    return false;
  }
  return true;
}

module.exports = {
  validarCamposObrigatorios,
  validarParamId,
  sanitizarBody,
  validarFormatoEmail
};

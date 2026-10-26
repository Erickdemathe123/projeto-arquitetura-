// Classes de erro padronizadas da aplicação SGP
class AppError extends Error {
  constructor(mensagem, statusCode = 400, detalhes = null) {
    super(mensagem);
    this.name = this.constructor.name;
    this.statusCode = Number(statusCode) || 400;
    this.status = this.statusCode; // retrocompatibilidade com código existente
    this.detalhes = detalhes;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Mantém suporte tanto a new ErroDeNegocio(status, mensagem) quanto a new ErroDeNegocio(mensagem, status)
class ErroDeNegocio extends AppError {
  constructor(primeiroArg, segundoArg, detalhes = null) {
    if (typeof primeiroArg === 'number') {
      super(segundoArg, primeiroArg, detalhes);
    } else {
      super(primeiroArg, segundoArg || 400, detalhes);
    }
  }
}

class RequisicaoInvalidaError extends AppError {
  constructor(mensagem = 'Requisição inválida.', detalhes = null) {
    super(mensagem, 400, detalhes);
  }
}

class NaoAutorizadoError extends AppError {
  constructor(mensagem = 'Não autorizado.', detalhes = null) {
    super(mensagem, 401, detalhes);
  }
}

class ProibidoError extends AppError {
  constructor(mensagem = 'Acesso negado.', detalhes = null) {
    super(mensagem, 403, detalhes);
  }
}

class NaoEncontradoError extends AppError {
  constructor(mensagem = 'Recurso não encontrado.', detalhes = null) {
    super(mensagem, 404, detalhes);
  }
}

class ConflitoError extends AppError {
  constructor(mensagem = 'Conflito com o estado atual do recurso.', detalhes = null) {
    super(mensagem, 409, detalhes);
  }
}

module.exports = {
  AppError,
  ErroDeNegocio,
  RequisicaoInvalidaError,
  NaoAutorizadoError,
  ProibidoError,
  NaoEncontradoError,
  ConflitoError
};

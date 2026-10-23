// Middleware global de tratamento e formatação de erros da API Express
const { AppError, ErroDeNegocio } = require('../errors/appError');

function errorHandler(erro, req, res, next) {
  if (res.headersSent) {
    return next(erro);
  }

  // 1. Erros do parser de JSON (body-parser embutido no Express)
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }

  if (erro.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Corpo da requisição excede o limite permitido.' });
  }

  // 2. Erros de negócio controlados da aplicação
  if (erro instanceof AppError || erro instanceof ErroDeNegocio || (erro.status && erro.message)) {
    const status = Number(erro.statusCode || erro.status) || 400;
    const resposta = { erro: erro.message };
    if (erro.detalhes) {
      resposta.detalhes = erro.detalhes;
    }
    return res.status(status).json(resposta);
  }

  // 3. Erros de autenticação JWT
  if (erro.name === 'JsonWebTokenError') {
    return res.status(401).json({ erro: 'Token inválido.' });
  }
  if (erro.name === 'TokenExpiredError') {
    return res.status(401).json({ erro: 'Token expirado. Faça login novamente.' });
  }

  // 4. Erros conhecidos de banco de dados MySQL
  if (erro.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ erro: 'Registro duplicado no banco de dados.' });
  }
  if (erro.code === 'ECONNREFUSED') {
    return res.status(503).json({ erro: 'Banco de dados indisponível no momento.' });
  }

  // 5. Erros inesperados / não operacionais (500)
  // Registra no console para observabilidade, mas não expõe stack trace para o cliente
  console.error('Falha não tratada na API:', {
    metodo: req.method,
    url: req.originalUrl,
    erro: erro.message || erro
  });

  return res.status(500).json({ erro: 'Erro interno no servidor.' });
}

module.exports = errorHandler;

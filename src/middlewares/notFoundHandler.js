// Middleware para interceptar rotas não encontradas (HTTP 404)
function notFoundHandler(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

module.exports = notFoundHandler;

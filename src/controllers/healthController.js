const service = require('../services/healthService');
async function obter(req, res) {
  const resultado = await service.verificarSaude();
  res.status(resultado.disponivel ? 200 : 503).json(resultado.corpo);
}
module.exports = { obter };

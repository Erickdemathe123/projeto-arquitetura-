const service = require('../services/estatisticaService');

async function obter(req, res, next) {
  try {
    res.json(await service.estatisticas(req.usuario.id, req.params.id));
  } catch (error) {
    next(error);
  }
}

module.exports = { obter };

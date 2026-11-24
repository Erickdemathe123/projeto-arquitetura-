const service = require('../services/configuracaoService');

async function obter(req, res, next) {
  try {
    res.json(await service.obter(req.usuario.id));
  } catch (error) {
    next(error);
  }
}

async function atualizar(req, res, next) {
  try {
    res.json(await service.atualizar(req.usuario.id, req.body));
  } catch (error) {
    next(error);
  }
}

module.exports = { obter, atualizar };

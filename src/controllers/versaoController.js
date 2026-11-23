const service = require('../services/versaoService');

function tratar(acao) {
  return async (req, res, next) => {
    try {
      await acao(req, res);
    } catch (error) {
      next(error);
    }
  };
}

const listar = tratar(async (req, res) => {
  res.json(await service.listar(req.usuario.id, req.params.id));
});

const gerar = tratar(async (req, res) => {
  res.status(201).json(await service.gerar(req.usuario.id, req.params.id, req.body || {}));
});

module.exports = { listar, gerar };

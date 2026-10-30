const service = require('../services/questaoService');

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
  res.json(await service.listar(req.usuario.id));
});

const criar = tratar(async (req, res) => {
  res.status(201).json(await service.criar(req.usuario.id, req.body || {}));
});

const atualizar = tratar(async (req, res) => {
  res.json(await service.atualizar(req.usuario.id, Number(req.params.id), req.body || {}));
});

const remover = tratar(async (req, res) => {
  await service.remover(req.usuario.id, Number(req.params.id));
  res.status(204).end();
});

module.exports = { listar, criar, atualizar, remover };

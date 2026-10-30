const service = require('../services/resultadoService');

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

const registrar = tratar(async (req, res) => {
  res.status(201).json(await service.registrar(req.usuario.id, req.params.id, req.body || {}));
});

const remover = tratar(async (req, res) => {
  await service.remover(req.usuario.id, req.params.id, req.params.alunoId);
  res.status(204).end();
});

module.exports = { listar, registrar, remover };

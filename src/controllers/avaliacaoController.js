const service = require('../services/avaliacaoService');

function tratar(acao) {
  return async (req, res, next) => {
    try {
      await acao(req, res);
    } catch (error) {
      next(error);
    }
  };
}

const consultarCodigo = tratar(async (req, res) => {
  res.json(await service.consultarCodigo(req.params.code, req.query.ra));
});

const listar = tratar(async (req, res) => {
  res.json(await service.listar(req.usuario.id));
});

const criar = tratar(async (req, res) => {
  res.status(201).json(await service.criar(req.usuario.id, req.body));
});

const atualizar = tratar(async (req, res) => {
  res.json(await service.atualizar(req.usuario.id, req.params.id, req.body));
});

const liberarGabarito = tratar(async (req, res) => {
  res.json(await service.definirLiberada(req.usuario.id, req.params.id, req.body?.released));
});

const remover = tratar(async (req, res) => {
  await service.remover(req.usuario.id, req.params.id);
  res.status(204).end();
});

module.exports = { consultarCodigo, listar, criar, atualizar, liberarGabarito, remover };

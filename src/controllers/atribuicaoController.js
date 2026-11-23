const service = require('../services/atribuicaoService');

async function validarQr(req, res, next) {
  try {
    const atribuicao = await service.validarQr(req.usuario.id, req.params.id, req.body || {});
    res.json(atribuicao);
  } catch (error) {
    next(error);
  }
}

async function gerar(req, res, next) {
  try {
    const atribuicoes = await service.gerarAtribuicoes(req.usuario.id, req.params.id);
    res.status(201).json(atribuicoes);
  } catch (error) {
    next(error);
  }
}

async function listar(req, res, next) {
  try {
    res.json(await service.listarAtribuicoes(req.usuario.id, req.params.id));
  } catch (error) {
    next(error);
  }
}

module.exports = { validarQr, gerar, listar };

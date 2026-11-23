const service = require('../services/atribuicaoService');

async function validarQr(req, res, next) {
  try {
    const atribuicao = await service.validarQr(req.usuario.id, req.params.id, req.body || {});
    res.json(atribuicao);
  } catch (error) {
    next(error);
  }
}

module.exports = { validarQr };

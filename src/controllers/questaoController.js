const service = require('../services/questaoService');
const ErroHttp = require('../errors/ErroHttp');
function lerId(valor) {
  if (!/^[1-9]\d*$/.test(valor) || !Number.isSafeInteger(Number(valor))) {
    throw new ErroHttp(400, 'Id da questão inválido.');
  }
  return Number(valor);
}
function tratar(acao) {
  return async (req, res, next) => {
    try {
      await acao(req, res);
    } catch (erro) {
      if (erro instanceof ErroHttp) return res.status(erro.status).json({ erro: erro.message });
      if (erro.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ erro: 'Questão vinculada a uma avaliação.' });
      if (erro.code === 'ER_NO_REFERENCED_ROW_2') return res.status(401).json({ erro: 'Professor não encontrado.' });
      next(erro);
    }
  };
}
module.exports = {
  listar: tratar(async (req, res) => res.json(await service.listar(req.usuario.id))),
  obter: tratar(async (req, res) => res.json(await service.obter(req.usuario.id, lerId(req.params.id)))),
  criar: tratar(async (req, res) => {
    const questao = await service.criar(req.usuario.id, req.body);
    res.location('/api/questoes/' + questao.id).status(201).json(questao);
  }),
  atualizar: tratar(async (req, res) => res.json(await service.atualizar(req.usuario.id, lerId(req.params.id), req.body))),
  remover: tratar(async (req, res) => {
    await service.remover(req.usuario.id, lerId(req.params.id));
    res.status(204).end();
  })
};

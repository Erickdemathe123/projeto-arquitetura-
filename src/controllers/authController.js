// Controller: traduz requisições HTTP para chamadas ao authService e formata as respostas.
const authService = require('../services/authService');
const { ErroDeNegocio } = authService;

function tratar(acao) {
  return async (req, res) => {
    try {
      await acao(req, res);
    } catch (erro) {
      if (erro instanceof ErroDeNegocio) {
        return res.status(erro.status).json({ erro: erro.message });
      }
      console.error('Erro em authController:', erro);
      return res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
  };
}

const cadastrar = tratar(async (req, res) => {
  const dados = req.body || {};
  const resultado = await authService.cadastrar(dados);
  res.status(201).json(resultado);
});

const login = tratar(async (req, res) => {
  const dados = req.body || {};
  const resultado = await authService.login(dados);
  res.status(200).json(resultado);
});

const me = tratar(async (req, res) => {
  const usuario = await authService.obterUsuarioPorId(req.usuario.id);
  res.json(usuario);
});

module.exports = {
  cadastrar,
  login,
  me
};

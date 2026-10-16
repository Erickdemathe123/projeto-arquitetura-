// Middleware: intercepta requisições protegidas e valida o token JWT.
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sgp_jwt_secret_dev_key_2026';

function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ erro: 'Token de autenticação não fornecido.' });
  }

  const partes = authHeader.split(' ');
  if (partes.length !== 2 || partes[0] !== 'Bearer') {
    return res.status(401).json({ erro: 'Formato de token inválido. Utilize: Bearer <token>.' });
  }

  const token = partes[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = {
      id: Number(payload.id),
      role: payload.role,
      email: payload.email,
      name: payload.name
    };
    return next();
  } catch (erro) {
    if (erro.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Token expirado. Faça login novamente.' });
    }
    return res.status(401).json({ erro: 'Token inválido.' });
  }
}

function exigirRole(roleEsperado) {
  const roles = Array.isArray(roleEsperado) ? roleEsperado : [roleEsperado];
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ erro: 'Autenticação necessária.' });
    }
    if (!roles.includes(req.usuario.role)) {
      return res.status(403).json({ erro: 'Acesso negado para o seu perfil de usuário.' });
    }
    return next();
  };
}

module.exports = {
  autenticar,
  exigirRole
};

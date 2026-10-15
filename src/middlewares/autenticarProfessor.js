const jwt = require('jsonwebtoken');

function autenticarProfessor(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    return res.status(503).json({ erro: 'Autenticação não configurada.' });
  }
  const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '');
  if (!match) return res.status(401).json({ erro: 'Token de autenticação obrigatório.' });
  try {
    const payload = jwt.verify(match[1], secret, {
      algorithms: ['HS256'], issuer: 'sgp', audience: 'sgp-api'
    });
    if (typeof payload !== 'object' || !Number.isInteger(payload.exp) ||
        typeof payload.sub !== 'string' || !/^[1-9]\d*$/.test(payload.sub) ||
        !Number.isSafeInteger(Number(payload.sub))) {
      return res.status(401).json({ erro: 'Token inválido ou expirado.' });
    }
    if (payload.role !== 'professor') return res.status(403).json({ erro: 'Acesso exclusivo de professor.' });
    req.usuario = { id: Number(payload.sub), papel: 'professor' };
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}
module.exports = autenticarProfessor;

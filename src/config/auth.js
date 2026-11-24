const crypto = require('node:crypto');

const ambiente = process.env.NODE_ENV || 'development';
const segredoConfigurado = typeof process.env.JWT_SECRET === 'string'
  ? process.env.JWT_SECRET.trim()
  : '';

if (ambiente === 'production' && !segredoConfigurado) {
  throw new Error('JWT_SECRET é obrigatório em produção.');
}

if (ambiente === 'production' && segredoConfigurado.length < 32) {
  throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres em produção.');
}

// Fora de produção, usa um segredo efêmero para não manter uma chave previsível
// no código. Os tokens locais deixam de funcionar ao reiniciar a API, o que é
// preferível a aceitar uma chave conhecida por qualquer pessoa que veja o código.
const JWT_SECRET = segredoConfigurado || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES_IN = typeof process.env.JWT_EXPIRES_IN === 'string' && process.env.JWT_EXPIRES_IN.trim()
  ? process.env.JWT_EXPIRES_IN.trim()
  : '8h';

module.exports = { JWT_SECRET, JWT_EXPIRES_IN };

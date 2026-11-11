// Middleware: limita tentativas de login/cadastro que deram errado, para
// dificultar a descoberta de senhas por tentativa e erro.
//
// Conta só as respostas com erro do cliente (4xx). Bloqueia por IP + e-mail,
// para que uma sala com o mesmo IP (laboratório) não bloqueie todos os
// alunos por causa de um só. Os contadores ficam na memória do servidor.

function criarLimiteTentativas({ maxTentativas = 5, janelaMs = 15 * 60 * 1000, agora = () => Date.now() } = {}) {
  const tentativas = new Map();

  function chave(req) {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${req.ip}|${email}`;
  }

  function limparExpiradas(momento) {
    for (const [key, registro] of tentativas) {
      if (registro.expiraEm <= momento) tentativas.delete(key);
    }
  }

  function middleware(req, res, next) {
    const momento = agora();
    limparExpiradas(momento);
    const key = chave(req);
    const registro = tentativas.get(key);

    if (registro && registro.falhas >= maxTentativas) {
      const segundos = Math.ceil((registro.expiraEm - momento) / 1000);
      res.set('Retry-After', String(segundos));
      return res.status(429).json({
        erro: `Muitas tentativas sem sucesso. Tente novamente em ${Math.ceil(segundos / 60)} minuto(s).`
      });
    }

    res.on('finish', () => {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        const atual = tentativas.get(key);
        if (atual && atual.expiraEm > agora()) {
          atual.falhas += 1;
        } else {
          tentativas.set(key, { falhas: 1, expiraEm: agora() + janelaMs });
        }
      } else if (res.statusCode < 400) {
        // Login certo zera o contador desse e-mail
        tentativas.delete(key);
      }
    });

    return next();
  }

  middleware.limpar = () => tentativas.clear();
  return middleware;
}

module.exports = { criarLimiteTentativas };

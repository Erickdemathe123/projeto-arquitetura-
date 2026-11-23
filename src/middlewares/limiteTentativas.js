// Os contadores ficam na memória do servidor e são separados por IP e identificador.
function criarLimiteTentativas({
  maxTentativas = 5,
  janelaMs = 15 * 60 * 1000,
  agora = () => Date.now(),
  obterIdentificador = (req) => req.body?.email,
  contarSucessos = false
} = {}) {
  const tentativas = new Map();

  function chave(req) {
    const identificador = obterIdentificador(req);
    const normalizado = typeof identificador === 'string' ? identificador.trim().toLowerCase() : '';
    return `${req.ip}|${normalizado}`;
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
        erro: `Muitas tentativas. Tente novamente em ${Math.ceil(segundos / 60)} minuto(s).`
      });
    }

    res.on('finish', () => {
      const respostaDeErroDoCliente = res.statusCode >= 400 && res.statusCode < 500;
      const contabilizar = respostaDeErroDoCliente || (contarSucessos && res.statusCode < 400);
      if (contabilizar) {
        const atual = tentativas.get(key);
        if (atual && atual.expiraEm > agora()) {
          atual.falhas += 1;
        } else {
          tentativas.set(key, { falhas: 1, expiraEm: agora() + janelaMs });
        }
      } else if (res.statusCode < 400) {
        // Um login correto zera o contador; consultas públicas contam sucessos.
        tentativas.delete(key);
      }
    });

    return next();
  }

  middleware.limpar = () => tentativas.clear();
  return middleware;
}

module.exports = { criarLimiteTentativas };

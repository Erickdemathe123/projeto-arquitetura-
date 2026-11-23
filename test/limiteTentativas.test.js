const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { criarLimiteTentativas } = require('../src/middlewares/limiteTentativas');

// App mínimo: a senha "certa" devolve 200, qualquer outra devolve 401
async function iniciar(t, opcoes) {
  let momento = 0;
  const limite = criarLimiteTentativas({ ...opcoes, agora: () => momento });
  const app = express();
  app.use(express.json());
  app.post('/login', limite, (req, res) => {
    if (req.body.senha === 'certa') return res.json({ ok: true });
    return res.status(401).json({ erro: 'Credenciais inválidas.' });
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/login`;
  const login = (email, senha) => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });
  return { login, avancar: (ms) => { momento += ms; } };
}

test('bloqueia depois de 3 tentativas erradas e libera quando a janela acaba', async (t) => {
  const { login, avancar } = await iniciar(t, { maxTentativas: 3, janelaMs: 60_000 });
  for (let i = 0; i < 3; i += 1) {
    assert.equal((await login('ana@escola.edu.br', 'errada')).status, 401);
  }
  const bloqueado = await login('ana@escola.edu.br', 'certa');
  assert.equal(bloqueado.status, 429);
  assert.equal(bloqueado.headers.get('retry-after'), '60');
  assert.match((await bloqueado.json()).erro, /Muitas tentativas/);

  avancar(60_000);
  assert.equal((await login('ana@escola.edu.br', 'certa')).status, 200);
});

test('conta cada e-mail separado e o login certo zera o contador', async (t) => {
  const { login } = await iniciar(t, { maxTentativas: 2, janelaMs: 60_000 });
  await login('ana@escola.edu.br', 'errada');
  assert.equal((await login('ana@escola.edu.br', 'certa')).status, 200);
  assert.equal((await login('ana@escola.edu.br', 'errada')).status, 401);
  assert.equal((await login('ana@escola.edu.br', 'errada')).status, 401);
  assert.equal((await login('ana@escola.edu.br', 'errada')).status, 429);
  // Outro e-mail no mesmo IP continua liberado
  assert.equal((await login('bruno@escola.edu.br', 'certa')).status, 200);
});

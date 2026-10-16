const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const criarApp = require('../src/app');

// Encerra conexões abertas do pool após os testes
after(() => pool.end());

test('Autenticação (T11): cadastro, validação de domínio, login e proteção JWT', async (t) => {
  const app = criarApp();
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const url = `http://127.0.0.1:${server.address().port}`;

  // 1. Rejeição de domínio de e-mail inválido
  const resEmailInvalido = await fetch(`${url}/api/auth/cadastro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Professor Teste',
      email: 'professor@dominio_invalido',
      senha: 'SenhaValida123',
      role: 'professor'
    })
  });
  assert.equal(resEmailInvalido.status, 400);
  const jsonEmailInvalido = await resEmailInvalido.json();
  assert.match(jsonEmailInvalido.erro, /e-mail/i);

  // 2. Rejeição de senha curta (menos de 6 caracteres)
  const resSenhaCurta = await fetch(`${url}/api/auth/cadastro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Professor Teste',
      email: 'professor@catolicasc.edu.br',
      senha: '123',
      role: 'professor'
    })
  });
  assert.equal(resSenhaCurta.status, 400);
  const jsonSenhaCurta = await resSenhaCurta.json();
  assert.match(jsonSenhaCurta.erro, /mínimo 6 caracteres/i);

  // 3. Sucesso no cadastro de professor
  const hashSalvo = await bcrypt.hash('SenhaForte2026!', 12);
  const usuariosDb = new Map();
  usuariosDb.set('existente@catolicasc.edu.br', {
    id: 10,
    name: 'Prof. Henrique Silveira',
    email: 'existente@catolicasc.edu.br',
    password_hash: hashSalvo,
    role: 'professor',
    ra: null,
    created_at: new Date().toISOString()
  });

  t.mock.method(pool, 'query', async (sql, params) => {
    const sqlTexto = typeof sql === 'string' ? sql : sql.sql || '';

    if (sqlTexto.includes('WHERE email = ?')) {
      const emailBuscado = params && params[0];
      const encontrado = usuariosDb.get(emailBuscado);
      return [encontrado ? [encontrado] : []];
    }
    if (sqlTexto.includes('INSERT INTO users')) {
      const idGerado = usuariosDb.size + 1;
      const novo = {
        id: idGerado,
        name: params[0],
        email: params[1],
        password_hash: params[2],
        role: params[3],
        ra: params[4],
        created_at: new Date().toISOString()
      };
      usuariosDb.set(novo.email, novo);
      return [{ insertId: idGerado }];
    }
    if (sqlTexto.includes('WHERE id = ?')) {
      const idBuscado = params && Number(params[0]);
      for (const u of usuariosDb.values()) {
        if (u.id === idBuscado) return [[u]];
      }
      return [[]];
    }
    return [[]];
  });

  const resCadastro = await fetch(`${url}/api/auth/cadastro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Prof. Henrique Silveira',
      email: 'henrique@catolicasc.edu.br',
      senha: 'SenhaForte2026!',
      role: 'professor'
    })
  });
  assert.equal(resCadastro.status, 201);
  const jsonCadastro = await resCadastro.json();
  assert.ok(jsonCadastro.token, 'Deve retornar token JWT');
  assert.equal(jsonCadastro.usuario.email, 'henrique@catolicasc.edu.br');
  assert.equal(jsonCadastro.usuario.passwordHash, undefined, 'Nunca deve expor o hash de senha');

  // 4. Rejeição de e-mail duplicado (409)
  const resEmailDuplicado = await fetch(`${url}/api/auth/cadastro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Outro Professor',
      email: 'existente@catolicasc.edu.br',
      senha: 'SenhaForte2026!',
      role: 'professor'
    })
  });
  assert.equal(resEmailDuplicado.status, 409);
  const jsonDuplicado = await resEmailDuplicado.json();
  assert.equal(jsonDuplicado.erro, 'E-mail já cadastrado.');

  // 5. Login com sucesso (retorna 200 e token válido)
  const resLogin = await fetch(`${url}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'existente@catolicasc.edu.br',
      senha: 'SenhaForte2026!'
    })
  });
  assert.equal(resLogin.status, 200);
  const jsonLogin = await resLogin.json();
  assert.ok(jsonLogin.token);
  assert.equal(jsonLogin.usuario.id, 10);

  // Decodifica o token para checar o payload JWT
  const decoded = jwt.decode(jsonLogin.token);
  assert.equal(decoded.id, 10);
  assert.equal(decoded.role, 'professor');
  assert.equal(decoded.email, 'existente@catolicasc.edu.br');

  // 6. Login com senha errada (retorna 401)
  const resSenhaErrada = await fetch(`${url}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'existente@catolicasc.edu.br',
      senha: 'SenhaTotalmenteErrada!'
    })
  });
  assert.equal(resSenhaErrada.status, 401);
  const jsonSenhaErrada = await resSenhaErrada.json();
  assert.equal(jsonSenhaErrada.erro, 'E-mail ou senha incorretos.');

  // 7. Rota protegida /api/auth/me sem token (retorna 401)
  const resSemToken = await fetch(`${url}/api/auth/me`);
  assert.equal(resSemToken.status, 401);
  const jsonSemToken = await resSemToken.json();
  assert.match(jsonSemToken.erro, /token/i);

  // 8. Rota protegida /api/auth/me com token inválido (retorna 401)
  const resTokenInvalido = await fetch(`${url}/api/auth/me`, {
    headers: { Authorization: 'Bearer token_invalido_falso' }
  });
  assert.equal(resTokenInvalido.status, 401);

  // 9. Rota protegida /api/auth/me com token válido (retorna 200 com dados do usuário)
  const resComToken = await fetch(`${url}/api/auth/me`, {
    headers: { Authorization: `Bearer ${jsonLogin.token}` }
  });
  assert.equal(resComToken.status, 200);
  const jsonMe = await resComToken.json();
  assert.equal(jsonMe.id, 10);
  assert.equal(jsonMe.email, 'existente@catolicasc.edu.br');
});

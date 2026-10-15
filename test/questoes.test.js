const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const repository = require('../src/repositories/questaoRepository');
const service = require('../src/services/questaoService');
const criarApp = require('../src/app');
const valido = { enunciado: '  Quanto é 2 + 2? ', disciplina: 'Matemática', assunto: 'Adição', alternativas: ['3', '4'], alternativaCorreta: 1 };
after(() => pool.end());

test('validação aceita 2–5 alternativas e normaliza campos', () => {
  assert.equal(service.validar(valido).enunciado, 'Quanto é 2 + 2?');
  assert.equal(service.validar({ ...valido, alternativas: ['a','b','c','d','e'], alternativaCorreta: 4 }).alternativas.length, 5);
});
test('validação rejeita dados vazios, limites, gabarito inválido e tentativa de trocar professor', () => {
  const invalidos = [
    null, [], {}, { ...valido, professorId: 2 }, { ...valido, enunciado: ' ' },
    { ...valido, enunciado: 'a'.repeat(10001) }, { ...valido, disciplina: 1 },
    { ...valido, assunto: 'a'.repeat(121) }, { ...valido, tipo: 'Dissertativa' },
    { ...valido, alternativas: ['a'] }, { ...valido, alternativas: ['a','b','c','d','e','f'] },
    { ...valido, alternativas: ['a',' '] }, { ...valido, alternativas: ['a',null] },
    { ...valido, alternativas: ['a','b'.repeat(256)] },
    ...[-1, 2, 0.5, '1', null, [0,1]].map(alternativaCorreta => ({ ...valido, alternativaCorreta }))
  ];
  for (const dados of invalidos) assert.throws(() => service.validar(dados), erro => erro.status === 400);
});
test('HTTP autentica JWT, restringe papel e usa somente identidade assinada', async t => {
  const secret = 'segredo-apenas-testes-01234567890123456789';
  const anterior = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  t.after(() => { if (anterior === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = anterior; });
  const server = criarApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/questoes`;
  const token = (payload = {}, options = {}) => jwt.sign({ role: 'professor', ...payload }, secret,
    { subject: '7', issuer: 'sgp', audience: 'sgp-api', expiresIn: '5m', ...options });
  const listar = t.mock.method(repository, 'listar', async () => []);
  const obter = t.mock.method(repository, 'obter', async () => null);
  const invalidos = [
    ['',401], ['Bearer invalido',401],
    ['Bearer ' + token({}, { expiresIn: -1 }),401],
    ['Bearer ' + token({}, { audience: 'outro' }),401],
    ['Bearer ' + token({}, { issuer: 'outro' }),401],
    ['Bearer ' + token({}, { algorithm: 'HS384' }),401],
    ['Bearer ' + token({}, { subject: '0' }),401],
    ['Bearer ' + token({}, { subject: '1e2' }),401],
    ['Bearer ' + token({ role: 'aluno' }),403],
    ['Bearer ' + jwt.sign({ sub: '7', role: 'professor', iss: 'sgp', aud: 'sgp-api' }, secret),401],
    ['Bearer ' + jwt.sign({ sub: '7', role: 'professor' }, 'segredo-diferente'),401]
  ];
  for (const [authorization, status] of invalidos) {
    const res = await fetch(url, { headers: { authorization, 'x-professor-id': '7' } });
    assert.equal(res.status, status);
  }
  assert.equal(listar.mock.callCount(), 0);
  const headers = { authorization: 'Bearer ' + token(), 'x-professor-id': '99', 'Content-Type': 'application/json' };
  let res = await fetch(url, { headers });
  assert.equal(res.status, 200);
  assert.deepEqual(listar.mock.calls[0].arguments, [7]);
  res = await fetch(url + '/15', { headers });
  assert.equal(res.status, 404);
  assert.deepEqual(obter.mock.calls[0].arguments, [7,15]);
  for (const id of ['0','-1','1e2','9007199254740992']) {
    res = await fetch(url + '/' + id, { headers });
    assert.equal(res.status, 400);
  }
  res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ ...valido, professorId: 99 }) });
  assert.equal(res.status, 400);
  delete process.env.JWT_SECRET;
  res = await fetch(url, { headers });
  assert.equal(res.status, 503);
});

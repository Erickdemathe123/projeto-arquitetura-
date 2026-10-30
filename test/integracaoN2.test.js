const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const criarApp = require('../src/app');
const questaoService = require('../src/services/questaoService');
const questaoRepository = require('../src/repositories/questaoRepository');
const avaliacaoService = require('../src/services/avaliacaoService');
const avaliacaoRepository = require('../src/repositories/avaliacaoRepository');
const pool = require('../src/config/db');
const turmaService = require('../src/services/turmaService');

const JWT_SECRET = process.env.JWT_SECRET || 'sgp_jwt_secret_dev_key_2026';

async function iniciarServidor(t) {
  const server = criarApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

function token(role) {
  return jwt.sign({ id: 17, role, email: `${role}@exemplo.com` }, JWT_SECRET);
}

test('rotas de domínio exigem professor autenticado e validam IDs antes do banco', async (t) => {
  const baseUrl = await iniciarServidor(t);
  const adminRoutes = ['/api/turmas', '/api/questoes', '/api/avaliacoes'];

  for (const route of adminRoutes) {
    const anonimo = await fetch(`${baseUrl}${route}`, {
      headers: { 'x-professor-id': '17' }
    });
    assert.equal(anonimo.status, 401, `${route} deve exigir autenticação`);

    const aluno = await fetch(`${baseUrl}${route}`, {
      headers: { Authorization: `Bearer ${token('aluno')}` }
    });
    assert.equal(aluno.status, 403, `${route} deve exigir papel professor`);
  }

  const professorHeaders = { Authorization: `Bearer ${token('professor')}` };
  const questaoIdInvalido = await fetch(`${baseUrl}/api/questoes/invalido`, {
    method: 'PUT',
    headers: { ...professorHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(questaoIdInvalido.status, 400);

  const turmaIdInvalido = await fetch(`${baseUrl}/api/turmas/invalido/alunos`, {
    headers: professorHeaders
  });
  assert.equal(turmaIdInvalido.status, 400);

  t.mock.method(turmaService, 'importarAlunos', async (professorId, turmaId, csv) => {
    assert.equal(professorId, 17);
    assert.equal(turmaId, 4);
    assert.equal(csv, 'nome;ra\nAna;RA-1');
    return { total: 1, matriculados: [{ nome: 'Ana', ra: 'RA-1' }], jaMatriculados: [], erros: [] };
  });
  const importacao = await fetch(`${baseUrl}/api/turmas/4/alunos/importar`, {
    method: 'POST',
    headers: { ...professorHeaders, 'Content-Type': 'text/csv' },
    body: 'nome;ra\nAna;RA-1'
  });
  assert.equal(importacao.status, 200);
  assert.equal((await importacao.json()).matriculados[0].ra, 'RA-1');
});

test('questões validam alternativas e convertem bloqueio por vínculo em conflito', async (t) => {
  const payload = {
    text: 'Quanto é 2 + 2?',
    subject: 'Matemática',
    topic: 'Aritmética',
    alternatives: ['3', '4'],
    correctAlternative: 1
  };
  t.mock.method(questaoRepository, 'criar', async (dados) => dados);

  const criada = await questaoService.criar(17, payload);
  assert.equal(criada.professorId, 17);
  assert.equal(criada.correctAlternative, 1);
  await assert.rejects(
    questaoService.criar(17, { ...payload, alternatives: ['a', 'b', 'c', 'd', 'e', 'f'] }),
    (erro) => erro.status === 400
  );

  t.mock.method(questaoRepository, 'remover', async () => {
    throw Object.assign(new Error('foreign key constraint'), { code: 'ER_ROW_IS_REFERENCED_2' });
  });
  await assert.rejects(
    questaoService.remover(17, 25),
    (erro) => erro.status === 409 && /vinculada a uma avaliação/.test(erro.message)
  );
});

test('avaliações rejeitam questões repetidas e estado de gabarito não booleano', async (t) => {
  t.mock.method(avaliacaoRepository, 'criar', async (_professorId, dados) => dados);
  const valid = { name: 'Prova 1', questionIds: [3, 5] };
  const criada = await avaliacaoService.criar(17, valid);
  assert.deepEqual(criada.questionIds, [3, 5]);

  await assert.rejects(
    avaliacaoService.criar(17, { ...valid, questionIds: [3, 3] }),
    (erro) => erro.status === 400
  );
  await assert.rejects(
    avaliacaoService.definirLiberada(17, 8, 'false'),
    (erro) => erro.status === 400
  );
});

test('consulta pública por código retorna disponibilidade sem expor respostas', async (t) => {
  const baseUrl = await iniciarServidor(t);
  t.mock.method(pool, 'query', async (_sql, params) => {
    assert.deepEqual(params, ['SGP-ABC123']);
    return [[{ title: 'Avaliação de teste', status: 'closed' }]];
  });

  const response = await fetch(`${baseUrl}/api/avaliacoes/codigo/sgp-abc123`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    name: 'Avaliação de teste',
    released: true,
    resultAvailable: false
  });
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const criarApp = require('../src/app');
const versaoService = require('../src/services/versaoService');
const versaoRepository = require('../src/repositories/versaoRepository');
const avaliacaoRepository = require('../src/repositories/avaliacaoRepository');

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

test('rotas de versões exigem professor autenticado e validam o id da avaliação', async (t) => {
  const baseUrl = await iniciarServidor(t);

  const anonimo = await fetch(`${baseUrl}/api/avaliacoes/1/versoes`);
  assert.equal(anonimo.status, 401);

  const aluno = await fetch(`${baseUrl}/api/avaliacoes/1/versoes`, {
    headers: { Authorization: `Bearer ${token('aluno')}` }
  });
  assert.equal(aluno.status, 403);

  const idInvalido = await fetch(`${baseUrl}/api/avaliacoes/invalido/versoes`, {
    headers: { Authorization: `Bearer ${token('professor')}` }
  });
  assert.equal(idInvalido.status, 400);
});

test('gerar recusa avaliação sem questões e valida a quantidade de versões', async (t) => {
  t.mock.method(avaliacaoRepository, 'buscarPorId', async () => ({
    id: 8,
    questionSnapshots: [],
    versions: 1,
    shuffleQuestions: true,
    shuffleAlternatives: true
  }));
  await assert.rejects(versaoService.gerar(17, 8, {}), (erro) => erro.status === 400);

  t.mock.method(avaliacaoRepository, 'buscarPorId', async () => ({
    id: 8,
    questionSnapshots: [{ id: 1, alternatives: ['a', 'b'], correctAlternative: 0 }],
    versions: 1,
    shuffleQuestions: true,
    shuffleAlternatives: true
  }));
  await assert.rejects(versaoService.gerar(17, 8, { versions: 0 }), (erro) => erro.status === 400);
  await assert.rejects(versaoService.gerar(17, 8, { versions: 27 }), (erro) => erro.status === 400);
});

test('gerar monta os itens impressos de cada versão e persiste via o repositório', async (t) => {
  const questionSnapshots = [
    { id: 1, alternatives: ['a', 'b', 'c'], correctAlternative: 1 },
    { id: 2, alternatives: ['x', 'y'], correctAlternative: 0 }
  ];
  t.mock.method(avaliacaoRepository, 'buscarPorId', async () => ({
    id: 8,
    questionSnapshots,
    versions: 2,
    shuffleQuestions: false,
    shuffleAlternatives: false
  }));
  let recebido = null;
  t.mock.method(versaoRepository, 'substituir', async (examId, versoes) => {
    recebido = { examId, versoes };
    return versoes.map((v, i) => ({ id: i + 1, examId, label: v.label, printedItems: v.printedItems }));
  });

  const resultado = await versaoService.gerar(17, 8, { seed: 1 });
  assert.equal(recebido.examId, 8);
  assert.equal(recebido.versoes.length, 2);
  assert.deepEqual(recebido.versoes.map((v) => v.label), ['A', 'B']);
  // sem embaralhar nada, a ordem e os índices corretos batem com os originais
  assert.deepEqual(recebido.versoes[0].printedItems, [
    { question_id: 1, alternative_order: [0, 1, 2], correct_index: 1 },
    { question_id: 2, alternative_order: [0, 1], correct_index: 0 }
  ]);
  assert.equal(resultado.length, 2);
});

test('gerar propaga como conflito quando a avaliação já tem correções', async (t) => {
  t.mock.method(avaliacaoRepository, 'buscarPorId', async () => ({
    id: 8,
    questionSnapshots: [{ id: 1, alternatives: ['a', 'b'], correctAlternative: 0 }],
    versions: 1,
    shuffleQuestions: true,
    shuffleAlternatives: true
  }));
  t.mock.method(versaoRepository, 'substituir', async () => {
    throw Object.assign(new Error('Esta avaliação já tem provas corrigidas: não é possível gerar novas versões.'), {
      code: 'EXAM_ALREADY_CORRECTED'
    });
  });
  await assert.rejects(versaoService.gerar(17, 8, {}), (erro) => erro.status === 409);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const criarApp = require('../src/app');
const pdfFolha = require('../src/utils/folhaPdf');
const resultadoService = require('../src/services/resultadoService');
const resultadoRepository = require('../src/repositories/resultadoRepository');
const avaliacaoRepository = require('../src/repositories/avaliacaoRepository');
const alunoRepository = require('../src/repositories/alunoRepository');
const turmaRepository = require('../src/repositories/turmaRepository');
const versaoRepository = require('../src/repositories/versaoRepository');
const avaliacaoService = require('../src/services/avaliacaoService');
const pool = require('../src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'sgp_jwt_secret_dev_key_2026';

async function iniciarServidor(t) {
  const server = criarApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

function token(role = 'professor') {
  return jwt.sign({ id: 17, role, email: `${role}@exemplo.com` }, JWT_SECRET);
}

test('T44 gera PDF A4 com folha de respostas e conteúdo de QR', async () => {
  const pdf = await pdfFolha.gerar({
    id: 8,
    name: 'Avaliação T44',
    publicCode: 'SGP-ABC123',
    questionSnapshots: [],
    standaloneAnswerSheet: false
  }, [{ label: 'A', printedItems: [
    { question_id: 1, alternative_order: [0, 1, 2, 3, 4], correct_index: 2 }
  ] }], 1);

  assert.ok(Buffer.isBuffer(pdf));
  assert.equal(pdf.subarray(0, 4).toString('ascii'), '%PDF');
  assert.ok(pdf.length > 1000);
});

test('T50 calcula nota pela nota de cada questão e persiste respostas numa transação', async (t) => {
  t.mock.method(avaliacaoRepository, 'buscarPorId', async () => ({
    id: 8,
    applicationClassId: 4,
    questionIds: [1, 2],
    questionPoints: [1, 3],
    questionSnapshots: [
      { id: 1, alternatives: ['a', 'b'], correctAlternative: 0 },
      { id: 2, alternatives: ['x', 'y'], correctAlternative: 1 }
    ]
  }));
  t.mock.method(versaoRepository, 'listarPorAvaliacao', async () => [{
    id: 2,
    label: 'A',
    printedItems: [
      { question_id: 1, alternative_order: [0, 1], correct_index: 0 },
      { question_id: 2, alternative_order: [0, 1], correct_index: 1 }
    ]
  }]);
  t.mock.method(alunoRepository, 'buscarPorRa', async () => ({ id: 51, nome: 'Ana', ra: 'RA-1' }));
  t.mock.method(turmaRepository, 'estaMatriculado', async () => true);
  let registroAutomatico = null;
  t.mock.method(resultadoRepository, 'registrarAutomatico', async (dados) => {
    registroAutomatico = dados;
    return dados;
  });

  const resultado = await resultadoService.corrigirAutomaticamente(17, 8, {
    ra: 'RA-1',
    versao: 'A',
    respostas: [0, 0]
  });

  assert.equal(resultado.score, 2.5);
  assert.deepEqual(resultado.answers, [
    { questionId: 1, markedIndex: 0 },
    { questionId: 2, markedIndex: 0 }
  ]);
  assert.equal(registroAutomatico.versionId, 2);
});

test('T50 valida respostas, versão e aluno antes de corrigir', async (t) => {
  t.mock.method(avaliacaoRepository, 'buscarPorId', async () => ({
    id: 8,
    applicationClassId: 4,
    questionIds: [1],
    questionPoints: [1]
  }));
  t.mock.method(versaoRepository, 'listarPorAvaliacao', async () => [{
    id: 2,
    label: 'A',
    printedItems: [{ question_id: 1, alternative_order: [0, 1], correct_index: 0 }]
  }]);

  await assert.rejects(
    resultadoService.corrigirAutomaticamente(17, 8, { ra: 'RA-1', respostas: [5] }),
    (erro) => erro.status === 400
  );
  await assert.rejects(
    resultadoService.corrigirAutomaticamente(17, 8, { respostas: ['A'] }),
    (erro) => erro.status === 400
  );
});

test('T50 cria atribuição antes das respostas para satisfazer o banco', async (t) => {
  const queries = [];
  let committed = false;
  const connection = {
    beginTransaction: async () => {},
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (/FROM results r/.test(sql)) return [[{
        id: 1,
        exam_id: 8,
        student_id: 51,
        student_name: 'Ana',
        ra: 'RA-1',
        score: 8,
        corrected_at: new Date()
      }]];
      return [[], []];
    },
    commit: async () => { committed = true; },
    rollback: async () => {},
    release: () => {}
  };
  t.mock.method(pool, 'getConnection', async () => connection);
  t.mock.method(pool, 'query', async () => [[{
    id: 1,
    exam_id: 8,
    student_id: 51,
    student_name: 'Ana',
    ra: 'RA-1',
    score: 8,
    corrected_at: new Date()
  }]]);

  await resultadoRepository.registrarAutomatico({
    examId: 8,
    teacherId: 17,
    studentId: 51,
    score: 8,
    versionId: 2,
    persistAnswers: true,
    answers: [{ questionId: 1, markedIndex: 0 }]
  });

  assert.equal(committed, true);
  assert.ok(queries.some(({ sql }) => /INSERT INTO exam_assignments/.test(sql)));
  assert.ok(queries.some(({ sql }) => /INSERT INTO result_answers/.test(sql)));
});

test('T56 cria avaliação avulsa somente com quantidade e gabarito', async (t) => {
  t.mock.method(avaliacaoRepository, 'criarAvulsa', async (professorId, dados) => ({ professorId, ...dados }));

  const criada = await avaliacaoService.criarAvulsa(17, {
    name: 'Folha avulsa',
    questionCount: 20,
    correctAnswers: ['A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E']
  });

  assert.equal(criada.questionCount, 20);
  assert.equal(criada.correctAnswers.length, 20);

  await assert.rejects(
    avaliacaoService.criarAvulsa(17, { name: 'Folha', questionCount: 21, correctAnswers: [] }),
    (erro) => erro.status === 400
  );
});

test('rotas T44, T50 e T56 exigem autenticação e validam os parâmetros', async (t) => {
  const baseUrl = await iniciarServidor(t);

  const pdf = await fetch(`${baseUrl}/api/avaliacoes/8/pdf`);
  assert.equal(pdf.status, 401);

  const correcao = await fetch(`${baseUrl}/api/avaliacoes/8/correcoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ra: 'RA-1', respostas: ['A'] })
  });
  assert.equal(correcao.status, 401);

  const avulsa = await fetch(`${baseUrl}/api/avaliacoes/avulsa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(avulsa.status, 401);

  const pdfInvalido = await fetch(`${baseUrl}/api/avaliacoes/invalido/pdf`, {
    headers: { Authorization: `Bearer ${token()}` }
  });
  assert.equal(pdfInvalido.status, 400);
});

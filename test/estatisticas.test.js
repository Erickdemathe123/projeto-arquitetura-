const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const criarApp = require('../src/app');
const estatisticaService = require('../src/services/estatisticaService');
const avaliacaoRepository = require('../src/repositories/avaliacaoRepository');
const resultadoRepository = require('../src/repositories/resultadoRepository');
const versaoRepository = require('../src/repositories/versaoRepository');
const { JWT_SECRET } = require('../src/config/auth');

// Questão 10: a / b / c, correta = b (índice 1).
// Versão A (id 1) imprime na ordem original. Versão B (id 2) imprime c, a, b (correta no índice impresso 2).
const questoes = [
  { id: 10, text: 'Qual é a letra do meio?', alternatives: ['a', 'b', 'c'], correctAlternative: 1 },
  { id: 11, text: 'Questão sem respostas', alternatives: ['x', 'y'], correctAlternative: 0 }
];
const versoes = [
  { id: 1, label: 'A', printedItems: [
    { question_id: 10, alternative_order: [0, 1, 2], correct_index: 1 },
    { question_id: 11, alternative_order: [0, 1], correct_index: 0 }
  ] },
  { id: 2, label: 'B', printedItems: [
    { question_id: 10, alternative_order: [2, 0, 1], correct_index: 2 },
    { question_id: 11, alternative_order: [1, 0], correct_index: 1 }
  ] }
];
const resposta = (studentId, versionId, markedIndex) => ({ studentId, questionId: 10, versionId, markedIndex });
const respostas = [
  resposta(1, 1, 1), // acerto (b)
  resposta(2, 1, 0), // erro: marcou a
  resposta(3, 2, 2), // acerto: impresso C = b original
  resposta(4, 2, 1), // erro: impresso B = a original
  resposta(5, 2, 0), // erro: impresso A = c original
  resposta(6, 1, null) // em branco
];

test('acerto por questão e contagem por alternativa convertem a ordem impressa de cada versão', () => {
  const [q10, q11] = estatisticaService.calcularPorQuestao({ questoes, versoes, respostas });

  assert.equal(q10.respostas, 6);
  assert.equal(q10.acertos, 2);
  assert.equal(q10.erros, 3);
  assert.equal(q10.brancos, 1);
  assert.equal(q10.taxaAcerto, 0.33);
  assert.deepEqual(q10.alternativas.map((a) => [a.letra, a.marcacoes, a.correta]), [
    ['A', 2, false],
    ['B', 2, true],
    ['C', 1, false]
  ]);
  assert.deepEqual(q10.alternativaIncorretaMaisMarcada, { indice: 0, letra: 'A', texto: 'a', marcacoes: 2 });

  assert.equal(q11.respostas, 0);
  assert.equal(q11.taxaAcerto, null);
  assert.equal(q11.alternativaIncorretaMaisMarcada, null);
});

test('empate entre incorretas escolhe a primeira alternativa da questão original', () => {
  const empate = [resposta(1, 1, 0), resposta(2, 1, 2)];
  const [q10] = estatisticaService.calcularPorQuestao({ questoes, versoes, respostas: empate });
  assert.equal(q10.alternativaIncorretaMaisMarcada.letra, 'A');
  assert.equal(q10.taxaAcerto, 0);
});

test('resumo das notas traz média, mínima e máxima, e null quando não há notas', () => {
  assert.deepEqual(
    estatisticaService.resumirNotas([{ score: 10 }, { score: 6.5 }, { score: 4 }, { score: null }]),
    { corrigidos: 3, media: 6.83, minima: 4, maxima: 10 }
  );
  assert.deepEqual(estatisticaService.resumirNotas([]), { corrigidos: 0, media: null, minima: null, maxima: null });
});

test('estatisticas() junta notas e respostas e rejeita avaliação de outro professor', async (t) => {
  t.mock.method(avaliacaoRepository, 'buscarPorId', async (professorId, id) =>
    (professorId === 17 && id === 8 ? { id: 8, questionSnapshots: questoes } : null));
  t.mock.method(resultadoRepository, 'listarPorAvaliacao', async () => [{ score: 8 }, { score: 6 }]);
  t.mock.method(resultadoRepository, 'listarRespostasPorAvaliacao', async () => respostas);
  t.mock.method(versaoRepository, 'listarPorAvaliacao', async () => versoes);

  const dados = await estatisticaService.estatisticas(17, 8);
  assert.equal(dados.media, 7);
  assert.equal(dados.minima, 6);
  assert.equal(dados.maxima, 8);
  assert.equal(dados.alunosComRespostas, 6);
  assert.equal(dados.questoes.length, 2);

  await assert.rejects(() => estatisticaService.estatisticas(99, 8), (erro) => erro.status === 404);
  await assert.rejects(() => estatisticaService.estatisticas(17, 'abc'), (erro) => erro.status === 400);
});

test('GET /api/avaliacoes/:id/estatisticas exige professor e valida o id', async (t) => {
  const server = criarApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const token = (role) => jwt.sign({ id: 17, role, email: `${role}@x.com` }, JWT_SECRET);

  assert.equal((await fetch(`${baseUrl}/api/avaliacoes/8/estatisticas`)).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/avaliacoes/8/estatisticas`, { headers: { Authorization: `Bearer ${token('aluno')}` } })).status, 403);
  assert.equal((await fetch(`${baseUrl}/api/avaliacoes/x/estatisticas`, { headers: { Authorization: `Bearer ${token('professor')}` } })).status, 400);

  t.mock.method(estatisticaService, 'estatisticas', async () => ({ examId: 8, questoes: [] }));
  const ok = await fetch(`${baseUrl}/api/avaliacoes/8/estatisticas`, { headers: { Authorization: `Bearer ${token('professor')}` } });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).examId, 8);
});

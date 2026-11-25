
const { test } = require('node:test');
const assert = require('node:assert/strict');

const avaliacaoService = require('../src/services/avaliacaoService');
const avaliacaoRepository = require('../src/repositories/avaliacaoRepository');

function montarAvaliacao(quantidade) {
  return {
    name: 'Avaliação de teste',
    questionIds: Array.from(
      { length: quantidade },
      (_, index) => index + 1
    )
  };
}

test('RF03: permite criar avaliação com 25 questões', async (t) => {
  t.mock.method(
    avaliacaoRepository,
    'criar',
    async (_professorId, dados) => dados
  );

  const resultado = await avaliacaoService.criar(
    17,
    montarAvaliacao(25)
  );

  assert.equal(resultado.questionIds.length, 25);
  assert.equal(resultado.questionPoints.length, 25);
});

test('RF03: rejeita criação com 26 questões', async (t) => {
  const repositorio = t.mock.method(
    avaliacaoRepository,
    'criar',
    async (_professorId, dados) => dados
  );

  await assert.rejects(
    () => avaliacaoService.criar(17, montarAvaliacao(26)),
    erro => erro.status === 400 && erro.message.includes('25 questões')
  );

  assert.equal(repositorio.mock.callCount(), 0);
});

test('RF03: permite editar avaliação com 25 questões', async (t) => {
  t.mock.method(
    avaliacaoRepository,
    'atualizar',
    async (_professorId, _id, dados) => dados
  );

  const resultado = await avaliacaoService.atualizar(
    17,
    8,
    montarAvaliacao(25)
  );

  assert.equal(resultado.questionIds.length, 25);
});

test('RF03: rejeita edição com 26 questões', async (t) => {
  const repositorio = t.mock.method(
    avaliacaoRepository,
    'atualizar',
    async (_professorId, _id, dados) => dados
  );

  await assert.rejects(
    () => avaliacaoService.atualizar(17, 8, montarAvaliacao(26)),
    erro => erro.status === 400 && erro.message.includes('25 questões')
  );

  assert.equal(repositorio.mock.callCount(), 0);
});

test('RF03: rejeita avaliação sem questões', async () => {
  await assert.rejects(
    () => avaliacaoService.criar(17, montarAvaliacao(0)),
    erro => erro.status === 400
  );
});

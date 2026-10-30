const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const criarApp = require('../src/app');
const resultadoService = require('../src/services/resultadoService');
const resultadoRepository = require('../src/repositories/resultadoRepository');
const avaliacaoRepository = require('../src/repositories/avaliacaoRepository');
const alunoRepository = require('../src/repositories/alunoRepository');
const turmaRepository = require('../src/repositories/turmaRepository');

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

test('rotas de resultados exigem professor autenticado e validam IDs', async (t) => {
  const baseUrl = await iniciarServidor(t);

  const anonimo = await fetch(`${baseUrl}/api/avaliacoes/1/resultados`);
  assert.equal(anonimo.status, 401);

  const aluno = await fetch(`${baseUrl}/api/avaliacoes/1/resultados`, {
    headers: { Authorization: `Bearer ${token('aluno')}` }
  });
  assert.equal(aluno.status, 403);

  const idInvalido = await fetch(`${baseUrl}/api/avaliacoes/invalido/resultados`, {
    headers: { Authorization: `Bearer ${token('professor')}` }
  });
  assert.equal(idInvalido.status, 400);
});

test('listar resumo calcula status pendente/em_andamento/concluida pela contagem de resultados', async (t) => {
  t.mock.method(avaliacaoRepository, 'buscarPorId', async () => ({ id: 8, applicationClassId: 4 }));
  t.mock.method(resultadoRepository, 'listarPorAvaliacao', async () => []);
  t.mock.method(resultadoRepository, 'contarMatriculados', async () => 3);

  const vazio = await resultadoService.listar(17, 8);
  assert.equal(vazio.status, 'pendente');
  assert.equal(vazio.corrigidos, 0);

  t.mock.method(resultadoRepository, 'listarPorAvaliacao', async () => [
    { studentId: 1, score: 8 },
    { studentId: 2, score: 9 }
  ]);
  const parcial = await resultadoService.listar(17, 8);
  assert.equal(parcial.status, 'em_andamento');

  t.mock.method(resultadoRepository, 'listarPorAvaliacao', async () => [
    { studentId: 1, score: 8 },
    { studentId: 2, score: 9 },
    { studentId: 3, score: 7 }
  ]);
  const completo = await resultadoService.listar(17, 8);
  assert.equal(completo.status, 'concluida');
});

test('registrar exige avaliação aplicada a uma turma, aluno existente e matriculado, e nota entre 0 e 10', async (t) => {
  t.mock.method(avaliacaoRepository, 'buscarPorId', async () => ({ id: 8, applicationClassId: 4 }));
  t.mock.method(alunoRepository, 'buscarPorRa', async () => ({ id: 51, nome: 'Ana', ra: 'RA-1' }));
  t.mock.method(turmaRepository, 'estaMatriculado', async () => true);
  t.mock.method(resultadoRepository, 'registrar', async (dados) => dados);

  const registrado = await resultadoService.registrar(17, 8, { ra: 'RA-1', score: 9.5 });
  assert.equal(registrado.studentId, 51);
  assert.equal(registrado.score, 9.5);

  await assert.rejects(
    resultadoService.registrar(17, 8, { ra: 'RA-1', score: 15 }),
    (erro) => erro.status === 400
  );
  await assert.rejects(
    resultadoService.registrar(17, 8, { ra: '', score: 9 }),
    (erro) => erro.status === 400
  );

  t.mock.method(avaliacaoRepository, 'buscarPorId', async () => ({ id: 8, applicationClassId: null }));
  await assert.rejects(
    resultadoService.registrar(17, 8, { ra: 'RA-1', score: 9 }),
    (erro) => erro.status === 409
  );

  t.mock.method(avaliacaoRepository, 'buscarPorId', async () => ({ id: 8, applicationClassId: 4 }));
  t.mock.method(alunoRepository, 'buscarPorRa', async () => null);
  await assert.rejects(
    resultadoService.registrar(17, 8, { ra: 'RA-404', score: 9 }),
    (erro) => erro.status === 404
  );

  t.mock.method(alunoRepository, 'buscarPorRa', async () => ({ id: 51, nome: 'Ana', ra: 'RA-1' }));
  t.mock.method(turmaRepository, 'estaMatriculado', async () => false);
  await assert.rejects(
    resultadoService.registrar(17, 8, { ra: 'RA-1', score: 9 }),
    (erro) => erro.status === 409
  );
});

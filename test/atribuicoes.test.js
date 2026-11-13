const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const criarApp = require('../src/app');
const pool = require('../src/config/db');
const avaliacaoRepository = require('../src/repositories/avaliacaoRepository');
const atribuicaoRepository = require('../src/repositories/atribuicaoRepository');
const atribuicaoService = require('../src/services/atribuicaoService');

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

test('repository busca atribuição pelo QR e restringe a consulta à avaliação', async (t) => {
  const row = {
    exam_id: 8,
    student_id: 51,
    student_name: 'Ana',
    version_id: 2,
    version_label: 'B'
  };
  t.mock.method(pool, 'query', async (sql, params) => {
    assert.match(sql, /assignment\.exam_id = \? AND assignment\.qr_code = \?/);
    assert.deepEqual(params, [8, 'opaque-code']);
    return [[row]];
  });

  const atribuicao = await atribuicaoRepository.buscarPorQrCode(8, 'opaque-code');
  assert.deepEqual({ ...atribuicao }, {
    examId: 8,
    studentId: 51,
    studentName: 'Ana',
    versionId: 2,
    versionLabel: 'B'
  });
});

test('validação de QR exige professor autenticado e id válido', async (t) => {
  const baseUrl = await iniciarServidor(t);
  const url = `${baseUrl}/api/avaliacoes/8/atribuicoes/validar-qr`;

  const anonimo = await fetch(url, { method: 'POST' });
  assert.equal(anonimo.status, 401);

  const aluno = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token('aluno')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrCode: 'opaque-code' })
  });
  assert.equal(aluno.status, 403);

  const idInvalido = await fetch(`${baseUrl}/api/avaliacoes/invalido/atribuicoes/validar-qr`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token('professor')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrCode: 'opaque-code' })
  });
  assert.equal(idInvalido.status, 400);
});

test('validar QR confere a propriedade da avaliação e retorna a atribuição sem expor o código', async (t) => {
  const atribuicaoEsperada = {
    examId: 8,
    studentId: 51,
    studentName: 'Ana',
    versionId: 2,
    versionLabel: 'B'
  };
  t.mock.method(avaliacaoRepository, 'buscarPorId', async (professorId, examId) => {
    assert.equal(professorId, 17);
    assert.equal(examId, 8);
    return { id: 8 };
  });
  const buscar = t.mock.method(atribuicaoRepository, 'buscarPorQrCode', async (examId, qrCode) => {
    assert.equal(examId, 8);
    assert.equal(qrCode, 'opaque-code');
    return atribuicaoEsperada;
  });

  const resultado = await atribuicaoService.validarQr(17, '8', { qrCode: ' opaque-code ' });
  assert.deepEqual(resultado, atribuicaoEsperada);
  assert.equal(Object.hasOwn(resultado, 'qrCode'), false);
  assert.equal(buscar.mock.calls.length, 1);
});

test('validar QR rejeita código inválido e QR ausente ou pertencente a outra prova', async (t) => {
  t.mock.method(avaliacaoRepository, 'buscarPorId', async () => ({ id: 8 }));
  const buscar = t.mock.method(atribuicaoRepository, 'buscarPorQrCode', async () => null);

  await assert.rejects(
    atribuicaoService.validarQr(17, 8, { qrCode: 'código inválido' }),
    (error) => error.status === 400
  );
  assert.equal(buscar.mock.calls.length, 0);

  await assert.rejects(
    atribuicaoService.validarQr(17, 8, { qrCode: 'code-from-another-exam' }),
    (error) => error.status === 404 && /não pertence/.test(error.message)
  );
  assert.equal(buscar.mock.calls.length, 1);
});

test('validar QR não revela atribuições de avaliações que não pertencem ao professor', async (t) => {
  t.mock.method(avaliacaoRepository, 'buscarPorId', async () => null);
  const buscar = t.mock.method(atribuicaoRepository, 'buscarPorQrCode', async () => {
    throw new Error('não deveria consultar QR de avaliação alheia');
  });

  await assert.rejects(
    atribuicaoService.validarQr(17, 8, { qrCode: 'opaque-code' }),
    (error) => error.status === 404 && error.message === 'Avaliação não encontrada.'
  );
  assert.equal(buscar.mock.calls.length, 0);
});

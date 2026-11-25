
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const jwt = require('jsonwebtoken');

const criarApp = require('../src/app');
const service = require('../src/services/relatorioService');
const avaliacaoRepository = require('../src/repositories/avaliacaoRepository');
const resultadoRepository = require('../src/repositories/resultadoRepository');
const versaoRepository = require('../src/repositories/versaoRepository');
const { JWT_SECRET } = require('../src/config/auth');

test('RF12: exporta notas e respostas em Excel', async (t) => {
  t.mock.method(avaliacaoRepository, 'buscarPorId', async (professorId, id) =>
    professorId === 17 && id === 8 ? { id: 8 } : null
  );

  t.mock.method(resultadoRepository, 'listarPorAvaliacao', async () => [
    { studentId: 1, ra: '001', studentName: 'Ana', score: 10 },
    { studentId: 2, ra: '002', studentName: 'Bruno', score: 5 },
    { studentId: 3, ra: '003', studentName: 'Carlos', score: 7 }
  ]);

  t.mock.method(versaoRepository, 'listarPorAvaliacao', async () => [
    {
      id: 1,
      label: 'A',
      printedItems: [
        { question_id: 10, correct_index: 1 },
        { question_id: 11, correct_index: 0 }
      ]
    },
    {
      id: 2,
      label: 'B',
      printedItems: [
        { question_id: 11, correct_index: 1 },
        { question_id: 10, correct_index: 2 }
      ]
    }
  ]);

  t.mock.method(resultadoRepository, 'listarRespostasPorAvaliacao', async () => [
    { studentId: 1, questionId: 10, versionId: 1, markedIndex: 1 },
    { studentId: 1, questionId: 11, versionId: 1, markedIndex: 0 },
    { studentId: 2, questionId: 11, versionId: 2, markedIndex: 0 },
    { studentId: 2, questionId: 10, versionId: 2, markedIndex: 2 }
  ]);

  const { buffer, filename } = await service.exportarExcel(17, 8);

  assert.equal(filename, 'relatorio-avaliacao-8.xlsx');
  assert.ok(Buffer.isBuffer(buffer));

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const notas = workbook.getWorksheet('Notas');
  const respostas = workbook.getWorksheet('Respostas');

  assert.ok(notas);
  assert.ok(respostas);

  assert.equal(notas.rowCount, 4);
  assert.equal(notas.getCell('A2').value, '001');
  assert.equal(notas.getCell('B2').value, 'Ana');
  assert.equal(notas.getCell('C2').value, 10);

  assert.equal(respostas.getCell('G2').value, 'Acerto');
  assert.equal(respostas.getCell('G2').fill.fgColor.argb, 'FFC6EFCE');

  assert.equal(respostas.getCell('C4').value, 'B');
  assert.equal(respostas.getCell('E4').value, 'A');
  assert.equal(respostas.getCell('F4').value, 'B');
  assert.equal(respostas.getCell('G4').value, 'Erro');
  assert.equal(respostas.getCell('G4').fill.fgColor.argb, 'FFFFC7CE');

  assert.equal(respostas.getCell('E5').value, 'C');
  assert.equal(respostas.getCell('G5').value, 'Acerto');

  assert.equal(
    respostas.getCell('G6').value,
    'Sem respostas registradas'
  );

  await assert.rejects(
    () => service.exportarExcel(99, 8),
    erro => erro.status === 404
  );

  await assert.rejects(
    () => service.exportarExcel(17, 'abc'),
    erro => erro.status === 400
  );
});

test('RF12: rota Excel exige professor e retorna arquivo', async (t) => {
  const server = criarApp().listen(0, '127.0.0.1');

  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const token = role => jwt.sign(
    { id: 17, role, email: `${role}@x.com` },
    JWT_SECRET
  );

  const endpoint = `${baseUrl}/api/avaliacoes/8/resultados/excel`;

  assert.equal((await fetch(endpoint)).status, 401);

  const aluno = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token('aluno')}` }
  });

  assert.equal(aluno.status, 403);

  t.mock.method(service, 'exportarExcel', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Notas');
    workbook.addWorksheet('Respostas');

    return {
      buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
      filename: 'relatorio-avaliacao-8.xlsx'
    };
  });

  const resposta = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token('professor')}` }
  });

  assert.equal(resposta.status, 200);

  assert.equal(
    resposta.headers.get('content-type'),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  assert.equal(
    resposta.headers.get('content-disposition'),
    'attachment; filename="relatorio-avaliacao-8.xlsx"'
  );

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    Buffer.from(await resposta.arrayBuffer())
  );

  assert.ok(workbook.getWorksheet('Notas'));
  assert.ok(workbook.getWorksheet('Respostas'));
});

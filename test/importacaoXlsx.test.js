const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const criarApp = require('../src/app');
const turmaService = require('../src/services/turmaService');
const turmaRepository = require('../src/repositories/turmaRepository');
const alunoRepository = require('../src/repositories/alunoRepository');
const { JWT_SECRET } = require('../src/config/auth');

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function planilha(linhas, { abaExtra = false } = {}) {
  const livro = new ExcelJS.Workbook();
  const aba = livro.addWorksheet('Alunos');
  linhas.forEach((linha) => aba.addRow(linha));
  if (abaExtra) livro.addWorksheet('Outra').addRow(['Ignorada', 'RA-999']);
  return Buffer.from(await livro.xlsx.writeBuffer());
}

function prepararRepositorios(t) {
  const matriculados = new Set();
  const cadastrados = new Map();
  t.mock.method(turmaRepository, 'buscarPorId', async () => ({ id: 4, professorId: 17, arquivada: false }));
  t.mock.method(alunoRepository, 'buscarPorRa', async (ra) => cadastrados.get(ra) || null);
  t.mock.method(alunoRepository, 'criar', async ({ nome, ra }) => {
    const aluno = { id: cadastrados.size + 1, nome, ra };
    cadastrados.set(ra, aluno);
    return aluno;
  });
  t.mock.method(turmaRepository, 'estaMatriculado', async (_turma, alunoId) => matriculados.has(alunoId));
  t.mock.method(turmaRepository, 'matricular', async (_turma, alunoId) => { matriculados.add(alunoId); });
  return { cadastrados };
}

test('importa .xlsx com cabeçalho nome/ra lendo só a primeira aba', async (t) => {
  prepararRepositorios(t);
  const arquivo = await planilha(
    [['Nome', 'RA'], ['Ana Souza', 'RA-1'], ['Bruno Lima', 'RA-2']],
    { abaExtra: true }
  );
  const resultado = await turmaService.importarAlunos(17, 4, arquivo);
  assert.equal(resultado.total, 2);
  assert.deepEqual(resultado.matriculados.map((a) => a.ra), ['RA-1', 'RA-2']);
  assert.deepEqual(resultado.erros, []);
});

test('importa .xlsx sem cabeçalho e com RA numérico', async (t) => {
  prepararRepositorios(t);
  const resultado = await turmaService.importarAlunos(17, 4, await planilha([['Carla Dias', 20231234]]));
  assert.equal(resultado.matriculados[0].ra, '20231234');
});

test('.xlsx reaproveita o relatório de erros por linha do CSV', async (t) => {
  prepararRepositorios(t);
  const arquivo = await planilha([
    ['nome', 'ra'],
    ['Ana', 'RA-1'],
    ['', 'RA-2'],
    ['Ana de novo', 'RA-1'],
    ['Sem RA', '']
  ]);
  const resultado = await turmaService.importarAlunos(17, 4, arquivo);
  assert.equal(resultado.total, 4);
  assert.equal(resultado.matriculados.length, 1);
  assert.deepEqual(
    resultado.erros.map((e) => [e.linha, e.motivo]),
    [
      [3, 'Nome não informado.'],
      [4, 'RA repetido no arquivo.'],
      [5, 'Informe o RA do aluno.']
    ]
  );
});

test('.xlsx inválido ou vazio devolve erro 400 claro', async (t) => {
  prepararRepositorios(t);
  await assert.rejects(
    () => turmaService.importarAlunos(17, 4, Buffer.from('isto não é uma planilha')),
    (erro) => erro.status === 400 && /xlsx válido/.test(erro.message)
  );
  const vazia = await planilha([]);
  await assert.rejects(
    () => turmaService.importarAlunos(17, 4, vazia),
    (erro) => erro.status === 400 && /vazio/.test(erro.message)
  );
});

test('rota aceita o corpo binário .xlsx e continua aceitando CSV', async (t) => {
  const server = criarApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const headers = { Authorization: `Bearer ${jwt.sign({ id: 17, role: 'professor', email: 'p@x.com' }, JWT_SECRET)}` };

  const recebidos = [];
  t.mock.method(turmaService, 'importarAlunos', async (_p, _t, conteudo) => {
    recebidos.push(conteudo);
    return { total: 0, matriculados: [], jaMatriculados: [], erros: [] };
  });

  const arquivo = await planilha([['nome', 'ra'], ['Ana', 'RA-1']]);
  const xlsx = await fetch(`${baseUrl}/api/turmas/4/alunos/importar`, {
    method: 'POST', headers: { ...headers, 'Content-Type': XLSX_MIME }, body: arquivo
  });
  assert.equal(xlsx.status, 200);
  assert.ok(Buffer.isBuffer(recebidos[0]));
  assert.equal(recebidos[0].length, arquivo.length);

  const csv = await fetch(`${baseUrl}/api/turmas/4/alunos/importar`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'text/csv' }, body: 'nome;ra\nAna;RA-1'
  });
  assert.equal(csv.status, 200);
  assert.equal(recebidos[1], 'nome;ra\nAna;RA-1');
});

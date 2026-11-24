const { test } = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const jwt = require('jsonwebtoken');
const criarApp = require('../src/app');
const cadernoService = require('../src/services/cadernoService');
const avaliacaoRepository = require('../src/repositories/avaliacaoRepository');
const versaoRepository = require('../src/repositories/versaoRepository');
const atribuicaoRepository = require('../src/repositories/atribuicaoRepository');
const cadernoPdf = require('../src/utils/cadernoPdf');
const { gerarCadernoDocx, montarItens, nomeArquivo, formatarPontos } = require('../src/utils/cadernoDocx');

const { JWT_SECRET } = require('../src/config/auth');

// Lê um arquivo de dentro do .docx (zip) sem dependências extras.
function lerDoZip(buffer, nome) {
  const fimCentral = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let pos = buffer.readUInt32LE(fimCentral + 16);
  const total = buffer.readUInt16LE(fimCentral + 10);
  for (let i = 0; i < total; i++) {
    const metodo = buffer.readUInt16LE(pos + 10);
    const tamanho = buffer.readUInt32LE(pos + 20);
    const nomeLen = buffer.readUInt16LE(pos + 28);
    const extraLen = buffer.readUInt16LE(pos + 30);
    const comentarioLen = buffer.readUInt16LE(pos + 32);
    const local = buffer.readUInt32LE(pos + 42);
    const atual = buffer.toString('utf8', pos + 46, pos + 46 + nomeLen);
    if (atual === nome) {
      const inicio = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
      const dados = buffer.subarray(inicio, inicio + tamanho);
      return (metodo === 8 ? zlib.inflateRawSync(dados) : dados).toString('utf8');
    }
    pos += 46 + nomeLen + extraLen + comentarioLen;
  }
  throw new Error(`${nome} não encontrado no .docx`);
}

const avaliacao = {
  id: 8,
  name: 'Prova de Matemática',
  institution: 'Católica SC',
  course: 'Engenharia de Software',
  subject: 'Cálculo',
  professor: 'Prof. Ana',
  className: 'Turma A',
  date: '2026-11-27',
  instructions: 'Marque apenas uma alternativa.',
  publicCode: 'SGP-ABC123',
  questionIds: [1, 2],
  questionPoints: [1, 2.5],
  questionSnapshots: [
    { id: 1, text: 'Quanto é 2 + 2?', alternatives: ['3', '4', '5'], correctAlternative: 1 },
    { id: 2, text: 'Qual a derivada de x²?', alternatives: ['x', '2x'], correctAlternative: 1 }
  ]
};

const versoes = [
  { label: 'A', printedItems: [
    { question_id: 1, alternative_order: [0, 1, 2], correct_index: 1 },
    { question_id: 2, alternative_order: [0, 1], correct_index: 1 }
  ] },
  { label: 'B', printedItems: [
    { question_id: 2, alternative_order: [1, 0], correct_index: 0 },
    { question_id: 1, alternative_order: [2, 0, 1], correct_index: 2 }
  ] }
];

test('montarItens segue a ordem impressa da versão e cai na ordem original sem versão', () => {
  const itensB = montarItens(avaliacao.questionSnapshots, versoes[1]);
  assert.deepEqual(itensB.map((item) => item.questao.id), [2, 1]);
  assert.deepEqual(itensB[0].alternativas, ['2x', 'x']);
  assert.deepEqual(itensB[1].alternativas, ['5', '3', '4']);

  const original = montarItens(avaliacao.questionSnapshots, null);
  assert.deepEqual(original.map((item) => item.questao.id), [1, 2]);
  assert.deepEqual(original[0].alternativas, ['3', '4', '5']);
});

test('o .docx tem uma seção por versão, questões na ordem impressa e sem quebrar questão entre páginas', async () => {
  const buffer = await gerarCadernoDocx(avaliacao, versoes);
  assert.equal(buffer.subarray(0, 2).toString(), 'PK');
  const xml = lerDoZip(buffer, 'word/document.xml');

  assert.ok(xml.includes('Versão A') && xml.includes('Versão B'));
  assert.ok(xml.includes('Código: SGP-ABC123'));
  assert.ok(xml.includes('Marque apenas uma alternativa.'));
  assert.ok(xml.includes('(2,5 pontos)'));

  // 2 seções = 1 quebra de seção no meio + a sectPr final do corpo
  assert.equal((xml.match(/<w:sectPr/g) || []).length, 2);

  // Na versão B a questão 2 vem antes da 1
  const inicioB = xml.indexOf('Versão B');
  assert.ok(xml.indexOf('Qual a derivada', inicioB) < xml.indexOf('Quanto é 2 + 2?', inicioB));

  // Cada questão mantém o bloco junto: enunciado + alternativas com keepNext, menos a última linha
  const keepNext = (xml.match(/<w:keepNext\/>/g) || []).length;
  // por versão: questão 1 = 3 (enunciado + a + b), questão 2 = 2 (enunciado + a)
  assert.equal(keepNext, 2 * (3 + 2));
  assert.ok((xml.match(/<w:keepLines\/>/g) || []).length >= 2 * (4 + 3));
});

test('sem versões geradas exporta a ordem original como versão única', async () => {
  const xml = lerDoZip(await gerarCadernoDocx(avaliacao, []), 'word/document.xml');
  assert.ok(xml.includes('Versão única'));
  assert.equal((xml.match(/<w:sectPr/g) || []).length, 1);
});

test('nome do arquivo e rótulo de pontos', () => {
  assert.equal(nomeArquivo(avaliacao, null), 'prova-de-matematica.docx');
  assert.equal(nomeArquivo(avaliacao, 'B'), 'prova-de-matematica-versao-B.docx');
  assert.equal(formatarPontos(1), '(1 ponto)');
  assert.equal(formatarPontos(0), '');
});

test('serviço valida avaliação, questões e versão pedida', async (t) => {
  t.mock.method(avaliacaoRepository, 'buscarPorId', async () => null);
  await assert.rejects(cadernoService.exportarDocx(17, 8), (erro) => erro.status === 404);
  await assert.rejects(cadernoService.exportarDocx(17, 'x'), (erro) => erro.status === 400);

  t.mock.method(avaliacaoRepository, 'buscarPorId', async () => ({ ...avaliacao, questionSnapshots: [] }));
  await assert.rejects(cadernoService.exportarDocx(17, 8), (erro) => erro.status === 400);

  t.mock.method(avaliacaoRepository, 'buscarPorId', async () => avaliacao);
  t.mock.method(versaoRepository, 'listarPorAvaliacao', async () => versoes);
  await assert.rejects(cadernoService.exportarDocx(17, 8, 'Z'), (erro) => erro.status === 404);
  await assert.rejects(cadernoService.exportarDocx(17, 8, '1!'), (erro) => erro.status === 400);

  const { buffer, filename } = await cadernoService.exportarDocx(17, 8, 'b');
  assert.equal(filename, 'prova-de-matematica-versao-B.docx');
  const xml = lerDoZip(buffer, 'word/document.xml');
  assert.ok(xml.includes('Versão B') && !xml.includes('Versão A'));
});

test('serviço exporta todas as atribuições em um único PDF', async (t) => {
  t.mock.method(avaliacaoRepository, 'buscarPorId', async () => ({
    ...avaliacao,
    applicationClassId: 4
  }));
  t.mock.method(versaoRepository, 'listarPorAvaliacao', async () => versoes);
  t.mock.method(atribuicaoRepository, 'listarPorAvaliacao', async () => [
    { studentId: 51, studentName: 'Ana', studentRa: 'RA-1', versionLabel: 'A', qrCode: 'a'.repeat(64) },
    { studentId: 52, studentName: 'Beto', studentRa: 'RA-2', versionLabel: 'B', qrCode: 'b'.repeat(64) }
  ]);
  const gerarLote = t.mock.method(cadernoPdf, 'gerarLote', async (exam, assignments, availableVersions) => {
    assert.equal(exam.id, avaliacao.id);
    assert.equal(assignments.length, 2);
    assert.deepEqual(availableVersions, versoes);
    return Buffer.from('%PDF-lote');
  });

  const resultado = await cadernoService.exportarPdf(17, avaliacao.id);
  assert.equal(resultado.filename, 'prova-de-matematica-turma.pdf');
  assert.equal(resultado.buffer.toString(), '%PDF-lote');
  assert.equal(gerarLote.mock.calls.length, 1);
});

test('rota GET /api/avaliacoes/:id/caderno/docx exige professor e devolve o arquivo', async (t) => {
  const server = criarApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const anonimo = await fetch(`${baseUrl}/api/avaliacoes/8/caderno/docx`);
  assert.equal(anonimo.status, 401);

  t.mock.method(cadernoService, 'exportarDocx', async () => ({ buffer: Buffer.from('PKdocx'), filename: 'prova.docx' }));
  const token = jwt.sign({ id: 17, role: 'professor', email: 'p@exemplo.com' }, JWT_SECRET);
  const resposta = await fetch(`${baseUrl}/api/avaliacoes/8/caderno/docx?versao=A`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(resposta.status, 200);
  assert.match(resposta.headers.get('content-type'), /wordprocessingml/);
  assert.match(resposta.headers.get('content-disposition'), /attachment; filename="prova.docx"/);
  assert.equal(Buffer.from(await resposta.arrayBuffer()).toString(), 'PKdocx');
});

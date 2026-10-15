const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

test('MySQL real: health, CRUD, isolamento, rollback e proteção de provas', async t => {
  const database = 'sgp_t12_test_' + process.pid + '_' + Date.now();
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', multipleStatements: true
  });
  let server;
  let pool;
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (pool) await pool.end();
    await admin.query('DROP DATABASE IF EXISTS ' + database);
    await admin.end();
  });
  const schema = (await fs.readFile(path.join(__dirname, '../../database/schema.sql'), 'utf8')).replace(/\bsgp\b/g, database);
  await admin.query(schema);
  const envAnterior = { DB_NAME: process.env.DB_NAME, JWT_SECRET: process.env.JWT_SECRET, DB_HOST: process.env.DB_HOST };
  process.env.DB_NAME = database;
  process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
  process.env.JWT_SECRET = 'segredo-integration-only-01234567890123456789';
  pool = require('../../src/config/db');
  const repository = require('../../src/repositories/questaoRepository');
  const criarApp = require('../../src/app');
  server = criarApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    for (const [key, value] of Object.entries(envAnterior)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  await admin.query("INSERT INTO professores (nome,email,senha_hash) VALUES ('A','a@example.test','hash-teste'),('B','b@example.test','hash-teste')");
  const token = id => jwt.sign({ role: 'professor' }, process.env.JWT_SECRET,
    { subject: String(id), issuer: 'sgp', audience: 'sgp-api', expiresIn: '5m' });
  const url = `http://127.0.0.1:${server.address().port}`;
  async function request(method, rota, professor = 1, body) {
    const res = await fetch(url + rota, {
      method, headers: { authorization: 'Bearer ' + token(professor), 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    return { status: res.status, data: res.status === 204 ? null : await res.json() };
  }
  const dados = { enunciado: "Quanto é 2 + 2? ' OR 1=1 --", disciplina: 'Matemática', assunto: 'Adição', alternativas: ['3','4','5'], alternativaCorreta: 1 };
  assert.equal((await request('GET','/health')).status, 200);
  let res = await request('POST','/api/questoes',1,dados);
  assert.equal(res.status,201);
  const id = res.data.id;
  assert.deepEqual(res.data.alternativas, dados.alternativas);
  assert.equal(res.data.enunciado, dados.enunciado);
  const [[saved]] = await admin.query('SELECT enunciado FROM questoes WHERE id = ?', [id]);
  assert.equal(saved.enunciado, dados.enunciado);
  assert.equal((await request('GET','/api/questoes')).data.length,1);
  assert.deepEqual((await request('GET','/api/questoes',2)).data,[]);
  for (const method of ['GET','PUT','DELETE']) {
    assert.equal((await request(method,'/api/questoes/'+id,2,method === 'PUT' ? dados : undefined)).status,404);
  }
  res = await request('PUT','/api/questoes/'+id,1,{ ...dados, alternativas: ['a','b','c','d','e'], alternativaCorreta:4 });
  assert.equal(res.status,200);
  assert.equal(res.data.alternativas.length,5);
  res = await request('PUT','/api/questoes/'+id,1,{ ...dados, alternativas: ['sim','não'], alternativaCorreta:0 });
  assert.equal(res.status,200);
  assert.deepEqual(res.data.alternativas,['sim','não']);
  assert.equal((await request('PUT','/api/questoes/'+id,1,{ ...dados, alternativaCorreta:8 })).status,400);
  assert.deepEqual((await request('GET','/api/questoes/'+id)).data.alternativas,['sim','não']);
  const [[before]] = await admin.query('SELECT COUNT(*) total FROM questoes');
  await assert.rejects(repository.criar(1,{ ...dados, tipo:'Múltipla escolha', alternativas:['ok','x'.repeat(256)] }));
  const [[after]] = await admin.query('SELECT COUNT(*) total FROM questoes');
  assert.equal(after.total,before.total,'falha nas alternativas deve desfazer questão');
  await assert.rejects(repository.atualizar(1,id,{ ...dados, tipo:'Múltipla escolha', alternativas:['ok','x'.repeat(256)] }));
  assert.deepEqual((await request('GET','/api/questoes/'+id)).data.alternativas,['sim','não'],'rollback deve restaurar alternativas');
  const updates = await Promise.all([
    request('PUT','/api/questoes/'+id,1,{ ...dados, alternativas:['a','b'], alternativaCorreta:0 }),
    request('PUT','/api/questoes/'+id,1,{ ...dados, alternativas:['c','d','e'], alternativaCorreta:2 })
  ]);
  assert.ok(updates.every(update => update.status === 200));
  const final = (await request('GET','/api/questoes/'+id)).data;
  assert.ok(JSON.stringify(final.alternativas) === '["a","b"]' || JSON.stringify(final.alternativas) === '["c","d","e"]');
  await admin.query("INSERT INTO turmas (professor_id,nome,codigo_convite) VALUES (1,'Turma','TEST26AA')");
  await admin.query("INSERT INTO avaliacoes (professor_id,turma_id,nome,codigo_publico) VALUES (1,1,'Prova','TESTE')");
  await admin.query('INSERT INTO avaliacao_questoes (avaliacao_id,questao_id,ordem) VALUES (1,?,0)',[id]);
  assert.equal((await request('DELETE','/api/questoes/'+id)).status,409);
  assert.equal((await request('PUT','/api/questoes/'+id,1,dados)).status,409);
  await admin.query('DELETE FROM avaliacao_questoes WHERE questao_id = ?',[id]);
  assert.equal((await request('DELETE','/api/questoes/'+id)).status,204);
  assert.equal((await request('GET','/api/questoes/'+id)).status,404);
  const [[alternatives]] = await admin.query('SELECT COUNT(*) total FROM questao_alternativas WHERE questao_id = ?',[id]);
  assert.equal(alternatives.total,0);
  console.log('PASS persistência, isolamento entre professores, transações, concorrência e FK');
});

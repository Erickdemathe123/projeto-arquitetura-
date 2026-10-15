const mysql = require('mysql2/promise');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });
  const prefix = 'sgp_t07_test_' + process.pid + '_' + Date.now();
  const databases = [prefix + '_fresh', prefix + '_upgrade'];
  async function runFile(file, database) {
    const sql = (await fs.readFile(path.join(__dirname, file), 'utf8')).replace(/\bsgp\b/g, database);
    await connection.query(sql);
  }
  async function rejects(sql, code) {
    await assert.rejects(connection.query(sql), error => error.code === code);
  }
  try {
    for (const [index, database] of databases.entries()) {
      if (index === 0) {
        await runFile('schema.sql', database);
        await runFile('schema.sql', database);
      } else {
        await runFile('../test/fixtures/schema-pre-t07.sql', database);
        await runFile('migrations/001-complementos-n2.sql', database);
      }
      await runFile('seed.sql', database);
      await runFile('seed.sql', database);
      const [tables] = await connection.query('SHOW TABLES');
      assert.equal(tables.length, 10);
      for (const [table, count] of [['professores',2], ['alunos',2], ['turmas',2], ['matriculas',2], ['questoes',2], ['questao_alternativas',5], ['avaliacoes',1], ['avaliacao_questoes',1], ['aplicacoes',1]]) {
        const [[row]] = await connection.query('SELECT COUNT(*) total FROM ' + table);
        assert.equal(row.total, count, table + ' deve manter seed idempotente');
      }
      await rejects("INSERT INTO professores (nome,email,senha_hash) VALUES ('Duplicado','professor.a@example.test','hash')", 'ER_DUP_ENTRY');
      await rejects("INSERT INTO alunos (nome,ra,email) VALUES ('Duplicado','OUTRO','aluno.a@example.test')", 'ER_DUP_ENTRY');
      await rejects("INSERT INTO matriculas (turma_id,aluno_id) VALUES (@turma_a,@aluno_a)", 'ER_DUP_ENTRY');
      await rejects("INSERT INTO questao_alternativas (questao_id,ordem,texto) VALUES (@questao_a,5,'Inválida')", 'ER_CHECK_CONSTRAINT_VIOLATED');
      await rejects("UPDATE questoes SET alternativa_correta = 5 WHERE id = @questao_a", 'ER_CHECK_CONSTRAINT_VIOLATED');
      await rejects("UPDATE avaliacao_questoes SET pontuacao = 0", 'ER_CHECK_CONSTRAINT_VIOLATED');
      await rejects("INSERT INTO aplicacoes (avaliacao_id,turma_id,professor_id) VALUES (@avaliacao,(SELECT id FROM turmas WHERE professor_id=@professor_b LIMIT 1),@professor_a)", 'ER_NO_REFERENCED_ROW_2');
      await rejects("DELETE FROM questoes WHERE id = @questao_a", 'ER_ROW_IS_REFERENCED_2');
      await connection.query('DELETE FROM questoes WHERE id = @questao_b');
      const [[remaining]] = await connection.query('SELECT COUNT(*) total FROM questao_alternativas WHERE questao_id = @questao_b');
      assert.equal(remaining.total, 0);
      console.log(index === 0 ? 'PASS schema novo, seed repetido e constraints' : 'PASS migração do schema anterior, seed repetido e constraints');
    }
  } finally {
    for (const database of databases) await connection.query('DROP DATABASE IF EXISTS ' + database);
    await connection.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

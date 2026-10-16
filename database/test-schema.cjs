const mysql = require('mysql2/promise');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { migrar } = require('./migrations/002-modelo-gabriel.cjs');
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
  const rejects = (sql,code) => assert.rejects(connection.query(sql), error => error.code === code);
  try {
    const database = databases[0];
    await runFile('schema.sql',database);
    await runFile('schema.sql',database);
    await runFile('seed.sql',database);
    await runFile('seed.sql',database);
    const [tables] = await connection.query('SHOW TABLES');
    assert.equal(tables.length,8);
    for (const [table,count] of [['users',4],['classes',2],['enrollments',2],['questions',2],['alternatives',5],['exams',1],['exam_questions',1],['applications',1]]) {
      const [[row]] = await connection.query('SELECT COUNT(*) total FROM ' + table);
      assert.equal(row.total,count,table+' seed repetido');
    }
    await rejects("INSERT INTO users (name,email,role) VALUES ('Aluno','professor.a@example.test','aluno')",'ER_DUP_ENTRY');
    await rejects("INSERT INTO classes (name,invite_code,teacher_id) VALUES ('Inválida','INVALIDO',@student_a)",'ER_NO_REFERENCED_ROW_2');
    await rejects("INSERT INTO enrollments (class_id,student_id) VALUES (@class_a,@teacher_a)",'ER_NO_REFERENCED_ROW_2');
    await rejects("INSERT INTO alternatives (question_id,position,text,is_correct) VALUES (@question_a,5,'X',0)",'ER_CHECK_CONSTRAINT_VIOLATED');
    await rejects("INSERT INTO alternatives (question_id,position,text,is_correct) VALUES (@question_a,3,'X',1)",'ER_DUP_ENTRY');
    await rejects("INSERT INTO applications (exam_id,class_id,teacher_id) VALUES (@exam,@class_b,@teacher_a)",'ER_NO_REFERENCED_ROW_2');
    await rejects("INSERT INTO exam_questions (exam_id,question_id,teacher_id,position) VALUES (@exam,@question_b,@teacher_a,1)",'ER_NO_REFERENCED_ROW_2');
    await rejects('UPDATE exam_questions SET points=0','ER_CHECK_CONSTRAINT_VIOLATED');
    await rejects('DELETE FROM questions WHERE id=@question_a','ER_ROW_IS_REFERENCED_2');
    await connection.query('DELETE FROM questions WHERE id=@question_b');
    const [[remaining]] = await connection.query('SELECT COUNT(*) total FROM alternatives WHERE question_id=@question_b');
    assert.equal(remaining.total,0);
    process.env.DB_NAME=database;
    process.env.DB_HOST=process.env.DB_HOST || '127.0.0.1';
    const pool=require('../src/config/db');
    try {
      const turmas=require('../src/services/turmaService');
      const turma=await turmas.criarTurma(1,{nome:'Turma HTTP',descricao:'Compatibilidade'});
      assert.equal(turma.professorId,1);
      assert.equal(turma.nome,'Turma HTTP');
      const aluno=await turmas.matricularAluno(1,turma.id,{nome:'Aluno HTTP',ra:'HTTP-1'});
      assert.equal(aluno.nome,'Aluno HTTP');
      assert.equal((await turmas.listarAlunos(1,turma.id)).length,1);
      assert.equal((await turmas.listarTurmas(1)).find(t=>t.id===turma.id).totalAlunos,1);
      await turmas.editarTurma(1,turma.id,{nome:'Turma editada'});
      assert.equal((await turmas.obterTurma(1,turma.id)).nome,'Turma editada');
      await turmas.removerAluno(1,turma.id,aluno.id);
      assert.equal((await turmas.listarAlunos(1,turma.id)).length,0);
      await turmas.arquivarTurma(1,turma.id);
      assert.equal((await turmas.obterTurma(1,turma.id)).arquivada,true);
    } finally { await pool.end(); }
    console.log('PASS oito entidades, seed, papéis, email global, alternativas, FKs e turmas existentes');
    const upgrade=databases[1];
    await runFile('../test/fixtures/schema-pre-t07.sql',upgrade);
    await connection.query([
      "INSERT INTO professores (id,nome,email,senha_hash) VALUES (7,'Professor legado','legado@example.test','hash')",
      "INSERT INTO alunos (id,nome,ra,email) VALUES (7,'Aluno legado','LEG-7','legado@example.test')",
      "INSERT INTO turmas (id,professor_id,nome,codigo_convite) VALUES (5,7,'Legada','LEGADOAA')",
      "INSERT INTO matriculas (turma_id,aluno_id) VALUES (5,7)",
      "INSERT INTO questoes (id,professor_id,enunciado,disciplina,assunto,alternativa_correta) VALUES (9,7,'Legado?','Disciplina','Assunto',1)",
      "INSERT INTO questao_alternativas (questao_id,ordem,texto) VALUES (9,0,'Não'),(9,1,'Sim')",
      "INSERT INTO avaliacoes (id,professor_id,turma_id,nome,codigo_publico) VALUES (3,7,5,'Prova legada','LEGADO')",
      "INSERT INTO avaliacao_questoes (avaliacao_id,questao_id,ordem) VALUES (3,9,0)",
      "INSERT INTO correcoes (avaliacao_id,aluno_id,nota) VALUES (3,7,8.5)"
    ].join(';'));
    await runFile('schema.sql',upgrade);
    await assert.rejects(migrar(connection),error=>error.code==='ER_DUP_ENTRY');
    const [[empty]]=await connection.query('SELECT COUNT(*) total FROM users');
    assert.equal(empty.total,0,'conflito deve desfazer toda cópia');
    await connection.query("UPDATE alunos SET email='aluno.legado@example.test'");
    const result=await migrar(connection);
    assert.equal(result.studentIdOffset,7);
    const [[student]]=await connection.query('SELECT student_id FROM enrollments');
    assert.equal(student.student_id,14);
    const [[correct]]=await connection.query('SELECT position FROM alternatives WHERE is_correct=1');
    assert.equal(correct.position,1);
    const [[application]]=await connection.query('SELECT exam_id,class_id FROM applications');
    assert.deepEqual({...application},{exam_id:3,class_id:5});
    const [[metadata]]=await connection.query('SELECT legacy_details FROM exams WHERE id=3');
    assert.equal(metadata.legacy_details.nome,'Prova legada');
    const [[old]]=await connection.query('SELECT COUNT(*) total FROM correcoes');
    assert.equal(old.total,1,'origem N3 preservada');
    await assert.rejects(migrar(connection),/Destino não vazio/);
    console.log('PASS migração com dados, IDs sobrepostos, rollback e origem preservada');
  } finally {
    for (const database of databases) await connection.query('DROP DATABASE IF EXISTS '+database);
    await connection.end();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});

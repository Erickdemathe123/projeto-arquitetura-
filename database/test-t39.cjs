const assert = require('node:assert/strict');

async function testarEstruturaT39(db) {
  const [[example]] = await db.query(`
    SELECT v.printed_items, a.question_id, a.marked_index, alt.position AS original_correct
    FROM exam_assignments ea
    JOIN exam_versions v ON v.id=ea.version_id
    JOIN result_answers a ON a.exam_id=ea.exam_id AND a.student_id=ea.student_id
    JOIN alternatives alt ON alt.question_id=a.question_id AND alt.is_correct
    WHERE ea.qr_code='T39-SEED-ALUNO-A' AND a.question_id=@question_a`);
  const [[standard]] = await db.query("SELECT printed_items FROM exam_versions WHERE exam_id=@exam AND label='A'");
  assert.deepEqual(example.printed_items.map(q => q.question_id), standard.printed_items.map(q => q.question_id).reverse());
  console.log('PASS ordem das duas questões invertida entre as versões A e B');
  const item = example.printed_items.find(q => q.question_id === example.question_id);
  assert.equal(item.correct_index, example.marked_index);
  assert.equal(item.alternative_order[item.correct_index], example.original_correct);
  assert.notEqual(item.correct_index, example.original_correct);
  console.log('PASS QR → versão B → resposta A impressa → alternativa correta B de origem');
  async function bloqueia(nome, sql, code) {
    await assert.rejects(db.query(sql), err => err.code === code, nome);
    console.log('PASS', nome, code);
  }
  await bloqueia('QR repetido entre alunos', "INSERT INTO exam_assignments (exam_id,student_id,version_id,qr_code) VALUES (@exam,@student_b,@version_b,'T39-SEED-ALUNO-A')", 'ER_DUP_ENTRY');
  await bloqueia('segunda atribuição para o mesmo aluno e prova', "INSERT INTO exam_assignments (exam_id,student_id,version_id,qr_code) VALUES (@exam,@student_a,@version_b,'OUTRO')", 'ER_DUP_ENTRY');
  await bloqueia('versão vinculada a outra avaliação', "INSERT INTO exam_assignments (exam_id,student_id,version_id,qr_code) VALUES (@exam+100,@student_b,@version_b,'OUTRA-PROVA')", 'ER_NO_REFERENCED_ROW_2');
  await bloqueia('professor como destinatário', "INSERT INTO exam_assignments (exam_id,student_id,version_id,qr_code) VALUES (@exam,@teacher_a,@version_b,'DOCENTE')", 'ER_NO_REFERENCED_ROW_2');
  await bloqueia('versão com rótulo repetido', "INSERT INTO exam_versions (exam_id,label,printed_items) SELECT exam_id,label,printed_items FROM exam_versions WHERE id=@version_b", 'ER_DUP_ENTRY');
  await bloqueia('caderno sem questões', "UPDATE exam_versions SET printed_items=JSON_ARRAY() WHERE id=@version_b", 'ER_CHECK_CONSTRAINT_VIOLATED');
  await bloqueia('resposta repetida', 'INSERT INTO result_answers SELECT * FROM result_answers', 'ER_DUP_ENTRY');
  await bloqueia('resposta de questão fora da prova', 'UPDATE result_answers SET question_id=@question_b', 'ER_NO_REFERENCED_ROW_2');
  await bloqueia('marcação fora de A–E', 'UPDATE result_answers SET marked_index=5', 'ER_CHECK_CONSTRAINT_VIOLATED');
  await bloqueia('liberação fora de 0/1', 'UPDATE exams SET answer_key_released=2', 'ER_CHECK_CONSTRAINT_VIOLATED');
  await db.beginTransaction();
  try {
    await db.query("INSERT INTO exam_assignments (exam_id,student_id,version_id,qr_code) VALUES (@exam,@student_b,@version_b,'SEM-RESULTADO')");
    await bloqueia('resposta sem nota associada', 'INSERT INTO result_answers VALUES (@exam,@student_b,@question_a,NULL)', 'ER_NO_REFERENCED_ROW_2');
    await db.query('DELETE FROM exam_assignments WHERE student_id=@student_b');
    await db.query('INSERT INTO results (exam_id,teacher_id,student_id,score) VALUES (@exam,@teacher_a,@student_b,0)');
    await bloqueia('resposta sem atribuição', 'INSERT INTO result_answers VALUES (@exam,@student_b,@question_a,NULL)', 'ER_NO_REFERENCED_ROW_2');
    await db.query('UPDATE result_answers SET marked_index=NULL');
    const [[blank]] = await db.query('SELECT marked_index FROM result_answers');
    assert.equal(blank.marked_index, null);
    console.log('PASS marcação em branco preservada como NULL');
  } finally { await db.rollback(); }
}

async function testarLiberacao(db) {
  const repo = require('../src/repositories/avaliacaoRepository');
  const [[ids]] = await db.query('SELECT @exam AS exam, @teacher_a AS teacher');
  const before = await repo.buscarPublicoPorCodigo('SEED-N2-2026', 'SEED-2026-A');
  assert.equal(before.released, false);
  assert.equal(before.score, null);
  const released = await repo.definirLiberada(ids.teacher, ids.exam, true);
  assert.equal(released.released, true);
  assert.equal(released.status, 'ready');
  assert.equal((await repo.buscarPublicoPorCodigo('SEED-N2-2026', 'SEED-2026-A')).score, 10);
  await db.query("UPDATE exams SET status='closed' WHERE id=@exam");
  await repo.definirLiberada(ids.teacher, ids.exam, false);
  assert.equal((await repo.buscarPublicoPorCodigo('SEED-N2-2026', 'SEED-2026-A')).score, null);
  console.log('PASS consulta pública no MySQL respeita liberação e bloqueio independentemente do status');
  const editada = await repo.atualizar(ids.teacher, ids.exam, {
    name: 'Prova revisada', questionIds: released.questionIds, questionPoints: released.questionPoints, details: {}
  });
  assert.equal(editada.name, 'Prova revisada');
  assert.equal((await repo.buscarPorId(ids.teacher, ids.exam)).released, false);
  const service = require('../src/services/avaliacaoService');
  await assert.rejects(service.atualizar(ids.teacher, ids.exam, {
    name: 'Tentativa', questionIds: released.questionIds.slice().reverse(), questionPoints: released.questionPoints
  }), err => err.status === 409);
  assert.equal((await repo.buscarPorId(ids.teacher, ids.exam)).name, 'Prova revisada');
  const [[answers]] = await db.query('SELECT COUNT(*) total FROM result_answers WHERE exam_id=@exam');
  assert.equal(answers.total, 2);
  assert.equal(await repo.remover(ids.teacher + 1, ids.exam), false);
  assert.equal(await repo.remover(ids.teacher, ids.exam), true);
  const [[restantes]] = await db.query('SELECT COUNT(*) total FROM result_answers WHERE exam_id=@exam');
  assert.equal(restantes.total, 0);
  console.log('PASS edição do título preserva respostas, troca de ordem com correções retorna 409 e exclusão autorizada remove a prova');
}

async function testarUpgradeT39(db, migrar) {
  await db.query("INSERT INTO users (name,email,password_hash,role) VALUES ('Teste','t39@example.test','teste','professor')");
  await db.query("INSERT INTO exams (title,teacher_id,status) VALUES ('Aberta',1,'ready'),('Liberada',1,'closed'),('Rascunho',1,'draft')");
  await db.query("INSERT INTO users (name,role,ra) VALUES ('Aluno anterior','aluno','ANTERIOR')");
  await db.query("INSERT INTO results (exam_id,teacher_id,student_id,score) VALUES (2,1,2,7.5)");
  await migrar(db);
  const [[prior]] = await db.query('SELECT score FROM results WHERE exam_id=2 AND student_id=2');
  assert.equal(Number(prior.score), 7.5);
  const [rows] = await db.query('SELECT answer_key_released FROM exams ORDER BY id');
  assert.deepEqual(rows.map(r => r.answer_key_released), [0,1,0]);
  await db.query("UPDATE exams SET answer_key_released=0 WHERE status='closed'");
  await migrar(db);
  const [[row]] = await db.query("SELECT answer_key_released FROM exams WHERE status='closed'");
  assert.equal(row.answer_key_released, 0);
  const [tables] = await db.query('SHOW TABLES');
  assert.equal(tables.length, 12);
  console.log('PASS upgrade de nove para doze tabelas, três avaliações anteriores preservadas, liberação migrada e reexecução segura');
}

module.exports = { testarEstruturaT39, testarLiberacao, testarUpgradeT39 };

// Copia o modelo legado para as oito entidades do diagrama, sem apagar a origem.
const mysql = require('mysql2/promise');
require('dotenv').config();
const tables = ['users','classes','enrollments','questions','alternatives','exams','exam_questions','applications'];

async function migrar(connection) {
  const [[lock]] = await connection.query("SELECT GET_LOCK(CONCAT(DATABASE(), ':modelo_gabriel'), 10) acquired");
  if (lock.acquired !== 1) throw new Error('Outra migração está em andamento.');
  try {
    await connection.beginTransaction();
    for (const table of tables) {
      const [[row]] = await connection.query('SELECT COUNT(*) total FROM ' + table);
      if (row.total) throw new Error('Destino não vazio: ' + table + '. Migração cancelada, sem sobrescrever dados.');
    }
    const read = async table => (await connection.query('SELECT * FROM ' + table))[0];
    const professores = await read('professores');
    const alunos = await read('alunos');
    const turmas = await read('turmas');
    const matriculas = await read('matriculas');
    const questoes = await read('questoes');
    const alternativas = await read('questao_alternativas');
    const avaliacoes = await read('avaliacoes');
    const itens = await read('avaliacao_questoes');
    const [optional] = await connection.query("SHOW TABLES LIKE 'aplicacoes'");
    const aplicacoes = optional.length ? await read('aplicacoes') : [];
    const offset = professores.reduce((max, row) => Math.max(max, Number(row.id)), 0);
    const studentId = id => {
      const mapped = Number(id) + offset;
      if (!Number.isSafeInteger(mapped)) throw new Error('ID de aluno fora do intervalo suportado.');
      return mapped;
    };
    for (const row of professores) await connection.execute(
      'INSERT INTO users (id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)',
      [row.id,row.nome,row.email,row.senha_hash,'professor',row.criado_em]);
    for (const row of alunos) await connection.execute(
      'INSERT INTO users (id,name,email,password_hash,role,ra,created_at) VALUES (?,?,?,?,?,?,?)',
      [studentId(row.id),row.nome,row.email || null,row.senha_hash || null,'aluno',row.ra,row.criado_em]);
    for (const row of turmas) await connection.execute(
      'INSERT INTO classes (id,name,invite_code,teacher_id,description,archived,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
      [row.id,row.nome,row.codigo_convite,row.professor_id,row.descricao,row.arquivada,row.criado_em,row.atualizado_em]);
    for (const row of matriculas) await connection.execute(
      'INSERT INTO enrollments (class_id,student_id,enrolled_at) VALUES (?,?,?)',
      [row.turma_id,studentId(row.aluno_id),row.matriculado_em]);
    for (const row of questoes) {
      const options = alternativas.filter(a => a.questao_id === row.id).sort((a,b)=>a.ordem-b.ordem);
      if (options.length < 2 || options.length > 5 || options.some((a,index)=>a.ordem!==index || !a.texto.trim()) ||
          !options.some(a=>a.ordem===row.alternativa_correta)) {
        throw new Error('Questão legada ' + row.id + ' precisa de revisão: 2–5 alternativas contíguas e uma correta.');
      }
      await connection.execute(
        'INSERT INTO questions (id,statement,teacher_id,subject,topic,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
        [row.id,row.enunciado,row.professor_id,row.disciplina,row.assunto,row.criado_em,row.atualizado_em]);
      for (const option of options) await connection.execute(
        'INSERT INTO alternatives (id,question_id,text,is_correct,position) VALUES (?,?,?,?,?)',
        [option.id,row.id,option.texto,option.ordem===row.alternativa_correta,option.ordem]);
    }
    for (const row of avaliacoes) {
      await connection.execute(
        'INSERT INTO exams (id,title,status,teacher_id,public_code,legacy_details,created_at) VALUES (?,?,?,?,?,?,?)',
        [row.id,row.nome,row.status || 'ready',row.professor_id,row.codigo_publico,JSON.stringify(row),row.criado_em]);
    }
    for (const row of itens) {
      const exam = avaliacoes.find(e=>e.id===row.avaliacao_id);
      await connection.execute(
        'INSERT INTO exam_questions (exam_id,question_id,teacher_id,points,position) VALUES (?,?,?,?,?)',
        [row.avaliacao_id,row.questao_id,exam.professor_id,row.pontuacao ?? 1,row.ordem]);
    }
    // O relacionamento legado Avaliacao.turma_id passa a ser Application.
    for (const row of avaliacoes) await connection.execute(
      'INSERT INTO applications (exam_id,class_id,teacher_id,applied_at) VALUES (?,?,?,?)',
      [row.id,row.turma_id,row.professor_id,row.data_aplicacao]);
    for (const row of aplicacoes) await connection.execute(
      'INSERT INTO applications (exam_id,class_id,teacher_id,applied_at) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE id=id',
      [row.avaliacao_id,row.turma_id,row.professor_id,row.data_aplicacao]);
    await connection.commit();
    return { professores: professores.length, alunos: alunos.length, questoes: questoes.length, studentIdOffset: offset };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':modelo_gabriel'))");
  }
}
module.exports = { migrar };
if (require.main === module) {
  (async () => {
    const connection = await mysql.createConnection({
      host:process.env.DB_HOST || '127.0.0.1',port:Number(process.env.DB_PORT || 3306),
      user:process.env.DB_USER || 'root',password:process.env.DB_PASSWORD || '',database:process.env.DB_NAME || 'sgp'
    });
    try { console.log(await migrar(connection)); } finally { await connection.end(); }
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}

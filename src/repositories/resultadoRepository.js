// Repositório: único ponto que acessa a tabela results no MySQL.
const pool = require('../config/db');
const Resultado = require('../models/resultadoModel');
const crypto = require('node:crypto');

async function listarPorAvaliacao(examId) {
  const [rows] = await pool.query(
    `SELECT r.*, u.name AS student_name, u.ra
       FROM results r
       JOIN users u ON u.id = r.student_id AND u.role = 'aluno'
      WHERE r.exam_id = ?
      ORDER BY u.name`,
    [examId]
  );
  return rows.map(Resultado.fromRow);
}

// Total de alunos matriculados na turma vinculada à avaliação (para medir o andamento da correção)
async function contarMatriculados(examId) {
  const [rows] = await pool.query(
    `SELECT COUNT(DISTINCT e.student_id) AS total
       FROM applications ap
       JOIN enrollments e ON e.class_id = ap.class_id
      WHERE ap.exam_id = ?`,
    [examId]
  );
  return Number(rows[0]?.total || 0);
}

async function registrar({ examId, teacherId, studentId, score }) {
  await pool.query(
    `INSERT INTO results (exam_id, teacher_id, student_id, score)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE score = VALUES(score), corrected_at = CURRENT_TIMESTAMP`,
    [examId, teacherId, studentId, score]
  );
  const [rows] = await pool.query(
    `SELECT r.*, u.name AS student_name, u.ra
       FROM results r
       JOIN users u ON u.id = r.student_id
      WHERE r.exam_id = ? AND r.student_id = ?`,
    [examId, studentId]
  );
  return Resultado.fromRow(rows[0]);
}

async function registrarAutomatico({ examId, teacherId, studentId, score, answers, persistAnswers = true, versionId = null }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO results (exam_id, teacher_id, student_id, score)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE score = VALUES(score), corrected_at = CURRENT_TIMESTAMP`,
      [examId, teacherId, studentId, score]
    );
    if (persistAnswers) {
      if (!versionId) throw new Error('Versão da correção obrigatória.');
      await connection.query(
        `INSERT INTO exam_assignments (exam_id, student_id, student_role, version_id, qr_code)
         VALUES (?, ?, 'aluno', ?, ?)
         ON DUPLICATE KEY UPDATE exam_id = exam_id`,
        [examId, studentId, versionId, `SGP-${crypto.randomBytes(24).toString('hex')}`]
      );
      await connection.query('DELETE FROM result_answers WHERE exam_id = ? AND student_id = ?', [examId, studentId]);
      for (const answer of answers) {
        await connection.query(
          `INSERT INTO result_answers (exam_id, student_id, question_id, marked_index)
           VALUES (?, ?, ?, ?)`,
          [examId, studentId, answer.questionId, answer.markedIndex]
        );
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return registrar({ examId, teacherId, studentId, score });
}

async function remover(examId, studentId) {
  const [result] = await pool.query(
    'DELETE FROM results WHERE exam_id = ? AND student_id = ?',
    [examId, studentId]
  );
  return result.affectedRows > 0;
}

// Marcações de todos os alunos da avaliação, já com a versão (caderno) que cada um recebeu
async function listarRespostasPorAvaliacao(examId) {
  const [rows] = await pool.query(
    `SELECT ra.student_id, ra.question_id, ra.marked_index, ea.version_id
       FROM result_answers ra
       JOIN exam_assignments ea ON ea.exam_id = ra.exam_id AND ea.student_id = ra.student_id
      WHERE ra.exam_id = ?`,
    [examId]
  );
  return rows.map((row) => ({
    studentId: Number(row.student_id),
    questionId: Number(row.question_id),
    markedIndex: row.marked_index === null || row.marked_index === undefined ? null : Number(row.marked_index),
    versionId: Number(row.version_id)
  }));
}

module.exports = { listarRespostasPorAvaliacao, listarPorAvaliacao, contarMatriculados, registrar, registrarAutomatico, remover };

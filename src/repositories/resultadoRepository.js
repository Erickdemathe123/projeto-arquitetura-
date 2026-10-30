// Repositório: único ponto que acessa a tabela results no MySQL.
const pool = require('../config/db');
const Resultado = require('../models/resultadoModel');

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

async function remover(examId, studentId) {
  const [result] = await pool.query(
    'DELETE FROM results WHERE exam_id = ? AND student_id = ?',
    [examId, studentId]
  );
  return result.affectedRows > 0;
}

module.exports = { listarPorAvaliacao, contarMatriculados, registrar, remover };

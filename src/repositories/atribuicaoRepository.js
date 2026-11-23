const pool = require('../config/db');
const Atribuicao = require('../models/atribuicaoModel');

async function buscarPorQrCode(examId, qrCode) {
  const [rows] = await pool.query(
    `SELECT assignment.exam_id, assignment.student_id, student.name AS student_name,
            assignment.version_id, version.label AS version_label
       FROM exam_assignments assignment
       JOIN exam_versions version
         ON version.exam_id = assignment.exam_id AND version.id = assignment.version_id
       JOIN users student
         ON student.id = assignment.student_id AND student.role = 'aluno'
      WHERE assignment.exam_id = ? AND assignment.qr_code = ?
      LIMIT 1`,
    [examId, qrCode]
  );
  return Atribuicao.fromRow(rows[0]);
}

async function listarPorAvaliacao(examId) {
  const [rows] = await pool.query(
    `SELECT assignment.exam_id, assignment.student_id, student.name AS student_name,
            student.ra, assignment.version_id, version.label AS version_label,
            assignment.qr_code
       FROM exam_assignments assignment
       JOIN exam_versions version
         ON version.exam_id = assignment.exam_id AND version.id = assignment.version_id
       JOIN users student
         ON student.id = assignment.student_id AND student.role = 'aluno'
      WHERE assignment.exam_id = ?
      ORDER BY student.name`,
    [examId]
  );
  return rows.map((row) => ({
    examId: Number(row.exam_id),
    studentId: Number(row.student_id),
    studentName: row.student_name,
    studentRa: row.ra,
    versionId: Number(row.version_id),
    versionLabel: row.version_label,
    qrCode: row.qr_code
  }));
}

async function substituirPorAlunos(examId, atribuicoes) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[{ total }]] = await connection.query(
      'SELECT COUNT(*) AS total FROM results WHERE exam_id = ?',
      [examId]
    );
    if (total > 0) {
      const error = new Error('Esta avaliação já tem provas corrigidas: não é possível gerar novas atribuições.');
      error.code = 'EXAM_ALREADY_CORRECTED';
      throw error;
    }
    await connection.query('DELETE FROM exam_assignments WHERE exam_id = ?', [examId]);
    for (const atribuicao of atribuicoes) {
      await connection.query(
        `INSERT INTO exam_assignments
         (exam_id, student_id, student_role, version_id, qr_code)
         VALUES (?, ?, 'aluno', ?, ?)`,
        [examId, atribuicao.studentId, atribuicao.versionId, atribuicao.qrCode]
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return listarPorAvaliacao(examId);
}

module.exports = { buscarPorQrCode, listarPorAvaliacao, substituirPorAlunos };

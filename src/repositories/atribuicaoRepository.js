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

module.exports = { buscarPorQrCode };

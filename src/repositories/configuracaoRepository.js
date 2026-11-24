const pool = require('../config/db');
const Configuracao = require('../models/configuracaoModel');

async function buscarPorProfessor(teacherId) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM teacher_settings WHERE teacher_id = ? LIMIT 1',
      [teacherId]
    );
    return Configuracao.fromRow(rows[0] || {});
  } catch (error) {
    // Permite que a aplicação continue funcionando durante o deploy antes da migração.
    if (error.code === 'ER_NO_SUCH_TABLE') return Configuracao.fromRow({});
    throw error;
  }
}

async function salvar(teacherId, dados) {
  await pool.query(
    `INSERT INTO teacher_settings
      (teacher_id, teacher_role, institution_name, logo_data, proof_instructions,
       answer_instructions, result_url, result_text)
     VALUES (?, 'professor', ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       institution_name = VALUES(institution_name),
       logo_data = VALUES(logo_data),
       proof_instructions = VALUES(proof_instructions),
       answer_instructions = VALUES(answer_instructions),
       result_url = VALUES(result_url),
       result_text = VALUES(result_text)`,
    [
      teacherId,
      dados.institutionName,
      dados.logo,
      dados.proofInstructions,
      dados.answerInstructions,
      dados.resultUrl,
      dados.resultText
    ]
  );
  return buscarPorProfessor(teacherId);
}

module.exports = { buscarPorProfessor, salvar };

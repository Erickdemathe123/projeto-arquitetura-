// Repositório: único ponto que acessa a tabela exam_versions no MySQL.
const pool = require('../config/db');
const Versao = require('../models/versaoModel');

async function listarPorAvaliacao(examId) {
  const [rows] = await pool.query(
    'SELECT * FROM exam_versions WHERE exam_id = ? ORDER BY label',
    [examId]
  );
  return rows.map(Versao.fromRow);
}

// Substitui todas as versões da avaliação pelas novas, numa única transação.
// Recusa a operação se já existir alguma correção (results) para a avaliação.
async function substituir(examId, versoes) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[{ total }]] = await connection.query(
      'SELECT COUNT(*) AS total FROM results WHERE exam_id = ?',
      [examId]
    );
    if (total > 0) {
      const error = new Error('Esta avaliação já tem provas corrigidas: não é possível gerar novas versões.');
      error.code = 'EXAM_ALREADY_CORRECTED';
      throw error;
    }
    await connection.query('DELETE FROM exam_versions WHERE exam_id = ?', [examId]);
    for (const versao of versoes) {
      await connection.query(
        'INSERT INTO exam_versions (exam_id, label, printed_items) VALUES (?, ?, ?)',
        [examId, versao.label, JSON.stringify(versao.printedItems)]
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

module.exports = { listarPorAvaliacao, substituir };

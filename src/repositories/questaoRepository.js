const pool = require('../config/db');
const Questao = require('../models/questaoModel');

function agrupar(rows) {
  const questoes = new Map();
  for (const row of rows) {
    let questao = questoes.get(row.id);
    if (!questao) {
      questao = {
        id: row.id,
        text: row.statement,
        subject: row.subject,
        topic: row.topic,
        alternatives: [],
        correctAlternative: 0
      };
      questoes.set(row.id, questao);
    }
    if (row.alternative_text !== null && row.alternative_text !== undefined) {
      const position = Number(row.position);
      questao.alternatives[position] = row.alternative_text;
      if (row.is_correct) questao.correctAlternative = position;
    }
  }
  return [...questoes.values()].map((questao) => new Questao(questao));
}

const SELECT_QUESTION_FIELDS = `
  SELECT q.id, q.statement, q.subject, q.topic,
         a.position, a.text AS alternative_text, a.is_correct
    FROM questions q
    LEFT JOIN alternatives a ON a.question_id = q.id`;

async function listarPorProfessor(professorId) {
  const [rows] = await pool.query(`${SELECT_QUESTION_FIELDS} WHERE q.teacher_id = ? ORDER BY q.id, a.position`, [professorId]);
  return agrupar(rows);
}

async function buscarPorId(professorId, id) {
  const [rows] = await pool.query(
    `${SELECT_QUESTION_FIELDS} WHERE q.teacher_id = ? AND q.id = ? ORDER BY a.position`,
    [professorId, id]
  );
  return agrupar(rows)[0] || null;
}

async function criar({ professorId, text, subject, topic, alternatives, correctAlternative }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO questions (teacher_id, statement, subject, topic) VALUES (?, ?, ?, ?)',
      [professorId, text, subject, topic]
    );
    for (let position = 0; position < alternatives.length; position++) {
      await connection.query(
        'INSERT INTO alternatives (question_id, text, is_correct, position) VALUES (?, ?, ?, ?)',
        [result.insertId, alternatives[position], position === correctAlternative, position]
      );
    }
    await connection.commit();
    return buscarPorId(professorId, result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function atualizar({ professorId, id, text, subject, topic, alternatives, correctAlternative }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.query(
      'SELECT id FROM questions WHERE id = ? AND teacher_id = ? FOR UPDATE',
      [id, professorId]
    );
    if (!existing.length) {
      await connection.rollback();
      return null;
    }
    await connection.query(
      'UPDATE questions SET statement = ?, subject = ?, topic = ? WHERE id = ? AND teacher_id = ?',
      [text, subject, topic, id, professorId]
    );
    await connection.query('DELETE FROM alternatives WHERE question_id = ?', [id]);
    for (let position = 0; position < alternatives.length; position++) {
      await connection.query(
        'INSERT INTO alternatives (question_id, text, is_correct, position) VALUES (?, ?, ?, ?)',
        [id, alternatives[position], position === correctAlternative, position]
      );
    }
    await connection.commit();
    return buscarPorId(professorId, id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function remover(professorId, id) {
  const [result] = await pool.query('DELETE FROM questions WHERE id = ? AND teacher_id = ?', [id, professorId]);
  return result.affectedRows > 0;
}

module.exports = { listarPorProfessor, buscarPorId, criar, atualizar, remover };

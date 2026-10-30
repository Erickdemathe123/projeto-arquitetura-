const crypto = require('node:crypto');
const pool = require('../config/db');
const Avaliacao = require('../models/avaliacaoModel');

async function snapshotsDasQuestoes(connection, professorId, questionIds) {
  const placeholders = questionIds.map(() => '?').join(', ');
  const [rows] = await connection.query(
    `SELECT q.id, q.statement, q.subject, q.topic, a.position,
            a.text AS alternative_text, a.is_correct
       FROM questions q
       LEFT JOIN alternatives a ON a.question_id = q.id
      WHERE q.teacher_id = ? AND q.id IN (${placeholders})
      ORDER BY q.id, a.position`,
    [professorId, ...questionIds]
  );
  const questions = new Map();
  for (const row of rows) {
    let question = questions.get(Number(row.id));
    if (!question) {
      question = {
        id: Number(row.id),
        text: row.statement,
        subject: row.subject || '',
        topic: row.topic || '',
        type: 'Múltipla escolha',
        alternatives: [],
        correctAlternative: 0
      };
      questions.set(Number(row.id), question);
    }
    if (row.alternative_text !== null && row.alternative_text !== undefined) {
      const position = Number(row.position);
      question.alternatives[position] = row.alternative_text;
      if (row.is_correct) question.correctAlternative = position;
    }
  }
  return questionIds.map((id) => questions.get(Number(id))).filter(Boolean);
}

function mapear(rows, links) {
  const idsPorAvaliacao = new Map();
  for (const link of links) {
    if (!idsPorAvaliacao.has(Number(link.exam_id))) idsPorAvaliacao.set(Number(link.exam_id), []);
    idsPorAvaliacao.get(Number(link.exam_id)).push(Number(link.question_id));
  }
  return rows.map((row) => new Avaliacao(row, idsPorAvaliacao.get(Number(row.id)) || []));
}

async function listarPorProfessor(professorId) {
  const [rows] = await pool.query(
    'SELECT * FROM exams WHERE teacher_id = ? ORDER BY created_at DESC, id DESC',
    [professorId]
  );
  if (!rows.length) return [];
  const ids = rows.map((row) => Number(row.id));
  const placeholders = ids.map(() => '?').join(', ');
  const [links] = await pool.query(
    `SELECT exam_id, question_id FROM exam_questions WHERE exam_id IN (${placeholders}) ORDER BY exam_id, position`,
    ids
  );
  return mapear(rows, links);
}

async function buscarPorId(professorId, id) {
  const [rows] = await pool.query('SELECT * FROM exams WHERE id = ? AND teacher_id = ?', [id, professorId]);
  if (!rows.length) return null;
  const [links] = await pool.query(
    'SELECT exam_id, question_id FROM exam_questions WHERE exam_id = ? ORDER BY position',
    [id]
  );
  return mapear(rows, links)[0];
}

async function criar(professorId, dados) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const snapshots = await snapshotsDasQuestoes(connection, professorId, dados.questionIds);
    if (snapshots.length !== dados.questionIds.length) {
      const error = new Error('Uma ou mais questões não existem ou não pertencem a este professor.');
      error.code = 'QUESTION_NOT_OWNED';
      throw error;
    }
    if (dados.applicationClassId) {
      const [classes] = await connection.query(
        'SELECT id FROM classes WHERE id = ? AND teacher_id = ? AND archived = FALSE',
        [dados.applicationClassId, professorId]
      );
      if (!classes.length) {
        const error = new Error('Turma não encontrada ou arquivada.');
        error.code = 'CLASS_NOT_OWNED';
        throw error;
      }
    }
    const publicCode = `SGP-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const details = {
      ...dados.details,
      applicationClassId: dados.applicationClassId || null,
      questionSnapshots: snapshots
    };
    const [result] = await connection.query(
      'INSERT INTO exams (title, status, teacher_id, public_code, legacy_details) VALUES (?, ?, ?, ?, ?)',
      [dados.name, 'draft', professorId, publicCode, JSON.stringify(details)]
    );
    for (let position = 0; position < dados.questionIds.length; position++) {
      await connection.query(
        'INSERT INTO exam_questions (exam_id, question_id, teacher_id, points, position) VALUES (?, ?, ?, ?, ?)',
        [result.insertId, dados.questionIds[position], professorId, 1, position]
      );
    }
    if (dados.applicationClassId) {
      await connection.query(
        'INSERT INTO applications (exam_id, class_id, teacher_id) VALUES (?, ?, ?)',
        [result.insertId, dados.applicationClassId, professorId]
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

async function atualizar(professorId, id, dados) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existingRows] = await connection.query(
      'SELECT id, status, legacy_details FROM exams WHERE id = ? AND teacher_id = ? FOR UPDATE',
      [id, professorId]
    );
    if (!existingRows.length) {
      await connection.rollback();
      return null;
    }
    const snapshots = await snapshotsDasQuestoes(connection, professorId, dados.questionIds);
    if (snapshots.length !== dados.questionIds.length) {
      const error = new Error('Uma ou mais questões não existem ou não pertencem a este professor.');
      error.code = 'QUESTION_NOT_OWNED';
      throw error;
    }
    if (dados.applicationClassId) {
      const [classes] = await connection.query(
        'SELECT id FROM classes WHERE id = ? AND teacher_id = ? AND archived = FALSE',
        [dados.applicationClassId, professorId]
      );
      if (!classes.length) {
        const error = new Error('Turma não encontrada ou arquivada.');
        error.code = 'CLASS_NOT_OWNED';
        throw error;
      }
    }
    const existing = existingRows[0];
    let oldDetails = existing.legacy_details;
    if (typeof oldDetails === 'string') oldDetails = JSON.parse(oldDetails);
    oldDetails = oldDetails && typeof oldDetails === 'object' ? oldDetails : {};
    const details = {
      ...oldDetails,
      ...dados.details,
      applicationClassId: dados.applicationClassId || null,
      questionSnapshots: snapshots
    };
    await connection.query(
      'UPDATE exams SET title = ?, legacy_details = ? WHERE id = ? AND teacher_id = ?',
      [dados.name, JSON.stringify(details), id, professorId]
    );
    await connection.query('DELETE FROM exam_questions WHERE exam_id = ?', [id]);
    for (let position = 0; position < dados.questionIds.length; position++) {
      await connection.query(
        'INSERT INTO exam_questions (exam_id, question_id, teacher_id, points, position) VALUES (?, ?, ?, ?, ?)',
        [id, dados.questionIds[position], professorId, 1, position]
      );
    }
    await connection.query('DELETE FROM applications WHERE exam_id = ?', [id]);
    if (dados.applicationClassId) {
      await connection.query(
        'INSERT INTO applications (exam_id, class_id, teacher_id) VALUES (?, ?, ?)',
        [id, dados.applicationClassId, professorId]
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

async function definirLiberada(professorId, id, liberada) {
  await pool.query(
    'UPDATE exams SET status = ? WHERE id = ? AND teacher_id = ?',
    [liberada ? 'closed' : 'ready', id, professorId]
  );
  return buscarPorId(professorId, id);
}

async function remover(professorId, id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [applications] = await connection.query('DELETE FROM applications WHERE exam_id = ? AND teacher_id = ?', [id, professorId]);
    void applications;
    const [result] = await connection.query('DELETE FROM exams WHERE id = ? AND teacher_id = ?', [id, professorId]);
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function buscarPublicoPorCodigo(code, ra) {
  const [rows] = await pool.query(
    'SELECT id, title, status FROM exams WHERE public_code = ? LIMIT 1',
    [code]
  );
  if (!rows.length) return null;
  const exam = rows[0];
  const released = exam.status === 'closed';

  let score = null;
  if (released && ra) {
    const [resultRows] = await pool.query(
      `SELECT r.score
         FROM results r
         JOIN users u ON u.id = r.student_id AND u.ra = ?
        WHERE r.exam_id = ?
        LIMIT 1`,
      [ra, exam.id]
    );
    if (resultRows.length) score = Number(resultRows[0].score);
  }

  return { name: exam.title, released, resultAvailable: score !== null, score };
}

module.exports = { listarPorProfessor, buscarPorId, criar, atualizar, definirLiberada, remover, buscarPublicoPorCodigo };

// Repositório: único ponto que acessa as tabelas classes e enrollments no MySQL.
const pool = require('../config/db');
const Turma = require('../models/turmaModel');
const Aluno = require('../models/alunoModel');

async function buscarPorId(id) {
  const [rows] = await pool.query('SELECT * FROM classes WHERE id = ?', [id]);
  return Turma.fromRow(rows[0]);
}

async function buscarPorCodigo(codigoConvite) {
  const [rows] = await pool.query('SELECT * FROM classes WHERE invite_code = ?', [codigoConvite]);
  return Turma.fromRow(rows[0]);
}

async function listarPorProfessor(professorId, arquivada) {
  const [rows] = await pool.query(
    `SELECT t.*, COUNT(m.student_id) AS total_alunos
       FROM classes t
       LEFT JOIN enrollments m ON m.class_id = t.id
      WHERE t.teacher_id = ? AND t.archived = ?
      GROUP BY t.id
      ORDER BY t.name`,
    [professorId, arquivada]
  );
  return rows.map(Turma.fromRow);
}

async function criar({ professorId, nome, descricao, codigoConvite }) {
  const [result] = await pool.query(
    'INSERT INTO classes (teacher_id, name, description, invite_code) VALUES (?, ?, ?, ?)',
    [professorId, nome, descricao, codigoConvite]
  );
  return buscarPorId(result.insertId);
}

async function atualizar(id, { nome, descricao }) {
  await pool.query('UPDATE classes SET name = ?, description = ? WHERE id = ?', [nome, descricao, id]);
  return buscarPorId(id);
}

async function definirArquivada(id, arquivada) {
  await pool.query('UPDATE classes SET archived = ? WHERE id = ?', [arquivada, id]);
  return buscarPorId(id);
}

async function atualizarCodigo(id, codigoConvite) {
  await pool.query('UPDATE classes SET invite_code = ? WHERE id = ?', [codigoConvite, id]);
  return buscarPorId(id);
}

async function estaMatriculado(turmaId, alunoId) {
  const [rows] = await pool.query(
    'SELECT 1 FROM enrollments WHERE class_id = ? AND student_id = ?',
    [turmaId, alunoId]
  );
  return rows.length > 0;
}

async function matricular(turmaId, alunoId) {
  await pool.query('INSERT INTO enrollments (class_id, student_id) VALUES (?, ?)', [turmaId, alunoId]);
}

async function removerMatricula(turmaId, alunoId) {
  const [result] = await pool.query(
    'DELETE FROM enrollments WHERE class_id = ? AND student_id = ?',
    [turmaId, alunoId]
  );
  return result.affectedRows > 0;
}

async function listarAlunos(turmaId) {
  const [rows] = await pool.query(
    `SELECT a.*, m.enrolled_at
       FROM enrollments m
       JOIN users a ON a.id = m.student_id AND a.role = 'aluno'
      WHERE m.class_id = ?
      ORDER BY a.name`,
    [turmaId]
  );
  return rows.map(Aluno.fromRow);
}

module.exports = {
  buscarPorId,
  buscarPorCodigo,
  listarPorProfessor,
  criar,
  atualizar,
  definirArquivada,
  atualizarCodigo,
  estaMatriculado,
  matricular,
  removerMatricula,
  listarAlunos
};

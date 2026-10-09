// Repositório: único ponto que acessa as tabelas turmas e matriculas no MySQL.
const pool = require('../config/db');
const Turma = require('../models/turmaModel');
const Aluno = require('../models/alunoModel');

async function buscarPorId(id) {
  const [rows] = await pool.query('SELECT * FROM turmas WHERE id = ?', [id]);
  return Turma.fromRow(rows[0]);
}

async function buscarPorCodigo(codigoConvite) {
  const [rows] = await pool.query('SELECT * FROM turmas WHERE codigo_convite = ?', [codigoConvite]);
  return Turma.fromRow(rows[0]);
}

async function listarPorProfessor(professorId, arquivada) {
  const [rows] = await pool.query(
    `SELECT t.*, COUNT(m.aluno_id) AS total_alunos
       FROM turmas t
       LEFT JOIN matriculas m ON m.turma_id = t.id
      WHERE t.professor_id = ? AND t.arquivada = ?
      GROUP BY t.id
      ORDER BY t.nome`,
    [professorId, arquivada]
  );
  return rows.map(Turma.fromRow);
}

async function criar({ professorId, nome, descricao, codigoConvite }) {
  const [result] = await pool.query(
    'INSERT INTO turmas (professor_id, nome, descricao, codigo_convite) VALUES (?, ?, ?, ?)',
    [professorId, nome, descricao, codigoConvite]
  );
  return buscarPorId(result.insertId);
}

async function atualizar(id, { nome, descricao }) {
  await pool.query('UPDATE turmas SET nome = ?, descricao = ? WHERE id = ?', [nome, descricao, id]);
  return buscarPorId(id);
}

async function definirArquivada(id, arquivada) {
  await pool.query('UPDATE turmas SET arquivada = ? WHERE id = ?', [arquivada, id]);
  return buscarPorId(id);
}

async function atualizarCodigo(id, codigoConvite) {
  await pool.query('UPDATE turmas SET codigo_convite = ? WHERE id = ?', [codigoConvite, id]);
  return buscarPorId(id);
}

async function estaMatriculado(turmaId, alunoId) {
  const [rows] = await pool.query(
    'SELECT 1 FROM matriculas WHERE turma_id = ? AND aluno_id = ?',
    [turmaId, alunoId]
  );
  return rows.length > 0;
}

async function matricular(turmaId, alunoId) {
  await pool.query('INSERT INTO matriculas (turma_id, aluno_id) VALUES (?, ?)', [turmaId, alunoId]);
}

async function removerMatricula(turmaId, alunoId) {
  const [result] = await pool.query(
    'DELETE FROM matriculas WHERE turma_id = ? AND aluno_id = ?',
    [turmaId, alunoId]
  );
  return result.affectedRows > 0;
}

async function listarAlunos(turmaId) {
  const [rows] = await pool.query(
    `SELECT a.*, m.matriculado_em
       FROM matriculas m
       JOIN alunos a ON a.id = m.aluno_id
      WHERE m.turma_id = ?
      ORDER BY a.nome`,
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

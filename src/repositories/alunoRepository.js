// Repositório: único ponto que acessa a tabela alunos no MySQL.
const pool = require('../config/db');
const Aluno = require('../models/alunoModel');

async function buscarPorId(id) {
  const [rows] = await pool.query('SELECT * FROM alunos WHERE id = ?', [id]);
  return Aluno.fromRow(rows[0]);
}

async function buscarPorRa(ra) {
  const [rows] = await pool.query('SELECT * FROM alunos WHERE ra = ?', [ra]);
  return Aluno.fromRow(rows[0]);
}

async function criar({ nome, ra, email }) {
  const [result] = await pool.query(
    'INSERT INTO alunos (nome, ra, email) VALUES (?, ?, ?)',
    [nome, ra, email || null]
  );
  return buscarPorId(result.insertId);
}

module.exports = { buscarPorId, buscarPorRa, criar };

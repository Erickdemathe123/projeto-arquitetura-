// Repositório: único ponto que acessa a tabela users (role aluno) no MySQL.
const pool = require('../config/db');
const Aluno = require('../models/alunoModel');

async function buscarPorId(id) {
  const [rows] = await pool.query("SELECT * FROM users WHERE role = 'aluno' AND id = ?", [id]);
  return Aluno.fromRow(rows[0]);
}

async function buscarPorRa(ra) {
  const [rows] = await pool.query("SELECT * FROM users WHERE role = 'aluno' AND ra = ?", [ra]);
  return Aluno.fromRow(rows[0]);
}

async function criar({ nome, ra, email }) {
  const [result] = await pool.query(
    "INSERT INTO users (name, ra, email, role) VALUES (?, ?, ?, 'aluno')",
    [nome, ra, email || null]
  );
  return buscarPorId(result.insertId);
}

module.exports = { buscarPorId, buscarPorRa, criar };

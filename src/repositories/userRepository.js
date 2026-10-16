// Repositório: único ponto que acessa a tabela users no MySQL.
const pool = require('../config/db');
const User = require('../models/userModel');

async function buscarPorId(id) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return User.fromRow(rows[0]);
}

async function buscarPorEmail(email) {
  if (!email) return null;
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return User.fromRow(rows[0]);
}

async function buscarPorRa(ra) {
  if (!ra) return null;
  const [rows] = await pool.query('SELECT * FROM users WHERE ra = ?', [ra]);
  return User.fromRow(rows[0]);
}

async function criar({ name, email, passwordHash, role, ra }) {
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, role, ra) VALUES (?, ?, ?, ?, ?)',
    [name, email || null, passwordHash || null, role, ra || null]
  );
  return buscarPorId(result.insertId);
}

module.exports = {
  buscarPorId,
  buscarPorEmail,
  buscarPorRa,
  criar
};

const pool = require('../config/db');
const Questao = require('../models/questaoModel');
const ErroHttp = require('../errors/ErroHttp');

const selecao = `SELECT q.*, a.ordem AS alternativa_ordem, a.texto AS alternativa_texto
  FROM questoes q LEFT JOIN questao_alternativas a ON a.questao_id = q.id`;

async function listar(professorId) {
  const [rows] = await pool.execute(
    selecao + ' WHERE q.professor_id = ? ORDER BY q.id DESC, a.ordem', [professorId]);
  return Questao.fromRows(rows);
}
async function obter(professorId, id, connection = pool) {
  const [rows] = await connection.execute(
    selecao + ' WHERE q.professor_id = ? AND q.id = ? ORDER BY a.ordem', [professorId, id]);
  return Questao.fromRows(rows)[0] || null;
}
async function transacao(acao) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const resultado = await acao(connection);
    await connection.commit();
    return resultado;
  } catch (erro) {
    await connection.rollback();
    throw erro;
  } finally {
    connection.release();
  }
}
async function gravarAlternativas(connection, id, alternativas) {
  for (const [ordem, texto] of alternativas.entries()) {
    await connection.execute(
      'INSERT INTO questao_alternativas (questao_id, ordem, texto) VALUES (?, ?, ?)',
      [id, ordem, texto]);
  }
}
async function bloquearParaAlterar(connection, professorId, id) {
  const [rows] = await connection.execute(
    'SELECT id FROM questoes WHERE id = ? AND professor_id = ? FOR UPDATE', [id, professorId]);
  if (!rows.length) throw new ErroHttp(404, 'Questão não encontrada.');
  const [vinculos] = await connection.execute(
    'SELECT avaliacao_id FROM avaliacao_questoes WHERE questao_id = ? LIMIT 1', [id]);
  if (vinculos.length) {
    throw new ErroHttp(409, 'A questão está vinculada a uma avaliação. Crie outra questão para preservar a prova.');
  }
}
async function criar(professorId, dados) {
  return transacao(async connection => {
    const [resultado] = await connection.execute(
      'INSERT INTO questoes (professor_id, enunciado, disciplina, assunto, tipo, alternativa_correta) VALUES (?, ?, ?, ?, ?, ?)',
      [professorId, dados.enunciado, dados.disciplina, dados.assunto, dados.tipo, dados.alternativaCorreta]);
    await gravarAlternativas(connection, resultado.insertId, dados.alternativas);
    return obter(professorId, resultado.insertId, connection);
  });
}
async function atualizar(professorId, id, dados) {
  return transacao(async connection => {
    await bloquearParaAlterar(connection, professorId, id);
    await connection.execute(
      'UPDATE questoes SET enunciado = ?, disciplina = ?, assunto = ?, tipo = ?, alternativa_correta = ? WHERE id = ? AND professor_id = ?',
      [dados.enunciado, dados.disciplina, dados.assunto, dados.tipo, dados.alternativaCorreta, id, professorId]);
    await connection.execute('DELETE FROM questao_alternativas WHERE questao_id = ?', [id]);
    await gravarAlternativas(connection, id, dados.alternativas);
    return obter(professorId, id, connection);
  });
}
async function remover(professorId, id) {
  return transacao(async connection => {
    await bloquearParaAlterar(connection, professorId, id);
    await connection.execute('DELETE FROM questoes WHERE id = ? AND professor_id = ?', [id, professorId]);
  });
}
module.exports = { listar, obter, criar, atualizar, remover };

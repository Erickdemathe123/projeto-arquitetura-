// Reparo pontual: devolve a atribuição de um aluno à versão que foi impressa
// na folha dele. Uma correção antiga trocava a versão da atribuição quando a
// nota era registrada para o aluno errado; a correção do código impede que isso
// se repita, mas não desfaz o que já foi gravado.
//
// Uso (na raiz do projeto, com o .env apontando para o banco):
//   node database/reparos/restaurar-versao-atribuicao.cjs <codigo-da-prova> <RA> <versao>
//   node database/reparos/restaurar-versao-atribuicao.cjs SGP-C5E17A0B56BE 96532 B
// Sem --aplicar, só mostra o que seria alterado.
const fs = require('node:fs');
const mysql = require('mysql2/promise');

async function main() {
  require('dotenv').config();
  const args = process.argv.slice(2).filter((arg) => arg !== '--aplicar');
  const aplicar = process.argv.includes('--aplicar');
  const [codigo, ra, rotulo] = args;
  if (!codigo || !ra || !rotulo) {
    throw new Error('Uso: node database/reparos/restaurar-versao-atribuicao.cjs <codigo-da-prova> <RA> <versao> [--aplicar]');
  }
  const tls = /^(1|true|yes)$/i.test(process.env.DB_SSL || '');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: tls
      ? { rejectUnauthorized: true, ca: process.env.DB_SSL_CA_PATH ? fs.readFileSync(process.env.DB_SSL_CA_PATH) : undefined }
      : undefined
  });
  try {
    const [[linha]] = await connection.query(
      `SELECT e.id AS exam_id, u.id AS student_id, u.name, atual.label AS versao_atual,
              destino.id AS versao_destino_id, destino.label AS versao_destino,
              (SELECT COUNT(*) FROM results r WHERE r.exam_id = e.id AND r.student_id = u.id) AS notas
         FROM exams e
         JOIN exam_assignments ea ON ea.exam_id = e.id
         JOIN users u ON u.id = ea.student_id AND u.ra = ?
         JOIN exam_versions atual ON atual.id = ea.version_id
         LEFT JOIN exam_versions destino ON destino.exam_id = e.id AND destino.label = ?
        WHERE e.public_code = ?`,
      [ra, rotulo.toUpperCase(), codigo.toUpperCase()]
    );
    if (!linha) throw new Error('Atribuição não encontrada para esse código de prova e RA.');
    if (!linha.versao_destino_id) throw new Error(`A versão ${rotulo} não existe nessa prova.`);
    console.log(`${linha.name}: versão atual ${linha.versao_atual}, versão impressa ${linha.versao_destino}.`);
    if (linha.versao_atual === linha.versao_destino) {
      console.log('Nada a alterar.');
      return;
    }
    if (Number(linha.notas) > 0) {
      throw new Error('Remova antes a nota desse aluno na tela Corrigir Provas: ela foi calculada com a versão errada.');
    }
    if (!aplicar) {
      console.log('Simulação. Repita o comando com --aplicar para gravar.');
      return;
    }
    await connection.query(
      'UPDATE exam_assignments SET version_id = ? WHERE exam_id = ? AND student_id = ?',
      [linha.versao_destino_id, linha.exam_id, linha.student_id]
    );
    console.log(`Atribuição restaurada para a versão ${linha.versao_destino}.`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

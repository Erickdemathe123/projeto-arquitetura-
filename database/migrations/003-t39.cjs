const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');

// Execute durante a atualização da API, com os escritores do SGP parados.
async function migrarT39(connection) {
  const [[{ acquired }]] = await connection.query(
    "SELECT GET_LOCK(SHA2(CONCAT(DATABASE(), ':t39'), 256), 15) AS acquired"
  );
  if (acquired !== 1) throw new Error('Não foi possível obter o bloqueio da migração T39.');
  try {
    const [columns] = await connection.query("SHOW COLUMNS FROM exams LIKE 'answer_key_released'");
    if (!columns.length) {
      await connection.query('ALTER TABLE exams ADD COLUMN answer_key_released BOOLEAN NULL, ADD CONSTRAINT ck_exam_released CHECK (answer_key_released IN (0, 1))');
    }
    if (!columns.length || columns[0].Null === 'YES') {
      await connection.query("UPDATE exams SET answer_key_released = (status = 'closed') WHERE answer_key_released IS NULL");
      await connection.query('ALTER TABLE exams MODIFY answer_key_released BOOLEAN NOT NULL DEFAULT FALSE');
    }
    const schema = await fs.readFile(path.join(__dirname, '../schema.sql'), 'utf8');
    await connection.query(schema);
  } finally {
    await connection.query("SELECT RELEASE_LOCK(SHA2(CONCAT(DATABASE(), ':t39'), 256))");
  }
}

async function main() {
  require('dotenv').config();
  if (!process.env.DB_NAME) throw new Error('Informe DB_NAME com o banco a atualizar.');
  const tls = /^(1|true|yes)$/i.test(process.env.DB_SSL || '');
  if (process.env.DB_SSL_CA_PATH && !tls) throw new Error('DB_SSL_CA_PATH requer DB_SSL=true.');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME, multipleStatements: true,
    ssl: tls ? { rejectUnauthorized: true, ca: process.env.DB_SSL_CA_PATH ? await fs.readFile(process.env.DB_SSL_CA_PATH) : undefined } : undefined
  });
  try {
    await migrarT39(connection);
    console.log('Migração T39 concluída.');
  } finally {
    await connection.end();
  }
}

module.exports = { migrarT39 };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });

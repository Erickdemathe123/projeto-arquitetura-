const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');

const CHECK_VERSAO_25 = `
  ADD CONSTRAINT ck_version_items CHECK (JSON_SCHEMA_VALID(
    '{"type":"array","minItems":1,"maxItems":25,"items":{"type":"object","required":["question_id","alternative_order","correct_index"],"properties":{"question_id":{"type":"integer","minimum":1},"alternative_order":{"type":"array","minItems":2,"maxItems":5,"uniqueItems":true,"items":{"type":"integer","minimum":0,"maximum":4}},"correct_index":{"type":"integer","minimum":0,"maximum":4}}}}',
    printed_items
  ))`;

async function migrarConfiguracaoFolha(connection) {
  const [[{ acquired }]] = await connection.query(
    "SELECT GET_LOCK(SHA2(CONCAT(DATABASE(), ':configuracao-folha'), 256), 15) AS acquired"
  );
  if (acquired !== 1) throw new Error('Não foi possível obter o bloqueio da migração da folha de respostas.');

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS teacher_settings (
        teacher_id BIGINT UNSIGNED PRIMARY KEY,
        teacher_role VARCHAR(9) NOT NULL DEFAULT 'professor',
        institution_name VARCHAR(160),
        logo_data LONGTEXT,
        proof_instructions TEXT,
        answer_instructions TEXT,
        result_url VARCHAR(500),
        result_text VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT ck_teacher_settings_role CHECK (teacher_role = 'professor'),
        CONSTRAINT fk_teacher_settings_teacher FOREIGN KEY (teacher_id, teacher_role)
          REFERENCES users(id, role) ON DELETE CASCADE
      )
    `);

    const [[table]] = await connection.query('SHOW CREATE TABLE exam_versions');
    const createSql = table?.['Create Table'] || '';
    if (createSql.includes('"maxItems":20')) {
      await connection.query('ALTER TABLE exam_versions DROP CHECK ck_version_items');
      await connection.query(`ALTER TABLE exam_versions ${CHECK_VERSAO_25}`);
    }
  } finally {
    await connection.query(
      "SELECT RELEASE_LOCK(SHA2(CONCAT(DATABASE(), ':configuracao-folha'), 256))"
    );
  }
}

async function main() {
  require('dotenv').config();
  if (!process.env.DB_NAME) throw new Error('Informe DB_NAME com o banco a atualizar.');
  const tls = /^(1|true|yes)$/i.test(process.env.DB_SSL || '');
  if (process.env.DB_SSL_CA_PATH && !tls) throw new Error('DB_SSL_CA_PATH requer DB_SSL=true.');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    ssl: tls
      ? { rejectUnauthorized: true, ca: process.env.DB_SSL_CA_PATH ? await fs.readFile(process.env.DB_SSL_CA_PATH) : undefined }
      : undefined
  });
  try {
    await migrarConfiguracaoFolha(connection);
    console.log('Migração da configuração da folha concluída.');
  } finally {
    await connection.end();
  }
}

module.exports = { migrarConfiguracaoFolha };
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });

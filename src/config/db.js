const mysql = require('mysql2/promise');
const fs = require('node:fs');
require('dotenv').config();

const sslEnabled = /^(1|true|yes)$/i.test(process.env.DB_SSL || '');
const sslCaPath = process.env.DB_SSL_CA_PATH?.trim();

if (sslCaPath && !sslEnabled) {
  throw new Error('DB_SSL_CA_PATH requer DB_SSL=true.');
}

// Pool de conexões com o MySQL. Os dados vêm do arquivo .env (não versionado).
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sgp',
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 5000,
  queueLimit: 100,
  charset: 'utf8mb4',
  ...(sslEnabled
    ? {
        ssl: {
          rejectUnauthorized: true,
          ...(sslCaPath ? { ca: fs.readFileSync(sslCaPath, 'utf8') } : {})
        }
      }
    : {})
});

module.exports = pool;

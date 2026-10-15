const pool = require('../config/db');
async function verificarConexao() {
  await pool.query({ sql: 'SELECT 1', timeout: 5000 });
}
module.exports = { verificarConexao };

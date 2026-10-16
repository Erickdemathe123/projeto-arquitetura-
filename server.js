require('dotenv').config();
const criarApp = require('./src/app');
const pool = require('./src/config/db');

const app = criarApp();
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT deve ser uma porta válida entre 1 e 65535.');
}

const server = app.listen(port, () => {
  console.log(`SGP rodando em http://localhost:${port}`);
});

let encerrando = false;
function encerrar() {
  if (encerrando) return;
  encerrando = true;
  const limite = setTimeout(() => process.exit(1), 10000);
  limite.unref();
  server.close(async () => {
    try {
      await pool.end();
      clearTimeout(limite);
    } catch {
      process.exitCode = 1;
    }
  });
}
process.once('SIGINT', encerrar);
process.once('SIGTERM', encerrar);

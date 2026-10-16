const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const turmaRoutes = require('./routes/turmaRoutes');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');

function criarApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use('/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/turmas', turmaRoutes);
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(frontendDist)) app.use(express.static(frontendDist));
  app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
  app.use((erro, req, res, next) => {
    if (res.headersSent) return next(erro);
    if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
    if (erro.type === 'entity.too.large') return res.status(413).json({ erro: 'Corpo da requisição muito grande.' });
    console.error('Falha na API:', erro.code || erro.name);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  });
  return app;
}
module.exports = criarApp;

const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const turmaRoutes = require('./routes/turmaRoutes');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middlewares/errorHandler');
const notFoundHandler = require('./middlewares/notFoundHandler');
const { sanitizarBody } = require('./middlewares/validator');

function criarApp({ configurarRotas } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(sanitizarBody);

  app.use('/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/turmas', turmaRoutes);

  if (typeof configurarRotas === 'function') {
    configurarRotas(app);
  }

  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
  }

  // Intercepta rotas não encontradas (404)
  app.use(notFoundHandler);

  // Middleware global de tratamento e formatação de erros
  app.use(errorHandler);

  return app;
}

module.exports = criarApp;

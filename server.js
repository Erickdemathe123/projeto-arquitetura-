const express = require('express');
const path = require('path');
const fs = require('fs');
const turmaRoutes = require('./src/routes/turmaRoutes');

const app = express();
const port = process.env.PORT || 3000;

// Permite ler o corpo das requisições em JSON (req.body)
app.use(express.json());

// API
app.use('/api/turmas', turmaRoutes);

// Front-end compilado (opcional: a API funciona mesmo sem o build)
const frontendDist = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
} else {
  console.warn('Frontend compilado não encontrado. Execute "npm run build" para servir as telas.');
}

app.listen(port, () => {
  console.log(`SGP rodando em http://localhost:${port}`);
});

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

const frontendDist = path.join(__dirname, 'frontend', 'dist');
if (!fs.existsSync(frontendDist)) {
  console.error('Frontend compilado não encontrado. Execute "npm run build" antes de iniciar o servidor.');
  process.exitCode = 1;
} else {
  app.use(express.static(frontendDist));
}

if (process.exitCode !== 1) {
  app.listen(port, () => {
    console.log(`Login page running at http://localhost:${port}`);
  });
}

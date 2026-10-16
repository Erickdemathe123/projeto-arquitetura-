// Rotas de autenticação (montadas em /api/auth no app.js)
const { Router } = require('express');
const controller = require('../controllers/authController');
const { autenticar } = require('../middlewares/authMiddleware');

const router = Router();

// Rotas públicas
router.post('/cadastro', controller.cadastrar);
router.post('/login', controller.login);

// Rota protegida: obtém dados do usuário autenticado a partir do token JWT
router.get('/me', autenticar, controller.me);

module.exports = router;

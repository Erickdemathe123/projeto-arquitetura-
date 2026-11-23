// Rotas de autenticação (montadas em /api/auth no app.js)
const { Router } = require('express');
const controller = require('../controllers/authController');
const { autenticar } = require('../middlewares/authMiddleware');
const { criarLimiteTentativas } = require('../middlewares/limiteTentativas');

const router = Router();

// No máximo 5 logins errados por IP + e-mail a cada 15 minutos
const limiteLogin = criarLimiteTentativas({ maxTentativas: 5, janelaMs: 15 * 60 * 1000 });

// Rotas públicas
router.post('/cadastro', controller.cadastrar);
router.post('/login', limiteLogin, controller.login);

// Rota protegida: obtém dados do usuário autenticado a partir do token JWT
router.get('/me', autenticar, controller.me);

module.exports = router;

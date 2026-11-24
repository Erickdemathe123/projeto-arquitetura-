const { Router } = require('express');
const controller = require('../controllers/configuracaoController');
const { autenticar, exigirRole } = require('../middlewares/authMiddleware');

const router = Router();
router.use(autenticar, exigirRole('professor'));
router.get('/folha-respostas', controller.obter);
router.put('/folha-respostas', controller.atualizar);

module.exports = router;

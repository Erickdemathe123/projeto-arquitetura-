const { Router } = require('express');
const controller = require('../controllers/questaoController');
const { autenticar, exigirRole } = require('../middlewares/authMiddleware');
const { validarParamId } = require('../middlewares/validator');

const router = Router();
router.use(autenticar, exigirRole('professor'));

router.get('/', controller.listar);
router.post('/', controller.criar);
router.put('/:id', validarParamId('id'), controller.atualizar);
router.delete('/:id', validarParamId('id'), controller.remover);

module.exports = router;

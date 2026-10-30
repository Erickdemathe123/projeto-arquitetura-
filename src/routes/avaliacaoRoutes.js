const { Router } = require('express');
const controller = require('../controllers/avaliacaoController');
const { autenticar, exigirRole } = require('../middlewares/authMiddleware');
const { validarParamId } = require('../middlewares/validator');

const router = Router();

router.get('/codigo/:code', controller.consultarCodigo);
router.use(autenticar, exigirRole('professor'));
router.get('/', controller.listar);
router.post('/', controller.criar);
router.put('/:id', validarParamId('id'), controller.atualizar);
router.patch('/:id/gabarito', validarParamId('id'), controller.liberarGabarito);
router.delete('/:id', validarParamId('id'), controller.remover);

module.exports = router;

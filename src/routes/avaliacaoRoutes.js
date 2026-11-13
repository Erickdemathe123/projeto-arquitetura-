const { Router } = require('express');
const controller = require('../controllers/avaliacaoController');
const resultadoController = require('../controllers/resultadoController');
const versaoController = require('../controllers/versaoController');
const atribuicaoController = require('../controllers/atribuicaoController');
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

// Correção de provas (T20): nota de cada aluno na avaliação
router.get('/:id/resultados', validarParamId('id'), resultadoController.listar);
router.post('/:id/resultados', validarParamId('id'), resultadoController.registrar);
router.delete('/:id/resultados/:alunoId', validarParamId('id'), validarParamId('alunoId'), resultadoController.remover);

// Versões da prova (T42): embaralhamento com semente, ordem impressa e gabarito por caderno
router.get('/:id/versoes', validarParamId('id'), versaoController.listar);
router.post('/:id/versoes', validarParamId('id'), versaoController.gerar);
router.post('/:id/atribuicoes/validar-qr', validarParamId('id'), atribuicaoController.validarQr);

module.exports = router;

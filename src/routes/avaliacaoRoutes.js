const { Router } = require('express');
const controller = require('../controllers/avaliacaoController');
const resultadoController = require('../controllers/resultadoController');
const versaoController = require('../controllers/versaoController');
const atribuicaoController = require('../controllers/atribuicaoController');
const estatisticaController = require('../controllers/estatisticaController');
const cadernoController = require('../controllers/cadernoController');
const relatorioController = require('../controllers/relatorioController');
const { autenticar, exigirRole } = require('../middlewares/authMiddleware');
const { validarParamId } = require('../middlewares/validator');
const { criarLimiteTentativas } = require('../middlewares/limiteTentativas');

const router = Router();

// Consulta pública do aluno. Consultar a própria nota quantas vezes quiser não
// é limitado. O limite conta só tentativas sem resultado (código inexistente ou
// RA sem nota nesta prova), por IP e código, para impedir que alguém descubra
// notas testando RAs. A chave não inclui o RA: quem testa RAs troca de RA a
// cada tentativa.
const limiteConsultaPublica = criarLimiteTentativas({
  maxTentativas: 30,
  janelaMs: 15 * 60 * 1000,
  obterIdentificador: (req) => req.params.code,
  ehFalha: (req, res) => res.statusCode === 404 || res.locals.consultaSemResultado === true
});

router.get('/codigo/:code', limiteConsultaPublica, controller.consultarCodigo);
router.use(autenticar, exigirRole('professor'));
router.get('/', controller.listar);
router.post('/', controller.criar);
router.post('/avulsa', controller.criarAvulsa);
router.put('/:id', validarParamId('id'), controller.atualizar);
router.patch('/:id/gabarito', validarParamId('id'), controller.liberarGabarito);
router.delete('/:id', validarParamId('id'), controller.remover);

// Correção de provas (T20): nota de cada aluno na avaliação
router.get('/:id/resultados', validarParamId('id'), resultadoController.listar);
// Exportação de resultados em Excel (T54, RF12)
router.get('/:id/resultados/excel', validarParamId('id'), relatorioController.baixarExcel);
router.post('/:id/resultados', validarParamId('id'), resultadoController.registrar);
router.post('/:id/correcoes', validarParamId('id'), resultadoController.corrigirAutomaticamente);
// Estatísticas da avaliação (T52, RF11): acerto por questão e alternativa incorreta mais marcada
router.get('/:id/estatisticas', validarParamId('id'), estatisticaController.obter);
router.delete('/:id/resultados/:alunoId', validarParamId('id'), validarParamId('alunoId'), resultadoController.remover);

// Versões da prova (T42): embaralhamento com semente, ordem impressa e gabarito por caderno
router.get('/:id/versoes', validarParamId('id'), versaoController.listar);
router.post('/:id/versoes', validarParamId('id'), versaoController.gerar);
// Caderno editável em .docx (T55): todas as versões ou só a pedida em ?versao=A
router.get('/:id/caderno/docx', validarParamId('id'), cadernoController.baixarDocx);
router.get('/:id/pdf', validarParamId('id'), cadernoController.baixarPdf);
router.post('/:id/atribuicoes/validar-qr', validarParamId('id'), atribuicaoController.validarQr);
router.get('/:id/atribuicoes', validarParamId('id'), atribuicaoController.listar);
router.post('/:id/atribuicoes', validarParamId('id'), atribuicaoController.gerar);

module.exports = router;

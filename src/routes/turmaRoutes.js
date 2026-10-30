// Rotas: mapeiam método + endereço para a função do controller.
// Este roteador é montado em /api/turmas no app.js.
const { Router, text } = require('express');
const controller = require('../controllers/turmaController');
const { autenticar, exigirRole } = require('../middlewares/authMiddleware');
const { validarParamId } = require('../middlewares/validator');

const router = Router();

// Rota pública: aluno entra na turma com o código de convite
router.post('/entrar', controller.entrar);

// Todas as rotas abaixo exigem login de professor (token JWT)
router.use(autenticar, exigirRole('professor'));

// Turmas do professor
router.post('/', controller.criar);
router.get('/', controller.listar);
router.get('/:id', validarParamId('id'), controller.obter);
router.put('/:id', validarParamId('id'), controller.editar);
router.patch('/:id/arquivar', validarParamId('id'), controller.arquivar);
router.post('/:id/codigo', validarParamId('id'), controller.gerarCodigo);

// Alunos da turma
router.get('/:id/alunos', validarParamId('id'), controller.listarAlunos);
router.post('/:id/alunos', validarParamId('id'), controller.matricular);
router.delete('/:id/alunos/:alunoId', validarParamId('id'), validarParamId('alunoId'), controller.removerAluno);

// Importação de alunos por CSV (RF05): o corpo é o conteúdo do arquivo em texto
const lerCsv = text({ type: ['text/csv', 'text/plain'], limit: '1mb' });
router.post('/:id/alunos/importar', validarParamId('id'), lerCsv, controller.importarAlunos);

module.exports = router;

// Rotas: mapeiam método + endereço para a função do controller.
// Este roteador é montado em /api/turmas no server.js.
const { Router, text } = require('express');
const controller = require('../controllers/turmaController');

const router = Router();

// Aluno entra na turma com o código de convite
router.post('/entrar', controller.entrar);

// Turmas do professor
router.post('/', controller.criar);
router.get('/', controller.listar);
router.get('/:id', controller.obter);
router.put('/:id', controller.editar);
router.patch('/:id/arquivar', controller.arquivar);
router.post('/:id/codigo', controller.gerarCodigo);

// Alunos da turma
router.get('/:id/alunos', controller.listarAlunos);
router.post('/:id/alunos', controller.matricular);
router.delete('/:id/alunos/:alunoId', controller.removerAluno);

// Importação de alunos por CSV (RF05): o corpo é o conteúdo do arquivo em texto
const lerCsv = text({ type: ['text/csv', 'text/plain'], limit: '1mb' });
router.post('/:id/alunos/importar', lerCsv, controller.importarAlunos);

module.exports = router;

// Controller: traduz HTTP <-> serviço. Lê parâmetros, chama o serviço e monta a resposta.
const turmaService = require('../services/turmaService');
const { ErroDeNegocio } = turmaService;

// PROVISÓRIO: enquanto o login com JWT não existe, o professor é identificado
// pelo cabeçalho "x-professor-id". Quando a autenticação ficar pronta,
// basta trocar esta função para ler o id do token (ex.: req.usuario.id).
function obterProfessorId(req) {
  const id = Number(req.header('x-professor-id'));
  if (!Number.isInteger(id) || id <= 0) {
    throw new ErroDeNegocio(401, 'Professor não identificado.');
  }
  return id;
}

function lerId(valor, nomeCampo) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ErroDeNegocio(400, `${nomeCampo} inválido.`);
  }
  return id;
}

// Envolve cada ação: erros de negócio viram a resposta HTTP correspondente,
// e qualquer outro erro vira 500 sem expor detalhes internos.
function tratar(acao) {
  return async (req, res) => {
    try {
      await acao(req, res);
    } catch (erro) {
      if (erro instanceof ErroDeNegocio) {
        return res.status(erro.status).json({ erro: erro.message });
      }
      console.error(erro);
      return res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
  };
}

const criar = tratar(async (req, res) => {
  const turma = await turmaService.criarTurma(obterProfessorId(req), req.body || {});
  res.status(201).json(turma);
});

const listar = tratar(async (req, res) => {
  const arquivadas = req.query.arquivadas === 'true';
  const turmas = await turmaService.listarTurmas(obterProfessorId(req), arquivadas);
  res.json(turmas);
});

const obter = tratar(async (req, res) => {
  const turma = await turmaService.obterTurma(obterProfessorId(req), lerId(req.params.id, 'Id da turma'));
  res.json(turma);
});

const editar = tratar(async (req, res) => {
  const turma = await turmaService.editarTurma(
    obterProfessorId(req),
    lerId(req.params.id, 'Id da turma'),
    req.body || {}
  );
  res.json(turma);
});

// Corpo opcional: { "arquivada": false } desarquiva; sem corpo, arquiva
const arquivar = tratar(async (req, res) => {
  const arquivar = !(req.body && req.body.arquivada === false);
  const turma = await turmaService.arquivarTurma(
    obterProfessorId(req),
    lerId(req.params.id, 'Id da turma'),
    arquivar
  );
  res.json(turma);
});

const gerarCodigo = tratar(async (req, res) => {
  const turma = await turmaService.gerarNovoCodigo(obterProfessorId(req), lerId(req.params.id, 'Id da turma'));
  res.json(turma);
});

// Rota do aluno: não exige professor
const entrar = tratar(async (req, res) => {
  const resultado = await turmaService.entrarComCodigo(req.body || {});
  res.status(201).json(resultado);
});

const matricular = tratar(async (req, res) => {
  const aluno = await turmaService.matricularAluno(
    obterProfessorId(req),
    lerId(req.params.id, 'Id da turma'),
    req.body || {}
  );
  res.status(201).json(aluno);
});

const removerAluno = tratar(async (req, res) => {
  await turmaService.removerAluno(
    obterProfessorId(req),
    lerId(req.params.id, 'Id da turma'),
    lerId(req.params.alunoId, 'Id do aluno')
  );
  res.status(204).end();
});

const listarAlunos = tratar(async (req, res) => {
  const alunos = await turmaService.listarAlunos(obterProfessorId(req), lerId(req.params.id, 'Id da turma'));
  res.json(alunos);
});

// Recebe o conteúdo do CSV como texto puro no corpo da requisição (Content-Type: text/csv)
const importarAlunos = tratar(async (req, res) => {
  if (typeof req.body !== 'string') {
    throw new ErroDeNegocio(415, 'Envie o arquivo CSV como texto (Content-Type: text/csv).');
  }
  const resultado = await turmaService.importarAlunos(
    obterProfessorId(req),
    lerId(req.params.id, 'Id da turma'),
    req.body
  );
  res.json(resultado);
});

module.exports = {
  criar,
  listar,
  obter,
  editar,
  arquivar,
  gerarCodigo,
  entrar,
  matricular,
  removerAluno,
  listarAlunos,
  importarAlunos
};

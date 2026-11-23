// Serviço: exportação do caderno de questões em .docx editável (T55 / RF06).
// Não acessa o banco diretamente, só pelos repositórios.
const avaliacaoRepository = require('../repositories/avaliacaoRepository');
const versaoRepository = require('../repositories/versaoRepository');
const { gerarCadernoDocx, nomeArquivo } = require('../utils/cadernoDocx');
const folhaPdf = require('../utils/folhaPdf');
const cadernoPdf = require('../utils/cadernoPdf');
const atribuicaoRepository = require('../repositories/atribuicaoRepository');
const { ErroDeNegocio } = require('../errors/appError');

function validarId(id, nome) {
  const value = Number(id);
  if (!Number.isSafeInteger(value) || value <= 0) throw new ErroDeNegocio(400, `${nome} inválido.`);
  return value;
}

function validarRotulo(rotulo) {
  if (rotulo === undefined || rotulo === null || rotulo === '') return null;
  const normalizado = String(rotulo).trim().toUpperCase();
  if (!/^[A-Z]{1,2}$/.test(normalizado)) throw new ErroDeNegocio(400, 'Versão inválida: use a letra do caderno (ex.: A).');
  return normalizado;
}

// Gera o .docx de todas as versões (uma por seção) ou só da versão pedida.
// Se a avaliação ainda não tem versões geradas, exporta a ordem original.
async function exportarDocx(professorId, examIdRaw, versaoRaw) {
  const examId = validarId(examIdRaw, 'Id da avaliação');
  const rotulo = validarRotulo(versaoRaw);

  const avaliacao = await avaliacaoRepository.buscarPorId(professorId, examId);
  if (!avaliacao) throw new ErroDeNegocio(404, 'Avaliação não encontrada.');
  if (!avaliacao.questionSnapshots || !avaliacao.questionSnapshots.length) {
    throw new ErroDeNegocio(400, 'A avaliação não tem questões para exportar.');
  }

  let versoes = await versaoRepository.listarPorAvaliacao(examId);
  if (rotulo) {
    versoes = versoes.filter((versao) => versao.label === rotulo);
    if (!versoes.length) throw new ErroDeNegocio(404, `A versão ${rotulo} não existe nesta avaliação.`);
  }

  const buffer = await gerarCadernoDocx(avaliacao, versoes);
  return { buffer, filename: nomeArquivo(avaliacao, rotulo) };
}

async function exportarPdf(professorId, examIdRaw, versaoRaw, alunoIdRaw) {
  const examId = validarId(examIdRaw, 'Id da avaliação');
  const rotulo = validarRotulo(versaoRaw);
  const avaliacao = await avaliacaoRepository.buscarPorId(professorId, examId);
  if (!avaliacao) throw new ErroDeNegocio(404, 'Avaliação não encontrada.');

  if (!avaliacao.standaloneAnswerSheet) {
    if (!avaliacao.questionSnapshots || !avaliacao.questionSnapshots.length) {
      throw new ErroDeNegocio(400, 'A avaliação não tem questões para gerar a folha de respostas.');
    }
  }

  let versoes = await versaoRepository.listarPorAvaliacao(examId);
  if (rotulo) {
    versoes = versoes.filter((versao) => versao.label === rotulo);
    if (!versoes.length) throw new ErroDeNegocio(404, `A versão ${rotulo} não existe nesta avaliação.`);
  }
  if (avaliacao.applicationClassId) {
    const assignments = await atribuicaoRepository.listarPorAvaliacao(examId);
    if (!assignments.length) throw new ErroDeNegocio(409, 'Gere as atribuições dos alunos antes de baixar o PDF individual.');
    let assignment = null;
    if (alunoIdRaw) {
      const alunoId = validarId(alunoIdRaw, 'Id do aluno');
      assignment = assignments.find((item) => item.studentId === alunoId);
      if (!assignment) throw new ErroDeNegocio(404, 'Esta atribuição não pertence a esta avaliação.');
    } else {
      assignment = assignments[0];
    }
    const selectedVersions = assignment
      ? versoes.filter((versao) => versao.label === assignment.versionLabel)
      : [];
    const buffer = await cadernoPdf.gerar(avaliacao, selectedVersions, {
      studentId: assignment.studentId,
      studentName: assignment.studentName,
      studentRa: assignment.studentRa,
      versionLabel: assignment.versionLabel,
      qrCode: assignment.qrCode
    });
    return { buffer, filename: cadernoPdf.nomeArquivo(avaliacao, {
      studentName: assignment.studentName
    }) };
  }
  const buffer = await folhaPdf.gerar(avaliacao, versoes, avaliacao.questionCount || avaliacao.questionSnapshots?.length || 20);
  return { buffer, filename: folhaPdf.nomeArquivo(avaliacao) };
}

module.exports = { exportarDocx, exportarPdf };

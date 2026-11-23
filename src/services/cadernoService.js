// Serviço: exportação do caderno de questões em .docx editável (T55 / RF06).
// Não acessa o banco diretamente, só pelos repositórios.
const avaliacaoRepository = require('../repositories/avaliacaoRepository');
const versaoRepository = require('../repositories/versaoRepository');
const { gerarCadernoDocx, nomeArquivo } = require('../utils/cadernoDocx');
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

module.exports = { exportarDocx };

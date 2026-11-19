// Monta o caderno de questões em .docx (T55 / RF06 / RNF07).
// Uma seção por versão (cada versão começa em página nova). Os parágrafos de uma
// mesma questão usam keepNext/keepLines, então o Word e o LibreOffice levam a
// questão inteira para a próxima página quando ela não cabe no fim da atual.
const {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun
} = require('docx');

const FONTE = 'Arial';
const MARGEM_TWIPS = 1134; // 2 cm

// Letra impressa da alternativa: 0 -> a, 1 -> b, ...
function letraAlternativa(indice) {
  return String.fromCharCode(97 + indice);
}

function formatarPontos(pontos) {
  const valor = Number(pontos);
  if (!Number.isFinite(valor) || valor <= 0) return '';
  const texto = valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return `(${texto} ${valor === 1 ? 'ponto' : 'pontos'})`;
}

// Aceita apenas logos em data URL PNG/JPEG (como a tela de montagem salva).
function lerLogo(logo) {
  if (typeof logo !== 'string') return null;
  const match = logo.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
  if (!match) return null;
  try {
    const data = Buffer.from(match[2], 'base64');
    if (!data.length) return null;
    return { data, type: match[1].toLowerCase() === 'png' ? 'png' : 'jpg' };
  } catch {
    return null;
  }
}

function texto(conteudo, opcoes = {}) {
  return new TextRun({ text: String(conteudo ?? ''), font: FONTE, ...opcoes });
}

// Ordem impressa de uma versão: [{ questao, alternativas: [texto na ordem impressa] }]
// Sem versões geradas, usa a ordem original da avaliação.
function montarItens(questoes, versao) {
  const porId = new Map(questoes.map((questao) => [Number(questao.id), questao]));
  if (!versao || !Array.isArray(versao.printedItems)) {
    return questoes.map((questao) => ({ questao, alternativas: questao.alternatives || [] }));
  }
  return versao.printedItems
    .map((item) => {
      const questao = porId.get(Number(item.question_id));
      if (!questao) return null;
      const originais = questao.alternatives || [];
      const ordem = Array.isArray(item.alternative_order) ? item.alternative_order : originais.map((_, i) => i);
      return { questao, alternativas: ordem.map((indice) => originais[indice]).filter((alt) => alt !== undefined) };
    })
    .filter(Boolean);
}

function cabecalho(avaliacao, rotuloVersao) {
  const paragrafos = [];
  const logo = lerLogo(avaliacao.logo);
  if (logo) {
    paragrafos.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ type: logo.type, data: logo.data, transformation: { width: 90, height: 90 } })]
    }));
  }
  const instituicao = [avaliacao.institution, avaliacao.course, avaliacao.subject].filter(Boolean).join(' · ');
  if (instituicao) {
    paragrafos.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [texto(instituicao, { bold: true, size: 22 })] }));
  }
  paragrafos.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 60 },
    children: [texto(avaliacao.name || 'Avaliação', { bold: true, size: 32 })]
  }));
  const meta = [avaliacao.professor, avaliacao.className, avaliacao.date].filter(Boolean).join(' · ');
  if (meta) {
    paragrafos.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [texto(meta, { size: 20 })] }));
  }
  const identificacao = [rotuloVersao, avaliacao.publicCode ? `Código: ${avaliacao.publicCode}` : null].filter(Boolean).join('   ·   ');
  paragrafos.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [texto(identificacao, { bold: true, size: 20 })]
  }));
  paragrafos.push(new Paragraph({ spacing: { after: 120 }, children: [texto('Aluno: ____________________________________________   RA: ________________', { size: 22 })] }));
  if (avaliacao.instructions) {
    paragrafos.push(new Paragraph({
      spacing: { before: 120, after: 240 },
      children: [texto('Instruções: ', { bold: true, size: 20 }), texto(avaliacao.instructions, { italics: true, size: 20 })]
    }));
  }
  return paragrafos;
}

function paragrafosDaQuestao({ questao, alternativas }, numero, pontos) {
  const enunciado = [texto(`${numero}. `, { bold: true, size: 22 }), texto(questao.text, { size: 22 })];
  const rotuloPontos = formatarPontos(pontos);
  if (rotuloPontos) enunciado.push(texto(` ${rotuloPontos}`, { size: 18, color: '555555' }));

  const linhas = [{ children: enunciado, spacing: { before: 240, after: 80 } }];
  alternativas.forEach((alternativa, indice) => {
    linhas.push({
      children: [texto(`${letraAlternativa(indice)}) `, { bold: true, size: 22 }), texto(alternativa, { size: 22 })],
      indent: { left: 360 },
      spacing: { after: 40 }
    });
  });
  // keepNext em todas as linhas, menos a última: o bloco da questão fica junto
  return linhas.map((linha, indice) => new Paragraph({
    ...linha,
    keepLines: true,
    keepNext: indice < linhas.length - 1
  }));
}

function montarDocumento(avaliacao, versoes) {
  const questoes = Array.isArray(avaliacao.questionSnapshots) ? avaliacao.questionSnapshots : [];
  const pontosPorQuestao = new Map(
    (avaliacao.questionIds || []).map((id, indice) => [Number(id), (avaliacao.questionPoints || [])[indice]])
  );
  const lista = versoes && versoes.length ? versoes : [null];

  const sections = lista.map((versao) => {
    const rotulo = versao ? `Versão ${versao.label}` : 'Versão única';
    const itens = montarItens(questoes, versao);
    return {
      properties: { page: { margin: { top: MARGEM_TWIPS, bottom: MARGEM_TWIPS, left: MARGEM_TWIPS, right: MARGEM_TWIPS } } },
      children: [
        ...cabecalho(avaliacao, rotulo),
        ...itens.flatMap((item, indice) => paragrafosDaQuestao(item, indice + 1, pontosPorQuestao.get(Number(item.questao.id))))
      ]
    };
  });

  return new Document({
    creator: 'SGP - Sistema de Geração de Provas',
    title: avaliacao.name || 'Caderno de questões',
    styles: { default: { document: { run: { font: FONTE } } } },
    sections
  });
}

async function gerarCadernoDocx(avaliacao, versoes = []) {
  return Packer.toBuffer(montarDocumento(avaliacao, versoes));
}

function nomeArquivo(avaliacao, rotuloVersao) {
  const base = String(avaliacao.name || 'caderno')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'caderno';
  return `${base}${rotuloVersao ? `-versao-${rotuloVersao}` : ''}.docx`;
}

module.exports = { gerarCadernoDocx, montarItens, nomeArquivo, formatarPontos };

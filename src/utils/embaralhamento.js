// Embaralhamento determinístico (mesma semente -> mesmo resultado), usado para
// gerar a ordem impressa de questões e alternativas de cada versão da prova.

// Gerador pseudoaleatório mulberry32: rápido, determinístico, suficiente para
// embaralhar listas (não é destinado a uso criptográfico).
function criarGerador(seed) {
  let state = seed >>> 0;
  return function gerar() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates: cada posição final é igualmente provável, dado o gerador.
function embaralhar(lista, gerar) {
  const copia = lista.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(gerar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Monta os itens impressos de uma versão a partir das questões (com alternativas
// congeladas em questionSnapshots) e das opções de embaralhamento da avaliação.
// Contrato (docs/modelo-dados/t39.md): alternative_order é a lista de índices
// originais na ordem impressa; correct_index é a posição impressa da alternativa
// correta dentro de alternative_order.
function gerarItensImpressos(questoes, { embaralharQuestoes, embaralharAlternativas }, gerar) {
  const ordemQuestoes = embaralharQuestoes ? embaralhar(questoes, gerar) : questoes;
  return ordemQuestoes.map((questao) => {
    const indices = questao.alternatives.map((_, indice) => indice);
    const ordemAlternativas = embaralharAlternativas ? embaralhar(indices, gerar) : indices;
    const indiceCorreto = ordemAlternativas.indexOf(questao.correctAlternative);
    return {
      question_id: questao.id,
      alternative_order: ordemAlternativas,
      correct_index: indiceCorreto
    };
  });
}

// 0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA, 27 -> AB, ... (rótulo do caderno)
function gerarRotulo(indice) {
  let n = indice;
  let rotulo = '';
  do {
    rotulo = String.fromCharCode(65 + (n % 26)) + rotulo;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return rotulo;
}

module.exports = { criarGerador, embaralhar, gerarItensImpressos, gerarRotulo };

const { test } = require('node:test');
const assert = require('node:assert/strict');
const avaliacaoService = require('../src/services/avaliacaoService');
const avaliacaoRepository = require('../src/repositories/avaliacaoRepository');
const pool = require('../src/config/db');

// Versão B imprime as alternativas da questão 10 na ordem c, a, b (a correta, "b", é a letra C impressa)
const detalhe = {
  versionLabel: 'B',
  printedItems: [
    { question_id: 11, alternative_order: [1, 0], correct_index: 1 },
    { question_id: 10, alternative_order: [2, 0, 1], correct_index: 2 }
  ],
  snapshots: [
    { id: 10, text: 'Qual é a letra do meio?', alternatives: ['a', 'b', 'c'] },
    { id: 11, text: 'Qual vem primeiro?', alternatives: ['x', 'y'] }
  ],
  answers: [
    { questionId: 11, markedIndex: 1 }, // acertou
    { questionId: 10, markedIndex: 0 }  // errou: impresso A = "c" original
  ]
};

test('mostra acertos e erros por questão na ordem do caderno e o gabarito da versão do aluno', () => {
  const resumo = avaliacaoService.montarQuestoesDoAluno(detalhe);
  assert.equal(resumo.versao, 'B');
  assert.equal(resumo.acertos, 1);
  assert.equal(resumo.total, 2);

  const [primeira, segunda] = resumo.questoes;
  assert.equal(primeira.numero, 1);
  assert.equal(primeira.enunciado, 'Qual vem primeiro?');
  assert.deepEqual(primeira.alternativas, [{ letra: 'A', texto: 'y' }, { letra: 'B', texto: 'x' }]);
  assert.equal(primeira.respostaCorreta, 'B');
  assert.equal(primeira.respostaAluno, 'B');
  assert.equal(primeira.acertou, true);

  assert.deepEqual(segunda.alternativas.map((a) => a.texto), ['c', 'a', 'b']);
  assert.equal(segunda.respostaCorreta, 'C');
  assert.equal(segunda.respostaAluno, 'A');
  assert.equal(segunda.acertou, false);
});

test('questão em branco aparece como errada, sem letra marcada', () => {
  const resumo = avaliacaoService.montarQuestoesDoAluno({
    ...detalhe,
    answers: [{ questionId: 11, markedIndex: null }, { questionId: 10, markedIndex: 2 }]
  });
  assert.equal(resumo.questoes[0].emBranco, true);
  assert.equal(resumo.questoes[0].respostaAluno, null);
  assert.equal(resumo.questoes[0].acertou, false);
  assert.equal(resumo.questoes[1].acertou, true);
  assert.equal(resumo.acertos, 1);
});

test('consultarCodigo inclui os detalhes só quando o repositório os devolve', async (t) => {
  t.mock.method(avaliacaoRepository, 'buscarPublicoPorCodigo', async (_code, ra) => ({
    name: 'Prova', released: true, resultAvailable: Boolean(ra), score: ra ? 7 : null, detalhe: ra ? detalhe : null
  }));

  const comRa = await avaliacaoService.consultarCodigo('sgp-1', 'RA-1');
  assert.equal(comRa.detalhes.acertos, 1);
  assert.equal('detalhe' in comRa, false);

  const semRa = await avaliacaoService.consultarCodigo('sgp-1', '');
  assert.equal('detalhes' in semRa, false);
  assert.equal('detalhe' in semRa, false);
});

test('repositório só busca respostas do aluno depois da liberação e do RA correto', async (t) => {
  const consultas = [];
  t.mock.method(pool, 'query', async (sql, params) => {
    consultas.push(sql.replace(/\s+/g, ' ').trim().slice(0, 40));
    if (sql.startsWith('SELECT id, title')) {
      return [[{ id: 9, title: 'Prova', answer_key_released: 0, legacy_details: null }]];
    }
    return [[]];
  });
  const naoLiberada = await avaliacaoRepository.buscarPublicoPorCodigo('SGP-1', 'RA-1');
  assert.equal(naoLiberada.detalhe, null);
  assert.equal(consultas.length, 1);

  consultas.length = 0;
  t.mock.method(pool, 'query', async (sql) => {
    consultas.push(sql);
    if (sql.startsWith('SELECT id, title')) {
      return [[{ id: 9, title: 'Prova', answer_key_released: 1, legacy_details: JSON.stringify({ questionSnapshots: detalhe.snapshots }) }]];
    }
    if (/FROM results r/.test(sql)) return [[{ score: '5', student_id: 3 }]];
    if (/FROM exam_assignments/.test(sql)) return [[{ label: 'B', printed_items: JSON.stringify(detalhe.printedItems) }]];
    return [[{ question_id: 11, marked_index: 1 }, { question_id: 10, marked_index: null }]];
  });
  const liberada = await avaliacaoRepository.buscarPublicoPorCodigo('SGP-1', 'RA-1');
  assert.equal(liberada.detalhe.versionLabel, 'B');
  assert.deepEqual(liberada.detalhe.answers, [
    { questionId: 11, markedIndex: 1 },
    { questionId: 10, markedIndex: null }
  ]);
});

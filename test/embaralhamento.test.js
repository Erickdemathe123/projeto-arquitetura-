const { test } = require('node:test');
const assert = require('node:assert/strict');
const { criarGerador, embaralhar, gerarItensImpressos, gerarRotulo } = require('../src/utils/embaralhamento');

test('criarGerador: mesma semente produz sempre a mesma sequência', () => {
  const a = criarGerador(42);
  const b = criarGerador(42);
  const valoresA = Array.from({ length: 5 }, () => a());
  const valoresB = Array.from({ length: 5 }, () => b());
  assert.deepEqual(valoresA, valoresB);
  for (const valor of valoresA) {
    assert.ok(valor >= 0 && valor < 1);
  }
});

test('criarGerador: sementes diferentes tendem a produzir sequências diferentes', () => {
  const a = criarGerador(1);
  const b = criarGerador(2);
  assert.notDeepEqual(
    Array.from({ length: 5 }, () => a()),
    Array.from({ length: 5 }, () => b())
  );
});

test('embaralhar: é uma permutação (mesmos elementos, possivelmente outra ordem) e é determinístico pela semente', () => {
  const lista = [1, 2, 3, 4, 5, 6, 7, 8];
  const resultado1 = embaralhar(lista, criarGerador(7));
  const resultado2 = embaralhar(lista, criarGerador(7));
  assert.deepEqual(resultado1, resultado2);
  assert.deepEqual([...resultado1].sort((x, y) => x - y), lista);
  assert.deepEqual(lista, [1, 2, 3, 4, 5, 6, 7, 8], 'não deve mutar a lista original');
});

test('embaralhar: listas vazia e de um elemento não quebram', () => {
  const gerar = criarGerador(1);
  assert.deepEqual(embaralhar([], gerar), []);
  assert.deepEqual(embaralhar(['único'], gerar), ['único']);
});

test('gerarItensImpressos: sem embaralhamento mantém a ordem original e correct_index igual ao original', () => {
  const questoes = [
    { id: 10, alternatives: ['a', 'b', 'c'], correctAlternative: 1 },
    { id: 20, alternatives: ['x', 'y'], correctAlternative: 0 }
  ];
  const itens = gerarItensImpressos(
    questoes,
    { embaralharQuestoes: false, embaralharAlternativas: false },
    criarGerador(1)
  );
  assert.deepEqual(itens, [
    { question_id: 10, alternative_order: [0, 1, 2], correct_index: 1 },
    { question_id: 20, alternative_order: [0, 1], correct_index: 0 }
  ]);
});

test('gerarItensImpressos: correct_index acompanha a alternativa correta quando as alternativas são embaralhadas', () => {
  // Documentado em docs/modelo-dados/t39.md: alternative_order [1,2,0] com
  // correctAlternative=1 (B original) deve produzir correct_index=0 (posição impressa A).
  const falsoGerador = (() => {
    const valores = [0.1, 0.1]; // força a permutação [1,2,0] no Fisher-Yates de 3 itens
    let i = 0;
    return () => valores[i++ % valores.length];
  })();
  const questoes = [{ id: 1, alternatives: ['A original', 'B original', 'C original'], correctAlternative: 1 }];
  const [item] = gerarItensImpressos(questoes, { embaralharQuestoes: false, embaralharAlternativas: true }, falsoGerador);
  assert.deepEqual(item.alternative_order, [1, 2, 0]);
  assert.equal(item.correct_index, 0);
});

test('gerarItensImpressos: cada item tem exatamente uma questão e um índice correto válido', () => {
  const questoes = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    alternatives: ['a', 'b', 'c', 'd'],
    correctAlternative: i % 4
  }));
  const itens = gerarItensImpressos(
    questoes,
    { embaralharQuestoes: true, embaralharAlternativas: true },
    criarGerador(123)
  );
  assert.equal(itens.length, questoes.length);
  assert.deepEqual(
    [...itens.map((item) => item.question_id)].sort((a, b) => a - b),
    questoes.map((q) => q.id)
  );
  for (const item of itens) {
    assert.ok(item.correct_index >= 0 && item.correct_index < item.alternative_order.length);
    assert.deepEqual([...item.alternative_order].sort((a, b) => a - b), [0, 1, 2, 3]);
  }
});

test('gerarRotulo: A-Z e depois AA, AB...', () => {
  assert.equal(gerarRotulo(0), 'A');
  assert.equal(gerarRotulo(1), 'B');
  assert.equal(gerarRotulo(25), 'Z');
  assert.equal(gerarRotulo(26), 'AA');
  assert.equal(gerarRotulo(27), 'AB');
  assert.equal(gerarRotulo(51), 'AZ');
  assert.equal(gerarRotulo(52), 'BA');
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const padrao = require('../src/config/folhaRespostasPadrao');
const configuracaoService = require('../src/services/configuracaoService');
const { asConfig } = require('../src/utils/answerSheetRenderer');

test('configuração sem endereço nem orientações recebe os valores padrão', () => {
  const config = configuracaoService.normalizarParaAvaliacao({
    resultUrl: '',
    proofInstructions: '',
    answerInstructions: ''
  });
  assert.equal(config.resultUrl, padrao.DEFAULT_RESULT_URL);
  assert.equal(config.proofInstructions, padrao.DEFAULT_PROOF_INSTRUCTIONS);
  assert.equal(config.answerInstructions, padrao.DEFAULT_ANSWER_INSTRUCTIONS);
  assert.match(config.resultUrl, /^https:\/\/.+\/aluno$/);
});

test('valores preenchidos pelo professor são mantidos', () => {
  const config = configuracaoService.normalizarParaAvaliacao({
    resultUrl: 'https://exemplo.edu.br/notas',
    proofInstructions: 'Prova individual.'
  });
  assert.equal(config.resultUrl, 'https://exemplo.edu.br/notas');
  assert.equal(config.proofInstructions, 'Prova individual.');
});

test('avaliação antiga salva com campos vazios imprime o gabarito com o endereço padrão', () => {
  const avaliacao = {
    answerSheet: { resultUrl: '', proofInstructions: '', answerInstructions: '', resultText: '' }
  };
  const config = asConfig(avaliacao, avaliacao.answerSheet);
  assert.equal(config.resultUrl, padrao.DEFAULT_RESULT_URL);
  assert.equal(config.proofInstructions, padrao.DEFAULT_PROOF_INSTRUCTIONS);
  assert.equal(config.answerInstructions, padrao.DEFAULT_ANSWER_INSTRUCTIONS);
  assert.equal(config.resultText, padrao.DEFAULT_RESULT_TEXT);
});

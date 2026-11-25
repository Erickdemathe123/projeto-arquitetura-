// Valores padrão da folha de respostas, usados quando o professor ainda não
// preencheu o campo em Configurações. Sem eles o gabarito saía com
// "ACESSE SEU RESULTADO EM:" sem endereço e com as orientações em branco.

const DEFAULT_RESULT_URL =
  process.env.PUBLIC_STUDENT_PORTAL_URL || 'https://projeto-arquitetura-iota.vercel.app/aluno';

const DEFAULT_RESULT_TEXT =
  'Acesse o endereço acima, informe o código da prova e o seu RA para consultar o resultado.';

const DEFAULT_PROOF_INSTRUCTIONS = [
  'Leia com atenção cada questão antes de responder.',
  'Confira se seu nome e RA estão corretos nesta folha.',
  'Não amasse nem dobre a folha e não escreva sobre o QR Code.',
  'A nota será calculada pela leitura desta folha de respostas.'
].join('\n');

const DEFAULT_ANSWER_INSTRUCTIONS = [
  'As respostas deverão ser assinaladas com caneta azul ou preta.',
  'Preencha completamente a área da resposta.',
  'Assinale somente uma alternativa por questão.'
].join('\n');

module.exports = {
  DEFAULT_RESULT_URL,
  DEFAULT_RESULT_TEXT,
  DEFAULT_PROOF_INSTRUCTIONS,
  DEFAULT_ANSWER_INSTRUCTIONS
};

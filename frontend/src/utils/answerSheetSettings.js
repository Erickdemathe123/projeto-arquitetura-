// Mesmos padrões de src/config/folhaRespostasPadrao.js (API), para a
// pré-visualização mostrar o que vai sair no PDF quando o campo está vazio.
export const DEFAULT_PROOF_INSTRUCTIONS = [
  "Leia com atenção cada questão antes de responder.",
  "Confira se seu nome e RA estão corretos nesta folha.",
  "Não amasse nem dobre a folha e não escreva sobre o QR Code.",
  "A nota será calculada pela leitura desta folha de respostas."
].join("\n");

export const DEFAULT_ANSWER_INSTRUCTIONS = "As respostas deverão ser assinaladas com caneta azul ou preta.\nPreencha completamente a área da resposta.\nAssinale somente uma alternativa por questão.";

export const DEFAULT_RESULT_TEXT = "Acesse o endereço acima, informe o código da prova e o seu RA para consultar o resultado.";

export function defaultResultUrl() {
  const origin = typeof window !== "undefined" && window.location?.origin;
  return origin && /^https?:/.test(origin) ? `${origin}/aluno` : "https://projeto-arquitetura-iota.vercel.app/aluno";
}

export function emptyAnswerSheetSettings() {
  return {
    institutionName: "",
    logo: "",
    proofInstructions: DEFAULT_PROOF_INSTRUCTIONS,
    answerInstructions: DEFAULT_ANSWER_INSTRUCTIONS,
    resultUrl: defaultResultUrl(),
    resultText: DEFAULT_RESULT_TEXT
  };
}

// Campos vazios vindos da API (ou de avaliações antigas) recebem o padrão.
export function answerSheetSettingsFrom(value = {}) {
  const base = emptyAnswerSheetSettings();
  const result = { ...base, ...value };
  for (const field of ["proofInstructions", "answerInstructions", "resultUrl", "resultText"]) {
    if (!result[field]) result[field] = base[field];
  }
  return result;
}

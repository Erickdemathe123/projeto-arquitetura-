export function emptyAnswerSheetSettings() {
  return {
    institutionName: "",
    logo: "",
    proofInstructions: "",
    answerInstructions: "As respostas deverão ser assinaladas com caneta azul ou preta.\nPreencha completamente a área da resposta.\nAssinale somente uma alternativa por questão.",
    resultUrl: "",
    resultText: "Acesse o endereço acima, informe o código da prova e o seu RA para consultar o resultado."
  };
}

export function answerSheetSettingsFrom(value = {}) {
  return { ...emptyAnswerSheetSettings(), ...value };
}

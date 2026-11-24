class Configuracao {
  constructor(row = {}) {
    this.institutionName = row.institution_name || '';
    this.logo = row.logo_data || '';
    this.proofInstructions = row.proof_instructions || '';
    this.answerInstructions = row.answer_instructions || '';
    this.resultUrl = row.result_url || '';
    this.resultText = row.result_text || '';
    this.updatedAt = row.updated_at || null;
  }

  static fromRow(row) {
    return new Configuracao(row);
  }
}

module.exports = Configuracao;

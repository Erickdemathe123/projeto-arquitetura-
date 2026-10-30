class Questao {
  constructor({ id, text, subject, topic, alternatives, correctAlternative }) {
    this.id = Number(id);
    this.text = text;
    this.subject = subject || '';
    this.topic = topic || '';
    this.type = 'Múltipla escolha';
    this.alternatives = alternatives;
    this.correctAlternative = correctAlternative;
  }
}

module.exports = Questao;

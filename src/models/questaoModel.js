class Questao {
  constructor(row, alternativas) {
    this.id = row.id;
    this.professorId = row.professor_id;
    this.enunciado = row.enunciado;
    this.disciplina = row.disciplina;
    this.assunto = row.assunto;
    this.tipo = row.tipo;
    this.alternativaCorreta = row.alternativa_correta;
    this.alternativas = alternativas;
    this.criadoEm = row.criado_em;
    this.atualizadoEm = row.atualizado_em;
  }
  static fromRows(rows) {
    const questoes = new Map();
    for (const row of rows) {
      if (!questoes.has(row.id)) questoes.set(row.id, new Questao(row, []));
      if (row.alternativa_ordem !== null) questoes.get(row.id).alternativas.push(row.alternativa_texto);
    }
    return [...questoes.values()];
  }
}
module.exports = Questao;

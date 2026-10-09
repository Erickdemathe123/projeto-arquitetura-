// Model: representa um aluno e converte linhas do banco em objetos da aplicação.
class Aluno {
  constructor({ id, nome, ra, email, criado_em, matriculado_em }) {
    this.id = id;
    this.nome = nome;
    this.ra = ra;
    this.email = email || null;
    this.criadoEm = criado_em;
    // Só vem preenchido quando o aluno é listado dentro de uma turma
    this.matriculadoEm = matriculado_em !== undefined ? matriculado_em : undefined;
  }

  static fromRow(row) {
    return row ? new Aluno(row) : null;
  }
}

module.exports = Aluno;

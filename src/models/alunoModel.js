// Model: representa um aluno e converte linhas do banco em objetos da aplicação.
class Aluno {
  constructor({ id, name, ra, email, created_at, enrolled_at }) {
    this.id = id;
    this.nome = name;
    this.ra = ra;
    this.email = email || null;
    this.criadoEm = created_at;
    // Só vem preenchido quando o aluno é listado dentro de uma turma
    this.matriculadoEm = enrolled_at !== undefined ? enrolled_at : undefined;
  }

  static fromRow(row) {
    return row ? new Aluno(row) : null;
  }
}

module.exports = Aluno;

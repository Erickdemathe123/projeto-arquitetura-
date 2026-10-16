// Model: representa uma turma e converte linhas do banco em objetos da aplicação.
class Turma {
  constructor({ id, teacher_id, name, description, invite_code, archived, created_at, updated_at, total_alunos }) {
    this.id = id;
    this.professorId = teacher_id;
    this.nome = name;
    this.descricao = description || null;
    this.codigoConvite = invite_code;
    this.arquivada = Boolean(archived);
    this.totalAlunos = total_alunos !== undefined ? Number(total_alunos) : undefined;
    this.criadoEm = created_at;
    this.atualizadoEm = updated_at;
  }

  static fromRow(row) {
    return row ? new Turma(row) : null;
  }
}

module.exports = Turma;

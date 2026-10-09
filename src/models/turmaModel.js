// Model: representa uma turma e converte linhas do banco em objetos da aplicação.
class Turma {
  constructor({ id, professor_id, nome, descricao, codigo_convite, arquivada, criado_em, atualizado_em, total_alunos }) {
    this.id = id;
    this.professorId = professor_id;
    this.nome = nome;
    this.descricao = descricao || null;
    this.codigoConvite = codigo_convite;
    this.arquivada = Boolean(arquivada);
    this.totalAlunos = total_alunos !== undefined ? Number(total_alunos) : undefined;
    this.criadoEm = criado_em;
    this.atualizadoEm = atualizado_em;
  }

  static fromRow(row) {
    return row ? new Turma(row) : null;
  }
}

module.exports = Turma;

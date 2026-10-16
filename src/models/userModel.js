// Model: representa um usuário (professor ou aluno) e converte linhas do banco em objetos.
class User {
  constructor({ id, name, email, password_hash, role, ra, created_at }) {
    this.id = id !== undefined && id !== null ? Number(id) : undefined;
    this.name = name;
    this.email = email || null;
    this.passwordHash = password_hash || null;
    this.role = role;
    this.ra = ra || null;
    this.createdAt = created_at;
  }

  static fromRow(row) {
    return row ? new User(row) : null;
  }

  // Remove campos sensíveis antes de enviar ao cliente
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      ra: this.ra,
      createdAt: this.createdAt
    };
  }
}

module.exports = User;

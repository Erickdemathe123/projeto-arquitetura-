// Model: representa a nota de um aluno em uma avaliação.
class Resultado {
  constructor({ id, exam_id, student_id, student_name, ra, score, corrected_at }) {
    this.id = Number(id);
    this.examId = Number(exam_id);
    this.studentId = Number(student_id);
    this.studentName = student_name || null;
    this.ra = ra || null;
    this.score = score !== null && score !== undefined ? Number(score) : null;
    this.correctedAt = corrected_at || null;
  }

  static fromRow(row) {
    return row ? new Resultado(row) : null;
  }
}

module.exports = Resultado;

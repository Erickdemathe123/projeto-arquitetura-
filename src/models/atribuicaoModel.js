class Atribuicao {
  constructor({ exam_id, student_id, student_name, version_id, version_label }) {
    this.examId = Number(exam_id);
    this.studentId = Number(student_id);
    this.studentName = student_name;
    this.versionId = Number(version_id);
    this.versionLabel = version_label;
  }

  static fromRow(row) {
    return row ? new Atribuicao(row) : null;
  }
}

module.exports = Atribuicao;

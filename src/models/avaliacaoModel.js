function parseDetails(details) {
  if (!details) return {};
  if (typeof details === 'object') return details;
  try {
    return JSON.parse(details);
  } catch {
    return {};
  }
}

class Avaliacao {
  constructor(row, questions = []) {
    const details = parseDetails(row.legacy_details);
    this.id = Number(row.id);
    this.name = row.title;
    this.status = row.status;
    this.questionIds = questions.map((question) => Number(question.id));
    this.questionPoints = questions.map((question) => Number(question.points));
    this.totalPoints = Math.round(this.questionPoints.reduce((total, points) => total + points, 0) * 100) / 100;
    this.questionSnapshots = Array.isArray(details.questionSnapshots) ? details.questionSnapshots : [];
    this.publicCode = row.public_code;
    this.applicationClassId = details.applicationClassId ? Number(details.applicationClassId) : null;
    this.name = row.title;
    for (const [key, value] of Object.entries(details)) {
      if (key !== 'questionSnapshots' && key !== 'applicationClassId') this[key] = value;
    }
    this.name = row.title;
    this.released = Boolean(row.answer_key_released);
  }
}

module.exports = Avaliacao;

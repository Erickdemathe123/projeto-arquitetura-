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
  constructor(row, questionIds = []) {
    const details = parseDetails(row.legacy_details);
    this.id = Number(row.id);
    this.name = row.title;
    this.status = row.status;
    this.questionIds = questionIds.map(Number);
    this.questionSnapshots = Array.isArray(details.questionSnapshots) ? details.questionSnapshots : [];
    this.publicCode = row.public_code;
    this.released = row.status === 'closed';
    this.applicationClassId = details.applicationClassId ? Number(details.applicationClassId) : null;
    this.name = row.title;
    for (const [key, value] of Object.entries(details)) {
      if (key !== 'questionSnapshots' && key !== 'applicationClassId') this[key] = value;
    }
    this.name = row.title;
  }
}

module.exports = Avaliacao;

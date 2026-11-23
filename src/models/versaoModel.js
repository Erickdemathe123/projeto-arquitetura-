// Model: representa uma versão (caderno) de uma avaliação.
class Versao {
  constructor(row) {
    this.id = Number(row.id);
    this.examId = Number(row.exam_id);
    this.label = row.label;
    this.printedItems = typeof row.printed_items === 'string'
      ? JSON.parse(row.printed_items)
      : row.printed_items;
  }

  static fromRow(row) {
    return row ? new Versao(row) : null;
  }
}

module.exports = Versao;

export function examQuestionsCountLabel(exam) {
  return `${exam.questionIds.length} ${exam.questionIds.length === 1 ? "questão" : "questões"}`;
}

export function formatPoints(value) {
  const points = Number(value) || 0;
  return `${points.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${points === 1 ? "ponto" : "pontos"}`;
}

export function examQuestionsCountLabel(exam) {
  return `${exam.questionIds.length} ${exam.questionIds.length === 1 ? "questão" : "questões"}`;
}

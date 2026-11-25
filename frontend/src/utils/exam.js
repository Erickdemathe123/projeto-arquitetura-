export function examQuestionsCountLabel(exam) {
  return `${exam.questionIds.length} ${exam.questionIds.length === 1 ? "questão" : "questões"}`;
}

// Status da correção a partir do resumo de GET /avaliacoes/:id/resultados.
// Retorna "" quando ainda não há resumo carregado (ex.: prova sem turma).
export function correctionStatusLabel(summary) {
  if (!summary) return "";
  const progresso = `${summary.corrigidos}/${summary.totalMatriculados}`;
  if (summary.status === "concluida") return `Corrigida (${progresso})`;
  if (summary.status === "em_andamento") return `Em correção (${progresso})`;
  return `Correção pendente (${progresso})`;
}

export function formatPoints(value) {
  const points = Number(value) || 0;
  return `${points.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${points === 1 ? "ponto" : "pontos"}`;
}

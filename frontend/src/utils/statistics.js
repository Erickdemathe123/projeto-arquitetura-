// Cálculos da tela de estatísticas a partir de GET /avaliacoes/:id/resultados

export const PASSING_SCORE = 6;

const BUCKETS = [
  { label: "0 a 2", min: 0, max: 2 },
  { label: "2 a 4", min: 2, max: 4 },
  { label: "4 a 6", min: 4, max: 6 },
  { label: "6 a 8", min: 6, max: 8 },
  { label: "8 a 10", min: 8, max: 10 }
];

function round(value) {
  return Math.round(value * 100) / 100;
}

export function formatScore(value) {
  return Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

export function buildStatistics(summary) {
  const results = (summary.resultados || []).filter((resultado) => resultado.score !== null && resultado.score !== undefined);
  const scores = results.map((resultado) => Number(resultado.score));
  const count = scores.length;
  const passed = scores.filter((score) => score >= PASSING_SCORE).length;
  // Cada faixa inclui o mínimo e exclui o máximo, menos a última, que inclui o 10
  const buckets = BUCKETS.map((bucket, index) => ({
    label: bucket.label,
    count: scores.filter((score) => score >= bucket.min && (score < bucket.max || (index === BUCKETS.length - 1 && score <= bucket.max))).length
  }));
  return {
    count,
    enrolled: Number(summary.totalMatriculados) || 0,
    average: count ? round(scores.reduce((total, score) => total + score, 0) / count) : 0,
    highest: count ? Math.max(...scores) : 0,
    lowest: count ? Math.min(...scores) : 0,
    passingScore: PASSING_SCORE,
    passed,
    passedPercent: count ? Math.round((passed / count) * 100) : 0,
    buckets,
    maxBucket: Math.max(...buckets.map((bucket) => bucket.count)),
    ranking: [...results].sort((a, b) => b.score - a.score || String(a.studentName).localeCompare(String(b.studentName), "pt-BR"))
  };
}

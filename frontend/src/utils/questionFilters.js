// Filtros do Banco de Questões (T59).
// A busca ignora maiúsculas/minúsculas e acentos ("funcao" encontra "Função").

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function uniqueSorted(values) {
  const unique = [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
  return unique.sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function filterQuestions(questions, { search = "", subject = "", topic = "" } = {}) {
  const terms = normalizeText(search).split(/\s+/).filter(Boolean);
  return questions.filter((question) => {
    if (subject && question.subject !== subject) return false;
    if (topic && question.topic !== topic) return false;
    if (!terms.length) return true;
    const haystack = normalizeText([question.text, question.subject, question.topic, ...(question.alternatives || [])].join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

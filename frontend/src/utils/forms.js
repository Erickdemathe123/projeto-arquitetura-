import { formatStoredDate } from "./date";

// Formulários usados pelo App.vue. Cada chamada devolve um objeto novo,
// para que limpar ou editar um formulário não afete outro.

export function emptyQuestionForm() {
  return { text: "", subject: "", topic: "", type: "Múltipla escolha", alternatives: ["", "", "", "", ""], correctAlternative: 0 };
}

export function questionFormFrom(question) {
  return {
    text: question.text,
    subject: question.subject,
    topic: question.topic,
    type: "Múltipla escolha",
    alternatives: [...question.alternatives],
    correctAlternative: question.correctAlternative || 0
  };
}

export function emptyExamForm() {
  return {
    name: "",
    selected: [],
    points: {},
    institution: "",
    course: "",
    subject: "",
    professor: "",
    className: "",
    date: "",
    instructions: "",
    logo: "",
    layout: "Uma coluna",
    shuffleQuestions: true,
    shuffleAlternatives: true,
    versions: 1,
    addBlankPage: true
  };
}

export function examFormFrom(exam) {
  return {
    name: exam.name,
    selected: [...exam.questionIds],
    points: Object.fromEntries(exam.questionIds.map((questionId, index) => [questionId, exam.questionPoints?.[index] ?? 1])),
    institution: exam.institution || "",
    course: exam.course || "",
    subject: exam.subject || "",
    professor: exam.professor || "",
    className: exam.className || "",
    date: formatStoredDate(exam.date),
    instructions: exam.instructions || "",
    logo: exam.logo || "",
    layout: exam.layout || "Uma coluna",
    shuffleQuestions: exam.shuffleQuestions !== false,
    shuffleAlternatives: exam.shuffleAlternatives !== false,
    versions: exam.versions || 1,
    addBlankPage: exam.addBlankPage !== false
  };
}

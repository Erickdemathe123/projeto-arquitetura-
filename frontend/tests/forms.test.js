import { describe, expect, it } from "vitest";
import { emptyExamForm, emptyQuestionForm, examFormFrom, questionFormFrom } from "../src/utils/forms";

describe("utils/forms", () => {
  it("cria formulários vazios independentes a cada chamada", () => {
    const primeiro = emptyExamForm();
    primeiro.selected.push(1);
    expect(emptyExamForm().selected).toEqual([]);
    expect(emptyQuestionForm().alternatives).toHaveLength(5);
  });

  it("carrega a prova para edição com os pontos de cada questão", () => {
    const form = examFormFrom({ name: "Prova", questionIds: [3, 7], questionPoints: [2, 0.5], date: "2026-11-20" });
    expect(form.points).toEqual({ 3: 2, 7: 0.5 });
    expect(form.date).toBe("20/11/2026");
    expect(form.layout).toBe("Uma coluna");
  });

  it("usa 1 ponto quando a prova não tem pontos salvos", () => {
    expect(examFormFrom({ name: "Antiga", questionIds: [1] }).points).toEqual({ 1: 1 });
  });

  it("copia as alternativas da questão sem compartilhar o array", () => {
    const questao = { text: "T", subject: "S", topic: "A", alternatives: ["a", "b"], correctAlternative: 1 };
    const form = questionFormFrom(questao);
    form.alternatives.push("c");
    expect(questao.alternatives).toEqual(["a", "b"]);
  });
});

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import QuestionsScreen from "../src/components/QuestionsScreen.vue";
import { filterQuestions, normalizeText, uniqueSorted } from "../src/utils/questionFilters";

const questoes = [
  { id: 1, text: "Qual é a derivada de uma função constante?", subject: "Matemática", topic: "Derivadas", type: "Múltipla escolha", alternatives: ["0", "1"] },
  { id: 2, text: "Quanto é 3 x 3?", subject: "Matemática", topic: "Multiplicação", type: "Múltipla escolha", alternatives: ["6", "9"] },
  { id: 3, text: "Qual estrutura guarda pares chave-valor?", subject: "Programação", topic: "Estruturas de dados", type: "Múltipla escolha", alternatives: ["Mapa", "Pilha"] }
];

describe("filtros do banco de questões (T59)", () => {
  it("normaliza acentos e maiúsculas", () => {
    expect(normalizeText("  FunÇão ")).toBe("funcao");
  });

  it("lista disciplinas/assuntos sem repetição e em ordem alfabética", () => {
    expect(uniqueSorted(["Programação", "Matemática", "Matemática", "", null])).toEqual(["Matemática", "Programação"]);
  });

  it("busca por texto sem acento e com vários termos", () => {
    expect(filterQuestions(questoes, { search: "funcao" }).map((q) => q.id)).toEqual([1]);
    expect(filterQuestions(questoes, { search: "qual chave" }).map((q) => q.id)).toEqual([3]);
    expect(filterQuestions(questoes, { search: "derivadas" }).map((q) => q.id)).toEqual([1]);
  });

  it("combina disciplina, assunto e texto", () => {
    expect(filterQuestions(questoes, { subject: "Matemática" }).map((q) => q.id)).toEqual([1, 2]);
    expect(filterQuestions(questoes, { subject: "Matemática", topic: "Multiplicação" }).map((q) => q.id)).toEqual([2]);
    expect(filterQuestions(questoes, { subject: "Programação", search: "derivada" })).toEqual([]);
  });

  it("filtra a lista na tela e permite limpar os filtros", async () => {
    const wrapper = mount(QuestionsScreen, { props: { questions: questoes } });
    expect(wrapper.findAll(".question-item")).toHaveLength(3);

    await wrapper.find('select[aria-label="Filtrar por disciplina"]').setValue("Matemática");
    expect(wrapper.findAll(".question-item")).toHaveLength(2);
    expect(wrapper.findAll('select[aria-label="Filtrar por assunto"] option').map((o) => o.text())).toEqual(["Todos", "Derivadas", "Multiplicação"]);

    await wrapper.find('input[aria-label="Buscar questões"]').setValue("nada disso");
    expect(wrapper.text()).toContain("Nenhuma questão encontrada");

    await wrapper.find(".clear-filters").trigger("click");
    expect(wrapper.findAll(".question-item")).toHaveLength(3);
  });

  it("limpa o assunto quando ele não existe na disciplina escolhida", async () => {
    const wrapper = mount(QuestionsScreen, { props: { questions: questoes } });
    await wrapper.find('select[aria-label="Filtrar por assunto"]').setValue("Estruturas de dados");
    await wrapper.find('select[aria-label="Filtrar por disciplina"]').setValue("Matemática");
    expect(wrapper.vm.topic).toBe("");
    expect(wrapper.findAll(".question-item")).toHaveLength(2);
  });
});

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { reactive } from "vue";
import AuthScreen from "../src/components/AuthScreen.vue";
import StudentPortal from "../src/components/StudentPortal.vue";
import ExamForm from "../src/components/ExamForm.vue";
import ExamsScreen from "../src/components/ExamsScreen.vue";

function novoFormulario(overrides = {}) {
  return reactive({
    name: "", selected: [], points: {}, institution: "", course: "", subject: "", professor: "",
    className: "", date: "", instructions: "", logo: "", layout: "Uma coluna",
    shuffleQuestions: true, shuffleAlternatives: true, versions: 1, addBlankPage: true,
    ...overrides
  });
}

const questoes = [
  { id: 1, text: "Quanto é 2 + 2?", subject: "Matemática", topic: "Soma" },
  { id: 2, text: "Quanto é 3 x 3?", subject: "Matemática", topic: "Multiplicação" }
];

describe("AuthScreen", () => {
  it("mostra o login e avisa quando o aluno quer consultar o resultado", async () => {
    const wrapper = mount(AuthScreen, { props: { mode: "login" } });
    expect(wrapper.find("h1").text()).toBe("Bem-vindo");
    await wrapper.find(".student-link").trigger("click");
    expect(wrapper.emitted("open-student-portal")).toHaveLength(1);
  });

  it("mostra os campos de cadastro no modo register", () => {
    const wrapper = mount(AuthScreen, { props: { mode: "register" } });
    expect(wrapper.find("h1").text()).toBe("Crie sua conta");
    expect(wrapper.find('input[placeholder="Confirmar senha"]').exists()).toBe(true);
  });
});

describe("StudentPortal", () => {
  it("mostra a nota quando o resultado está liberado", () => {
    const wrapper = mount(StudentPortal, {
      props: { result: { released: true, resultAvailable: true, name: "Prova 1", score: 8 } }
    });
    expect(wrapper.find(".released-result").text()).toContain("Nota: 8");
  });

  it("avisa quando o gabarito ainda não foi liberado", () => {
    const wrapper = mount(StudentPortal, { props: { result: { released: false } } });
    expect(wrapper.text()).toContain("Gabarito ainda não liberado");
  });

  it("emite consult ao enviar e back no acesso do professor", async () => {
    const wrapper = mount(StudentPortal);
    await wrapper.find("form").trigger("submit");
    await wrapper.find("button.text-button").trigger("click");
    expect(wrapper.emitted("consult")).toHaveLength(1);
    expect(wrapper.emitted("back")).toHaveLength(1);
  });
});

describe("ExamForm (pontos por questão, T41)", () => {
  function montar(form) {
    return mount(ExamForm, { props: { form, questions: questoes, subjects: ["Matemática"], classes: [] } });
  }

  it("dá 1 ponto para cada questão selecionada e mostra a soma", async () => {
    const form = novoFormulario({ selected: [1, 2] });
    const wrapper = montar(form);
    await wrapper.vm.$nextTick();
    expect(form.points).toEqual({ 1: 1, 2: 1 });
    expect(wrapper.find(".selection-total").text()).toContain("2 pontos em 2 questões");
  });

  it("recalcula o total quando os pontos mudam e ignora valores inválidos", async () => {
    const form = novoFormulario({ selected: [1, 2], points: { 1: 2.5, 2: 7.5 } });
    const wrapper = montar(form);
    expect(wrapper.find(".selection-total").text()).toContain("10 pontos");
    await wrapper.findAll(".selection-points input")[1].setValue("0");
    expect(wrapper.find(".selection-total").text()).toContain("2,5 pontos");
  });

  it("só mostra o campo de pontos nas questões marcadas", () => {
    const wrapper = montar(novoFormulario({ selected: [2] }));
    expect(wrapper.findAll(".selection-points")).toHaveLength(1);
  });
});

describe("ExamsScreen", () => {
  it("mostra a quantidade de questões e o total de pontos de cada prova", () => {
    const wrapper = mount(ExamsScreen, {
      props: {
        questions: questoes,
        exams: [{ id: 1, name: "Prova 1", questionIds: [1, 2], totalPoints: 10.5, publicCode: "SGP-1", released: false }]
      }
    });
    expect(wrapper.find(".question-item small").text()).toContain("2 questões · 10,5 pontos");
  });
});

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { buildStatistics } from "../src/utils/statistics";
import StatisticsScreen from "../src/components/StatisticsScreen.vue";
import AppDialog from "../src/components/AppDialog.vue";
import DashboardScreen from "../src/components/DashboardScreen.vue";
import ExamPreview from "../src/components/ExamPreview.vue";

const resumo = {
  totalMatriculados: 4,
  resultados: [
    { studentId: 1, studentName: "Ana", ra: "1", score: 9 },
    { studentId: 2, studentName: "Bruno", ra: "2", score: 5.5 },
    { studentId: 3, studentName: "Carla", ra: "3", score: 10 }
  ]
};

describe("buildStatistics", () => {
  it("calcula média, maior, menor e aprovados", () => {
    const stats = buildStatistics(resumo);
    expect(stats).toMatchObject({ count: 3, enrolled: 4, average: 8.17, highest: 10, lowest: 5.5, passed: 2, passedPercent: 67 });
    expect(stats.ranking.map((resultado) => resultado.studentName)).toEqual(["Carla", "Ana", "Bruno"]);
  });

  it("coloca cada nota na faixa certa, com o 10 na última", () => {
    const counts = buildStatistics(resumo).buckets.map((bucket) => bucket.count);
    expect(counts).toEqual([0, 0, 1, 0, 2]);
  });

  it("devolve zeros quando ainda não há notas", () => {
    expect(buildStatistics({ resultados: [] })).toMatchObject({ count: 0, average: 0, maxBucket: 0 });
  });
});

describe("StatisticsScreen", () => {
  it("mostra os cartões e a tabela quando há notas", () => {
    const wrapper = mount(StatisticsScreen, { props: { exam: { name: "Prova 1" }, summary: resumo } });
    expect(wrapper.findAll(".stat-card")).toHaveLength(5);
    expect(wrapper.find(".stat-card strong").text()).toBe("8,17");
    expect(wrapper.findAll(".stats-table tbody tr")).toHaveLength(3);
  });

  it("explica quando ainda não há notas", () => {
    const wrapper = mount(StatisticsScreen, { props: { summary: { resultados: [] } } });
    expect(wrapper.text()).toContain("Nenhuma nota lançada ainda");
  });
});

describe("AppDialog", () => {
  it("devolve o texto digitado ao confirmar", async () => {
    const wrapper = mount(AppDialog, { props: { title: "Editar turma", withInput: true, initialValue: "Turma A" }, attachTo: document.body });
    await wrapper.find("input").setValue("Turma B");
    await wrapper.find("form").trigger("submit");
    expect(wrapper.emitted("confirm")[0]).toEqual(["Turma B"]);
    wrapper.unmount();
  });

  it("emite cancel no botão Cancelar e ao clicar fora", async () => {
    const wrapper = mount(AppDialog, { props: { title: "Remover" }, attachTo: document.body });
    await wrapper.find(".outline-button").trigger("click");
    await wrapper.find(".dialog-backdrop").trigger("click");
    expect(wrapper.emitted("cancel")).toHaveLength(2);
    wrapper.unmount();
  });
});

describe("DashboardScreen", () => {
  it("troca os textos dos atalhos quando já existem questões", () => {
    const wrapper = mount(DashboardScreen, { props: { exams: [], questions: [{ id: 1 }, { id: 2 }] } });
    const textos = wrapper.findAll(".quick-actions small").map((item) => item.text());
    expect(textos[0]).toBe("2 questões no banco");
    expect(textos[1]).toBe("Selecione questões e monte a prova");
  });
});

describe("ExamPreview", () => {
  it("mostra na folha de respostas só as letras de cada questão", () => {
    const exam = { name: "Prova", questionIds: [1], questionSnapshots: [{ id: 1, text: "2 + 2?", alternatives: ["4", "3"] }] };
    const wrapper = mount(ExamPreview, { props: { exam, questions: [] } });
    expect(wrapper.find(".answer-grid div").text()).toBe("1A ○B ○");
  });
});

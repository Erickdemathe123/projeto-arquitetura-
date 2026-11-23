import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ExamsScreen from "../src/components/ExamsScreen.vue";

describe("ExamsScreen (T55)", () => {
  it("emite export-docx ao clicar no botão do caderno em Word", async () => {
    const exam = { id: 3, name: "Prova", questionIds: [1], totalPoints: 1, publicCode: "SGP-1", released: false };
    const wrapper = mount(ExamsScreen, { props: { exams: [exam], questions: [{ id: 1 }] } });
    await wrapper.find('button[aria-label="Exportar caderno em Word (.docx)"]').trigger("click");
    expect(wrapper.emitted("export-docx")[0]).toEqual([exam]);
  });
});

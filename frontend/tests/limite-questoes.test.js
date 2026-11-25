
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { reactive } from "vue";
import ExamForm from "../src/components/ExamForm.vue";
import { emptyExamForm } from "../src/utils/forms";

const questoes = Array.from({ length: 26 }, (_, index) => ({
  id: index + 1,
  text: `Questão ${index + 1}`,
  subject: "Matemática",
  topic: "Teste"
}));

function montarFormulario(quantidade = 0) {
  const form = reactive({
    ...emptyExamForm(),
    selected: Array.from(
      { length: quantidade },
      (_, index) => index + 1
    )
  });

  const wrapper = mount(ExamForm, {
    props: {
      form,
      questions: questoes,
      subjects: ["Matemática"],
      classes: []
    }
  });

  return { wrapper, form };
}

describe("RF03 - Limite de questões", () => {
  it("exibe o contador inicial de questões", () => {
    const { wrapper } = montarFormulario();

    expect(wrapper.find(".selection-title").text())
      .toContain("0/25");

    wrapper.unmount();
  });

  it("permite selecionar a vigésima quinta questão", async () => {
    const { wrapper, form } = montarFormulario(24);

    const checkboxes = wrapper.findAll(
      '.selection-list input[type="checkbox"]'
    );

    expect(checkboxes[24].element.disabled).toBe(false);

    await checkboxes[24].setValue(true);

    expect(form.selected).toHaveLength(25);

    expect(wrapper.find(".selection-title").text())
      .toContain("25/25");

    wrapper.unmount();
  });

  it("bloqueia a seleção da vigésima sexta questão", () => {
    const { wrapper } = montarFormulario(25);

    const checkboxes = wrapper.findAll(
      '.selection-list input[type="checkbox"]'
    );

    expect(checkboxes[25].element.disabled).toBe(true);

    expect(wrapper.text())
      .toContain("Limite máximo de 25 questões atingido.");

    wrapper.unmount();
  });

  it("permite desmarcar e selecionar outra questão", async () => {
    const { wrapper, form } = montarFormulario(25);

    const checkboxes = wrapper.findAll(
      '.selection-list input[type="checkbox"]'
    );

    expect(checkboxes[0].element.disabled).toBe(false);

    await checkboxes[0].setValue(false);

    expect(form.selected).toHaveLength(24);
    expect(checkboxes[25].element.disabled).toBe(false);

    await checkboxes[25].setValue(true);

    expect(form.selected).toHaveLength(25);
    expect(form.selected).toContain(26);
    expect(form.selected).not.toContain(1);

    wrapper.unmount();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { THEME_KEY, applyTheme, getInitialTheme } from "../src/utils/theme";
import ThemeToggle from "../src/components/ThemeToggle.vue";

function simularSistema(escuro) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: escuro });
}

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("utils/theme", () => {
  it("usa o tema salvo pelo usuário", () => {
    simularSistema(false);
    localStorage.setItem(THEME_KEY, "dark");
    expect(getInitialTheme()).toBe("dark");
  });

  it("sem escolha salva, segue o tema do sistema", () => {
    simularSistema(true);
    expect(getInitialTheme()).toBe("dark");
    simularSistema(false);
    expect(getInitialTheme()).toBe("light");
  });

  it("aplica o tema no <html> e salva a escolha", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  });

  it("não salva quando save é false", () => {
    applyTheme("dark", { save: false });
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });
});

describe("ThemeToggle", () => {
  it("mostra a ação certa para cada tema e emite toggle", async () => {
    const wrapper = mount(ThemeToggle, { props: { theme: "light" } });
    expect(wrapper.attributes("aria-label")).toBe("Ativar modo noturno");
    await wrapper.trigger("click");
    expect(wrapper.emitted("toggle")).toHaveLength(1);
    await wrapper.setProps({ theme: "dark" });
    expect(wrapper.attributes("aria-label")).toBe("Ativar modo claro");
  });
});

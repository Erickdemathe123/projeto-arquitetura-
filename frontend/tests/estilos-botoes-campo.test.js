// @vitest-environment node
// Regressão: a regra do tooltip (button[aria-label] { position: relative })
// tinha mais especificidade que ".password-field button" e ".calendar-trigger"
// e desfazia o position: absolute deles. O botão de mostrar senha caía para
// baixo do campo em vez de ficar dentro dele.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "../src/styles.css"), "utf8");

function regras(seletor) {
  const escaped = seletor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...css.matchAll(new RegExp(`(^|[\\s,}])${escaped}\\s*\\{([^}]*)\\}`, "g"))].map((match) => match[2]);
}

describe("botões posicionados dentro de campos", () => {
  it("mantém o botão de mostrar senha e o do calendário dentro do campo", () => {
    expect(regras(".password-field button").join(" ")).toMatch(/position:\s*absolute/);
    expect(regras(".calendar-trigger").join(" ")).toMatch(/position:\s*absolute/);
  });

  it("não deixa a regra do tooltip sobrescrever o posicionamento deles", () => {
    expect(regras("button[aria-label]").join(" ")).not.toMatch(/position:/);
    expect(regras(":where(button[aria-label])").join(" ")).toMatch(/position:\s*relative/);
  });
});

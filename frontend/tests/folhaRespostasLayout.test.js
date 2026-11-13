import { describe, expect, it } from "vitest";
import layout from "../../shared/folhaRespostasLayout.js";

// Confirma que o módulo compartilhado (T38) é importável a partir do
// front-end (ESM/Vite), não só do back-end (CommonJS) — é esse o requisito
// da tarefa: um único módulo usado pelo gerador de PDF e pelo leitor.
describe("layout compartilhado da folha de respostas (T38)", () => {
  it("expõe página A4 e os 4 marcadores de canto", () => {
    expect(layout.PAGE).toEqual({ widthMm: 210, heightMm: 297 });
    expect(layout.MARKERS).toHaveLength(4);
  });

  it("calcula a posição da bolha de uma questão/alternativa", () => {
    const posicao = layout.obterPosicaoBolha(0, 0);
    expect(posicao.xMm).toBeGreaterThan(0);
    expect(posicao.yMm).toBeGreaterThan(0);
  });
});

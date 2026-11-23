import { afterEach, describe, expect, it, vi } from "vitest";
import { avaliacoesApi } from "../src/services/api";

describe("avaliacoesApi.gerarVersoes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia a quantidade de versões para o endpoint da avaliação", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => []
    });
    vi.stubGlobal("fetch", fetchMock);

    await avaliacoesApi.gerarVersoes(42, 3);

    expect(fetchMock).toHaveBeenCalledWith("/api/avaliacoes/42/versoes", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ versions: 3 })
    }));
  });
});

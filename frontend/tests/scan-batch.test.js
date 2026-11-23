import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.vue";
import { atribuicoesApi } from "../src/services/api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("QR scan batch state", () => {
  it("ignores an API response from a batch that was already closed", async () => {
    let resolveValidation;
    vi.spyOn(atribuicoesApi, "validarQr").mockImplementation(() => new Promise((resolve) => {
      resolveValidation = resolve;
    }));
    const state = {
      scanActiveExam: { id: 8 },
      scanQrBatch: [],
      scanQrBatchId: 0,
      scanQrLoading: false,
      scanQrError: "",
      scanQrFeedback: ""
    };

    const validation = App.methods.validateScannedQr.call(state, "opaque-code");
    App.methods.resetScanBatch.call(state);
    state.scanActiveExam = { id: 9 };
    resolveValidation({ studentId: 51, studentName: "Ana", versionLabel: "B" });
    await validation;

    expect(atribuicoesApi.validarQr).toHaveBeenCalledWith(8, "opaque-code");
    expect(state.scanQrBatch).toEqual([]);
    expect(state.scanQrLoading).toBe(false);
  });
});

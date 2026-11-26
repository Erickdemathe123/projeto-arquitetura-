import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.vue";
import { atribuicoesApi, resultadosApi } from "../src/services/api";

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

  // Regressão: com duas folhas no lote, a nota da segunda ia para o aluno da
  // primeira, porque o envio usava a primeira folha identificada da lista.
  it("envia a correção com o QR da folha em conferência, não com a primeira do lote", async () => {
    const respostasHenrique = [{ status: "marked", markedIndex: 1 }];
    const respostasCristiano = [{ status: "marked", markedIndex: 3 }];
    vi.spyOn(atribuicoesApi, "validarQr").mockImplementation(async (examId, qrCode) => (qrCode === "qr-henrique"
      ? { studentId: 52, studentName: "Henrique", versionLabel: "B" }
      : { studentId: 51, studentName: "Cristiano", versionLabel: "A" }));
    const corrigir = vi.spyOn(resultadosApi, "corrigirAutomaticamente").mockResolvedValue({ studentName: "ok" });
    vi.spyOn(resultadosApi, "listar").mockResolvedValue({ resultados: [] });
    const state = {
      scanActiveExam: { id: 8 },
      scanQrBatch: [],
      scanQrBatchId: 0,
      scanQrLoading: false,
      scanQrError: "",
      scanQrFeedback: "",
      scanConference: null,
      scanSummaries: {},
      scanForm: { ra: "", score: "", answers: "", version: "", detectedAnswers: [] },
      error: "",
      notify: vi.fn()
    };

    await App.methods.validateScannedQr.call(state, { qrCode: "qr-henrique", answers: respostasHenrique });
    await App.methods.submitScanResult.call(state);
    await App.methods.validateScannedQr.call(state, { qrCode: "qr-cristiano", answers: respostasCristiano });
    await App.methods.submitScanResult.call(state);

    expect(corrigir.mock.calls).toEqual([
      [8, { qrCode: "qr-henrique", respostas: respostasHenrique }],
      [8, { qrCode: "qr-cristiano", respostas: respostasCristiano }]
    ]);
    expect(state.scanConference).toBeNull();
  });
});

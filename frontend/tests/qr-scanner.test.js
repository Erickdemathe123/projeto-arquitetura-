import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const { decodeQr } = vi.hoisted(() => ({ decodeQr: vi.fn() }));

import QrScanner from "../src/components/QrScanner.vue";
import ScanScreen from "../src/components/ScanScreen.vue";

vi.mock("jsqr", () => ({ default: (...args) => decodeQr(...args) }));

let mediaDevicesDescriptor;

beforeEach(() => {
  mediaDevicesDescriptor = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  decodeQr.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (mediaDevicesDescriptor) {
    Object.defineProperty(navigator, "mediaDevices", mediaDevicesDescriptor);
  } else {
    delete navigator.mediaDevices;
  }
});

function definirMediaDevices(mediaDevices) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: mediaDevices
  });
}

describe("QrScanner", () => {
  it("explica quando o dispositivo não oferece uma câmera", async () => {
    definirMediaDevices(undefined);
    const wrapper = mount(QrScanner);

    await wrapper.find("button").trigger("click");

    expect(wrapper.find('[role="alert"]').text()).toContain("não oferece acesso à câmera");
    expect(wrapper.emitted("detected")).toBeUndefined();
    wrapper.unmount();
  });

  it("explica quando nenhuma câmera é encontrada", async () => {
    const erro = Object.assign(new Error("missing"), { name: "NotFoundError" });
    definirMediaDevices({ getUserMedia: vi.fn().mockRejectedValue(erro) });
    const wrapper = mount(QrScanner);

    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toContain("Nenhuma câmera foi encontrada");
    wrapper.unmount();
  });

  it("orienta a pessoa quando a permissão da câmera é negada", async () => {
    const erro = Object.assign(new Error("blocked"), { name: "NotAllowedError" });
    definirMediaDevices({ getUserMedia: vi.fn().mockRejectedValue(erro) });
    const wrapper = mount(QrScanner);

    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toContain("Permissão para usar a câmera negada");
    wrapper.unmount();
  });

  it("lê o QR continuamente, emite o conteúdo e encerra o stream após a leitura", async () => {
    const stopTrack = vi.fn();
    const stream = { getTracks: () => [{ stop: stopTrack }] };
    definirMediaDevices({ getUserMedia: vi.fn().mockResolvedValue(stream) });
    decodeQr.mockReturnValue({ data: "opaque-code" });

    let nextFrame;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      nextFrame = callback;
      return 23;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
      getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })
    });

    const wrapper = mount(QrScanner);
    await wrapper.find("button").trigger("click");
    await flushPromises();

    const video = wrapper.find("video").element;
    Object.defineProperties(video, {
      videoWidth: { configurable: true, value: 640 },
      videoHeight: { configurable: true, value: 480 }
    });
    nextFrame();
    await flushPromises();

    expect(wrapper.emitted("detected")).toEqual([["opaque-code"]]);
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain("Escanear próxima folha");
    wrapper.unmount();
  });

  it("encerra o stream quando a tela é desmontada antes da leitura", async () => {
    const stopTrack = vi.fn();
    const stream = { getTracks: () => [{ stop: stopTrack }] };
    definirMediaDevices({ getUserMedia: vi.fn().mockResolvedValue(stream) });
    decodeQr.mockReturnValue(null);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 23);
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();

    const wrapper = mount(QrScanner);
    await wrapper.find("button").trigger("click");
    await flushPromises();
    wrapper.unmount();

    expect(stopTrack).toHaveBeenCalledOnce();
    expect(cancelFrame).toHaveBeenCalledWith(23);
  });
});

describe("ScanScreen QR batch", () => {
  it("mostra as folhas validadas e encaminha cada leitura para a tela controladora", async () => {
    const wrapper = mount(ScanScreen, {
      props: {
        step: "form",
        exams: [],
        summaries: {},
        activeExam: { id: 8, name: "Prova 1", applicationClassId: 3 },
        form: { ra: "", score: "" },
        turmas: [{ id: 3, name: "Turma A" }],
        qrBatch: [{ studentId: 51, studentName: "Ana", versionLabel: "B" }]
      }
    });

    expect(wrapper.text()).toContain("Ana");
    expect(wrapper.text()).toContain("Versão B");
    wrapper.findComponent(QrScanner).vm.$emit("detected", "opaque-code");
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("qr-detected")).toEqual([["opaque-code"]]);
    wrapper.unmount();
  });
});

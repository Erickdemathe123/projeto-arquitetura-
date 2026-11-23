import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

const apiMocks = vi.hoisted(() => ({
  criar: vi.fn(),
  editar: vi.fn(),
  listarVersoes: vi.fn(),
  gerarVersoes: vi.fn(),
  listarResultados: vi.fn()
}));

vi.mock("../src/services/api", () => ({
  authApi: { me: vi.fn(), logout: vi.fn() },
  questoesApi: { listar: vi.fn(), criar: vi.fn(), editar: vi.fn(), remover: vi.fn() },
  turmasApi: { listar: vi.fn(), listarAlunos: vi.fn() },
  avaliacoesApi: {
    listar: vi.fn(),
    criar: apiMocks.criar,
    editar: apiMocks.editar,
    listarVersoes: apiMocks.listarVersoes,
    gerarVersoes: apiMocks.gerarVersoes
  },
  resultadosApi: { listar: apiMocks.listarResultados },
  atribuicoesApi: { listar: vi.fn() },
  isAuthenticated: () => false
}));

import App from "../src/App.vue";

const pergunta = {
  id: 11,
  text: "Quanto é 2 + 2?",
  subject: "Matemática",
  alternatives: ["2", "3", "4", "5", "6"],
  correctAlternative: 2
};

function montarApp() {
  const wrapper = mount(App, {
    global: {
      stubs: [
        "AuthScreen", "StudentPortal", "AppSidebar", "AppTopbar", "DashboardScreen",
        "ClassesScreen", "QuestionsScreen", "QuestionForm", "ExamsScreen", "ExamForm",
        "ExamPreview", "StatisticsScreen", "ScanScreen", "StandaloneSheetScreen",
        "AppDialog", "ThemeToggle"
      ]
    }
  });
  wrapper.vm.questions = [pergunta];
  wrapper.vm.examForm = {
    name: "Prova de matemática",
    selected: [11],
    points: { 11: 1 },
    institution: "",
    course: "",
    subject: "Matemática",
    professor: "Teste",
    className: "",
    date: "",
    instructions: "",
    logo: "",
    layout: "Uma coluna",
    shuffleQuestions: true,
    shuffleAlternatives: true,
    versions: 3,
    addBlankPage: true
  };
  return wrapper;
}

describe("geração automática de versões", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiMocks.criar.mockReset();
    apiMocks.editar.mockReset();
    apiMocks.listarVersoes.mockReset().mockResolvedValue([]);
    apiMocks.gerarVersoes.mockReset().mockResolvedValue([]);
    apiMocks.listarResultados.mockReset().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("gera a quantidade escolhida depois de criar a avaliação", async () => {
    apiMocks.criar.mockResolvedValue({ id: 42, name: "Prova de matemática", versions: 3 });
    const wrapper = montarApp();

    await wrapper.vm.saveExam();

    expect(apiMocks.criar).toHaveBeenCalledWith(expect.objectContaining({ versions: 3 }));
    expect(apiMocks.gerarVersoes).toHaveBeenCalledWith(42, 3);
    expect(wrapper.vm.exams).toHaveLength(1);
    expect(wrapper.vm.toast).toBe("Avaliação criada com 3 versões geradas.");
    wrapper.unmount();
  });

  it("gera versões ao salvar uma avaliação antiga que ainda não as possui", async () => {
    const exam = {
      id: 42,
      name: "Prova de matemática",
      versions: 3,
      questionIds: [11],
      questionSnapshots: [pergunta],
      shuffleQuestions: true,
      shuffleAlternatives: true
    };
    apiMocks.editar.mockResolvedValue(exam);
    const wrapper = montarApp();
    wrapper.vm.exams = [exam];
    wrapper.vm.editingExamId = exam.id;

    await wrapper.vm.saveExam();

    expect(apiMocks.listarVersoes).toHaveBeenCalledWith(42);
    expect(apiMocks.editar).toHaveBeenCalledWith(42, expect.objectContaining({ versions: 3 }));
    expect(apiMocks.gerarVersoes).toHaveBeenCalledWith(42, 3);
    expect(wrapper.vm.toast).toBe("Avaliação atualizada com 3 versões geradas.");
    wrapper.unmount();
  });

  it("permite tentar novamente sem criar uma avaliação duplicada se a geração falhar", async () => {
    apiMocks.criar.mockResolvedValue({ id: 42, name: "Prova de matemática", versions: 3 });
    apiMocks.editar.mockResolvedValue({ id: 42, name: "Prova de matemática", versions: 3 });
    apiMocks.gerarVersoes
      .mockRejectedValueOnce(new Error("API indisponível"))
      .mockResolvedValueOnce([]);
    const wrapper = montarApp();

    await wrapper.vm.saveExam();

    expect(wrapper.vm.exams).toHaveLength(1);
    expect(wrapper.vm.editingExamId).toBe(42);
    expect(wrapper.vm.pendingVersionGenerationId).toBe(42);
    expect(wrapper.vm.examForm.selected).toEqual([11]);
    expect(wrapper.vm.error).toContain("A avaliação foi salva, mas as versões não foram geradas");

    await wrapper.vm.saveExam();

    expect(wrapper.vm.error).toBe("");
    expect(apiMocks.criar).toHaveBeenCalledTimes(1);
    expect(apiMocks.editar).toHaveBeenCalledTimes(1);
    expect(apiMocks.gerarVersoes).toHaveBeenCalledTimes(2);
    expect(wrapper.vm.exams).toHaveLength(1);
    expect(wrapper.vm.editingExamId).toBeNull();
    wrapper.unmount();
  });
});

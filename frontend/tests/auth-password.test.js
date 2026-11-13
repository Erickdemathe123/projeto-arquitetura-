import { describe, expect, it, vi } from "vitest";
import App from "../src/App.vue";
import { authApi } from "../src/services/api";

function authContext(overrides = {}) {
  return {
    mode: "register",
    name: "Ana",
    email: "ana@example.com",
    password: "",
    confirmation: "",
    error: "",
    message: "",
    loadingAuth: false,
    currentUser: null,
    loadWorkspace: vi.fn(),
    ...overrides
  };
}

describe("política de senha na interface", () => {
  it("rejeita cadastro com sete caracteres e mantém o mínimo de oito", async () => {
    const context = authContext({ password: "1234567", confirmation: "1234567" });
    const cadastro = vi.spyOn(authApi, "cadastro");

    await App.methods.submitAuth.call(context);

    expect(context.error).toBe("A senha deve ter pelo menos 8 caracteres.");
    expect(cadastro).not.toHaveBeenCalled();
    cadastro.mockRestore();
  });

  it("permite que contas antigas com seis caracteres façam login", async () => {
    const login = vi.spyOn(authApi, "login").mockResolvedValue({
      usuario: { name: "Ana", email: "ana@example.com" },
      token: "token"
    });
    const context = authContext({ mode: "login", password: "123456" });

    await App.methods.submitAuth.call(context);

    expect(login).toHaveBeenCalledWith({ email: "ana@example.com", senha: "123456" });
    expect(context.error).toBe("");
    login.mockRestore();
  });
});

// Modo noturno: guarda a escolha do usuário no navegador e aplica no <html>.
// Sem escolha salva, segue o tema do sistema operacional.

export const THEME_KEY = "sgp_theme";

export function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Navegação privada ou armazenamento bloqueado: usa o tema do sistema
  }
  const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function applyTheme(theme, { save = true } = {}) {
  document.documentElement.dataset.theme = theme;
  if (!save) return;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Sem armazenamento: o tema vale só até recarregar a página
  }
}

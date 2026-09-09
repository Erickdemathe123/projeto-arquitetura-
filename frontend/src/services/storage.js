const storageKey = (email) => `sgp:${email.toLowerCase()}`;

export function createEmptyWorkspace(name, password) {
  return { name, password, questions: [], exams: [], turmas: [] };
}

export function loadWorkspace(email) {
  const saved = localStorage.getItem(storageKey(email));
  return saved ? JSON.parse(saved) : null;
}

export function saveWorkspace(email, workspace) {
  localStorage.setItem(storageKey(email), JSON.stringify(workspace));
}

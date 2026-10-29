// Serviço de comunicação HTTP com o back-end do SGP (REST API + JWT)

const TOKEN_KEY = 'sgp_auth_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    removeToken();
  }
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? { message: text } : {};
  }

  if (!response.ok) {
    const mensagem = data?.erro || data?.message || `Erro HTTP ${response.status}`;
    const erro = new Error(mensagem);
    erro.status = response.status;
    erro.data = data;
    throw erro;
  }

  return data;
}

export const authApi = {
  async cadastro({ nome, email, senha, role = 'professor', ra }) {
    const resultado = await request('/auth/cadastro', {
      method: 'POST',
      body: JSON.stringify({ nome, email, senha, role, ra })
    });
    if (resultado.token) {
      setToken(resultado.token);
    }
    return resultado;
  },

  async login({ email, senha }) {
    const resultado = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha })
    });
    if (resultado.token) {
      setToken(resultado.token);
    }
    return resultado;
  },

  async me() {
    return request('/auth/me', { method: 'GET' });
  },

  logout() {
    removeToken();
  }
};

export const questoesApi = {
  async listar() {
    try {
      return await request('/questoes', { method: 'GET' });
    } catch (erro) {
      // Caso a T12 ainda não esteja no servidor, retorna null para o front usar o fallback
      if (erro.status === 404) return null;
      throw erro;
    }
  },

  async criar(questao) {
    try {
      return await request('/questoes', {
        method: 'POST',
        body: JSON.stringify(questao)
      });
    } catch (erro) {
      if (erro.status === 404) return null;
      throw erro;
    }
  },

  async editar(id, questao) {
    try {
      return await request(`/questoes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(questao)
      });
    } catch (erro) {
      if (erro.status === 404) return null;
      throw erro;
    }
  },

  async remover(id) {
    try {
      return await request(`/questoes/${id}`, { method: 'DELETE' });
    } catch (erro) {
      if (erro.status === 404) return null;
      throw erro;
    }
  }
};

export const turmasApi = {
  listar(arquivadas = false) {
    return request(`/turmas${arquivadas ? '?arquivadas=true' : ''}`, { method: 'GET' });
  },

  criar({ nome, descricao }) {
    return request('/turmas', {
      method: 'POST',
      body: JSON.stringify({ nome, descricao })
    });
  },

  editar(id, { nome, descricao }) {
    return request(`/turmas/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nome, descricao })
    });
  },

  arquivar(id, arquivada = true) {
    return request(`/turmas/${id}/arquivar`, {
      method: 'PATCH',
      body: JSON.stringify({ arquivada })
    });
  },

  listarAlunos(id) {
    return request(`/turmas/${id}/alunos`, { method: 'GET' });
  },

  matricular(id, { nome, ra }) {
    return request(`/turmas/${id}/alunos`, {
      method: 'POST',
      body: JSON.stringify({ nome, ra })
    });
  },

  removerAluno(id, alunoId) {
    return request(`/turmas/${id}/alunos/${alunoId}`, { method: 'DELETE' });
  },

  // Envia o conteúdo do arquivo CSV como texto puro (RF05)
  importarCsv(id, conteudoCsv) {
    return request(`/turmas/${id}/alunos/importar`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: conteudoCsv
    });
  }
};export default {
  getToken,
  setToken,
  removeToken,
  isAuthenticated,
  auth: authApi,
  questoes: questoesApi
};

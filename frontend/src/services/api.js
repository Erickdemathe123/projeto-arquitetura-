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

// Baixa um arquivo binário autenticado (ex.: caderno .docx) e devolve o Blob e o nome
async function download(endpoint) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`/api${endpoint}`, { headers });
  if (!response.ok) {
    let mensagem = `Erro HTTP ${response.status}`;
    try {
      const data = await response.json();
      mensagem = data?.erro || data?.message || mensagem;
    } catch {
      // resposta sem JSON: mantém a mensagem padrão
    }
    const erro = new Error(mensagem);
    erro.status = response.status;
    throw erro;
  }
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return { blob: await response.blob(), filename: match ? match[1] : 'arquivo' };
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
  listar: () => request('/questoes', { method: 'GET' }),
  criar: (questao) => request('/questoes', {
    method: 'POST',
    body: JSON.stringify(questao)
  }),
  editar: (id, questao) => request(`/questoes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(questao)
  }),
  remover: (id) => request(`/questoes/${id}`, { method: 'DELETE' })
};

export const avaliacoesApi = {
  listar: () => request('/avaliacoes', { method: 'GET' }),
  criar: (avaliacao) => request('/avaliacoes', {
    method: 'POST',
    body: JSON.stringify(avaliacao)
  }),
  editar: (id, avaliacao) => request(`/avaliacoes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(avaliacao)
  }),
  liberarGabarito: (id, released) => request(`/avaliacoes/${id}/gabarito`, {
    method: 'PATCH',
    body: JSON.stringify({ released })
  }),
  remover: (id) => request(`/avaliacoes/${id}`, { method: 'DELETE' }),
  listarVersoes: (id) => request(`/avaliacoes/${id}/versoes`, { method: 'GET' }),
  gerarVersoes: (id, versions) => request(`/avaliacoes/${id}/versoes`, {
    method: 'POST',
    body: JSON.stringify({ versions })
  }),
  // Caderno editável em .docx (T55); sem versao, traz todas as versões
  baixarCadernoDocx: (id, versao) => download(`/avaliacoes/${id}/caderno/docx${versao ? `?versao=${encodeURIComponent(versao)}` : ''}`),
  baixarPdf: (id, versao, alunoId) => {
    const params = new URLSearchParams();
    if (versao) params.set("versao", versao);
    if (alunoId) params.set("alunoId", alunoId);
    const query = params.toString();
    return download(`/avaliacoes/${id}/pdf${query ? `?${query}` : ""}`);
  },
  criarAvulsa: (avaliacao) => request('/avaliacoes/avulsa', {
    method: 'POST',
    body: JSON.stringify(avaliacao)
  }),
  consultarCodigo: (code, ra) => request(
    `/avaliacoes/codigo/${encodeURIComponent(code)}${ra ? `?ra=${encodeURIComponent(ra)}` : ''}`,
    { method: 'GET' }
  )
};

export const resultadosApi = {
  listar: (avaliacaoId) => request(`/avaliacoes/${avaliacaoId}/resultados`, { method: 'GET' }),
    estatisticas: (avaliacaoId) => request(`/avaliacoes/${avaliacaoId}/estatisticas`, { method: 'GET' }),
    baixarExcel: (avaliacaoId) => download(`/avaliacoes/${avaliacaoId}/resultados/excel`),

  registrar: (avaliacaoId, { ra, score }) => request(`/avaliacoes/${avaliacaoId}/resultados`, {
    method: 'POST',
    body: JSON.stringify({ ra, score })
  }),

  corrigirAutomaticamente: (avaliacaoId, dados) => request(`/avaliacoes/${avaliacaoId}/correcoes`, {
    method: 'POST',
    body: JSON.stringify(dados)
  }),

  remover: (avaliacaoId, alunoId) => request(`/avaliacoes/${avaliacaoId}/resultados/${alunoId}`, { method: 'DELETE' })
};

export const atribuicoesApi = {
  listar: (avaliacaoId) => request(`/avaliacoes/${avaliacaoId}/atribuicoes`, { method: 'GET' }),
  gerar: (avaliacaoId) => request(`/avaliacoes/${avaliacaoId}/atribuicoes`, { method: 'POST' }),
  validarQr: (avaliacaoId, qrCode) => request(`/avaliacoes/${avaliacaoId}/atribuicoes/validar-qr`, {
    method: 'POST',
    body: JSON.stringify({ qrCode })
  })
};

export const configuracoesApi = {
  obterFolhaRespostas: () => request('/configuracoes/folha-respostas', { method: 'GET' }),
  salvarFolhaRespostas: (configuracao) => request('/configuracoes/folha-respostas', {
    method: 'PUT',
    body: JSON.stringify(configuracao)
  })
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
  },

  // Envia a planilha .xlsx em binário (RF05); as validações são as mesmas do CSV
  importarPlanilha(id, arquivoBinario) {
    return request(`/turmas/${id}/alunos/importar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      body: arquivoBinario
    });
  }
};
  
export default {
  getToken,
  setToken,
  removeToken,
  isAuthenticated,
  auth: authApi,
  questoes: questoesApi,
  turmas: turmasApi,
  avaliacoes: avaliacoesApi,
  resultados: resultadosApi,
  atribuicoes: atribuicoesApi
};

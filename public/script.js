const { createApp } = Vue;
const storageKey = (email) => `sgp:${email.toLowerCase()}`;

createApp({
  data() {
    return {
      screen: "login",
      mode: "login",
      name: "",
      email: "",
      password: "",
      confirmation: "",
      showPassword: false,
      error: "",
      message: "",
      toast: "",
      questions: [],
      exams: [],
      editingQuestionId: null,
      questionForm: { text: "", subject: "", topic: "", type: "Múltipla escolha", alternatives: ["", "", "", "", ""], correctAlternative: 0 },
      examForm: { name: "", selected: [] }
    };
  },
  computed: {
    currentTitle() {
      return { dashboard: "Início", questions: "Banco de Questões", newQuestion: "Nova Questão", exams: "Minhas Avaliações", newExam: "Montar Prova", scan: "Corrigir Provas" }[this.screen];
    }
  },
  methods: {
    switchMode() {
      this.mode = this.mode === "login" ? "register" : "login";
      this.error = "";
      this.message = "";
    },
    submitAuth() {
      this.error = "";
      this.message = "";
      if (this.mode === "register" && !this.name.trim()) return (this.error = "Informe seu nome completo.");
      if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) return (this.error = "Digite um e-mail válido.");
      if (this.password.length < 6) return (this.error = "A senha deve ter pelo menos 6 caracteres.");
      if (this.mode === "register" && this.password !== this.confirmation) return (this.error = "As senhas não coincidem.");
      const key = storageKey(this.email);
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (this.mode === "register") {
        if (saved) return (this.error = "Já existe uma conta para este e-mail.");
        localStorage.setItem(key, JSON.stringify({ name: this.name, password: this.password, questions: [], exams: [] }));
        this.message = "Conta criada com sucesso!";
      } else {
        if (saved && saved.password !== this.password) return (this.error = "E-mail ou senha inválidos.");
        if (!saved) localStorage.setItem(key, JSON.stringify({ name: this.email.split("@")[0], password: this.password, questions: [], exams: [] }));
        this.message = "Login realizado com sucesso.";
      }
      this.loadWorkspace();
    },
    loadWorkspace() {
      const saved = JSON.parse(localStorage.getItem(storageKey(this.email)) || "{}");
      this.name = saved.name || this.name || this.email.split("@")[0];
      this.questions = saved.questions || [];
      this.exams = saved.exams || [];
      this.screen = "dashboard";
    },
    persist() {
      const saved = JSON.parse(localStorage.getItem(storageKey(this.email)) || "{}");
      localStorage.setItem(storageKey(this.email), JSON.stringify({ ...saved, name: this.name, password: saved.password || this.password, questions: this.questions, exams: this.exams }));
    },
    navigate(screen) {
      this.screen = screen;
      this.error = "";
    },
    logout() {
      this.screen = "login";
      this.mode = "login";
      this.password = "";
      this.confirmation = "";
      this.message = "";
    },
    saveQuestion() {
      const form = this.questionForm;
      if (!form.text.trim() || !form.subject.trim() || !form.topic.trim()) return (this.error = "Preencha o enunciado, a disciplina e o assunto.");
      if (form.alternatives.some((alternative) => !alternative.trim())) return (this.error = "Preencha todas as alternativas.");
      const wasEditing = Boolean(this.editingQuestionId);
      const question = { id: this.editingQuestionId || Date.now(), ...form, alternatives: [...form.alternatives] };
      if (this.editingQuestionId) {
        const questionIndex = this.questions.findIndex((item) => item.id === this.editingQuestionId);
        this.questions.splice(questionIndex, 1, question);
      } else {
        this.questions.push(question);
      }
      this.persist();
      this.questionForm = { text: "", subject: "", topic: "", type: "Múltipla escolha", alternatives: ["", "", "", "", ""], correctAlternative: 0 };
      this.editingQuestionId = null;
      this.notify(wasEditing ? "Questão atualizada com sucesso." : "Questão cadastrada com sucesso.");
      this.navigate("questions");
    },
    editQuestion(question) {
      this.editingQuestionId = question.id;
      this.questionForm = {
        text: question.text,
        subject: question.subject,
        topic: question.topic,
        type: "Múltipla escolha",
        alternatives: [...question.alternatives],
        correctAlternative: question.correctAlternative || 0
      };
      this.navigate("newQuestion");
    },
    removeQuestion(question) {
      this.questions = this.questions.filter((item) => item.id !== question.id);
      this.exams = this.exams.map((exam) => ({ ...exam, questionIds: exam.questionIds.filter((id) => id !== question.id) }));
      this.persist();
      this.notify("Questão removida.");
    },
    addAlternative() {
      if (this.questionForm.alternatives.length >= 10) return;
      this.questionForm.alternatives.push("");
    },
    removeAlternative() {
      if (this.questionForm.alternatives.length <= 2) return;
      const removedIndex = this.questionForm.alternatives.length - 1;
      this.questionForm.alternatives.pop();
      if (this.questionForm.correctAlternative === removedIndex) {
        this.questionForm.correctAlternative = 0;
      }
    },
    saveExam() {
      if (!this.examForm.name.trim()) return (this.error = "Informe o nome da avaliação.");
      if (!this.examForm.selected.length) return (this.error = "Selecione ao menos uma questão.");
      this.exams.push({ id: Date.now(), name: this.examForm.name, questionIds: [...this.examForm.selected], date: new Date().toLocaleDateString("pt-BR") });
      this.persist();
      this.examForm = { name: "", selected: [] };
      this.notify("Avaliação criada com sucesso.");
      this.navigate("exams");
    },
    notify(text) {
      this.toast = text;
      window.clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => { this.toast = ""; }, 3000);
    }
  },
  template: `
    <main v-if="screen === 'login' || screen === 'register'" class="auth-page">
      <section class="auth-art"><div class="brand"><span class="brand-mark">SGP</span><span>Sistema de Geração de Provas</span></div><div class="art-copy"><span class="eyebrow">EDUCAÇÃO MAIS INTELIGENTE</span><h2>Crie. Organize.<br><strong>Avalie.</strong></h2><p>Uma plataforma feita para simplificar a rotina de professores de Direito.</p></div><svg class="auth-illustration" viewBox="0 0 500 330" aria-hidden="true"><circle cx="250" cy="160" r="130" fill="#dcf3ed"/><path d="M95 280h320" stroke="#17394e" stroke-width="3"/><rect x="125" y="170" width="55" height="110" rx="8" fill="#8bb1e9" stroke="#17394e" stroke-width="3"/><rect x="180" y="130" width="52" height="150" rx="8" fill="#83d2b6" stroke="#17394e" stroke-width="3"/><path d="M213 105c0-35 26-62 58-62s58 27 58 62l-12 42H225Z" fill="#ffda69" stroke="#17394e" stroke-width="3"/><path d="m270 185 55-64 26 26 50-59 22 20-66 83-30-28-37 47Z" fill="#6592df"/><path d="M230 204c38 0 63 16 84 35v41c-28-12-57-12-84 0ZM314 239c26-20 53-29 79-29v70c-27-1-52 8-79 19Z" fill="#fff" stroke="#17394e" stroke-width="3"/></svg></section>
      <section class="auth-form"><div class="auth-card"><h1>{{ mode === "login" ? "Bem-vindo" : "Crie sua conta" }}</h1><p class="auth-subtitle">{{ mode === "login" ? "Entre para continuar sua jornada." : "Comece a criar provas de forma simples." }}</p><form novalidate @submit.prevent="submitAuth"><label v-if="mode === 'register'">Nome completo<input v-model="name" placeholder="Nome completo"></label><label>E-mail<input v-model="email" type="email" placeholder="E-mail"></label><label>Senha<span class="password-field"><input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Senha"><button type="button" @click="showPassword = !showPassword">{{ showPassword ? "◉" : "◌" }}</button></span></label><label v-if="mode === 'register'">Confirmar senha<input v-model="confirmation" type="password" placeholder="Confirmar senha"></label><p v-if="error" class="auth-error" role="alert">{{ error }}</p><p v-if="message" class="auth-message" role="status">{{ message }}</p><button class="primary-button" type="submit">{{ mode === "login" ? "Entrar" : "Cadastrar" }}</button></form><button class="text-button" @click="switchMode">{{ mode === "login" ? "Ainda não tenho uma conta" : "Já possuo uma conta" }} <strong>{{ mode === "login" ? "Criar conta" : "Entrar" }}</strong></button></div></section>
    </main>
    <div v-else class="app-shell">
      <aside class="sidebar"><div class="side-brand"><span class="brand-mark">SGP</span><span>SGP</span></div><nav><button :class="{active: screen === 'dashboard'}" @click="navigate('dashboard')">⌂ <span>Início</span></button><button :class="{active: screen === 'questions' || screen === 'newQuestion'}" @click="navigate('questions')">▤ <span>Banco de Questões</span></button><button :class="{active: screen === 'exams' || screen === 'newExam'}" @click="navigate('exams')">▣ <span>Minhas Avaliações</span></button><button :class="{active: screen === 'scan'}" @click="navigate('scan')">⌗ <span>Corrigir Provas</span></button></nav><button class="logout" @click="logout">↪ <span>Sair</span></button></aside>
      <main class="main-content"><header class="topbar"><div><span class="muted">SGP / </span>{{ currentTitle }}</div><div class="profile"><span>{{ name.charAt(0).toUpperCase() }}</span><strong>{{ name }}</strong><button @click="logout">Sair</button></div></header><section class="content">
        <template v-if="screen === 'dashboard'"><div class="page-heading"><span class="eyebrow">VISÃO GERAL</span><h1>Olá, {{ name }}!</h1><p>Comece cadastrando suas questões para montar uma avaliação.</p></div><div class="quick-actions"><button @click="navigate('newQuestion')"><b>✎</b><strong>Criar Questão</strong><small>Cadastre sua primeira questão</small></button><button @click="navigate('newExam')"><b>▣</b><strong>Montar Prova</strong><small>Disponível após cadastrar questões</small></button><button @click="navigate('scan')"><b>⌗</b><strong>Corrigir Provas</strong><small>Correção pelo navegador</small></button></div><div class="empty-card"><span>▤</span><h2>Ainda não há avaliações</h2><p>Suas provas criadas aparecerão aqui.</p></div></template>
        <template v-if="screen === 'questions'"><div class="page-heading row"><div><h1>Banco de Questões</h1><p>{{ questions.length }} questão(ões) cadastrada(s).</p></div><button class="primary-button compact" @click="navigate('newQuestion')">＋ Nova questão</button></div><div v-if="!questions.length" class="empty-card"><span>✎</span><h2>Seu banco está vazio</h2><p>Cadastre questões de Direito para começar.</p><button class="primary-button compact" @click="navigate('newQuestion')">Cadastrar primeira questão</button></div><div v-else class="question-list"><article v-for="(question, index) in questions" :key="question.id" class="question-item"><span class="question-number">{{ index + 1 }}</span><div><strong>{{ question.text }}</strong><small>{{ question.subject }} · {{ question.topic }} · {{ question.type }}</small></div><div class="question-actions"><button class="edit-button" @click="editQuestion(question)" aria-label="Editar questão">✎</button><button class="remove-button" @click="removeQuestion(question)" aria-label="Remover questão">×</button></div></article></div></template>
        <template v-if="screen === 'newQuestion'"><div class="page-heading"><span class="eyebrow">BANCO DE QUESTÕES</span><h1>{{ editingQuestionId ? "Editar Questão" : "Nova Questão" }}</h1></div><form class="form-card" @submit.prevent="saveQuestion"><div class="form-grid"><label>Disciplina<input v-model="questionForm.subject" placeholder="Digite uma disciplina"></label><label>Assunto<input v-model="questionForm.topic" placeholder="Digite um assunto"></label></div><label>Texto da questão<textarea v-model="questionForm.text" placeholder="Digite o texto da questão"></textarea></label><div class="alternatives"><p class="field-title">Alternativas <span>Marque a resposta correta</span></p><label v-for="(alternative, index) in questionForm.alternatives" :key="index"><span>{{ String.fromCharCode(65 + index) }})</span><input v-model="questionForm.alternatives[index]" :placeholder="'Alternativa ' + String.fromCharCode(65 + index)"><input class="radio" type="radio" v-model="questionForm.correctAlternative" :value="index" :aria-label="'Alternativa correta ' + String.fromCharCode(65 + index)"></label><div class="alternative-actions"><button type="button" class="item-button" @click="addAlternative">＋ Adicionar alternativa</button><button type="button" class="item-button" @click="removeAlternative" :disabled="questionForm.alternatives.length <= 2">− Remover última alternativa</button></div></div><p v-if="error" class="auth-error">{{ error }}</p><div class="form-actions"><button type="button" class="outline-button" @click="editingQuestionId = null; navigate('questions')">Cancelar</button><button class="primary-button compact">{{ editingQuestionId ? "Salvar alterações" : "Salvar questão" }}</button></div></form></template>
        <template v-if="screen === 'exams'"><div class="page-heading row"><div><span class="eyebrow">AVALIAÇÕES</span><h1>Minhas Avaliações</h1><p>{{ exams.length }} avaliação(ões) criada(s).</p></div><button class="primary-button compact" :disabled="!questions.length" @click="navigate('newExam')">＋ Nova avaliação</button></div><div v-if="!exams.length" class="empty-card"><span>▣</span><h2>Ainda não há avaliações</h2><p>Cadastre questões e monte sua primeira prova.</p></div><div v-else class="question-list"><article v-for="exam in exams" :key="exam.id" class="question-item"><span class="question-number">▣</span><div><strong>{{ exam.name }}</strong><small>{{ exam.questionIds.length }} questão(ões) · Criada em {{ exam.date }}</small></div></article></div></template>
        <template v-if="screen === 'newExam'"><div class="page-heading"><span class="eyebrow">AVALIAÇÕES</span><h1>Montar Prova</h1><p>Escolha as questões que farão parte da avaliação.</p></div><form class="form-card" @submit.prevent="saveExam"><label>Nome da avaliação<input v-model="examForm.name" placeholder="Ex.: Prova de Direito Constitucional"></label><div class="selection-list"><label v-for="question in questions" :key="question.id"><input type="checkbox" v-model="examForm.selected" :value="question.id"><span><strong>{{ question.text }}</strong><small>{{ question.subject }} · {{ question.topic }}</small></span></label></div><p v-if="error" class="auth-error">{{ error }}</p><div class="form-actions"><button type="button" class="outline-button" @click="navigate('exams')">Cancelar</button><button class="primary-button compact">Criar avaliação</button></div></form></template>
        <template v-if="screen === 'scan'"><div class="scan-page"><span class="eyebrow">CORREÇÃO INTELIGENTE</span><h1>Corrigir Provas</h1><p>Esta tela está pronta para integrar a leitura do QR Code na próxima etapa.</p><div class="camera-mock"><div class="scan-frame">⌗</div><span>Nenhuma prova escaneada</span></div></div></template>
      </section></main><div v-if="toast" class="toast">{{ toast }}</div>
    </div>
  `
}).mount("#app");

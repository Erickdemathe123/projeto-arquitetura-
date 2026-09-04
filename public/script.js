const { createApp } = Vue;

createApp({
  data() {
    return {
      mode: "login",
      name: "",
      email: "",
      password: "",
      confirmation: "",
      showPassword: false,
      error: "",
      message: ""
    };
  },
  methods: {
    switchMode() {
      this.mode = this.mode === "login" ? "register" : "login";
      this.error = "";
      this.message = "";
    },
    submit() {
      this.error = "";
      this.message = "";

      if (this.mode === "register" && !this.name.trim()) {
        this.error = "Informe seu nome completo.";
        return;
      }
      if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
        this.error = "Digite um e-mail válido.";
        return;
      }
      if (this.password.length < 6) {
        this.error = "A senha deve ter pelo menos 6 caracteres.";
        return;
      }
      if (this.mode === "register" && this.password !== this.confirmation) {
        this.error = "As senhas não coincidem.";
        return;
      }

      this.message = this.mode === "login"
        ? "Login realizado com dados de demonstração."
        : "Conta criada com sucesso! Os dados são apenas mockados.";
    }
  },
  template: `
    <main class="auth-page">
      <section class="auth-art" aria-label="Apresentação do SGP">
        <div class="brand"><span class="brand-mark">SGP</span><span>Sistema de Geração de Provas</span></div>
        <div class="art-copy">
          <span class="eyebrow">EDUCAÇÃO MAIS INTELIGENTE</span>
          <h2>Crie. Organize.<br><strong>Avalie.</strong></h2>
          <p>Uma plataforma feita para simplificar a rotina de professores de Direito.</p>
        </div>
        <svg class="auth-illustration" viewBox="0 0 500 330" aria-hidden="true">
          <circle cx="250" cy="160" r="130" fill="#dcf3ed"/>
          <path d="M95 280h320" stroke="#17394e" stroke-width="3"/>
          <rect x="125" y="170" width="55" height="110" rx="8" fill="#8bb1e9" stroke="#17394e" stroke-width="3"/>
          <rect x="180" y="130" width="52" height="150" rx="8" fill="#83d2b6" stroke="#17394e" stroke-width="3"/>
          <path d="M213 105c0-35 26-62 58-62s58 27 58 62l-12 42H225Z" fill="#ffda69" stroke="#17394e" stroke-width="3"/>
          <path d="M244 147h55v13c0 11-9 19-19 19h-17c-10 0-19-8-19-19Z" fill="#9db6e9" stroke="#17394e" stroke-width="3"/>
          <path d="m270 185 55-64 26 26 50-59 22 20-66 83-30-28-37 47Z" fill="#6592df"/>
          <path d="M230 204c38 0 63 16 84 35v41c-28-12-57-12-84 0ZM314 239c26-20 53-29 79-29v70c-27-1-52 8-79 19Z" fill="#fff" stroke="#17394e" stroke-width="3"/>
        </svg>
      </section>
      <section class="auth-form">
        <div class="auth-card">
          <h1>{{ mode === "login" ? "Bem-vindo" : "Crie sua conta" }}</h1>
          <p class="auth-subtitle">{{ mode === "login" ? "Entre para continuar sua jornada." : "Comece a criar provas de forma simples." }}</p>
          <form novalidate @submit.prevent="submit">
            <label v-if="mode === 'register'">Nome completo<input v-model="name" type="text" placeholder="Nome completo"></label>
            <label>E-mail<input v-model="email" type="email" placeholder="E-mail"></label>
            <label>Senha
              <span class="password-field">
                <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Senha">
                <button type="button" @click="showPassword = !showPassword" :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'">{{ showPassword ? "◉" : "◌" }}</button>
              </span>
            </label>
            <label v-if="mode === 'register'">Confirmar senha<input v-model="confirmation" type="password" placeholder="Confirmar senha"></label>
            <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
            <p v-if="message" class="auth-message" role="status">{{ message }}</p>
            <button class="primary-button" type="submit">{{ mode === "login" ? "Entrar" : "Cadastrar" }}</button>
          </form>
          <button class="text-button" type="button" @click="switchMode">{{ mode === "login" ? "Ainda não tenho uma conta" : "Já possuo uma conta" }} <strong>{{ mode === "login" ? "Criar conta" : "Entrar" }}</strong></button>
        </div>
      </section>
    </main>
  `
}).mount("#app");

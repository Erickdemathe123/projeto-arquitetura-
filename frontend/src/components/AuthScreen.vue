<script>
export default {
  props: {
    mode: { type: String, required: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    password: { type: String, default: "" },
    confirmation: { type: String, default: "" },
    error: { type: String, default: "" },
    message: { type: String, default: "" },
    loading: { type: Boolean, default: false }
  },
  emits: ["update:name", "update:email", "update:password", "update:confirmation", "submit", "switch-mode"],
  data() {
    return {
      showPassword: false
    };
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-art">
      <div class="brand"><span class="brand-mark">SGP</span><span>Sistema de Geração de Provas</span></div>
      <div class="art-copy"><span class="eyebrow">EDUCAÇÃO MAIS INTELIGENTE</span><h2>Crie. Organize.<br><strong>Avalie.</strong></h2><p>Uma plataforma feita para simplificar a criação, organização e geração de provas para professores.</p></div>
      <svg class="auth-illustration" viewBox="0 0 500 330" aria-hidden="true"><circle cx="250" cy="160" r="130" fill="#dcf3ed"/><path d="M95 280h320" stroke="#17394e" stroke-width="3"/><rect x="125" y="170" width="55" height="110" rx="8" fill="#8bb1e9" stroke="#17394e" stroke-width="3"/><rect x="180" y="130" width="52" height="150" rx="8" fill="#83d2b6" stroke="#17394e" stroke-width="3"/><path d="M213 105c0-35 26-62 58-62s58 27 58 62l-12 42H225Z" fill="#ffda69" stroke="#17394e" stroke-width="3"/><path d="m270 185 55-64 26 26 50-59 22 20-66 83-30-28-37 47Z" fill="#6592df"/><path d="M230 204c38 0 63 16 84 35v41c-28-12-57-12-84 0ZM314 239c26-20 53-29 79-29v70c-27-1-52 8-79 19Z" fill="#fff" stroke="#17394e" stroke-width="3"/></svg>
    </section>
    <section class="auth-form">
      <div class="auth-card">
        <h1>{{ mode === "login" ? "Bem-vindo" : "Crie sua conta" }}</h1>
        <p class="auth-subtitle">{{ mode === "login" ? "Entre para continuar sua jornada." : "Comece a criar provas de forma simples." }}</p>
        <form novalidate @submit.prevent="$emit('submit')">
          <label v-if="mode === 'register'">Nome completo<input :value="name" @input="$emit('update:name', $event.target.value)" placeholder="Nome completo"></label>
          <label>E-mail<input :value="email" @input="$emit('update:email', $event.target.value)" type="email" placeholder="E-mail"></label>
          <label>Senha<span class="password-field"><input :value="password" @input="$emit('update:password', $event.target.value)" :type="showPassword ? 'text' : 'password'" placeholder="Senha"><button type="button" @click="showPassword = !showPassword" :title="showPassword ? 'Ocultar senha' : 'Mostrar senha'">{{ showPassword ? "◉" : "◌" }}</button></span></label>
          <label v-if="mode === 'register'">Confirmar senha<input :value="confirmation" @input="$emit('update:confirmation', $event.target.value)" type="password" placeholder="Confirmar senha"></label>
          <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
          <p v-if="message" class="auth-message" role="status">{{ message }}</p>
          <button class="primary-button" type="submit" :disabled="loading">{{ loading ? "Processando..." : (mode === "login" ? "Entrar" : "Cadastrar") }}</button>
        </form>
        <button class="text-button" @click="$emit('switch-mode')">{{ mode === "login" ? "Ainda não tenho uma conta" : "Já possuo uma conta" }} <strong>{{ mode === "login" ? "Criar conta" : "Entrar" }}</strong></button>
      </div>
    </section>
  </main>
</template>

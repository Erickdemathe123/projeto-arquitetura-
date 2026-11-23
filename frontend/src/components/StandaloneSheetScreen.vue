<script>
export default {
  props: {
    form: { type: Object, required: true },
    error: { type: String, default: "" }
  },
  emits: ["save", "cancel"],
  methods: {
    atualizarGabarito() {
      const count = Math.max(1, Math.min(20, Number(this.form.questionCount) || 1));
      this.form.questionCount = count;
      this.form.correctAnswers = Array.from({ length: count }, (_, index) => this.form.correctAnswers[index] || "A");
    }
  }
}
</script>

<template>
  <div class="page-heading">
    <span class="eyebrow">FOLHA AVULSA</span>
    <h1>Criar folha de respostas</h1>
  </div>
  <form class="form-card" @submit.prevent="$emit('save')">
    <div class="form-grid">
      <label>Nome da folha<input v-model="form.name" placeholder="Ex.: Simulado 1"></label>
      <label>Número de questões<input v-model.number="form.questionCount" type="number" min="1" max="20" @change="atualizarGabarito"></label>
    </div>
    <h2 class="form-section-title">Gabarito</h2>
    <div class="form-grid">
      <label v-for="(_, index) in form.correctAnswers" :key="index">
        Questão {{ index + 1 }}
        <select v-model="form.correctAnswers[index]">
          <option v-for="letter in ['A','B','C','D','E']" :key="letter" :value="letter">{{ letter }}</option>
        </select>
      </label>
    </div>
    <p v-if="error" class="auth-error">{{ error }}</p>
    <div class="form-actions">
      <button type="button" class="outline-button" @click="$emit('cancel')">Cancelar</button>
      <button class="primary-button compact">Criar folha avulsa</button>
    </div>
  </form>
</template>

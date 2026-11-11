<script>
export default {
  props: {
    form: { type: Object, required: true },
    editing: { type: Boolean, default: false },
    error: { type: String, default: "" }
  },
  emits: ["save", "cancel"],
  methods: {
    addAlternative() {
      if (this.form.alternatives.length >= 5) return;
      this.form.alternatives.push("");
    },
    removeAlternative() {
      if (this.form.alternatives.length <= 2) return;
      const removedIndex = this.form.alternatives.length - 1;
      this.form.alternatives.pop();
      if (this.form.correctAlternative === removedIndex) {
        this.form.correctAlternative = 0;
      }
    }
  }
}
</script>

<template>
  <div class="page-heading"><span class="eyebrow">BANCO DE QUESTÕES</span><h1>{{ editing ? "Editar Questão" : "Nova Questão" }}</h1></div>
  <form class="form-card" @submit.prevent="$emit('save')">
    <div class="form-grid">
      <label>Disciplina<input v-model="form.subject" placeholder="Digite uma disciplina"></label>
      <label>Assunto<input v-model="form.topic" placeholder="Digite um assunto"></label>
    </div>
    <label>Texto da questão<textarea v-model="form.text" placeholder="Digite o texto da questão"></textarea></label>
    <div class="alternatives">
      <p class="field-title">Alternativas <span>Marque a resposta correta</span></p>
      <label v-for="(alternative, index) in form.alternatives" :key="index"><span>{{ String.fromCharCode(65 + index) }})</span><input v-model="form.alternatives[index]" :placeholder="'Alternativa ' + String.fromCharCode(65 + index)"><input class="radio" type="radio" v-model="form.correctAlternative" :value="index" :aria-label="'Alternativa correta ' + String.fromCharCode(65 + index)"></label>
      <div class="alternative-actions">
        <button type="button" class="item-button" @click="addAlternative">＋ Adicionar alternativa</button>
        <button type="button" class="item-button" @click="removeAlternative" :disabled="form.alternatives.length <= 2">− Remover última alternativa</button>
      </div>
    </div>
    <p v-if="error" class="auth-error">{{ error }}</p>
    <div class="form-actions">
      <button type="button" class="outline-button" @click="$emit('cancel')">Cancelar</button>
      <button class="primary-button compact">{{ editing ? "Salvar alterações" : "Salvar questão" }}</button>
    </div>
  </form>
</template>

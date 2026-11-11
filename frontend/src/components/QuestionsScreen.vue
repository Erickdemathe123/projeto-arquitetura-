<script>
export default {
  props: {
    questions: { type: Array, required: true }
  },
  emits: ["new", "edit", "remove"],
  computed: {
    questionsCountLabel() {
      if (!this.questions.length) return "Nenhuma questão criada.";
      return `${this.questions.length} ${this.questions.length === 1 ? "questão cadastrada" : "questões cadastradas"}.`;
    }
  }
}
</script>

<template>
  <div class="page-heading row">
    <div><h1>Banco de Questões</h1><p>{{ questionsCountLabel }}</p></div>
    <button class="primary-button compact" @click="$emit('new')">＋ Nova questão</button>
  </div>
  <div v-if="!questions.length" class="empty-card"><span>✎</span><h2>Seu banco está vazio</h2><p>Cadastre a primeira questão para começar.</p><button class="primary-button compact" @click="$emit('new')">Cadastrar primeira questão</button></div>
  <div v-else class="question-list">
    <article v-for="(question, index) in questions" :key="question.id" class="question-item">
      <span class="question-number">{{ index + 1 }}</span>
      <div><strong>{{ question.text }}</strong><small>{{ question.subject }} · {{ question.topic }} · {{ question.type }}</small></div>
      <div class="question-actions">
        <button class="edit-button" @click="$emit('edit', question)" aria-label="Editar questão">✎</button>
        <button class="remove-button" @click="$emit('remove', question)" aria-label="Remover questão">×</button>
      </div>
    </article>
  </div>
</template>

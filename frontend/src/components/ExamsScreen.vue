<script>
import { examQuestionsCountLabel } from "../utils/exam";

export default {
  props: {
    exams: { type: Array, required: true },
    questions: { type: Array, required: true }
  },
  emits: ["new", "release", "preview", "statistics", "edit", "remove"],
  computed: {
    examsCountLabel() {
      if (!this.exams.length) return "Nenhuma avaliação criada.";
      return `${this.exams.length} ${this.exams.length === 1 ? "avaliação criada" : "avaliações criadas"}.`;
    }
  },
  methods: {
    examQuestionsCountLabel
  }
}
</script>

<template>
  <div class="page-heading row">
    <div><span class="eyebrow">AVALIAÇÕES</span><h1>Minhas Avaliações</h1><p>{{ examsCountLabel }}</p></div>
    <button class="primary-button compact" :disabled="!questions.length" @click="$emit('new')">＋ Nova avaliação</button>
  </div>
  <div v-if="!exams.length" class="empty-card"><span>▣</span><h2>Nenhuma avaliação criada</h2><p>Cadastre questões e monte sua primeira prova.</p></div>
  <div v-else class="question-list">
    <article v-for="exam in exams" :key="exam.id" class="question-item">
      <span class="question-number">▣</span>
      <div><strong>{{ exam.name }}</strong><small>{{ examQuestionsCountLabel(exam) }} · Código: {{ exam.publicCode }} · {{ exam.released === true ? "Gabarito liberado" : "Gabarito bloqueado" }}</small></div>
      <div class="question-actions">
        <button class="edit-button" @click="$emit('release', exam)" :aria-label="exam.released ? 'Gabarito liberado' : 'Liberar gabarito'" :title="exam.released ? 'Gabarito liberado' : 'Liberar gabarito'">{{ exam.released ? "🔓" : "🔒" }}</button>
        <button class="edit-button" @click="$emit('preview', exam)" aria-label="Pré-visualizar prova" title="Pré-visualizar prova">◉</button>
        <button class="edit-button" @click="$emit('statistics', exam)" aria-label="Ver estatísticas" title="Ver estatísticas">▥</button>
        <button class="edit-button" @click="$emit('edit', exam)" aria-label="Editar avaliação" title="Editar avaliação">✎</button>
        <button class="remove-button" @click="$emit('remove', exam)" aria-label="Remover avaliação" title="Remover avaliação">×</button>
      </div>
    </article>
  </div>
</template>

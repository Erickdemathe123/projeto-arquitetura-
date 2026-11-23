<script>
import { examQuestionsCountLabel, formatPoints } from "../utils/exam";

export default {
  props: {
    name: { type: String, default: "" },
    exams: { type: Array, required: true },
    questions: { type: Array, required: true }
  },
  emits: ["new-question", "new-exam", "open-classes", "open-scan", "release", "preview", "statistics", "edit", "remove"],
  computed: {
    questionsHint() {
      const total = this.questions.length;
      if (!total) return "Cadastre sua primeira questão";
      return `${total} ${total === 1 ? "questão" : "questões"} no banco`;
    },
    examHint() {
      return this.questions.length ? "Selecione questões e monte a prova" : "Disponível após cadastrar questões";
    }
  },
  methods: {
    examQuestionsCountLabel,
    formatPoints
  }
}
</script>

<template>
  <div class="page-heading"><span class="eyebrow">VISÃO GERAL</span><h1>Olá, {{ name }}!</h1></div>
  <div class="quick-actions">
    <button @click="$emit('new-question')"><b>✎</b><strong>Criar Questão</strong><small>{{ questionsHint }}</small></button>
    <button :disabled="!questions.length" @click="$emit('new-exam')"><b>▣</b><strong>Montar Prova</strong><small>{{ examHint }}</small></button>
    <button @click="$emit('open-classes')"><b>♙</b><strong>Minhas Turmas</strong><small>Organize seus alunos</small></button>
    <button @click="$emit('open-scan')"><b>⌗</b><strong>Corrigir Provas</strong><small>Correção pelo navegador</small></button>
  </div>
  <h2 v-if="exams.length" class="dashboard-section-title">Minhas provas:</h2>
  <div v-if="!exams.length" class="empty-card"><span>▤</span><h2>Ainda não há avaliações</h2><p>Suas provas criadas aparecerão aqui.</p></div>
  <div v-else class="question-list">
    <article v-for="exam in exams" :key="exam.id" class="question-item">
      <span class="question-number">▣</span>
      <div><strong>{{ exam.name }}</strong><small>{{ examQuestionsCountLabel(exam) }} · {{ formatPoints(exam.totalPoints) }} · Código: {{ exam.publicCode || "Código pendente" }} · {{ exam.released === true ? "Gabarito liberado" : "Gabarito bloqueado" }}</small></div>
      <div class="question-actions">
        <button class="edit-button" @click="$emit('release', exam)" :aria-label="exam.released === true ? 'Bloquear gabarito' : 'Liberar gabarito'" :title="exam.released === true ? 'Bloquear gabarito' : 'Liberar gabarito'">{{ exam.released === true ? "🔓" : "🔒" }}</button>
        <button class="edit-button" @click="$emit('preview', exam)" aria-label="Pré-visualizar prova" title="Pré-visualizar prova">◉</button>
        <button class="edit-button" @click="$emit('statistics', exam)" aria-label="Ver estatísticas" title="Ver estatísticas">▥</button>
        <button class="edit-button" @click="$emit('edit', exam)" aria-label="Editar avaliação" title="Editar avaliação">✎</button>
        <button class="remove-button" @click="$emit('remove', exam)" aria-label="Remover avaliação" title="Remover avaliação">×</button>
      </div>
    </article>
  </div>
</template>

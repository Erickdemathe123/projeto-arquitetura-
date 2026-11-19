<script>
import { filterQuestions, uniqueSorted } from "../utils/questionFilters";

export default {
  props: {
    questions: { type: Array, required: true }
  },
  emits: ["new", "edit", "remove"],
  data() {
    return {
      // Filtros do banco de questões (T59): texto livre, disciplina e assunto
      search: "",
      subject: "",
      topic: ""
    };
  },
  computed: {
    questionsCountLabel() {
      if (!this.questions.length) return "Nenhuma questão criada.";
      return `${this.questions.length} ${this.questions.length === 1 ? "questão cadastrada" : "questões cadastradas"}.`;
    },
    subjects() {
      return uniqueSorted(this.questions.map((question) => question.subject));
    },
    // Os assuntos acompanham a disciplina escolhida, para não oferecer combinações vazias
    topics() {
      const base = this.subject ? this.questions.filter((question) => question.subject === this.subject) : this.questions;
      return uniqueSorted(base.map((question) => question.topic));
    },
    filteredQuestions() {
      return filterQuestions(this.questions, { search: this.search, subject: this.subject, topic: this.topic });
    },
    hasFilters() {
      return Boolean(this.search.trim() || this.subject || this.topic);
    },
    resultLabel() {
      const total = this.filteredQuestions.length;
      return `${total} de ${this.questions.length} ${this.questions.length === 1 ? "questão" : "questões"}`;
    }
  },
  watch: {
    subject() {
      if (this.topic && !this.topics.includes(this.topic)) this.topic = "";
    }
  },
  methods: {
    clearFilters() {
      this.search = "";
      this.subject = "";
      this.topic = "";
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
  <template v-else>
    <div class="filter-bar" role="search">
      <label class="filter-search">Buscar<input v-model="search" type="search" placeholder="Texto do enunciado, disciplina ou assunto" aria-label="Buscar questões"></label>
      <label>Disciplina<select v-model="subject" aria-label="Filtrar por disciplina"><option value="">Todas</option><option v-for="item in subjects" :key="item" :value="item">{{ item }}</option></select></label>
      <label>Assunto<select v-model="topic" aria-label="Filtrar por assunto"><option value="">Todos</option><option v-for="item in topics" :key="item" :value="item">{{ item }}</option></select></label>
      <div class="filter-summary"><small>{{ resultLabel }}</small><button v-if="hasFilters" type="button" class="text-button clear-filters" @click="clearFilters">Limpar filtros</button></div>
    </div>
    <div v-if="!filteredQuestions.length" class="empty-card compact"><span>⌕</span><h2>Nenhuma questão encontrada</h2><p>Ajuste a busca ou limpe os filtros.</p></div>
    <div v-else class="question-list">
      <article v-for="(question, index) in filteredQuestions" :key="question.id" class="question-item">
        <span class="question-number">{{ index + 1 }}</span>
        <div><strong>{{ question.text }}</strong><small>{{ question.subject }} · {{ question.topic }} · {{ question.type }}</small></div>
        <div class="question-actions">
          <button class="edit-button" @click="$emit('edit', question)" aria-label="Editar questão">✎</button>
          <button class="remove-button" @click="$emit('remove', question)" aria-label="Remover questão">×</button>
        </div>
      </article>
    </div>
  </template>
</template>

<script>
import { dateKey, formatStoredDate, toIsoDate } from "../utils/date";

export default {
  props: {
    form: { type: Object, required: true },
    editingExamId: { type: Number, default: null },
    questions: { type: Array, required: true },
    subjects: { type: Array, required: true },
    classes: { type: Array, required: true },
    error: { type: String, default: "" }
  },
  emits: ["save", "cancel", "preview", "edit-question", "error"],
  data() {
    return {
      calendarOpen: false,
      calendarMonth: new Date().getMonth(),
      calendarYear: new Date().getFullYear()
    };
  },
  computed: {
    filteredQuestionsForExam() {
      if (!this.form.subject) return this.questions;
      return this.questions.filter((question) => question.subject === this.form.subject);
    },
    calendarMonthLabel() {
      return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(this.calendarYear, this.calendarMonth, 1));
    },
    selectedDateKey() {
      const date = toIsoDate(this.form.date);
      return date ? date.split("-").map(Number).join("-") : "";
    },
    todayDateKey() {
      const today = new Date();
      return dateKey(today);
    },
    calendarDays() {
      const firstDay = new Date(this.calendarYear, this.calendarMonth, 1).getDay();
      const daysInMonth = new Date(this.calendarYear, this.calendarMonth + 1, 0).getDate();
      return [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
    }
  },
  watch: {
    "form.date"(date) {
      const isoDate = toIsoDate(date);
      if (!isoDate) return;
      const [year, month] = isoDate.split("-").map(Number);
      this.calendarYear = year;
      this.calendarMonth = month - 1;
    }
  },
  methods: {
    handleLogoUpload(event) {
      const [file] = event.target.files;
      if (!file) return;
      if (!file.type.startsWith("image/")) return this.$emit("error", "Selecione um arquivo de imagem válido.");
      const reader = new FileReader();
      reader.onload = () => { this.form.logo = reader.result; };
      reader.readAsDataURL(file);
    },
    formatDateInput(event) {
      const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
      const parts = [];
      if (digits.length > 0) parts.push(digits.slice(0, 2));
      if (digits.length > 2) parts.push(digits.slice(2, 4));
      if (digits.length > 4) parts.push(digits.slice(4, 8));
      this.form.date = parts.join("/");
    },
    updateDateFromPicker(event) {
      this.form.date = formatStoredDate(event.target.value);
    },
    toggleCalendar() {
      this.calendarOpen = !this.calendarOpen;
      if (this.calendarOpen) {
        const date = this.form.date ? toIsoDate(this.form.date) : "";
        if (date) {
          const [year, month] = date.split("-").map(Number);
          this.calendarYear = year;
          this.calendarMonth = month - 1;
        } else {
          const today = new Date();
          this.calendarYear = today.getFullYear();
          this.calendarMonth = today.getMonth();
        }
      }
    },
    calendarDayIsSelected(day) {
      const selectedDate = this.selectedDateKey || this.todayDateKey;
      return Boolean(day) && `${this.calendarYear}-${this.calendarMonth + 1}-${day}` === selectedDate;
    },
    changeCalendarMonth(offset) {
      const next = new Date(this.calendarYear, this.calendarMonth + offset, 1);
      this.calendarYear = next.getFullYear();
      this.calendarMonth = next.getMonth();
    },
    selectCalendarDay(day) {
      const formatted = `${String(day).padStart(2, "0")}/${String(this.calendarMonth + 1).padStart(2, "0")}/${this.calendarYear}`;
      this.form.date = formatted;
      this.calendarOpen = false;
    }
  }
}
</script>

<template>
  <div class="page-heading"><span class="eyebrow">AVALIAÇÕES</span><h1>{{ editingExamId ? "Editar Avaliação" : "Montar Prova" }}</h1><p>Configure os dados da prova, selecione as questões e prepare o documento editável.</p></div>
  <form class="form-card" @submit.prevent="$emit('save')">
    <h2 class="form-section-title">Dados da avaliação</h2>
    <div class="form-grid">
      <label>Nome da avaliação<input v-model="form.name" placeholder="Nome da sua prova"></label>
      <label>Data da aplicação<div class="date-field">
        <input class="date-text-input" v-model="form.date" @input="formatDateInput" type="text" inputmode="numeric" placeholder="dd/mm/yyyy" maxlength="10">
        <button type="button" class="calendar-trigger" @click="toggleCalendar" aria-label="Abrir calendário"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18"></path></svg></button>
        <div v-if="calendarOpen" class="calendar-popover">
          <div class="calendar-header"><button type="button" @click="changeCalendarMonth(-1)" aria-label="Mês anterior">‹</button><strong>{{ calendarMonthLabel }}</strong><button type="button" @click="changeCalendarMonth(1)" aria-label="Próximo mês">›</button></div>
          <div class="calendar-weekdays"><span v-for="weekday in ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']" :key="weekday">{{ weekday }}</span></div>
          <div class="calendar-days"><button v-for="(day, index) in calendarDays" :key="index" type="button" :class="{ empty: !day, today: calendarDayIsSelected(day) }" :disabled="!day" @click="day && selectCalendarDay(day)">{{ day }}</button></div>
        </div>
      </div></label>
      <label>Instituição<input v-model="form.institution" placeholder="Nome da instituição"></label>
      <label>Curso<input v-model="form.course" placeholder="Nome do curso"></label>
      <label>Disciplina<select v-model="form.subject"><option value="">Selecione uma disciplina</option><option v-for="subject in subjects" :key="subject" :value="subject">{{ subject }}</option></select></label>
      <label>Professor<input v-model="form.professor" placeholder="Nome do professor"></label>
      <label>Turma<select v-model="form.className"><option value="">Selecione uma turma</option><option v-for="className in classes" :key="className" :value="className">{{ className }}</option></select></label>
    </div>
    <h2 class="form-section-title">Cabeçalho e instruções</h2>
    <div class="header-config">
      <label>Logo da instituição<input type="file" accept="image/*" @change="handleLogoUpload"></label>
      <img v-if="form.logo" class="logo-preview" :src="form.logo" alt="Logo da instituição">
    </div>
    <label>Instruções da prova<textarea v-model="form.instructions" placeholder="Digite as orientações para os alunos"></textarea></label>
    <h2 class="form-section-title">Configurações do documento</h2>
    <div class="form-grid">
      <label>Layout da prova<select v-model="form.layout"><option>Uma coluna</option><option>Duas colunas</option></select></label>
      <label>Número de versões<input v-model.number="form.versions" type="number" min="1"></label>
    </div>
    <div class="toggle-list">
      <label><input v-model="form.shuffleQuestions" type="checkbox"> Embaralhar questões</label>
      <label><input v-model="form.shuffleAlternatives" type="checkbox"> Embaralhar alternativas</label>
      <label><input v-model="form.addBlankPage" type="checkbox"> Adicionar página em branco se necessário para impressão frente e verso</label>
    </div>
    <h2 class="form-section-title">Questões da avaliação</h2>
    <p class="selection-title">Selecione as questões:</p>
    <div v-if="!questions.length" class="empty-card compact"><span>✎</span><h2>Sem questões disponíveis</h2><p>Cadastre a primeira questão para começar.</p></div>
    <div v-else class="selection-list">
      <label v-for="question in filteredQuestionsForExam" :key="question.id"><input type="checkbox" v-model="form.selected" :value="question.id"><span><strong>{{ question.text }}</strong><small>{{ question.subject }} · {{ question.topic }}</small></span><button v-if="editingExamId" type="button" class="edit-button selection-edit" @click.stop.prevent="$emit('edit-question', question)" aria-label="Editar questão da avaliação">✎</button></label>
    </div>
    <p v-if="error" class="auth-error">{{ error }}</p>
    <div class="form-actions">
      <button type="button" class="outline-button" @click="$emit('cancel')">Cancelar</button>
      <button type="button" class="outline-button" @click="$emit('preview')">Pré-visualizar</button>
      <button class="primary-button compact">{{ editingExamId ? "Salvar alterações" : "Salvar avaliação" }}</button>
    </div>
  </form>
</template>

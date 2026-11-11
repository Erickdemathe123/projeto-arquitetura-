<script>
export default {
  props: {
    exam: { type: Object, default: null },
    questions: { type: Array, required: true }
  },
  emits: ["back"],
  methods: {
    questionsForExam(exam) {
      return exam && exam.questionSnapshots ? exam.questionSnapshots : this.questions.filter((question) => exam.questionIds.includes(question.id));
    }
  }
}
</script>

<template>
  <div class="page-heading row">
    <div><span class="eyebrow">VISUALIZAÇÃO</span><h1>Pré-visualização da prova</h1><p>Confira o caderno e a folha de respostas antes da geração do documento.</p></div>
    <button class="outline-button" @click="$emit('back')">Voltar para montagem</button>
  </div>
  <div class="preview-grid">
    <section class="document-preview">
      <div class="preview-paper">
        <div class="preview-header"><img v-if="exam && exam.logo" :src="exam.logo" alt="Logo da instituição"><div><strong>{{ exam && exam.institution || "Instituição" }}</strong><span>{{ exam && exam.course || "Curso" }}</span><span>{{ exam && exam.subject || "Disciplina" }}</span></div></div>
        <h2>{{ exam && exam.name || "Nome da avaliação" }}</h2>
        <p class="preview-meta">{{ exam && exam.professor || "Professor" }} · {{ exam && exam.className || "Turma" }} · {{ exam && exam.date || "Data da aplicação" }}</p>
        <p v-if="exam && exam.instructions" class="preview-instructions">{{ exam.instructions }}</p>
        <article v-for="(question, index) in (exam ? questionsForExam(exam) : [])" :key="question.id" class="preview-question"><strong>{{ index + 1 }}. {{ question.text }}</strong><span v-for="(alternative, alternativeIndex) in question.alternatives" :key="alternativeIndex">{{ String.fromCharCode(65 + alternativeIndex) }}) {{ alternative }}</span></article>
        <p v-if="exam && !exam.questionIds.length" class="preview-empty">As questões selecionadas aparecerão aqui.</p>
      </div>
    </section>
    <section class="document-preview answer-sheet">
      <div class="preview-paper">
        <div class="answer-sheet-heading"><span class="qr-placeholder">QR</span><div><h2>Folha de respostas</h2><p>{{ exam && exam.name || "Nome da avaliação" }}</p></div></div>
        <label>Aluno: ____________________________________</label>
        <label>RA: _______________________________________</label>
        <div class="answer-grid"><div v-for="number in (exam ? exam.questionIds.length : 5)" :key="number"><strong>{{ number }}</strong><span v-for="letter in ['A', 'B', 'C', 'D', 'E']" :key="letter">{{ letter }} ○</span></div></div>
        <p class="preview-note">Prévia visual da folha de respostas. O QR Code e a leitura serão implementados posteriormente.</p>
      </div>
    </section>
  </div>
</template>

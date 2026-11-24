<script>
export default {
  props: {
    exam: { type: Object, default: null },
    questions: { type: Array, required: true }
  },
  emits: ["back"],
  computed: {
    answerSheetSettings() {
      return this.exam?.answerSheet || {};
    },
    answerRows() {
      if (!this.exam) return Array.from({ length: 5 }, (_, index) => ({ number: index + 1, letters: ["A", "B", "C", "D", "E"] }));
      return this.questionsForExam(this.exam).map((question, index) => ({
        number: index + 1,
        letters: question.alternatives.map((_, alternativeIndex) => String.fromCharCode(65 + alternativeIndex))
      }));
    }
  },
  methods: {
    questionsForExam(exam) {
      return exam && exam.questionSnapshots ? exam.questionSnapshots : this.questions.filter((question) => exam.questionIds.includes(question.id));
    }
  }
};
</script>

<template>
  <div class="page-heading row">
    <div><span class="eyebrow">VISUALIZAÇÃO</span><h1>Pré-visualização da prova</h1><p>Confira separadamente o caderno e a folha de respostas antes da geração.</p></div>
    <button class="outline-button" @click="$emit('back')">Voltar para montagem</button>
  </div>
  <div class="preview-grid">
    <section class="document-preview">
      <div class="preview-paper">
        <div class="preview-header">
          <img v-if="exam && exam.logo" :src="exam.logo" alt="Logo da prova">
          <div class="preview-header-copy">
            <strong>{{ exam && exam.institution || "Instituição" }}</strong>
            <span>{{ exam && exam.course || "Curso" }}</span>
            <span>{{ exam && exam.subject || "Disciplina" }}</span>
          </div>
        </div>
        <h2 class="preview-exam-title">{{ exam && exam.name || "Nome da avaliação" }}</h2>
        <p class="preview-meta">{{ exam && exam.professor || "Professor" }} · {{ exam && exam.className || "Turma" }} · {{ exam && exam.date || "Data da aplicação" }}</p>
        <p v-if="exam && exam.instructions" class="preview-instructions">{{ exam.instructions }}</p>
        <article v-for="(question, index) in (exam ? questionsForExam(exam) : [])" :key="question.id" class="preview-question"><strong>{{ index + 1 }}. {{ question.text }}</strong><span v-for="(alternative, alternativeIndex) in question.alternatives" :key="alternativeIndex">{{ String.fromCharCode(65 + alternativeIndex) }}) {{ alternative }}</span></article>
        <p v-if="exam && !exam.questionIds.length" class="preview-empty">As questões selecionadas aparecerão aqui.</p>
      </div>
    </section>

    <section class="document-preview answer-sheet">
      <div class="preview-paper answer-sheet-preview-paper">
        <div class="answer-preview-header">
          <img v-if="answerSheetSettings.logo" :src="answerSheetSettings.logo" alt="Logo da folha de respostas">
          <div class="answer-preview-title">
            <strong>{{ exam && exam.subject || "Disciplina" }}</strong>
            <h2>{{ exam && exam.name || "Nome da avaliação" }}</h2>
            <p>{{ exam && exam.date || "Data da aplicação" }} · Versão A</p>
          </div>
          <div class="preview-grade"><strong>NOTA</strong><span></span></div>
        </div>
        <div class="answer-preview-student">
          <div>ESTUDANTE: ______________________________</div>
          <div>RA: __________________</div>
        </div>
        <div class="answer-preview-instructions">
          <div class="preview-instruction-block">
            <strong>ORIENTAÇÕES GERAIS DO GABARITO</strong>
            <p>{{ answerSheetSettings.proofInstructions || "As orientações gerais da folha aparecerão aqui." }}</p>
          </div>
          <div class="preview-instruction-block">
            <strong>ORIENTAÇÕES SOBRE O PREENCHIMENTO</strong>
            <p>{{ answerSheetSettings.answerInstructions || "As orientações de preenchimento aparecerão aqui." }}</p>
            <strong v-if="answerSheetSettings.resultUrl">ACESSE SEU RESULTADO EM:</strong>
            <a v-if="answerSheetSettings.resultUrl" :href="answerSheetSettings.resultUrl" target="_blank" rel="noreferrer">{{ answerSheetSettings.resultUrl }}</a>
            <p v-if="answerSheetSettings.resultText">{{ answerSheetSettings.resultText }}</p>
          </div>
        </div>
        <div class="answer-preview-box">
          <div class="preview-qr-column"><span class="qr-placeholder">QR</span><small>QR Code da prova</small></div>
          <div class="preview-answer-column">
            <strong>RESPOSTAS</strong>
            <div class="answer-legend"><span>A</span><span>B</span><span>C</span><span>D</span><span>E</span></div>
            <div class="answer-grid"><div v-for="row in answerRows" :key="row.number"><strong>Q{{ row.number }}:</strong><span v-for="letter in row.letters" :key="letter">{{ letter }} ○</span></div></div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

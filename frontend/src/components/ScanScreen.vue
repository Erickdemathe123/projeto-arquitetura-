<script>
import QrScanner from "./QrScanner.vue";

export default {
  components: { QrScanner },
  props: {
    step: { type: String, required: true },
    loading: { type: Boolean, default: false },
    exams: { type: Array, required: true },
    summaries: { type: Object, required: true },
    activeExam: { type: Object, default: null },
    form: { type: Object, required: true },
    turmas: { type: Array, required: true },
    error: { type: String, default: "" },
    qrBatch: { type: Array, default: () => [] },
    qrLoading: { type: Boolean, default: false },
    qrError: { type: String, default: "" },
    qrFeedback: { type: String, default: "" },
    conference: { type: Object, default: null }
  },
  emits: ["open-exam", "back", "submit", "remove-result", "qr-detected"],
  methods: {
    scanTurmaName(exam) {
      const turma = this.turmas.find((item) => item.id === exam.applicationClassId);
      return turma ? turma.name : "Turma";
    },
    scanStatusLabel(examId) {
      const status = this.summaries[examId]?.status;
      if (status === "concluida") return "Corrigida";
      if (status === "em_andamento") return "Em correção";
      return "Pendente";
    }
  }
}
</script>

<template>
  <div v-if="step === 'list'">
    <div class="page-heading"><span class="eyebrow">CORREÇÃO</span><h1>Corrigir Provas</h1><p>Identifique a folha pelo QR Code e leia as respostas pela câmera.</p></div>
    <div v-if="loading" class="empty-card"><span>⌗</span><h2>Carregando…</h2><p>Buscando o andamento da correção de cada avaliação.</p></div>
    <div v-else-if="!exams.length" class="empty-card"><span>⌗</span><h2>Nenhuma avaliação para corrigir</h2><p>Aplique uma avaliação a uma turma em "Montar Prova" para liberar a correção.</p></div>
    <div v-else class="question-list">
      <article v-for="exam in exams" :key="exam.id" class="question-item">
        <span class="question-number">⌗</span>
        <div><strong>{{ exam.name }}</strong><small>{{ scanTurmaName(exam) }} · {{ scanStatusLabel(exam.id) }}<template v-if="summaries[exam.id]"> · {{ summaries[exam.id].corrigidos }}/{{ summaries[exam.id].totalMatriculados }} corrigidas</template></small></div>
        <div class="question-actions"><button class="edit-button" @click="$emit('open-exam', exam)" aria-label="Corrigir avaliação" title="Corrigir avaliação">▶</button></div>
      </article>
    </div>
  </div>
  <div v-else-if="activeExam">
    <div class="page-heading row">
      <div><span class="eyebrow">CORREÇÃO</span><h1>{{ activeExam.name }}</h1><p>{{ scanTurmaName(activeExam) }} · {{ scanStatusLabel(activeExam.id) }}</p></div>
      <button class="outline-button" @click="$emit('back')">Voltar</button>
    </div>
    <section class="qr-scan-card" aria-labelledby="qr-scan-title">
      <h2 id="qr-scan-title" class="form-section-title">Identificar folhas com QR Code</h2>
      <p class="qr-scan-description">Aponte a câmera para a folha inteira. O sistema identifica o QR e lê as bolhas marcadas.</p>
      <QrScanner
        :busy="qrLoading"
        :error="qrError"
        :feedback="qrFeedback"
        :answer-count="activeExam.standaloneAnswerSheet ? (activeExam.questionCount || 20) : (activeExam.questionIds?.length || 20)"
        @detected="$emit('qr-detected', $event)"
      />
      <div v-if="qrBatch.length" class="qr-batch">
        <h3>Folhas identificadas ({{ qrBatch.length }})</h3>
        <ul>
          <li v-for="folha in qrBatch" :key="folha.qrCode">
            <strong>{{ folha.studentName || 'Folha avulsa' }}</strong>
            <span>Versão {{ folha.versionLabel }}</span>
          </li>
        </ul>
      </div>
    </section>
    <section v-if="conference" class="form-card conference-card" aria-labelledby="conference-title">
      <h2 id="conference-title" class="form-section-title">Conferir leitura antes de confirmar</h2>
      <p><strong>{{ conference.studentName }}</strong><span v-if="conference.ra"> · RA {{ conference.ra }}</span><span> · Versão {{ conference.versionLabel }}</span></p>
      <div class="conference-list">
        <label v-for="(answer, index) in conference.answers" :key="index">
          <span>Questão {{ index + 1 }}</span>
          <select
            :value="answer && answer.status === 'marked' ? answer.markedIndex : answer && answer.status === 'multiple' ? 'multiple' : 'blank'"
            @change="$event.target.value === 'blank' || $event.target.value === 'multiple'
              ? Object.assign(answer, { markedIndex: null, status: $event.target.value })
              : Object.assign(answer, { markedIndex: Number($event.target.value), status: 'marked' })"
          >
            <option value="blank">Em branco</option>
            <option value="multiple">Dupla marcação</option>
            <option v-for="(letter, alternative) in ['A','B','C','D','E']" :key="letter" :value="alternative">{{ letter }}</option>
          </select>
        </label>
      </div>
    </section>
    <form class="form-card" @submit.prevent="$emit('submit')">
      <h2 class="form-section-title">Lançar nota manualmente</h2>
      <div class="form-grid">
        <label>RA do aluno<input v-model="form.ra" placeholder="Registro acadêmico"></label>
        <label>Nota<input v-model.number="form.score" type="number" min="0" max="10" step="0.1" placeholder="0 a 10"></label>
        <label>Respostas automáticas<input v-model="form.answers" placeholder="A, B, C, D ou 0, 1, 2, 3"></label>
        <label>Versão<input v-model="form.version" placeholder="Ex.: A"></label>
      </div>
      <p v-if="error" class="auth-error">{{ error }}</p>
      <div class="form-actions"><button class="primary-button compact">Registrar nota</button></div>
    </form>
    <h2 class="dashboard-section-title">Alunos já corrigidos</h2>
    <div v-if="!summaries[activeExam.id] || !summaries[activeExam.id].resultados.length" class="empty-card compact"><span>⌗</span><h2>Nenhum aluno corrigido ainda</h2><p>Lance a primeira nota pelo formulário acima.</p></div>
    <div v-else class="question-list">
      <article v-for="resultado in summaries[activeExam.id].resultados" :key="resultado.studentId" class="question-item">
        <span class="question-number">✓</span>
        <div><strong>{{ resultado.studentName }}</strong><small>RA: {{ resultado.ra }} · Nota: {{ resultado.score }}</small></div>
        <div class="question-actions"><button class="remove-button" @click="$emit('remove-result', resultado)" aria-label="Remover nota">×</button></div>
      </article>
    </div>
  </div>
</template>

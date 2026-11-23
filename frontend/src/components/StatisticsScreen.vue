<script>
import { buildStatistics, formatScore } from "../utils/statistics";

export default {
  props: {
    exam: { type: Object, default: null },
    summary: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: "" }
  },
  emits: ["back"],
  computed: {
    stats() {
      return this.summary ? buildStatistics(this.summary) : null;
    }
  },
  methods: {
    formatScore,
    barHeight(count) {
      // Até 85% do trilho, para sobrar espaço para o número acima da barra
      return this.stats.maxBucket ? `${Math.max((count / this.stats.maxBucket) * 85, count ? 4 : 0)}%` : "0%";
    }
  }
}
</script>

<template>
  <div class="page-heading row">
    <div><span class="eyebrow">ANÁLISE PEDAGÓGICA</span><h1>Estatísticas da avaliação</h1><p v-if="exam">{{ exam.name }}</p></div>
    <button class="outline-button" @click="$emit('back')">Voltar</button>
  </div>
  <p v-if="error" class="auth-error">{{ error }}</p>
  <section v-if="loading" class="empty-card"><span>▥</span><h2>Carregando resultados...</h2></section>
  <section v-else-if="stats && !stats.count" class="empty-card"><span>▥</span><h2>Nenhuma nota lançada ainda</h2><p>As estatísticas aparecem depois que você lançar notas em "Corrigir Provas".</p></section>
  <template v-else-if="stats">
    <div class="stats-grid">
      <article class="stat-card"><span>Média da turma</span><strong>{{ formatScore(stats.average) }}</strong></article>
      <article class="stat-card"><span>Maior nota</span><strong>{{ formatScore(stats.highest) }}</strong></article>
      <article class="stat-card"><span>Menor nota</span><strong>{{ formatScore(stats.lowest) }}</strong></article>
      <article class="stat-card"><span>Aprovados (nota ≥ {{ formatScore(stats.passingScore) }})</span><strong>{{ stats.passed }} de {{ stats.count }}</strong><small>{{ stats.passedPercent }}% dos corrigidos</small></article>
      <article class="stat-card"><span>Provas corrigidas</span><strong>{{ stats.count }} de {{ stats.enrolled || stats.count }}</strong><small>alunos da turma</small></article>
    </div>
    <section class="form-card stats-section">
      <h2 class="form-section-title">Distribuição das notas</h2>
      <div class="distribution-chart" role="img" :aria-label="stats.buckets.map((bucket) => `${bucket.label}: ${bucket.count} aluno(s)`).join('; ')">
        <div v-for="bucket in stats.buckets" :key="bucket.label" class="distribution-column" :title="`${bucket.label}: ${bucket.count} ${bucket.count === 1 ? 'aluno' : 'alunos'}`">
          <div class="distribution-track"><span class="distribution-count">{{ bucket.count }}</span><div class="distribution-bar" :style="{ height: barHeight(bucket.count) }"></div></div>
          <span class="distribution-label">{{ bucket.label }}</span>
        </div>
      </div>
    </section>
    <section class="form-card stats-section">
      <h2 class="form-section-title">Notas por aluno</h2>
      <table class="stats-table">
        <thead><tr><th>Aluno</th><th>RA</th><th>Nota</th></tr></thead>
        <tbody>
          <tr v-for="resultado in stats.ranking" :key="resultado.studentId"><td>{{ resultado.studentName }}</td><td>{{ resultado.ra }}</td><td>{{ formatScore(resultado.score) }}</td></tr>
        </tbody>
      </table>
    </section>
  </template>
</template>

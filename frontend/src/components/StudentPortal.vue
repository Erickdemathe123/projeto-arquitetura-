<script>
export default {
  props: {
    code: { type: String, default: "" },
    ra: { type: String, default: "" },
    result: { type: Object, default: null },
    error: { type: String, default: "" }
  },
  emits: ["update:code", "update:ra", "consult", "back"]
}
</script>

<template>
  <main class="student-portal">
    <div class="student-portal-card">
      <span class="brand-mark">SGP</span>
      <h1>Consulta de resultado</h1>
      <p>Informe o código único impresso na sua prova e o seu RA.</p>
      <form @submit.prevent="$emit('consult')">
        <label>Código da prova<input :value="code" @input="$emit('update:code', $event.target.value)" placeholder="Ex.: SGP-ABC123"></label>
        <label>RA<input :value="ra" @input="$emit('update:ra', $event.target.value)" placeholder="Seu registro acadêmico"></label>
        <p v-if="error" class="auth-error">{{ error }}</p>
        <button class="primary-button" type="submit">Consultar</button>
      </form>
      <div v-if="result" class="student-result">
        <div v-if="!result.released" class="empty-card"><span>🔒</span><h2>Gabarito ainda não liberado</h2><p>O professor precisa liberar o resultado para esta consulta.</p></div>
        <div v-else-if="!result.resultAvailable" class="empty-card"><span>⌗</span><h2>Nota ainda não lançada</h2><p>O professor ainda não corrigiu a sua prova, ou o RA informado não confere com o desta avaliação.</p></div>
        <div v-else class="released-result"><span class="eyebrow">RESULTADO LIBERADO</span><h2>{{ result.name }}</h2><p>Nota: <strong>{{ result.score }}</strong> / 10.0</p></div>
      </div>
      <button type="button" class="text-button" @click="$emit('back')">Acesso do professor</button>
    </div>
  </main>
</template>

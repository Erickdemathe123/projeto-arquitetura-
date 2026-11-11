<script>
export default {
  emits: ["back"]
}
</script>

<template>
  <div class="page-heading row">
    <div><span class="eyebrow">ANÁLISE PEDAGÓGICA</span><h1>Estatísticas da avaliação</h1></div>
    <button class="outline-button" @click="$emit('back')">Voltar</button>
  </div>
  <section class="empty-card"><span>▥</span><h2>Estatísticas indisponíveis</h2><p>Os resultados só serão exibidos quando as respostas corrigidas estiverem persistidas no sistema.</p></section>
</template>

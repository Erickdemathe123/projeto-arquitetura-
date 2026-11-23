<script>
export default {
  props: {
    screen: { type: String, required: true }
  },
  emits: ["navigate", "open-classes", "open-scan", "logout"]
}
</script>

<template>
  <aside class="sidebar">
    <div class="side-brand"><span class="brand-mark">SGP</span><span>SGP</span></div>
    <nav>
      <button title="Início" :class="{active: screen === 'dashboard'}" @click="$emit('navigate', 'dashboard')">⌂ <span>Início</span></button>
      <button title="Banco de Questões" :class="{active: screen === 'questions' || screen === 'newQuestion'}" @click="$emit('navigate', 'questions')">▤ <span>Banco de Questões</span></button>
      <button title="Minhas Avaliações" :class="{active: screen === 'exams' || screen === 'newExam'}" @click="$emit('navigate', 'exams')">▣ <span>Minhas Avaliações</span></button>
      <button title="Minhas Turmas" :class="{active: screen === 'classes'}" @click="$emit('open-classes')">♙ <span>Minhas Turmas</span></button>
      <button title="Corrigir Provas" :class="{active: screen === 'scan'}" @click="$emit('open-scan')">⌗ <span>Corrigir Provas</span></button>
    </nav>
    <button class="logout" @click="$emit('logout')" title="Sair">↪ <span>Sair</span></button>
  </aside>
</template>

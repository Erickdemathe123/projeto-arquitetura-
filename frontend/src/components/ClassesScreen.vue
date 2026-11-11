<script>
export default {
  props: {
    turmas: { type: Array, required: true },
    selectedTurma: { type: Object, default: null },
    turmaForm: { type: Object, required: true },
    alunoForm: { type: Object, required: true },
    error: { type: String, default: "" }
  },
  emits: ["save-turma", "edit-turma", "open-turma", "remove-turma", "close-turma", "save-aluno", "remove-aluno", "import-students"]
}
</script>

<template>
  <div v-if="!selectedTurma">
    <div class="page-heading"><span class="eyebrow">ORGANIZAÇÃO</span><h1>Minhas Turmas</h1><p>Cadastre suas turmas e organize os alunos.</p></div>
    <form class="form-card turma-form" @submit.prevent="$emit('save-turma')">
      <label>Nome da turma<input v-model="turmaForm.name" placeholder="Digite o nome da turma"></label>
      <p v-if="error" class="auth-error">{{ error }}</p>
      <div class="form-actions"><button class="primary-button compact">Criar turma</button></div>
    </form>
    <h2 class="dashboard-section-title">Turmas cadastradas</h2>
    <div v-if="!turmas.length" class="empty-card"><span>♙</span><h2>Nenhuma turma criada</h2><p>Crie sua primeira turma para cadastrar alunos.</p></div>
    <div v-else class="question-list">
      <article v-for="turma in turmas" :key="turma.id" class="question-item">
        <span class="question-number">♙</span>
        <div><strong>{{ turma.name }}</strong><small>{{ turma.students.length }} {{ turma.students.length === 1 ? "aluno cadastrado" : "alunos cadastrados" }}</small></div>
        <div class="question-actions">
          <button class="edit-button" @click="$emit('edit-turma', turma)" aria-label="Editar turma">✎</button>
          <button class="edit-button" @click="$emit('open-turma', turma)" aria-label="Acessar turma">→</button>
          <button class="remove-button" @click="$emit('remove-turma', turma)" aria-label="Remover turma">×</button>
        </div>
      </article>
    </div>
  </div>
  <div v-else>
    <div class="page-heading row">
      <div><span class="eyebrow">TURMA</span><h1>{{ selectedTurma.name }}</h1><p>{{ selectedTurma.students.length }} {{ selectedTurma.students.length === 1 ? "aluno cadastrado" : "alunos cadastrados" }}</p></div>
      <button class="outline-button" @click="$emit('close-turma')">Voltar para turmas</button>
    </div>
    <form class="form-card turma-form" @submit.prevent="$emit('save-aluno')">
      <div class="form-grid">
        <label>Nome do aluno<input v-model="alunoForm.name" placeholder="Digite o nome do aluno"></label>
        <label>RA<input v-model="alunoForm.ra" placeholder="Registro acadêmico"></label>
      </div>
      <p v-if="error" class="auth-error">{{ error }}</p>
      <div class="form-actions">
        <button class="primary-button compact">Cadastrar aluno</button>
        <label class="outline-button file-button">Importar CSV<input type="file" accept=".csv,text/csv" @change="$emit('import-students', $event)"></label>
      </div>
    </form>
    <h2 class="dashboard-section-title">Alunos da turma</h2>
    <div v-if="!selectedTurma.students.length" class="empty-card"><span>♙</span><h2>Nenhum aluno cadastrado</h2><p>Cadastre o primeiro aluno desta turma.</p></div>
    <div v-else class="question-list">
      <article v-for="aluno in selectedTurma.students" :key="aluno.id" class="question-item">
        <span class="question-number">♙</span>
        <div><strong>{{ aluno.name }}</strong><small>RA: {{ aluno.ra }}</small></div>
        <div class="question-actions"><button class="remove-button" @click="$emit('remove-aluno', aluno)" aria-label="Remover aluno">×</button></div>
      </article>
    </div>
  </div>
</template>

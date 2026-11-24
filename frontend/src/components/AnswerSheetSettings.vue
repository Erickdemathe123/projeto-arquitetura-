<script>
export default {
  props: {
    form: { type: Object, required: true },
    loading: { type: Boolean, default: false },
    error: { type: String, default: "" },
    message: { type: String, default: "" }
  },
  emits: ["save", "error"],
  methods: {
    handleLogoUpload(event) {
      const [file] = event.target.files;
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        this.$emit("error", "Selecione uma imagem válida para a logo.");
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => this.$emit("error", "Não foi possível ler a logo.");
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => this.$emit("error", "Não foi possível abrir a logo.");
        image.onload = () => {
          const maxDimension = 512;
          const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext("2d");
          if (!context) {
            this.$emit("error", "Não foi possível processar a logo.");
            return;
          }
          context.fillStyle = "#fff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const logo = canvas.toDataURL("image/jpeg", 0.8);
          if (logo.length > 700 * 1024) {
            this.$emit("error", "A logo ainda ficou muito grande. Escolha uma imagem menor.");
            return;
          }
          this.form.logo = logo;
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }
};
</script>

<template>
  <div>
    <div class="page-heading">
      <span class="eyebrow">CONFIGURAÇÕES</span>
      <h1>Modelo da folha de respostas</h1>
      <p>Salve uma vez as informações que serão repetidas nos seus gabaritos.</p>
    </div>
    <form class="form-card" @submit.prevent="$emit('save')">
      <h2 class="form-section-title">Identificação da instituição</h2>
      <div class="form-grid">
        <label>Nome da instituição<input v-model="form.institutionName" maxlength="160" placeholder="Nome da escola ou faculdade"></label>
        <label>Logo da instituição<input type="file" accept="image/*" @change="handleLogoUpload"></label>
      </div>
      <div v-if="form.logo" class="header-config">
        <img class="logo-preview" :src="form.logo" alt="Pré-visualização da logo">
        <button type="button" class="outline-button compact" @click="form.logo = ''">Remover logo</button>
      </div>

      <h2 class="form-section-title">Orientações gerais do gabarito</h2>
      <label>Texto exibido no lado esquerdo da folha de respostas<textarea v-model="form.proofInstructions" maxlength="5000" rows="8" placeholder="Orientações gerais que aparecerão no gabarito."></textarea></label>

      <h2 class="form-section-title">Orientações para preencher o gabarito</h2>
      <label>Texto exibido junto à grade de respostas<textarea v-model="form.answerInstructions" maxlength="5000" rows="6" placeholder="Explique como o aluno deve preencher as respostas."></textarea></label>

      <h2 class="form-section-title">Consulta do resultado</h2>
      <div class="form-grid">
        <label>Endereço para consultar o resultado<input v-model="form.resultUrl" type="url" maxlength="500" placeholder="https://seu-sistema/aluno"></label>
        <label>Texto de orientação<input v-model="form.resultText" maxlength="500" placeholder="Informe o código da prova e seu RA."></label>
      </div>

      <div class="answer-sheet-settings-preview">
        <strong>Pré-visualização do texto</strong>
        <div class="answer-sheet-settings-preview-copy">
          <p v-if="form.answerInstructions">{{ form.answerInstructions }}</p>
          <p v-if="form.resultUrl"><strong>Acesse seu resultado em:</strong><br>{{ form.resultUrl }}</p>
          <p v-if="form.resultText">{{ form.resultText }}</p>
        </div>
      </div>

      <p v-if="error" class="auth-error">{{ error }}</p>
      <p v-if="message" class="success-message">{{ message }}</p>
      <div class="form-actions">
        <button class="primary-button compact" :disabled="loading">{{ loading ? "Salvando..." : "Salvar modelo" }}</button>
      </div>
    </form>
  </div>
</template>

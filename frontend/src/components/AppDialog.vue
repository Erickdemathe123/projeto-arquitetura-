<script>
// Diálogo do sistema, usado no lugar de window.confirm e window.prompt.
// Com "withInput" pede um texto; sem ele, só pede confirmação.
export default {
  props: {
    title: { type: String, required: true },
    message: { type: String, default: "" },
    confirmLabel: { type: String, default: "Confirmar" },
    danger: { type: Boolean, default: false },
    withInput: { type: Boolean, default: false },
    inputLabel: { type: String, default: "" },
    initialValue: { type: String, default: "" }
  },
  emits: ["confirm", "cancel"],
  data() {
    return { value: this.initialValue };
  },
  mounted() {
    const target = this.$refs.input || this.$refs.confirmButton;
    target.focus();
    if (this.$refs.input) this.$refs.input.select();
  },
  methods: {
    confirm() {
      this.$emit("confirm", this.withInput ? this.value : true);
    }
  }
}
</script>

<template>
  <div class="dialog-backdrop" @click.self="$emit('cancel')" @keydown.esc="$emit('cancel')">
    <form class="dialog-card" role="dialog" aria-modal="true" :aria-label="title" @submit.prevent="confirm">
      <h2>{{ title }}</h2>
      <p v-if="message">{{ message }}</p>
      <label v-if="withInput">{{ inputLabel }}<input ref="input" v-model="value"></label>
      <div class="dialog-actions">
        <button type="button" class="outline-button" @click="$emit('cancel')">Cancelar</button>
        <button ref="confirmButton" type="submit" :class="['primary-button', 'compact', { danger }]">{{ confirmLabel }}</button>
      </div>
    </form>
  </div>
</template>

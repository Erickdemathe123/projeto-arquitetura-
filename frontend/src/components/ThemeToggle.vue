<script>
export default {
  props: {
    theme: { type: String, required: true },
    floating: { type: Boolean, default: false }
  },
  emits: ["toggle"],
  computed: {
    label() {
      return this.theme === "dark" ? "Ativar modo claro" : "Ativar modo noturno";
    }
  }
}
</script>

<template>
  <button type="button" :class="['theme-toggle', { floating }]" :aria-label="label" :title="label" @click="$emit('toggle')">{{ theme === "dark" ? "☀" : "☾" }}</button>
</template>

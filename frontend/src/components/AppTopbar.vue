<script>
import ThemeToggle from "./ThemeToggle.vue";

export default {
  components: { ThemeToggle },
  props: {
    title: { type: String, default: "" },
    name: { type: String, default: "" },
    theme: { type: String, default: "light" }
  },
  emits: ["logout", "toggle-theme"]
}
</script>

<template>
  <header class="topbar">
    <div><span class="muted">SGP / </span>{{ title }}</div>
    <div class="profile"><ThemeToggle :theme="theme" @toggle="$emit('toggle-theme')" /><span>{{ name.charAt(0).toUpperCase() }}</span><strong>{{ name }}</strong><button @click="$emit('logout')">Sair</button></div>
  </header>
</template>

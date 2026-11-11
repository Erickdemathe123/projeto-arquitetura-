<script>
export default {
  props: {
    title: { type: String, default: "" },
    name: { type: String, default: "" }
  },
  emits: ["logout"]
}
</script>

<template>
  <header class="topbar">
    <div><span class="muted">SGP / </span>{{ title }}</div>
    <div class="profile"><span>{{ name.charAt(0).toUpperCase() }}</span><strong>{{ name }}</strong><button @click="$emit('logout')">Sair</button></div>
  </header>
</template>

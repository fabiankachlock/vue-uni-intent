<script setup lang="ts">
defineProps<{ entries: string[] }>();
</script>

<template>
  <ul class="log">
    <li v-if="entries.length === 0" class="empty">Interact to see events…</li>
    <li v-for="(entry, i) in entries" :key="`${i}-${entry}`">{{ entry }}</li>
  </ul>
</template>

<style scoped>
.log {
  list-style: none;
  margin: 2rem 0 0;
  padding: 1rem;
  border: 1px dashed #334;
  border-radius: 8px;
  min-height: 3rem;
  color: #9ab;
  font-family: monospace;
}

.empty {
  color: #556;
}
</style>

<script setup lang="ts">
defineProps<{ entries: string[] }>();
</script>

<template>
  <div class="log">
    <span class="title">Log</span>
    <ul>
      <li v-if="entries.length === 0" class="empty">awaiting input</li>
      <li v-for="(entry, i) in entries" :key="`${i}-${entry}`">{{ entry }}</li>
    </ul>
  </div>
</template>

<style scoped>
.log {
  margin-top: 2.5rem;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: var(--panel);
  font-family: var(--font-ui);
  font-size: 0.8rem;
  text-align: left;
}

.title {
  display: block;
  padding: 0.4rem 0.75rem;
  border-bottom: 1px solid var(--line);
  color: var(--faint);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0.5rem 0;
  min-height: 2.5rem;
}

li {
  padding: 0.15rem 0.75rem;
  color: var(--muted);
}

li:first-child {
  color: var(--ink);
}

li.empty {
  color: var(--faint);
}
</style>

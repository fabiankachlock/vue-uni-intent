<script setup lang="ts">
defineProps<{ help?: string }>();
</script>

<template>
  <div class="pane">
    <p v-if="help || $slots.help" class="help">
      <slot name="help">{{ help }}</slot>
    </p>
    <slot />
  </div>
</template>

<style scoped>
.pane {
  max-width: 48rem;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}

.help {
  max-width: 40rem;
  margin-top: 0;
  color: var(--muted);
  font-size: 0.9rem;
}
</style>

<script setup lang="ts">
import { useTriggerLayer } from "vue-uni-intent";

// Confine navigation and shortcuts to this overlay while it is mounted.
useTriggerLayer();
</script>

<template>
  <div class="overlay">
    <div class="sheet">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.65);
  display: grid;
  place-items: center;
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--panel);
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  padding: 2rem 3rem;
  min-width: 18rem;
  box-shadow: 0 16px 48px rgb(0 0 0 / 0.5);
}
</style>

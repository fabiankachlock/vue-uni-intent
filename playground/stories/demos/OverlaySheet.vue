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
  background: #14141e;
  border: 1px solid #445;
  border-radius: 12px;
  padding: 2rem 3rem;
  min-width: 18rem;
}
</style>

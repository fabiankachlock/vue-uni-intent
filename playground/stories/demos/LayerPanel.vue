<script setup lang="ts">
import { button, key, useTriggerLayer } from "vue-uni-intent";
import DemoButton from "../../components/DemoButton.vue";

const props = defineProps<{ depth: number; maxDepth: number }>();
const emit = defineEmits<{ push: []; close: [] }>();

useTriggerLayer({ id: `panel-${props.depth}` });
</script>

<template>
  <div class="panel" :style="{ translate: `${(depth - 1) * 2.5}rem ${(depth - 1) * 2.5}rem` }">
    <h3>Layer {{ depth }}</h3>
    <p>Only the topmost layer receives input.</p>
    <div class="actions">
      <DemoButton
        :id="`push-${depth}`"
        label="Push layer"
        :disabled="depth >= maxDepth"
        autofocus
        @trigger="emit('push')"
      />
      <DemoButton
        :id="`close-${depth}`"
        label="Close"
        :shortcuts="[key('Escape'), button('B')]"
        @trigger="emit('close')"
      />
    </div>
  </div>
</template>

<style scoped>
.panel {
  position: fixed;
  top: 20%;
  left: 30%;
  background: #14141e;
  border: 1px solid #445;
  border-radius: 12px;
  padding: 1.5rem 2rem;
  box-shadow: 0 8px 32px rgb(0 0 0 / 0.5);
}

.panel p {
  color: #aab;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}
</style>

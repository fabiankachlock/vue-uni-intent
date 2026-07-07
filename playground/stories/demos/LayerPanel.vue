<script setup lang="ts">
import { button, GamepadButton, key, Key, useTriggerLayer } from "vue-uni-intent";
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
        :shortcuts="[key(Key.Escape), button(GamepadButton.B)]"
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
  background: var(--panel);
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  padding: 1.5rem 2rem;
  box-shadow: 0 16px 48px rgb(0 0 0 / 0.5);
}

.panel h3 {
  margin-top: 0;
  font-family: var(--font-ui);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.panel p {
  color: var(--muted);
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}
</style>

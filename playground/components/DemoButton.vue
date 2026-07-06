<script setup lang="ts">
import { useTrigger, type ShortcutDescriptor } from "vue-uni-intent";

const props = defineProps<{
  id: string;
  label: string;
  disabled?: boolean;
  autofocus?: boolean;
  shortcuts?: ShortcutDescriptor[];
}>();

const emit = defineEmits<{ trigger: [] }>();

const { ref: el, focused } = useTrigger({
  id: props.id,
  onTrigger: () => emit("trigger"),
  shortcuts: props.shortcuts,
  disabled: () => props.disabled ?? false,
  autofocus: props.autofocus,
});
</script>

<template>
  <button ref="el" class="demo-button" :class="{ disabled }" type="button">
    {{ label }}
    <span v-if="focused" class="hint">●</span>
  </button>
</template>

<style scoped>
.demo-button {
  position: relative;
  padding: 1rem 1.5rem;
  font-size: 1rem;
  border: 2px solid #445;
  border-radius: 8px;
  background: #1c1c28;
  color: #eee;
  cursor: pointer;
  outline: none;
  transition:
    transform 80ms ease,
    border-color 80ms ease,
    background 80ms ease;
}

.demo-button[data-uni-focused] {
  border-color: #7cf;
  background: #26314a;
  transform: scale(1.06);
}

.demo-button.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.hint {
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 0.6rem;
  color: #7cf;
}
</style>

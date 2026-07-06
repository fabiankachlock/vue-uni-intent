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

const { ref: el } = useTrigger({
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
  </button>
</template>

<style scoped>
.demo-button {
  padding: 0.7rem 1.25rem;
  font-family: var(--font-ui);
  font-size: 0.85rem;
  letter-spacing: 0.03em;
  border: 1px solid var(--line-strong);
  border-radius: 2px;
  background: var(--panel);
  color: var(--ink);
  cursor: pointer;
  outline: none;
}

.demo-button[data-uni-focused] {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-ink);
}

.demo-button.disabled {
  color: var(--faint);
  border-color: var(--line);
  background: transparent;
  cursor: default;
}
</style>

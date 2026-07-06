<script setup lang="ts">
import { useTriggerLayer, key, button, mouseButton } from "vue-uni-intent";
import DemoButton from "./DemoButton.vue";

const emit = defineEmits<{ confirm: []; cancel: [] }>();

useTriggerLayer({ id: "confirm-modal" });
</script>

<template>
  <div class="backdrop">
    <div class="modal">
      <h2>Apply settings?</h2>
      <p>
        Navigation is confined to this layer. Press <kbd>Esc</kbd>, gamepad <kbd>B</kbd>, or the
        mouse back button to cancel.
      </p>
      <div class="actions">
        <DemoButton id="confirm" label="Confirm" autofocus @trigger="emit('confirm')" />
        <DemoButton
          id="cancel"
          label="Cancel"
          :shortcuts="[key('Escape'), button('B'), mouseButton('Back')]"
          @trigger="emit('cancel')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.6);
  display: grid;
  place-items: center;
}

.modal {
  background: var(--panel);
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  padding: 2rem;
  max-width: 26rem;
  box-shadow: 0 16px 48px rgb(0 0 0 / 0.5);
}

.modal h2 {
  margin-top: 0;
}

.modal p {
  color: var(--muted);
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}
</style>

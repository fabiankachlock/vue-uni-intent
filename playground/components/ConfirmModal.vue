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
  background: #14141e;
  border: 1px solid #445;
  border-radius: 12px;
  padding: 2rem;
  max-width: 26rem;
  color: #eee;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

kbd {
  background: #2a2a3a;
  border-radius: 4px;
  padding: 0.1rem 0.4rem;
  font-size: 0.85em;
}
</style>

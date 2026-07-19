<script setup lang="ts">
import { ref } from "vue";
import ConfirmModal from "./components/ConfirmModal.vue";
import DemoButton from "./components/DemoButton.vue";
import EventLog from "./stories/demos/EventLog.vue";
import GamepadHint from "./stories/demos/GamepadHint.vue";
import { useLog } from "./stories/demos/useLog";

const { entries, say } = useLog();
const modalOpen = ref(false);

const cells = Array.from({ length: 12 }, (_, i) => ({
  id: `cell-${i + 1}`,
  label: `Button ${i + 1}`,
  disabled: i === 5,
}));

const rows = Array.from({ length: 24 }, (_, i) => ({
  id: `row-${i + 1}`,
  label: `Row ${i + 1}`,
}));
</script>

<template>
  <main>
    <h1>vue-uni-intent playground</h1>
    <p class="help">
      Move with <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd>, D-pad, or left stick; hover with
      the mouse. Activate with <kbd>Enter</kbd>/<kbd>Space</kbd>, gamepad <kbd>A</kbd>, or click.
      The dimmed button is disabled; navigation skips it.
    </p>
    <GamepadHint />

    <div class="grid">
      <DemoButton
        v-for="cell in cells"
        :id="cell.id"
        :key="cell.id"
        :label="cell.label"
        :disabled="cell.disabled"
        @trigger="say(`${cell.label} triggered`)"
      />
    </div>

    <div class="row">
      <DemoButton id="open-settings" label="Open settings…" @trigger="modalOpen = true" />
    </div>

    <p class="help">Right stick scrolls the list below (the focused item's scroll container).</p>
    <div class="scroller">
      <DemoButton
        v-for="row in rows"
        :id="row.id"
        :key="row.id"
        :label="row.label"
        @trigger="say(`${row.label} triggered`)"
      />
    </div>

    <ConfirmModal
      v-if="modalOpen"
      @confirm="
        modalOpen = false;
        say('Settings applied');
      "
      @cancel="
        modalOpen = false;
        say('Settings cancelled');
      "
    />

    <EventLog :entries="entries" />
  </main>
</template>

<style scoped>
main {
  max-width: 48rem;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}

h1 {
  font-size: 1.3rem;
}

.help {
  max-width: 40rem;
  color: var(--muted);
  font-size: 0.9rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin: 2rem 0;
}

.row {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.scroller {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 12rem;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid var(--muted);
  border-radius: 0.5rem;
  margin-bottom: 2rem;
}
</style>

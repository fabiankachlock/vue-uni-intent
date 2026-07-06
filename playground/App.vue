<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import ConfirmModal from "./components/ConfirmModal.vue";
import DemoButton from "./components/DemoButton.vue";

const log = ref<string[]>([]);
const modalOpen = ref(false);
const gamepadConnected = ref(false);

const say = (message: string) => {
  log.value = [message, ...log.value].slice(0, 8);
};

const cells = Array.from({ length: 12 }, (_, i) => ({
  id: `cell-${i + 1}`,
  label: `Button ${i + 1}`,
  disabled: i === 5,
}));

const onConnect = () => (gamepadConnected.value = true);
const onDisconnect = () => (gamepadConnected.value = navigator.getGamepads().some(Boolean));
onMounted(() => {
  gamepadConnected.value = navigator.getGamepads().some(Boolean);
  window.addEventListener("gamepadconnected", onConnect);
  window.addEventListener("gamepaddisconnected", onDisconnect);
});
onBeforeUnmount(() => {
  window.removeEventListener("gamepadconnected", onConnect);
  window.removeEventListener("gamepaddisconnected", onDisconnect);
});
</script>

<template>
  <main>
    <h1>vue-uni-intent playground</h1>
    <p class="help">
      Move with <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd>, D-pad, or left stick; hover with
      the mouse. Activate with <kbd>Enter</kbd>/<kbd>Space</kbd>, gamepad <kbd>A</kbd>, or click.
    </p>
    <p class="gamepad-hint" :class="{ connected: gamepadConnected }">
      {{ gamepadConnected ? "🎮 Gamepad connected" : "🎮 No gamepad — press any button to wake one up" }}
    </p>

    <div class="grid">
      <DemoButton
        v-for="cell in cells"
        :id="cell.id"
        :key="cell.id"
        :label="cell.disabled ? `${cell.label} (disabled)` : cell.label"
        :disabled="cell.disabled"
        @trigger="say(`${cell.label} triggered`)"
      />
    </div>

    <div class="row">
      <DemoButton id="open-settings" label="Open settings…" @trigger="modalOpen = true" />
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

    <ul class="log">
      <li v-for="(entry, i) in log" :key="`${i}-${entry}`">{{ entry }}</li>
    </ul>
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0e0e14;
  color: #eee;
}
</style>

<style scoped>
main {
  max-width: 48rem;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}

.help {
  color: #aab;
}

.gamepad-hint {
  color: #778;
  font-size: 0.9rem;
}

.gamepad-hint.connected {
  color: #7f7;
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

.log {
  list-style: none;
  padding: 1rem;
  border: 1px dashed #334;
  border-radius: 8px;
  min-height: 3rem;
  color: #9ab;
  font-family: monospace;
}

kbd {
  background: #2a2a3a;
  border-radius: 4px;
  padding: 0.1rem 0.4rem;
  font-size: 0.85em;
}
</style>

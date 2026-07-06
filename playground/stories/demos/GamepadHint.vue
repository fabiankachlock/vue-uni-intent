<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const connected = ref(false);

const onConnect = () => (connected.value = true);
const onDisconnect = () => (connected.value = navigator.getGamepads().some(Boolean));
onMounted(() => {
  connected.value = navigator.getGamepads().some(Boolean);
  window.addEventListener("gamepadconnected", onConnect);
  window.addEventListener("gamepaddisconnected", onDisconnect);
});
onBeforeUnmount(() => {
  window.removeEventListener("gamepadconnected", onConnect);
  window.removeEventListener("gamepaddisconnected", onDisconnect);
});
</script>

<template>
  <p class="gamepad-hint" :class="{ connected }">
    <span class="dot" aria-hidden="true" />
    {{
      connected
        ? "Gamepad connected"
        : "No gamepad detected. Press any button on the controller to connect."
    }}
  </p>
</template>

<style scoped>
.gamepad-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-ui);
  font-size: 0.75rem;
  color: var(--muted);
}

.dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--faint);
}

.connected {
  color: var(--ok);
}

.connected .dot {
  background: var(--ok);
}
</style>

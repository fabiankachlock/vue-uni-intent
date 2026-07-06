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
    {{ connected ? "🎮 Gamepad connected" : "🎮 No gamepad — press any button to wake one up" }}
  </p>
</template>

<style scoped>
.gamepad-hint {
  color: #778;
  font-size: 0.9rem;
}

.gamepad-hint.connected {
  color: #7f7;
}
</style>

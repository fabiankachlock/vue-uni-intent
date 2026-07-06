<script setup lang="ts">
import { button, key, mouseButton, type ShortcutDescriptor } from "vue-uni-intent";
import DemoButton from "../../components/DemoButton.vue";
import DemoPane from "./DemoPane.vue";
import EventLog from "./EventLog.vue";
import GamepadHint from "./GamepadHint.vue";
import { useLog } from "./useLog";

const { entries, say } = useLog();

const actions: { id: string; label: string; hint: string; shortcuts: ShortcutDescriptor[] }[] = [
  {
    id: "save",
    label: "Save",
    hint: "Ctrl+S",
    shortcuts: [key("s", { ctrl: true })],
  },
  {
    id: "search",
    label: "Search",
    hint: "/",
    shortcuts: [key("/")],
  },
  {
    id: "menu",
    label: "Menu",
    hint: "M · gamepad Start",
    shortcuts: [key("m"), button("Start")],
  },
  {
    id: "inspect",
    label: "Inspect",
    hint: "Right mouse button",
    shortcuts: [mouseButton("Right")],
  },
  {
    id: "back",
    label: "Back",
    hint: "Esc · gamepad B · mouse back button",
    shortcuts: [key("Escape"), button("B"), mouseButton("Back")],
  },
];
</script>

<template>
  <DemoPane
    help="Shortcuts fire their trigger no matter which one is focused. Each button below is still a
      normal trigger too — navigate and activate it, or use the shortcut listed underneath."
  >
    <GamepadHint />
    <div class="actions">
      <div v-for="action in actions" :key="action.id" class="action">
        <DemoButton
          :id="action.id"
          :label="action.label"
          :shortcuts="action.shortcuts"
          @trigger="say(`${action.label} triggered`)"
        />
        <span class="hint">{{ action.hint }}</span>
      </div>
    </div>
    <EventLog :entries="entries" />
  </DemoPane>
</template>

<style scoped>
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin: 2rem 0;
}

.action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.hint {
  color: var(--faint);
  font-family: var(--font-ui);
  font-size: 0.7rem;
  letter-spacing: 0.02em;
}
</style>

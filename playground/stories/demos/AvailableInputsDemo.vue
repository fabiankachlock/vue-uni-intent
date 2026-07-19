<script setup lang="ts">
import { computed } from "vue";
import { useAvailableInputs } from "vue-uni-intent";
import DemoButton from "../../components/DemoButton.vue";
import DemoPane from "./DemoPane.vue";
import { useLog } from "./useLog";

const { available, keyboard, mouse, touch, gamepad } = useAvailableInputs();
const { entries, say } = useLog();

const sources = computed(() => [
  {
    key: "keyboard",
    glyph: "⌨",
    label: "Keyboard",
    on: keyboard.value,
    detail: "Inferred from the primary pointer, then confirmed on the first real keydown.",
  },
  {
    key: "mouse",
    glyph: "🖱",
    label: "Mouse",
    on: mouse.value,
    detail: "A fine pointer exists — (any-pointer: fine).",
  },
  {
    key: "touch",
    glyph: "☝",
    label: "Touch",
    on: touch.value,
    detail: "A coarse pointer exists — (any-pointer: coarse).",
  },
  {
    key: "gamepad",
    glyph: "🎮",
    label: "Gamepad",
    on: gamepad.value,
    detail: "At least one controller is connected; toggles live.",
  },
]);

const setText = computed(() =>
  available.value.size ? [...available.value].sort().join(", ") : "∅ (none detected yet)",
);
</script>

<template>
  <DemoPane
    help="useAvailableInputs() reports which input sources can be used right now. Badges update
      live: press a key to confirm the keyboard, move or hover the mouse, tap on a touch device,
      or connect a controller. mouse and touch are tracked independently."
  >
    <div class="badges">
      <div v-for="s in sources" :key="s.key" class="badge" :class="{ on: s.on }">
        <span class="glyph" aria-hidden="true">{{ s.glyph }}</span>
        <span class="meta">
          <span class="name">
            {{ s.label }}
            <span class="state">{{ s.on ? "available" : "unavailable" }}</span>
          </span>
          <span class="detail">{{ s.detail }}</span>
        </span>
        <span class="dot" aria-hidden="true" />
      </div>
    </div>

    <p class="set">
      <code>available.value</code> → <span class="set-value">{{ setText }}</span>
    </p>

    <div class="actions">
      <DemoButton id="one" label="One" autofocus @trigger="say('One triggered')" />
      <DemoButton id="two" label="Two" @trigger="say('Two triggered')" />
      <DemoButton id="three" label="Three" @trigger="say('Three triggered')" />
    </div>

    <p class="foot">
      The buttons are ordinary triggers — navigate, hover, or activate them however you like; the
      badges above track whatever input you reach for.
    </p>
    <ul v-if="entries.length" class="log">
      <li v-for="(entry, i) in entries" :key="i">{{ entry }}</li>
    </ul>
  </DemoPane>
</template>

<style scoped>
.badges {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 0.75rem;
  margin: 1.5rem 0;
}

.badge {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--panel);
  opacity: 0.55;
  transition: opacity 0.15s, border-color 0.15s;
}

.badge.on {
  opacity: 1;
  border-color: var(--line-strong);
  background: var(--panel-raised);
}

.glyph {
  flex: none;
  font-size: 1.4rem;
  line-height: 1;
  filter: grayscale(1);
}

.badge.on .glyph {
  filter: none;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.name {
  font-family: var(--font-ui);
  font-size: 0.85rem;
  color: var(--ink);
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.state {
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--faint);
}

.badge.on .state {
  color: var(--ok);
}

.detail {
  font-size: 0.72rem;
  color: var(--muted);
}

.dot {
  flex: none;
  margin-left: auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--faint);
}

.badge.on .dot {
  background: var(--ok);
}

.set {
  font-family: var(--font-ui);
  font-size: 0.8rem;
  color: var(--muted);
}

.set code {
  color: var(--ink);
}

.set-value {
  color: var(--accent);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 2rem 0 1rem;
}

.foot {
  color: var(--faint);
  font-family: var(--font-ui);
  font-size: 0.72rem;
}

.log {
  margin: 0.5rem 0 0;
  padding: 0;
  list-style: none;
  font-family: var(--font-ui);
  font-size: 0.72rem;
  color: var(--muted);
}

.log li {
  padding: 0.15rem 0;
}
</style>

<script setup lang="ts">
import { ref } from "vue";
import { button, key, mouseButton } from "vue-uni-intent";
import DemoButton from "../../components/DemoButton.vue";
import EventLog from "./EventLog.vue";
import GamepadHint from "./GamepadHint.vue";
import OverlaySheet from "./OverlaySheet.vue";
import { useLog } from "./useLog";

const { entries, say } = useLog();

const screen = ref<"menu" | "settings" | "quit">("menu");
const hasSave = ref(false);

const music = ref(true);
const difficulties = ["Easy", "Normal", "Hard"] as const;
const difficulty = ref<(typeof difficulties)[number]>("Normal");

const cycleDifficulty = () => {
  const next = (difficulties.indexOf(difficulty.value) + 1) % difficulties.length;
  difficulty.value = difficulties[next] ?? "Normal";
  say(`Difficulty: ${difficulty.value}`);
};

const backShortcuts = [key("Escape"), button("B"), mouseButton("Back")];
</script>

<template>
  <div class="game">
    <h1>PAUSED</h1>
    <GamepadHint />

    <nav class="menu">
      <DemoButton
        id="continue"
        label="Continue"
        :disabled="!hasSave"
        @trigger="say('Continuing game')"
      />
      <DemoButton
        id="new-game"
        label="New Game"
        @trigger="
          hasSave = true;
          say('New game started, Continue is now enabled');
        "
      />
      <DemoButton id="settings" label="Settings" @trigger="screen = 'settings'" />
      <DemoButton id="quit" label="Quit" @trigger="screen = 'quit'" />
    </nav>

    <!-- Registered after the menu so initial focus stays there; their fixed
         position doesn't matter to navigation, only their DOM rects do. -->
    <div class="corner top-right">
      <DemoButton id="account" label="Account" @trigger="say('Account opened')" />
    </div>
    <div class="corner bottom-right">
      <DemoButton id="leaderboard" label="Leaderboard" @trigger="say('Leaderboard opened')" />
      <DemoButton id="stats" label="Stats" @trigger="say('Stats opened')" />
    </div>

    <p class="footer">
      <kbd>↑</kbd><kbd>↓</kbd> / D-pad / stick — move · <kbd>Enter</kbd> / <kbd>A</kbd> — select ·
      <kbd>Esc</kbd> / <kbd>B</kbd> — back
    </p>

    <OverlaySheet v-if="screen === 'settings'">
      <h2>Settings</h2>
      <DemoButton
        id="music"
        :label="`Music: ${music ? 'On' : 'Off'}`"
        autofocus
        @trigger="
          music = !music;
          say(`Music ${music ? 'on' : 'off'}`);
        "
      />
      <DemoButton
        id="difficulty"
        :label="`Difficulty: ${difficulty}`"
        @trigger="cycleDifficulty()"
      />
      <DemoButton id="back" label="Back" :shortcuts="backShortcuts" @trigger="screen = 'menu'" />
    </OverlaySheet>

    <OverlaySheet v-if="screen === 'quit'">
      <h2>Quit to desktop?</h2>
      <div class="quit-actions">
        <DemoButton
          id="quit-confirm"
          label="Quit"
          @trigger="
            screen = 'menu';
            say('Quit confirmed (the demo keeps running)');
          "
        />
        <DemoButton
          id="quit-cancel"
          label="Cancel"
          autofocus
          :shortcuts="backShortcuts"
          @trigger="screen = 'menu'"
        />
      </div>
    </OverlaySheet>

    <EventLog :entries="entries" />
  </div>
</template>

<style scoped>
.game {
  max-width: 32rem;
  margin: 0 auto;
  padding: 3rem 1rem 4rem;
  text-align: center;
}

h1 {
  font-family: var(--font-ui);
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.6em;
  text-indent: 0.6em;
  color: var(--ink);
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 2rem auto;
  max-width: 16rem;
}

.menu :deep(.demo-button) {
  width: 100%;
}

.footer {
  color: var(--faint);
  font-size: 0.8rem;
}

/* Detached screen regions — spatial navigation finds them from their DOM
   rects alone: move right from the menu to reach them. */
.corner {
  position: fixed;
  display: flex;
  gap: 1rem;
}

.top-right {
  top: 1.5rem;
  right: 1.5rem;
}

.bottom-right {
  bottom: 1.5rem;
  right: 1.5rem;
}

.quit-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}
</style>

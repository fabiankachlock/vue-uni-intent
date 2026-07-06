<script setup lang="ts">
import { useTrigger } from "vue-uni-intent";
import DemoButton from "../../components/DemoButton.vue";
import DemoPane from "./DemoPane.vue";
import EventLog from "./EventLog.vue";
import { useLog } from "./useLog";

const { entries, say } = useLog();

const {
  ref: el,
  focused,
  focus,
  trigger,
} = useTrigger({
  id: "target",
  onTrigger: () => say("Target triggered"),
});
</script>

<template>
  <DemoPane
    help="useTrigger() returns focus() and trigger() for driving a trigger from code. The plain
      buttons below are ordinary DOM buttons, not triggers — they call the returned functions."
  >
    <div class="row">
      <DemoButton id="left" label="Neighbor" @trigger="say('Neighbor triggered')" />
      <button ref="el" class="target" type="button">
        Target — {{ focused ? "focused" : "not focused" }}
      </button>
    </div>

    <div class="row">
      <button class="plain" type="button" @click="focus()">target.focus()</button>
      <button class="plain" type="button" @click="trigger()">target.trigger()</button>
    </div>

    <EventLog :entries="entries" />
  </DemoPane>
</template>

<style scoped>
.row {
  display: flex;
  gap: 1rem;
  margin: 2rem 0;
  flex-wrap: wrap;
  align-items: center;
}

.target {
  padding: 0.7rem 1.25rem;
  font-family: var(--font-ui);
  font-size: 0.85rem;
  letter-spacing: 0.03em;
  border: 1px dashed var(--line-strong);
  border-radius: 2px;
  background: var(--panel);
  color: var(--ink);
  cursor: pointer;
  outline: none;
}

.target[data-uni-focused] {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-ink);
}

.plain {
  padding: 0.45rem 0.9rem;
  font-family: var(--font-ui);
  font-size: 0.8rem;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.plain:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}
</style>

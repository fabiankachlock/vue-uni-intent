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
  padding: 1rem 1.5rem;
  font-size: 1rem;
  border: 2px solid #445;
  border-radius: 8px;
  background: #1c1c28;
  color: #eee;
  cursor: pointer;
  outline: none;
}

.target[data-uni-focused] {
  border-color: #fc7;
  background: #4a3a26;
}

.plain {
  padding: 0.5rem 1rem;
  font-family: monospace;
  border: 1px solid #667;
  border-radius: 6px;
  background: #223;
  color: #cce;
  cursor: pointer;
}
</style>

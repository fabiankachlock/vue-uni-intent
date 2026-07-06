<script setup lang="ts">
import { ref } from "vue";
import DemoButton from "../../components/DemoButton.vue";
import DemoPane from "./DemoPane.vue";
import EventLog from "./EventLog.vue";
import LayerPanel from "./LayerPanel.vue";
import { useLog } from "./useLog";

const MAX_DEPTH = 4;
const { entries, say } = useLog();
const depth = ref(0);

const push = () => {
  depth.value = Math.min(depth.value + 1, MAX_DEPTH);
  say(`Pushed layer ${depth.value}`);
};
const pop = () => {
  say(`Closed layer ${depth.value}`);
  depth.value = Math.max(depth.value - 1, 0);
};
</script>

<template>
  <DemoPane
    help="Layers stack: each panel pushes a new one, and Esc / gamepad B closes the topmost. Focus
      returns to the layer underneath when a panel closes."
  >
    <div class="row">
      <DemoButton id="root-a" label="Root button" @trigger="say('Root button triggered')" />
      <DemoButton id="root-push" label="Push layer" @trigger="push()" />
    </div>

    <LayerPanel
      v-for="d in depth"
      :key="d"
      :depth="d"
      :max-depth="MAX_DEPTH"
      @push="push()"
      @close="pop()"
    />

    <EventLog :entries="entries" />
  </DemoPane>
</template>

<style scoped>
.row {
  display: flex;
  gap: 1rem;
  margin: 2rem 0;
  flex-wrap: wrap;
}
</style>

<script setup lang="ts">
import { ref } from "vue";
import ConfirmModal from "../../components/ConfirmModal.vue";
import DemoButton from "../../components/DemoButton.vue";
import DemoPane from "./DemoPane.vue";
import EventLog from "./EventLog.vue";
import { useLog } from "./useLog";

const { entries, say } = useLog();
const modalOpen = ref(false);

const cells = Array.from({ length: 4 }, (_, i) => ({
  id: `cell-${i + 1}`,
  label: `Button ${i + 1}`,
}));
</script>

<template>
  <DemoPane
    help="Opening the modal pushes a new trigger layer: navigation and shortcuts are confined to it
      while it is topmost, and the layer below keeps its focus for when the modal closes."
  >
    <div class="row">
      <DemoButton
        v-for="cell in cells"
        :id="cell.id"
        :key="cell.id"
        :label="cell.label"
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

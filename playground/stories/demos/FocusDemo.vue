<script setup lang="ts">
import DemoButton from "../../components/DemoButton.vue";
import DemoPane from "./DemoPane.vue";
import EventLog from "./EventLog.vue";
import { useLog } from "./useLog";

withDefaults(
  defineProps<{
    /** 1-based cell that declares `autofocus`. */
    autofocusCell?: number;
    help?: string;
  }>(),
  { autofocusCell: 3 },
);

const { entries, say } = useLog();

const cells = Array.from({ length: 5 }, (_, i) => ({
  id: `cell-${i + 1}`,
  label: `Button ${i + 1}`,
}));
</script>

<template>
  <DemoPane :help="help">
    <div class="row">
      <DemoButton
        v-for="(cell, i) in cells"
        :id="cell.id"
        :key="cell.id"
        :label="i + 1 === autofocusCell ? `${cell.label} ★` : cell.label"
        :autofocus="i + 1 === autofocusCell"
        @trigger="say(`${cell.label} triggered`)"
      />
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
}
</style>

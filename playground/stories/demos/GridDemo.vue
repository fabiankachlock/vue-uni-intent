<script setup lang="ts">
import { computed } from "vue";
import DemoButton from "../../components/DemoButton.vue";
import DemoPane from "./DemoPane.vue";
import EventLog from "./EventLog.vue";
import { useLog } from "./useLog";

const props = withDefaults(
  defineProps<{
    columns?: number;
    rows?: number;
    /** 1-based cell numbers that render as disabled triggers. */
    disabledCells?: number[];
    help?: string;
  }>(),
  { columns: 4, rows: 3, disabledCells: () => [] },
);

const { entries, say } = useLog();

const cells = computed(() =>
  Array.from({ length: props.columns * props.rows }, (_, i) => ({
    id: `cell-${i + 1}`,
    label: `Button ${i + 1}`,
    disabled: props.disabledCells.includes(i + 1),
  })),
);
</script>

<template>
  <DemoPane :help="help">
    <div class="grid" :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }">
      <DemoButton
        v-for="cell in cells"
        :id="cell.id"
        :key="cell.id"
        :label="cell.label"
        :disabled="cell.disabled"
        @trigger="say(`${cell.label} triggered`)"
      />
    </div>
    <EventLog :entries="entries" />
  </DemoPane>
</template>

<style scoped>
.grid {
  display: grid;
  gap: 1rem;
  margin: 2rem 0;
}
</style>

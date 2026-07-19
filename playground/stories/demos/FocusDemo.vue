<script setup lang="ts">
import type { FocusCause } from "vue-uni-intent";
import DemoButton from "../../components/DemoButton.vue";
import DemoPane from "./DemoPane.vue";
import EventLog from "./EventLog.vue";
import { useLog } from "./useLog";

withDefaults(
  defineProps<{
    /** 1-based cell that declares `autofocus`. */
    autofocusCell?: number;
    /** Log the FocusCause of each focus change (demonstrates onFocus). */
    logFocusCause?: boolean;
    help?: string;
  }>(),
  { autofocusCell: 3 },
);

const { entries, say } = useLog();

const cells = Array.from({ length: 5 }, (_, i) => ({
  id: `cell-${i + 1}`,
  label: `Button ${i + 1}`,
}));

/** Format a FocusCause into a short, readable log line. */
function describeFocus(label: string, cause: FocusCause): string {
  const detail = cause.direction ? `${cause.via} ${cause.direction}` : cause.via;
  return `${label} focused — via ${detail} (source: ${cause.source})`;
}
</script>

<template>
  <DemoPane :help="help">
    <div class="row">
      <DemoButton
        v-for="(cell, i) in cells"
        :id="cell.id"
        :key="cell.id"
        :label="i + 1 === autofocusCell ? `${cell.label} (autofocus)` : cell.label"
        :autofocus="i + 1 === autofocusCell"
        @trigger="say(`${cell.label} triggered`)"
        @focus="logFocusCause && say(describeFocus(cell.label, $event))"
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

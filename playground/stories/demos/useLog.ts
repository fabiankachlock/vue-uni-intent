import { ref } from "vue";

/** Tiny rolling event log shared by the demos. */
export function useLog(limit = 8) {
  const entries = ref<string[]>([]);
  const say = (message: string) => {
    entries.value = [message, ...entries.value].slice(0, limit);
  };
  return { entries, say };
}

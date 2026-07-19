import { shallowRef, type ShallowRef } from 'vue'

/**
 * Tracks which input sources are currently usable. The core stays
 * input-agnostic: adapters report their own availability by name via
 * `AdapterContext.setAvailable` (keyboard/mouse are usable whenever installed;
 * a gamepad comes and goes with its connection), and this only stores the
 * strings. Surfaced to consumers through `useAvailableInputs()`.
 */
export class AvailabilityRegistry {
  /**
   * Reactive set of available source names. Reassigned immutably on every
   * change so a `shallowRef` is enough — consumers read a fresh `ReadonlySet`.
   */
  readonly available: ShallowRef<ReadonlySet<string>> = shallowRef(new Set())

  /** Mark `source` available or not. No-op (no reactive churn) if unchanged. */
  set(source: string, available: boolean): void {
    if (this.available.value.has(source) === available) return
    const next = new Set(this.available.value)
    if (available) next.add(source)
    else next.delete(source)
    this.available.value = next
  }
}

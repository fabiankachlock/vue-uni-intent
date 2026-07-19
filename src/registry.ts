import { shallowReactive } from 'vue'
import type { FocusCause, ShortcutDescriptor, TriggerCause, TriggerId } from './types'

export type TriggerRecord = {
  id: TriggerId
  layerId: string
  /** Set once the template ref mounts; `null` for element-less shortcut triggers. */
  element: HTMLElement | null
  isDisabled: () => boolean
  shortcuts: ShortcutDescriptor[]
  autofocus: boolean
  onTrigger: (cause: TriggerCause) => void
  onFocus?: (cause: FocusCause) => void
  /** Registration counter for stable ordering and tie-breaking. */
  order: number
}

const recordKey = (id: TriggerId, layerId: string) => `${layerId}-${id}`

export class TriggerRegistry {
  /** Reactive so layer/focus computeds re-evaluate on register/deregister. */
  private records = shallowReactive(new Map<string, TriggerRecord>())
  private elements = new Map<HTMLElement, TriggerRecord>()
  private counter = 0

  register(record: Omit<TriggerRecord, 'order'>): TriggerRecord {
    const key = recordKey(record.id, record.layerId)
    if (import.meta.env.DEV && this.records.has(key)) {
      console.warn(
        `[vue-uni-intent] Duplicate trigger id "${record.id}" in layer "${record.layerId}". ` +
          `The previous registration will be replaced.`,
      )
    }
    const full: TriggerRecord = { ...record, order: this.counter++ }
    this.records.set(key, full)
    return full
  }

  deregister(id: TriggerId, layerId: string): void {
    const key = recordKey(id, layerId)
    const record = this.records.get(key)
    if (!record) return
    if (record.element) this.elements.delete(record.element)
    this.records.delete(key)
  }

  setElement(record: TriggerRecord, element: HTMLElement | null): void {
    if (record.element) this.elements.delete(record.element)
    record.element = element
    if (element) this.elements.set(element, record)
  }

  get(id: TriggerId, layerId: string): TriggerRecord | undefined {
    return this.records.get(recordKey(id, layerId))
  }

  /** Every registered record (any layer), unordered. */
  all(): TriggerRecord[] {
    return [...this.records.values()]
  }

  /** Records of one layer, in registration order. */
  inLayer(layerId: string): TriggerRecord[] {
    const result: TriggerRecord[] = []
    for (const record of this.records.values()) {
      if (record.layerId === layerId) result.push(record)
    }
    return result.sort((a, b) => a.order - b.order)
  }

  byElement(el: Element): TriggerRecord | undefined {
    return this.elements.get(el as HTMLElement)
  }
}

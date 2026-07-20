import { nextTick, shallowRef } from 'vue'
import type { LayerHandle, LayerManager } from './layers'
import { ROOT_LAYER_ID } from './layers'
import { findNext, type NavCandidate } from './navigation'
import type { TriggerRecord, TriggerRegistry } from './registry'
import type { Direction, FocusCause, TriggerCause, TriggerId } from './types'

export type FocusManagerOptions = {
  wrap: boolean
  initialFocus: 'first' | 'none'
  /** How to scroll the focused element into view; `false` never scrolls. */
  scroll: false | ScrollIntoViewOptions
  /** `scroll-margin` shorthand to set on the focused element before scrolling, or `null`. */
  scrollMargin: string | null
}

/**
 * Owns the single-focus invariant: which trigger is focused, how focus moves
 * spatially, and how it is mirrored to the DOM (real `element.focus()` for
 * a11y, `data-uni-focused` for styling). Every active-layer trigger stays
 * tabbable (`tabIndex 0`) so native Tab moves between triggers; `focusin`
 * adopts each landing back into the single-focus state.
 */
export class FocusManager {
  readonly focusedRecord = shallowRef<TriggerRecord | null>(null)
  /** Guards the focusin listener against our own element.focus() calls. */
  private syncingDom = false
  private pendingAutoFocus = false
  private focusinTarget: Window | null = null

  constructor(
    private registry: TriggerRegistry,
    private layers: LayerManager,
    private options: FocusManagerOptions,
  ) {}

  /** Focus a trigger of the active layer. No-op for other layers or disabled triggers. */
  focus(record: TriggerRecord | null, cause?: FocusCause): void {
    if (record && (record.layerId !== this.activeLayerId() || record.isDisabled())) return
    this.setFocused(record, { cause })
  }

  focusId(id: TriggerId, cause?: FocusCause): void {
    const record = this.registry.get(id, this.activeLayerId())
    if (record) this.focus(record, cause ?? { source: 'core', via: 'focus' })
  }

  /** Fire the focused trigger, forwarding what caused it. */
  activate(cause: TriggerCause): void {
    const record = this.focusedRecord.value
    if (!record || record.isDisabled()) return
    record.onTrigger(cause)
  }

  /** Move focus via spatial navigation over the active layer's on-screen triggers. */
  move(direction: Direction, cause?: FocusCause): void {
    const focusCause: FocusCause = cause ?? { source: 'core', via: 'navigate', direction }
    const layerId = this.activeLayerId()
    const candidates: NavCandidate[] = []
    const byId = new Map<TriggerId, TriggerRecord>()
    for (const record of this.registry.inLayer(layerId)) {
      if (record.isDisabled() || !record.element) continue
      const rect = record.element.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      candidates.push({ id: record.id, rect })
      byId.set(record.id, record)
    }
    if (candidates.length === 0) return

    const current = this.focusedRecord.value
    const from =
      current && current.layerId === layerId
        ? candidates.find((c) => c.id === current.id)
        : undefined
    if (!from) {
      // Nothing (visible) focused in this layer yet — adopt the first trigger.
      this.focus(byId.get(candidates[0]!.id)!, focusCause)
      return
    }

    const nextId = findNext(
      from,
      candidates.filter((c) => c !== from),
      direction,
      { wrap: this.options.wrap },
    )
    if (nextId) this.focus(byId.get(nextId)!, focusCause)
  }

  /**
   * Resolve focus for a layer that just became active: focus memory (on
   * restore), the layer's `initialFocus`, an `autofocus` trigger, or the first
   * registered one. Clears focus when the layer has no focusable triggers.
   */
  applyLayerFocus(
    layer: LayerHandle,
    { preferMemory, cause }: { preferMemory: boolean; cause?: FocusCause },
  ): void {
    const records = this.registry.inLayer(layer.id).filter((r) => !r.isDisabled())
    const remembered =
      preferMemory && layer.focusMemory
        ? records.find((r) => r.id === layer.focusMemory)
        : undefined
    const target =
      remembered ??
      (layer.initialFocus ? records.find((r) => r.id === layer.initialFocus) : undefined) ??
      records.find((r) => r.autofocus) ??
      records[0] ??
      null
    this.setFocused(target, {
      cause: cause ?? { source: 'core', via: remembered ? 'restore' : 'initial' },
    })
  }

  /**
   * Called when a trigger's element mounts while nothing is focused — resolves
   * initial focus on the next tick so all triggers of the same render batch
   * (and their `autofocus` flags) are considered together.
   */
  scheduleAutoFocus(layerId: string): void {
    if (layerId === ROOT_LAYER_ID && this.options.initialFocus === 'none') return
    if (this.focusedRecord.value || this.pendingAutoFocus) return
    if (layerId !== this.activeLayerId()) return
    this.pendingAutoFocus = true
    void nextTick(() => {
      this.pendingAutoFocus = false
      const layer = this.layers.activeLayer.value
      if (layer.id === layerId && !this.focusedRecord.value) {
        this.applyLayerFocus(layer, { preferMemory: false })
      }
    })
  }

  /**
   * Apply DOM focus state to a record whose element arrived AFTER it became
   * focused (a layer can take focus before its triggers' template refs settle).
   */
  syncElementFocus(record: TriggerRecord): void {
    if (this.focusedRecord.value !== record || !record.element) return
    record.element.setAttribute('data-uni-focused', '')
    record.element.tabIndex = 0
    this.applyDomFocus(record, true)
  }

  /**
   * Put an element in or out of the native Tab order: tabbable (`0`) while its
   * trigger is in the active layer and enabled, otherwise `-1`. Every trigger of
   * the active layer stays tabbable so Tab moves between them (not roving); the
   * `focusin` listener adopts wherever Tab lands.
   */
  applyTabbability(record: TriggerRecord): void {
    if (!record.element) return
    record.element.tabIndex =
      record.layerId === this.activeLayerId() && !record.isDisabled() ? 0 : -1
  }

  /** Re-apply tabbability to every trigger — used when the active layer changes. */
  refreshTabbability(): void {
    for (const record of this.registry.all()) this.applyTabbability(record)
  }

  /**
   * Give an element real focus, then scroll it into view ourselves. We always
   * focus with `preventScroll` so the browser's minimal "nearest edge" scroll
   * can't tuck the target under a sticky header; the follow-up `scrollIntoView`
   * honors CSS `scroll-margin`/`scroll-padding` and any consumer override.
   */
  private applyDomFocus(record: TriggerRecord, scroll: boolean): void {
    const element = record.element
    if (!element) return
    this.syncingDom = true
    try {
      element.focus({ preventScroll: true })
    } finally {
      this.syncingDom = false
    }
    if (scroll && this.options.scroll && typeof element.scrollIntoView === 'function') {
      // `scroll-margin` keeps the target off the scrollport edges — the way to
      // clear a sticky header — and `scrollIntoView` honors it natively. A
      // per-trigger `scrollMargin` overrides the global one for this element.
      const margin = record.scrollMargin ?? this.options.scrollMargin
      if (margin !== null) element.style.scrollMargin = margin
      element.scrollIntoView(this.options.scroll)
    }
  }

  /**
   * Whether to scroll a freshly focused element into view. Pointer-driven focus
   * (mouse hover/click, touch tap) targets an element already under the cursor —
   * on-screen by construction — so scrolling it is not just pointless but a hard
   * hazard: Firefox re-dispatches `mouseover` for whatever ends up under the
   * still cursor after a programmatic scroll, which re-focuses, re-scrolls, and
   * loops the page into a freeze. Only non-pointer focus (navigation, restore,
   * autofocus, programmatic) can land off-screen and needs the scroll.
   */
  private shouldScroll(cause?: FocusCause): boolean {
    return cause?.source !== 'mouse'
  }

  /** Keep focus valid when the focused trigger deregisters (e.g. `v-if`). */
  onTriggerRemoved(record: TriggerRecord): void {
    if (this.focusedRecord.value !== record) return
    this.focusedRecord.value = null
    const layer = this.layers.activeLayer.value
    if (layer.id === record.layerId) {
      this.applyLayerFocus(layer, {
        preferMemory: false,
        cause: { source: 'core', via: 'cleanup' },
      })
    }
  }

  /** Adopt native focus changes (e.g. Tab) into the abstract focus state. */
  attachFocusinSync(target: Window): void {
    this.focusinTarget = target
    target.addEventListener('focusin', this.handleFocusin)
  }

  detachFocusinSync(): void {
    this.focusinTarget?.removeEventListener('focusin', this.handleFocusin)
    this.focusinTarget = null
  }

  private handleFocusin = (event: FocusEvent): void => {
    if (this.syncingDom) return
    if (!(event.target instanceof Element)) return
    const record = this.registry.byElement(event.target)
    if (!record || record === this.focusedRecord.value) return
    if (record.layerId !== this.activeLayerId() || record.isDisabled()) return
    // The element already has native focus — sync state and attributes only.
    this.setFocused(record, { skipNativeFocus: true, cause: { source: 'core', via: 'tab', event } })
  }

  private activeLayerId(): string {
    return this.layers.activeLayer.value.id
  }

  private setFocused(
    record: TriggerRecord | null,
    { skipNativeFocus = false, cause }: { skipNativeFocus?: boolean; cause?: FocusCause } = {},
  ): void {
    const prev = this.focusedRecord.value
    if (prev === record) return
    this.focusedRecord.value = record
    if (record) {
      const layer = this.layers.activeLayer.value
      if (layer.id === record.layerId) layer.focusMemory = record.id
    }

    if (prev?.element) {
      prev.element.removeAttribute('data-uni-focused')
      // Not focused anymore, but still tabbable if it stays in the active layer.
      this.applyTabbability(prev)
    }
    if (record?.element) {
      record.element.setAttribute('data-uni-focused', '')
      record.element.tabIndex = 0
      if (!skipNativeFocus) this.applyDomFocus(record, this.shouldScroll(cause))
    }

    // Notify after DOM state is consistent, so handlers observing focus see it.
    if (record) record.onFocus?.(cause ?? { source: 'core', via: 'initial' })
  }
}

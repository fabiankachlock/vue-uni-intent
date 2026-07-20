import type { AdapterContext } from './adapters/types'
import { AvailabilityRegistry } from './availability'
import { FocusManager } from './focus'
import { LayerManager } from './layers'
import { TriggerRegistry } from './registry'
import { findShortcutTarget } from './shortcuts'
import type { UniIntentOptions } from './types'

export type ResolvedOptions = {
  wrap: boolean
  initialFocus: 'first' | 'none'
  /** Resolved scroll behavior: `false` = don't scroll, otherwise options for `scrollIntoView`. */
  scroll: false | ScrollIntoViewOptions
  /** Resolved `scroll-margin` shorthand (CSS) to set on the focused element, or `null` to leave it. */
  scrollMargin: string | null
}

const DEFAULT_SCROLL: ScrollIntoViewOptions = { block: 'nearest', inline: 'nearest' }

/** Normalize a `scrollMargin` option (number of px, or per-side) to a CSS `scroll-margin` string. */
export function resolveScrollMargin(margin: UniIntentOptions['scrollMargin']): string | null {
  if (margin == null) return null
  if (typeof margin === 'number') return `${margin}px`
  const { top = 0, right = 0, bottom = 0, left = 0 } = margin
  return `${top}px ${right}px ${bottom}px ${left}px`
}

/** Per-app state — created in `install()`, never module-global. */
export type InputContext = {
  registry: TriggerRegistry
  layers: LayerManager
  focus: FocusManager
  availability: AvailabilityRegistry
  options: ResolvedOptions
  adapterContext: AdapterContext
  /**
   * Layers keyed by the component instance that declared them. Vue's
   * provide/inject only reaches descendants, so this lets `useTrigger` find a
   * `useTriggerLayer` declared earlier in the SAME component's setup.
   */
  ownLayers: WeakMap<object, string>
}

export function createInputContext(options: UniIntentOptions): InputContext {
  const scroll = options.scroll ?? true
  const resolved: ResolvedOptions = {
    wrap: options.wrap ?? false,
    initialFocus: options.initialFocus ?? 'first',
    scroll: scroll === true ? DEFAULT_SCROLL : scroll,
    scrollMargin: resolveScrollMargin(options.scrollMargin),
  }

  const registry = new TriggerRegistry()
  const layers = new LayerManager()
  const focus = new FocusManager(registry, layers, resolved)
  const availability = new AvailabilityRegistry()
  layers.attachFocus(focus)

  const adapterContext: AdapterContext = {
    move: (direction, cause) => focus.move(direction, cause),
    activate: (cause) => focus.activate(cause),
    focus: (id, cause) => focus.focusId(id, cause),
    dispatchShortcut: (input, cause) => {
      const records = registry.inLayer(layers.activeLayer.value.id)
      const target = findShortcutTarget(input, records)
      if (!target) return false
      target.onTrigger(cause)
      return true
    },
    isRegisteredElement: (el) => {
      const record = registry.byElement(el)
      if (!record || record.layerId !== layers.activeLayer.value.id) return null
      return record.id
    },
    setAvailable: (source, available) => availability.set(source, available),
  }

  return {
    registry,
    layers,
    focus,
    availability,
    options: resolved,
    adapterContext,
    ownLayers: new WeakMap(),
  }
}

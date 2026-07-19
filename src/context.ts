import type { AdapterContext } from './adapters/types'
import { FocusManager } from './focus'
import { LayerManager } from './layers'
import { TriggerRegistry } from './registry'
import { findShortcutTarget } from './shortcuts'
import type { UniIntentOptions } from './types'

export type ResolvedOptions = {
  wrap: boolean
  initialFocus: 'first' | 'none'
}

/** Per-app state — created in `install()`, never module-global. */
export type InputContext = {
  registry: TriggerRegistry
  layers: LayerManager
  focus: FocusManager
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
  const resolved: ResolvedOptions = {
    wrap: options.wrap ?? false,
    initialFocus: options.initialFocus ?? 'first',
  }

  const registry = new TriggerRegistry()
  const layers = new LayerManager()
  const focus = new FocusManager(registry, layers, resolved)
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
  }

  return { registry, layers, focus, options: resolved, adapterContext, ownLayers: new WeakMap() }
}

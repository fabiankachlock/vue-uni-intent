import {
  computed,
  getCurrentInstance,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowReactive,
  type ComputedRef,
} from 'vue'
import type { FocusManager } from './focus'
import { INPUT_CONTEXT_KEY, LAYER_ID_KEY } from './keys'
import type { TriggerId, UseTriggerLayerOptions, UseTriggerLayerReturn } from './types'

export const ROOT_LAYER_ID = '__root__'

export type LayerHandle = {
  id: string
  /** Last focused trigger in this layer, restored when the layer becomes active again. */
  focusMemory: TriggerId | null
  initialFocus?: TriggerId
}

/**
 * Stack of focus layers. The topmost layer owns navigation, activation and
 * shortcuts; the root layer is always present at the bottom.
 */
export class LayerManager {
  private stack = shallowReactive<LayerHandle[]>([{ id: ROOT_LAYER_ID, focusMemory: null }])
  readonly activeLayer: ComputedRef<LayerHandle>
  /** Wired in context assembly (mutual dependency with FocusManager). */
  private focus: FocusManager | null = null

  constructor() {
    this.activeLayer = computed(() => this.stack[this.stack.length - 1]!)
  }

  attachFocus(focus: FocusManager): void {
    this.focus = focus
  }

  push(handle: LayerHandle): void {
    if (import.meta.env.DEV && this.stack.some((layer) => layer.id === handle.id)) {
      console.warn(`[vue-uni-intent] Layer "${handle.id}" is already on the stack.`)
    }
    this.stack.push(handle)
    this.focus?.applyLayerFocus(handle, { preferMemory: false })
  }

  remove(id: string): void {
    if (id === ROOT_LAYER_ID) return
    const index = this.stack.findIndex((layer) => layer.id === id)
    if (index === -1) return
    const wasActive = index === this.stack.length - 1
    this.stack.splice(index, 1)
    if (wasActive) {
      this.focus?.applyLayerFocus(this.activeLayer.value, { preferMemory: true })
    }
  }
}

let layerCounter = 0

/**
 * Scope all descendant `useTrigger` calls to a new focus layer for this
 * component's lifetime. While mounted (and topmost), navigation and shortcuts
 * are confined to the layer's triggers; unmounting restores the previous
 * layer's focus.
 */
export function useTriggerLayer(options: UseTriggerLayerOptions = {}): UseTriggerLayerReturn {
  const ctx = inject(INPUT_CONTEXT_KEY)
  if (!ctx) {
    throw new Error(
      '[vue-uni-intent] useTriggerLayer() requires the vue-uni-intent plugin. ' +
        'Install it with app.use(createUniIntent({ adapters: [...] })).',
    )
  }

  const id = options.id ?? `layer-${++layerCounter}`
  const handle: LayerHandle = { id, focusMemory: null, initialFocus: options.initialFocus }

  provide(LAYER_ID_KEY, id)
  // provide() only reaches descendants — also expose the layer to useTrigger
  // calls later in this same component's setup.
  const instance = getCurrentInstance()
  if (instance) ctx.ownLayers.set(instance, id)
  // Push on mount so the layer's triggers (children mount first) are already
  // registered when initial focus resolves.
  onMounted(() => ctx.layers.push(handle))
  // Remove before children deregister so focus restores to the previous layer
  // instead of chasing disappearing triggers.
  onBeforeUnmount(() => ctx.layers.remove(id))

  return {
    id,
    isActive: computed(() => ctx.layers.activeLayer.value.id === id),
  }
}

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FocusManager } from '../focus'
import { LayerManager, ROOT_LAYER_ID } from '../layers'
import { TriggerRegistry, type TriggerRecord } from '../registry'
import type { TriggerCause } from '../types'

type TriggerSetup = {
  id: string
  layerId?: string
  x?: number
  y?: number
  disabled?: boolean
  autofocus?: boolean
  onTrigger?: (cause: TriggerCause) => void
}

let registry: TriggerRegistry
let layers: LayerManager
let focus: FocusManager

function makeTrigger({
  id,
  layerId = ROOT_LAYER_ID,
  x = 0,
  y = 0,
  disabled = false,
  autofocus = false,
  onTrigger = vi.fn<(cause: TriggerCause) => void>(),
}: TriggerSetup): TriggerRecord {
  const element = document.createElement('button')
  // jsdom has no layout — stub the rect used by spatial navigation.
  element.getBoundingClientRect = () =>
    ({ x, y, width: 100, height: 40, top: y, left: x, right: x + 100, bottom: y + 40 }) as DOMRect
  document.body.appendChild(element)
  const record = registry.register({
    id,
    layerId,
    element: null,
    isDisabled: () => disabled,
    shortcuts: [],
    autofocus,
    onTrigger,
  })
  registry.setElement(record, element)
  return record
}

beforeEach(() => {
  document.body.innerHTML = ''
  registry = new TriggerRegistry()
  layers = new LayerManager()
  focus = new FocusManager(registry, layers, { wrap: false, initialFocus: 'first' })
  layers.attachFocus(focus)
})

describe('FocusManager', () => {
  it('focuses, mirrors DOM state, and activates', () => {
    const onTrigger = vi.fn<(cause: TriggerCause) => void>()
    const a = makeTrigger({ id: 'a', onTrigger })
    const b = makeTrigger({ id: 'b', x: 200 })

    focus.focus(a)
    expect(focus.focusedRecord.value).toBe(a)
    expect(a.element!.hasAttribute('data-uni-focused')).toBe(true)
    expect(a.element!.tabIndex).toBe(0)
    expect(document.activeElement).toBe(a.element)

    focus.focus(b)
    expect(a.element!.hasAttribute('data-uni-focused')).toBe(false)
    expect(a.element!.tabIndex).toBe(-1)
    expect(b.element!.hasAttribute('data-uni-focused')).toBe(true)

    const cause = { source: 'test', via: 'activate' } as const
    focus.activate(cause)
    expect(onTrigger).not.toHaveBeenCalled()
    focus.focus(a)
    focus.activate(cause)
    expect(onTrigger).toHaveBeenCalledWith(cause)
  })

  it('moves spatially and skips disabled triggers', () => {
    const a = makeTrigger({ id: 'a', x: 0 })
    makeTrigger({ id: 'b', x: 200, disabled: true })
    const c = makeTrigger({ id: 'c', x: 400 })

    focus.focus(a)
    focus.move('right')
    expect(focus.focusedRecord.value).toBe(c)
  })

  it('adopts the first trigger when moving with nothing focused', () => {
    const a = makeTrigger({ id: 'a' })
    makeTrigger({ id: 'b', x: 200 })

    focus.move('right')
    expect(focus.focusedRecord.value).toBe(a)
  })

  it('refuses to focus disabled triggers', () => {
    const a = makeTrigger({ id: 'a', disabled: true })
    focus.focus(a)
    expect(focus.focusedRecord.value).toBeNull()
  })

  it('refocuses the layer when the focused trigger is removed', () => {
    const a = makeTrigger({ id: 'a' })
    const b = makeTrigger({ id: 'b', x: 200 })

    focus.focus(b)
    registry.deregister('b', ROOT_LAYER_ID)
    focus.onTriggerRemoved(b)
    expect(focus.focusedRecord.value).toBe(a)
  })

  it('adopts native focusin events for registered elements', () => {
    const a = makeTrigger({ id: 'a' })
    const b = makeTrigger({ id: 'b', x: 200 })
    focus.attachFocusinSync(window)
    focus.focus(a)

    // Simulate a Tab landing on b.
    b.element!.focus()
    b.element!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(focus.focusedRecord.value).toBe(b)
    expect(b.element!.hasAttribute('data-uni-focused')).toBe(true)

    focus.detachFocusinSync()
  })
})

describe('LayerManager', () => {
  it('confines navigation to the active layer and restores focus on remove', () => {
    const rootA = makeTrigger({ id: 'a' })
    const rootB = makeTrigger({ id: 'b', x: 200 })
    focus.focus(rootB)

    const modalLayer = { id: 'modal', focusMemory: null }
    const modalA = makeTrigger({ id: 'a', layerId: 'modal', y: 500 })
    makeTrigger({ id: 'cancel', layerId: 'modal', x: 200, y: 500 })
    layers.push(modalLayer)

    // Initial focus lands in the modal.
    expect(focus.focusedRecord.value).toBe(modalA)

    // Navigation cannot reach root triggers behind the modal.
    focus.move('up')
    expect(focus.focusedRecord.value).toBe(modalA)
    focus.move('right')
    expect(focus.focusedRecord.value?.id).toBe('cancel')
    expect(focus.focusedRecord.value?.layerId).toBe('modal')

    // Closing the modal restores the root layer's remembered focus.
    layers.remove('modal')
    expect(focus.focusedRecord.value).toBe(rootB)
    expect(rootA.element!.hasAttribute('data-uni-focused')).toBe(false)
  })

  it('respects initialFocus and autofocus when a layer activates', () => {
    makeTrigger({ id: 'a', layerId: 'menu' })
    const b = makeTrigger({ id: 'b', layerId: 'menu', x: 200, autofocus: true })
    const c = makeTrigger({ id: 'c', layerId: 'menu', x: 400 })

    layers.push({ id: 'menu', focusMemory: null, initialFocus: 'c' })
    expect(focus.focusedRecord.value).toBe(c)
    layers.remove('menu')

    layers.push({ id: 'menu', focusMemory: null })
    expect(focus.focusedRecord.value).toBe(b)
  })

  it('keeps focus when a non-topmost layer is removed', () => {
    makeTrigger({ id: 'a' })
    const menuA = makeTrigger({ id: 'a', layerId: 'menu', y: 300 })
    const modalA = makeTrigger({ id: 'a', layerId: 'modal', y: 600 })

    layers.push({ id: 'menu', focusMemory: null })
    layers.push({ id: 'modal', focusMemory: null })
    expect(focus.focusedRecord.value).toBe(modalA)

    layers.remove('menu')
    expect(focus.focusedRecord.value).toBe(modalA)

    // Removing the modal now falls through to the root layer.
    layers.remove('modal')
    expect(focus.focusedRecord.value?.layerId).toBe(ROOT_LAYER_ID)
    expect(menuA).toBeDefined()
  })

  it('clears focus when the active layer has no focusable triggers', () => {
    const a = makeTrigger({ id: 'a' })
    focus.focus(a)
    layers.push({ id: 'empty', focusMemory: null })
    expect(focus.focusedRecord.value).toBeNull()
    layers.remove('empty')
    expect(focus.focusedRecord.value).toBe(a)
  })
})

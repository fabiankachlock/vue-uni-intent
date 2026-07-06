import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { keyboardAdapter } from '../adapters/keyboard'
import type { AdapterContext } from '../adapters/types'

let ctx: {
  move: Mock
  activate: Mock
  focus: Mock
  dispatchShortcut: Mock
  isRegisteredElement: Mock
}
let adapter: ReturnType<typeof keyboardAdapter>

function press(
  key: string,
  init: KeyboardEventInit & { target?: HTMLElement } = {},
): KeyboardEvent {
  const { target, ...eventInit } = init
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...eventInit })
  ;(target ?? document.body).dispatchEvent(event)
  return event
}

function setup(options?: Parameters<typeof keyboardAdapter>[0], shortcutHandled = false) {
  ctx = {
    move: vi.fn<() => void>(),
    activate: vi.fn<() => void>(),
    focus: vi.fn<() => void>(),
    dispatchShortcut: vi.fn<() => boolean>(() => shortcutHandled),
    isRegisteredElement: vi.fn<() => string | null>(() => null),
  }
  adapter = keyboardAdapter(options)
  adapter.setup(ctx as unknown as AdapterContext)
}

beforeEach(() => setup())
afterEach(() => {
  adapter.teardown()
  document.body.innerHTML = ''
})

describe('keyboardAdapter', () => {
  it('maps arrow keys to moves and prevents scrolling', () => {
    const event = press('ArrowRight')
    expect(ctx.move).toHaveBeenCalledWith('right')
    expect(event.defaultPrevented).toBe(true)

    press('ArrowUp')
    expect(ctx.move).toHaveBeenCalledWith('up')
  })

  it('activates on Enter and Space with preventDefault (no synthetic click)', () => {
    const enter = press('Enter')
    const space = press(' ')
    expect(ctx.activate).toHaveBeenCalledTimes(2)
    expect(enter.defaultPrevented).toBe(true)
    expect(space.defaultPrevented).toBe(true)
  })

  it('supports custom key bindings', () => {
    adapter.teardown()
    setup({ keys: { up: ['w'], down: ['s'], left: ['a'], right: ['d'], activate: ['e'] } })

    press('w')
    expect(ctx.move).toHaveBeenCalledWith('up')
    press('e')
    expect(ctx.activate).toHaveBeenCalledOnce()
    press('ArrowUp')
    expect(ctx.move).toHaveBeenCalledTimes(1)
  })

  it('dispatches shortcuts before navigation and stops when handled', () => {
    adapter.teardown()
    setup(undefined, true)

    const event = press('ArrowRight', { shiftKey: true })
    expect(ctx.dispatchShortcut).toHaveBeenCalledWith({
      kind: 'key',
      key: 'ArrowRight',
      ctrl: false,
      shift: true,
      alt: false,
      meta: false,
    })
    expect(ctx.move).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(true)
  })

  it('ignores navigation keys with modifiers held', () => {
    press('ArrowRight', { ctrlKey: true })
    expect(ctx.move).not.toHaveBeenCalled()
    // The unhandled shortcut dispatch still happened, but nothing more.
    expect(ctx.dispatchShortcut).toHaveBeenCalledOnce()
  })

  it('leaves editable targets alone except for modifier shortcuts', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)

    press('ArrowRight', { target: input })
    press('Enter', { target: input })
    press('q', { target: input })
    expect(ctx.move).not.toHaveBeenCalled()
    expect(ctx.activate).not.toHaveBeenCalled()
    expect(ctx.dispatchShortcut).not.toHaveBeenCalled()

    press('s', { target: input, ctrlKey: true })
    expect(ctx.dispatchShortcut).toHaveBeenCalledWith(
      expect.objectContaining({ key: 's', ctrl: true }),
    )
  })

  it('removes its listener on teardown', () => {
    adapter.teardown()
    press('ArrowRight')
    expect(ctx.move).not.toHaveBeenCalled()
    // Re-setup so afterEach teardown stays balanced.
    setup()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { mouseAdapter } from '../adapters/mouse'
import type { AdapterContext } from '../adapters/types'

let ctx: {
  move: Mock
  activate: Mock
  focus: Mock
  dispatchShortcut: Mock
  isRegisteredElement: Mock
}
let adapter: ReturnType<typeof mouseAdapter>
let outerButton: HTMLButtonElement
let innerSpan: HTMLSpanElement

beforeEach(() => {
  // <button data-uni-trigger="a"><span/></button> — events land on the span.
  outerButton = document.createElement('button')
  outerButton.setAttribute('data-uni-trigger', 'a')
  innerSpan = document.createElement('span')
  outerButton.appendChild(innerSpan)
  document.body.appendChild(outerButton)

  ctx = {
    move: vi.fn<() => void>(),
    activate: vi.fn<() => void>(),
    focus: vi.fn<() => void>(),
    dispatchShortcut: vi.fn<() => boolean>(() => false),
    isRegisteredElement: vi.fn<(el: Element) => string | null>((el) =>
      el.getAttribute('data-uni-trigger'),
    ),
  }
  adapter = mouseAdapter()
  adapter.setup(ctx as unknown as AdapterContext)
})

afterEach(() => {
  adapter.teardown()
  document.body.innerHTML = ''
})

const fire = (target: Element, type: string, init: MouseEventInit = {}) => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, detail: 1, ...init })
  target.dispatchEvent(event)
  return event
}

describe('mouseAdapter', () => {
  it('focuses the trigger under the cursor via delegation', () => {
    fire(innerSpan, 'mouseover')
    expect(ctx.isRegisteredElement).toHaveBeenCalledWith(outerButton)
    expect(ctx.focus).toHaveBeenCalledWith('a')
  })

  it('does not re-focus while moving within the same trigger', () => {
    fire(innerSpan, 'mouseover')
    fire(outerButton, 'mouseover')
    expect(ctx.focus).toHaveBeenCalledTimes(1)
  })

  it('re-focuses after leaving to a non-trigger and coming back', () => {
    fire(innerSpan, 'mouseover')
    fire(document.body, 'mouseover')
    fire(innerSpan, 'mouseover')
    expect(ctx.focus).toHaveBeenCalledTimes(2)
  })

  it('activates on left click', () => {
    fire(innerSpan, 'click')
    expect(ctx.focus).toHaveBeenCalledWith('a')
    expect(ctx.activate).toHaveBeenCalledOnce()
  })

  it('ignores keyboard-synthesized clicks (detail 0)', () => {
    fire(innerSpan, 'click', { detail: 0 })
    expect(ctx.activate).not.toHaveBeenCalled()
  })

  it('ignores clicks outside triggers', () => {
    fire(document.body, 'click')
    expect(ctx.activate).not.toHaveBeenCalled()
  })

  it('dispatches non-left buttons as mouse shortcuts', () => {
    fire(document.body, 'mousedown', { button: 3 })
    expect(ctx.dispatchShortcut).toHaveBeenCalledWith({ kind: 'mouse-button', button: 3 })
    expect(ctx.activate).not.toHaveBeenCalled()
  })

  it('never dispatches left mousedown as a shortcut', () => {
    fire(innerSpan, 'mousedown', { button: 0 })
    expect(ctx.dispatchShortcut).not.toHaveBeenCalled()
  })

  it('prevents default and suppresses the context menu when a right-click shortcut matched', () => {
    ctx.dispatchShortcut.mockReturnValue(true)
    const down = fire(document.body, 'mousedown', { button: 2 })
    expect(down.defaultPrevented).toBe(true)
    const menu = fire(document.body, 'contextmenu', { button: 2 })
    expect(menu.defaultPrevented).toBe(true)
    // Only the one immediately following menu is suppressed.
    const secondMenu = fire(document.body, 'contextmenu', { button: 2 })
    expect(secondMenu.defaultPrevented).toBe(false)
  })

  it('leaves the context menu alone when no shortcut matched', () => {
    fire(document.body, 'mousedown', { button: 2 })
    const menu = fire(document.body, 'contextmenu', { button: 2 })
    expect(menu.defaultPrevented).toBe(false)
  })

  it('removes listeners on teardown', () => {
    adapter.teardown()
    fire(innerSpan, 'click')
    fire(innerSpan, 'mouseover')
    expect(ctx.activate).not.toHaveBeenCalled()
    expect(ctx.focus).not.toHaveBeenCalled()
    adapter.setup(ctx as unknown as AdapterContext)
  })
})

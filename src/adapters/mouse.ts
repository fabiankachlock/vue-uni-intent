import type { FocusCause, TriggerCause } from '../types'
import type { AdapterContext, InputAdapter } from './types'

/** `TriggerCause` shape produced by the mouse adapter. */
export type MouseTriggerCause = {
  source: 'mouse'
  via: 'activate' | 'shortcut'
  /** The `click` (activate) or `mousedown` (shortcut) event that fired the trigger. */
  event: MouseEvent
}

/** Narrow a `TriggerCause` to the mouse adapter's fully-typed shape. */
export function isMouseCause(cause: TriggerCause): cause is MouseTriggerCause {
  return cause.source === 'mouse'
}

/** `FocusCause` shape produced by the mouse adapter (hover / click focus). */
export type MouseFocusCause = {
  source: 'mouse'
  via: 'focus'
  /** The `mouseover` (hover) or `click` event that moved focus. */
  event: MouseEvent
}

/** Narrow a `FocusCause` to the mouse adapter's fully-typed shape. */
export function isMouseFocusCause(cause: FocusCause): cause is MouseFocusCause {
  return cause.source === 'mouse'
}

/**
 * Mouse input via document-level event delegation — no per-element listeners,
 * so dynamically mounted and teleported triggers work automatically.
 *
 * - hover (`mouseover`) focuses the trigger under the cursor
 * - left click activates it
 * - other buttons (middle/right/back/forward) dispatch `MouseShortcut`s
 */
export function mouseAdapter(): InputAdapter {
  let context: AdapterContext | null = null
  let hoveredId: string | null = null
  /** Right-clicks consumed by a shortcut also suppress the context menu. */
  let suppressContextMenu = false

  const resolveTrigger = (target: EventTarget | null): string | null => {
    if (!context || !(target instanceof Element)) return null
    const el = target.closest('[data-uni-trigger]')
    return el ? context.isRegisteredElement(el) : null
  }

  const onMouseover = (event: MouseEvent) => {
    const id = resolveTrigger(event.target)
    // Track the hovered trigger so crossing child elements doesn't re-focus.
    if (id === hoveredId) return
    hoveredId = id
    if (id !== null) {
      context?.focus(id, { source: 'mouse', via: 'focus', event } satisfies MouseFocusCause)
    }
  }

  const onMousedown = (event: MouseEvent) => {
    if (!context || event.button === 0) return
    const handled = context.dispatchShortcut(
      {
        kind: 'mouse-button',
        button: event.button,
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey,
      },
      { source: 'mouse', via: 'shortcut', event } satisfies MouseTriggerCause,
    )
    if (handled) {
      event.preventDefault()
      if (event.button === 2) suppressContextMenu = true
    }
  }

  const onContextMenu = (event: MouseEvent) => {
    if (suppressContextMenu) {
      suppressContextMenu = false
      event.preventDefault()
    }
  }

  const onClick = (event: MouseEvent) => {
    // detail === 0 marks keyboard-synthesized clicks (Enter/Space on a native
    // button) — the keyboard adapter already activated the trigger.
    if (!context || event.detail === 0) return
    const id = resolveTrigger(event.target)
    if (id === null) return
    context.focus(id, { source: 'mouse', via: 'focus', event } satisfies MouseFocusCause)
    context.activate({ source: 'mouse', via: 'activate', event } satisfies MouseTriggerCause)
  }

  return {
    name: 'mouse',
    setup(ctx) {
      context = ctx
      document.addEventListener('mouseover', onMouseover)
      document.addEventListener('mousedown', onMousedown)
      document.addEventListener('contextmenu', onContextMenu)
      document.addEventListener('click', onClick)
    },
    teardown() {
      document.removeEventListener('mouseover', onMouseover)
      document.removeEventListener('mousedown', onMousedown)
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('click', onClick)
      context = null
      hoveredId = null
      suppressContextMenu = false
    },
  }
}

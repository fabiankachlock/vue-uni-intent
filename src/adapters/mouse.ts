import type { FocusCause, TriggerCause } from '../types'
import { watchMedia } from './media'
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
 *
 * Being pointer delegation, this also handles touch taps (which synthesize
 * `click`), so it reports two availability concerns separately: `mouse` (a fine
 * pointer exists) and `touch` (a coarse pointer exists). A device may have
 * both, one, or — briefly, before any pointer is detected — neither.
 */
export function mouseAdapter(): InputAdapter {
  let context: AdapterContext | null = null
  let hoveredId: string | null = null
  /** Right-clicks consumed by a shortcut also suppress the context menu. */
  let suppressContextMenu = false
  /**
   * Back/forward clicks consumed by a shortcut also suppress the browser's
   * native history navigation. That navigation is a default action of the
   * `mouseup` (not `mousedown`) event, so a `mousedown` preventDefault can't
   * cancel it — we flag it here and cancel the following `mouseup` instead.
   */
  let suppressHistoryNav = false
  let stopMouseMedia: (() => void) | null = null
  let stopTouchMedia: (() => void) | null = null

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
      // 3 = Back, 4 = Forward: their history navigation fires on `mouseup`.
      else if (event.button === 3 || event.button === 4) suppressHistoryNav = true
    }
  }

  const onContextMenu = (event: MouseEvent) => {
    if (suppressContextMenu) {
      suppressContextMenu = false
      event.preventDefault()
    }
  }

  const onMouseup = (event: MouseEvent) => {
    if (suppressHistoryNav) {
      suppressHistoryNav = false
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
      document.addEventListener('mouseup', onMouseup)
      document.addEventListener('contextmenu', onContextMenu)
      document.addEventListener('click', onClick)
      // A fine pointer (mouse/trackpad) and a coarse pointer (touch) are
      // independent — track each and keep them live as devices come and go.
      // Fall back to mouse-only when capabilities can't be detected (SSR/tests).
      stopMouseMedia = watchMedia('(any-pointer: fine)', (m) => ctx.setAvailable('mouse', m), true)
      stopTouchMedia = watchMedia(
        '(any-pointer: coarse)',
        (m) => ctx.setAvailable('touch', m),
        false,
      )
    },
    teardown() {
      document.removeEventListener('mouseover', onMouseover)
      document.removeEventListener('mousedown', onMousedown)
      document.removeEventListener('mouseup', onMouseup)
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('click', onClick)
      stopMouseMedia?.()
      stopTouchMedia?.()
      stopMouseMedia = null
      stopTouchMedia = null
      context?.setAvailable('mouse', false)
      context?.setAvailable('touch', false)
      context = null
      hoveredId = null
      suppressContextMenu = false
      suppressHistoryNav = false
    },
  }
}

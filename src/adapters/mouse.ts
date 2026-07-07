import type { AdapterContext, InputAdapter } from './types'

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
    if (id !== null) context?.focus(id)
  }

  const onMousedown = (event: MouseEvent) => {
    if (!context || event.button === 0) return
    const handled = context.dispatchShortcut({
      kind: 'mouse-button',
      button: event.button,
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey,
    })
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
    context.focus(id)
    context.activate()
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

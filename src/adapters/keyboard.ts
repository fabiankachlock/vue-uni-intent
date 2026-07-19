import type { Direction, FocusCause, TriggerCause } from '../types'
import type { AdapterContext, InputAdapter } from './types'

/** `TriggerCause` shape produced by the keyboard adapter. */
export type KeyboardTriggerCause = {
  source: 'keyboard'
  via: 'activate' | 'shortcut'
  /** The `keydown` event that fired the trigger. */
  event: KeyboardEvent
}

/** Narrow a `TriggerCause` to the keyboard adapter's fully-typed shape. */
export function isKeyboardCause(cause: TriggerCause): cause is KeyboardTriggerCause {
  return cause.source === 'keyboard'
}

/** `FocusCause` shape produced by the keyboard adapter (spatial navigation only). */
export type KeyboardFocusCause = {
  source: 'keyboard'
  via: 'navigate'
  direction: Direction
  /** The `keydown` event that moved focus. */
  event: KeyboardEvent
}

/** Narrow a `FocusCause` to the keyboard adapter's fully-typed shape. */
export function isKeyboardFocusCause(cause: FocusCause): cause is KeyboardFocusCause {
  return cause.source === 'keyboard'
}

export type KeyboardAdapterOptions = {
  /** `KeyboardEvent.key` values per action. Defaults: arrow keys + Enter/Space. */
  keys?: {
    up?: string[]
    down?: string[]
    left?: string[]
    right?: string[]
    activate?: string[]
  }
}

const DEFAULT_KEYS: Required<NonNullable<KeyboardAdapterOptions['keys']>> = {
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  activate: ['Enter', ' '],
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  )
}

/**
 * Keyboard input: configurable navigation/activation keys plus `KeyShortcut`
 * dispatch. One `keydown` listener on `window`.
 */
export function keyboardAdapter(options: KeyboardAdapterOptions = {}): InputAdapter {
  const keys = { ...DEFAULT_KEYS, ...options.keys }
  const directions: [Direction, string[]][] = [
    ['up', keys.up],
    ['down', keys.down],
    ['left', keys.left],
    ['right', keys.right],
  ]

  let context: AdapterContext | null = null

  const onKeydown = (event: KeyboardEvent) => {
    const ctx = context
    if (!ctx) return
    const hasModifier = event.ctrlKey || event.altKey || event.metaKey

    // Typing into a field: only modifier shortcuts may fire; navigation,
    // activation and bare-key shortcuts must not steal the keystroke.
    if (isEditableTarget(event.target) && !hasModifier) return

    const handledShortcut = ctx.dispatchShortcut(
      {
        kind: 'key',
        key: event.key,
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey,
      },
      { source: 'keyboard', via: 'shortcut', event } satisfies KeyboardTriggerCause,
    )
    if (handledShortcut) {
      event.preventDefault()
      return
    }

    // Navigation/activation are bare keystrokes; combos belong to the browser.
    if (hasModifier) return

    const direction = directions.find(([, list]) => list.includes(event.key))?.[0]
    if (direction) {
      event.preventDefault()
      ctx.move(direction, {
        source: 'keyboard',
        via: 'navigate',
        direction,
        event,
      } satisfies KeyboardFocusCause)
      return
    }

    if (keys.activate.includes(event.key)) {
      // preventDefault also stops native buttons from synthesizing a click,
      // which would double-fire through a mouse adapter.
      event.preventDefault()
      ctx.activate({ source: 'keyboard', via: 'activate', event } satisfies KeyboardTriggerCause)
    }
  }

  return {
    name: 'keyboard',
    setup(ctx) {
      context = ctx
      window.addEventListener('keydown', onKeydown)
    },
    teardown() {
      window.removeEventListener('keydown', onKeydown)
      context = null
    },
  }
}

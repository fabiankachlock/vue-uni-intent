import type { Direction, FocusCause, TriggerCause, TriggerId } from '../types'

/** A raw input occurrence that may match a trigger's shortcut descriptor. */
export type ShortcutInput =
  | { kind: 'key'; key: string; ctrl: boolean; shift: boolean; alt: boolean; meta: boolean }
  | { kind: 'gamepad-button'; button: number }
  | {
      kind: 'mouse-button'
      button: number
      ctrl: boolean
      shift: boolean
      alt: boolean
      meta: boolean
    }

/**
 * The core's interface handed to adapters. This is the entire coupling surface
 * between input sources and the focus system — adapters never see the
 * registry, layers, or other adapters.
 */
export type AdapterContext = {
  /**
   * Move focus within the active layer via spatial navigation. Pass a
   * `FocusCause` (adapter `name`, native `event`, …) to describe the input;
   * it reaches the newly focused trigger's `onFocus`.
   */
  move: (direction: Direction, cause?: FocusCause) => void
  /** Activate the currently focused trigger, passing `cause` to its `onTrigger`. */
  activate: (cause: TriggerCause) => void
  /**
   * Focus a specific trigger. No-op if it is not in the active layer or disabled.
   * Pass a `FocusCause` describing the input; it reaches the trigger's `onFocus`.
   */
  focus: (id: TriggerId, cause?: FocusCause) => void
  /**
   * Match the input against active-layer shortcuts and fire the target, passing
   * `cause` to its `onTrigger`. Returns `true` if one matched.
   */
  dispatchShortcut: (input: ShortcutInput, cause: TriggerCause) => boolean
  /** Resolve a DOM element to a trigger id in the ACTIVE layer, or `null`. */
  isRegisteredElement: (el: Element) => TriggerId | null
}

/**
 * An isolated input source (keyboard, mouse, gamepad, or custom). Adapters own
 * their listeners/loops entirely and talk to the core only through the
 * `AdapterContext` they receive in `setup`.
 */
export type InputAdapter = {
  name: string
  /** Called once on the client after plugin install. Never called during SSR. */
  setup: (ctx: AdapterContext) => void
  /** Remove all listeners / stop all loops. Called on app unmount. */
  teardown: () => void
}

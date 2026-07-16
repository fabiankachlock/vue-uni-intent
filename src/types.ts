import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import type { InputAdapter } from './adapters/types'

export type TriggerId = string

export type Direction = 'up' | 'down' | 'left' | 'right'

/** Modifier keys held during a press. Unspecified modifiers must NOT be pressed. */
export type Modifiers = {
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
}

/** Matches a keyboard press. Unspecified modifiers must NOT be pressed. */
export type KeyShortcut = Modifiers & {
  /** `KeyboardEvent.key` value, e.g. `"Escape"`, `"Backspace"`, `"q"`. */
  key: string
}

/** Matches a gamepad button press (standard mapping index, see `GamepadButton`). */
export type GamepadShortcut = {
  button: number
}

/**
 * Matches a mouse button press (`MouseEvent.button` index, see `MouseButton`).
 * Supports the same modifiers as `KeyShortcut`. The built-in mouse adapter
 * dispatches these for non-left buttons only — left click stays reserved for
 * activating the hovered trigger.
 */
export type MouseShortcut = Modifiers & {
  mouseButton: number
}

export type ShortcutDescriptor = KeyShortcut | GamepadShortcut | MouseShortcut

/**
 * Describes what caused a trigger to fire — the argument passed to `onTrigger`.
 * The core stays input-agnostic, so adapters populate this: `source` is the
 * adapter's `name` (or `'manual'` for a programmatic `.trigger()` call), and
 * each adapter attaches whatever native event or detail it has. Built-in
 * adapters export a precise shape (`KeyboardTriggerCause`, `MouseTriggerCause`,
 * `GamepadTriggerCause`) you can narrow to by checking `source`.
 */
export type TriggerCause = {
  /** The adapter that fired the trigger (its `name`), or `'manual'`. */
  source: string
  /** How it fired: direct `'activate'`, a `'shortcut'` match, or programmatic `'manual'`. */
  via: 'activate' | 'shortcut' | 'manual'
  /** The native DOM event behind the input, when the source has one (keyboard, mouse). */
  event?: Event
  /** Adapter-specific detail — e.g. the gamepad `button` index. */
  [key: string]: unknown
}

/** `TriggerCause` shape produced by a programmatic `.trigger()` call. */
export type ManualTriggerCause = {
  source: 'manual'
  via: 'manual'
}

/** Narrow a `TriggerCause` to a programmatic (`.trigger()`) cause. */
export function isManualCause(cause: TriggerCause): cause is ManualTriggerCause {
  return cause.source === 'manual'
}

export type UseTriggerOptions = {
  /** Unique within its layer. */
  id: TriggerId
  /** Called when the trigger fires; receives what caused it (adapter, native event, …). */
  onTrigger: (cause: TriggerCause) => void
  /** Extra inputs that fire this trigger regardless of focus, e.g. `[key("Escape"), button("B")]`. */
  shortcuts?: ShortcutDescriptor[]
  /** Disabled triggers are skipped by navigation and shortcuts. */
  disabled?: MaybeRefOrGetter<boolean>
  /** Receive the layer's initial focus. */
  autofocus?: boolean
}

export type UseTriggerReturn = {
  /** Template ref — bind to the element: `<button :ref="ref">`. */
  ref: Ref<HTMLElement | null>
  focused: ComputedRef<boolean>
  /** Programmatically focus this trigger. */
  focus: () => void
  /** Programmatically activate this trigger. */
  trigger: () => void
}

export type UseTriggerLayerOptions = {
  /** Auto-generated if omitted. */
  id?: string
  /** Trigger to focus when the layer activates; falls back to an `autofocus` trigger, then the first registered. */
  initialFocus?: TriggerId
}

export type UseTriggerLayerReturn = {
  id: string
  /** Whether this layer is topmost and owns navigation + shortcuts. */
  isActive: ComputedRef<boolean>
}

export type UniIntentDebugOptions = {
  /**
   * Keyboard shortcut that toggles the debug overlay.
   * Default: `Ctrl+Alt+D` (`key('d', { ctrl: true, alt: true })`).
   */
  hotkey?: KeyShortcut
}

export type UniIntentOptions = {
  /**
   * Input adapters to install. Explicit by design — the core is input-agnostic:
   * `[keyboardAdapter(), mouseAdapter(), gamepadAdapter()]`
   */
  adapters: InputAdapter[]
  /** Wrap around to the opposite edge when navigating past the last trigger. Default `false`. */
  wrap?: boolean
  /** Initial focus strategy for the root layer. Default `"first"`. */
  initialFocus?: 'first' | 'none'
  /**
   * Enable the spatial-navigation debug overlay, toggled at runtime by its
   * hotkey. Off by default; pass `true` (or options) to make it available —
   * e.g. `debug: import.meta.env.DEV`.
   */
  debug?: boolean | UniIntentDebugOptions
}

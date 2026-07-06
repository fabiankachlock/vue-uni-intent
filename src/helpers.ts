import type { GamepadShortcut, KeyShortcut, MouseShortcut } from './types'

// TODO: Nintendo Controllers have inverted A/B and X/Y buttons

/** Standard-mapping gamepad button indices (https://w3c.github.io/gamepad/#remapping). */
export const GamepadButton = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  L1: 4,
  R1: 5,
  L2: 6,
  R2: 7,
  Select: 8,
  Start: 9,
  L3: 10,
  R3: 11,
  DPadUp: 12,
  DPadDown: 13,
  DPadLeft: 14,
  DPadRight: 15,
  Home: 16,
} as const

export type GamepadButtonName = keyof typeof GamepadButton

/** Standard-mapping gamepad axis indices. */
export const GamepadAxis = {
  LeftX: 0,
  LeftY: 1,
  RightX: 2,
  RightY: 3,
} as const

export type GamepadButtonRef = number | GamepadButtonName

/** Resolve a button name or raw index to the standard-mapping index. */
export function resolveGamepadButton(button: GamepadButtonRef): number {
  return typeof button === 'number' ? button : GamepadButton[button]
}

/** Build a keyboard shortcut descriptor: `key("Escape")`, `key("s", { ctrl: true })`. */
export function key(
  key: string,
  mods?: Pick<KeyShortcut, 'ctrl' | 'shift' | 'alt' | 'meta'>,
): KeyShortcut {
  return { key, ...mods }
}

/** Build a gamepad shortcut descriptor: `button("B")` or `button(1)`. */
export function button(button: GamepadButtonRef): GamepadShortcut {
  return { button: resolveGamepadButton(button) }
}

/** `MouseEvent.button` indices. */
export const MouseButton = {
  Left: 0,
  Middle: 1,
  Right: 2,
  Back: 3,
  Forward: 4,
} as const

export type MouseButtonName = keyof typeof MouseButton

export type MouseButtonRef = number | MouseButtonName

/** Resolve a mouse button name or raw index to the `MouseEvent.button` index. */
export function resolveMouseButton(button: MouseButtonRef): number {
  return typeof button === 'number' ? button : MouseButton[button]
}

/** Build a mouse shortcut descriptor: `mouseButton("Back")` or `mouseButton(3)`. */
export function mouseButton(button: MouseButtonRef): MouseShortcut {
  return { mouseButton: resolveMouseButton(button) }
}

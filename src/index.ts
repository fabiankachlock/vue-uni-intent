export { createUniIntent } from './plugin'
export { useTrigger } from './useTrigger'
export { useTriggerLayer, ROOT_LAYER_ID } from './layers'

export { keyboardAdapter, type KeyboardAdapterOptions } from './adapters/keyboard'
export { mouseAdapter } from './adapters/mouse'
export {
  gamepadAdapter,
  pollGamepads,
  createGamepadPollState,
  type GamepadAdapterOptions,
  type GamepadPollState,
} from './adapters/gamepad'

export { findNext } from './navigation'
export { matchShortcut } from './shortcuts'
export {
  GamepadAxis,
  GamepadButton,
  MouseButton,
  button,
  key,
  mouseButton,
  resolveGamepadButton,
  resolveMouseButton,
  type GamepadButtonName,
  type GamepadButtonRef,
  type MouseButtonName,
  type MouseButtonRef,
} from './helpers'

export type {
  UniIntentOptions,
  Direction,
  GamepadShortcut,
  KeyShortcut,
  Modifiers,
  MouseShortcut,
  ShortcutDescriptor,
  TriggerId,
  UseTriggerLayerOptions,
  UseTriggerLayerReturn,
  UseTriggerOptions,
  UseTriggerReturn,
} from './types'
export type { AdapterContext, InputAdapter, ShortcutInput } from './adapters/types'
export type { NavCandidate, NavOptions, NavRect } from './navigation'

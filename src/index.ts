export { createUniIntent } from './plugin'
export { useTrigger } from './useTrigger'
export { useTriggerLayer, ROOT_LAYER_ID } from './layers'

export {
  keyboardAdapter,
  isKeyboardCause,
  type KeyboardAdapterOptions,
  type KeyboardTriggerCause,
} from './adapters/keyboard'
export { mouseAdapter, isMouseCause, type MouseTriggerCause } from './adapters/mouse'
export {
  gamepadAdapter,
  isGamepadCause,
  pollGamepads,
  createGamepadPollState,
  type GamepadAdapterOptions,
  type GamepadPollState,
  type GamepadTriggerCause,
} from './adapters/gamepad'

export { findNext, explainNext } from './navigation'
export { matchShortcut } from './shortcuts'
export {
  GamepadAxis,
  GamepadButton,
  Key,
  MouseButton,
  button,
  key,
  mouseButton,
  resolveGamepadButton,
  resolveMouseButton,
  type GamepadButtonName,
  type GamepadButtonRef,
  type KeyName,
  type MouseButtonName,
  type MouseButtonRef,
} from './helpers'

export { isManualCause } from './types'
export type {
  UniIntentOptions,
  UniIntentDebugOptions,
  Direction,
  GamepadShortcut,
  KeyShortcut,
  ManualTriggerCause,
  Modifiers,
  MouseShortcut,
  ShortcutDescriptor,
  TriggerCause,
  TriggerId,
  UseTriggerLayerOptions,
  UseTriggerLayerReturn,
  UseTriggerOptions,
  UseTriggerReturn,
} from './types'
export type { AdapterContext, InputAdapter, ShortcutInput } from './adapters/types'
export type {
  NavCandidate,
  NavCandidateExplanation,
  NavExplanation,
  NavOptions,
  NavRect,
  NavVerdict,
} from './navigation'

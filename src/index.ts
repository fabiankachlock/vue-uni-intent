export { createUniIntent } from './plugin'
export { useTrigger } from './useTrigger'
export { useTriggerLayer, ROOT_LAYER_ID } from './layers'

export {
  keyboardAdapter,
  isKeyboardCause,
  isKeyboardFocusCause,
  type KeyboardAdapterOptions,
  type KeyboardTriggerCause,
  type KeyboardFocusCause,
} from './adapters/keyboard'
export {
  mouseAdapter,
  isMouseCause,
  isMouseFocusCause,
  type MouseTriggerCause,
  type MouseFocusCause,
} from './adapters/mouse'
export {
  gamepadAdapter,
  isGamepadCause,
  isGamepadFocusCause,
  pollGamepads,
  createGamepadPollState,
  type GamepadAdapterOptions,
  type GamepadPollState,
  type GamepadTriggerCause,
  type GamepadFocusCause,
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

export { isManualCause, isManualFocusCause, isCoreFocusCause } from './types'
export type {
  UniIntentOptions,
  UniIntentDebugOptions,
  Direction,
  FocusCause,
  FocusVia,
  CoreFocusCause,
  GamepadShortcut,
  KeyShortcut,
  ManualFocusCause,
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

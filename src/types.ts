import type { ComputedRef, MaybeRefOrGetter, Ref } from "vue";
import type { InputAdapter } from "./adapters/types";

export type TriggerId = string;

export type Direction = "up" | "down" | "left" | "right";

/** Matches a keyboard press. Unspecified modifiers must NOT be pressed. */
export type KeyShortcut = {
  /** `KeyboardEvent.key` value, e.g. `"Escape"`, `"Backspace"`, `"q"`. */
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

/** Matches a gamepad button press (standard mapping index, see `GamepadButton`). */
export type GamepadShortcut = {
  button: number;
};

/**
 * Matches a mouse button press (`MouseEvent.button` index, see `MouseButton`).
 * The built-in mouse adapter dispatches these for non-left buttons only —
 * left click stays reserved for activating the hovered trigger.
 */
export type MouseShortcut = {
  mouseButton: number;
};

export type ShortcutDescriptor = KeyShortcut | GamepadShortcut | MouseShortcut;

export type UseTriggerOptions = {
  /** Unique within its layer. */
  id: TriggerId;
  onTrigger: () => void;
  /** Extra inputs that fire this trigger regardless of focus, e.g. `[key("Escape"), button("B")]`. */
  shortcuts?: ShortcutDescriptor[];
  /** Disabled triggers are skipped by navigation and shortcuts. */
  disabled?: MaybeRefOrGetter<boolean>;
  /** Receive the layer's initial focus. */
  autofocus?: boolean;
};

export type UseTriggerReturn = {
  /** Template ref — bind to the element: `<button :ref="ref">`. */
  ref: Ref<HTMLElement | null>;
  focused: ComputedRef<boolean>;
  /** Programmatically focus this trigger. */
  focus: () => void;
  /** Programmatically activate this trigger. */
  trigger: () => void;
};

export type UseTriggerLayerOptions = {
  /** Auto-generated if omitted. */
  id?: string;
  /** Trigger to focus when the layer activates; falls back to an `autofocus` trigger, then the first registered. */
  initialFocus?: TriggerId;
};

export type UseTriggerLayerReturn = {
  id: string;
  /** Whether this layer is topmost and owns navigation + shortcuts. */
  isActive: ComputedRef<boolean>;
};

export type UniIntentOptions = {
  /**
   * Input adapters to install. Explicit by design — the core is input-agnostic:
   * `[keyboardAdapter(), mouseAdapter(), gamepadAdapter()]`
   */
  adapters: InputAdapter[];
  /** Wrap around to the opposite edge when navigating past the last trigger. Default `false`. */
  wrap?: boolean;
  /** Initial focus strategy for the root layer. Default `"first"`. */
  initialFocus?: "first" | "none";
};

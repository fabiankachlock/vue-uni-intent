import { GamepadAxis, GamepadButton, resolveGamepadButton, type GamepadButtonRef } from '../helpers'
import type { Direction, FocusCause, TriggerCause } from '../types'
import type { AdapterContext, InputAdapter } from './types'

/**
 * `TriggerCause` shape produced by the gamepad adapter. There is no native
 * event (input is polled), so the standard-mapping `button` index is carried.
 */
export type GamepadTriggerCause = {
  source: 'gamepad'
  via: 'activate' | 'shortcut'
  /** Standard-mapping button index that fired the trigger (see `GamepadButton`). */
  button: number
}

/** Narrow a `TriggerCause` to the gamepad adapter's fully-typed shape. */
export function isGamepadCause(cause: TriggerCause): cause is GamepadTriggerCause {
  return cause.source === 'gamepad'
}

/**
 * `FocusCause` shape produced by the gamepad adapter (D-pad / stick navigation).
 * There is no native event — input is polled.
 */
export type GamepadFocusCause = {
  source: 'gamepad'
  via: 'navigate'
  direction: Direction
}

/** Narrow a `FocusCause` to the gamepad adapter's fully-typed shape. */
export function isGamepadFocusCause(cause: FocusCause): cause is GamepadFocusCause {
  return cause.source === 'gamepad'
}

export type GamepadAdapterOptions = {
  /** Stick magnitude below which input is ignored. Default `0.5`. */
  deadzone?: number
  /** ms a direction must be held before it starts repeating. Default `400`. */
  initialRepeatDelay?: number
  /** ms between repeated moves while held. Default `150`. */
  repeatInterval?: number
  /** Button that activates the focused trigger. Default `"A"`. */
  activateButton?: GamepadButtonRef
}

type ResolvedGamepadOptions = {
  deadzone: number
  initialRepeatDelay: number
  repeatInterval: number
  activateButton: number
}

/** Mutable per-frame state of the poll loop. Exported for testing. */
export type GamepadPollState = {
  /** Buttons pressed on the previous frame (union over all pads). */
  buttonsDown: Set<number>
  heldDirection: Direction | null
  /** Timestamp the held direction was first seen. */
  directionSince: number
  lastMoveAt: number
}

export function createGamepadPollState(): GamepadPollState {
  return { buttonsDown: new Set(), heldDirection: null, directionSince: 0, lastMoveAt: 0 }
}

const DPAD_DIRECTIONS: [number, Direction][] = [
  [GamepadButton.DPadUp, 'up'],
  [GamepadButton.DPadDown, 'down'],
  [GamepadButton.DPadLeft, 'left'],
  [GamepadButton.DPadRight, 'right'],
]

function resolveDirection(pad: Gamepad, deadzone: number): Direction | null {
  for (const [buttonIndex, direction] of DPAD_DIRECTIONS) {
    if (pad.buttons[buttonIndex]?.pressed) return direction
  }
  const x = pad.axes[GamepadAxis.LeftX] ?? 0
  const y = pad.axes[GamepadAxis.LeftY] ?? 0
  if (Math.abs(x) < deadzone && Math.abs(y) < deadzone) return null
  // Dominant axis wins so diagonals resolve deterministically.
  if (Math.abs(x) >= Math.abs(y)) return x > 0 ? 'right' : 'left'
  return y > 0 ? 'down' : 'up'
}

/**
 * One poll step over connected pads: edge-triggered buttons (activate +
 * shortcut dispatch) and the direction-repeat state machine. Pure with respect
 * to time — exported so tests can drive it without requestAnimationFrame.
 */
export function pollGamepads(
  pads: readonly (Gamepad | null)[],
  state: GamepadPollState,
  now: number,
  ctx: AdapterContext,
  options: ResolvedGamepadOptions,
): void {
  const pressed = new Set<number>()
  let direction: Direction | null = null

  for (const pad of pads) {
    if (!pad) continue
    pad.buttons.forEach((button, index) => {
      if (button.pressed) pressed.add(index)
    })
    direction ??= resolveDirection(pad, options.deadzone)
  }

  // Edge-triggered buttons: only fire on the frame a button goes down.
  for (const index of pressed) {
    if (state.buttonsDown.has(index)) continue
    if (index === options.activateButton) {
      ctx.activate({
        source: 'gamepad',
        via: 'activate',
        button: index,
      } satisfies GamepadTriggerCause)
    } else {
      ctx.dispatchShortcut({ kind: 'gamepad-button', button: index }, {
        source: 'gamepad',
        via: 'shortcut',
        button: index,
      } satisfies GamepadTriggerCause)
    }
  }
  state.buttonsDown = pressed

  // Direction state machine: immediate move on press/change, stepwise repeat
  // while held (initial delay, then interval).
  if (direction === null) {
    state.heldDirection = null
    return
  }
  if (direction !== state.heldDirection) {
    state.heldDirection = direction
    state.directionSince = now
    state.lastMoveAt = now
    ctx.move(direction, {
      source: 'gamepad',
      via: 'navigate',
      direction,
    } satisfies GamepadFocusCause)
    return
  }
  if (
    now - state.directionSince >= options.initialRepeatDelay &&
    now - state.lastMoveAt >= options.repeatInterval
  ) {
    state.lastMoveAt = now
    ctx.move(direction, {
      source: 'gamepad',
      via: 'navigate',
      direction,
    } satisfies GamepadFocusCause)
  }
}

/**
 * Gamepad input (standard mapping): D-pad and left stick navigate, `A`
 * activates, every other button press is dispatched as a `GamepadShortcut`.
 * Polls via requestAnimationFrame while at least one pad is connected.
 */
export function gamepadAdapter(options: GamepadAdapterOptions = {}): InputAdapter {
  const resolved: ResolvedGamepadOptions = {
    deadzone: options.deadzone ?? 0.5,
    initialRepeatDelay: options.initialRepeatDelay ?? 400,
    repeatInterval: options.repeatInterval ?? 150,
    activateButton: resolveGamepadButton(options.activateButton ?? 'A'),
  }

  let context: AdapterContext | null = null
  let rafHandle: number | null = null
  let state = createGamepadPollState()

  const anyPadConnected = () => navigator.getGamepads().some((pad) => pad !== null)

  const loop = () => {
    rafHandle = null
    if (!context) return
    const pads = navigator.getGamepads()
    pollGamepads(pads, state, performance.now(), context, resolved)
    if (pads.some((pad) => pad !== null)) {
      rafHandle = requestAnimationFrame(loop)
    } else {
      state = createGamepadPollState()
    }
  }

  const startLoop = () => {
    rafHandle ??= requestAnimationFrame(loop)
  }

  return {
    name: 'gamepad',
    setup(ctx) {
      // The loop stops itself once getGamepads() is empty, so no
      // gamepaddisconnected listener is needed.
      if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return
      context = ctx
      window.addEventListener('gamepadconnected', startLoop)
      // A pad may already be connected when the app installs.
      if (anyPadConnected()) startLoop()
    },
    teardown() {
      if (!context) return
      window.removeEventListener('gamepadconnected', startLoop)
      if (rafHandle !== null) cancelAnimationFrame(rafHandle)
      rafHandle = null
      context = null
      state = createGamepadPollState()
    },
  }
}

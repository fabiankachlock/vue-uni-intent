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
  /** Scroll the window with the right stick while held. Default `false`. */
  rightStickScroll?: boolean
  /** Right-stick scroll speed in px/sec at full deflection. Default `1200`. */
  scrollSpeed?: number
  /** Invert the right stick's vertical scroll (stick down scrolls up). Default `false`. */
  invertScrollY?: boolean
}

type ResolvedGamepadOptions = {
  deadzone: number
  initialRepeatDelay: number
  repeatInterval: number
  activateButton: number
  rightStickScroll: boolean
  scrollSpeed: number
  invertScrollY: boolean
}

/** Mutable per-frame state of the poll loop. Exported for testing. */
export type GamepadPollState = {
  /** Buttons pressed on the previous frame (union over all pads). */
  buttonsDown: Set<number>
  heldDirection: Direction | null
  /** Timestamp the held direction was first seen. */
  directionSince: number
  lastMoveAt: number
  /** Timestamp of the previous scroll frame, for frame-rate-independent velocity. */
  lastScrollAt: number
}

export function createGamepadPollState(): GamepadPollState {
  return {
    buttonsDown: new Set(),
    heldDirection: null,
    directionSince: 0,
    lastMoveAt: 0,
    lastScrollAt: -1,
  }
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

/** Right-stick deflection past the deadzone (first pad wins), else `null`. */
function resolveScroll(
  pads: readonly (Gamepad | null)[],
  deadzone: number,
): { x: number; y: number } | null {
  for (const pad of pads) {
    if (!pad) continue
    const x = pad.axes[GamepadAxis.RightX] ?? 0
    const y = pad.axes[GamepadAxis.RightY] ?? 0
    if (Math.abs(x) >= deadzone || Math.abs(y) >= deadzone) return { x, y }
  }
  return null
}

/** Whether `el` can actually scroll along the given axis (overflow + overflowing content). */
function canScroll(el: Element, axis: 'x' | 'y'): boolean {
  const style = getComputedStyle(el)
  const overflow = axis === 'x' ? style.overflowX : style.overflowY
  if (overflow !== 'auto' && overflow !== 'scroll' && overflow !== 'overlay') return false
  return axis === 'x' ? el.scrollWidth > el.clientWidth : el.scrollHeight > el.clientHeight
}

/**
 * Scroll the nearest scrollable ancestor of the focused trigger by `(dx, dy)`,
 * falling back to the window. Runs the whole chain in the axes actually being
 * pushed so a vertical-only container isn't chosen for a horizontal push.
 */
function scrollFocusedContainer(dx: number, dy: number): void {
  let el: Element | null = document.querySelector('[data-uni-focused]')
  while (el) {
    if ((dx !== 0 && canScroll(el, 'x')) || (dy !== 0 && canScroll(el, 'y'))) {
      el.scrollBy(dx, dy)
      return
    }
    el = el.parentElement
  }
  window.scrollBy(dx, dy)
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

  // Right-stick scrolling (opt-in): a direct DOM side-effect on the focused
  // item's nearest scrollable container (window fallback), independent of the
  // navigation state machine below. Distance scales with the frame delta so
  // velocity is frame-rate independent.
  if (options.rightStickScroll) {
    const dt = state.lastScrollAt < 0 ? 0 : now - state.lastScrollAt
    state.lastScrollAt = now
    const scroll = resolveScroll(pads, options.deadzone)
    if (scroll && dt > 0 && typeof document !== 'undefined') {
      const distance = (options.scrollSpeed * dt) / 1000
      const dy = options.invertScrollY ? -scroll.y : scroll.y
      scrollFocusedContainer(scroll.x * distance, dy * distance)
    }
  }

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
 * With `rightStickScroll`, the right stick scrolls the focused item's nearest
 * scrollable container (window fallback). Polls via requestAnimationFrame while
 * at least one pad is connected.
 */
export function gamepadAdapter(options: GamepadAdapterOptions = {}): InputAdapter {
  const resolved: ResolvedGamepadOptions = {
    deadzone: options.deadzone ?? 0.5,
    initialRepeatDelay: options.initialRepeatDelay ?? 400,
    repeatInterval: options.repeatInterval ?? 150,
    activateButton: resolveGamepadButton(options.activateButton ?? 'A'),
    rightStickScroll: options.rightStickScroll ?? false,
    scrollSpeed: options.scrollSpeed ?? 1200,
    invertScrollY: options.invertScrollY ?? false,
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
      // Last pad disconnected — the loop stops here, so report unavailable.
      context.setAvailable('gamepad', false)
    }
  }

  const startLoop = () => {
    context?.setAvailable('gamepad', true)
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
      context.setAvailable('gamepad', false)
      context = null
      state = createGamepadPollState()
    },
  }
}

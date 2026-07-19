import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import {
  createGamepadPollState,
  gamepadAdapter,
  pollGamepads,
  type GamepadPollState,
} from '../adapters/gamepad'
import type { AdapterContext, ShortcutInput } from '../adapters/types'
import { GamepadButton } from '../helpers'
import type { Direction, TriggerCause } from '../types'

/** The `FocusCause` the gamepad adapter attaches to every navigation move. */
const navCause = (direction: Direction) => ({ source: 'gamepad', via: 'navigate', direction })

type FakePad = {
  buttons?: number[]
  axes?: [number, number]
}

/** Build a Gamepad-shaped object with the given pressed button indices. */
function pad({ buttons = [], axes = [0, 0] }: FakePad = {}): Gamepad {
  const buttonList = Array.from({ length: 17 }, (_, i) => ({
    pressed: buttons.includes(i),
    touched: false,
    value: buttons.includes(i) ? 1 : 0,
  }))
  return { buttons: buttonList, axes, mapping: 'standard' } as unknown as Gamepad
}

const OPTIONS = {
  deadzone: 0.5,
  initialRepeatDelay: 400,
  repeatInterval: 150,
  activateButton: GamepadButton.A,
}

let ctx: {
  move: Mock
  activate: Mock
  focus: Mock
  dispatchShortcut: Mock
  isRegisteredElement: Mock
}
let state: GamepadPollState

const poll = (pads: (Gamepad | null)[], now: number) =>
  pollGamepads(pads, state, now, ctx as unknown as AdapterContext, OPTIONS)

beforeEach(() => {
  ctx = {
    move: vi.fn<() => void>(),
    activate: vi.fn<(cause: TriggerCause) => void>(),
    focus: vi.fn<() => void>(),
    dispatchShortcut: vi.fn<(input: ShortcutInput, cause: TriggerCause) => boolean>(() => false),
    isRegisteredElement: vi.fn<() => string | null>(() => null),
  }
  state = createGamepadPollState()
})

describe('pollGamepads', () => {
  it('activates on the A button, edge-triggered', () => {
    poll([pad({ buttons: [GamepadButton.A] })], 0)
    poll([pad({ buttons: [GamepadButton.A] })], 16)
    poll([pad()], 32)
    poll([pad({ buttons: [GamepadButton.A] })], 48)
    expect(ctx.activate).toHaveBeenCalledTimes(2)
    expect(ctx.activate).toHaveBeenCalledWith({
      source: 'gamepad',
      via: 'activate',
      button: GamepadButton.A,
    })
  })

  it('dispatches other buttons as gamepad shortcuts', () => {
    poll([pad({ buttons: [GamepadButton.B] })], 0)
    expect(ctx.dispatchShortcut).toHaveBeenCalledWith(
      {
        kind: 'gamepad-button',
        button: GamepadButton.B,
      },
      { source: 'gamepad', via: 'shortcut', button: GamepadButton.B },
    )
    expect(ctx.activate).not.toHaveBeenCalled()
  })

  it('moves once per D-pad tap', () => {
    poll([pad({ buttons: [GamepadButton.DPadRight] })], 0)
    poll([pad({ buttons: [GamepadButton.DPadRight] })], 16)
    poll([pad()], 32)
    expect(ctx.move).toHaveBeenCalledTimes(1)
    expect(ctx.move).toHaveBeenCalledWith('right', navCause('right'))
  })

  it('repeats a held direction after the initial delay, then at the interval', () => {
    const held = () => pad({ buttons: [GamepadButton.DPadDown] })
    poll([held()], 0) // immediate move
    poll([held()], 200) // still in initial delay
    poll([held()], 399)
    expect(ctx.move).toHaveBeenCalledTimes(1)

    poll([held()], 400) // delay elapsed → repeat
    expect(ctx.move).toHaveBeenCalledTimes(2)
    poll([held()], 500) // within repeat interval
    expect(ctx.move).toHaveBeenCalledTimes(2)
    poll([held()], 550) // interval elapsed
    expect(ctx.move).toHaveBeenCalledTimes(3)
  })

  it('moves immediately when the held direction changes', () => {
    poll([pad({ buttons: [GamepadButton.DPadDown] })], 0)
    poll([pad({ buttons: [GamepadButton.DPadRight] })], 16)
    expect(ctx.move).toHaveBeenNthCalledWith(1, 'down', navCause('down'))
    expect(ctx.move).toHaveBeenNthCalledWith(2, 'right', navCause('right'))
  })

  it('resolves stick input past the deadzone by dominant axis', () => {
    poll([pad({ axes: [0.3, 0.2] })], 0) // inside deadzone
    expect(ctx.move).not.toHaveBeenCalled()

    poll([pad({ axes: [-0.9, 0.4] })], 16)
    expect(ctx.move).toHaveBeenCalledWith('left', navCause('left'))

    poll([pad()], 32) // release
    poll([pad({ axes: [0.2, -0.8] })], 48)
    expect(ctx.move).toHaveBeenCalledWith('up', navCause('up'))
  })

  it('prefers the D-pad over the stick', () => {
    poll([pad({ buttons: [GamepadButton.DPadUp], axes: [1, 0] })], 0)
    expect(ctx.move).toHaveBeenCalledWith('up', navCause('up'))
  })

  it('treats a released and re-pressed direction as a fresh tap', () => {
    poll([pad({ buttons: [GamepadButton.DPadRight] })], 0)
    poll([pad()], 100)
    poll([pad({ buttons: [GamepadButton.DPadRight] })], 200)
    expect(ctx.move).toHaveBeenCalledTimes(2)
  })

  it('handles null pad slots and multiple pads', () => {
    poll([null, pad({ buttons: [GamepadButton.A] }), null], 0)
    expect(ctx.activate).toHaveBeenCalledOnce()
  })
})

describe('gamepadAdapter availability', () => {
  let pads: (Gamepad | null)[]
  let rafCb: FrameRequestCallback | null
  let adapterCtx: { setAvailable: Mock } & Record<string, unknown>

  beforeEach(() => {
    pads = []
    rafCb = null
    Object.defineProperty(navigator, 'getGamepads', {
      value: vi.fn<() => (Gamepad | null)[]>(() => pads),
      configurable: true,
      writable: true,
    })
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCb = cb
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => {
      rafCb = null
    })
    adapterCtx = {
      move: vi.fn<AdapterContext['move']>(),
      activate: vi.fn<AdapterContext['activate']>(),
      focus: vi.fn<AdapterContext['focus']>(),
      dispatchShortcut: vi.fn<AdapterContext['dispatchShortcut']>(() => false),
      isRegisteredElement: vi.fn<AdapterContext['isRegisteredElement']>(() => null),
      setAvailable: vi.fn<AdapterContext['setAvailable']>(),
    }
  })

  afterEach(() => vi.unstubAllGlobals())

  const start = () => {
    const adapter = gamepadAdapter()
    adapter.setup(adapterCtx as unknown as AdapterContext)
    return adapter
  }

  it('does not report a gamepad until one connects', () => {
    start() // no pads present
    expect(adapterCtx.setAvailable).not.toHaveBeenCalledWith('gamepad', true)
  })

  it('reports available when a pad is already connected at setup', () => {
    pads = [pad()]
    start()
    expect(adapterCtx.setAvailable).toHaveBeenCalledWith('gamepad', true)
  })

  it('reports available on gamepadconnected', () => {
    start()
    pads = [pad()]
    window.dispatchEvent(new Event('gamepadconnected'))
    expect(adapterCtx.setAvailable).toHaveBeenCalledWith('gamepad', true)
  })

  it('reports unavailable once the last pad disconnects', () => {
    pads = [pad()]
    start()
    // Pad drops; next poll frame sees an empty list and stops the loop.
    pads = []
    rafCb?.(performance.now())
    expect(adapterCtx.setAvailable).toHaveBeenLastCalledWith('gamepad', false)
  })

  it('reports unavailable on teardown', () => {
    pads = [pad()]
    const adapter = start()
    adapter.teardown()
    expect(adapterCtx.setAvailable).toHaveBeenLastCalledWith('gamepad', false)
  })
})

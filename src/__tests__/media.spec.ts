import { afterEach, describe, expect, it, vi } from 'vitest'
import { watchMedia } from '../adapters/media'

afterEach(() => vi.unstubAllGlobals())

/** A controllable MediaQueryList stub whose `change` listener can be fired. */
function stubMatchMedia(initial: boolean) {
  let matches = initial
  const listeners = new Set<() => void>()
  const mql = {
    get matches() {
      return matches
    },
    media: '',
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }
  const matchMedia = vi.fn(() => mql as unknown as MediaQueryList)
  vi.stubGlobal('matchMedia', matchMedia)
  return {
    matchMedia,
    set(next: boolean) {
      matches = next
      listeners.forEach((cb) => cb())
    },
    listenerCount: () => listeners.size,
  }
}

describe('watchMedia', () => {
  it('emits the current match immediately and on every change', () => {
    const media = stubMatchMedia(false)
    const onChange = vi.fn()
    watchMedia('(any-pointer: fine)', onChange, true)

    expect(onChange).toHaveBeenNthCalledWith(1, false)
    media.set(true)
    expect(onChange).toHaveBeenNthCalledWith(2, true)
  })

  it('removes its listener on cleanup', () => {
    const media = stubMatchMedia(true)
    const onChange = vi.fn()
    const stop = watchMedia('(any-pointer: fine)', onChange, true)

    expect(media.listenerCount()).toBe(1)
    stop()
    expect(media.listenerCount()).toBe(0)
    media.set(false)
    expect(onChange).toHaveBeenCalledTimes(1) // only the initial emit
  })

  it('falls back to the given default and no-ops when matchMedia is unavailable', () => {
    // jsdom has no matchMedia by default.
    const onChange = vi.fn()
    const stop = watchMedia('(any-pointer: fine)', onChange, true)
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true)
    expect(() => stop()).not.toThrow()
  })
})

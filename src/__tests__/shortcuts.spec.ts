import { describe, expect, it, vi } from 'vitest'
import type { ShortcutInput } from '../adapters/types'
import { button, key, mouseButton } from '../helpers'
import type { TriggerRecord } from '../registry'
import { findShortcutTarget, matchShortcut } from '../shortcuts'

type Mods = Partial<Record<'ctrl' | 'shift' | 'alt' | 'meta', boolean>>

const modFlags = (mods: Mods) => ({
  ctrl: mods.ctrl ?? false,
  shift: mods.shift ?? false,
  alt: mods.alt ?? false,
  meta: mods.meta ?? false,
})

const keyInput = (k: string, mods: Mods = {}): ShortcutInput => ({
  kind: 'key',
  key: k,
  ...modFlags(mods),
})

const mouseInput = (b: number, mods: Mods = {}): ShortcutInput => ({
  kind: 'mouse-button',
  button: b,
  ...modFlags(mods),
})

describe('matchShortcut', () => {
  it('matches keys case-insensitively', () => {
    expect(matchShortcut(keyInput('Escape'), key('Escape'))).toBe(true)
    expect(matchShortcut(keyInput('escape'), key('Escape'))).toBe(true)
    expect(matchShortcut(keyInput('Enter'), key('Escape'))).toBe(false)
  })

  it('requires unspecified modifiers to be unpressed', () => {
    expect(matchShortcut(keyInput('s', { ctrl: true }), key('s'))).toBe(false)
    expect(matchShortcut(keyInput('s', { ctrl: true }), key('s', { ctrl: true }))).toBe(true)
    expect(
      matchShortcut(keyInput('s', { ctrl: true, shift: true }), key('s', { ctrl: true })),
    ).toBe(false)
  })

  it('discriminates key, gamepad, and mouse descriptors', () => {
    const gamepadB: ShortcutInput = { kind: 'gamepad-button', button: 1 }
    const mouseBack = mouseInput(3)

    expect(matchShortcut(gamepadB, button('B'))).toBe(true)
    expect(matchShortcut(gamepadB, mouseButton(1))).toBe(false)
    expect(matchShortcut(gamepadB, key('b'))).toBe(false)

    expect(matchShortcut(mouseBack, mouseButton('Back'))).toBe(true)
    expect(matchShortcut(mouseBack, button(3))).toBe(false)

    expect(matchShortcut(keyInput('b'), button('B'))).toBe(false)
  })

  it('requires unspecified modifiers to be unpressed on mouse buttons', () => {
    expect(matchShortcut(mouseInput(2, { ctrl: true }), mouseButton('Right'))).toBe(false)
    expect(matchShortcut(mouseInput(2, { ctrl: true }), mouseButton('Right', { ctrl: true }))).toBe(
      true,
    )
    expect(
      matchShortcut(mouseInput(2, { ctrl: true, shift: true }), mouseButton('Right', { ctrl: true })),
    ).toBe(false)
    expect(matchShortcut(mouseInput(2), mouseButton('Right', { ctrl: true }))).toBe(false)
  })
})

describe('findShortcutTarget', () => {
  const record = (
    id: string,
    shortcuts: TriggerRecord['shortcuts'],
    disabled = false,
  ): TriggerRecord => ({
    id,
    layerId: 'root',
    element: null,
    isDisabled: () => disabled,
    shortcuts,
    autofocus: false,
    onTrigger: vi.fn<() => void>(),
    order: 0,
  })

  it('returns the earliest enabled match', () => {
    const a = record('a', [key('Escape')], true)
    const b = record('b', [key('Escape')])
    expect(findShortcutTarget(keyInput('Escape'), [a, b])).toBe(b)
  })

  it('returns null without a match', () => {
    expect(findShortcutTarget(keyInput('Escape'), [record('a', [key('Enter')])])).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { AvailabilityRegistry } from '../availability'

describe('AvailabilityRegistry', () => {
  it('starts empty', () => {
    const reg = new AvailabilityRegistry()
    expect([...reg.available.value]).toEqual([])
  })

  it('adds and removes sources', () => {
    const reg = new AvailabilityRegistry()
    reg.set('keyboard', true)
    reg.set('gamepad', true)
    expect(reg.available.value.has('keyboard')).toBe(true)
    expect(reg.available.value.has('gamepad')).toBe(true)

    reg.set('gamepad', false)
    expect(reg.available.value.has('gamepad')).toBe(false)
    expect(reg.available.value.has('keyboard')).toBe(true)
  })

  it('reassigns the set immutably only when something changed', () => {
    const reg = new AvailabilityRegistry()
    reg.set('mouse', true)
    const first = reg.available.value

    // No-op: already available → same set instance, no reactive churn.
    reg.set('mouse', true)
    expect(reg.available.value).toBe(first)

    // No-op: removing an absent source → same instance.
    reg.set('gamepad', false)
    expect(reg.available.value).toBe(first)

    // Real change → fresh instance, previous set untouched.
    reg.set('mouse', false)
    expect(reg.available.value).not.toBe(first)
    expect(first.has('mouse')).toBe(true)
  })
})

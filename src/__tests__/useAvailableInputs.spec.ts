import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import type { AdapterContext, InputAdapter } from '../adapters/types'
import { createUniIntent } from '../plugin'
import type { UseAvailableInputsReturn } from '../types'
import { useAvailableInputs } from '../useAvailableInputs'

/** Adapter that only captures the AdapterContext so the test can drive availability. */
function captureAdapter() {
  const captured: { ctx: AdapterContext | null } = { ctx: null }
  const adapter: InputAdapter = {
    name: 'capture',
    setup: (ctx) => {
      captured.ctx = ctx
    },
    teardown: () => {},
  }
  return { adapter, captured }
}

function mountWith(adapter: InputAdapter) {
  let api: UseAvailableInputsReturn | null = null
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useAvailableInputs()
        return () => h('div')
      },
    }),
    { global: { plugins: [createUniIntent({ adapters: [adapter] })] } },
  )
  return { wrapper, api: api as unknown as UseAvailableInputsReturn }
}

describe('useAvailableInputs', () => {
  it('throws without the plugin installed', () => {
    expect(() =>
      mount(
        defineComponent({
          setup() {
            useAvailableInputs()
            return () => h('div')
          },
        }),
      ),
    ).toThrow(/requires the vue-uni-intent plugin/)
  })

  it('reflects adapter-reported availability reactively', async () => {
    const { adapter, captured } = captureAdapter()
    const { api } = mountWith(adapter)

    expect([...api.available.value]).toEqual([])
    expect(api.keyboard.value).toBe(false)
    expect(api.gamepad.value).toBe(false)

    captured.ctx!.setAvailable('keyboard', true)
    captured.ctx!.setAvailable('gamepad', true)
    await nextTick()

    expect(api.keyboard.value).toBe(true)
    expect(api.gamepad.value).toBe(true)
    expect([...api.available.value].sort()).toEqual(['gamepad', 'keyboard'])

    captured.ctx!.setAvailable('gamepad', false)
    await nextTick()
    expect(api.gamepad.value).toBe(false)
    expect(api.keyboard.value).toBe(true)
  })

  it('exposes named refs for built-ins and a has() for custom sources', async () => {
    const { adapter, captured } = captureAdapter()
    const { api } = mountWith(adapter)

    captured.ctx!.setAvailable('mouse', true)
    captured.ctx!.setAvailable('touch', true)
    captured.ctx!.setAvailable('capture', true)
    await nextTick()

    expect(api.mouse.value).toBe(true)
    expect(api.touch.value).toBe(true)
    expect(api.has('capture')).toBe(true)
    expect(api.has('nope')).toBe(false)
  })
})

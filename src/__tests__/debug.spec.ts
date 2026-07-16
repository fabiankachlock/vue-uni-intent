import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { key } from '../helpers'
import { createUniIntent } from '../plugin'
import type { UniIntentOptions, UseTriggerOptions } from '../types'
import { useTrigger } from '../useTrigger'

/** Button component using useTrigger, with a stubbed layout rect. */
const TriggerButton = defineComponent({
  props: {
    options: { type: Object as () => UseTriggerOptions, required: true },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  setup(props) {
    const { ref: el } = useTrigger(props.options)
    const rect = () =>
      ({
        x: props.x,
        y: props.y,
        width: 100,
        height: 40,
        top: props.y,
        left: props.x,
        right: props.x + 100,
        bottom: props.y + 40,
      }) as DOMRect
    return () =>
      h('button', {
        ref: (node) => {
          const element = node as HTMLElement | null
          if (element) element.getBoundingClientRect = rect
          el.value = element
        },
      })
  },
})

const TwoButtons = defineComponent({
  setup: () => () => [
    h(TriggerButton, { options: { id: 'a', onTrigger: () => {} } }),
    h(TriggerButton, { options: { id: 'b', onTrigger: () => {} }, x: 200 }),
  ],
})

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

async function mountWithDebug(
  component: Parameters<typeof mount>[0] = TwoButtons,
  options: Partial<UniIntentOptions> = {},
) {
  wrapper = mount(component as never, {
    attachTo: document.body,
    global: { plugins: [createUniIntent({ adapters: [], debug: true, ...options })] },
  })
  await nextTick()
  await nextTick()
}

function pressHotkey(init: KeyboardEventInit = { key: 'd', ctrlKey: true, altKey: true }) {
  window.dispatchEvent(new KeyboardEvent('keydown', init))
}

const overlay = () => document.querySelector('[data-uni-debug]')

describe('debug overlay', () => {
  it('stays off without the debug option', async () => {
    wrapper = mount(TwoButtons as never, {
      attachTo: document.body,
      global: { plugins: [createUniIntent({ adapters: [] })] },
    })
    await nextTick()
    pressHotkey()
    expect(overlay()).toBeNull()
  })

  it('toggles the overlay on the default hotkey', async () => {
    await mountWithDebug()
    expect(overlay()).toBeNull()

    pressHotkey()
    expect(overlay()).not.toBeNull()

    pressHotkey()
    expect(overlay()).toBeNull()
  })

  it('respects a custom hotkey', async () => {
    await mountWithDebug(TwoButtons, { debug: { hotkey: key('F8') } })

    pressHotkey() // default combo must not toggle
    expect(overlay()).toBeNull()

    pressHotkey({ key: 'F8' })
    expect(overlay()).not.toBeNull()
  })

  it('boxes the active layer targets and marks direction winners with why', async () => {
    await mountWithDebug()
    pressHotkey()

    expect(document.querySelector('[data-uni-debug-box="a"]')).not.toBeNull()
    expect(document.querySelector('[data-uni-debug-box="b"]')).not.toBeNull()

    // "a" holds initial focus; "b" is the target for `right` (Δ200 aligned → score 200).
    const badge = document.querySelector('[data-uni-debug-box="b"] [data-uni-debug-winner="right"]')
    expect(badge).not.toBeNull()
    expect(badge!.textContent).toContain('200')

    const panel = document.querySelector('[data-uni-debug-panel]')!
    expect(panel.textContent).toContain('origin: "a"')
    expect(panel.textContent).toContain('"b" — score 200')
    expect(panel.textContent).toContain('nothing to the left (wrap off)')
  })

  it('shows disabled triggers without treating them as targets', async () => {
    const WithDisabled = defineComponent({
      setup: () => () => [
        h(TriggerButton, { options: { id: 'a', onTrigger: () => {} } }),
        h(TriggerButton, { options: { id: 'off', onTrigger: () => {}, disabled: true }, x: 200 }),
      ],
    })
    await mountWithDebug(WithDisabled)
    pressHotkey()

    const box = document.querySelector('[data-uni-debug-box="off"]')!
    expect(box.textContent).toContain('disabled')
    expect(box.querySelector('[data-uni-debug-winner]')).toBeNull()
    expect(document.querySelector('[data-uni-debug-panel]')!.textContent).toContain('1 disabled')
  })

  it('removes the overlay and the hotkey listener on unmount', async () => {
    await mountWithDebug()
    pressHotkey()
    expect(overlay()).not.toBeNull()

    wrapper!.unmount()
    wrapper = null
    expect(overlay()).toBeNull()

    pressHotkey()
    expect(overlay()).toBeNull()
  })
})

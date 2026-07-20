import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { AdapterContext, InputAdapter } from '../adapters/types'
import { key } from '../helpers'
import { createUniIntent } from '../plugin'
import { useTrigger } from '../useTrigger'
import type { UniIntentOptions, UseTriggerOptions } from '../types'

/** Adapter that only captures the AdapterContext so tests can drive inputs. */
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

/** Button component using useTrigger, with a stubbed layout rect. */
const TriggerButton = defineComponent({
  props: {
    options: { type: Object as () => UseTriggerOptions, required: true },
    x: { type: Number, default: 0 },
  },
  setup(props) {
    const { ref: el, focused } = useTrigger(props.options)
    const rect = () =>
      ({
        x: props.x,
        y: 0,
        width: 100,
        height: 40,
        top: 0,
        left: props.x,
        right: props.x + 100,
        bottom: 40,
      }) as DOMRect
    return () =>
      h('button', {
        ref: (node) => {
          const element = node as HTMLElement | null
          if (element) element.getBoundingClientRect = rect
          el.value = element
        },
        'data-focused': focused.value,
      })
  },
})

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

function mountWithPlugin(component: Parameters<typeof mount>[0], options: UniIntentOptions) {
  return mount(component as never, {
    attachTo: document.body,
    global: { plugins: [createUniIntent(options)] },
  })
}

const twoButtons = (onB: () => void = () => {}) =>
  defineComponent({
    setup: () => () => [
      h(TriggerButton, { options: { id: 'a', onTrigger: () => {} } }),
      h(TriggerButton, { options: { id: 'b', onTrigger: onB }, x: 200 }),
    ],
  })

describe('enabled option', () => {
  it('ignores adapter navigation and activation while disabled', async () => {
    const onB = vi.fn<() => void>()
    const { adapter, captured } = captureAdapter()
    wrapper = mountWithPlugin(twoButtons(onB), { adapters: [adapter], enabled: false })
    await nextTick()

    captured.ctx!.move('right')
    await nextTick()
    // Focus did not move to 'b'.
    expect(wrapper.findAll('button')[1]!.attributes('data-uni-focused')).toBeUndefined()

    captured.ctx!.activate({ source: 'test', via: 'activate' })
    expect(onB).not.toHaveBeenCalled()
  })

  it('ignores shortcuts and hover resolution while disabled', async () => {
    const onBack = vi.fn<() => void>()
    const { adapter, captured } = captureAdapter()
    wrapper = mountWithPlugin(
      defineComponent({
        setup() {
          useTrigger({ id: 'back', onTrigger: onBack, shortcuts: [key('Escape')] })
          return () => h(TriggerButton, { options: { id: 'a', onTrigger: () => {} } })
        },
      }),
      { adapters: [adapter], enabled: false },
    )
    await nextTick()

    const handled = captured.ctx!.dispatchShortcut(
      { kind: 'key', key: 'Escape', ctrl: false, shift: false, alt: false, meta: false },
      { source: 'test', via: 'shortcut' },
    )
    expect(handled).toBe(false)
    expect(onBack).not.toHaveBeenCalled()

    const button = wrapper.find('button').element
    expect(captured.ctx!.isRegisteredElement(button)).toBeNull()
  })

  it('reactively suspends and resumes with a ref', async () => {
    const enabled = ref(true)
    const { adapter, captured } = captureAdapter()
    wrapper = mountWithPlugin(twoButtons(), { adapters: [adapter], enabled })
    await nextTick()

    // Enabled: navigation works.
    captured.ctx!.move('right')
    await nextTick()
    expect(wrapper.findAll('button')[1]!.attributes('data-uni-focused')).toBe('')

    // Disable, then navigation back to 'a' is ignored.
    enabled.value = false
    captured.ctx!.move('left')
    await nextTick()
    expect(wrapper.findAll('button')[1]!.attributes('data-uni-focused')).toBe('')

    // Re-enable: navigation works again.
    enabled.value = true
    captured.ctx!.move('left')
    await nextTick()
    expect(wrapper.findAll('button')[0]!.attributes('data-uni-focused')).toBe('')
  })

  it('leaves programmatic focus/trigger working while disabled', async () => {
    const onA = vi.fn<() => void>()
    let api: ReturnType<typeof useTrigger> | null = null
    const { adapter } = captureAdapter()
    wrapper = mountWithPlugin(
      defineComponent({
        setup() {
          api = useTrigger({ id: 'a', onTrigger: onA })
          return () => h('button', { ref: api!.ref })
        },
      }),
      { adapters: [adapter], enabled: false },
    )
    await nextTick()

    // The consumer's own API bypasses the input gate entirely.
    api!.trigger()
    expect(onA).toHaveBeenCalledOnce()
    api!.focus()
    await nextTick()
    expect(api!.focused.value).toBe(true)
  })
})

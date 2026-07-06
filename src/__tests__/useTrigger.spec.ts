import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { AdapterContext, InputAdapter } from '../adapters/types'
import { key } from '../helpers'
import { createUniIntent } from '../plugin'
import { useTrigger } from '../useTrigger'
import { useTriggerLayer } from '../layers'
import type { UseTriggerOptions } from '../types'

/** Adapter that only captures the AdapterContext so tests can drive inputs. */
function captureAdapter() {
  const captured: { ctx: AdapterContext | null; tornDown: boolean } = {
    ctx: null,
    tornDown: false,
  }
  const adapter: InputAdapter = {
    name: 'capture',
    setup: (ctx) => {
      captured.ctx = ctx
    },
    teardown: () => {
      captured.tornDown = true
    },
  }
  return { adapter, captured }
}

/** Button component using useTrigger, with a stubbed layout rect. */
const TriggerButton = defineComponent({
  props: {
    options: { type: Object as () => UseTriggerOptions, required: true },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  setup(props) {
    const { ref: el, focused } = useTrigger(props.options)
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

function mountWithPlugin(component: Parameters<typeof mount>[0], adapters: InputAdapter[] = []) {
  return mount(component as never, {
    attachTo: document.body,
    global: { plugins: [createUniIntent({ adapters })] },
  })
}

describe('useTrigger', () => {
  it('throws without the plugin', () => {
    expect(() =>
      mount(TriggerButton, { props: { options: { id: 'a', onTrigger: () => {} } } }),
    ).toThrow(/requires the vue-uni-intent plugin/)
  })

  it('registers, stamps the element, and receives initial focus', async () => {
    const { adapter, captured } = captureAdapter()
    wrapper = mountWithPlugin(
      defineComponent({
        setup: () => () => [
          h(TriggerButton, { options: { id: 'a', onTrigger: () => {} } }),
          h(TriggerButton, { options: { id: 'b', onTrigger: () => {} }, x: 200 }),
        ],
      }),
      [adapter],
    )
    // First tick resolves auto-focus, second re-renders the focused prop.
    await nextTick()
    await nextTick()

    const first = wrapper.findAll('button')[0]!
    expect(first.attributes('data-uni-trigger')).toBe('a')
    expect(first.attributes('data-uni-focused')).toBe('')
    expect(first.attributes('data-focused')).toBe('true')
    expect(captured.ctx).not.toBeNull()
  })

  it('prefers an autofocus trigger for initial focus', async () => {
    wrapper = mountWithPlugin(
      defineComponent({
        setup: () => () => [
          h(TriggerButton, { options: { id: 'a', onTrigger: () => {} } }),
          h(TriggerButton, { options: { id: 'b', onTrigger: () => {}, autofocus: true }, x: 200 }),
        ],
      }),
    )
    await nextTick()
    expect(wrapper.find('[data-uni-focused]').attributes('data-uni-trigger')).toBe('b')
  })

  it('navigates and activates through the adapter context', async () => {
    const onA = vi.fn<() => void>()
    const onB = vi.fn<() => void>()
    const { adapter, captured } = captureAdapter()
    wrapper = mountWithPlugin(
      defineComponent({
        setup: () => () => [
          h(TriggerButton, { options: { id: 'a', onTrigger: onA } }),
          h(TriggerButton, { options: { id: 'b', onTrigger: onB }, x: 200 }),
        ],
      }),
      [adapter],
    )
    await nextTick()

    captured.ctx!.move('right')
    await nextTick()
    expect(wrapper.findAll('button')[1]!.attributes('data-uni-focused')).toBe('')

    captured.ctx!.activate()
    expect(onB).toHaveBeenCalledOnce()
    expect(onA).not.toHaveBeenCalled()
  })

  it('fires element-less shortcut triggers', async () => {
    const onBack = vi.fn<() => void>()
    const { adapter, captured } = captureAdapter()
    wrapper = mountWithPlugin(
      defineComponent({
        setup() {
          // Never binds the ref — pure shortcut handler.
          useTrigger({ id: 'back', onTrigger: onBack, shortcuts: [key('Escape')] })
          return () => h(TriggerButton, { options: { id: 'a', onTrigger: () => {} } })
        },
      }),
      [adapter],
    )
    await nextTick()

    const handled = captured.ctx!.dispatchShortcut({
      kind: 'key',
      key: 'Escape',
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,
    })
    expect(handled).toBe(true)
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('deregisters on unmount and refocuses a survivor', async () => {
    const show = ref(true)
    const { adapter, captured } = captureAdapter()
    wrapper = mountWithPlugin(
      defineComponent({
        setup: () => () => [
          show.value ? h(TriggerButton, { options: { id: 'a', onTrigger: () => {} } }) : null,
          h(TriggerButton, { options: { id: 'b', onTrigger: () => {} }, x: 200 }),
        ],
      }),
      [adapter],
    )
    await nextTick()
    expect(wrapper.find('[data-uni-focused]').attributes('data-uni-trigger')).toBe('a')

    show.value = false
    await nextTick()
    expect(wrapper.find('[data-uni-focused]').attributes('data-uni-trigger')).toBe('b')

    captured.ctx!.move('left')
    await nextTick()
    // "a" is gone — focus stays on "b".
    expect(wrapper.find('[data-uni-focused]').attributes('data-uni-trigger')).toBe('b')
  })

  it('confines layers mounted via useTriggerLayer and restores focus', async () => {
    const open = ref(false)
    const onCancel = vi.fn<() => void>()
    const { adapter, captured } = captureAdapter()

    const Modal = defineComponent({
      setup() {
        useTriggerLayer({ id: 'modal' })
        return () => [
          h(TriggerButton, { options: { id: 'ok', onTrigger: () => {} }, y: 300 }),
          h(TriggerButton, {
            options: { id: 'cancel', onTrigger: onCancel, shortcuts: [key('Escape')] },
            x: 200,
            y: 300,
          }),
        ]
      },
    })

    wrapper = mountWithPlugin(
      defineComponent({
        setup: () => () => [
          h(TriggerButton, { options: { id: 'a', onTrigger: () => {} } }),
          h(TriggerButton, { options: { id: 'b', onTrigger: () => {} }, x: 200 }),
          open.value ? h(Modal) : null,
        ],
      }),
      [adapter],
    )
    await nextTick()

    captured.ctx!.move('right') // focus "b"
    await nextTick()

    open.value = true
    await nextTick()
    expect(wrapper.find('[data-uni-focused]').attributes('data-uni-trigger')).toBe('ok')

    // Navigation is confined to the modal: "up" cannot reach the root grid.
    captured.ctx!.move('up')
    await nextTick()
    expect(wrapper.find('[data-uni-focused]').attributes('data-uni-trigger')).toBe('ok')

    // ESC shortcut hits the modal's cancel, not anything in the root layer.
    captured.ctx!.dispatchShortcut({
      kind: 'key',
      key: 'Escape',
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,
    })
    expect(onCancel).toHaveBeenCalledOnce()

    // Closing restores the root layer's remembered focus ("b").
    open.value = false
    await nextTick()
    expect(wrapper.find('[data-uni-focused]').attributes('data-uni-trigger')).toBe('b')
  })

  it('attaches triggers to a layer declared in the same component setup', async () => {
    const { adapter, captured } = captureAdapter()

    // useTriggerLayer + useTrigger in ONE setup — provide/inject alone
    // would miss this, since provide only reaches descendants.
    const SelfContainedModal = defineComponent({
      setup() {
        useTriggerLayer({ id: 'self-modal' })
        return () => h(TriggerButton, { options: { id: 'close', onTrigger: () => {} }, y: 300 })
      },
    })

    wrapper = mountWithPlugin(
      defineComponent({
        setup: () => () => [
          h(TriggerButton, { options: { id: 'a', onTrigger: () => {} } }),
          h(SelfContainedModal),
        ],
      }),
      [adapter],
    )
    await nextTick()
    await nextTick()

    // The modal's trigger owns focus, and navigation cannot escape to "a".
    expect(wrapper.find('[data-uni-focused]').attributes('data-uni-trigger')).toBe('close')
    captured.ctx!.move('up')
    await nextTick()
    expect(wrapper.find('[data-uni-focused]').attributes('data-uni-trigger')).toBe('close')
  })

  it('skips disabled triggers in navigation and shortcut dispatch', async () => {
    const disabled = ref(true)
    const onB = vi.fn<() => void>()
    const { adapter, captured } = captureAdapter()
    wrapper = mountWithPlugin(
      defineComponent({
        setup: () => () => [
          h(TriggerButton, { options: { id: 'a', onTrigger: () => {} } }),
          h(TriggerButton, {
            options: {
              id: 'b',
              onTrigger: onB,
              disabled,
              shortcuts: [key('x')],
            },
            x: 200,
          }),
        ],
      }),
      [adapter],
    )
    await nextTick()

    captured.ctx!.move('right')
    await nextTick()
    expect(wrapper.find('[data-uni-focused]').attributes('data-uni-trigger')).toBe('a')

    const input = {
      kind: 'key',
      key: 'x',
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,
    } as const
    expect(captured.ctx!.dispatchShortcut(input)).toBe(false)

    disabled.value = false
    expect(captured.ctx!.dispatchShortcut(input)).toBe(true)
    expect(onB).toHaveBeenCalledOnce()
  })

  it('tears adapters down on app unmount', async () => {
    const { adapter, captured } = captureAdapter()
    wrapper = mountWithPlugin(
      defineComponent({
        setup: () => () => h(TriggerButton, { options: { id: 'a', onTrigger: () => {} } }),
      }),
      [adapter],
    )
    await nextTick()
    expect(captured.tornDown).toBe(false)
    wrapper.unmount()
    wrapper = null
    expect(captured.tornDown).toBe(true)
  })
})

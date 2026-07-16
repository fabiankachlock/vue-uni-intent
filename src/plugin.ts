import type { Plugin } from 'vue'
import { createInputContext } from './context'
import { DebugController } from './debug'
import { INPUT_CONTEXT_KEY } from './keys'
import type { UniIntentOptions } from './types'

/**
 * Create the vue-uni-intent plugin. Adapters are explicit — the core is
 * input-source-agnostic:
 *
 * ```ts
 * app.use(createUniIntent({
 *   adapters: [keyboardAdapter(), mouseAdapter(), gamepadAdapter()],
 * }));
 * ```
 */
export function createUniIntent(options: UniIntentOptions): Plugin {
  return {
    install(app) {
      const ctx = createInputContext(options)
      app.provide(INPUT_CONTEXT_KEY, ctx)

      // SSR: no adapters, no listeners — composables still register fine.
      if (typeof window === 'undefined') return

      const adapters = options.adapters ?? []
      if (import.meta.env.DEV && adapters.length === 0) {
        console.warn(
          '[vue-uni-intent] No adapters configured — triggers can only be fired ' +
            'programmatically. Pass e.g. keyboardAdapter()/mouseAdapter()/gamepadAdapter().',
        )
      }

      for (const adapter of adapters) adapter.setup(ctx.adapterContext)
      ctx.focus.attachFocusinSync(window)

      let debug: DebugController | null = null
      if (options.debug) {
        debug = new DebugController(ctx, options.debug === true ? {} : options.debug)
        debug.setup()
      }

      app.onUnmount(() => {
        for (const adapter of adapters) adapter.teardown()
        ctx.focus.detachFocusinSync()
        debug?.teardown()
      })
    },
  }
}

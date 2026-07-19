import { computed, inject } from 'vue'
import { INPUT_CONTEXT_KEY } from './keys'
import type { UseAvailableInputsReturn } from './types'

/**
 * Reactively observe which input sources are currently usable, as reported by
 * the installed adapters. The built-in sources are `keyboard`, `mouse` (fine
 * pointer), `touch` (coarse pointer), and `gamepad` — each reflects real device
 * capability, so `touch`/`gamepad` flip on and off and `keyboard`/`mouse` are
 * absent on devices that lack them.
 *
 * ```ts
 * const { available, gamepad, touch } = useAvailableInputs();
 * // phone:   available.value -> Set { "touch" };            gamepad.value -> false
 * // desktop: available.value -> Set { "keyboard", "mouse" }
 * // plug in a controller -> adds "gamepad";                 gamepad.value -> true
 * ```
 */
export function useAvailableInputs(): UseAvailableInputsReturn {
  const ctx = inject(INPUT_CONTEXT_KEY)
  if (!ctx) {
    throw new Error(
      '[vue-uni-intent] useAvailableInputs() requires the vue-uni-intent plugin. ' +
        'Install it with app.use(createUniIntent({ adapters: [...] })).',
    )
  }
  const source = ctx.availability.available
  const available = computed(() => source.value)
  return {
    available,
    keyboard: computed(() => source.value.has('keyboard')),
    mouse: computed(() => source.value.has('mouse')),
    touch: computed(() => source.value.has('touch')),
    gamepad: computed(() => source.value.has('gamepad')),
    has: (name) => source.value.has(name),
  }
}

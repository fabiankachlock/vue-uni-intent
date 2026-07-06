import { computed, getCurrentInstance, inject, onScopeDispose, ref, toValue, watch } from "vue";
import { INPUT_CONTEXT_KEY, LAYER_ID_KEY } from "./keys";
import { ROOT_LAYER_ID } from "./layers";
import type { UseTriggerOptions, UseTriggerReturn } from "./types";

/**
 * Register a controllable trigger. Bind the returned `ref` to an element to
 * make it focusable/navigable; leave it unbound for a pure shortcut handler.
 *
 * ```ts
 * const { ref, focused } = useTrigger({ id: "confirm", onTrigger: save });
 * ```
 */
export function useTrigger(options: UseTriggerOptions): UseTriggerReturn {
  const ctx = inject(INPUT_CONTEXT_KEY);
  if (!ctx) {
    throw new Error(
      "[vue-uni-intent] useTrigger() requires the vue-uni-intent plugin. " +
        "Install it with app.use(createUniIntent({ adapters: [...] })).",
    );
  }
  // A layer declared earlier in this component's setup wins over an inherited one.
  const instance = getCurrentInstance();
  const layerId =
    (instance ? ctx.ownLayers.get(instance) : undefined) ?? inject(LAYER_ID_KEY, ROOT_LAYER_ID);
  const elementRef = ref<HTMLElement | null>(null);

  // Register synchronously so shortcuts and autofocus exist before mount;
  // the element arrives via the template ref below.
  const record = ctx.registry.register({
    id: options.id,
    layerId,
    element: null,
    isDisabled: () => toValue(options.disabled) ?? false,
    shortcuts: options.shortcuts ?? [],
    autofocus: options.autofocus ?? false,
    onTrigger: options.onTrigger,
  });

  watch(
    elementRef,
    (el) => {
      ctx.registry.setElement(record, el);
      if (el) {
        // Mouse adapters delegate via this attribute; roving tabindex keeps
        // Tab from visiting every trigger.
        el.setAttribute("data-uni-trigger", record.id);
        if (ctx.focus.focusedRecord.value === record) {
          // Focus landed on this trigger before its element settled.
          ctx.focus.syncElementFocus(record);
        } else {
          el.tabIndex = -1;
          ctx.focus.scheduleAutoFocus(layerId);
        }
      }
    },
    { flush: "post" },
  );

  onScopeDispose(() => {
    ctx.registry.deregister(record.id, layerId);
    ctx.focus.onTriggerRemoved(record);
  });

  return {
    ref: elementRef,
    focused: computed(() => ctx.focus.focusedRecord.value === record),
    focus: () => ctx.focus.focus(record),
    trigger: () => record.onTrigger(),
  };
}

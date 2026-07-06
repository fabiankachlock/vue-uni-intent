import type { InjectionKey } from "vue";
import type { InputContext } from "./context";

export const INPUT_CONTEXT_KEY: InjectionKey<InputContext> = Symbol("vue-uni-intent:context");

/** Provided by `useTriggerLayer` so descendant `useTrigger` calls attach to that layer. */
export const LAYER_ID_KEY: InjectionKey<string> = Symbol("vue-uni-intent:layer");

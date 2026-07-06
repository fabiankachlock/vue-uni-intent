# vue-uni-intent

Unified, game-menu-like button control for Vue 3 — one focused trigger at a time, navigable with **keyboard**, **mouse**, and **gamepad** through a single API.

- **Spatial navigation** — "where does *up* go?" is answered automatically from the DOM rects of the registered triggers (no manual focus graphs).
- **Isolated input adapters** — keyboard, mouse, and gamepad ship as separate adapters you explicitly configure; the core only knows the `InputAdapter` contract, so you can omit, replace, or add input sources freely.
- **Unified shortcut layer** — `Escape`, gamepad `B`, or the mouse back-button can fire the same trigger as a visible button, declared in one place.
- **Focus layers** — a modal confines navigation and shortcuts to its own triggers and restores the previous focus when it closes.
- **Accessible by default** — real `element.focus()`, roving tabindex, `data-uni-focused` styling hook, native Tab adoption.

## Setup

```ts
import { createApp } from "vue";
import {
  createUniIntent,
  keyboardAdapter,
  mouseAdapter,
  gamepadAdapter,
} from "vue-uni-intent";

createApp(App)
  .use(
    createUniIntent({
      // Adapters are explicit — pick the input sources you want.
      adapters: [
        keyboardAdapter({
          // All keys are configurable; these are the defaults.
          keys: {
            up: ["ArrowUp"],
            down: ["ArrowDown"],
            left: ["ArrowLeft"],
            right: ["ArrowRight"],
            activate: ["Enter", " "],
          },
        }),
        mouseAdapter(),
        gamepadAdapter({ deadzone: 0.5, initialRepeatDelay: 400, repeatInterval: 150 }),
      ],
      wrap: false, // wrap-around navigation at the edges
      initialFocus: "first", // or "none"
    }),
  )
  .mount("#app");
```

## useTrigger

```vue
<script setup lang="ts">
import { useTrigger, key, button, mouseButton } from "vue-uni-intent";

const { ref: el, focused, focus, trigger } = useTrigger({
  id: "back",
  onTrigger: () => router.back(),
  // Optional: same handler fires on ESC, gamepad B, or the mouse back button.
  shortcuts: [key("Escape"), button("B"), mouseButton("Back")],
  disabled: () => busy.value, // skipped by navigation + shortcuts
  autofocus: true,            // take the layer's initial focus
});
</script>

<template>
  <button ref="el" :class="{ active: focused }">Back</button>
</template>
```

Style the focused trigger via the attribute hook:

```css
[data-uni-focused] {
  outline: 3px solid dodgerblue;
}
```

Leave the `ref` unbound to get a pure shortcut handler that participates in the
same trigger system but not in spatial navigation.

## Focus layers

```vue
<script setup lang="ts">
import { useTriggerLayer } from "vue-uni-intent";

// While this component is mounted (and topmost), navigation and shortcuts are
// confined to its descendants' triggers. Unmounting restores previous focus.
const { isActive } = useTriggerLayer({ id: "settings-modal" });
</script>
```

## Shortcut helpers

```ts
import { key, button, mouseButton, GamepadButton, MouseButton, GamepadAxis } from "vue-uni-intent";

key("Escape");            // { key: "Escape" }
key("s", { ctrl: true }); // { key: "s", ctrl: true }
button("B");              // { button: 1 }  (standard-mapping index via GamepadButton)
mouseButton("Back");      // { mouseButton: 3 }
```

> Note: gamepad names follow the **standard mapping by position** — on Nintendo
> controllers the physical A/B and X/Y labels are swapped relative to it.

## Custom adapters

An adapter is any object implementing `InputAdapter`; it receives an
`AdapterContext` — the entire coupling surface to the core:

```ts
import type { InputAdapter } from "vue-uni-intent";

export function midiAdapter(): InputAdapter {
  let stop = () => {};
  return {
    name: "midi",
    setup(ctx) {
      // wire your input source to:
      // ctx.move("up" | "down" | "left" | "right")
      // ctx.activate()
      // ctx.focus(id)
      // ctx.dispatchShortcut(input)
    },
    teardown() {
      stop();
    },
  };
}
```

## Development

```sh
pnpm install
pnpm dev        # playground app (playground/)
pnpm test:unit  # vitest
pnpm build      # type-check + library build to dist/
pnpm lint
```

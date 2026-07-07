# vue-uni-intent

A universal intent system for Game-menu style button control for Vue 3: one focused trigger at a time, navigable with keyboard, mouse, and gamepad through a single API.

- Spatial navigation is computed from the DOM positions of the registered triggers, so "where does *up* go?" is answered automatically and there is no focus graph to maintain.
- Keyboard, mouse, and gamepad ship as separate adapters that you configure explicitly. The core only knows the `InputAdapter` contract, so input sources can be omitted, replaced, or added.
- Shortcuts are unified across inputs: `Escape`, gamepad `B`, and the mouse back button can all fire the same trigger as a visible button.
- Focus layers let a modal confine navigation and shortcuts to its own triggers and restore the previous focus when it closes.
- Triggers use real `element.focus()` with a roving tabindex, so native Tab navigation keeps working. A `data-uni-focused` attribute is set for styling.

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
      // pick the input sources you want
      adapters: [
        keyboardAdapter({
          // all keys are configurable; these are the defaults
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
  // optional: the same handler fires on ESC, gamepad B, or the mouse back button
  shortcuts: [key("Escape"), button("B"), mouseButton("Back")],
  disabled: () => busy.value, // skipped by navigation and shortcuts
  autofocus: true,            // take the layer's initial focus
});
</script>

<template>
  <button ref="el" :class="{ active: focused }">Back</button>
</template>
```

The focused trigger can be styled via the attribute hook:

```css
[data-uni-focused] {
  outline: 3px solid dodgerblue;
}
```

If you leave the `ref` unbound, the trigger acts as a pure shortcut handler: it
participates in the trigger system but not in spatial navigation.

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

key("Escape");                      // { key: "Escape" }
key("s", { ctrl: true });           // { key: "s", ctrl: true }
button("B");                        // { button: 1 }  (standard-mapping index via GamepadButton)
mouseButton("Back");                // { mouseButton: 3 }
mouseButton("Right", { ctrl: true }); // { mouseButton: 2, ctrl: true }
```

Note that gamepad names follow the standard mapping by position. On Nintendo
controllers the physical A/B and X/Y labels are swapped relative to it.

## Custom adapters

An adapter is any object implementing `InputAdapter`. It receives an
`AdapterContext` in `setup`, which is its only connection to the core:

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
pnpm storybook  # interactive examples (playground/stories/)
pnpm dev        # minimal dev app + e2e smoke page (playground/)
pnpm test:unit  # vitest
pnpm build      # type-check + library build to dist/
pnpm lint
```

The Storybook stories serve as usage examples: grid navigation (wrap modes,
disabled triggers, custom WASD bindings), focus strategies, global shortcuts,
modal and nested layers, programmatic control, and a full game-menu example.
Stories override plugin options per story via `parameters.uniIntent` (see
`.storybook/preview.ts`).

## AI assistance

This library was built with the help of AI (Claude). AI was used to assist with
implementation, tests, and documentation; all output was reviewed and is maintained
by a human.

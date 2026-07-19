# vue-uni-intent

A universal intent system for Game-menu style button control for Vue 3: one focused trigger at a time, navigable with keyboard, mouse, and gamepad through a single API.

- Spatial navigation is computed from the DOM positions of the registered triggers, so "where does *up* go?" is answered automatically and there is no focus graph to maintain.
- Keyboard, mouse, and gamepad ship as separate adapters that you configure explicitly. The core only knows the `InputAdapter` contract, so input sources can be omitted, replaced, or added.
- Shortcuts are unified across inputs: `Escape`, gamepad `B`, and the mouse back button can all fire the same trigger as a visible button.
- Focus layers let a modal confine navigation and shortcuts to its own triggers and restore the previous focus when it closes.
- Triggers use real `element.focus()`, and every trigger of the active layer stays in the native Tab order, so pressing Tab moves between triggers and any landing is adopted as focus. A `data-uni-focused` attribute is set for styling.

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
        gamepadAdapter({
          deadzone: 0.5,
          initialRepeatDelay: 400,
          repeatInterval: 150,
          rightStickScroll: true, // right stick scrolls the focused item's scroll container (default off)
          scrollSpeed: 1200, // px/sec at full deflection; invertScrollY to flip Y
        }),
      ],
      wrap: false, // wrap-around navigation at the edges
      initialFocus: "first", // or "none"
      scroll: true, // scroll the focused trigger into view; or ScrollIntoViewOptions / false
      scrollMargin: { top: 64 }, // keep-clear space so a sticky header never covers focus
    }),
  )
  .mount("#app");
```

### Navigation

Navigation is **edge-based**, like browsers (Blink / the CSS spatial-navigation
spec) and game engines — never center-to-center. Pressing a direction keeps only
the triggers whose leading edge clears the origin's leading edge in that
direction, then picks the one minimizing `forwardGap + crossGap × 2`, where
`crossGap` is `0` while the rects overlap on the cross axis. Because it reads
rectangle edges, it matches what you see: a full-bleed element has nothing to
its left or right, a focus-lift animation or sub-pixel stagger can't divert a
straight press to a sideways neighbor, and a pinned header never wins just
because its center is close. `wrap` cycles to the opposite edge of the same
row/column at the boundaries.

### Scrolling focus into view

Focus moves scroll the new target into view (real `focus({ preventScroll })`
followed by `scrollIntoView`). Control it with `scroll`:

- `true` (default) — `{ block: "nearest", inline: "nearest" }`
- `false` — never scroll; handle it yourself in `onFocus`
- `ScrollIntoViewOptions` — e.g. `{ block: "center" }` to keep focus centered

Behind a **sticky header**, use `scrollMargin` so focus is never parked
underneath it — set the top margin to (at least) the header's height:

```ts
createUniIntent({ /* … */ scrollMargin: { top: 64 } }); // or a number for all sides
```

`scrollMargin` is applied as the trigger's `scroll-margin` (which
`scrollIntoView` honors), so it needs no CSS. Equivalently you can set
`scroll-margin` on the triggers or `scroll-padding` on the scroll container
yourself and leave `scrollMargin` unset.

## useTrigger

```vue
<script setup lang="ts">
import { useTrigger, key, button, mouseButton } from "vue-uni-intent";

const { ref: el, focused, focus, trigger } = useTrigger({
  id: "back",
  onTrigger: () => router.back(),
  onFocus: (cause) => preview(cause), // optional: runs whenever this trigger gains focus
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

## What fired a trigger

`onTrigger` receives a `TriggerCause`: `source` (the firing adapter's `name`, or
`"manual"`), `via` (`"activate"`, `"shortcut"`, or `"manual"`), and whatever the
adapter attached — a native `event` for keyboard/mouse, the `button` index for
gamepad. The core stays input-agnostic, so the shape is open; type guards narrow
it:

```ts
import { isKeyboardCause, isGamepadCause } from "vue-uni-intent";

onTrigger: (cause) => {
  if (isKeyboardCause(cause)) cause.event.preventDefault(); // KeyboardEvent
  else if (isGamepadCause(cause)) console.log(cause.button); // standard-mapping index
  save();
};
```

`isMouseCause` and `isManualCause` are exported too. Custom adapters attach their
own detail; narrow it with your own guard.

## What focused a trigger

`onFocus` mirrors `onTrigger` for focus changes: it runs every time a trigger
gains focus and receives a `FocusCause`. Like `TriggerCause`, adapter-driven
focus carries the adapter's `source` and any native `event`; focus the core
resolves itself carries `source: "core"`, and a programmatic `focus()` carries
`source: "manual"`. The `via` field says how focus was gained:

- `"navigate"` — spatial navigation (`direction` is set)
- `"focus"` — direct focus of a trigger (mouse hover/click)
- `"programmatic"` — a `useTrigger().focus()` call
- `"tab"` — native focus landing on a trigger, adopted via `focusin` (Tab/Shift+Tab, or a click)
- `"restore"` — a layer became active again and its remembered focus returned
- `"initial"` — a layer/app resolved its initial focus
- `"cleanup"` — the focused trigger was removed and focus fell back to a survivor

```ts
import { isKeyboardFocusCause, isManualFocusCause } from "vue-uni-intent";

onFocus: (cause) => {
  if (cause.via === "navigate") announce(cause.direction);   // "up" | "down" | …
  if (isKeyboardFocusCause(cause)) cause.event.preventDefault(); // KeyboardEvent
  if (isManualFocusCause(cause)) return; // ignore our own focus() calls
};
```

`isMouseFocusCause`, `isGamepadFocusCause`, and `isCoreFocusCause` are exported
too.

## Focus layers

```vue
<script setup lang="ts">
import { useTriggerLayer } from "vue-uni-intent";

// While this component is mounted (and topmost), navigation and shortcuts are
// confined to its descendants' triggers. Unmounting restores previous focus.
const { isActive } = useTriggerLayer({ id: "settings-modal" });
</script>
```

## Available inputs

`useAvailableInputs()` reactively reports which input sources can actually be
used right now, so you can adapt the UI — swap button-prompt glyphs, hide
keyboard hints on a touch phone, show a "controller connected" badge:

```vue
<script setup lang="ts">
import { useAvailableInputs } from "vue-uni-intent";

const { available, keyboard, mouse, touch, gamepad } = useAvailableInputs();
// available -> reactive ReadonlySet of source names, e.g. Set { "keyboard", "mouse" }
// keyboard / mouse / touch / gamepad -> reactive booleans
// available.has("midi") — or use has("midi") — for custom adapters
</script>
```

Availability reflects real device capability, reported by the installed
adapters — nothing is available unless its adapter is installed:

- **`keyboard`** — inferred from the primary pointer (a fine pointer implies a
  desktop with a keyboard; a coarse one implies a touch device without), then
  confirmed the moment any real keydown arrives (so a Bluetooth keyboard on a
  tablet flips it on).
- **`mouse`** — a fine pointer (mouse/trackpad) exists (`(any-pointer: fine)`).
- **`touch`** — a coarse pointer (finger) exists (`(any-pointer: coarse)`).
  `mouse` and `touch` are independent: a hybrid laptop reports both.
- **`gamepad`** — at least one controller is connected; flips on and off as
  controllers connect and disconnect.

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
`AdapterContext` in `setup`, which is its only connection to the core. When it
fires a trigger it passes a [cause](#what-fired-a-trigger) — a `source` (usually
its `name`), a `via`, and any native `event` or detail:

```ts
import type { InputAdapter } from "vue-uni-intent";

export function midiAdapter(): InputAdapter {
  let stop = () => {};
  return {
    name: "midi",
    setup(ctx) {
      // wire your input source to:
      // ctx.move("up" | "down" | "left" | "right")
      // ctx.activate({ source: "midi", via: "activate", note })
      // ctx.focus(id)
      // ctx.dispatchShortcut(input, { source: "midi", via: "shortcut", note })
      // ctx.setAvailable("midi", true) — surfaces via useAvailableInputs()
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

# CLAUDE.md

Guidance for working in this repository.

## What this is

`vue-uni-intent` is a Vue 3 library for game-menu-style focus control: exactly one
trigger is focused at a time, navigable with keyboard, mouse, and gamepad through a
single API. Spatial navigation is derived from the DOM positions of registered
triggers, so there is no focus graph to maintain. See `README.md` for the consumer-facing
API and usage examples.

## Core design principles

- **Input-agnostic core.** The core knows nothing about specific input sources. Keyboard,
  mouse, and gamepad are separate **adapters** the consumer installs explicitly via
  `createUniIntent({ adapters: [...] })`. The entire coupling surface between an adapter
  and the core is the `AdapterContext` (`src/adapters/types.ts`) — adapters never touch
  the registry, layers, or each other.
- **Per-app state, never module-global.** All state lives in an `InputContext`
  (`src/context.ts`) created in the plugin's `install()` and shared via provide/inject.
  Multiple apps can coexist.
- **Real DOM focus.** The focused trigger gets a real `element.focus()` (with
  `preventScroll`, then a follow-up `scrollIntoView` the core controls via the `scroll` /
  `scrollMargin` options — `scrollMargin` is written to the element's `scroll-margin` to
  clear sticky headers, and a per-trigger `useTrigger({ scrollMargin })` overrides the
  global one for that element). Every trigger of the **active** layer stays tabbable
  (`tabIndex = 0`; inactive-layer or disabled triggers are `-1`), so native Tab moves
  between triggers and a `focusin` listener adopts wherever it lands as the single focus.
  A `data-uni-focused` attribute is set for styling; `data-uni-trigger`
  marks trigger elements for mouse delegation.

## Architecture

The pieces and their responsibilities:

- `src/plugin.ts` — `createUniIntent()`. Builds the context, calls `adapter.setup()` on
  each adapter (client only; SSR skips listeners), wires focusin sync, tears down on unmount.
- `src/context.ts` — assembles the `InputContext` and defines the `AdapterContext` the
  adapters receive.
- `src/registry.ts` — `TriggerRegistry`. Reactive `Map` of `TriggerRecord`s keyed by
  `${layerId}-${id}`, plus an element→record map. `order` counter gives stable
  registration order (used for nav ties and shortcut precedence).
- `src/focus.ts` — `FocusManager`. Owns the single-focus invariant: which trigger is
  focused, spatial `move()`, mirroring to the DOM, focus memory, and adopting native focus
  changes (Tab) via the `focusin` listener.
- `src/navigation.ts` — pure `findNext()` / `explainNext()`. Given the origin rect,
  candidate rects, a direction, and `wrap`, returns the target id. **Edge-based** (like
  Blink / the CSS spatial-nav spec), never center-to-center: `project()` orients each
  rect's leading/trailing edges so "forward" increases; a candidate is "ahead" only if its
  near edge clears the origin's far edge; score is `max(0, forwardGap) + crossGap ×
  CROSS_AXIS_WEIGHT` with `crossGap = 0` on cross-axis overlap. This is what makes
  full-bleed elements, lifted focus, and pinned headers behave. No Vue, no DOM —
  fully unit-testable.
- `src/debug.ts` — `DebugController`. The hotkey-toggled spatial-navigation overlay:
  boxes each visible trigger showing its per-direction scores in place (winner
  highlighted), draws the winning connector lines, and renders a score matrix (every
  candidate's score in every direction) plus a per-direction summary. Plain DOM, no Vue;
  re-measures each frame via `explainNext`.
- `src/layers.ts` — `LayerManager` + `useTriggerLayer()`. A stack of focus layers; the
  topmost owns navigation/activation/shortcuts. Root layer is always at the bottom.
- `src/shortcuts.ts` — `matchShortcut()` / `findShortcutTarget()`. Match a raw input against
  descriptors; earliest registered match wins (ambiguity warns in dev).
- `src/useTrigger.ts` — the `useTrigger()` composable. Registers a record synchronously
  (so shortcuts/autofocus exist pre-mount), binds the element via the template ref.
- `src/availability.ts` — `AvailabilityRegistry`. A reactive `ShallowRef<ReadonlySet<string>>`
  of usable input-source names, reassigned immutably on change. Adapters push into it via
  `AdapterContext.setAvailable(name, boolean)`; the core only stores strings (stays
  input-agnostic). Surfaced to consumers by `useAvailableInputs()`.
- `src/useAvailableInputs.ts` — the `useAvailableInputs()` composable. Exposes the availability
  set plus named `keyboard`/`mouse`/`touch`/`gamepad` boolean refs and a `has(name)`.
- `src/adapters/media.ts` — `watchMedia(query, onChange, fallback)`. Watches a CSS media query
  (immediate + on change, with cleanup); falls back to `fallback` when `matchMedia` is
  unavailable (SSR/jsdom). Used for capability-based availability.
- `src/helpers.ts` — `key()`, `button()`, `mouseButton()` descriptor builders and the
  `Key` / `GamepadButton` / `GamepadAxis` / `MouseButton` name→index constants.
- `src/adapters/` — `keyboard.ts`, `mouse.ts`, `gamepad.ts` and the adapter contract in
  `types.ts`. The gamepad adapter also offers opt-in right-stick scrolling
  (`rightStickScroll`, off by default; `scrollSpeed` / `invertScrollY` tune it) — a direct,
  frame-rate-independent DOM side-effect in its poll loop that scrolls the focused item's
  nearest scrollable ancestor (found via `[data-uni-focused]`, both axes; falls back to the
  page's first scrollable element, then `window`),
  deliberately **not** routed through `AdapterContext` since it touches neither focus nor the
  registry.
- `src/index.ts` — the public entry. **Anything consumers use must be re-exported here.**

### Key mental model

`useTrigger` → registers a `TriggerRecord` in the `TriggerRegistry` under a layer.
An adapter turns a raw input into either a navigation intent (`move`/`activate`), a
`focus(id)`, or a `dispatchShortcut(input)`, all via the `AdapterContext`. The
`FocusManager` resolves those against the **active** layer and updates the single focused
record, mirroring the change to the DOM. `findNext` is the pure geometry that decides where
a direction goes.

`activate`/`dispatchShortcut`/manual `.trigger()` all pass a `TriggerCause` (`src/types.ts`)
to `onTrigger` — `source`, `via`, and any native `event` / adapter detail. The shape is
open (the core stays input-agnostic); each adapter exports a typed cause + `isXxxCause` guard.

Adapters also report **availability** via `ctx.setAvailable(name, boolean)`, exposed to
consumers by `useAvailableInputs()`. This is capability-based, not just "installed": keyboard
is inferred from the primary pointer then confirmed on the first real keydown; the mouse
adapter reports `mouse` (`(any-pointer: fine)`) and `touch` (`(any-pointer: coarse)`) as
separate concerns; gamepad toggles with connection. A source is absent unless its adapter is
installed AND the capability is present.

Focus has the symmetric `FocusCause` → `onFocus` (optional per trigger). Every focus change
flows through `FocusManager.setFocused`, which fires `onFocus` with a cause: adapter-driven
focus (`ctx.move`/`ctx.focus` carry an optional `FocusCause`) reports `source` + native
`event`; a programmatic `useTrigger().focus()` reports `source: 'manual'`; core-resolved focus
(Tab via `focusin`, layer activation/`restore`, `initial` autofocus, `cleanup` after removal)
reports `source: 'core'`. `via` distinguishes them. Each adapter exports a typed
`XxxFocusCause` + `isXxxFocusCause` guard, mirroring the trigger causes.

Layer nuance: `useTriggerLayer` uses both `provide(LAYER_ID_KEY)` (for descendant
`useTrigger` calls) and `ctx.ownLayers` (a `WeakMap` keyed by component instance) so a
`useTrigger` call **later in the same component's setup** still attaches to the layer —
provide/inject only reaches descendants.

## Conventions

- No semicolons, single quotes, 2-space indent (oxfmt/eslint enforce it). Match the
  surrounding style; run `pnpm lint` / `pnpm format` before finishing.
- Dev-only warnings and diagnostics go behind `import.meta.env.DEV`.
- Keep `src/navigation.ts` and `src/shortcuts.ts` pure (no Vue/DOM imports) — that is what
  makes them directly unit-testable.
- Adapters must fully own their listeners/loops and clean up in `teardown()`.
- Every unit-testable module has a sibling spec in `src/__tests__/`.
- **Update docs on any API/behavior change** — all three surfaces: `README.md`,
  the Storybook pages `playground/stories/docs/*.mdx` (and the matching
  `.stories.ts` / `demos/` when one exists), and this `CLAUDE.md`.

## Commands

```sh
pnpm dev        # vite dev server: runs playground/ (imports the lib via alias, like a consumer)
pnpm storybook  # interactive usage examples (playground/stories/)
pnpm test       # vitest run (one-shot)
pnpm test:unit  # vitest watch
pnpm type-check # vue-tsc
pnpm lint       # oxlint + eslint (both --fix)
pnpm format     # oxfmt src/
pnpm build      # type-check + library build to dist/
```

CI (`.github/workflows/ci.yml`) runs commitlint, lint, type-check, tests, and build.
Commits follow Conventional Commits (enforced by commitlint + husky).

## Testing

- **Unit** — Vitest + jsdom + `@vue/test-utils`, specs in `src/__tests__/`. This is the
  primary safety net; add/adjust specs with any behavior change.
- **Runtime verification** — the `verify` skill drives `playground/e2e.html` through the
  real adapters in headless Chrome for changes that unit tests can't fully cover (real
  focus, real events). Use it to confirm end-to-end behavior in an actual browser.

## Releasing

`pnpm release [patch|minor|major|<version>]` (`scripts/release.sh`) — must be on a clean,
in-sync `main`. It runs checks, bumps + tags via `npm version`, and pushes; the tag triggers
`.github/workflows/release.yml` to publish to npm.

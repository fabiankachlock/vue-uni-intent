# Changelog

All notable changes to `vue-uni-intent` are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-07-19

### Added

- **Input availability** — `useAvailableInputs()` reactively reports which input
  sources can actually be used right now (`keyboard`, `mouse`, `touch`,
  `gamepad`, plus `has()` for custom adapters). Availability is capability-based
  and reported by the installed adapters via `AdapterContext.setAvailable()`.
- **Focus cause** — triggers accept an optional `onFocus(cause)` handler that
  fires on every focus change with a `FocusCause` (`source`, `via`, `direction`,
  native `event`). Each adapter exports a typed cause and `isXxxFocusCause`
  guard, mirroring the existing trigger causes.
- **Spatial-navigation debug overlay** — opt-in `debug` plugin option renders a
  runtime overlay (toggled with `Ctrl+Alt+D`, rebindable) that boxes each
  trigger with its per-direction scores, draws the winning connectors, and shows
  a full score matrix.
- **Gamepad right-stick scrolling** — opt-in `rightStickScroll` (with
  `scrollSpeed` / `invertScrollY`) scrolls the focused item's nearest scrollable
  container, frame-rate independent, with a window fallback.

### Changed

- **Rewritten spatial-navigation engine** — navigation is now edge-based, derived
  from trigger bounding boxes (like Blink / the CSS spatial-navigation spec)
  instead of center-to-center, so full-bleed elements, lifted focus, and pinned
  headers behave as they look.

### Fixed

- Re-enable navigating between triggers with the Tab key.
- Plugin `.d.ts` build-time validation.

## [1.0.1] - 2026-07-13

### Fixed

- Correct the output structure of `*.d.ts` files in the `dist` directory.

## [1.0.0] - 2026-07-07

Initial stable release.

### Added

- Core single-focus trigger system with `useTrigger()`, real DOM focus, and a
  `data-uni-focused` styling hook.
- DOM-derived spatial navigation exposed as the pure `findNext()` — no focus
  graph to maintain.
- Explicit, swappable input adapters: `keyboardAdapter`, `mouseAdapter`,
  `gamepadAdapter`, coupled to the core only through `AdapterContext`.
- Unified shortcuts across input kinds with the `key()` / `button()` /
  `mouseButton()` helpers, modifier support (including mouse-button shortcuts),
  and the `Key` / `GamepadButton` / `GamepadAxis` / `MouseButton` constants.
- Focus layers via `useTriggerLayer()` for modals and nested stacks.
- Trigger cause — `onTrigger(cause)` receives a `TriggerCause` describing what
  fired it, with per-adapter typed causes and `isXxxCause` guards.
- Scroll-into-view control (`scroll` / `scrollMargin`) for focus moves.
- Storybook documentation and live demos.

[1.1.0]: https://github.com/fabiankachlock/vue-uni-intent/releases/tag/v1.1.0
[1.0.1]: https://github.com/fabiankachlock/vue-uni-intent/releases/tag/v1.0.1
[1.0.0]: https://github.com/fabiankachlock/vue-uni-intent/releases/tag/v1.0.0

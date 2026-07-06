---
name: verify
description: Runtime-verify vue-uni-intent changes by driving a self-running browser page through the real adapters in headless Chrome.
---

# Verifying vue-uni-intent at runtime

The library's surface is a browser page using the real keyboard/mouse adapters.
The repo ships a self-running smoke page at `playground/e2e.html` + `playground/e2e.ts`:
it mounts an app via the `vue-uni-intent` vite alias (consumer-style import),
dispatches real `KeyboardEvent`/`MouseEvent`s, and writes `PASS`/`FAIL` lines
into `<pre id="results">`.

## Recipe

1. Start the dev server (root is `playground/`, alias resolves `vue-uni-intent` → `src/index.ts`):

   ```bash
   npx vite --port 5199 --strictPort   # run in background
   curl -sf http://localhost:5199/e2e.html   # poll until up
   ```

2. Drive with headless Chrome (`google-chrome-stable` on this machine). `--virtual-time-budget`
   makes it wait for the async script before dumping:

   ```bash
   google-chrome-stable --headless=new --disable-gpu --no-sandbox \
     --window-size=1200,800 --virtual-time-budget=5000 \
     --dump-dom http://localhost:5199/e2e.html | grep -A 20 'id="results"'
   ```

3. For change-specific scenarios, copy the `e2e.html`/`e2e.ts` pattern to a temporary
   `playground/verify-<topic>.{html,ts}` page, drive it the same way, and delete it after.

## Gotchas

- The keyboard adapter listens on `window`, so two mounted apps interfere —
  run scenarios sequentially: `app.unmount()` before mounting the next.
- Focus assertions: the focused trigger's element carries `data-uni-focused`;
  read it with `document.querySelector("[data-uni-focused]")?.id`.
- Give layout-dependent scenarios a real viewport (`--window-size`) — spatial
  navigation reads DOM rects, and `position: fixed` elements need it.
- Wait two `nextTick()`s after mount before asserting initial focus.
- `wrap` is a `createUniIntent` option (default `false`; the storybook preview
  enables it).

/**
 * Watch a CSS media query. Calls `onChange` with the current match immediately,
 * then again on every change, and returns a cleanup that removes the listener.
 *
 * When `matchMedia` is unavailable (SSR, jsdom), `onChange(fallback)` is called
 * once and the returned cleanup is a no-op — so callers get a sensible default
 * without special-casing the environment.
 */
export function watchMedia(
  query: string,
  onChange: (matches: boolean) => void,
  fallback: boolean,
): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    onChange(fallback)
    return () => {}
  }
  const mql = window.matchMedia(query)
  const handler = () => onChange(mql.matches)
  handler()
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}

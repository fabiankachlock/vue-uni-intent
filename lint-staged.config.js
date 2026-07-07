// These are whole-project scripts (run-s "lint:*", vitest, vite build) that must
// not receive a file list. Returning static commands from a function tells
// lint-staged to run them as-is instead of appending the staged filenames.
export default {
  '**/*.{ts,vue}': () => [
    'pnpm run lint',
    'pnpm run format',
    'pnpm run test',
    'pnpm run build',
  ],
}

import type { ShortcutInput } from './adapters/types'
import type { TriggerRecord } from './registry'
import type { ShortcutDescriptor } from './types'

/**
 * Match a raw input against one shortcut descriptor. Keys compare
 * case-insensitively; modifiers not named in the descriptor must be unpressed.
 */
export function matchShortcut(input: ShortcutInput, descriptor: ShortcutDescriptor): boolean {
  if (input.kind === 'key') {
    if (!('key' in descriptor)) return false
    return (
      descriptor.key.toLowerCase() === input.key.toLowerCase() &&
      (descriptor.ctrl ?? false) === input.ctrl &&
      (descriptor.shift ?? false) === input.shift &&
      (descriptor.alt ?? false) === input.alt &&
      (descriptor.meta ?? false) === input.meta
    )
  }
  if (input.kind === 'gamepad-button') {
    return 'button' in descriptor && descriptor.button === input.button
  }
  return 'mouseButton' in descriptor && descriptor.mouseButton === input.button
}

/**
 * Find the trigger whose shortcuts match the input. Records are expected in
 * registration order; the earliest match wins (ambiguity warns in dev).
 */
export function findShortcutTarget(
  input: ShortcutInput,
  records: readonly TriggerRecord[],
): TriggerRecord | null {
  let target: TriggerRecord | null = null
  for (const record of records) {
    if (record.isDisabled()) continue
    if (!record.shortcuts.some((descriptor) => matchShortcut(input, descriptor))) continue
    if (!target) {
      target = record
    } else if (import.meta.env.DEV) {
      console.warn(
        `[vue-uni-intent] Shortcut matches both "${target.id}" and "${record.id}" ` +
          `in layer "${record.layerId}" — firing "${target.id}".`,
      )
    }
  }
  return target
}

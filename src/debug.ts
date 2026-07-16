import { shallowRef } from 'vue'
import type { InputContext } from './context'
import {
  ALIGNED_WEIGHT,
  UNALIGNED_WEIGHT,
  explainNext,
  type NavCandidate,
  type NavCandidateExplanation,
  type NavExplanation,
} from './navigation'
import { matchShortcut } from './shortcuts'
import type { Direction, KeyShortcut, UniIntentDebugOptions } from './types'

export const DEFAULT_DEBUG_HOTKEY: KeyShortcut = { key: 'd', ctrl: true, alt: true }

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']

const DIRECTION_META: Record<Direction, { arrow: string; color: string; word: string }> = {
  up: { arrow: '↑', color: '#60a5fa', word: 'above' },
  down: { arrow: '↓', color: '#4ade80', word: 'below' },
  left: { arrow: '←', color: '#fbbf24', word: 'to the left' },
  right: { arrow: '→', color: '#f472b6', word: 'to the right' },
}

/** Everything the overlay draws for one frame — plain data so it can be diffed as a signature. */
type DebugModel = {
  layerId: string
  wrap: boolean
  /** Boxed targets: visible triggers of the active layer (including disabled ones). */
  boxes: DebugBox[]
  /** Registered but not drawable: element-less shortcut triggers or zero-size rects. */
  hidden: number
  /** The focused trigger the four direction queries originate from, if visible. */
  originId: string | null
  /** With no origin, the trigger a move would adopt instead of navigating. */
  adoptId: string | null
  reports: DirectionReport[]
}

type DebugBox = {
  id: string
  x: number
  y: number
  width: number
  height: number
  focused: boolean
  disabled: boolean
  /** Directions this box is the navigation target for, with the winning score. */
  wins: { direction: Direction; score: number | null }[]
}

/** One direction's outcome from the origin, with the "why" spelled out. */
type DirectionReport = {
  direction: Direction
  target: string | null
  why: string
  /** Runner-up scores and exclusion counts; empty when there is nothing to add. */
  also: string
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!)

const px = (value: number): string => `${Math.round(value)}px`
const num = (value: number): string => String(Math.round(value * 10) / 10)

function hotkeyLabel(hotkey: KeyShortcut): string {
  const parts: string[] = []
  if (hotkey.ctrl) parts.push('Ctrl')
  if (hotkey.alt) parts.push('Alt')
  if (hotkey.shift) parts.push('Shift')
  if (hotkey.meta) parts.push('Meta')
  const key = hotkey.key === ' ' ? 'Space' : hotkey.key
  parts.push(key.length === 1 ? key.toUpperCase() : key)
  return parts.join('+')
}

function summarizeExcluded(candidates: NavCandidateExplanation[]): string {
  const parts: string[] = []
  const count = (verdict: NavCandidateExplanation['verdict']) =>
    candidates.filter((c) => c.verdict === verdict).length
  const outsideCone = count('outside-cone')
  const behind = count('behind')
  const wrapExcluded = count('wrap-excluded')
  if (outsideCone) parts.push(`${outsideCone} outside cone`)
  if (behind) parts.push(`${behind} behind`)
  if (wrapExcluded) parts.push(`${wrapExcluded} off-axis for wrap`)
  return parts.join(' · ')
}

function reportDirection(
  direction: Direction,
  explanation: NavExplanation,
  wrap: boolean,
): DirectionReport {
  const { word } = DIRECTION_META[direction]
  const excluded = summarizeExcluded(explanation.candidates)

  if (!explanation.target) {
    let why: string
    if (explanation.candidates.length === 0) {
      why = 'no other targets in this layer'
    } else if (!wrap) {
      why = `nothing ${word} (wrap off)`
    } else {
      const offAxis = explanation.candidates.filter((c) => c.verdict === 'wrap-excluded').length
      why =
        `nothing ${word}` +
        (offAxis
          ? ` — ${offAxis} behind but off-axis, so no wrap target`
          : ' and nothing behind to wrap to')
    }
    return { direction, target: null, why, also: excluded }
  }

  const winner = explanation.candidates.find((c) => c.id === explanation.target)!
  let why: string
  if (explanation.mode === 'wrap') {
    why =
      `wrapped to the opposite edge — Δ${px(winner.crossDistance)} across, ` +
      `${winner.aligned ? 'aligned' : 'within cross tolerance'}`
  } else {
    const weight = winner.aligned ? ALIGNED_WEIGHT : UNALIGNED_WEIGHT
    why =
      `score ${num(winner.score!)} = Δ${px(winner.primaryDistance)} ahead + ` +
      `Δ${px(winner.crossDistance)} across ×${weight} ` +
      `(${winner.aligned ? 'aligned' : 'unaligned'}, ` +
      `${winner.inCone ? 'in cone' : 'cone empty — nearest ahead'})`
  }

  const runnersUp = explanation.candidates
    .filter((c) => c.verdict === 'scored')
    .sort((a, b) => a.score! - b.score!)
  const alsoParts: string[] = []
  if (runnersUp.length > 0) {
    const shown = runnersUp
      .slice(0, 3)
      .map((c) => `"${c.id}" ${num(c.score!)}`)
      .join(', ')
    const more = runnersUp.length > 3 ? ` +${runnersUp.length - 3} more` : ''
    alsoParts.push(`beat ${shown}${more}`)
  }
  if (excluded) alsoParts.push(excluded)
  return { direction, target: explanation.target, why, also: alsoParts.join(' · ') }
}

/**
 * The spatial-navigation debug overlay. While enabled it outlines every
 * visible trigger of the active layer, marks the navigation target for each
 * direction (badge + connecting line), and explains in a panel why each
 * direction resolves the way it does — scores, cone/wrap decisions, and what
 * was excluded. Toggled by a hotkey; drawn with plain DOM (no Vue) so it adds
 * nothing to the app's component tree.
 */
export class DebugController {
  readonly enabled = shallowRef(false)
  private hotkey: KeyShortcut
  private root: HTMLElement | null = null
  private rafId = 0
  private timerId: ReturnType<typeof setInterval> | null = null
  private signature: string | null = null

  constructor(
    private ctx: InputContext,
    options: UniIntentDebugOptions = {},
  ) {
    this.hotkey = options.hotkey ?? DEFAULT_DEBUG_HOTKEY
  }

  /** Start listening for the toggle hotkey. Client only. */
  setup(): void {
    // Capture phase, so toggling works even where the app stops propagation.
    window.addEventListener('keydown', this.onKeydown, true)
  }

  teardown(): void {
    window.removeEventListener('keydown', this.onKeydown, true)
    this.disable()
  }

  toggle(): void {
    if (this.enabled.value) this.disable()
    else this.enable()
  }

  enable(): void {
    if (this.enabled.value || typeof document === 'undefined') return
    this.enabled.value = true
    const root = document.createElement('div')
    root.setAttribute('data-uni-debug', '')
    root.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;pointer-events:none;' +
      'font:11px/1.5 ui-monospace,monospace;color:#e2e8f0;'
    document.body.appendChild(root)
    this.root = root
    this.signature = null
    this.render()
    // Re-measure every frame — rects move with scrolling, layout and
    // animation, and a debug overlay favors robustness over cleverness.
    if (typeof requestAnimationFrame === 'function') {
      this.rafId = requestAnimationFrame(this.tick)
    } else {
      this.timerId = setInterval(() => this.render(), 100)
    }
  }

  disable(): void {
    if (!this.enabled.value) return
    this.enabled.value = false
    if (this.rafId) cancelAnimationFrame(this.rafId)
    if (this.timerId) clearInterval(this.timerId)
    this.rafId = 0
    this.timerId = null
    this.root?.remove()
    this.root = null
    this.signature = null
  }

  private onKeydown = (event: KeyboardEvent): void => {
    if (event.repeat) return
    const input = {
      kind: 'key' as const,
      key: event.key,
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey,
    }
    if (!matchShortcut(input, this.hotkey)) return
    event.preventDefault()
    event.stopPropagation()
    this.toggle()
  }

  private tick = (): void => {
    this.render()
    this.rafId = requestAnimationFrame(this.tick)
  }

  private render(): void {
    if (!this.root) return
    const model = this.buildModel()
    const signature = JSON.stringify(model)
    if (signature === this.signature) return
    this.signature = signature
    this.root.innerHTML = this.renderHtml(model)
  }

  /** Gather the active layer's targets and run the four direction queries. */
  private buildModel(): DebugModel {
    const layer = this.ctx.layers.activeLayer.value
    const wrap = this.ctx.options.wrap
    const focusedRecord = this.ctx.focus.focusedRecord.value

    const boxes: DebugBox[] = []
    const candidates: NavCandidate[] = []
    let hidden = 0
    for (const record of this.ctx.registry.inLayer(layer.id)) {
      if (!record.element) {
        hidden++
        continue
      }
      const rect = record.element.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        hidden++
        continue
      }
      const disabled = record.isDisabled()
      // Same filtering as FocusManager.move — what's boxed as enabled here is
      // exactly the candidate set navigation sees.
      if (!disabled) candidates.push({ id: record.id, rect })
      boxes.push({
        id: record.id,
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        focused: record === focusedRecord,
        disabled,
        wins: [],
      })
    }

    const origin =
      focusedRecord && focusedRecord.layerId === layer.id
        ? candidates.find((c) => c.id === focusedRecord.id)
        : undefined

    const reports: DirectionReport[] = []
    if (origin) {
      for (const direction of DIRECTIONS) {
        const explanation = explainNext(
          origin,
          candidates.filter((c) => c !== origin),
          direction,
          { wrap },
        )
        if (explanation.target) {
          const winner = explanation.candidates.find((c) => c.id === explanation.target)!
          boxes
            .find((b) => b.id === explanation.target)
            ?.wins.push({ direction, score: winner.score ?? null })
        }
        reports.push(reportDirection(direction, explanation, wrap))
      }
    }

    return {
      layerId: layer.id,
      wrap,
      boxes,
      hidden,
      originId: origin?.id ?? null,
      adoptId: !origin && candidates.length > 0 ? candidates[0]!.id : null,
      reports,
    }
  }

  private renderHtml(model: DebugModel): string {
    const parts: string[] = []
    const origin = model.boxes.find((b) => b.id === model.originId)

    if (origin) {
      const lines = model.reports
        .filter((r) => r.target)
        .map((r) => {
          const target = model.boxes.find((b) => b.id === r.target)!
          return (
            `<line x1="${origin.x + origin.width / 2}" y1="${origin.y + origin.height / 2}" ` +
            `x2="${target.x + target.width / 2}" y2="${target.y + target.height / 2}" ` +
            `stroke="${DIRECTION_META[r.direction].color}" stroke-width="1.5" stroke-dasharray="4 3"/>`
          )
        })
        .join('')
      parts.push(
        `<svg style="position:absolute;inset:0;width:100%;height:100%;overflow:visible">${lines}</svg>`,
      )
    }

    for (const box of model.boxes) parts.push(this.renderBox(box))
    parts.push(this.renderPanel(model))
    return parts.join('')
  }

  private renderBox(box: DebugBox): string {
    const rings = box.wins.map(
      (win, i) => `0 0 0 ${(i + 1) * 2}px ${DIRECTION_META[win.direction].color}`,
    )
    // A dark rim outside the rings keeps the overlay readable on any background.
    rings.push(`0 0 0 ${(box.wins.length + 1) * 2}px rgba(2,6,23,.45)`)
    const outline = box.focused
      ? '2px solid #fff'
      : `1px dashed ${box.disabled ? 'rgba(148,163,184,.55)' : '#cbd5e1'}`

    const label =
      `<span style="position:absolute;left:0;bottom:100%;margin-bottom:2px;padding:0 4px;` +
      `border-radius:2px;background:rgba(2,6,23,.85);white-space:nowrap;` +
      `${box.focused ? 'color:#fff;font-weight:700;' : ''}${box.disabled ? 'opacity:.7;' : ''}">` +
      `${escapeHtml(box.id)}${box.focused ? ' · origin' : ''}${box.disabled ? ' · disabled' : ''}</span>`

    const badges = box.wins
      .map((win) => {
        const meta = DIRECTION_META[win.direction]
        return (
          `<span data-uni-debug-winner="${win.direction}" style="background:${meta.color};` +
          `color:#0b1020;font-weight:700;padding:0 4px;border-radius:2px">` +
          `${meta.arrow}${win.score !== null ? ` ${num(win.score)}` : ''}</span>`
        )
      })
      .join('')
    const badgeRow = badges
      ? `<span style="position:absolute;top:2px;right:2px;display:flex;gap:2px">${badges}</span>`
      : ''

    return (
      `<div data-uni-debug-box="${escapeHtml(box.id)}" style="position:absolute;` +
      `left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px;` +
      `outline:${outline};outline-offset:1px;box-shadow:${rings.join(',')};` +
      `${box.disabled ? 'opacity:.6;' : ''}">${label}${badgeRow}</div>`
    )
  }

  private renderPanel(model: DebugModel): string {
    const lines: string[] = []
    lines.push(`<div style="font-weight:700;margin-bottom:2px">vue-uni-intent debug</div>`)
    const enabledCount = model.boxes.filter((b) => !b.disabled).length
    const disabledCount = model.boxes.length - enabledCount
    const stats = [
      `layer "${escapeHtml(model.layerId)}"`,
      `${enabledCount} target${enabledCount === 1 ? '' : 's'}`,
      disabledCount ? `${disabledCount} disabled` : '',
      model.hidden ? `${model.hidden} hidden (no element / zero size)` : '',
      `wrap ${model.wrap ? 'on' : 'off'}`,
      `${hotkeyLabel(this.hotkey)} to close`,
    ].filter(Boolean)
    lines.push(`<div style="opacity:.75;margin-bottom:6px">${stats.join(' · ')}</div>`)

    if (!model.originId) {
      lines.push(
        `<div>no focused trigger — ` +
          (model.adoptId
            ? `the next move adopts "${escapeHtml(model.adoptId)}"`
            : 'nothing to navigate') +
          `</div>`,
      )
    } else {
      lines.push(
        `<div style="margin-bottom:4px">origin: <b>"${escapeHtml(model.originId)}"</b></div>`,
      )
      for (const report of model.reports) {
        const meta = DIRECTION_META[report.direction]
        const head = report.target
          ? `<b>"${escapeHtml(report.target)}"</b> — ${escapeHtml(report.why)}`
          : `<span style="opacity:.75">none — ${escapeHtml(report.why)}</span>`
        const also = report.also
          ? `<div style="opacity:.6;padding-left:16px">${escapeHtml(report.also)}</div>`
          : ''
        lines.push(
          `<div><span style="color:${meta.color};font-weight:700">${meta.arrow}</span> ${head}${also}</div>`,
        )
      }
    }

    return (
      `<div data-uni-debug-panel style="position:absolute;right:8px;bottom:8px;max-width:520px;` +
      `padding:10px 12px;border-radius:8px;background:rgba(2,6,23,.92);` +
      `box-shadow:0 4px 24px rgba(0,0,0,.4)">${lines.join('')}</div>`
    )
  }
}

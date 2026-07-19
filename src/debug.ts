import { shallowRef } from 'vue'
import type { InputContext } from './context'
import { explainNext, type NavCandidate, type NavExplanation, type NavVerdict } from './navigation'
import { matchShortcut } from './shortcuts'
import type { Direction, KeyShortcut, UniIntentDebugOptions } from './types'

export const DEFAULT_DEBUG_HOTKEY: KeyShortcut = { key: 'd', ctrl: true, alt: true }

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']

/** Which screen corner the panel is pinned to. */
type Corner = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'

const CORNER_POSITION: Record<Corner, string> = {
  'bottom-left': 'left:8px;bottom:8px',
  'bottom-right': 'right:8px;bottom:8px',
  'top-left': 'left:8px;top:8px',
  'top-right': 'right:8px;top:8px',
}

const CORNER_CONTROLS: { corner: Corner; glyph: string; label: string }[] = [
  { corner: 'top-left', glyph: '◤', label: 'top left' },
  { corner: 'top-right', glyph: '◥', label: 'top right' },
  { corner: 'bottom-left', glyph: '◣', label: 'bottom left' },
  { corner: 'bottom-right', glyph: '◢', label: 'bottom right' },
]

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
  /** Which corner the panel is pinned to (part of the signature so a move redraws). */
  corner: Corner
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
  /** This box's outcome as a candidate for each direction (from the origin). */
  cells: Partial<Record<Direction, DebugCell>>
  /** Directions this box is the navigation target for, with the winning score. */
  wins: { direction: Direction; score: number | null }[]
}

/** One box's standing in one direction's query — the matrix cell. */
type DebugCell = {
  verdict: NavVerdict
  /** Present for `scored`/`winner`; the value the matrix compares. */
  score: number | null
}

/** One direction's outcome from the origin, summarized for the footer. */
type DirectionReport = {
  direction: Direction
  target: string | null
  why: string
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

/** A one-line explanation of a direction's outcome for the footer. */
function reportDirection(
  direction: Direction,
  explanation: NavExplanation,
  wrap: boolean,
): DirectionReport {
  const { word } = DIRECTION_META[direction]

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
    return { direction, target: null, why }
  }

  const winner = explanation.candidates.find((c) => c.id === explanation.target)!
  let why: string
  if (explanation.mode === 'wrap') {
    why = `wrapped · Δ${px(winner.crossDistance)} across`
  } else {
    const forward = `score ${num(winner.score!)} · Δ${px(winner.primaryDistance)} ahead`
    why = winner.aligned
      ? `${forward}, aligned`
      : `${forward} · Δ${px(winner.crossDistance)} across`
  }
  return { direction, target: explanation.target, why }
}

/**
 * The spatial-navigation debug overlay. While enabled it outlines every
 * visible trigger of the active layer, marks the navigation target for each
 * direction (badge + connecting line), and shows a score matrix — every
 * candidate's score in every direction, so a losing target can be compared
 * against the winner. Toggled by a hotkey; drawn with plain DOM (no Vue) so it
 * adds nothing to the app's component tree.
 */
export class DebugController {
  readonly enabled = shallowRef(false)
  private hotkey: KeyShortcut
  private root: HTMLElement | null = null
  private rafId = 0
  private timerId: ReturnType<typeof setInterval> | null = null
  private signature: string | null = null
  private corner: Corner = 'bottom-left'

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
      'font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:#e2e8f0;'
    root.addEventListener('click', this.onClick)
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

  private onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      '[data-uni-debug-move]',
    )
    if (!target) return
    const corner = target.getAttribute('data-uni-debug-move') as Corner
    if (corner === this.corner) return
    this.corner = corner
    this.render()
  }

  private render(): void {
    if (!this.root) return
    const model = this.buildModel()
    const signature = JSON.stringify(model)
    if (signature === this.signature) return
    this.signature = signature
    // Preserve the matrix scroll position across the innerHTML swap so
    // scrolling the page (which re-renders every frame) stays usable.
    const prevScroll =
      this.root.querySelector<HTMLElement>('[data-uni-debug-scroll]')?.scrollTop ?? 0
    this.root.innerHTML = this.renderHtml(model)
    const scroller = this.root.querySelector<HTMLElement>('[data-uni-debug-scroll]')
    if (scroller) scroller.scrollTop = prevScroll
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
        cells: {},
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
        for (const candidate of explanation.candidates) {
          const box = boxes.find((b) => b.id === candidate.id)
          if (box)
            box.cells[direction] = { verdict: candidate.verdict, score: candidate.score ?? null }
        }
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
      corner: this.corner,
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

    // Every direction this box competes in, shown on the box itself — the
    // winner for a direction is highlighted, the rest are its losing scores so
    // they can be compared in place without reading the panel.
    const tags = DIRECTIONS.map((direction) => {
      const cell = box.cells[direction]
      if (!cell || cell.score === null) return ''
      const meta = DIRECTION_META[direction]
      const winner = cell.verdict === 'winner'
      const attr = winner ? ` data-uni-debug-winner="${direction}"` : ''
      const style = winner
        ? `background:${meta.color};color:#0b1020;font-weight:700`
        : `color:${meta.color};background:rgba(2,6,23,.55)`
      return `<span${attr} style="padding:0 3px;border-radius:2px;${style}">${meta.arrow}${num(cell.score)}</span>`
    })
      .filter(Boolean)
      .join('')
    const scoreBlock = tags
      ? `<span style="position:absolute;inset:0;display:flex;flex-wrap:wrap;align-content:center;` +
        `justify-content:center;gap:2px 3px;padding:2px;font-size:10px;line-height:1.25">${tags}</span>`
      : ''

    return (
      `<div data-uni-debug-box="${escapeHtml(box.id)}" style="position:absolute;` +
      `left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px;` +
      `outline:${outline};outline-offset:1px;box-shadow:${rings.join(',')};` +
      `${box.disabled ? 'opacity:.6;' : ''}">${label}${scoreBlock}</div>`
    )
  }

  private renderPanel(model: DebugModel): string {
    const enabledCount = model.boxes.filter((b) => !b.disabled).length
    const disabledCount = model.boxes.length - enabledCount
    const stats = [
      `layer "${escapeHtml(model.layerId)}"`,
      `${enabledCount} target${enabledCount === 1 ? '' : 's'}`,
      disabledCount ? `${disabledCount} disabled` : '',
      model.hidden ? `${model.hidden} hidden` : '',
      `wrap ${model.wrap ? 'on' : 'off'}`,
    ].filter(Boolean)

    const header =
      `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:6px">` +
      `<span style="font-weight:700">vue-uni-intent</span>` +
      `<span style="display:inline-flex;align-items:center;gap:8px">` +
      this.renderCornerControls() +
      `<span style="opacity:.6;white-space:nowrap">${hotkeyLabel(this.hotkey)} to close</span>` +
      `</span></div>` +
      `<div style="opacity:.7;margin-bottom:8px">${stats.join(' | ')}</div>`

    let body: string
    if (!model.originId) {
      body =
        `<div>no focused trigger — ` +
        (model.adoptId
          ? `the next move adopts <b>"${escapeHtml(model.adoptId)}"</b>`
          : 'nothing to navigate') +
        `</div>`
    } else {
      body =
        `<div style="margin-bottom:6px">origin: <b>"${escapeHtml(model.originId)}"</b></div>` +
        this.renderMatrix(model) +
        this.renderReports(model)
    }

    return (
      `<div data-uni-debug-panel style="position:fixed;${CORNER_POSITION[this.corner]};` +
      `width:min(360px,calc(100vw - 16px));max-height:min(70vh,520px);display:flex;flex-direction:column;` +
      `pointer-events:auto;padding:10px 12px;border-radius:8px;` +
      `background:rgba(2,6,23,.94);box-shadow:0 4px 24px rgba(0,0,0,.45);` +
      `border:1px solid rgba(148,163,184,.2)">${header}${body}</div>`
    )
  }

  /** Corner-pin buttons in the header — click one to move the panel out of the way. */
  private renderCornerControls(): string {
    const buttons = CORNER_CONTROLS.map(({ corner, glyph, label }) => {
      const active = corner === this.corner
      const style =
        `all:unset;cursor:pointer;padding:1px 3px;border-radius:2px;font-size:11px;line-height:1;` +
        (active ? 'background:#e2e8f0;color:#0b1020;' : 'color:#94a3b8;')
      return (
        `<button type="button" data-uni-debug-move="${corner}" ` +
        `title="Move panel to ${label}" aria-label="Move panel to ${label}" ` +
        `aria-pressed="${active}" style="${style}">${glyph}</button>`
      )
    }).join('')
    return `<span style="display:inline-flex;gap:2px">${buttons}</span>`
  }

  /**
   * The score matrix: one row per visible trigger, one column per direction.
   * Each cell is that trigger's score for that direction — the winner is
   * highlighted, a `·` means it isn't reachable that way (behind or off-axis).
   * This is what lets you compare the chosen target against the runners-up.
   */
  private renderMatrix(model: DebugModel): string {
    const th =
      `<th style="text-align:left;padding:2px 6px 4px 0;opacity:.6;font-weight:400">target</th>` +
      DIRECTIONS.map(
        (d) =>
          `<th style="padding:2px 4px 4px;color:${DIRECTION_META[d].color};` +
          `font-size:13px;text-align:center">${DIRECTION_META[d].arrow}</th>`,
      ).join('')

    const rows = model.boxes
      .map((box) => {
        const isOrigin = box.id === model.originId
        const cells = DIRECTIONS.map((d) => this.renderCell(box, d, isOrigin)).join('')
        const tag = isOrigin ? ' <span style="opacity:.7">◎</span>' : box.disabled ? ' ⊘' : ''
        const rowBg = isOrigin ? 'background:rgba(148,163,184,.14);' : ''
        const rowFade = box.disabled ? 'opacity:.55;' : ''
        return (
          `<tr style="${rowBg}${rowFade}"><td style="padding:2px 6px 2px 0;white-space:nowrap;` +
          `${isOrigin ? 'font-weight:700;' : ''}">${escapeHtml(box.id)}${tag}</td>${cells}</tr>`
        )
      })
      .join('')

    return (
      `<div data-uni-debug-scroll style="flex:1 1 auto;min-height:0;overflow:auto;margin-bottom:6px">` +
      `<table style="border-collapse:collapse;width:100%">` +
      `<thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`
    )
  }

  private renderCell(box: DebugBox, direction: Direction, isOrigin: boolean): string {
    const base = 'padding:2px 4px;text-align:center;'
    const cell = box.cells[direction]
    if (isOrigin || !cell || cell.score === null) {
      return `<td style="${base}opacity:.3">·</td>`
    }
    if (cell.verdict === 'winner') {
      const meta = DIRECTION_META[direction]
      return (
        `<td style="${base}background:${meta.color};color:#0b1020;font-weight:700;` +
        `border-radius:3px">${num(cell.score)}</td>`
      )
    }
    return `<td style="${base}color:#cbd5e1">${num(cell.score)}</td>`
  }

  private renderReports(model: DebugModel): string {
    const lines = model.reports.map((report) => {
      const meta = DIRECTION_META[report.direction]
      const head = report.target
        ? `<b>"${escapeHtml(report.target)}"</b>`
        : `<span style="opacity:.7">none</span>`
      return (
        `<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">` +
        `<span style="color:${meta.color};font-weight:700">${meta.arrow}</span> ` +
        `${head} <span style="opacity:.6">${escapeHtml(report.why)}</span></div>`
      )
    })
    return `<div style="display:flex;flex-direction:column;gap:1px">${lines.join('')}</div>`
  }
}

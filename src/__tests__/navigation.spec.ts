import { describe, expect, it } from 'vitest'
import { explainNext, findNext, type NavCandidate } from '../navigation'

const rect = (x: number, y: number, width = 100, height = 40) => ({ x, y, width, height })

/**
 * 3×3 grid, 100×40 cells with 20px gaps:
 *   a b c
 *   d e f
 *   g h i
 */
const grid: Record<string, NavCandidate> = {}
for (const [row, ids] of [
  ['a', 'b', 'c'],
  ['d', 'e', 'f'],
  ['g', 'h', 'i'],
].entries()) {
  for (const [col, id] of ids.entries()) {
    grid[id] = { id, rect: rect(col * 120, row * 60) }
  }
}

const others = (id: string) => Object.values(grid).filter((c) => c.id !== id)

describe('findNext', () => {
  describe('3×3 grid', () => {
    it('moves along rows and columns from the center', () => {
      expect(findNext(grid.e!, others('e'), 'up')).toBe('b')
      expect(findNext(grid.e!, others('e'), 'down')).toBe('h')
      expect(findNext(grid.e!, others('e'), 'left')).toBe('d')
      expect(findNext(grid.e!, others('e'), 'right')).toBe('f')
    })

    it('prefers the direct neighbor over further cells in line', () => {
      expect(findNext(grid.a!, others('a'), 'right')).toBe('b')
      expect(findNext(grid.a!, others('a'), 'down')).toBe('d')
    })

    it('returns null at an edge without wrap', () => {
      expect(findNext(grid.a!, others('a'), 'up')).toBeNull()
      expect(findNext(grid.a!, others('a'), 'left')).toBeNull()
      expect(findNext(grid.i!, others('i'), 'down')).toBeNull()
      expect(findNext(grid.c!, others('c'), 'right')).toBeNull()
    })

    it('stays row-stable: right from d never diagonal-jumps to b or h', () => {
      expect(findNext(grid.d!, others('d'), 'right')).toBe('e')
    })
  })

  describe('wrap-around', () => {
    it('wraps to the opposite edge of the same row/column', () => {
      expect(findNext(grid.c!, others('c'), 'right', { wrap: true })).toBe('a')
      expect(findNext(grid.a!, others('a'), 'left', { wrap: true })).toBe('c')
      expect(findNext(grid.g!, others('g'), 'down', { wrap: true })).toBe('a')
      expect(findNext(grid.b!, others('b'), 'up', { wrap: true })).toBe('h')
    })

    it('does not wrap when a candidate exists ahead', () => {
      expect(findNext(grid.b!, others('b'), 'right', { wrap: true })).toBe('c')
    })

    it('does nothing on a single row when moving vertically', () => {
      const row = [grid.a!, grid.b!, grid.c!]
      const rowOthers = (id: string) => row.filter((c) => c.id !== id)
      expect(findNext(grid.a!, rowOthers('a'), 'up', { wrap: true })).toBeNull()
      expect(findNext(grid.a!, rowOthers('a'), 'down', { wrap: true })).toBeNull()
      expect(findNext(grid.b!, rowOthers('b'), 'up', { wrap: true })).toBeNull()
    })

    it('does nothing on a single column when moving horizontally', () => {
      const column = [grid.a!, grid.d!, grid.g!]
      const columnOthers = (id: string) => column.filter((c) => c.id !== id)
      expect(findNext(grid.a!, columnOthers('a'), 'left', { wrap: true })).toBeNull()
      expect(findNext(grid.d!, columnOthers('d'), 'right', { wrap: true })).toBeNull()
    })

    it('wraps to a slightly staggered candidate within the cross tolerance', () => {
      const from: NavCandidate = { id: 'from', rect: rect(0, 0) }
      // No vertical overlap with the origin (0–40), but the center offset
      // (34px) stays within one origin-height (40px).
      const staggered: NavCandidate = { id: 'staggered', rect: rect(300, 44, 100, 20) }
      expect(findNext(from, [staggered], 'left', { wrap: true })).toBe('staggered')
    })

    it('does not wrap to a detached region beyond the cross tolerance', () => {
      // Game-menu layout: vertical menu plus corner buttons far away on the
      // right — pressing left must not wrap to them.
      const newGame: NavCandidate = { id: 'new-game', rect: rect(400, 200) }
      const settings: NavCandidate = { id: 'settings', rect: rect(400, 260) }
      const account: NavCandidate = { id: 'account', rect: rect(900, 20) }
      const stats: NavCandidate = { id: 'stats', rect: rect(900, 700) }
      const candidates = [settings, account, stats]
      expect(findNext(newGame, candidates, 'left', { wrap: true })).toBeNull()
      expect(findNext(newGame, candidates, 'right', { wrap: true })).not.toBeNull()
    })
  })

  describe('alignment preference', () => {
    it('picks a lone off-axis candidate ahead', () => {
      // b is far right and well below — no cone gate, so it still wins as the
      // only thing ahead.
      const a: NavCandidate = { id: 'a', rect: rect(0, 0) }
      const b: NavCandidate = { id: 'b', rect: rect(200, 300) }
      expect(findNext(a, [b], 'right')).toBe('b')
    })

    it('prefers an aligned candidate over a closer unaligned one', () => {
      const a: NavCandidate = { id: 'a', rect: rect(0, 0) }
      // Same row, further away…
      const aligned: NavCandidate = { id: 'aligned', rect: rect(400, 0) }
      // …vs. closer center distance but on another row.
      const unaligned: NavCandidate = { id: 'unaligned', rect: rect(150, 200) }
      expect(findNext(a, [aligned, unaligned], 'right')).toBe('aligned')
    })
  })

  describe('edge cases', () => {
    it('returns null with no candidates', () => {
      expect(findNext(grid.a!, [], 'right')).toBeNull()
      expect(findNext(grid.a!, [], 'right', { wrap: true })).toBeNull()
    })

    it('ignores candidates at the identical primary coordinate (epsilon)', () => {
      // Same column: no horizontal move possible.
      const top: NavCandidate = { id: 'top', rect: rect(0, 0) }
      const bottom: NavCandidate = { id: 'bottom', rect: rect(0, 100) }
      expect(findNext(top, [bottom], 'right')).toBeNull()
      expect(findNext(top, [bottom], 'left')).toBeNull()
    })

    it('breaks ties by candidate order', () => {
      const from: NavCandidate = { id: 'from', rect: rect(0, 100) }
      // Two equidistant, symmetric candidates above/below the axis.
      const first: NavCandidate = { id: 'first', rect: rect(200, 0) }
      const second: NavCandidate = { id: 'second', rect: rect(200, 200) }
      expect(findNext(from, [first, second], 'right')).toBe('first')
    })
  })
})

describe('explainNext', () => {
  const verdictOf = (explanation: ReturnType<typeof explainNext>, id: string) =>
    explanation.candidates.find((c) => c.id === id)

  it('agrees with findNext and scores the forward pool', () => {
    const explanation = explainNext(grid.e!, others('e'), 'right')
    expect(explanation.target).toBe(findNext(grid.e!, others('e'), 'right'))
    expect(explanation.mode).toBe('forward')

    const winner = verdictOf(explanation, 'f')!
    expect(winner.verdict).toBe('winner')
    // Edge gap on the row: e.right (220) to f.left (240) = 20; same row → no
    // cross offset, so the score is that gap.
    expect(winner.primaryDistance).toBe(20)
    expect(winner.crossDistance).toBe(0)
    expect(winner.aligned).toBe(true)
    expect(winner.score).toBe(20)

    // Everything left of (or level with) the origin is behind and unscored.
    expect(verdictOf(explanation, 'd')!.verdict).toBe('behind')
    expect(verdictOf(explanation, 'b')!.verdict).toBe('behind')
    expect(verdictOf(explanation, 'd')!.score).toBeUndefined()
  })

  it('scores every candidate ahead, off-axis ones included', () => {
    const a: NavCandidate = { id: 'a', rect: rect(0, 0) }
    const aligned: NavCandidate = { id: 'aligned', rect: rect(400, 0) }
    // Closer forward distance, but well off the row — competes and loses on the
    // cross² / primary penalty rather than being gated out.
    const unaligned: NavCandidate = { id: 'unaligned', rect: rect(150, 200) }
    const explanation = explainNext(a, [aligned, unaligned], 'right')
    expect(explanation.target).toBe('aligned')

    const off = verdictOf(explanation, 'unaligned')!
    expect(off.verdict).toBe('scored')
    expect(off.aligned).toBe(false)
    // Edge gaps: 50px past a.right, 160px below the row → 50 + 160×2 = 370,
    // beaten by "aligned" at a 300px gap dead ahead.
    expect(off.crossDistance).toBe(160)
    expect(off.score).toBe(370)
  })

  it('keeps a small focus-lift from hijacking the perpendicular direction', () => {
    // A focused cell lifted 12px up (a hover/focus animation). Pressing down
    // must still reach the cell directly below, not the same-row neighbor that
    // is now a few px "ahead". This is what the cross²/primary term guarantees.
    const origin: NavCandidate = { id: 'origin', rect: { x: 120, y: 88, width: 100, height: 40 } }
    const below: NavCandidate = { id: 'below', rect: rect(120, 200) }
    const sideways: NavCandidate = { id: 'sideways', rect: rect(0, 100) }
    expect(findNext(origin, [below, sideways], 'down')).toBe('below')
  })

  it('explains wrap decisions', () => {
    const explanation = explainNext(grid.c!, others('c'), 'right', { wrap: true })
    expect(explanation.target).toBe('a')
    expect(explanation.mode).toBe('wrap')
    // Same-row candidates compete for the wrap; "a" is nearest the far edge.
    expect(verdictOf(explanation, 'a')!.verdict).toBe('winner')
    expect(verdictOf(explanation, 'b')!.verdict).toBe('scored')
    // The bottom row is behind but too far off the cross axis to wrap to.
    expect(verdictOf(explanation, 'g')!.verdict).toBe('wrap-excluded')
    // "f" overlaps the origin's column — neither cleanly ahead nor behind.
    expect(verdictOf(explanation, 'f')!.verdict).toBe('behind')
  })

  it('reports mode none when there is no move', () => {
    const explanation = explainNext(grid.a!, others('a'), 'up')
    expect(explanation.target).toBeNull()
    expect(explanation.mode).toBe('none')
    expect(explanation.candidates.every((c) => c.verdict === 'behind')).toBe(true)
  })
})

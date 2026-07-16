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

  describe('cone preference', () => {
    it('picks an off-cone candidate when the cone is empty', () => {
      // Staggered: b is far right and one row down (outside the 45° cone, not aligned).
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
    // Centers are 120px apart on the row, perfectly aligned.
    expect(winner.primaryDistance).toBe(120)
    expect(winner.crossDistance).toBe(0)
    expect(winner.aligned).toBe(true)
    expect(winner.inCone).toBe(true)
    expect(winner.score).toBe(120)

    // Everything left of (or level with) the origin is behind and unscored.
    expect(verdictOf(explanation, 'd')!.verdict).toBe('behind')
    expect(verdictOf(explanation, 'b')!.verdict).toBe('behind')
    expect(verdictOf(explanation, 'd')!.score).toBeUndefined()
  })

  it('marks ahead-but-off-cone candidates as outside-cone', () => {
    const a: NavCandidate = { id: 'a', rect: rect(0, 0) }
    const aligned: NavCandidate = { id: 'aligned', rect: rect(400, 0) }
    // Closer center distance, but below the 45° cone and not cross-aligned.
    const unaligned: NavCandidate = { id: 'unaligned', rect: rect(150, 200) }
    const explanation = explainNext(a, [aligned, unaligned], 'right')
    expect(explanation.target).toBe('aligned')
    expect(verdictOf(explanation, 'unaligned')!.verdict).toBe('outside-cone')
    expect(verdictOf(explanation, 'unaligned')!.score).toBeUndefined()
  })

  it('scores all ahead candidates when the cone is empty', () => {
    const a: NavCandidate = { id: 'a', rect: rect(0, 0) }
    const b: NavCandidate = { id: 'b', rect: rect(200, 300) }
    const explanation = explainNext(a, [b], 'right')
    expect(explanation.target).toBe('b')
    const winner = verdictOf(explanation, 'b')!
    expect(winner.verdict).toBe('winner')
    expect(winner.inCone).toBe(false)
  })

  it('explains wrap decisions', () => {
    const explanation = explainNext(grid.c!, others('c'), 'right', { wrap: true })
    expect(explanation.target).toBe('a')
    expect(explanation.mode).toBe('wrap')
    // Both same-row candidates compete for the wrap; "a" is nearest the far edge.
    expect(verdictOf(explanation, 'a')!.verdict).toBe('winner')
    expect(verdictOf(explanation, 'b')!.verdict).toBe('scored')
    // Other rows are behind but too far off the cross axis to wrap to.
    expect(verdictOf(explanation, 'e')!.verdict).toBe('wrap-excluded')
    // "f" sits at the same primary coordinate — neither ahead nor behind.
    expect(verdictOf(explanation, 'f')!.verdict).toBe('behind')
  })

  it('reports mode none when there is no move', () => {
    const explanation = explainNext(grid.a!, others('a'), 'up')
    expect(explanation.target).toBeNull()
    expect(explanation.mode).toBe('none')
    expect(explanation.candidates.every((c) => c.verdict === 'behind')).toBe(true)
  })
})

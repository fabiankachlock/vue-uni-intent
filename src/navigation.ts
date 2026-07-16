import type { Direction } from './types'

export type NavRect = {
  x: number
  y: number
  width: number
  height: number
}

export type NavCandidate = {
  id: string
  rect: NavRect
}

export type NavOptions = {
  wrap?: boolean
}

/** Sub-pixel jitter guard for the half-plane filter. */
const EPSILON = 1
/** Cross-axis penalty: mild when rects overlap on the cross axis, strong otherwise. */
export const ALIGNED_WEIGHT = 0.5
export const UNALIGNED_WEIGHT = 5
/**
 * Max cross-axis stagger (in multiples of the origin's own cross-axis size)
 * for a wrap target. Keeps wrapping a cycle within the current row/column
 * instead of a jump to a detached region of the screen.
 */
const WRAP_CROSS_TOLERANCE = 1

/**
 * A rect projected into movement space: `primary` grows in the direction of
 * movement, `cross` is the orthogonal axis. Lets every direction share one
 * scoring implementation.
 */
type Projected = {
  id: string
  primary: number // center along movement axis (sign-flipped so "forward" is positive)
  cross: number // center along cross axis
  crossStart: number // rect extent on the cross axis
  crossEnd: number
}

function project(candidate: NavCandidate, direction: Direction): Projected {
  const { rect, id } = candidate
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const horizontal = direction === 'left' || direction === 'right'
  const forward = direction === 'down' || direction === 'right' ? 1 : -1
  return horizontal
    ? { id, primary: cx * forward, cross: cy, crossStart: rect.y, crossEnd: rect.y + rect.height }
    : { id, primary: cy * forward, cross: cx, crossStart: rect.x, crossEnd: rect.x + rect.width }
}

function crossAligned(a: Projected, b: Projected): boolean {
  return Math.min(a.crossEnd, b.crossEnd) - Math.max(a.crossStart, b.crossStart) >= EPSILON
}

function score(from: Projected, to: Projected, primaryDist: number): number {
  const crossDist = Math.abs(to.cross - from.cross)
  return primaryDist + crossDist * (crossAligned(from, to) ? ALIGNED_WEIGHT : UNALIGNED_WEIGHT)
}

/**
 * Why a candidate did or did not become the navigation target:
 * - `'winner'` — chosen target.
 * - `'scored'` — competed in the final pool but lost on score.
 * - `'outside-cone'` — ahead of the origin, but excluded because other
 *   candidates were inside the 45° cone.
 * - `'behind'` — not ahead of the origin on the movement axis (within
 *   `EPSILON` counts as behind).
 * - `'wrap-excluded'` — wrap pass only: behind the origin but too far off the
 *   cross axis to count as the same row/column.
 */
export type NavVerdict = 'winner' | 'scored' | 'outside-cone' | 'behind' | 'wrap-excluded'

export type NavCandidateExplanation = {
  id: string
  verdict: NavVerdict
  /** Center-to-center distance along the movement axis; negative = behind the origin. */
  primaryDistance: number
  /** Absolute center-to-center distance on the cross axis. */
  crossDistance: number
  /** Rects overlap on the cross axis (gets the mild cross penalty when scored). */
  aligned: boolean
  /** Ahead of the origin and inside the 45° cone (or cross-aligned). */
  inCone: boolean
  /**
   * Comparison score (lower wins); only present for `'winner'`/`'scored'`.
   * Forward pass: `primaryDistance + crossDistance * weight`. Wrap pass: the
   * primary term is the distance from the far opposite edge instead.
   */
  score?: number
}

export type NavExplanation = {
  /** What `findNext` returns for the same inputs. */
  target: string | null
  /** `'forward'` — a candidate ahead won; `'wrap'` — cycled to the opposite edge; `'none'` — no move. */
  mode: 'forward' | 'wrap' | 'none'
  /** One entry per candidate, in the order they were passed. */
  candidates: NavCandidateExplanation[]
}

type Explained = {
  projected: Projected
  explanation: NavCandidateExplanation
}

function scorePool(
  origin: Projected,
  pool: Explained[],
  primaryDistOf: (c: Projected) => number,
): Explained | null {
  let winner: Explained | null = null
  let winnerScore = Infinity
  for (const entry of pool) {
    const s = score(origin, entry.projected, primaryDistOf(entry.projected))
    entry.explanation.verdict = 'scored'
    entry.explanation.score = s
    // Strict `<` keeps the earliest-registered candidate on ties.
    if (s < winnerScore) {
      winner = entry
      winnerScore = s
    }
  }
  if (winner) winner.explanation.verdict = 'winner'
  return winner
}

/**
 * `findNext` with its full reasoning exposed: the chosen target plus a
 * per-candidate verdict (why it won, lost, or was excluded) and the distances
 * and scores behind the decision. Powers the debug overlay; also useful for
 * asserting navigation edge cases in tests.
 */
export function explainNext(
  from: NavCandidate,
  candidates: readonly NavCandidate[],
  direction: Direction,
  options: NavOptions = {},
): NavExplanation {
  const origin = project(from, direction)

  const entries: Explained[] = candidates.map((candidate) => {
    const projected = project(candidate, direction)
    const primaryDistance = projected.primary - origin.primary
    const aligned = crossAligned(origin, projected)
    const crossDistance = Math.abs(projected.cross - origin.cross)
    return {
      projected,
      explanation: {
        id: projected.id,
        verdict: 'behind',
        primaryDistance,
        crossDistance,
        aligned,
        inCone: primaryDistance > EPSILON && (crossDistance <= primaryDistance || aligned),
      },
    }
  })

  const ahead = entries.filter((e) => e.explanation.primaryDistance > EPSILON)

  if (ahead.length > 0) {
    const inCone = ahead.filter((e) => e.explanation.inCone)
    const pool = inCone.length > 0 ? inCone : ahead
    if (inCone.length > 0) {
      for (const e of ahead) {
        if (!e.explanation.inCone) e.explanation.verdict = 'outside-cone'
      }
    }
    const winner = scorePool(origin, pool, (c) => c.primary - origin.primary)
    return {
      target: winner?.explanation.id ?? null,
      mode: winner ? 'forward' : 'none',
      candidates: entries.map((e) => e.explanation),
    }
  }

  if (options.wrap) {
    // Wrap targets must lie behind the origin and stay near it on the cross
    // axis — otherwise there is nothing along this axis to wrap to and the
    // move is a no-op.
    const nearCross = (e: Explained) =>
      e.explanation.aligned ||
      e.explanation.crossDistance <= (origin.crossEnd - origin.crossStart) * WRAP_CROSS_TOLERANCE
    const behind = entries.filter((e) => e.explanation.primaryDistance < -EPSILON)
    const pool = behind.filter(nearCross)
    for (const e of behind) {
      if (!nearCross(e)) e.explanation.verdict = 'wrap-excluded'
    }
    if (pool.length > 0) {
      // Treat distance from the far opposite edge as the primary distance,
      // so the "first" trigger on the other side (best cross alignment) wins.
      const minPrimary = Math.min(...pool.map((e) => e.projected.primary))
      const winner = scorePool(origin, pool, (c) => c.primary - minPrimary)
      return {
        target: winner?.explanation.id ?? null,
        mode: winner ? 'wrap' : 'none',
        candidates: entries.map((e) => e.explanation),
      }
    }
  }

  return { target: null, mode: 'none', candidates: entries.map((e) => e.explanation) }
}

/**
 * Find the trigger that focus should move to.
 *
 * Candidates must exclude the origin, disabled triggers, and zero-size rects.
 * They are expected in registration order (ties go to the earliest).
 *
 * Algorithm: filter to the half-plane in the movement direction, prefer
 * candidates inside a 45° cone (or overlapping on the cross axis), score by
 * `primaryDist + crossDist * weight` and take the minimum. With `wrap`, an
 * empty half-plane instead picks the candidate nearest the opposite edge —
 * but only among candidates behind the origin on the movement axis that are
 * cross-aligned or within `WRAP_CROSS_TOLERANCE` of it; if the current
 * row/column has nothing to cycle to, the move is a no-op.
 *
 * Use `explainNext` for the same decision with its reasoning exposed.
 */
export function findNext(
  from: NavCandidate,
  candidates: readonly NavCandidate[],
  direction: Direction,
  options: NavOptions = {},
): string | null {
  return explainNext(from, candidates, direction, options).target
}

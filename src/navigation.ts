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

/** Sub-pixel jitter guard for the edge comparisons. */
const EPSILON = 1
/**
 * How much a pixel of cross-axis offset costs relative to a pixel of forward
 * gap. > 1 so that "right" keeps meaning right: a candidate a little past the
 * edge but far off to the side loses to one that is squarely ahead. Alignment
 * itself needs no reward — overlapping the origin's row/column gives a cross
 * offset of exactly 0.
 */
const CROSS_AXIS_WEIGHT = 2
/**
 * Max cross-axis stagger (in multiples of the origin's own cross-axis size)
 * for a wrap target. Keeps wrapping a cycle within the current row/column
 * instead of a jump to a detached region of the screen.
 */
const WRAP_CROSS_TOLERANCE = 1

/**
 * A rect projected into movement space by its EDGES (not its center). `near`
 * and `far` are the leading/trailing edges along the movement axis, sign-
 * flipped so "forward" always increases; `crossStart`/`crossEnd` are the extent
 * on the orthogonal axis. Edge projection is what makes navigation match what
 * you see: a candidate counts as "ahead" only when it genuinely clears the
 * origin's leading edge, and alignment is real geometric overlap — so a wide
 * full-bleed element, a lifted focus, or a pinned header can't fool it the way
 * center-to-center distance does.
 */
type Projected = {
  id: string
  near: number
  far: number
  crossStart: number
  crossEnd: number
}

function project(candidate: NavCandidate, direction: Direction): Projected {
  const { rect, id } = candidate
  const x0 = rect.x
  const x1 = rect.x + rect.width
  const y0 = rect.y
  const y1 = rect.y + rect.height
  switch (direction) {
    case 'right':
      return { id, near: x0, far: x1, crossStart: y0, crossEnd: y1 }
    case 'left':
      return { id, near: -x1, far: -x0, crossStart: y0, crossEnd: y1 }
    case 'down':
      return { id, near: y0, far: y1, crossStart: x0, crossEnd: x1 }
    case 'up':
      return { id, near: -y1, far: -y0, crossStart: x0, crossEnd: x1 }
  }
}

/** Overlap of the two rects on the cross axis; negative when they don't touch. */
function crossOverlap(a: Projected, b: Projected): number {
  return Math.min(a.crossEnd, b.crossEnd) - Math.max(a.crossStart, b.crossStart)
}

/**
 * Why a candidate did or did not become the navigation target:
 * - `'winner'` — chosen target.
 * - `'scored'` — competed for the target but lost on score.
 * - `'behind'` — not ahead of the origin's leading edge on the movement axis.
 * - `'wrap-excluded'` — wrap pass only: behind the origin but too far off the
 *   cross axis to count as the same row/column.
 */
export type NavVerdict = 'winner' | 'scored' | 'behind' | 'wrap-excluded'

export type NavCandidateExplanation = {
  id: string
  verdict: NavVerdict
  /**
   * Edge-to-edge gap along the movement axis: origin's leading edge to the
   * candidate's near edge. `~0` when they abut, negative when the candidate
   * overlaps or sits behind the origin (then it is not "ahead").
   */
  primaryDistance: number
  /** Edge-to-edge gap on the cross axis; `0` when the rects overlap (aligned). */
  crossDistance: number
  /** Rects overlap on the cross axis — directly in the origin's row/column. */
  aligned: boolean
  /**
   * Comparison score (lower wins); only present for `'winner'`/`'scored'`.
   * Forward pass: `max(0, primaryDistance) + crossDistance × CROSS_AXIS_WEIGHT`.
   * Wrap pass: distance from the far opposite edge plus the cross offset.
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

function pickWinner(pool: Explained[], scoreOf: (c: Explained) => number): Explained | null {
  let winner: Explained | null = null
  let winnerScore = Infinity
  for (const entry of pool) {
    const s = scoreOf(entry)
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
    const overlap = crossOverlap(origin, projected)
    return {
      projected,
      explanation: {
        id: projected.id,
        verdict: 'behind',
        // Gap from the origin's leading (far) edge to the candidate's near edge.
        primaryDistance: projected.near - origin.far,
        crossDistance: Math.max(0, -overlap),
        aligned: overlap >= EPSILON,
      },
    }
  })

  // "Ahead" means the candidate clears the origin's leading edge — it is
  // genuinely in the pressed direction, not merely centered that way.
  const ahead = entries.filter((e) => e.explanation.primaryDistance >= -EPSILON)

  if (ahead.length > 0) {
    const winner = pickWinner(
      ahead,
      (e) =>
        Math.max(0, e.explanation.primaryDistance) +
        e.explanation.crossDistance * CROSS_AXIS_WEIGHT,
    )
    return {
      target: winner?.explanation.id ?? null,
      mode: winner ? 'forward' : 'none',
      candidates: entries.map((e) => e.explanation),
    }
  }

  if (options.wrap) {
    // Wrap targets must lie fully behind the origin and stay near it on the
    // cross axis — otherwise there is nothing along this axis to wrap to and
    // the move is a no-op.
    const crossSize = origin.crossEnd - origin.crossStart
    const nearCross = (e: Explained) =>
      e.explanation.aligned || e.explanation.crossDistance <= crossSize * WRAP_CROSS_TOLERANCE
    const behind = entries.filter((e) => e.projected.far <= origin.near + EPSILON)
    const pool = behind.filter(nearCross)
    for (const e of behind) {
      if (!nearCross(e)) e.explanation.verdict = 'wrap-excluded'
    }
    if (pool.length > 0) {
      // Distance from the far opposite edge is the primary term, so the trigger
      // nearest the other side (best cross alignment breaks ties) wins.
      const minNear = Math.min(...pool.map((e) => e.projected.near))
      const winner = pickWinner(
        pool,
        (e) => e.projected.near - minNear + e.explanation.crossDistance,
      )
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
 * Algorithm (the one browsers and game engines use — edge projection, not
 * center distance): keep only candidates whose leading edge clears the origin's
 * leading edge in the movement direction, then take the one that minimizes
 * `forwardGap + crossGap × CROSS_AXIS_WEIGHT`, where `crossGap` is `0` while the
 * rects overlap on the cross axis. With `wrap`, an empty half-plane instead
 * picks the candidate nearest the opposite edge — but only among candidates
 * fully behind the origin that are cross-aligned or within
 * `WRAP_CROSS_TOLERANCE`; if the current row/column has nothing to cycle to, the
 * move is a no-op.
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

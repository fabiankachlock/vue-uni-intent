import type { Direction } from "./types";

export type NavRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type NavCandidate = {
  id: string;
  rect: NavRect;
};

export type NavOptions = {
  wrap?: boolean;
};

/** Sub-pixel jitter guard for the half-plane filter. */
const EPSILON = 1;
/** Cross-axis penalty: mild when rects overlap on the cross axis, strong otherwise. */
const ALIGNED_WEIGHT = 0.5;
const UNALIGNED_WEIGHT = 5;

/**
 * A rect projected into movement space: `primary` grows in the direction of
 * movement, `cross` is the orthogonal axis. Lets every direction share one
 * scoring implementation.
 */
type Projected = {
  id: string;
  primary: number; // center along movement axis (sign-flipped so "forward" is positive)
  cross: number; // center along cross axis
  crossStart: number; // rect extent on the cross axis
  crossEnd: number;
};

function project(candidate: NavCandidate, direction: Direction): Projected {
  const { rect, id } = candidate;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const horizontal = direction === "left" || direction === "right";
  const forward = direction === "down" || direction === "right" ? 1 : -1;
  return horizontal
    ? { id, primary: cx * forward, cross: cy, crossStart: rect.y, crossEnd: rect.y + rect.height }
    : { id, primary: cy * forward, cross: cx, crossStart: rect.x, crossEnd: rect.x + rect.width };
}

function crossAligned(a: Projected, b: Projected): boolean {
  return Math.min(a.crossEnd, b.crossEnd) - Math.max(a.crossStart, b.crossStart) >= EPSILON;
}

function score(from: Projected, to: Projected, primaryDist: number): number {
  const crossDist = Math.abs(to.cross - from.cross);
  return primaryDist + crossDist * (crossAligned(from, to) ? ALIGNED_WEIGHT : UNALIGNED_WEIGHT);
}

function best(from: Projected, candidates: Projected[], primaryDistOf: (c: Projected) => number) {
  let winner: Projected | null = null;
  let winnerScore = Infinity;
  for (const candidate of candidates) {
    const s = score(from, candidate, primaryDistOf(candidate));
    // Strict `<` keeps the earliest-registered candidate on ties.
    if (s < winnerScore) {
      winner = candidate;
      winnerScore = s;
    }
  }
  return winner;
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
 * but only among candidates that lie behind the origin on the movement axis;
 * if nothing exists along that axis at all, the move is a no-op.
 */
export function findNext(
  from: NavCandidate,
  candidates: readonly NavCandidate[],
  direction: Direction,
  options: NavOptions = {},
): string | null {
  const origin = project(from, direction);
  const projected = candidates.map((c) => project(c, direction));

  const ahead = projected.filter((c) => c.primary > origin.primary + EPSILON);

  if (ahead.length > 0) {
    const inCone = ahead.filter(
      (c) => Math.abs(c.cross - origin.cross) <= c.primary - origin.primary || crossAligned(origin, c),
    );
    const pool = inCone.length > 0 ? inCone : ahead;
    return best(origin, pool, (c) => c.primary - origin.primary)?.id ?? null;
  }

  if (options.wrap) {
    // Wrap targets must lie behind the origin — otherwise there is nothing
    // along this axis to wrap to and the move is a no-op.
    const behind = projected.filter((c) => c.primary < origin.primary - EPSILON);
    if (behind.length > 0) {
      // Treat distance from the far opposite edge as the primary distance,
      // so the "first" trigger on the other side (best cross alignment) wins.
      const minPrimary = Math.min(...behind.map((c) => c.primary));
      return best(origin, behind, (c) => c.primary - minPrimary)?.id ?? null;
    }
  }

  return null;
}

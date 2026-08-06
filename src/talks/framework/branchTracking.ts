// ============================================================================
// Stable labelling of multiple solutions across a drag.
//
// A figure that shows several interpolants to the same data has a problem the
// mathematics does not care about: the solutions are roots of one equation, so their
// ORDER is not canonical. Solvers return them in whatever order is numerically
// convenient (`csolveQuadratic` picks by magnitude; `csqrtBoth` by a branch of the
// square root), and that order FLIPS as the data moves. Left alone, the colours jump
// mid-drag and the viewer sees discontinuous motion where the mathematics is smooth.
//
// The fix is to relabel each frame by matching to the previous frame — continuous
// tracking. For the small counts figures actually show (2 for a PH cubic, 4 for a
// planar PH quintic Hermite problem) the exact minimum-cost assignment is cheap
// enough to enumerate, so there is no need for a heuristic that could mis-pair.
//
// NOTE what this does NOT do: it deliberately keeps following the same solution
// through a loop in data space, which means a circuit around a branch point comes
// back on the OTHER sheet. That is monodromy, and it is correct — the figure should
// show it, not hide it.
// ============================================================================

/** All permutations of 0..n−1. Only called for small n (see `trackOrder`). */
function permutations(n: number): number[][] {
  if (n <= 1) return [[0].slice(0, n)]
  const out: number[][] = []
  for (const rest of permutations(n - 1)) {
    for (let i = 0; i <= rest.length; i++) {
      out.push([...rest.slice(0, i), n - 1, ...rest.slice(i)])
    }
  }
  return out
}

const MAX_EXACT = 6

/**
 * Reorder `next` so that entry i corresponds to `prev[i]`, minimising the total
 * `cost`. Returns `next` unchanged when the counts differ (a solution appeared or
 * vanished — the caller should fall back to its canonical order) or when there is
 * nothing to match.
 *
 * Exact for `n ≤ 6` by enumerating permutations; greedy above that, which the
 * figures never reach.
 */
export function trackOrder<T>(
  next: readonly T[],
  prev: readonly T[],
  cost: (a: T, b: T) => number,
): T[] {
  const n = next.length
  if (n === 0 || n !== prev.length) return [...next]

  if (n > MAX_EXACT) {
    // Greedy: repeatedly take the cheapest remaining pair.
    const remaining = new Set(next.map((_, i) => i))
    const order: number[] = []
    for (let i = 0; i < n; i++) {
      let best = -1
      let bestC = Infinity
      for (const j of remaining) {
        const c = cost(next[j], prev[i])
        if (c < bestC) { bestC = c; best = j }
      }
      remaining.delete(best)
      order.push(best)
    }
    return order.map((j) => next[j])
  }

  let bestPerm: number[] | null = null
  let bestTotal = Infinity
  for (const perm of permutations(n)) {
    let total = 0
    for (let i = 0; i < n; i++) total += cost(next[perm[i]], prev[i])
    if (total < bestTotal) { bestTotal = total; bestPerm = perm }
  }
  return (bestPerm ?? next.map((_, i) => i)).map((j) => next[j])
}

/**
 * Total distance between two solutions' control polygons — the right cost for
 * tracking, because it compares the CURVES rather than their internal
 * parameterisation. Two solvers can describe the same curve with different
 * generator signs (the w → −w gauge), so matching on generator coefficients would
 * see spurious differences that matching on control points does not.
 */
export function controlPolygonDistance(
  a: { controlPoints: readonly { re: number; im: number }[] },
  b: { controlPoints: readonly { re: number; im: number }[] },
): number {
  let total = 0
  const n = Math.min(a.controlPoints.length, b.controlPoints.length)
  for (let i = 0; i < n; i++) {
    total += Math.hypot(
      a.controlPoints[i].re - b.controlPoints[i].re,
      a.controlPoints[i].im - b.controlPoints[i].im,
    )
  }
  return total
}

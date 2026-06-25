# Curvature-Constrained Editing — Architecture & Convergence Plan

This document describes the subsystem that lets a user drag a curve's control points
while a **bound on the number of curvature extrema** (and inflections) is held — the
"sliding mechanism" of the St-Malo / Curves & Surfaces 2026 work. It states the target
architecture, the canonical conventions, the current (partly-duplicated) state, and the
ordered plan to converge on a single robust library.

It exists so that someone new can understand *how the pieces fit* — not just that they
work — and so we stop re-inventing instead of converging.

---

## 1. What the library does

Given a curve `c(t)` and a drag of control point `Pₖ` toward a cursor target `Tₖ`, solve

```
min  Σ wᵢ ‖Pᵢ* − Tᵢ‖²     s.t.   sⱼ · gⱼ(P*) ≥ 0  for j ∈ 𝒜
```

- `g(t)` is the **curvature-extrema numerator** — the numerator of κ′(t); its zeros are
  the curvature extrema. (`f(t) = c′×c″` is the inflection numerator; same machinery.)
- `S⁻` = the number of sign changes of `g`'s coefficients. By **Schoenberg** (Thm 1) it
  bounds the number of curvature extrema.
- The **sliding mechanism** (Thm 2): constrain only the *active set* `𝒜` — the
  same-sign positions plus **one anchor (largest |g|) per alternating run** — and leave
  the alternating-run interiors free to slide. Then `S⁻` is **monotone non-increasing**
  across every edit (the only way `S⁻` can grow is an "all-flip" of a run, which the
  retained anchor blocks).

This is solved per drag step by an interior-point method.

---

## 2. The contract: one editor guarantee

> **The bound `S⁻` is monotone non-increasing, and the editor never blocks.**

Consequences, decided deliberately (see the design history in the memory notes):

- We guarantee the **bound**, not the exact marker count. Actual extrema may appear/merge
  *within* the held bound — that is what the sliding mechanism permits. (Pinning the exact
  marker count is what *blocks* near-degenerate curves.)
- **No freezing.** The active set is re-evaluated every tick so the mechanism adapts.
- The numerics near `g ≈ 0` are the hard part ("we sit on near-zero constraints all the
  time"). Two rules make them robust:
  - **`S⁻` is counted on neighbour-assigned signs** (`assignSignsNeighbor`): a coefficient
    below the noise floor takes its run's sign instead of faking a sign change.
  - **Strict enforcement** corrects solver slip: after the solve, if `S⁻` ticked up
    (numerical slip near zero), bisect the result back toward the tick's start until the
    bound holds again. It is a *correction*, not a freeze — a no-op on clean solves.
- Markers (the dots) must be counted **consistently with the bound** — a real extremum is
  one where `g` genuinely swings (a deadband `±ε·max|g|`), not a noise crossing.

---

## 3. Architecture: one spine, specialized organs

The goal is **not** one implementation for all curves — each family deserves its best,
specialized math. The goal is **one shape**: a shared spine that every family plugs into.

```
                       ┌─────────────── THE SPINE (shared) ───────────────┐
                       │  contract:  OptimizationProblem  (ipopt/types.ts) │
   editor ── slide() ──┤  solver:    InteriorPointOptimizer (ipopt/)       │
                       │  bound:     S⁻ = cyclicSignChanges(assignSigns…)  │
                       │  enforce:   sliding active set + strict guard      │
                       │  linalg:    banded / arrowhead / windowed          │
                       └───────────────────────────────────────────────────┘
                                          ▲   ▲   ▲   ▲
        ┌─────────────────────────────────┘   │   │   └──────────────────────┐
   ORGAN: polynomial            ORGAN: rational / complex-rational     ORGAN: PH (poly,
   g = ‖c′‖²(c′×c‴)−3(c′·c″)(c′×c″)   g via Chen reduction (weights)      complex, real, AB)
   PlanarCurvatureProblem       ComplexRationalProblem                  PH problems
   (open band / closed arrowhead)  (fixed-weight local gradient)        (generator S,D / A,B,S)
```

### The spine (curve-type-agnostic)
- **Contract** — `OptimizationProblem` (`src/core/ipopt/types.ts`): a curve type provides
  `computeConstraints` (the `gⱼ`), `computeConstraintJacobian` (its specialized gradient),
  the sliding state (`getConstraintSigns` / `getInactiveConstraints`), and the objective.
- **Solver** — `InteriorPointOptimizer` (`src/core/ipopt/InteriorPointOptimizer.ts`):
  trust region + filter + feasibility restoration. It does not know the curve type.
- **Linear algebra** — `SymBand` (`banded.ts`), `Arrowhead` (`cyclic.ts`),
  `bandedTrustRegion.ts` (open=band, closed=band+seam, large-n=windowed [planned]).
- **Bound** — one metric: `cyclicSignChanges(assignSignsNeighbor(g.flatCoeffs()), closed)`.
- **Enforcement** — the sliding active set (`computeInactiveSetBySign` / `…Cyclic`) and the
  strict post-solve `S⁻` guard (in `slideCurve` / `slideComplexRational`).

### The organs (per-type "best optimization")
| family | numerator g | problem / drag entry | linear algebra |
|---|---|---|---|
| polynomial planar | `curvatureExtremaNumeratorPlanar / …Periodic` | `PlanarCurvatureProblem` / `slideCurve` | band (open), arrowhead (closed) |
| (complex-)rational | `curvatureExtremaNumeratorComplex / …Periodic` (Chen) | `ComplexRationalProblem` / `slideComplexRational` | arrowhead, fixed-weight local gradient |
| PH polynomial / complex / real / AB | generator-based | `optimizePHCurve` / `optimizeComplexRationalPHCurve` / `optimizeRealRationalPHCurve` / `optimizeABPHCurve` | (currently the legacy solver — to port onto the spine) |

Understand the spine + one organ and you understand them all: organs differ **only** in
the `g`/gradient they expose through the identical contract.

---

## 4. Current state — what is canonical vs. duplicated

The TypeScript code is a **partly-finished port** from the Rust `ne-core` library (which
already has this shape: one `Problem` trait, one `optimize`, one bound). Both stacks are
currently live — `src/core/` (the future spine) **and** `src/sketcher/optimizer/` (the
legacy engine). Every concept exists in both, which is the source of the "the bound says
4 but the readout says 6" class of bugs.

| concept | # impls | **canonical** (keep) | **duplicate** (delete on convergence) |
|---|---|---|---|
| solver | 2 (+3 demo) | `core/ipopt/InteriorPointOptimizer` | `sketcher/optimizer/InteriorPointOptimizer` + its `linearAlgebra.ts` |
| numerator `g`/`f` | 2 per type | `core/curvature.ts` `curvatureExtremaNumerator*` / `inflectionNumerator*` | `sketcher/optimizer/algebra.ts` `compute*DerivativeNumerator*`, `complexAlgebra.ts` `compute*ComplexDerivativesBD` |
| bound / count | 3 conventions | `cyclicSignChanges(assignSignsNeighbor(…))` (S⁻) + core dense `*ExtremaParameters` (marker positions, to be deadbanded) | sketcher `compute*ExtremaParameters` + `compute*ConstraintState` |
| sliding active set | 2 | core `computeInactiveSet` / `…BySign` / `…BySignCyclic` | per-problem sketcher `computeInactiveSet*` copies |
| drag entry | core (canonical) + legacy (routed) + PH (organs) | `slideCurve`, `slideComplexRational`; PH organs until ported | `optimizeCurve`, `optimizeRationalCurve`, `optimizeComplexRationalCurve` |
| display (markers + "S =") | mixed core/sketcher per type | all types → core dense markers (deadbanded) + core `cyclicSignChanges` | the sketcher marker/constraint-state calls in `SketcherCanvas.tsx` + `BottomPanel.tsx` |

**The structural bug, in one sentence:** the *drag guard* (clean-periodic cases) runs on
`core`, but the *display* still calls the `sketcher` numerators/counts for every type
except open b-spline — so they use different `g` and different sign conventions and
disagree. Collapsing the bound metric onto one core function is the single
highest-leverage fix.

### Store routing today (`sceneStore.moveControlPoint`)
First match wins. PH (rows 1–5) → PH organs. `bspline` open or clean-periodic-closed → `slideCurve`.
`rational`/`complex-rational` clean-periodic-closed → `slideComplexRational`. **Everything
else** (junction-knot closed, symmetry-reduced, open-rational) → **legacy** `optimize*Curve`.
Converging means core covers those last cases so the legacy paths can be deleted.

---

## 5. Convergence plan (ordered, each step matrix-guarded)

Discipline: **no new metric or mechanism** until the duplication is gone. Each step makes
`core/` the single source of truth for one concept, routes everyone through it, and
**deletes the duplicate in the same step**. The regression net is the diagnostic matrix
(curve type × open/closed × slow/fast → bound non-increasing + non-blocking + display
consistent).

- **Step 0 — Diagnostic matrix as a committed test.** Lock the contract (§2) as an
  executable spec across all curve types, so every later step is verified, not hoped.
- **Step 1 — Unify the bound metric (highest leverage).** One core S⁻
  (`cyclicSignChanges(assignSignsNeighbor)`) + deadband on the core dense `*ExtremaParameters`
  (markers). Route **all** types' "S =" readout and markers through core. Delete the
  sketcher `compute*ConstraintState` + `compute*ExtremaParameters`. *Ends guard-vs-display
  disagreement for every type at once.*
- **Step 2 — Unify the enforcement.** The sliding active set + the strict `S⁻` guard live
  in one shared place used by both `slideCurve` and `slideComplexRational` (the guard was
  added to both — make it literally the same helper). Delete per-problem sketcher inactive
  sets.
- **Step 3 — Unify the numerator `g`.** Display and editor compute `g`/`f` only via
  `core/curvature.ts`. Delete the `sketcher` numerator duplicates.
- **Step 4 — Unify the drag entry; delete legacy.** Make `slideCurve`/`slideComplexRational`
  cover the cases still on legacy (junction-knot closed, symmetry, open-rational). Delete
  `optimizeCurve` / `optimizeRationalCurve` / `optimizeComplexRationalCurve`.
- **Step 5 — Port PH onto the spine.** Recast the four PH optimizers as
  `OptimizationProblem`s solved by the core solver; delete the `sketcher` solver +
  `linearAlgebra.ts`.
- **Step 6 — One closed-curve model.** Resolve the C⁰-junction-vs-clean-periodic fork
  (either smooth-periodic only, like Rust, or teach the core periodic solver junction
  knots) so closed curves take one path.
- **Step 7 — Speed organs to match Rust.** Windowed local solve (`SymBand::solve_windowed`)
  for large n; reduce Bernstein allocation. These are organ-internal — the spine is
  unchanged.

After Step 5 there is exactly one solver, one `g` per family, one bound, one active set,
one drag entry, one display metric — the library feel, with every per-type optimization
preserved.

---

## 6. Adding a new curve family (how the library is meant to be used)

1. Implement `OptimizationProblem` (`core/ipopt/types.ts`): expose your `g` (via a numerator
   in `core/curvature.ts`), your specialized constraint Jacobian, and the sliding state from
   the shared `computeInactiveSet*` helpers.
2. Add a `slideX(...)` entry that builds your problem and calls `InteriorPointOptimizer`.
   The bound metric, the strict enforcement, the banded/arrowhead solve, and the display all
   come from the spine for free.
3. You do **not** write a new bound count, a new sign convention, a new active-set rule, or
   a new solver. If you find yourself doing so, that is the signal you are duplicating the
   spine — stop and reuse it.

---

## 7. References

- Talk: `src/talks/cs2026/` (slides) — the sliding mechanism, the theorems, the anchor lemma.
- Rust reference library (the target shape): `../static-portfolio-rust/crates/ne-core`.
- Related design notes: `docs/LINEAR_DRAG.md`; the project memory notes on the drag
  contract, the freeze reversal, and the loose-bound representation.

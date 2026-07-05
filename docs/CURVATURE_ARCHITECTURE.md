# Curvature-Constrained Editing — Architecture & Convergence Plan

This document describes the subsystem that lets a user drag a curve's control points
while a **bound on the number of curvature extrema** (and inflections) is held — the
"sliding mechanism" of the St-Malo / Curves & Surfaces 2026 work. It states the target
architecture, the canonical conventions, the current (partly-duplicated) state, and the
ordered plan to converge on a single robust library.

It exists so that someone new can understand _how the pieces fit_.

---

## 1. What the library does

Given a curve `c(t)` and a drag of control point `Pₖ` toward a cursor target `Tₖ`, solve

```
min  Σ wᵢ ‖Pᵢ* − Tᵢ‖²     s.t.   sⱼ · gⱼ(P*) ≥ 0  for j ∈ 𝒜
```

- `g(t)` is the **curvature-extrema numerator** — the numerator of κ′(t); its **sign
  changes (crossings)** are the curvature extrema (Law 1: a zero that only touches is a
  flat spot of dκ/ds, not an extremum). (`f(t) = c′×c″` is the inflection numerator; same
  machinery.)
- `S⁻` = the number of sign changes of `g`'s coefficients. By **Schoenberg** (Thm 1) it
  bounds the number of curvature extrema.
- The **sliding mechanism** (Thm 2): constrain only the _active set_ `𝒜` — the
  same-sign positions plus **one anchor (largest |g|) per alternating run** — and leave
  the alternating-run interiors free to slide. Then `S⁻` is **monotone non-increasing**
  across every edit (the only way `S⁻` can grow is an "all-flip" of a run, which the
  retained anchor blocks).

This is solved per drag step by a **log-barrier trust-region** method (§3–4).

---

## 2. The contract: one editor guarantee

> **The bound `S⁻` is monotone non-increasing, and the editor never blocks.**

Consequences, decided deliberately (see the design history in the memory notes):

- We guarantee the **bound**, not the exact marker count. Actual extrema may appear/merge
  _within_ the held bound — that is what the sliding mechanism permits. (Pinning the exact
  marker count is what _blocks_ near-degenerate curves.)
- **No freezing.** The active set is re-evaluated every tick so the mechanism adapts.
- The numerics near `g ≈ 0` are the hard part ("we sit on near-zero constraints all the
  time"). Two rules make them robust:
  - **`S⁻` is counted RAW** (`assignSignsNeighbor`, `bernstein.ts`): every nonzero
    coefficient keeps its own computed sign; only an **EXACT floating-point zero** — whose
    sign genuinely does not exist — borrows its nearest neighbour's, so it joins that run
    for the optimizer **without adding a count**. There is **no magnitude floor** on the
    sign. `SIGN_NOISE_REL = 1e-14` survives ONLY as feasibility **slack**
    (`structuralMarginsScaled` in `curvatureProblem.ts` — a practically-zero active
    coefficient starts a hair off its wall) and in the trust-region-inert row scale; it
    never rewrites a sign. (Previously a "below the noise floor takes its run's sign" rule
    reassigned tiny coefficients; it read a **false low bound** — the E25 oracle specimen,
    clustered knots, displayed 14 vs the exact 25 with every sign correct, `labE25.test.ts`.)
  - **Strict enforcement** corrects solver slip: after the solve, if `S⁻` ticked up
    (numerical slip near zero), bisect the result back toward the tick's start until the
    bound holds again. It is a _correction_, not a freeze — a no-op on clean solves.
- Markers (the dots) come from **variation-diminishing subdivision** of `g`
  (`signChangeParams` / `curvatureExtremaMarkersOfNumerator`, `curvature.ts`):
  **scale-free, crossings-only**, never sampling and with **no deadband**. `markers ≤ S⁻`
  holds automatically — both are the sign structure of the same raw-counted polygon.
  (Previously a `±ε·max|g|` marker deadband was prescribed; it is forbidden by Law 3 — a
  relative floor on a ~1e12 dynamic range deletes real low-amplitude crossings.)

---

## 3. Architecture: one spine, specialized organs

The goal is **not** one implementation for all curves — each family deserves its best,
specialized math. The goal is **one shape**: a shared spine that every family plugs into.

```
                       ┌─────────────── THE SPINE (shared) ───────────────┐
                       │  contract:  OptimizationProblem  (ipopt/types.ts) │
   editor ── slide* ───┤  solver:    barrier — ipopt (algebraic) OR        │
                       │             trust-region (PH); both interior-point │
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
- **Solver** — an interior-point barrier, in **two production instances** (both curve-type
  agnostic, both hold the bound):
  - **`InteriorPointOptimizer`** (`src/core/ipopt/`) — trust-region filter barrier (SOC,
    feasibility restoration, filter, watchdog). The production solver for the **algebraic
    families** (polynomial/rational/complex-rational, open + closed), reached via `slideCurve`
    (`method:'ipopt'`), `slideComplexRational`, and the generic `slide()`'s default `'best'`
    (ipopt + primal-dual, keep the furthest bound-holding result). Banded/arrowhead inner
    solve opt-in via `bandedSolve`.
  - **`TrustRegionBarrierOptimizer` / …Banded** (`src/core/trustRegionOptimizer.ts` /
    `trustRegionBanded.ts`) — log-barrier path following with the Conn–Gould–Toint near-exact
    trust-region subproblem (λ-iteration on `H+λI`), ρ measured for the step taken, and a
    shrink-until-strictly-feasible inner loop; banded + bordered (arrowhead) Cholesky
    `O(n·b²)`. The production solver for the **PH** drags (`phCurveBoundDrag.ts`) and the
    generic `slide()`'s `'trust-region'` option. It is the newest engine and the intended
    target for unifying the algebraic families onto one solver — **not yet done** (§8).
  - **Farin** handle drags use neither barrier — a pure-weight count-guarded walk
    (`farinDrag.ts`); the trust-region call there is the *unwired* anchored reshape variant.
  - The **primal-dual** solvers are kept as measured comparisons (§4).
- **Linear algebra** — `SymBand` (`banded.ts`), `Arrowhead` (`cyclic.ts`),
  `trustRegionBanded.ts` (open=band, closed=band+seam, large-n=windowed [planned]).
- **Bound** — one metric: `cyclicSignChanges(assignSignsNeighbor(g.flatCoeffs()), closed)`.
- **Enforcement** — the sliding active set (`computeInactiveSetBySign` / `…Cyclic`) and the
  strict post-solve `S⁻` guard (in `slideCurve` / `slideComplexRational`).

### The organs (per-type "best optimization")

| family                              | numerator g                                           | problem / drag entry                                                                                       | linear algebra                                         |
| ----------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| polynomial planar                   | `curvatureExtremaNumeratorPlanar / …Periodic`         | `slideCurve` (open + closed)                                                                               | band (open), arrowhead (closed)                        |
| (complex-)rational                  | `curvatureExtremaNumeratorComplex / …Periodic` (Chen) | `slideComplexRational` (open + closed, incl. junction/cusp)                                                | arrowhead, fixed-weight local gradient                 |
| PH polynomial (open/closed)         | reduced numerator `R` (`phCurvature.ts`, g = 2·R·σ²)  | `slideOpenPHCurveBound` / `slideClosedPHCurveBound` (core TR engine); value bound via `phValueBound.ts` (P± certificate rows) | band (open), band+seam (closed), free-seam coords      |
| Farin handle (rational / complex)   | same `g`, handle position ⇒ edge ratio in closed form | `slideRationalFarin` (1-D count-guarded bisection) / `slideComplexFarin` (2-DOF pure-weight walk, monodromy-aware closed) | value-only Chen numerator, count-guarded               |
| PH variant (complex / real / AB)    | generator-based                                       | `optimizeComplexRationalPHCurve` / `optimizeRealRationalPHCurve` / `optimizeABPHCurve` (**the remaining legacy island** — port-vs-contain pending) | legacy `InteriorPointOptimizer`                        |

Understand the spine + one organ and you understand them all: organs differ **only** in
the `g`/gradient they expose through the identical contract. Every mainline drag runs on
**core** (no legacy fallback), but on one of three solvers: the **algebraic** families on
the ipopt `InteriorPointOptimizer`, **PH** on the trust-region engine, and **Farin** on the
pure-weight walk. Unifying the algebraic families onto the trust-region engine (one barrier
for all) is intended but not yet done. Only the PH-**variant** families (last row) still run
on the legacy solver.

---

## 4. Interchangeable backends — options, measure, then choose the default

For every pluggable computation we keep **all** implementations, because they
**cross-validate each other** and let us measure. The non-default ones are not dead code —
they are the oracles that prove the default correct. The default is chosen **empirically**
(benchmarks + the oracle/bound tests) and the measured choice is **documented here, with
the reason**.

**Gradient / Jacobian of `g`** — three backends that must agree to machine ε:

- **FD** (finite differences) — ground-truth oracle, slow.
- **AD** (forward-mode dual / `Jet` over the _same_ `g` formula) — exact, no hand
  derivation; the oracle for the analytic form and the path of choice where hand-deriving
  is error-prone.
- **Analytic** (hand-derived, seeded, B-spline-local, O(n·d²)) — the production path.
- _Default: analytic_ (fastest, FD- and AD-validated). FD/AD retained as oracles.

**Constraint Hessian** — two backends:

- **Gauss-Newton** (drop the constraint-curvature term) — _default_.
- **Exact Newton Hessian of `g`** (`enableExactHessian`; Jet2-AD oracle + fast seeded form,
  machine-ε to FD). _Measured:_ tracks the cursor closer but its aggressive step overshoots
  the bound on fast drags, and is ~2.5× slower. Kept behind the flag; **default OFF** until
  step control tames it.

**Solver** — multiple interior-point regimes; the production choice is per-family, chosen by
measurement:

- **`InteriorPointOptimizer` (IPOPT)** (trust-region filter barrier: SOC, feasibility
  restoration, filter, watchdog) — the production solver for the **algebraic families**
  (`slideCurve` `method:'ipopt'`, `slideComplexRational`, and generic `slide()`'s `'best'`).
- **`TrustRegionBarrierOptimizer` / `…Banded`** (log-barrier, Conn–Gould–Toint near-exact
  subproblem, ρ measured, shrink-until-strictly-feasible, banded/bordered `O(n·b²)`) — the
  production solver for **PH** and the newest engine; the target for unifying the rest onto one
  barrier (not yet done).
- **`PrimalDualOptimizer` / `BandedPrimalDualOptimizer`** — measured comparisons (and one arm of
  `'best'`); leaner but can slip the bound alone, so opt-in.
- **Rule:** whichever solver is a family's default must **keep the bound _and_ track** —
  measured, not assumed (F9's trap: a solver that tracks further while its displayed bound
  climbs is not "better," it is enforcing a different quantity).

> Methodology, restated: _keep the options, measure, choose the default, document the
> choice and the measurement._ When the measurement changes, update this section.

---

## 5. Linear complexity — O(n) drag

The spine's linear algebra is shared by every organ:

- The barrier Hessian is **banded** in the interleaved `[x₀,y₀,x₁,y₁,…]` ordering (each
  curvature constraint touches only the `d+1` control points supporting its span).
- **Open** → banded LDLᵀ, `O(n·b²)`. **Closed** → band + low-rank **seam** ("arrowhead",
  Sherman–Morrison–Woodbury), `O(n·b²)`. **Large n** → **windowed** local solve `O(window)`
  (port of Rust `SymBand::solve_windowed` — _planned_).
- `g` and its Jacobian are assembled **locally** (`O(n·d²)`) via B-spline locality (a CP's
  basis is nonzero on only `d+1` spans), never dense `O(n²)/O(n³)`.

Full write-up: `docs/LINEAR_DRAG.md`. Any new organ inherits this; it must not reintroduce
a dense solve.

---

## 6. Bound-keeping methods (document every one explicitly)

Any mechanism that keeps `S⁻` non-increasing is named here so it is never silently changed:

- **Sliding mechanism** (St-Malo Thm 2): constrain only `𝒜` = same-sign positions + one
  anchor (largest |g|) per alternating run; free the run interiors. Implemented in
  `computeInactiveSetBySign` / `…BySignCyclic`. **Re-evaluated every tick — never frozen.**
- **Raw strict counting** (E25): `S⁻` counts the **actual** signs of `g`'s coefficients via
  `assignSignsNeighbor` — every nonzero coefficient keeps its own sign; only an **exact**
  floating-point zero borrows its neighbour's (so it joins a run without adding a count).
  There is **no magnitude floor**: a relative floor on `g`'s ~1e12 dynamic range deletes
  real low-amplitude features and reads a **false low bound** (the E25 specimen displayed 14
  vs the exact 25, `labE25.test.ts`). `SIGN_NOISE_REL = 1e-14` survives only as feasibility
  slack, never as a sign classifier.
- **Strict post-solve enforcement**: if numerical slip ticked `S⁻` up, bisect the result
  back toward this tick's start until `S⁻ ≤ start` (the shared `enforceBoundNonincreasing`
  guard). A _correction_ for solver slip near `g≈0`, **not** a freeze; a no-op on clean solves.
- **Markers from variation-diminishing subdivision**: `curvatureExtremaMarkersOfNumerator`
  (`curvature.ts`) locates crossings by VD subdivision of `g` — scale-free, crossings-only,
  **no deadband**. `markers ≤ S⁻` holds automatically because both read the sign structure of
  the same raw-counted polygon. A `±ε·max|g|` marker deadband is **forbidden** by Law 3.
- **Anti-patterns (do NOT):** freeze the signs/active-set across a drag (blocks editing);
  guard on the dense actual-extrema count instead of `S⁻` (misses `S⁻` slips and
  over-counts noise); make a faster solver the default if it can slip the bound.

---

## 7. Testing — per curve type, open and closed

The contract (§2) is only real if it is **executable for every family**. Each curve type
(polynomial, rational, complex-rational, PH) in **both open and closed** form must have:

- **Oracle tests** — analytic gradient/Hessian == FD == AD to machine ε.
- **Bound preservation** — a chained drag, **slow _and_ fast**, with `S⁻` non-increasing.
- **Non-blocking** — the dragged point makes real progress on degenerate / near-straight
  curves (no stick).
- **Parity** — closed bound is even (cyclic count).
- **Display == guard** — the readout/markers count equals the bound the solver enforces.

The umbrella is the **diagnostic matrix**: `curve type × {open,closed} × {slow,fast}` →
`{bound non-increasing, non-blocking, display==guard}`. It is the single regression net
that guards every convergence step. **A curve type with no bound-preservation test is not
"done."**

---

## 8. Current state — what is canonical vs. duplicated

The TypeScript code was a **partly-finished port** from the Rust `ne-core` library (one
`Problem`, one `optimize`, one bound). That port is now **essentially complete for every
mainline drag**: `src/core/` is the spine and the single source of truth for the bound,
the sign convention, the sliding active set, and the display. The old "the bound says 4 but
the readout says 6" class of bug is gone because the readout, the markers, and the guard all
read the **same solved object** (E16-P2/P3, E25 raw counting).

What survives of `src/sketcher/optimizer/` is a **shrinking legacy island**, not a parallel
stack — it is reachable only through the PH-variant drags below and the fit/lab tests.

| concept                   | canonical (the spine)                                                                             | legacy remnant                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| solver                    | `core/ipopt/InteriorPointOptimizer` (algebraic) + `core/trustRegionOptimizer.ts` (PH) — both production | `sketcher/optimizer/InteriorPointOptimizer` — only the PH-variant island still calls it |
| numerator `g`/`f`         | `core/curvature.ts` `curvatureExtremaNumerator*` / `inflectionNumerator*`; PH `phCurvature.ts` (R) | `optimizer/algebra.ts`, `complexAlgebra.ts` — construction/offset/render + PH-variant only |
| bound / count             | one metric: `cyclicSignChanges(assignSignsNeighbor(g.flatCoeffs()), closed)` (raw, E25)           | — (retired)                                                                  |
| markers                   | `curvatureExtremaMarkersOfNumerator` (VD subdivision, no deadband)                                 | — (retired)                                                                  |
| sliding active set        | core `computeInactiveSetBySign` / `…Cyclic`                                                        | — (retired)                                                                  |
| drag entry                | `slideCurve`, `slideComplexRational`, `slideOpen/ClosedPHCurveBound`, `slideRational/ComplexFarin` | `optimize{ComplexRational,RealRational,AB}PHCurve` (PH-variant island)       |
| display (markers + "S =") | all types → the solved object's core `g` + `cyclicSignChanges` + VD markers                        | — (retired)                                                                  |

**Deleted on the way here** (see the legacy-deletion memory + git): the whole CP-drag legacy
engine, both Farin problem classes, the rational/periodic-rational/complex-rational problem
classes, `SymmetryReductionWrapper`, `FixedVariableWrapper`, `PeriodicBSplineCurveProblem`,
the noise-floor sign smoothing, the marker-robust duplicate finder — roughly 3,700+ lines.

### Store routing today (`sceneStore.moveControlPoint`)

First match wins. Open/closed PH → `slideOpen/ClosedPHCurveBound` (core). Farin handle →
`slideRationalFarin` / `slideComplexFarin` (core). `bspline` open or closed → `slideCurve`
(core). `rational` / `complex-rational` open or closed (incl. junction/cusp) →
`slideComplexRational` (core). The **PH-variant families** (complex-rational-PH,
real-rational-PH, AB-PH) are the only drags still on `optimize*PHCurve` (legacy). The
**editor CP-drag ledger is empty** — every control-point drag runs on core.

---

## 9. Convergence plan (ordered, each step matrix-guarded)

Discipline: **no new metric or mechanism** until the duplication is gone. Each step made
`core/` the single source of truth for one concept, routed everyone through it, and
**deleted the duplicate in the same step**. The regression net is the diagnostic matrix
(curve type × open/closed × slow/fast → bound non-increasing + non-blocking + display
consistent). **Steps 0–5 are done; 6–7 remain.**

- ✅ **Step 0 — Diagnostic matrix as a committed test.** The all-family sweeps
  (`*AllCPSweep.test.ts`) lock the contract (§2) across every curve type.
- ✅ **Step 1 — Unify the bound metric.** One core `S⁻`
  (`cyclicSignChanges(assignSignsNeighbor)`, raw since E25) + VD-subdivision markers. Every
  type's "S =" readout and markers read the solved object's core `g`; the sketcher
  `compute*ConstraintState` / `compute*ExtremaParameters` are retired.
- ✅ **Step 2 — Unify the enforcement.** The strict `S⁻` guard is the shared
  `enforceBoundNonincreasing` (`curvatureProblem.ts`). _(Tier 2 folds the last few
  hand-rolled bisections in `phDrag.ts` / the Farin walks through it too.)_
- ✅ **Step 3 — Unify the numerator `g`.** Display and editor compute `g`/`f` only via
  `core/curvature.ts` (+ PH's reduced `R` in `phCurvature.ts`). The sketcher numerators
  survive only for construction/offset/render and the PH-variant island.
- ✅ **Step 4 — Unify the drag entry; delete legacy CP drags.** `slideCurve` /
  `slideComplexRational` cover open + closed (incl. junction/cusp); `optimizeCurve` /
  `optimizeRationalCurve` / `optimizeComplexRationalCurve` and the two Farin problem classes
  are deleted (~3,700 lines total).
- ✅ **Step 5 — Port PH onto the spine.** Open/closed PH curvature drags, the value bound
  (P± certificate rows, `phValueBound.ts`), and plain PH tracking all run on the core
  trust-region engine. **Remaining:** the three PH-**variant** families (complex-rational-PH,
  real-rational-PH, AB-PH) still use `optimize*PHCurve`; porting or containing them is the
  open port-vs-contain decision (§8, Eric's call).
- **Step 6 — One closed-curve model.** Resolve the C⁰-junction-vs-clean-periodic fork
  (either smooth-periodic only, like Rust, or teach the core periodic solver junction
  knots) so closed curves take one path.
- **Step 7 — Speed organs to match Rust.** Windowed local solve (`SymBand::solve_windowed`)
  for large n; reduce Bernstein allocation. Organ-internal — the spine is unchanged.

The spine goal is reached for every mainline family in every respect **except the solver**:
one `g` per family, one bound, one active set, one display metric, no legacy fallback. The
solver is not yet unified — algebraic families run on ipopt, PH on the trust-region engine,
Farin on a pure-weight walk. Collapsing the algebraic families onto the trust-region engine
(one barrier for all) is the remaining spine step, alongside the PH-variant island and the two
speed/topology refinements (Steps 6–7).

---

## 10. Adding a new curve family (how the library is meant to be used)

1. Implement `OptimizationProblem` (`core/ipopt/types.ts`): expose your `g` (via a numerator
   in `core/curvature.ts`), your specialized constraint Jacobian, and the sliding state from
   the shared `computeInactiveSet*` helpers.
2. Add a `slideX(...)` entry that builds your problem and calls the trust-region engine
   (`TrustRegionBarrierOptimizer` / `…Banded`). The bound metric, the strict enforcement
   (`enforceBoundNonincreasing`), the banded/arrowhead solve, and the display all come from
   the spine for free.
3. You do **not** write a new bound count, a new sign convention, a new active-set rule, or
   a new solver. If you find yourself doing so, that is the signal you are duplicating the
   spine — stop and reuse it.

---

## 11. References

- Talk: `src/talks/cs2026/` (slides) — the sliding mechanism, the theorems, the anchor lemma.
- Rust reference library (the target shape): `../static-portfolio-rust/crates/ne-core`.
- Related design notes: `docs/LINEAR_DRAG.md`; the project memory notes on the drag
  contract, the freeze reversal, and the loose-bound representation.

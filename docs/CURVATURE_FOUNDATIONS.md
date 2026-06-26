# Curvature-Extrema Control — Established Facts

This is the **textbook** for this subsystem: durable truths about our objects, each
established **once**, with *why it is true*, *what it causes*, and *the test that pins it*.

`CLAUDE.md` is the constitution (the laws — what must always hold). This file is the facts
(what *is* true). `docs/CURVATURE_ARCHITECTURE.md` is the engineering (how it's built).

**The rule that stops us re-studying the same thing:** before investigating a symptom,
read this file. If the relevant fact is here, build on it — do not re-derive it. If it is
*not* here, study it **once**, then add it here with its evidence and a pinning test. A bug
is allowed to teach us something new exactly once.

Each fact below is numbered (F1, F2, …) so code comments and commits can cite it.

---

## F1 — g carries a huge, geometry-irrelevant dynamic range driven by knot spans

**The fact.** The coefficients of g (the curvature-extrema numerator) span an enormous
magnitude range — measured at **~1e12** on a real 14-CP closed curve with clustered knots —
and most of that range is **not** curvature signal. It comes from the **knot spans**.

**Why it's true.** `g = ‖c′‖²·(c′×c‴) − 3·(c′·c″)·(c′×c″)` involves derivatives up to c‴.
For a B-spline, a derivative scales like `1/Δ` where Δ is the local knot span, so g scales
like a **high inverse power of Δ**. A span 3.6× smaller than its neighbour (e.g. 0.023 vs
0.083) therefore produces coefficients many orders larger — purely from the parameterization,
with the *same* underlying curve shape. Clustered knots (or clamped open endpoints, where the
basis derivatives also blow up) are where this bites hardest.

**What it causes (one villain, many symptoms).** Almost every "refactor regression" in this
subsystem traces back here:

- **False bound (Law 1 violation).** A "small relative to max|g|" floor (`1e-9·max`) deleted
  genuine low-amplitude coefficients sitting under the endpoint spike, so S⁻ read *below* the
  true sign-change count (a curve with 6 extrema displayed S⁻ = 4). Fixed by dropping the
  floor to machine-roundoff scale (`SIGN_NOISE_REL = 1e-12`). → F-test `lawBoundIsUpperBound`.
- **Erased markers.** A `1e-3·max|g|` deadband threshold erased every extremum whose |g| was
  small next to the endpoint spike (4–8 extrema → 1). Fixed by removing the amplitude band
  (count value crossings, screen flat curves robustly). → test `curvatureMarkers`.
- **Bound undercount and erased markers** are dynamic-range bugs (above). But **closed-drag
  "blocking" is NOT** — see F4. It is solver step-strategy, not conditioning. (Originally this
  bullet blamed conditioning for blocking; F4's solver matrix disproves that — corrected here so
  we don't chase conditioning again.)

**The cure (one fix dissolves the class).** Work in a **scale-normalized g**: divide each
coefficient by its knot-span-derived scale so the dynamic range collapses to O(1), leaving
only the geometric signal. Scaling by a positive factor **cannot change a sign**, so the
bound (Law 1) and the colors (Law 3) are untouched — this is conditioning, not faking. Then
the bound is robust *and* the solver is well-conditioned from the **same** representation.

**Current status.** Partially done. `scaleFor`/`scaleForRobust` (curvatureProblem.ts) already
divide active constraint rows by |coeff| (floored at `SCALE_FLOOR_REL = 1e-12·max`). It is
**not sufficient** for the clustered-knot closed case above (the retreat still happens), so
the conditioning of the closed solve is the open task. The honest, principled direction is to
normalize g by a **span-derived** scale (known a-priori from the knots), not just by |coeff|.

**Pinning evidence.** Dynamic range measured 1e12 (min 7.3e7, max 7.3e19) on the clustered
14-CP closed curve; retreat measured (CP0 dist-to-target: 0.0 at 20 it → 40.0 at 200 it).
*(TODO: promote these to a committed `lawClosedConditioning` test once the cure lands.)*

---

## F2 — For cubics, g is discontinuous at interior knots

**The fact.** For a degree-3 curve, g jumps at interior knots; it is not a smooth spline.

**Why.** c‴ of a cubic is piecewise constant and **jumps** at knots; g contains c‴, so g
inherits the jump. (The sketcher even has a dedicated discontinuous-extrema finder for this.)

**What it causes.** g's natural minimal representation is **per-span Bézier** (full knot
multiplicity), which is what `BernsteinDecomposition` stores. So the per-span control polygon
is honest, but its sign-change count S⁻ is **loose** (e.g. 10 vs 6 real sign changes): the
Bernstein basis oscillates more than the function. Loose is true and allowed (Law 1).
Tightening toward the real count needs g's minimal continuity-aware control polygon — correct
mathematics, never a threshold. (Task #28.)

**Pinning.** `lawBoundIsUpperBound` asserts S⁻ ≥ Z(g) (loose is fine; below is forbidden).

---

## F3 — The reference implementations work; this port keeps regressing on "cleanups"

**The fact.** The online sketcher and `../static-portfolio-rust` both produce correct,
non-blocking behavior. Regressions here are introduced by *our* refactors aimed at making the
code simpler/cleaner — not by the math being unknown.

**What it means for how we work.** The math is solved elsewhere; our job is a faithful,
*verifiable* port. So the safeguard is not more cleverness — it is **pinning tests that
encode the reference behavior** before refactoring, and **parity tests against Rust**
(`rustParity.test.ts`). A cleanup is only allowed to change *structure*, never the numbers a
pinning test records. If a refactor turns a test red, the refactor is wrong (CLAUDE.md).

**Consequence.** Prefer one canonical implementation per concept (the convergence work) so
there is one place to be correct, and lean on Rust/sketcher as oracles rather than re-deriving.

---

## F4 — Closed-drag "blocking" is solver step-strategy, not conditioning

**The fact.** On a clustered-knot closed curve, dragging certain control points stalls. This is
**not** linear-algebra conditioning (F1's dynamic range) and **not** a single fixable bug — it
depends on the solver, and no single available solver tracks every control point.

**The evidence (lever matrix, the user's 14-CP curve, CP-by-CP left-drag of 80 units over 40
ticks; every solver holds the bound S⁻=8 throughout):**

```
        ipopt+Gauss-Newton   primal-dual          notes
CP6     5/80  (→0 at 400it)   76/80               GN blocks & RETREATS; PD tracks
CP8     80/80                 15/80               GN tracks; PD blocks
CP3     28/80                 28/80               both stall
CP9     1/80                  3/80                both stall hard
CP12    80/80                 62/80               GN better
(others track ~full under both)
```

Whole-matrix levers tried: ipopt Gauss-Newton (default), ipopt+BFGS (CP6: 67/80 — also helps),
ipopt+exact-Hessian (no-op for closed), primal-dual, barrier (CP6: 74/80). The bound held in
every case.

**What it proves.**
- **Not conditioning.** Same Jacobian, same 1e12 range, opposite results across solvers (PD
  tracks CP6 where GN fails; GN tracks CP8 where PD fails). A conditioning problem would hurt
  all solvers equally. So scaling/preconditioning is the wrong lever — confirmed twice now.
- **Often solver FAILURE, not a true limit.** For CP6 and CP8 one solver reaches the cursor
  while holding the bound, so the other's stall is not the bound resisting — it is the solver
  giving up. Per Law 2 ("reshape, don't block") that is a defect, not the feature.
- **Gauss-Newton specifically RETREATS** (CP6: 5 at 20 iters → 0 at 400). primal-dual/barrier/
  BFGS do not. The default editor closed path is ipopt+Gauss-Newton — the worst of the set here.
- **CP3/9/10/11 stall under every solver.** These may be at the true feasible limit (moving
  them left really does need a new extremum) — but only the reference oracle (Rust / online
  sketcher) on these exact points can confirm "limit" vs "all solvers fail together."

**RESOLVED (editor) — BFGS on the fast arrowhead path.** The cheap, shipped fix: switch the
CLOSED drag from Gauss-Newton to **BFGS** (the Lagrangian-Hessian approximation) on the SAME
fast arrowhead solve. BFGS captures the constraint curvature GN ignores, so it reshapes instead
of stalling — CP6 0→75, CP9 1→75, CP8 stays 80, bound held, ~24ms/tick (vs GN 18ms; vs the dense
generic best-of 86ms). One line in sceneStore (`enableBFGS: !!curve.closed`); pinned by the
diagnostic matrix's poly-CLOSED case, now `editable: true` (non-blocking asserted). OPEN keeps GN
(it never blocked there and GN is the feel that path already had).

**Still available, not shipped — best-feasible-of-solvers** lives in the generic `slide()`
(`solver: 'best'` runs ipopt + primal-dual, keeps the furthest bound-holding result; CP6 0→75,
CP8 1→44). It's the general capability for when BFGS isn't enough, but the generic path is dense
(86ms) so the editor uses the fast BFGS arrowhead instead until banded-generic lands. The
remaining all-solver stalls (CP3/9 partial) still need the oracle to classify "true limit".

**Pinning evidence.** Matrix above, reproduced via slideCurve `method`/`enableBFGS`. BFGS result
pinned in the diagnostic matrix (poly-closed, editable).

---

## F5 — A closed PH curve's stored generator is CLAMPED, not periodic

**The fact.** The editor stores a closed polynomial-PH curve's generator (u, v) in the
**clamped** chart: `uvKnots = [0×(d+1), interior…, 1×(d+1)]`, with the seam continuity
encoded by making the wrap control points follow the first ones (the anti-periodic
"expand" map, `phSeamMaps`). It is NOT a periodic generator with periodic knots.

**Why it matters.** `curvatureExtremaNumeratorPH(u, v, knots, degree, closed=true)` takes the
`closed` flag to mean *decompose periodically* (`decomposeToBernsteinPeriodic`). That is
correct only for a PERIODIC generator (periodic knots, #knots = #cps). Fed the editor's
CLAMPED generator it is malformed → g, the bound, and the constraint Jacobian come out
wrong. A core closed-PH **drag** built on it gets garbage and **blocks completely** (the
generator won't move even though moving it keeps S⁻ — verified: +2/+5/+10 on a free coord
all hold S⁻=8, yet the drag moved 0). The earlier closed-PH *numerator* test passed only
because it fed *periodic* knots, masking this.

**What to do (for the slice-2b core PH drag).** Operate on the generator in the
representation g actually needs — either (a) convert clamped→periodic
(`periodicGenKnots` + the matching control points) and decompose periodically, or (b)
decompose the CLAMPED generator open and count the bound CYCLICALLY (seam: last g coeff ↔
first). The closure side (`phClosure`) already uses the open/clamped decomposition + the
Gram matrix and is correct (parity-tested) — so the bound side must be made consistent with
that same clamped representation before the drag will move.

**Status.** Slices 1 (closure ∮w²) and 2a (seam maps + closure projection) are in core and
parity-tested. Slice 2b (the drag) is blocked on this representation fix — recorded here so
it is resolved once, not re-discovered.

**RESOLUTION (from ../static-portfolio-rust, ph.rs / optimizer.rs::slide_ph_closed).** Rust
does closed PH on a **PERIODIC preimage** — `Knots::Periodic`, `Bernstein::from_periodic_spline`.
The periodic basis makes seam continuity AUTOMATIC, so there is **no clamped chart, no
expand/fold seam-parameterization, and no closure projection**. The only closure condition is
`∮w² = 0` (two reals), computed as a direct sum over periodic spans
(`width/(deg+1)·Σ Bézier coeffs of w²`) and enforced as an equality in the optimizer
alongside the curvature-bound sign constraints (`curvature_numerator_closed`). So:
- the CLEAN core closed-PH drag uses the PERIODIC preimage (our
  `curvatureExtremaNumeratorPH(closed=true)` is already correct for it — slice 2b fed it the
  clamped generator, the bug);
- slices 1/2a (the clamped chart, Gram closure, projection) are the SKETCHER-side tooling for
  the editor's clamped storage — keep them for the editor boundary, but build the core drag on
  the periodic preimage and a direct-sum `∮w²` (port `ph_closure`), with closure as an equality
  constraint. The editor converts clamped↔periodic at the boundary.

---

## F6 — PH bound on the GENERATOR spans ≠ PH bound on the CURVE spans

**The fact.** For the SAME closed PH curve, the curvature-extrema bound S⁻ counted from g on
the GENERATOR's spans (periodic preimage, `curvatureExtremaNumeratorPH`) differs from S⁻
counted from g on the CURVE's spans (the periodic poly numerator on the built b-spline). On a
16→18-CP test curve: generator-span S⁻ = 12, curve-span S⁻ = 8. Both are valid upper bounds on
the same Z(g); they differ because S⁻ is a per-span Bernstein count and the two representations
have different span structures (F2 looseness). The curve-span count is the tighter one here.

**What it means for the editor wiring (slice 3).** The editor DISPLAYS and judges the
curve-span bound (it shows `kind:'bspline'` periodic poly S⁻ = 8). The core closed-PH drag
(`slideClosedPH`) holds the GENERATOR-span bound (12). Wiring the editor to it would hold the
LOOSER bound while showing the TIGHTER one — the displayed S⁻ could rise while the held one
doesn't. So slice 3 is NOT a clean swap; the editor's existing clamped guard (which bisects the
generator on the CURVE-span bound) already holds the correct displayed bound.

**Reconciliation, options considered.** (a) display the generator-span PH bound (looser, worse
UX); (b) keep `slideClosedPH` for the SOLVE (movement + closure + the gen-span bound) but apply
the editor's CURVE-span guard as the final check (combine better solver + right bound); (c) make
the core drag's bound constraint use the curve-span g (needs curve construction in the loop — the
integrate/recompose we deliberately left in the sketcher).

**Status — RESOLVED via option (b) (slice 3 done).** The editor's closed-PH drag now SOLVES the
generator with the core `slideClosedPH` (periodic preimage, Rust's design) and keeps its own
CURVE-span guard (`polyBound` bisection + hard backstop) as the authoritative, DISPLAYED bound.
The core solve reshapes the generator more freely (better tracking); the curve-span guard owns
the honest bound, so the displayed S⁻ is never exceeded. The clamped↔periodic conversion is
EXACT (round-trip maxDiff = 0 — free coords `slice(0,K)` + `periodicGenKnots` ↔ `phSeamMaps.expand`).
Pinned by `closedPHEditing.test.ts`: the chained drag never raises S⁻, stays closed, AND the
dragged point tracks the cursor (>30 units, no stall).

**Open PH — also on core (option b).** The OPEN PH drag now solves the generator with the core
`slideOpenPH` (clamped preimage — the closed case minus closure: no Gram, no seam, no periodic
projection; interior-point solver, no equality border) and keeps the editor's CURVE-span guard
(`curvatureExtremaNumeratorPlanar(...).signChanges()` — the SAME quantity the bottom panel
displays). The open generator is already the clamped chart the editor stores, so there is no
round-trip and no expand/fold — just re-fit (`fitPHSplineToBSpline`) → core solve → curve-span
bisection + hard backstop. Pinned by `openPHEditing.test.ts` (S⁻ never rises, stays open, tracks
>25 units). The legacy `optimizePHCurve` now runs ONLY for the curvature-VALUE bound (|κ| ≤ b,
the 2D PH workbench — the core open drag does not model it) and the no-curvature-control track
(keeps the curve PH while dragging). Both PH editor drags (open + closed) are off the legacy
optimizer's curvature-EXTREMA path.

---

*Add F7, … as we establish them. Never delete a fact that is still true; if a fact turns out
wrong, replace it and say why (a wrong fact in here is worse than none).*

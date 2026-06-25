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

**Direction (not yet done).** No single solver wins, but for any point where one solver tracks
further *while holding the bound*, that result is strictly better (Law 2). A **best-feasible-of-
solvers** closed drag — run more than one, keep the furthest-tracking bound-holding result —
never regresses and would rescue CP6 (PD) and CP8 (GN) at once. Cost: extra solves per tick (the
curves are small). The remaining all-solver stalls (CP3/9/…) need the oracle to classify before
we know if there is anything left to fix. Pinning test: `rustParityDrags` closed-conditioning
block (currently asserts no-retreat; tighten to "tracks ≥ what the best solver achieves").

**Pinning evidence.** Matrix above, reproduced via slideCurve `method` + `maxIterations`.

---

*Add F5, … as we establish them. Never delete a fact that is still true; if a fact turns out
wrong, replace it and say why (a wrong fact in here is worse than none).*

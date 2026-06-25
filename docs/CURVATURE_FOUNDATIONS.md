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
- **Solver ill-conditioning / "blocking" on closed curves.** The 1e12-range constraint system
  gives the interior-point solver garbage Newton steps. Proven not-slow-convergence and
  not-a-geometric-wall by the **retreat signature**: a dragged control point *reaches* its
  target at 20 iterations and then drifts **back to the start** by 200 — a well-conditioned
  solver converges monotonically toward the target, never away. (Status: open — see below.)

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

*Add F4, F5, … as we establish them. Never delete a fact that is still true; if a fact turns
out wrong, replace it and say why (a wrong fact in here is worse than none).*

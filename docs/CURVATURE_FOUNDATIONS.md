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

**Current status (updated 2026-07-04, E21).** The CLASSIFICATION half is RESOLVED by
measurement, and the answer corrected this section's own hypothesis. The BigInt exact
oracle (every coefficient of the E13a state) measured the true evaluation error as
**uniform-absolute ≈ (0.03…9)·ε·max|g|** — NOT span-shaped: span-locality under-predicts
the specimen's error by 1.8e4×, and the abs-arithmetic magnitude envelope
(core/structuralScale.ts — sound, and it does price the knot amplification, 2.7e14 on
clustered knots) over-predicts by 5e6× (roundoff does not compound through cancellation:
smoothness at each derivative level + Sterbenz). So the honest machine-zero separator is
the ABSOLUTE floor ~45× the worst measured error: `SIGN_NOISE_REL = 1e-14` (was 1e-12 —
~450× above true noise, which manufactured the E12-3 misclassification corridor;
`MARGIN_REL` scaled down with it, 1e-9 → 1e-13). Landing the honest constants HEALED two
long-standing specimens at the root: the E13a violating tick and the F11 dead tick no
longer occur on their fixtures (both rode the phantom corridor). The CONDITIONING half
closed the same day (E22): with honest margins ≈ 0 the log barrier is SCALE-INVARIANT
per row (∇log(f/s) = ∇f/f), and measurement confirms it — the production trust-region
engine tracks IDENTICALLY under robust/raw/envelope row scaling on every cell, uniform
and clustered. Row conditioning was never the production engine's problem. The envelope
DOES matter for slack-based machinery: ipopt on clustered knots goes 2.2% → 59.5%
tracked under envelope row scaling (its FTB/filter/complementarity read raw f values) —
a documented lever (`rowScale: 'envelope'`), not a production change.

**Pinning evidence.** Dynamic range measured 1e12 (min 7.3e7, max 7.3e19) on the clustered
14-CP closed curve; retreat measured (CP0 dist-to-target: 0.0 at 20 it → 40.0 at 200 it).
*(TODO: promote these to a committed `lawClosedConditioning` test once the cure lands.)*

**ADDENDUM (E25 — the floor stopped being a sign classifier at all).** E21 above landed
`SIGN_NOISE_REL = 1e-14` as the honest machine-zero *separator*. E25 went one step further and
retired the separator role entirely: `S⁻` is now counted **raw** — every nonzero coefficient
keeps its own sign, and only an **exact** floating-point `0` borrows its neighbour's (so it joins
a run without adding a count). No magnitude floor touches a sign anywhere. `SIGN_NOISE_REL`
survives only as feasibility **slack** (a practically-zero *active* coefficient starts a hair off
its wall) and in the trust-region-inert row scale. This was safe precisely because of the E21
measurement (true noise ≈1e-14, the count reads it correctly) and it *fixed a residual false
bound* the separator still allowed: the clustered-knot E25 specimen displayed 14 vs the exact
**25** (`labE25.test.ts`), every sign correct. Zero suite fallout. The durable F1 fact — g's
~1e12 knot-driven dynamic range — is unchanged; what changed is that we no longer answer it with
*any* count-shaping threshold, only with raw counting + honest looseness.

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

**ADDENDUM (context — what actually ships for closed drags).** The shipped closed-polynomial
editor drag is still **ipopt on the fast arrowhead path with BFGS** (`slideCurve`, `method:'ipopt'`,
`enableBFGS: curve.closed`), exactly as this section concluded — it was *not* replaced. Do not
misread the newer trust-region work as covering this: the trust-region log-barrier engine
(`trustRegionOptimizer.ts`) is the production solver for **PH** drags only (E19/E20); the algebraic
families (including closed polynomial) remain on ipopt. So this table is still the live description
of the closed-polynomial solver landscape. The durable fact is unchanged and central:
**closed-drag blocking is solver step-strategy, not conditioning** — a Gauss-Newton step stalls
where a curvature-aware step (BFGS here, Conn–Gould–Toint for PH) reshapes. F11/F12 carry the stall
analysis forward on their own fixtures.

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

**Tried option (b), REVERTED — it is structurally unsound for the editor.** We wired both PH
editor drags (closed `slideClosedPH`, open `slideOpenPH`) to SOLVE in generator space and kept
the editor's CURVE-span guard. It passed small-step tests but BLOCKS on a big drag step (the
symptom: "I can't move the control point under curvature-extrema control"). Measured on a
12-CP closed PH, one ~180px jump:

  startBound(curve-span) = 8 ;  core solve's built-curve bound = 10 (> 8!) ;  generator moved 2.38

The core solve holds g's GENERATOR-span bound, but the built curve's CURVE-span bound ROSE to 10.
Because the editor's guard enforces the curve-span bound, it then bisects the motion back toward
the start → the point stalls. **The solve and the guard enforce DIFFERENT bounds that disagree
(this very fact, F6), so they fight.** More iterations don't help (24/80/200 identical) — it's
not a convergence issue, it's the wrong constraint. Small chained steps only worked because there
the two bounds happen to move together. The legacy `optimizePHCurve` on the same jump kept the
curve-span bound at 8 (it does not have this mismatch), which is why it "worked very well".

So the editor's PH curvature-extrema drags are back on legacy `optimizePHCurve` (closed + open).
`slideClosedPH` / `slideOpenPH` remain in core as tested references (phDrag.test.ts) but are NOT
wired to the editor. Lesson: **for the editor, the solve MUST hold the SAME bound the editor
displays/guards** — option (b) cannot, because gen-span ≠ curve-span.

**The real fix is option (c).** Make the core PH drag's bound constraint use the CURVE-span g
(construct the curve inside the solve loop and constrain its per-span numerator), so the solver
holds exactly the displayed bound. Then there is no guard/solve disagreement and big steps reshape
instead of stalling. Pin it with a BIG-single-step tracking test (not just chained small steps —
that is what hid the bug).

**RESOLVED for OPEN — the gap is CLOSED-ONLY.** Measured the two numerators directly:

  OPEN  (6-segment): gen-span g vs curve-span g → IDENTICAL coeffs, maxRel = 6.8e-14
  CLOSED (12-CP):    gen-span S⁻ = 6  vs  curve-span S⁻ = 8  → genuinely different

For an OPEN PH curve, g's generator-span numerator (`curvatureExtremaNumeratorPH`) and the
curve-span numerator (planar g on the built degree-5 curve, what the editor displays) are the
SAME polynomial — same spans, same 90 coeffs, machine-precision equal. (Makes sense: c′ = w² is
the hodograph exactly, and the planar formula on c′ = the complex `Im(ā²(a·a″−3/2a′²))` form.)
So for OPEN there is **no F6 gap**: holding the gen-span bound IS holding the displayed bound.
`slideOpenPH` holds the right bound. The identity is pinned in `phDrag.test.ts`.

**BUT the bound is necessary, not sufficient — FEEL also matters, and the refit→L2 objective
breaks it.** Wiring the editor's OPEN drag to `slideOpenPH` (re-fit the dragged polygon →
`slideOpenPH` drives the GENERATOR toward that re-fit in ½‖gen − target_gen‖²) made the curve
"come alive": the dragged control point did NOT follow the cursor (in-app report). The objective
targets a GENERATOR (an indirect, global least-squares proxy), not the dragged CURVE point, so the
whole curve swims and ignores the hand. (A PH curve IS global — moving one CP reshapes the whole
curve; that part is normal. The bug was specifically that the DRAGGED point didn't track.) The
legacy `optimizePHCurve` optimizes the dragged CURVE point straight toward the cursor — it tracks.

So OPEN PH is **back on legacy** too. `slideOpenPH` stays in core as a bound-correct reference but
is NOT wired. Pinned by `openPHEditing.test.ts` — the FEEL contract: the DRAGGED CP follows the
cursor (err < 0.5·move), bound held, stays open. (My first open test was too weak — it checked
"some CP near the target moved," which passed despite broken feel. Lesson: a PH feel test MUST
assert the DRAGGED point tracks the cursor, not that the curve changed.)

**What a real core PH drag needs (both open AND closed):** variables = generator, objective =
‖curveCP[dragIndex] − cursor‖² (+ a light anchor to the start generator), subject to the curvature
bound. The DIRECT cursor-tracking objective is the missing piece — not the bound (open already has
it; closed additionally needs option (c) for the bound). The refit→generator-L2 shortcut is the
wrong objective and is abandoned.

The gap is **closed-only** for the BOUND: the periodic generator's g ≠ the periodic curve's g
(different periodic decompositions; the `buildPeriodicPHCurve` LSQ rebuild also moves it). CLOSED
needs option (c) for the bound AND the direct objective for feel; OPEN needs only the direct
objective. Both stay on legacy until a core PH drag has the direct cursor-tracking objective.

**ADDENDUM (E16/E17/E19/E23 — both PH drags are now on core; the "stay on legacy" conclusion is
retired).** Every prescription this section arrived at was built and shipped: the core PH drags
(`slideOpenPHCurveBound`, `slideClosedPHCurveBound`, `phCurveBoundDrag.ts`) use the **direct
cursor-tracking objective** on the built curve point (the refit→generator-L2 shortcut that made
the curve "swim" is gone), constrain the **reduced numerator `R`** (F7 — same sign changes as g,
1e18× better conditioned), and hold the CURVE-span bound the editor displays (option (c),
realized via R rather than reconstructing the full-degree curve g in the loop). The **closed** gap
was closed differently than "option (c) on the periodic curve g": E16 **decoupled closure** —
solve an open-style R-constrained drag in free seam coordinates, then re-project onto the closure
manifold (`projectClosurePH`) — which sidesteps the periodic-generator-g ≠ periodic-curve-g
mismatch entirely. Display reads the solved object (E16-P2: S=, markers, constraint bar all from
R). The durable F6 fact is intact and still the reason the naïve wiring failed: **gen-span g ≠
curve-span g for CLOSED PH, so the solve and the guard must enforce the same one** — we achieved
that by constraining R (curve-span-faithful) throughout, not by holding gen-span and guarding
curve-span. Pinned by `closedPHAllCPSweep.test.ts`, `openPHCurveBound.test.ts`,
`closedPHDisplayMetric.test.ts`.

---

## F7 — The PH curvature-extrema numerator reduces by σ²: g = 2·R·σ²

For a polynomial PH curve the hodograph is `c′ = w²`, so the parametric speed `σ = ‖c′‖ =
u²+v²` is a **polynomial** (no square root). Write `P = uv′−vu′` (the reduced curvature
numerator, `κ = 2P/σ²`). Then the dκ/ds numerator factors:

    g  =  2 · R · σ² ,    with    R = P′σ − 2Pσ'

i.e. the general planar numerator `g = ‖c′‖²(c′×c‴) − 3(c′·c″)(c′×c″)` (degree **8m−2** = 14
for a quintic, m = uvDegree) carries a **redundant σ²** for a PH curve. Cancel it and the
extrema numerator is `R` (degree **4m−2** = 6). Since σ² > 0, **R has exactly the same sign
changes — the same curvature extrema — as g.**

**Evidence (pinning test `core/__tests__/phReducedNumerator.test.ts`):** across four open
quintic-PH generators, `g(t)/(R(t)·σ(t)²) = 2.000…` with relative spread 1e-13…1e-16 (machine
precision). Degrees: R = 6, g = 14.

**Why it matters.** g's coefficient **dynamic range is catastrophic** — measured 5.6e5 up to
**1.3e21** across those curves (the σ² blow-up, an extreme case of F1's span-driven range). R's
stays ~1e1–1e3. So R is the same extrema at **half the degree and up to ~1e18× better
conditioned.** Two consequences: (1) the F1 ill-conditioning is a prime driver of the
closed-PH solver stall (#23, the [[ipopt-rho-load-bearing]] tuning wall) — an R-based
constraint is a candidate fix *from the conditioning side*; (2) at 1e21 range g's own
extrema/marker count is numerically unreliable (a Law-3 honesty risk), while R is trustworthy.

Open PH only as stated (gen-span g ≡ curve-span g, F6); the **closed** reduction needs the
periodic form of P, σ, R (the seam wrap) — not yet built/verified.

**ADDENDUM (E16/E19/E23 — the closed reduction was built, and #23 is resolved).** Both open and
closed PH curvature drags now constrain the **reduced numerator `R`** on the core trust-region
engine (`slideOpen/ClosedPHCurveBound`, `curvatureExtremaReducedNumeratorPH` in `phCurvature.ts`
handles the closed/periodic form). The closed-PH stall (#23, the `[[ipopt-rho-load-bearing]]`
wall) was **not** ultimately cured from the conditioning side alone: E16 resolved it by
**decoupling closure** — track an open-style drag in free seam coordinates, then re-project onto
the closure manifold (`projectClosurePH`) — rather than by handing a tougher solver the fully
periodic constraint. R conditioning made the drag *possible*; the closure decoupling made it
*track*. So conjecture (1) above ("R fixes the stall from the conditioning side") was **half
right**: R was necessary, closure decoupling was the rest. The durable facts (`g = 2·R·σ²`, R's
1e18× better conditioning, R trustworthy where g's marker count is not) are unchanged.

---

## F8 — A curvature extremum is a SIGN CHANGE of g, jumps included; corners count, polygons don't

**The fact.** The curvature extrema are the **sign changes of g**, and a sign change can be a
smooth interior zero-crossing **or a jump across a knot** — both count. Concretely:
- A **C⁰ corner** (a knot of multiplicity = degree) is a point where g flips sign by *jumping*
  (no zero). It **is** a genuine curvature extremum (a curvature maximum) and **is marked.**
- A **polygon / straight segment** has `g ≡ 0` (for degree 1, g's degree 4d−6 < 0) → **0**
  extrema. A triangle reads **0**, not 6 — not because "corners are excluded" but because g is
  identically zero there.

**Why.** By F2, g is discontinuous at every knot (it carries c‴). For a C² cubic κ is
continuous but dκ/ds is **not** — so a real extremum can occur exactly where dκ/ds reverses by
*jumping* across a knot, with no smooth zero. A C⁰ corner is the maximal case of that same jump.
So corner-jumps and ordinary smooth-spline knot-extrema are the **same phenomenon** — there is
no honest rule that keeps one and drops the other. This restates Law 1's wording ("sign changes
of g … the points where dκ/ds reverses — *not merely the zeros of g*").

**What it forbids (a bug taught us this — CLAUDE.md).** A tempting "cleanup" is to keep a marker
only where g is *actually ≈ 0*, to stop markers landing on a C⁰ seam. **This is wrong** and was
measured wrong: it deleted real markers from a *smooth* curve (oval 8 → 4), because that curve's
extrema sit on knot-jumps too. Suppressing corner markers as a pure display choice would also
break Law 3 (displaying fewer than the honest sign-change count). `denseExtremaParams`
(core/curvature.ts) therefore counts every sign change between dense samples (jumps included) —
do not add a "real-zero only" filter.

**Pinning.** The marker counts in the `curvatureExtremaMarkers` tests encode this; the
oval/junction 8→4 drop is the canary that a filter has been wrongly added. (Conceptually
checked: triangle `g ≡ 0` → 0; degree-3 C⁰ seam → a marker at the corner.)

---

## F9 — The legacy rational drag never held the DISPLAYED bound; its tracking was fake freedom

**The fact.** The legacy rational optimizer (`optimizeRationalCurveInternal` →
`RationalBSplineCurveProblem`) enforces its own internal constraint regime, not the bound the
editor displays (complex numerator with w_im = 0 + robust signs). Measured head-to-head on a
15-step open-rational drag (2026-07-03, fable branch): legacy tracked the cursor to ~97 %
(err 5.8/207) while the **displayed** bound climbed 2→3→5→7→…→10; core `slide('rational', …)`
held the displayed bound at 2 through every step and tracked ~53 % (err ~110/207). Legacy's
superior "feel" on rational drags is therefore a Law 2/Law 3 violation, not better solving —
display ≠ enforced (the same F6-style gap that motivated the migration).

**Also established while migrating (the dormant-flag sweep):** legacy implements anchors ONLY
in `PeriodicBSplineCurveProblem` (closed bspline) and symmetry/inflections ONLY in the
polynomial bspline problems. For rational and complex-rational curves, `anchorWeight`,
`symmetryMaps`, and `preserveInflections` were silently ignored — every `!flag` guard in
`moveControlPoint` that "deferred" those drags to legacy deferred them to a no-op. Rational
inflection enforcement was an honest gap in both engines until core implemented it (same
day): f = det[H, H′, H″] over H = (w·x, w·y, w), degree 3d−3, with r′×r″ = f/W³ — so for
positive weights the inflections are the sign changes of f, S⁻ of f's polygon bounds them,
and the drag holds that bound with the same sliding mechanism as g. f is LINEAR in each
affine coordinate (one determinant row), so central-FD Jacobian rows are exact to roundoff.
With w ≡ 1, f is the degree-ELEVATED representation of the polynomial numerator (same
function, more coefficients — a valid, possibly looser polygon per Law 1). Complex weights
THROW (Möbius geometry; explicit gap, not a silent wrong answer). Pinned:
`rationalInflection.test.ts`.

**What it forbids.** Rerouting any rational/complex drag back to legacy "because it tracks
better." It tracks better because it cheats. Better tracking must come from solver quality
(the standing investigation) and the tight open bound (#28).

**Pinning.** `legacyVsCoreOpenRationalBound.test.ts` (dies with the legacy optimizer — that
deletion is its success condition); routing pinned in `openRationalFlagsRouting.test.ts`,
`symmetryRouting.test.ts`, `openComplexFlagsRouting.test.ts`; anchor semantics in
`curvatureDragAnchor.test.ts`.

---

## F10 — Knot insertion is Law-2-safe and can buy large tracking freedom — but it is NOT monotone

**The safety fact.** Inserting a knot leaves the curve geometrically identical, and the
refined polygon of g is a subdivision of the old one — by variation diminishing S⁻ can only
stay or drop. So refinement mid-edit can never raise the bound: it is always *legal*. It
adds control points (freedom to reshape) and can only tighten the displayed Bernstein
bound. This much is theorem.

**The measured surprise (2026-07-03, the F9 stall drag: open rational n=7, d=3, core
tracks 47% at bound 2).** Insertion's effect on TRACKING is strongly placement-dependent
and non-monotone in the number of knots:

    +1 knot @0.375 → 83% tracked      +1 @0.125 → 80%      (bound 2 throughout)
    +1 knot @0.625 → 17% tracked (3× WORSE than no insertion)
    +1 @0.875 → 49%   +3 uniform → 55%   +4 uniform → 52%   +12 uniform → 36%

Raising maxIterations 20→60 does NOT rescue the uniform case (51%) — it is constraint
geometry, not solver budget. And the bad spot 0.625 is FAR from g's sign changes (markers
at 0.285, 0.969), so "don't split at a crossing" is NOT the rule; the mechanism is how the
split redistributes g's coefficient runs and anchors (open question — standing
investigation). Weights ride through insertion exactly (homogeneous Boehm, core insert.ts).

**How to apply.** A blind "refine" button (or blanket refinement) is a manipulation
footgun. The robust design is PROBE-AND-KEEP: at a stall, trial-insert candidate knots,
re-run one tick, keep the insertion only if tracking measurably improves — legality is
free (this fact), profit must be measured per-case. Pinned: `knotInsertionFreedom.test.ts`
(the 0.375 case must stay ≥70% tracked; insertion never raises the bound).

**ADDENDUM (E23 — the tracking-freedom payoff evaporated on the trust-region engine).** The
"large tracking freedom" measured above was on the *old* barrier. Re-measured on the production
trust-region engine, knot insertion **no longer buys tracking freedom**: the curvature-aware step
already reshapes into the DOF a coarser polygon left on the table, so adding control points does
not free further motion — and, being corner-cutting, refinement only **tightens the cage** (this
is also why task #28's "insert to loosen the bound" premise was backward). The *safety* half of
this fact is untouched (insertion is always Law-2-legal, never raises the bound). What is retired
is the *engineering payoff*: PROBE-AND-KEEP no longer earns its complexity on the current solver,
so it stays unshipped. (Note: F9's "tight open bound (#28)" was itself refuted by E25 — the "10 vs
6" over-count was the noise-floor sign smoothing, not honest looseness; see idea VIII / IV.)

---

## F11 — Drag stalls are numerical, PROVEN: the bound never closes off motion

**The theorem half (Eric's rigid-motion argument, made exact).** g is built from
derivatives, cross and dot products of c′, c″, c‴ — all exactly invariant under rigid
motion of the control points. So the constraint Jacobian annihilates the translation
directions identically (verified numerically: max relative drift of g's coefficients under
translation = 3×10⁻¹⁴). The bound therefore NEVER closes off the translation direction; a
solve that returns zero motion while the dragged residual is nonzero has abandoned an
exactly-feasible first-order descent direction — provably not a KKT point, i.e. a
numerical failure, never "the constraint stopped it."

**The measurement (2026-07-03, the F9 stall drag).** KKT-along-translation probe, per
tick: dObj/dTranslation ≈ 0 through tick 8 (honest stationary trade-offs — partial
tracking there is the objective's own optimum, not a failure), then from tick 9 on
D = −‖pull‖ exactly — the solver returns its input untouched. Tick-9 forensics, guard
removed: the primal-dual solver "converges" (13 iters, converged=true) with stepNorm 18
that tracks half the pull — but its terminal point violates the DISPLAYED bound (2→4).
The Law-2 guard then bisects the straight path and collapses to α≈0: even an
infinitesimal step in that direction flips the robust sign count — a near-zero g
coefficient sits on a knife edge, so the count is discontinuous at the start point.

**The failure chain, named.** (1) solver satisfies its scaled-margin surrogate on the
wrong side of the true robust count; (2) guard, given an all-or-nothing straight path
through a knife edge, keeps nothing; (3) drag freezes. Both halves are numerics at a
near-zero coefficient (F1's dynamic range; the structural-margin regime is evidently not
sufficient here) — matching Eric's trust-region intuition: when the step/radius collapses
toward zero, the gradient/Jacobian information has been overwhelmed by error near zero.

**This also resolves F10's placement mystery.** Insertion never relaxes a real constraint
(none was binding — this fact); it REDISTRIBUTES which coefficients sit near zero. A good
knot (0.375 → 83%) moves the knife edge out of the solve's path; a bad one (0.625 → 17%)
manufactures a worse edge. Refinement is a conditioning lever, not a constraint lever.

**Three-solver head-to-head on the same drag (guard applied identically).** Each solver
fails DIFFERENTLY — the failure mode, not the tracking number, is the signature:

    primal-dual  47% tracked   8/15 raw bound violations   7/15 guard collapses   47ms
    barrier      18% tracked   0 violations                0 collapses            55ms
    ipopt        46% tracked   0 violations                0 collapses            44ms

primal-dual: feasibility failure (steps leave the true feasible set; the guard kills whole
ticks → jerky feel: jumps + freezes). barrier: honest but under-converged crawl. ipopt:
feasible steady progress, never needs the guard — but NOT stationary either
(dObj/dTranslation down to −119 with the translation direction exactly free), so ~46% is
far below the reachable optimum for ALL three. The old "ipopt stalls ~85% (F4)" claim is
curve-specific — re-measure per case before trusting route comments.

**Trust-region telemetry confirms Eric's stall signal exactly (ipopt, per tick).** Ticks
1–2: δ = 3.5e2, converged in 13 iters, 100% of each pull (13.8 units). Tick 3 — stall
onset — δ collapses 4 orders to ~2e-2, termination becomes max_iterations, movement drops
to ~0.3/tick. Where δ partially recovers (ticks 12–14, up to 5.6) movement instantly
returns (28.6, 18.4, 13.1). Collapsed δ = rejected dogleg steps = the model
(gradient/Jacobian near a near-zero coefficient) disagreeing with actual constraint
values. **δ is the stall alarm for trust-region solves; guard-α collapse is the alarm for
the primal-dual path.**

**How to apply.** (a) Instrument, don't guess: slide()/slideCurve should expose per-tick
diagnostics — raw-step bound, guard α, step norm, trust-region δ + termination reason
(ipopt), translation-descent D (universal stationarity check), and WHICH coefficient
flips at small α. (b) The fix target is the solve/regime at near-zero coefficients
(margins, scaling, active-set policy), not the guard — the guard is doing its job on a
bad step. (c) Probe-and-keep insertion (F10) remains a legitimate palliative because
legality is free; but it treats conditioning, and the standing investigation should treat
the disease.

---

## F12 — Eric's closed-curve optimizer beats current core 91% vs 47% on the stall drag: a DESIGN regression, and the drivers are identifiable

**The measurement (2026-07-03).** Eric's own optimizer — imported unmodified from
`../../numericelements/git/closed-curve` (his reference codebase; the one his understanding
is based on) — run on the F9 stall drag, displayed bound measured with OUR robust count:

    ERIC design @800 steps/tick   91% tracked   bound 2 held   967 ms/tick
    ERIC design @50  steps/tick   91% tracked   bound 2 held    66 ms/tick
    core primal-dual @20 iters    47% (8/15 infeasible raw steps, 7/15 dead ticks)
    core ipopt @20 iters          46%           core ipopt @800 iters   18%

Budget is ruled out twice: his design loses nothing at 50 steps, and core ipopt gets WORSE
with 40× more budget (46%→18% — the "retreat with more iterations" signature CLAUDE.md's
standing investigation predicted). The gap is structural.

**Design deltas between his formulation and core's generic drag (ranked suspects):**
1. **Free weights.** His rational problem has 3n variables — the homogeneous weights move.
   Measured drift in the 91% run: 5–25× per CP (part projective gauge, but the per-CP
   variation is real reshaping). Core's fixed-weight formulation amputated this DOF block.
2. **Per-step feasibility** (F11): his trust region shrinks ×0.25 until every constraint
   value at the candidate step is strictly negative — no infeasible excursions, no outer
   guard, no dead ticks, ever.
3. **Inactive-set rule**: his `computeInactiveConstraints` frees the coefficients CLOSEST
   TO ZERO in each changing-sign sequence; core frees ALL run interiors keeping one
   largest-|g| anchor. Different active sets → different sliding freedom → possibly a
   different theorem (check which rule Theorem 2 was actually proven for!).
4. **ScaledBernsteinDecomposition products** (binomial-premultiplied → plain convolution:
   fewer ops, less roundoff) + an unused compensated-FP toolkit (Kahan/Dekker/Fast2Sum).

**How to apply.** `ericClosedCurveOracle.test.ts` pins his design's capability in-repo
(≥80% tracked, bound held; needs the sibling closed-curve checkout). Port-and-measure in
this order: free weights in core's CurvatureDragProblem (FD Jacobian first — the 'fd'
backend is universal), per-step feasibility in the solvers, then A/B the inactive-set
rules. His import cycle (models↔optimizationProblems) is broken by importing
CurveModel3d first. Caveat for the editor: free weights change edit semantics (weights
drift under CP drags — decide with Eric how to expose/normalize; a projective gauge fix,
e.g. renormalizing w so ∏w or w₀ stays 1, avoids unbounded homogeneous inflation).

---

## F13 — Solving the rational-PH Wronskian: integrate the squared hodograph, then elevate D

**The setup.** The exactly-PH rational family (`core/rationalPHLinearD.ts`) is `z = F/D` with the
PH condition `F′D − FD′ = S²`. With `deg S = n`, `deg D = m`, the identity forces
`deg F = 2n − m + 1`, and since `deg F > deg D` for `m ≤ n` (all our families: `m ∈ {0,1,2}`,
`n ≥ 2`), the **curve degree is `p = deg F = 2n − m + 1`**. `(n,m) = (2,1) → p=4` (5 CPs);
`(3,2) → p=5` (a rational quintic, 6 CPs).

**The polynomial PH curve is the `m = 0` corner.** Setting `D` constant (`m = 0`) gives
`deg F = 2n + 1`, **zero residue conditions** (no roots → step A is empty → all of `S` free), and a
constant `D` that degree-elevates to an **all-equal weight vector** — i.e. the curve is *polynomial*,
not rational. `(n,m) = (2,0) → p = 5` is exactly the familiar **degree-5 polynomial PH quintic**
(measured: 6 CPs, all weights `1.000000`, `w_im = 0`, `wronskianResidual = 2e-15`). So **degree 5
occurs twice** in the family — as the *polynomial* quintic `(2,0)` and as a *genuinely rational*
quintic `(3,2)` (weights vary) — different curves at the same degree. The polynomial corner is why
`m = 0` can inflect at `degS = 2` where `m = 1` cannot: with no residue condition, `s₁` stays free
(F13-A below spends it as soon as `m ≥ 1`).

**Solving the Wronskian is an integration, not a linear solve.** Divide the PH condition by `D²`:

    F′D − FD′ = S²   ⟺   (F/D)′ = (S/D)²   ⟺   F/D = ∫ (S/D)² dt.

So "solve for F" = "integrate the squared hodograph," and it splits in three:

**(A) Solvability — residues vanish (`deriveFullSPower`).** `∫ S²/D²` is rational (no `log`) iff
its partial fractions carry no `1/(t−r)` term, i.e. the residue at each simple root `r_k` of `D`
is zero. Working it out (`φ_k = D/(t−r_k)`):

    S′(r_k) = S(r_k) · Σ_{l≠k} 1/(r_k − r_l)          — one condition per root ⇒ m conditions.

These are **linear in S's coefficients**, so we *derive* `m` of them: `m=0` → no roots → nothing
derived, all of `S` free (the polynomial corner); `m=1` → the sum is empty → `S′(r) = 0` (derive
`s₁`); `m=2` → a 2×2 complex solve. This is why raising `deg D` "spends" generator coefficients —
and why degS=2/real-D can't inflect (the one pinned coefficient collapses `Im(S̄S′)` to linear, zero
only at the pole outside `[0,1]`) while the `m=0` polynomial curve can.

**(B) Integration — the coefficient recurrence (`reconstructExactRationalPH`).** Match the
coefficient of `tᵏ` in `F′D − FD′ = S²` (writing `F=Σfᵢtⁱ`, `D=Σdⱼtʲ`, `S²=Σhₖtᵏ`; note
`i−j = (k+1)−2j` when `i+j=k+1`):

    f_{k+1} = [ hₖ − Σ_{j≥1} ((k+1) − 2j) · dⱼ · f_{k+1−j} ] / [ (k+1) · d₀ ]

with the seed `f₀ = origin · D(0)` — the **constant of integration = the curve's translation**,
the one point you place.

**Why the bookkeeping closes exactly.** `L : F ↦ F′D − FD′` is linear with a **1-dim kernel**
(`LF = 0 ⟺ F = c·D`, a translation — that's `f₀`) and an **m-dim cokernel** (the `m` residues of
step A). So of the family's degrees of freedom, one is the origin and `m` of `S`'s coefficients
are consumed; the rest — the *free* `S` coefficients and `D`'s roots — parameterize the family the
drag varies. No overdetermination, no slack.

**(C) Degree-match — elevate D to the curve degree (`elevateBern`, `rationalPHLinearD.ts:211`).**
`F` and `D` leave the recurrence at their natural degrees (`p` and `m`). A standard rational
Bézier needs both on the **same degree-`p` Bernstein basis** so weight `wᵢ` and homogeneous point
`Fᵢ` align. `F` is already degree `p`; **degree-elevate `D` from `m` up to `p`** (exact — same
polynomial, redundant higher-degree Bézier form, `b′ᵢ = (i/(N+1))bᵢ₋₁ + (1−i/(N+1))bᵢ` iterated).
Then, index by index, `wᵢ = D_i^elev` (complex weight) and control point `Pᵢ = Fᵢ / D_i^elev`.
Always `D` we elevate, never `F`: `deg F − deg D = 2(n−m)+1 > 0` for `m ≤ n`.

**Evidence / pinning.** `core/__tests__/rationalPHLinearD.test.ts` pins the reconstruction to
machine zero across degree combos, including the **`m=0` polynomial corner** (`degS=2, D=const` →
degree 5, all weights equal & real; `degS=3` → degree 7); `rationalPHLinearDDrag.test.ts` pins
`wronskianResidual < 1e-9` through full drags (incl. a quadratic-D quintic). The residual is
computed independently of the solve, on the Bernstein coeffs of `F′D − FD′ − S²`
(`rationalPHLinearD.ts:202`).

**Why it matters.** Because A→B→C run every step, the reconstructed curve is PH to machine
precision — there is **no soft `F′D − FD′ − S²` residual to drift**. That is what lets the drag be
a *pure inequality* problem (the Ñ sliding mechanism, no PH equality constraints) and keeps the
displayed curvature-extrema bound honest (Law 3): the numerator Ñ is sign-identical to the drawn
curve's `g` only because the curve is genuinely PH, which A→B→C guarantee.

---

## F14 — The SPATIAL rational-PH no-log condition is QUADRATIC in the spinor, and its shape is the gauge plane

**Why this fact exists.** F13 solved the 2D rational-PH Wronskian and found the residue conditions
**linear in S** — so `rationalPHLinearD.ts` derives them rather than solving for them. The obvious
question is whether the spatial case behaves the same way. It does not, and knowing that saves
re-attempting a linear parametrisation that cannot exist.

**Where the spinor sits.** For a rational space curve `c = p/w` (p a vector polynomial, w scalar),

    c′ = N/w²,   N = p′w − pw′   (the WRONSKIAN),   ‖c′‖ = ‖N‖/w²

so PH says `‖N‖` is a polynomial, and the classical theorem applies to N verbatim: **N = 𝒜 i 𝒜̄**.
The spinor squares to the **Wronskian**, not to the derivative — and the polynomial case is the
`w = const` corner where the two coincide. This is the spatial twin of F13's `F′D − FD′ = S²`.

**The residue condition.** For a simple root r of w, write `w = (t−r)·φ`. Then `N/w² = g/(t−r)²`
with `g = N/φ²`, so the `1/(t−r)` coefficient is `g′(r)`, and it vanishes iff

    N′(r) = 2·N(r)·Σ,        Σ = φ′(r)/φ(r) = Σ_{l≠k} 1/(r_k − r_l)

Substituting `N = S²` reproduces F13's 2D form `S′(r) = S(r)·Σ` **to 1.8e-15** — the cross-check that
the derivation is right rather than merely plausible.

**MEASURED: it is quadratic, not linear.** Scaling the spinor scales the residue by `s²` exactly:

    𝒜 ↦ 2𝒜   → 4.0000        𝒜 ↦ 3𝒜   → 9.0000        𝒜 ↦ 0.5𝒜 → 0.2500

So the 2D trick — divide out one factor of S because ℂ is a **commutative field** — does not transfer.
**Consequences:** the spatial rational fibers are NOT linear algebra; and the spinor construction in
`conformalPHStructure.test.ts` reaching **17 of 18** dimensions is EXPECTED, not a bookkeeping error.
A linear parametrisation cannot cover a quadratically cut set. Stop looking for the missing index.

**BUT THE SHAPE IS SPECIFIC, and this is what makes it tractable.** Divide the condition by `𝒜(r)`
and what remains is a condition on the LOGARITHMIC derivative. Solving `Vi + iV̄ = 2Σi` for
`V = v₀ + v` gives `v₀ = Σ`, `v₂ = v₃ = 0`, and **v₁ free**, i.e.

    𝒜′(r) = 𝒜(r)·(Σ + λi),        λ ∈ ℝ free

**Three conditions per root, not four** — matching the residue being a vector. And the 2-plane
`𝒜(r)·span{1, i}` is exactly the spinor's **SCALE and GAUGE** directions, which is why the gauge keeps
reappearing throughout this subject.

**Verified end to end.** Spinors of that form kill the residue to 1e-16 and make `p′w − pw′ = N`
solvable to 6e-15 (a 15×15 system); an off-form spinor leaves residue 1.3 and the Wronskian
unsolvable at 7.8e-1. The three conditions per root are independent (normalised Gram determinant
1.0). And `‖N‖ = |𝒜|²` to 2e-16, so the recovered member is exactly PH with speed `|𝒜|²/w²`.

**What it means for method — SUPERSEDED BY F17, kept for the record.** This fact concluded that the fiber
is cut by a determinantal condition and so wants elimination. The geometry is right; the conclusion about
method is not. Fixing one λ per root reduces it to LINEAR ALGEBRA (F17), which is strictly better than
elimination and is what the code does. The lesson worth keeping: "quadratic" was allowed to stand in for
"hard", and bilinear-in-two-groups is not hard at all.

**REFINED BY F16, THEN CORRECTED BY F17.** F16 named λ — the frame twist rate at the pole — and showed
the single-pole condition is explicitly solvable. F17 then removed the pole count entirely: the condition
is BILINEAR in (𝒜, λ), so fixing one slider per root leaves it linear in 𝒜 at ANY number of poles. Read
this fact for the derivation and the shape of the condition; read F17 for what it costs to solve.

**Pinned by** `src/core/__tests__/rationalPHSpatialResidue.test.ts` (4 tests).

---

## F15 — In 2D the DUAL chart makes rational PH free and its Hermite fiber AFFINE; inflections cost the graph, not the generality

**Why this fact exists.** F13/F14 are the primal story: recover the curve by integrating, and pay a
residue condition. The dual chart avoids the integration entirely, and the difference in what the
Hermite problem *costs* is large enough to be a standing fact rather than a rediscovery.

**The chart.** With the rational circle `n̂ = (1−u², 2u)/D`, `t̂ = (−2u, 1−u²)/D`, `D = 1+u²`, and
`dθ/du = 2/D`, a support function h gives

    c = h·n̂ + (dh/dθ)·t̂,        dc/dθ = (h + h_θθ)·t̂

Reconstruction is **differentiation**, and rationals are closed under it — so no residue condition can
arise. Measured: the speed matches the closed form `2|h + h_θθ|/D` to 1e-10 for h of degrees 0–5, with
nothing imposed.

**The dimension count is arithmetic.** A degree-d support polynomial carries d+1 parameters and all
d+1 are **effective** (full Jacobian rank at degrees 1–6, no redundancy).

**And the Hermite fiber is AFFINE.** Prescribing a tangent DIRECTION fixes the parameter u;
prescribing the POINT there gives `h(u) = c·n̂` and `dh/dθ = c·t̂`. Both are **linear** functionals on
h — verified against the nonlinear map to 4e-16. Four conditions at two ends are independent (rank 4
at every degree), so

    fiber dimension = (d + 1) − 4 = d − 3        measured: 0, 1, 2, 3, 4 at d = 3…7

Linear algebra, closed form — no solver and no rank measurement of a constraint Jacobian.

**Inflections cost the GRAPH, not the generality.** Since `dc/dθ = (h + h_θθ)t̂`, a **zero** of
`h + h_θθ` is a CUSP and an inflection needs a **pole**; measured, a graph specimen's curvature never
changes sign. The fix is to stop requiring a graph: let the direction parameter fold, `u(τ)` with a
critical point, so the dual datum is a rational **LEGENDRE curve** `(u(τ), H(τ))` rather than a
function `h(u)`. Measured: one curvature sign change — a genuine inflection — and the speed is still
the closed-form rational expression, to 2e-10.

**The structural limit, and it explains why the spatial work needs a solver.** This chart exists for
**hypersurfaces** — plane curves, surfaces in ℝ³ — because those have one tangent hyperplane per
point. A **curve in ℝ³ has a pencil** of tangent planes, so it has no support function at all. That is
why the planar rational case is closed-form and the spatial conformal case is a Newton solve: not a
defect of the implementation, an absence of the chart.

**Pinned by** `src/core/__tests__/dualChartRationalPH.test.ts` (4 tests).

---

## F16 — λ is a TWIST RATE, the pole is where the curve meets INFINITY, and that is what the rational fiber's road runs along

**Why this fact exists.** F14 established that the spatial no-log condition is quadratic and gave its
solved form `𝒜′(r) = 𝒜(r)(Σ + λi)`. What it could not say was what λ *is*, and without that the
rational fiber was a correct derivation with no geometric content — a count and the word "road". This
fact closes that gap. It was found by Eric's heuristic: *if there is a problem you cannot solve, find
the simpler one you cannot solve.*

**First, the condition is simpler than F14's solved form suggests.** With ONE pole, Σ is a sum over
the *other* roots, hence empty, so the condition is just

    N′(r) = 0        "the Wronskian has a critical point at the pole"

and it is obviously necessary: with `w = t − r`, `N = p′(t−r) − p`, so `N′ = p″·(t−r)`, which vanishes
at r for **any** polynomial p. The condition says nothing more than *"N must be the Wronskian of some
polynomial."* Say it that way; the solved form is the answer, not the question.

**THE SIMPLER PROBLEM: the planar one-pole quartic is completely solvable.** F13's
(deg S, deg D) = (2,1). One pole gives `S′(r) = 0`, so about r

    S(t) = s₀ + s₂(t−r)²        — no linear term. That is the entire condition.

F follows by back-substitution on `(e−1)f_e − r(e+1)f_{e+1} = (S²)_e`, and the `e = 1` row *is* the
consistency condition. Measured: consistency at machine zero, exactly PH, for three seeds.

**AND THE COMPARISON ISOLATES THE SPATIAL DIFFICULTY TO ONE PARAMETER.** How many directions can the
spinor's derivative at the pole move in while the condition holds?

    3D:  𝒜′(r) ∈ ℍ,  4 real − 3 conditions  =  1 free   (λ)
    2D:  S′(r) ∈ ℂ,   2 real − 2 conditions  =  0 free   (no λ)

The reason is that the Hopf map is a **sandwich**: with `𝒜′ = λ𝒜i`,

    N′ = 𝒜′i𝒜̄ + 𝒜i𝒜̄′ = λ(𝒜i)i𝒜̄ + 𝒜i(−λi𝒜̄) = −λ𝒜𝒜̄ + λ𝒜𝒜̄ = 0

because the right-hand i is conjugated and returns with a minus. In 2D, `N = S²` gives `N′ = 2SS′`, and
`S′ = λSi` yields `2λS²i` — nonzero, since in ℂ the i simply commutes through and nothing cancels.
Measured: the gauge direction `𝒜₀i` gives `|N′| = 4.4e-16` where a generic direction gives 2.4.

**λ IS THE FRAME TWIST RATE AT THE POLE.** The kernel direction `𝒜·i` is the tangent to the gauge orbit
`𝒜 ↦ 𝒜e^{iθ}`, which rotates the frame ABOUT the tangent and leaves the tangent alone. With
`q = 𝒜/|𝒜|` the frame's angular velocity is `ω = 2·vec(q̇q̄)`, and `𝒜′(r) = λ𝒜(r)i` gives `q̇ = λqi`
(|𝒜| is stationary since `Re(𝒜i𝒜̄) = 0`), hence

    ω(r) = 2λ·e₁        purely tangential, magnitude 2|λ|

Measured to six decimals at λ = 0.35, −0.9, 1.6 with the off-axis component at 3e-8 or below. **And 2D
has no λ because a planar curve's normal is unique up to sign — there is no rotation about the tangent
to be had.**

**THE POLE IS WHERE THE CURVE PASSES THROUGH INFINITY**, since `w(r) = 0`. So walking the rational
fiber MOVES that point, and the road ends when infinity arrives at the piece of curve being drawn.
Measured in the plane: r driven from 1.7 down to 1.005 with the data held to 1e-13 while the speed at
the far endpoint diverged 3.17 → 11.3 → 248.

**So the two fibers differ in the KIND of their freedom, which is the whole content:**

| | the freedom is | so the fiber |
|---|---|---|
| polynomial (Hopf phases) | **twist** — an angle | **closes into a loop** |
| rational (adds the pole) | **where the curve meets infinity** — a position | **runs, and ends when infinity reaches the curve** |

**GENERALISES PER ROOT (F17).** One pole is where Σ = 0 and the algebra is cleanest, but nothing here is
special to it: each simple root carries its own twist rate λₖ, and fixing them all leaves a linear problem.
So the reading is "one twist rate per point where the curve meets infinity", not "one twist rate".

**Pinned by** `src/core/__tests__/onePoleTwist.test.ts` (4 tests), with the counts in
`rationalPHOnePole.test.ts`.

---

## F17 — The no-log condition is BILINEAR: one slider per root, and everything else is linear algebra. Plus the stratum the sliders miss

**Why this fact exists.** F14 called the spatial condition "quadratic" and concluded that fibers with two
or more poles need elimination. Both halves were too pessimistic. The correction arrived from a different
session and was **checked before being believed** — which is the only reason it is in this document.

**THE CONDITION IS BILINEAR IN (𝒜, λ).** At a simple root r of w,

    𝒜′(r) = 𝒜(r)·(Σ + λi)

is quadratic only because λ multiplies 𝒜. **Fix λ and it is LINEAR in 𝒜's coefficients** — and that does
not care how many roots there are. Measured: doubling 𝒜 doubles the residual to **0.0e+0** (exactly linear,
not approximately) at m = 1, 2, 3, with the assembled matrix matching the direct quaternion form to 1e-14.

**So the recipe is four steps, and two of them are linear solves:**

    1. choose the roots of w
    2. choose one slider λₖ ∈ ℝ per root
    3. LINEAR solve for 𝒜's coefficients        (4m conditions)
    4. LINEAR solve p′w − pw′ = N for p          (the Wronskian)

**THE COUNT, and it checks F14's arithmetic.** With λ FREE the condition is 3 real conditions per root
(the residue is a vector). Fixing λ makes it **4** — the quaternion equation outright — because the
λ-direction stops being free. So the admissible 𝒜 form a linear subspace of dimension

    4(n+1) − 4m          deg 𝒜 = n, m simple roots

Measured exactly at four pairs: (n,m) = (2,1) → 8, (3,2) → 8, (3,3) → 4, (4,2) → 12. And (2,1) → 8 is
exactly the (B₀, B₂) parametrisation `rationalPHOnePoleSpatial` uses, so that module is the m = 1 case of
this and nothing more.

**END TO END AT TWO POLES**, for three λ pairs including (0,0): residues vanish (1e-12), the Wronskian
solves (1e-14), and ‖N‖ = |𝒜|² to 3e-16 — exactly PH. No elimination anywhere.

**THE STRATUM THE SLIDERS MISS, and it is the sharper half.** The derivation divides by 𝒜(r). Where
**𝒜(r) = 0** the λ chart says nothing — and there the condition holds for FREE, because N = 𝒜i𝒜̄ picks up a
**double** zero, so N(r) and N′(r) both vanish (measured 4e-16, 2e-16). Then N/w² is **regular**: measured
c′(r) = (0.440, 0.020, −0.920), finite. So

> **the apparent pole CANCELS — the curve does not pass through infinity there at all.**

That is not a technicality. It is the **seam with the polynomial case** (F13's m = 0 corner), and it is
precisely the complement of the slider chart: the sliders cover the variety *except* where the pole is not
really a pole. An editor working near that stratum is working where its chart runs out.

**Pinned by** `src/core/__tests__/multiPoleLinearity.test.ts` (4 tests).

---

## F18 — The σ = 0 stratum is ABSORBING under Möbius: you can enter it, never leave

**Why this fact exists.** F17 named the stratum the λ-sliders miss (𝒜(r) = 0, equivalently σ(r) = 0 at a
real pole) and said the chart runs out there. It did not say what the stratum *is* under the Möbius group.
Three separate lines of work have now hit it independently — F17's sliders, the Sp(1,1) work, and a
parallel session finding that the published rational cubic has **w | σ with a null spinor**. They are all
the same stratum, and none of the three knew about the others. That duplication is the reason this fact
is written down.

**THE IDENTITY, and everything follows from it.** Inversion in homogeneous form is (p, w) ↦ (p·w, ⟨p,p⟩).
The conformal factor 1/|c|² gives, with no algebra beyond it,

    σ̃ / w̃² = |c̃′| = |c′|/|c|² = (σ/w²)·(w²/⟨p,p⟩) = σ/w̃      ⟹      σ̃ = σ · w̃

where **w̃ = ⟨p,p⟩ is the NEW denominator**. So σ̃ vanishes at every root of w̃ — that is, at the image's
own poles — **for any curve whatsoever**. Measured as σ̃² = σ²·w̃² to 1e-10 on a curve starting off the
stratum and on one starting on it, and concretely on the circle, where w̃ = (1+t²)² and σ̃(i) = 0 to 1e-12.

Similarities do not touch the pole structure at all: translation leaves N (hence σ) unchanged, rotation
leaves σ unchanged, scaling multiplies σ and w by the same factor. So:

> **One inversion always lands ON the stratum, and nothing ever leaves it. The stratum is absorbing
> under the whole Möbius group.**

**FIRST CONSEQUENCE — no transport trick exists.** A tempting repair is to Möbius an excluded curve into
a chart that does cover it, edit there, and map back. That cannot work for any curve, and in particular
the circle can never be carried into a λ-chart. This killed a proposal in the Sp(1,1) work; it is recorded
here so it is not proposed a fourth time.

**SECOND CONSEQUENCE — two chart TYPES are necessary, not one plus a repair.** The atlas is

    σ(r) ≠ 0     the λ-charts, one per pole configuration      (F17, F19)
    σ = h·w      the conformal chart, built directly in ℝ^{4,1} (`conformalPHCurve`)

and they are disjoint **because** the stratum absorbs. That is why `conformalPHCurve` exists and why it
cannot be folded into the λ machinery.

**THIRD — the containment, stated carefully because the identity claim is false.** Every inversion of an
ordinary PH curve lands in the conformal family, since σ̃ = σ·w̃ is exactly the σ = h·w signature. But the
conformal family is **strictly bigger**: a generic conformal degree-6 member has *no* null S with
⟨P(t),S⟩ constant, so it is not a Möbius image of *any* polynomial curve (`conformalPHStructure`). Six
shape moduli at degree 6 against four from bending a polynomial PH cubic. An earlier version of this
project asserted the two sets were equal; they are not.

**AND THE STRATUM IS SMOOTH, which is what makes it a chart artefact rather than geometry.** At a real
pole σ(r) = |𝒜(r)|² vanishes exactly when 𝒜(r) = 0, and the Jacobian of the defining quadrics there has
**full rank** (6 of 6 measured). Those are ordinary smooth points of the variety. The rank only drops
where 𝒜 has a **double** root at a pole — 𝒜(r) = 𝒜′(r) = 0, eight real conditions, codimension 8 inside a
10-dimensional variety.

**Pinned by** `src/core/__tests__/sp11StratumIsAbsorbing.test.ts` (5 tests),
`src/core/__tests__/mobiusMovesTheStratum.test.ts` (9 tests) and
`src/core/__tests__/sp11VarietyRank.test.ts` (5 tests).

---

## F19 — The admissible variety is RATIONAL: the λ-chart read forward IS the parametrisation, and codim = 3m

**Why this fact exists.** F17 gives the linear fibre at fixed λ and stops there. What it does not say is
that sweeping λ makes the *whole* variety rational — so the parametrisation everyone wanted was already
in hand and went unrecognised. A talk in this repository asserted the opposite across three slides before
this was checked. It also **reconciles F17's count with the other one in circulation**, which is otherwise
a standing source of confusion.

**THE FIBRE LIES INSIDE THE VARIETY, provably and with no division.** Write 𝒱 for the spinors satisfying
the residue conditions N′(r_k) = 2N(r_k)Σ_k at fixed poles, with N = 𝒜i𝒜*. Fix λ; F17's condition
𝒜′(r_k) = 𝒜(r_k)(Σ_k + λ_k i) is linear, so its solutions form a subspace. With Ω = 𝒜⁻¹𝒜′,

    N′(r) = 𝒜(Ω i + i Ω*)𝒜*     and     Ω i + i Ω* = (Σ + λi)i + i(Σ − λi) = 2Σi

so N′(r) = 2Σ N(r) — the quadric itself. **Nothing is divided by.** Measured: every member of the fibre
satisfies the quadrics, and arbitrary linear combinations of two members do too, so it is a genuine
subspace of 𝒱 and not a curve through it.

**SO 𝒱 IS SWEPT BY LINEAR SUBSPACES, HENCE RATIONAL:**

    dim 𝒱 = [4(n+1) − 4m]  +  m  =  4(n+1) − 3m          for m ≤ n

**And it fails at m = n+1, which is exactly where the fibre collapses.** The count assumes the 3m
residue conditions are independent. With `deg N = 2n` and `deg w² = 2m`, the residues of `N/w²` sum
to zero identically as soon as `deg N ≤ deg w² − 2`, i.e. `m ≥ n+1` — and N is a vector, so that is
**three** linear dependencies. So

    dim 𝒱 = 4(n+1) − 3m + 3 = n + 4                      for m = n+1

Measured across the whole table in `residuesSumToZero.test.ts`: the deficit is 0 for every m ≤ n
from (2,1) to (5,5), and exactly 3 at (1,2), (2,3), (3,4). This is why the tangent at (3,4) came out
6 where the old formula predicted 3, and it is the same locus where the fixed-λ fibre 4(n+1) − 4m
becomes a point. Beyond m = n+1 there are no members at all.
              fibre at fixed λ    the m dials

> **The λ-chart read FORWARD is a dominant rational parametrisation of 𝒱. The wall comes only from
> running it BACKWARD** — recovering λ from a given 𝒜 needs 𝒜(r)⁻¹, which is what fails on F18's stratum.

Measured: moving λ genuinely moves the fibre (the sweep does not collapse), and λ is recovered *component
by component* wherever σ(r) ≠ 0 — the quadric plus invertibility force Ω = Σ + λi exactly, with the j and
k parts dying.

**THE COUNT RECONCILES F17.** F17's 4(n+1) − 4m is the **fibre at fixed λ**; this is the **variety**. Both
are right and they differ by the m dials. Anyone comparing the two numbers should read them as fibre
versus total space, not as a contradiction.

**CODIMENSION IS 3m — INDEPENDENT OF THE SPINOR DEGREE.** Eliminating λ leaves three real quadrics per
real pole (six per conjugate pair), and n only ever enlarges the fibre. Verified at seven (n, m) pairs
from (2,2) to (6,3): fibre exactly 4(n+1) − 4m, measured Jacobian rank exactly 3m, two independent routes
to dim 𝒱 agreeing at each. Consequently the Bézout bound on deg 𝒱 is **2^{3m}, a function of the pole
count alone** — and witness sets measure deg 𝒱 = 64 at m = 2 (62/63/62 distinct points across three
independent slices; 63 distinct rules out a doubled component, which would have capped the count at 32).
𝒱 is a reduced complete intersection, and Fano.

**AND IT IS FAST ENOUGH TO DRAG, which is the point.** A chart member is a nullspace plus a linear
combination — no solver, no iteration, PH exact by construction: 0.18 ms at (deg 2, 2 poles), 0.38 at
(3, 2), 0.98 at (5, 2), 1.57 at (6, 3). Inside a frame at every size an editor would use. **Inside the
chart PH costs nothing**, so an optimiser there carries only the objectives actually wanted — which is
the whole argument for preferring a chart to a constrained solve.

**Pinned by** `src/core/__tests__/sp11VarietyStructure.test.ts` (6 tests),
`src/core/__tests__/sp11VarietyRank.test.ts` (5 tests) and
`src/core/__tests__/sp11ChartScales.test.ts` (6 tests).

---

*Add F20, … as we establish them. Never delete a fact that is still true; if a fact turns
out wrong, replace it and say why (a wrong fact in here is worse than none).*

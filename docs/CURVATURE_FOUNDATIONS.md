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

**ADDENDUM (E19/E20, superseding the solver framing above).** The whole ipopt-vs-BFGS-vs-primal-dual
table here was measured on the *old* production barrier. The production solver is now the
**log-barrier trust-region engine** (`trustRegionOptimizer.ts` / `trustRegionBanded.ts`), which
carries the constraint curvature through the Conn–Gould–Toint near-exact subproblem — the same
reshaping BFGS was bolted on for, but native and banded. F11/F12 are the definitive stall analysis
on the trust-region path; read those, not this table, for "why does it block." The *fact* this
section established is still durable and correct: **closed-drag blocking is solver step-strategy,
not conditioning** — a Gauss-Newton step stalls where a curvature-aware step reshapes. Only the
"which solver ships" conclusion is retired.

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

*Add F13, … as we establish them. Never delete a fact that is still true; if a fact turns
out wrong, replace it and say why (a wrong fact in here is worse than none).*

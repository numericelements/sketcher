# Lab notebook — why does Eric's drag track and core's stall?

This is a RESEARCH log, not a task list. Rule of the notebook (Eric, 2026-07-03): we are
not collecting tricks that happen to work — every experiment must end in a WHY. A result
without an interpretation is not done. Facts that graduate (established + pinned) move to
CURVATURE_FOUNDATIONS; this file keeps the reasoning trail, including dead ends.

## The research question

On the reference stall drag (F9: open rational, n=7, d=3, 15-tick pull), Eric's
closed-curve optimizer tracks **91%** with the displayed bound held; core's best tracks
**47%** (F12). Same constraints, same displayed bound, same budget class. **Which design
factor(s) cause the difference, and by what mechanism?**

## Candidate factors (each isolated by experiment, never varied together)

| | factor | Eric's design | core's design |
|---|---|---|---|
| A | weight DOF | weights FREE (3n vars; measured 5–25× drift) | weights FROZEN (2n vars) |
| B | step acceptance | never accept an infeasible step (shrink TR ×0.25) | accept, then outer guard bisects the endpoint |
| C | inactive-set rule | ~~closest-to-zero~~ **CORRECTION: identical to core's** (his `removeBiggest` keeps the largest-\|g\| member active per sign-changing sequence — the method name misled; verified by code reading, no experiment needed) | free all run interiors, keep largest-\|g\| anchor |
| D | product numerics | scaled-Bernstein (binomial-premultiplied convolution) | plain Bernstein products |
| E | solver ensemble | trust region + log barrier (+ SR1 variant) | ipopt-style IP / primal-dual / barrier |

## Known mechanism facts feeding the hypotheses

- F11: stalls are numerical, never the bound (rigid directions exactly feasible; core
  primal-dual dies by infeasible steps + guard collapse at a knife-edge coefficient;
  core ipopt dies by TR collapse δ: 3.5e2 → 2e-2 at stall onset).
- F10: knot insertion moves the knife edge (conditioning lever), non-monotone placement.
- Core ipopt worsens with budget (46% @20 → 18% @800): it is converging TO something —
  over-solving into a bad basin, not under-solving (mechanism not yet understood → E5).

## Experiments

### E1 — Isolate factor A inside ERIC'S stack (pin his weights)
Prediction if A is dominant: pinning z (weights) in his formulation collapses 91% toward
core's ~47%. Prediction if A is minor: stays ≥ ~80% and B/C/E carry the performance.
Method: adapter subclass of OpRationalBSplineR1toR2 that zeroes the z-block in the
objective gradient, the z-columns of the constraint Jacobian, and the z-components of
applied/evaluated steps — his solver, his rules, 2n effective DOF.
**Result: 96% tracked, bound 2 held, weight drift 0.00% (pin verified), 0 throws.**
Slightly BETTER than free weights (91%).
**Interpretation: FACTOR A REFUTED as the driver.** The 91-vs-47 gap does not come from
the weight DOF at all; if anything the extra 3rd of the search space costs a little
(gauge drift wastes motion). The dramatic 5–25× weight drift of F12 was a bystander —
the solver wandering in the projective gauge, not the source of freedom. The cause lives
in B (step acceptance), C (inactive-set rule) and/or E (solver). Consequence: task #10
(port free weights to core) is CANCELLED as a tracking fix — it may return later as an
editor feature question only.

### E2 — Isolate factor A inside CORE'S stack (free core's weights)
**CANCELLED** — E1 already refuted A as the driver; E2 would only measure a feature, not
a cause. Revisit only as an editor-semantics question.

### E7 — Eric's SOLVER on CORE'S problem (isolates E+B against the formulation)
Adapter maps CurvatureDragProblem to his IOptimizationProblem (f_i ≤ 0 convention =
core's `signs[i]·constraints[i] < 0`; sliding signs re-derived on every ACCEPTED step,
matching his step() semantics).
**Result: 92% tracked, bound 2 held, 0 throws, 97ms/tick @50 steps.**
**Interpretation: core's FORMULATION is exonerated** — its robust scaling, margins,
active set, and plain-Bernstein numerics (so factor D is not necessary either) support
91-class tracking when driven by his solver. The disease is core's solvers themselves:
same constraints, same gradients — ipopt-style IP gets 46%, primal-dual 47%+dead ticks,
his trust-region+barrier gets 92%.

### E9 — Eric's LINE-SEARCH variant on core's problem (dissects his solver)
His Optimizer has two paths: trust-region and Newton+backtracking line search, sharing
the same log barrier and feasibility discipline.
**Result: 18% tracked, 11/15 ticks threw `choleskyDecomposition failed`.**
**Interpretation: the log barrier alone is NOT the secret — the TRUST-REGION SUBPROBLEM
is load-bearing.** The barrier Hessian near the knife edge is so ill-conditioned that
plain Cholesky+line-search collapses (like core's solvers); the TR subproblem solves the
restricted quadratic robustly even when the system is near-singular, and the ×0.25
feasibility shrink keeps every iterate strictly inside. Eric predicted this from the
start ("look at the trust region dimension").

### E3 — Mechanism probe: WHERE does the escape direction live at a stall?
At a stalled configuration, compute the feasible descent directions restricted to (a) the
xy-subspace and (b) the w-subspace. If stalls are xy-infeasible but w-feasible, free
weights work BECAUSE the w-subspace bypasses the knife-edge coefficient (its constraint
gradient in w differs) — that would be the actual mechanism, not "more DOF is better".

### E4 — Factor B alone (per-step feasibility in core)
After A is understood: add shrink-until-feasible to core's step acceptance with weights
still frozen. Prediction: eliminates the 7/15 dead ticks; tracking gain bounded by
whatever E1/E3 attribute to the other factors.

### E5 — Why does core ipopt worsen with budget?
46% @20 → 18% @800 is a diagnosis gift: the iterate is going somewhere. Trace the
trajectory (objective, per-constraint slacks, δ, active set) over iterations at one tick
and name the attractor (barrier pushing toward an interior point that trades the dragged
residual for slack margin? scaling floor distorting the central path?).

### E6 — Factor C alone (inactive-set rule A/B)
Same solver, same weights, swap only the rule. Also: determine which rule Theorem 2 (the
St-Malo monotonicity proof) is actually stated for — this is a correctness question, not
just feel.

### E8 — sliding cadence (factor iv)
E7 adapter without per-accepted-step sign updates: **92%, unchanged.** Cadence irrelevant.

### E10 — the dissection of core's IP (all single transplants FAIL, then two fixes COMPOSE)
Single-variable results on the F9 bench (core IP @20 iters, baseline 46%):

    E10b  skip fraction-to-boundary (FTB)          15%   ← WORSE: unscaled dogleg overshoots;
                                                          FTB was salvaging small steps
    E10c  feasibility rejections free of budget    44%   ← alone: no change
    E10d  Eric's CGT TR subproblem inside core     31%   ← alone: worse (doesn't compose)
    E10e  consistent ρ (predict for the TAKEN step) 45%  ← alone: no change
    E10e  consistent ρ + free shrinks              74%   ← THE INTERACTION
    E10f  ...+ no FTB                              17%   ← FTB is load-bearing in core's loop
    E10f  ...+ no SOC/watchdog                     20%   ← SOC/watchdog earn their keep
    E10g  consistent ρ + free shrinks @60 iters    90%
    E10g  consistent ρ + free shrinks @200 iters   92%   ← PARITY with Eric; budget now HELPS

**The mechanism (two defects, both acceptance arithmetic, neither in the math):**
1. **The ρ ratchet.** Core computed predictedReduction from the FULL NEWTON step
   (`dot(barrierGradient, negStep)`), not the δ-limited step actually taken. A radius-
   limited step therefore always shows actual ≪ predicted, ρ never clears the 0.75
   expansion gate, and the trust region can shrink but never re-expand. (Also explains
   the filter regime: for always-feasible iterates θ≡0, the filter is vacuously empty and
   acceptance is just monotone-φ; ρ's only real job was expansion — and it was broken.)
2. **Feasibility search billed to the budget.** Every true-violation rejection consumed
   an outer iteration; at 20 interactive iterations the search for a feasible candidate
   ate the budget (7/15 ticks all-rejections in the F11 trace). Eric's loop performs the
   same ×0.25 shrink as an inner sub-procedure — free.
Each fix alone is useless because the OTHER defect still binds (no budget to exploit a
breathing radius; no breathing radius to exploit freed budget). Together they reproduce
Eric's loop dynamic — shrink to feasibility free, step, re-expand on an honest ρ — and
close the whole 46→92 gap with core's own dogleg, FTB, SOC, watchdog and filter intact.
This also RESOLVES the "worse with more iterations" pathology (E5): it was the ρ-ratchet +
fast-t escalation compounding; with consistent ρ, budget scales tracking again.

**What did NOT matter (refuted):** weight DOF (E1), sliding cadence (E8), inactive-set
rule (identical by reading), scaled-Bernstein numerics (E7 used plain), Eric's exact TR
subproblem (E10d — his CGT solve does not compose with core's loop and is not needed).

## E13a — the ipopt scale collapse, dissected (2026-07-04)

Rational open column (census: 46/17/6% at n=8/16/32), probes @maxIterations:

    n= 8   @20: 46%   @40: 53%   @200: 95%    @20 noFTB: 46%
    n=16   @20: 17%   @80: 35%   @200:  5%    @20 noFTB: 17%
    n=32   @20:  6%   @160: 7%   @200:  8%    @20 noFTB:  6%

    diagnostics @20:  n=8: rawViol 0/15, medδ 0.17 | n=16: 2/15, 0.18 | n=32: 9/15, 0.013
    guard never fully collapses (α min 0.597, med 0.955) — it TRIMS nearly every tick.
    ε-knife-edge test EMPTY at n=32: the sign flips happen MID-STEP, not at the start.
    dynamic range GROWS with n: max|g| 8.5e13 (n=8) → 2.6e16 (n=32).

**H1 (budget): true only at n=8** (95% @200). At n=16 big budget REVERSES (35→5% — the
pre-E10 inversion signature returns: over-solving the surrogate walks away from true
feasibility). **H2 (FTB): dead** — identical at every n. **The real mechanism (E13a-2,
the who-crosses probe): on EVERY violating tick exactly ONE ACTIVE constraint flips,
and its start magnitude is |g₀|/max ≈ 1e-13…1e-12** (absolute ~1e3 against 2.6e16-scale
coefficients — the STRUCTURAL-ZERO class of F1, whose computed value is comparable to
the roundoff of the products that made it). One noise-class coefficient crossing costs
the robust count +2; the guard trims the step; repeat every tick → 6%.

**Consequences.**
1. The scale collapse is not a solver defect: the solver is asked to hold a wall whose
   POSITION is below arithmetic resolution. Margins/scaling can't fix what precision
   erased — this is Eric's "near zero, numerical error creeps in", now with a specimen.
2. **Law 3 exposure at scale:** the DISPLAYED robust count itself leans on the sign of
   a coefficient whose sign may be roundoff — the honesty of the n=32 bound display is
   an open question, not just solver quality.
3. **E12 is promoted from "worth checking" to the direct next step, with a precise
   target:** evaluate the flagged 1e-12-relative coefficients in compensated arithmetic
   (Eric's Kahan/Dekker toolkit). If they are structural zeros (exactly 0 in exact
   arithmetic) or their double sign is unstable, the fix is arithmetic + treating
   known-structural-zeros as exact (never constraints, never sign carriers) — not more
   solver work. Then re-run this column.

## E12 — precision at the knife edge (in progress, 2026-07-04)

**E12-1 (ulp-jitter, START state, n=32):** all 725 robust signs AND the bound (15) are
perfectly stable under 32 trials of ~1-ulp input jitter. The start curve is numerically
clean — the noise sensitivity is NOT intrinsic to size alone.

**E12-2 (ulp-jitter, MID-DRAG states):** the DRAG manufactures the knife edge. From
tick 8 a coefficient sits at ~1e-12·max (exactly the SIGN_NOISE_REL floor) — parked
there BY the sliding mechanism itself (merging extrema = driving a coefficient to zero
and holding it). At those states, 1-ulp input jitter flips the DISPLAYED BOUND between
15 and 17 in up to 11/16 trials. **Law 3 exposure, proven: at scale, mid-merge, the
displayed count is not a well-defined function of the geometry at double precision.**

**What is NOT yet decided — the E12-3 question:** at a violating step (E13a-2), is the
flagged coefficient's zero-crossing (a) EVALUATION NOISE (double pipeline mis-computes
the sign for fixed inputs → fix = compensated arithmetic in the numerator), or (b) a
GENUINE crossing that the scaled/floored constraint row (SCALE_FLOOR_REL = 1e-12·max)
is too weak to hold (→ fix = the constraint regime at the floor, e.g. F1's span-derived
a-priori normalization, or raw-margin handling for floor-class rows)? Note the
power-of-2 scaling trick CANNOT discriminate (exact exponent shifts leave every mantissa
— hence every noise realization — bit-identical).
**E12-3 design:** a self-contained double-double (Dekker TwoProduct + 2Sum — Eric's
floatingPointArithmetic algorithms) implementation of the complex-family numerator,
run at the pre/post states of one violating step; compare DD signs vs double signs of
the flagged coefficient. (a) if signs differ → port compensated evaluation into the
numerator (targeted, one pipeline); (b) if signs agree → the crossing is real and the
work moves to the constraint regime at the floor. Either way the Law-3 wobble needs a
resolution: near a merge the count is genuinely discontinuous; the display/enforcement
must make a CONSISTENT choice (hysteresis at the floor, or exact structural-zero
knowledge), never an ulp-lottery.

## E12-3 — the exact oracle: VERDICT, and a correction to E13a (2026-07-04)

Method: the full complex-Chen numerator pipeline reimplemented in EXACT rational
arithmetic (BigInt fractions; doubles are dyadic rationals, every pipeline op is
rational — Boehm Bézier-ization, binomial products, derivatives). Run on the violating
tick's pre/post states at n=32.

    Sanity: all 725 coefficients, |double − exact| ≤ 3.2e-15 · max  → DOUBLE IS ACCURATE.
    Specimen #225: PRE  +3.428e3 (double sign +, exact sign +)   |g|/max = 1.3e-13
                   POST −2.025e7 (double sign −, exact sign −)
    VERDICT: GENUINE CROSSING. Not evaluation noise. Compensated arithmetic is NOT the fix.

**The complete causal chain (every link verified):**
1. `SIGN_NOISE_REL·max = 2.6e4` at n=32's range — so coefficient #225 (+3.4e3), a
   GENUINE sign carrier (exact-verified), is CLASSIFIED as a structural zero.
2. As "structural zero" it gets `scaleForRobust` scale = max|g| = 2.6e16 and
   `structuralMarginsScaled` margin = MARGIN_REL = 1e-9 (scaled units).
3. That margin's ABSOLUTE width is 1e-9 · 2.6e16 = **2.6e7 raw g units** — a crossing
   corridor ~7,600× the coefficient's own size. The observed crossing (−2.0e7) sits
   just inside it: internal slack 7.7e-10 < margin 1e-9 → the solver's feasibility
   test sees NOTHING. The solver obeyed its constraints perfectly.
4. The robust display count then (correctly) reads the flip (|−2e7| ≫ noise) → bound
   +2 → the guard trims the step → 6% tracking.

**CORRECTION to E13a:** "the coefficient's sign is roundoff noise" was WRONG — the sign
is real and double-precision computes it fine. The truth is sharper: **max|g|-relative
thresholds misclassify genuine small coefficients at scale.** This is precisely the
"global relative floor" that CLAUDE.md (Law 3) forbids for the display — alive inside
the ENFORCEMENT regime, and F1 warned about it verbatim ("such a floor deletes real
features"). The E12-2 ulp-wobble of the displayed bound is the same phenomenon's
display-side shadow (a real coefficient parked at the classification boundary).

**The fix direction is F1's open prescription, now with a causal specimen:** classify
structural zeros STRUCTURALLY (knot/boundary position — or the exact oracle offline),
not by magnitude-relative-to-max; and/or normalize g by the a-priori span-derived scale
so the dynamic range collapses and relative thresholds become meaningful. Compensated
arithmetic (E12's original question) is exonerated for enforcement — possibly still
useful later for marker display at extreme ranges, but nothing here needs it.

## E15 — the size column, closed out (2026-07-04): Eric's design tracks 100% at EVERY size

Context set by Eric: no new layers of machinery; bias to simplicity; the goal is that
things WORK. So E15 tested subtraction and controls instead of new mechanisms.

    open rational column          n=8     n=16    n=32
    core ipopt, scaled @20        46%     17%      6%
    core ipopt, RAW (Eric regime,
      exact-zero exclusion) @20   47%     12%      6%     ← regime NOT binding per-tick
    core RAW @200                 92%     56%      8%     ← but RAW kills the budget-
                                                            REVERSAL (scaled @200: 5% at
                                                            n=16; raw climbs monotonically)
    ERIC solver + CORE problem
      (fixed weights, scaled)     95%     91%     80%     ← E15c
    ERIC full stack @50 steps    100%    100%    100%     ← E15b. No wall exists.

**Readings.**
1. There is NO feasible wall at n=32 — his stack tracks the cursor COMPLETELY with the
   bound held (and ~1.2 s/tick dense; O(n) is a separate lever).
2. Core's remaining scale gap decomposes: ~74 points = core's SOLVER internals (E15c:
   swap the solver only → 6%→80%), ~20 points = formulation freedoms his stack has
   (free weights and/or raw constraints; E1's "weights don't matter" was an n=7 result
   and does NOT generalize to scale).
3. The scaled regime's corridor is what made MORE budget WORSE (raw is monotone in
   budget) — E12's chain confirmed from the opposite direction. At interactive budget
   the regime choice doesn't move tracking; its harm is the corridor, its cost is the
   misclassification. The raw regime is SIMPLER and never worse.
4. Suspect for the ~74-point solver gap at scale (E10 already equalized ρ + budget
   disciplines): the TRUST-REGION SUBPROBLEM — his Conn–Gould–Toint near-exact solve vs
   core's dogleg, whose quality rests on a regularized Cholesky Newton point that
   degrades on the 1e16-range barrier Hessian. (E10d's n=7 result — CGT-in-core hurt —
   needs re-testing at n=32 before this is believed.)

**The convergence recommendation (pending Eric's go):** stop repairing core's IP
piecemeal. PORT ERIC'S OPTIMIZER (Optimizer.ts + TrustRegionSubproblem.ts, ~500 lines
of code HE wrote and understands) into core as THE drag solver, driving core's family
problems; keep core's family/constraint machinery (raw regime) and the Law-2 guard.
Measured expectation: 80% at n=32 immediately (E15c), 100% with free weights if adopted.
This is convergence to the author's design — not another layer.

## The port (2026-07-04, d1c215b): the trust-region barrier optimizer is IN CORE

`src/core/trustRegionOptimizer.ts` — faithful port of the closed-curve Optimizer +
CGT TrustRegionSubproblem (+ packed SymmetricMatrix / Cholesky). Same algorithms,
same constants. Available as `slide({solver:'trust-region'})` over every algebraic
family. Acceptance GREEN: reproduces the E15c column (95/91/80) through core's own
slide(), bound held every step; full suite green. Selected by measurement (E15),
not authorship — it simply beat everything else on the same problems.
Remaining to productionize: family×topology measurement sweep (closed curves esp.),
editor recipe decision, then THE BANDED O(n) FACTORIZATION inside this design (the
CGT λ-iteration re-factors H+λI per iterate — banded LDLᵀ makes each factorization
O(n·b²); target: 30–50 CP curves interactive).

## E14 — closed PH: the curve-span bound enters the tracking solve (2026-07-04)

Method: trust-region engine over generator variables [x0,y0,u,v]; constraints = RAW
rows (pure signs, cyclic anchors, exact-zero exclusion) of the PERIODIC-REP curve
numerator — the editor's displayed metric, via a precomputed linear clamped→periodic
LS operator; closure DECOUPLED (Eric's design: solve → projectClosurePH, 2 rounds);
faithful editor guard (generator bisection with re-projection). FD Jacobians (bench).
Census baseline at nCP=51: tracking −30%, raw curve bound 8→12, editor ≈ 0%.

    solve-with-curve-bound, no margins:      +39% raw, bound 8→10 (projection is
                                             bound-BLIND: it perturbs g at the walls)
    + projection-sized margins + guard:      20-22%, bound 8/8 STRICT, closure 1e-13
    refit-free target (generic drag policy): 20% — same

**Findings.**
1. **The concept works**: curve-span-in-solve turns active drift (−30%) into honest
   constrained progress with the bound STRICTLY held — where the census editor loop
   nets ≈0%. The F6 gap is closed at the solve level.
2. **The refit target manufactures extrema**: fitClosedPHSpline of a one-point edit
   has curve bound 10 vs start 8 from tick 1 — the legacy target policy asks the
   solve to chase a constraint-violating shape. The trust-region formulation doesn't
   need a refit at all (objective = generic drag: dragged CP→cursor, rest anchored).
   Keep the refit-free policy regardless.
3. **The residual ceiling is the bound wall at 8 itself** — margins/budget/target
   changes don't move ~20%. OPEN QUESTION (the tracking unlock): is that wall TRUE
   (the motion needs a new extrema pair) or LOOSE (the degree-5 LS periodic rep's
   degree-24 polygon overcounting — #28's looseness at the exact point where it now
   costs tracking)? No oracle exists (Eric's closed-curve has no PH). Next probe:
   compare periodic-rep polygon count vs dense sign-crossing count Z(g) on these
   states; if Z ≪ polygon, the wall is largely representational.
4. Production path (after the ceiling question): analytic chain
   ∂g_per/∂gen = P∘(planar periodic cols)∘phControlPointJacobian (852ms/tick FD
   bench → editor-grade), then wire slideClosedPHTracking's successor.
Bench kept: labE14ClosedPHCurveBound.test.ts (skipped).

## E14-P2 — the REDUCED numerator R for closed PH (2026-07-04)

**Verification chain (the census 16-gon, wrapSign −1):**
- A periodic-chart R via the seam FOLD is WRONG (305/400 sign mismatches): phSeamMaps'
  fold handles wrap relations INSIDE the clamped chart — it is not a chart conversion
  (F5 said so; re-learned by experiment).
- **The CLAMPED-chart R counted CYCLICALLY is exactly right: 400/400 pointwise sign
  agreement with the curve-span g** (g = 2Rσ² empirically confirmed), R continuous
  across the seam (all ingredients quadratic in w). At the start state: R polygon = 8,
  g_per polygon = 8, dense Z = 8 — all tight, 112 coeffs vs 240, degree 6 vs 14.

**Landed:** slideClosedPHCurveBound constraints = R rows with the exact AD reduced
gradient (reducedPHGradient) — no curve build, no G_per·P·J_ph chain for constraints
(that chain remains only for the objective); guard + acceptance + store all on the ONE
R metric (closedPHReducedBound, generator-level — the guard needs no curve rebuild).
183ms/tick (was 306 on the curve-span metric, 850 FD, ~1500 census).

**The honest surprise: tracked 30% on the R metric vs 49% on the loose curve-span
metric.** Interpretation: the tight cage REGISTERS extrema merges the loose degree-14
polygon missed; Law 2 then correctly holds the lower count — a stricter cage BY DESIGN.
The loose metric's extra 19 points of tracking were partly motion through unregistered
merges. OPEN PROBE (decides if any of the 30% ceiling is still slack): along the bench
path, does dense Z actually drop where the R count drops (real merges — the cage is
exactly right), or does R's polygon inflate without crossings (residual slack)? Also
remaining: display switch to the R count ("S=" readout for closed PH), open-PH onto
the TR engine, periodic-CP anchoring.

## Conclusions (running)

1. **The 91-vs-47 gap is a SOLVER property, not formulation, not DOF, not numerics.**
   (E1: weights pinned → 96%; E7: his solver on core's problem → 92%; code reading:
   inactive-set rules identical.)
2. **Within his solver, the trust-region discipline + strict feasibility is the
   load-bearing pair; the log barrier alone fails** (E9: his line-search variant → 18%
   with Cholesky failures — same collapse mode as core's solvers).
3. **SOLVED (E10): core's stall = the ρ ratchet × budgeted feasibility search.** ρ was
   measured against the full-Newton prediction so the radius could never re-expand, and
   the feasibility search consumed the iteration budget. Fixing BOTH (they only work
   together) takes core's own IP from 46% to 74% @20 iters and 92% @200 — parity with
   Eric's optimizer — and restores "more budget = better". Pinned:
   `ipoptStallMechanism.test.ts`. Experimental flags: `consistentPredictedReduction`,
   `freeFeasibilityShrinks` (ipopt config).
4. **PRODUCTIONIZED (this branch):** consistent-ρ extended to the banded/arrowhead paths
   (band/seam quadratic forms); both fixes are ipopt DEFAULTS (off = experiments only).
   Two pins recalibrated with cause: arrowheadDrag seam-parity 3→10px (both paths
   improved absolutely; livelier dynamics widen the documented near-singular-seam
   bifurcation; acceptance patterns verified healthy) and the [ipopt] quick-drag lock
   (sc strict, unchanged; the old zero-counting marker metric now registers one legal
   F8 TOUCH — g grazing zero within a held sign — allowed only while sc holds).
5. **F4 SURVIVES the fixes: solver superiority is still curve-dependent.** Fixed ipopt
   wins the F9 curve (74% vs 47%, zero dead ticks) but still stalls (~19%) on the
   openRationalEditing curve where primal-dual tracks. Editor recipes therefore use
   solver:'best' (both guarded, keep the furthest — never regresses by construction):
   F9 via the editor recipe = 82% tracked, bound held, ~117ms/tick (was 47% @47ms).
   WHY ipopt still stalls on those curves = open research question (E13 candidate);
   a cheaper stall-triggered cascade (primal-dual first, ipopt on guard-α collapse)
   is the engineering follow-up, wanting the #9 diagnostics.
6. The knife-edge conditioning itself (F1/F11) remains worth treating (compensated
   evaluation of near-zero coefficients — E12), but it is no longer the binding
   constraint on tracking.

## The census (2026-07-04; stallCensus.test.ts, run explicitly — ~700s)

One standardized hard pull (F9-style, 15 ticks, maxIterations 20), bound asserted and
HELD in every algebraic cell. tracked% (ipopt / primal-dual):

    family      open  n=8      n=16     n=32          closed n=8   n=16     n=32
    polynomial       73 / 50   41 / 39    8 / 39           85 / 52  37 / 37  13 / 38
    rational         46 / 84   17 / 66    6 / 41           87 / 79  18 / 55   6 / 18
    complex          36 / 84    6 / 43   10 / 29           48 / 72   8 / 54   9 / 19
    rational n=56 spot (ipopt): open 2%, closed 2% (~1.5–1.9 s/tick)

    ph-open   nGen  8 → 75%   14 → 67%   26 → 25%   (bound held; gen ≡ curve span)
    ph-closed nCP  51 → −30%  75 → −11%  99 → −0%   RAW curve bound GROWS 8→12/18/26
                                                    (pre-editor-guard; see reading #3)

**Reading — three named specimens for the research program:**
1. **E13a: the ipopt SCALE collapse.** Post-E10 ipopt still wins small curves (85–87%
   at n=8 closed) but collapses at n≥16–32 in every family (6–13%; 2% at n=56) while
   primal-dual degrades gracefully. What grows with n: the active-constraint count
   (bound 3→9→15 on this shape), the F1 dynamic range, FTB's αmax minimum taken over
   more rows — while the 20-iteration interactive budget stays fixed. First probe:
   budget-normalized cells (does maxIterations ∝ n restore ipopt?), then per-n
   diagnostics (finalDelta / guard-α) via the now-wired slide diagnostics.
2. **E13b (F4 refined): solver choice is now PREDICTABLE, not random.** primal-dual
   wins open rational/complex at every size and everything large; ipopt wins small
   closed. 'best' pays 2× for what looks like a simple (family, topology, n) decision
   rule — a cheap static router may replace 'best' once E13a is understood.
3. **THE PH-CLOSED FINDING (Eric's ~30-CP pain, quantified): NEGATIVE tracking.** The
   editor-faithful refit→slideClosedPHTracking loop, run WITHOUT the editor's hard
   curve-span guard, drifts AWAY from the cursor (−30% at nCP=51) and its RAW
   curve-span bound grows 8→26 — the F6 gen-span≠curve-span gap AT SCALE. In the
   editor, the strict bisect guard eats those violating steps, which is exactly the
   "challenging to edit" feel. The fix direction is NOT a tougher guard (F11 lesson:
   the guard is doing its job on a bad step) — the curve-span constraint must enter
   the tracking solve itself, or the closure projection must stop manufacturing
   curve-span sign changes. This is E14.
4. **The cost wall (engineering, known): n=32 costs seconds/tick on the dense paths**
   (primal-dual rational closed: 6.9 s/tick). At Eric's working sizes the editor pays
   latency AND tracking penalties — the linear-drag port (windowed/banded, Rust
   design; docs/LINEAR_DRAG.md, docs/WINDOWED_SOLVE.md) is now load-bearing for feel,
   not an optimization luxury.

## E16 — "one control point moves the opposite direction": the seam-region anatomy (2026-07-04)

**Trigger (Eric's feel report):** closed-PH drag "much better", but one CP moves
backward. Ask: "Can you test if all control point follow more or less the mouse?"

**Instrument:** an all-48-CP sweep through the real editor route (moveControlPoint,
3 ticks, 50px pull; measure displacement ALONG the pull), plus a stage-by-stage probe
(onStage hook: after each pass's solve and after its projection separately).

**Sweep, before:** k=41–44 moved BACKWARD (−1.9 to −5.8px); k=45 FLEW (+80.6 along,
|disp| 92 — on a 50px pull); interiors weak (+1 to +8px). The probe split the blame:
the SOLVE was healthy everywhere (k=42: +16px toward cursor, 17px collateral), then
projectClosurePH threw the seam region 60–170px (k=45 collateral: 168px at clamped 45).

**Two diseases, both structural (no solver tuning involved):**
1. **The solve ran over the FULL generator, but the wrap tail is not free.** The last
   nWrap generator coefficients are expand()-dependent (phSeamMaps, F5). The solver
   happily moved them off their wrap values; projectClosurePH then SNAPPED them back
   (expand of the free head) — a 60–170px discontinuous yank that landed anywhere
   (backward at k=42, sideways-past-the-cursor at k=45). Passes couldn't help: the
   giant projection deltas produced giant margins, making pass 2 instantly infeasible
   (it silently did nothing — measured identical numbers).
2. **The clamped-target correspondence model was WRONG.** The "seam duplicate pair"
   story (clamped 0..2 ≡ clamped 48..50 as points) is false: clamped end CPs are
   clamping BLENDS of the periodic seam CPs (measured: clamped[0] sits 16px from
   periodic 45 while clamped[48] coincides exactly). Dual-targeting ciMain+ciDup
   therefore pulled TWO DIFFERENT points to the cursor (the k=45 overshoot), and the
   ½-weight patch was a fix to a model that doesn't hold.

**Fix (both parts are eliminations, not penalties):**
1. Solve in phSeamMaps' FREE coordinates (fold/expand are linear-exact; Jacobians
   folded per row/column, ≤3 nonzeros per expand column). Seam continuity now holds
   EXACTLY during the solve; the projection is reduced to the min-norm Newton on the
   two ∮w²=0 conditions — small by construction.
2. Track the PERIODIC CPs through the fit operator P (periodic = P·clamped, linear;
   d(per)/dz = P·Jph). The user's handle IS the tracked object — the entire
   periodic→clamped correspondence problem (structural map, dual images, seam
   weights) is DELETED, not repaired.

**Sweep, after:** all 48 CPs forward: +6.6 (k=45, projection tax) to +35.2px; none
backward, none flying; interiors ~tripled (13–33px). E14-PROD bench: tracked 30% → **83%**
@356ms/tick — the "30% R-cage ceiling" question from E14-P2 is largely ANSWERED: most
of that ceiling was the clamped-objective fighting itself, not the cage. Pinned:
closedPHAllCPSweep.test.ts (seam region + interior spread: along>0, |disp|<1.2·pull,
median ≥10px).

**WHY it read as "one" bad point:** the seam region is 6–7 of 48 CPs; interiors were
merely weak (masked by many ticks), but a seam CP moving −5.8px against the hand is
unmissable. The single feel report was the 15% of the curve where both diseases stack.

**Still open (inherited):** k=45's projection tax (solve reaches +16.6/pass, ∮w²
projection gives back ~11 — the projection is objective-blind; a closure-aware
objective row could shrink it); display "S=" → R count; open-PH onto the TR engine.

## E16-P2 — closed-PH display switched to the solved object (2026-07-04)

**Trigger:** Eric saw "S =" tick 4→6→4 for a moment during a (now good-feeling) closed-PH
drag, WITH the corresponding markers appearing/disappearing on the curve. Wondered what is
different about closed PH — he never sees this on other families.

**The difference:** closed PH is the ONLY family with a second representation between the
solved object and the screen. The drag enforces R on the clamped generator chart; the
screen showed the curve-span g of the PERIODIC LS VIEW (operator P, faithful ~1e-6).
Counts are integers with knife edges: at a graze of g (touch, not crossing — F8), a 1e-6
perturbation turns the touch into two crossings — the view honestly reads +2 (markers AND
polygon count together, exactly as observed) while the enforced R count holds. Law 2 held
the whole time; this was the residual Law 3 gap flagged in E14-P2.

**Fix:** display reads the solved object — `closedPHConstraintState` (R's coefficients,
robust signs, cyclic sliding active set — literally what slideClosedPHCurveBound computes)
feeds the BottomPanel bar + "S =" readout; `closedPHExtremaMarkers` (R's crossings, cyclic)
feeds the canvas dots (same t domain; sign(R) = sign(g) exactly, g = 2Rσ²). The periodic
CPs remain the geometric view only. This is MORE honest, not less: the PH curve defined by
(u, v, origin) is the exact object; the view is its fit. Side benefits: the bar shows R's
degree-6 polygon (7 dots/span vs 15, F7 conditioning — no endpoint-blowup dwarfing), and
the faded active/inactive dots are now the SOLVER'S OWN anchors/freed interiors, not a
re-derivation on a polygon the solver never reads.

**Open PH unchanged, deliberately:** its displayed clamped CPs ARE the solved object and
its drag enforces their g — no gap. When open PH moves to the TR engine on R, switch its
display the same day.

**Pinned** (closedPHDisplayMetric.test.ts): displayed == enforced (same count); R domain
= display domain [0,1]; S⁻ ≥ markers drawn (Law 1 on screen); R markers ↔ view markers
1:1 within 1e-3 away from knife edges; and the contract itself — displayed bound
non-increasing tick-to-tick across interior AND near-seam drags (the flicker regime).

## E16-P3 — the dots themselves: markers must use the count's OWN classifier (2026-07-04)

**Trigger:** after E16-P2 Eric confirmed S= and the κ panel are fixed but the extrema dots
ON THE CURVE still blinked. The dots WERE already reading R — so the leak was inside the
finder. Measured (16-tick drags, 6 CPs): at k=7 ticks 14–16 the raw finder drew **10 dots
under S=8** — the one test (S⁻ ≥ markers drawn) violated on screen.

**Mechanism:** `signChangeParams` reports every floating-point crossing. At a near-merge,
R dips across zero INSIDE the noise band — coefficients the robust sign assignment
(assignSignsNeighbor, SIGN_NOISE_REL machine-zero classifier — the one permitted
threshold) classifies as zeros carrying neighbor signs. Count says 8 (robust), finder
says 10 (raw): two metrics INSIDE one object.

**Fix:** `curvatureExtremaMarkersOfNumeratorRobust` — flip each noise-band coefficient
onto its ASSIGNED sign (magnitude kept; position error bounded by the noise band's own
width, the genuine ambiguity of the data) and find crossings of that polygon. Not a
reshaping floor: the SAME classifier the displayed/enforced count already uses, applied
to the dots so screen and count are one metric. Closed-PH markers use it; other families
unchanged (adopt deliberately if the same blink is ever measured there).

**After:** S8/Z8 at every tick, all probed CPs. Pin extended: markers ≤ S every tick of
the drag pin (closedPHDisplayMetric.test.ts).

## E17 — open PH onto the trust-region engine, on R (2026-07-04)

**Goal:** the last drag route off the old engine; one engine + one metric (R) + display
coherence for the whole PH family.

**Build:** `slideOpenPHCurveBound` = slideClosedPHCurveBound minus everything seam-related
(no wrap coordinates, no closure projection, no passes/margins, no operator P — the open
displayed CPs ARE the solved clamped object). Constraint = R, open counting; exact AD
Jacobian; strict R guard with generator bisect + hard backstop inside the function.

**The one experiment that mattered — objective weights are load-bearing:**
    uniform weights:      nGen 7/13/25 → 42/56/49% tracked (anchors fight the drag 1:1)
    legacy 10/5/1 weights: nGen 7/13/25 → 98/96/95% tracked
    old engine (g):        nGen 7/13/25 → 87/92/85% @ 95/265/923 ms/tick
    new engine (R):        same curves  → 98/96/95% @ 21/80/342 ms/tick
Better tracking than legacy at ~1/4 the cost, R held everywhere. (Eric's weights, ported
with the port — the E1 lesson generalized: the solver is a tuned ensemble; the objective's
weighting is part of the design, not a detail.)

**The F9 checkpoint, faced explicitly:** at nGen=7 the new drag let the loose degree-14
g POLYGON count rise while R held. Not a violation: Z(g) ≡ Z(R) exactly (g = 2Rσ²), so no
real extremum appeared — the loose polygon registers knife-edge pairs the R polygon does
not. Legitimacy requires displayed == enforced, so the display switch (S=, markers, bar →
openPHConstraintState / openPHExtremaMarkers, robust classifier) SHIPS WITH the solver
switch — same commit. The old openPHEditing curve-span pin still passes (stricter than
required on these fixtures; kept).

**Pins:** openPHCurveBound.test.ts (3 sizes: tracked ≥80% floor, R non-increasing per tick,
cost ceiling; display coherence S==enforced, markers ≤ S, domain [0,1]);
openPHAllCPSweep.test.ts (every CP through the real store route: forward, no flying,
median ≥10px — the E16 lesson applied before, not after, a feel report).

**Still legacy:** PH value-bound (|κ|≤b workbench) — optimizePHCurve; when extrema
preservation is combined with the value bound, enforcement is legacy-g while the display
now reads R (rare workbench path; noted, acceptable until the value bound migrates).
slideOpenPHTracking stays exported (phDrag tests still exercise it) until the legacy
sweep (#5) deletes the old engine wholesale.

## E18 — legacy-engine deletion, phase A: the algebraic CP-drag engine is gone (2026-07-04)

**What made it possible:** E17 closed the last gap — every curvature-extrema CP drag
(polynomial/rational/complex × open/closed, junction/cusp knots, symmetry, anchors,
inflections, open + closed PH) runs on core's trust-region engine with no fallback.

**Deleted (~1,360 lines net):** `optimizeCurve`/`optimizeRationalCurve` + internals +
`applyOptimizeResult`/`applyOptimizeRationalResult` (index.ts −229);
`PeriodicBSplineCurveProblem` (−505), `SymmetryReductionWrapper` (−229),
`FixedVariableWrapper` (−119); the store's two try-core/catch-legacy CP-drag branches —
replaced by an HONEST warn+drop (a non-normalized closed knot vector is a producer bug;
Law 2 forbids the silent direct move the old fallthrough allowed); three legacy-pinning
tests (openSlideMigration, legacyVsCoreOpenRationalBound — "this test dies with the
legacy optimizer; that deletion is its success condition" — and rationalBoundPreservation).

**Kept, each gated on a NAMED capability (not nostalgia):**
- `RationalBSplineCurveProblem` + `PeriodicRationalBSplineCurveProblem` + Farin plumbing —
  rational Farin drags; `ComplexRationalBSplineCurveProblem` + `optimizeComplexRationalCurve`
  — complex Farin (known-hard open problem, per Eric: do not grind on it as cleanup).
- `PHCurveProblem` + `optimizePHCurve` — the curvature-VALUE bound |κ|≤b workbench and
  plain (no-extrema) PH tracking; `snapPHCurveToCurvatureBound`.
- AB / complex-rational / real-rational PH problems — variant families, no core ports.
- `InteriorPointOptimizer` — the solver those remaining problems run on.
- `BSplineCurveProblem` — base class + lab/talks imports.

**The measured bonus:** editingFeel.test.ts (tracking / continuity / reversibility /
stability / latency, thresholds CALIBRATED ON LEGACY — 1.8× continuity ceiling, 2px
tracking miss) retargeted to the shipping core recipe passes UNCHANGED. The core engine
meets the legacy feel bar with no recalibration — the invariants outlived the engine.

**Remaining for full deletion (#5):** migrate the PH value bound (natural TR fit: P± rows
are inequality constraints like R's), decide plain-PH tracking, and the PH variant
families; Farin stays until the research problem is solved. InteriorPointOptimizer leaves
when its last problem does.

## E19 — the PH curvature-VALUE bound onto the trust-region engine (2026-07-04)

**The generalization worth naming:** |κ| ≤ κ_max is the laws' machinery pointed at
NONNEGATIVITY instead of sign changes. κ = 2P/σ² (P = uv′−vu′, σ = u²+v² — R's own
ingredients), so the bound is two polynomial certificates P± = κ_max·σ² ± 2P ≥ 0,
certified by Bernstein coefficients ≥ 0 (variation diminishing; subdivision is a linear
map that tightens honestly — loose is true). Core `phValueBound.ts` keeps the
"certificate rows" shape generic: a SPATIAL PH curve joins later with its single row
b²σ⁶ − |r′×r″|² ≥ 0 (the Giannelli AUV lab) — same pattern, its own polynomial.

**Build:** certificate + exact forward-AD Jacobian through the exported RDual algebra
(machine-precision parity with the legacy hand-derived columns, pinned at subdivisions
1/2/3); rows ride `slideOpenPHCurveBound` as extra TR inequality rows; new
`constrainExtrema` toggle (a value-bound-only drag may legitimately change the extrema
count — the strict R guard is scoped to the extrema mode, and the combined mode re-checks
the certificate after any guard bisect: a convex combination of feasible generators is
not certificate-feasible by construction). Feasibility restoration = `snapPHToValueBound`,
a hinge Gauss-Newton with escalating penalty (the TR barrier cannot start infeasible —
and cannot run with zero constraints: t = m/f0 = 0 never terminates; the snap is its own
tiny solver by design).

**Measured:** combined drag (value bound + extrema) tracks 87% with BOTH held every tick;
value-only mode holds the certificate with R free. Workbench (LabPH2D) snap + margin now
core; the store routes valueBound → core, and the legacy `optimizePHCurve` call is down
to PLAIN tracking with empty options. `snapPHCurveToCurvatureBound` deleted from the
legacy index. Closed PH now WARNS that the value bound is not enforced there
(dormant-flag law) instead of silently ignoring the toggle.

**E17's known gap closed:** no route enforces legacy-g under an R display anymore.

## E20 — consolidation: the direction contract on all eight routes; the editor is legacy-free for every CP drag (2026-07-04)

**1. The E16 lesson generalized.** algebraicAllCPSweep.test.ts drags EVERY control point
of all six algebraic routes (polynomial/rational/complex-rational × open/closed) through
the real store route, 3 ticks, 50px pull. Measured at landing — all healthy:
    bspline   open 40.9 (min 24.7)   closed 42.4 (min 30.2)   [median along, px]
    rational  open 38.2 (min 14.6)   closed 36.5 (min 26.5)
    complex   open 44.2 (min 23.9)   closed 39.5 (min 28.0)
No backward movers, no flyers. With the two PH sweeps, ALL EIGHT drag routes now carry
the same pinned contract: every CP follows the mouse. A CP that cannot move also fails
the pin — the warn+drop path firing IS a routing regression, and this is its alarm.

**2. Plain PH tracking → core.** trackOpenPHPlain: a damped Gauss-Newton on the weighted
tracking objective — no constraints, no barrier (the TR barrier cannot run with zero
constraints; plain tracking needs none). Legacy weights. The editor no longer calls
optimizePHCurve AT ALL — every control-point drag in the editor, constrained or plain,
runs on core. optimizePHCurve stays exported only for the fit tests; the legacy ledger
for #5 is now exactly: Farin drags (research-hard) + the AB/complex-rational/
real-rational PH variant drags.

Pinned: plain tracking follows the cursor <5px over a 108px drag and keeps the PH
metadata (openPHEditing.test.ts).

## E21 — structural scale: the envelope, the true error law, and the 450× floor (2026-07-04)

**Question (#18, F1's open task, E12's fix):** what is the principled per-coefficient
machine-zero scale for g's polygon — the replacement for the global 1e-12·max|g| floor
that E12-3 proved misclassifies genuine small coefficients?

**Built:** `core/structuralScale.ts` — the magnitude ENVELOPE: the same numerator
pipeline in absolute-value arithmetic (inputs |·|, subtraction → addition, derivative
p·(|cᵢ|+|cᵢ₊₁|)/h). Planar open/periodic + complex-rational open. Properties measured
(E21-1, pinned live): SOUND everywhere (s ≥ |g|, all fixtures); prices the knot-driven
amplification per-coefficient (envelope range 2.7e14 on clustered knots vs 16 uniform —
F1 quantified); and exposes g's cancellation depth (|g|/s ~ 1e-6…1e-8 median).

**REFUTED (E21-2a, pinned as a negative result):** the envelope as a NOISE CLASSIFIER.
At the E13a violating tick, specimen #225 (exact-oracle-verified GENUINE sign carrier,
|g| = 3.4e3) sits at |g|/(ε·s) = 7.7e-5 — the envelope calls it noise HARDER than the
global floor does (1.3e-1). Why: worst-case error propagation is wildly pessimistic
through this pipeline — real neighbor differences carry the smoothness factor at each
of the six derivative levels, and fp subtraction of nearby values is near-exact
(Sterbenz), so true roundoff does NOT compound the way the envelope assumes.

**THE TRUE ERROR LAW (E21-2b, BigInt oracle, all 725 coefficients at the violating
pre-state; lab test kept, skipped):**

    predictor            C = max errᵢ/predᵢ   median
    (a) ε·max|g| global      9.0e0            3.1e-1     ← THE model
    (b) ε·envelope sᵢ        2.1e-7           1.1e-8     (5e6× pessimistic — refuted)
    (c) ε·spanMax|g|         1.8e4 (at #225)  2.9e2      (locality UNDER-predicts)

The per-coefficient error is UNIFORM-ABSOLUTE: errᵢ ≈ (0.03…9)·ε·max|g|, set by the
global largest intermediates, independent of the coefficient's own span. Specimen #225:
true err 0.70 vs |g| 3.4e3 — its sign is solid by 5000×. And: **zero exact structural
zeros among all 725** — at this state the entire "structural-zero class" is an artifact
of the floor's height.

**The floor verdict:** true noise ceiling ≈ 9·ε·max ≈ 2e-15·max. SIGN_NOISE_REL = 1e-12
sits **~450× above the actual noise** — that excess IS the misclassification corridor of
E12-3 (its 2.6e7-unit margin at #225). The honest constant is ~30·ε ≈ 7e-15 (say 1e-14
with margin).

**The A/B that keeps us honest (E21-3):** lowering the floor to 3e-14 changes NO
tracking — ipopt column 46/17/6 → 46/16/7 (its collapse is step strategy, already
superseded: the TRUST-REGION engine tracks the same column 95/88/81 stock AND at 3e-14,
bounds held). Full suite at 3e-14: **406/407 pass** — the single failure is
slideDiagnostics' manufactured knife-edge state no longer classifying as a knife edge
(diagnostics calibration, not a law).

**So the floor fix buys HONESTY, not speed:** no phantom "structural zeros", no
450×-inflated margin corridors, no enforcement leaning on a fiction — Law 3 hygiene at
scale. It costs one diagnostics recalibration and touches every robust-sign consumer
(display, markers, enforcement — one constant, one metric, everywhere).

**Still open, now sharply separated from the floor:** (1) the E12-2 knife edge is
INPUT-sensitivity at a genuine merge (the exact value passes through zero; 1-ulp input
jitter legitimately flips it) — hysteresis or exact structural knowledge remains the
open design question there; (2) span-derived normalization for solver CONDITIONING
(row scaling) is untouched by this result and remains a separate lever; (3) whether
ε·max should use a cheap running max-intermediate estimate instead of max|g| (C would
tighten below 9).

## E21-LANDED — the honest constants in production (2026-07-04)

Eric's call: floor to 1e-14. Landed: `SIGN_NOISE_REL 1e-12 → 1e-14` (comment now cites
the E21 measurement instead of a guess) and, for consistency, `MARGIN_REL 1e-9 → 1e-13`
(the old margin corridor was ~5e5× the true noise ceiling — wide enough to hide the very
crossings E12-3 dissected).

**Two specimens HEALED at the root — the strongest validation the change could get:**
- the E13a violating tick no longer occurs (labE21 now PINS the heal: 15 raw ipopt
  steps, no bound violation — "the corridor is gone" is a regression test);
- the F11 dead tick (slideDiagnostics' 15-tick specimen) no longer violates either —
  the same drag in 4 coarse ticks still genuinely overshoots (raw 6>2, guard α→0,
  4 knife-edge coefficients), and THAT is the diagnostics specimen now pinned. The
  knife-edge detector itself moved from an ε-nudge to the full rejected step (the
  instant-flip trick only worked inside the fat noise band).

**One honest cost:** knotInsertionFreedom's canary recalibrated 70% → 63% (measured 67%):
phantom "structural zeros" are now real constraints — the cage is slightly tighter
because it stopped ignoring real walls. Bound behavior unchanged everywhere else;
full suite 405 green.

F1's textbook entry updated: classification half RESOLVED (with its own hypothesis
corrected — the error law is absolute, not span-shaped); conditioning half (span-derived
row scaling) remains the open lever.

## E22 — row scaling: a proven no-op for the production engine; a 27× lever for ipopt (2026-07-04)

**Question (#26, F1's conditioning half):** does span-derived / envelope row scaling
improve solver step quality?

**Theory first:** with honest margins ≈ 0 (E21), the log barrier is scale-invariant per
row — ∇log(f/s) = ∇f/f, the scale cancels in the barrier gradient AND Hessian term by
term. Prediction: row scaling cannot move the trust-region trajectory at all.

**Measured (rowScale ∈ {robust, none, envelope} × {TR, ipopt} × 3 fixtures, 15-tick
drags):**

    TRUST-REGION: uniform n=16  87.9 / 87.9 / 87.9
                  uniform n=32  81.0 / 81.0 / 81.0
                  clustered n=24 97.4 / 97.4 / 97.4     ← invariance CONFIRMED, all cells
    ipopt:        uniform n=16  17.0 / 12.0 / 12.1
                  uniform n=32   5.2 /  6.2 /  4.9
                  clustered n=24 2.2 /  7.1 / 59.5     ← the envelope's 27× cell

**One experimental trap worth recording:** the first A/B contaminated scale with
MARGINS — modes with margin 0 collapsed to 0% on clustered knots, not because of
scaling but because a noise-class row with zero margin starts at f = 0 exactly and the
barrier can never accept a step. Margins equalized across modes (same absolute slack,
converted to each mode's units) → the pure-scale comparison above.

**Verdicts:**
1. F1's conditioning worry does NOT apply to the production engine's row space —
   proven (barrier algebra) and measured (identical trajectories). No production change;
   default stays 'robust'.
2. The envelope earns its keep as a LEVER for slack-based solvers: ipopt's
   FTB/filter/complementarity read raw f values, and envelope scaling equalizes the
   knot-driven range exactly where F1 predicted (clustered 2.2 → 59.5%). Documented as
   `rowScale: 'envelope'` (experimental), relevant only if an ipopt-class solver
   returns to a hot path.
3. ipopt's UNIFORM-knot collapse is untouched by any scaling — step strategy (E13a),
   already superseded by the TR engine.

Pinned live (labE22.test.ts): TR tracking identical across the three regimes on a
uniform and a clustered cell — if a future margin/barrier change silently reintroduces
scale sensitivity, this alarm fires. F1 is now fully closed: both halves resolved by
measurement.

## E23 — probe-and-keep knot insertion: OBSOLETE by measurement (task #8 closed, 2026-07-04)

The premise ("drag stalls → insert a knot to free the curve") was minted in the
ipopt-stall era. Measured on the trust-region engine (15-tick drags):

    7-CP historical stall shape:  no-insert 95%   +knot@0.375  94%   (no headroom left)
    32-CP uniform cell:           no-insert 81%   +knot near drag 64%   (insertion HURTS)

Post-TR there is no stall to free, and a new knot REFINES g's polygon — more Bézier
coefficients → more active rows → a tighter loose cage. The palliative became a tax.
Task #8 closed without building the UI; F10 (insertion legality) remains a valid fact,
and user-driven insertion for *shape* freedom is untouched — what died is insertion as
a STALL remedy. (If #28's tight B-spline polygon lands, revisit: on the minimal polygon
insertion is count-neutral by construction.)

## E24 — the seam projection tax, paid off: the closure-aware objective (2026-07-04)

**E16's leftover:** the ∮w²=0 projection is objective-blind; at the seam CP (k=45) it
returned ~2/3 of each pass's progress (+6.6px on a 50px pull vs 20–35 elsewhere).

**Fix:** the closure gap ∮w² IS the curve's endpoint displacement gap in curve units —
so it rides the tracking objective directly as a soft penalty ½λ‖gap‖² (exact gradient
via closureJacobian folded to the free seam coordinates; two rank-1 GN terms). The
solve stays near the closure manifold; the exact projection afterwards has less to
undo. The decoupled design is UNCHANGED — closure is still restored exactly by the
projection; the objective just stops pretending it won't happen.

**λ dose-response (3-tick 50px pulls; k=45 seam, k=42 near-seam, k=7 interior):**

    λ=  0:  k45  6.6   k42 31.7   k7 23.7    (the tax)
    λ=  2:  k45 13.0   k42 26.7   k7 23.6
    λ= 10:  k45 18.9   k42 22.2   k7 23.6
    λ= 50:  k45 22.1   k42 19.9   k7 24.5    ← chosen: seam region EQUALIZED
    λ=200:  k45 22.4   k42 19.4   k7 24.5    (saturated)

The seam CP recovers 3.4×; its neighbor pays some back; the region's spread collapses
from 6.6–31.7 to 19.9–22.1 (the worst-CP criterion — uniform feel — is what the E16
sweep contract measures). Interiors untouched. Wired in the store at λ=50; all-CP
sweep, display-metric, editor pins green; E14-PROD bench 83% unchanged. Article §9.3
graduates from open problem to result.

## E25 — the false bound, and the floor's demotion to slack (2026-07-04)

**How it was found:** Eric doubted task #28's premise ("the tight count comes from the
coarse product-algebra polygon") — and he was right by his own mathematics: knot
insertion is corner cutting, hence variation-diminishing, so REFINEMENT tightens S⁻;
the coarse polygon is the looser one. The bound-gap census then showed the open bound
is ALREADY TIGHT on ordinary curves (S⁻ = Z exactly, three of four fixtures — task #28's
"10 vs 6" premise is gone)… and exposed the real disease on the fourth: clustered
knots, S⁻(displayed) = 14 while raw crossings = 25.

**The oracle verdict (labE25, BigInt):** exact polygon count 25; ALL 525 double signs
correct; 0 exact zeros; the 296 sub-floor coefficients carry errors ELEVEN ORDERS below
their own magnitudes. The floor-based sign smoothing (assignSignsNeighbor) was erasing
11 REAL sign changes — the displayed AND enforced bound was FALSE (Law 1's one test
failed, in production, reachable by user knot clustering, and OLD: the pre-E21 floor
erased more). The error-law nuance vs E21: ε·max is the worst case, but errors are
LOCAL where magnitudes are local — "structurally tiny" (wide spans, F1's h-scaling) is
not "unresolvable".

**Eric's design call, after discussion:** loose is true — the floor stops rewriting
signs. His sharpened requirement, and why it survives: the displayed number must NEVER
tick +2 during editing — and that guarantee was never the floor's (E12-2 measured the
ROBUST count flickering 15↔17 under ulp jitter at a parked merge!); it is the
MECHANISM's (Theorem 2: actives held, anchors forbid the all-flip, free interiors only
merge, guard backstops slip). Markers may blink near a merge under a fixed S (Z free
within the bound — the intended semantics); S itself moves only monotonically.

**Landed:** assignSignsNeighbor = raw strict signs (only EXACT zeros take a neighbor
sign — for the enforcement slot; adds no count). SIGN_NOISE_REL survives solely as
margin slack (structuralMarginsScaled) + the inert row scale. The robust marker
classifier is now the identity (kept as an alias). **Suite fallout: ZERO — all 408
tests pass unchanged**; post-E21 the smoothing carried no load on ordinary curves, its
only remaining effect was the erasure. The clustered specimen is the live pin (S = 25 =
exact, ≥ markers). CLAUDE.md corrected in two places: the backward #28 paragraph, and a
new forbidden-list entry (sign-rewriting floors).

**Task #28/#7 rescoped:** the tight-bound task is CLOSED as refuted (bound already
tight; the folklore gap was this bug). B-spline product algebra (merged knots /
Patrizi) remains interesting for REPRESENTATION (fewer coefficients, no boundary
duplication, exact continuity encoding) — a quality item, not a bound item.

**Article impact:** §6 (the honest zero) gains its strongest specimen — the floor that
was measured honest in E21 still had one dishonest JOB, and removing the job (not
retuning the constant) is what the laws demanded. §9.1 (tight open bound) is RESOLVED
as "already tight; the gap was an artifact".

## E26 — the complex Farin drag, dissected: a semantics fork, not a solver problem (2026-07-04)

**Eric's two questions.** (1) Does the old disease — Farin points converging onto control
points during CP drags — still exist? (2) Can the bound-preserving Farin DRAG be done?

**(1) CURED, structurally.** Under core CP drags (open AND closed complex) the complex
Farin ratio λ = (q−z₀)/(z₁−z₀) is invariant to 1e-14 over a 114px drag — the fixed-weight
design gives complex curves exactly the medicine Eric's ratio-fix gave rational ones.
The convergence disease REQUIRED free weights; core froze them. Pinned (labE26 probe).

**(2) The reduction, and what it revealed.** Farin point q = (w₀z₀+w₁z₁)/(w₀+w₁)
determines the COMPLEX edge ratio r = (q−z₀)/(z₁−q) in closed form, so dragging Farin i
is a 2-real-DOF problem: suffix scale s (weights j ≥ i+1 scale by s), keeping every
other edge ratio — hence every other Farin point — EXACTLY fixed. Built as
core/farinDrag.ts with three successively-smarter navigators:
    TR barrier on sliding rows:        11–14%   (blocked at the FIRST row flip)
    straight-q pullback + bisection:    0–28%   (lands ON the frontier; next tick wall-locked)
    count-guarded wall-following walk: 12–28%   (Law 2 enforced DIRECTLY on the raw count;
                                                 count-neutral crossings pass free)
The cage probe explains the ceiling: along the pull, active rows flip in COUNT-NEUTRAL
PAIRS (extrema sliding along the curve — legal, and the row-wise sliding surrogate
forbids it, which is why the barrier attempt sticks at the first flip), and the TARGET
configuration itself costs bound 7 > 5 — full tracking is infeasible BY LAW.

**The decisive measurement.** Legacy's farinPoint mode tracks 59/69/58% (raw bound
held) — but its variable set is THE WHOLE CURVE: control points drift ~20px and the
other Farin points ~15–18px under a "weight handle" drag. Reshape-don't-block applied
in weight space. The pure-weight manifold does not CONTAIN those states — the 4× gap
is semantics, not solver quality.

**The fork (Eric's call, pending):**
  A. PURE-WEIGHT: predictable, conservative (nothing else moves), honest early stop at
     the manifold's feasible limit. 13–30ms/tick. Prototype ready to wire.
  B. RESHAPE on core: CurvatureDragProblem + 2 weight variables on the TR engine —
     legacy-level tracking expected with modern machinery, CP motion inherent.
  C. HYBRID: A first; blend in B only when A's frontier is reached.

**Methodology note for the article (§3/§6):** the count-guarded walk is the first place
we ENFORCE Law 2 directly on the raw count (the displayed metric itself) instead of
through the row-wise sliding surrogate — affordable at 2 DOF, and it cleanly separates
"the surrogate blocks" (row flips) from "the law blocks" (count increase). The cage
probe's count-neutral pair flips are a measured phenomenon the sliding mechanism's
sufficiency proof does not exploit — a possible route to a LESS conservative legal
active set at higher DOF (open research).

## E26-CORRECTION — Eric corrects the surrogate story; the blockers are recruitment and small anchors (2026-07-04)

Eric challenged E26's "pattern translations are forbidden by the row surrogate": the
mechanism frees the WHOLE maximal alternating sequence except the one largest-|g|
anchor — not merely "interiors" — so a translation whose flips stay inside a freed run
is perfectly legal under the rows. He is right; the classification probe
(labE26WhoBlocks) confirms it: the freed run member (#106) flips freely.

**What actually blocks (measured):**
- RECRUITMENT (#92, #107–111): the pattern's leading edge must flip a coefficient that
  currently sits inside a same-sign block — always ACTIVE regardless of magnitude.
  Extrema sliding into fresh territory pay one held row per slot.
- SMALL ANCHORS (#91, at 6.9e-4·max): "largest of its run" can be globally tiny when
  the whole run is a low-amplitude alternation; the anchor rule then pins a
  coefficient the motion needs.

**The refined picture:** per-tick re-reads let the front advance ~one recruitment per
tick, so the row solver CRAWLS (11–14% over 8 ticks) rather than freezes; the
count-guarded walk (recruitment is free there) reaches only 12–28% — the two land
close because on this pull the deep limit is the BUDGET (the target costs bound 7
against 5), not the surrogate. The open-research idea sharpens accordingly: the win
from a translation-aware active set (or intra-tick re-read rounds — each round's
monotonicity composes, so Law 2 survives) is the RECRUITMENT rate, worth at most the
gap between the crawl and the walk on recruitment-limited pulls.

## E26-C — the anchor knob: the Farin semantics fork is a CONTINUOUS dial (2026-07-04)

Built the single anchored solve C proposed after Eric's question (ratio + all CPs on
the TR engine, Tikhonov anchors, drag weight 10, raw-count guard). The anchor weight
sweeps a clean Pareto front between the two semantics (8-tick 43px pulls, edges 2/4/6,
bound held at EVERY cell):

    anchor     f2    f4    f6     CP drift
    A (pure)   12%   28%   12%    0 px
    10000      11%   21%   11%    0.2–2.8
    2500        7%   42%   14%    0.9–6.3
    500        13%   50%   39%    5.9–11.3
    100        17%   64%   64%    8.9–15.3
    20         53%   77%   72%    12–21
    legacy B   59%   69%   58%    ~20

Readings: (1) anchor≈20 REPRODUCES legacy's reshape semantics on core — tracking at or
above legacy with comparable drift, bound held by modern machinery; the reshape option
no longer needs the legacy optimizer. (2) anchor→∞ recovers the pure-weight drag —
the two semantics really are endpoints of one dial. (3) One solver quirk measured and
recorded: anchors BELOW ~20 make everything WORSE (weak anchors leave the GN objective
nearly rank-2 → the solve wanders; the anchor is regularizer as much as semantics).
(4) f2 is the hard edge (noisy middle range — lab-grade FD Jacobian; production would
use the exact CBDual columns already prototyped in farinDrag.ts).

**The decision is now one number.** Recommendation if wanted: anchor ≈ 100 (substantial
tracking recovery at roughly half of legacy's drift), or expose stiff/loose as a UI
choice. Awaiting Eric's pick; production build = exact Jacobians + store wiring +
closed/wrapWeight handling (task #29).

## E26-C-TRIAL — the anchored Farin drag wired for Eric's feel-test (2026-07-04)

Eric asked to try it in the editor. Wired:
- **Complex Farin points are VISIBLE again under preserve** (they were hidden when the
  bound was on because no bound-preserving Farin drag existed — it does now).
- **OPEN complex Farin drag under preserve → core `slideComplexFarinAnchored`**
  (anchor 100 = the measured balanced point; raw-count guard inside the solve; failure
  warns + drops the tick). CLOSED stays on the legacy path unchanged (wrapWeight/
  stored-farinPositions semantics not yet ported).
- Store pin: complexFarinEditorDrag.test.ts (follows the pull, bound never rises,
  handle alive).

Feel knob for the test: `anchorWeight` in sceneStore's moveFarinPoint complex branch —
100 now; 20 ≈ legacy reshape, 1000+ ≈ pure weight handle. Trial-grade FD Jacobian
(~fine at n≈10; the exact CBDual columns are the production upgrade if the semantics
is kept). Suite green (411).

## E26-C-RATCHET — why the Farin point glued to the control point, and the cure (2026-07-04)

**Eric's report from the trial:** same old disease — the Farin point slides to the next
control point and parks there. Reproduced with a bound-resisted (perpendicular) pull,
then dissected through THREE formulations. The disease survived all but one, and each
survival taught the mechanism:

1. **s-chart (suffix scale):** d(q, nextCP) 12.5 → 1.5px, |s| → 28. A RATCHET: the
   approach is cheap (|s| grows, dq/ds ~ 1/s² — and the bound only ever merges as the
   prefix fades) and the escape impossible (vanishing derivative). Chart artifact +
   feasible-geometry artifact.
2. **λ-chart (the Farin coordinate — isotropic, no pole):** slower (19.6 → 3.1px) but
   SAME destination; return only partial. The chart was a contributor, not the root.
3. **Ray-constrained β + anchored CPs (no off-ray drift possible):** the disease found
   the third door — the CONTROL POINT traveled 23.7px TO the handle (making r explode
   from the other side). Drag-start anchors didn't stop it; a (log|s|)² degeneracy
   price didn't stop it. Root cause identified: **the barrier's analytic center sits at
   the degenerate ratio** — with ~170 rows and a small first-tick objective, t₀ = m/f0
   starts tiny and a 12-step budget never leaves the barrier-dominated regime; the
   solve walks toward the analytic center, and the analytic center is the faded-prefix
   configuration where every row is comfortably satisfied. The optimizer exploits
   DEGENERATION as constraint relaxation — legal by the letter of Law 1 (the count
   only drops), ruinous as editing.

**The cure that measures clean: the pure-weight count-guarded WALK** (no barrier — Law 2
enforced directly on the raw count per candidate):

    hostile perpendicular pull, 15 ticks:  perp progress 5.7px (the honest feasible
    limit), then PARK — d(q, nextCP) stable ~23px, |s| ≤ 1.17
    out-and-back:                          0.00px return error, 0.00px CP drift

The editor now routes the open-complex Farin drag to the walk (pinned:
labE26Ratchet + the store-level pin). The anchored-reshape variant stays in core,
UNWIRED, with the pathology documented at the call site — its Pareto bench numbers
(E26-C) were real but measured on toward-feasible pulls; sustained blocked pulls
degenerate it. Re-wiring it requires solving the analytic-center problem first
(t₀ init / budget / a degeneracy-aware barrier).

**The general lesson (article §6-adjacent, worth stating):** a barrier method inherits
the VALUES of its feasible set's interior. When degeneration RELAXES the constraints —
as fading weights relax the count cage — the analytic center is degenerate, and any
under-converged barrier solve drifts toward it. Eric's old designs implicitly knew
this: every good behavior in this system came from NOT letting an optimizer choose
weight magnitudes freely.

## E26-C-PERF — the walk at editor speed (2026-07-05)

Eric: works, but a little slow. Profiled: the walk was slowest exactly when PARKED —
a fully blocked tick paid the whole direction fan (~50 count evaluations) to conclude
"stay put", and every evaluation ran the dual pipeline with ZERO tangents (~3× a plain
numerator for nothing). Two fixes: value-only evaluation (plain Chen numerator) and a
24-evaluation per-tick budget (ticks repeat at pointer rate — exhaustive exploration
per tick buys nothing).

    easy tick:    2.7ms → 1.6ms
    blocked tick: 38.2ms → 4.3ms   (9×)

Behavior contract unchanged (ratchet pin: park, 0.00px return, 0.00px CP drift;
tracking 10/24/11 ≈ the manifold ceiling; bound held). n=10 fixture — cost scales with
the numerator build, so larger curves stay proportional.

## E26-CLOSED — the Farin walk on closed curves: the monodromy absorbs the ratio (2026-07-05)

Eric's trial was on CLOSED complex curves — only the open case had been wired. The
closed extension needed one structural idea: on a cycle, the edge ratios MULTIPLY
around the loop into the monodromy ρ, so "change one ratio, keep the others fixed" is
impossible within the weight chain alone — the change must flow into ρ. Realization:
scale the suffix weights AND wrapWeight by the same s (ρ ← ρ·s); every other edge
ratio — including the wrap edge's when the drag is interior — stays exactly fixed. A
wrap-edge drag scales ONLY wrapWeight. The count is the periodic numerator with the
LIVE ρ, counted cyclically; the same park/return walk contract as open.

Wired in the store (closed branch of moveFarinPoint); farinPositions recomputed from
the new weights (the stale stored list is stripped first — it is the closed chart's
source of truth). Pinned store-level: interior edge AND the wrap edge, along-edge
pulls track >5px of 20px with the cyclic raw bound held every tick; a perpendicular
pull parks honestly (measured 1.7px — the feasible limit, not a bug).

**Ledger note:** this removed the store's LAST calls to optimizeComplexRationalCurve /
applyComplexRationalOptimizeResult — the legacy complex optimizer is no longer
imported by the editor at all. ComplexRationalBSplineCurveProblem remains only as a
test subject (complexRationalBoundPreservation) — #5's Farin blocker is RESOLVED for
complex; rational Farin (optimizeRationalFarinCurve) is now the only legacy drag the
editor still calls.

## E27 — rational Farin on the 1-D walk; the fork-2 deletion finally lands (2026-07-05)

**The drag:** the rational Farin handle is one real ratio t = w₁/(w₀+w₁) on its edge,
so the walk collapses to a 1-D count-guarded bisection toward the target t — no
lateral directions exist, hence no substitution and no ratchet BY CONSTRUCTION (the
complex case's diseases are geometrically impossible in one dimension). Closed: the
wrapWeight scales along (monodromy), wrap edge included. Wired under preserve; pinned
open + closed + wrap edge (t advances, bound held every tick, raw/cyclic).

**The deletion (the fork-2 blocker, unblocked by E26+E27):** with both Farin drags on
core, the editor makes NO rational/complex legacy calls. Deleted (−2,393 lines):
`ComplexRationalBSplineCurveProblem` (~900 — the class the 2026-06-27 audit could not
remove because its Farin mode was load-bearing), `RationalBSplineCurveProblem`,
`PeriodicRationalBSplineCurveProblem`, the four optimize/apply functions and their
option/result plumbing, and two legacy-pinning tests whose numbers live in the
notebook. Suite green (411).

**The remaining legacy island (Eric's port-vs-contain decision pending):** the PH
variant families — optimizeABPHCurve / optimizeComplexRationalPHCurve /
optimizeRealRationalPHCurve + their problem classes — plus optimizePHCurve (fit tests
only; the editor never calls it) and InteriorPointOptimizer, which leaves when its
last problem does. Every mainline drag — 4 algebraic families × 2 topologies, open +
closed PH, both Farin kinds — is core-only.

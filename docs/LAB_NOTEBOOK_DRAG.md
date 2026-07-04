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

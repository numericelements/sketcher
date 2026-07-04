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

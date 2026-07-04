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

### Next: E10 — why does core's IP fail where Eric's TR succeeds, given both have trust regions?
Core's InteriorPointOptimizer HAS a dogleg trust region. The remaining differences to
dissect one at a time on the SAME core problem: (i) barrier placement — Eric barriers the
CONSTRAINTS directly (log(−f), iterates strictly feasible by the shrink loop); core
barriers SLACK variables (iterates may sit at slack≈0 where the model degrades); (ii) the
merit/acceptance rule — Eric's ρ on t·f0 + barrierValue vs core's filter/SOC machinery;
(iii) the t-schedule; (iv) sliding-state update cadence (Eric: every accepted step; core:
per outer iteration — E8 toggles the adapter's updateConstraintState to check this alone).

## Conclusions (running)

1. **The 91-vs-47 gap is a SOLVER property, not formulation, not DOF, not numerics.**
   (E1: weights pinned → 96%; E7: his solver on core's problem → 92%; code reading:
   inactive-set rules identical.)
2. **Within his solver, the trust-region subproblem + strict feasibility is the
   load-bearing pair; the log barrier alone fails** (E9: his line-search variant → 18%
   with Cholesky failures — same collapse mode as core's solvers).
3. Mechanism picture so far: near the knife-edge coefficient the (barrier) Hessian is
   near-singular. Solvers that need a well-conditioned factorization (Cholesky line
   search, core primal-dual, core IP under its acceptance rules) either take garbage
   steps (→ infeasible, guard kills them) or shrink to nothing (δ collapse). The TR
   subproblem extracts a useful restricted step from the SAME near-singular model, and
   the feasibility shrink guarantees it lands strictly inside — no dead ticks, steady
   91%+ tracking.

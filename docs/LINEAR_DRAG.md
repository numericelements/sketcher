# Linear-complexity interactive drag (curvature-extrema control)

Where the interactive drag stands on per-frame complexity vs the number of control
points `n`, what the Rust `ne-core` blueprint achieves, and the concrete path to get
the TypeScript live drag from its current super-linear cost to `O(n)`.

A **drag frame** = one constrained interior-point solve (a few Newton iterations).
Each Newton iteration = **assembly** (constraint Jacobian/Hessian) + a **linear solve**
of the Newton/KKT system. Linear-per-frame needs BOTH to be `O(n)`: a banded/arrowhead
solve (not dense Cholesky) AND local/seeded assembly (not dense FD).

## The question
Is the drag linear in `n` for all curve kinds? Can the TS side get there?

## Measured TODAY (TS), ms per frame, curvature-extrema control ON

Cross-curve, open, current live drag (sketcher dense IPOPT):

| CPs | b-spline | rational | complex-rational | PH (new g, closed) |
|----:|------:|--------:|-----------------:|-------------------:|
|  30 |    67 |     526 |            2 132 |                132 |
|  60 |   457 |   2 944 |           13 527 |                508 |
|  90 | 1 544 |   8 546 |           32 346 |              1 242 |
| 120 | 4 083 |  21 708 |           63 496 |              2 461 |

Doubling `n` (60→120) multiplies time by ~9× (b-spline), ~7× (rational), ~5×
(complex-rational), ~5× (PH). **Nothing is linear; everything is ~O(n^2.5–3),
dominated by the dense Cholesky solve.**

PH closed, OLD rational g vs NEW low-degree g (the shipped win, see
`phCurvatureExtrema.ts`): 30 CPs 1316→132, 60 5071→508, 90 7813→1242, 120 12525→2461
(≈10× at small n, ≈5× at large n — a big constant factor, not a complexity change).

**Why PH < b-spline at large n:** PH optimizes the degree-2 *generator* (~38 vars for a
30-CP curve) not the curve (~60 vars); the dense solve is `O(vars³)`, so PH's smaller
system makes its solve ~4× cheaper and it scales better once the cubic solve dominates.
(At small n the b-spline wins: PH carries the generate→curve rebuild + an FD extrema
Jacobian as fixed overhead.)

## Rust `ne-core` — the blueprint (mostly linear)

| family | open | closed |
|---|---|---|
| polynomial b-spline | **O(n)** | **O(n)** |
| rational | **O(n)** | **O(n)** |
| complex-rational | **O(n)** | **O(n)** |
| **PH** | **O(n³)** | **O(n³)** |

The planar/rational/complex families are linear because Rust has all three pieces:
- **Banded LDLᵀ** for open (`banded.rs`, `O(n·b²)`, band width `b` fixed by degree).
- **Arrowhead/Woodbury** for closed (`cyclic.rs`): the seam is a low-rank corner, not a
  dense band — `s+2` banded solves + one `s×s` dense solve, `s = O(d)`.
- **Local/seeded assembly**: sparse `LocalColumn` (Chen) or a fixed-capacity sparse
  `Jet` (`JET_CAP=32`, NOT `n` tangents) → `O(n·d²)`.
- Plus a live **windowed solve** (`solve_windowed`, `windowed_tol=1e-8` set on every drag
  entry) → sub-`O(n)` for a *local* drag (window size set by drag locality, not `n`).

**PH is the exception even in Rust:** `PhDragProblem` never opts into `banded()`, so its
Newton step is a dense `O(n³)` Cholesky. PH *assembly* is `O(n)` (the sparse Jet); only
the solve is cubic. So PH is dense-solve-bound on both sides.

## TS current state — the gap

Net per-frame: **`O(n³)` for every live kind** (dense Cholesky dominates). Audit
findings:

- **Live drag uses the sketcher's own dense IPOPT** (`sketcher/optimizer/InteriorPoint-
  Optimizer.ts` → dense `choleskySolve`), for all kinds. `sceneStore` open-planar drags
  deliberately use `sketcher/optimizer/optimizeCurve`, NOT core `slideCurve`.
- **The linear pieces exist in `core/` but are off the live path:**
  - Banded LDLᵀ: `core/banded.ts` (`ldlFactorBand`/`ldlSolveBand`, `O(n·b²)`).
  - Banded optimizers: `core/barrierOptimizer.ts`, `core/bandedPrimalDual.ts`.
  - Local seeded gradients: `core/gradient.ts`
    (`curvatureExtremaGradientPlanarLocal`, `…PeriodicLocal`, `precomputePeriodicSeeds`),
    `core/curvature.ts` (`precomputeComplexPeriodicSeeds`).
  - Sparse local Jacobian: `PlanarCurvatureProblem.computeConstraintJacobianLocal`.
  - All reachable ONLY via `slideCurve method:'barrier'|'primal-dual'`, which is itself
    used only by the cs2026 talk demos — doubly removed from the live drag.
- **Missing entirely:** no `solveWindowed`; no arrowhead/cyclic solver for closed curves
  (closed has NO near-linear path — `banded = !closed`); the sketcher optimizer has no
  banded solver and emits dense full-width Jacobian rows; PH still uses an FD extrema
  Jacobian (`O(n²)` assembly) and a dense solve.

## Proof point — core's banded solver works (validates the whole direction)

`slideCurve` dense (`ipopt`) vs banded (`barrier`), open b-spline, curvature-extrema on
(same problem, only `method` differs):

| CPs | dense | banded | dense/banded |
|----:|------:|-------:|-------------:|
|  30 |   432 |    108 |        4.0× |
|  60 | 1 234 |    278 |        4.4× |
| 120 | 4 174 |    535 |        7.8× |
| 180 | 9 324 |  **529** |     **17.6×** |

Dense keeps climbing (super-linear); **banded flattens** (278→535→529 from 60→120→180 —
barely moves 120→180). Both land on the same curve (maxΔ ≈ 0.5% of curve width; the small
drift is the known "`barrier` can let the bound drift on a quick drag" gap). So the
linear machinery already in `core/` delivers — the remaining work is wiring, not
invention. **(But see the Step-1 finding below — "the remaining work is wiring" turned out
to be too optimistic for the bound-faithful part; it's solver engineering.)**

## Step 1 finding (2026-06): bound-faithful banded is solver engineering, not wiring

Attempted step 1; here is what it actually takes (so the next attempt doesn't repeat the
dead ends).

**Why the banded solvers drift (root cause).** Both `barrier` and `primal-dual` fail the
strict display-metric bound lock (`boundPreservationSession.test.ts`) on the hard case: a
parabola whose boundary g coefficient is a STRUCTURAL ZERO. On a quick drag that
coefficient gets parked on / nudged across its sign wall and the next frame's sign
re-snapshot reads it as a crossing → S⁻ +1. Only `ipopt` passes.

**How Rust avoids it (the blueprint).** Rust has ONE robust interior-point solver that is
also banded (robustness lives above the linear solve). It makes the sign-snapshot
structural-zero-proof: (a) `assign_signs_neighbor` — a |g|≤1e-9·max coefficient takes its
neighbour's sign, never its own noisy one; (b) sign-driven active set — it stays actively
held in a same-sign run; (c) an absolute feasible-side margin (slack = `margin − sign·c`,
margin = 1e-9·max|g|) so g≈0 starts off the wall but can't cross; plus an exact in-loop
recompute-and-reject. Rust hit our exact bug and fixed it (commits `d4ce3cc`, `005f779`;
the naive "drop near-zero from the active set" hack was tried and broke the guarantee).

**TS already has (a)/(b)/(c)** — `assignSignsNeighbor`, `computeInactiveSetBySign`,
`structuralMargins` (`MARGIN_REL=1e-9`) in `curvatureProblem.ts` — but they're gated to the
`ipopt` path only (`noScale: method === 'ipopt'`); the banded solvers run the scaled,
margins-0 regime.

**What was tried & measured.** Wiring the robust regime onto the banded path (`noScale` for
the open banded case) **made `barrier` PASS the bound lock** — the margins do work. BUT:
- It forces RAW constraints (no per-constraint scaling), because the scale floor
  (`SCALE_FLOOR_REL=1e-12`) is 1000× below the margin (`MARGIN_REL=1e-9`), so a scaled
  margin translates to ~1e3 and the structural-zero constraint becomes infeasible. The two
  constants are unit-incompatible — you cannot keep per-constraint scaling AND the margin.
- Raw constraints ill-condition the banded solve (g spans ~1e12), so `barrier` tracked far
  worse (~17 units off target vs ~2 for the reference) — it lacks `ipopt`'s trust region to
  handle the raw dynamic range. `primal-dual` still nicked the bound.
- A plain fraction-to-the-boundary line search in `barrier` did NOT fix the structural-zero
  case and hurt tracking (the same dead end Rust's `005f779` documents).

**Conclusion.** Step 1 is real solver engineering, not wiring: the banded path needs
`ipopt`-level step robustness ON RAW constraints (trust region / diagonal preconditioning
of the banded M), plus the margin/neighbour-sign machinery, in ONE solver — i.e. porting
Rust's robust-banded `interior_point.rs` architecture, not just flipping a flag. Confirmed
the fix DIRECTION works (margins → barrier faithful); the remaining blocker is the
raw-dynamic-range conditioning. Everything was reverted; nothing shipped from this attempt.

### Step 1b finding (the ipopt-side attempt — same wall, from the other direction)

Instead of making the weak banded solver robust, tried the cleaner-looking inverse:
make the already-robust `ipopt` solver BANDED (swap its dense Cholesky for a banded LDLᵀ).
Built and VALIDATED the banded trust-region solve as a self-contained helper
(`core/ipopt/bandedTrustRegion.ts` + `symBandMatVec` + a shared `doglegFromParts`; unit
test `bandedTrustRegion.test.ts` proves banded == dense `solveTrustRegion` on a
well-conditioned banded SPD matrix). Wired it into the ipopt inner loop behind a flag
(`bandedSolve`, default off; auto-gated to open/no-equality). Result:
- **Bound-faithful** everywhere (ipopt's robustness is preserved — the flag only changes
  the linear algebra). ✓
- But it **tracks worse**: ~14 units off vs dense on a *well-conditioned* wavy curve, and
  70–106 on the degenerate parabola. Root cause: ipopt uses RAW (`noScale`) constraints, so
  its barrier Hessian is ill-conditioned (g spans ~1e12) for ANY curve; banded-LDL is less
  numerically robust than dense-Cholesky there (the solve is regularization-dominated; LDL
  vs Cholesky give different steps; the trust region amplifies the difference). Adding
  per-pivot regularization to the band (matching dense Cholesky's `sum += reg`) helped
  (106→70 on the parabola) but did not close it.

**Same wall as 1a, confirmed from both sides:** the banded solve needs a WELL-CONDITIONED
Hessian, which needs Rust's SCALED-and-margined regime (per-constraint scaling for
conditioning AND structural margins for the structural-zero, reconciled).

### Step 1c — KEYSTONE CRACKED: the scaled-robust regime

The reconciliation that the scaled regime (well-conditioned, not faithful) and the raw
`noScale` regime (faithful, ill-conditioned) each got half-right: scale a STRUCTURAL-ZERO
active coefficient by **max|g|** (a normal-magnitude Jacobian row) instead of the `1e-12`
floor that blew it up, and put its margin in those scaled units (`scaleForRobust` +
`structuralMarginsScaled` in `curvatureProblem.ts`). Result — well-conditioned AND faithful:
- Open ipopt now runs this regime; the full suite is green and ipopt is still **0/75** on
  the structural-zero parabola bound lock.
- The banded ipopt solve (`bandedSolve`) on this regime is **0/75 bound-faithful** (matches
  dense, parabola and all) and **PER-SOLVE IDENTICAL to dense** (single-frame Δ ≈ 0 on a
  well-conditioned curve; `bandedIpopt.test.ts`). The 1b tracking gap is gone — it was the
  raw-regime conditioning all along.
- The opt-in banded `barrier` solver dropped from 18/75 → ~2/75 on the same regime (it's the
  looser fast option; banded ipopt is the faithful one).

**But the SOLVE was not the speed bottleneck (as `WINDOWED_SOLVE.md` warned).** Banded ipopt
is only ~1.0–1.2× faster than dense at 30–180 CPs, because ipopt still ASSEMBLES a dense
n×n Hessian and calls the dense `computeConstraintJacobian` every inner iteration — O(n²)
assembly dominates the O(n³) solve we removed. So the banded solve is the validated, faithful
*foundation*; the actual linear speedup needs the assembly to go sparse/banded too.

## Path to linear (leverage order)

1. ✅ **DONE — the well-conditioned bound-faithful regime + faithful banded solve** (Step 1c).
   The keystone reconciliation is solved and validated; banded ipopt is faithful + per-solve
   identical to dense. Behind the `bandedSolve` flag (default off) pending the assembly work.
2. ✅ **DONE — cheap assembly (the actual speedup).** Profiling found the per-iteration
   bottleneck was the curvature-GRADIENT computation, not the solve or the matrix format:
   the OPEN local gradient was O(n²) (rebuilt the per-CP Dirac seed + re-ran the full AD
   every build). Fixed by caching the geometry-independent seeds (`precomputeOpenSeeds`) and
   hoisting the analytic partials — `computeConstraintJacobianLocal` went 28.5→2.2 ms at
   n=180 (~13×, now ~linear; oracle `openLocalGradient.test.ts`). `computeConstraintJacobian`
   now scatters that O(n) local gradient instead of computing the dense O(n²) one.
   Measured `slideCurve` (ipopt, n=180): **dense 5068→1664 ms (3×); banded 4198→749 ms
   (6.8× vs the original dense)**, and banded/dense grows with n (1.0× at 30 → 2.0–2.8× at
   240). Faithful (0/75) + per-solve identical to dense throughout. The banded solve is
   behind `bandedSolve` (default off) pending wiring it into the live drag (sceneStore →
   core slideCurve).

   *Tried & reverted:* a FULLY banded assembly (`computeBarrierBand` building the Hessian as
   a SymBand directly, no dense n×n). It is the truly-O(n) path and was validated (per-solve
   identical, after fixing a lower-triangle double-count in symBandAdd), but at n≤360 it's
   SLOWER than the dense-Hessian-build + band-extract above — the dense n×n isn't the
   bottleneck at these sizes (the gradient was), so building the band entry-by-entry just
   adds constant overhead. It's the right architecture for SURFACES (large n, where the dense
   n×n O(n²) dominates); revisit it there with the per-entry overhead tuned.
3. **Arrowhead/cyclic solver for closed curves** — port `cyclic.rs`; closed has no
   near-linear path today.
4. **PH banded** — assembly is already cheap (low-degree g); give it an analytic/seeded
   extrema Jacobian + banded (interleaved-generator) ordering so the solve stops being
   dense. Greenfield (Rust hasn't done it either).
5. **Windowed solve** ([[windowed-solve-handoff]]) — only after the above; it makes the solve
   sub-`O(n)` for local drags but is a no-op until the solve is the bottleneck.

See also [[closed-curve-abstractions-to-preserve]], [[ph-drag-analytic-jacobian-finding]].
Cross-reference: Rust `crates/ne-core/src/{interior_point,banded,cyclic,analytic_*}.rs`.

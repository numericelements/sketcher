# Self-validating windowed solve for the barrier Newton step

Cross-reference for both the Rust (`ne-core`) and the TypeScript (`static-portfolio`)
implementations. `ne-core` is where this lever was developed first and is live
(`feat/windowed-drag-solve`). This doc is mirrored from `static-portfolio-rust/WINDOWED_SOLVE.md`;
the **TypeScript integration notes** at the bottom are specific to this repo.

## What it does

The interactive drag (interior-point: least-change objective + the curvature-extrema
bound) solves a banded Newton system `H·Δ = −g` every inner iteration — `O(n·b²)` for
`n` control points and band half-width `b`. But the drag response is **local**: dragging
one control point only perturbs a few nearby ones (B-spline support + the off-diagonal
decay of a banded SPD inverse, Demko's theorem). So instead of solving the full band,
solve only a **window of control points around the dragged handle**, grow it until it's
provably large enough, and the step costs `~O(window)` — window size set by the drag's
locality, **independent of `n`**.

Measured: the window stays ~5–8 control points regardless of curve size; on large curves
this turns a laggy drag snappy. Confirmed live in the sketcher (Rust).

## The subtlety that matters — step-stability, NOT a residual check

The obvious stopping rule — *grow until the residual outside the window is small* — is
**wrong**, and it produces **intermittent freezes**.

When you drag *into* a curvature constraint, that constraint's slack → 0, its `1/slack²`
barrier term blows up, and `H` becomes **ill-conditioned** (tiny `λ_min`). Then a small
residual does **not** bound the step error:

```
‖step error‖ ≤ ‖residual‖ / λ_min      (λ_min tiny near a binding constraint)
```

so the residual check accepts a **wrong** Newton step → the trust region rejects it →
the outer iteration stalls. (Hit exactly this; it only showed up interactively, dragging
hard into a tight curve.)

The correct criterion is **step-stability**: grow the window (×2) and stop when the
*step stops changing*:

```
‖x_w − x_{w/2}‖ ≤ tol · ‖x_w‖   ⇒   return x_{w/2}  (the converged, smaller window)
```

`‖x_w − x_{w/2}‖` measures `x_{w/2}`'s truncation error (the larger window ≈ truth), so
when it's below `tol`, `x_{w/2}` is the converged one — return it. This is
**conditioning-agnostic**: near a binding constraint the step keeps changing as the
window grows, so it correctly grows all the way to the full solve. No wrong steps, no
stalls.

## Algorithm (`SymBand.solveWindowed(rhs, reg, tol) -> (x, halfWidth)`)

1. `center = argmax_i |rhs[i]|` — the dragged handle (rhs is the handle pull/gradient).
2. `window(w)`: bounds `lo = max(0, center−w)`, `hi = min(n−1, center+w)`; extract the
   contiguous sub-band over `[lo,hi]` (within-window entries only) with `+reg` on the
   diagonal; LDLᵀ-factor it; solve `rhs[lo..=hi]`; embed into a full-length vector
   (zeros outside).
3. Start `w = 2·(b+1)`. Compute `prev = window(w)`.
4. Loop: if `prev` already covers `[0, n−1]`, return it (full solve). Else compute
   `next = window(2w)`. If `‖next−prev‖/‖next‖ < tol`, return **`prev`**. If `next`
   covers `[0,n−1]` (grew to full without stabilizing — a global response), return
   `next`. Otherwise `w ← 2w; prev ← next` and repeat.

Cost: `O(w·b²)` per trial window; geometric growth → a handful of trials; for a local
response `w` is independent of `n`.

## Where it plugs into the solver (TS analogues of the Rust files)

- **`core/banded.ts`** (`SymBand` / banded LDLᵀ): add `solveWindowed` per the algorithm
  above. Reference: `crates/ne-core/src/banded.rs::SymBand::solve_windowed`.
- **The interior-point solver** (`solveTrustRegion` for the Newton point, and the barrier
  assembly that computes the Newton decrement): add a `windowedTol?: number` config field;
  when it's set **and the Hessian is the banded planar case**, call `solveWindowed`
  instead of the full banded solve at **both** solve sites. Reference:
  `interior_point.rs` — `Config.windowed_tol`, `Hess::solve_windowed`, the calls in
  `solve_trust_region` and `compute_barrier`.
- **Dense and closed-curve (arrowhead) Hessians fall back to the full solve** — windowing
  only covers the open/banded path.

## How to validate (the residual bug passed naive tests — be thorough)

- **Unit:** on a synthetic banded SPD matrix with a *localized* rhs, `solveWindowed` must
  match the full solve and use `window << n`; on a *spread* rhs it must grow to the full
  solve and match exactly. Use a realistic **fast-decay** band (weak off-diagonals) so
  the local case is genuinely local.
- **End-to-end (critical):** run a real drag both ways (windowed vs full) and assert the
  converged control points match. **Include a HARD drag that binds a constraint** — that
  is the ill-conditioned case the residual check failed, and the only one that catches
  it. In Rust this matched the full solve to **rel-err 0**.
- The whole drag/parity suite must stay green with windowing **on** (in Rust: 100 tests).
- **Speed (this repo's added requirement):** a benchmark that proves the win — windowed
  vs full on a LARGE curve (e.g. 50–200 control points): assert the chosen window stays
  small (≪ n) for a local drag, and that windowed wall-clock per step is materially
  lower than full. Pair it with the accuracy parity above so "fast" can never be bought
  by "wrong." Report the numbers (window size, per-step time, n) so regressions are
  visible.

## Scope / not yet

- Open (banded) drags only; the closed-curve **arrowhead** path still full-solves
  (extending it needs the seam carried via a Woodbury/low-rank update).
- Optional optimization: **reuse the previous window's LDLᵀ factorization** when growing
  (incremental LDLᵀ by appending rows, or a Schur update of the unchanged inner block) to
  cut the non-local worst case from ~2–3× toward ~1× a single full solve.

## Reference implementation (Rust, `feat/windowed-drag-solve`)

| commit | what |
|---|---|
| `39d5949` | `SymBand::solve_windowed` |
| `dee72fa` | gated wiring into the Newton loop (`Config.windowed_tol`, default off) |
| `e8bb469` | **the step-stability fix** — read this one |
| `6917776` | enable for the planar drags (live-confirmed) |

The conceptual trail — why locality is the lever, the conditioning measurements that
pointed here, the dead-ends ruled out (algebraic equilibration is a no-op; ML surrogates
hit the active-set walls) — is on the `experiment/drag-surrogate` branch.

---

## TypeScript integration notes (static-portfolio)

Grounding for this repo (verified 2026-06):

- **`solveWindowed` goes in `src/core/banded.ts`**, built on the existing `SymBand`
  (`symBandZero`/`symBandAdd`/`symBandAddDiag`) + `ldlFactorBand`/`ldlSolveBand`.
- **The banded solve sites** are `src/core/barrierOptimizer.ts` (`ldlFactorBand`/
  `ldlSolveBand` at ~L161–162, the `M = H + Σ μ/w̃² JⱼJⱼᵀ` assembly) and
  `src/core/bandedPrimalDual.ts` (~L146–153). Add the `windowedTol?` config to whichever
  is the target and swap the full solve for `solveWindowed` there.
- **Important nuance — which drag benefits.** `core/curvatureProblem.ts::slideCurve`
  defaults to **`method: 'ipopt'`** — the robust trust-region solver in
  `src/core/ipopt/InteriorPointOptimizer.ts`, whose *main* Newton step is a **dense**
  `choleskySolve` (it only uses a banded LDLᵀ for the constraint Gram `A·Aᵀ`). The
  **banded** solvers (`'barrier'` / `'primal-dual'`) are **opt-in**, used for large
  curves and the method-comparison demo — and they're exactly where windowing pays off.
  So the first, clean port targets the **banded (opt-in) path**. Making the *default*
  ipopt drag benefit would additionally require giving its Hessian a banded
  representation (a larger convergence step toward the Rust `interior_point.rs` shape).
- **Fallbacks:** dense (ipopt main step) and closed-curve arrowhead (`cyclic`-style) →
  full solve, unchanged.
- **Live path / why it matters:** `core/` is the live drag engine (imported by
  `SketcherCanvas`, `BottomPanel`, `sceneStore`'s `slideCurve`, `MobileSketch`, and the
  cs2026 talk demos), so a banded-path speedup reaches real large-curve edits.

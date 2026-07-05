# The Ideas

The third document sits between the other two. **`CLAUDE.md`** is the *constitution* —
the laws that must always hold. **`docs/CURVATURE_FOUNDATIONS.md`** is the *textbook* —
durable facts about our objects. This document is the *contributions*: the small set of
**genuinely original ideas** this work rests on, written down so they can **emerge** in the
code instead of being buried in it.

These ideas are the **essential complexity** — the part that is irreducible because it is
the actual mathematics, our actual invention. Everything else is **accidental complexity**
and may be deleted freely. The recurring failure mode this document exists to prevent is the
**imposter simplification**: replacing one of these ideas with something that *looks* simpler
on the surface but is not the real idea. It feels like progress for about a week, then it
stalls, and the repair work makes the code messy. An imposter passes the easy test and fails
the hard one.

So each idea is written with the same anatomy, and the **invariant + pinning test together
are its definition**. If a change cannot name which idea it serves, or turns an idea's
pinning test red, that change is the alarm — stop.

> **Anatomy of an idea**
> 1. **The principle** — the thing we defend, in one line.
> 2. **What it really is** — plain statement, then the precise mathematics.
> 3. **The mechanism** — how it is realized (the deep module), in real vocabulary.
> 4. **The imposter to forbid** — the surface-simpler thing that is *not* this idea.
> 5. **The invariant** — what must stay true; the law-like guardrail.
> 6. **Where it lives** — the one home in the code (or where it should live).
> 7. **The pinning test** — the test that *is* this idea's definition.
> 8. **Open threads** — what is unfinished or not yet understood.

The ideas (this document is filled in one at a time, words first):

| # | Idea | Status |
|---|------|--------|
| I | **The Sliding Mechanism** | **drafted** |
| II | **The Seamless Loop** (lifting + monodromy) | **drafted** |
| III | **The Analytic Gradient** (exploit the structure) | **drafted** |
| IV | **The B-spline Algebra & Chen Simplification** | **drafted** |
| V | **The Barrier + Trust-Region Solver** | **drafted** |
| VI | **The General Method** (sign changes of a scalar field) | **drafted** |
| VII | **Real-Time at Scale** (O(n), and the hinge frontier) | **drafted** |
| VIII | **The Honest Zero** (sign integrity at the boundary) | **drafted** |

*(Naming already simplified the list: the old "spiral" and the "open/closed index
abstraction" were two names for one thing — they are now the single idea II.)*

---

## I. The Sliding Mechanism

*Our headline contribution. Idea VIII keeps its promise true in floating point; idea V is the
solver that executes it.*

### 1. The principle
**Editing never blocks. Each tick, re-read the active set from g's current signs — keep every
same-sign coefficient plus one anchor (the largest `|g|`) per alternating run active, and free
the run interiors to slide and merge — so the bound `S⁻` can only hold or drop, never rise.**
A point that won't move is a solver failure, not the bound doing its job. **Reshape, don't
block. Never freeze.**

### 2. What it really is
This is the guarantee the editor sells: drag a control point and the curvature-extrema count
can only hold or drop —

> `S⁻(after a drag step) ≤ S⁻(before)`   (Law 2)

The mechanism, each tick: take the signs of g's control polygon; walk its **runs** of
alternating sign; within each alternating run keep the single **largest-`|g|` coefficient as
an anchor** and leave the interior coefficients **free**; every same-sign coefficient stays
active. The only way `S⁻` could *increase* is the simultaneous "all-flip" of a whole run — and
the retained anchor forbids exactly that. The proof is **Theorem 2 of the St-Malo work**.

Why freeing only *interiors* is safe: a freed coefficient that flips can **merge** two sign
changes (two extrema collapsing into one) but can never **create** one — the
variation-diminishing argument (Law 1), and its closed analogue across the seam (the cyclic
walk). So motion drains extrema; it never manufactures them.

The decisive contrast is with **freezing**. Freezing pins coefficients and *blocks* the drag;
the mechanism re-evaluates the active set **every tick** (signs follow the current g, nothing
is pinned) and lets the rest of the curve **reshape** so the dragged point still follows the
cursor. Blocking holds the bound trivially and uselessly; the mechanism holds it *while the
point tracks*.

### 3. The mechanism (the deep module)
- `core/bernstein.ts` — `assignSignsNeighbor` (`:237`) gives each coefficient its honest sign
  (roundoff zeros resolved to a real neighbour — idea VIII); `cyclicSignChanges` (`:199`)
  counts `S⁻`, seam-wrapped for closed.
- `core/curvatureProblem.ts` — `computeInactiveSetBySign` (`:79`, open) and
  `computeInactiveSetBySignCyclic` (`:262`, closed): run detection + the largest-`|g|` anchor
  per run; the closed scan starts at a same-sign boundary so a run never splits the seam.
- **Per-tick re-evaluation** — `updateConstraintState` re-derives signs on the active set each
  frame (`curvatureDrag.ts:239`, `curvatureProblem.ts:748`, `complexRational.ts:694`,
  `phDrag.ts:120/264/513`): *"nothing is pinned."*
- **Sign constraints** that hold `S⁻` — each active coefficient as
  `gc[i]/scale − signᵢ·marginᵢ ≥ 0` (`computeConstraints`, `curvatureDrag.ts:175` and the
  per-family twins), the structural-zero margin keeping a `g=0` coefficient "a hair off its
  wall."
- **The slip correction (not a freeze)** — `enforceBoundNonincreasing(start, result, …)`
  (`curvatureProblem.ts:57`): if numerical slip let `S⁻` tick up, bisect along the *straight
  path* `start→result` and return the furthest point with `S⁻ ≤ start`. A clean solve is a
  no-op.
- Entry: generic `slide(kind, …)` (`curvatureDrag.ts:259`) and the per-family
  `slideCurve`/`slideComplexRational`/`slide*PH` (all post-guarded).

### 4. The imposter to forbid
**Freezing** — pinning control points, coefficients, or signs to hold the bound. It looks like
"enforcing Law 2"; it is the opposite — it blocks editing, which Law 2 forbids. Two subtler
forms of the same imposter: **(a)** baking the active set / signs at drag *start* and reusing
them every tick instead of re-deriving (a half-freeze — the editor's pre-baked
`dragConstraintState` field was **deleted** in the Tier-1 review; the active set is now derived
per tick everywhere); **(b)** a slip-correction pull-back that travels more than a hair — that
is a **solver-quality failure** wearing the mask of enforcement (the solve should have produced
a feasible *reshaped* curve in the first place).

### 5. The invariant
- `S⁻(after) ≤ S⁻(before)` at every tick, every family × topology.
- The active set is **re-evaluated each tick**; interiors are free; nothing is pinned.
- The **only** permitted correction for slip is the straight-path pull-back; if it does more
  than remove a hair, that is a solver bug, not the mechanism working.
- A point stops only at the **true feasible limit**, sitting at the reshaped feasible
  projection — never frozen short of it.

### 6. Where it lives
`core/curvatureProblem.ts` (`computeInactiveSetBySign[Cyclic]`, `enforceBoundNonincreasing`,
`PlanarCurvatureProblem`), `core/curvatureDrag.ts` (generic `slide` + `CurvatureDragProblem`),
`core/complexRational.ts`, `core/phDrag.ts`, `core/farinDrag.ts`; `core/bernstein.ts` (signs +
count). The legacy `sketcher/optimizer/` CP-drag and Farin entries have been **deleted** onto
this one; only the PH-variant island still runs its own drag.

### 7. The pinning test
- **Monotone bound.** `S⁻` is non-increasing across every drag step, every family × topology
  (`rustParityDrags.test.ts`).
- **Reshape, don't block (the two-pinned test).** The dragged point *tracks the cursor* **and**
  the bound holds — measured against the reference oracles; a stall fails it even though the
  bound is technically held.
- **Pull-back is a no-op on a clean solve** (`enforceBoundNonincreasing` returns `result` when
  `boundOf(result) ≤ startS`).
- **Extrema slide through the seam** on closed curves (the cyclic active set permits the merge).

### 8. Open threads
- **Solver quality is the permanent line of work** (CLAUDE.md). Every block/stall traces here,
  not to the bound; the fix is always to make the solver *reshape* (move more points), measured
  against the Rust oracle and the online sketcher — never a new clamp. See idea V.
- ✅ **Retire the pre-baked `constraintState` — DONE (Tier 1).** The editor's
  `dragConstraintState` field is deleted; every path derives the active set per tick.
- **Unify the PH pull-back (Tier 2)** — PH (`phDrag.ts`) and the Farin walks still use a
  hand-rolled bisection instead of the shared `enforceBoundNonincreasing`; route them through
  the one guard.

---

## II. The Seamless Loop

### 1. The principle
**A closed curve has no beginning, no end, and no special condition at the seam.**
Every parameter value is identical; there is no privileged point. Closedness is not a case
to handle inside an algorithm — it is a property of *how the curve is addressed*, and nothing
else.

### 2. What it really is
A closed curve is parameterized by a **circle** `S¹ = ℝ/ℤ`, not an interval. A circle has no
canonical origin, yet every concrete spline algorithm (de Boor, knot insertion, blossoming)
wants to march along a *line*. The naive resolution is to cut the circle at a seam and
special-case that seam everywhere. We refuse this. Instead we work on the circle's
**universal cover**.

Precisely:

- **Covering map.** `p : ℝ → S¹`, `t ↦ t mod 1`. The control indices likewise cover the `n`
  control points: `ℤ → ℤ/n`, `i ↦ i mod n`.
- **Deck transformations.** The integer translations `t ↦ t + 1` (equivalently `i ↦ i + n`)
  generate the **deck group** `ℤ`, which is exactly `π₁(S¹)`. Travelling once around the loop
  is the action of the generator.
- **The control net is a section of a flat line bundle over `S¹`.** Its only topological
  invariant is the **monodromy** (holonomy) of that bundle: a scalar
  `ρ ∈ ℂ*` — the image of the generator of `π₁(S¹)` under the **monodromy representation**
  `ℤ → ℂ*`, `1 ↦ ρ`.
- **What `ρ` records.** Lift one full turn and the homogeneous representative does not return
  to itself — it returns multiplied by `ρ`: `homAt(i + n) = ρ · homAt(i)`. After `q` turns
  (the **winding number** `q = ⌊i/n⌋`) it is scaled by `ρ^q`.
- **Why the drawn curve still closes.** The curve is the **projection** of the homogeneous
  representative (`c0/c1`, a point of projective space). Projection quotients out overall
  scale, so multiplication by `ρ` is invisible: the lifted representative *winds*, but its
  shadow on the plane is exactly periodic. `ρ` is the complete obstruction to the lift itself
  being periodic — nothing more is needed to remember "it was a loop."
- **The three families are the three bundles.** `ρ = 1` ⇒ trivial bundle (polynomial:
  the lift is genuinely periodic). `ρ ∈ ℝ*` ⇒ rational. `ρ ∈ ℂ*` ⇒ complex-rational, where
  `ρ` is a rotation-and-scaling — the lift winds in the weight plane.

This is also why few control points carry rich closed shapes: on the cover, the degree may
exceed `n`, because each de Boor step pulls indices through `i mod n` and *reuses* control
points as the support wraps. A non-trivial `ρ` adds the extra projective freedom (the seam
weight) that a naively-periodic representation lacks.

### 3. The mechanism (the deep module)
One accessor answers, for **any** integer index, "what is knot `i`?" and "what is the
homogeneous control point at `i`?" — with the wrap and the monodromy folded in. Every
recursion is then written **once** against it.

```
homAt(i) = ρ^⌊i/n⌋ · lift( controlPoints[ i mod n ] )        // core/indexing.ts:51–55
```

- `core/indexing.ts` — `Indexing` (the lifted accessor `homAt`/`knotAt`/`span`) and the
  single `deBoor`/blossom recursion that rides it. Open vs closed is *which `Indexing` you
  pass*, never a branch inside the algorithm.
- `core/coeffs.ts` — `Coeffs` (the coefficient field, orthogonal axis), with
  `scale`/`spow` realizing `ρ` and `ρ^q`, and `realSpiralRatio` / `complexSpiralRatio`
  computing `ρ = wrapWeight / w₀`.
- `core/evaluate.ts` — evaluation, one implementation for function / plain / rational /
  complex, open or closed, with `ρ` passed through.

### 4. The imposter to forbid
**Cutting the loop at a seam and special-casing it** — any `if (at the seam)` /
`if (closed) … else …` branch *inside* an algorithm (de Boor, knot insertion, the curvature
numerator, the slide). It looks simpler ("just handle the wrap-around explicitly here") and
it is the precise way the idea dies: the seam becomes a privileged point, extrema can no
longer slide through it, and open/closed code diverges. Closedness may live **only** in the
accessor.

### 5. The invariant
- Every spline algorithm is written once against `Indexing`; it contains **no** seam branch.
- The drawn closed curve is **independent of where the seam is placed** (the origin of the
  knot vector / the choice of index 0).
- The lift satisfies `homAt(i + n) = ρ · homAt(i)` exactly, and `project(homAt(i + n)) =
  project(homAt(i))` (the shadow closes) for every `ρ`.
- Setting `ρ = 1` and `closed = true` reproduces the polynomial periodic curve; an open curve
  is the same algorithms with the open `Indexing`.

### 6. Where it lives
`core/indexing.ts` (principle home), `core/coeffs.ts` (the field + `ρ`),
`core/evaluate.ts`, and every primitive that takes `Indexing`/`Coeffs`
(`insert.ts`, `elevate.ts`, the curvature numerators). The legacy
`sketcher/optimizer/` and `sketcher/utils/bspline/periodic.ts` paths predate this idea and
are the accidental complexity to be retired onto it.

### 7. The pinning test
The idea's definition, as tests:
- **Seam-invariance.** Relabel the seam (shift the knot origin / rotate which control point
  is index 0); evaluation, derivative, the curvature numerator `g`, and one drag step all
  yield the same curve. *No quantity may depend on where the seam sits.*
- **No seam branch.** A structural guard: the core spline algorithms contain no
  `if (closed)`/seam special-case (closedness only in `Indexing`).
- **Monodromy round-trip.** `homAt(i+n) == ρ · homAt(i)`; `project` of both is equal;
  `realSpiralRatio`/`complexSpiralRatio` invert `wrapWeight ↔ ρ`; `spow` is exact.
- **Open = closed-with-trivial-monodromy.** Closed polynomial (`ρ = 1`) matches the
  reference; the open path is the same algorithm with the open accessor.

### 8. Open threads
- **Fully understand the monodromy** (Eric) — make `ρ` concrete on the simplest case
  (a circle as a closed rational B-spline with very few control points).
- **`ρ = 1` limitation** in the current complex-rational core path — confirm and remove, so a
  non-trivial complex `ρ` works everywhere (the full idea, not the trivial-bundle slice).

---

## III. The Analytic Gradient (exploit the structure)

### 1. The principle
**The production gradient of `g` is the *analytic* one: computed in the B-spline algebra, by
hand, exploiting the structure of the problem to be as fast as possible — exact, local, and
reusing every shared subexpression.** Finite differences (FD) and automatic differentiation
(AD) are **universal witnesses**, present for *every* family so they can validate analytic
forever. They never become the production gradient.

### 2. What it really is
`g = ‖c′‖²(c′×c‴) − 3(c′·c″)(c′×c″)` is a fixed expression — sums of *products* of the
curve's derivative splines `c′, c″, c‴`. So `g` is itself a B-spline (a Bernstein
decomposition), degree `4d−6`, built from `derivative` and `product`. Its derivative w.r.t. a
control point `Pᵢ` is therefore an operation *in the same algebra*, with the exact seed

> `∂c/∂Pᵢ = Nᵢ` — the `i`-th basis function: a "Dirac" control net (all zeros, a single 1 at
> `i`), itself a B-spline **nonzero on only `d+1` spans** (compact support),

propagated by the product rule `(f·h)′ = f·h′ + f′·h`. There are three ways to do this, and
they form a **ladder of structure exploitation** — the same exact gradient, computed with
progressively more of the problem's structure used:

| method | exact? | exploits locality? | reuses shared value work? | hand-labor | role |
|---|---|---|---|---|---|
| **FD** (central difference) | no — truncation `O(h²)` + cancellation | no | n/a | none | dumb numerical oracle |
| **AD** (forward-mode over the algebra) | yes | yes (Dirac seed → support spans) | **no** — value & tangent are coupled, so the shared value side is recomputed per seed | low (write `g` once) | universal witness; temporary production stand-in where analytic isn't derived yet |
| **analytic** (hand-derived) | yes | yes | **yes** — value factors precomputed once, only the sparse `∂`-terms per column | high (derive per family) | **the contribution; the production gradient** |

The top rung is the idea. By hand,

```
∂g = ∂(‖c′‖²)·(c′×c‴) + ‖c′‖²·∂(c′×c‴) − 3[ ∂(c′·c″)·(c′×c″) + (c′·c″)·∂(c′×c″) ]
```

so the value factors `‖c′‖², c′×c‴, c′·c″, c′×c″` are computed **once** for the whole curve
and **reused** across all `2n` columns; each column computes only its sparse `∂`-terms on
`Pᵢ`'s support. AD cannot do this last step: it carries `(value, tangent)` together and
discards the value, so it recomputes the shared value side for every seed (in
`gradient.ts` literally twice per column, for `∂/∂xᵢ` and `∂/∂yᵢ`). That recomputation is the
speed the analytic method reclaims — "a lot of computation, but nothing beats it."

**Why it matters (it serves Law 2).** Solver progress is only as straight as the Jacobian is
accurate, and only as cheap as the Jacobian is fast. The analytic gradient is the lever that
lets the dragged point *track the cursor while the bound holds*, at interactive speed.

### 3. Why we keep FD and AD forever (the seatbelt)
The analytic gradient is **hand-derived**, so it carries a permanent bug surface: a sign slip
in a re-derivation for a new family, or in a refactor, is invisible to the type-checker. FD
and AD are computed a *completely different way*, so the standing cross-check
`analytic == ad == fd` (to tolerance) is what keeps a hand-built gradient **honest** (Law 3).
They are not hedging — they are the seatbelt that makes it safe to drive the fast engine.
Hence: **AD for every family**, exactly so analytic always has a validator.

### 4. The mechanism (the deep module)
- `core/gradient.ts` — `Dual { v, t }` whose `v`/`t` are `BernsteinDecomposition`s; `mul`
  implements `(f·h)′ = f·h′ + f′·h`; `gOverDuals` assembles `g` and its tangent; the planar
  `curvatureExtremaGradientPlanar(Periodic)` returns `g` and per-control-point columns on
  their support only. *(This is the `ad` rung — sparse, but recomputes the value side.)*
- `core/curvatureFamilies.ts` — `familyJacobian(kind, …, backend)` with the **swappable
  backend** contract `'fd' | 'analytic' | 'ad'` (the Rust shape): one face, analytic in the
  driver's seat, FD and AD beneath it for cross-validation.
- Complex / rational seeded-**analytic** columns —
  `curvatureExtremaGradientComplex(Periodic)FixedWeightCols` (compact-support columns with the
  value factors reused; weights held fixed during the drag).
- `core/curvatureHessian.ts` — the exact Newton **Hessian** is the same idea at second order
  (idea-adjacent; payoff measured under idea V).
- Rust homes (the oracles to port from): `analytic_gradient.rs`, `analytic_rational.rs`,
  `analytic_complex.rs`; `grad.rs` (`Jet`, AD witness); `gradient.rs` (AD oracle).

### 5. The imposter to forbid
**Shipping AD or FD as the *production* gradient** — "it's fewer lines, it's good enough."
That silently gives up the value-reuse (AD) or the accuracy (FD); it passes the gentle drag
and stalls on the hard one — the exact signature of an imposter. The dual imposter is the
opposite: **dropping the FD/AD witnesses** to "simplify," which removes the only thing keeping
the hand-derived analytic honest. Keep all three; only analytic drives.

### 6. The invariant
- The production gradient for **every** family × topology is the analytic one.
- **AD and FD exist for every family**, used only as cross-checks; if either is ever wired as
  the drag's gradient (except as the explicit temporary stand-in below), the idea is broken.
- `analytic == ad == fd` to tolerance, always.
- Each analytic column is supported **only** on its control point's spans, and reuses the
  once-computed value factors (local and full-width assemblies are bit-identical).

### 7. Where it lives
`core/gradient.ts`, `core/curvatureFamilies.ts` (`familyJacobian` + backends),
`core/curvatureHessian.ts`. The legacy per-family gradients in `sketcher/optimizer/` are the
accidental duplicates to retire onto this one.

### 8. The pinning test
The cross-validation *is* the definition:
- **Three-way agreement.** `analytic == ad == fd` to tolerance, for **every** family ×
  topology (the FD/AD oracle tests; `localJacobianParity`).
- **Locality + reuse.** Each analytic column is exactly zero outside `Pᵢ`'s support, and the
  compact-support assembly is bit-identical to the full-width one.

### 9. Open threads
- **Reach the goal state (honest, current).** The backends are still uneven, but PH improved:
  polynomial has `ad`; closed rational/complex have seeded `analytic`; **PH now runs its
  constraint Jacobian via forward-AD over the low-degree reduced numerator `R`** (`g = 2·R·σ²`,
  `phCurvature.ts`) — the ported Rust `ph::curvature_numerator` made this 6–8.6× faster than
  differentiating the full-degree `g`, and it *replaced* the old FD path for PH. Open
  rational/complex still fall to FD where the analytic column isn't derived. The goal remains
  **analytic + ad + fd for every family × topology** — analytic as the engine, ad as the
  universal validator, fd as the oracle.
- **Port vs derive (Rust-oracle status).** The analytic columns for **rational & complex, open
  AND closed, ρ-aware**, already exist in Rust (`analytic_rational.rs`, `analytic_complex.rs`)
  — those are a **port**, not a derivation. **PH analytic is absent in Rust too** (it uses `Jet`
  AD) — that one is genuine derivation work.
- **Second order.** The exact Hessian (`curvatureHessian.ts`) extends this idea; its payoff is
  measured under idea V, not assumed.

---

## IV. The B-spline Algebra & Chen Simplification

*The substrate ideas II, III and VI all stand on.*

### 1. The principle
**One closed algebra of B-splines — product, derivative, add, scale — is the substrate
everything is built on; every numerator is a *formula* in that algebra, never its own
machinery. Chen's simplification keeps the rational/complex numerator low-degree** instead of
clearing denominators into a ~degree-44, ~700-coefficient blow-up.

### 2. What it really is
B-splines form a **closed algebra**: the `product` of two raises degree to `p+q`, the
`derivative` lowers it by one, `add`/`subtract` elevate to a common degree and combine, `scale`
is pointwise. So `g = ‖c′‖²(c′×c‴) − 3(c′·c″)(c′×c″)` is literally that formula typed in the
algebra (`curvature.ts:48`), and `g` is itself a B-spline of degree `4d−6`. Nothing about `g`
needs bespoke code — it is an expression.

**Generic over two axes** (the same factoring as idea II): a coefficient **field**
`Coeffs<CP,H,S,Out>` — real (`scalarCoeffs`/`plainCoeffs`), rational (homogeneous `wx,wy,w`),
complex (`c0,c1` over ℂ) — and **topology** (`Indexing`). `insert`/`elevate`/`decompose` are
generic over the field; the product/derivative arithmetic that assembles `g` runs on the real
`BernsteinDecomposition`, with `ComplexBD` built as a *pair* of real BDs on top.

**Chen's simplification.** The honest target `dκ/ds` is rational. Forming it as a rational
function and clearing the denominator inflates `g` for a complex-rational curve to **~degree
44 / ~700 coefficients**. Chen instead builds `g` from the homogeneous coordinate functions
`Z, W` and the differences `Dₖ = Z⁽ᵏ⁾·W − Z·W⁽ᵏ⁾`, yielding a B-spline that is the `κ′`
numerator times only a **positive power of the weight** — *the same zeros* (extrema
unchanged), at **bounded degree**. With unit weights it reduces exactly to the polynomial `g`.
*(Reference: Xianming Chen, "Complexity Reduction for Symbolic Computation with Rational
B-Splines.")*

**PH goes one better.** Because `c′ = w²` is a perfect square, the cheap *polynomial* complex
form applies directly to `a = w²` — `g = Im(ā²·(a·a″ − 3/2·a′²))`, degree `8m−2` — avoiding the
Chen-rational path entirely (connects to idea VI: no square root).

### 3. The mechanism (the deep module)
- `core/bernstein.ts` — `BernsteinDecomposition`: `multiply` (`:112`, product degree `p+q` via
  `bernsteinMultiply` `:56`), `derivative` (`:125`), `add`/`subtract` (`:104`, via
  `combine`+`bernsteinElevate`), `scale` (`:117`), `signChanges` (`:188`). The real substrate.
- `core/complexBernstein.ts` — `ComplexBD` (a pair of real BDs): `mul` (`:27`), `conj` (`:36`),
  `derivative` (`:39`).
- `core/coeffs.ts` — `Coeffs<CP,H,S,Out>`; `core/insert.ts`, `core/elevate.ts`, and
  `decomposeBsplineGeneric` (`bernstein.ts:284`) are generic over it.
- `core/curvature.ts` — the per-family numerators as formulas; `complexChenG(Z,W)` (`:363`),
  the Chen terms `Dₖ` (`:312`), the shared `complexFixedWeightTermsFromZW` (`:483`, open/closed
  bit-identical).
- `core/phCurvature.ts` — `a = w²`, `g = Im(ā²·(a·a″ − 1.5·a′²))` (`:36`).

### 4. The imposter to forbid
- **Clearing the rational denominator** (the ~degree-44 / 700-coefficient blow-up) instead of
  Chen — slow, ill-conditioned, and it buries the real extrema in a haystack of coefficients.
- **Re-implementing product/derivative per family** — the legacy `sketcher/optimizer/algebra.ts`
  + `complexAlgebra.ts` duplication (~6k LOC) of what the one algebra already does.
- **Hardcoding `number`** where the `Coeffs` field abstraction belongs.

### 5. The invariant
- Every numerator is a formula in the one algebra; there is no per-family product/derivative
  machinery.
- The Chen numerator has the **same zeros** as `κ′` (the extra factor is a positive power of
  the weight); at unit weight it **reduces to the polynomial `g`**.
- `g` stays at the Chen degree, never the cleared-denominator degree.

### 6. Where it lives
`core/bernstein.ts`, `core/complexBernstein.ts`, `core/coeffs.ts`, `core/insert.ts`,
`core/elevate.ts`, `core/curvature.ts`, `core/phCurvature.ts`. The legacy `algebra.ts` +
`complexAlgebra.ts` (~6k LOC) are the duplicate to retire onto this.

### 7. The pinning test
- **Unit-weight reduction.** Rational/complex `g` at `w ≡ 1` equals the polynomial `g`.
- **Chen degree.** `g`'s degree is the Chen-reduced degree, not the cleared-denominator one.
- **Algebra laws + markers.** Product degree `p+q`, derivative degree `−1`; the zeros of `g`
  (markers) match the curve's actual curvature extrema.

### 8. Open threads
- **Real-BD core vs fully-generic algebra.** `g`'s product/derivative run on real BD pairs
  (`ComplexBD` on top) while decompose/insert/elevate are generic over `Coeffs`. Is unifying
  these worth it, or is real-BD + `ComplexBD` the right factoring? Measure, don't assume.
- ⚠️ **The "loose open bound" was mostly a false-bound artefact (task #28, REFUTED E25).** The
  famous "10 vs 6" specimen was not honest looseness at all — it was the noise-floor sign
  smoothing *erasing* real sign changes (idea VIII, E25). With raw counting the count is already
  the true `Z(g)` on the specimens tested, and the premise that knot insertion "frees" DOF was
  backward (insertion is corner-cutting → it *tightens* the cage, E23). Any residual per-span
  over-count is a **representation-quality** question (compute `g` on a minimal/coarse B-spline
  polygon), still **never** a threshold — but it is no longer the extrema-miscount bug it was
  filed as.

---

## V. The Barrier + Trust-Region Solver

*The main horse — it executes idea I and supplies idea VIII's margin.*

### 1. The principle
**An interior-point barrier is the authority that holds the curvature bound while the point
tracks the cursor — and it is the production default.** Today that barrier exists in **two
production instances**: the ipopt `InteriorPointOptimizer` for the algebraic families, and the
log-barrier trust-region engine for PH. Both keep the bound and track; the trust-region engine
is the newer one and the intended single home for all of them, but **the algebraic families are
not yet moved onto it**. Faster/alternative solvers (primal-dual) and second-order steps (exact
Hessian) are kept and **measured**, never made a default that can slip the bound (F9).

### 2. What it really is
Each drag frame is one constrained solve — minimize the cursor-tracking objective subject to
the sign constraints that hold `S⁻` (idea I) — a few Newton iterations. Keeping every iterate
strictly interior is exactly what keeps constrained coefficients off zero (idea VIII) and the
bound intact (idea I). Both production barriers are family-agnostic: they take the abstract
objective + constraints + Jacobian; families differ only in those callbacks (idea III).

The two production barriers:
- **`InteriorPointOptimizer` (IPOPT)** (`core/ipopt/`) — trust-region filter barrier with SOC,
  feasibility restoration, a filter line-search, and a watchdog. Production for the **algebraic**
  families: `slideCurve` (`method:'ipopt'`), `slideComplexRational`, and the generic `slide()`'s
  default `'best'` (runs ipopt + primal-dual, keeps the furthest bound-holding result). Banded /
  arrowhead inner solve is opt-in (`bandedSolve`).
- **Trust-region log-barrier** (`core/trustRegionOptimizer.ts` / `trustRegionBanded.ts`) —
  log-barrier path following on the **Conn–Gould–Toint near-exact trust-region subproblem**
  (λ-iteration on `H + λI`), **ρ measured for the step actually taken**, and a
  **shrink-until-strictly-feasible** inner loop so no iterate ever crosses a constraint;
  banded/bordered (arrowhead) Cholesky, `O(n·b²)` (idea VII). Production for **PH**
  (`phCurveBoundDrag.ts`) and the generic `slide()`'s `'trust-region'` option.

**Farin** handle drags use neither barrier — a pure-weight count-guarded walk (`farinDrag.ts`,
idea I / E26); the trust-region call there is the *unwired* anchored reshape variant.

The experiments we keep — **and measure, never assume**:
- **Primal-dual** (Mehrotra predictor-corrector, banded KKT) — opt-in / one arm of `'best'`;
  needs idea VIII's margin enforced explicitly.
- **Exact Hessian** (`Jet2` second-order AD) — full-Newton vs the default Gauss-Newton; **behind
  a flag, study only**, because it can *overshoot the bound on fast drags*.

### 3. The mechanism (the deep module)
- `core/ipopt/InteriorPointOptimizer.ts` — production barrier for the **algebraic** families
  (trust-region filter, SOC, feasibility restoration, watchdog); banded inner solve opt-in.
- `core/trustRegionOptimizer.ts` — production barrier for **PH** and the newest engine
  (log-barrier, Conn–Gould–Toint near-exact subproblem, measured ρ, strictly-feasible shrink).
  `TrustRegionBarrierOptimizer`.
- `core/trustRegionBanded.ts` — `TrustRegionBarrierOptimizerBanded`: banded + bordered
  (arrowhead) Cholesky inner solve, `O(n·b²)` (open = band, closed = band + seam).
- `core/banded.ts` (LDLᵀ open), `core/cyclic.ts` (arrowhead/Woodbury closed seam) — idea VII.
- `core/bandedPrimalDual.ts` — Mehrotra primal-dual (opt-in / one arm of `'best'`);
  `core/barrierOptimizer.ts` — plain log-barrier GN banded.
- `core/curvatureHessian.ts` — exact Hessian (`Jet2`), flag `enableExactHessian`, study only.
- `core/farinDrag.ts` — the pure-weight count-guarded Farin walk (no barrier).
- The strict `S⁻` guard after the solve is the shared `enforceBoundNonincreasing`
  (`curvatureProblem.ts`) — except PH and the Farin walks, which still hand-roll it (Tier 2).

### 4. The imposter to forbid
- **Defaulting to a faster solver** because it's quicker — it can let the bound grow on a quick
  drag (the historical "banded default footgun"). The production default must prove
  bound-faithful **and** cursor-tracking.
- **Turning on the exact Hessian by default** because second-order "should" be better — it can
  overshoot the bound; keep it measured behind the flag.
- **Assuming** a lever helps. "The bound held" is not success (blocking holds it trivially) —
  "held **and** tracked" is, and only measurement against the oracle decides.

### 5. The invariant
- Every family's production default is an **interior-point barrier** (ipopt for algebraic, the
  trust-region log-barrier for PH); it holds `S⁻` (Law 2) and keeps coefficients off zero
  (idea VIII).
- Any alternative or second-order variant must be **proven bound-faithful and cursor-tracking**
  before it is anything but opt-in; every result is bound-guarded (`enforceBoundNonincreasing`
  or the family's equivalent guard).
- Decisions are **measured, not assumed** — concrete numbers, against the oracle.
- **Open thread:** collapse both barriers onto the trust-region engine — one solver for all
  families — measuring at each step that the algebraic families still hold the bound and track.

### 6. Where it lives
`core/ipopt/` (algebraic production), `core/trustRegionOptimizer.ts` /
`core/trustRegionBanded.ts` (PH production + newest engine), `core/banded.ts`, `core/cyclic.ts`;
the comparisons `core/bandedPrimalDual.ts`, `core/barrierOptimizer.ts`,
`core/curvatureHessian.ts`; the Farin walk `core/farinDrag.ts`. The legacy
`sketcher/optimizer/InteriorPointOptimizer.ts` survives only for the PH-variant island.

### 7. The pinning test
- **Holds the bound AND tracks** on the hard drags (`rustParityDrags.test.ts`) — both pinned.
- **Banded/arrowhead is bit-identical to dense** (`localJacobianParity`, `arrowheadDrag`).
- **Exact-Hessian path** validated against the `Jet2` AD oracle + FD (`curvatureHessian`).
- **Each family's default keeps the bound** — a caller omitting `method` gets the invariant
  keeper (ipopt for algebraic via `slideCurve`/`slideComplexRational`, trust-region for PH), not
  the banded footgun.

### 8. Open threads
- **Solver quality is the permanent line of work** (CLAUDE.md): exact Hessian vs Gauss-Newton,
  Jacobian accuracy (idea III), solver choice, conditioning-first (FOUNDATIONS F1). This is
  where idea I's "reshape, don't block" is won or lost — measured against the oracle, never a
  new clamp.
- **Exact Hessian overshoots on fast drags** — understand and fix so second-order can track
  without breaking the bound.
- Closed curves have no near-linear solve yet — idea VII.

---

## VI. The General Method (sign changes of a scalar field)

### 1. The principle
**The engine controls the *sign changes of a scalar B-spline field* — "curvature extrema" is
just today's choice of field.** Anything expressible as a **polynomial B-spline numerator (no
square root)** rides the same machinery: inflections already do. **PH curves remove the square
root**, keeping speed / offset / arc-length polynomial-rational — which both keeps the numerator
cheap and opens new doors.

### 2. What it really is
The whole apparatus — the bound `S⁻`, the sliding active set, the constraints, the solver —
operates on one object: a scalar B-spline's Bernstein coefficient vector and its sign changes.
Nothing in that logic is "curvature." Law 1 itself is stated as `Z(g) ≤ S⁻` — sign changes of
`g` — never "number of curvature extrema" as the primitive.

**It is general, not merely generalizable** — the proof already ships: **inflection control is
a second field**, `f = c′×c″` (degree `2d−3`, `inflectionNumeratorPlanar`, `curvature.ts:28`),
reusing the *identical* sliding machinery (same `assignSignsNeighbor`, same
`computeInactiveSetBySign`, same `enforceBoundNonincreasing`), differing only in which
numerator/gradient is called. **Two fields, one engine.**

**Why "no square root."** The bound is Schoenberg variation-diminishing applied to B-spline
(Bernstein) **coefficients** — which exist only for a polynomial/rational B-spline, not for an
expression carrying `√`. The true target `dκ/ds` is rational with a strictly-positive
denominator `‖c′‖⁶`, so its sign — hence the extrema — is carried entirely by the *polynomial*
numerator `g`; the radical denominator divides out. The method works **because** we control a
polynomial numerator.

**What PH buys.** For a general curve, speed `‖c′‖ = √(x′²+y′²)` is irrational, so arc-length
and offsets carry radicals. A PH curve sets `c′ = w²` (perfect square), making speed
`σ = u²+v²` a *polynomial* and offsets *exactly rational* (`phCurve.ts:328, :401`). That keeps
every controlled numerator polynomial-rational (PH's `g` is low-degree, idea IV) and opens
doors radicals close — exact rational offsets, exact arc length (the 3D PH curvature-bound lab,
the AUV-trajectory work).

### 3. The mechanism (the deep module)
- **Field-agnostic engine:** `core/bernstein.ts` (`assignSignsNeighbor`, `cyclicSignChanges`),
  `core/curvatureProblem.ts` (`computeInactiveSetBySign[Cyclic]`, `enforceBoundNonincreasing` —
  explicitly *"generic over the state type"*), `core/function.ts` (`BSplineFunction` — *"the
  object whose Bernstein sign changes bound the curvature extrema"*).
- **The two fields today:** curvature `g` (`curvature.ts:48`) and inflection `f`
  (`curvature.ts:28`), wired in parallel in `PlanarCurvatureProblem` (`preserveInflections`,
  `curvatureProblem.ts:481`).
- **PH's polynomial numerator/speed:** `phCurvature.ts` (`a = w²`), `phCurve.ts:328`
  (`σ = u²+v²`), `:401` (exact rational offset).

### 4. The imposter to forbid
- **Baking "curvature" into the engine's logic** — the sign/constraint/solver code knows nothing
  of curvature, and must not start to.
- **Adding each new field as another boolean + branch** in every problem class (the current
  `preserveInflections` pattern) — that's the accidental form. The real generalization is a
  **`field` abstraction** (a numerator+gradient pair) parallel to the family axis.
- **Introducing a square root** into the controlled quantity — it destroys the Bernstein
  sign-change bound. If a target carries a radical, find its polynomial/rational numerator (or a
  PH construction); never bound the radical directly.

### 5. The invariant
- The engine controls sign changes of an abstract scalar B-spline field; its sign/constraint/
  solver logic contains no curvature-specific concept.
- Every controlled field is a polynomial/rational B-spline numerator (**no square root**).
- Adding a field changes only the supplied numerator+gradient, not the engine.

### 6. Where it lives
Engine: `core/bernstein.ts`, `core/curvatureProblem.ts`, `core/function.ts`. Fields:
`core/curvature.ts` (`g`, `f`), `core/phCurvature.ts`. **Honest note:** the polymorphic axis
today is *family* (polynomial/rational/complex/PH), **not field** — field is still hard-coded
paths (`numerator` vs `inflectionNumerator`, the `preserveInflections` boolean). Making *field*
a first-class axis is a real-but-contained refactor; the engine beneath needs no change.
**The Rust oracle bakes curvature too** (its solver references `g` directly; inflection
numerators exist but are not an engine axis) — so this is *design work in both*, not a port.

### 7. The pinning test
- **Inflection control holds its bound and tracks**, using the same machinery as curvature.
- **Engine is field-agnostic** — the sign functions take a coefficient vector / `boundOf`
  callback and are exercised with a non-curvature field.
- **PH numerators are polynomial** (degree `8m−2`) and PH offsets exactly rational (no radical).

### 8. Open threads
- **Promote FIELD to a first-class axis** (a numerator+gradient abstraction) and fold
  `preserveInflections` into it — the contained refactor that makes the generality real in code,
  not only true in principle. Then rename the curvature-named classes.
- **New fields** beyond curvature/inflection — anything with a polynomial B-spline numerator.
- **The PH "open doors"** — exact arc-length / offset / min-turning-radius (3D PH lab, AUV
  trajectories): the payoff of removing the square root.

---

## VII. Real-Time at Scale (O(n), and the hinge frontier)

### 1. The principle
**The drag runs in real time, and the work is to make each frame O(n) — and ultimately
sub-O(n) for a local drag — without ever sacrificing the bound.** Linear-per-frame needs *both*
a banded/arrowhead linear solve **and** local (seeded, compact-support) assembly. The
**hinge/windowed** frontier — letting a curvature extremum act as a natural boundary so distant
control points stay out of a local drag's solve — is the next rung.

### 2. What it really is
A drag frame = one constrained interior-point solve = **assembly** (Jacobian/Hessian) + a
**linear solve**. Linear-per-frame requires *both* to be O(n): a banded/arrowhead solve (not
dense Cholesky) **and** local/seeded assembly (not dense FD). Missing either keeps it
super-linear.

Two structure facts make it possible: the constraint Jacobian is **banded** because each `g`
coefficient depends only on the `d+1` control points supporting its span (B-spline locality);
the closed-curve **seam is a low-rank corner** (arrowhead), solved by Woodbury as `(s+2)` banded
solves + one `s×s` dense solve, `s = O(d)`.

**Honest, measured status (`docs/LINEAR_DRAG.md` — now partly stale; see §8).** When that doc
was written TS was dense for all kinds; **closed rational & complex are now on the arrowhead
path** (§8), so the "closed has no near-linear path" claim there needs re-measuring. The
open-curve numbers still illustrate the dense-vs-banded gap — roughly `O(n^2.5–3)`, dense
Cholesky dominating (open b-spline: 67 / 457 / 1544 / 4083 ms at 30 / 60 /
90 / 120 CPs). The banded path exists and **flattens**: open-b-spline `slideCurve` dense-vs-
banded is **4.0× / 4.4× / 7.8× / 17.6×** at 30 / 60 / 120 / 180 CPs — banded barely moves
120→180 (≈ 529 ms) while dense climbs to 9324 ms. Local assembly was the other half: the open
local gradient was `O(n²)`; cached seeds (`precomputeOpenSeeds`) made the local Jacobian
`O(n·d²)` — **28.5 → 2.2 ms at n=180 (~13×)**.

### 3. The mechanism (the deep module)
- `core/banded.ts` — symmetric banded LDLᵀ, `O(n·b²)` (open).
- `core/cyclic.ts` — arrowhead / Woodbury for the closed seam (port of `cyclic.rs`).
- `core/gradient.ts` — local/seeded compact-support columns (`precomputeOpenSeeds`,
  `curvatureExtremaGradientPlanarLocal`, the periodic local cols).
- `core/curvatureProblem.ts` — `computeConstraintJacobianLocal` (`O(n·d²)`), the band-sparse
  Hessian assembly.
- `core/ipopt/` — `IP_LOCALITY` / `IP_SPARSE_SOC` (bit-identical local accumulation + banded
  SOC). Story: `docs/LINEAR_DRAG.md`.

### 4. The imposter to forbid
- **A faster frame that lets the bound grow** (idea V's footgun) — speed never at the cost of the
  bound.
- **Calling a banded *solve* "linear" while still assembling a dense `n×n` Hessian** — the
  `O(n²)` assembly then dominates the `O(n³)` solve you removed. *Both* halves must be O(n).
- **Silent caps.** A windowed/local solve that drops distant control points must **log** what it
  excluded (Law 3, no silent truncation) and must still hold the *global* bound.

### 5. The invariant
- Each frame holds the bound (ideas I, VIII) regardless of solver/assembly.
- "Linear" means **both** solve and assembly are O(n); a linearity claim that ignores assembly
  is false.
- Any locality/window that excludes control points is **logged** and still bound-faithful.

### 6. Where it lives
`core/banded.ts`, `core/cyclic.ts`, `core/gradient.ts` (local), `core/curvatureProblem.ts`
(local Jacobian), `core/ipopt/` (locality flags). The complexity story: `docs/LINEAR_DRAG.md`.

### 7. The pinning test
- **Banded/arrowhead solve bit-identical to dense** (`localJacobianParity`, `arrowheadDrag`).
- **Local gradient bit-identical to full-width** (`openLocalGradient`, `periodicLocalGradient`,
  ~1e-12).
- *Honest gap:* there are **no timing assertions** in tests — perf is tracked via the
  `LINEAR_DRAG.md` measurements + correctness parity (`rustParity`), not ms thresholds. Pinning
  a perf budget is an open thread.

### 8. Open threads (with Rust-oracle status — what is a *port* vs *new work*)
- **Closed near-linear for rational & complex — ALREADY DONE in TS (verified 2026-06-27).**
  Contrary to this doc's earlier note *and* to `LINEAR_DRAG.md`, closed rational &
  complex-rational drags already run on the arrowhead path: `slideComplexRational`
  (`complexRational.ts:760`) passes `bandedSolve:true, closed:true`; `ComplexRationalProblem`
  exposes a seam-wrapping local Jacobian (`:649`) + diagonal objective Hessian (`:681`), so with
  `enableBFGS:false` no dense `n×n` is formed; the solve is `assembleBandedBarrier →
  spdFromArrowhead → cyclic.solveArrowhead`. ρ≠1 supported. Green: `cyclic`, `arrowheadDrag`,
  `localJacobianParity` (rational+complex, open+closed), `coreComplexRationalDrag`,
  `rustParityDrags` (closed). **Measured (2026-06-27): ~O(n), ≈2×/doubling, n=8→128
  (91→200→364→782→1584 ms/step).** `LINEAR_DRAG.md` and the `sceneStore.ts:18-19` comment are
  now corrected. **Key reframing: at editor sizes dense ≈ banded — the linear *solve* is NOT the
  bottleneck; the per-iteration numerator/assembly is (already O(n)).** So the real perf lever is
  reducing per-iteration cost / iteration count, not the solve — which means the hinge (§ below)
  pays off only once the solve becomes the bottleneck (large n).
- **Closed polynomial uses BFGS *by design* — NOT a wart to remove.** The live closed-bspline
  drag passes `enableBFGS:true` (`sceneStore.ts:867-873`) because plain Gauss-Newton **blocks**
  on clustered-knot closed curves (FOUNDATIONS F4: CP6 retreats 5→0 over 400 iters) — BFGS
  supplies the constraint-curvature term GN drops, so it *reshapes* (Law 2). It does materialize
  a dense Lagrangian Hessian before the arrowhead extract — a real `O(n²)` cost, but minor at
  editor sizes (the solve isn't the bottleneck, §2) and *correct*. **The honest improvement is
  NOT dropping BFGS** (that reintroduces blocking) but a band-sparse *analytic
  constraint-curvature Hessian* for closed (idea V; `curvatureHessian.ts` currently returns
  zeros for closed and can overshoot on fast drags) — genuine solver-quality work, not a cleanup.
- **Closed PH is O(n³) — genuine work, Rust doesn't have it either.** `ClosedPhDragProblem`
  takes the dense Hessian branch in Rust too (global junction coupling + closure equality).
  Not a port; real design.
- **The hinge / windowed solve is REAL in Rust (open rational), not a plan — a port target.**
  Two implemented, wired mechanisms: (a) `banded.rs::solve_windowed` — a windowed *linear*
  solve that grows the window ×2 until the **step stops changing** (step-stability, not
  residual); (b) `interior_point.rs::hinge_window` + `local_drag_rational_hinged` — maps `g`'s
  sign changes to control points by Greville abscissa, brackets the handle by the Nth extremum
  each side (a curvature extremum literally acting as the hinge), frees only that window →
  O(window), independent of n. **But OPEN-RATIONAL only** in Rust; extending it to closed /
  polynomial / complex / PH is new work. (TS has neither yet.) Must log exclusions and hold the
  global bound.
- **No perf budget pinned** — consider ms-threshold guards so regressions are caught.

---

## VIII. The Honest Zero (sign integrity at the boundary)

*Pairs with idea I (the Sliding Mechanism, whose promise this keeps) and idea V (the solver
that supplies the margin). Family-agnostic: it acts on g's coefficients, which are the same
kind of object for every family — one mechanism, fine-tuned per case.*

### 1. The principle
**The bound `S⁻` is a discrete count riding on floating-point coefficients, and we keep that
count faithful to the true mathematics without ever laundering it.** The primary defence is
simple: **don't let a constrained coefficient get close to zero** — the log-barrier does this
for free. The count itself is **raw** (E25): every nonzero coefficient keeps its own sign; the
*only* borrow ever permitted is for an **exact floating-point zero**, whose sign genuinely does
not exist. There is **no magnitude floor** — no "small relative to the max" rule anywhere.

### 2. What it really is
`S⁻` counts *sign changes* in g's control polygon — a **discrete, combinatorial** quantity.
Sign is discontinuous at zero, and the sliding mechanism's constraints sit **exactly at
zero** (an anchor must keep its sign). So a coefficient that is *truly* zero-or-tiny-positive,
coming back from the solve (or from re-evaluating g each tick) as tiny-**negative**, adds a
spurious crossing — and **the bound is violated by pure numerical noise**, no real curvature
feature involved. This is where Law 1/2 (the bound) meets Law 3 (honesty) at the level of
floating point.

The trap (FOUNDATIONS F1): g's coefficients span a knot-driven dynamic range of ~1e12. So the
obvious fix — "treat coefficients below τ as zero" — is **forbidden**: any global floor large
enough to be safe near the big coefficients **deletes real sign changes** among the small
ones, producing a fake *too-low* bound (the exact bug Law 3 was written against). The only
honest move is to separate a **true machine-precision zero** (zero up to the roundoff of its
*own* computation) from a **small-but-real** coefficient — and, when genuinely unsure, err
*smaller* (looser bound, never false).

### 3. The mechanism (the deep module)
Two layers — the solver keeps coefficients off zero; the count resolves only genuine roundoff.

**Solver side (primary, family-agnostic):**
- **Barrier / interior point** keeps every iterate *strictly interior*, so constrained
  coefficients stay a margin away from zero and cannot flip from noise. In the barrier regime
  this alone suffices — "without anything else." (Idea V.)
- **Primal-dual needs explicit care.** It can approach the boundary aggressively (dual
  variables driving a coefficient toward zero), so there the margin must be **enforced
  deliberately**, not assumed. This is the regime where sign integrity must be done "properly."
- **Condition first (F1).** Scale g out of its 1e12 range *before* the solve, so "near zero"
  is well-posed and the margin actually means something; otherwise every margin and threshold
  inherits the ill-conditioning.

**Count / display side (`core/bernstein.ts`):**
- `assignSignsNeighbor` — **raw strict signs** (E25): every nonzero coefficient keeps its own
  computed sign; only a coefficient that is an **exact** floating-point `0` (its sign truly
  does not exist) borrows its nearest neighbour's, so it joins that run for the optimizer
  **without adding a count**. It **never** reassigns a coefficient whose sign is real, however
  tiny.
- `SIGN_NOISE_REL = 1e-14` — no longer a sign classifier. It survives only as feasibility
  **slack** (`structuralMarginsScaled`, `curvatureProblem.ts` — a practically-zero active
  coefficient starts a hair off its wall) and in the trust-region-inert row scale. It never
  rewrites a sign.
- `cyclicSignChanges` — strict sign changes, exact zeros skipped, seam wrapped for closed.

**Last resort (Law 2):** if `S⁻` still ticks up by a hair of slip, pull back along the
straight path toward the tick's start until `S⁻` no longer exceeds it — a slip correction,
never a freeze.

### 4. The imposter to forbid
- **A global "small relative to the max" floor above roundoff** — it deletes real
  low-amplitude features and reads the bound *below* the truth (a false bound, Law 3).
- **Letting primal-dual ride the boundary without a margin** — spurious flips, bound violated.
- **Freezing a coefficient** to stop it flipping — blocks editing (Law 2). The honest move is
  the margin (keep it off zero) or the slip correction, never a freeze.

### 5. The invariant
- `S⁻` (displayed **and** enforced) changes only from **real features**, never from
  floating-point noise.
- The only threshold anywhere is at **machine-roundoff scale**; when in doubt, err smaller.
- Under the barrier, constrained coefficients stay a margin off zero across a whole drag;
  under primal-dual, the same margin is enforced explicitly.

### 6. Where it lives
`core/bernstein.ts` (`assignSignsNeighbor` raw signs, `cyclicSignChanges`, `signChanges`, the
now-slack-only `SIGN_NOISE_REL`); the feasibility slack in `curvatureProblem.ts`
(`structuralMarginsScaled`); the barrier margin in `core/trustRegionOptimizer.ts` (production)
and the comparisons `core/ipopt/` / `core/bandedPrimalDual.ts`; conditioning per FOUNDATIONS
F1; the slip correction `enforceBoundNonincreasing`.

### 7. The pinning test
- **Noise is invisible.** Perturb coefficients by `< roundoff·scale` near zero ⇒ `S⁻` and the
  drawn markers are unchanged.
- **Real features survive.** A genuine low-amplitude sign change *above* roundoff is **not**
  erased (the bound never reads below `Z(g)` — the one test of CLAUDE.md).
- **Closed count is even** (the seam-wrapped cyclic walk).
- **Barrier margin holds.** Across a drag, constrained coefficients stay off zero and `S⁻` is
  non-increasing (Law 2).

### 8. Open threads
- ✅ **Global-vs-local roundoff floor — ANSWERED (E25).** The question "is a global-relative
  floor honest everywhere?" resolved to **remove the floor entirely**. A relative floor on the
  1e12 dynamic range *did* read a false low bound — the E25 specimen (clustered knots) displayed
  14 vs the exact **25**, every sign correct (`labE25.test.ts`). Raw strict counting (only exact
  zeros borrow a neighbour) replaced it with **zero suite fallout**. The BigInt oracle (E21)
  measured the g-chain's true accumulated roundoff at ≈1e-14, which now lives only as
  feasibility slack, never as a count floor. The floor is gone; the honest looseness principle
  ("err smaller, never false") is served by counting raw, not by tuning a threshold.
- **Primal-dual margin.** Formalize the boundary margin so PD matches the barrier's sign
  integrity rather than relying on the barrier regime.
- **Conditioning (F1) — largely closed (E22).** Row scaling was proven a **no-op** for the
  log-barrier trust region (invariant under diagonal row scale); the structural envelope
  remains a ~27× lever only for the ipopt comparison. With the raw count and the trust-region
  default, the sign is authoritative on its own — no scaling needed for correctness.

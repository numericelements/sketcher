# Local editing of C² PH quintic splines — the window width is the dial

Established 2026-08-07. Code: `src/core/phSpatialSpline.ts`. Pinned:
`src/core/__tests__/phSpatialSpline.test.ts` (22 tests, both the spatial and the
planar half).

Source: **[FGS16]** R. T. Farouki, C. Giannelli, A. Sestini, *Local modification of
Pythagorean–hodograph quintic spline curves using the B–spline form*, Adv. Comput.
Math. **42** (2016) 199–225.

---

## What the literature establishes (planar)

[FGS16] put a C² PH quintic spline in B-spline form — which needs **triple interior
knots**, since the segments are quintic but meet with C² — and then edit it by
displacing one B-spline control point. Their §6 counting argument:

- An **ordinary C² cubic** B-spline: displacing one control point alters **four**
  segments and **C² is maintained**. Locality is free.
- A **C² PH quintic**: the displacement touches **two** segments (the basis function's
  support) but *destroys the PH structure* of both. Restoring it means adjusting the
  preimage coefficients; holding the neighbours fixed leaves only
  `w_{k,2} = w_{k+1,0}` free — **one complex unknown against two complex equations**.
- Hence, verbatim: *"A two-segment local modification retaining C² continuity between
  the modified and unmodified segments is therefore **not, in general, feasible**."*
- Relax to C¹ and `w_{k,1}`, `w_{k+1,1}` free up: **two unknowns, two equations**,
  solved as *"two quadratic equations in two complex variables."* Knot multiplicity at
  the window edges is raised from three to four by insertion.

They also note that at the ends of an **open** spline C² *is* preserved for free —
`p₀, p₁, p₂` influence only one segment, so there is no neighbour on one side whose
continuity must be protected. A **closed** spline has no such privileged region.

## What we measured, and it reframes the result

**The C² → C¹ relaxation is a consequence of holding the window at two segments, not
a cost of the PH structure.** Widen the window and C² comes back.

| | keep C² | relax to C¹ |
|---|---|---|
| **plane** | **W = 4** — `24` unknowns, `24` equations, exactly SQUARE | W = 2 ← [FGS16] |
| **space** | **W = 3** — `36` unknowns, `30` equations, a **6-dim family** | W = 2 |

Both C¹ rows reproduce the published two-segment scheme, which is the check that the
model is the right one.

### Space needs a NARROWER window than the plane

Per segment the plane offers 6 unknowns against 4 conditions per joint (ratio 1.5);
space offers 12 against 6 (ratio 2). Space has proportionally more room, so it reaches
feasibility one segment sooner. Counting: plane `E = 4W + 8` against `U = 6W`, equal at
`W = 4`; space `E = 6W + 12` against `U = 12W`, equal at `W = 2` — but the gauge always
costs one, so `W = 3`.

### And the two are feasible in DIFFERENT WAYS — the deck's theme again

- **Plane at W = 4: exactly square.** Finitely many ways to perform the edit, discrete
  branches, and **no slack**.
- **Space at W = 3: a six-dimensional family** (five after the gauge). You do not
  merely recover C², you recover it **with room to choose** — which is where a further
  invariant (curvature-extrema count, a curvature bound) can live.

So the plane gives a count and space gives a family, exactly as in interpolation.

## There is NO maximum drag distance

A single Gauss–Newton solve attempting the whole displacement diverges past ≈3 units.
That is a **basin-of-attraction limit — a solver artifact, not a geometric one.** Do not
report it as a reachable distance (an earlier draft of this work did, wrongly).

Dragged as an editor drags — small warm-started steps — the control point travels **at
least 30 units in every direction tested** (±x, ±y, ±z), more than ten times the
curve's own extent, with `σ = |A|²` staying ≈ 1 (no cusp) and the residual at machine
zero. The loop's own ceiling stopped it, not a failure.

> **The PH structure does not bound the gesture. Only invariants you choose to impose
> do.** If a drag ever stalls, the cause is the solver (fixable) or a constraint added
> on purpose — never the PH-ness itself.

Cusps (`σ → 0`) would be a genuine wall, and are the thing to watch. None came close
in any test.

## Conventions in the implementation

- **"Local" means exactly local.** The window reproduces where it **ends** (not merely
  its net displacement — a moving origin would otherwise drag the untouched tail along)
  plus hodograph and `r″` matching at each edge. Everything outside is unchanged to
  **< 1e-9, for a drag of every one of the 41 control points**.
- **Every control point is draggable, both endpoints included.** The boundary
  bookkeeping follows one rule: *a boundary condition exists only to protect a
  neighbour.* A window reaching segment 0 imposes nothing on its left, so the start
  tangent and curvature are free — which is what dragging `P₁` means, and is [FGS16]'s
  free-C²-at-the-ends observation arrived at for a concrete reason.
- **One semantic exception**: the curve's **end positions** are boundary data and move
  only when *they* are dragged. Otherwise min-norm would happily spend that freedom and
  nudging `P₁` would drift `P₀`, leaving the two impossible to control independently.
  So "no neighbour" frees the end *derivatives*; the end *point* stays pinned unless it
  is the handle.
- **`p₀` is the integration constant**, so when it *is* the handle it becomes an
  unknown and the window's far end is pinned instead. Getting this wrong translates the
  whole spline; it is pinned by a test.
- **A C² spline is built by making the quaternion preimage a C¹ quadratic spline** —
  `A` continuous gives `r′ = A i A*` continuous, `A′` continuous gives
  `r″ = polarSandwich(A′, A)` continuous. For unit spacing that is the averaging rule
  `A_{k,2} = ½(A_{k,1} + A_{k+1,1})`, the quaternion analogue of the planar
  `w`-condition [FGS16] use.
- **`localEdit` never throws.** `leastSquares` raises on a singular normal-equation
  matrix; a drag handler must report non-convergence instead and let the caller keep
  the last good state.

## Method note, worth not repeating

Rank by Gaussian elimination with partial pivoting reported W=2-keep-C² as **full
rank** (24 of 24). It is not — the true rank is 22. The Jacobians here are
finite-differenced, so their entries carry ~1e-8 noise, and elimination counted that
noise as signal. What caught it: a square full-rank system satisfies the implicit
function theorem and must succeed for *small* displacements, and this one failed at
every magnitude down to 0.002.

**Decide feasibility by solving, not by ranking.** Where a rank is wanted, read the
singular-value spectrum and look for a gap (here: `1.7e-2, 7.1e-3, 2.9e-9, 0` — six
orders, stable across step sizes), never a fixed tolerance.

## Open

- Does the end-of-spline privilege NARROW the window at the ends in 3D? The
  implementation now imposes no conditions where there is no neighbour, so the freedom
  is there, but the minimum feasible width near an end has not been measured.
- Where the three-dimensional slack at W = 3 should be spent: this is the natural home
  for curvature-extrema control or a curvature bound, and the reason the 3D case is the
  interesting one. Note the slack GROWS with the window (W = 4 adds four more essential
  parameters), so an invariant that does not fit at W = 3 may fit at W = 4 — the same
  dial again.

---

## Why a minimal window feels unpredictable — measured 2026-08-07

Observed while using the slide-8 figure: most drags behave, and some produce startling
motion. The cause is **amplification**, and it is a property of the constraints, not of
the choice rule.

| window | worst amplification | mean | control points that move | min σ |
|---|---|---|---|---|
| **3** | **4.44×** | 1.60× | 10 of 41 | 0.113 |
| 4 | 2.41× | 1.21× | 15 | 0.116 |
| **5** | **1.51×** | 1.06× | 20 | 0.117 |
| 6 | 1.53× | 1.06× | 25 | 0.118 |

"Amplification" is the furthest any *other* control point moves, divided by how far the
dragged one moved. At W = 3 some points force others **4.4× further than the point in
your hand**. At W = 5 nothing moves much more than what you are dragging, and it
saturates there.

Holding C² at both edges, plus the end position, plus the cursor, leaves only three
parameters — so the compensating excursions have to be large. **Widening is the cure**,
it is monotone, and it is free: C² defect stays at 1e-15 and the speed margin even
improves slightly. The price is locality in the honest currency — **five more moving
control points per added segment**, each moving less.

So the window width is a dial with three legible settings:

- **W = 2** — a C¹ edit (the published scheme)
- **W = 3** — the minimum that keeps C²
- **W = 5** — C² *and* motion that never exceeds the gesture

### A fix that did NOT work, so it is not tried again

The obvious diagnosis is that minimum norm is computed in **generator** space —
`leastSquares` minimises ‖δx‖ where `x` holds the generator coefficients — while the
generator-to-geometry map is *quadratic*, so equal generator steps produce unequal
geometric motion. Correct diagnosis; the corresponding fix is worse.

Replacing it with a weighted minimum norm that minimises the **control-point**
displacement (`min ‖Bδ‖` subject to `Jδ = −r`, solved as `δ = G⁻¹Jᵀ(JG⁻¹Jᵀ)⁻¹(−r)` with
`G = BᵀB + λI`) measured **worse on every axis**:

| metric | worst other-point move | ratio | min σ | failures |
|---|---|---|---|---|
| generator | **1.88** | **4.4×** | **0.113** | 0 |
| geometric | 2.47 | 5.8× | **0.012** | 1 |

**Why it fails, and this is the durable lesson:** minimising ‖Bδ‖ rewards configurations
where the geometry responds *weakly* to the generator — that is, where `|A|` is small.
Since `σ = |A|²`, **a geometric metric biases the solve toward cusps.** The generator
metric carries no such bias. Do not reach for geometric weighting here.

(Also worth knowing: a soft-penalty formulation is not an alternative. With hard
constraints at weight 1 and soft goals at weight ε, the achievable constraint residual
is capped at O(ε²), so a C² claim of 1e-10 would be a fiction.)

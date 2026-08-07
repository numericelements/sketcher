# Local editing of C² PH quintic splines — the window width is the dial

Established 2026-08-07. Code: `src/core/phSpatialSpline.ts`. Pinned:
`src/core/__tests__/phSpatialSpline.test.ts` (13 tests, both the spatial and the
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

- **"Local" means exactly local.** The window reproduces its original **net
  displacement** (or the whole tail would translate) plus hodograph and `r″` matching at
  both edges. Everything outside is unchanged to 1e-11, not approximately.
- **The two spline endpoints are not draggable** — they *are* the end conditions
  (`P₁ = pᵢ + dᵢ/5`, as on slide 7). `editWindow` returns null for them.
- **The boundary conditions are imposed uniformly**, including where the window meets
  the curve's own ends. So this implementation does *not* exploit [FGS16]'s
  free-C²-at-the-ends result: uniform behaviour is worth more in an editor, and the
  asymmetry is a slide rather than a feature.
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

- Does the end-of-spline privilege survive in 3D, and does it narrow the window to 2
  there? Not measured — the implementation imposes uniform boundary conditions instead.
- Where the five-dimensional slack at W = 3 should be spent: this is the natural home
  for curvature-extrema control, and the reason the 3D case is the interesting one.

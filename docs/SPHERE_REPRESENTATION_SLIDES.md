# The sphere slides — where they are, and the one that is next

*Working handoff, 2026-08-16. Written to survive a context compaction. Everything below either
happened or is a stated intention; measured numbers are marked as such.*

The `ph-interpolation` deck now approaches the ℝ^{4,1} representation from the bottom instead of
dropping the reader into a two-condition figure. This file records the sequence, why each slide
exists, the **next slide to build**, and the threads left open elsewhere.

---

## 1. The sequence as it stands

```
10  Bend it, and it becomes rational          MobiusFigure            (unchanged, older)
11  A curve of spheres                        CanalSurfaceFigure      canal / cyclographic rule
12  Two spheres, by hand                      — text only —           the arithmetic, once
13  Two spheres                               SpherePencilFigure      degree 1, the pencil
14  Three spheres                             ThreeSphereFigure       degree 2, NOTHING imposed
15  The same rule, with nothing imposed       ConformalSphereFigure   degree 6, unconstrained
16  Or build it there in the first place      RationalPHCurveFigure   degree 6, CONSTRAINED
```

**The design, in one line per slide.**

- **11** is the *other geometry*, not a warm-up: it interpolates **centre and radius separately**
  (cyclographic / Laguerre), which is what the canal-surface literature does. Its envelope is a canal
  surface; its two breakable failures are `|ċ|² ≤ ρ̇²` (no envelope) and `ρκ > 1` (the tube pinches).
- **12** is text and arithmetic only. What you specify (a centre and a radius), why five numbers
  (four for the sphere, one for the projective scale), store/read formulas, and one example carried
  through by hand to `radius² = −1.76`. Ends on the sentence the whole encoding turns on: *the centre
  comes out of a division and behaves; the radius comes out of a subtraction involving |centre|²,
  which is quadratic, and all the surprise enters through that one square.*
- **13** is the smallest interactive case: two control spheres, a **pencil**. Overlapping → every
  member real; **tangent** → the middle member is a point; separated → **two limit points** and a
  visible hole of imaginary spheres between them. Carries the punchline only degree 1 can deliver:
  the only null curve of degree 1 is a single stationary point, because two point-spheres are
  orthogonal only when they coincide. **Points do not interpolate to points.**
- **14** is the **inventory** slide, and the only rung of the ladder the room can climb: three
  spheres, **fourteen handles**, five numbers, nothing imposed and nothing that helps. Built
  2026-08-16; §2 below is the record of what was settled.
- **15** is slide 16's rule with the conditions removed, seeded from **slide 16's own member**, so it
  opens sitting on the constraint and the first drag inflates the spheres.
- **16** is the constrained figure (degree 6, cached sextic seed, strict/free, four dials).

### Facts these slides rest on (all measured)

```
ρ(t)² = ⟨ρ²⟩ − Var(centres)          under the weighted Bernstein distribution
                                      exact to 2.8e-16 (deg 1) and 1.7e-14 (deg 6, real weights)

two spheres radius 0.7, gap →   0.6     1.0     1.4     2.0     3.0
midpoint radius                0.633   0.490   0.000  −0.714  −1.327
                                                ↑ tangency, gap = 2ρ
limit points at t                —       —      t=½   .143,.857  .058,.942

17 samples drawn, gap →   0.8: 17/17   1.4: 16/17   2.0: 6/17   3.0: 2/17
```

The null condition, said in one sentence: **the average squared radius must equal the variance of the
centres, at every t.** Which is why slide 16's control spheres are large and far apart — they must
cover their own spread.

---

## 2. BUILT: slide 14 — three spheres, nothing imposed

**The ladder, and why 14 exists.** The four sphere slides are one escalation, and the drama is
whether the null condition is *reachable*:

```
13   degree 1   UNREACHABLE      the only null curve is a stationary point. You cannot win.
14   degree 2   reachable BY HAND   three spheres, five numbers, and you drive them to zero yourself.
15   degree 6   unreachable by hand  a knife edge in 17 dimensions — which is why it opens ON it.
16   degree 6   held by a solver     and what is left in your hands is shape.
```

Slide 14 is the only rung the room can climb, which is what makes 15 and 16 land.

### The framing: there are only spheres

Eric's call, and the figure follows it exactly. **No control points, no control polygon, no Farin
bead.** Three spheres; a point is a sphere of radius zero; each sphere carries the same three
controls — a centre you drag, a radius slider, a weight slider. The centre is explicitly *a device
for moving a sphere*, not something the geometry believes in (it is not Möbius-natural — see §2.4).

```
3 spheres × 5 numbers = 15,  less the overall projective scale  →  14 handles
the null condition = the 5 Bernstein coefficients of ⟨P,P⟩      →   5 conditions
                                                                    9 = the curves of points here
```

Measured: 9 is also 6 (two endpoints) + 2 (which circle through them) + 1 (parametrisation), and a
Jacobian-rank check returns exactly 9.

### What you are actually building is a TUBE

The curve is the member where it collapses. Measured (`spherePolygonDegreeTwo.test.ts`):

```
free spheres, nothing arranged      radii  0.600  0.259  0.436  0.420  0.250    a tube
ends pinched to points, middle too BIG      0    0.765  0.883  0.765   0        a spindle
ends pinched to points, middle too SMALL    0   −0.437 −0.505 −0.437   0        a GAP — imaginary
the five numbers at zero                    0     0      0      0      0        a CURVE
```

**So the null condition is the knife edge between a fat tube and nothing at all**, and at this size
you can walk across it in both directions by hand. Slide 13's gap between two separated point-spheres
is the same phenomenon arriving one degree later.

### The five numbers are five separate statements

```
b₀ = ⟨C₀,C₀⟩                the first sphere must be a POINT
b₁ = ⟨C₀,C₁⟩                the middle sphere must pass through it
b₂ ∝ ⟨C₀,C₂⟩ + 2⟨C₁,C₁⟩     the balance between its size and its weight
b₃ = ⟨C₁,C₂⟩                and through the other end
b₄ = ⟨C₂,C₂⟩                which must be a POINT too
```

Measured: pushing the middle centre off the bisector plane breaks **b₃ alone**, leaving the rest at
1e-17. That is why the figure shows the five raw and unlabelled — the numbers say what is wrong, so
nobody has to be told the rules. `core/canalSphereSpline.nullCoefficients`.

### What the collapse hands you, unasked

- **The curve is an arc of a circle. Every time.** And *the same one*: three spheres give six Gram
  entries, the five conditions are equations on exactly those entries, one overall scale remains, so
  **no invariant survives**. Measured — two visibly different arcs have identical normalised Gram
  tables. Up to Möbius there is exactly one curve at this degree, and all nine dimensions are
  placement. Shape moduli (2n−5) only start existing higher up, which is the honest reason 16 is at
  degree 6.
- **It is automatically PH.** The speed numerator comes out a perfect square on the condition and not
  off it. Measured at three different arcs. Two slides later PH costs real freedom; here it is free,
  because degree 2 has no room to be anything but a circle.

### The straight line, and the arc, as three spheres

```
the segment      two point-spheres + the sphere on the segment as DIAMETER
                 centre = the midpoint, radius = half the chord, weights 1,1,1   (measured 1e-14)

the arc          the same, with the middle sphere pushed along the bisector plane:

 apex height   middle centre   radius    weight      what you see
    0.0000        0.0000       1.0000    +1.0000     the straight segment
    0.4142        1.0000       1.4142    +0.7071     the quarter circle  (cos 45°)
    0.9500       19.4872      19.5128    +0.0512     nearly a half circle
    1.0000       infinity         —       0.0000     the HALF circle — no finite control sphere
    2.0000       −1.3333       1.6667    −0.6000     past half: the centre flips sides
  100.0000       −0.0200       1.0002    −0.9998     nearly the whole circle
```

The middle sphere is the **bend handle**; the diameter sphere is "no bend"; and |w|·ρ is pinned to
the half-chord throughout, with the *sign* of w choosing minor or major arc.

### The trackball — for later, not for slide 14

Once the ends are points, the spheres that can connect them are exactly those **orthogonal to both**,
and that set is a **round 2-sphere**: measured, the Gram of the three directions is the **identity
matrix**. So the constrained connecting sphere is nothing but a *direction*.

```
   0°   the straight segment (the diameter sphere)      apex heights measured around one turn:
  45°   the quarter circle                              0.000  0.199  0.414  0.668  plane
  90°   the HALF circle — a PLANE                       1.497  2.414  5.027  infinity
 180°   the antipode: the line, through infinity
```

**Nothing degenerates anywhere on it.** The half circle, which sends the middle sphere's centre to
infinity, is simply the member whose o-component crosses zero — a plane, and a plane is an ordinary
sphere here. The blow-up lives in the words "centre and radius", never in the model. That makes a
**trackball** the honest handle for the *constrained* sphere — but slide 14 imposes nothing, so the
trackball belongs to a later figure.

### 2.5 What the centres determine, and what they may be — the editing budget

All pinned in `conformalCentreFreedom.test.ts`, measured at exact members (`conformalLiftBezier` of a
polynomial is null identically, so no solver is in the loop).

**The centres determine the spheres.** Fix every centre and the freedom left is exactly **2, and both
are gauge**: the overall projective scale and the Bézier reparametrisation Cₖ ↦ μᵏCₖ. Neither moves a
centre, neither changes the curve. So radii and weights are not independent handles — they are
computed from where the centres are, in both families.

*(That fact cost an afternoon. An unguarded solve with the centres held looked like it was collapsing
onto a degenerate stratum — weights decaying 1, 0.19, 0.027, 0.002 — when it was sliding along μᵏ
with μ ≈ 0.513, the reparametrisation, unpinned. The radii never moved, which was the tell.)*

**And the centres are almost, but not quite, free.**

```
                    family      centres    rank    relations on the centres
degree 2              10           9         8              1
degree 4              16          15        14              1
degree 6              22          21        20              1
degree 6 + PH         18          21        16              5   ( = n−1 )
```

A curve of points imposes **exactly one relation on the centres, at every degree** — and at degree 2
that relation is the bisector plane of slide 14, which is why pushing the middle centre off it lights
up b₃ alone. **PH ties n−2 more** (four at degree 6), which is the same cost that shows up as
dimension: null-only is 3n+4, null+PH is 2n+6.

**The editing budget at degree 4, both ends pinned** — the shape a "curve, no PH" slide would have:

```
family 16   ends reachable 6/6   pinning them leaves 10   less 2 gauge   →   8
                and 8 = the three interior centres (9) − the one relation
```

So the interface writes itself: **drag the interior centres**; every radius and weight in the picture
is derived, and one relation is absorbed by the solver. With PH the same budget is 6, with three
relations on those nine coordinates instead of one.

**One warning for any figure at degree 4 or above**: a legitimate member can carry an **imaginary
interior control sphere**. Two lifted parabolas, both exactly on the family, give radii²
`0, 0.528, 0.324, 0.713, 0` and `0, 0.335, −0.004, 0.383, 0`. The ends are always point-spheres; an
interior sphere's reality depends on the polygon, so the figure must be ready to draw nothing at one
of its own control objects.

**Degree 3 is excluded from all of this on purpose.** Its rank is not stable across members — the
null-only family measured 13 dimensions at one `findMember` result and 14 at another. That is the
degenerate stratum in practice, and another reason the deck's honest degrees are the even ones.

### 2.4 The Farin/equivariance thread — settled, and mostly parked

The question that opened this thread: can a Farin point be positioned in space so that a Möbius map
carries it? Answered, measured, and it reshaped the slide:

- **The bead is not a point, it is a sphere** — the pencil member w₀C₀ + w₁C₁. Measured: its centre
  is the classical Farin point and its radius² is **−d₀·d₁** exactly, so between two point-spheres it
  is *imaginary*. Its real counterparts (opposite-sign weights) are the spheres whose inversion
  **swaps the two endpoints**, verified to 4e-16.
- **The sphere is equivariant; the drawn point is not.** G·F equals the Farin object rebuilt from the
  image data to 8.9e-16, while G(bead position) misses the image bead by 0.32. Under the map the two
  weights pick up their conformal factors (1, 2.3 → 1.77, 6.27) and the bead *slides along its leg*.
  The one thing preserved exactly is ⟨U,V⟩ = −½w₀w₁|Δ|², to the last digit.
- **No fix exists locally.** Send the two endpoints to 0 and ∞: everything preserving both points and
  both real weights includes the whole rotation group SO(3), whose only fixed points are those two.
  So a leg-local, point-valued, Möbius-equivariant Farin rule cannot exist. *Equivariance and
  locality are incompatible for a point-valued handle.*
- **Why the plane escapes it.** A complex weight records a rotation; a real weight cannot. That is the
  entire difference between Eric's 2D complex-rational Farin points (free, independent, bijective at
  every degree — see `complexRationalPHCubic`'s header) and the real-weight 3D case.
- **The 3D analogue is a quaternion weight, and it is exactly this slide's middle sphere.** Measured
  dictionary (`beadIsTheMiddleSphere.test.ts`): a degree-1 column with a quaternion weight squares to
  exactly this degree-2 polygon; the ends become the two point-spheres; the middle sphere passes
  through both; and **the bead's one gauge direction is the sphere's projective scale** — sliding the
  bead along its circle leaves the middle sphere's centre and radius *identical* (38.3456 at every λ)
  and only rescales its weight. Free bead in space (3) = sphere geometry (2) + scale (1).
- **Freedom bought: 7 → 9.** Jacobian rank, measured: real weights reach a 7-dimensional slice
  (straight legs only), quaternion weights reach all 9 — the entire degree-2 family. The two extra
  dimensions are exactly "the leg bends into an arc".

**Parked, not deleted.** `core/quaternionicBead.ts` and its two test files stay; the figure that used
them was removed from the deck, because slide 14 is the sphere-only inventory. If the quaternion
picture ever returns it should be *after* the deck introduces the column, and framed as "this is your
complex rational B-spline, one algebra up" rather than arriving from nowhere.

**Derived but NOT measured, flagged for whoever picks this up.** For every de Casteljau intermediate
to be a point (a control polygon genuinely made of arcs) costs one condition per pair, n(n+1)/2,
against 2n−1 for the curve alone — a surplus of (n−1)(n−2)/2. That is 0 at degrees 1 and 2 and 1 at
degree 3. If the arc-polygon idea is ever pushed past degree 2, measure this first.
---

## 3. Other threads left open

- **C21 `mixed_nonempty`** (Lean side asked us to run it). A cheap first shot exists and was not yet
  run: **σ = |𝒜|² is multiplicative** (verified 1.8e-15), so `𝒜 = 𝒜_circle · 𝒜_hard` has σ vanishing
  at ±i and nowhere real — a **mixed** soft/hard pole pattern *by construction*. The only question is
  whether the residue conditions survive the product. If they do, C21 is answered by an object rather
  than a search. If not, the general search needs complex poles in the **λ-free quadric** formulation
  (`rationalPHFreeLambda`), because that one never divides and so can reach σ(r) = 0. See
  `RATIONAL_PH_STATE` §13.8.
- **A numerical existence search can only answer YES.** An empty search teaches nothing. Frame C21
  accordingly.
- **Slide-number drift in older speaker notes.** Several notes still say "slide 11" or "slide 12"
  meaning the constrained conformal figure, which is now **16** (it moved again when the bead slide
  went in). A renumbering pass is pending; nothing is wrong mathematically.
- **Ordering question, unresolved.** Slide 11 (canal, cyclographic rule) sits in front of four
  slides that share the *other* rule. Moving it after 16, as the sibling branch, would give
  12 → 13 → 14 → 15 → 16 as one clean escalation with the other door at the end. Eric's call.
- **The bead slide's own open end.** It stops at the contrast (degree 1 here, degree 2 there) and
  says nothing about where a quaternionic weight goes at *higher* degree — whether a free bead per
  leg is a usable editing handle for the sextic, or whether the null condition couples them. Not
  investigated; the slide does not gesture at it.
- **`RATIONAL_PH_STATE` §13.7/§13.8** hold the current state of the σ = 0 chart question: the stratum
  has two floors (rank 0 = degree drop, rank 1 = where the circle lives), and the missing piece is
  the **overlap** (the mixed cell), not another chart.

---

## 4. Modules this thread added

```
core/canalSphereSpline.ts          the unconstrained sphere spline, BOTH readings
  cyclographic:  sphereAt, frameAt, envelopeTest, characteristicCircle, pinchTest
  conformal:     conformalOf, conformalSphereAt, nullDefect, nullCoefficients,
                 pointSphereParameters
  tests: canalSphereSpline.test.ts (9) — cylinder, cone, torus, both failure modes,
         the two-rule contrast, and the pencil going imaginary
         spherePolygonDegreeTwo.test.ts (10) — EVERYTHING SLIDE 14 CLAIMS: the segment
         as the diameter sphere, the arc family, the connecting spheres' round 2-sphere,
         tube → spindle → gap → curve, the five numbers being five statements, PH free,
         and one curve up to Möbius
         conformalCentreFreedom.test.ts (6) — §2.5: the centres determine the spheres,
         one relation for a curve and n−1 with PH, and the degree-4 editing budget

core/quaternionicBead.ts           PARKED — degree-1 Sp(1,1) with a QUATERNION weight
  beadWeight, beadColumn, beadCurveAt, beadNullDefect, beadInfinity/beadPole,
  circleThrough, circlePolyline, wronskianSpread, conformalConic
  tests: quaternionicBead.test.ts (13) — the free bead, its counts, the line cases
         beadIsTheMiddleSphere.test.ts (5) — THE DICTIONARY: the quaternion bead IS
         slide 14's middle control sphere, gauge = the sphere's projective scale
  (no figure in the deck; see §2.4 for why, and for what it would take to bring it back)

talks/ph-interpolation/CanalSurfaceFigure.tsx      slide 11
talks/ph-interpolation/SpherePencilFigure.tsx      slide 13
talks/ph-interpolation/ThreeSphereFigure.tsx       slide 14
talks/ph-interpolation/ConformalSphereFigure.tsx   slide 15
```

**The two rules are not two spellings.** `sphereAt` interpolates centre and radius separately;
`conformalSphereAt` combines the five-number vectors. Measured on the *same* seven control spheres:
the first gives radii `0, 0.710, 0.909, 0.629, 0` along the curve — a tube; the second gives
`0, 0, 0, 0, 0` — a curve. Same data, different rule, different object.

# The sphere slides — where they are, and the one that is next

*Working handoff, 2026-08-16. Written to survive a context compaction. Everything below either
happened or is a stated intention; measured numbers are marked as such.*

The `ph-interpolation` deck now approaches the ℝ^{4,1} representation from the bottom instead of
dropping the reader into a two-condition figure. This file records the sequence, why each slide
exists, the **next slide to build**, and the threads left open elsewhere.

---

## 1. The sequence as it stands

```
10  Bend it, and it becomes rational          MobiusFigure          (unchanged, older)
11  A curve of spheres                        CanalSurfaceFigure    canal / cyclographic rule
12  Two spheres, by hand                      — text only —         the arithmetic, once
13  Two spheres                               SpherePencilFigure    degree 1, the pencil
14  The same rule, with nothing imposed       ConformalSphereFigure degree 6, unconstrained
15  Or build it there in the first place      RationalPHCurveFigure degree 6, CONSTRAINED
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
- **14** is slide 15's rule with the conditions removed, seeded from **slide 15's own member**, so it
  opens sitting on the constraint and the first drag inflates the spheres.
- **15** is the constrained figure (degree 6, cached sextic seed, strict/free, four dials).

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
centres, at every t.** Which is why slide 15's control spheres are large and far apart — they must
cover their own spread.

---

## 2. NEXT: the slide after 13 — the Farin point free in 3-D

**Eric's ask.** A slide following the pencil where the **Farin point moves in 3-D like another
control point**, not confined to the leg, and the control polygon "becomes a circle".

**Why it belongs there.** With real weights the bead is a convex combination and *cannot* leave the
segment; at degree 1 it is provably **pure gauge** (measured: weights 0.5, 1, 2, 4 move the limit
points to t = (.250,.923), (.143,.857), (.077,.750), (.040,.600) while the limit spheres stay at
x = ±0.7141 — the samples slide, the family does not). The proposed slide is what happens when the
weight stops being a scalar.

### The connection to Eric's own work, which is the point of the slide

```
real weights,     ℝ³      bead on the leg        a circle needs degree 2
complex weights,  plane   bead anywhere in ℂ     a circle is DEGREE 1     ← Eric's complex rational B-splines
quaternionic,     space   the Sp(1,1) column     a circle is DEGREE 1     ← core/sp11RationalPH.ts
```

A complex weight `re^{iθ}` is a scale **and a rotation**, so the Farin point leaves the line. And a
circle is a Möbius image of a line, Möbius maps of ℂ are `(az+b)/(cz+d)` — degree 1. The quaternionic
analogue is already in the repo: `sp11RationalPH` writes a point as **`x = C·A⁻¹`** with `A, C`
quaternion polynomials (exactly `z = P/Q` one algebra up), Sp(1,1) acts on the column `(A,C)ᵀ`
**linearly**, and `sp11Factorisation.test.ts` records that the degree-1 members are *"the
one-parameter-subgroup trajectories: circles and lines."*

**So the slide's thesis is a contrast the deck currently misses:** the circle arrives elsewhere as
"the thing our λ-chart cannot reach", and in this representation it is *degree one* — the simplest
object there is. Same curve, opposite-sounding statements, because the representations differ.

### What to build

Existing material to use: `core/sp11RationalPH.ts` (`Column`, `qpMul`, `qpConj`, `nullPart`,
`covariantWronskian`, `solveForC`, `curveAt`) and `sp11Circle.test.ts`, which already derives the
circle in that construction by hand.

The figure wants: two endpoint handles plus a **third handle free in 3-D** (the former bead), and the
curve through them. Three points in space determine a circle, so the natural reading is *"drag the
third point off the line and the segment bows into the circle through the three."*

### Open before building — do not skip

1. **Is the curve literally the circle through the three handles?** Plausible and clean, but not
   derived. In the planar complex case the weight is not simply "a third point on the curve"; check
   whether the free Farin point lies **on** the circle or merely determines it. Measure before
   claiming it on a slide.
2. **What exactly is being dragged?** A quaternionic weight is 4 real numbers; a point in 3-D is 3.
   One combination is gauge (the Hopf/scale phase). Confirm the count before designing the handle,
   or the figure will have a dead direction — the same trap as slide 15's radius handle.
3. **Degree-1 Sp(1,1) gives circles AND lines.** The figure should show the line case as the
   degenerate one (third handle on the leg) rather than hiding it.
4. **Do not reuse `greatCircles` blindly.** In the conformal figures a negative radius is
   **imaginary** and must draw as nothing; in the canal figure it is a reversed **orientation** and
   draws with `|ρ|`. This distinction has now caused three bugs. Each copy carries a docstring
   saying which meaning it takes.

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
  meaning the constrained conformal figure, which is now **15**. A renumbering pass is pending;
  nothing is wrong mathematically.
- **Ordering question, unresolved.** Slide 11 (canal, cyclographic rule) sits in front of three
  slides that share the *other* rule. Moving it after 15, as the sibling branch, would give
  12 → 13 → 14 → 15 as one clean escalation with the other door at the end. Eric's call.
- **`RATIONAL_PH_STATE` §13.7/§13.8** hold the current state of the σ = 0 chart question: the stratum
  has two floors (rank 0 = degree drop, rank 1 = where the circle lives), and the missing piece is
  the **overlap** (the mixed cell), not another chart.

---

## 4. Modules this thread added

```
core/canalSphereSpline.ts          the unconstrained sphere spline, BOTH readings
  cyclographic:  sphereAt, frameAt, envelopeTest, characteristicCircle, pinchTest
  conformal:     conformalOf, conformalSphereAt, nullDefect, pointSphereParameters
  tests: canalSphereSpline.test.ts (9) — cylinder, cone, torus, both failure modes,
         the two-rule contrast, and the pencil going imaginary

talks/ph-interpolation/CanalSurfaceFigure.tsx      slide 11
talks/ph-interpolation/SpherePencilFigure.tsx      slide 13
talks/ph-interpolation/ConformalSphereFigure.tsx   slide 14
```

**The two rules are not two spellings.** `sphereAt` interpolates centre and radius separately;
`conformalSphereAt` combines the five-number vectors. Measured on the *same* seven control spheres:
the first gives radii `0, 0.710, 0.909, 0.629, 0` along the curve — a tube; the second gives
`0, 0, 0, 0, 0` — a curve. Same data, different rule, different object.

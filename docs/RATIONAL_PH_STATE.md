# Rational spatial PH curves — where we are

*Working state as of 2026-08-14. The durable facts live in the test files named below; this file is
the map, the retractions, and the plan. If you are picking this up cold, read this first, then the
tests it names — not the other way round. §11 is the mathematics underneath, and is the place to start
if the goal is to advance the subject rather than to continue the code.*

The goal behind all of it: **local modification of 3D PH curves during editing** (Eric's letter to
Carlotta). The rational work is a detour taken to understand 3D PH curves well enough to get there.
Two interactive decks serve it: `ph-interpolation` (polynomial) and `inside-the-chart` (rational).

---

## 1. The construction, in one place

Choose a spinor `𝒜(t)` (quaternion polynomial, degree `n`) and poles `w = ∏(t − r_k)` (degree `m`).
Set `N = 𝒜i𝒜*` and `σ = |𝒜|²`. Then `c′ = N/w²` and `‖c′‖ = σ/w²` — **PH is free**. The cost is that
`∫N/w²` must be rational, which kills logarithms via a residue condition at each pole:

```
N′(r_k) = 2N(r_k)Σ_k ,  Σ_k = Σ_{l≠k} 1/(r_k − r_l)       eliminating λ: 3 real conditions per pole
𝒜′(r_k) = 𝒜(r_k)(Σ_k + λ_k i)                            at fixed λ: 4, and LINEAR in 𝒜
```

`λ_k` is the frame twist rate at the pole (F16). The Hopf gauge `𝒜 ↦ 𝒜e^{iθ}` moves no curve.

### The counts that matter

```
deg c   = max(2n − m + 1, m)          the Bézier degree
fibre   = 4(n+1) − 4m                 admissible spinors at FIXED λ — what familyBasis returns
dim 𝒱   = 4(n+1) − 3m                 for m ≤ n
        = n + 4                       for m = n+1        ← see §3
```

**`deg p = max(2n − m + 1, m)`**, not `2n − m + 1`. The integration constant makes `p = q + Cw` of
degree `m` when the denominator outranks the numerator. `toMember` had this wrong and silently
produced wrong curves at `m ≥ n+1`; only the Wronskian residual knew (1.9e-2 against 1e-15 elsewhere)
because every other indicator is computed from `𝒜` and `N` and never looks at `p`.
→ `freeLambdaReachesFourPoles.test.ts`

---

## 2. Classification, and what is in the closure

**Which pole counts reach a given degree.** For even `d`: the odd numbers below `d`, plus `d` itself.

```
d = 4:  m ∈ {1, 3, 4}          empty at 0, 2
d = 6:  m ∈ {1, 3, 5, 6}       empty at 0, 2, 4
```

`m = 0` is empty because polynomial PH curves have odd degree `2n+1`; the other even counts because
`2n − m + 1` carries `m`'s opposite parity.
→ `degree6Classification.test.ts`, `missingDirectionsAreFourPoles.test.ts`

**Polynomials in the closure: one degree per pole.** Where `𝒜(r_j) = 0` the spinor carries the factor,
`N` picks up its square, and the apparent pole cancels. Cancelling `k` poles drops the degree by `k`,
and the curve is polynomial when all of them go:

```
d = 4, m = 1  →  polynomial CUBIC (a helix, τ/κ constant to 3e-15)
d = 4, m = 3  →  degree 1, a straight line
d = 6, m = 1  →  polynomial QUINTIC — the canonical PH curve
d = 6, m = 3  →  a helix        d = 6, m = 5  →  a straight line
```

`d − m = 2n − 2m + 1` is odd automatically — which *is* the classical "polynomial PH curves have odd
degree", and the reason an even-degree rational PH curve has an odd number of poles.
→ `polynomialsInTheClosure.test.ts`, `theTwistDialIsADegreeDial.test.ts`

**The tangent indicatrix cusps at every real pole**, and this is an *if and only if*: a simple pole
exists iff `T′` vanishes there, i.e. `{N, N′}` are dependent (Kalkan–Scharler–Schröcker–Šír Rem. 4.7).
`N(r) = −p(r)` exactly, so the cusp direction is the escape direction.
→ `tangentIndicatrix.test.ts`

---

## 3. The `m = n+1` collapse, and why `dim 𝒱` needed a caveat

At `m = n+1` the fixed-λ fibre is **zero** — `familyBasis` returns nothing and the chart's whole
method (nullspace + linear combination) builds nothing. But the variety is not empty there.

The reason both happen at once is elementary: **the residues of a proper rational function sum to zero
when `deg N ≤ deg w² − 2`**, i.e. `2n ≤ 2m − 2`, i.e. `m ≥ n+1`. `N` is a vector, so that is **three**
linear dependencies among the `3m` conditions. Verified on random spinors: the residue sum is machine
zero when `m ≥ n+1` and O(1) otherwise, `n = 1…4`, `m = 1…5`, no exceptions.

```
m ≤ n       rank 3m         deficit 0
m = n + 1   rank 3m − 3     deficit 3      dim 𝒱 = n + 4
m > n + 1   no members
```

`solveWithFreeLambda` reaches these by solving the quadrics directly (Newton, unit-norm equation to
avoid `𝒜 = 0`, central differences exact since the map is quadratic). It **misses at (4,5)** — a
solver limitation, not geometry.
→ `residuesSumToZero.test.ts`, `freeLambdaReachesFourPoles.test.ts`

---

## 4. Coverage: the chart reaches everything up to reparametrisation

```
              variety     chart     gap
degree 4        13         12        1
degree 6        17         16        1
```

**The gap is the projective reparametrisation.** `PGL(2,ℝ)` acts on parametrised rational PH curves
preserving degree and PH-ness. Measured as the component of each generator lying outside the chart's
tangent:

```
t ↦ t + b     0.00 %      already in the chart
t ↦ a t       0.00 %      already in the chart
t ↦ t/(1−εt)  12.3 %      NOT in the chart — and chart + it spans 13
```

So **every degree-4 rational PH curve is reachable up to how it is traversed.** What the chart cannot
do is *re-traverse* a curve it already has. Reparametrising is explicit algebra (no solve), so it can
be applied as a final step — but the chart is not *closed* under it (`deg w` jumps 1 → 4), so you
cannot reparametrise mid-edit and keep dragging.

For shape editing the gap is bookkeeping. For anything caring about the speed profile — motion
planning, arc length, a frame in time — it is real.
→ `theMissingFreedomIsReparametrisation.test.ts`, `degree4IsThirteen.test.ts`,
`onBranchTheChartCovers12Of13.test.ts`

---

## 5. The Hermite fibre — the bridge to the polynomial deck

Rank of the map from admissible spinors to the nine C¹ Hermite numbers `(c′(0), c′(1), c(1)−c(0))`:

```
POLYNOMIAL quintic   n=2, m=0   12 free    rank 9 of 9   12−9−1 = 2    the torus
RATIONAL sextic      n=3, m=1   fibre 12   rank 9 of 9   12−9−1 = 2    THE SAME, + λ and r
RATIONAL degree 8    n=4, m=1   fibre 16   rank 9 of 9   16−9−1 = 6
RATIONAL quartic     n=2, m=1   fibre  8   rank 7 of 9   cannot do it at all
```

So `torus × roads` is arrived at by counting, not analogy. And degree 4 **cannot** interpolate C¹
Hermite data — two of nine numbers are unreachable — which is why slides 3 and 4 hold only `c′(0)`
and `c(1)`.
→ `sameTorusOneDegreeUp.test.ts`; the polynomial torus is *derived* in `spatialQuinticTorus.test.ts`
(three Hopf circles, gauge the diagonal, `(S¹)³/S¹ ≅ T²`).

---

## 6. Instruments built (and why the old ones failed)

| module | what it does |
|---|---|
| `rationalPHVariety.ts` | the exact system `\|N\|² = σ²` in `(p, w, σ)` — **analytic Jacobian**, no division, no shift. `layoutFor(d)`, `residual`, `jacobian`, `rankOf`, `tangentSpace`, `newtonToVariety`, `continuationPath` |
| `rationalPHFreeLambda.ts` | solves the residue quadrics with λ free — reaches `m = n+1`. Also `freeLambdaTangent`, `stepAlong` |
| `rationalCurveBlend.ts` | `squareRootDefect` / `squareRootMismatch` — is `q` a perfect square, algebraically |
| `rationalPHCoverage.ts` | **SUPERSEDED.** Differentiates a normalised series root; its rank moves with the seed |
| `rationalPHMultiPoleSpatial.ts` | `fiberClosure` — walks a fibre and says how far it is from closing; `gaugeDistance` (exact, mod the Hopf gauge), `indicatrixDistance` (the sphere picture, safe past a pole) |

**The lesson that made all of them work: carry `σ` as unknowns instead of eliminating it.** Eliminating
it means dividing by `q(t₀)` and shifting, and the finite-difference Jacobian inherits both — the rank
then reads 4, 5 or 6 at different members of the same family. With `σ` carried, the rank is identical
at every tolerance from 1e-7 to 1e-11.

**And every instrument needs a control it can fail.** The containment check (do the family's tangent
columns lie in the variety's tangent?) caught two bad instruments. A Hopf-square fitter that failed its
own control had its numbers discarded.

**And the control has to be a known answer to the question actually being asked.** The fibre walk was
withdrawn for a whole session on a control that was known-answer for a *different* question — nine
numbers held, not six (§8). Before trusting a control, check that the instrument's own inputs are the
ones the control's answer is known for. Here that was one line of arithmetic: `12 − 6 − 1 = 5`.

---

## 7. Retracted — do not re-derive these

| claim | what was wrong |
|---|---|
| "λ = 0 makes the curve exactly planar" | sampling artefact: `t ∈ [−1,2]` crosses the pole, the blow-up dominates the point cloud, everything reads planar |
| "the chart covers 12 of 15" | 15 was an inflated **tangent space at a singular point**; the variety is 13 |
| "the singularity is the p/w gauge's fault" | the covariant form `Re(ĀC)=0`, `\|Ñ\|²=σ²` has the *identical* deficits — 2 and 6 in both |
| "complex poles will fix it" | at the same `(n,m)` a conjugate pair is exactly as singular — 27 of 30 both |
| "the missing freedom is Kalkan's non-constant μ" | `N` is primitive (its three components share no roots), so there is no common factor to be μ |
| `deg 𝒱 = 64` by witness sets | the computation is **not in the repo**; and 62/63/62 does not prove 64 — the invariance being invoked is contradicted by the data |
| "the (1,1) combination of the two fibre sliders is the symmetric one" | measured at asym 0.005–0.10 against 0.27+ for every other basis, and swept across six configurations — but it was a property of the SOLVER's landing, not of the torus. With ψ given a closed form the winner wanders (3,2), (1,2), (1,1) and the best asymmetry is 0.17–0.27 |
| "ψ's lopsided motion is the min-norm solver's basis dependence" | falsifiable, and falsified by the test proposed for it: with every step closed form, ψ alone gives 0.578 / 3.397 / 3.731 against the solver's 0.554 / 3.785 / 3.590. The shear is geometry — ψ turns the spinor AT AN END, and that is an end-weighted motion however it is computed |
| conformal moduli 6 (slide) / 8 (module) | both wrong; it is **7**, and the formula is `2n−5`. The module subtracted 9 for a 10-dimensional group; the slide subtracted the scale twice |
| "the run-out diverges" as the pole approaches | `‖c′(1)‖` grows 6.6×, not ~1340× — the data is held, so the curve *reshapes* |

---

## 8. Open

**~~The walk fails its control~~ — RESOLVED 2026-08-14. The control was misapplied, not the walk.**
`fiberLoop` holds **six** numbers (`c′(0)`, `c(1)`). On the polynomial quintic that leaves
`12 − 6 − 1 = 5` — a **five-dimensional** fibre with no loop in it, which is all the "`|𝒜|` grows
5 → 34" was measuring. The quintic is a provable circle only with **nine** numbers held, and that is a
*torus*, where a generic tangent winds forever — so it could not have been this walk's control either
way.

The right control is the **polynomial PH cubic**: `8 − 6 − 1 = 1`, and the six numbers it holds are
exactly the six the walk holds. It is a provable Hopf circle by the same completion of the square, which
in this module's *monomial* basis reads `Y = A₁ + 3/2·A₀`, `Y i Ȳ = 3Δc − ¾c′(0)` (the ½ in
`spatialQuinticTorus` is the Bernstein coefficient — same algebra, different basis).

```
polynomial CUBIC    fibre 1    CLOSES     gauge 5.3e-10   indicatrix 3.5e-10   curve 5.0e-11
rational quintic    fibre 1    CLOSES     gauge 8.5e-11   indicatrix 3.7e-11   curve 1.9e-12
polynomial QUINTIC  fibre 5    REFUSES    gap 7.5 — correctly reports that there is no loop
```

with both Hopf identities held to 1e-13 along the whole cubic walk. **The one-dimensional rational
fibre genuinely closes.** → `fiberClosure.test.ts`

**~~`fiberLoop`'s closure test is weak~~ — FIXED.** The three-point trigger on `t ∈ [0,1]` fired at step
155 of 158 with the full indicatrix still 1.6e-2 away; the closest approach was always the *last step
taken*, i.e. the walk was still coming back when it was stopped. `fiberClosure` now measures the gap
**modulo the Hopf gauge** — exact and complete, since the same `𝒜` mod gauge is the same curve at every
`t`, so there is no window to hide outside of — waits for the walk to leave, detects the turn *near the
start*, and refines the final step onto it by golden section (bracketing, because the distance is
V-shaped at a true return). `indicatrixDistance` exposes the sphere-picture measure separately, sampled
over `t ∈ [−2,2]`: `T = c′/‖c′‖` is a unit vector everywhere, so it is the one quantity safe to sample
past a pole.

**THE SECOND CIRCLE HAS A CLOSED FORM** (`rationalHermiteCircles.ts`, `rationalMiddleCircle.test.ts`).
Hold both end spinors; the variations are `{X·u(t)}` for one **complex** cubic `u` with
`u(0)=u(1)=0` and `u′(r)=λi·u(r)`. Because `u` is complex, `u i ū = i|u|²`, so
`(Xu)i(Xu)* = |u|²·X i X̄` — **the Hopf map a second time** — and completing the square gives
`Y i Ȳ = T`, i.e. `𝒜(θ) = 𝒜₀ + (X₀e^{iθ} − X₀)u`. No solver; closes because `e^{2πi} = 1`. It replaced
a 2180-step walk. `hermiteChart` does the same for ψ — a *linear* solve for a particular member with both end spinors
prescribed, then the same completed square, with `quatFromSandwich(T)` as a canonical θ origin so the
particular solution's arbitrariness cancels. **The whole fibre is closed form, and both sliders are
wired to it** (`hermiteModel.ts`). The chart is *anchored* on the member it was built from, so
`at(0,0)` is that member: canonical is not the same as "where the user is", and an unanchored chart
would snap the curve to the canonical point every time a handle drag rebuilt it.

```
s + 360° returns, at every ψ    7.7e-15      ψ + 360° returns       8.0e-12
at(0,0) is the seed             8.0e-12      Hermite held on grid   8.0e-11
same cell by two routes         0            → it addresses a cell, not a history
```

**And a test shape worth reusing.** "Is the ψ sweep continuous?" cannot be answered by *largest step* —
the largest 1° step here is 17× the median, which reads as a jump and is not one. It is answered by
**refinement**: a fast region's step shrinks in proportion to the sampling (measured 1.44e-1 → 1.44e-3
for 100× the resolution), a discontinuity's does not shrink at all.

**AND IT RESTRICTS TO THE CLASSICAL CASE** (`polynomialLimitOfTheCircle.test.ts`), which is the test any
generalisation owes. Both ends of the twist dial cancel the pole (`|𝒜(r)|/scale` 2.75 → 7.8e-3), and
there the shape polynomial becomes `u → i·t(t−1)(t−r)` — the pole's own factor made explicit, and
exactly the factor that divides out of `𝒜`. So the rational middle circle **converges to the polynomial
quintic's**, linearly in the cancellation with a settled constant of 1.67:

```
θ = 70°   cancellation 1.4      circle gap 2.65     ratio 1.88
θ = 85°   cancellation 0.39     circle gap 0.65     ratio 1.68
θ = 89°   cancellation 0.078    circle gap 0.130    ratio 1.67
θ = 89.9° cancellation 0.0078   circle gap 0.0130   ratio 1.67
```

**~~Is the degree-6 C¹ Hermite fibre a torus?~~ — ANSWERED as far as numbers go: it is a CIRCLE BUNDLE
OVER A CIRCLE.** A walk along a generic tangent never closes there — and *neither does it on the
polynomial-quintic control*, whose fibre is a provable torus, because on a 2-torus a generic direction
winds forever. The fix is to use the circles the Hopf map already supplies:

```
c′(0) = 𝒜(0)i𝒜(0)*/w(0)²   ⟹  𝒜(0) free on a Hopf circle;  likewise 𝒜(1) over c′(1)
```

Pinning `𝒜(0)` **exactly** spends the global gauge, and the phase ψ of `𝒜(1)` against it is then a
coordinate that returns at 2π **by construction** — measured 2.4e-16, nine Hermite numbers held to
5.6e-13, indicatrix moving ≥1.74 on a unit sphere. Eleven conditions against a 12-dimensional fibre
leave one dimension, and *that* closes too: 648 steps on the control, **2180 steps / gap 1.7e-9** on the
rational sextic. So ψ closes and the fibre of ψ closes.

That is a torus **or a Klein bottle** — orientability was not measured, so the docs and the slide say
"fibred in circles over a circle" and stop. On the polynomial control the same structure *is* the
classical torus. → `degree6TwoCircles.test.ts`

**A wrong alarm worth not repeating:** along the failing walk `|𝒜|` grows 3.12 → 18.65, which reads as
escaping a compact fibre. It is not — all nine numbers hold to 6e-14 and the closed form's own
`|Y|² = |T|` holds exactly at every step. `|T|` is *not* constant (it depends on the end spinors' phase
difference, which is one of the torus coordinates) and the monomial coefficients amplify what the
Bernstein ones do (`|B₁|` only 2.52 → 5.61). **The monomial spinor norm is a bad proxy for position on
the fibre.**

The §9.5 pre-measurement is **done** (`degree6FibreDirections.test.ts`): rank 9 of 9 and kernel 3 (two
fibre + the gauge) at every configuration swept — λ at 5°/35°/70°, r at 1.15/1.7/4 — so the fibre is
2-dimensional everywhere the slide would put the user, and both directions move both the sphere and the
curve. What remains is to *close* each of the two into a circle.

**And a measure that misleads, recorded so it is not re-invented.** The differential ratio σ₂/σ₁ of the
map (fibre plane) → (indicatrix motion) is 0.093 for the rational sextic — but the **classical torus
control measures 0.069**, so that is roughly what a balanced two-slider family looks like, not evidence
of a weak slider. The ratio is taken in `familyBasis`'s coordinate metric, which carries no geometry,
whereas a slider is driven around its own *circle*. On the control, where both circles are known in
closed form, the full-turn travels are 16.80 and 20.68 — **ratio 0.812**, twelve times more balanced
than the differential ratio suggests. The predictive number needs the circles.

**Why is every chart member a singular point of the variety?** Rank deficit 2 at degree 4, 4 at degree
6, at every family tried. Not the gauge, not pole reality, not the pole count, not `deg w`. Unexplained.

**Is the fibre motion a rotation of the indicatrix?** No — best-fit rotation residual 1.6–1.8 on a unit
sphere, and `σ` changes by up to 1400%. What looks like rotation is the heavy drawn arc sweeping while
the pale full indicatrix deforms.

**`solveWithFreeLambda` misses at (4,5).** 120 deterministic starts, all miss.

---

## 9. The figure grammar — Eric's requirements, and they are requirements

These are not style preferences. They were each stated after looking at a built figure that got it
wrong, and every one of them cost a rebuild. A new figure that breaks one of these is wrong even if
every number on it is correct.

### 9.1 The pair

**Two slides, sphere first, curve second.** The sphere shows the tangent indicatrix; the curve shows
the Bézier curve. They are two views of ONE configuration, not two demonstrations.

**The same handles on both, and the state carries across the slide break.** One shared control strip
(`ChartControls.tsx`) and one shared store (`chartModel.ts`), so whatever is set up on the sphere slide
is what the curve slide opens on. If each slide built its own controls they would drift apart the first
time one was edited.

### 9.2 The strict / free toggle

**Only on the CURVE slide.** The two modes differ solely in which control points may be grabbed, and
the sphere draws none — a toggle there is a handle that changes nothing visible. The sphere keeps the
sliders, which do act on it.

**STRICT — the honest coordinates.** Exactly the right number of control points are draggable: the ones
that ARE the held data. Everything derived is drawn grey. Whatever degrees of freedom remain become
**named sliders**. The count must be **DERIVED, not chosen** — the arithmetic has to close against the
family's dimension, and that closure is what makes the mode honest. Do not offer a handle the family
does not have.

**FREE — drag anything, ends held.** Every control point is a handle, one at a time, and the endpoints
hold each other: move an interior point and both ends stay put; move one end and the other stays put.

**FREE HAS NO SLIDERS.** Once every control point is a handle there is no leftover coordinate for a
slider to be, and the dials are held during a free drag — a slider that still moved would be a second,
contradictory way to steer. Hide them.

### 9.3 Control points

**All draggable points are the same colour (blue).** `P₀` included. It is a handle, not a pinned mark,
and colouring it differently says "not yours to move" about something that is.

**Dragging `P₀` RESHAPES, it does not slide.** The other handles hold their positions *on screen* while
`P₀` goes to the cursor, so the curve changes shape between them. A rigid translation moves the picture
without moving the curve, so nothing is learned by doing it. (`p(0) = 0` pins `c(0)` inside the family,
so `P₀`'s drag is a change of ORIGIN — and its handle speaks WORLD coordinates, since its world
position *is* the offset.)

**Derived control points are drawn grey**, and the greying has to be real: it marks points the family
computes, not points we chose not to expose.

### 9.4 What not to draw

**No endpoint dots on the sphere.** The heavy dark arc already says which portion of the indicatrix the
drawn curve uses, and it says it along its whole length rather than at two points.

**No run-out, no escape ray on the curve.** Draw only the piece being edited, `t ∈ [0,1]`, with the pole
outside it. The continuation past the drawn piece cost a third of the frame and pulled the eye off the
thing being edited.

**A figure earns its place only by showing something the prose cannot** — a number moving the wrong
way, a handle that stops responding, a corner that refuses to soften. Not a picture of a fact.

### 9.5 Process

**Prose in chat first, JSX after. One slide at a time.**

**Slides 3 and 4 are fixed.** New material goes on NEW slides; do not modify the existing pair.

**Figure files hold no mathematics** — only marks and gestures. Every number a figure displays is
pinned in a core test, because r3f cannot be verified headlessly.

**Measure before designing the picture.** Both figures built this session needed corrections found by
eye, and one pair was removed entirely. Knowing the numbers are pinned says nothing about whether the
picture is worth drawing — sweep the configuration numerically and look at the ranges first.

---

## 9.6 The degree-6 pair — BUILT (slides 5 and 6)

`inside-the-chart` has: title, slide 1 (what a chart is), **slides 3–4** (the degree-4 pole pair) and
**slides 5–6** (the degree-6 Hermite pair, `hermiteModel.ts` / `HermiteControls.tsx` /
`HermiteSphereFigure.tsx` / `HermiteCurveFigure.tsx`).

The pair as built: **degree 6, one pole, C¹ Hermite held**, same grammar throughout.

```
STRICT                              handles
  P₀   c(0), the translation          3        draggable
  P₁   carries c′(0)                  3        draggable
  P₅   carries c′(1)                  3        draggable
  P₆   carries c(1)                   3        draggable
  P₂ P₃ P₄                            —        OUTPUTS, drawn grey
  the fibre                           2        sliders  ← two COORDINATES, not two directions (§8)
  twist λ                             1        slider
  pole r                              1        slider
                                    ────
                                     16        = the chart's dimension, measured

FREE     all seven control points draggable, one at a time, ends held, NO sliders
```

**The dial count is the POLE count.** One pole ⟹ **one** λ and **one** `r`, so the sliders are 2 + 1 + 1
= 4, and `12 + 4 = 16` closes against the measured chart dimension. Six sliders would be 18 — two dead
handles, which §9.2 forbids. (Six dials would mean three poles, and that family has fibre 8, so the map
to the nine Hermite numbers has rank ≤ 7: **C¹ Hermite is not posable there at all.** One pole is the
only degree-6 family in which this figure exists, which is a reason to choose it rather than a
convenience. Degree 4 fails the same way — fibre 8, rank 7 of 9 — which is why slides 3–4 hold six
numbers.)

**On a rational Bézier, `P₁` does not carry `c′(0)` by position alone**: `c′(0) = 6(w₁/w₀)(P₁ − P₀)`, so
the weight is in it too. The handle sets a direction and the family settles the magnitude — the same
situation slide 4's `dragTangent` already lives with, and the reason `strictHandlesTrack.test.ts` exists.

**No pole selector yet** — deferred until this pair exists. The four degree-6 families have fibres 12,
8, 4 and 0, so they cannot share a held-data convention; a selector wants to be its own slide, whose
punchline is that three of its seven buttons are empty by a parity theorem (§2).

**Both pre-figure gates PASSED.** Strict (`degree6HandlesTrack.test.ts`) — all four handles track:

```
P₁ (start tangent)   lands to 5.0e-14 of the cursor, the rest held to 2.8e-14
P₅ (end tangent)     lands to 9.3e-14        ← a handle degree 4 could not offer at all
P₆ (endpoint)        lands to 5.1e-14, both tangents held to 7.1e-15
P₀ (origin)          RESHAPES: the other three hold their SCREEN places to 1e-8
```

and the handles are **exactly** linear, not linearised: `w = ∏(t − r_k)` depends only on the poles, the
poles are held during a fibre motion, so `w₁/w₀` and `w₅/w₆` move by *exactly 0* across a drag.

Free (`degree6FreeDrag.test.ts`) — all seven gestures: the five interior points land to 3.2e-14 with
`c(1)` held to 6.5e-14 and `c(0)` at 1.4e-14, and the far endpoint lands to 2.4e-14. `P₀` is not in
that file on purpose: its gesture is a change of *origin*, not a motion in the family, and routing it
to the solver is the trap the degree-4 pair paid for once.

**Two figure lessons from looking at slide 5**, both recorded because they generalise:
- *A fan of ten members* made the pinning visible in a still frame and was removed anyway — with ten
  arcs there is nowhere to rest the eye. Turning ψ **is** the answer set, and it keeps the focus.
- *Sample in arc, not in the parameter.* The pale full indicatrix drew one chord of **0.166** on a unit
  sphere at the closest pole — a visible polygon — and 3000 uniform points only reached 0.050, because
  the ratio grows as the pole approaches. `indicatrixArcSmooth` / `indicatrixLoopSmooth` bound every
  chord for 1000–2100 points. The drawn piece `t ∈ [0,1]` was never the problem (gain there: 1.2–1.5×).
  → `indicatrixArcSmooth.test.ts`

`projectOnto(prm, readout, target)` is the generic form — any smooth readout a handle can hold;
`projectToData` is now the `dataOf` case of it, and `fiberClosure`/`fiberTangent` take the readout too,
so the closure instrument works on the nine-number fibre as well.

**One number to keep an eye on: 9 ms per projection**, against a 16.7 ms frame — it fits, without room
to spare, and is ~3× the degree-4 cost. The lever, if needed: `readoutJacobian` rebuilds a 9×12
finite-difference Jacobian every Gauss–Newton iteration (24 member evaluations each) and the readout is
smooth enough to reuse it. Recorded so the cause is known before anyone hunts for it elsewhere.

## 9.7 Metamorphic testing — the axis that was missing

*Added after Eric pointed out, correctly, that his only cheap check on this work is symmetry, and that
it kept failing while I kept explaining why it could not hold.*

**Every test in this project until now was a PINNING test**: today's numbers match today's numbers.
That catches regressions and structurally cannot catch a formulation that was always wrong. There is no
oracle here — nobody can say what curve the fibre slider *should* produce at θ = 2.2 — so the check that
remains is how the answer must change when the INPUT changes in a known way.

`rationalSymmetries.ts` supplies the group actions as **exact rewrites**, no solver:

```
reverseParam   𝒜̃(t) = 𝒜(1−t)·j,  r̃ = 1−r,  λ̃ = λ    data: (d₀,d₁,Δc) ↦ (−d₁,−d₀,−Δc)
rotate         𝒜 ↦ q𝒜             scaleBy   𝒜 ↦ √s·𝒜
gauge          𝒜 ↦ 𝒜e^{iθ}        — the NULL test everything else is read against
affineReparam  𝒜̃(t) = 𝒜(at+b)/√a, r̃ = (r−b)/a, λ̃ = aλ
```

**EQUIVARIANCE, NOT INVARIANCE — the distinction that cost four exchanges.** Hunting for a configuration
that is its own mirror is hard and here impossible (`r = 1−r` needs `r = 1/2`, inside the drawn piece).
Asking whether *mirroring the input mirrors the output* needs no special configuration, applies to every
seed, and is far more sensitive. **§7 records the wrong turn**: I had a correct theorem about invariance
and let it stand in for an experiment about equivariance, and I never once fed the construction
symmetric data.

**Result: the middle circle is exactly equivariant.** `reverse(circle(m))` and `circle(reverse(m))` are
the same circle — in the `{X·u}` space to 5e-16, on the Hopf fibre over the same `T` to 2e-14…7e-12,
same radius. → `rationalEquivariance.test.ts`

**And check it algebraically, not by searching.** Comparing the two circles by sampling curves and
hunting the nearest angle floored at **2.2e-4** and stayed there under refinement — which reads as a
real disagreement and was not. The circle *is* the Hopf fibre over `T`, so the exact question is whether
`Y i Ȳ = T`: that is 1.7e-13 and needs no grid. **A sharper criterion beat a finer grid.**

---

## 10. How this work goes wrong, and the habits that catch it

Recorded because the same three failures repeated all session.

1. **A number measured at one configuration, restated as a structural fact.** Three retractions came
   from this. Say "measured at this seed" until it is swept.
2. **An instrument with no control.** Every rank, every fit, every walk needs a case where the answer is
   known. Two instruments were discarded this session on their controls, and one result was withheld on
   a *miscalibrated* control that turned out to be fine.
3. **Answering a failing heuristic with an explanation instead of an experiment.** Eric's symmetry
   check failed four times running; each time I produced a true reason it might not hold (the `r = 1/2`
   obstruction, the solver shear, the basis choice) and never once constructed the configuration where
   it must. The correct first move when a user's check fails is to **build that exact configuration and
   run it** — explanations only after, and only if the experiment agrees. The tell is writing "that
   cannot hold because…" before having measured.
4. **A figure built before asking what it shows.** Two figures needed corrections found by eye, and one
   pair was removed entirely — it walked an arbitrary path through the variety and called it "the
   missing degree of freedom" when the missing direction is a specific, constructible one.

And the reverse: several of the best results this session came from Eric asking a plain question —
*"can the missing dimension be a reparametrisation?"*, *"is it often one degree less?"*, *"how many
fibre sliders?"* — that reframed a measurement programme in one line.


---

## 11. The mathematics underneath — where the depth actually is

*Written for whoever picks this up next. The sections above are what we measured; this is the theory
those measurements are shadows of. Almost every hard-won result in this file is a special case of
something classical, and knowing which one turns a week of numerics into a paragraph.*

### 11.1 The five structures that do the real work

**The Hopf map, made algebraic.** `N = 𝒜i𝒜*` is the Hopf fibration `S³ → S²` written in polynomial
coefficients. The gauge `𝒜 ↦ 𝒜e^{iθ}` is *literally the Hopf fibre*, which is why it moves no curve.
Its image is exactly the Pythagorean quadruples — that is the content of "PH is free in this
representation", and the reason the whole construction exists. When something in this project is
invariant under the gauge, look for a Hopf-theoretic reason before computing.

**Sums of squares, and the Pythagoras number of `ℝ[t]` is 2.** `σ = |𝒜|²` is a sum of FOUR squares,
and this is not decoration: every nonnegative real polynomial is a sum of *two* squares, which is why
the planar theory is elementary and the spatial one is not. The 2D/3D gap this project keeps meeting
is exactly one square against a sum of two. Pfister's theory and the Cassels–Ellison–Pfister circle
of results are the right background; `sp11SquareClass.test.ts` was the first probe into it.

**Hurwitz's theorem** — composition algebras exist only in dimensions 1, 2, 4, 8. This is *why* there
is a quaternionic spinor representation in 3D at all, and why the same trick does not generalise
upward. If a future idea needs "a nice product on ℝⁿ", Hurwitz decides whether it can exist.

**The residue theorem on `ℙ¹`.** §3's whole story — three dependencies at `m = n+1`, the fibre
collapsing, the `dim 𝒱` caveat — is the classical statement that the residues of a rational
differential sum to zero. We rediscovered it numerically over two days. The general lesson: **when a
dimension count fails, look for a syzygy among the equations**, not for a bug.

**Conformal geometry: `Cl(4,1)`, `Sp(1,1) ≅ Spin(4,1)`.** Points of `ℝ³ ∪ {∞}` as null vectors in
`ℝ^{4,1}`, spheres as ordinary vectors, and Möbius transformations acting **linearly**. This is the
formulation in which the `p/w` gauge's artefacts (the `σ = 0` stratum, the absorbing theorem) become
visible as artefacts. Note the measured caveat: the covariant form does **not** remove the singularity
(§7), so it is a better *language*, not a cure.

### 11.2 The habits that would have saved this session

- **Prefer a derivation to a measurement when one is available.** The polynomial torus is *derived* —
  three Hopf circles, gauge the diagonal — and is therefore certain. Ours is measured and still
  unresolved. A derivation needs no control.
- **Find the group acting, and quotient by it early.** Hopf gauge, projective scale, `PGL(2,ℝ)` on the
  parameter, `O(4,1)` on space. Nearly every dimension we got wrong was a group we had not divided out
  — or had divided out twice (§7, the conformal moduli).
- **Distinguish parametrised from unparametrised.** PH is a property of the *parametrisation*, not the
  point set. The entire "missing degree of freedom" turned out to be `PGL(2,ℝ)` acting on `t`.
- **Distinguish the Zariski tangent space from the local dimension.** At a singular point the tangent
  overestimates. "12 of 15" was that mistake; the answer was 13.
- **Ask what is invariant before computing in coordinates.** Half of the retractions in §7 are
  coordinate artefacts.

### 11.3 References

*Present in `~/Documents/Carlotta` and used directly:*

- **Kalkan, Scharler, Schröcker & Šír**, *Rational Framing Motions and Spatial Rational Pythagorean
  Hodograph Curves*, CAGD 2022 (arXiv:2111.04600). **The central paper for this line.** Theorem 3.6
  characterises all rational PH curves via motion polynomials `C = (α + εb)𝒜`; Theorem 4.6 gives the
  cusp/inflection criterion we use; Rem. 4.7 is our pole ⟺ cusp fact. Its stated future work — "fully
  describe the basis of the linear system of PH curves with given tangent indicatrix" — *is* our
  `familyBasis`.
- **Farouki & Sakkalis**, *Construction of rational curves with rational arc lengths by direct
  integration*, CAGD 74, 2019.
- **Farouki & Šír**, *Rational Pythagorean-hodograph space curves*, CAGD 28, 2011.
- **Farouki, Giannelli & Sestini**, *New developments in theory, algorithms, and applications for PH
  curves*, 2019 — the survey; the fastest way in.
- **Pottmann**, *Rational curves and surfaces with rational offsets*, CAGD 12, 1995 — the dual/envelope
  route, and the Laguerre-geometry doorway.
- **2026, "A complete characterization of PH preserving mappings"** — recent, in the folder, not yet
  read here. Likely bears directly on the Möbius question.

*Cited from memory — verify before relying on a page number:*

- **Farouki**, *Pythagorean-Hodograph Curves: Algebra and Geometry Inseparable*, Springer 2008 — the book.
- **Farouki & Sakkalis**, *Pythagorean-hodograph space curves*, Adv. Comp. Math. 2, 1994 — spatial PH
  cubics are helices, which is our degree-4 closure result.
- **Choi, Lee & Moon**, *Clifford algebra, spin representation, and rational parameterization of curves
  and surfaces*, Adv. Comp. Math. 17, 2002 — the spinor/Clifford foundation.
- **Dietz, Hoschek & Jüttler**, *An algebraic approach to curves and surfaces on the sphere and on
  other quadrics*, CAGD 10, 1993 — the characterisation of Pythagorean quadruples, i.e. when
  `N = h·(𝒜i𝒜*)`. Relevant to the still-open question of §8.
- **Li, Schicho & Schröcker**, *Factorization of motion polynomials*, J. Symb. Comput. 92, 2019; and
  **Hegedüs, Schicho & Schröcker**, *Factorization of rational curves in the Study quadric*, Mech.
  Machine Theory 69, 2013 — the machinery behind `sp11Factorisation.ts`.
- **Sommese & Wampler**, *The Numerical Solution of Systems of Polynomials Arising in Engineering and
  Science*, World Scientific 2005 — witness sets, numerical irreducible decomposition, monodromy and
  the trace test. **If the `deg 𝒱` question is reopened, use a real tool** (`HomotopyContinuation.jl`
  or Bertini) with certified endgames that report path failures. §7 records why the ad-hoc version
  was withdrawn.
- **Cecil**, *Lie Sphere Geometry*, Springer — `ℝ^{4,2}`, `Spin(4,2) ≅ SU(2,2)`, where Möbius and
  Laguerre are both subgroups. This is the stated destination: curves are the one-dimensional shadow,
  surfaces are the objects.

### 11.4 The one question worth the most

Every member the chart builds is a **singular point** of the PH variety — deficit 2 at degree 4, 4 at
degree 6, in both the `p/w` and the covariant formulations, at every family tried. Not the gauge, not
the reality of the poles, not the pole count, not `deg w`. All four tested and dead (§7).

An explanation would probably be one line of the right theory, and it would likely also settle whether
the Hermite fibre is a torus. My guess, untested: it has to do with `σ = |𝒜|²` being a *sum of four
squares* rather than merely a nonnegative polynomial — a semialgebraic condition sitting inside an
algebraic one. Dietz–Hoschek–Jüttler is where I would look first.

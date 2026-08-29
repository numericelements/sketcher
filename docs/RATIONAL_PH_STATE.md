# Rational spatial PH curves — where we are

*Working state as of 2026-08-15. The durable facts live in the test files named below; this file is
the map, the retractions, and the plan. If you are picking this up cold, read this first, then the
tests it names — not the other way round. §11 is the mathematics underneath, and is the place to start
if the goal is to advance the subject rather than to continue the code. §12 is what the LITERATURE
says about all of it, read from the papers themselves — go there before claiming anything is new.
§13 is where the two chart types turn out to touch.*

The goal behind all of it: **local modification of 3D PH curves during editing**. The rational work is a detour taken to understand 3D PH curves well enough to get there.
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

**AND THIS CLOSURE IS SHARED WITH THE OTHER CHART TYPE — see §13.** The polynomial a λ-chart
degenerates to is the *same curve* as one sitting inside the conformal family at twice its degree,
measured for `d = 4` (polynomial cubic ↔ conformal 6). So the table above is not only the λ-chart's
boundary; it is the list of places the two chart types touch.

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

**BUT SEE §12.** The literature states outright that rational arc length is a *proper subset* of
rational PH, while `rationalArcLengthInChart` says every chart member has it for free. Those two and
this section's headline sentence cannot all be unrestricted. The likeliest fix is that "everything"
here means *at a fixed `(n,m)`*, and the sentence needs that qualifier — but it is untested, so the
claim above should be read with §12 open beside it.

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
| "`a² + b²` is a perfect square only when `a` and `b` are **proportional**" (price-of-a-circle, and the comment in `planarDualChart.test.ts`) | False. `a = t²−1`, `b = 2t` are coprime and not proportional, yet `a² + b² = (t²+1)²`. Proportional ⟹ square; the converse fails badly. The real condition is **Kubota's**: `a² + b²` is a square iff `a + ib` is a square in `ℂ[t]` (here `(t+i)²`), i.e. iff the pair is itself a *planar PH hodograph* — a recursion, not a wall. The test's ASSERTIONS were right throughout; only the prose was wrong, which is the failure mode to fear. Caught by the Lean companion |
| "the Pythagoras number of `ℝ[t]` = 2 is the obstruction" | It is an *enabling* theorem — never more than two squares are needed — not a scarcity statement, and it answers a different question than the one asked (`is σ a sum of two squares` vs `is Q₂²+Q₃² a square`). Decoration wearing the clothes of a reason. Invoked twice this way; see §11.4's retraction and the row above |
| "`σ` being a sum of FOUR squares is a semialgebraic condition inside an algebraic one" (§11.4's guess) | Same fact, opposite direction: `p(ℝ[t]) = 2` makes "sum of four squares" and "nonnegative on `ℝ`" the same condition for one polynomial. No extra content. The successor is the COUPLING of `σ` with `N`, i.e. `C5`/Dietz–Hoschek–Jüttler — see §11.4 |
| "the dual/support-function method is planar-only" | Not established, and our own citation says otherwise: Pottmann's dual **was** generalised to spatial rational PH curves (Schröcker & Šír's third method, and an earlier one in their §1). What is true is about the MECHANISM — a support function needs tangent *hyperplanes*, so the naive transfer wants **codimension 1**: plane curves, and SURFACES in space. Consequence for the roadmap: the direct analogue of planar rational PH is **PN surfaces**, which Pottmann 1995 already covers in the same framework, so they may be the *easier* next step rather than the distant one |

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

### The mirrored slider pair — symmetry used to DEFINE a coordinate

Eric's requirement, heard correctly on the third attempt: not two sliders each individually symmetric,
but a **pair the mirror EXCHANGES** — turn slider 1, mirror the picture, and it should look like you
turned slider 2.

Working out how reversal acts on the three Hopf phases (ends swapped, each phase negated) gives

```
σ: (ψ, s) ↦ (ψ, ψ − s)      M = [1 0; 1 −1],  M² = I,  det = −1
```

and that matrix **is** conjugate to the swap over `ℤ`, with `e₁ = (1,0) = ψ` and `e₂ = Me₁ = (1,1) =
ψ + s`. The linear part checks out exactly — each phase picks up `−0.70` for a `+0.70` input. **But the
exact exchange came out only to 2.3e-3 and stayed there under refinement**, because `s` is measured from
`Y₀ = quatFromSandwich(T)` and `T` depends on ψ: the s-origin drifts and the chart is not quite affine.

**The fix is to stop coordinatising and let the symmetry define the second slider:**

```
slider 1 = the ψ loop        slider 2 := σ(slider 1)
```

Exchanged by construction, since `σ² = I` — no coordinate left to drift.

```
σ² = identity                    0.00e+0        σ(s₁)=s₂ and σ(s₂)=s₁     0.00e+0
both loops close at 2π           5e-16          C¹ data held on both      7.6e-15
the loops are distinct           separation 8.2e-2 on a span of 1.65
```

**And the picture is the point** — orbit radius of each control point over a full turn:

```
slider 1:   0.000  0.000  0.151  0.579  0.000  0.000
slider 2:   0.000  0.000  0.579  0.151  0.000  0.000     mirror images to 1.8e-14
```

*"It turns about one control point, and then about the other"* — what the polynomial deck does and ours
did not. → `mirroredSliderPair.test.ts`

**Scope:** σ must act on the *fibre*, which needs symmetric C¹ data (`d₁ = −R d₀`, `Δc ⊥ axis`) and no
pole to move. Note the symmetric-data condition is `d₁ = −R d₀` and **not** `d₁ = R d₀` — using the
latter cost a round of measuring the wrong configuration and reporting a real number about it.

### On the rational side: exact in the limit, and controlled before it

`sliderPairAcrossThePole.test.ts`. The **data half** of σ is exact at every pole (1e-14) — the map
`(d₀,d₁,Δc) ↦ (−d₁,−d₀,−Δc)` composed with the rotation is the identity on symmetric data,
algebraically and independent of `r`. Only the **pole half** is approximate, because σ sends `r ↦ 1−r`
and that is a *different chart*. So the error is exactly the gap between the chart at `r` and the chart
at `1−r`, and it closes as both run off to infinity:

```
r        σ(ψ) vs the ψ+s LOOP     control: vs the ψ loop      |A₃|/scale
1.7        4.0e-2                   2.0e-1                      0.32
5          1.7e-2                   2.4e-1                      —
20         3.7e-3                   2.4e-1                      0.045
100        3.3e-3                   2.4e-1                      0.0091
1000       —                        —                           0.00091
```

A 12× improvement with the control flat throughout, so which loop σ lands on is never ambiguous.

**Both ends of the usable range are real.** Below `r ≈ 20` the pole asymmetry shows; above `r ≈ 100` the
CHART degenerates — `|A₃| → 0` like `1/r`, because the `r → ∞` limit of a degree-6 one-pole family is
the polynomial **quintic** (a degree-6 polynomial PH curve cannot exist, PH polynomials having odd
degree). Past that the solve stops holding the handles. **Sweet spot `r ∈ [20, 100]`.**

### Arc length: rational always, constant never (on this fibre)

`hermiteFibreArcLength.test.ts`. Two questions with different answers.

**Rational, including at COMPLEX poles.** An explicit `S(t) = u(t)/w(t) + v(t)` fits `σ/w²` to 1e-15 and
matches 200 000-point quadrature to nine digits — for the degree-6 one-pole curve the slides draw, and
for complex conjugate poles with complex λ, which is exactly where an **arctan** would appear if one
were going to. The mechanism is stronger than "Σ is an empty sum at one pole": the log coefficient is
`Bₖ = [σ′(rₖ) − 2σ(rₖ)Σₖ]/φₖ(rₖ)²`, and the residue condition forces the bracket to vanish **at every
root**, because

```
σ′ = 2Re(𝒜′𝒜̄) = 2Σ·Re(𝒜𝒜̄) + 2λ·Re(𝒜i𝒜̄) = 2Σσ + 0
```

`𝒜i𝒜̄` being a *pure vector* — the Hopf map doing a third job, after making PH free and making the
interpolation fibre a circle.

**And there IS a conservation law, on the MIDDLE circle only.** Eric expected one from the quaternions
and it is there. On the polynomial quintic, arc length is the quadratic form `Σ mᵢⱼ⟨Bᵢ,Bⱼ⟩` with
`mᵢⱼ = C(2,i)C(2,j)/(5·C(4,i+j))`. Substituting `B₁ = Y − ¾S`, the terms **linear in Y** are

```
⟨Y, −(3/2)m₁₁·S + 2m₀₁·B₀ + 2m₁₂·B₂⟩     m₁₁ = 2/15,  m₀₁ = m₁₂ = 1/10
  = ⟨Y, −⅕(B₀+B₂) + ⅕B₀ + ⅕B₂⟩ = ⟨Y, 0⟩ = 0
```

an **exact cancellation**, leaving `arc = const + m₁₁|Y|²` — and `|Y|² = |T|` is fixed on the Hopf
circle. **The same ¾ that completes the square in the displacement kills the linear term in the arc
length.** One completion, two jobs.

```
                    MIDDLE circle (s alone)   end phase ψ
r = 1.7  θ = 35°      1.16e-9                   9.55e-3
r = 4    θ = −35°     9.92e-10                  1.61e-2
r = 20   θ = 35°      2.37e-8                   2.03e-2
```

and it holds on the **rational** side, where it was not derived.

**This also explains the pattern that started the question.** The 1-dimensional fibres over SIX numbers
(`c′(0)`, `c(1)`) — where `torusTimesRoads` measures length constant to 1e-9 at 1, 2 and 3 poles — ARE
the middle circle: once both ends are pinned the only direction left is the `Y` circle. So that
constancy was this law all along, and it is about the *direction*, not about the fibre's dimension.

**The SHIPPED sliders do move it, by 0.6 %–1.6 %**, because both `A = ψ` and `B = ψ + s` contain the end
phase. A length-preserving handle would be `s` alone — which is also the **−1 eigendirection** of the
mirror, `M = [1 0; 1 −1]` having eigenvectors `(2,1)` and `(0,1) = s`. So the eigenbasis `(2ψ+s, s)`
gives one mirror-symmetric slider and one that is mirror-antisymmetric *and* isometric; the exchanged
pair `(ψ, ψ+s)` gives neither. **That is a real design choice, not a detail.**

### The three symmetric configurations, and what each costs

```
r = 1/2          divisor ½ + 5·∞          symmetric ✓   pole INSIDE [0,1]     undrawable
r → ∞            divisor 6·∞              symmetric ✓   A₃ → 0, degenerates   no longer rational
{r, 1−r}, deg 7  divisor r+(1−r)+5·∞      symmetric ✓   poles straddle [0,1]  drawable AND rational
```

The first two are the two ways of giving up rationality — put the pole where you are looking, or push it
away until the spinor collapses. **Degree 7 with a mirror-paired pole set is the only configuration
where the mirror partner of the pole has somewhere to go that is neither inside the curve nor at
infinity**, and it carries full C¹ Hermite data with a 2-dimensional fibre (rank 9/9, fibre 12, leftover
2, measured). Its extra condition: `λ₁ = λ₂`, equal twists at the two mirrored poles.

**And there are TWO roads to the polynomial quintic, by different mechanisms:**

```
twist θ → ±90°    𝒜(r) → 0    the pole CANCELS          degree 6 → 5
pole   r → ∞      A₃ → 0      the SPINOR degenerates    degree 6 → 5
```

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

*Read directly for this work:*

- **Kalkan, Scharler, Schröcker & Šír**, *Rational Framing Motions and Spatial Rational Pythagorean
  Hodograph Curves*, CAGD 2022 (arXiv:2111.04600). **The central paper for this line.** Theorem 3.6
  characterises all rational PH curves via motion polynomials `C = (α + εb)𝒜`; Theorem 4.6 gives the
  cusp/inflection criterion we use; Rem. 4.7 is our pole ⟺ cusp fact. Its stated future work — "fully
  describe the basis of the linear system of PH curves with given tangent indicatrix" — *is* our
  `familyBasis`.
- **Farouki & Sakkalis**, *Construction of rational curves with rational arc lengths by direct
  integration*, CAGD 74, 2019.
- **Farouki**, *Arc lengths of rational Pythagorean–hodograph curves*, CAGD 32, 2015 — **read in full,
  §12.1.** The real/complex pole dichotomy, and it is our two chart types.
- **Schröcker & Šír**, *Three Paths to Rational Curves with Rational Arc Length*, arXiv:2310.08047,
  2024 — **read, §12.1.** All spatial rational curves with rational arc length; the `𝒜(1+i)𝒜*` lift.
- **Farouki & Šír**, *Rational Pythagorean-hodograph space curves*, CAGD 28, 2011.
- **Farouki, Giannelli & Sestini**, *New developments in theory, algorithms, and applications for PH
  curves*, 2019 — the survey; the fastest way in.
- **Pottmann**, *Rational curves and surfaces with rational offsets*, CAGD 12, 1995 — the dual/envelope
  route, and the Laguerre-geometry doorway.
- **Altavilla, Schröcker, Šír & Vršek**, *A Complete Characterization of Pythagorean Hodograph
  Preserving Mappings*, arXiv:2512.19587, 2026 — **READ, §12.1.** It did bear on the Möbius question:
  Thm 6 and Cor 9 say the PH-preserving maps in dimension ≥ 3 are precisely the Möbius
  transformations. F18's premise, now with a converse.

*Cited from memory — verify before relying on a page number:*

- **Farouki**, *Pythagorean-Hodograph Curves: Algebra and Geometry Inseparable*, Springer 2008 — the book.
- **Farouki & Sakkalis**, *Pythagorean-hodograph space curves*, Adv. Comp. Math. 2, 1994 — spatial PH
  cubics are helices, which is our degree-4 closure result.
- **Choi, Lee & Moon**, *Clifford algebra, spin representation, and rational parameterization of curves
  and surfaces*, Adv. Comp. Math. 17, 2002 — the spinor/Clifford foundation. **Read this before
  claiming the ℝ^{4,1} sphere polygon is new** (§12.4): the search found no conformal-lift
  construction anywhere, and this is the nearest thing to one.
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
the Hermite fibre is a torus.

**~~My guess: `σ = |𝒜|²` is a *sum of four squares* rather than merely nonnegative — a semialgebraic
condition inside an algebraic one.~~ RETRACTED 2026-08-15, by the Lean companion.** The **Pythagoras
number of `ℝ[t]` is 2**: every nonnegative real polynomial in ONE variable is a sum of two squares
(factor into even-multiplicity real roots and irreducible quadratics `(t−b)² + c²`, each a sum of two
squares, and sums of two squares are closed under multiplication by the ℂ-norm identity). Sum of two
⟹ sum of four. So for a single polynomial, "sum of four squares" and "nonnegative on ℝ" are the SAME
condition and there is no extra semialgebraic content to be the culprit. The guess cost nothing only
because it was written down where it could be checked.

**The successor is not nothing — it is `C5`.** If an explanation of that flavour is right it cannot be
about `σ` alone; it must be about the COUPLING, since `σ` and `N` come from the same `𝒜`. The sharp
form of that is: given a Pythagorean quadruple `(N, σ)`, when is it `𝒜i𝒜*`? That is
Dietz–Hoschek–Jüttler, the answer is *"up to a common factor `h`"*, and it is already on the Lean
ledger as `Claims.spatial_representation`.

**AND ASK THE SYZYGY QUESTION FIRST, before any theory.** The fact above is a **rank deficit of a
chosen equation system**, and a deficit means the variety is singular *or* the equations are
redundant. This project has already resolved that ambiguity the second way, twice:

- the degree-6 conformal system's "23 of 24" turned out to be **a redundant EQUATION, not a spurious
  direction** — which moved the family from 17 to 18 (`conformalPHStructure.test.ts` finding 14);
- §3's `m = n+1` collapse is three dependencies, and they come from residues summing to zero — the
  residue theorem on `ℙ¹` including the point at infinity, which is also *why* the degree threshold
  `deg N ≤ deg w² − 2` appears there at all.

So the first question for §11.4 is: **is the deficit-2-at-degree-4, deficit-4-at-degree-6 pattern a
syzygy among the `|N|² = σ²` equations?** Two precedents say it may be. The general form of the lesson,
worth keeping: *when a dimension count fails, look for a syzygy among the equations before looking for
a bug or a theory.*

**One distinction that dissolves part of the worry.** *Representation-complete* (the spinor map is
surjective) and *chart* (that map is regular near a point, so it can be inverted and dragged) are
independent. A map can be surjective and singular on a whole stratum — `t ↦ (t², t³)` is onto the
cuspidal cubic and its differential dies at 0. So "every chart member is a singular point" is a
**regularity** statement and casts no doubt on **completeness**. It also splits the labour cleanly:
surjectivity is algebra and belongs on the Lean ledger; rank and local dimension are measurements and
belong here.

---

## 12. The literature check — 2026-08-15

Three papers read from the PDFs themselves, not from abstracts. **The two-chart-type picture is
confirmed, the residue criterion is standard, and one of our own claims turns out to be measured more
narrowly than it is stated.** Everything below is quoted; page and equation numbers are the papers'.

### 12.1 Confirmed

**Rational PH does not imply rational arc length, and the criterion is the residue.** Farouki 2015:

> "in general rational PH curves do *not* have rational arc length functions, since the integral of a
> rational function may involve transcendental (logarithmic or arctangent) terms"

> "the general condition for a rational function to have a rational integral is that the residues at
> each of its poles must vanish" — citing Henrici, *Applied and Computational Complex Analysis* §7.2

**And his real/complex dichotomy IS F18's two chart types, reached in 2015 by a different route.**
This is the strongest single confirmation and it was not expected. Farouki 2015, p. 4:

> "If Im(**c**) ≠ 0, the function (4) has the distinct **simple poles** t = **c** and t = **c̄** …
> Clearly, these values cannot both vanish when **a₁**, **a₃** are non-zero. On the other hand, when
> Im(**c**) = 0 … the function (6) has only the **double pole** t = c. The residue of σ(t) at this
> pole is d/dt[(t−c)²σ(t)]|₍ₜ₌𝑐₎ = 0, and hence s(t), the integral of σ(t), is a rational function."

Read his two denominators and the identification is exact:

```
real centre     σ = |6a₃(t−c)² + a₁|² / 12|a₃|(t−c)²     =  σ/w²  with w = t−c            ← a λ-chart member
complex centre  σ = |6a₃(t−c)² + a₁|² / 12|a₃||t−c|²     =  h/w   with w = (t−c)(t−c̄)     ← the σ = h·w stratum
```

So his short communication carries one worked example of **each** of our two chart types, and the
arc-length dichotomy between them is exactly F18's. His examples give the numbers: complex centre →
`s = 3t³ − 9t² + 24t + 12 ln√(t² − 2t + 2) + 10 tan⁻¹(1/(t−1))`; real centre → a rational `s`.

**A real pole is a point at infinity, and hiding it outside the drawn interval is the standard move.**

> "Note that Im(**c**) ≠ 0 must be assumed to exclude real points at infinity"

> "A real value c for the center of the Laurent series generates a point at infinity on the curve
> **r**(t) — an undesirable feature in most practical applications — although for a finite curve
> segment one can always choose c to lie outside the prescribed curve parameter domain t ∈ [a,b]"

which is precisely what the degree-6 pair does with `r = 1.7` drawn on `t ∈ [0,1]` (§9.6).

**The circle is his degenerate case, and its length is an arctangent.**

> "the locus **r**(t) = **a₋₁**/(t−**c**) + **a₀** simply defines a circular arc … The length of a
> circular arc is obviously determined by its angular extent, which involves an arctangent dependence
> upon the parameter t"

His eq. (5) also splits the arc length as `polynomial + β ln|t−c| + γ arg(t−c)`: **the real part of
the residue is the logarithm's coefficient and the imaginary part is the arctangent's.** A real pole
has a real residue, so it can only ever produce a logarithm — an arctangent requires leaving the real
axis. That is the one-line reason a bounded curve is where the arctangent lives.

**Rational arc length is a PROPER SUBSET of rational PH — stated outright.** Schröcker & Šír 2024, §1:

> "Whereas all polynomial PH curves have polynomial arc length functions, only a **proper subset** of
> the rational PH curves admits rational arc lengths. Determining this subset seems to be a rather
> difficult problem."

with their Lemma 2.1 giving the converse: a rational curve with piecewise rational arc length is
necessarily PH.

**Their quaternion representation is ours, symbol for symbol.** `𝓕 = 𝒜i𝒜*`, `N(𝓕) = σ²`, and their
Corollary 2.4: `r = ∫λ𝒜i𝒜* dt` and `s = ∫λ𝒜𝒜* dt` both rational. Their eq. (8) then packs both into
one equation through `𝒜(t)(1 + i)𝒜*(t)` — the curve is the vector part and the arc length the real
part of a rational curve in ℍ ≅ ℝ⁴. **A four-dimensional lift unifying curve and length; ours is a
five-dimensional lift unifying curve and sphere.** Different lifts, same instinct, and worth comparing
properly before building more on either.

**Möbius is exactly the PH-preserving group.** Altavilla, Schröcker, Šír & Vršek 2026 — the paper
§11.3 listed as sitting unread — Theorem 6, and Corollary 9: for `n ≥ 3` the PH-preserving maps are
**precisely** the Möbius transformations, sphere inversions included. F18's premise is now a theorem
with a converse.

### 12.2 What this narrows — RESOLVED 2026-08-15, and the caution was itself wrong

**The original entry said:** the arc-length claim "has only ever been measured at REAL poles", because
`roots` is `number[]` so "nothing else can be measured today". The first half was fair; the second read
one module's signature as a statement about the codebase. **`rationalPHComplexPoleSpatial.ts` is the
same chart one axis wider** — conjugate pole pairs, one complex λ per pair, `familyBasis` returning 8
and 12 — and it had been sitting there the whole time.

Measured off the real axis, `|σ′(r) − 2σ(r)Σ|` relative:

```
n=3, pole 0+1i      8.8e-17
n=3, pole 0.4+1.3i  1.0e-16
n=4, pole −0.2+0.8i 6.5e-16
```

So **rational arc length is free at complex poles too**, exactly as the derivation said it should be —
it never used the reality of `r`. → the last test in `rationalArcLengthInChart.test.ts`.

**AND COMPLEX POLES ARE NOT THE STRATUM**, which is the distinction the original caution blurred. Those
same members have `|σ(r)|/scale ≈ 1.0–1.4` — nowhere near zero. A conjugate pair with σ ≠ 0 is an
ordinary chart member: **bounded, and hard-poled**. Farouki's arctangent example is still not a
counterexample, for the reason it never was — his σ has *simple* poles (`w | σ`), so it is a stratum
member. Complex ≠ soft, and the generic complex pole is hard.
→ `realPolesCannotBeOnTheStratum.test.ts`

**The one that survives, restated properly.** The stratum is where **𝒜(r) is SINGULAR**, not where it
vanishes. Over ℂ, ℍ ⊗ ℂ ≅ M₂(ℂ) is not a division algebra and `det 𝒜(r) = σ(r)`, so 𝒜(r) can be nonzero
and singular — measured on the published cubic at its pole: `|𝒜(ι)| = 4.2426` with `𝒜(ι)𝒜̄(ι) = 0`.
F17's "𝒜(r) = 0, equivalently σ(r) = 0" therefore holds **only on the real axis**, where ℍ *is* a
division algebra. What the λ-chart divides by is `det 𝒜(r)`, so its requirement is `σ(r) ≠ 0` at every
pole, real or complex — and the two chart types stay disjoint off the real axis for the same reason
they do on it.

### 12.3 The tension with §4, and how to settle it

§4 says the chart reaches every degree-4 rational PH curve up to reparametrisation (variety 13, chart
12, the gap being `PGL(2,ℝ)`). Combine that with "every chart member has rational arc length" and you
get "every degree-4 rational PH curve has rational arc length", contradicting the *proper subset* above.
One of three things is true and we do not know which:

1. **the likeliest** — §4's coverage is about `𝒱` at a FIXED `(n,m)` while the proper-subset statement
   ranges over all pole configurations and degrees, in which case §4's headline sentence simply needs
   an `(n,m)` qualifier;
2. the rational-arc-length claim has a scope limit not yet found (see §12.2);
3. the `σ = h·w` stratum sits inside `𝒱` — F18 measures its points as smooth, full rank — so "every
   chart member" and "every point of `𝒱`" are different sets, and the chart misses the stratum inside
   its own variety.

**Cheap to attack, and it is now a task rather than a worry:** the stratum members are exactly those
with `w | σ`, so intersect the degree-4 variety with that divisibility condition and ask whether the
result is nonempty and whether the chart's tangent reaches it.

### 12.4 Not found in the literature

Two reading sessions, not a survey — so this is "not found", **not** "new". Both need a real search
before any claim is made in a paper:

- **The identity `σ̃ = σ·w̃` under inversion, and the stratum being ABSORBING.** The PH-preserving
  paper proves Möbius preserves PH and says nothing about what happens to the pole and speed
  structure. "One inversion always lands on the stratum and nothing ever leaves it" appears in nothing
  read so far.
- **The ℝ^{4,1} conformal null-lift construction with the control polygon as WEIGHTED SPHERES**
  (`conformalPHCurve.ts`). No search hits at all. **Choi, Lee & Moon is the paper to read first** — it
  is already in §11.3 and is the Clifford/spin representation of the *hodograph*, which is the
  quaternion picture we already use, but that must be confirmed rather than assumed before the sphere
  polygon is called new.

### 12.5 The papers, exactly

- **Farouki**, *Arc lengths of rational Pythagorean–hodograph curves*, CAGD **32** (2015) 1–5. A
  five-page short communication and the single most relevant paper to the arc-length side of this
  work. Written to correct Lee, Jung & Kim (CAGD 31, 2014), which had claimed rational arc lengths for
  a family that does not have them. Closes by saying the vanishing-residue criterion "might, in
  principle, be used as the point of departure for identifying more general classes … **However, it is
  not obvious how to impose this condition in a geometrically meaningful manner**" — which is exactly
  what F17's bilinear form and the λ-chart do.
  <https://escholarship.org/content/qt90s84043/qt90s84043_noSplash_fd13b7ac928641b109d6b02c3aa36ee3.pdf>
- **Schröcker & Šír**, *Three Paths to Rational Curves with Rational Arc Length*, arXiv:2310.08047v2
  (5 Mar 2024); Appl. Math. Comput. 2024. Solves the open problem of constructing **all** spatial
  rational curves with rational arc length, three ways: a linear system adapting Kalkan et al. 2022;
  zero-residue conditions extending Farouki & Sakkalis 2019; and a spatial generalisation of
  Pottmann's dual approach. Already cited by `rationalArcLengthInChart.test.ts`; now also here.
  <https://arxiv.org/pdf/2310.08047>
- **Altavilla, Schröcker, Šír & Vršek**, *A Complete Characterization of Pythagorean Hodograph
  Preserving Mappings*, arXiv:2512.19587 (2026). Theorem 6: Φ is PH-preserving iff it is rational and
  its first fundamental form satisfies `G = λ²Iₘ` with λ a non-zero real rational function.
  Corollary 9: for `n ≥ 3` these are precisely the Möbius transformations.
  <https://arxiv.org/html/2512.19587>

---

## 13. The two chart types MEET, and the meeting place is the polynomials — 2026-08-15

**Why this section exists.** F18's atlas reads as two disjoint chart *types* and says nothing about
their closures. Eric asked the obvious next question: the λ-chart's twist dial runs out at a
polynomial, and a polynomial lifts exactly into the conformal family — so are the two spaces
connected through the polynomials? They are, and the answer is sharper than a yes.

### 13.1 The degree ladder, which is where an inference would have gone wrong

The pole cancelling drops the degree by one; the conformal lift doubles it. So the three families
that meet are not the ones with the same number on them:

```
λ-chart degree D, one pole   →   polynomial degree D−1   ←   conformal degree 2(D−1)

D = 4:   polynomial CUBIC,    conformal 6      ← the pair measured below, and slide 11's family
D = 6:   polynomial QUINTIC,  conformal 10
```

**So the family that meets slide 11 (conformal 6) at the polynomials is the degree-FOUR λ-chart, not
the degree-six one.** Both halves were already in the repo — `polynomialLimitOfTheCircle` on the λ
side, `conformalPHStructure`'s lifted cubic on the other — and pairing the two "degree 6" objects
would have been off by exactly one rung.

### 13.2 Measured

```
θ      90−θ    |𝒜(r)|/scale
0      90.0      1.77e+0
80     10.0      3.25e-1
89      1.0      3.28e-2
89.9     0.1      3.28e-3      a decade of angle for a decade of cancellation — LINEAR

deflate 𝒜 by (t−r)  →  a DEGREE-1 spinor, i.e. a polynomial PH CUBIC (§2: a helix, τ/κ to 3e-15)
its conformal lift  →  degree 6, residual 1.8e-14 — an exact member
the two curves      →  agree pointwise to 6.3e-4 of the extent (extent 2.619)
rank at the lifted polynomial  →  21 of 24 (nullity 20), against 23 of 24 (nullity 18) generic
```

**The curve comparison is the load-bearing one, and one trap is worth recording.** `|𝒜(r)|` alone
only says the spinor is *small* at the pole, and synthetic division's remainder **is** `𝒜(r)` — so
the "deflation defect" is the same number wearing a different name, not a second opinion. A first
draft of the test reported the two columns as independent evidence; they are not. Only the pointwise
agreement of the two curves says the pole DIVIDES OUT rather than merely shrinking.

### 13.3 What it changes

> **F18's two chart types are disjoint, but their CLOSURES meet along the polynomial locus.**

**READ THIS BY POLE DIVISOR, NOT BY "POLYNOMIAL vs RATIONAL" — the first draft of this paragraph got
its reason wrong.** It argued that a polynomial "satisfies `σ = h·w` only trivially with `w = 1`".
That is a defect in the criterion, not a fact about polynomials: **`σ = h·w` is vacuous whenever `w`
is constant**, so it cannot be used to place them. The classification that works (the Lean
companion's) is

> the **pole divisor on ℙ¹(ℂ)** — how many poles, where — **plus one bit per pole: does σ vanish
> there?**

Read that way, a polynomial is the divisor `d·[∞]`, and ∞ is a **real** point of ℙ¹, with
`σ(∞) = |leading 𝒜|² > 0`. So polynomials sit cleanly on the λ-chart side by the same rule as
everything else, and their appearance inside the conformal family is nothing special — §13.5 shows
the conformal model represents *every* rational curve. "Polynomial versus rational" stops being a
distinction at all; the polynomial is simply the most degenerate divisor.

**And the seam is a DIVISOR DEGENERATION.** What the twist dial does is cancel a pole: the divisor
goes from `[1.7] + …` to `d·[∞]`. That is a boundary between strata of one classification, not two
kinds of object touching. The measured content of §13.1–13.2 is unchanged; this is the right
description of it.

**AND THE SEAM IS THE LOWER OF TWO FLOORS — see §13.7.** Everything in §13.1–13.3 is about `𝒜(r) = 0`,
the rank-0 floor where the pole cancels. The stratum also has a rank-1 floor (`𝒜(r)` nonzero but
singular) which exists only off the equator and is where the circle lives. Reading this section as
"push the twist dial far enough and you arrive at the conformal world" reads the wrong floor.

**Which also splits F18's single stratum in two, and they are different phenomena:**

```
at a REAL pole      σ(r) = 0 ⟹ 𝒜(r) = 0 ⟹ (t−r) | 𝒜 ⟹ the pole CANCELS
                    — the degree-drop locus, i.e. this seam. FORCED, because the quaternion
                      norm form is DEFINITE on ℝ: σ(t) = |𝒜(t)|² is a sum of four real squares.
at a COMPLEX pole   σ(r) = 0 with 𝒜(r) ≠ 0 is possible, because over ℂ the form is ISOTROPIC
                    — the circle, the conformal world, the stratum proper. No degree drop.
```

Measured: `σ(t) = |𝒜(t)|²` on ℝ to 1.2e-15, and their ratio at a real pole is 1.000000 at every
twist angle, so σ(r) → 0 happens *exactly* when the spinor vanishes there. Against the published
rational PH cubic at its complex pole: `|𝒜(ι)| = 4.2426` — nonzero — with `𝒜(ι)𝒜̄(ι) = 0` exactly.
→ `realPolesCannotBeOnTheStratum.test.ts`

**A guard falls out.** "σ(r) ≈ 0 at a real pole" now has exactly one meaning: the spinor is divisible
by `(t−r)` and the curve is secretly of lower degree — the λ-side twin of `denominatorRealRoots`. It
is not by itself evidence of a bug, because nothing in `MultiPoleParams` enforces coprimality; the
check is for divisibility, not an assumption of reducedness.

**AND THE MEETING POINT IS SINGULAR IN BOTH CHARTS.** On the conformal side the defining Jacobian
drops to rank 21 of 24 there. On the λ side the meeting point is `𝒜(r) = 0` — precisely the quantity
the whole chart construction divides by (F17's `𝒜(r)⁻¹`, F19's note about running the chart
backward). So:

> The two spaces are connected **through a point neither chart can parametrise.** That is stronger
> than "one chart is not enough": the bridge itself has no coordinates.

It also explains a measurement that was sitting unexplained — bending the cubic fibres reaches only
3 of the 6 moduli, never all 6. The polynomials sit on a fold, so strictly fewer directions are
available AT them than arbitrarily close to them.

### 13.4 What it does NOT say

- **Not that you can edit across.** A solver walking from one chart to the other must pass through
  the rank-deficient locus, where both parametrisations fail. Nothing here contradicts F18's "no
  transport trick exists" — that is about Möbius carrying a curve INTO a λ-chart, which still cannot
  happen.
- **Not that the circle is reachable.** The circle is on the `σ = h·w` stratum but is not a
  polynomial; this section is about the polynomial locus only.
- **Not measured at D = 6.** The ladder predicts polynomial quintic ↔ conformal 10, and conformal 10
  has never been built here. Predicted, not checked.

**Pinned by** `src/core/__tests__/theTwoChartsMeetAtPolynomials.test.ts` (3 tests). Related:
`polynomialLimitOfTheCircle.test.ts` (the λ side, at degree 6), `conformalPHStructure.test.ts` (the
lifted cubic fibre, and the rank at a lifted polynomial).

### 13.5 The other direction, and it is a formula — added 2026-08-15

§13 above says the two chart types *touch*. The next question is whether either can **represent** what
the other represents, and it splits — cleanly, along surjectivity versus regularity.

**Conformal ⊇ everything, and nullity is FREE.** For any rational curve `x = q/w`,

```
P̃ = ( 2w² , 2w·q , ‖q‖² )        ⟨P̃,P̃⟩ = ‖2wq‖² − 2·(2w²)·‖q‖² = 0
```

by ring, with **no hypothesis** on `q` or `w`, no spinor, and no PH assumption. Measured on a
deliberately non-PH curve: `⟨P,P⟩ ≤ 2.8e-14`. So:

> **The conformal model is a model of RATIONAL CURVES, not of PH curves.** PH is a second,
> independent condition layered on it: `⟨P̃′,P̃′⟩ = W²‖x′‖² = 4‖q′w − qw′‖²`, a perfect square exactly
> when the curve is PH, and then `h = 2σ`.

Consequently **conformal representation-completeness is settled by construction**, needing neither
Dietz–Hoschek–Jüttler nor the spinor form. Measured on a λ-chart member with a *genuine* real pole
(σ(1.7) = 8.2, squarely off the σ = h·w stratum): curve degree 4 → **conformal degree 8, residual
1.1e-12**, same curve to **5.4e-16** of the extent.

**The other way is the asymmetry.** Matching `σ_spinor/w² = h/w` forces `σ_spinor = h·w`, i.e.
`𝒜(r) = 0` at each pole. The spinor **representation** reaches those (DHJ, up to a common factor);
the λ-**chart** cannot, because `𝒜(r)⁻¹` is exactly what it divides by. Same object, two questions,
two answers — which is why the surjectivity/regularity distinction in §11.4 is worth keeping.

### 13.6 The lift broke a proof: the parity theorem needs MULTIPLICITY

The step "at every real root `r` of `w`, `(t−r)` divides `q`, `w`, `c∞` and `h` alike" — asserted in
`conformalPHCurve.ts` and used to justify moving slide 11 to degree 6 — is **false at a root of even
multiplicity**, and the lift above is the witness. Lift a curve with a *simple* pole at `r`: the
lift's denominator is `2w²`, so `r` is a **double** root. Measured:

```
at r = 1.7:   W = 0,   ‖Q‖² = 8.3e-31,   c∞ = ‖q(r)‖² = 67.48
```

`(t−r)` divides `Q` and `W` as nullity forces, and does **not** divide `c∞`, because `gcd(q,w) = 1`.
Nothing factors: a genuine degree-8 member at residual 1.1e-12.

**The repair, and the theorem survives.** `‖q‖²` is a sum of real squares, so each of its real roots
has EVEN multiplicity — hence `mult_r(w) + mult_r(c∞)` is even and

```
(t−r) ∣ c∞   ⟺   mult_r(w) is ODD
```

Odd degree still delivers one: non-real roots of a real polynomial pair up with equal multiplicity,
so the real multiplicities sum to `deg w` mod 2. **"Odd conformal degree is never genuinely odd"
stands**; only its proof needed the word.

**And it exonerates an instrument that looked wrong.** `denominatorRealRoots` counts SIGN CHANGES, so
it misses even-multiplicity roots — which is exactly correct for its purpose, since factoring is
forced at the odd ones and not the even ones. Correct function, misleading name; the doc now says so.

**Pinned by** `src/core/__tests__/conformalLiftOfRational.test.ts` (3 tests). The Lean companion
carries `liftOfRational` (null by `ring`, no hypotheses), `lift_isPH_iff`, and the two lemmas the
corrected parity argument needs — `even_rootMultiplicity_sumSq` and
`exists_odd_rootMultiplicity_of_odd_natDegree`, the second replacing an intermediate-value lemma that
proved the wrong thing: **IVT gives a root but says nothing about its multiplicity.**

### 13.7 The stratum has TWO FLOORS, and §13's seam is the lower one — 2026-08-15

§13.1–13.3 place the seam at the polynomials and call it "where the two chart types meet". True, and
incomplete: **the σ = 0 stratum is not one thing.** What the λ-chart needs is not `𝒜(r) ≠ 0` but
`𝒜(r)` **invertible**, and off the real axis those differ, because `ℍ ⊗ ℂ ≅ M₂(ℂ)` is not a division
algebra and `det 𝒜(r) = σ(r)`.

```
rank 0    𝒜(r) = 0               the pole cancels, the degree drops    ← §13's seam
rank 1    𝒜(r) ≠ 0 but singular   full degree, genuine curves           ← where the CIRCLE lives
```

**The equator decides which floor exists.** At a real pole σ(r) = |𝒜(r)|² is a sum of four real
squares, so σ(r) = 0 forces 𝒜(r) = 0 and **rank 1 is unavailable**. Off the axis `1² + i² = 0` and it
opens up. Same definite-versus-isotropic fact as §12.2 and F17, fourth appearance.

**So the circle is NOT at the end of the twist dial.** §13.2 drives λ to its limit and measures
𝒜(r) → 0 (0.0078 at 89.9°) — that is **rank 0**, the polynomial degeneration. The circle is **rank 1**:
`𝒜 = (1−t) + (1+t)k`, degree ONE, σ(±i) = 0 with |𝒜(i)| = 2 ≠ 0. No compactification of λ reaches it.
Anyone reading §13 as "push the dial far enough and you arrive at the conformal world" is reading the
wrong floor. → `circleSpinor.test.ts`, `polynomialLimitOfTheCircle.test.ts`

**And λ is forced rather than chosen, by an inverse.** With `X = 𝒜(r)⁻¹𝒜′(r) = a + bi + cj + dk`,
`Xi + iX* = 2a·i + 2d·j − 2c·k`; equating to `2Σi` gives a = Σ, c = d = 0, b free. So `X = Σ + λi` is
the *unique* solution and λ is the leftover twist — but every step needs `𝒜(r)⁻¹`. Where 𝒜(r) is
singular the reduction does not get harder; **X has no meaning**.

### 13.8 The missing piece is the OVERLAP, not another chart

Two disjoint charts are not an atlas. On a sphere the charts overlap, and the overlap is what lets you
carry an object from one to the other. Ours:

```
λ-chart      every pole invertible     σ(r) ≠ 0 everywhere
conformal    every pole singular       σ = h·w, i.e. σ(r) = 0 everywhere
overlap      —
```

Nothing can be dragged across, because there is no shared region to hand it over in. **The MIXED cell —
some poles invertible, some singular — is exactly the region that touches both**, so it is not an
unexplored corner of the classification but the connective tissue an atlas requires.

**Which reframes the goal.** "Add a chart for σ = 0" is already done: `conformalPHCurve` covers that
stratum. Rebuilding it in spinor coordinates (rank-1 matrices are outer products `u·vᵀ`, the cone over
the Segre embedding, smooth away from zero, so the datum is a point of `ℙ¹ × ℙ¹` where the invertible
case carries one real λ) would buy **uniformity, not coverage** — one solver, one editing model. Worth
doing for comfort; not required to reach anything.

**The sharp test, and its cost.** Build a curve with two poles, one invertible and one singular, and see
whether the λ machinery handles the good pole while rank-1 coordinates handle the bad one. If it
composes, that is the atlas. **But it cannot be built with what exists**, and the reason is §13.7: a
*real* singular pole is rank 0, i.e. a degree drop, not a mixed member. So the test needs a **complex**
singular pole beside another pole — several conjugate pairs in `rationalPHComplexPoleSpatial`, *and*
the rank-1 case its header explicitly excludes. Real work, not an afternoon.

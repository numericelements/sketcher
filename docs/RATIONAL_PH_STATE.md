# Rational spatial PH curves — where we are

*Working state as of 2026-08-14. The durable facts live in the test files named below; this file is
the map, the retractions, and the plan. If you are picking this up cold, read this first, then the
tests it names — not the other way round.*

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

**The lesson that made all of them work: carry `σ` as unknowns instead of eliminating it.** Eliminating
it means dividing by `q(t₀)` and shifting, and the finite-difference Jacobian inherits both — the rank
then reads 4, 5 or 6 at different members of the same family. With `σ` carried, the rank is identical
at every tolerance from 1e-7 to 1e-11.

**And every instrument needs a control it can fail.** The containment check (do the family's tangent
columns lie in the variety's tangent?) caught two bad instruments. A Hopf-square fitter that failed its
own control had its numbers discarded. The torus walk (§8) failed its control and its numbers were
discarded too.

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
| conformal moduli 6 (slide) / 8 (module) | both wrong; it is **7**, and the formula is `2n−5`. The module subtracted 9 for a 10-dimensional group; the slide subtracted the scale twice |
| "the run-out diverges" as the pole approaches | `‖c′(1)‖` grows 6.6×, not ~1340× — the data is held, so the curve *reshapes* |

---

## 8. Open

**Is the rational Hermite fibre a torus?** *Unresolved, and the word must not go on a slide yet.* It is
2-dimensional (measured) and walks in it stayed bounded over 6000 steps. But the continuation walk used
to test closure **fails its control**: run on the polynomial quintic, where the leftover is provably a
circle of fixed radius (`Y i Ȳ = T`), the same walk has `|𝒜|` growing linearly 5 → 34 and never closes.
So the walk is buggy, not the geometry. Two routes: (a) fix the walk against the control — `|Y|` must
be constant along it; (b) redo the completion-of-the-square algebraically for the rational case, which
is what made the polynomial case certain. **(b) is the better investment** — a derivation needs no
control.

**`fiberLoop`'s closure test is weak.** It stops when three curve points on `t ∈ [0,1]` return to within
4e-3. At that moment `σ` is still 3.6% away and the full indicatrix over `t ∈ [−2,2]` is **0.49** away
(on a unit sphere). "The fibre closes" currently rests on a three-point test on the visible piece.

**Why is every chart member a singular point of the variety?** Rank deficit 2 at degree 4, 4 at degree
6, at every family tried. Not the gauge, not pole reality, not the pole count, not `deg w`. Unexplained.

**Is the fibre motion a rotation of the indicatrix?** No — best-fit rotation residual 1.6–1.8 on a unit
sphere, and `σ` changes by up to 1400%. What looks like rotation is the heavy drawn arc sweeping while
the pale full indicatrix deforms.

**`solveWithFreeLambda` misses at (4,5).** 120 deterministic starts, all miss.

---

## 9. The next slides — agreed design, blocked on §8

`inside-the-chart` currently has: title, slide 1 (what a chart is), **slide 3** (the pole on the
sphere), **slide 4** (the same pole on the curve). Those two share one state and one control strip
(`chartModel.ts`, `ChartControls.tsx`) and are **not to be modified** — new material goes on new slides.

The agreed next pair: **degree 6, one pole, C¹ Hermite held**, same grammar — sphere first, curve
second, one shared slider set.

```
P₀  c(0), the translation      3
P₁  carries c′(0)              3
P₅  carries c′(1)              3
P₆  carries c(1)               3        four draggable points
the fibre                      2        ← the torus, IF §8 resolves
twist λ                        1
pole r                         1
                             ────
                              16        = the chart's dimension, measured
```

Interior `P₂ P₃ P₄` are outputs, drawn grey. **No pole selector yet** — deferred until this pair
exists, because the four families have fibres 12, 8, 4, 0 and cannot share a held-data convention.

Before writing figure code: verify the Hermite projection **tracks** (nine conditions against a
twelve-dimensional fibre) the way `strictHandlesTrack.test.ts` pins the current six-against-eight.

---

## 10. How this work goes wrong, and the habits that catch it

Recorded because the same three failures repeated all session.

1. **A number measured at one configuration, restated as a structural fact.** Three retractions came
   from this. Say "measured at this seed" until it is swept.
2. **An instrument with no control.** Every rank, every fit, every walk needs a case where the answer is
   known. Two instruments were discarded this session on their controls, and one result was withheld on
   a *miscalibrated* control that turned out to be fine.
3. **A figure built before asking what it shows.** Two figures needed corrections found by eye, and one
   pair was removed entirely — it walked an arbitrary path through the variety and called it "the
   missing degree of freedom" when the missing direction is a specific, constructible one.

And the reverse: several of the best results this session came from Eric asking a plain question —
*"can the missing dimension be a reparametrisation?"*, *"is it often one degree less?"*, *"how many
fibre sliders?"* — that reframed a measurement programme in one line.

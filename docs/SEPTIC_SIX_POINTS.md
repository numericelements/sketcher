# Degree 7, six control points, four curves — the slide to build

*Handoff written 2026-08-17, before a context compaction. Everything below was measured in this
session unless marked otherwise. The slide does not exist yet; the mathematics for it does.*

**The slide, in one line.** A degree-7 spatial PH Bézier with **six draggable control points**. Six is
the maximum the family allows, and at six the answer set is finite — **at most eight curves, in
practice 0, 2, 4 or 6, and the number changes while you drag**. Draw the selected one black and the
others grey; click a grey one to select it — the gesture the planar quintic figure already uses.

> **Read §1's count before building anything.** The "four curves" this document originally promised was
> an artefact of two samples. The count is a *variable of the slide*, not a constant of the problem, and
> that is the more interesting thing to show.

---

## 1. Why six, and why four

### The dimension rule — one formula behind every count in this subject

```
        dim  =  4k + 2  −  3v            (space)
        dim  =  2k + 2  −  2v            (plane)

  4 (or 2) per generator coefficient — a quaternion is four reals, a complex two
  +2       the translation constant (3) less the Hopf gauge (1); in the plane, 2 less a DISCRETE gauge (0)
  −3v      each vector condition prescribes a point of ℝ³ and costs three
```

**v is the number of vector conditions**, whatever they are — a point on the curve, an end derivative,
or a control point. All three cost 3, which is why problems that looked different all session differ
only in v. *Never state a dimension in this subject without stating v.* The one wrong claim of the
session — `T^{k−1}` — was this formula with v = k where the problem had v = 4.

It reproduces everything, measured:

| problem | v | formula | measured |
|---|---|---|---|
| whole family, degree 3/5/7/9 | 0 | 4k+2 | 10, 14, 18, 22 |
| C¹ Hermite | 4 | 4k−10 | 0, 2, 6, 10 |
| (k+1)-point interpolation | k+1 | k−1 | ✓ |
| slide 7 — pin P₀, P₃, give P₁ | 3 | 10−9 = 1 | the fibre |
| degree 7, six control points | 6 | 18−18 = 0 | square |
| degree 3, all four control points | 4 | 10−12 = −2 | over by 2 |

### How many conditions stay independent

Leg conditions have full rank 3v until they hit the spinor's own dimension `4k−1`, then saturate.
Adding the one condition that fixes the translation:

```
v_max = ⌊(4k+2)/3⌋          degree 3 → 3     degree 5 → 4     degree 7 → 6     degree 9 → 7
```

Measured (consecutive legs from the start): `k=4` has rank 3v for v = 1…5, i.e. 15/15, then saturates.
The cubic's inability to do C¹ Hermite is *just this ceiling* — Hermite is v = 4 and the cubic's max is
3 — not a special degeneracy. Measured rank 7 of 9.

### Degree 7 is the first degree where six comes out whole

`4k+2` is divisible by 3 only for `k ≡ 1 (mod 3)`, so:

```
degree 3   family 10   3 points = 9    →  1 left   ← slide 7's fibre
degree 5   family 14   4 points = 12   →  2 left
degree 7   family 18   6 points = 18   →  0        ← A COUNT
degree 9   family 22   7 points = 21   →  1 left
```

### The count: 0, 2, 4 or 6 — never a constant

**Corrected 2026-08-17 by `src/core/septicCascadeDegree.test.ts`.** The earlier "4" came from
random-start Newton on two data sets. That was under-sampling, not a count. Eliminating down to one
polynomial (below) makes the count *exhaustive* rather than sampled, and it is not constant:

| data | measured counts |
|---|---|
| eight polygons taken FROM a curve | 4, 2, 4, 6, 4, 6, 4, 4 — **4 is modal, not universal** |
| forty ARBITRARY dragged polygons | **0 ×20**, 2 ×4, 4 ×14, 6 ×2 |

Two facts the figure cannot ignore. **Half of arbitrary six-point polygons carry no real septic PH
curve at all** — the map is finite-to-one but far from onto over ℝ. And the count is always **even**,
because it is the real-root count of one real polynomial, whose complex roots pair up.

The exhaustive sweep and dense random-start Newton agreed on all eight curve-derived cases, so the
sweep is not manufacturing roots.

**The Bézout ceiling of 8 is CORRECT** — but not for the reason recorded. §3's derivation assumed the
closing system stays quadratic; it does not (it is degree 4). The eliminated resultant is nonetheless
**a degree-8 polynomial in t₁**, measured by Chebyshev fit on three data sets. Right number, wrong
argument. Contrast the plane, where `2^{k−1}` is attained exactly (measured at k = 2, 3, 4) because
there the unknown `r = w₁/w₀` is complex and every Bézout root is a genuine curve; here the unknowns
are real and at most 6 of the 8 were ever real.

---

## 2. What the figure needs

```
model        degree-7 spatial PH Bézier; generator 𝒜 cubic = 4 quaternion Bernstein
             coefficients = 16 real unknowns
data         P₀ … P₅ — six control points. P₀ is the translation; P₁…P₅ give five legs
             = 15 conditions on the spinor (its dimension less the gauge is exactly 15)
solve        ALL real solutions — 0, 2, 4 or 6 of them, changing as the polygon is dragged
draw         the selected curve BLACK, the others GREY; the six data points draggable;
             P₆ and P₇ derived, drawn hollow (they differ per branch)
select       click a grey curve to take it — as QuinticHermiteFigure does for its four
track        the count is NOT fixed, so a fixed permutation match will not do. Match by
             nearest (N₅,N₆) fingerprint to the previous frame's branches, allow births
             and deaths, and keep the selection on its own branch until that branch dies.
             framework/branchTracking assumes a constant four — it needs generalising
             or replacing for this figure.
```

### The legs, which are the conditions

For 𝒜 with Bernstein coefficients A₀…A₃, the hodograph `N = 𝒜i𝒜*` has degree 6, and its Bernstein
coefficients are the legs (times the degree):

```
N₀ = A₀iA₀*
N₁ = ½ polar(A₀,A₁)
N₂ = (3/15) polar(A₀,A₂) + (9/15) A₁iA₁*
N₃ = (1/20) polar(A₀,A₃) + (9/20) polar(A₁,A₂)
N₄ = (3/15) polar(A₁,A₃) + (9/15) A₂iA₂*
N₅ = ½ polar(A₂,A₃)
N₆ = A₃iA₃*
```

Prescribing P₀…P₅ fixes `N₀ … N₄`. `N₅, N₆` are free and are what distinguishes the four branches —
**use them as the gauge-invariant fingerprint when de-duplicating solutions** (legs are gauge
invariant; the spinor is not).

### Two solve routes

**(a) Brute force in 16 unknowns — superseded.** Newton least-squares on 16 unknowns against the 15 conditions, from
random starts; de-duplicate by the `(N₅, N₆)` tail. Reject residual > 1e-9 and runaway tails > 1e4.
Costed: ~1200 starts × 90 iterations ≈ 90 s in vitest, ~250 convergences, 4 distinct. **Too slow for a
figure at frame rate.**

**(b) The cascade — the one to implement.** From the Lean companion, and it is triangular:

```
N₀   sandwich in A₀ alone       →  A₀ = √|N₀| · n · e^{φ₀ i}      a Hopf circle, always solvable
N₁   LINEAR in A₁ given A₀      →  3 equations, 4 unknowns  →  +1 free
N₂   LINEAR in A₂               →  +1 free
N₃   LINEAR in A₃               →  +1 free
                                   4 free, less the gauge = 3 essential
N₄   no new unknowns            →  3 closing equations in those 3
```

They verified the load-bearing step: `B ↦ polar(A,B)` is a 3×4 map of **rank 3 for every A** (2000
random samples, no exceptions), so every linear stage is surjective with a 1-dimensional kernel and
none can obstruct. Fix `φ₀ = 0` to spend the gauge; the unknowns are the three kernel parameters.

**The degree, settled 2026-08-17** (`septicCascadeDegree.test.ts`). The caution was justified — the
closing system is *not* quadratic. Every linear stage is the SAME operator `B ↦ polar(A₀,B)`, whose
kernel is exactly `ℝ·(A₀i)` — because `polar(A,B) = 2 Im(A i B*)` vanishes iff `A i B*` is real. So the
kernel vector `k = A₀i` is **constant across all three stages**, and the substitution degrees are:

```
A₁ = a₁          + t₁k        affine in t₁
A₂ = a₂(t₁)      + t₂k        a₂ QUADRATIC in t₁   (via A₁iA₁* in N₂)
A₃ = a₃(t₁,t₂)   + t₃k        a₃ CUBIC in t₁       (via polar(A₁,A₂) in N₃)

R = N₄(t) − N₄   multidegree (4, 2, 1) in (t₁, t₂, t₃);  total degree 4
```

All four numbers measured by Chebyshev fit, not asserted.

**And that sparsity is the solver.** `t₃` enters *linearly*, with a coefficient `w(t₁)` that is affine
in `t₁` and free of `t₂`. So `R = P_{t₁}(t₂) + t₃·w(t₁)` forces `P(t₂) ∥ w`, i.e. `P(t₂) × w = 0` —
two quadratics in `t₂` whose resultant is a single polynomial in `t₁` alone, **of degree 8**. Every
solution is a real root of that one univariate polynomial. Sweep it (`t₁ = tan(πs/2)` covers all of ℝ),
bisect the sign changes, recover `t₂` from the common-root formula `(a₀b₂−a₂b₀)/(a₁b₂−a₂b₁)` and `t₃`
by projection, then polish in the 3×3 system. That is exhaustive, and it is fast.

---

## 3. What exists to build on

```
framework/branchTracking          matches branches by control-polygon distance — already
                                  solves the colour-swap problem for four curves
framework/Figure3D                Curve3D, DragPoint3D, Point3D, the drag protocol
QuinticHermiteFigure.tsx          the planar four-interpolant figure: the exact gesture to copy
sp11RationalPH.ts                 sandwich(), QPoly, orthonormalise, nullspaceBasis
quaternion.ts                     polarSandwich, quatFromSandwich, gaugeRotate, sandwich
linalg.ts                         leastSquares
phSpatialQuintic.ts               the k=3 analogue done in CLOSED FORM — the model for a cascade
                                  implementation, including gaugeRefsFor for reference transport
```

**No core module exists for this.** `phSpatialSeptic.ts` is a *different* object — the RM-ERF class,
degree-7 curves whose Euler–Rodrigues frame is already rotation-minimizing. Do not extend it; write a
new one.

**Reference transport will be needed.** `quatFromSandwich` picks a square root via `n = (δ+u)/|δ+u|`,
which degenerates when the leg points at −û. `phSpatialQuintic.gaugeRefsFor` carries the reference
across frames for exactly this reason; the septic figure needs the same or the branches will jump.

---

## 4. Pitfalls paid for in this session

- **Rank by max-over-trials over-counts.** Taking the maximum rank over several random points let one
  noisy trial report 12 where the truth was 11, and 16 where the ceiling is 15. Use one
  well-conditioned point, tolerance ~1e-7, and **verify the gauge direction is in the kernel** (`J·g`
  relative ≈ 1e-10) before believing any rank.
- **Never carry topology between problems.** `T^{k−1}` and a fruitless search for a circle in the
  three-point fibre both came from importing a neighbouring problem's shape. Dimension transfers;
  shape does not.
- **Control points and curve points are different problems.** They are linearly equivalent for an
  ordinary Bézier and *not* for PH, because the unknown is the generator: both are quadratic maps from
  𝒜, and only the control-leg one factors into sandwiches. That factorisation is why closed forms and
  cascades exist at all.
- **Which v, not just how many.** Consecutive control points cascade; six split between the two ends
  do not — two cascades collide in the middle with nothing linear left to absorb them. Same dimension,
  possibly different rank and certainly different solvability. **The figure should use P₀…P₅.**

---

## 5. Also open, from the same session

- `THE_MAP.md` §6 — the two-stage continuation experiment for C21, with the Lean side's proved
  constraint that a conjugate pair is both soft or both hard (so m = 2 is a control, m ≥ 3 the test).
- Deck: III.1 "where they don't meet"; the "ways to pay" table; the RRMF slide; slide 8's note that
  still reads the family as caused by the gauge; ~12 stale absolute slide references; the
  `inside-the-chart` merge.
- Slide 4 of `price-of-a-circle`: lead with the forced norm `|X|² = |v|`, split the arc-length table.
- The cross-deck `k` collision: `T^k` in price-of-a-circle (k = links − 1) versus `k = deg 𝒜 + 1` in
  ph-interpolation.

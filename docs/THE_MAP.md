# The map — every way we know to write a PH curve, and what each one charges

*Reference, not narrative. `RATIONAL_PH_STATE.md` is the working state of the rational thread and
`SPHERE_REPRESENTATION_SLIDES.md` is the sphere slides; this file is the **atlas of formulations**, so
that a choice of representation is made against the alternatives instead of by habit. The deck is a
**path** through this map, not a copy of it.*

*Every row names its file. Where a claim is inferred rather than measured it says so.*

**One notation warning, because it has already bitten.** `w` means two different things in this
subject and they can end up side by side: in the plane it is the **generator**, `r′ = w²`; in space
it is the **denominator**, `r′ = 𝒜i𝒜*/w²` — the pole polynomial `∏(t − r_k)`. The repo uses `w` for
the denominator throughout, and Kalkan's form (9) calls it `α` (which is *also* taken here, as the
closure gauge angle). The deck's outline sidesteps the whole thing by writing `(poles)`.

---

## 0. The shape of the whole thing, in four cells

```
                    plane                              space

polynomial          r′ = w²                            r′ = 𝒜 i 𝒜*
                    w free                             𝒜 free

rational            n, h free   (Pottmann's dual)      𝒜 bound — a residue condition per pole
                    PH is an IDENTITY                  and seven ways to pay it
```

**Exactly one cell binds.** That is the whole content of the map, and it is worth stating as the
thesis it is:

> Leaving the plane does not make **PH** harder — the sandwich handles that, and 𝒜 is as free in
> space as w is in the plane. It makes **rationality** stop being free. Every known spatial
> representation is a different way of paying for that, and none of them pays nothing.

---

## 1. The plane

| how the curve is written | PH costs | rationality costs | what you get | where |
|---|---|---|---|---|
| `r′ = w²`, w a complex polynomial | nothing | — (polynomial) | w free: a chart | Farouki |
| `z = P/Q`, complex weights; PH ⟺ `M = P′Q − PQ′` is a perfect square `A²` | 4 real conditions | nothing | the chart is **control points + Farin points**, and it is BIJECTIVE — each edge's Farin point hands back that edge's weight ratio outright | `complexRationalPHCubic.ts` |
| **Pottmann's dual**: a rational unit normal `n` and a rational support function `h`, curve = the envelope | **nothing — an identity** | nothing | `n`, `h` free: a chart, no solving | `planarDualChart.test.ts`, Pottmann CAGD 12 (1995) |

**Why the dual is free, in one line.** With `n = (1−u², 2u)/δ`, `δ = 1+u²`:

```
n′ = 2u′·(−2u, 1−u²)/δ²        |(−2u, 1−u²)|² = (1+u²)² = δ²        so |n′|² = 4u′²/δ²
```

a perfect square **for every u**. Not a condition — an identity. That is the cell space does not have.

**And exactly why it does not survive.** In the plane `n′` is forced *parallel* to `n⊥`, because the
orthogonal complement of `n` inside ℝ² is one-dimensional. In ℝ³ the derivative of a rational unit
vector is only forced *perpendicular* — two dimensions — and no identity makes its norm a square.
Measured: for `b = N/σ` from a spinor,

```
|b′|² = (|N′|² − σ′²)/σ²        and |N′|² − σ′² is NOT a perfect square for generic spinors
```

> The Pythagorean condition does not disappear in the dual. It **relocates to the tangent
> indicatrix** — free on S¹, not free on S².

*(Not in the repo: the plane's conformal model ℝ^{3,1}. It exists — CP¹ is the conformal model of the
plane, and `conformal.ts` says the complex-rational degree doubling IS the conformal doubling — but
nothing is built on it here, so it gets no row.)*

---

## 2. Space, polynomial — one row, two notations

```
r′ = 𝒜 i 𝒜*        |r′| = |𝒜|² = σ        𝒜 FREE, integration free
```

The sandwich makes the speed a polynomial and costs nothing; a polynomial always integrates to a
polynomial. The only structure is the **gauge**: `𝒜 ↦ 𝒜·e^{iθ}` moves no curve, so the preimages of a
given hodograph form a circle rather than the plane's two points. Farouki–Sakkalis (1994); the
spin-representation view is Choi, Lee & Moon (2002).

**The Hopf form is this row in complex coordinates, not another row.** Write `𝒜 = u + v j` with u, v
complex polynomials, expand the sandwich, and out comes the classical Hopf triple
(`conformalPHHopf.ts`, where `u†` is u with its coefficients conjugated):

```
N₁ = u u† − v v†        N₂ = 2 Im(uv)        N₃ = −2 Re(uv)        ‖N‖ = |𝒜|² = u u† + v v†
```

It carries through to the rational rows unchanged — `c′ = Hopf(u,v)/w²` — and it earns its keep three
times over:

- **It makes the plane→space step exact.** The plane has ONE complex polynomial, `r′ = w²`; space has
  TWO. And the square root changes character with it: `±w` becomes a circle, because
  `(u, v) ↦ (u e^{iθ}, v e^{−iθ})` leaves the hodograph alone. That substitution *is* `𝒜 ↦ 𝒜e^{iθ}`,
  written where you can see it. So section I's whole story — "the square becomes a sandwich and the
  square root becomes a circle of square roots" — is: **one complex polynomial becomes two, and their
  common phase drops out.**
- **It is the route BACKWARDS.** The sandwich takes 𝒜 to the hodograph; recovering 𝒜 from a hodograph
  is a sum-of-two-squares factorisation, and that only works in these coordinates: `U = u u†`,
  `V = v v†`, `G = u v`, keep one root of each conjugate pair, try all `2^{deg u}` selections and
  verify by multiplying out. `hopfForm`. The quaternion notation states the forward map; the complex
  notation inverts it.
- **It makes the μ absorption transparent** (§4). `𝒜 ↦ 𝒜·c` with c complex in the i-plane reads as
  `(u, v) ↦ (u c, v c̄)`, with `μ = |c|² = c c̄`. In quaternion notation you must know that c commutes
  with i; here it is multiplication.

---

## 2b. Row 0 — the N-FORM, which is what every other row is a chart OF

`core/rationalPHResidue.ts`. Added 2026-08-18, and it is the construction that made §6's question
answerable, so it belongs above the rows rather than inside a test file.

A rational curve is ∫N/w² with no logarithms. With w = (t−r_k)·v, partial fractions give the
1/(t−r_k) coefficient as `b_k = [N′(r_k) − 2Σ_k N(r_k)]/v(r_k)²`, so "no log at r_k" is exactly

```
    N-form   N′(r_k) = 2Σ_k N(r_k)              N = 𝒜i𝒜*     primitive, indifferent to pole type
    λ-form   𝒜′(r_k) = 𝒜(r_k)(Σ_k + λi)                      the same thing PLUS invertibility
```

Setting X = 𝒜(r)⁻¹𝒜′(r), the N-form FORCES X = Σ_k + λi — so λ is not a modelling choice but the
unique solution, and every step of that argument needs 𝒜(r)⁻¹, i.e. σ(r) ≠ 0. **The λ-chart is the
N-form with an assumption bolted on, and dropping the assumption reaches everything the chart cannot.**

What it builds that no other row can: **any pole configuration** — real, complex or MIXED — at any
stratum, hard or soft. Rows 2 and 6 need σ(r) ≠ 0 and reach only m = 2 pairs; the free-λ row takes
REAL roots only; row 7 is soft by construction. None of them builds a hard member with a complex pole
at m ≥ 3, which is what the mixed-cell experiment needed. This does, from a deterministic start.

Two things the module carries because the investigation paid for them. It reports BOTH `softness` and
`hermitian` per pole, never a norm over poles — `softness` is identically 1 at a real pole, so it
cannot see the rank-0 seam and `hermitian` is the only warning there. And `solveResidue` defaults to
**`select: 'bestConditioned'`**, maximising the smallest ‖𝒜(r)‖²: taking the first converged start
instead returns a member sitting at ‖𝒜(r)‖² = 4.6e-5, nearly fake, with nothing to flag it.

---

## 2c. Why σ = 0 is a SPATIAL phenomenon — the plane has no such stratum

`__tests__/planarSoftForcesFake.test.ts`. Run because the plane is the one place with no continuous
gauge (A ↦ −A is discrete), so nothing there can be blamed on a gauge orbit. The answer is stronger
than a clean experiment: **the analogue of the mixed cell cannot exist in the plane.**

A planar rational PH curve has N = A² for a complex polynomial A, and σ = A·A† with † conjugating
COEFFICIENTS. Since A†(r) = conj(A(r̄)),

```
    σ(r) = A(r) · conj(A(r̄))          a PRODUCT      (verified to 1e-15)
```

so σ(r) = 0 forces A(r) = 0 or A(r̄) = 0 — the generator VANISHES on one of the two conjugate poles,
which is a degree drop, not rank one. Measured: forcing σ = 0 on a pair leaves one member at
|A(r)| = 2e-15 and its partner at 12.3.

**The structural reason, and it is the sharpest statement of what makes space different:**

```
    space   𝒜(r) ∈ ℍ ⊗ ℂ ≅ M₂(ℂ)   σ = det   M₂(ℂ) HAS NONZERO SINGULAR MATRICES
                                              → both poles soft AND nonzero: an honest rank-1 floor
    plane   A(r) ∈ ℂ ⊗ ℂ ≅ ℂ ⊕ ℂ    σ = the PRODUCT of the two components
                                              → singular means a component VANISHES; the pair is
                                                {soft, FAKE}, never {soft, soft}
```

**And the fake pole cancels.** A(r) = 0 gives N = A² a double root at r while w² has one there, so
c′ = N/w² is regular and r is not a pole of the curve at all. The planar σ = 0 configuration is a
curve with FEWER poles wearing a larger pole set. That is why the plane never needed a chart for this
stratum, and why the λ-chart's hole is a genuinely spatial difficulty rather than an inherited one.

One more difference from the same algebra: the planar no-log condition A′(r_k) = Σ_k A(r_k) is
**linear** in A, so the family is a linear subspace of complex dimension (n+1) − m (measured 3 at
n = 6, m = 4). In space the same condition is quadratic, which is what the N-form solve exists for.

---

## 3. Space, rational — the seven ways to pay

`N = p′w − pw′` throughout; `σ = |𝒜|²`.

| # | how the curve is written | PH | rationality | divides? | what you get | where |
|---|---|---|---|---|---|---|
| 1 | ordinary `p/w` | `\|N\|²` a perfect square | free | — | nothing; Möbius is **not** linear, inversion is quadratic in p and the degree roughly doubles | baseline |
| 2 | spinor + poles, **integrate**: `c′ = 𝒜i𝒜*/w²` | free | a residue condition per pole | **yes — by 𝒜(r) and σ(r)** | a genuine chart: at fixed λ the condition is LINEAR in 𝒜, so admissible spinors are a subspace of dimension `4(n+1) − 4m`; λ per pole is the frame twist rate | `familyBasis`, the λ-chart |
| 3 | the same with **λ free** | free | 3 real conditions per pole, not 4 | no | reaches the families where 2 collapses (`n+1 = m` gives dimension zero, measured at (3,4), (4,5), (5,6)) | `rationalPHFreeLambda.ts` |
| 4 | **dual / motion polynomial**: `r = −2b/α`, `α b′ − α′b = μ·(𝒜i𝒜*)` | free | one homogeneous **linear** system | **no** | a **nullspace** — and it reaches the null-spinor stratum the λ-chart cannot. Overdetermined, hence the paper's "rather surprisingly, only in exceptional cases" | `rationalPHDual.ts`, Kalkan–Scharler–Schröcker–Šír CAGD 99 (2022) Thm 3.6 form (9) |
| 5 | the **variety**: `\|N\|² = σ²` in `(p, w, σ)` | — | — | no | not a representation — an exact polynomial system with an analytic Jacobian, for rank, tangent spaces, Newton and continuation | `rationalPHVariety.ts` |
| 6 | **ℍP¹ column**: `x = C·A⁻¹` | `Ñ = C̄A′ + ĀC′` a sandwich | — | no | Möbius **linear** (U ↦ GU) *and* minimal degree; given A and 𝒜, solving for C is LINEAR | `sp11RationalPH.ts` |
| 7 | **conformal ℝ^{4,1}**: control spheres, null + PH | a condition on the polygon | free — **nothing is integrated** | no | a solver and no chart; the curve is placed where it lives | `conformalPHCurve.ts` |

**Row 1 is the baseline everything is measured against**, and the reason the others exist: it is the
only row where a Möbius map costs degree. Rows 6 and 7 are the two where it costs nothing, and they
are related exactly — `Ĥ = U U†`, so 7 is 6 **squared**, and the conformal degree is double the
column's. You do not get to choose "Möbius linear" and "small" separately; the square root gives both.

---

## 4. μ, and why the warning about it was withdrawn

*Raised by the Lean companion 2026-08-16, and settled the same day. Kept in full because the
withdrawal is more useful than the warning was.*

**The observation.** Differentiate form (9):

```
r = −2b/α        α b′ − α′ b = μ·(𝒜i𝒜*)        ⟹        r′ = −2 μ·N / α²
```

The spinor model fixes the hodograph as `N/w²`; the dual's is `μ·N/α²`. That μ is the common factor
`h` of Dietz–Hoschek–Jüttler. The concern was that a witness found in the dual might live in a class
the spinor model does not contain, so C21 would have been asked in a strictly narrower class than the
answer inhabits.

**Why it does not bite: μ is absorbable.** The argument for the concern was that `𝒜 ↦ s·𝒜` multiplies
N by `s²`, so only a μ that is already a square can be pushed in — and a non-negative real polynomial
need only be a *sum of two squares*. But real rescaling is not the only route. Take **c a complex
polynomial in the i-plane** and set `ℬ = 𝒜·c`. Since c commutes with i,

```
ℬ i ℬ*  =  𝒜 c i c* 𝒜*  =  𝒜 i 𝒜* · |c|²           |c|² = c₀² + c₁², a sum of TWO squares
```

and every non-negative real univariate polynomial **is** a sum of two squares. So any such μ is
absorbed by `𝒜 ↦ 𝒜·c`, which is the Hopf gauge acting with a polynomial instead of a constant phase.
The narrower class is not narrower.

**Consequences.** The standing "report μ with any candidate" requirement is **withdrawn**; §7's
retraction in `RATIONAL_PH_STATE` is *not* reopened on these grounds. What a dual-form candidate does
need checking for is different and cheap:

```
isTrulyRational        α ∤ b — already in rationalPHDual, and already planned
hodograph primitivity  reduce N before reading off the pole / σ pattern, since μ IS absorbable and an
                       unreduced candidate can wear a σ pattern that its primitive form does not have
w real                 the denominator must be a real polynomial for the member to be in the class
```

**And a speculation of mine, refuted.** I had guessed that the conformal row's condition `|N| = h·w`
*was* the μ freedom under another name — which would have made the disjointness of rows 2 and 7 the
same fact as C21's narrowness. It is not, and **the circle settles it**: `𝒜 = (1−t) + (1+t)k` has
`σ = |𝒜|² = 2(1+t²) = 2w`, so `σ = h·w` with h constant and **μ = 1**. σ = h·w happens with no μ at
all.

Measured independently on slide 16's own member (`conformalPHHopf`, pinned in its test file):

```
‖N‖ = h·w as polynomials       defect 4.6e-14
A i A* == N          i.e. μ = 1, a sandwich OUTRIGHT      defect 1.9e-12
|A|² == h·w                                               defect 8.3e-13
```

So the factor w sits **inside the spinor norm σ**, not outside as a common factor. Two different
things:

```
μ            a common factor OUTSIDE the sandwich    — absorbable, hence not a real distinction
σ = h·w      the sandwich's own spinor is NULL at the poles — the real content of row 7's stratum
```

The joint statement should not be formalised. The rank-scan method note (§6) is unaffected by any of
this.

---

## 5. Where each row stands on σ = 0

The stratum has two floors (`RATIONAL_PH_STATE` §13.7): **rank 0** where `𝒜(r) = 0` and the degree
drops, and **rank 1** where `𝒜(r) ≠ 0` but is singular — where the circle lives. At a *real* pole
`σ(r)` is a sum of four real squares, so rank 1 is unavailable there; it opens up only off the axis.

```
row 2  λ-chart          NEEDS σ(r) ≠ 0 at every pole. Not merely harder on σ = 0 — λ has no meaning,
                        because X = 𝒜(r)⁻¹𝒜′(r) is what defines it.
row 3  λ-free           never divides — can reach σ(r) = 0
row 4  dual             never divides — reaches it, LINEARLY, and this is why it was ported
row 6  column           never divides — sp11Circle gets the circle straight out of it
row 7  conformal        lands ON σ = h·w, i.e. every pole singular
```

**And the distinction that matters most here, measured in `sp11Circle.test.ts`:** the circle needs
`A` **real**. It does not need quaternionic freedom at all. So what excluded it was never the
*construction* — Kalkan et al.'s system holds it too — it was **our λ coordinates**. σ = 0 curves are
not missing from the mathematics; they are missing from the chart. *"Chart σ = 0"* therefore means
**find coordinates for curves we can already build**, which is a far better-posed problem.

---

## 6. The open questions this map is for

1. ~~**Does the mixed cell exist**~~ — **ANSWERED YES, CONSTRUCTIVELY (2026-08-17)**, by the ε-drive.
   `__tests__/mixedCellExists.test.ts` builds a rational PH curve at m = 3 with the conjugate pair
   SOFT (softness 1.3e-15, ‖𝒜(r₁)‖² = 0.33 — rank one, not a degree drop) and the real pole HARD
   (softness 1, ‖𝒜(r₀)‖² = 7.7e-2 — not fake), driven from ε = 0.25 to exactly 0. Confirmed by
   contour integration of N/w² around each pole at ~1e-14, which shares none of the algebra.
   The connective tissue exists; the remaining atlas work is to CHART it, which is question 2.
   **The C21 hypothesis is satisfied**, checked in the form it is actually stated. `IsCoprime n₁ n₂`
   with `n₁ = N₁` and `n₂ = −N₃ + iN₂`: a common root needs n₁(r) = 0 AND n₂(r) = 0, the second being
   ONE COMPLEX equation, so N₂ and N₃ need only satisfy N₃(r) = i·N₂(r) rather than vanish. That is
   strictly weaker than gcd(N₁,N₂,N₃) = 1, **and the gap is exactly the isotropic locus where a soft
   pole lives** — so the first check I ran was blind on the very set the witness sits on.
   The right check is FINITE by a theorem rather than by sampling: σ² = n₁² + n₂·pconj(n₂), so every
   common root of the pair is a root of σ, a list of length 2n. Measured over those eight roots, the
   worst max(|n₁|,|n₂|) is **0.326** — coprime, with margin. Plus the separate no-cancellation check,
   nearest root of N to any pole = 0.50. **C21 closes.**
   **The primary witness is now m = 4, two conjugate pairs and no real pole** — the Lean side's
   suggestion, and better for a reason neither side had: at m = 3 the real pole is hard BY THEOREM, so
   "mixed" is nearly guaranteed once the pair softens and the test cannot fail informatively. With two
   pairs nothing compels the second to stay hard. It is also better conditioned — ‖𝒜(r)‖² = 1.86 and
   0.59, both O(1), against the m = 3 witness's 7.7e-2 — and it needed NO DRIVE at all: the chart-free
   solve landed on it directly, so the mixed cell is not a thin set one has to steer into.
2. **Can the rank-1 floor be charted?** Rank-1 matrices are outer products — the cone over the Segre
   embedding, smooth away from zero — so the datum at a singular pole should be a point of `ℙ¹ × ℙ¹`
   exactly where the invertible case carries one real λ. Untried. Buys uniformity, not coverage.
3. **Is the sphere polygon new?** Two reading sessions found nothing, which is "not found", not "new".
   Choi, Lee & Moon is the paper to settle it against.

### Step 0 is DONE — the two charts are now disjoint by MEASUREMENT, not only by construction

`__tests__/chartsAreDisjoint.test.ts` (2026-08-17). Until now the rows were known to be disjoint
because of what each construction *does* — row 2 divides by σ(r) so needs it nonzero; row 7 satisfies
‖N‖ = h·w so kills σ at every root of w. That is an argument about the recipes, not a measurement of
the objects, and the two σ's were not even being computed the same way.

One scale-free indicator now compares them like with like, **per pole**:

```
    softness(r) = |σ(r)| / ‖𝒜(r)‖²  ∈ [0,1]      σ(r) = det 𝒜(r) = a²+b²+c²+d² over ℂ
                                                  ‖𝒜(r)‖² = |a|²+|b|²+|c|²+|d|²

    0   rank 1 — 𝒜(r) singular but NONZERO: the chart's hole      SOFT
    1   as far from singular as a pole can be                     HARD
```

Dividing by the Hermitian norm is what makes it scale-free and what separates rank 1 from the degree
drop, since ‖𝒜(r)‖² cannot vanish unless 𝒜(r) = 0.

```
conformal sextic   all SIX poles      softness ≈ 2e-11    ‖𝒜(r)‖² from 7.4e-2 to 15
λ-chart members    (3,·) and (4,·)    softness 0.69 … 0.99
```

Ten orders of magnitude with **nothing in between**, and the conformal poles are genuinely rank 1
rather than a degree drop in disguise. Two charts that do not overlap are not an atlas — which is
precisely why the mixed cell matters.

**What this does NOT show.** Every member measured is *uniformly* soft or *uniformly* hard, which is
exactly what each construction guarantees. It is not evidence that the mixed cell is empty: neither
construction can build one, so neither can look for one. That still needs the continuation below —
and the indicator above is the per-pole probe it must log.

### Step 0b — the (n,m) match EXISTS, and it is the collapse row

A continuation at fixed degree needs both endpoints in the same (n,m), and the two constructions had
never been checked for an overlap. Measured:

```
conformal sextic          deg 𝒜 = 5, deg w = 6   →  (n,m) = (5,6)   all six poles complex, three pairs
λ-chart familyBasis       needs m ≤ n+1          →  collapses AT (5,6): dimension zero
rationalPHFreeLambda      built for n+1 ≤ m      →  solves (5,6), residual 3.6e-15
```

So the match is **(5,6) — exactly the collapse row m = n+1**, and the hard endpoint there must come
from the free-λ solver, which is what that module exists for. The prerequisite is satisfied; it was
not obvious in advance and is worth re-checking at any other degree before assuming a path can exist.

### Step 0c — softness carries NO information at a real pole, and why both numbers are logged

At a real r the spinor 𝒜(r) is a real quaternion, so the four squares share an argument and the
triangle inequality is tight:

```
    σ(r) = a²+b²+c²+d² = ‖𝒜(r)‖²      ⇒   softness(r) = 1 EXACTLY
```

Measured to twelve digits at every real pole of two free-λ members. This is the equality case of the
bound, not a near miss — so **at a real pole the indicator is identically 1 and tells you nothing.**
That is the analytic face of the Lean side's `sigma_eval_eq_zero_iff_dvd`: at a real r, σ(r) = 0 ⟺
(t−r) divides the spinor ⟺ the pole is fake. A soft real pole does not exist.

**Two different degeneracies, and only both numbers separate them.** On the (5,6) free-λ member
softness is 1 at all six poles (nothing is rank 1) while ‖𝒜(r)‖² falls to 3.9e-5 at one of them —
that pole is close to 𝒜(r) = 0, i.e. close to being FAKE. Rank 1 and rank 0 are different failures
and `softness` only sees the first.

**Consequence for the experiment below: the ε-drive must target a COMPLEX pole.** Driving σ(r) → 0 at
a real pole is provably not a route to the mixed cell — it is a route to a degree drop. So the minimal
mixed candidate is m = 3, one real pole beside one conjugate pair, with the PAIR driven soft and the
real pole hard by the theorem.

### How question 1 was run — the ε-DRIVE (DONE; kept because the method generalises)

**The key realisation, and it reframes §5.** The no-log condition is CHART-FREE: with w = (t−r_k)v,
partial fractions give the 1/(t−r_k) coefficient as

```
    b_k = [N′(r_k) − 2Σ_k N(r_k)] / v(r_k)²          N = 𝒜i𝒜*
```

a statement about **N**, not about 𝒜. The λ-form 𝒜′(r) = 𝒜(r)(Σ + λi) is what you get by DIVIDING it
by 𝒜(r), which is exactly what needs σ(r) ≠ 0. So the residue condition reaches the σ = 0 stratum
unaided, and the λ-chart's hole is a hole in the COORDINATES — which is what §5 concluded from the
circle and is now the mechanism behind it.

*(Cost of getting this wrong once: a hand-derived polarisation of the sandwich gave residual O(1) at a
complex pole and looked like the condition failing there. Computing N as a polynomial with the tested
`sandwichPolynomial` and differentiating THAT gives 2e-16. Do not hand-expand d/dt(𝒜i𝒜*).)*

**Results.**

```
CONTROL m=2   start from the λ-chart member, softness 0.77 — genuinely hard
              drive ε: 0.72 → 0 reached.  BOTH poles of the pair land at σ = 3.10e-17,
              IDENTICAL to 1e-20, ‖𝒜‖² = 0.84.  not_mixedPoles_of_conjugate_pair holds
              in the numerics, so the machinery is not manufacturing asymmetry.
              (And note what this alone shows: at m = 2 a λ-chart member deforms
              CONTINUOUSLY into a σ = 0 member at fixed poles. The strata are connected.)

TEST m=3      real pole beside a pair, drive the PAIR.  8/8 seeds reach ε = 0.
              Best witness: ε 0.25 → 0, pair softness 1.3e-15 with ‖𝒜(r₁)‖² = 0.33,
              real pole softness 1 with ‖𝒜(r₀)‖² = 7.7e-2.  MIXED.
```

**And the trap that nearly produced eight worthless witnesses.** On six of the eight seeds ‖𝒜(r₀)‖²
collapses to ~1e-6 — the "hard" real pole is then nearly FAKE, so the member is a two-pole curve
wearing a third and is not mixed at all. `softness` cannot see this: it is identically 1 at a real
pole. **Rank 1 and rank 0 are different degeneracies and only both numbers separate them** (§0c).

### Two corrections to the plan that the run produced

**There is no construction problem, because there is a fourth construction.** The Lean side asked
which module builds a hard member with a complex pole at m ≥ 3, and correctly observed that none of
the three does: free-λ takes REAL roots, the conformal row is soft by construction, and
`rationalPHComplexPoleSpatial` only reaches m = 2. The answer is that the **chart-free N-form
residue conditions, solved directly**, build members at ANY pole configuration — real, complex or
mixed, hard or soft — precisely because they never divide. Measured: at the m = 3 mixed pole set the
solve returns a start with the real pole hard at ‖𝒜(r₀)‖² = 0.109 and the pair hard at softness 0.303.
This is what should be added to the modules as a construction in its own right.

**The endpoint-migration obstacle is real and is now moot.** A hard→soft continuation between the
free-λ (5,6) member and the conformal sextic would have to migrate six poles off the real axis,
colliding pairwise — a discriminant crossing, not a step. The ε-drive never needs it, and the m = 4
witness needs no path at all.

**Step size, not an analytic Jacobian.** The augmented system is QUADRATIC in 𝒜 (N = 𝒜i𝒜* is, σ(r) =
det 𝒜(r) is, the normalisation is), so central differences carry **no truncation error** — an analytic
row would buy nothing. What they do carry is round-off ~ε/h, so a small step is pure loss. Measured on
this system:

```
    h = 1e-7 vs 1e-3   2.85e-9      ← the 1e-7 column is round-off, not the 1e-3 one
    h = 1e-3 vs 1e-2   2.14e-13
    h = 1e-2 vs 1e-1   2.52e-14
```

The original h = 1e-7 was discarding seven digits for a truncation error that does not exist. Now
1e-2. The §6 lesson stands — a differenced row in an exact Jacobian drifts — but here the whole map is
quadratic, so differencing IS exact and the danger is the step size instead.

### The ε-drive, as originally specified

Rather than connect a hard endpoint to a soft one, **drive one pole soft from the hard side.** Take a
λ-chart member with m ≥ 3, adjoin σ(r₁) = ε as an extra equation, and continue ε → 0 while the other
poles stay hard.

```
reach ε = 0     →  a mixed member has been CONSTRUCTED. C21 answered constructively.
stall at ε* > 0 →  an obstruction WITH A NUMBER: σ(r₁) cannot go below ε*
```

Three advantages over connecting endpoints: no soft endpoint is needed, so the (n,m)-matching problem
disappears; it targets the mixed cell directly instead of hoping a path passes through it; and failure
is quantitative. ε is a natural homotopy parameter, so `continuationPath` takes it as-is, and for a
complex pole σ(r̄₁) = conj(σ(r₁)) is automatic — **two real conditions, not four.**

The m = 2 control becomes sharper too: run the same drive where `not_mixedPoles_of_conjugate_pair`
says the two poles must go soft together. If ε on one drops while the other stays hard, the machinery
is lying — a far better failure signal than "the path broke".

The certified-endgame caveat still stands, but ε* helps: **a stall reporting a consistent ε* across
seeds is evidence; one that stalls at random places is a solver.**

### The older endpoint-connection plan, kept for the record

**First, a proved constraint on where the mixed cell can be** (`not_mixedPoles_of_conjugate_pair`,
Lean companion 2026-08-17): σ has REAL coefficients, so σ(r̄) = conj(σ(r)) — **a conjugate pair of
poles is both soft or both hard.** It needed a new lemma along the way, `pconj_eval` at an arbitrary
complex argument (generalising the real-argument version), which is worth having independently.

The consequence is sharp and it restructures the experiment:

```
m = 2   one conjugate pair   →   MIXED IS IMPOSSIBLE — proved, not merely unobserved
m ≥ 3   e.g. a real pole beside a pair   →   the first place mixed can occur
```

So an m = 2 run is a **control**, not a hopeful first attempt. If it fails, the machinery is broken
and the geometry is not implicated; only at m ≥ 3 does a failure say anything at all.

**The experiment they propose, in preference to a rank scan.** Two-stage continuation in
`rationalPHVariety` (its analytic Jacobian and `continuationPath`), between a HARD endpoint and a
SOFT endpoint at matched (n, m):

```
stage 1   m = 2    control. Predicted to succeed and never to enter the mixed cell — proved.
stage 2   m ≥ 3    the real test. Success answers C21 CONSTRUCTIVELY: witnesses appear along
                   the path rather than having to be hunted.

endpoints  hard  from rationalPHComplexPoleSpatial — one exists at (3,2), |σ(r)|/scale ≈ 1.1
           soft  NOT from rationalPHFreeLambda — it takes REAL roots, and at a real pole σ(r) is a
                 sum of four real squares, so σ(r) = 0 forces 𝒜(r) = 0 (a degree drop, not rank 1);
                 the module returns null there. The soft endpoint must come from the CONFORMAL row,
                 which lands on σ = h·w with 𝒜(r) ≠ 0 — verified above.
           and VERIFY each endpoint's stratum by evaluating σ at the poles, rather than
           trusting which module produced it
```

**Log per pole, never as a norm.** The mixed signature is *one pole at σ ≈ 0 while another sits at
O(1)* — a norm over the poles hides exactly that. Record pole locations, σ at each, Jacobian rank and
degree.

**The caveat that decides whether a stage-2 negative means anything.** Continuation on a SINGULAR
variety is where predictor–corrector falls off the path, and `RATIONAL_PH_STATE` §11.4 says every
member of interest is singular. Their own §7 retired a witness-set computation for path-failure
reasons, and cites the need for certified endgames that report path failures. Without one, *"the path
broke"* and *"the solver broke"* are the same observation — so a stage-2 failure is uninterpretable
unless the endgame can tell them apart.

**Why this over the rank scan.** C21 is a proxy for *can you drag between charts*; the continuation
tests that directly, and **a successful path IS the dragging path**. The rank scan says whether the
cell is non-empty but not whether it is positioned so you can travel through it. They are
complementary; this one is cheaper and can only produce a yes, which — by the asymmetry argument
below — is the outcome worth chasing first.

**The older method note still stands for the rank scan itself.** A search can only answer *yes*; an
empty search teaches nothing. What row 4 improves is that its system is **linear**, so the solution
dimension is computable exactly as a function of (α, 𝒜) rather than sampled — *scan the rank across a
family, do not hunt for a hit* — and a negative then upgrades from "we did not find one" to "the rank
is deficient across this family".

---

## 6b. Methodology — two questions that are not the same question

> **"Which module builds this?" and "could this test have come out otherwise?" are different questions.**

The first is about constructibility, the second about falsifiability, and only the second tells you
whether a run can teach you anything. Promoted here out of a commit message because it has already
caught four things in this ledger:

- **the m = 3 mixed-cell design.** At m = 3 the real pole is hard BY THEOREM, so "mixed" is nearly
  guaranteed once the pair softens — the test could only confirm. m = 4, two pairs, has nothing
  compelling the second pair, so it can fail. The m = 3 run would have produced a true result by a
  method that could not have produced a false one.
- **`select: 'first'`** in `rationalPHResidue`, which returned a member at ‖𝒜(r)‖² = 4.6e-5 — nearly
  fake, with `softness` sitting at 1 and unable to warn. The conditioning-aware default caught it.
- **the σ/Σ collision**, where the name "σ at the pole" meant two unrelated quantities and reading the
  wrong one would have measured nothing while looking like a result.
- **the coprimality check**, where the condition I verified was strictly weaker than the one asked
  for, and blind on precisely the locus the witness occupies.

Every one of those is a run that would have come out "positive" for a reason unrelated to the
question. The general form: before running, ask what a NEGATIVE would look like, and whether the setup
admits one.

---

## 6c. The atlas walks — outward from the witness

Nonemptiness is settled, connectivity is not. But the witness sits in the MIDDLE, well conditioned at
both pairs, so the walks run outward from it rather than starting at a pure stratum and steering —
each is shorter and better conditioned than anything beginning at an end.

```
mixed → AllSoft    DONE.  drive the hard pair: ε 1.27 → 0, all four poles soft, ‖𝒜(r)‖² = 1.19
                   and 0.77, residue defect 2.8e-16, contour residues ~3e-16.
mixed → AllHard    DONE.  σ(r₂) = ε·e^{iφ}, ε: 0 → ~1, swept over TWELVE φ.  ALL TWELVE
                   ARRIVE — softness 0.80…0.99 at both pairs, min ‖𝒜(r)‖² from 0.52 to 1.05,
                   residue defects 1e-16…8e-15.
```

**So the atlas closes.** AllSoft, the mixed cell and AllHard lie in one connected component, joined
through the witness — and joined by paths that are short and well conditioned at both ends, which is
what running outward bought.

Connectivity needed ONE φ to arrive. Twelve did, so the soft locus is not a barrier in any sampled
direction *from this witness* — a statement about one point of the stratum, not about all of it.

**Why the φ-parameterisation moves where a magnitude target cannot.** Targeting σ(r) = ε·e^{iφ} is TWO
real equations, and the target map is a submersion there (see the rank-2 argument below). Targeting
|σ| = ε is ONE equation whose gradient IS zero at σ = 0. Same submanifold, same starting point; one
parameterisation moves and the other is stationary.

The general statement, which catches far more than this problem:

> **Any residual built as a SUM OF SQUARES has vanishing gradient exactly on its zero set. Such a
> residual can be minimised toward zero and can never be driven away from it.**

That covers |σ|², least-squares defect functionals, energy targets and distance-to-a-set — every one
of which looks like a perfectly good continuation parameter right up until you start ON the zero set.
"Target the complex quantity rather than its magnitude" is the instance; the operative check is not
"is it complex" but **is the target map a submersion here**, and that is one differential.

**ρ(φ) survives both artifact tests — the asymmetry is real, and the SYMMETRY PREMISE is what fails.**
The Lean side predicted ρ(φ) = ρ(−φ) and offered three explanations for the measured disagreement.
Two are now refuted and the third excluded by construction:

```
  30/330  0.848 / 1.189     60/300  0.760 / 1.412     90/270  0.723 / 1.563
  120/240 0.683 / 1.126    150/210  0.685 / 0.876
```

- **gauge (option 2) — REFUTED.** Pinning A₀.v = 0 kills the Hopf phase and is a real condition on
  real coefficients; ρ comes out IDENTICAL to four decimals. It could not have mattered: a
  minimum-norm Newton step is orthogonal to the Jacobian's nullspace, and the gauge direction lies in
  it, so the phase was already frozen at its starting value and never free to drift.
- **solver (option 1) — REFUTED.** ρ is unchanged to four decimals across max steps 0.15, 0.03 and
  0.005 with 80, 200 and 400 corrector iterations.
- **stopping rule (option 3) — excluded.** The cap is 6.0 and nothing reaches it.

**Which leaves the premise, and it does not hold.** "Relabelling" is not a symmetry of curve space.
For a given curve σ(p) is a DEFINITE complex number at a DISTINGUISHABLE point, so σ(p) = εe^{iφ} and
σ(p) = εe^{−iφ} are different demands on that curve. The unordered PAIR of σ-values is the same under
both — that much of the argument is right — but which pole carries which value is real information. A
bijection between the two solution sets would need a symmetry of the problem exchanging p ↔ p̄: a real
Möbius of negative determinant preserving the whole pole set. `{0.6±0.9i, −0.5±0.7i}` admits none.

**A cheap decisive test, and a prediction.** Poles ON THE UNIT CIRCLE are preserved by t ↦ 1/t, which
is real, has determinant −1, and sends e^{iα} ↦ e^{−iα} — exactly the missing symmetry. If the premise
is the explanation, ρ should become symmetric for a unit-circle pole set and stay asymmetric off it.
Not yet run.

So "the hard region seen from this point is not round" is REINSTATED, now with both artifact
explanations excluded rather than merely unexamined.

**And the twelve directions are SIX**, doubled by the same symmetry. Connectivity is untouched — one
suffices — but the sampling statement is six, from one point of the stratum.

**Most of the arrival was free.** The target map is a submersion at a non-real pole with 𝒜(r) ≠ 0, so
first-order motion exists in EVERY direction and arrival at small ε is guaranteed rather than
measured. The content is survival to ε ≈ 1 — all six reach ε ≥ 0.68 with the residue conditions
holding, a lower bound on the hard region's extent.

**Where the rank-2 comes from**, since the mechanism recorded earlier was one rank short. ∂σ/∂x =
2Σaᵢ∂aᵢ/∂x gives rank ≥ 1, which alone would leave one real line of first-order motion and make most
directions second-order at best. The rotation comes from the perturbation itself: perturbing α by c·p
with p real-coefficient changes σ(r) to first order by `p(r)·(c·A′ + c̄·A)` with A = α(r) and
A′ = (pconj α)(r). The bracket is real-linear in c with determinant |A′|² − |A|², genuinely rank one
sometimes; **p(r) supplies the rotation**, since for p = u + vX and r ∉ ℝ, p(r) = u + vr sweeps all of
ℂ. So rank 2 holds at any non-real pole with 𝒜(r) ≠ 0 — exactly "soft but not degenerate". On the real
axis p(r) is real and A′ = conj A, so the rank is 1 and the image is ℝ — forced, because σ(t) is real
there. **Real poles are hard and real poles are unrotatable for the same reason**, which is why
soft→hard is only ever a question at a complex pole.

**The asymmetry is structural, not numerical.** Soft is codimension 2 (σ(r) = 0 is one complex
equation); hard is open. Hard→soft is a TARGETING problem, which is what the ε-drive does. Soft→hard
is a LEAVING-A-SUBMANIFOLD problem, and those have no canonical direction: the normal space is a real
2-plane, so the escape directions form a circle.

Worse, σ = 0 is a CRITICAL POINT of |σ|² — `d(σσ̄) = σ̄dσ + σdσ̄ = 0` there — so gradient ascent on the
magnitude does not move at all. Stationary, not ill-conditioned; any method targeting a magnitude will
sit still forever.

**The operational consequence:** target σ(r) = ε·e^{iφ} with φ FIXED, continue in ε, and sweep φ over
a handful of values. Only one φ needs to arrive for connectivity to hold, which makes success cheap —
and makes a negative meaningful, since it would require every direction to fail, a geometric statement
rather than a solver complaint.

---

## 7. What the deck takes from this

The deck is a path, and it currently visits three rows: **2** (the λ-chart thread), **7** (the sphere
thread), and **4** once — in **"A whole family over one sphere"**, which is where form (9) and
`rationalPHDual` appear, and which is the slide that turns the published degree-3 specimen into a
family. Its title claims *two representations*, which is the honest count of what it *teaches*: row 4
arrives as the answer to one slide's problem rather than as a representation in its own right.

The rest of the map should still be named once somewhere in section II — a specialist will think
"what about the dual?" within thirty seconds, and the deck should show that the question was already
asked and answered rather than missed. Row 6 stays in the repo unless the σ = 0 work makes it
load-bearing, in which case it earns slides and the count honestly becomes three.

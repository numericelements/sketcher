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

1. **Does the mixed cell exist** — some poles invertible, some singular? It is the connective tissue
   an atlas needs, since the λ-chart and the conformal construction currently cover *disjoint* strata
   and two disjoint charts are not an atlas.
2. **Can the rank-1 floor be charted?** Rank-1 matrices are outer products — the cone over the Segre
   embedding, smooth away from zero — so the datum at a singular pole should be a point of `ℙ¹ × ℙ¹`
   exactly where the invertible case carries one real λ. Untried. Buys uniformity, not coverage.
3. **Is the sphere polygon new?** Two reading sessions found nothing, which is "not found", not "new".
   Choi, Lee & Moon is the paper to settle it against.

### How to run question 1 — TODO, and the Lean side has narrowed it

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
           soft  from rationalPHFreeLambda, which never divides
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

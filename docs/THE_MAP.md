# The map — every way we know to write a PH curve, and what each one charges

*Reference, not narrative. `RATIONAL_PH_STATE.md` is the working state of the rational thread and
`SPHERE_REPRESENTATION_SLIDES.md` is the sphere slides; this file is the **atlas of formulations**, so
that a choice of representation is made against the alternatives instead of by habit. The deck is a
**path** through this map, not a copy of it.*

*Every row names its file. Where a claim is inferred rather than measured it says so.*

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

## 2. Space, polynomial

```
r′ = 𝒜 i 𝒜*        |r′| = |𝒜|² = σ        𝒜 FREE, integration free
```

The sandwich makes the speed a polynomial and costs nothing; a polynomial always integrates to a
polynomial. The only structure is the **gauge**: `𝒜 ↦ 𝒜·e^{iθ}` moves no curve, so the preimages of a
given hodograph form a circle rather than the plane's two points. Farouki–Sakkalis (1994); the
spin-representation view is Choi, Lee & Moon (2002).

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

## 4. The axis that was missing: μ, and which CLASS each row parametrises

*Raised by the Lean companion, 2026-08-16, and it changes how a witness may be read.*

Differentiate form (9):

```
r = −2b/α        α b′ − α′ b = μ·(𝒜i𝒜*)        ⟹        r′ = −2 μ·N / α²
```

Our spinor model fixes the hodograph as `N/w²`. **The dual's is `μ·N/α²`** — a strictly larger class.
That μ is the common factor `h` of Dietz–Hoschek–Jüttler, and **it is not generally absorbable**:

```
𝒜 ↦ s·𝒜   multiplies N by s²
```

so only a μ that is *already the square of a real polynomial* can be pushed into the spinor. And a
non-negative real polynomial need only be a **sum of two squares**, not a square. So:

- **μ constant** → the witness transcribes into the spinor model unchanged.
- **μ non-constant and not a square** → the witness lives in a class the spinor model does not
  contain, and the question it answers is not the question that was asked.

**Concrete standing requirement: report μ alongside any candidate.** A witness without its μ cannot
be transcribed safely.

**And this reopens a retraction.** `RATIONAL_PH_STATE` §7 retracts *"the missing freedom is Kalkan's
non-constant μ"* on the grounds that *"N is primitive, so there is no common factor to be μ."* The
Lean side's C6 shows that justification does not generalise. The retraction may still be right for the
specific N it was about, but its reason is no longer available — and the **mixed cell is exactly where
one would go looking for a non-constant μ**. Two independent lines arriving at the same reopened
question is worth the note.

**Speculative, flagged as such:** the conformal row's PH condition is `‖p′‖ = h/w`, i.e. `|N| = h·w`
— which *already carries* a factor of w, the same shape as a non-constant μ. If that is the same
freedom under another name, the μ axis may be what actually separates rows 2 and 7, and would explain
why they land on disjoint strata (§13.8's `σ(r) ≠ 0` versus `σ = h·w`). **Not verified.** It is
cheap to check and would be worth checking before the discussion.

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

**How to run question 1, and this is a method note worth keeping.** A search can only answer *yes* —
an empty search teaches nothing. The dual weakens that but does not remove it. The genuine
improvement is that **row 4's system is linear**, so the solution dimension is computable exactly as a
function of `(α, 𝒜)` rather than sampled. So:

> **Scan the rank across a family of (α, 𝒜). Do not hunt for a hit.**

A negative result then upgrades from *"we did not find one"* to *"the rank is deficient across this
family"*, which is a real statement. And whatever comes back, **report μ with it** (§4).

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

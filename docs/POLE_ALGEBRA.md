# Soft and hard poles — the algebra, in one line per step

Everything here is checkable on paper. No solver, no sampling, no measurement is used to
establish anything in §1–§8. Numbers appear only in the margin notes, and only as confirmation
that the code implements the algebra — never as an argument.

§9 lists, separately, what is **not** proved here. Nothing in §1–§8 depends on it.

---

## 1. Setup

A rational curve in ℝ³, written the way a NURBS editor holds it:

```
    x(t) = q(t) / W(t)          q = (q₁, q₂, q₃) real polynomials,  W real
```

In rational Bézier form `q = Σ wₖPₖBₖ` and `W = Σ wₖBₖ`, so q and W have the same degree d.

Differentiate:

```
    x′ = N / W²                 where   N = q′W − qW′
```

**Degree of N.** If deg q = deg W = d, the coefficient of t^{2d−1} in q′W is d·q_d·W_d and in qW′
is q_d·d·W_d. They cancel, so **deg N ≤ 2d−2**.

The speed is `‖x′‖ = ‖N‖ / W²`, with `‖N‖ = √(N₁²+N₂²+N₃²)`.

**PH means ‖x′‖ is rational, i.e. ‖N‖ is a polynomial.** Call that polynomial ρ. The whole
condition, and the only equation the projective model solves, is

```
    N₁² + N₂² + N₃²  =  ρ²
```

A **pole** is a root r of W. It is *genuine* if q(r) ≠ 0; if q(r) = 0 the fraction reduces and the
pole is removable.

Throughout, ⟨u,v⟩ = Σ uⱼvⱼ is the **bilinear** form, extended to complex vectors without
conjugation. That distinction is the whole subject: over ℂ it has nonzero null vectors.

> **AND IT IS THE MOST EXPENSIVE MISTAKE IN THIS PROJECT — five wrong conclusions so far.** The
> Hermitian norm |q|² = Σ|qⱼ|² vanishes only when q = 0, which asks whether the pole is FAKE.
> The bilinear ⟨q,q⟩ = Σqⱼ² asks whether it is SOFT, and can vanish with q nowhere near zero.
> Measured instance: a specimen with |q(r)| = 9.6e-3 — "comfortably coprime" — had ⟨q(r),q(r)⟩ =
> 2e-15, a genuinely soft pole, and the Hermitian check declared it absent. If a question contains
> the words soft, hard, isotropic, or gcd-with-‖q‖², it is bilinear.

### The standing hypothesis

> **§2–§6 assume W is SQUAREFREE — every pole simple.** §7 and §8 deliberately leave that
> hypothesis, and say where.

It is not cosmetic, and dropping it silently was the one error in the first version of this
document. At a root of multiplicity m ≥ 2 we have W′(r) = 0, and then §2 gives N(r) = 0 whatever q
does, so `⟨N(r),N(r)⟩ = 0` holds vacuously and "soft" stops meaning anything. §6 records the
counterexample; §7 then exploits exactly this loophole on purpose.

---

## 2. The pole identity

At a root r of W:

```
    N(r) = q′(r)·W(r) − q(r)·W′(r) = −q(r)·W′(r)
```

because W(r) = 0 kills the first term. **One line, and everything below rests on it.**

---

## 3. Softness is ρ(r) = 0

A pole is **soft** when the hodograph numerator is isotropic there: ⟨N(r), N(r)⟩ = 0.

From §2:

```
    ⟨N(r), N(r)⟩ = ⟨q(r), q(r)⟩ · W′(r)²
```

From the PH equation at t = r:

```
    ⟨N(r), N(r)⟩ = ρ(r)²
```

Together:

```
    ρ(r)²  =  ⟨q(r), q(r)⟩ · W′(r)²
```

**If r is a simple root of W** then W′(r) ≠ 0, and therefore

```
    soft   ⟺   ⟨q(r), q(r)⟩ = 0   ⟺   ρ(r) = 0
```

> The simple-root hypothesis is not decoration. At a double root W′(r) = 0 and the identity says
> nothing — which is exactly the loophole the conformal model uses in §7.

---

## 4. All poles soft ⟺ W divides ρ

Suppose W has d distinct roots r₁ … r_d (all simple).

Every pole soft
⟺ ρ(rₖ) = 0 for every k    (§3)
⟺ every root of W is a root of ρ
⟺ **W ∣ ρ**.

Write ρ = W·h. Then

```
    ‖x′‖ = ‖N‖ / W² = |ρ| / W² = |W·h| / W² = |h| / |W|
```

and that is the conformal parameterisation, in which the speed is a ratio of a polynomial to the
weight rather than to its square.

**So, for squarefree W, the all-soft members are exactly the conformal ones.** Softness is not a
property some PH curves happen to have; it is the statement that the speed numerator carries a
factor of W.

> **The hypothesis is carrying the theorem, not decorating it.** Drop it and the equivalence fails
> at the first step: `x = (1/(t+1)², 0, 0)` has every pole soft, yet W ∤ ρ — because (t+1)² does not
> divide 2(t+1) — and it is not conformal, since W ∣ ‖q‖² would need (t+1)² ∣ 1. All-soft, not
> conformal, not a chain that survives. See §6.

> Confirmed to 15 digits in `softHardUnderDrag.test.ts`: a conformal member imported into (P, w, ρ)
> divides with remainder 7e-15; a curve with a hard pole has remainder 1e+17.

---

## 5. What softness looks like: equal length, right angle

Let r be a **non-real** pole. Since q has real coefficients, q(r) ∈ ℂ³; write

```
    q(r) = a + i·b,          a, b ∈ ℝ³
```

Then

```
    ⟨q(r), q(r)⟩ = Σ (aⱼ + i bⱼ)² = (|a|² − |b|²) + 2i⟨a, b⟩
```

A complex number is zero when both parts are, so

```
    SOFT   ⟺   |a| = |b|   and   a ⊥ b
```

**The real and imaginary parts of the numerator are perpendicular and of equal length.**

Two real conditions **on q(r)**. A conjugate pair r, r̄ costs 2 and not 4: q(r̄) = conj(q(r)) =
a − i·b, so ⟨q(r̄),q(r̄)⟩ is the conjugate of ⟨q(r),q(r)⟩ and vanishes exactly when it does.

> **That is a count in the ambient (q, W) space, and it does NOT transfer to the PH variety.**
> Codimension needs the two conditions to be independent of the constraints already imposed, and
> on the residue variety they measurably are not: the softness rows lie INSIDE the row space of the
> residue conditions (residual 1e-8), and AllSoft comes out the majority outcome — 113 of 240
> deterministic Newton starts — rather than the rare event a codimension count would predict.
> Whatever the resolution, "soft is a thin set" is not something this section establishes. Moved to
> §9.

Hence hardness increases in exactly two ways: **tilt** off the alignment, or **§6**.

> Confirmed: a soft member reads |a|/|b| = 1.000000 at 90.00° at all six poles; a hard one reads
> 0.983 at 85.3°.

---

## 6. At a real pole — and where the hypothesis bites

If r is real then q(r) ∈ ℝ³, so b = 0 and ⟨q(r), q(r)⟩ = |a|² = |q(r)|².

**Under the standing hypothesis** (r a simple root, so W′(r) ≠ 0), §3 applies and

```
    soft   ⟺   |q(r)| = 0   ⟺   q(r) = 0
```

But q(r) = 0 with W(r) = 0 means the fraction reduces: r is not a genuine pole at all. So

```
    every genuine SIMPLE real pole is HARD.
```

Equivalently: a soft simple pole must be complex. Same fact as §5 — b = 0 forces |a| = |b| to
force a = 0.

### Without the hypothesis this is FALSE, and the counterexample is small

Let r be real with q(r) ≠ 0 and mult_r(W) = m. Then mult_r(q′W) ≥ m while mult_r(qW′) = m−1
exactly, so

```
    mult_r(N) = m − 1        hence   N(r) = 0  ⟺  m ≥ 2
```

and for real r, N(r) ∈ ℝ³, so ⟨N(r),N(r)⟩ = |N(r)|². Therefore at a **genuine real pole**

```
    ⟨N(r), N(r)⟩ = 0   ⟺   mult_r(W) ≥ 2
```

A multiple real pole is "soft" by the letter of the definition, with **no condition on q at all**.
The witness, due to the Lean companion:

```
    x(t) = ( 1/(t+1)², 0, 0 )

    q = (1,0,0)        W = (t+1)²         N = (−2(t+1), 0, 0)
    ⟨N,N⟩ = 4(t+1)²    ρ = 2(t+1)         ‖N‖² − ρ² = 0 exactly
    q(−1) = (1,0,0) ≠ 0                   gcd(q, W) = 1 — the pole is GENUINE
    N(−1) = 0                             so it is SOFT, at a REAL pole
```

and it is an ordinary rational Bézier quadratic with weights **1, 2, 4** — all positive, so W > 0
on [0,1] and the pole sits at t = −1, outside the interval. Nothing pathological about it.

Note also W ∤ ρ there, which is what breaks §4's chain: every pole soft, yet ρ vanishes only to
first order where W vanishes to second.

**So the sentence to carry away is the one with the hypothesis in it.** The definition of softness
carries information at a simple pole and stops carrying it at a multiple one — which §3's margin
note said, and which §7 is about to use deliberately.

*(Pinned in `realPoleSoftness.test.ts` — it is the sharpest guard in this file, because it is the
statement I got wrong.)*

## 7. The conformal model forces softness

The conformal (ℝ^{4,1}) representation is C = (W, q, c∞), a curve of *points* precisely when it is
null, ⟨C,C⟩ ≡ 0, which reads as a polynomial identity

```
    ‖q‖²  =  2 · W · c∞
```

At a root r of W:

```
    ⟨q(r), q(r)⟩ = 2 · W(r) · c∞(r) = 0
```

**Every pole of a conformal PH member is soft — by the null condition alone, with no reference to
PH at all.** Nothing was chosen; the model cannot express anything else.

Consistency with §4: ‖q‖² = 2Wc∞ says W ∣ ‖q‖², matching ρ = h·W.

**Where a hard pole can still hide — and here the standing hypothesis is dropped on purpose.**
§3 required a *simple* root. Take any rational curve q/w and
lift it as (2w², 2wq, ‖q‖²). The denominator 2w² has every pole **doubled**, so W′(r) = 0 and §3
is silent — and the numerator 2wq vanishes there too. That non-reduced locus is the only room a
null curve has for a hard pole, and it is not a curve of the model's own degree.

---

## 8. Odd conformal degree always factors

**Lemma.** Every real root of ‖q‖² has even multiplicity.

*Proof.* Let r be real, k = minⱼ mult_r(qⱼ), and write qⱼ = (t−r)^k uⱼ with some u_j(r) ≠ 0. Then
‖q‖² = (t−r)^{2k}·Σuⱼ², and Σuⱼ(r)² > 0 because the uⱼ(r) are **real** and not all zero. So
mult_r(‖q‖²) = 2k. ∎

From ‖q‖² = 2·W·c∞, for every real r:

```
    mult_r(W) + mult_r(c∞)  is even
```

so `(t−r) ∣ c∞ ⟺ mult_r(W) is odd`. And if mult_r(W) ≥ 1 then mult_r(‖q‖²) ≥ 1, so k ≥ 1 and
(t−r) ∣ qⱼ for every j.

**Theorem.** If deg W is odd, the member factors.

*Proof.* Non-real roots of a real polynomial come in conjugate pairs of equal multiplicity, so the
real multiplicities of W sum to deg W mod 2. If deg W is odd, some real root r has **odd**
multiplicity. There (t−r) divides W, divides q, and divides c∞ — all five components — so the
member is a degree-(n−1) curve carried in a degree-n basis. ∎

```
    n odd   →   every member is a lower-degree curve in disguise
    n even  →   W may avoid the real axis entirely, and generically does
```

**The reduced conformal degrees are even.** This is §6 in another key: an odd-degree W must meet
the real axis, and softness at a *simple* real pole forces the numerator to vanish.

**§8 is also what makes §7's escape hatch unavoidable rather than an artifact.** A hard real pole
needs a non-reduced representation, because odd degree must meet the real axis and a genuine simple
real pole cannot be soft. The doubled degree is not a trick of the lift; it is the only room left.

Two supports on the Lean side, worth citing rather than re-deriving:

- `deg_parity` proves `C.deg % 2 = C.w.natDegree % 2`, which is what justifies identifying the
  member degree n with deg W — an identification this section makes implicitly.
- the multiplicity lemma is `even_rootMultiplicity_sumSq`, and it is **open** in that ledger. The
  proof above is short enough to transcribe, and it is the one worth machine-checking, because it
  is the only step in this document with real content.

> This is not academic. It is why two degree-5 slides in the talk were retired — they were drawing
> genuine rational PH curves that were **quartics**, carried in quintic polygons.

---

## 9. What is NOT proved here

Held separately on purpose. None of §1–§8 depends on any of it.

- **Whether the all-soft and all-hard cells are connected.** Not settled — but NOT neutral either,
  and the first version of this list understated it. There is positive evidence *against*, at first
  order: on the residue variety dσ(r) has no component off the constraint row space wherever
  σ(r) = 0 (residual 1e-10, against 0.6–0.9 at a hard pole), i.e. **soft is absorbing**. And a
  claimed mixed → AllHard walk was RETRACTED: all twelve endpoints had hodograph rank 1 — straight
  lines — and the first Newton step already landed rank 1, so the continuation never left ε = 0.
  Pointing the same tool at it again is not the experiment to run.
  Separately, and in a different model, driving a soft projective member at a hard one hardened two
  poles of six by eleven orders before the solver stalled. The two are not directly comparable, and
  neither settles it.

- **Whether softness is a "thin" condition on the PH variety.** §5 counts two conditions in the
  ambient (q, W) space. On the residue variety the softness rows lie inside the row space of the
  conditions already imposed (residual 1e-8), and AllSoft is the majority outcome of 240
  deterministic starts — 113 AllSoft, 79 Mixed. So the ambient count does not transfer, and why it
  does not is open.
- **Whether hard poles are "generic" in the projective model.** That is sampling, not algebra:
  random solves at degrees 3, 4, 5 give roughly 3 hard poles per soft one. A count, from one
  sampler, with one notion of random.
- **What a drag does.** Measured, and limited by a solver whose constraint Jacobian has no rank
  gap — its precision degrades from 1e-13 at rest to ~1e-8 under motion, and more iterations do
  not help.
- **Anything about existence at a given degree.** That odd-degree rational PH curves exist in the
  projective model is a measurement (140 random starts per degree, four disqualification checks),
  not a theorem.

---

## How to check this without running anything

§2 is one substitution. §3 is that substitution squared. §4 is the definition of divisibility.
§5 is expanding (a+ib)². §6 is that a sum of real squares vanishes only when every term does,
**plus a multiplicity count that the first version of this document omitted and got the section
wrong for**. §7 is evaluating an identity at a root. §8 is the one place with real content, and it
is the multiplicity lemma — the rest is bookkeeping mod 2.

If any step is wrong, the code that agrees with it to 15 digits is agreeing with a mistake, and
that is worth knowing before anything here reaches a slide.

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

**So the all-soft members are exactly the conformal ones.** Softness is not a property some PH
curves happen to have; it is the statement that the speed numerator carries a factor of W.

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

Two real conditions — which is where "codimension 2" comes from. A conjugate pair r, r̄ costs 2
and not 4: q(r̄) = conj(q(r)) = a − i·b, so ⟨q(r̄),q(r̄)⟩ is the conjugate of ⟨q(r),q(r)⟩ and
vanishes exactly when it does.

Hence hardness increases in exactly two ways: **tilt** off the alignment, or **§6**.

> Confirmed: a soft member reads |a|/|b| = 1.000000 at 90.00° at all six poles; a hard one reads
> 0.983 at 85.3°.

---

## 6. At a real pole, soft and genuine are incompatible

If r is real then q(r) ∈ ℝ³, so b = 0 and ⟨q(r), q(r)⟩ = |a|² = |q(r)|².

```
    soft   ⟺   |q(r)| = 0   ⟺   q(r) = 0
```

But q(r) = 0 with W(r) = 0 means the fraction reduces: r is not a genuine pole at all.

```
    Every GENUINE real pole is HARD.
```

Equivalently: a soft pole must be complex. This is the same fact as §5 — b = 0 forces |a| = |b|
to force a = 0.

> This is why isotropy ⟨q,q⟩/|q|² is a useless instrument at a real pole: it reads |a|²/|a|² = 1
> identically. Two of the tests in this repository were rewritten for that reason.

---

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

**Where a hard pole can still hide.** §3 required a *simple* root. Take any rational curve q/w and
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
the real axis, and softness at a real pole forces the numerator to vanish.

> This is not academic. It is why two degree-5 slides in the talk were retired — they were drawing
> genuine rational PH curves that were **quartics**, carried in quintic polygons.

---

## 9. What is NOT proved here

Held separately on purpose. None of §1–§8 depends on any of it.

- **Whether the all-soft and all-hard cells are connected.** A path would have to pass through
  *mixed* members. Not settled either way.
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
§5 is expanding (a+ib)². §6 is that a sum of real squares vanishes only when every term does.
§7 is evaluating an identity at a root. §8 is the one place with real content, and it is the
multiplicity lemma — the rest is bookkeeping mod 2.

If any step is wrong, the code that agrees with it to 15 digits is agreeing with a mistake, and
that is worth knowing before anything here reaches a slide.

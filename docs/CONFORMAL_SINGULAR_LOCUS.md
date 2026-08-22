# Where the conformal PH variety is singular — a handoff to the Lean companion

A measured observation with no proof, and a naive explanation that the measurements refute. Written
to be self-contained: everything needed to state the question is below.

---

## 1. The objects

The conformal model of ℝ³ is ℝ^{4,1} in the basis {o, e₁, e₂, e₃, ∞}, with

```
    ⟨A,B⟩ = a₁b₁ + a₂b₂ + a₃b₃ − (a₀b₄ + a₄b₀)
```

A **conformal PH curve of degree n** is a Bézier curve C(t) = Σ Cₖ Bₖⁿ(t) with Cₖ ∈ ℝ^{4,1},
together with h(t) = Σ hₖ Bₖⁿ⁻¹(t), subject to

```
    NULL   ⟨C(t), C(t)⟩ ≡ 0                     2n+1 Bernstein coefficients
    PH     ⟨C′(t), C′(t)⟩ − h(t)² ≡ 0           2n−1 Bernstein coefficients
```

so **4n equations in 5(n+1) + n unknowns**. Writing C = (W, q, c∞), the point curve is x = q/W and
the parametric speed is ‖x′‖ = h/W. NULL reads ‖q‖² = 2·W·c∞ as a polynomial identity.

## 2. The generic rank is 4n − 1 — and it has a derivation

Due to the Lean companion, and it is better than citing the repo. Let A_n be C's leading power
coefficient. NULL's top coefficient is ⟨A_n, A_n⟩ = 0. But C′'s leading coefficient is n·A_n, so
PH's top coefficient is n²⟨A_n, A_n⟩ − (top of h²) = 0, whose first term is already zero by NULL.

So **the top PH row is implied by the top NULL row — exactly one dependency — and h's leading
coefficient is forced to zero**, i.e. deg h ≤ n − 2.

That predicts something this document had recorded as a curiosity: "h's degree does not matter,
since the n = 4 and n = 6 soft members have h of degree 2 and 4 rather than 3 and 5." Those are
n − 2, universally, not deficiencies. The same identity appearing on both sides is a consistency
check on the mechanism.

> **One measurement does not fit it and needs a cleaner look.** The clean degree-8 lift reads
> deg h = 7 = n − 1, not n − 2. Its source is a numerical solve at ~1e-11, so the leading
> coefficient may be noise above the 1e-12 cutoff used — but that is a guess, not a check.

## 3. The generic rank is 4n − 1 — measured

The defining Jacobian is computed **analytically** (the conditions are quadratic, so it is exact;
by central difference the dead directions read 1e-11, which is the step size and not the variety).
Singular values, row-normalised, counting those above 1e-9 of the largest:

```
    n = 4    16 rows   rank 15   =  4n − 1
    n = 6    24 rows   rank 23   =  4n − 1
    n = 8    32 rows   rank 31   =  4n − 1
```

The one systematic redundancy is known and documented in `conformalPHCurve`: the leading power
coefficient of h is pinned to zero by the geometry.

## 4. The lift, and why a hard pole needs it

Softness at a pole is isotropy of the numerator: at a root r of W, N(r) = −q(r)W′(r), so with
‖N‖² = ρ² the PH condition gives ρ(r)² = ⟨q(r),q(r)⟩·W′(r)². **At a SIMPLE root, NULL forces
softness outright**: ‖q(r)‖² = 2·W(r)·c∞(r) = 0.

So a hard pole can only sit where W′(r) = 0 — a doubled root — and there the numerator must cancel
too. The construction that produces one: a rational PH curve x = q/w of degree d with speed
‖x′‖ = ρ/w² lifts as

```
    C = (2w², 2wq, ‖q‖²),     h = 2ρ
```

which is null identically, since ‖2wq‖² = 4w²‖q‖² = 2·(2w²)·‖q‖². Its conformal degree is
n = 2·max(deg w, deg q), every pole is doubled, and the numerator vanishes at each.

## 5. The observation

Two lifts of degree-4 rational PH curves with hard poles. **Both land at conformal degree 8. Both
are on the variety, to 1e-15. Both are non-reduced.** They differ in rank.

```
                              source           lift component true degrees          rank   deficiency
    (a) generic quartic       deg w = 4        W 8   q 8,8,8   c∞ 8   h 7             31        0
    (b) λ-chart quartic       deg w = 1        W 2   q 5,5,5   c∞ 8   h 4             29        2
```

Full singular-value tails, row-normalised:

```
    (a)   … 2e-4   8e-5   3e-5   5e-17
    (b)   … 8e-8   5e-17  4e-17  2e-17
```

So (a) has **one** machine-zero direction — the known redundancy — and sits at the generic rank.
(b) has **three**, plus a fourth value at 8e-8 that is small but not zero.

### Kernel and cokernel, since the numbers are easy to confuse

At n = 8 there are 4n = 32 rows and 5(n+1) + n = 53 unknowns.

```
    (a)  rank 31  →  cokernel 1 (one dependent equation)  →  tangent space 53 − 31 = 22
    (b)  rank 29  →  cokernel 3                           →  tangent space 53 − 29 = 24
```

A tangent space larger than the generic dimension IS the definition of a singular point, so (b) is
singular and (a), at the generic rank, is smooth on its component. The generic rank is measured
independently at n = 4, 6, 8, which is what makes that a criterion and not a heuristic. The residual
worry is not smoothness but WHICH COMPONENT — whether (a) lies on one of the expected dimension or
on a smaller one with the same Jacobian rank. That is a different measurement.

### What this refutes

**Non-reduced does NOT imply singular.** (a) is non-reduced and smooth. The doubling of the poles
and the cancelling of the numerator are not what costs rank.

**And "eighteen structurally zero coefficients against two lost rank" was a category error**, not a
failed count: deficiency lives in the row space, not the unknowns. The count that could work is how
many equation rows have all gradient entries vanish, which is computable from the same Jacobian.

### The controlled experiments — because (a) and (b) differed in THREE ways

(a) and (b) differ in degree profile, in pole reality (deg w = 1 forces a real pole), and in
provenance (generic solve versus the λ-chart construction). Attributing the rank drop to imbalance
was one hypothesis of three, from two specimens. So: sources with a chosen weight polynomial, built
by freezing w's columns in the projective solver — same route for all of them, so provenance is held
fixed — then lifted.

```
    source deg w   source poles              lift profile      rank        δ      gap
    ------------   -----------------------   --------------   ---------   ----   ------
    4 (generic)    complex                   W8  q8  c∞8      31          0      6e11
    4              2 REAL + a complex pair   W8  q8  c∞8      31          0      8e11
    2              a complex pair            W4  q6  c∞8      30 / 31     0–1    2e5
    2              2 REAL                    W4  q6  c∞8      30 / 31     0–1    1e5
    1              1 REAL                    W2  q5  c∞8      29          2      1e6
    1 (λ-chart)    1 REAL                    W2  q5  c∞8      29          2      1.7e9
```

**Provenance is excluded**: deg w = 1 built by the frozen-weight solver gives the same δ = 2 as the
λ-chart, by a completely different route.

**Pole reality is excluded**: two REAL poles at deg w = 4 give δ = 0 with a clean 8e11 gap, and the
two deg w = 2 rows agree with each other whether the poles are real or complex.

**What survives is the profile, and it looks GRADED rather than binary** — δ = 0 at no imbalance,
0–1 at W4 against n = 8, 2 at W2. An earlier reading of this table called the imbalance hypothesis
refuted on the strength of the middle row; that was too quick. The middle row is *unresolved*, not
zero.

### And the middle row is unresolved for a reason worth stating

The two W4 specimens have tails `… 2e-7  8e-12  4e-17` and `… 1e-7  1e-10  1e-15`, with gaps of
only 1e5–2e5 — no cliff. Their sources are numerical solves that will not refine below ~9e-12
(the projective solver's own floor with w frozen), and the ambiguous singular values sit AT that
level. So the reading is 30 or 31 and the data cannot currently say which.

By contrast (b)'s 8e-8 has 6e-7 above it — smooth decay, then a nine-order cliff — so **δ = 2 is
robust**, and so is δ = 0 for both balanced rows.

## 6. The numerical consequence — PREDICTED, not mysterious

Levenberg-damped least-squares Newton, dragging one control point by 0.03 of the chord:

```
    (a)    80 iterations,  2ms   → ⟨C,C⟩ = 1.1e-14, the doubled pole splits into
                                    8 genuine poles, every one SOFT (isotropy 5e-11)
    (b)   900 iterations, 295ms  → never reaches ⟨C,C⟩ = 1e-9
```

**This is the predicted consequence of §5, not independent evidence of a puzzle.** Newton loses
quadratic convergence at a singular point of the constraint variety and Levenberg damping does not
restore it; 900 iterations short of 1e-9 is the textbook signature of exactly the rank deficiency
measured above. No solver setting fixes a singular point — the fix is to not be at one, which is
why §9's payoff is a characterisation rather than a detector. An earlier draft of this section said
(b) "cannot be made to" behave, which invites someone to go tuning.

## 7. The questions

1. **Derive δ rather than fit it.** The recommendation from the companion, and it is the right one:
   identify the dependent rows at (b) and match them to leading-coefficient identities that have
   gone degenerate, as §2 does for the universal one. Three dependent rows should be three nameable
   relations, and that gives δ at every degree instead of a curve through three points, one of
   which is unresolved.

2. **Which component does the balanced lift lie on?** Smoothness is settled — rank equal to the
   independently measured generic rank gives it. What is not settled is whether (a) sits on a
   component of the expected dimension or on a smaller one that happens to share the rank.

3. **Is the singular locus characterised by the C-component profile?** The data is consistent with
   δ growing as W's true degree falls below n, and rules out pole reality and provenance. It does
   not settle whether δ is a function of (deg W) alone, of (n − deg W), or of the pair with deg q.
   h's degree is NOT part of it — §2 explains why deg h ≤ n − 2 always.

4. **Can the middle row be resolved?** It needs a source with deg w = 2 that is EXACT rather than
   solved to 9e-12 — an algebraic construction, the way the λ-chart quartic is exact. That single
   specimen would turn δ(W4) from "0 or 1" into a number.

5. **Does the parity theorem have a degree-profile analogue?** The proved statement is: n odd ⟹
   every member factors, because ‖q‖² is a sum of real squares so its real roots have even
   multiplicity, and ‖q‖² = 2·W·c∞ then makes (t−r) ∣ c∞ exactly when mult_r(W) is odd. That
   argument is about parity; the question here is about the *profile* (deg W, deg q, deg c∞), which
   the same identity constrains — deg‖q‖² = deg W + deg c∞ — but not obviously to the point of
   predicting a rank.

## 8. What exists to build on

- `docs/POLE_ALGEBRA.md` §7 and §8 — the softness identity and the parity theorem, each step one
  line, with the standing squarefree hypothesis stated in §1.
- In the Lean ledger: `deg_parity` (`C.deg % 2 = C.w.natDegree % 2`), and
  `even_rootMultiplicity_sumSq`, which is **open** and is the multiplicity lemma §8 rests on.
- `core/conformalPHCurve.definingJacobian` — the analytic 4n × (5(n+1)+n) Jacobian, if the
  companion wants the same numbers.

## 9. THE FORMULA — confirmed for a ≠ b, and it fails at a = b

The Lean companion derived, from the leading-coefficient relations rather than by fitting:

```
    δ  =  (n − 2) − deg h        equivalently, for a source x = q/w with a = deg w, b = deg q,
    δ  =  max(0, |b − a| − 1)
```

Tested against sources built to order — w frozen at a chosen polynomial, q solved at a chosen
degree, so (a, b) is set rather than found. Every lift verified to be ON the variety first.

```
    (a,b)    n     deg h   predicted δ   MEASURED   gap      note
    (2,4)    8       5          1            1     2e6      resolves the row this doc called unresolved
    (1,4)    8       4          2            2     5e10
    (3,4)    8       6          0            0     4e8      SHARP: imbalanced yet δ = 0
    (4,2)    8       5          1            1     2e8      SHARP: δ is symmetric in (a,b)
    (1,6)   12       6          4            4     2e10     SHARP: far from the fitted points
    (4,4)    8       6          0            2     5e10     ✗
```

**Five of six, including all three tests designed to break it.** In particular (3,4) kills the
"graded in imbalance" reading this document previously offered: |b − a| = 1 is imbalanced and δ = 0.

### Where it fails, and it is exactly the case the derivation treats separately

At a = b the leading terms of q′w and qw′ cancel, which is why deg N drops to 2a − 2 and the
balanced case is special. There the derivation's step "when the h-part is dead, the A-part is
already in the span of the NULL rows" does not apply, because it relies on the top A_p being pure
∞-multiples — true when W and q fall short of degree n, false when they do not.

Empirically δ is **not constant** on a = b. Five (4,4) sources, every one with deg h = 6 = n − 2,
every lift on the variety:

```
    w                              lift residual   δ    gap     tail
    0.5t⁴−2t³+5t²−4t+1               2.3e-15       2    5e10    2e-5 8e-6 2e-16 5e-17 5e-18
    (t−1.7)(t−2.3)(t²−3t+2.5)        2.0e-17       0    1e10    1e-6 5e-7 2e-7 4e-8 4e-18
    (t²−3t+2.5)(t²−5t+7)             7.3e-13       0    6e4     mushy
    (t−2)(t−3)(t−4)(t−5)             1.4e-18       2    4e2     mushy
    t⁴+1                             8.8e-15       0    1e4     mushy
```

The two with a CLEAN gap — 5e10 and 1e10 — disagree: δ = 2 and δ = 0. The δ = 2 specimen was
checked for every degeneracy that would explain it away and has none: w has four distinct roots,
q is coprime to w (|q| = 9.6e-3 at the nearest root), the hodograph has rank 3, and the lift sits on
the variety at 2.3e-15.

**So δ is a function of (a, b) when a ≠ b, and is not a function of anything yet identified when
a = b.** The three mushy rows cannot arbitrate — their sources will not refine further — so the
open question is now narrow and specific rather than general.

## 10. THE UNIFIED FORMULA — two sources of degeneracy, and they ADD

The a = b failure had a mechanism, and I had checked the wrong quantity to rule it out.

```
    δ  =  max(0, |deg q − deg w| − 1)  +  deg gcd(w, ‖q‖²)
          └──── degree shortfall ────┘    └── over-doubling ──┘
```

### Why the second term exists

If a pole r is soft then ⟨q(r),q(r)⟩ = 0, so (t−r) divides ‖q‖² = c∞. It already divides w, hence
2wq, and (t−r)² divides 2w². **All three components share the factor** — the doubled lift is
over-doubled there. And the term is always EVEN: w and ‖q‖² are real, so their gcd is real, and a
real common root would force q(r) = 0 by three real squares, which primitivity excludes. Only
conjugate pairs survive, which is why the measurements read 0 and 2 and never 1.

### Measured, ten specimens

```
    (a,b)   poles                shortfall + over-doubling = δ   MEASURED   gap
    (2,4)   hard                     1     +     0        = 1        1      2e6    ✓
    (1,4)   hard                     2     +     0        = 2        2      5e10   ✓
    (3,4)   hard                     0     +     0        = 0        0      4e8    ✓
    (4,2)   hard                     1     +     0        = 1        1      2e8    ✓
    (1,6)   hard                     4     +     0        = 4        4      2e10   ✓
    (4,4)   ONE SOFT PAIR            0     +     2        = 2        2      5e10   ✓
    (4,4)   hard  ×3                 0     +     0        = 0        0      1e10   ✓ (one at 4e2 reads 2)
```

Nine of ten. The single miss is `(t−2)(t−3)(t−4)(t−5)`, whose gap is 4e2 — the least trustworthy
reading in the set, flagged as mushy before the formula existed.

### THE TRAP, and it is the fifth occurrence in this project

This document previously ruled the mechanism out with "q coprime to w, |q| = 9.6e-3 at the nearest
root". That is the HERMITIAN norm Σ|qᵢ|², which tests q(r) = 0. **Softness is the BILINEAR form
Σqᵢ², no conjugation**, and at a complex root the two are entirely different numbers. Measured on
that very specimen:

```
    isotropies at the four roots of w:   1e+0   2e-15   2e-15   1e+0
```

One conjugate pair soft to machine zero, while |q| sat at 9.6e-3 — comfortably nonzero, and blind.

### The practical consequence: lift MINIMALLY

With s = w / gcd(w, ‖q‖²), lift as **(2ws, 2qs, ‖q‖²·s/w)** and h = 2ρs/w. Nullity checks:
‖2qs‖² = 4s²‖q‖² = 2·(2ws)·(‖q‖²s/w). The factors of two are load-bearing — dropping them gives a
residual of 7e-2 rather than 2e-14.

Measured on the δ = 2 specimen:

```
    UNIFORM  (2w², 2wq, ‖q‖²)         n = 8   rank 29 of 32   δ = 2   gap 5e10
    MINIMAL  (2ws, 2qs, ‖q‖²s/w)      n = 6   rank 23 of 24   δ = 0   gap 4e11
```

s = w for an all-hard source (full doubling), s = 1 for all-soft (none), in between for mixed. So
the answer to §9 is not only "avoid imbalanced sources":

```
    1.  keep |deg q − deg w| ≤ 1        kills the shortfall term
    2.  lift MINIMALLY, not uniformly   kills the over-doubling term
```

and then δ = 0 by construction, with no detection needed.

## 11. THE SHORTFALL IS INTRINSIC — reparametrisation does not cure it

The obvious hope, and it fails. `|deg q − deg w|` is a statement about a CHART: a degree-D form
whose true degree is a has a root of multiplicity D − a at ∞. So a Möbius reparametrisation that
moves ∞ to a finite parameter should balance the degrees and kill the shortfall term.

It balances them. It does not kill δ.

```
    λ-chart quartic          deg w   deg q   δ     gap
    as given                   1       4     2     5e9
    reparam (1, 0, 0.4, 1)     4       4     2     7e7
    reparam (1, 0.3, 0.25, 1)  4       4     2     2e8
    reparam (2, −1, 0.5, 1)    4       4     2     6e10
```

Three reparametrisations, all landing at a balanced (4,4) where the formula predicts δ = 0, all
measuring δ = 2 with clean gaps. **What moved was the location of the multiplicity, not its
existence**: w = (t − 1.7)·s³ as a degree-4 form has a simple root and a TRIPLE root at ∞, and
after reparametrising the triple root sits at a finite parameter instead.

So the formula's first term is a chart-dependent proxy. The invariant statement is presumably about
the multiplicity structure of w over ℙ¹ — consistent with every measurement so far:

```
    (a,b)   mult at ∞   shortfall   measured
    (3,4)       1           0           0
    (2,4)       2           1           1
    (1,4)       3           2           2
    (4,2)       2 (in q)    1           1
    (1,6)       5           4           4
```

each one reading (multiplicity − 1). And a multiple pole is intrinsic to the curve, so **it cannot
be represented away.**

### Which is what makes the optimizer question real

The over-doubling term is now avoidable by construction — lift minimally (§10). The shortfall term
is NOT: a curve with a pole of multiplicity m ≥ 2 lands on a singular point of the variety no
matter how it is written or parametrised. An editor that must accept such curves needs a solver
that works AT a singular point, not one that avoids them.

## 12. THE THREE TERMS, SETTLED — two are artifacts, one is intrinsic

Run in dependency order at the Lean companion's suggestion, and it resolves most of the document.

### The invariant form of δ, confirmed

```
    δ  =  Σ_{p ∈ ℙ¹} ( m_p − 1 )        m_p = multiplicity of p as a pole of the SOURCE
```

`max(0, |deg q − deg w| − 1)` is that sum evaluated in a chart where all the excess sits at ∞: a
degree-d form whose true degree is a carries a factor s^{d−a}, so ∞ is a pole of multiplicity
d − a. Symmetry in (a, b) is forced rather than measured — O(4,1) acts linearly on C so it cannot
change the Jacobian's rank, and inversion exchanges a pole at ∞ with a zero there.

**The prediction, tested:** a source with a FINITE double pole and balanced degrees should read
δ = 1, since Σ(m_p − 1) = (2−1) + (1−1).

```
    w = (t−1.5)²(t−3),  deg w 3,  deg q 3   →   lift n = 6,  rank 22 of 24,  δ = 1
                                                gap 6e3,  residual 5e-16
```

Confirmed. The chart-dependent form is retired.

### The shortfall is an artifact of solving in the ELEVATED space

A member with profile W 2, q 5, c∞ 8 is degree 8 only formally. In its true degrees the system is
smaller: NULL has 11 coefficients rather than 17, PH has 9 rather than 15 — **twelve of the
equations imposed at uniform degree are vacuous**, and the dependent rows are among them.

Rebuilt in the true profile, 20 equations in 35 unknowns:

```
    1e+0 8e-1 7e-1 7e-1 7e-1 6e-1 6e-1 5e-1 4e-1 3e-1
    3e-1 2e-1 2e-1 1e-1 1e-1 9e-2 4e-2 3e-2 3e-3 5e-4
```

**Full rank, 20 of 20, smallest singular value 4.9e-4 — no zeros, not even the universal one.**
Against rank 29 of 32 with δ = 2 for the same curve at uniform degree 8.

> So: don't deflate, and don't inflate. Solve in the true degree profile and the shortfall
> singularity is not there to work at. Elevate for DISPLAY if a uniform degree is wanted, but never
> to solve.

### A methodological note that cost a wrong reading here

The "rank = position of the largest consecutive gap" heuristic is only valid when a cliff EXISTS.
On the true-degree spectrum above it returns 18, by picking the biggest ratio in a smooth decay
where every value is O(1e-4) or larger. Read the gap AND the absolute floor, or the heuristic
invents a deficiency.

### Where that leaves the three terms

```
    over-doubling      artifact   →  lift MINIMALLY (§10)                    fixed
    degree shortfall   artifact   →  solve in TRUE degrees (above)           fixed
    multiplicity       INTRINSIC  →  survives PGL(2,ℝ) and O(4,1) alike      open
```

Only a genuinely multiple pole is left, and it is a degenerate curve rather than a shape a user
drags into by accident. Whether an editor ever has to HOLD one is now the question that decides
whether a singular-point solver is a requirement or an unused capability.

## 13. WHY A MULTIPLE POLE COSTS RANK — the mechanism, and the wrong one it replaces

**The wrong version, which shipped and was refuted in a minute.** "ρ(r) = 0 at a double pole, so the
PH relation reads 0 = 0 there, so it constrains nothing, so rank is lost." A SOFT SIMPLE POLE
refutes it: softness IS ⟨N(r),N(r)⟩ = 0, hence ρ(r) = 0, and a soft simple pole costs no rank once
the lift is minimal.

```
    soft simple pole    ρ(r) = 0    N(r) ≠ 0 (isotropic)    δ contribution 0
    DOUBLE pole         ρ(r) = 0    N(r) = 0                δ contribution 1
```

Measured on the mixed cubic: at its soft poles |ρ| = 3.9e-11 while |N| = 9.7e-1. **ρ(r) = 0 is not
the discriminator; N(r) = 0 is** — the vector, not its square. Fifth appearance of the same family
of error, a squared quantity standing in for a vector one.

**The mechanism that works**, and it names the dependent row:

```
    1.  double pole:   w(r) = 0 AND w′(r) = 0
    2.  N = q′w − qw′, so N(r) = 0 for EVERY q          — forced, not incidental
    3.  in the lift, C(r) AND C′(r) are both pure ∞     — the separating step
    4.  ∞ is null, so ⟨C′(r),C′(r)⟩ = 0 is FORCED BY NULL rather than imposed
    5.  PH says ⟨C′,C′⟩ = h², so h(r) = 0 is forced
    6.  that PH coefficient relation is implied by NULL — a dependent row
```

Step 3 is what a soft simple pole cannot do: there w′(r) ≠ 0, so C′(r) keeps its q-component.
Measured at the same parameter of two cubics differing only in a repeated root:

```
    (t−1.5)(t−3)(t−4.5)   C(r) pure ∞ (1e-15)   C′(r) NOT (5.6e-1)     ⟨C′,C′⟩ = 3.5e-1
    (t−1.5)²(t−3)         C(r) pure ∞ (8e-16)   C′(r) PURE ∞ (4e-16)   ⟨C′,C′⟩ = 2.3e-14
```

And unlike "the relation constrains nothing", this hands over the deflation: **h(r) = 0**, linear,
with r already known as a root of w.

### Two overstatements corrected with it

- **"the speed reads 0/0"** — the limit exists. ρ vanishes to order 1 and w² to order 4, so ‖x′‖ has
  a pole of order THREE. Measured: ‖x′‖·ε³ = 6.532, 6.467, 6.460 at ε = 1e-2, 1e-3, 1e-4. What is
  undefined at a multiple pole is SOFTNESS, not the speed.
- **"damping cannot rescue it"** — Levenberg does regularise a zero singular value, to λ. What it
  cannot restore is QUADRATIC convergence, so the behaviour to expect is "converges linearly, to
  reduced accuracy", not "fails".

### The measurement this calls for, NOT YET RUN

Iteration counts depend on step size, tolerance and damping schedule, which is why the drag
comparison attempted here stalled on both specimens and was retracted. The decisive quantity is the
CONVERGENCE RATE:

```
    quadratic   1e-3 → 1e-6 → 1e-12     δ = 0
    linear      1e-3 → 3e-4 → 1e-4      δ ≥ 1
```

immune to tolerances, a handful of iterations rather than nine hundred, and a direct readout of the
singularity rather than a proxy. It needs a control verified at δ = 0 first — properly hard simple
poles at isotropy O(1), not the 1e-4 one that spoiled the previous attempt.

### A habit worth keeping visible

Twice this week a claim held back prevented a wrong one from shipping: recording δ(W4) as
"unresolved" rather than rounding it to 0 saved the closed formula from looking refuted, and
retracting the drag comparison with its reason stated (a 1e-4 control) stopped a confounded result
becoming a cited one. Both are in the record because the alternative is a document that reads
cleaner than the work was.

## 14. THE DEPENDENT ROW IN THE PROJECTIVE MODEL — two lines instead of six

§13's mechanism needs the lift. The same conclusion follows in the projective model directly, and
the step that costs a paragraph there is an evaluation here.

The residual is `F = ‖N‖² − ρ²`, held coefficient by coefficient in the Bernstein basis. **Evaluate
it at a root r of w** — that is, take the row combination `Σ_m B_m(r)·J[m,:]`:

```
    ∂F(r)/∂(P, w)  =  2·N(r)·∂N(r)          ∂F(r)/∂ρ  =  −2·ρ(r)·B(r)
```

At a **double** root `N(r) = 0` for every q, and `ρ(r)² = ‖N(r)‖² = 0`, so BOTH terms vanish: that
row combination is identically zero — a dependent row, named, with no conformal model in it. At a
simple pole `N(r) = −q(r)w′(r) ≠ 0` and it does not vanish.

**And the soft pole is the case that decides the discriminator**, for the third time. At a soft pole
`ρ(r) = 0`, so the second term vanishes there too — a ρ-based reading would call it dependent. It is
not, because `N(r) ≠ 0`. Measured on the mixed cubic, at both members of its soft conjugate pair:

```
                            isotropy    |N(r)|    Σ B_m(r)·J[m,:]
    DOUBLE root at 1.5      —           1.4e-15   7.5e-11   DEPENDENT
    simple root at 1.5      1.0         4.8e-1    4.0e-2    independent
    SOFT pole 0.220±0.787i  5.0e-12     1.3e+0    5.8e-2    independent
```

Pinned in `singularDirectionScaling.test.ts`.

## 15. RANK BY PERTURBATION, ITS FLOOR, AND THE RATE TEST THAT OVERRULED IT

Every δ in this document was read by counting singular values below a floor, and a settled state is
never exactly on the variety, so each of those readings was a guess about what the accuracy floor
hides. Two better instruments, and they disagreed — which is how the wrong one was found.

### The perturbation test, and its four signatures

Push the member off the variety by t along a fixed direction and watch which singular values move.
For a left-null vector u of J₀, `σ_min(J₀ + tJ₁) ≈ |uᵀJ₁v|·t`, so:

```
    σ FLAT, nonzero      ill-conditioning — NOT a deficiency
    σ ∝ t                zero ON the variety only — this is what δ counts
    σ ∝ t²               uᵀJ₁ = 0 too: zero on the variety AND to first order off it
    σ FLAT at ~1e-16     zero IDENTICALLY, at every point of the ambient space
```

The fourth row is measured, not assumed: at a state **nowhere near** the variety (residual 1.4e+2)
this Jacobian's spectrum bottoms out at 3.6e-4 with no zero at all. So the redundancy this document
has been calling "structural" is **not identical** — it reads ∝ t² (2.0e-15 at t = 1e-7 → 1.4e-13
at t = 1e-6), which is the third row, not the fourth. An earlier version of §15 had three rows and
put "structural" on the t² one; the Lean companion caught it in one line — identical means it
cannot grow at *any* order.

**And the test has a floor.** A settled state is itself an offset ε from the exact variety point,
and along the degenerate direction the residual grows quadratically, so ε ≈ √(residual/c). A true
zero then reads ≈ ε and stays flat for every t < ε — indistinguishable from a genuine small
singular value. On the all-hard cubic lift, residual 2.4e-12 with residual ≈ 7.6e5·t² gives
**ε ≈ 1.8e-9, the same order as the 4e-8 and 7e-9 it was being used to judge.** The instrument is
sound; it was applied below its own resolution.

### The rate test, unblocked

It was reported blocked because the damped step went through the normal equations, which carry κ².
The fix is Moré's augmented form, `min ‖[J ; √λ·I]·δ − [r ; 0]‖`, solved by QR — κ, not κ². With
that one change the measurement runs, and it separates the specimens cleanly:

```
    soft6      native, degree 6    κ 7.4e3     1e-4 → 2.0e-9  → 3.5e-15     QUADRATIC
    soft4      native, degree 4    κ 3.2e3     1e-4 → 1.2e-7  → 1.0e-12     QUADRATIC
    mixedMin   minimal lift        κ 2.8e2     1e-4 → 2.4e-10 → 1.0e-15     QUADRATIC
    ALL-HARD cubic LIFT            κ 1.4e8     step ratio 0.501             LINEAR at ½
    DOUBLE-pole LIFT               κ 4.7e12    step ratio 0.470             LINEAR at ½
```

Quadratic convergence exists in this system — three members show it — so the linear tail belongs to
the specimen and not to the solver. And 0.501 across two and a half decades is Reddien's ½, not a
stagnation.

### What that retracts

**The all-hard cubic lift is not δ = 0.** One commit ago this document read it as a smooth point
with two genuinely small singular values; the rate says those two are ZEROS. So the **uniform lift
of an all-hard curve is a singular point of the variety**, and the reason is now the interesting
question: it is not over-doubling (gcd(w, ‖q‖²) = 1 here, nothing to divide out), not degree
shortfall (deg w = deg q = 3, the lift is 6/6/6), and not a multiple pole of the curve (all three
poles are simple). **`δ = Σ(m_p − 1)` predicts 0 for this member and does not survive it.**

What δ is there — 2 by counting the two zeros, 3 if it is one per hard pole — is left OPEN, because
counting singular values is exactly the reading that just failed. The one structural fact available:
in the conformal model a simple root of W forces the pole soft (null forces the numerator
isotropic), so **hardness requires a repeated root of W** — every hard-pole member is carried on the
discriminant locus of its own denominator. Whether that locus is the singular locus is the question
§16 should now be asking.

## 16. TARGETED DEFLATION — helps, is not enough, and must never be left on

A singular point costs Newton its quadratic convergence, and the generic repair
(Leykin–Verschelde–Zhao) finds the null direction by doubling the unknowns. We can skip that,
because §13 NAMES the degeneracy. At a pole of multiplicity e the speed numerator vanishes to order
e − 2:

```
    h(r) = h′(r) = … = h^(e−2)(r) = 0        e − 1 LINEAR conditions, r already known
```

Checked before use: on the double-pole lift |h(1.5)| reads 7.2e-10 relative, against 2.8e+0 for the
all-hard control at the same parameter.

```
    from a starting residual of 1e-4              residual ratio   step ratio
    double-pole lift, no deflation                    0.404          0.491     linear at ½
    double-pole lift, + h(1.5) = 0                    0.214          0.425     STILL linear
    double-pole lift, + h AND h′ (one too many)       0.544          1.230     worse than none
    all-hard control, + h(1.5) = 0     stalls at 7.6e-5              0.851     DESTROYED
```

**It helps** — the first step improves fourfold and the sequence sits a decade lower. **It does not
restore quadratic convergence** — the step ratio stays at ½. **And it destroys a specimen that was
not degenerate**: at the control t = 1.5 is a simple pole with h(1.5) ≠ 0, so the extra equation is
inconsistent and the solve stops moving. Deflation restricts the solve to the sublocus {W has a
repeated root at r} — correct exactly while the degeneracy is intended, wrong the moment the drag
should leave it. Anything built on it has to switch it with the degeneracy rather than carry it.

### Why one condition is not enough, and it is not the count

The double-pole lift has MORE THAN ONE degeneracy. The all-hard cubic lift — every pole simple, no
multiple pole anywhere — is itself linear at ½ (§15). Deflating the multiplicity removes the source
we can name and leaves the one we cannot, so **§17's question is now in the path of the solver
work**: you cannot deflate a degeneracy you have not identified.

## 17. TWO NULL RESULTS worth keeping

**The weights do not see it.** The obvious check on a rational curve that drags badly is its
weights, and on the λ-chart lift every weight-based measure says it is the EASIEST specimen in the
lab:

```
    preset      weight max/min   Farin beads     min denominator   iterations needed
    soft4            8.7             —                9.9e-1              80
    mixedUni         3.5             —                6.3e-1              80
    lift8g           3.7        0.56 … 0.43           4.3e-1              80
    lift8            5.9        0.46 … 0.42           9.8e-1             300
```

Middling weight ratio, Farin beads at 0.42–0.46 (nearly polynomial), and the denominator that stays
furthest from zero. Three plausible predictors, all blind. The one column that separates it is the
DEGREE PROFILE: W of true degree 2 inside a degree-8 basis, deg q − deg W = 3, hence a pole of
multiplicity 3 at ∞.

**"A badly curved neighbourhood" was wrong — and so was what replaced it.** §15 suggested the
λ-chart lift stays hard for several drag steps because it remains near the singular point. Applying
the rate test AT each drag step refuted the shape of that:

```
    lift8g   every step 0–6      1e-4 → 1e-10 → 1e-15        QUADRATIC throughout
    lift8    steps 0–3           1e-4 → 6e-5 → 6e-5 …        stalls, ratio 0.94–0.98
    lift8    steps 4–6           ratio 0.61–0.68             improving
```

The first reading of that was "a failure more severe than a singular point". **It is not**, and the
Lean companion was right to hold the phrase out of this document until it was checked. Two
measurements retire it:

- **The cokernel is empty.** Split the first residual by the SVD into the part inside range(J) and
  the part outside: the outside fraction is **0.0 at every specimen measured**. Nothing is
  unreachable, so "the step provably cannot reduce it" is false.
- **It is the BASIN, not the geometry.** From a 1e-6 start, lift8 goes 1e-6 → 1.7e-11 in one step.
  And `soft6` — the smoothest member in the lab — stalls just as badly from a 1e-2 start (ratio
  0.982). A perturbation of 1e-4 is simply outside the quadratic basin for the awkward specimen.

So a stall at ratio ≈ 1 means the test started too far out, and nothing about the curve. The rate
test is only meaningful started INSIDE the basin, which for these members is 1e-6 or closer.

## 18. THE DOUBLING EXPERIMENT IS CONFOUNDED, and unavoidably so

Sorted by representation rather than by pole type, the evidence looked decisive — every doubled
lift singular, nothing native or minimal singular — and the controlled test is obvious: take
`soft6`, which is quadratic natively, and lift it doubled. Same curve, same poles, same degrees,
only the representation changes. Run at two starting scales, with the residual sequence going five
decades below the conditioning floor so it cannot be ill-conditioning:

```
    soft6 native      from 1e-4   1e-4 → 2.0e-9  → 3.5e-15               QUADRATIC
                      from 1e-6   1e-6 → 1.9e-13 → 1.9e-16               QUADRATIC
    soft6 DOUBLED     from 1e-4   1e-4 → 1.4e-8  → 3.8e-9 → 9.4e-10 …    step ratio 0.487
                      from 1e-6   1e-6 → 1.4e-12 → 3.8e-13 → … → 7.1e-15 step ratio 0.511
```

Scale-invariant ½, running to 7e-15 against a conditioning floor near 1e-10. Genuinely singular.

**But it does not isolate doubling.** `soft6` is ALL SOFT, so at every pole (t−r) already divides
‖q‖²; doubling it is exactly the **over-doubling** of §10, with gcd(W, ‖q‖²) = W₀ of full degree.
The experiment re-measures the degeneracy the minimal lift was invented to remove.

**And the confound cannot be removed by choosing a better specimen.** In this model a simple root
of W forces the pole soft, so a hard-pole curve has NO undoubled conformal representation at all.
"Same curve, doubled versus not" is available exactly where doubling *is* over-doubling. The
controlled comparison does not exist.

### What the uncontaminated version says, which is: not yet

Restricting to all-hard sources with gcd(W, ‖q‖²) = 1 — where doubling is not over-doubling — and
lifting uniformly, started inside the basin at 1e-6:

```
    source degree   poles   real   lift degree    κ       step ratio
    2               2       0      4              6e8       0.579     linear ½
    2               2       2      4              8e7       0.213     quadratic-ish
    3               3       1      6              1e8       0.488     linear ½
    3               3       1      6              4e8       0.377     linear ½
    4               4       0      8              4e7       0.283     quadratic-ish
    5               5       1      10             1e8       0.549     linear ½
    6               6       0      12             1e8       0.510     linear ½
```

No pattern in the number of real poles, none in the parity of the degree, and κ is 1e7–1e8
throughout, so conditioning does not sort them either. Some all-hard lifts are singular and some are
not, and **what separates them is unresolved.** Recorded as unresolved rather than fitted.

## 19. THE EXACT RANK — δ as an integer, with no floor anywhere

Every δ above was fought at a resolution limit: counted below a threshold, read at √residual, or
classified from a convergence ratio that turned out to be a transient. `core/exactRank` removes the
floor rather than arguing about it. A rational PH space curve is CONSTRUCTIBLE over ℚ end to end —
F17's no-log condition `𝒜′(rₖ) = 𝒜(rₖ)(Σₖ + λₖ i)` is linear in the spinor, so with rational roots
and twists the spinor is rational; `N = 𝒜i𝒜̄` and `σ = |𝒜|²` are then rational and **PH holds by
substitution rather than by solving**; the lift and every Jacobian entry (binomial ratios times
rational coefficients) stay rational. The rank comes back as an integer.

The specimens are members *symbolically*: the PH defect `‖N‖² − ρ²` and all sixteen defining
residual coefficients are **identically zero**, not small. And the exact Jacobian agrees with the
production one entry by entry to 5.9e-17, so the two instruments validate each other.

```
    deg w   deg q   lift degree N   EXACT rank   4N − 1 − rank
      1       2           4             13            2
      2       2           4             13            2        ← balanced
      2       3           6             19            4
      1       4           8             25            6
      3       4           8             25            6
      2       5          10             31            8
      4       5          10             31            8

    rank = 3N + 1 EXACTLY  ⟹  δ = N − 2
```

48 specimens, 7 distinct degree profiles, every one on the nose. **Independent of the balance, of
the degree profile, of the number of roots, and of the twist rates** — not a formula in
(deg w, deg q) at all, but a formula in the lift degree alone. The search for `δ(deg w, deg q)` in
§12 was looking for the wrong kind of object.

### It is a statement about the LIFTS, not about the variety

The native all-soft members sit at the generic rank: `soft6` reads 23 of 24 at degree 6 where this
law would say 19, `soft4` reads 15 of 16 where it would say 13. So `δ = N − 2` does not describe the
conformal PH variety — it describes where the LIFTS sit in it. Every specimen here has real rational
roots, hence real poles, hence HARD ones, and **the deficiency of a hard lift grows linearly with
its degree.** That is much stronger than "hard lifts are awkward": at degree 10 it is eight
directions short.

### The confound, stated

Rational roots are real roots, so every specimen this construction reaches has only real — hence
hard — poles. Whether `δ = N − 2` survives a conjugate pair needs the same construction over ℚ(i).
Until that is run, the law is established for real-pole lifts and untested for complex ones.

### What δ = N − 2 MEANS — measured, not interpreted

The residual is QUADRATIC in the unknowns, so for a kernel direction v,

```
    F(x + v)  =  F(x) + J·v + ½D²F(v,v)  =  ½D²F(v,v)        exactly, no differencing
```

A kernel direction is genuinely tangent when that second-order term can be absorbed — when it lies
in the image of J. What cannot be absorbed is an **obstruction**: a direction the linearisation
calls free and the next order blocks. Computed exactly over ℚ:

```
    lift degree 4    kernel 16 directions (generic 14)   second order restores 13 → 15 = 4N−1
                     OBSTRUCTED 2   =  δ
    lift degree 8    kernel 28 directions (generic 22)   second order restores 25 → 31 = 4N−1
                     OBSTRUCTED 6   =  δ
```

So the sentence is: **the solver is offered N − 2 directions of freedom that do not exist.** The
linearisation sees 3N + 4 ways to move; the true local dimension is the generic 2N + 6; second
order takes back exactly the difference and restores the rank to 4N − 1 on the nose. That is the
cone tip as arithmetic — at the apex every direction looks tangent, and the surface is not there.

It also explains the drag behaviour without appealing to anything else. A Newton step picks a
direction that may include phantom components, moves, discovers at second order that the constraint
did not hold, and corrects — halving each time. The step ratio ½ measured all through §15–§18 is
that loop.

### The same number, read on the poles

`W = 2w²` is a perfect square, so on ℙ¹ it has exactly `N/2` double roots, counting multiplicity and
counting ∞. Then

```
    δ  =  N − 2  =  2·(N/2 − 1)  =  2·(number of doubled poles − 1)
```

**Two directions per doubled pole, with one doubling free.** And the doubling is not a choice: a
simple root of W forces the pole soft (§7), so a HARD pole requires `W′(r) = 0`. Hardness buys the
doubling, the doubling costs two directions, and there is no way to write it in this model that
avoids the bill. (The `− 2` is not explained here; it is what the arithmetic says.)

### What it retires

- **"Some all-hard lifts are singular and some are not, no pattern" (§18).** That split came from
  classifying floating-point rate sequences, most of which reached the machine floor within two
  steps and could not be classified at all. Every exact specimen is singular, by a wide margin.
- **The idea that the deficiency is small.** δ = 1 or 2 was the working assumption behind targeted
  deflation (§16). At degree 8 it is 6, which is why one deflation condition moved the rate a little
  and left it linear — and deflating a hard lift properly would need N − 2 conditions, eight of them
  at degree 10. At that point the lift is simply the wrong place to work: in the PROJECTIVE model
  hard poles are generic and the same curve is a smooth point (§14).

## 20. What would be most useful


§15 changed the question, §16 made it urgent, and §18 says the obvious experiment cannot settle it.
The formula being sought was `4n − 1 − δ(deg w, deg q)`, and the all-hard
cubic lift refutes it: balanced degrees, coprime gcd, simple poles, and still singular. The sharper
question is now

> In the conformal model a simple root of W forces the pole SOFT, so every HARD pole needs a
> repeated root of W. **Is the locus {W has a repeated root} the singular locus of the PH conformal
> variety?**

If yes, the Möbius model can only carry a hard pole at a singular point, which explains the whole
history of awkward drags in this document without appealing to degree at all — and it means an
editor working in this model meets the singular locus whenever the curve is hard, not rarely.

If no, then what distinguishes the all-hard lift (linear at ½) from `mixedMin` and the native
members (quadratic) is something else, and naming it is the open problem. §18 narrows where to
look: among all-hard lifts with gcd = 1, some are singular and some are not, and neither the count
of real poles, the parity of the degree, nor the conditioning sorts them.

**And one methodological rule earned twice.** The rate test is only meaningful started INSIDE the
quadratic basin — 1e-6 or closer for these members. Started at 1e-4 the awkward lift stalls at
ratio 0.94, and so does the smoothest member in the lab when started at 1e-2. A stall at ratio ≈ 1
is a statement about the perturbation, not about the curve, and the cokernel projection (0.0
everywhere) is how to tell the two apart.

The count is a separate question from the mechanism, and after §15 it should stay separate: the
rate test reads WHETHER a point is singular, not by how much.

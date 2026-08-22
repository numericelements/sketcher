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

## 9. What would be most useful

A statement of the form

```
    rank of the defining Jacobian at a lifted member  =  4n − 1 − δ(deg w, deg q)
```

with δ identified, or a proof that no such formula exists because the rank depends on more than the
degree profile. Either settles whether the awkward specimen is a curiosity or a whole stratum, and
that decides whether an editor working in this model has to detect and avoid it.

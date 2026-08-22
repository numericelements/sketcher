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

## 2. The generic rank is 4n − 1 — measured

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

## 3. The lift, and why a hard pole needs it

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

## 4. The observation

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

### What this refutes

**Non-reduced does NOT imply singular.** (a) is non-reduced and smooth. The doubling of the poles
and the cancelling of the numerator are not what costs rank; the DEGREE IMBALANCE is.

**And it is not a coefficient count.** Against a balanced degree-8 member, (b) is short by 6 in W,
by 3 in each of q₁,q₂,q₃, and by 3 in h — eighteen coefficients that are structurally zero — and
loses only 2 of rank. No naive count reproduces 2.

## 5. The numerical consequence, which is why it was noticed

Levenberg-damped least-squares Newton, dragging one control point by 0.03 of the chord:

```
    (a)    80 iterations,  2ms   → ⟨C,C⟩ = 1.1e-14, the doubled pole splits into
                                    8 genuine poles, every one SOFT (isotropy 5e-11)
    (b)   900 iterations, 295ms  → never reaches ⟨C,C⟩ = 1e-9
```

Both should behave the same way mathematically — the doubled pole splits and softness is forced by
NULL — and (a) does. (b) cannot be made to.

## 6. The questions

1. **Is the rank deficiency at a lifted point a function of the source's degree profile
   (deg w, deg q)?** Two data points: (4,4) → 0, (1,4) → 2. Two more would settle whether it is a
   function of (deg q − deg w) or of something else.

2. **Is the balanced lift genuinely a smooth point of the variety**, or does it merely have full
   rank in the defining Jacobian while the variety is singular there for another reason? The
   Jacobian's rank bounds the tangent space; it does not by itself certify smoothness.

3. **Is there a characterisation of the singular locus?** The candidate suggested by the data is
   "the members whose C-components do not all attain the full degree n" — note h's degree does NOT
   matter, since the n = 4 and n = 6 soft members have h of degree 2 and 4 rather than 3 and 5 and
   are at generic rank.

4. **Does the parity theorem have a degree-profile analogue?** The proved statement is: n odd ⟹
   every member factors, because ‖q‖² is a sum of real squares so its real roots have even
   multiplicity, and ‖q‖² = 2·W·c∞ then makes (t−r) ∣ c∞ exactly when mult_r(W) is odd. That
   argument is about parity; the question here is about the *profile* (deg W, deg q, deg c∞), which
   the same identity constrains — deg‖q‖² = deg W + deg c∞ — but not obviously to the point of
   predicting a rank.

## 7. What exists to build on

- `docs/POLE_ALGEBRA.md` §7 and §8 — the softness identity and the parity theorem, each step one
  line, with the standing squarefree hypothesis stated in §1.
- In the Lean ledger: `deg_parity` (`C.deg % 2 = C.w.natDegree % 2`), and
  `even_rootMultiplicity_sumSq`, which is **open** and is the multiplicity lemma §8 rests on.
- `core/conformalPHCurve.definingJacobian` — the analytic 4n × (5(n+1)+n) Jacobian, if the
  companion wants the same numbers.

## 8. What would be most useful

A statement of the form

```
    rank of the defining Jacobian at a lifted member  =  4n − 1 − δ(deg w, deg q)
```

with δ identified, or a proof that no such formula exists because the rank depends on more than the
degree profile. Either settles whether the awkward specimen is a curiosity or a whole stratum, and
that decides whether an editor working in this model has to detect and avoid it.

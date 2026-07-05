> **STATUS UPDATE (stamped 2026-07-05).** §5's "not yet built" items have
> shipped: the closed reduction and R-as-the-enforced-constraint are in
> production (core/phCurvature.ts curvatureExtremaReducedNumeratorPH +
> reducedPHGradient; core/phCurveBoundDrag.ts constrains R for BOTH
> topologies — notebook E14-P2/E17). The mathematics below is current.

# The PH curvature-extrema numerator reduces by σ²:  g = 2·R·σ²

**Status:** established 2026-06-27, verified to machine precision for OPEN polynomial PH.
**Pinning test:** `src/core/__tests__/phReducedNumerator.test.ts`.
**Textbook entry:** `docs/CURVATURE_FOUNDATIONS.md` F7 (this file is the long form).
**Why it exists:** a candidate way through the closed-PH solver stall (#23) — *from the
conditioning side*, not the solver side — and a Law-3 honesty fix for high-degree PH curves.

---

## TL;DR

For a polynomial Pythagorean-hodograph (PH) curve, the curvature-extrema numerator we
currently use,

    g = ‖c′‖²·(c′×c‴) − 3·(c′·c″)·(c′×c″)      (degree 8m−2 = 14 for a quintic)

carries a **redundant factor of σ²** (σ = ‖c′‖ = the parametric speed). The exact identity is

    g  =  2 · R · σ² ,        R = P′·σ − 2·P·σ′ ,   P = u v′ − v u′ ,   σ = u² + v²

with **R of degree 4m−2 = 6**. Because σ² > 0 everywhere, **R has exactly the same sign
changes — the same curvature extrema — as g**, at less than half the degree and **up to
~10¹⁸× better numerical conditioning**.

---

## 1. Why PH is special (the no-square-root property)

A planar PH curve is built from a complex preimage `w = u + i·v` (the *generator*), with
hodograph

    c′(t) = w(t)²  =  (u² − v²)  +  i·(2uv).

Its parametric speed is

    σ(t) = ‖c′(t)‖ = |w|² = u² + v²    — a **polynomial**, with no square root.

For a general curve `‖c′‖ = √(x′²+y′²)` is irrational, so the curvature `κ` is irrational and
can only be handled through its *polynomial numerator*. PH removes the radical, so for a PH
curve **κ itself is a rational function** with polynomial numerator and denominator — and that
is what makes the reduction below possible.

## 2. The derivation

Signed curvature, specialized to a PH curve (the radical cancels):

    κ(t) = (c′ × c″) / ‖c′‖³  =  2·(u v′ − v u′) / (u²+v²)²  =  2·P / σ² ,
        with   P = u v′ − v u'   (degree 2m−1),   σ = u²+v²  (degree 2m).

Curvature extrema are the stationary points of κ — the zeros of `dκ/dt` (equivalently
`dκ/ds`, since `ds/dt = σ > 0` keeps the sign). Differentiate:

    dκ/dt = 2 · d/dt[ P / σ² ]
          = 2 · (P′σ² − P·2σσ′) / σ⁴
          = 2 · (P′σ − 2Pσ′) / σ³ .

Define

    R = P′·σ − 2·P·σ′      (degree 4m−2).

Then `dκ/dt = 2R / σ³`, and since `σ³ > 0`,

    sign(dκ/dt) = sign(R)      ⇒   **curvature extrema = sign changes of R.**

The general numerator `g` is the `dκ/ds` numerator written without exploiting `c′ = w²`. For a
PH curve it therefore equals R times the leftover positive power of σ:

    **g = 2 · R · σ².**

Degree check (m = uvDegree, curve degree d = 2m+1): `deg R = 4m−2`, `deg σ² = 4m`, so
`deg(R·σ²) = 8m−2 = deg g` ✓ (and `8m−2 = 4d−6`, the general planar bound).

## 3. The evidence

`src/core/__tests__/phReducedNumerator.test.ts`, four open quintic-PH generators (m=2):

| generator | g(t)/(R(t)·σ(t)²) | rel. spread | deg R | deg g | dyn-range R | dyn-range g |
|---|---|---|---|---|---|---|
| wiggle-1 | 2.000… | 7e-14 | 6 | 14 | 4.1e2 | 5.6e5 |
| wiggle-2 | 2.000… | 2e-13 | 6 | 14 | 1.7e2 | 2.2e4 |
| wiggle-3 | 2.000… | 6e-15 | 6 | 14 | 1.4e1 | **1.7e15** |
| gentle   | 2.000… | 6e-16 | 6 | 14 | 2.3e2 | **1.3e21** |

- **The identity `g = 2·R·σ²` holds to machine precision** (the ratio is the constant 2 across
  the whole parameter interval). This *proves* R and g have identical real zeros — the same
  curvature extrema — regardless of any sampling-based count.
- **R is degree 6, g is degree 14.**
- **g's coefficient dynamic range is catastrophic** (5.6e5 up to **1.3e21**); R's stays
  `~10¹–10³`. The blow-up is the σ² factor amplifying F1's span-driven dynamic range to an
  extreme.

*(Caution learned the hard way: a crude fixed-step sampler counted R's and g's sign changes
inconsistently on the ill-conditioned curves — that is the sampler's resolution, not a
discrepancy in the math. The proportionality identity above is the rigorous check; trust it,
not a sampled count.)*

## 4. Why it matters

**(a) A lever on the closed-PH stall (#23), from the conditioning side.**
The closed-PH curvature-extrema drag stalls on core's interior-point solver. The diagnosis
(see `docs/CURVATURE_FOUNDATIONS.md` F4, and the `ipopt-rho-load-bearing` note) showed the
solver is a tuned ensemble where the obvious fixes (hard-KKT equalities, "correct" ρ) make it
*worse*. F7 opens a different attack: **the constraint we hand the solver is itself needlessly
ill-conditioned.** A degree-6, `~10³`-range R is a far gentler constraint than a degree-14,
`~10²¹`-range g. Better-conditioned constraints are exactly what stiff barrier/trust-region
solves need (FOUNDATIONS F1: "condition g first, or every other lever inherits the
ill-conditioning"). So R is a candidate path *through* the wall rather than around it.

**(b) A Law-3 honesty fix.**
At a `~10²¹` coefficient dynamic range, g's *own* sign-change count (the displayed bound and
the extrema markers) is numerically unreliable — small real features drown in roundoff
relative to the largest coefficient. R, well-conditioned, is trustworthy. Per Law 3, the
displayed/enforced quantity must be the honest computed one; R makes it so.

**(c) A tighter bound.**
Lower degree ⇒ fewer Bernstein coefficients ⇒ a tighter S⁻ (the variation-diminishing bound is
closer to the true extrema count). Measured S⁻ was roughly halved (e.g. 13 vs 31 for the same
5 real extrema on wiggle-1). Still loose (the open per-span over-count, F2 / task #28), but
strictly better.

## 5. Scope and open questions

- **Verified for OPEN PH only.** For open PH the generator-span g equals the curve-span g
  exactly (FOUNDATIONS F6), so R built on the generator is the honest curve numerator.
- **The closed reduction is not yet built.** It needs the *periodic* forms of P, σ, R (the
  seam wrap + monodromy). The identity should carry over (it is pointwise algebra), but the
  periodic decomposition and the seam handling must be implemented and pinned.
- **R-as-a-constraint is not yet implemented.** Using R in the drag needs R plus its analytic
  gradient ∂R/∂(u,v) (the same Bernstein product/derivative algebra as g, but on degree-6
  objects). The decisive experiment: swap R for g in the PH drag (open first, then closed) and
  measure whether the better conditioning lets the solve **track where g stalls.**
- **Relationship to the laws.** R does not change any law: it is the *same* g up to a positive
  factor σ², so `Z(R) = Z(g)` and the curvature-extrema control is identical. It is a
  better-conditioned representative of the same object, not a new object.

## 6. Pointers

- Math object & pinning test: `src/core/phCurvature.ts` (`curvatureExtremaNumeratorPH`, the
  current g), `src/core/__tests__/phReducedNumerator.test.ts` (the `g = 2Rσ²` test).
- Value-bound precedent (κ already handled directly for PH): `src/sketcher/optimizer/
  phCurvatureBound.ts` (the `κ = 2(uv′−vu′)/σ²` formula).
- Context: `docs/CURVATURE_FOUNDATIONS.md` F1 (dynamic range), F6 (gen-span vs curve-span),
  F7 (the short form of this); `CLAUDE.md` Law 1/3; the standing solver-quality investigation
  (#23).

# The Laws of Curvature-Extrema Control

This application controls the number of **curvature extrema** of a spline while it is
edited. Everything in this codebase — every solver, data structure, display, and
optimization — exists to serve the three laws below. They are the *rules of the universe*
here: when code and a law disagree, **the code is wrong, not the law.**

The laws come from the St-Malo presentation (Curves & Surfaces 2026). They are restated
here the way Newton's laws are stated: short, exact, and few. If you cannot trace a piece
of code back to one of these laws, question why it exists.

---

## The objects (definitions, so the laws are unambiguous)

- **c(t)** — the curve being edited. It may be a polynomial, rational, complex-rational,
  or PH B-spline; open or closed. The laws hold for all of them.

- **g(t)** — the **curvature-extrema numerator**: a single scalar B-spline function built
  from c. `dκ/ds = g / ‖c′‖⁶`, and the denominator is strictly positive, so **g has the
  same sign as dκ/ds everywhere**. The curvature extrema of c are therefore the **sign
  changes of g** (the points where dκ/ds reverses) — not merely the zeros of g.
  `g = ‖c′‖²·(c′×c‴) − 3·(c′·c″)·(c′×c″)`, degree `4d−6`.

- **the control polygon of g** — the coefficients of g in its B-spline (Bernstein) basis.

- **Z(g)** — the number of **sign changes of g** itself: crossings, not touches; for
  g ≡ 0, zero.

- **S⁻** — the number of **sign changes in the control polygon of g**.

---

## Law 1 — The Bound (variation diminishing)

> **The number of sign changes of g is at most S⁻.**
>
>     Z(g)  ≤  S⁻

This is the variation-diminishing property (Schoenberg): a spline changes sign no more
often than its control polygon does. It is an **inequality**, not an equality — S⁻ is an
**upper bound**, never a claim about the exact count.

The law is about **sign changes**, not "number of curvature extrema," because sign changes
are the quantity that is always well-defined. A straight line has g ≡ 0: its control
polygon is all zeros (S⁻ = 0) and g has zero sign changes — even though dκ/ds vanishes at
every point. "Counting extrema" is meaningless there; "counting sign changes" is not.

**Corollary (curvature extrema).** A strict local maximum or minimum of curvature is a
point where dκ/ds — hence g — reverses sign. So every curvature extremum *is* a sign change
of g, and in the non-degenerate case S⁻ bounds the curvature extrema. The converse fails: g
can touch zero without crossing (a flat spot of dκ/ds, not an extremum), so a *zero* of g is
not always an extremum. **Only crossings count.**

A coarser/looser control polygon for g yields a **larger** S⁻; it is still a valid bound.
The tightest valid control polygon yields the smallest valid S⁻. **Loose is true. Loose is
fine.** What is forbidden is a number *below* Z(g) — that is not a looser bound, it is a
false one (see Law 3).

## Law 2 — The Sliding Mechanism (monotonicity)

> **Under the sliding mechanism, any motion of the control points keeps S⁻ the same or
> smaller — never larger.**
>
>     S⁻(after a drag step)  ≤  S⁻(before)

The mechanism: each tick, look at the signs of g's control polygon. Keep **active** every
coefficient that shares its run's sign, plus **one anchor** (the largest-|g| coefficient)
per alternating run; leave run interiors **free** to slide and merge. The only way S⁻ can
*increase* is the simultaneous "all-flip" of a run, and the retained anchor forbids it.
There is a proof; it is Theorem 2 of the St-Malo work. This monotonicity is the guarantee
the editor sells: **drag a point and the curvature-extrema count can only hold or drop.**

Freezing is **not** the mechanism and is never allowed — it blocks editing. The mechanism
is: re-evaluate the active set every tick, leave interiors free, enforce the run/anchor
sign constraints. If numerical slip lets S⁻ tick up despite the constraints, the *only*
permitted correction is to pull the result back along the straight path toward the tick's
start until S⁻ no longer exceeds it — a slip correction, not a freeze.

## Law 3 — Honesty (nothing fake)

> **Everything shown or enforced is the honest computed quantity. We never tune a number
> to look nicer.**

- The displayed **bound** = S⁻ of g's *actual* control polygon.
- The displayed **control-polygon colors** = the *actual* signs of g's coefficients.
- The displayed **extrema markers** = the *actual* zeros of g.
- The bound the optimizer **enforces** = the same S⁻ that is displayed.

These must all agree because they are all the same g. A bound below the markers, or colors
that don't match the coefficients, means a law is broken.

The **only** numerical threshold ever permitted is one that separates a true
machine-precision zero from a nonzero value — *never* one that reshapes a result. A global
"this coefficient is small relative to the largest one, so ignore it" floor is forbidden:
g's coefficients span a huge dynamic range (they blow up near clamped endpoints), so such a
floor deletes *real* features and produces a fake, too-low bound. **If you cannot make a
quantity tight by correct mathematics, leave it honestly loose.**

---

## The one test that must always pass

For every curve, in every family, open or closed:

    S⁻  ≥  Z(g)        and in the editor:   S⁻  ≥  (number of sign-change markers drawn)

(The markers count crossings of g, so they are Z(g) made visible.) If this ever fails,
stop and fix the law-breaking code before doing anything else.

## What the laws forbid (so we stop reinventing)

- Thresholds/deadbands that shape a count toward a "nicer" value. (They have caused two
  bugs: markers erased near endpoint features, and a bound that read *below* the true
  count.)
- Displaying one quantity while enforcing another.
- Freezing control points or constraints to hold the bound.
- Any "upper bound" that can be smaller than Z(g) (the true number of sign changes of g).

## Known honest looseness (not bugs — Law 1 permits these)

- **Open B-spline bound is loose.** We currently count g's *per-span Bézier* coefficients,
  which over-counts (e.g. 10 vs 6 real extrema). It is a valid upper bound. The tight count
  comes from g's *minimal/coarse* control polygon (B-spline product algebra) — a correct-
  mathematics task, **never** a threshold. Tracked as task #28.

---

## The three documents (and the rule against re-studying)

- **`CLAUDE.md`** (this file) — the **constitution**: the laws, what must always hold.
- **`docs/CURVATURE_FOUNDATIONS.md`** — the **textbook**: durable *facts* about our objects
  (why g has a huge knot-driven dynamic range, why g is discontinuous at knots, …), each
  established once with evidence and a pinning test. **Read it before investigating a
  symptom; if the fact isn't there, study it once, then add it.** A bug teaches us something
  new exactly once — after that it's a fact we build on, not a study we repeat.
- **`docs/CURVATURE_ARCHITECTURE.md`** — the **engineering**: how it's built.

A refactor for "cleaner code" may change structure but **never** the numbers a pinning test
records. If a cleanup turns a test red, the cleanup is wrong. The reference implementations
(the online sketcher, `../static-portfolio-rust`) are oracles — port faithfully and verify,
don't re-derive.

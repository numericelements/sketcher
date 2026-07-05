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

- **f(t)** — the **inflection numerator**, the second instance of the same idea:
  polynomial `f = c′×c″` (degree `2d−3`); rational `f = det[H, H′, H″]` over the
  homogeneous `H = (w·x, w·y, w)` (degree `3d−3`, and `r′×r″ = f/W³`, so for positive
  weights f's sign changes ARE the inflections). Everything below said of g holds of f.

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
start until S⁻ no longer exceeds it — a slip correction, not a freeze. If that pull-back is
doing more than removing a hair of slip, that is itself a solver-quality failure (below):
the solve should have produced a feasible *reshaped* curve in the first place.

**Reshape, don't block.** When a drag would push S⁻ up, the correct response is to **move
more control points** — let the rest of the curve slide to absorb the curvature so the
dragged point still follows the cursor — **not** to stop the dragged point. A point that
won't move is a **solver failure**, not the bound doing its job. The bound may stop motion
only at the TRUE feasible limit, where no coordinated slide can avoid a new extremum — and
even there the curve sits at the reshaped feasible projection, never frozen. In practice we
stall far short of that limit, and the cause is always solver quality (next section). How far
a point *should* travel before the true limit is answered by measuring against a reference —
today the Rust core (`../static-portfolio-rust`), itself in development: a cross-check, not
an infallible oracle (the old online sketcher is mined out). **This codebase is meant to
BECOME the reference implementation.** One qualification, learned the hard way (F9): a
tracking comparison against any reference only counts if the reference holds the same
displayed bound. One that travels further while its bound grows is not a reference for
tracking; it is a counterexample.

### Standing investigation — solver quality (we return to this forever)

Blocking, stalling, and the "retreat with more iterations" signature all trace back to how
well the optimizer navigates the constrained landscape. **There is no one-time fix; this is
a permanent line of work.** Whenever a curve blocks, do not invent a new clamp — ask which
lever below is failing, measure it against the reference, and improve the solver so the point
moves by *reshaping the curve*:

- **Exact Hessian vs Gauss-Newton** — a true second-order step follows a curved constraint
  boundary that a first-order step stalls against. (Kept behind a flag; measure, don't assume.)
- **Gradient / Jacobian accuracy** — numerical error in ∂g/∂CP (finite-difference vs analytic
  vs AD) sends the solver sideways; less error → straighter progress toward the cursor.
- **Solver choice** — interior-point (IPOPT) vs primal-dual vs barrier navigate the boundary
  differently. Keep them all; measure which both holds the bound AND tracks.
- **Conditioning first** — scale g out of its span-driven ~1e12 dynamic range (FOUNDATIONS F1)
  *before* the above, or every one of them inherits the ill-conditioning.

The test of success is not "the bound held" (blocking holds it trivially) — it is "the bound
held **and** the point tracked the cursor." Pin both (see `rustParityDrags.test.ts`). And the
converse trap, measured in F9: "the point tracked" alone proves nothing — check the bound
held before crediting any solver with better feel.

## Law 3 — Honesty (nothing fake)

> **Everything shown or enforced is the honest computed quantity. We never tune a number
> to look nicer.**

- The displayed **bound** = S⁻ of g's *actual* control polygon.
- The displayed **control-polygon colors** = the *actual* signs of g's coefficients.
- The displayed **extrema markers** = the *actual* sign changes (crossings) of g.
- The bound the optimizer **enforces** = the same S⁻ that is displayed.

These must all agree because they are all the same g. A bound below the markers, or colors
that don't match the coefficients, means a law is broken.

**Law 3 has teeth when comparing solvers.** A solver may only be called "better at
tracking" if it holds the SAME displayed bound while tracking. We measured the trap
(FOUNDATIONS F9): the legacy rational drag tracked the cursor to ~97% — by letting the
displayed bound climb 2→10. It wasn't better; it was enforcing a different quantity than
the editor showed. Verify the bound first; compare feel second.

## The laws quantify over every scalar invariant

The three laws never actually use "curvature": they hold for **any scalar B-spline
function built from c** — a numerator, its control polygon, Z ≤ S⁻ (Law 1), the sliding
mechanism's monotonicity (Law 2), displayed == enforced (Law 3). The app instantiates
them twice: **g** (curvature extrema — the purpose of this application) and **f**
(inflections — same machinery, `familyInflectionNumerator`, enforced when inflection
preservation is on). A future invariant joins by supplying its numerator; it inherits the
laws, the bound, the mechanism, and the honesty obligations wholesale. Do not build a
one-off pipeline for a new scalar quantity — instantiate the laws.

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

(The markers count crossings of g, so they are Z(g) made visible.) The same holds for
every other enforced invariant — with inflection preservation on, `S⁻(f) ≥ Z(f)` likewise.
If this ever fails, stop and fix the law-breaking code before doing anything else.

## What the laws forbid (so we stop reinventing)

- Thresholds/deadbands that shape a count toward a "nicer" value. (They have caused two
  bugs: markers erased near endpoint features, and a bound that read *below* the true
  count.)
- Displaying one quantity while enforcing another.
- Freezing control points or constraints to hold the bound.
- Any "upper bound" that can be smaller than Z(g) (the true number of sign changes of g).
- Routing an edit to a solver that does not hold the displayed bound because it "feels
  better." That feel is the violation (F9).
- Silently ignoring an enforcement flag a curve family doesn't support. Either enforce it
  or throw/state the gap out loud (the dormant-flag sweep found three no-op guards; the
  complex-weight inflection slot now throws instead of pretending).
- A magnitude floor that REASSIGNS SIGNS before counting. Even at the measured honest
  noise level it erased real sign changes on clustered knots and read the bound 14 where
  the exact count is 25 (E25's oracle specimen) — a false bound, the forbidden direction.
  The floor's only lawful job is feasibility SLACK (a practically-zero active coefficient
  starts a hair off its wall); signs are counted raw, and the monotone display is the
  sliding mechanism's theorem, not a smoothing artifact.

## Known honest looseness (not bugs — Law 1 permits these)

- **The bound is the polygon's count, and the polygon may be finer than minimal.** Knot
  insertion is corner cutting, hence itself variation-diminishing: refinement can only
  LOWER or hold S⁻ — so the per-span Bézier polygon we count is TIGHTER than any coarser
  B-spline polygon, never looser (the old claim here was backward; measured 2026-07-04:
  on ordinary curves S⁻ already equals Z exactly). Residual looseness at knife edges
  (a machine-zero coefficient counts a spurious pair) is the honest kind — loose is true.
  The historical "10 vs 6" over-count was NOT representation looseness: it was the
  floor-based sign smoothing ERASING real changes elsewhere (see the forbidden list).

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
records. If a cleanup turns a test red, the cleanup is wrong. The Rust core
(`../static-portfolio-rust`) is the parity reference — both codebases are in development,
so a disagreement means "investigate," not "Rust wins"; where Rust already has an algorithm
we port faithfully and verify rather than re-derive. The goal is for THIS codebase to be
the reference implementation. (The old online sketcher is mined out; anything it still does
that core doesn't is a migration task, not a reason to consult it for math.)

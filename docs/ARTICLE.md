# Interactive Curve Editing Under a Curvature-Extrema Budget

**— article draft (main narrative), for the St-Malo follow-up with collaborators —**

*Status: first full draft of the core story, 2026-07-04. The mathematics is Eric's
(St-Malo, Curves & Surfaces 2026); this document arranges it as a paper and attaches
the reference implementation's evidence. Every number cited here is reproduced by a
named pinning test in the repository — the article-with-code contract.*

*Companion documents: `CLAUDE.md` (the laws), `docs/THE_IDEAS.md` (the eight
contributions in full anatomy), `docs/CURVATURE_FOUNDATIONS.md` (established facts),
`docs/LAB_NOTEBOOK_DRAG.md` (the experiments E1–E22 this draft cites).*

---

## Abstract (draft)

A curve editor makes a promise no CAD system makes: **drag anything, and the number of
curvature extrema can only stay or drop — never grow behind your back.** We show how to
keep that promise interactively, exactly, and honestly, for polynomial, rational,
complex-rational and Pythagorean-hodograph B-splines, open and closed. The method rests
on one classical inequality and one new mechanism: the variation-diminishing bound
`Z(g) ≤ S⁻` applied to a scalar B-spline field g built from the curve, and a per-tick
*sliding* active set — same-sign coefficients active, one largest-|g| anchor per
alternating run, run interiors free — for which the count `S⁻` is provably
non-increasing under any motion of the control points (Theorem 2). The same two-piece
pattern instantiates unchanged for inflections, for the Pythagorean-hodograph reduced
numerator, and for curvature *value* bounds as nonnegativity certificates. A reference
implementation demonstrates the claims at interactive rates, and contributes a
methodological point we believe is new in this setting: the one numerical threshold the
method needs (the machine-zero separator) is *measured* against an exact rational
oracle rather than guessed — and the measurement corrected both the folklore constant
(450× too large) and our own structural hypothesis about the error's shape.

---

## 1. The promise, and why it is hard

Fairing tools smooth a curve *after* editing; constraint solvers block motion *during*
it. The promise here is different: **free-form editing in which an aesthetic invariant
— the number of curvature extrema — is a budget the user spends deliberately, never a
quantity that leaks.** Drag a control point: the curve follows the hand, reshaping
globally if it must, and the displayed count S can hold or drop but never rise. When
the user *wants* another extremum, they ask for it (a knot, a mode change); it never
appears as a side effect.

Three things make this hard simultaneously:

1. **Counting is global and discontinuous.** The number of curvature extrema is an
   integer functional of the whole curve; naive enforcement is combinatorial.
2. **Interactivity forbids blocking.** A constraint that stops the dragged point is a
   failed editor, even if it is a correct theorem. The curve must *reshape* so the
   point keeps following the cursor — blocking is permitted only at the true feasible
   limit (in practice, essentially never).
3. **Floating point lies near zero.** The whole method turns on *signs* of computed
   coefficients; at interactive scale their dynamic range reaches 1e16, and the sign
   of a small coefficient is exactly where naive numerics fakes the count.

The paper's three sections answer these three difficulties in order: the **bound**
(§2), the **mechanism** (§3–4), and the **honest zero** (§6).

## 2. One inequality, many invariants

Everything is built from a single scalar object. For a planar curve c(t),

    dκ/ds = g / ‖c′‖⁶,     g = ‖c′‖²·(c′×c‴) − 3·(c′·c″)·(c′×c″),

so g — a single scalar B-spline function of degree 4d−6 — has the sign of dκ/ds
everywhere, and **the curvature extrema of c are the sign changes of g**: crossings,
not touches. Schoenberg's variation-diminishing property then gives the bound that
carries the whole method:

    Z(g)  ≤  S⁻(g's control polygon)          (Law 1)

The right-hand side — sign changes of a coefficient vector — is cheap, local, and
*conservative in the safe direction*: a coarser control polygon gives a larger S⁻,
still a valid budget. (Loose is true. What is forbidden is a number below Z — that is
not looser, it is false.)

The crucial observation — what makes this a *method* rather than a trick — is that
nothing above used "curvature". The pattern quantifies over **any scalar B-spline
field built from the curve**:

| invariant | field | degree | sign changes are |
|---|---|---|---|
| curvature extrema | g (above) | 4d−6 | the extrema |
| inflections | f = c′×c″ (rational: det[H,H′,H″]) | 2d−3 / 3d−3 | the inflections |
| PH curvature extrema | R = P′σ − 2Pσ′, P = uv′−vu′, σ = u²+v² | 4m−2 | the same extrema (g = 2Rσ², σ² > 0) |
| curvature value \|κ\| ≤ b | P± = b·σ² ± 2P ≥ 0 (PH) | 4m | — (a nonnegativity certificate: the same polygon test pointed at ≥ 0 instead of sign changes) |

Rational and complex-rational curves enter through the homogeneous/Chen reduction — the
numerator stays a polynomial B-spline field, so the *same* machinery applies; closed
curves enter by working on the periodic (cyclic) polygon with no seam case anywhere
(the seamless-loop principle: a closed curve has no beginning). The PH row of the table
deserves emphasis: exploiting the PH structure replaces a degree 8m−2 field by the
degree 4m−2 reduced numerator R with the *same* sign changes — half the coefficients
and orders of magnitude better conditioning, for free, because the family's structure
was used instead of fought.

## 3. The sliding mechanism (the headline)

Law 1 gives a budget; it does not yet give an editor. The naive enforcement — freeze
the sign of every coefficient — keeps S⁻ constant and **blocks**: the curve becomes
rigid precisely when the user pushes it somewhere interesting. The contribution is the
active set that never blocks and still cannot leak:

> **Each tick, read the signs of g's current control polygon. Keep active every
> coefficient that shares its run's sign, plus one anchor — the largest-|g|
> coefficient — per alternating run. Leave run interiors free.**

A freed interior coefficient that flips can only **merge** two sign changes (two
extrema collapsing — the user draining budget by editing), never create one; the only
event that could raise S⁻ is the simultaneous all-flip of an alternating run, and the
retained anchor forbids exactly that. Hence

    S⁻(after a drag step)  ≤  S⁻(before)          (Law 2, Theorem 2 of the St-Malo work)

under *any* motion of the control points respecting the active signs. The active set
is re-read every tick — nothing is frozen, signs follow the current curve — so the
curve reshapes freely inside the budget. This is the answer to difficulty (2):
**reshape, don't block** is not an aspiration, it is what the constraint set permits by
construction.

## 4. The solver that executes it

The constraints are sign conditions on the active coefficients; the objective is plain
weighted tracking of the control points toward the cursor (dragged point weighted
above its anchors). The production solver is a **log-barrier trust-region method**
with a near-exact subproblem (Conn–Gould–Toint §7.3.4) and one distinctive
discipline: a candidate step is accepted only if *strictly feasible*, and the trust
radius shrinks — re-solving, which redirects rather than truncates the step — until it
is. Two consequences matter for the paper:

- **The bound is enforced inside the solve**, not patched afterwards. A separate
  strict guard (bisect the step back toward the tick start) exists as a Law-2 backstop
  but fires only on numerical slip; on the measured drags it is idle. A solver "held
  the bound" trivially if it blocked — the test of quality is holding the bound *and*
  tracking the cursor, and both are pinned together.
- **Scale invariance is a theorem here, then a measurement.** With margins at the
  honest zero (§6), the barrier is invariant to any per-row scaling of the
  constraints (∇log(f/s) = ∇f/f). We verified this numerically: identical
  trajectories under three different row-scaling regimes on every fixture, including
  knot vectors whose structural dynamic range reaches 1e14 (notebook E22). The
  conditioning folklore that haunted earlier versions of this system does not apply
  to this solver class — a small negative result that saved the architecture from a
  layer of machinery.

Linear algebra is banded: interleaved variable order gives bandwidth 2·degree+1 for
open curves; a closed curve adds a low-rank seam coupling handled as a dense border
(band + border = an arrowhead with a genuinely triangular factor). Each tick is
O(n·b²); measured tracking on 15-tick reference drags (test `trustRegionParity` and
siblings): polynomial open/closed 90/94%, rational 95/91/81% at n = 8/16/32, closed
complex 78–94% — with the displayed bound held at every tick by construction.

## 5. The Pythagorean-hodograph family, end to end

PH curves stress every part of the design, and reward it. The curve is generated by a
complex polynomial w = u+iv (hodograph c′ = w²); the editor's handles are curve
control points, while the mathematics lives in the generator. Three specifics:

- **The reduced field.** Constrain R (degree 4m−2), not the curve-span g (degree
  8m−2): same crossings exactly (g = 2Rσ²), better conditioned by the square of the
  speed. Everything — enforcement, the displayed count, the on-curve markers —
  reads this one object (§7).
- **Closed PH: decouple, and respect the chart.** Closure (∮w² = 0) is *not* solved
  as an in-solver equality — it is restored after each solve by a two-condition
  minimum-norm Newton projection (the decoupled design). Two chart lessons were paid
  for and are worth printing: the solve must run in the *free* seam coordinates (the
  wrap tail of the generator is linearly dependent; solving it as free lets the
  projection snap it back 60–170px per tick — measured, then eliminated), and the
  tracking objective must target the *user's handles* (the periodic control points,
  through the linear fit operator) — the clamped chart's end control points are
  blends, not copies, and any "corresponding clamped point" model pulls the wrong
  points near the seam. After both corrections: every one of 48 control points
  follows a 50px pull forward (+6.6 to +35 px in three ticks), none backward, none
  overshooting — pinned as a sweep over every control point through the real editor
  route.
- **The value bound as a certificate.** |κ| ≤ b for PH is two polynomial
  nonnegativity certificates P± = b·σ² ± 2P ≥ 0, enforced as extra inequality rows in
  the same solve — variation diminishing again, pointed at ≥ 0. The pattern is
  family-portable: a spatial PH curve joins with the single row b²σ⁶ − |r′×r″|² ≥ 0.

## 6. The honest zero (the numerical contribution)

The method's one permitted threshold separates a true machine zero from a nonzero
value: a coefficient below it may carry its neighbor's sign (else a clamped-end
structural zero flickers and destabilizes everything); a coefficient above it *is its
sign*. Everything else — deadbands, relative floors that shape a count — is forbidden,
because g's dynamic range makes any such floor delete real features.

Where should the threshold sit? We answer by **measurement instead of convention**:
the full complex-rational numerator pipeline re-implemented in exact rational
arithmetic (BigInt fractions; doubles are dyadic rationals, so every pipeline
operation is exact), run against the double pipeline coefficient-by-coefficient. Two
results, one of them against ourselves:

1. **The error law is uniform-absolute:** every coefficient's error is
   (0.03…9)·ε·max|g|, independent of its span or its own magnitude. Structural
   hypotheses — that the error should scale with a per-span knot power, or with a
   worst-case magnitude envelope of the computation — are *refuted* by the same
   oracle: the envelope over-predicts by 5×10⁶ (cancellation is not error;
   subtraction of nearby doubles is exact), span-locality under-predicts by 1.8×10⁴.
2. **The folklore constant was 450× too large.** The threshold in service (1e-12
   relative to max, a "few thousand ε" plausibility argument) sat two and a half
   orders above the measured noise ceiling and thereby *manufactured* a class of
   phantom "structural zeros" — real sign carriers handed enforcement margins 7,600×
   their own size, which is precisely where bound violations were observed to slip
   through. Setting the threshold at the measured level (45× the worst observed
   error) healed those violations at the root: two long-standing "dead tick"
   specimens simply stopped occurring, and the healings are now regression tests.

The cost was honest too: one tracking canary dropped 70→67% because phantom zeros
became real constraints. We keep that trade and display it — the alternative was a
budget enforced against a fiction.

## 7. Honesty as an architectural principle

Law 3 — *displayed = enforced* — sounds like hygiene and turns out to be a design
force. Every violation class we met in practice reduces to two representations of one
quantity disagreeing at a knife edge:

- a legacy solver that "tracked better" was enforcing a different count than the
  editor displayed (it let the displayed bound climb 2→10 while tracking 97% — the
  measured trap that gives Law 3 teeth when comparing solvers);
- a closed-PH display computed from the periodic *view* (a 1e-6 least-squares image
  of the exact solved object) flickered 4→6→4 at a graze while the enforced count
  held — cured not by tolerance but by reading the count, the markers, and the
  constraint display all from the solved object itself;
- the marker finder reported raw floating-point crossings while the count used the
  robust sign assignment — ten dots under a displayed bound of eight, cured by giving
  the dots the count's own classifier.

The uniform cure is the **one-metric principle**: solve, guard, display, and markers
read literally one computation per family. The editor's contract is then testable
end-to-end, and we pin it as such: for every family and topology, a sweep drags
*every* control point through the real editor route and asserts the direction
contract (moves with the pull, never flies) — a test discipline that found the one
real seam bug a single-index test had missed.

## 8. What the implementation is evidence *of*

The reference implementation (TypeScript, ~core module) is not an appendix; it is the
demonstration that the three laws coexist at interactive rates:

- one solver engine for all eight drag routes (4 algebraic families × 2 topologies,
  plus open/closed PH on the reduced field);
- the bound held at every tick *by the constraint set*, with the guard idle;
- displayed = enforced everywhere, pinned;
- every editor claim in this draft is a named test: `trustRegionParity*`,
  `closedPHAllCPSweep`, `openPHCurveBound`, `phValueBound`, `closedPHDisplayMetric`,
  `labE21`/`labE22` (the oracle and invariance experiments), and the notebook
  E1–E22 records the failed hypotheses alongside the confirmed ones.

## 9. Open problems (the further-research section)

1. **The tight open bound.** We count g's per-span Bézier coefficients — a valid but
   loose S⁻ (10 vs 6 real on a reference curve). The tight count is S⁻ of g's
   *minimal* B-spline polygon, reachable by product algebra in the B-spline basis —
   correct mathematics, never a threshold. (Task #28.)
2. **Bound-preserving Farin-point editing** for complex-rational curves: the weight
   chain couples globally; a reduced-variable formulation that holds S⁻ while a Farin
   point drags is open (our attempts held the bound but blocked outward).
3. **The seam projection tax.** The closed-PH closure projection is objective-blind;
   at the seam control point it returns ~2/3 of each solve's progress. A
   closure-aware objective row should recover it.
4. **Merges at the knife edge.** At a genuine extrema merge the count is
   discontinuous in the data; 1-ulp input jitter legitimately flips it. Display and
   enforcement need a *consistent* convention (hysteresis, or exact structural
   knowledge at the merge) — the last honesty question the oracle left open.
5. **Sub-O(n) local drags** (the hinge frontier): windowed solves with step-stability
   acceptance, toward editing 500-point curves with per-tick cost independent of n.

---

*Draft ends. Everything above is arranged for the collaborators to cut, reorder, and
formalize; the theorem statement and proof (Theorem 2) and the related-work section
are deliberately left to the mathematical authors.*

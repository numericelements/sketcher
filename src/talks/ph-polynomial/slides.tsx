// ============================================================================
// Pythagorean–Hodograph Curves — Polynomial
//   Solution structure and interactive control
//
// An interactive monograph for readers who already know PH curves. It does NOT
// introduce arc length, speed, or the hodograph — the audience teaches those.
// It refreshes what is DIFFICULT and how it was resolved, with figures that show
// BEHAVIOUR (a family swept, a landscape, a gap closing, a count jumping) rather
// than definitions, since an instance is what a paper already prints better.
//
// The spine is one framework: prescribe functionals, then count them against the
// manifold's dimension.
//
//   fewer than dim  →  a positive-dimensional fiber  →  need a CHOICE RULE
//                      (minimum-norm transport, null-space projection)
//   exactly dim     →  finitely many solutions       →  BRANCHES, and monodromy
//                      around the discriminant
//   more than dim   →  generically empty             →  a SHAPE obstruction
//
// Interpolation and interactive editing are the same operation in this picture —
// they differ only in WHICH functionals you prescribe (boundary data vs control
// points). The literature populated the middle row; the top row (the choice rule)
// and the loop structure of the middle row are what this deck adds.
//
// Conventions:
//   * one gesture, one lesson, one number per figure — no configuration UI
//     (a bench with all the knobs is a different genre; the old interpolation bench is retired)
//   * a bare NOTATION strip in place of prose, to trigger a concept in half a
//     second without explaining it
//   * each difficulty names the result that resolved it
//   * 2D where the picture is COMPLETE (a plane region is fully visible);
//     3D where the phenomenon is genuinely 3D (gauge, frames, torsion, families)
//
// SPLIT INTO TWO DECKS (2026-08-24, Eric's call — one deck per act): this is the POLYNOMIAL
// deck — divider + three figures + one provenance slide, the thesis being "the count is a
// property of the grip, and in space the same grip leaves a family". The rational act (the
// models divider and the pole-lab pair) is its own deck at ../ph-rational, and the parked
// slides in ../ph-interpolation-wip graduate into whichever deck owns them: spatial cubic,
// torus, RMF here; spinor chart, Möbius bend, spheres, the gap, "what is open" there. This
// directory keeps ALL the figure files, including the parked act's — the WIP deck imports them
// from here. Title and subtitle are PROVISIONAL since the split — Eric has not named the pair.
// ============================================================================
import type { SlideDefinition } from '../framework/types'
import ThreePointsFigure from './ThreePointsFigure'
import PlanarSubsetFigure from './PlanarSubsetFigure'
import SpatialSubsetFigure from './SpatialSubsetFigure'

export const slides: SlideDefinition[] = [
  // ---------------------------------------------------------------------------
  {
    type: 'title',
    content: (
      <>
        <h1>Pythagorean–Hodograph Curves &mdash; Polynomial</h1>
        <div className="subtitle">Solution structure and interactive control</div>
        <div className="author">Eric Demers</div>
        <div className="event">Polytechnique Montréal</div>
        {/* Italic because this slot is where cs2026 puts the conference and city, and
            anything else set here reads as a venue without it.
            The dedication — "For the beautiful city of Florence" — is deliberately held
            back for the version that is no longer preliminary, and belongs in this same
            slot when it arrives. A dedication spent on a draft is a dedication wasted.
            The personal note ("I prepared this for you") stays in the covering email:
            decks circulate, and it would puzzle a third reader six months on. */}
        <div className="event note" style={{ marginTop: '2em' }}>
          A preliminary version, offered for discussion
        </div>
      </>
    ),
    notes:
      'THE SPLIT DECK, polynomial act (2026-08-24, Eric-s call: one deck per act; the rational '
      + 'act, with "representations" in its subtitle, is ph-rational). Every word of THIS subtitle '
      + 'is earned here: SOLUTION STRUCTURE is the grip slides -- the count is a property of which '
      + 'points you hold, and in space the same grip leaves a family -- and INTERACTIVE CONTROL is '
      + 'what every figure does. "Representations" left with the pole pair. Title and subtitle are '
      + 'provisional since the split. '
      + 'WHAT THE SUBTITLE USED TO SAY, and why it changed: "solution structure, selection, and '
      + 'interactive motion" named the old five-act plan. Two of its three words had stopped pointing '
      + 'at anything -- nothing in the deck SELECTS among interpolants any more, and "motion" meant '
      + 'dragging-as-transport, monodromy and holonomy, which never got its slide. The fault was not '
      + 'that the subtitle had three parts; it was that two of them were empty. '
      + '"INTERACTIVE CONTROL" ECHOES THE OTHER DECK deliberately -- cs2026 is "Interactive Control of '
      + 'Curvature Extrema and Inflections on B-Spline Curves". Read side by side the two titles say '
      + 'one thing about the programme: interactive control over hard constrained curve families. '
      + 'AND "RATIONAL FRAMES" CAME OFF, because frames held three slides of twenty-nine and a '
      + 'co-headline sends a frames specialist to the wrong document. Since the cut the frame slides '
      + 'are parked in ph-interpolation-wip entirely, so the decision is doubly right. The argument '
      + 'itself is worth keeping in the pocket: |e|^2 = 1 forces the leading coefficient to vanish, '
      + 'so a moving unit frame can never be polynomial -- the polynomial object is the spinor, and '
      + 'the frame is rational because normalising by sigma = |A|^2 is a division. '
      + 'WHAT IS DELIBERATELY NOT HERE: the sphere construction. It is the candidate contribution and '
      + 'it is tempting, but RATIONAL_PH_STATE 12.4 says "not found", not "new" -- putting it in the '
      + 'title would stake a claim the document itself declines to make.',
  },
  // ---------------------------------------------------------------------------
  // 2 — THE MAP. The slide someone reads in thirty seconds to know what this is.
  //
  // This deck is circulated BEFORE the discussion, so slide 2 has to do two jobs at once: say what
  // the object is, and say what is being asked. Since the split the map is the polynomial row
  // alone — plane and space, one generator equation each — and the deck says nothing about the
  // rational act at all: a pointer line to the sibling deck was tried and cut (Eric, 2026-08-24);
  // the shelf page lists both decks and that is enough. (The rational row moved to ph-rational
  // with the pole pair; the old four-cell map's spinor act is parked in ph-interpolation-wip.)
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Outline</h2>

        <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.72em', whiteSpace: 'pre', lineHeight: 1.55, margin: '0.2em 0 0.45em 0.6em', color: '#475569' }}>
{`   plane     r′ = w²                    one complex polynomial
   space     r′ = 𝒜 i 𝒜*,  𝒜 = u + v j   two complex polynomials`}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '1.4em', rowGap: '0.55em', margin: '0.4em 0 0.5em 0.3em', lineHeight: 1.45 }}>
          <div><strong>the plane</strong></div>
          <div style={{ color: '#475569' }}>how many curves fit the control points you hold</div>

          <div><strong>space</strong></div>
          <div style={{ color: '#475569' }}>the same points held leave a family, not a count</div>
        </div>

      </>
    ),
    notes:
      'THIRTY SECONDS IS THE BUDGET for this slide, because the deck is read before the meeting. '
      + 'THE MAP SITS ON TOP, and what makes that work is SIZE rather than order. Set small and grey '
      + 'it reads as an epigraph -- the frame you glance at -- and the sections underneath, at full '
      + 'size, are what the eye lands on. The order was tried both ways: with the map at full weight '
      + 'on top it swamped the slide and stopped looking like an outline at all; with the sections '
      + 'first it read correctly but lost the map-as-opening. Small-grey-on-top is the arrangement '
      + 'that gives both. '
      + 'READ THE TOP ROW ACROSS and it says what changes on leaving the plane: ONE complex polynomial '
      + 'becomes TWO, and a COUNT becomes a FAMILY. The form is Hopf -- A = u + v j -- and it is why '
      + 'the two-valued square root becomes a CIRCLE of square roots, since (u,v) and '
      + '(u e^{i theta}, v e^{-i theta}) give the same hodograph. Note the phases are OPPOSITE in the '
      + 'pair, which is what a common phase in the quaternion looks like from here. Section I is that '
      + 'sentence. '
      + 'SAY THAT u AND v ARE COMPLEX, because the letters collide with the field-s own convention: '
      + 'Farouki writes A = u + v i + p j + q k with u, v, p, q all REAL and calls the complex pair '
      + 'alpha, beta. Ours are their alpha and beta. The line under the equation says "two complex '
      + 'polynomials" for exactly this reason. If someone reads u and v as two of four reals and '
      + 'asks where the other two went, that is the confusion, and it is answered in one sentence. '
      + 'THE RATIONAL ROW LEFT WITH THE SPLIT (2026-08-24): the map is the polynomial row alone. '
      + 'A grey pointer line to the sibling deck was tried and cut the same day -- the shelf page '
      + 'lists both decks, and an outline that mentions another deck-s content is half a promise. '
      + 'If someone asks where the rational story went, say ph-rational aloud. '
      + 'SIMPLIFIED 2026-08-24 (Eric): the map carries the equations and the model names ONLY. The '
      + 'conclusions that used to be printed beside them -- "a count", "a family", "nothing forces '
      + 'softness", "a pole cannot be hard" -- are the slides-own job to prove, and printing a slide-s '
      + 'conclusion on the outline spends it early and clutters the map. Say them aloud here if the '
      + 'room wants the preview; the section list underneath went to one line per act for the same '
      + 'reason. '
      + 'WHAT THIS SLIDE NO LONGER PROMISES, and where it went (2026-08-24). The old four-cell map '
      + 'carried the spinor chart (integrate, and kill a logarithm at every pole), Pottmann-s planar '
      + 'dual, and the integrate-or-don-t dividing line -- the whole second act. That act is parked '
      + 'VERBATIM in ph-interpolation-wip, notes included, and this outline stopped promising it the '
      + 'day the deck was cut to nine slides. When those slides graduate back, their rows return '
      + 'here with them; the git history has the old table if the wording is wanted. '
      + 'TWO LINES CAME OFF THIS SLIDE (Eric, 2026-08-24). The C-explainer and the gesture '
      + 'sentence moved to the rational divider, which is where C first appears in earnest and '
      + 'where a reader needs them; the outline is now the map and the two-line section list, '
      + 'nothing else. And the aim line ("local editing with control over differential '
      + 'properties") was removed outright -- if the deck earns it, it does not need announcing; '
      + 'say it in the discussion if asked what the work is FOR. The gesture idea itself -- each '
      + 'figure shown twice, strict counts vs free minimum-norm -- is still the spine and still '
      + 'worth a sentence aloud here. '
      + 'THE DISCIPLINE STILL HOLDS on every slide: named sources for what is known, an honest label '
      + 'for what is ours and how far, a number with the test that holds it for what is measured, and '
      + 'the open questions collected rather than softened along the way.',
  },
  // ---------------------------------------------------------------------------
  // THE DIVIDER — the settled hybrid, after four versions (Eric, 2026-08-24).
  //
  // The FRAME is the original's: compact table, the plain title "Counting solutions" (no act
  // numeral, no grand title — the deck's register is a straight presentation of fact), the
  // space row, the k footnote. The MIDDLE ROWS are the arrow form's: data on the left of the
  // arrow, count of CURVES on the right, with the k+1 visible — because "2ᵏ⁻¹ points on the
  // curve" genuinely parsed as a number of points, twice, on separate readings weeks apart.
  // And k is defined in WORDS (the generator's number of coefficients), not as "deg 𝒜 + 1",
  // which computed it instead of saying it and borrowed the spatial generator's letter for the
  // planar rows. The rejected versions — header sentence, and the untitled one/count/family
  // ladder — are in git; neither said the facts as flatly.
  // ---------------------------------------------------------------------------
  {
    type: 'title',
    content: (
      <>
        <h1>Counting solutions</h1>
        <div className="subtitle" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.62em', whiteSpace: 'pre', lineHeight: 2.0, textAlign: 'left', display: 'inline-block', marginTop: '0.9em' }}>
{`Bézier      A x = b                    one

PH          xᵀ Qⱼ x = bⱼ               k+1 points on the curve   →   2ᵏ⁻¹ curves
                                       k+1 control points        →   1 … 2ᵏ⁻¹ curves

in space    the same forms over ℍ      a family, not a count

                                       k = the generator's number of coefficients`}
        </div>
      </>
    ),
    notes:
      'THE SECTION IS THREE ROWS AND THEY ARE THE SLIDES THAT FOLLOW. Linear, then quadratic, then '
      + 'quadratic-but-underdetermined -- and the answers go one, a count, a family. '
      + 'THE ARROWS CARRY THE READING: data on the left, count of curves on the right, so the '
      + 'exponents cannot parse as numbers of points -- the misreading that happened twice before '
      + 'the arrows went in. Nothing extra to say beyond reading a row aloud once. '
      + 'THE MIDDLE ROW CARRIES TWO NUMBERS BECAUSE THERE ARE TWO PROBLEMS, and they are not the '
      + 'same one for a PH curve even though they are for an ordinary Bezier. Prescribing POINTS ON '
      + 'THE CURVE gives exactly 2^{k-1}, always -- five points on a septic give eight '
      + '(planarPHInterpolantCount.test.ts, and phPlanarSepticInterp computes them by homotopy). '
      + 'Prescribing CONTROL POINTS gives a RANGE, 1 to 2^{k-1}, and which value depends on WHICH '
      + 'points are held: degree 7 takes every value from 1 to 8 across the 56 grips '
      + '(planarPHSubsetCounts.test.ts). The difference is that a control-point condition factors '
      + 'through the generator by division and a curve-point condition does not, so the control-point '
      + 'systems can be triangular and lose roots to infinity. Both slides follow. '
      + 'WHAT k IS, because it will be asked: the number of COEFFICIENTS OF THE GENERATOR, not the '
      + 'curve degree and not the curve-s control points. A PH curve of degree n has a generator of '
      + 'degree (n-1)/2, so k = (n+1)/2. Cubic: w linear, k = 2. Quintic: w quadratic, k = 3. And '
      + 'because the planar system is SQUARE, k is also the number of quadratic equations -- which is '
      + 'why it sets the count. '
      + 'THE TWO EXPONENTS ARE THE SAME MINUS ONE, and it is the gauge both times: in the plane divide '
      + '2^k by the two-element group w ~ -w; in space quotient by the circle. Same exponent, '
      + 'different group. Measured at both values: k = 2 gives two planar interpolants and, in space, '
      + 'the fibre is the circle Z0 exp(phi i) -- the spatial grip slide tours it at degree 3. k = 3 '
      + 'gives four, and a TORUS with one dial per end (phi_0, phi_2) -- the same slide-s degree-5 '
      + 'ends-held grip, whose two dials ARE those angles. (The dedicated cubic and torus slides are '
      + 'parked in ph-interpolation-wip; the grip slide subsumed both.) '
      + '2^{k-1} IS A DERIVATION, NOT A PATTERN, and this is the argument to give if pressed. '
      + 'Substitute w_j = w_0 r_j with r_0 = 1. Every condition is quadratic in w, so it becomes '
      + 'w_0^2 Q_j(r) = b_j; divide each by the first and w_0^2 CANCELS, leaving k-1 quadratics in the '
      + 'k-1 unknowns r_1..r_{k-1}. Bezout: 2^{k-1}. Then w_0^2 comes back from any single condition, '
      + 'giving w_0 up to SIGN -- and that sign IS the gauge w ~ -w, already quotiented. That is where '
      + 'the minus one lives. '
      + 'AND IT IS CHECKED AT k = 2, 3 AND 4: two, four and EIGHT distinct curves, in '
      + 'planarPHInterpolantCount.test.ts. Bezout is an upper bound, so finding 2^{k-1} distinct roots '
      + 'PROVES the count for that instance rather than suggesting it. That is the POINTS-ON-THE-CURVE '
      + 'problem; the derivation above is the same one, and for control points it gives the CEILING '
      + 'rather than the count, because a grip can send roots to infinity. '
      + 'THE SPACE ROW CARRIES NO FORMULA, AND THAT IS DELIBERATE -- an earlier version said T^{k-1} '
      + 'and it was WRONG. Two reasons, both worth knowing so it is not re-derived. '
      + 'FIRST, THE DIMENSION DEPENDS ON THE DATA, not on k alone. With k+1 POINTS the surplus really '
      + 'is k-1 (ten degrees of freedom, nine conditions, a curve -- the grip slide-s degree-3 tour). '
      + 'With C1 HERMITE the nine '
      + 'conditions do NOT grow with k, so the surplus is 4k - 10. MEASURED, in '
      + 'spatialHermiteFamilyDimension.test.ts: '
      + 'k=3 degree 5, rank 9 of 9, family 2 (the torus); k=4 degree 7, family SIX where k-1 predicts '
      + 'three; k=5 degree 9, family TEN. The rank saturates at nine from the quintic up, so every '
      + 'extra generator coefficient adds FOUR dimensions, not one -- which is the whole error in one '
      + 'sentence. And k=2 degree 3 has rank 7 of 9: the polynomial cubic cannot interpolate general '
      + 'C1 Hermite data at all, two of the nine numbers being unreachable, which is exactly why slide '
      + '7 poses three POINTS instead. '
      + 'The gauge is measured too, not assumed: the direction A -> A i sits in the Jacobian kernel to '
      + '1e-7, which is what earns the minus one. '
      + 'SECOND, THE THREE CIRCLES ARE CONDITIONS, NOT COEFFICIENTS. The (S1)^3/S1 derivation gets its '
      + 'circles from the three Hermite conditions -- c-prime(0), c-prime(1), and closure -- so at '
      + 'k = 4 there are still three of them and four coefficients, and "k links, one angle each" has '
      + 'no fourth angle to offer. '
      + 'AND THE TOPOLOGY WAS ALREADY WALKED BACK ONCE, section 8: at degree 6 the family is "a torus '
      + 'OR A KLEIN BOTTLE -- orientability was not measured, so the docs and the slide say fibred in '
      + 'circles over a circle and stop". Putting T back on a divider would undo a caution that was '
      + 'installed on purpose. '
      + 'WHAT IS SAFE TO SAY: the plane gives a COUNT and space gives a FAMILY. That holds in every '
      + 'case measured, and it is the contrast the section actually demonstrates. '
      + '2^{k-1} IS SAFE, with one qualification to state if pressed: it is the count for a SQUARE '
      + 'system of k quadratic conditions on a k-coefficient generator -- so the problem scales with k '
      + '(three points for the cubic, four for the quintic, five for the septic). For FIXED C1 Hermite '
      + 'data the planar system stops being square too, at k = 4. '
      + 'WHAT x IS: the generator-s coefficient vector. Each interpolation condition is a QUADRATIC '
      + 'FORM in it, because the curve is the SQUARE of the unknown -- prescribing points squares the '
      + 'equations. That is the whole price of PH and it needs no introduction to state. '
      + 'WRITE x-TRANSPOSE, NOT x-STAR, and it matters. The form is complex BILINEAR, not Hermitian, '
      + 'which is what keeps the system holomorphic -- and holomorphy is what makes the count 2^k by '
      + 'Bezout. In real coordinates the same k complex equations become 2k real ones in 2k real '
      + 'unknowns, where the real Bezout bound is 2^{2k}: wildly wrong, because the real system is far '
      + 'from generic. The transpose is the flag that tells a specialist which regime we are in. '
      + 'WHY HALVED: r-prime = w^2, so w and -w give the same curve. The algebraic system counts both; '
      + 'each pair is ONE curve. Cubic through three points, k = 2: four solutions, two curves. C1 '
      + 'Hermite on the quintic, k = 3: eight solutions, four curves. And the gauge does not merge the '
      + 'roots -- substituting w1 = r w0 leaves r fixed under w -> -w, so the curves stay distinct. '
      + 'WHY ONLY PLUS-OR-MINUS IN THE PLANE, and this is the cleanest statement of what changes in '
      + 'space: (w e^{i theta})^2 = w^2 e^{2 i theta}, equal only when e^{2 i theta} = 1, so the gauge '
      + 'is the square roots of unity. In the sandwich the phase appears once as e^{i theta} and once '
      + 'as e^{-i theta} from the conjugate, and since e^{i theta} commutes with i they CANCEL -- so '
      + 'every theta is gauge and the group is the whole circle. The plane-s {+1,-1} is the discrete '
      + 'remnant of it. That is why the plane can be divided by two and space cannot. '
      + 'THE THIRD ROW IS NOT CAUSED BY THE GAUGE, and an earlier version of this slide said it was. '
      + 'The arithmetic: planar quintic 8 DOF against 8 conditions, square, so a count; spatial quintic '
      + '14 against 12, so a two-parameter family. The 14 is ALREADY gauge-reduced (15 raw, less the '
      + 'circle), so the circle SHRINKS the family from three to two rather than creating it. The '
      + 'family comes from the system being UNDERDETERMINED. The parked torus slide-s note still '
      + 'reads as causal and should be corrected if that slide graduates back from '
      + 'ph-interpolation-wip. '
      + 'WHAT THIS SLIDE USED TO SAY, so it is not restored by accident: "the square becomes a sandwich '
      + 'and the square root becomes a circle of square roots", and "|e|^2 = 1 forces the leading '
      + 'coefficient to vanish, so a moving unit frame can never be polynomial". Both were shaped to '
      + 'sound good rather than to be checked. The frame argument is not lost -- the parked '
      + 'Moebius-bend slide makes the positive version at the point of use (the frame is A k A* over '
      + 'sigma, RATIONAL because sigma = |A|^2 is a polynomial), and until it graduates back the '
      + 'title notes keep the pocket version. Say it there, not here.',
  },

  // ---------------------------------------------------------------------------
  // 4 — the price of PH, stated as a dimension count
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Interpolation: same degrees of freedom, different number of answers</h2>
        <ThreePointsFigure />
      </>
    ),
    notes:
      'Both objects have 6 real DOF (quadratic Bézier: 3 planar control points; planar PH cubic: ' +
      'the linear generator w₀,w₁ = 4 real, plus the integration constant = 2). Three interpolation ' +
      'points impose 6 real conditions. Both square. The quadratic\'s equations are LINEAR, so one ' +
      'solution; the PH cubic\'s are QUADRATIC, so two. That is the whole price of PH, and it needs ' +
      'no introduction to state. ' +
      'Mechanism: c(t)−c(0) = A(t)w₀² + B(t)w₀w₁ + C(t)w₁² with A,B,C REAL, so w₁ = r·w₀ factors out ' +
      'w₀² and the system collapses to one complex quadratic in r — hence exactly two roots, and the ' +
      'gauge w → −w leaves both q and r fixed so it does not merge them. Verified in phCubic.test.ts ' +
      'across many data sets and t₁ values. Both panels are closed form; no optimizer.',
  },

  // ---------------------------------------------------------------------------
  // 5 — the count is not a property of the FAMILY, it is a property of your GRIP
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Choose which points you hold, and the number of answers changes</h2>
        <PlanarSubsetFigure />
      </>
    ),
    notes:
      'The previous slide fixes WHICH data is prescribed and counts. This one makes the choice the ' +
      'gesture. dim = 2K+2 for a planar PH curve of degree 2K−1, each control point costs 2, so ' +
      'exactly K+1 can be held — the FIFO selection enforces that, so no click can build an over- ' +
      'or under-determined state. ' +
      'THE COUNT IS A PROPERTY OF THE GRIP, NOT OF THE DATA: certified subset by subset in ' +
      'planarPHSubsetCounts.test.ts. Read as a histogram (count: how many subsets produce it) — ' +
      'degree 5: one solution at 4 subsets, two at 3, three at 4, four at 4; degree 7: every ' +
      'value from 1 to 8 occurs (6, 8, 4, 10, 8, 8, 4, 8 subsets respectively), which killed an ' +
      'earlier "1, 2, 4 or 8 by a product rule" claim in phPlanarSeptic. ' +
      'TWO RULES WORTH SAYING OUT LOUD. Hold K in a row from one end plus one more that is not the ' +
      'far endpoint and the answer is UNIQUE — the equations cascade (a square root, then ' +
      'divisions), nothing branches, dragging is single-valued and needs no branch tracking. And ' +
      'pinning both ends forces an EVEN count, with the maximum 2^(K−1) reachable ONLY that way; ' +
      'so the "ends held" toggle is choosing between always-branching and possibly-unique editing. ' +
      'STRICT vs FREE, and why free is here this early: strict spends every degree of freedom, so ' +
      'the answer is a count and nothing is chosen; free holds one point and leaves 2K spare, so a ' +
      'solver chooses, by minimum-norm. The spare room grows with degree — 2, 4, 6, 8 — so the ' +
      'modes diverge as you climb. Free is the editing mode the whole deck is heading toward; ' +
      'strict is how you learn what the space will allow. The ends hold in free mode unless you ' +
      'grab one, drifting two hundredths of a pixel over a chord-long drag (phFreeDragPinned).',
  },


  // ---------------------------------------------------------------------------
  // 7 — THE spatial slide. The same grip, one geometry up: the count becomes a family.
  //
  // PROMOTED FROM DRAFT (2026-08-24). It entered as "placed for testing — if it holds up it
  // replaces the spatial-cubic slide below", and the cut to nine forced the verdict: the cubic and
  // torus slides it subsumed are parked in ph-interpolation-wip, and this is section I's closing
  // argument. {P₀,P₁,P₃} at degree 3 IS the old cubic slide, toured the same way; degree 5
  // ends-held IS the torus grip, its two dials the Hopf angles.
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>The same control points held in space leave a family</h2>
        <SpatialSubsetFigure />
      </>
    ),
    notes:
      'THE SAME GESTURE, ONE GEOMETRY UP, and the answer changes in kind rather than in size. ' +
      'WHERE 4m+6 COMES FROM, since 10, 14, 18 will be re-derived in the room (Eric asked too, ' +
      '2026-08-24): the generator A(t) has m+1 quaternion coefficients, 4(m+1) reals; the ' +
      'integration constant p0 adds 3; and the gauge A -> A e^{i theta} subtracts ONE, because ' +
      'e^{i theta} commutes with i so the phase cancels against its conjugate in the sandwich -- ' +
      'every theta draws the identical curve. 4(m+1) + 3 - 1 = 4m+6: 10, 14, 18. The planar ' +
      'twin 2K+2 subtracts NOTHING because its gauge w -> -w is discrete -- it halves counts but ' +
      'costs no dimension. Same gauge story, two currencies: that is why the plane answers with ' +
      'a count and space with a family. And the -1 is measured, not assumed: fibreDimension ' +
      'checks the gauge direction sits in the held-point Jacobian kernel, 0.0 at all 15,445 ' +
      'grips swept through degree 15. ' +
      'dim = 4m+6 in space against 2K+2 in the plane, each held control point costs 3 instead of 2, ' +
      'and the number you can always hold comes out the SAME in both: (n+3)/2, just over half the ' +
      'control points. Degree 3 hold 3 of 4, degree 5 hold 4 of 6, degree 7 hold 5 of 8. What ' +
      'differs is what is LEFT: nothing in the plane, so a count; m dimensions in space, so a family. ' +
      'ONE DIAL PER DIMENSION, AT EVERY GRIP — m of them, and m = 4m+6-3(m+2) cannot see WHICH ' +
      'points are held. If someone asks whether a different grip gives fewer dials: no. Measured at ' +
      'every grip of every degree the figure offers, 4 + 15 + 56 of them, the dimension is m each ' +
      'time. ' +
      'WHAT THE GRIP DOES DECIDE IS THE SHAPE, and there is a rule for it. Hold both ends and one ' +
      'point out of each consecutive pair (P1,P2), (P3,P4), ... — 2^m grips — and the family is ' +
      'BOUNDED. Hold anything else and it runs to infinity. The same 2^m grips are exactly the ones ' +
      'where the PLANAR problem attains its full 2^m interpolants; every other grip loses planar ' +
      'branches and gains an unbounded spatial family. Swept exhaustively at degrees 3, 5 and 7. ' +
      'Running away is proved, by exhibiting a path that leaves every bound; staying bounded is ' +
      'strong evidence over 8000 walk samples, except at {P0,P1,P4,P5} where the closed form settles ' +
      'it. So "ends held" opens on a good grip at every degree: {P0,P1,P3}, {P0,P1,P4,P5}, ' +
      '{P0,P1,P3,P6,P7}. ' +
      'THE PLANE CROSSING IS WORTH SHOWING on the degree-3 grip {P0,P1,P2} (Eric-s find, ' +
      '2026-08-24): three held points span a plane, reflection through it fixes them, so the ' +
      'runaway family is mirror-symmetric and P3-s locus crosses the plane EXACTLY at the planar ' +
      'cubic -- the planar count (one, by the cascade) embedded in the spatial continuum, the ' +
      'ellipse slide-s lesson on an unbounded grip. The dial is guaranteed to pass through the ' +
      'crossing (asymmetric calibration plus the reach-the-mirror rule in dialRanges; pinned in ' +
      'spatialCascadeMirror.test.ts); slide it and watch P3 change sides. ' +
      'THE CIRCLES ARE REAL WHERE THEY ARE DRAWN. Degree 3 tours its ellipse with the parked cubic ' +
      'slide\'s own continuation, so the dial wraps and the grey loop is the whole fibre. Degree 5 ' +
      'ends-held IS the quintic Hermite grip, so both dials are the Hopf angles phi0 and phi2, they ' +
      'wrap, and the loci close to 1e-16. Degree 7 has no closed form, so its dials are chart ' +
      'coordinates and the loci are drawn as the ARCS they reach. Nothing claims a circle where ' +
      'there is not one. ' +
      'THIS SLIDE ABSORBED TWO OTHERS, and the ledger should be said if a specialist asks where ' +
      'they went. The spatial-cubic slide ({P0,P1,P3}: ten degrees of freedom, nine conditions, the ' +
      'tenth a curve) is the degree-3 tour here; the quintic-Hermite torus slide is the degree-5 ' +
      'ends-held grip, same four points, same two angles. Both parked slides live in ' +
      'ph-interpolation-wip, and what the torus slide still owns alone — the alpha/beta CHANGE OF ' +
      'BASIS and the arc-length-depends-on-beta invariant — goes with it. If that lesson is wanted ' +
      'back, it graduates as its own slide rather than being folded in here.',
  },

  // ---------------------------------------------------------------------------
  // THE CLOSING SLIDE — what is published, what we add, what is open (moved to the end,
  // Eric, 2026-08-24: it is the conclusion, and the deck now ends where the discussion
  // starts. The figure arc runs uninterrupted before it: interpolation → planar grip →
  // spatial grip.)
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Published, computed, open</h2>

        <p style={{ fontSize: '0.82em', marginBottom: '0.15em' }}>
          The unknown is the generator, and the control points are quadratic in it.
        </p>

        <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.68em', whiteSpace: 'pre', lineHeight: 1.55, color: '#475569', margin: '0.3em 0 0 0.2em' }}>
{`    c′ = w²          w has K complex coefficients, and every leg is a quadratic form in them.
                     K quadratic equations in w's K coefficients: Bézout 2^K solutions, in
                     pairs {w, −w} that draw the same curve — so at most 2^(K−1) curves.


    PUBLISHED   whether a complete polygon is PH, as a condition on legs and angles
                    Zheng, Wang & Yang, "On control polygons of Pythagorean hodograph septic
                    curves", JCAM 296 (2016) 212–227

                two of five legs, ends held  →  two or four curves
                    Farouki, Pelosi & Sampoli, "Construction of planar quintic Pythagorean-hodograph
                    curves by control-polygon constraints", CAGD 103 (2023) 102192

                displace two control points of a given PH quintic, staying PH  →  finitely many
                    Pelosi, Sampoli & Farouki, "Control point modifications that preserve the
                    Pythagorean-hodograph nature of planar quintic curves", JCAM 457 (2025) 116301

                The first defines the variety. The second counts one slice. The third edits
                within it.

    COMPUTED    any K+1 of the 2K control points, swept by homotopy continuation
                →  the range 1 … 2^(K−1), certified path by path at degrees 3, 5, 7

                      solutions     1   2   3   4   5   6   7   8

                      degree 3      2   2                              of 4 subsets
                      degree 5      4   3   4   4                      of 15
                      degree 7      6   8   4  10   8   8   4   8      of 56

                2^(K−1) requires both ends held, and holding both ends gives an even count.
                The count is 1 for K in a row from an end plus one more that is not the far
                end: there the equations are a square root and then divisions, so single-valued.

                in space, the same holds leave a family, never a count — dimension 1, 2, 3 at
                degrees 3, 5, 7, the same at every choice of held points (75 swept):

                      both ends + one point of each pair (P₁,P₂), (P₃,P₄), …  →  bounded
                      any other choice                                        →  runs to infinity

                the bounded choices are exactly those where the planar count attains 2^(K−1)


    OPEN        deg 𝒱 = 2^(K−1)     the ceiling is the degree of the PH variety,
                                    and holding control points slices it linearly.`}
        </div>

        <p style={{ fontSize: '0.62em', color: '#94a3b8', marginTop: '0.55em', lineHeight: 1.5 }}>
          Cross-check: Farouki&ndash;Pelosi&ndash;Sampoli&rsquo;s canonical form{' '}
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>r(0)=0, r(1)=1</span> is the
          ends-held mode. On the three of their ten cases that are control-point subsets the counts
          agree (2, 2, 4). The odd counts here require a free endpoint, which canonical form
          excludes &mdash; they cannot appear in that paper. The 2025 paper meets these counts from
          the other side: displacing two points of a given quintic holds the remaining four, and
          its five detailed cases match the counts here subset for subset (2, 4, 4, 2, 4); the
          endpoint-displacing cases &mdash; where the odd counts live &mdash; it leaves undiscussed.
        </p>
      </>
    ),
    notes:
      'THE CLOSING SLIDE, moved to the end (Eric, 2026-08-24): it explains what the room has ' +
      'just FELT across all three figures, states what is PUBLISHED against what was COMPUTED ' +
      'here, and ends on the open question -- which is what the discussion is for. Leave it up ' +
      'and stop talking. ' +
      'THE LABELS ARE PUBLISHED / COMPUTED / OPEN (Eric, 2026-08-24; they were KNOWN / OURS): ' +
      '"computed" is a status a reader can check -- swept by homotopy, certified path by path -- ' +
      'where "ours" was a claim of ownership, and the deck-s register is fact. "Not found in the ' +
      'literature" stays SPOKEN, not printed. The Bezout line was also expanded to carry its own ' +
      'argument: K quadratic equations, 2^K solutions in {w, -w} pairs drawing the same curve, at ' +
      'most 2^(K-1) curves -- an upper bound, and the table below it is what the ceiling actually ' +
      'yields grip by grip (roots lost to infinity are generators blowing up, not curves). ' +
      'THE HISTOGRAM READS COLUMN-FIRST (reformatted 2026-08-24, after Eric misread the old ' +
      '"1→6" form as "subset 1 gives 6 solutions"): the header row is the SOLUTION COUNT, each ' +
      'degree row says how many subsets produce it, and the tally at the right is the checksum ' +
      '-- the rows sum to C(4,3) = 4, C(6,4) = 15, C(8,5) = 56, every subset accounted for ' +
      'once. Two readings worth doing aloud: every value 1..8 occurs at degree 7 (which killed ' +
      'the old product-rule conjecture), and the count-1 column reads 2, 4, 6 down the degrees ' +
      '-- exactly the cascade rule-s census, K-consecutive-from-an-end times two ends. ' +
      'THE SPATIAL BLOCK UNDER COMPUTED (Eric, 2026-08-24) covers the third figure with plain ' +
      'numbers, no m: dimension 1, 2, 3 at degrees 3, 5, 7, the same at all 75 choices swept; ' +
      'bounded exactly at both-ends-plus-one-of-each-pair; and the punchline joining the two ' +
      'halves -- the bounded choices are exactly where the planar count attains its maximum. The ' +
      'proof-vs-evidence split (running away proved by exhibited paths; boundedness 8000 walk ' +
      'samples plus the one closed form) is on the spatial slide-s notes, and belongs in the ' +
      'answer if pressed here. ' +
      'THE FOOTNOTE NAMES ITS PAPER NOW: it is the reconciliation with Farouki-Pelosi-Sampoli -- ' +
      'their canonical form IS ends-held, the three comparable cases agree (2, 2, 4), and the odd ' +
      'counts are structurally invisible to canonical form, so their absence from that paper is ' +
      'agreement, not contradiction. ' +
      'THE 2025 PAPER (Pelosi-Sampoli-Farouki, read 2026-08-25) IS THE MODIFICATION MIRROR of the ' +
      'counting here, and its numbers confirm ours by different algebra. Displacing points {j,k} ' +
      'of a given quintic holds the other FOUR, so their solution counts are our subset counts for ' +
      'the complementary hold: (p0,p5) displaced = hold {1,2,3,4} -> 2; (p1,p4) = {0,2,3,5} -> 4; ' +
      '(p2,p3) = {0,1,4,5} -> 4, the Hermite grip, after they discard one degenerate; (p1,p2) = ' +
      '{0,3,4,5} -> 2; (p1,p3) = {0,2,4,5} -> 4. Five independent confirmations, with the same ' +
      'roots-lost-to-infinity accounting (their Bezout 9 -> 4 finite). And their Section 5.4 ' +
      'skips the endpoint-displacing cases "for brevity" -- exactly the complements of the ' +
      'free-endpoint holds, where the odd counts and the cascade live. The newest, closest paper ' +
      'stops at the even-count boundary. ' +
      'THEIR SECTION 6 IS A FREE MODE WITH A DIFFERENT CHOICE RULE, and the comparison is worth ' +
      'saying aloud: they fix the ends, spend the other three interior points minimizing L2 ' +
      'distance between old and new CURVE (fmincon, real-time); ours is minimum-norm in GENERATOR ' +
      'space with everything responding and the ends held softly. Same underdetermined problem, ' +
      'two selectors -- the deck-s own "fewer conditions than dimensions needs a choice rule", ' +
      'with their paper as the other choice. They also find large displacements work best as ' +
      'sequences of small warm-started steps, which is this deck-s drag architecture, ' +
      'independently arrived at. ' +
      'THE ONE IDEA: squaring is two-to-one, and PH is a squaring. For an ordinary Bézier the ' +
      'control points ARE the unknowns, the map is the identity, one answer. For PH the unknown is ' +
      'the generator and every leg is a quadratic form in it, so prescribing control points means ' +
      'inverting a quadratic map — K quadrics in K unknowns, Bézout 2^K, halved by the gauge w → −w. ' +
      'IF THE CASCADE NEEDS SPELLING OUT, degree 3 does it in four lines. Hold P0,P1,P2: w0² = 3a ' +
      'gives w0 up to a sign that IS the gauge, then w0w1 = 3b gives w1 by a DIVISION — no equation ' +
      'is ever solved, so the answer is unique and the grip is a genuine chart. Hold P0,P1,P3 ' +
      'instead: the gap swallows two legs at once, w0 and w1 couple, w0w1 + w1² = 3c is a real ' +
      'quadratic — two curves. ' +
      'WHY THE COUNTS ARE NOT POWERS OF TWO: Bézout counts projectively and a root at infinity is a ' +
      'generator blowing up, which is not a curve. How many escape depends on the grip; the cascade ' +
      'sends 14 of 16 away at degree 7. An earlier claim in phPlanarSeptic that the count "runs ' +
      '1, 2, 4 or 8 by a product rule" was read off two grips and is false. ' +
      'STATUS, checked 2026-08-19. PUBLISHED, and the two papers are complementary rather than ' +
      'competing. Zheng, Wang & Yang, JCAM 296 (2016) 212-227, solve RECOGNITION: given a COMPLETE ' +
      'septic polygon, is it PH? — necessary and sufficient in leg lengths and angles, the septic ' +
      'analogue of the cubic\'s geometric progression plus equal angles. That CUTS OUT the variety. ' +
      'Farouki, Pelosi & Sampoli, CAGD 103 (2023) 102192, COUNT one slice of it: canonical form ' +
      'r(0)=0, r(1)=1 is exactly our ends-held mode; two of ' +
      'five legs prescribed; two or four curves. Only 3 of their 10 leg-pairs correspond to ' +
      'control-point subsets — (L1,L2), (L4,L5), (L1,L5) — and all three agree with ours (2, 2, 4; ' +
      'the last is the classical Hermite four, which they reconcile from an apparent eight). ' +
      'Homotopy continuation is also standard here (Jaklic-Kozak-Krajnc-Vitrih-Zagar, G2 quintics), ' +
      'so the METHOD is not ours — sweeping every grip with it is. ' +
      'NOT FOUND, so claim nothing yet: the odd counts (they need a free endpoint, which canonical ' +
      'form structurally excludes), the degree-7 histogram (Zheng-Wang-Yang READ 2026-08-19 — it is ' +
      'recognition, not counting, so it does not contain it), and deg V = 2^(K-1). The ingredient ' +
      'for the last is textbook — deg(D_phi) = deg(phi)·deg(phi(X)) for a base-point-free system — ' +
      'but nothing applies it to PH curves. ' +
      'THE SPOKEN LINE FOR THE OPEN ROW, and the strongest sentence this slide has for the expert ' +
      'discussion: Farouki, Pelosi and Sampoli-s leg-pair prescriptions are LINEAR conditions on ' +
      'the legs, just as held control points are — so their ten cases and every grip here are ' +
      'linear slices of the SAME PH variety, and deg V is the one invariant sitting above both ' +
      'tables: their 2-or-4, our 1-through-2^(K-1), each special slice seeing as much of the ' +
      'degree as its position allows. The slide says CEILING, not count (tightened 2026-08-24), ' +
      'because only a GENERIC slice sees the full degree — the table-s whole content is that ' +
      'grips are special slices seeing less, the deficit lost to infinity or tangency. The proof ' +
      'sketch, if pressed: a generic slice pulls back through the leg map to K quadrics whose ' +
      'leading forms share a zero only where every leg vanishes, i.e. w-squared = 0, i.e. w = 0 — ' +
      'base-point-free, so Bezout-s 2^K is honest; the legs determine w-squared, so the map is ' +
      'exactly two-to-one; 2^K over 2 is 2^(K-1). What stays genuinely open: writing that down ' +
      'properly (transversality, the count at infinity), and the PREDICTIVE half — which special ' +
      'slices lose how many points, the histogram rather than its ceiling. ' +
      'THE CLASSICAL CASE IS ONE POSITION OF THE SELECTOR, and worth naming aloud: C1 Hermite data '
      + 'for a quintic IS the control-point grip {P0,P1,P4,P5}, since P1 = P0 + d0/5 and '
      + 'P4 = P5 - d1/5. "In general four distinct planar PH quintic interpolants to given C1 Hermite '
      + 'data always exist" (Farouki-Neff; 2019 survey section 21) — and ALWAYS, unlike the cubic, '
      + 'because the unknowns are complex: w0 = ±sqrt(d0) and w2 = ±sqrt(d1) always exist and closure '
      + 'is a complex quadratic in w1. Two relative signs times two roots, the overall sign being the '
      + 'gauge. That is the 4 in the degree-5 row. '
      + 'AND IT SETS UP SPACE. The same control-point problem in SPACE takes SIX points at degree 7 '
      + '(4k+2 = 18 against 3 each) and has 0, 2, 4 or 6 REAL answers under a ceiling of 8 — half of '
      + 'all arbitrary six-point polygons carry no real curve at all. The difference is the gauge: in '
      + 'the plane w -> -w is DISCRETE and costs no dimension, in space A -> A e^{i theta} is a whole '
      + 'circle. That one missing dimension is why the plane gives a count and space gives a family. '
      + 'See docs/SEPTIC_SIX_POINTS.md and core/septicCascadeDegree.test.ts. '
      + 'IF ASKED what the several answers ARE: sheets of a branched covering. Each grip is a ' +
      'different projection of the same family onto the points you hold; crossing the discriminant ' +
      'permutes them, which is why the figure carries branches by Newton rather than re-solving.',
  },
]

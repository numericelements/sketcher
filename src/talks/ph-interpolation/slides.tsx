// ============================================================================
// Pythagorean–Hodograph Curves
//   Solution structure, representations, and interactive control
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
//     (the research bench lives at /lab/ph-interpolation instead)
//   * a bare NOTATION strip in place of prose, to trigger a concept in half a
//     second without explaining it
//   * each difficulty names the result that resolved it
//   * 2D where the picture is COMPLETE (a plane region is fully visible);
//     3D where the phenomenon is genuinely 3D (gauge, frames, torsion, families)
//
// CUT AT THE MÖBIUS POLE LAB (2026-08-24): everything after it — the dedicated spatial-cubic and
// torus slides, the RMF slides, the old section II (spinor chart, Möbius bend, spheres), the gap,
// and "what is open" — is PARKED VERBATIM in ../ph-interpolation-wip/, unlisted, while this deck
// is refined. Slides graduate back one at a time, notes and all.
//
// THE DECK IS NOW TWO ACTS, TEN SLIDES: title, outline, then
//   I  — POLYNOMIAL (divider + 3 figures + 1 provenance slide): the count is a property of the
//        grip, and in space the same grip leaves a family. The spatial grip slide absorbed the
//        cubic and torus slides on its way in.
//   II — RATIONAL (divider + the pole pair): one denominator, one new actor — the pole — and the
//        same curve written two ways: (P, w, ρ), where softness is a property a solver defends,
//        and ℝ⁴′¹, where the model cannot write a hard pole at all.
// The outline's map matches this and no longer promises the parked act.
// ============================================================================
import type { SlideDefinition } from '../framework/types'
import ThreePointsFigure from './ThreePointsFigure'
import PlanarSubsetFigure from './PlanarSubsetFigure'
import SpatialSubsetFigure from './SpatialSubsetFigure'
import PoleLab from './PoleLab'

export const slides: SlideDefinition[] = [
  // ---------------------------------------------------------------------------
  {
    type: 'title',
    content: (
      <>
        <h1>Pythagorean–Hodograph Curves</h1>
        <div className="subtitle">Solution structure, representations, and interactive control</div>
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
      'THE TITLE IS BARE ON PURPOSE, and the subtitle pays for it. "Pythagorean-Hodograph Curves" is '
      + 'the name of the field, so a specialist learns nothing from it -- which is fine only because '
      + 'every word of the subtitle is earned by a section, and at NINE SLIDES it still is: SOLUTION '
      + 'STRUCTURE is the grip slides (the count is a property of which points you hold, and in space '
      + 'the same grip leaves a family), REPRESENTATIONS is the pole pair (the same curve written two '
      + 'ways, and only one of them can express a hard pole), and INTERACTIVE CONTROL is what every '
      + 'figure does. The cut to nine (2026-08-24) shrank each word-s referent without emptying any '
      + 'of them, which is why the subtitle survived the cut unchanged. '
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
  // the object is, and say what is being asked. Two rows, two acts: the polynomial row is the
  // counting argument (plane → a count, space → a family), and the rational row names the TWO
  // WRITINGS the pole pair actually shows. The old four-cell map promised the spinor chart and the
  // integrate-or-don't dividing line — that whole act is parked in ph-interpolation-wip, and this
  // slide stopped promising it the day the deck was cut to nine.
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Outline</h2>

        <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.72em', whiteSpace: 'pre', lineHeight: 1.55, margin: '0.2em 0 0.45em 0.6em', color: '#475569' }}>
{`   polynomial     plane:  r′ = w²                    space:  r′ = 𝒜 i 𝒜*,   𝒜 = u + v j
                  one complex polynomial              two complex polynomials

   rational       projective:  x = q/W                Möbius:  ⟨C,C⟩ = 0,   ⟨C′,C′⟩ = h²
                  ‖q′W − qW′‖² = ρ²                   the curve written in ℝ⁴′¹`}
        </div>

        <p style={{ fontSize: '0.72em', color: '#64748b', marginTop: '-0.25em', marginBottom: '0.4em' }}>
          C is the curve itself, written in ℝ⁴′¹ &mdash; the model where a point is a sphere of
          radius zero. In each cell the same gesture: hold control points and count the curves, or
          hold one and let the solver place the rest.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '1.4em', rowGap: '0.55em', margin: '0.1em 0 0.5em 0.3em', lineHeight: 1.45 }}>
          <div><strong>I &mdash; Polynomial</strong></div>
          <div style={{ color: '#475569' }}>the plane, then space</div>

          <div><strong>II &mdash; Rational</strong></div>
          <div style={{ color: '#475569' }}>the projective and the M&ouml;bius model</div>
        </div>

        <p style={{ fontSize: '0.72em', color: '#64748b', margin: '0 0 0.4em 0.3em' }}>
          The aim is local editing with control over differential properties.
        </p>

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
      + 'READ THE BOTTOM ROW ACROSS and it is the pole pair in one line: the SAME curve written two '
      + 'ways. In the projective model (P, w, rho) the PH condition is imposed and nothing forces '
      + 'the numerator isotropic at a root of W, so a pole is soft or hard and dragging moves it '
      + 'between them. In the Moebius model the null identity <C,C> = 0 evaluated at a root of W '
      + 'forces <q,q> = 0 with no reference to PH at all -- softness is not maintained, it is '
      + 'UNSAYABLE otherwise. Two writings, one geometric fact each: that is what "representations" '
      + 'in the subtitle now points at. '
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
      + 'THE GESTURE LINE UNDER THE MAP is the deck-s spine and is worth reading aloud. Each cell '
      + 'can be shown twice: hold the maximum number of control points and the answer is a COUNT '
      + '(strict), or hold one and the spare degrees of freedom are spent by minimum-norm (free). '
      + 'The planar and spatial grip slides show exactly that toggle; the pole lab is the same '
      + 'gesture with a solver holding the model instead of a count. '
      + 'THE AIM LINE AT THE BOTTOM is the reason the deck exists and was previously left implicit. '
      + 'THE DISCIPLINE STILL HOLDS on every slide: named sources for what is known, an honest label '
      + 'for what is ours and how far, a number with the test that holds it for what is measured, and '
      + 'the open questions collected rather than softened along the way.',
  },
  // ---------------------------------------------------------------------------
  // SECTION I — POLYNOMIAL. One equation, one consequence.
  // ---------------------------------------------------------------------------
  {
    type: 'title',
    content: (
      <>
        <h1>I &mdash; Polynomial</h1>
        <div className="subtitle" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.62em', whiteSpace: 'pre', lineHeight: 2.0, textAlign: 'left', display: 'inline-block', marginTop: '0.9em' }}>
{`hold the data, and count the CURVES through it

Bézier      A x = b                    one curve

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
      + 'THE RIGHT COLUMN COUNTS CURVES, and the slide now says so twice (the header line, and the '
      + 'word "curves" on every count) because Eric read the first version the wrong way: "2^{k-1} '
      + 'points on the curve" parsed as a NUMBER OF POINTS, not as the number of solutions when '
      + 'points are the data. The arrow form -- data on the left of the arrow, count of curves on '
      + 'the right -- is the fix, and the footnote defines k in words instead of "deg A + 1", which '
      + 'borrowed the spatial generator-s letter for the planar rows. '
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
        <h2>Same degrees of freedom, different number of answers</h2>
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
      'planarPHSubsetCounts.test.ts, degree 5 gives 1→4 2→3 3→4 4→4 and degree 7 gives ' +
      '1→6 2→8 3→4 4→10 5→8 6→8 7→4 8→8. All eight values occur, which killed an earlier ' +
      '"1, 2, 4 or 8 by a product rule" claim in phPlanarSeptic. ' +
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
  // 6 — what is published, what we add, and the one equation under both
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>The number of solutions depends on which control points are held</h2>

        <p style={{ fontSize: '0.82em', marginBottom: '0.15em' }}>
          The unknown is the generator, and the control points are quadratic in it.
        </p>

        <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.68em', whiteSpace: 'pre', lineHeight: 1.55, color: '#475569', margin: '0.3em 0 0 0.2em' }}>
{`    c′ = w²          w has K complex coefficients, and every leg is a quadratic form in them.
                     Holding K+1 control points inverts a quadratic map: Bézout 2^K, halved
                     by the gauge w ↦ −w.


    KNOWN     whether a complete polygon is PH, as a condition on legs and angles
                                        Zheng, Wang & Yang, JCAM 296 (2016) 212–227   (septic)
              two of five legs, ends held  →  two or four curves
                                        Farouki, Pelosi & Sampoli, CAGD 103 (2023) 102192  (quintic)

              The first defines the variety. The second counts one of its slices.

    OURS      any K+1 of the 2K control points, swept by homotopy continuation
              →  the range 1 … 2^(K−1), certified path by path at degrees 3, 5, 7

                    degree 3    1→2  2→2
                    degree 5    1→4  2→3  3→4  4→4
                    degree 7    1→6  2→8  3→4  4→10  5→8  6→8  7→4  8→8

              2^(K−1) requires both ends held, and holding both ends gives an even count.
              The count is 1 for K in a row from an end plus one more that is not the far
              end: there the equations are a square root and then divisions, so single-valued.


    OPEN      deg 𝒱 = 2^(K−1)     the count is the degree of the PH variety,
                                  and a grip is a linear slice of it.`}
        </div>

        <p style={{ fontSize: '0.62em', color: '#94a3b8', marginTop: '0.55em', lineHeight: 1.5 }}>
          Canonical form <span style={{ fontFamily: 'ui-monospace, monospace' }}>r(0)=0, r(1)=1</span>{' '}
          is the ends-held mode. Where their leg pairs coincide with control-point subsets, the
          counts agree. The odd counts require a free endpoint, which canonical form excludes.
        </p>
      </>
    ),
    notes:
      'THIS SLIDE COMES AFTER THE FIGURE ON PURPOSE: explain what they have just felt. ' +
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
        <h2>The same grip in space leaves a family</h2>
        <SpatialSubsetFigure />
      </>
    ),
    notes:
      'THE SAME GESTURE, ONE GEOMETRY UP, and the answer changes in kind rather than in size. ' +
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
  // SECTION II — RATIONAL. One denominator, one new actor, two writings.
  //
  // The pole pair had no act header after the cut: everything through the spatial grip slide is
  // polynomial, and slide 9 opened cold on x = q/W. This divider does for the rational act what
  // the section-I divider does for counting — one equation, one consequence, and the rows are the
  // slides that follow. (The OLD section-II divider — "Rational, twice", integrate or don't — is
  // parked with its act in ph-interpolation-wip; this one promises only what the pole pair shows.)
  // ---------------------------------------------------------------------------
  {
    type: 'title',
    content: (
      <>
        <h1>II &mdash; Rational</h1>
        <div className="subtitle" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.62em', whiteSpace: 'pre', lineHeight: 2.0, textAlign: 'left', display: 'inline-block', marginTop: '0.9em' }}>
{`x = q/W          ‖q′W − qW′‖² = ρ²             the same PH, one denominator later
                                               ρ = the speed numerator:  ‖x′‖ = ρ/W²

W(r) = 0         a POLE, and N(r) = −q(r)·W′(r)
                 at a SIMPLE pole,  soft  ⟺  ⟨q(r), q(r)⟩ = 0

                 unknowns                              identities

PROJECTIVE       (P, w, ρ)                             ‖q′W − qW′‖² = ρ²          (PH)
                 points, weights, speed coefficients   a curve of points for free

MÖBIUS           (C, h)                                ⟨C,C⟩ = 0     a curve of POINTS
                 control spheres in ℝ⁴′¹,              ⟨C′,C′⟩ = h²  (PH)
                 speed coefficients                    and ρ = h·W, exactly

convention:  one letter per object — the curve is C(t) = Σ CₖBₖ(t), its coefficients are Cₖ.
             W = Σ wₖBₖ is the one case change, wₖ being the weights.`}
        </div>
      </>
    ),
    notes:
      'ONE DENOMINATOR, ONE NEW ACTOR. The PH condition barely changes on becoming rational: '
      + 'x = q/W gives x-prime = N/W^2 with N = q-prime W - q W-prime, and PH still says "a perfect '
      + 'square" -- ||N||^2 = rho^2, the same demand one denominator later. What is genuinely new is '
      + 'the root of W: the curve has a POLE there, and the whole act is about what happens to the '
      + 'SPEED at one. This deck does not argue what rationality BUYS (exact arc lengths, circles, '
      + 'the Moebius orbit) -- that argument belongs to the parked second half; here rationality is '
      + 'taken and the pole is studied. '
      + 'RHO IS ONE OBJECT, NAMED TWICE ON THIS SLIDE, and Eric-s own reading caught that the first '
      + 'version left the identification implicit: the rho in ||q-prime W - q W-prime||^2 = rho^2 '
      + 'IS the rho of (P, w, rho) -- the speed numerator, the projective model-s third unknown, '
      + 'with ||x-prime|| = rho/W^2. And the Moebius model-s h is the SAME quantity in its own '
      + 'clothes: rho = h W exactly, which is the conversion conformalAsRat performs and the reason '
      + 'one lab can hold both models. Both identifications are now printed. '
      + 'THE UNKNOWNS/IDENTITIES TABLE AND THE CONVENTION LINE were both rewritten twice under '
      + 'Eric-s reading (2026-08-24), and the record matters so neither regresses. FIRST ATTEMPT: '
      + 'projective shown as a data triple, Moebius as its defining conditions -- he asked why one '
      + 'model is coefficients and the other functions, and the answer is that NEITHER is: both '
      + 'models are coefficient data plus polynomial identities ((P, w, rho) with one identity; '
      + '(C, h) with two), exactly the code-s Rat and ConformalPHCurve. SECOND ATTEMPT said '
      + '"capitals are polynomials", which is false twice on its own slide (P and C are capitals '
      + 'and hold control data). The convention actually in force is the standard Bezier one, now '
      + 'printed: ONE LETTER PER OBJECT, the curve with (t), the coefficients with a subscript -- '
      + 'C(t) = Sigma C_k B_k(t) -- and W = Sigma w_k B_k is the single case change, w_k being the '
      + 'weights. So <C,C> = 0 is about the curve and (C, h) lists coefficients with no collision, '
      + 'and P means control points everywhere in the deck. '
      + 'WHY RHO IS AN UNKNOWN AT ALL, since it will be asked of the table: PH says ||N||^2 is the '
      + 'square OF SOME POLYNOMIAL, and to make "of some polynomial" into equations you NAME the '
      + 'polynomial and match coefficients -- rho is the name, and the solver moves its '
      + 'coefficients like any others. h is the SAME design decision in the Moebius model, and '
      + 'rho = h W is the dictionary between the two names. '
      + 'THE MIDDLE ROW IS TWO LINES OF ALGEBRA, and it is worth doing them aloud once, here, so the '
      + 'lab slides can just point. At a SIMPLE root r of W -- the qualifier is on the slide, '
      + 'because at a doubled root the argument says NOTHING and the lab keeps a specimen of '
      + 'exactly that -- the q-prime W term of N dies, so N(r) = -q(r) W-prime(r); substitute into '
      + '||N||^2 = rho^2 and rho(r)^2 = <q(r),q(r)> * W-prime(r)^2. So the speed numerator survives '
      + 'the pole exactly when <q(r),q(r)> = 0 -- SOFT -- and that single number is the act-s '
      + 'protagonist. '
      + 'SAY BILINEAR, NOT HERMITIAN, because at a complex pole the temptation is |q|^2. The form '
      + 'is <q,q> = sum q_i^2, complex BILINEAR: with q = a + i b it reads '
      + '(|a|^2 - |b|^2) + 2i<a,b>, so soft is |a| = |b| AND a perpendicular to b -- two vectors of '
      + 'equal length at right angles, which is what the readout draws. |q|^2 = 0 would force '
      + 'q(r) = 0 outright, a different and wrong condition. '
      + 'THE MODEL ROWS ARE DELIBERATELY PARALLEL -- same two columns, same meanings -- because the '
      + 'pair-s slides open on instruments and someone should be told the unknowns first. '
      + 'PROJECTIVE: exactly what a NURBS editor already has -- control points and weights -- plus '
      + 'rho-s coefficients, and ONE identity to satisfy, PH. MOEBIUS: control points that are '
      + 'WEIGHTED SPHERES in R^{4,1} (the centres are the rational-Bezier control points, the ends '
      + 'are point-spheres), plus h-s coefficients, and TWO identities: <C,C> = 0 -- it is a curve '
      + 'of points -- and <C-prime,C-prime> = h^2 -- it is PH. '
      + 'AND THE COUNT OF IDENTITIES IS THE LESSON, worth saying aloud over the table: in R^3 any '
      + '(P, w) is a curve of points automatically -- pointhood is FREE and only PH costs an '
      + 'identity. In R^{4,1} pointhood itself costs the null identity, and that identity is '
      + 'exactly the one that forces every simple pole soft. The pole pair is hiding in the '
      + 'asymmetry of the identities column. '
      + 'AND THE PAIR IS AN EXPERIMENT, announced as one: the SAME specimens, written two ways, and '
      + 'the only thing that changes between the two slides is what a DRAG is allowed to do. In '
      + 'the projective model the PH condition is restored around your gesture and nothing protects '
      + '<q,q> at the poles -- watch |a| and |b| come apart. In the Moebius model, <C,C> = 0 '
      + 'evaluated at a root of W forces <q,q> = 0 identically, so softness cannot break because '
      + 'the model cannot write the broken state. A property maintained by a solver versus a '
      + 'property carried by the representation -- that is the pair, and it is the deck-s '
      + '"representations" claim at its smallest. '
      + 'PROVENANCE, so the claim discipline holds at the act boundary too: the (P, w, rho) side is '
      + 'the standard rational Bezier data with PH imposed coefficient by coefficient; the R^{4,1} '
      + 'side is the conformal construction whose weighted-sphere control polygon has NO search '
      + 'hits so far -- "not found", not "new", and Choi, Lee & Moon is the paper to read before '
      + 'anyone says otherwise.',
  },

  // ---------------------------------------------------------------------------
  // 9 / 10 — THE POLE LAB. Two slides, one instrument, and the number beside the verdict.
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>A pole is soft or hard, and one number decides it</h2>
        <PoleLab model="projective" />
      </>
    ),
    notes:
      'THE LAB SLIDE, and the first of a pair. Rational PH curves have poles, and a pole is SOFT ' +
      'or HARD. The whole decision is one number, and it is two lines of algebra to get to it: ' +
      'for x = q/W, at a root r of W the hodograph numerator is N(r) = -q(r)W\'(r), because the ' +
      'q\'W term dies. Substituting into the PH condition ||N||^2 = rho^2 gives ' +
      'rho(r)^2 = <q(r),q(r)> * W\'(r)^2, so at a SIMPLE pole the pole is soft exactly when ' +
      '<q(r),q(r)> = 0. Everything the button prints is that. docs/POLE_ALGEBRA.md has every step. ' +
      'WHY THE READOUT SHOWS TWO VECTORS. At a complex pole q(r) is a complex 3-vector, which is ' +
      'six numbers with i in them. Write q(r) = a + i*b and <q,q> = (|a|^2-|b|^2) + 2i<a,b>, so ' +
      'SOFT means |a| = |b| AND a perpendicular to b -- two lengths and an angle, three real ' +
      'numbers you can read aloud. That is the picture: two vectors of equal length at right ' +
      'angles. Drag a control point here and watch them come apart. ' +
      'THE NUMBER IS SHOWN BESIDE THE VERDICT ON PURPOSE. The threshold between soft and hard is ' +
      'ours, not the mathematics\', so the slide shows what the label was read from. A test moves ' +
      'that threshold to absurd values and checks the label flips while the number does not. ' +
      'THE SPECIMENS ARE CHOSEN, NOT SAMPLED. Each is a curve whose character is settled by ' +
      'algebra: the lambda-chart quartic has one real simple pole and sigma = 8.21; the MIXED one ' +
      'carries two soft poles and one hard in the same curve; and two of them are cases where the ' +
      'QUESTION IS MALFORMED and the readout says so instead of answering -- a DOUBLE real pole, ' +
      'where W\'(r) = 0 makes N(r) = 0 whatever q does, and a pole whose numerator CANCELS, where ' +
      'the fraction reduces and there is no pole at all. Those two are in the lab because they are ' +
      'the cases that catch people, and one of them caught this deck: the first version of section ' +
      '6 of the algebra document was FALSE for exactly the doubled-pole reason. ' +
      'ODD DEGREE CARRIES A THEOREM HERE. A real polynomial of odd degree has a real root, so an ' +
      'odd-degree curve always has a real pole -- and a genuine simple real pole is always hard. ' +
      'So no odd-degree curve with genuine simple poles can be all-soft, which is the parity ' +
      'theorem of the conformal model arrived at from this side with no conformal model in it. The ' +
      'lab shows it by simply having no odd-degree soft specimen to offer.',
  },

  {
    type: 'content',
    content: (
      <>
        <h2>In the Möbius model you cannot make a pole hard</h2>
        <PoleLab model="mobius" />
      </>
    ),
    notes:
      'THE SECOND OF THE PAIR, and the same instrument reading the same curves. What changes is ' +
      'what a DRAG is allowed to do. ' +
      'The conformal representation is C = (W, q, cinf) with the null condition <C,C> = 0, which ' +
      'as a polynomial identity reads ||q||^2 = 2*W*cinf. Evaluate that at a root of W and the ' +
      'right side is zero, so <q(r),q(r)> = 0 -- every pole is soft, automatically, with no ' +
      'reference to PH at all. Nothing was chosen; the model cannot express anything else. So drag ' +
      'wherever you like: |a| = |b| and the right angle do not move. ' +
      'THE SAME CURVE, BOTH SLIDES. C converts to (P, w, rho) exactly, by P = q/W and rho = h*W, ' +
      'so the conformal specimens are legal members of the projective slide too and the two open ' +
      'on the same thing. Measured: the control points differ by 0.0e+0. The difference is the ' +
      'solver, not the curve. ' +
      'WHERE A HARD POLE HIDES, and the lab has the specimen. The identity above needed W\'(r) != 0. ' +
      'At a DOUBLED root it says nothing -- and that is the only room a null curve has. Lift the ' +
      'hard quartic as (2w^2, 2wq, ||q||^2) and it appears at conformal degree 8 with every pole ' +
      'doubled and the numerator cancelling there. The readout refuses to call it a pole, which is ' +
      'right: it is not a curve of the model\'s own degree. One drag splits the double root and ' +
      'everything comes back soft. Hard to soft, never back. ' +
      'AND THE DEGREES ARE EVEN, WHICH IS A THEOREM. ||q||^2 is a sum of real squares, so each of ' +
      'its real roots has EVEN multiplicity; from ||q||^2 = 2*W*cinf that makes ' +
      'mult(W) + mult(cinf) even, so (t-r) divides cinf exactly when mult(W) is odd. An odd-degree ' +
      'W must have a real root of odd multiplicity, so an odd-degree member always factors -- it ' +
      'is a lower-degree curve in disguise. That is why this slide offers only even degrees, and ' +
      'it is not a limitation of the search. It already cost this deck two slides that were ' +
      'drawing quartics inside quintic polygons.',
  },
]

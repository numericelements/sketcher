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
// CUT TO NINE SLIDES (2026-08-24): the deck now ends at the Möbius pole lab, and everything
// after it — the rest of section I (spatial counting, the torus, the RMF slides), all of
// section II, the gap, and "what is open" — is PARKED VERBATIM in ../ph-interpolation-wip/,
// unlisted, while these nine are refined. Slides graduate back one at a time. Two artifacts of
// the cut to fix as part of that refinement: the OUTLINE slide still promises section II, and
// the header above still describes the full arc.
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
      + 'every word of the subtitle is earned by a section: SOLUTION STRUCTURE is the counting slides '
      + '(ten degrees of freedom against nine conditions leaving a curve; fourteen against twelve '
      + 'leaving a torus), TWO REPRESENTATIONS is the spine of the whole second half, and INTERACTIVE '
      + 'CONTROL is what you do in both. '
      + 'WHAT THE SUBTITLE USED TO SAY, and why it changed: "solution structure, selection, and '
      + 'interactive motion" named the old five-act plan. Two of its three words had stopped pointing '
      + 'at anything -- nothing in the deck SELECTS among interpolants any more, and "motion" meant '
      + 'dragging-as-transport, monodromy and holonomy, which never got its slide. The fault was not '
      + 'that the subtitle had three parts; it was that two of them were empty. '
      + '"INTERACTIVE CONTROL" ECHOES THE OTHER DECK deliberately -- cs2026 is "Interactive Control of '
      + 'Curvature Extrema and Inflections on B-Spline Curves". Read side by side the two titles say '
      + 'one thing about the programme: interactive control over hard constrained curve families. '
      + 'AND "RATIONAL FRAMES" CAME OFF, because frames hold three slides of twenty-nine and a '
      + 'co-headline sends a frames specialist to the wrong document. The frame argument itself is not '
      + 'lost -- it opens section I, where it belongs: |e|^2 = 1 forces the leading coefficient to '
      + 'vanish, so a moving unit frame can never be polynomial. The polynomial object is the spinor; '
      + 'the frame is rational because normalising by sigma = |A|^2 is a division. '
      + 'WHAT IS DELIBERATELY NOT HERE: the sphere construction. It is the candidate contribution and '
      + 'it is tempting, but RATIONAL_PH_STATE 12.4 says "not found", not "new" -- putting it in the '
      + 'title would stake a claim the document itself declines to make.',
  },
  // ---------------------------------------------------------------------------
  // 2 — THE MAP. The slide someone reads in thirty seconds to know what this is.
  //
  // This deck is circulated BEFORE the discussion, so slide 2 has to do two jobs at once: say what
  // the object is, and say what is being asked. The table is the whole document in four cells — and
  // the claim is visible in it, because the bottom-right cell has TWO entries and the second half of
  // the deck is about why.
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Outline</h2>

        <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.72em', whiteSpace: 'pre', lineHeight: 1.55, margin: '0.2em 0 0.45em 0.6em', color: '#475569' }}>
{`                     plane                        space

   polynomial        r′ = w²                      r′ = 𝒜 i 𝒜*,   𝒜 = u + v j
                     one complex polynomial       two complex polynomials

   rational          n and h free — the dual      integrate:  r′ = 𝒜 i 𝒜* / (poles)²
                     PH is an IDENTITY            or don't:   ⟨P,P⟩ = 0     — points
                                                              ⟨P′,P′⟩ = h²  — PH`}
        </div>

        <p style={{ fontSize: '0.72em', color: '#64748b', marginTop: '-0.25em', marginBottom: '0.4em' }}>
          P is the curve itself, written in ℝ⁴′¹ &mdash; the model where a point is a sphere of
          radius zero. In each cell the same gesture: hold control points and count the curves, or
          hold one and let the solver place the rest.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '1.4em', rowGap: '0.55em', margin: '0.1em 0 0.5em 0.3em', lineHeight: 1.45 }}>
          <div><strong>I &mdash; Polynomial</strong></div>
          <div style={{ color: '#475569' }}>
            the plane &mdash; how many curves fit the points you hold<br />space<br />rational frame
          </div>

          <div><strong>II &mdash; Rational, twice</strong></div>
          <div style={{ color: '#475569' }}>
            the spinor &mdash; integrate, and its chart<br />
            ℝ⁴′¹ &mdash; never integrate, and its solver<br />
            where the two do not meet, and what is open
          </div>
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
      + 'becomes TWO. That is the Hopf form -- A = u + v j -- and it is why the two-valued square root '
      + 'becomes a CIRCLE of square roots, since (u,v) and (u e^{i theta}, v e^{-i theta}) give the '
      + 'same hodograph. Note the phases are OPPOSITE in the pair, which is what a common phase in the '
      + 'quaternion looks like from here. Section I is that sentence. '
      + 'SAY THAT u AND v ARE COMPLEX, because the letters collide with the field-s own convention: '
      + 'Farouki writes A = u + v i + p j + q k with u, v, p, q all REAL and calls the complex pair '
      + 'alpha, beta. Ours are their alpha and beta. The line under the equation says "two complex '
      + 'polynomials" for exactly this reason -- and alpha was not available as a name, being the '
      + 'closure gauge angle later in section I. If someone reads u and v as two of four reals and '
      + 'asks where the other two went, that is the confusion, and it is answered in one sentence. '
      + 'READ THE BOTTOM ROW ACROSS and it says what BREAKS. In the plane, Pottmann-s dual makes '
      + 'rational PH an IDENTITY -- |n-prime|^2 = 4 u-prime^2 / delta^2 is a perfect square for every '
      + 'u, so n and h are free and there is nothing to solve. In space no representation does that. '
      + 'PH is still free, but the INTEGRAL must stay rational and that binds A pole by pole. '
      + 'EXACTLY ONE CELL BINDS. That is the thesis, and the table is left to say it. An earlier '
      + 'version spelled it out underneath -- "leaving the plane does not make PH harder, it makes '
      + 'rationality stop being free" -- and it was cut: a specialist would rather reach that from the '
      + 'table than be told it, and a paragraph of interpretation under a clean table reads as if the '
      + 'table could not stand on its own. Say it OUT LOUD instead, if the room needs it. '
      + 'WHAT WENT WITH IT, and where it went: the line "half a dozen ways to pay for that, this deck '
      + 'follows two". That was doing a real job -- pre-empting the specialist who spends twenty '
      + 'minutes wondering whether Pottmann has been heard of. It belongs at the head of section II as '
      + 'its own slide, where the alternatives can be SHOWN rather than asserted. Until that slide '
      + 'exists, say the sentence aloud here. '
      + 'THE DENOMINATOR IS WRITTEN "(poles)" ON PURPOSE. The planar generator is w and the spatial '
      + 'denominator is also w in our own documents -- two different objects, one letter, and on this '
      + 'table they would sit side by side. Alpha is taken (the closure gauge angle in section I), so '
      + 'the honest fix is the word. Section II says it with the letter and labels it there. '
      + 'AN EARLIER VERSION OF THIS SLIDE PUT x = C A^{-1} in the bottom-right cell -- the H P^1 '
      + 'column from core/sp11RationalPH. It is a real object and Moebius is linear on it, but the '
      + 'deck never teaches it, so the outline was promising a representation that no slide delivers. '
      + 'Corrected. If the sigma = 0 work makes the column load-bearing it earns slides and the title '
      + 'honestly becomes three representations; until then it stays in the repo. '
      + 'THE FOURTH THING IS NOT A CELL, and say it that way: the conformal model is not another '
      + 'hodograph form, it is a refusal to integrate. That is the real dividing line of section II. '
      + 'THE SECTIONS map onto the things worth separating: 2D polynomial, 3D polynomial, the '
      + 'rational frame; then the two ways to build a rational PH curve, and where they fail to meet. '
      + 'THE GESTURE LINE UNDER THE TABLE is the deck-s spine and is worth reading aloud. Each cell '
      + 'of the table can be shown twice: hold the maximum number of control points and the answer is '
      + 'a COUNT (strict), or hold one and 2K spare degrees of freedom are spent by minimum-norm '
      + '(free). Only the top-left cell has that figure today; the other three are the plan, which is '
      + 'why the outline does not promise them. '
      + 'THE AIM LINE AT THE BOTTOM is the reason the deck exists and was previously left implicit. '
      + 'Section I already ends on what locality costs, so the deck arrives there either way — this '
      + 'says it at the start instead. '
      + 'III WAS FOLDED INTO II rather than deleted: "where the two do not meet, and what is open" is '
      + 'the last line of section II. The two slides still exist in the deck. If they stay a separate '
      + 'act, restore the third row. '
      + 'THE PROMISE PARAGRAPH IS GONE, and it was made redundant rather than dropped. It said the '
      + 'document is circulated for discussion (the title slide says that), that sources are named and '
      + 'measurements carry their numbers (the slides do that where it matters, and saying so in '
      + 'advance is weaker than doing it), and that the open questions are collected at the end -- '
      + 'which the section list now SHOWS, since III ends on "what is open". A promise the structure '
      + 'already keeps does not need making. '
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
{`Bézier      A x = b                    one

PH          xᵀ Qⱼ x = bⱼ               2ᵏ⁻¹      points on the curve
                                       1 … 2ᵏ⁻¹  control points

in space    the same forms over ℍ      a family, not a count

                                       k = deg 𝒜 + 1`}
        </div>
      </>
    ),
    notes:
      'THE SECTION IS THREE ROWS AND THEY ARE THE SLIDES THAT FOLLOW. Linear, then quadratic, then '
      + 'quadratic-but-underdetermined -- and the answers go one, a count, a family. '
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
      + 'the fibre is the circle Z0 exp(phi i) -- slide 7 has the closed form. k = 3 gives four, and a '
      + 'TORUS with one dial per end (phi_0, phi_2) -- slide 8. '
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
      + 'is k-1 (slide 7: ten degrees of freedom, nine conditions, a curve). With C1 HERMITE the nine '
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
      + 'family comes from the system being UNDERDETERMINED. Slide 8-s note still reads as causal and '
      + 'should be corrected when that slide is next touched. '
      + 'WHAT THIS SLIDE USED TO SAY, so it is not restored by accident: "the square becomes a sandwich '
      + 'and the square root becomes a circle of square roots", and "|e|^2 = 1 forces the leading '
      + 'coefficient to vanish, so a moving unit frame can never be polynomial". Both were shaped to '
      + 'sound good rather than to be checked. The frame argument is not lost -- slide 10 makes the '
      + 'positive version at the point of use: the frame is A k A* over sigma, and RATIONAL because '
      + 'sigma = |A|^2 is a polynomial. Say it there, not here.',
  },

  // ---------------------------------------------------------------------------
  // 3 — the price of PH, stated as a dimension count
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
  // 3b — the count is not a property of the FAMILY, it is a property of your GRIP
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
  // 3c — what is published, what we add, and the one equation under both
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

    OURS      any odd degree, any K+1 of the 2K control points
              →  the range 1 … 2^(K−1), certified path by path

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
  // 3d — DRAFT, placed for testing. The same grip in space. If it holds up it replaces the
  //      spatial-cubic slide below, which it subsumes: {P₀,P₁,P₃} at degree 3 IS that slide.
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
      'THE CIRCLES ARE REAL WHERE THEY ARE DRAWN. Degree 3 tours its ellipse with the cubic slide\'s ' +
      'own continuation, so the dial wraps and the grey loop is the whole fibre. Degree 5 ends-held ' +
      'IS the quintic Hermite grip — the next-but-one slide\'s grip, the same four points — so both ' +
      'dials are the Hopf angles phi0 and phi2, they wrap, and the loci close to 1e-16. Degree 7 has ' +
      'no closed form, so its dials are chart coordinates and the loci are drawn as the ARCS they ' +
      'reach. Nothing claims a circle where there is not one. ' +
      'PLACED FOR TESTING, not yet wired into the argument. If it holds up it should REPLACE the ' +
      'spatial-cubic slide that follows, which it now contains outright: {P0,P1,P3} at degree 3 is ' +
      'that slide, toured the same way. The spatial-quintic torus after it is a harder call than it ' +
      'was — this figure reproduces its grip, its two angular dials and its closed loci — so what ' +
      'that slide still owns alone is the alpha/beta CHANGE OF BASIS and the arc-length invariant, ' +
      'which is its actual lesson.',
  },

  // ---------------------------------------------------------------------------
  // 8 / 9 — THE POLE LAB. Two slides, one instrument, and the number beside the verdict.
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

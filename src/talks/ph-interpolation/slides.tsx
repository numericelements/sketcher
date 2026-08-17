// ============================================================================
// Pythagorean–Hodograph Curves
//   Solution structure, two representations, and interactive control
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
// ============================================================================
import type { SlideDefinition } from '../framework/types'
import ThreePointsFigure from './ThreePointsFigure'
import PinnedEndsFigure from './PinnedEndsFigure'
import QuinticHermiteFigure from './QuinticHermiteFigure'
import SpatialCubicFigure from './SpatialCubicFigure'
import QuinticHermiteSpatialFigure from './QuinticHermiteSpatialFigure'
import RmErfFigure from './RmErfFigure'
import RmErfSplineFigure from './RmErfSplineFigure'
import MobiusFigure from './MobiusFigure'
import RationalPHCurveFigure from './RationalPHCurveFigure'
import SexticFivePointFigure from './SexticFivePointFigure'
import RationalPHLoopFigure from './RationalPHLoopFigure'
import RationalPHTwoPoleFigure from './RationalPHTwoPoleFigure'
import IndicatrixFigure from './IndicatrixFigure'
import IndicatrixTwoPoleFigure from './IndicatrixTwoPoleFigure'
import RationalCubicFigure from './RationalCubicFigure'
import IndicatrixCubicFigure from './IndicatrixCubicFigure'
import SharedIndicatrixFigure from './SharedIndicatrixFigure'
import ComplexRationalPHFigure from './ComplexRationalPHFigure'
import CanalSurfaceFigure from './CanalSurfaceFigure'
import ConformalSphereFigure from './ConformalSphereFigure'
import SpherePencilFigure from './SpherePencilFigure'
import ThreeSphereFigure from './ThreeSphereFigure'
import WhenActive from '../framework/slideContext'

export const slides: SlideDefinition[] = [
  // ---------------------------------------------------------------------------
  {
    type: 'title',
    content: (
      <>
        <h1>Pythagorean–Hodograph Curves</h1>
        <div className="subtitle">Solution structure, two representations, and interactive control</div>
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

        <p style={{ fontSize: '0.72em', color: '#64748b', marginTop: '-0.25em', marginBottom: '0.5em' }}>
          P is the curve itself, written in ℝ⁴′¹ &mdash; the model where a point is a sphere of
          radius zero.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '1.4em', rowGap: '0.55em', margin: '0.1em 0 0.6em 0.3em', lineHeight: 1.45 }}>
          <div><strong>I &mdash; Polynomial</strong></div>
          <div style={{ color: '#475569' }}>
            the plane<br />space<br />rational frame
          </div>

          <div><strong>II &mdash; Rational, twice</strong></div>
          <div style={{ color: '#475569' }}>
            the spinor &mdash; integrate, and its chart<br />
            ℝ⁴′¹ &mdash; never integrate, and its solver
          </div>

          <div><strong>III &mdash; The gap</strong></div>
          <div style={{ color: '#475569' }}>
            where the two do not meet<br />what is open
          </div>
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
      + 'THE THREE SECTIONS map onto the six things worth separating: 2D polynomial, 3D polynomial, '
      + 'the rational frame; then the two ways to build a rational PH curve; then the chart and the '
      + 'optimizer. Six is a list, three is a story, and the six survive as beats inside the three. '
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

PH          xᵀ Qⱼ x = bⱼ               2ᵏ⁻¹

in space    the same forms over ℍ      Tᵏ⁻¹

                                       k = deg 𝒜 + 1`}
        </div>
      </>
    ),
    notes:
      'THE SECTION IS THREE ROWS AND THEY ARE THE SLIDES THAT FOLLOW. Linear, then quadratic, then '
      + 'quadratic-but-underdetermined -- and the answers go one, a count, a family. '
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
      + 'PROVES the count for that instance rather than suggesting it. The septic case had not been '
      + 'computed anywhere in this repo before. '
      + 'T^{k-1} IS WEAKER AND SAY SO IF ASKED. The DIMENSION k-1 is arithmetic in space too: 4k '
      + 'unknowns, less 1 for the gauge circle, less 3k conditions, leaves k-1. But that the family is '
      + 'a TORUS -- a product of circles -- is topology, and it is verified only at k = 2 (the fibre is '
      + 'the circle Z_0 exp(phi i), closed form on slide 7) and k = 3 (a torus, one dial per end, slide '
      + '8). At k = 4 the dimension is 3 and the topology is unknown. '
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
  // 4 — codimension, felt: grab one point and two move
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Grab one control point and two move</h2>
        <PinnedEndsFigure />
      </>
    ),
    notes:
      'On the PH variety, "move one control point and freeze the others" is not a motion at all — it ' +
      'leaves the variety. Codimension, not solver weakness, and worth hitting deliberately here ' +
      'rather than letting someone discover it later as a bug. ' +
      'STRICT: pin P₀,P₃ — 6 DOF − 4 conditions = 2, exactly one point of freedom (forced, not ' +
      'chosen). One interior point is the handle and the other follows, via r² + r + (1 − D/q) = 0, ' +
      'two branches. Click the grey curve for the other branch; click the hollow point to take hold ' +
      'of IT instead, which is seamless because r identifies the CURVE, not which point you ' +
      'prescribed (pinned as "THE SWAP IS CONTINUOUS" in phCubic.test.ts). ' +
      'FREE: release the pins and any of the four is grabbable — 6 DOF against 2 conditions, so 4 ' +
      'are spare and minimum-norm spends them (dragged point to the cursor, everything else as ' +
      'little as possible). The PH residual readout sits at ~1e-16 throughout: the curve cannot ' +
      'leave the manifold, because free mode parameterises by the generator. ' +
      'The toggle is two rows of the trichotomy in one button, and it corrects an earlier claim of ' +
      'mine — there is nothing for an optimizer to choose only while the ends are PINNED. ' +
      'Not drawn: the cusp-forced segment (P₃ → P₀+(4/3)D, where every branch cusps) and the branch ' +
      'point P₀+(4/3)D where the roots merge at r = −1/2. Both verified, both a second and third ' +
      'lesson crowding the first; monodromy earns its own slide.',
  },

  // ---------------------------------------------------------------------------
  // 5 — the classical count: C¹ Hermite has four PH quintic interpolants
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>C¹ Hermite data: four interpolants, always</h2>
        <QuinticHermiteFigure />
      </>
    ),
    notes:
      'The classical result made draggable: "in general four distinct planar PH quintic interpolants ' +
      'to given C¹ Hermite data always exist" (Farouki–Neff; 2019 survey §21). ' +
      'Note ALWAYS — unlike the cubic there is no existence condition, because the unknowns are ' +
      'COMPLEX: w₀ = ±√d₀ and w₂ = ±√d₁ always exist, and closure is a complex quadratic in w₁ with ' +
      'two roots. Two relative signs (the overall sign is a gauge) × two roots = four. Contrast the ' +
      'cubic, where the free unknown is a real POSITIVE magnitude, which is exactly why it can fail. ' +
      'Dragging control points IS prescribing Hermite data for a quintic: P₁ = P₀ + d₀/5 and ' +
      'P₄ = P₅ − d₁/5, so {P₀,P₁,P₄,P₅} is position + tangent at both ends. 8 real conditions on 8 ' +
      'real DOF — square, and the lesson is that a square NONLINEAR system has a solution COUNT. ' +
      'P₂ and P₃ are the two the data does not fix, drawn hollow. ' +
      'R = ∫|κ|ds is the survey\'s recommended selector for the "good" interpolant (eq. 25); the ' +
      'readout says whether the one you are on is the fairest. ' +
      'This slide exists to set up the next one: in SPACE the same problem has a TWO-PARAMETER ' +
      'FAMILY (14 DOF − 12 conditions), so finite choice becomes a continuum. That jump is the ' +
      'deck\'s central move. ' +
      'Four branches need continuous tracking or the colours jump as the data moves — matched by ' +
      'control-polygon distance, exactly (4! = 24 permutations enumerated), see ' +
      'framework/branchTracking. The world box is computed once from the starting data so all four ' +
      'fit; some branches are far larger than others, so guessing it by hand gets it wrong.',
  },

  // ---------------------------------------------------------------------------
  // 6 — the first spatial slide: finite choice becomes a continuum
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Ten degrees of freedom, nine conditions — the tenth is a curve</h2>
        {/* WebGL: mounted only near the showing slide, or a deck of 3D figures
            exhausts the browser's live-context budget. See framework/slideContext. */}
        <WhenActive>
          <SpatialCubicFigure />
        </WhenActive>
      </>
    ),
    notes:
      'The deck\'s central jump, at the smallest degree where it happens. EITHER interior point can ' +
      'be the handle (press the pale one — seamless, because prescribing P₂ with the ends pinned IS ' +
      'prescribing P₁ from the other end), and the strict/free toggle is slide 4\'s, with SEVEN spare ' +
      'degrees of freedom in free mode against the plane\'s four. ' +
      'THE FAMILY IS ISOMETRIC: every member has the same arc length (measured, then proved), so the ' +
      'classical fairness measure that ranks planar interpolants is blind here. AND IT CONTAINS SLIDE ' +
      '4: exactly two members are PLANAR — the plane problem\'s two discrete answers, drawn as dark ' +
      'beads. The finite set is EMBEDDED in the continuum. ' +
      'Slide 4 pinned both ends ' +
      'of a PLANAR PH cubic and dragged P₁: 6 DOF against 6 conditions, square, P₂ determined — two ' +
      'ways, discretely. Make the curve spatial and change nothing else: 10 DOF − 3 (P₀) − 3 (P₁) − ' +
      '3 (P₃) leaves ONE degree of freedom, so P₂ is not determined at all and the admissible ' +
      'positions trace a curve. Measured on the reference data: P₂ roams about 1.5× the chord — a ' +
      'large object, not a technicality. ' +
      'Where the extra dimension comes from: 10 = 8 (A₀,A₁) − 1 (gauge) + 3 (origin), and the gauge ' +
      'is the difference. In the plane w ↦ −w is DISCRETE and costs no dimension; in space ' +
      'A ↦ A(cos θ + i sin θ) is a whole circle. That one missing dimension is why the plane gives a ' +
      'count and space gives a family. ' +
      'The reduction behind it mirrors the planar r² + r + (1 − D/q) = 0: substituting A₁ = A₀z makes ' +
      'A₀ factor out of closure, leaving i z* + z i + 2 z i z* = F — three quadratics in four ' +
      'unknowns, hence the curve. Sanity anchor: the straight line is z = 1, F = (4,0,0). The fiber IS ' +
      'traced by continuation along the exact null direction of the 3×4 Jacobian here ' +
      '(core/phSpatialCubic, 22 tests), but it DOES have a closed form: with Z = z + ½ the reduction ' +
      'becomes the single sandwich 2 Z i Z* = F + i/2, so the fiber is the circle Z₀·exp(φi) — which ' +
      'is why it closes, why arc length is constant (|Z|² is forced), and why it is an ellipse. Do ' +
      'not say "no closed form"; the retrofit is deferred, not the fact. See docs/PH_SANDWICH_CHAIN.md. ' +
      'Sets up the spatial QUINTIC, where C¹ Hermite data has a TWO-parameter family — slide 5\'s ' +
      'four discrete interpolants become a surface of them.',
  },

  // ---------------------------------------------------------------------------
  // 7 — the spatial twin of slide 5: four discrete answers become a torus
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Fourteen degrees of freedom, twelve conditions — the last two are a torus</h2>
        <WhenActive>
          <QuinticHermiteSpatialFigure />
        </WhenActive>
      </>
    ),
    notes:
      'THE DECK\'S CENTRAL MOVE, said at the same degree and with the same gesture as slide 5, so ' +
      'the only thing that differs is the dimension of the answer: four discrete interpolants become ' +
      'a two-parameter family. ' +
      'THE FOUR BLUE POINTS ARE THE DATA — an identity, not an analogy: P₁ = pᵢ + dᵢ/5 and ' +
      'P₄ = p_f − d_f/5, so dragging them IS prescribing C¹ Hermite data. Twelve conditions, drawn, ' +
      'with no tangent handles to explain. 14 − 12 = 2, and the grey pair rides what is left. ' +
      'ARC LENGTH DEPENDS ON β ALONE — demonstrate it, do not assert it: turn α end to end and the ' +
      'readout does not move a digit. WHY, in one sentence: α is the closure spinor\'s own gauge angle ' +
      'in disguise. Moving α and then undoing the global gauge leaves A₀ and A₂ EXACTLY fixed and ' +
      'spins B around its solution circle (verified to 1e-16), and |B|² = |d| is forced by the ' +
      'sandwich with d depending on β alone. So the α-dial IS slide 6\'s fiber, one link further ' +
      'along the chain. The ghosts all sit on that circle, so they share the live curve\'s length. ' +
      'Exact closed form, verified to 1.8e-15: L = ⅛(|dᵢ|+|d_f|) − 1/12⟨A₀,A₂⟩ + 1/120|d|, and the ' +
      'α-dependent cross term ⟨B,S⟩ cancels between ⟨A₁,S⟩ and ⅔|A₁|². ' +
      'THE TOGGLE IS A LESSON, not a convenience. φ₀,φ₂ is one dial per END and the HONEST torus — ' +
      '[0,2π)², period 2π each, no identifications — but the invariant is DIAGONAL (move both ' +
      'together). α,β has determinant 1 but ½ entries, so it is NOT in GL(2,ℤ) and does not preserve ' +
      'the period lattice: α period 2π, β period 4π, plus the gluing (α+π, β+2π) ≡ (α,β), so the ' +
      'rectangle DOUBLE-COVERS the torus. Ugly domain, but the invariant is now AXIS-ALIGNED. You ' +
      'shear coordinates to make a conserved quantity a coordinate and pay in the domain — ' +
      'diagonalisation. Switching is a pure relabel, so the curve does not move when you flip. ' +
      'FREE releases everything: 14 DOF against 3 conditions, ELEVEN spare, against the spatial ' +
      'cubic\'s seven and the plane\'s four. Coming back reads the data off the polygon and recovers ' +
      '(α,β) with anglesOf, which subtracts φ₁ first because a dragged curve carries an arbitrary ' +
      'global gauge. ' +
      'Gauge transport is load-bearing: the references are carried frame to frame, or the curve jumps ' +
      'when a tangent crosses −x̂ (pinned as a fails-without-it test). ' +
      'core/phSpatialQuintic (35 tests) and core/phSpatialFreeDragN (13, including exact agreement ' +
      'with the cubic module).',
  },

  // ---------------------------------------------------------------------------
  // 8 — a frame that does not twist, and survives editing
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>A frame that never turns about the tangent</h2>
        <WhenActive>
          <RmErfFigure />
        </WhenActive>
      </>
    ),
    notes:
      'THE FRAMES ACT: one degree-7 PH curve, always inside the RM-ERF class, with slide 6\'s pair of ' +
      'modes. STRICT pins the C¹ Hermite data — 16 unknowns against 14 conditions (5 class, 9 Hermite), ' +
      'rank measured at 14, so the null space is two-dimensional: one gauge and ONE real freedom. So ' +
      'there is a CURVE of untwisted interpolants to any given data and a single slider rides it — the ' +
      'spatial cubic\'s fiber, one act later, now with a frame attached. FREE releases the data: grab ' +
      'any of the eight, seven spare parameters, minimum norm spends them. ' +
      'THE STRICT MODE IS THE STRONGER DEMONSTRATION — ride the slider end to end and the frame STILL ' +
      'never turns about the tangent. That is a property of the CLASS, not of one lucky curve, and it ' +
      'is the thing to do on stage. ' +
      'THE FRAME COSTS NOTHING — it is three sandwiches, one per axis: e₁,e₂,e₃ = A i A*, A j A*, ' +
      'A k A* over σ. The same machinery as every other slide, and RATIONAL because σ = |A|² is a ' +
      'polynomial. That is the whole reason a PH curve can carry a rational frame; say it once here. ' +
      'WHY DEGREE 7 AND NOT THE RRMF QUINTIC. Two routes to a rational rotation-minimizing frame. On a ' +
      'quintic RRMF curve the ERF twists and a rational normal-plane rotation θ = −2·arctan(b/a) ' +
      'cancels it — TWO pieces, so the FRAME is high degree even though the curve is low. On these ' +
      'degree-7 curves the ERF does not twist at all, so the RMF IS the ERF — ONE piece. The survey: ' +
      '"although the curves are of higher degree than the RRMF quintics, their rational RMFs are ' +
      'actually of LOWER degree, since the rational normal-plane rotation is not required." You pay in ' +
      'curve degree or in frame degree. For an editor the second is much the better bargain: measured, ' +
      'local C² editing needs a 3-segment window for degree-7 RM-ERF against 6 for quintic RRMF, ' +
      'because a degree-7 segment has 16 unknowns and five constraints barely dent it, where a quintic ' +
      'has 12 and three hurt. Same buy-with-degree-not-with-constraint trade as the biarcs. ' +
      'THE MATHEMATICS, in one line: the ERF\'s angular velocity about the tangent is ' +
      'ω₁ = 2·scal(A i A′*)/σ² (survey eq. 13), and that numerator is EXACTLY scal(A i A′*) — the same ' +
      'scal(a i b*) form as the constraints. So "rotation-minimizing ERF" means a degree-5 polynomial ' +
      'vanishes identically, which in Bernstein coefficients is the five conditions (14). Five and not ' +
      'six, although the polynomial has six coefficients, because s(0,3) and s(1,2) enter only through ' +
      '3s(1,2)+s(0,3) — measured: those two are individually NONZERO in the class. ' +
      'WHAT TO POINT AT: the RAIL (the locus of the frame tips) runs PARALLEL to the curve instead of ' +
      'spiralling around it, and the twist readout is the MEASURED ∫|ω₁|ds sitting at machine zero ' +
      'while you drag. Both checkable; neither asserted. ' +
      'THE TRAP TO MENTION IF ASKED: every PLANAR PH curve satisfies the five constraints for free ' +
      '(for A in span{1,k} the scal terms vanish one by one), so the planar family sits inside the ' +
      'class and minimum-norm projection falls into it — four of five seeds landed with planarity ' +
      'exactly 0. A flat curve has nothing to twist about, so the starting curve is searched for and ' +
      'flat ones are refused. ' +
      'ONE FIGURE THIS DELIBERATELY DROPS: the Frenet frame\'s sudden reversal at an inflection. A ' +
      'lovely mark, but a second lesson. ' +
      'core/phSpatialSeptic, 25 tests, the first of which is the GATE: impose (14), sample ω₁, require ' +
      'machine zero. If my reading of either equation were wrong that test fails and this figure would ' +
      'never have been drawn.',
  },

  // ---------------------------------------------------------------------------
  // 9 — the same frame along a whole spline; locality measured, not promised
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>The frame along a whole spline — and what locality really costs</h2>
        <WhenActive>
          <RmErfSplineFigure />
        </WhenActive>
      </>
    ),
    notes:
      'The previous slide put a rotation-minimizing frame on ONE degree-7 Bézier and the editing felt ' +
      'excellent. The WINDOWED alternative — exact locality on a C² PH quintic spline, kept in ' +
      'docs/PH_LOCAL_EDITING.md and core/phSpatialSpline rather than on a slide — did not: three spare ' +
      'parameters moving ten control points, with far control points travelling up to 4.4x further than ' +
      'the one in your hand. So this slide takes slide 9\'s mechanism to a spline by DROPPING THE ' +
      'WINDOW: 16n+3 unknowns against 11n+3 conditions with n gauges leaves 4n spare, about 0.59 per ' +
      'movable point FOR ANY n — essentially slide 9\'s 0.67. ' +
      'THE MEASUREMENT IS THE POINT. Amplification does NOT fall monotonically with n — worst cases ' +
      '1.68 (n=2), 1.61 (n=3), 2.40 (n=4), 1.52 (n=6), 1.58 (n=8), mean 1.06–1.11 throughout — so ' +
      'quote the SHIPPED size\'s own number, not a general claim. At the shipped n=2: 15 control ' +
      'points, worst 1.68, mean 1.08, no failures on any of the fifteen, against slide 8\'s 4.44 at ' +
      'W=3 with a hard window. Nothing moves much more than the point you hold; THAT is what predictable means. ' +
      'FIFTEEN CONTROL POINTS WAS A DELIBERATE CHOICE, after 43 proved to be more handles than anyone ' +
      'can hold in mind — Eric\'s own reading of slide 8, and the reason this figure shrank. ' +
      'AND AT THIS SIZE LOCALITY IS SIMPLY ABSENT — say so plainly rather than hide it. Two segments, ' +
      'measured profile 1.00 0.92, no decay to speak of. On longer splines the same mechanism DOES ' +
      'decay (n=6: 1.00 0.99 0.77 0.59 0.39 0.20, roughly linearly, reach still n of n), so the ' +
      'trade-off story is real but it lives here in the notes. The honest claim on screen is ' +
      'PROPORTIONALITY, not locality, and the amplification and reach readouts measure it live rather ' +
      'than asserting it. (A ghost of the pre-drag curve was tried and removed: at two segments it had ' +
      'almost nothing to show, and it was a third dashed element fighting the control polygon and the ' +
      'frame rail.) ' +
      'THE FRAME COMB IS SPACED BY ARC LENGTH, not by parameter — ω₁ = dθ/ds is defined per unit arc ' +
      'length, so arc length is the frame\'s own parameter and the honest sampling for showing twist. ' +
      'It shows: σ varies about 2.4x along a member here, so parameter-uniform stations crowd at the ' +
      'slow end. Slide 9 is spaced the same way. ' +
      'So the two approaches are a genuine trade, not a progression: the windowed scheme has a guarantee ' +
      'and a bad feel, this one has a good feel and no guarantee. The window width is what you pay ' +
      'with, and the whole table is in docs/PH_LOCAL_EDITING.md. ' +
      'CONSTRUCTION, worth telling if asked, because two attempts failed by MEASUREMENT: (1) continuity ' +
      'lives in the GENERATOR — a C¹ cubic generator spline makes the curve C² for free, so the ' +
      'projection only satisfies the 5n class conditions. Building segment by segment instead, ' +
      'inheriting C¹/C² and prescribing each span, compounds the speed: |r′| ran 2.46, 1.95, 8.36, ' +
      '17.54, 72.66 at n=4 and hit 5066 by n=7 before failing. (2) The PLANAR TRAP again — planar ' +
      'curves are in the class for free, so min-norm projection lands flat (planarity 0.014 from a ' +
      'smooth seed, no better than 0.121 across six seed families). The fix is to USE THE SLACK, ~25 ' +
      'spare dimensions at n=6, and climb planarity along the class\'s own tangent space. (3) But ' +
      'climbing planarity drives |A| DOWN toward a cusp — the same small-|A| attraction that made a ' +
      'geometric drag metric fail on the windowed spline — so the ascent stops at a speed floor. ' +
      'A BUG WORTH TELLING, because Eric found it by dragging and the readouts were blind to it: the ' +
      'FRAME can jump at a joint while the CURVE stays perfectly C². The joint condition ' +
      'sandwich(A_k[3]) = sandwich(A_{k+1}[0]) is GAUGE-INVARIANT, so it ties the two generators only ' +
      'up to A ↦ A·exp(iθ) — which leaves the tangent fixed and rotates e₂, e₃ by 2θ about it. ' +
      'Measured: 3.01°, 3.74°, 5.64° opening up over successive drags while C¹, C² AND the twist ' +
      'readout all sat at machine zero, because totalTwist integrates WITHIN segments and cannot see a ' +
      'discontinuity. Fixed by constraining the GENERATOR at the joint (four conditions) instead of ' +
      'its sandwich (three); the per-segment gauges then collapse to one global gauge, so the spare ' +
      'count is unchanged at 4n. And "joint jump" is now its own readout, so the figure can no longer ' +
      'display one quantity while enforcing another. ' +
      'core/phSpatialSepticSpline, 19 tests; drags run 13–28ms at n=6–8 with class, C², twist and the ' +
      'joint jump all at machine zero throughout.',
  },
  // ---------------------------------------------------------------------------
  // SECTION II — RATIONAL, TWICE. The deck's actual claim lives here.
  // ---------------------------------------------------------------------------
  {
    type: 'title',
    content: (
      <>
        <h1>II &mdash; Rational, twice</h1>
        <div className="subtitle" style={{ fontSize: '0.66em', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', whiteSpace: 'pre', lineHeight: 1.7 }}>
{`r′ = 𝒜 i 𝒜* / w²     integrate — and kill a logarithm at every pole   (w = the poles)
⟨P,P⟩ = 0            never integrate — build it where Möbius is linear`}
        </div>
        <div className="event note" style={{ marginTop: '1.5em' }}>
          Same curves. PH is <em>free</em> in both &mdash; the sandwich does that work either way.
        </div>
        <div className="event note" style={{ marginTop: '0.6em' }}>
          What separates them is whether you integrate, and everything else follows from that one
          choice.
        </div>
      </>
    ),
    notes:
      'THE SANDWICH IS THE SAME A, and that is the sentence to open on because everyone expects the '
      + 'rational case to need a new object. It does not. Polynomial: r-prime = A i A-star, so the '
      + 'speed is |A|^2, a polynomial -- PH free, A free, integrate and you are done. Rational: the '
      + 'quotient rule already hands you a square in the denominator, so ask the numerator to be the '
      + 'SAME sandwich and the speed is |A|^2/w^2 -- still rational, still free. '
      + 'SO WHAT CHANGED IS INTEGRATION, and nothing else. A polynomial always integrates to a '
      + 'polynomial; a rational function does not. The logarithms have to cancel, which is a residue '
      + 'condition at every pole: N-prime(r) = 2 N(r) Sigma, with Sigma the sum of 1/(r - r_l) over '
      + 'the other poles. A is no longer free -- it is exactly as free as those conditions allow. '
      + 'AND THAT IS WHERE THE CHART COMES FROM. Rewritten in A the condition reads A-prime(r) = '
      + 'A(r)(Sigma + lambda i). At FIXED lambda it is LINEAR in A, so the admissible spinors form a '
      + 'linear space with a basis -- that is what makes coordinates possible. And lambda is left '
      + 'over with a meaning: the frame twist rate at that pole. One dial per pole. '
      + 'THE OTHER ANSWER IS TO REFUSE THE QUESTION. In R^{4,1} nothing is integrated -- the curve is '
      + 'placed where it lives, as a polygon of weighted spheres -- so there are no logarithms to kill '
      + 'and no residue conditions at all. The price is the mirror image: the conditions become '
      + 'quadratic constraints on the control data, so dragging needs a solver, and there are no '
      + 'coordinates. '
      + 'THE DEGREE FACT, if it comes up: the conformal vector carries (1, x, half |x|^2) -- the '
      + 'position AND its square -- so its degree is DOUBLE the curve-s. That is the fee for making '
      + 'distance an inner product, which is what makes Moebius linear there. '
      + 'PROVENANCE, plainly, here rather than in the small print. The complete construction of '
      + 'spatial rational PH curves is Kalkan, Scharler, Schrocker and Sir, CAGD 99 (2022); the '
      + 'arc-length refinement is Schrocker and Sir. The conformal construction with the control '
      + 'polygon as WEIGHTED SPHERES is the one with no search hits so far -- and Choi, Lee and Moon '
      + 'is the paper to read before anyone calls it new.',
  },

  // ---------------------------------------------------------------------------
  // 10 — bend it with Möbius: a rational PH curve, frame intact
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Bend it, and it becomes rational — the frame does not notice</h2>
        <WhenActive>
          <MobiusFigure />
        </WhenActive>
      </>
    ),
    notes:
      'THE CONSTRUCTION, in one line: a polynomial PH curve bent by a Möbius transformation is a ' +
      'RATIONAL PH curve, and it keeps its rational rotation-minimizing frame. Both halves verified in ' +
      'core/phMobius rather than quoted. ' +
      'WHY RATIONAL: |s′| = ρ²σ/|u|², and σ = |A|² is a POLYNOMIAL for a PH curve, so the image speed ' +
      'is rational. That IS the construction — there is nothing else to it. ' +
      'WHY THE FRAME SURVIVES: Theorem 1 of Bartoň–Jüttler–Wang — Möbius transformations COMMUTE with ' +
      'computing the RMF, via the NORMALIZED differential. Measured here at 1e-9 across four spheres. ' +
      'And STRONGER than the theorem: the image\'s OWN Euler–Rodrigues frame stays rotation-minimizing ' +
      'too, so the RM-ERF class survives inversion. The twist readout is measured on the IMAGE frame, ' +
      'not inherited from the source. ' +
      'WHAT CHANGES IS THE DEGREE: 8 control points become 15. Say it three ways if pressed, because ' +
      'three independent routes give the same 14 — the denominator |r−c|² is degree 14; the generator ' +
      'law A ↦ ρuAj/|u|² is degree 10 over 14; and the conformal lift doubles n. ' +
      'THE SLIDERS ARE GENERATORS, not an inversion centre: exp(Σ sᵢXᵢ) on the conformal model, exactly ' +
      'as the Lie-sphere lab does it, so all-zeros is the identity. The three exposed are the SPECIAL ' +
      'CONFORMAL ones, because the Möbius group is rotations + translations + scaling + these, and only ' +
      'these BEND — the rest are similarities, which fix ∞ and leave the degree alone. That split is ' +
      'exactly how the lab groups its generators. ' +
      'NO NEW SOLVER WAS NEEDED, and this is the design point worth making: the constraints are simple ' +
      'in the PREIMAGE (five conditions on sixteen unknowns, dragInClass) and hopeless in the image ' +
      '(fifteen weighted control points). So Möbius is a pure DISPLAY map, and the gesture stays direct ' +
      'because Möbius maps are invertible — the cursor is pulled back through μ⁻¹, and exp(−G) inverts ' +
      'exp(G) for free. ' +
      'THE 15-POINT POLYGON IS THE REAL ONE, and the model pays for itself getting it: a Möbius ' +
      'transformation is a CONSTANT matrix and Bernstein basis functions are scalars, so it acts on ' +
      'each coefficient INDEPENDENTLY — fifteen matrix-vector products and fifteen divisions, no ' +
      'resultants and no fitting. Two independent routes to that curve agree to 1e-9 in the tests. ' +
      'THE GUARD: as the bend strengthens a weight approaches zero and a control point escapes to ' +
      'infinity — a genuine singularity. "min |w|" is that distance, displayed. Watching the image ' +
      'swell as it falls is the most vivid demonstration of what inversion is. ' +
      'AND THE PIECE OF MATHEMATICS THAT CAME OUT OF BUILDING IT: how inversion acts on the generator, ' +
      'A ↦ ρ·u·A·j/|u|², where u = r − c. My first derivation was WRONG (I took the reflection to be ' +
      '−n v n, which is a rotation by π); the right multiplication by j IS the orientation reversal the ' +
      'determinant predicted. It matters beyond bookkeeping: the law factors into a CONSTANT right ' +
      'multiplier and a t-DEPENDENT left one, and the left factor depends on r = ∫A i A*, the INTEGRAL. ' +
      'A constant multiplier maps control points one for one; a varying one is a B-spline product that ' +
      'raises the degree and destroys the correspondence. So the Hopf/spinor representation is ' +
      'affine-covariant but NOT Möbius-covariant — which is why the covariant control structure has to ' +
      'live in the conformal model, not the Hopf model. In 2D it works because Möbius is a CONSTANT 2×2 ' +
      'matrix on (N : D) and a Farin point is a projective sum. ' +
      'core/phMobius (14 tests), core/conformal (22), core/phSpatialSeptic (25).',
  },

  // ---------------------------------------------------------------------------
  // 12 — RETIRED. Was "Strict and free, one dimension richer", at conformal degree 5.
  //
  // REMOVED BECAUSE THE PARITY THEOREM KILLED ITS HEADLINE. It argued that rationality buys exactly
  // one more dimension AT THE SAME DEGREE and the same data — polynomial PH quintic 2, rational
  // quintic 3. But an odd conformal degree is never genuinely odd: a real root of w forces the whole
  // member to factor, and a real odd-degree polynomial always has one. So its rational side was a
  // QUARTIC in a quintic polygon, and the two sides were never the same degree.
  //
  // AND ONE OF ITS THREE SLIDERS DID NOT MOVE THE CURVE, which is the second reason and was found
  // independently. Counted in curves rather than polygons, the four nullspace directions have
  // curve-motion rank TWO (singular values 1.0, 0.73, 7e-6, 4e-9, gap 1e5): one is the projective
  // rescale, and at odd degree the redundant factor (t−r) can slide freely, changing every weight and
  // radius on screen while the curve stays pointwise identical. → conformalPHHopf.test.ts
  //
  // AND THERE IS NO HONEST ODD RUNG TO REPAIR IT WITH. Conformal 6 carries the polynomial PH CUBICS;
  // a polynomial PH quintic needs conformal degree 10. The comparison would have to be rebuilt across
  // a different pair of degrees, with different data held on each side. Dropped rather than faked.
  //
  // ITS TWO DURABLE FINDINGS MOVED INTO SLIDE 14's NOTES — "one slider at a time", and "the outer
  // points are NOT the data" — that being the degree-6 slide which had already superseded its gesture
  // ("you could turn five dials but move no control point").
  //
  // NOW UNUSED, kept for their measurements rather than deleted: StrictFreeRationalFigure.tsx (this
  // slide's figure) and RationalPHSexticFigure.tsx (which slide 14 replaced earlier).
  // ---------------------------------------------------------------------------
  // 13 — the plane first: Mobius costs nothing, and the Farin beads leave their edges
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>In the plane, Mobius is a linear map</h2>
        <ComplexRationalPHFigure />
      </>
    ),
    notes:
      'THE 2D CASE FIRST, because this is where the argument is actually clean -- Eric\'s sequencing, and '
      + 'he was right to ask for it. Write the plane curve as z = P/Q with P, Q complex cubics. Then a '
      + 'Mobius transformation z -> (az+b)/(cz+d) is EXACTLY the linear map (P,Q) -> (aP+bQ, cP+dQ) on the '
      + 'pair. The PH condition is that the Wronskian M = P\u2032Q - PQ\u2032 is a perfect square, and the '
      + 'Wronskian is alternating bilinear, so M -> (ad-bc)M. Every complex number has a square root, so a '
      + 'square stays a square: PH IS MOBIUS-INVARIANT, in one line. In R\u00b3 the same fact needed the '
      + 'whole O(4,1) apparatus. '
      + 'AND THE LIFT IS FREE. The conformal lift of z = P/Q is (Q\u0304Q, PQ\u0304, PP\u0304/2), which is '
      + 'null identically -- no condition to impose, since ||q||\u00b2 - 2wc = (PP\u0304)(QQ\u0304) - '
      + '2(QQ\u0304)(PP\u0304/2) = 0. The denominator w = QQ\u0304 is automatically positive of degree 6 '
      + 'with no real roots, which is the irreducibility the 3D algebra has to work for. '
      + 'WHY 2D IS EASIER, precisely: the isotropic cone of C\u00b2 FACTORS, q\u2081\u00b2+q\u2082\u00b2 = '
      + '(q\u2081+iq\u2082)(q\u2081-iq\u2082), so nullity at each root of w is a DISCRETE choice (q vanishes '
      + 'at z or at z\u0304) rather than a continuous condition. Consequence worth stating out loud: every '
      + 'irreducible degree-6 real rational plane curve IS a degree-3 complex rational one, the 8 branches '
      + 'being the 8 spectral factorisations of w. In C\u00b3 the cone is irreducible and you need the '
      + 'spinor map instead. '
      + 'THE FIGURE draws inversion in the circle about S: mu(z) = S + R\u00b2/(z-S), so P = S(z-S) + R\u00b2 '
      + 'and Q = z-S, giving M = -R\u00b2A\u00b2 = (iRA)\u00b2. A perfect square with NOTHING TO SOLVE -- '
      + 'control points map pointwise and the complex weights are w_k = P_k - S. So this figure cannot '
      + 'stall, which is the whole reason to build on closed forms: the degree-6 sliders stall because they '
      + 'need a solver at a singular point, and this one has no solver at all. '
      + 'THE FARIN BEADS ARE THE POINT. With real weights a Farin point sits ON its edge. These weights are '
      + 'COMPLEX and q_k = S + 2R\u00b2/(w_k + w_{k+1}) leaves the edge -- that departure IS the freedom a '
      + 'complex-rational curve has over a real-weighted one, made visible. Push S far away and mu becomes '
      + 'nearly a similarity, the weights nearly agree, and the beads settle back onto the midpoints: the '
      + 'polynomial curve wearing a bigger coat. '
      + 'S IS THE STRAIGHTENING CENTRE -- the same object the R\u00b3 work reached from the other end (invert '
      + 'about it and the rational curve becomes polynomial again), except here you can put your finger on '
      + 'it. That is the handle for the 3D slides that follow. '
      + 'NOT GUARDED: S landing on the curve, where Q vanishes and the image runs through infinity. The '
      + 'min|Q| readout goes amber and the curve visibly escapes, which is more honest than a clamp and is '
      + 'the same pole the (w,q) algebra says an irreducible member never has on the real line. '
      + 'The ||z\u2032|| = h/w readout is MEASURED by central difference against the predicted '
      + 'R\u00b2|A|\u00b2/|Q|\u00b2, not asserted from the algebra.',
  },

  // ---------------------------------------------------------------------------
  // RETIRED — was "Four points fix the quartic", conformal degree 4.
  //
  // Removed at Eric's request. It was NOT broken; everything on it was measured and correct. Three of
  // its findings were load-bearing elsewhere and were moved rather than dropped:
  //
  //   · the DEGREE-4 BENDING GAP — conformal 4 comes from a polynomial PH QUADRATIC, which is a
  //     straight line, so bending yields only circles and lines there while building directly gives 13
  //     dimensions of spatial curves — went to SLIDE 11, where it is the honest replacement for that
  //     slide's own retired "nothing could bend to this";
  //   · the PARAMETER GAUGE (w_k -> lambda^k w_k moves every weight and bead and leaves the curve
  //     pointwise still, lambda = 3.4218 recovered from all four ratios, image fixed to 2.6e-3) and its
  //     asymptotic wall went to SLIDE 14, which cited this slide for both;
  //   · the PARITY THEOREM it presented is what moved slide 11 to degree 6 and retired slide 12; it
  //     lives in core/conformalPHCurve and in those two retirement notes.
  //
  // Its rigidity result has no home in the deck now: 13 = 1 gauge + 12 geometric, twelve pinned
  // coordinates bite on all twelve, so FOUR CONTROL POINTS DETERMINE the degree-4 rational PH shape.
  // RationalPHQuarticFigure.tsx is kept, unused, for that measurement.
  // ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
  // 14 — degree 6: navigate the family by its control points
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Five control points and one road — the whole family</h2>
        <WhenActive>
          <SexticFivePointFigure />
        </WhenActive>
      </>
    ),
    notes:
      'THE GESTURE IS ERIC\'S AND THE COUNTING IS WHY IT IS THE RIGHT ONE. Seven control points is 21 numbers for an 18-dimensional family, so a polygon looks over-determined -- and it is, but by FIVE, not three. The map from the family to the polygon has measured rank 16, because TWO family directions move no control point at all: the projective scale (C -> cC changes nothing observable, since every defining condition is quadratic) and the PARAMETER GAUGE (C_k -> lambda^k C_k slides the Farin beads and leaves every centre exactly where it was). So the reachable polygons are 16-dimensional. '
      + 'THE GAUGE IS WORTH A SENTENCE OF ITS OWN, since the slide that used to carry it is gone and it is the best beat in this material. w_k -> lambda^k w_k is the classical rational-Bezier reparametrisation, and the Mobius map t -> lambda t/(1+(lambda-1)t) preserves rational PH because the chain rule multiplies |p-prime| by a rational scalar. Turn that dial and EVERY weight moves, every Farin bead slides, every readout changes -- and the drawn curve sits still. Measured at degree 4: weight ratios 1, 3.4218, 11.7090, 40.0665, 137.1015, a SINGLE lambda = 3.4218 recovered to four decimals from all four, image unchanged to 2.6e-3 of the extent. ERIC READ THAT OFF THE SCREEN before the algebra did -- "the dial does not change the shape of the curve, it just moves the Farin points" -- and an earlier version of that slide had claimed the frozen polygon carried a family of DISTINCT curves. It does not. The trap: uniform-in-t samples move by 0.56 of the extent, because the points slide ALONG the curve, and parametrisation motion was misread as shape motion. '
      + 'AND IT IS STRUCTURAL, NOT AN ACCIDENT OF A SEED: lambda^k changes only weights, so every control point AS A PROJECTIVE POINT stays put, and the gauge therefore lies in the nullspace of any constraint of the form "control point k is HERE". That is why the counting above subtracts it before anything is measured. Pinning the HERMITE DATA instead does fix lambda, since p-prime(0) = n(w_1/w_0)(P1-P0) scales by it. '
      + 'AND 16 = 15 + 1, WHICH IS THE WHOLE SLIDE. Five control points prescribed is fifteen coordinates -- the two ends, their neighbours, and the middle -- leaving ONE dimension, hence one slider. That is why {P0, P1, P3, P5, P6} are handles and P2, P4 are grey: the grey pair is what absorbs. Nothing about the arrangement is a taste decision. '
      + 'MEASURED BEFORE IT WAS BUILT. Dragging one of the five with the other four held tracks the cursor to 100% for four of them over a long path, the held points stay put to 2e-15, the grey pair absorbs by up to 1.6 units, and the residual never leaves machine zero. P0 is the exception at 87% and the reason is visible on screen: rho_1 IS the distance from P0 to P1, so holding P1 while dragging P0 drives that sphere\'s radius directly. '
      + 'THE LEFTOVER DIMENSION IS A ROAD, AND IT IS DRAWN. The first version of this slide spent that dimension on an abstract slider, and Eric\'s verdict was that the five points worked well and the slider less so -- correctly, because the dimension has a concrete picture that a slider throws away. Hold the five and the grey points are NOT free in space: each is confined to a curve, and the two travel it together. So the road is drawn (measured: 36 samples, arc 1.65 against a polygon span of 1.45, chord/arc 0.83, so genuinely curved; P4 travels 1.20 of it while P2 travels 1.65) and the gesture is to PUSH the grey point along it. Measured: a cursor 60 degrees OFF the road still slides P2 1.50 along it with the five held to 2e-15. No slider, no orientation to carry, no re-seating -- and it is slide 4\'s gesture one dimension up, which is the gesture this audience has already been taught. '
      + 'WHY NOT A NAMED QUANTITY -- this took a measurement and it is the interesting part. Every geometric candidate for a dial FAILS on that road: rho_2 is CONSTANT along it (0% both ways), while rho_3, rho_4 and the total arc length each sit at a FOLD -- rho_3 reaches 100% up and 17% down, rho_4 reaches 100% down and runs BACKWARDS (-71%) when asked up. A fold is where a readout stops being a coordinate; it is not a solver defect. The road has no such problem because it is the family\'s own shape rather than a function on it. '
      + 'HOW THE ROAD IS COMPUTED, if asked. Its tangent is the ambient push projected onto the nullspace of the constraint Jacobian; the two gauge directions move no control point, so every probe that moves the point at all reports the same direction -- the probe cancels out. Walking it needs BACKTRACKING and skipping that broke the first attempt: the step is travel/rate, so where the point travels slowly the predictor leaps, and measured, one direction ran fourteen steps while the other diverged to a defect of 1e6 on its second, taking 1.20 where 0.07 was asked. A step is now accepted only if it stayed on the family AND did not overshoot; otherwise the ask is halved. Nothing infeasible is ever drawn. '
      + 'AND THERE IS A SLIDER TOO, because a road cannot do the one thing a presenter needs: move the point with no hand on it. It indexes the samples already drawn, so dragging it costs NO solve -- every notch is a curve computed once and known to be a member. 33 notches over an arc of 1.80 is a step of about 4% of the polygon span. '
      + 'THE TWO ENDS ARE DIFFERENT, and one earlier reading of them was WRONG -- correct it if it comes up. BACKWARD is a real wall at 0.19 whatever the step budget: the weights degenerate to (1, 4.1, 11.7, 20.9, 142.9, 95.5, 43.5), which projectively is w_0 -> 0 -- the parameter gauge running off to its limit, the same asymptotic wall the degree-4 figure hit (16000 continuation steps without arriving, so a slider slows to a stop rather than snapping), met here from another direction. FORWARD does not end at all -- 1.61 travelled on a budget of 1.74, 3.06 on a budget of 4.34 -- so the drawn road is a generous stretch, not the whole locus, and the slider spans what is drawn. What the walk DOES refuse is a denominator with a real root, since that is a curve with a pole; measured, that does not happen inside the drawn stretch. '
      + 'A RADIUS REACHING ZERO IS NOT AN END, which is the correction. Travelling forward, rho_2 passes through 0 and comes out NEGATIVE: <C,C> < 0, an imaginary sphere, while the residual stays at machine zero and the curve is a perfect member throughout. An earlier version of this slide called that a point-sphere boundary. It is a coordinate event -- the sphere through that conformal point stops being real -- and the family does not care. Worth pointing at on screen, since the readout shows it happening. '
      + 'FREE MODE HOLDS NOTHING, and that was measured against the alternative. Pinning the two ends and holding nothing BOTH track the cursor to 100% for all seven points; with nothing pinned the rest of the curve answers more evenly (largest companion motion 1.22 against 3.07), so free is the literal thing -- every control point moves, and minimum norm spends the fifteen spare dimensions. '
      + 'THE DIALS THIS SLIDE REPLACED, if someone asks for the moduli count. Pinning the C1 Hermite data at both ends is a slice through the gauge, leaving 2n-7 = five shapes at this degree: rho_2, rho_3, rho_4 and the arc length of each half were measured to pin 5 of the 5 slice directions (the total length alone is one short, where degree 5 got 2+1 = 3 by luck). That figure still exists as RationalPHSexticFigure. Its weakness is exactly what this slide fixes: you could turn five dials but move no control point. '
      + 'THE DEGREES OF FREEDOM, ALL THREE, measured on this seed by adding rows to the defining Jacobian: the family is 18, seventeen after the projective scale; holding the two ENDS leaves 11; holding the full C1 DATA leaves 5. This slide\'s free mode holds nothing at all, so it is the whole 17. '
      + 'THIS SLIDE ABSORBED THE OLD DEGREE-5 STRICT/FREE SLIDE, and two of its findings are worth keeping. FIRST, ONE SLIDER AT A TIME: prescribing every dial at once leaves the system exactly determined with a projective kernel, and Newton stalls at a defect of 1e-6 to 1e-7 -- the coordinates get hit EXACTLY while the defining conditions do not, which is a figure enforcing something other than what it displays. Pinning w_0 = 1 to kill the kernel made it WORSE, so that diagnosis was wrong. Prescribing only the handle being touched leaves spare dimensions and the defect returns to 1e-13. That is the shape of every drag in this codebase that behaves. SECOND, THE OUTER POINTS ARE NOT THE DATA, unlike slide 7 where P1 = p_i + d_i/5 makes dragging them identical to prescribing Hermite data: for a rational curve r-prime(0) = n(w_1/w_0)(P1-P0) carries the WEIGHTS too, so pinning the points and pinning the data give DIFFERENT slices of the same dimension -- measured, both freedom 3 at degree 5. '
      + 'WHAT BENDING REACHES AT THIS DEGREE, and it is the sharper version of the old 17-against-13. The null lift of a polynomial curve is (1, p, half |p|^2), so the infinity coordinate is |p|^2 and degree d lands at conformal degree exactly 2d -- exactly, because the o-coordinate is the constant 1 so the five components share no common factor. O(4,1) acts LINEARLY and invertibly, so conformal degree is a Mobius invariant and bending cannot lower it either. Hence conformal 6 carries the polynomial PH CUBICS, and a polynomial PH QUINTIC needs conformal degree 10 -- Eric asked exactly this and the answer is 10, not 6. Measured: the lifted cubic is a degree-6 member to 4.1e-16, the lifted quintic a degree-10 member to 3.4e-16, both with every weight exactly 1. '
      + 'AND A GENERIC MEMBER HERE IS NOT EVEN A BENT CUBIC. p is a Mobius image of a polynomial iff some NULL S has <P,S> constant -- S is the point sent to infinity, and constant means the curve never reaches it. Constant in Bernstein form means S is orthogonal to every difference C_i - C_i+1, so the test is: does the orthogonal complement of the differences contain a null vector? At degree 6 that complement is measured ZERO-dimensional -- there is no candidate to test. At degree 4 there was one and it read <S,S> = 2.0e-3. The control experiment: the lifted polynomials give exactly 0. '
      + 'IF ASKED WHY THE SLIDERS DRIFT: they are genuinely coupled by the defining conditions, so moving one moves the others readings. The handles show what was ASKED, the readouts show what is MEASURED; showing the measured value on the handle makes it jump under the pointer. '
      + 'THE MEMBER IS CACHED, not solved at load -- findMember takes 19 s at this degree. The test asserts its residual is machine zero, so it is a computed member pinned as data. '
      + 'core/conformalPHStructure.test.ts (4 tests), conformalPHCurve, conformal.',
  },
  // ---------------------------------------------------------------------------
  // 16 — the rational fiber you can sweep, with two named dials
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>A fiber you can sweep, and two dials with names</h2>
        <WhenActive>
          <RationalPHLoopFigure />
        </WhenActive>
      </>
    ),
    notes:
      'WHY THIS FIGURE EXISTS, and it is worth saying to the room. The polynomial fiber of slide 6 is '
      + 'beautiful for three reasons and only one is mathematical: it CLOSES, you can see all of it at '
      + 'once, and it says something. The rational fiber, measured as a bare road, had none of those. But '
      + 'the one-pole rational family mixes two kinds of freedom, and separating them gives all three back. '
      + 'THE LOOP IS A HOPF PHASE. Holding the start point, the start tangent and the far endpoint leaves '
      + '8 parameters minus 6 conditions minus 1 gauge = ONE dimension, and it closes -- measured, it '
      + 'returns after the midpoint wanders 1.04, with a closure gap of 3.9e-3. The compact direction is '
      + 'the same thing that closes the polynomial cubic fiber: prescribing c-prime(0) pins the spinor only '
      + 'up to a circle, and a circle comes back. '
      + 'THE TWO DIALS HAVE NAMES, which is the complaint about the previous slide answered. TWIST is the '
      + "frame's rate of rotation ABOUT the tangent at the pole -- measured exactly omega = 2 lambda e_1, "
      + 'purely tangential, to six decimals with no off-axis part. POLE is where the curve passes through '
      + 'INFINITY, since w(r) = 0. Drive the pole down and the readout "infinity to curve" shrinks while '
      + 'the end speed diverges 4.6 -> 179. That is the family\'s honest limit and it NAMES ITSELF -- a '
      + 'geometric event, not a solver giving up. '
      + 'AND THE READOUT THAT DOES NOT MOVE IS THE POINT. Everywhere else in this deck a solver holds the '
      + 'invariant and the residual drifts as you drag. Here the spinor squares to the WRONSKIAN -- '
      + 'A i A-bar = p-prime w - p w-prime -- so PH is a substitution, the defect sits at 1e-15, and it '
      + 'cannot do otherwise. A member costs 0.014 ms: no Newton, no cached seed. If asked what changed to '
      + 'make that possible: parametrise first, then impose the data, instead of imposing both at once. '
      + 'THE SCOPE, CORRECTED. This figure is the ONE-POLE family, but that is a choice rather than a '
      + 'limit: the no-log condition is BILINEAR, so m poles want m sliders -- one twist rate per point '
      + 'where the curve meets infinity -- and both solves stay linear (FOUNDATIONS F17, measured at m = 1, '
      + '2 and 3). An earlier version of this note said two or more poles bring the solver back; that was '
      + 'wrong. What the chart genuinely misses is the stratum A(r) = 0, where the apparent pole CANCELS '
      + 'and the curve never reaches infinity -- the seam with the polynomial case. '
      + 'core/rationalPHOnePoleSpatial, pinned in rationalPHOnePoleSpatial.test.ts, onePoleLoop.test.ts, '
      + 'spinorChartDrag.test.ts and onePoleTwist.test.ts.',
  },

  // ---------------------------------------------------------------------------
  // 17 — the pole, which has no position in space, given one on the sphere
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>The same curve on the sphere: the pole is a cusp</h2>
        <WhenActive>
          <IndicatrixFigure />
        </WhenActive>
      </>
    ),
    notes:
      'WHY THIS SLIDE EXISTS. Slide 16 states the no-log condition as a formula and gives you a dial '
      + 'for it, but there is nothing on screen to POINT AT: the pole r is a parameter, and the place it '
      + 'refers to is off at infinity. This slide gives it a position. Draw the same member through its '
      + 'unit tangent instead of its position and the pole becomes a visible cusp. '
      + 'THE ONE IDENTITY THE SLIDE RESTS ON: c-prime = N/w-squared and the speed is sigma/w-squared, so in '
      + 'T = c-prime over the speed the w-SQUARED CANCELS and T = N/sigma. Being PH is exactly the '
      + 'statement that the unit tangent is rational -- the indicatrix is a rational spherical curve. Two '
      + 'consequences, both measured: T has no denominator w at all, so it is perfectly smooth at the pole '
      + 'where the curve itself runs to infinity; and T closes up over the projective line through its '
      + 'point at infinity, which is ALREADY unit because leading N = A-top i A-top-bar has norm equal to '
      + 'leading sigma (the drawn polyline ends coincide to 0.0e+0). '
      + 'THE CUSP. T-prime = (N-prime sigma - N sigma-prime)/sigma-squared vanishes exactly when {N, '
      + 'N-prime} are dependent, which is what the no-log condition says. Measured: |T-prime(r)| = 1.7e-14 '
      + 'while |T-prime| is 0.207 a step of 0.05 away -- a cusp, not a flat stretch, and it holds for '
      + 'lambda = 0.6, -1.3, 0 and r = 1.7, -0.9, 2.4. This is Kalkan-Scharler-Schroecker-Sir Rem 4.7 read '
      + 'in our chart. '
      + 'WHAT TO DO ON SCREEN: drive the pole dial. Because r is required to stay OUTSIDE [0,1], the cusp '
      + 'never sits on the bold arc the curve actually uses -- and that is worth saying out loud rather '
      + 'than hiding, because walking r inward walks the cusp toward the arc, and the "infinity to curve" '
      + 'readout is the same approach as a number. The family limit becomes something seen approaching. '
      + 'Then turn twist: the whole track reshapes and the cusp stays a cusp, so it is not a property of '
      + 'this member but of having a pole at all. '
      + 'THE MECHANISM CHANGES WITH m, AND THE FIGURE DOES NOT SHOW THIS YET (checked before building, so '
      + 'the scope is known): with one pole Sigma = 0 and N-prime(r), sigma-prime(r) each vanish outright; '
      + 'with two, Sigma = +/-0.3846 and NEITHER vanishes -- |N-prime|/|N| = 0.769, which is exactly '
      + '2|Sigma| -- but both equal 2 Sigma times themselves, so T-prime cancels. Same geometric event, '
      + 'reached two ways: one pole kills both terms, many poles balance them. m poles give m cusps, and '
      + 'they are SHALLOWER (0.029 against 0.207 at r +/- 0.05), which is why the two-pole version of this '
      + 'figure is the harder drawing and is not built yet. '
      + 'core/tangentIndicatrix, pinned in tangentIndicatrix.test.ts (7 tests).',
  },
  // ---------------------------------------------------------------------------
  // 18 — the same thing with two poles, kept beside the pair for comparison
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Two poles: a degree-5 fiber, and two of everything</h2>
        <WhenActive>
          <RationalPHTwoPoleFigure />
        </WhenActive>
      </>
    ),
    notes:
      'THIS SLIDE EXISTS TO BE COMPARED WITH SLIDE 16, and both are kept deliberately. Slide 16 '
      + 'is m = 1: degree 4, the curve meets infinity once, one twist dial. This is m = 2: degree 5, twice, '
      + 'two dials. Slide 17 now sits between them showing slide 16 on the sphere, so the m = 1 pair is '
      + 'adjacent and this slide is the step up in m. The difference between 16 and 18 IS the experience of adding a pole -- which is not a '
      + 'control that belongs on a slider, since it changes the curve degree and the whole parameter space. '
      + 'WHAT MAKES IT POSSIBLE, and it was checked before it was built. The no-log condition is BILINEAR '
      + 'in (A, lambda), so one twist rate per root leaves it LINEAR in A at any number of poles: two '
      + 'linear solves, no elimination (FOUNDATIONS F17). An earlier version of this deck claimed two or '
      + 'more poles brought a solver back; that was wrong and is corrected. '
      + 'AND THE LOOP SURVIVES, which was the gate on building this at all. Holding the dials leaves '
      + 'fiber = 4n - 4m - 3, which is ONE exactly when n = m + 1 -- so each extra pole buys a degree of '
      + 'curve AND a dial without spending the sweepable dimension. m = 1 gives degree 4, m = 2 degree 5, '
      + 'm = 3 degree 6, all with a one-dimensional loop. Measured: the two-pole loop closes after '
      + 'wandering 0.177 with a gap of 6.8e-4. '
      + 'THE THING TO POINT AT THAT SLIDE 16 CANNOT SHOW: the two poles are INDEPENDENT. Drive r1 toward '
      + 'the domain and the curve strains while r2 sits untouched, so "the honest limit" becomes a property '
      + 'of a particular pole rather than of the family. That is worth a moment on screen. '
      + 'AND WHAT IS UNCHANGED IS THE ARGUMENT: the PH readout still does not move. A i A-bar IS the '
      + 'Wronskian whatever m is, so PH stays a substitution rather than a constraint -- and in free mode '
      + 'you can drag any of the six control points, eighteen coordinates over an eight-dimensional '
      + 'admissible space, with the defect at 2e-16 throughout. '
      + 'core/rationalPHMultiPoleSpatial, pinned in rationalPHMultiPoleSpatial.test.ts (5 tests) and '
      + 'multiPoleLoop.test.ts; the bilinearity itself in multiPoleLinearity.test.ts.',
  },


  // ---------------------------------------------------------------------------
  // 19 — two poles on the sphere: the cusps count the poles
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Two poles, two cusps</h2>
        <WhenActive>
          <IndicatrixTwoPoleFigure />
        </WhenActive>
      </>
    ),
    notes:
      'THE DECK NOW ALTERNATES: curve, sphere, curve, sphere. Slide 16 is the one-pole curve, 17 the same '
      + 'member on the sphere, 18 the two-pole curve, and this is that one on the sphere. One thing changes '
      + 'between 17 and 19 -- the number of poles -- so the comparison is clean. '
      + 'THE CLAIM, and it answers the question the one-pole sphere raises: being rational does NOT cost one '
      + 'cusp, it costs one PER POLE. w is quadratic here, the curve meets infinity twice, and the '
      + 'indicatrix stops dead twice. Both readouts are on screen. The poles are also INDEPENDENT: move one '
      + 'dial and its own cusp walks while the other sits still, which no single-pole picture can show. '
      + 'THE DEGREE IS 5, and the parity deserves saying out loud because it looks like an error. deg c = '
      + '2n - m + 1, and the sweepable one-dimensional fiber forces n = m + 1, so two poles give degree 5 -- '
      + 'a rational PH QUINTIC, with w quadratic. Since 2n is always even, THE POLE COUNT ALONE DECIDES '
      + 'PARITY: m = 0 polynomial is odd (the classical PH cubics and quintics), m = 1 is EVEN (4, 6, 8 -- '
      + 'the standard rational PH families, and degree 6 is exactly n = 3 there, the conformal sextic), '
      + 'm = 2 is ODD, m = 3 EVEN again. So the common instinct that rational PH wants even degree is right '
      + 'about the one-pole construction and this slide is not a counterexample to it. A second, independent '
      + 'route to the same even degrees, worth mentioning if asked: a Moebius transform of a polynomial PH '
      + 'curve is rational PH and inversion doubles degree, so the PH cubic goes to 6 and the quintic to 10. '
      + 'Measured across m = 1, 2, 3 in rationalPHDegreeParity.test.ts. '
      + 'ONE HONEST CAVEAT TO HAVE READY. These cusps are SHALLOWER than the one-pole one and the mechanism '
      + 'differs. A single pole has Sigma = 0, so N-prime and sigma-prime each vanish and the corner is '
      + 'sharp. With two, Sigma = +/-0.3846 and neither vanishes -- |N-prime|/|N| = 0.769, exactly 2|Sigma| '
      + '-- but both equal 2 Sigma times themselves, so T-prime cancels anyway. Same geometric event, '
      + 'gentler approach: |T-prime| reaches 0.029 near the pole against 0.207 for one pole. That is why the '
      + 'violet markers are drawn rather than left to the eye. '
      + 'The sphere itself came for free: core/tangentIndicatrix asks only for {N, sigma}, and the '
      + 'multi-pole member exposes the same shape as the one-pole one. Pinned in tangentIndicatrix.test.ts.',
  },

  // ---------------------------------------------------------------------------
  // 20 — the lowest degree there is: the published rational PH cubic
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Degree three: the smallest rational PH space curve</h2>
        <WhenActive>
          <RationalCubicFigure />
        </WhenActive>
      </>
    ),
    notes:
      'NOT OUR CURVE, and that is the point of showing it. Kozak-Krajnc-Vitrih, CAGD 31(1):43-56, 2014, Thm '
      + '7, reconstructed as Example 5.4 of Kalkan-Scharler-Schroecker-Sir, CAGD 99, 2022 (arXiv 2111.04600): '
      + 'c = -(t(t^2-4), 2t(3t-1), t(3t+4)) / 60(t^2+1). Verified against their coefficients rather than '
      + 'trusted -- N = -(1/60) A i A-bar holds to the last digit for the spinor they supply, so the PH '
      + 'readout is machine zero. Degree 3 is lower than anything else in this deck (slides 16/17 are 4, '
      + '18/19 are 5). '
      + 'ITS DENOMINATOR HAS COMPLEX ROOTS. w = t^2 + 1, roots +/-i, so no FINITE real parameter reaches '
      + 'infinity and the weights on [0,1] are all positive. But count projectively and there is a THIRD '
      + 'pole at t = infinity, because the numerator has degree 3 while w has degree 2 -- homogenised the '
      + 'denominator is s(t^2 + s^2). The "follow it out" slider exists to show this: |c| grows like t/60, '
      + 'slowly enough that on [-8, 8] it reads 0.165 and looks bounded. It is not. Two claims in an earlier '
      + 'draft of this material were wrong for exactly that reason and were corrected by measurement. '
      + 'WHY THERE IS NO DRAG HERE, which someone will ask. This curve sits on the stratum slide 16 already '
      + 'flags as the one our chart misses: the spinor is NULL at the pole. A(i) = -2 + 3i*I + 2J + K gives '
      + 'A A-bar = 4 - 9 + 4 + 1 = 0 while A(i) itself is nonzero -- isotropic, on the null cone of the '
      + 'complexified quaternions. Our one-pole and multi-pole modules both assume sigma(r) is nonzero '
      + '(sigma(1.7) = 1.29 there), so every step that divides by A(r) or sigma(r) is unavailable and there '
      + 'is no solver to move this with. The obvious family was tried and failed: holding the shape of A '
      + 'while sliding the pole to i*rho keeps the spinor null to 1e-16, yet the back-substitution for p '
      + 'breaks (residuals 5e-2 to 1e-1 against 0.0e+0 at rho = 1). So nullity is strictly weaker than the '
      + 'rationality condition, and a genuine one-parameter family here is OPEN WORK, not a port. '
      + 'AND BECAUSE w DIVIDES sigma the arc length is not rational: sigma = (1/60)(t^2+1)(t^2+6), so the '
      + 'speed is (1/60)(1 + 5/(t^2+1)) and the length is (t + 5 arctan t)/60 -- exact, elementary, with an '
      + 'arctangent. That is the conformal family signature rather than the one-pole one. '
      + 'core/rationalPHCubic, pinned in rationalPHCubic.test.ts (7 tests).',
  },

  // ---------------------------------------------------------------------------
  // 21 — the cubic on the sphere: the cusp is at infinity
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Its cusp is at infinity</h2>
        <WhenActive>
          <IndicatrixCubicFigure />
        </WhenActive>
      </>
    ),
    notes:
      'THE SLIDE THAT CORRECTS THE PATTERN THE OTHER TWO SPHERES SET UP. Slides 17 and 19 cusp at finite real '
      + 'poles, one per root of w. Here w = t^2 + 1 has only complex roots, so the natural prediction is a '
      + 'smooth track -- and at every FINITE parameter it is smooth: the invariant speed never drops below '
      + '0.223 over t in [-40, 40]. The cusp is at t = infinity, the third pole, the one w does not show. So '
      + 'THE CORNER SITS EXACTLY WHERE THE LOOP CLOSES, and the point at infinity stops being a drawing '
      + 'convenience and becomes the feature. '
      + 'WHICH MEASURE YOU USE DECIDES WHETHER YOU SEE IT AT ALL, and this is the methodological point worth '
      + 'making out loud. |T-prime| against t dips toward zero in the tails for EVERY rational indicatrix, '
      + 'because t is a bad coordinate at infinity -- it cannot tell this cusp from nothing. The honest '
      + 'instrument is the invariant speed |dT/dtheta| with t = tan theta, which is finite through infinity. '
      + 'Measured: 8.94e-2, 8.94e-3, 8.94e-4, 8.94e-5 at t = 1e2 through 1e5 -- a decade per decade, so it '
      + 'falls like 1/t and genuinely reaches zero. The algebraic tell is deg W against 2 deg sigma - 2 for '
      + 'W = N-prime sigma - N sigma-prime: maximal for the other two (6 of 6, 10 of 10) and deficient here '
      + '(5 of 6). '
      + 'AND THE OTHER TWO WERE RE-CHECKED, because this correction could have propagated: their |dT/dtheta| '
      + 'tends to 0.790 and 3.78, both finite, so neither has a cusp at infinity and their counts of one and '
      + 'two stand. '
      + 'SO THE RULE SURVIVES, once poles are counted projectively: one cusp per REAL pole, none for a '
      + 'complex conjugate pair, and t = infinity is a real pole like any other. That is the cleanest '
      + 'statement of the whole sphere sequence, and it needed all three curves to reach. '
      + 'core/rationalPHCubic and core/tangentIndicatrix, pinned in rationalPHCubic.test.ts.',
  },

  // ---------------------------------------------------------------------------
  // 22 — the converse of the fiber: hold the indicatrix, move the curve
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>A whole family over one sphere</h2>
        <WhenActive>
          <SharedIndicatrixFigure />
        </WhenActive>
      </>
    ),
    notes:
      'THIS IS THE CONVERSE OF SLIDE 17 AND THE PAIR IS THE POINT. There the interpolation data is held and '
      + 'sweeping the fiber moves the indicatrix by up to 1.94 on a unit sphere. Here the SPINOR is held, so '
      + 'the indicatrix cannot move at all and the curve moves instead. Two different freedoms; the deck '
      + 'previously showed only one. '
      + 'WHY IT IS TRUE IN ONE LINE: r = -2b/alpha, so r-prime = -2 mu (A i A-bar) / alpha^2, and the unit '
      + 'tangent is +/- A i A-bar / |A|^2 for EVERY member whatever b and mu are. The tangent indicatrix is a '
      + 'function of the SPINOR ALONE. Hold A and a whole vector space of curves sits above one fixed sphere '
      + 'picture. The drift readout stays at the finite-difference floor while the left panel visibly changes. '
      + 'AND IT IS THE CONSTRUCTION THAT REACHES THE NULL STRATUM. Kalkan-Scharler-Schroecker-Sir Theorem 3.6 '
      + 'form (9): rational PH curves are exactly r = -2b/alpha subject to alpha b-prime - alpha-prime b = '
      + 'mu (A i A-bar). It is a LINEAR system, so it divides by neither A(r) nor sigma(r) -- which is why it '
      + 'works on the stratum where the spinor is null at the pole and slide 20 had to be a specimen with no '
      + 'handles. That caveat is now retired: the family is real. Ported and verified in rationalPHDual.ts, '
      + 'where the published cubic satisfies all 18 equations at residual 0.0e+0. '
      + 'WHAT TO DO ON SCREEN. s = 0 IS the published cubic, reproduced to 0.0e+0. Any nonzero mix brings in '
      + 'the second truly rational member of the space, of degree SIX -- the readout says so because the '
      + 'degree jumps rather than deforming, which is honest and will otherwise look like a bug. '
      + 'THE ONE THING TO HAVE READY IF ASKED. Below s = -1/2 the curve STOPS. |r-prime| = 2|mu| sigma / '
      + 'alpha^2, so a real zero of mu is a genuine stationary point rather than a numerical artifact: it '
      + 'enters at t = 1 and walks inward, is marked in amber, and |r-prime| there measures 0.0e+0. That '
      + 'threshold is MEASURED, not derived -- normalising the basis (matching the published scale, and '
      + 'pinning r(0) = 0 to remove the translation freedom) rescales mu, so the tidy -1/4 that the raw '
      + 'system suggests is wrong. Both normalisations were bugs before they were features: without the '
      + 'translation pin, s = 0 missed the published curve by 0.11. '
      + 'TWO VIEWPORTS ON ONE SLIDE is new here and deliberate -- "the sphere does not move" only convinces '
      + 'if both are visible at once, and a unit sphere sharing a scale with a space curve reads badly. '
      + 'core/rationalPHCubicFamily over core/rationalPHDual, pinned in rationalPHCubicFamily.test.ts (3 '
      + 'tests) and rationalPHDual.test.ts (6 tests).',
  },


  // ---------------------------------------------------------------------------
  // 10A — A CURVE OF SPHERES. The unconstrained warm-up, placed before 11 so the room has played in
  //       the space before two conditions arrive at once.
  //
  // BOTH DOORS ARE SHOWN FROM THE START, deliberately: collapse the spheres to points and you get
  // slide 11; keep them and rationalise the ENVELOPE and you get MPH, canal surfaces and offsets.
  // The second door is the one this deck does not take, and saying so here is what stops the atlas
  // slides later reading as though there were only ever one way out.
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>A curve of spheres</h2>
        <WhenActive>
          <CanalSurfaceFigure />
        </WhenActive>
      </>
    ),
    notes:
      'THE ONLY UNCONSTRAINED FIGURE IN THE DECK, and open on that. Everything else here solves '
      + 'something; this one is arithmetic, so it loads instantly and drags at frame rate. A control '
      + 'point is a SPHERE -- centre, radius, weight -- and all three are yours. '
      + 'AND A CURVE OF SPHERES IS NOT A CURVE. It has an ENVELOPE, and the envelope is a CANAL '
      + 'SURFACE. In the plane the same object is the MEDIAL AXIS TRANSFORM: a shape described by the '
      + 'discs that fill it rather than by its boundary. That is a whole literature (Choi-Lee-Moon; '
      + 'Peternell-Pottmann; Kosinka-Lavicka), not a curiosity. '
      + 'GET SOMEONE TO BREAK IT -- this is the beat of the slide. Pull a radius faster than its '
      + 'centre moves and |cdot|^2 - rhodot^2 goes negative: the square root is imaginary and the '
      + 'envelope STOPS EXISTING. Not clamped, not approximated -- the circles are simply not drawn. '
      + 'It is the first constraint in this deck that fails visibly rather than as a residual, and it '
      + 'earns every later slide where a constraint is a number in a readout. '
      + 'THE SECOND FAILURE IS DIFFERENT: inflate until rho*kappa passes 1 and the tube '
      + 'self-intersects. The envelope still exists; it just runs into itself. That is the one people '
      + 'meet in practice when they thicken a canal surface, and the two failures are independent -- '
      + 'measured, you can have either without the other. '
      + 'THEN THE TWO DOORS, both named before moving on. COLLAPSE the spheres to points -- that is '
      + 'the null condition -- and the family becomes a CURVE; ask its speed to be rational and you '
      + 'have the next slide. Or KEEP the spheres and ask the ENVELOPE to be rational: the condition '
      + 'is |cdot|^2 - rhodot^2 a perfect square, Pythagorean in the MINKOWSKI metric. That is MPH, '
      + 'canal surfaces, offsets. It is the door this deck does not take. '
      + 'DO NOT LET THE ROOM THINK THOSE ARE TWO SPELLINGS OF ONE CONDITION. |cdot|^2 - rhodot^2 is '
      + 'the LAGUERRE invariant; <P-prime,P-prime> is the MOEBIUS one. Two subgroups of one Lie '
      + 'sphere group in R^{4,2} (Krasauskas 2017, already cited by the light-cone deck). Moebius '
      + 'keeps points and cannot see a sphere ORIENTATION; Laguerre keeps oriented contact and cannot '
      + 'see a point. '
      + 'IF ASKED WHY DEGREE 5 HERE when slide 11 abandoned it: because the parity theorem needs the '
      + 'NULL condition to force a common factor. With no conditions there is no identity and nothing '
      + 'is forced, so an odd degree is genuinely odd. The degree we retired next door is honest here, '
      + 'and the reason is exactly the condition this slide has not imposed yet. '
      + 'AND THE MEASUREMENT WORTH KEEPING IN YOUR POCKET, if anyone asks whether the two models are '
      + 'really different or just two spellings: take two spheres of radius 0.7 with centres 3 apart, '
      + 'so DISJOINT. Interpolate them cyclographically and you get a cone frustum, radius 0.7 in the '
      + 'middle. Interpolate the same two in R^{4,1} and the midpoint has radius-squared -1.76 -- an '
      + 'IMAGINARY sphere, because two non-intersecting spheres determine a pencil with no real '
      + 'member between them. Same two spheres, same "straight line", two different answers. That is '
      + 'also why this figure interpolates cyclographically: the Moebius version is not something you '
      + 'can drag. '
      + 'core/canalSphereSpline (7 tests: cylinder, cone, torus, both failure modes, and both models).',
  },

  // ---------------------------------------------------------------------------
  // 10A1 — THE ARITHMETIC, ONCE. Text and formulas only, no figure.
  //
  // Everything after this treats the five-number encoding as known. This slide is where it is
  // actually shown: what you specify, why there are five slots, and one example carried all the way
  // through by hand. It exists because the interactive slides kept raising the same question --
  // "what am I even specifying?" -- and no figure answers that. A worked example does.
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Two spheres, by hand</h2>
        <p style={{ marginBottom: '0.2em' }}>
          <strong>What you specify is a centre and a radius.</strong> That is a sphere, and it is the
          only thing you ever type in. (Plus a weight, exactly the rational-B&eacute;zier weight you
          already use, and for the same reason.)
        </p>
        <p style={{ marginBottom: '0.2em' }}>
          <strong>Why five numbers?</strong> Four for the sphere &mdash; centre and radius &mdash;
          and one for the projective scale, the same extra slot that turns a 3D point into{' '}
          <code>(w, wx, wy, wz)</code>. Nothing deeper than that.
        </p>

        <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.78em', whiteSpace: 'pre', lineHeight: 1.55, margin: '0.4em 0 0.6em 1.2em' }}>
{`STORE      S  =  ( w ,  w·c ,  w(|c|² − ρ²)/2 )

READ       centre  = (2nd, 3rd, 4th) / w
           radius² = |centre|² − 2·(5th)/w`}
        </div>

        <p style={{ textAlign: 'center', margin: '0.3em 0 0.6em' }}>
          <strong style={{ fontSize: '1.1em' }}>And a point is a sphere of radius zero.</strong>
        </p>

        <p style={{ marginBottom: '0.15em' }}>
          <strong>One example, all the way through.</strong> Two spheres of radius{' '}
          <code>0.7</code>, centres at <code>(0,0,0)</code> and{' '}
          <code>(3,0,0)</code>, weights 1. Store them, average the five slots, read back:
        </p>
        <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.78em', whiteSpace: 'pre', lineHeight: 1.55, margin: '0.4em 0 0.6em 1.2em' }}>
{`S₀ = ( 1, 0, 0, 0, (0 − 0.49)/2 )  =  ( 1, 0, 0, 0, −0.245 )
S₁ = ( 1, 3, 0, 0, (9 − 0.49)/2 )  =  ( 1, 3, 0, 0,  4.255 )

M  = (S₀ + S₁)/2                   =  ( 1, 1.5, 0, 0, 2.005 )

centre  = (1.5, 0, 0)/1        =  (1.5, 0, 0)      the midpoint
radius² = 1.5² − 2(2.005)/1    =  2.25 − 4.01  =  −1.76`}
        </div>

        <p style={{ marginBottom: '0.15em' }}>
          Only the last slot of <code>S₁</code> and the answer change as the gap grows:
        </p>
        <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.78em', whiteSpace: 'pre', lineHeight: 1.55, margin: '0.4em 0 0.6em 1.2em' }}>
{`gap 0.6    M = ( 1, 0.3, 0, 0, −0.155 )   radius² =  0.40   ρ = 0.632
gap 1.4    M = ( 1, 0.7, 0, 0,  0.245 )   radius² =  0.00   ρ = 0        ← tangent
gap 3.0    M = ( 1, 1.5, 0, 0,  2.005 )   radius² = −1.76   imaginary`}
        </div>

        <p>
          <strong>The centre never surprises anyone; the radius always does.</strong> The centre comes
          out of a <em>division</em> and lands on the midpoint. The radius comes out of a{' '}
          <em>subtraction involving</em> <code>|centre|²</code> &mdash; which is quadratic, and
          is the only place any non-obvious behaviour can enter.
        </p>
      </>
    ),
    notes:
      'THE SLIDE THAT SHOULD HAVE COME FIRST. Every interactive slide after this treats the '
      + 'five-number encoding as known, and no figure can answer "what am I even specifying?". A '
      + 'worked example can, so this one is text and arithmetic with nothing to drag. '
      + 'OPEN ON WHAT IS SPECIFIED: a centre and a radius. That is all anyone ever types in. The '
      + 'sliders in the next figures are radii and the drag handles are centres -- nothing else. '
      + 'THEN WHY FIVE. Four for the sphere, one for the projective scale. Say it is the SAME extra '
      + 'slot that makes a 3D point into (w, wx, wy, wz) in any rational Bezier, because the room '
      + 'already owns that idea and this is not a new one. '
      + 'THE ONE IDEA ON THE SLIDE is that a POINT IS A SPHERE OF RADIUS ZERO. Points and spheres '
      + 'stop being two kinds of object. Everything later -- the null condition, curves of points, '
      + 'the whole conformal model -- is downstream of that single sentence. '
      + 'WALK THE EXAMPLE SLOWLY and let the room do the arithmetic. Store, average, read back. The '
      + 'centre lands on the midpoint, which nobody doubts. Then the radius comes out NEGATIVE, and '
      + 'that is the moment worth pausing on: two perfectly ordinary spheres, averaged, give '
      + 'something that is not a sphere at all. '
      + 'CLOSE ON WHY. The centre is a division and behaves; the radius is a subtraction involving '
      + '|centre|^2, which is QUADRATIC. All the surprise in this entire representation enters '
      + 'through that one square. Say that and the next three slides stop being mysterious. '
      + 'DO NOT MENTION the null cone, Moebius, PH or the signature here. This slide is arithmetic. '
      + 'The (4,1) signature is only "radius squared is allowed to be negative", and it is better '
      + 'earned by the −1.76 above than announced in advance.',
  },

  // ---------------------------------------------------------------------------
  // 10A2 — TWO SPHERES. The smallest case, and the one that answers "why so many spheres".
  //
  // Degree ONE: a pencil. Every mechanism the later slides use is already here with two objects
  // instead of seven, and it delivers a punchline no higher degree can — the only null curve of
  // degree 1 is a single stationary point, because two point-spheres are orthogonal only when they
  // coincide. Points do not interpolate to points.
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Two spheres</h2>
        <WhenActive>
          <SpherePencilFigure />
        </WhenActive>
      </>
    ),
    notes:
      'THE SMALLEST CASE, and run it slowly -- it is the slide that makes the next two make sense. '
      + 'Two control spheres, P(t) = (1-t)C0 + tC1. Classically a PENCIL of spheres, and every '
      + 'mechanism the later slides use is already here with two objects instead of seven. '
      + 'DRIVE IT WITH THE GAP, and narrate the three regimes. While the spheres OVERLAP, every '
      + 'sphere between them is real -- that is the classical pencil through their common circle. At '
      + 'the moment they are TANGENT the middle one shrinks to a POINT: that is the bifurcation, and '
      + 'it happens at gap = 2 rho exactly. Past that, TWO point-spheres appear and walk outwards, '
      + 'and everything between them is IMAGINARY -- drawn as nothing, because there is nothing '
      + 'there. Those two are the pencil-s classical LIMIT POINTS. '
      + 'MEASURED, radius 0.7 each: gap 0.8 -> mid radius 0.574; 1.2 -> 0.361; 1.4 -> 0.000; '
      + '2.0 -> -0.714 with points at t = 0.143 and 0.857; 3.0 -> -1.327 with points at 0.058 and '
      + '0.942. The limit points are BORN at the centre and separate. '
      + 'AND THEN THE PUNCHLINE, which only degree 1 can deliver. The next slides ask that EVERY '
      + 'sphere on the curve be a point. Here that means <C0,C0> = <C0,C1> = <C1,C1> = 0: both '
      + 'control spheres are points, AND they are orthogonal. But two point-spheres are orthogonal '
      + 'only when they COINCIDE -- their inner product is -half the squared distance. So the only '
      + 'null curve of degree one is a single stationary point. '
      + 'SAY IT AS THE ANSWER TO "WHY SO MANY SPHERES": you cannot draw a segment of points this way. '
      + 'Points do not interpolate to points. A curve of points has to be bought with DEGREE, and the '
      + 'big well-separated control spheres two slides later are what pays for it. That is the whole '
      + 'reason the constrained figure looks the way it does. '
      + 'THE BEAD IS PURE GAUGE HERE, and it is worth a moment because it is the cleanest setting the '
      + 'deck will ever have for it. With TWO control spheres the weight ratio is exactly the '
      + 'reparametrisation: drag the bead and the drawn spheres REDISTRIBUTE along the pencil while '
      + 'the two point-marks do not move at all. Measured -- weights 0.5, 1, 2, 4 put the limit '
      + 'points at t = (0.250, 0.923), (0.143, 0.857), (0.077, 0.750), (0.040, 0.600), and the limit '
      + 'SPHERES sit at x = +-0.7141 every time. The samples slide, the family does not. That is the '
      + 'same thing Eric read off the degree-4 figure -- the dial does not change the curve, it moves '
      + 'the Farin points -- with two objects instead of five. '
      + 'DO NOT INTRODUCE PH HERE. This slide is about the null condition alone -- what it takes to '
      + 'be a curve of POINTS. Speed and PH arrive two slides later and land harder for the wait. '
      + 'core/canalSphereSpline: pointSphereParameters and the pencil table.',
  },

  // ---------------------------------------------------------------------------
  // 10A3 — THREE SPHERES. The inventory slide, and the only rung of the ladder the room can climb.
  //
  // 13 shows the null condition being UNREACHABLE (degree 1 gives a single stationary point). 15
  // shows it at degree 6, where nobody could find it by hand — which is why that figure opens
  // sitting on it. This slide is the one degree where the condition is reachable BY HAND: three
  // spheres, fourteen handles, five numbers, nothing imposed and nothing that helps.
  //
  // No control points, no polygon, no Farin bead. Only spheres, and a point is a sphere of radius
  // zero. Everything asserted is measured in core/__tests__/spherePolygonDegreeTwo.test.ts.
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Three spheres</h2>
        <WhenActive>
          <ThreeSphereFigure />
        </WhenActive>
      </>
    ),
    notes:
      'THE SLIDE WHERE THEY GET TO DO IT. Two spheres could not be a curve of points at all. Seven '
      + 'spheres, two slides from now, is a knife edge in seventeen dimensions that only a solver '
      + 'finds. THREE is the one size where the condition is reachable by hand, so this is the only '
      + 'rung of the ladder the room can climb, and it is worth taking slowly. '
      + 'OPEN ON THE INVENTORY, and say it plainly: forget control points, forget the polygon, forget '
      + 'the bead from the last slide. There are three SPHERES. A point is a sphere of radius zero. '
      + 'Each sphere has a centre, a radius and a weight -- fifteen numbers, one of them an overall '
      + 'scale, so FOURTEEN handles. Against them, FIVE numbers on the screen. Nothing here will move '
      + 'them for you. '
      + 'IT OPENS ON A STRAIGHT LINE, and that is worth reading out before touching anything: two '
      + 'point-spheres, and between them the sphere on the segment as DIAMETER -- centre the '
      + 'midpoint, radius half the chord, weights 1, 1, 1. Measured to 1e-14. All five numbers are '
      + 'zero, so every sphere on the curve is a point and there is nothing to see but a segment. '
      + 'The simplest curve there is, and it already needs three spheres to say. '
      + 'NOW TOUCH ANYTHING, and this is the first lesson: move a centre, grow a radius, pull a '
      + 'weight, and spheres appear all along the curve. What is really being built is a TUBE, and '
      + 'the line was the one member where it had collapsed. Push further and the middle goes '
      + 'IMAGINARY -- drawn as nothing, because nothing is there. That is slide 13-s gap between two '
      + 'separated point-spheres arriving one degree later. '
      + 'THEN DRIVE IT DOWN, ONE NUMBER AT A TIME, and let the readout lead. Shrink the first sphere '
      + 'to a point: the first number goes out. Shrink the last: the fifth goes. Now the middle '
      + 'sphere has to TOUCH both of those points -- that is two more numbers -- and its weight has '
      + 'to balance its size, which is the fifth. Measured, and this is the sentence that makes the '
      + 'readout worth showing: pushing the middle centre off the bisector plane breaks the FOURTH '
      + 'number alone and leaves the rest at 1e-17. Five separate statements, one handle each. '
      + 'THE TWO SIDES OF THE EDGE, and show both. With the ends as points and the middle sphere too '
      + 'BIG, the tube is a spindle: radii 0, 0.765, 0.883, 0.765, 0. Too SMALL and it is 0, -0.437, '
      + '-0.505, -0.437, 0 -- NEGATIVE, imaginary, drawn as nothing. There is a GAP where the curve '
      + 'should be, which is slide 13-s two separated point-spheres arriving one degree later. The '
      + 'null condition is the knife edge BETWEEN a fat tube and nothing at all. '
      + 'AND WHAT YOU GET WHEN YOU LAND ON IT, said only after they see it: the curve is an ARC OF A '
      + 'CIRCLE. Every time. At this degree there is nothing else -- measured, any two arcs have the '
      + 'same invariant table, so up to a Mobius transformation there is exactly ONE curve here. All '
      + 'nine remaining dimensions are placement. '
      + 'THE FREE GIFT, if the room is with you. That arc is automatically PH -- the speed numerator '
      + 'comes out a perfect square, measured, and nobody asked for it. Two slides from now PH will '
      + 'be a second condition costing real freedom; here it arrives with the first one. That is not '
      + 'luck, it is that degree 2 has no room to be anything but a circle. '
      + 'WALKING THE FAMILY, which is the best thing to do with the last minute. Keep the middle '
      + 'sphere touching BOTH ends and slide it along the plane that bisects the chord: the segment '
      + 'bows into arcs, and the further out the sphere goes the FATTER the arc. Measured -- apex 0 '
      + 'is the diameter sphere at radius 1; the quarter circle is centre 1.000, radius 1.414, weight '
      + '0.707; near the half circle it is centre 19.5 with weight 0.05; and AT the half circle the '
      + 'centre has run to infinity and the sphere has become a PLANE, which in this model is an '
      + 'ordinary sphere. Past that it comes back from the other side with a NEGATIVE weight. '
      + 'Nothing degenerates except the words "centre and radius". '
      + 'DO NOT SAY EQUIVARIANT, DO NOT MENTION QUATERNIONS. The dictionary between this slide and '
      + 'the spinor picture is real and measured, but it is not what this slide is for. '
      + 'core/canalSphereSpline: nullCoefficients, conformalSphereAt.',
  },

  // ---------------------------------------------------------------------------
  // 10B — THE SAME RULE, NOTHING IMPOSED. The warm-up 10A was supposed to be and is not.
  //
  // 10A interpolates centre and radius SEPARATELY — intuitive, and what the canal literature does,
  // but NOT the rule slide 11 uses, so it builds intuition for a different object. This slide uses
  // slide 11's rule exactly and removes only the conditions. It also SEEDS FROM SLIDE 11'S OWN
  // MEMBER, so it opens sitting on the constraint and the first drag is the lesson.
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>The same rule, with nothing imposed</h2>
        <WhenActive>
          <ConformalSphereFigure />
        </WhenActive>
      </>
    ),
    notes:
      'THE PREVIOUS SLIDE USED A DIFFERENT RULE, and say so plainly rather than letting anyone '
      + 'discover it. There, centre and radius were interpolated SEPARATELY -- average the centres, '
      + 'average the radii -- which is intuitive and is what the canal-surface literature does. Here, '
      + 'and on the NEXT slide, the five-number VECTORS are averaged and the centre and radius are '
      + 'read off the result. Same data, different rule, different curve. '
      + 'SAME SEVEN SPHERES, TWO RULES, measured: control radii 0, 0.81, 0.67, 1.51, 0.62, 0.62, 0. '
      + 'The canal rule gives radii 0, 0.71, 0.91, 0.63, 0 along the curve -- a tube. This rule gives '
      + '0, 0, 0, 0, 0 -- a curve. '
      + 'IT OPENS ON THE CONSTRAINT, which is the whole design. The seed IS the next slide\'s member, '
      + 'so every sphere on the curve is a point and there is nothing to see but a curve. Then move '
      + 'ANYTHING -- a centre, a radius -- and the spheres along the curve balloon. That is what the '
      + 'null condition was holding down, shown by removing it rather than by writing it. '
      + 'THEN THE MECHANISM, and this is the sentence to get across. Take two spheres of radius 0.7 '
      + 'and separate them. The sphere BETWEEN them goes 0.633, 0.490, 0.000, -0.714, -1.327 as the '
      + 'gap grows 0.6, 1.0, 1.4, 2.0, 3.0. It does not average -- separating drives it DOWN, through '
      + 'zero, and out into IMAGINARY. And zero lands at gap 1.4 = 2 x 0.7, exactly where the two '
      + 'spheres are TANGENT. '
      + 'SO THE NULL CONDITION HAS A MEANING you can hold: keep every sphere on the curve at that '
      + 'crossing point, at every t at once. Not an equation to admire -- a knife edge to sit on. '
      + 'AND THAT ANSWERS THE QUESTION THE NEXT SLIDE ALWAYS RAISES: why are its control spheres '
      + 'huge when the curve is a curve? Because big and well separated is exactly what drives the '
      + 'in-between radius down to zero. Small ones would leave it fat. The scaffold has to be large '
      + 'for the thing it scaffolds to be thin. '
      + 'THE SHARPEST VERSION, if you have a moment: two POINT-spheres a unit apart already fail it -- '
      + 'the sphere between them has radius squared -0.25. POINTS DO NOT INTERPOLATE TO POINTS. That '
      + 'is why the null condition is a real condition and not bookkeeping. '
      + 'core/canalSphereSpline, and the two-rule comparison is pinned there.',
  },

  // ---------------------------------------------------------------------------
  // 11 — a rational PH curve built directly in the conformal model
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Or build it there in the first place</h2>
        <WhenActive>
          <RationalPHCurveFigure />
        </WhenActive>
      </>
    ),
    notes:
      'THE POINT OF THIS SLIDE, against the previous one: nothing was bent. The control points are ' +
      'placed directly in the conformal model. ' +
      'DO NOT SAY "AND NOTHING COULD BEND TO THIS." That was this slide\'s headline and it is ' +
      'withdrawn. The argument was: a Mobius image has EVEN conformal degree, so the ODD degrees are ' +
      'unreachable by bending. The parity theorem then showed odd conformal degree is never GENUINELY ' +
      'odd — a real root of w forces the whole member to factor, and a real odd-degree polynomial ' +
      'always has one. The degree-5 member this figure used to load measured denominatorRealRoots = 1: ' +
      'it was a QUARTIC in a quintic polygon, so one of its six control points was pure ' +
      'reparametrisation and the unreachability argument did not apply to the curve on screen. Hence ' +
      'degree 6, where w generically avoids the real axis (five members of five). ' +
      'WHAT THE SLIDE ARGUES NOW, and it was always the better half: bending here is a CONSTANT ' +
      'MATRIX, so the polygon maps one point for one point and the degree does not move — against ' +
      'slide 10, where the same bend takes 8 control points to 15. ' +
      'AND IF SOMEONE PRESSES ON "COULD BENDING REACH THIS ANYWAY", the honest answer is a DEGREE-4 ' +
      'one, inherited from the retired quartic slide and sharper than anything available here. The ' +
      'lift doubles the degree, so a Mobius image of a polynomial PH curve of degree d lands at ' +
      'conformal degree 2d. Conformal 4 therefore comes from a polynomial PH QUADRATIC — and a PH ' +
      'quadratic is a straight LINE, since |p-prime| = |at+b| forces p-prime = (at+b)u with u ' +
      'constant. So at conformal degree 4, bending a polynomial produces ONLY circles and lines, while ' +
      'building directly gives 13 dimensions of genuinely spatial curves (measured: curvature spread ' +
      '0.39, out-of-plane 0.05). That is a QUALITATIVE gap and it lands two degrees below this one. ' +
      'At conformal 6 the same question is subtler: it carries the polynomial PH CUBICS (a polynomial ' +
      'PH quintic needs conformal degree 10), but a generic member here is not a bent cubic at all — ' +
      'being a Mobius image of a polynomial needs a NULL S with <P,S> constant, and at degree 6 that ' +
      'orthogonal complement measures ZERO-dimensional, so there is no candidate even to test. ' +
      'WHY NOT DEGREE 3, and say this if anyone asks why not start smaller — it is a result, not ' +
      'a preference. Four coefficients span at most a 4-dimensional subspace of R^{4,1}, so a vector S ' +
      'is left orthogonal to all of them, and <P(x),S> = 0 confines every point of the curve to the ' +
      'single sphere S. Measured, the span collapses further to rank 3 (sigma = 2.2, 1.5, 1.1, 6e-9), ' +
      'which meets the null cone in a CIRCLE: flat to 1e-9, curvature spread 0.000. And it stays a ' +
      'circle with the PH conditions REMOVED, so the null condition is doing it, not PH. The count ' +
      'closes: null-only degree 3 is 13-dimensional = 6 for the circle in R^3 plus 7 for the degree-3 ' +
      'rational maps onto it, and PH cuts 13 to 11 — so PH does not choose the shape there at all, only ' +
      'how the circle is traversed. Degree 4 and up have no such confinement. ' +
      'AND THE FIRST VERSION OF THIS FIGURE WAS DEGREE 3. It drew a circular arc under a caption about ' +
      'general rational PH cubics, because findMember guarded radii, weights, span and the denominator ' +
      'and NOT planarity — in a module whose own header carries the septic planar-trap warning. Eric ' +
      'asked whether the curve was staying in a plane. It was. ' +
      'THE DEFINITION IS TWO CONDITIONS AND NOTHING ELSE: P is NULL, so it is a curve of points, and ' +
      '<P\u2032,P\u2032> is a PERFECT SQUARE, which is what PH means here. That second one is the find — ' +
      'the exact analogue of "|A|\u00b2 is a polynomial" in the Hopf form, but stated with no ' +
      'quaternions, no coordinates and no choice of origin. Verified to 1e-15, and a non-PH curve ' +
      'fails it by 1.9e-2. ' +
      'WHY NOTHING FIVE-DIMENSIONAL IS DRAWN: a conformal vector\u2019s five coordinates ARE weight + ' +
      'centre + radius, because the infinity-component is fixed by the null condition. So the seven ' +
      'sphere centres are the ordinary rational-Bezier control points, the ends have radius zero (they ' +
      'are point-spheres), and — the load-bearing fact, verified to 1e-8 — the OUTER radii are ' +
      'DETERMINED: rho_1 = |P1-P0| and rho_5 = |P5-P6|, so those two spheres GRIP the endpoints and are ' +
      'drawn from the polygon with nothing stored. ' +
      'THE REST OF THE DICTIONARY, if pressed — these are the DEGREE-3 forms, quoted because they are ' +
      'the ones short enough to say out loud: w0w2 pow(P0,S2) = 3w1^2 rho_1^2, mirrored, and ' +
      'w0w3|P0-P3|^2 + 9w1w2(|P1-P2|^2 - rho_1^2 - rho_2^2) = 0. Each is a null condition read as ' +
      'geometry, all confirmed to 1e-11 or better. ' +
      'THE WEIGHTS ARE FARIN BEADS and the count is exact: six legs, six weight ratios after the ' +
      'overall scale. All six at the midpoints would mean polynomial, so the rationality is visibly ' +
      'how far off-centre they sit; a bead leaving its segment would mean a negative weight ratio. Same ' +
      'visual language as the sketcher\u2019s complex rational B-splines. ' +
      'THEY ARE A READOUT AND NOT A HANDLE, in both modes, and the reason is worth a sentence because ' +
      'it is a design principle rather than a limitation: in strict the four dials already spend the ' +
      'slice, and in free the eleven dimensions are what the seven POINTS are for. A weight handle ' +
      'competing with a point handle for the same dimensions is two controls for one freedom. So the ' +
      'gesture is to move something else and watch the rationality answer on its own. (They were ' +
      'draggable once and it read as dead, because dragFarin clamps each event to 0.03 in the ratio ' +
      'and the bead crawled behind the cursor. That was the symptom; the line above is the cause.) ' +
      'THE COST OF PH, at degree 3 where the elementary count is easy to state: an ordinary rational ' +
      'cubic has 15 degrees of freedom and the PH ones 11 — measured two independent ways, as the rank ' +
      'of the conformal system and as 15 minus the four conditions for ||q\u2032w-qw\u2032|| to be a ' +
      'polynomial. CODIMENSION 4. So nothing moves alone here either: drag a point and the weights ' +
      'answer, which is what the beads make visible. ' +
      'THE MIDDLE RADII ARE WHY THE SPHERES CARRY CONTROLS AT ALL. b_1 = <C_0,C_1> and ' +
      'b_{2n-1} = <C_{n-1},C_n> hold at EVERY degree, so the OUTER spheres always grip the endpoints ' +
      'and are drawn from the polygon. At degree 3 that is all of them, so the spheres are a reveal ' +
      'with nothing attached. Here rho_2, rho_3 and rho_4 are pinned to nothing — three genuine extra ' +
      'dimensions, and the sphere picture becomes load-bearing instead of derived. ' +
      'STRICT AND FREE, and this is the deck\'s gesture pair arriving on the rational curve. STRICT ' +
      'holds the outer TWO at each end — P0, P1, P5, P6, twelve coordinates against seventeen — and ' +
      'what is left is SIX, which decomposes as 1 projective scale + 1 parameter gauge + FOUR SHAPES. ' +
      'Hence four dials and not three: rho_2, rho_3, rho_4 cut three of the four and the TOTAL ARC ' +
      'LENGTH cuts the fourth. Measured one readout at a time, 6-5-4-3-2. FREE hides the dials, makes ' +
      'every point a handle and holds the ends unless you grab one — eleven dimensions. ' +
      'SAY THE DEGREE-4 FACT IF THERE IS TIME, because it is what makes the strict mode worth having: ' +
      'two degrees down this gesture is IMPOSSIBLE. Pinning the four outer points of a quartic leaves ' +
      'exactly one dimension and it is a pure weight direction — the middle point moves 1e-6 while ' +
      'every weight moves 0.1 to 0.5. "There are dimensions left" and "this handle moves" are ' +
      'different claims; degree 6 is where they agree. Measured: all four handles track to 100% with ' +
      'the other three held to 1e-15, and the interior absorbs 0.32 on a 0.15 ask. ' +
      'AND ONE DIAL IS FORBIDDEN HERE — a HALF arc length. Pinning control POINTS leaves the gauge ' +
      'live (lambda^k moves no control point, so it satisfies the pins for free) and the half-lengths ' +
      'are not gauge-invariant, so that slider would move every weight and bead with the curve ' +
      'standing still. It is the dead dial that retired the degree-5 slide; dragPinned throws rather ' +
      'than offering it. Radii and the TOTAL length are invariant, which is why those four are safe. ' +
      'THEY ARE SLIDERS, NOT 3-D HANDLES, and if anyone asks, say why: a radius is a SCALAR. The old ' +
      'handle asked for it with a point drag, was drawn at centre + (rho,0,0) so it teleported back to ' +
      'the x-axis after every event, and read the radius as |cursor - centre| — so dragging AROUND the ' +
      'sphere did nothing while dragging ACROSS it took the radius through zero. Eric found it by ' +
      'using it. The solve runs on the UNBENT curve, because a bend changes the radii. ' +
      'THE SHAPE BUDGET: 18 dimensions, 17 after the projective scale, of which TEN are Mobius ' +
      'MOTIONS — the group is ten-dimensional — leaving 2n-5 = 7 shape moduli. Pinning the ends ' +
      'freezes most of the motions, which is why they are pinned. ' +
      'TWO NUMBERS THIS SLIDE USED TO CARRY ARE RETRACTED (RATIONAL_PH_STATE section 7): "9 Mobius ' +
      'motions, 6 shape moduli" subtracted nine for a ten-dimensional group, and the comparison ' +
      'figure below was NEVER MEASURED. Do not quote it. Kept only so nobody re-derives it: ' +
      'OLD TEXT — "direct is 17-dimensional against the Mobius ' +
      'orbit\u2019s measured 13 — 8 shape moduli against 4, twice as many." ' +
      'THE TRAP, if the figure ever looks collapsed: the family has a large degenerate stratum, and ' +
      'unguarded solves land on it — interior radii collapsing to 1e-3, weights going negative, the ' +
      'curve spanning a hundredth of its polygon. The mechanism is in the dictionary: as rho_1 goes to ' +
      'zero, P1 falls onto P0 and the cross condition drags P0 onto S2. Same shape of trap as the ' +
      'septic\u2019s planar locus, hence the guards in findMember. ' +
      'AND THE SPEED IS (n-2)/n: |p\u2032| = h/w, so h is QUARTIC here and w is sextic. That degree drop ' +
      'is where the one rank deficiency in the system came from, and it is pinned. ' +
      'core/conformalPHCurve (22 tests), conformalPHFamily (10), conformal (28).',
  },
  // ---------------------------------------------------------------------------
  // SECTION III — WHAT EACH ONE BUYS. The payoff, then the ask.
  // ---------------------------------------------------------------------------
  {
    type: 'title',
    content: (
      <>
        <h1>III &mdash; The gap</h1>
        <div className="subtitle" style={{ fontSize: '0.66em', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', whiteSpace: 'pre', lineHeight: 1.7 }}>
{`the chart       needs every pole INVERTIBLE      σ(r) ≠ 0
the spheres     land where every pole is SINGULAR σ = h·w`}
        </div>
        <div className="event note" style={{ marginTop: '1.5em' }}>
          Two <em>disjoint</em> charts are not an atlas &mdash; there is nothing to hand a curve
          across in.
        </div>
        <div className="event note" style={{ marginTop: '0.6em' }}>
          The region that would touch both is the one neither construction has.
        </div>
      </>
    ),
    notes:
      'THIS SECTION CHANGED SHAPE, and the reason is worth knowing. It began as "what each one buys" '
      + '-- a chart on one side, a solver on the other -- which was Eric-s original sixth item. It did '
      + 'not survive contact with the deck: the chart IS the spinor thread and the solver IS the last '
      + 'sphere slide, so both tools live inside section II and III had nothing left but a divider and '
      + 'a question. It is now THE GAP, which is a different KIND of thing from I and II -- the object, '
      + 'then the two ways to write it, then the frontier -- and it carries the material the meeting is '
      + 'actually for. '
      + 'THE ASYMMETRY IS STILL THE WAY IN. On the spinor side you get genuine COORDINATES -- '
      + 'the lambda chart -- but the curve must be integrated, and killing the logarithms costs a '
      + 'residue condition at every pole. On the conformal side nothing is integrated, because the '
      + 'curve is built where it lives; the price is that dragging needs a constrained solver and '
      + 'there are no coordinates at all. '
      + 'AND THEY DO NOT OVERLAP, which is the real finding and the thing to put to the room. The '
      + 'lambda chart needs every pole INVERTIBLE; the conformal construction lands where every pole '
      + 'is SINGULAR (sigma = h w). Two disjoint charts are not an atlas -- nothing can be carried '
      + 'from one to the other, because there is no shared region to hand it over in. '
      + 'SO THE MIXED CELL -- some poles invertible, some singular -- is not an unexplored corner of a '
      + 'classification. It is the connective tissue an atlas requires, and it currently belongs to '
      + 'neither construction. That is what the last slide asks for help with.',
  },
  // ---------------------------------------------------------------------------
  // THE LAST SLIDE — the questions, collected. This is what the discussion is for.
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>What is open</h2>

        <p style={{ marginBottom: '0.3em' }}>
          <strong>1. Is the sphere polygon new?</strong> The ℝ⁴′¹ null-lift construction with the
          control polygon as <em>weighted spheres</em> returned no search hits in two reading
          sessions &mdash; which is &ldquo;not found&rdquo;, not &ldquo;new&rdquo;. Choi, Lee &amp;
          Moon is the paper to settle it against, being the Clifford/spin representation of the
          hodograph. <span style={{ color: '#64748b' }}>One expert can answer this in a minute.</span>
        </p>

        <p style={{ marginBottom: '0.3em' }}>
          <strong>2. Does the mixed cell exist?</strong> Some poles invertible, some singular &mdash;
          the region that would touch both charts. σ = |𝒜|² is multiplicative, so a product spinor
          puts the zeros of σ exactly where one chooses; but the residue conditions do <em>not</em>
          survive the product, for two measured reasons: the stray term
          <code> vec(𝒜₁′(r)·N₂(r)·𝒜₁*(r))</code>, and the fact that Σ<sub>k</sub> = Σ<sub>l≠k</sub>
          1/(r<sub>k</sub>−r<sub>l</sub>) moves when pole sets merge. So the product is an
          <em> ansatz</em>, and the question is a solve.
        </p>

        <p style={{ marginBottom: '0.3em' }}>
          <strong>3. Can the σ = 0 stratum be charted?</strong> Its rank-1 floor &mdash; where the
          circle lives &mdash; is a cone over a Segre embedding, so the datum at a singular pole
          should be a point of ℙ¹×ℙ¹ exactly where the invertible case carries one real λ. That would
          buy <em>uniformity</em>, not coverage: the conformal construction already covers that
          stratum. Untried.
        </p>

        <p style={{ marginBottom: '0.35em' }}>
          <strong>4. And the one behind all of it.</strong> Local modification of 3D PH curves during
          editing. The rational work is a detour taken to understand the object well enough to get
          there.
        </p>

        <p style={{ fontSize: '0.86em', color: '#64748b' }}>
          Retracted claims are kept, not deleted &mdash; conformal covariance dissolves the PH
          obstruction but <em>not</em> the arc-length one (σ′(i) = 4i ≠ 0, and Möbius maps are not
          isometries); the λ dial does not reach the circle, because it degenerates on the other
          floor of the stratum.
        </p>
      </>
    ),
    notes:
      'THIS IS THE SLIDE THE MEETING IS FOR, so leave it up and stop talking. '
      + 'QUESTION 1 IS THE CHEAP ONE and the most valuable: is the weighted-sphere polygon already in '
      + 'the literature? Two reading sessions found nothing, which is NOT a survey. Choi, Lee and Moon '
      + 'is the paper to check it against. One person in the room may settle it in a minute, and that '
      + 'either saves months or redirects them. '
      + 'QUESTION 2 IS THE ONE WE TRIED. The product spinor idea is sound for the sigma PATTERN, which '
      + 'is the hard half to arrange -- multiplicativity puts the zeros exactly where you choose. It '
      + 'fails as a CONSTRUCTION for two measured reasons: a stray vector-part term, and the fact that '
      + 'Sigma is not a property of a factor, so merging pole sets retunes every residue condition. '
      + 'The honest state is that this turns C21 from a survival question into a solve. '
      + 'QUESTION 3 IS THE STRUCTURAL ONE. Rank-1 matrices are outer products, the cone over the '
      + 'Segre embedding, smooth away from zero -- so P1 x P1 coordinates ought to replace the single '
      + 'real lambda at a singular pole. It buys one solver and one editing model instead of two. '
      + 'Nobody has tried it. '
      + 'DO NOT OVERSELL ANY OF THIS. The retraction line at the bottom is deliberate: it says what '
      + 'covariance does not buy, and it says the lambda dial never reaches the circle. A deck that '
      + 'admits two retractions is easier to argue with, which is the point of circulating it.',
  },
]


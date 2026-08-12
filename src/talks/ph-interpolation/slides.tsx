// ============================================================================
// Pythagorean–Hodograph Curves and Their Rational Frames
//   Solution structure, selection, and interactive motion
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
import RationalPHQuarticFigure from './RationalPHQuarticFigure'
import SexticFivePointFigure from './SexticFivePointFigure'
import RationalPHLoopFigure from './RationalPHLoopFigure'
import RationalPHTwoPoleFigure from './RationalPHTwoPoleFigure'
import IndicatrixFigure from './IndicatrixFigure'
import StrictFreeRationalFigure from './StrictFreeRationalFigure'
import ComplexRationalPHFigure from './ComplexRationalPHFigure'
import WhenActive from '../framework/slideContext'

export const slides: SlideDefinition[] = [
  // ---------------------------------------------------------------------------
  {
    type: 'title',
    content: (
      <>
        <h1>Pythagorean–Hodograph Curves and Their Rational Frames</h1>
        <div className="subtitle">Solution structure, selection, and interactive motion</div>
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
      'Working title. "Rational frames" is the field\'s own term, and it is the strongest ' +
      'available claim: a non-constant unit vector field can never be polynomial, since ' +
      '|e|² ≡ 1 forces the leading coefficient to vanish. The polynomial object is the ' +
      'spinor A; the frame is rational because normalising by σ = |A|² is a division.',
  },

  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Outline</h2>
      </>
    ),
    notes:
      'Deliberately empty for now — filled once the acts settle. Planned shape: ' +
      'I Counting (how many PH curves meet given data), II Choosing (the spatial ' +
      'two-parameter family and the fairness landscape), III Moving (dragging as ' +
      'transport; monodromy and holonomy), IV Frames (ERF, Frenet, RMF, RRMF), ' +
      'V The frontier (arbitrary-degree RRMF construction — open in the survey\'s own words).',
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
      'placed directly in the conformal model, and this curve is NOT reachable by any Mobius ' +
      'transformation of a polynomial PH curve — the lift doubles the degree, so a Mobius image always ' +
      'has EVEN conformal degree, and the odd ones are unreachable by bending. ' +
      'WHY DEGREE 5 AND NOT 3, and say this if anyone asks why not start smaller — it is a result, not ' +
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
      'centre + radius, because the infinity-component is fixed by the null condition. So the four ' +
      'sphere centres are the ordinary rational-Bezier control points, the ends have radius zero (they ' +
      'are point-spheres), and — the load-bearing fact, verified to 1e-9 — the interior radii are ' +
      'DETERMINED: rho_1 = |P1-P0|, rho_2 = |P2-P3|. The spheres are drawn from the polygon with ' +
      'nothing stored, which is why both pictures fit in one figure. ' +
      'THE REST OF THE DICTIONARY, if pressed: w0w2 pow(P0,S2) = 3w1^2 rho_1^2, mirrored, and ' +
      'w0w3|P0-P3|^2 + 9w1w2(|P1-P2|^2 - rho_1^2 - rho_2^2) = 0. Each is a null condition read as ' +
      'geometry, all confirmed to 1e-11 or better. ' +
      'THE WEIGHTS ARE FARIN BEADS and the count is exact: three legs, three weight ratios after the ' +
      'overall scale. All three at the midpoints would mean polynomial, so the rationality is visibly ' +
      'how far off-centre they sit; a bead leaving its segment would mean a negative weight ratio. Same ' +
      'visual language as the sketcher\u2019s complex rational B-splines. ' +
      'THE COST OF PH, at degree 3 where the elementary count is easy to state: an ordinary rational ' +
      'cubic has 15 degrees of freedom and the PH ones 11 — measured two independent ways, as the rank ' +
      'of the conformal system and as 15 minus the four conditions for ||q\u2032w-qw\u2032|| to be a ' +
      'polynomial. CODIMENSION 4. So nothing moves alone here either: drag a point and the weights ' +
      'answer, which is what the beads make visible. ' +
      'THE MIDDLE RADII ARE THE REASON FOR DEGREE 5 rather than just more moduli. b_1 = <C_0,C_1> and ' +
      'b_{2n-1} = <C_{n-1},C_n> hold at EVERY degree, so the OUTER spheres always grip the endpoints ' +
      'and are drawn from the polygon. At degree 3 that is all of them, so the spheres carry no ' +
      'handles. From degree 5 on the middle radii are pinned to nothing — real freedom, with their own ' +
      'handles, and the sphere picture becomes load-bearing instead of derived. ' +
      'WHY DIRECT BEATS BENDING, if anyone asks whether this is just slide 10 again: the family has ' +
      'dimension 2n+5, of which 9 are Mobius MOTIONS, so 2n-4 genuine shape moduli. At conformal ' +
      'degree 6, where the two constructions finally meet, direct is 17-dimensional against the Mobius ' +
      'orbit\u2019s measured 13 — 8 shape moduli against 4, twice as many. ' +
      'THE SHAPE BUDGET HERE: 15 dimensions, 9 Mobius motions, 6 shape moduli — three times degree 3. ' +
      'Pinning the ends freezes most of the motions, which is why they are pinned. ' +
      'THE TRAP, if the figure ever looks collapsed: the family has a large degenerate stratum, and ' +
      'unguarded solves land on it — interior radii collapsing to 1e-3, weights going negative, the ' +
      'curve spanning a hundredth of its polygon. The mechanism is in the dictionary: as rho_1 goes to ' +
      'zero, P1 falls onto P0 and the cross condition drags P0 onto S2. Same shape of trap as the ' +
      'septic\u2019s planar locus, hence the guards in findMember. ' +
      'AND THE SPEED IS (n-2)/n: |p\u2032| = h/w, so h is CUBIC here and w is quintic. That degree drop ' +
      'is where the one rank deficiency in the system came from, and it is pinned. ' +
      'core/conformalPHCurve (22 tests), conformalPHFamily (10), conformal (28).',
  },

  // ---------------------------------------------------------------------------
  // 12 — strict and free on the rational curve
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Strict and free, one dimension richer</h2>
        <WhenActive>
          <StrictFreeRationalFigure />
        </WhenActive>
      </>
    ),
    notes:
      'THE COMPARISON IS THE SLIDE, and it is the same gesture pair as slides 4, 6, 7 and 8. Pin the ' +
      'C1 Hermite data: 12 conditions against the degree-5 rational family\u2019s 15, so THREE remain. ' +
      'Measured, rank 31 of 32 with a gap of 2.5e8. Slide 7\u2019s POLYNOMIAL PH quintic has 14 before ' +
      'its data and 2 after. So at the same degree and the same data, RATIONALITY BUYS EXACTLY ONE MORE ' +
      'DIMENSION: the torus becomes a 3-fold, two dials become three sliders. ' +
      'WHAT THE THREE SLIDERS ARE was measured, not chosen. Candidate quantities were added to the ' +
      'pinned system one at a time and the rank watched: {rho_2, rho_3, arc length} is COMPLETE — rank ' +
      '34, freedom 0. So are {rho_2, rho_3, <C2,C3>} and {L, lambda_1, lambda_2}. And {rho_2, rho_3, ' +
      'lambda_1} is NOT — freedom 1 — because lambda_1 is dependent on the two radii once the data is ' +
      'pinned. Worth saying if anyone asks why these three: because the other obvious triple fails. ' +
      'The two radii were already handles on slide 11, and arc length rhymes with slide 7, where L ' +
      'turns out to depend on one coordinate alone. ' +
      'ONE SLIDER AT A TIME, and this is the engineering point. Prescribing all three leaves the system ' +
      'exactly determined with a projective kernel, and Newton stalls at a defect of 1e-6 to 1e-7 — the ' +
      'three coordinates were hit EXACTLY while the defining conditions were not, which would have been ' +
      'a figure enforcing something other than what it displays. Pinning w_0 = 1 to kill the kernel ' +
      'made it worse, so that diagnosis was wrong. Prescribing only the slider being touched leaves 2 ' +
      'spare dimensions — the shape of every drag in this codebase that behaves — and the defect ' +
      'returns to 1e-13. ' +
      'SO THE OTHER TWO READINGS DRIFT while you move one, and the sliders show their measured values ' +
      'rather than holding position. They are genuinely coupled by the defining conditions; hiding that ' +
      'would be displaying one quantity and enforcing another. ' +
      'AND THE FOUR OUTER POINTS ARE NOT THE DATA, unlike slide 7 where P1 = p_i + d_i/5 makes dragging ' +
      'them identical to prescribing Hermite data. For a rational curve r\u2032(0) = 5(w_1/w_0)(P1-P0) ' +
      'carries the weights too, so pinning the four points and pinning the data give DIFFERENT 3-folds ' +
      'of the same dimension — both freedom 3, measured. The figure pins the data and drags the points ' +
      'to move it. ' +
      'FREE releases everything but the ends: 9 dimensions, and the Farin beads come back. ' +
      'core/conformalPHCurve, 32 tests.',
  },

  // ---------------------------------------------------------------------------
  // 13 — degree 4: the smallest genuinely-new rational case, and rigidity + the gauge
  // ---------------------------------------------------------------------------
  // the plane first — Mobius costs nothing, and the Farin beads leave their edges
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
  {
    type: 'content',
    content: (
      <>
        <h2>Four points fix the quartic</h2>
        <WhenActive>
          <RationalPHQuarticFigure />
        </WhenActive>
      </>
    ),
    notes:
      'DEGREE 4, AND THE PREVIOUS TWO SLIDES ARE QUARTICS TOO — they just do not say so. Nullity is a ' +
      'POLYNOMIAL identity, |q|^2 = 2 w c_inf, so at any real root of w the numerator vanishes as well ' +
      'and (t-r) divides q, w and h alike. A real polynomial of ODD degree always has a real root, and ' +
      'deg w = n. So EVERY degree-5 member is a quartic in a quintic polygon. Measured across degrees ' +
      '3, 5, 7: exactly ONE real root of w every time, with q vanishing there to 1e-7. Degree 6: none, ' +
      'five members of five. Degree 4: none in three of five, TWO in the other two — reducible by two ' +
      'degrees, which is what an even degree allows. This figure guards against it and the readout shows ' +
      'the count. AND THE DEGREE-3 CIRCLE IS A COROLLARY: a cubic member is (t-r) times a quadratic, a ' +
      'rational quadratic is a conic, and PH makes it a circle. ' +
      'WHY THIS IS THE STRONGEST SLIDE FOR THE CONFORMAL MODEL. The lift DOUBLES the degree, so a ' +
      'Mobius image of a polynomial PH curve of degree d lands at conformal degree 2d. Conformal 4 comes ' +
      'from a polynomial PH QUADRATIC, and a PH quadratic is a straight LINE: |p′| = |at+b| forces ' +
      'p′ = (at+b) u with u constant. So at this degree bending a polynomial can produce ONLY circles ' +
      'and lines, while building directly gives 13 dimensions of spatial curves — measured here at ' +
      'curvature spread 0.39 and out-of-plane 0.05. That is a QUALITATIVE gap, sharper than degree 6’s ' +
      '17-against-13, and it lands two degrees earlier. ' +
      'THE DIAL IS THE PARAMETER GAUGE, AND SAY SO OUT LOUD — it is the best beat on the slide. Holding ' +
      'the four outer points is 12 conditions on 13, leaving ONE, and that one does not change the ' +
      'curve. Turn the dial and every weight moves, all four beads slide, the readouts all change, and ' +
      'the drawn curve sits still. Measured: the weight ratios w_k/w_k(0) come out 1, 3.4218, 11.7090, ' +
      '40.0665, 137.1015 — a SINGLE lambda = 3.4218 recovered to four decimals from all four — and the ' +
      'image is unchanged to 2.6e-3 of the extent, which is the sampling resolution. w_k -> lambda^k w_k ' +
      'is the classical rational-Bezier reparametrisation; the Mobius map t -> lambda t/(1+(lambda-1)t) ' +
      'preserves rational PH because the chain rule multiplies |p′| by a rational scalar. ' +
      'THIS FIGURE TAUGHT US THAT, and Eric read it off the screen before the algebra did: "the dial ' +
      'does not change the shape of the curve, it just moves the Farin points." An earlier version of ' +
      'the slide claimed the frozen polygon carried a family of DISTINCT curves. It does not. If asked ' +
      'how it was missed: uniform-in-t samples move by 0.56 of the extent under the dial, because the ' +
      'points slide ALONG the curve — parametrisation motion misread as shape motion. ' +
      'AND IT IS FORCED, NOT AN ACCIDENT OF THE SEED. lambda^k changes only weights; every control ' +
      'point, as a projective point, stays put. So the gauge lies in the nullspace of any constraint of ' +
      'the form "control point k is HERE" — structurally, before any computation. Pin four, pin all ' +
      'five: it survives. ' +
      'SO THE STATEMENT IS RIGIDITY, and it is stronger than the family it replaced. 13 = 1 gauge + 12 ' +
      'geometric. Twelve pinned coordinates can only bite on the 12 geometric directions, and the ' +
      'measured dimension is 1, so they bite on ALL of them: the geometric quotient is cut to dimension ' +
      'ZERO. Four control points DETERMINE the degree-4 rational PH shape. ' +
      'THE CONSEQUENCE FOR THE EARLIER SLIDES, if someone counts along: every dimension quoted from ' +
      'pinning control-point POSITIONS carries this spurious +1, so slides 11 and 12 are one lower ' +
      'geometrically than their readouts say. Pinning the HERMITE DATA instead does fix lambda, since ' +
      'p′(0) = n(w_1/w_0)(P1-P0) scales by lambda — and the dimension left there is genuine shape, ' +
      'measured at curve motion 6.9e-4 per unit against control-point motion 1.3e-2. ' +
      'WHERE THE DIAL ENDS. The weights run to a degeneration, w_0, w_1 and w_4 going to zero relative ' +
      'to w_2, which in the gauge reading is just lambda running off to its limit. The wall is ' +
      'asymptotic: 16000 continuation steps without arriving, so the slider slows to a stop rather than ' +
      'snapping. ' +
      'core/conformalPHHopf (19 tests), conformalPHCurve, conformalPHFamily, conformal.',
  },
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
      'THE GESTURE IS ERIC\'S AND THE COUNTING IS WHY IT IS THE RIGHT ONE. Seven control points is 21 numbers for an 18-dimensional family, so a polygon looks over-determined -- and it is, but by FIVE, not three. The map from the family to the polygon has measured rank 16, because TWO family directions move no control point at all: the projective scale (C -> cC changes nothing observable, since every defining condition is quadratic) and slide 13\'s reparametrisation (C_k -> lambda^k C_k slides the Farin beads and leaves every centre exactly where it was). So the reachable polygons are 16-dimensional. '
      + 'AND 16 = 15 + 1, WHICH IS THE WHOLE SLIDE. Five control points prescribed is fifteen coordinates -- the two ends, their neighbours, and the middle -- leaving ONE dimension, hence one slider. That is why {P0, P1, P3, P5, P6} are handles and P2, P4 are grey: the grey pair is what absorbs. Nothing about the arrangement is a taste decision. '
      + 'MEASURED BEFORE IT WAS BUILT. Dragging one of the five with the other four held tracks the cursor to 100% for four of them over a long path, the held points stay put to 2e-15, the grey pair absorbs by up to 1.6 units, and the residual never leaves machine zero. P0 is the exception at 87% and the reason is visible on screen: rho_1 IS the distance from P0 to P1, so holding P1 while dragging P0 drives that sphere\'s radius directly. '
      + 'THE LEFTOVER DIMENSION IS A ROAD, AND IT IS DRAWN. The first version of this slide spent that dimension on an abstract slider, and Eric\'s verdict was that the five points worked well and the slider less so -- correctly, because the dimension has a concrete picture that a slider throws away. Hold the five and the grey points are NOT free in space: each is confined to a curve, and the two travel it together. So the road is drawn (measured: 36 samples, arc 1.65 against a polygon span of 1.45, chord/arc 0.83, so genuinely curved; P4 travels 1.20 of it while P2 travels 1.65) and the gesture is to PUSH the grey point along it. Measured: a cursor 60 degrees OFF the road still slides P2 1.50 along it with the five held to 2e-15. No slider, no orientation to carry, no re-seating -- and it is slide 4\'s gesture one dimension up, which is the gesture this audience has already been taught. '
      + 'WHY NOT A NAMED QUANTITY -- this took a measurement and it is the interesting part. Every geometric candidate for a dial FAILS on that road: rho_2 is CONSTANT along it (0% both ways), while rho_3, rho_4 and the total arc length each sit at a FOLD -- rho_3 reaches 100% up and 17% down, rho_4 reaches 100% down and runs BACKWARDS (-71%) when asked up. A fold is where a readout stops being a coordinate; it is not a solver defect. The road has no such problem because it is the family\'s own shape rather than a function on it. '
      + 'HOW THE ROAD IS COMPUTED, if asked. Its tangent is the ambient push projected onto the nullspace of the constraint Jacobian; the two gauge directions move no control point, so every probe that moves the point at all reports the same direction -- the probe cancels out. Walking it needs BACKTRACKING and skipping that broke the first attempt: the step is travel/rate, so where the point travels slowly the predictor leaps, and measured, one direction ran fourteen steps while the other diverged to a defect of 1e6 on its second, taking 1.20 where 0.07 was asked. A step is now accepted only if it stayed on the family AND did not overshoot; otherwise the ask is halved. Nothing infeasible is ever drawn. '
      + 'AND THERE IS A SLIDER TOO, because a road cannot do the one thing a presenter needs: move the point with no hand on it. It indexes the samples already drawn, so dragging it costs NO solve -- every notch is a curve computed once and known to be a member. 33 notches over an arc of 1.80 is a step of about 4% of the polygon span. '
      + 'THE TWO ENDS ARE DIFFERENT, and one earlier reading of them was WRONG -- correct it if it comes up. BACKWARD is a real wall at 0.19 whatever the step budget: the weights degenerate to (1, 4.1, 11.7, 20.9, 142.9, 95.5, 43.5), which projectively is w_0 -> 0, slide 13\'s asymptotic wall met from another direction. FORWARD does not end at all -- 1.61 travelled on a budget of 1.74, 3.06 on a budget of 4.34 -- so the drawn road is a generous stretch, not the whole locus, and the slider spans what is drawn. What the walk DOES refuse is a denominator with a real root, since that is a curve with a pole; measured, that does not happen inside the drawn stretch. '
      + 'A RADIUS REACHING ZERO IS NOT AN END, which is the correction. Travelling forward, rho_2 passes through 0 and comes out NEGATIVE: <C,C> < 0, an imaginary sphere, while the residual stays at machine zero and the curve is a perfect member throughout. An earlier version of this slide called that a point-sphere boundary. It is a coordinate event -- the sphere through that conformal point stops being real -- and the family does not care. Worth pointing at on screen, since the readout shows it happening. '
      + 'FREE MODE HOLDS NOTHING, and that was measured against the alternative. Pinning the two ends and holding nothing BOTH track the cursor to 100% for all seven points; with nothing pinned the rest of the curve answers more evenly (largest companion motion 1.22 against 3.07), so free is the literal thing -- every control point moves, and minimum norm spends the fifteen spare dimensions. '
      + 'THE DIALS THIS SLIDE REPLACED, if someone asks for the moduli count. Pinning the C1 Hermite data at both ends is a slice through the gauge, leaving 2n-7 = five shapes at this degree: rho_2, rho_3, rho_4 and the arc length of each half were measured to pin 5 of the 5 slice directions (the total length alone is one short, where degree 5 got 2+1 = 3 by luck). That figure still exists as RationalPHSexticFigure. Its weakness is exactly what this slide fixes: you could turn five dials but move no control point. '
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


]

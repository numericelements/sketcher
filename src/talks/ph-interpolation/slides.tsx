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
import StrictFreeRationalFigure from './StrictFreeRationalFigure'
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
]

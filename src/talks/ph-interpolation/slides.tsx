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
      'unknowns, hence the curve. Sanity anchor: the straight line is z = 1, F = (4,0,0). The fiber ' +
      'has no closed form and is traced by continuation along the exact null direction of the 3×4 ' +
      'Jacobian (core/phSpatialCubic, 22 tests). ' +
      'Sets up the spatial QUINTIC, where C¹ Hermite data has a TWO-parameter family — slide 5\'s ' +
      'four discrete interpolants become a surface of them.',
  },
]
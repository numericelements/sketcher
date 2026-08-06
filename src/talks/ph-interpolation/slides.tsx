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
]

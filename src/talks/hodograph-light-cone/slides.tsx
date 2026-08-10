// ============================================================================
// THE HODOGRAPH LIES ON THE LIGHT CONE — the theory companion to the ph-interpolation deck.
//
// NO FIGURES. This deck is equations and text. Where a number appears it is measured, and the test
// that measures it is named in the notes — that is the one thing this deck can do that a theory paper
// normally cannot.
//
// THE OPENING MOVE, and it is deliberate: do NOT announce the thesis and then justify it. For this
// audience a claim-then-defend structure invites scepticism. Instead do one line of algebra that lands
// on the cone, so the title is earned in thirty seconds and the rest of the talk is unpacking.
//
// WHAT IS OURS AND WHAT IS NOT. The complex form, the quaternion/Hopf form, rational PH and its
// offsets are Farouki's book and the surrounding literature. This deck claims a VANTAGE POINT on them,
// plus one genuinely new cell (PH as an O(4,1)-invariant condition, with the counts) and the editing
// side. docs/THE_LATTICE.md keeps that accounting honest, cell by cell.
//
// Act I is here. Acts II–IV are mapped at the end of docs/THE_LATTICE.md §3 and this file's tail.
//
// PARKED — deliberately deferred so the acts could be built first. Eric's call, and none of these
// changes any mathematics:
//
//   1. ORDERING: plane-first or general-first? Act I is general-first (the (n,1) statement, then the
//      examples). Plane-first would open with the one-line complex proof and generalise after. Both
//      defensible; the choice is about how much patience the room has before a payoff.
//   2. ONE STATIC PICTURE for slide 4 — the cone x² + y² = s² with the parabola drawn on it. The only
//      place in this deck where a figure would carry its weight. Text for now, by choice.
//   3. NO OUTLINE SLIDE yet, unlike the ph-interpolation deck. Add once the acts settle; an outline
//      written before the content is a promise that gets broken.
//   4. Slide 6's table is inline-styled. Fine for one table; extract a class if a second appears.
//   5. Subtitle wording, and whether "offered for discussion" stays.
// ============================================================================
import type { SlideDefinition } from '../framework/types'
import Math from '../framework/Math'

export const slides: SlideDefinition[] = [
  // ---------------------------------------------------------------------------
  // 1 — title
  // ---------------------------------------------------------------------------
  {
    type: 'title',
    content: (
      <>
        <h1>The Hodograph Lies on the Light Cone</h1>
        <div className="subtitle">
          Speed as a coordinate: PH curves, the spin cover, and the symmetry you get for choosing the
          form
        </div>
        <div className="author">Eric Demers</div>
        <div className="event">Polytechnique Montréal</div>
        <div className="event note" style={{ marginTop: '2em' }}>
          A preliminary version, offered for discussion
        </div>
      </>
    ),
    notes:
      'THE TITLE SAYS POSITION, NOT TANGENT, AND THAT IS DELIBERATE. In semi-Riemannian geometry a '
      + '"null curve" is one whose TANGENT is null -- zero arc length, a lightlike curve -- and null '
      + 'curves in C^3 are the Weierstrass data of minimal surfaces. Neither is what we mean, and both '
      + 'are close enough to mislead. What lies on the cone here is the POSITION of the augmented '
      + 'hodograph. Slide 3 makes the distinction explicit rather than hoping nobody asks. '
      + 'THE SUBTITLE NAMES THE THREE ACTS: speed as a coordinate (the condition, built from nothing), '
      + 'the spin cover (why the spinor forms are forced rather than clever), and the symmetry you get '
      + 'for choosing the form (why Mobius-invariant PH needs Spin(4,1)).',
  },

  // ---------------------------------------------------------------------------
  // 2 — one line of algebra, and we are already there
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>One line of algebra</h2>
        <p>The definition, which needs no introduction:</p>
        <Math display>{"\\|\\mathbf{c}'(t)\\| = \\sigma(t), \\qquad \\sigma \\ \\text{polynomial}"}</Math>
        <p>Square it, and move everything to one side:</p>
        <Math display>{"\\|\\mathbf{c}'\\|^2 - \\sigma^2 = 0"}</Math>
        <p>
          That is a quadratic form of signature <Math>{'(n,1)'}</Math> evaluated on a single vector.
          Give it a name:
        </p>
        <Math display>
          {"\\boldsymbol{\\gamma}(t) \\;=\\; \\bigl(\\mathbf{c}'(t),\\, \\sigma(t)\\bigr) \\;\\in\\; \\mathbb{R}^{n,1}, \\qquad \\langle (\\mathbf{v},s),(\\mathbf{v},s)\\rangle = \\|\\mathbf{v}\\|^2 - s^2"}
        </Math>
        <p style={{ marginTop: '1em' }}>
          <strong>
            PH <Math>{'\\iff'}</Math> the curve <Math>{'\\boldsymbol{\\gamma}'}</Math> lies on the{' '}
            <em>light cone</em> of <Math>{'\\mathbb{R}^{n,1}'}</Math>.
          </strong>
        </p>
        <p style={{ opacity: 0.65 }}>
          Nothing has been done except <strong>refusing to treat <Math>{'\\sigma'}</Math> as
          derived.</strong>
        </p>
      </>
    ),
    notes:
      'THIS IS THE WHOLE TALK IN ONE SLIDE, AND IT IS DELIBERATELY TRIVIAL. The audience should feel '
      + 'that no work was done -- that is the point. What has been bought is a PLACE TO STAND: the '
      + 'condition is now a statement about a quadric, and quadrics come with parametrisations, '
      + 'symmetry groups, and strata. None of those are available to the sentence "the norm of the '
      + 'hodograph happens to be a polynomial". '
      + 'SAY GAMMA OUT LOUD AND SLOWLY. It is a NEW curve in a NEW space: c lives in R^n, the hodograph '
      + 'c-prime lives in R^n, and gamma lives one dimension higher with the SPEED as its extra '
      + 'coordinate. If one thing is remembered from the talk it should be that vector. '
      + 'AND NOTE WHAT R^{n,1} ALREADY IS: for n = 3 it is the space of the spatial medial axis '
      + 'transform, where the extra coordinate is the RADIUS. Same space, two readings -- speed here, '
      + 'radius there. That dictionary is Act IV; plant it now, do not explain it. '
      + 'Measured: core/__tests__/hodographLightCone.test.ts checks gamma is on the cone for planar '
      + 'spinors of degree 1, 2, 3 and quaternion spinors of degree 1, 2 -- worst 1.0e-15 relative.',
  },

  // ---------------------------------------------------------------------------
  // 3 — the precision slide: position is null, the tangent is not
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Position is null. The tangent is not.</h2>
        <Math display>
          {"\\langle \\boldsymbol{\\gamma}, \\boldsymbol{\\gamma}\\rangle = 0 \\quad \\text{by construction}"}
        </Math>
        <Math display>
          {"\\langle \\boldsymbol{\\gamma}', \\boldsymbol{\\gamma}'\\rangle \\;=\\; \\|\\mathbf{c}''\\|^2 - \\sigma'^2 \\;=\\; \\frac{\\|\\mathbf{c}' \\times \\mathbf{c}''\\|^2}{\\|\\mathbf{c}'\\|^2} \\;=\\; \\kappa^2 \\sigma^4"}
        </Math>
        <p>
          Two lines from Lagrange's identity, since <Math>{"\\sigma' = (\\mathbf{c}'\\!\\cdot\\mathbf{c}'')/\\|\\mathbf{c}'\\|"}</Math>.
          So <Math>{'\\boldsymbol{\\gamma}'}</Math> <strong>sits inside the cone and travels spacelike
          along it</strong> — and the failure to be null is <em>exactly the curvature</em>.
        </p>
        <p style={{ marginTop: '1em' }}>
          <strong>
            <Math>{'\\boldsymbol{\\gamma}'}</Math> is genuinely lightlike exactly at{' '}
            <em>inflections</em>.
          </strong>{' '}
          A straight line is the one PH curve whose hodograph really is a null curve — a light ray.
        </p>
        <p style={{ opacity: 0.65 }}>
          Which is why the title says <em>lies on</em>: a “null curve” has a null <em>tangent</em>, and
          those are the Weierstrass data of minimal surfaces. Different object.
        </p>
      </>
    ),
    notes:
      'THIS SLIDE DOES TWO JOBS. It kills one misreading and it plants one fact. '
      + 'THE MISREADING: null curve = lightlike TANGENT = zero arc length, and null curves in C^3 give '
      + 'minimal surfaces by Weierstrass. We mean position. Say it before anyone raises a hand, because '
      + 'in this room somebody will. '
      + 'THE FACT: kappa^2 sigma^4 vanishes iff kappa does, so the hodograph curve touches lightlike '
      + 'exactly at inflections. That is the f invariant of the editing work arriving from a completely '
      + 'different direction, and it comes back in Act III. '
      + 'THE DERIVATION IS SHORT ENOUGH TO DO LIVE if asked: sigma = |c-prime| so sigma-prime is the '
      + 'tangential component of c-double-prime, subtract it and what remains is the NORMAL component, '
      + 'whose square is the cross product over the speed squared. It is Lagrange, nothing more. '
      + 'Measured: hodographLightCone.test.ts pins the identity in BOTH signatures at several degrees '
      + '(worst 4.8e-13 relative), pins a curved specimen strictly spacelike, and pins a straight line '
      + 'as exactly lightlike (0.0e+0).',
  },

  // ---------------------------------------------------------------------------
  // 4 — what gamma looks like
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>What <Math>{'\\boldsymbol{\\gamma}'}</Math> looks like</h2>
        <p>
          Take <Math>{'w = t + i'}</Math>, so <Math>{"\\mathbf{c}' = w^2"}</Math> and{' '}
          <Math>{'\\sigma = |w|^2'}</Math> — the Tschirnhausen cubic:
        </p>
        <Math display>{'\\boldsymbol{\\gamma}(t) = (t^2-1,\\; 2t,\\; t^2+1)'}</Math>
        <p>
          A curve in ordinary 3-space. It is on the cone, since{' '}
          <Math>{'(t^2-1)^2 + (2t)^2 = (t^2+1)^2'}</Math>. And its shape is forced, in one line:
        </p>
        <Math display>
          {'\\boldsymbol{\\gamma} = \\bigl(\\operatorname{Re} w^2,\\; \\operatorname{Im} w^2,\\; |w|^2\\bigr) \\;\\Longrightarrow\\; \\text{every coefficient-level image of one spinor coefficient is null}'}
        </Math>
        <p>
          So the <strong>leading coefficient of <Math>{'\\boldsymbol{\\gamma}'}</Math> is null</strong>,
          at any degree. For a <em>linear</em> spinor <Math>{'\\boldsymbol{\\gamma}'}</Math> is
          quadratic, so <Math>{"\\tfrac12\\boldsymbol{\\gamma}''"}</Math> is that constant null vector —
          and a curve with constant null second derivative is a{' '}
          <strong>parabola with a lightlike axis</strong>.
        </p>
        <p style={{ opacity: 0.65 }}>
          The planar PH cubic, drawn on the light cone, is a parabola. The quintic is a quartic curve on
          the same cone.
        </p>
      </>
    ),
    notes:
      'A CORRECTION LIVES HERE, and it is worth telling honestly if the derivation is questioned. The '
      + 'first sketch of this slide observed that s - x = 2 for this specimen, putting gamma in a plane '
      + 'with null normal -- hence a parabola. True, but SPECIAL: in general s - x = 2 (Im w)^2, which is '
      + 'constant only when Im w is. The general statement is better and shorter: gamma is the squaring '
      + 'map applied to w, so the image of any single spinor coefficient is null, in particular the '
      + 'leading one. No plane geometry needed. '
      + 'THIS IS ALSO THE ONE PLACE A PICTURE WOULD EARN ITS KEEP: the standard cone x^2 + y^2 = s^2 with '
      + 'a parabola drawn on it. Deliberately left as text for now -- the deck is equations and text, and '
      + 'a single static figure can be added if the room wants it. '
      + 'Measured: hodographLightCone.test.ts checks the leading coefficient is null at degrees 1, 2, 3 '
      + '(worst 1.1e-17) and, as the same fact read geometrically, that the plane spanned by a linear '
      + "spinor's gamma has a null Minkowski normal -- which is what makes the section a parabola.",
  },

  // ---------------------------------------------------------------------------
  // 5 — why the reframing pays
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Light cones are the images of squaring maps</h2>
        <p>That is the only theorem needed, and it is old.</p>
        <p>
          <Math>{'\\mathbb{R}^{2,1}'}</Math> — every null vector is
        </p>
        <Math display>{'(u^2 - v^2,\\; 2uv,\\; u^2 + v^2)'}</Math>
        <p>
          <Math>{'\\mathbb{R}^{3,1}'}</Math> — every null vector is <Math>{'\\xi\\xi^*'}</Math> for a
          spinor <Math>{'\\xi \\in \\mathbb{C}^2'}</Math>, equivalently
        </p>
        <Math display>{'\\bigl(\\mathcal{A}\\,i\\,\\bar{\\mathcal{A}},\\; |\\mathcal{A}|^2\\bigr), \\qquad \\mathcal{A} \\in \\mathbb{H}'}</Math>
        <p style={{ marginTop: '1em' }}>Now read the first one again:</p>
        <Math display>
          {'(u^2-v^2,\\, 2uv,\\, u^2+v^2) \\;=\\; \\bigl(\\operatorname{Re} w^2,\\, \\operatorname{Im} w^2,\\, |w|^2\\bigr), \\qquad w = u + iv'}
        </Math>
        <p>
          <strong>
            The Pythagorean triple, the complex square <Math>{"\\mathbf{c}' = w^2"}</Math>, and the cone
            parametrisation are one formula written three ways.
          </strong>{' '}
          The quaternion form is the same statement one signature up.
        </p>
      </>
    ),
    notes:
      'CREDIT PLAINLY: the planar complex form is Farouki, the spatial quaternion form is Choi-Han-'
      + 'Farouki, and the Pythagorean parametrisation of a conic is older than all of us. NOTHING on '
      + 'this slide is new and the slide should say so out loud -- docs/THE_LATTICE.md exists to keep '
      + 'this accounting honest, because an earlier draft of that page read like a discovery map when it '
      + 'is a map of walked territory. '
      + 'WHAT THE VANTAGE POINT BUYS: the spinor representations stop looking like inspired constructions '
      + 'and become THE PARAMETRISATION OF A QUADRIC. That is the one thing that then generalises without '
      + 'further invention -- you do not have to guess the next representation, you ask what parametrises '
      + 'the next cone. '
      + 'WHY 2D IS EASY AND 3D IS NOT, if it comes up early: x^2 + y^2 factors over C into two linear '
      + 'factors, so the planar cone is reducible and the choice is DISCRETE. The isotropic cone in C^3 '
      + 'is irreducible, so no linear factorisation exists and the spinor is unavoidable. That contrast '
      + 'is Act II.',
  },

  // ---------------------------------------------------------------------------
  // 6 — the ladder and its price
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Each thing you want costs a signature</h2>
        <table style={{ margin: '0 auto', borderCollapse: 'collapse', fontSize: '0.9em' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid currentColor', opacity: 0.7 }}>
              <th style={{ padding: '0.3em 1.2em', textAlign: 'left' }}>you want</th>
              <th style={{ padding: '0.3em 1.2em', textAlign: 'left' }}>you adjoin</th>
              <th style={{ padding: '0.3em 1.2em', textAlign: 'left' }}>you land in</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.3em 1.2em' }}>PH</td>
              <td style={{ padding: '0.3em 1.2em' }}>one <strong>negative</strong> direction (speed)</td>
              <td style={{ padding: '0.3em 1.2em' }}><Math>{'\\mathbb{R}^{n,1}'}</Math></td>
            </tr>
            <tr>
              <td style={{ padding: '0.3em 1.2em' }}>Möbius invariance</td>
              <td style={{ padding: '0.3em 1.2em' }}>a <strong>hyperbolic pair</strong> <Math>{'(o, \\infty)'}</Math></td>
              <td style={{ padding: '0.3em 1.2em' }}><Math>{'\\mathbb{R}^{n+1,1}'}</Math></td>
            </tr>
            <tr>
              <td style={{ padding: '0.3em 1.2em' }}><strong>both</strong></td>
              <td style={{ padding: '0.3em 1.2em' }}>the pair, then one more negative</td>
              <td style={{ padding: '0.3em 1.2em' }}><strong><Math>{'\\mathbb{R}^{n+1,2}'}</Math></strong></td>
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: '1.2em' }}>
          For <Math>{'n = 3'}</Math> that last space is <Math>{'\\mathbb{R}^{4,2}'}</Math> — the{' '}
          <strong>Lie sphere space</strong> of <Math>{'\\mathbb{R}^3'}</Math>.
        </p>
        <p>
          <strong>
            The Lie quadric is not a layer we might reach some day. It is already where the PH condition
            of a Möbius-invariant curve lives.
          </strong>
        </p>
      </>
    ),
    notes:
      'THE ACCOUNTING IS EXACT AND WORTH SAYING SLOWLY. PH always costs ONE NEGATIVE direction -- the '
      + 'speed, or the radius, depending on which reading you are in. Conformal invariance always costs '
      + 'a HYPERBOLIC PAIR, the two null directions o and infinity of the conformal model. They are '
      + 'different prices for different goods, and adding them is what produces R^{n+1,2}. '
      + 'WHERE THIS LANDS: <P,P> = 0 says the curve is a point curve in R^{4,1}; <P-prime,P-prime> = h^2 '
      + 'says the vector (P-prime, h) is ISOTROPIC in R^{4,1} + R^{0,1} = R^{4,2}. So the Lie sphere '
      + 'space is not imported, it is FORCED by writing the PH condition of a conformal curve. Canal '
      + 'surfaces, oriented spheres and Laguerre geometry are then readings of a space we are already in. '
      + 'AND THE OTHER READING OF THE SAME LADDER: off the null quadric a vector IS a sphere, so a curve '
      + 'off the cone is a SPHERE FAMILY and what you see is its envelope. On the cone the vector is a '
      + 'point and the curve is a curve. That single distinction separates our conformal PH curves from '
      + 'the MOS/medial-axis curves, which share the form R^{3,1} but not the locus -- Act IV.',
  },

  // ---------------------------------------------------------------------------
  // 7 — Mobius invariance, two lines
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Möbius invariance is two lines</h2>
        <p>A conformal PH curve is two conditions:</p>
        <Math display>
          {'\\langle P, P\\rangle = 0 \\quad (\\text{a point curve}), \\qquad \\langle P\', P\'\\rangle = h^2 \\quad (\\text{PH})'}
        </Math>
        <p>
          Let <Math>{'M \\in O(4,1)'}</Math>. It preserves the form, and differentiation commutes with a
          constant matrix:
        </p>
        <Math display>{'\\langle MP, MP\\rangle = \\langle P, P\\rangle = 0'}</Math>
        <Math display>
          {"\\langle MP', MP'\\rangle = \\langle P', P'\\rangle = h^2 \\qquad \\text{— with } h \\text{ untouched}"}
        </Math>
        <p style={{ marginTop: '1em' }}>
          <strong>
            <Math>{'h'}</Math> is the speed <em>numerator</em>.
          </strong>{' '}
          The true speed is <Math>{'h/w'}</Math>, so a Möbius map rescales speed by the conformal factor
          and never touches PH-ness. <strong>PH is a statement about the numerator; Möbius acts on the
          denominator.</strong>
        </p>
      </>
    ),
    notes:
      'MEASURED: the image is a member to 5e-13 with h BIT-IDENTICAL, and the Farin beads map to the '
      + 'Farin beads since F_i = project(C_i + C_i+1) and M is linear. core/conformalPHCurve mobiusImage '
      + 'carries the derivation and conformalPHStructure.test.ts the numbers. '
      + 'THE CONTRAST THAT JUSTIFIES THE WHOLE APPARATUS, and it is the moral of Act I: this FAILS in the '
      + 'quaternion representation, because Spin(3) does not contain Mobius. core/phMobius is where that '
      + 'was established, and it is what sent the work into the conformal model in the first place. So: '
      + 'PICK THE REPRESENTATION WHOSE SPIN GROUP CONTAINS THE SYMMETRY YOU WANT. Spin(3) buys rotations. '
      + 'Spin(4,1) = Sp(1,1) buys Mobius -- and it is QUATERNIONIC, which is why quaternions reappear in '
      + 'the spinor solution after the conformal model appeared to have left them behind. '
      + 'DO NOT OVERSELL. This two-line argument is the reason the conformal model works; the CONTENT is '
      + 'what it costs and what it buys, which is Acts III and IV: the moduli counts (family 2n+6, moduli '
      + '2n-6) and the measured fact that bending polynomials reaches only a codimension-3 subvariety.',
  },
]

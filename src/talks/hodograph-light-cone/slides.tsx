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

  // ===========================================================================
  // ACT II — THE PLANE, WHERE IT IS ONE LINE
  //
  // Act I proved Mobius invariance in the conformal model in two lines. This act shows that in the
  // PLANE it takes ONE, with no conformal model at all — and then shows exactly what breaks when you
  // go up a dimension, which is what forced the machinery. It ends on the break, deliberately: the
  // room has already been given the payoff, so a cliffhanger costs nobody anything.
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // 8 — Mobius is a linear map
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>In the plane, Möbius is a linear map</h2>
        <p>
          Write the curve as a ratio of complex polynomials — <Math>{'z = P/Q'}</Math>, both of degree{' '}
          <Math>{'n'}</Math>. Then
        </p>
        <Math display>
          {'\\mu(z) = \\frac{az+b}{cz+d} \\qquad\\text{acts as}\\qquad (P, Q) \\;\\longmapsto\\; (aP + bQ,\\; cP + dQ)'}
        </Math>
        <p>
          The matrix is <em>constant</em>, so it acts <strong>coefficient by Bernstein
          coefficient</strong>. No degree rise. No reparametrisation. The control points and the Farin
          beads map one for one.
        </p>
        <p style={{ marginTop: '1em', opacity: 0.75 }}>
          Compare the same map on a <em>real</em> rational curve: a Möbius image of a cubic is a{' '}
          <strong>sextic</strong>, eight control points become fifteen, and the polygon has to be rebuilt
          from the lift. The complex chart is not a convenience — it is where the group acts by
          multiplication.
        </p>
      </>
    ),
    notes:
      'THE POINT IS THAT LINEARITY IS AVAILABLE HERE AND NOWHERE ELSE SO CHEAPLY. PSL(2,C) is the Mobius '
      + 'group of the plane, and it acts on the homogeneous pair (P,Q) by an ordinary matrix -- so every '
      + 'structure built linearly out of P and Q transforms by that matrix and nothing has to be '
      + 'recomputed. The Farin beads come along because F_i is a weighted average of consecutive control '
      + 'points, which is linear in the homogeneous representative. '
      + 'THE CONTRAST IS MEASURED, not rhetorical: on the real rational side a Mobius map turned 8 control '
      + 'points into 15 (ph-interpolation deck, slide 10). The degree DOUBLES because passing from the '
      + 'complex model to the real one is z -> P Q-bar / |Q|^2, a quadratic operation -- the same doubling '
      + 'as the null lift and as A -> A i A-bar. One phenomenon, three appearances; Act I named it. '
      + 'IF ASKED WHY NOT ALWAYS WORK IN THE COMPLEX CHART: because it only exists in the plane. C is a '
      + 'field, so P/Q means something; there is no division in R^3.',
  },

  // ---------------------------------------------------------------------------
  // 9 — the Wronskian, and PH in one line
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>PH in one line</h2>
        <p>Differentiate the ratio. The numerator is the Wronskian:</p>
        <Math display>{"M = P'Q - PQ', \\qquad z' = M/Q^2, \\qquad |z'|^2 = \\frac{M\\bar{M}}{(Q\\bar{Q})^2}"}</Math>
        <p>
          <Math>{'Q\\bar{Q}'}</Math> is already a real polynomial, so PH asks only that{' '}
          <Math>{'M\\bar{M}'}</Math> be a perfect square — and it is exactly when
        </p>
        <Math display>{'M = h\\,A^2, \\qquad h \\in \\mathbb{R}[t],\\; A \\in \\mathbb{C}[t]'}</Math>
        <p>Now apply <Math>{'\\mu'}</Math>. The Wronskian is bilinear and alternating, so</p>
        <Math display>{'\\tilde{M} = \\tilde{P}\'\\tilde{Q} - \\tilde{P}\\tilde{Q}\' = (ad - bc)\\,M = \\lambda M'}</Math>
        <Math display>{'\\lambda\\, h A^2 = (|\\lambda|\\,h)\\,\\bigl(e^{i\\theta/2}A\\bigr)^2 \\qquad \\lambda = |\\lambda|e^{i\\theta}'}</Math>
        <p>
          <strong>Done.</strong> A constant multiple of a square is a square. The only property of the
          ambient used is that <strong><Math>{'\\mathbb{C}'}</Math> has square roots</strong> — there is
          no geometry in the argument at all.
        </p>
      </>
    ),
    notes:
      'SAY THE LAST SENTENCE TWICE. The proof uses ONE fact about the scalars: square roots exist. That is '
      + 'why this argument does not survive going up a dimension, and slide 11 is where that is made '
      + 'precise. '
      + 'ON h: generically h = 1 and the figures enforce M = A^2 exactly -- that is the residual the 2D '
      + 'figure displays. The h is there for honesty, since M = t^2 + 1 is PH without being a square '
      + '(|M| = t^2+1 is a polynomial). The general characterisation is the multiplicity condition: for '
      + 'each non-real root z of M, the multiplicity of z plus that of z-bar is even. Marked as a claim '
      + 'rather than a citation -- the sufficient direction is the one line above and is what we use. '
      + 'MEASURED, and this is worth quoting because it is the act headline: apply a rotation-scaling, a '
      + 'translation, an INVERSION, and a generic Mobius map to a solved cubic and M - A^2 stays at 1e-15 '
      + 'with A only multiplied by sqrt(det) -- never re-solved. Irreducibility survives too, and the '
      + 'image really is the pointwise Mobius image to 6.9e-16. core/complexRationalPHCubic mobiusImage, '
      + 'pinned in complexRationalPHCubic.test.ts. '
      + 'AND M REALLY HAS DEGREE 2n-2: the top coefficient cancels identically, measured, so for a cubic M '
      + 'is a quartic and A a quadratic. That is why the PH condition is 5 complex coefficients.',
  },

  // ---------------------------------------------------------------------------
  // 10 — what the chart costs, and how many answers
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>What it costs, and how many answers there are</h2>
        <p>
          The chart is <em>points and beads</em>, and it is a bijection: four control points and three
          Farin beads,
        </p>
        <Math display>
          {'\\frac{w_{k+1}}{w_k} = \\frac{q_k - Z_k}{Z_{k+1} - q_k} \\qquad\\Longrightarrow\\qquad 4 + 3 = 7 \\text{ complex} = 14 \\text{ real}'}
        </Math>
        <p>
          PH costs <strong>4</strong>, leaving a <strong>10</strong>-dimensional family. Quotient by
          Möbius (6) and by the reparametrisation (1) and the shapes number <strong>3</strong>.
        </p>
        <p style={{ marginTop: '1em' }}>
          And over a fixed polygon with one bead prescribed there are <strong>two</strong> algebraic
          solutions — of which <strong>one</strong> is a curve. The other has <Math>{'P'}</Math> and{' '}
          <Math>{'Q'}</Math> sharing a quadratic factor: a cubic coat over a{' '}
          <strong>circular arc</strong>, trivially PH, and a whole positive-dimensional family of
          representations of it.
        </p>
        <p style={{ opacity: 0.65 }}>
          Which is why it does not move when you drag a control point — seen on screen before it was
          understood.
        </p>
      </>
    ),
    notes:
      'THE REDUCIBLE BRANCH WAS FOUND BY EYE, and the story is worth telling because it is how the '
      + 'reducibility test came to exist. Eric noticed that moving one control point moved one of the two '
      + 'branches and not the other. A branch that does not respond to a control point is a branch whose '
      + 'representation is not rigid: P and Q share a factor, z = P/Q is really degree ONE, and the cubic '
      + 'representations of a given circular arc form a positive-dimensional family. So the ALGEBRAIC '
      + 'count is 2 and the GEOMETRIC count is 1. core/complexRationalPHCubic reducibility, and the test '
      + 'asserts exactly one of the two is reducible, across three different polygons. '
      + 'CONTRAST WITH THE POLYNOMIAL CASE deliberately: the planar polynomial three-point problem has TWO '
      + 'genuine solutions (deck one, slide 3) because its equations are quadratic. Here the second root '
      + 'is degenerate instead. Same "finitely many", different bookkeeping. '
      + 'DO NOT CLAIM 3 IS A NEW NUMBER. It is 10 - 6 - 1 and every term is elementary; what is measured '
      + 'is the 10, i.e. that PH really costs 4 and not 3 or 5.',
  },

  // ---------------------------------------------------------------------------
  // 11 — why the plane is easy: the cone factors
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Why the plane is easy: the cone factors</h2>
        <p>Over <Math>{'\\mathbb{C}'}</Math>, the planar norm form splits into two <em>linear</em> factors:</p>
        <Math display>{'x^2 + y^2 = (x + iy)(x - iy)'}</Math>
        <p>
          So the isotropic locus is a <strong>pair of lines</strong>, and choosing a square root is a{' '}
          <strong>discrete</strong> choice — a sign. That is the whole reason slide 9 fits on one line and
          the reason the answers come in finite numbers.
        </p>
        <p style={{ marginTop: '1em' }}>One dimension up, it stops:</p>
        <Math display>{'x^2 + y^2 + z^2 \\quad\\text{does not factor} \\qquad \\text{— the isotropic cone in } \\mathbb{C}^3 \\text{ is IRREDUCIBLE}'}</Math>
        <p>
          There is no linear factorisation to take a root of. The choice is no longer a sign but a{' '}
          <strong>spinor</strong>, and the spinor carries a continuous phase.
        </p>
      </>
    ),
    notes:
      'THIS SLIDE IS THE HINGE OF THE WHOLE TALK, and it is one algebraic fact. In two variables the '
      + 'quadratic form is a product of linear forms, so the "square root" is a choice among finitely many '
      + 'branches. In three it is not, and the classical fix -- the Hopf map, A i A-bar -- is exactly a '
      + 'parametrisation of an irreducible quadric by a spinor, which is Act I slide 5. '
      + 'THE CONSEQUENCE IS NOT A LOSS OF PROOF, IT IS A CHANGE OF SHAPE. In the plane the ambiguity is '
      + 'discrete: two solutions, four solutions. In space the ambiguity is a circle, because the spinor '
      + 'phase A -> A e^{i theta} leaves A i A-bar alone. Every positive-dimensional solution family in '
      + 'the spatial PH literature traces to that one circle. That is Act III and it is where this talk '
      + 'stops being a reframing. '
      + 'IF ASKED ABOUT C^2 VERSUS R^2: the factorisation needs i, so it is a statement about the form '
      + 'over C. Over R the planar form is definite and has no isotropic vectors at all besides zero -- '
      + 'which is why the complex chart, not the real one, is where the plane looks easy.',
  },

  // ---------------------------------------------------------------------------
  // 12 — the cliffhanger
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>So the ambiguity changes shape</h2>
        <table style={{ margin: '0 auto', borderCollapse: 'collapse', fontSize: '0.9em' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid currentColor', opacity: 0.7 }}>
              <th style={{ padding: '0.3em 1.2em', textAlign: 'left' }} />
              <th style={{ padding: '0.3em 1.2em', textAlign: 'left' }}>the square root is</th>
              <th style={{ padding: '0.3em 1.2em', textAlign: 'left' }}>so the answers are</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.3em 1.2em' }}>the plane</td>
              <td style={{ padding: '0.3em 1.2em' }}>a <strong>sign</strong></td>
              <td style={{ padding: '0.3em 1.2em' }}>finitely many curves</td>
            </tr>
            <tr>
              <td style={{ padding: '0.3em 1.2em' }}>space</td>
              <td style={{ padding: '0.3em 1.2em' }}>a <strong>spinor phase</strong></td>
              <td style={{ padding: '0.3em 1.2em' }}>a circle… an ellipse… a torus</td>
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: '1.4em' }}>
          The interpolation problem has not changed. The <em>number</em> of answers has stopped being a
          number.
        </p>
        <p style={{ opacity: 0.65 }}>
          What decides the shape is not the data and not the degree.
        </p>
      </>
    ),
    notes:
      'END HERE AND STOP TALKING. The room has already been given Mobius invariance (Act I, slide 7), so '
      + 'nobody leaves without a payoff -- which is what makes it safe to end an act on a question. '
      + 'THE ANSWER, FOR YOUR OWN CONFIDENCE, is Act III: what decides the shape is the GAUGE GROUP of the '
      + 'spinor representation, and the fiber of "forget the spinor, keep the curve" IS that group. Z/2 in '
      + 'the plane, so finite. S^1 in space, so circles and tori. Non-compact in the conformal model, so '
      + 'open roads that run to a degeneration instead of closing. Both ends of that are measured in this '
      + 'repository -- the closed spatial cubic fiber with constant arc length, and the conformal road '
      + 'whose backward end is a weight degeneration at 0.19 whatever the step budget. '
      + 'DO NOT PREVIEW IT. The table on this slide is the question; a listener who works out the answer '
      + 'themselves during the break is worth more than one who was told.',
  },
]

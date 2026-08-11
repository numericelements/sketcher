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
// WHAT THIS DECK IS, after the literature check of 2026-08-10: an EXPOSITION of a known theory, built
// so that every step is checkable, plus the editor it serves. It is not a contribution and must not be
// presented as one. The two papers it re-presents are named on the slides themselves:
//
//   Choi et al. 2002  (Adv. Comput. Math)  -- the spin representation unifying every incarnation of PH
//   Krasauskas 2017   (AACA 27:491-502)    -- all Laguerre models inside one ambient R^{4,2}
//
// and the invariance question the first two acts circle is CLOSED, very recently, by
//
//   Altavilla, Schrocker, Sir, Vrsek (2026, Proc. Roy. Soc. A\\; arXiv 2512.19587)
//   -- PH-preserving maps are exactly the conformal maps whose dilation is the square of a real
//      rational function. In the plane that is a HUGE group\\; for n >= 3 Liouville collapses it to
//      (anti-)Mobius. Slide 9 carries this, because our Wronskian argument is one special case of it.
//
// docs/THE_LATTICE.md section 0' keeps the accounting. The genuinely unmatched work is the EDITOR --
// curvature-extrema control under a drag -- and this deck is its introduction, not its rival.
//
// Act I is here. Acts II–IV are mapped at the end of docs/THE_LATTICE.md §3 and this file's tail.
//
// PARKED — deliberately deferred so the acts could be built first. Eric's call, and none of these
// changes any mathematics:
//
//   1. ORDERING: plane-first or general-first? Act I is general-first (the (n,1) statement, then the
//      examples). Plane-first would open with the one-line complex proof and generalise after. Both
//      defensible\\; the choice is about how much patience the room has before a payoff.
//   2. ONE STATIC PICTURE for slide 4 — the cone x² + y² = s² with the parabola drawn on it. The only
//      place in this deck where a figure would carry its weight. Text for now, by choice.
//   3. NO OUTLINE SLIDE yet, unlike the ph-interpolation deck. Add once the acts settle\\; an outline
//      written before the content is a promise that gets broken.
//   4. Slide 6's table is inline-styled. Fine for one table\\; extract a class if a second appears.
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
            PH <Math>{'\\iff'}</Math> <Math>{'\\boldsymbol{\\gamma}'}</Math> is a{' '}
            <em>polynomial</em> curve on the light cone of <Math>{'\\mathbb{R}^{n,1}'}</Math>.
          </strong>
        </p>
        <p style={{ opacity: 0.65 }}>
          The word <em>polynomial</em> is carrying everything. <Math>{"(\\mathbf{c}', \\|\\mathbf{c}'\\|)"}</Math>{' '}
          lies on the cone for <strong>every</strong> regular curve — membership is free. PH asks whether
          the lift can be taken <strong>algebraically</strong>. Nothing else has been done except{' '}
          <strong>refusing to treat <Math>{'\\sigma'}</Math> as derived.</strong>
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
      + 'radius there. That dictionary is Act IV\\; plant it now, do not explain it. '
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
      + 'WHERE THIS LANDS: <P,P> = 0 says the curve is a point curve in R^{4,1}\\; <P-prime,P-prime> = h^2 '
      + 'says the vector (P-prime, h) is ISOTROPIC in R^{4,1} + R^{0,1} = R^{4,2}. So the Lie sphere '
      + 'space is not imported, it is FORCED by writing the PH condition of a conformal curve. Canal '
      + 'surfaces, oriented spheres and Laguerre geometry are then readings of a space we are already in. '
      + 'CITE KRASAUSKAS HERE, DO NOT CLAIM THIS. Krasauskas 2017 (Adv. Appl. Clifford Algebras 27:491-502, '
      + '"Unifying Theory of Pythagorean-Normal Surfaces Based on Geometric Algebra") embeds the '
      + 'cyclographic, Blaschke-cylinder and isotropic models of Laguerre geometry into exactly this '
      + 'R^{4,2} and says so in the abstract. The slide\'s punchline is that paper\'s thesis. Act I slide 5 '
      + 'is likewise Choi et al. 2002 (Clifford algebra and the spin representation unifying all '
      + 'incarnations of PH curves). Say both out loud\\; the deck is exposition here, not contribution. '
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
          and never touches PH-ness. <strong>PH is a statement about the numerator\\; Möbius acts on the
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
      + 'DO NOT OVERSELL. This two-line argument is the reason the conformal model works\\; the CONTENT is '
      + 'what it costs and what it buys, which is Acts III and IV: the moduli counts (family 2n+6, moduli '
      + '2n-6) and the measured fact that bending polynomials reaches only a codimension-3 subvariety.',
  },

  // ---------------------------------------------------------------------------
  // 8 — the bridge: divide out the scale
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Divide out the scale</h2>
        <p>
          The cone has a scale, and <Math>{'\\boldsymbol{\\gamma}'}</Math> carries an obvious one. Divide
          by it:
        </p>
        <Math display>
          {"\\boldsymbol{\\gamma}/\\sigma = (\\mathbf{c}'/\\sigma,\\; 1) = (\\mathbf{T},\\; 1) \\qquad \\mathbf{T} = \\text{the unit tangent}"}
        </Math>
        <p>
          The rays of a light cone in <Math>{'\\mathbb{R}^{n,1}'}</Math> form the sphere{' '}
          <Math>{'S^{n-1}'}</Math> — the <em>celestial sphere</em> — and the image of{' '}
          <Math>{'\\boldsymbol{\\gamma}'}</Math> there is the curve&apos\\;s <strong>tangent
          indicatrix</strong>. Now adjoin the signed distance <Math>{'d = \\mathbf{c}\\cdot\\hat{\\mathbf{n}}'}</Math>:
        </p>
        <Math display>
          {'(\\hat{\\mathbf{n}},\\, d) \\in S^{n-1} \\times \\mathbb{R} \\;=\\; \\text{the Blaschke cylinder} \\;=\\; \\text{oriented hyperplanes}'}
        </Math>
        <p>
          which sits inside the <strong>Lie quadric</strong> as the spheres of infinite radius. So the
          chain is
        </p>
        <p style={{ textAlign: 'center' }}>
          <strong>cone <Math>{'\\to'}</Math> celestial sphere <Math>{'\\to'}</Math> Blaschke cylinder{' '}
          <Math>{'\\to'}</Math> Lie quadric</strong>
        </p>
        <p style={{ marginTop: '0.9em' }}>and PH is <em>one</em> condition the whole way down:</p>
        <Math display>
          {"\\sigma \\text{ rational} \\iff \\mathbf{T} = \\mathbf{c}'/\\sigma \\text{ rational} \\iff \\hat{\\mathbf{n}} \\text{ rational} \\iff \\text{the oriented tangent family is rational}"}
        </Math>
        <p>
          <strong>Which is why sphere geometry preserves PH:</strong> Laguerre and Lie transformations act
          on the oriented tangent family, and that is where the condition lives. Offsetting fixes{' '}
          <Math>{'\\hat{\\mathbf{n}}'}</Math> and shifts <Math>{'d'}</Math> — a translation along the
          cylinder&apos\\;s fiber.
        </p>
      </>
    ),
    notes:
      'THIS SLIDE IS THE BRIDGE FROM ACT I TO ACT IV, and it exists because Eric asked how the '
      + '(velocity, speed) space connects to Lie sphere geometry. It is a CONSTRUCTION, not a '
      + 'coincidence, and the distinction matters -- an earlier version of this work claimed a '
      + '"dictionary" identifying the hodograph space with a sphere space because both happened to be '
      + 'R^{3,1}. That was a dimension coincidence and it was wrong (the conformal space of the PLANE is '
      + 'R^{3,1}, and so is the hodograph space of SPACE\\; same form, unrelated meanings, one used '
      + 'projectively and the other affinely). The real link is the projection on this slide. '
      + 'THE DIMENSIONS, if anyone checks: plane -- hodograph R^{2,1} is 3, its rays are S^1, the Blaschke '
      + 'cylinder S^1 x R is 2 = the oriented lines, and the Lie quadric is 3 = the oriented circles. '
      + 'Space -- R^{3,1} is 4, rays S^2, cylinder S^2 x R is 3 = oriented planes, Lie quadric 4 = oriented '
      + 'spheres. Every step drops or adds exactly what it should. '
      + 'THE PAYOFF IS THE LAST PARAGRAPH. PH is not really a statement about speed, it is a statement '
      + 'about the ORIENTED TANGENT FAMILY being rational -- equivalently that the tangent indicatrix is a '
      + 'rational point of the sphere, which IS the Pythagorean condition. Sphere-geometry groups act on '
      + 'that family, so of course they preserve it. This is also the equivalence "PH iff rational '
      + 'offsets" seen structurally rather than computed. '
      + 'AND ORIENTATION IS FORCED HERE, which answers why Lie geometry insists on it: projectivising a '
      + 'cone means choosing a RAY, future or past, and that choice IS the orientation. It is the same '
      + 'fact as the signed speed sigma(1 - eps kappa) staying rational where the absolute value would '
      + 'not. '
      + 'CREDIT: the Blaschke cylinder is one of the three Laguerre models Krasauskas 2017 embeds in '
      + 'R^{4,2} -- cyclographic, Blaschke, isotropic. This slide is the elementary route into that paper.',
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
  // 9 — Mobius is a linear map
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
      + 'as the null lift and as A -> A i A-bar. One phenomenon, three appearances\\; Act I named it. '
      + 'IF ASKED WHY NOT ALWAYS WORK IN THE COMPLEX CHART: because it only exists in the plane. C is a '
      + 'field, so P/Q means something\\; there is no division in R^3.',
  },

  // ---------------------------------------------------------------------------
  // 10 — the Wronskian, and PH in one line
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
        <p style={{ marginTop: '1em', opacity: 0.8 }}>
          And that argument is the tip of a theorem. Möbius is merely the case where the dilation{' '}
          <Math>{'(ad-bc)/(cz+d)^2'}</Math> is a square — which it always is. The <em>complete</em>{' '}
          class of PH-preserving maps is
        </p>
        <Math display>{"\\partial\\Phi/\\partial z = \\Psi^2 \\qquad \\Psi \\text{ meromorphic, with residue conditions}"}</Math>
        <p style={{ opacity: 0.8 }}>
          <span className="text-slate-400">
            Altavilla, Schröcker, Šír &amp\\; Vršek, <em>Proc. Roy. Soc. A</em> (2026).
          </span>
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
  // 11 — what the chart costs, and how many answers
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
      + 'DO NOT CLAIM 3 IS A NEW NUMBER. It is 10 - 6 - 1 and every term is elementary\\; what is measured '
      + 'is the 10, i.e. that PH really costs 4 and not 3 or 5.',
  },

  // ---------------------------------------------------------------------------
  // 12 — why the plane is easy: the cone factors
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
        <p style={{ marginTop: '1em' }}>
          One fact, <strong>two</strong> consequences — and the second is not the one you would guess:
        </p>
        <table style={{ margin: '0.4em auto 0', borderCollapse: 'collapse', fontSize: '0.86em' }}>
          <tbody>
            <tr>
              <td style={{ padding: '0.3em 1.1em', textAlign: 'right', opacity: 0.7 }}>the square root is</td>
              <td style={{ padding: '0.3em 1.1em' }}>discrete in the plane, continuous in space</td>
              <td style={{ padding: '0.3em 1.1em', opacity: 0.6 }}>→ Act III</td>
            </tr>
            <tr>
              <td style={{ padding: '0.3em 1.1em', textAlign: 'right', opacity: 0.7 }}>the PH-preserving group is</td>
              <td style={{ padding: '0.3em 1.1em' }}>
                <strong>enormous</strong> in the plane, <strong>only Möbius</strong> for <Math>{'n \\geq 3'}</Math>
              </td>
              <td style={{ padding: '0.3em 1.1em', opacity: 0.6 }}>Liouville</td>
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: '1em' }}>
          So the plane is not merely <em>easier</em>. It is <strong>less rigid</strong>. Rigidity is what
          arrives at dimension three.
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
      + 'which is why the complex chart, not the real one, is where the plane looks easy. '
      + 'THE SECOND ROW OF THE TABLE IS THE 2026 THEOREM and it is the better half of this slide. An '
      + 'earlier version of this talk said only "the plane is easier", which undersells it: by '
      + 'Altavilla-Schrocker-Sir-Vrsek the PH-preserving maps of the plane are ALL conformal maps whose '
      + 'dilation is a square -- a vast group, of which Mobius is one small piece -- while for n >= 3 '
      + "Liouville's theorem forces (anti-)Mobius and nothing else. So the interesting statement is not "
      + 'that the plane is easy but that RIGIDITY APPEARS AT DIMENSION THREE. Slide 9 states the theorem\\; '
      + 'this slide says what it means.',
  },

  // ---------------------------------------------------------------------------
  // 13 — the cliffhanger
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
      + 'DO NOT PREVIEW IT. The table on this slide is the question\\; a listener who works out the answer '
      + 'themselves during the break is worth more than one who was told.',
  },

  // ===========================================================================
  // ACT III — WHAT THE GAUGE DECIDES
  //
  // Act II ended on a question: the plane gives finitely many answers, space gives a circle, an
  // ellipse, a torus, and neither the data nor the degree explains the difference. This act answers it,
  // and it is where the talk stops being a reframing: ONE principle accounts for the shape of every
  // solution family in the field, and both extremes of it are measured in this repository.
  //
  // III-a: the principle, and the two measured ends. III-b: the TORUS -- held back until the derivation
  // was actually done, because writing the slide first is how a confident paragraph ends up over a gap.
  // It is done now (core/__tests__/spatialQuinticTorus.test.ts): THREE Hopf fibers, one diagonal gauge.
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // 14 — the principle: the ambiguity is a group
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>The ambiguity is a group</h2>
        <p>
          Ask what is lost by <em>forgetting the spinor and keeping the curve</em>. The answer is a group,
          and Act II already named two of them:
        </p>
        <Math display>{'w^2 = v^2 \\iff v = \\pm w \\qquad\\qquad \\mathcal{A}\\,i\\,\\bar{\\mathcal{A}} = \\mathcal{B}\\,i\\,\\bar{\\mathcal{B}} \\iff \\mathcal{B} = \\mathcal{A}\\,e^{i\\theta}'}</Math>
        <table style={{ margin: '1em auto 0', borderCollapse: 'collapse', fontSize: '0.9em' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid currentColor', opacity: 0.7 }}>
              <th style={{ padding: '0.3em 1.2em', textAlign: 'left' }}>representation</th>
              <th style={{ padding: '0.3em 1.2em', textAlign: 'left' }}>gauge</th>
              <th style={{ padding: '0.3em 1.2em', textAlign: 'left' }} />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.3em 1.2em' }}>plane, <Math>{"\\mathbf{c}' = w^2"}</Math></td>
              <td style={{ padding: '0.3em 1.2em' }}><Math>{'\\mathbb{Z}/2'}</Math></td>
              <td style={{ padding: '0.3em 1.2em', opacity: 0.65 }}>discrete — Act II's <em>sign</em></td>
            </tr>
            <tr>
              <td style={{ padding: '0.3em 1.2em' }}>space, <Math>{'\\mathbf{c}\' = \\mathcal{A}i\\bar{\\mathcal{A}}'}</Math></td>
              <td style={{ padding: '0.3em 1.2em' }}><Math>{'S^1'}</Math></td>
              <td style={{ padding: '0.3em 1.2em', opacity: 0.65 }}>compact, connected — the <em>Hopf phase</em></td>
            </tr>
            <tr>
              <td style={{ padding: '0.3em 1.2em' }}>conformal, <Math>{'C \\in \\mathbb{R}^{4,1}'}</Math></td>
              <td style={{ padding: '0.3em 1.2em' }}><Math>{'\\mathbb{R}^* \\times \\mathbb{R}^*'}</Math></td>
              <td style={{ padding: '0.3em 1.2em', opacity: 0.65 }}>
                <strong>non-compact</strong> — scale, and <Math>{'w_k \\mapsto \\lambda^k w_k'}</Math>
              </td>
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: '1.2em' }}>
          <strong>Dimension</strong> of a solution family = (spinor solutions) − (gauge). And its{' '}
          <strong>shape</strong> is inherited from the group the free parameter lives in.
        </p>
      </>
    ),
    notes:
      'THIS SLIDE PAYS OUT ACT II\'S CLIFFHANGER, so deliver the first equation slowly: the SIGN from the '
      + 'reducible cone IS the Z/2, and the SPINOR PHASE from the irreducible one IS the S^1. Same fact, '
      + 'read as a group. '
      + 'THE Z/2 IS EXACT: w^2 = v^2 gives (w-v)(w+v) = 0 in C[t], a domain, so v = plus or minus w. The '
      + 'S^1 is the Hopf fiber, and the gauge must be a CONSTANT phase rather than a function of t, or '
      + 'polynomiality is lost -- which is why it contributes exactly ONE dimension to every count in this '
      + 'act. '
      + 'THE CONFORMAL ROW IS THE REPRESENTATION GAUGE ONLY, and the distinction matters: O(4,1) is an '
      + 'AMBIENT SYMMETRY that moves the curve, while the projective scale and the reparametrisation move '
      + 'the representative and leave the curve alone. Measured: 12 gauge directions in the tangent space '
      + 'to 1.8e-12, of which 10 are Mobius and 2 are these. '
      + 'BE PRECISE ABOUT THE SECOND SENTENCE. The dimension claim is arithmetic and safe. The SHAPE claim '
      + 'is an OBSERVATION supported by the two measured cases on the next slides, not a theorem -- what '
      + 'you see is the quotient S/G, not the fiber, and the closed direction happens to be the compact '
      + 'one. Say "inherited from" and not "equal to", and do not oversell it.',
  },

  // ---------------------------------------------------------------------------
  // 15 — compact: the fiber closes, and arc length cannot choose
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Compact: the family closes</h2>
        <p>
          Spatial PH cubics through <Math>{'p_0'}</Math>, a first leg, and a far endpoint. Count:{' '}
          <Math>{'8 - 6 - 1 = 1'}</Math>, and the parameter you travel is the Hopf phase — which is a{' '}
          <em>circle</em>. So the family is a <strong>closed loop</strong>, and it is:
        </p>
        <Math display>
          {'\\text{181 members traced} \\qquad \\text{end gap } 0.02 \\text{ of a median step}'}
        </Math>
        <p style={{ marginTop: '0.8em' }}>
          And <strong>arc length is constant along it</strong> — spread <Math>{'2.9\\times10^{-6}'}</Math>{' '}
          at 512 quadrature points, <Math>{'1.8\\times10^{-4}'}</Math> at 64. A factor of 64 for an
          8-fold refinement: that is midpoint quadrature's <Math>{'1/n^2'}</Math>. <em>The spread is the
          quadrature.</em> The true value is constant.
        </p>
        <p style={{ marginTop: '1em' }}>
          <strong>So arc length cannot choose for you.</strong> A functional constant on the family
          selects nothing — the choice rule is not a convenience, it is forced by the gauge being
          positive-dimensional.
        </p>
      </>
    ),
    notes:
      'THE QUADRATURE ARGUMENT IS THE POINT OF THE SLIDE and it is worth saying out loud, because it is '
      + 'how you tell a REAL degeneracy from a numerical one. If arc length were only nearly constant, '
      + 'refining the quadrature would leave the spread alone. It falls as 1/n^2 -- 64x for 8x -- so the '
      + 'spread IS the integration error and the underlying function is exactly constant. The closed form '
      + 'in phSpatialCubic fiberArcLength agrees. '
      + 'AND IT SURVIVES THE LIFT: push all 181 members through the null lift and every one is a conformal '
      + 'degree-6 member to 1.4e-15, with the loop still closing in the 41-dimensional coefficient space. '
      + 'The lift is canonical, so that closure is literal and not up to a gauge. The degeneracy is a '
      + 'property of those curves, not of the polynomial setting. '
      + 'BUT IT IS A POLYNOMIAL-ONLY FACT ABOUT ARC LENGTH, and this is the sharpest thing on the slide if '
      + 'someone pushes: bend the fiber by a transversion -- the only part of the Mobius group that turns '
      + 'lines into circles -- and every image is still a member (3.8e-15), none is polynomial any more '
      + '(least bead offset 2.7e-2), the loop still closes (0.02 median steps), but arc length now SPREADS '
      + 'by 1.2e-2. So in the RATIONAL family arc length does select among the fiber. "Arc length cannot '
      + 'choose for you" is true of the polynomial cubics and false of their Mobius images. '
      + 'THIS IS ALSO WHERE THE OTHER DECK\'S SPINE MEETS THIS ONE: fewer conditions than dimensions means '
      + 'a positive-dimensional fiber means you need a CHOICE RULE. The gauge is why.',
  },

  // ---------------------------------------------------------------------------
  // 16 — non-compact: the family runs off
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Non-compact: the family runs off</h2>
        <p>
          Now the conformal sextic, with <strong>five of its seven control points held</strong>. Count:
          fifteen coordinates prescribed against sixteen reachable, so again <strong>one</strong>{' '}
          dimension — but the free parameter now lives in <Math>{'\\mathbb{R}^*'}</Math>, not{' '}
          <Math>{'S^1'}</Math>.
        </p>
        <p>It does not close. Measured, by walking it with two different step budgets:</p>
        <Math display>
          {'\\text{backward } 0.19 \\text{ on a budget of } 1.74, \\quad 0.19 \\text{ on } 4.34 \\qquad \\text{— a WALL}'}
        </Math>
        <Math display>
          {'\\text{forward } 1.61 \\text{ on } 1.74, \\quad 3.06 \\text{ on } 4.34 \\qquad \\text{— NOT a wall}'}
        </Math>
        <p>
          The backward end is a <strong>weight degeneration</strong> — the weights run to{' '}
          <Math>{'(1,\\, 4.1,\\, 11.7,\\, 20.9,\\, 142.9,\\, 95.5,\\, 43.5)'}</Math>, which projectively is{' '}
          <Math>{'w_0 \\to 0'}</Math>. Forward, it simply keeps going.
        </p>
        <p style={{ marginTop: '0.8em', opacity: 0.75 }}>
          Along the way a sphere radius passes <strong>through zero and goes negative</strong> —{' '}
          <Math>{'\\langle C, C\\rangle < 0'}</Math>, an imaginary sphere — with the residual at{' '}
          <Math>{'1.9\\times10^{-15}'}</Math> throughout. A point-sphere is a coordinate event, not a
          boundary.
        </p>
      </>
    ),
    notes:
      'THE TWO-BUDGET TRICK IS THE METHOD, and it is worth naming because it is how you distinguish a real '
      + 'boundary from your own step limit. Walk the family twice with different budgets: an end that does '
      + 'not move is a WALL, an end that grows with the budget was never an end at all. Measured 0.19 both '
      + 'times backward, and 1.61 versus 3.06 forward. An earlier version of the slide claimed the forward '
      + 'end was a boundary\\; it was the step cap, and this is how that was caught. '
      + 'WHAT THE WALL IS: the weights degenerating, w_0 -> 0 projectively, which is the same asymptotic '
      + 'wall the reparametrisation dial runs into in the other deck -- met from a different direction. '
      + 'Non-compact gauge, so the family runs to a degeneration instead of returning. '
      + 'AND A CORRECTION WORTH OWNING IF ASKED: rho_2 crossing zero was first read as a point-sphere '
      + 'BOUNDARY. It is not. The curve passes straight through with a machine-zero residual and the '
      + 'sphere through that conformal point simply stops being real. What the walk DOES refuse is a '
      + 'denominator with a real root, since that is a curve with a pole. '
      + 'IF ASKED WHY 16 AND NOT 18: the family is 18-dimensional but two of its directions move NO '
      + 'control point -- the projective scale and the reparametrisation, exactly the non-compact gauge on '
      + 'slide 13. So the reachable polygons are 16-dimensional and a seven-point polygon is '
      + 'over-determined by FIVE. Measured rank 16.',
  },

  // ---------------------------------------------------------------------------
  // 17 — the principle, restated with both ends in hand
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>What the gauge decides</h2>
        <table style={{ margin: '0 auto', borderCollapse: 'collapse', fontSize: '0.88em' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid currentColor', opacity: 0.7 }}>
              <th style={{ padding: '0.35em 1.1em', textAlign: 'left' }}>gauge</th>
              <th style={{ padding: '0.35em 1.1em', textAlign: 'left' }}>the family is</th>
              <th style={{ padding: '0.35em 1.1em', textAlign: 'left' }}>and you get</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.35em 1.1em' }}><Math>{'\\mathbb{Z}/2'}</Math> — discrete</td>
              <td style={{ padding: '0.35em 1.1em' }}>zero-dimensional</td>
              <td style={{ padding: '0.35em 1.1em' }}>finitely many curves\\; <em>pick one</em></td>
            </tr>
            <tr>
              <td style={{ padding: '0.35em 1.1em' }}><Math>{'S^1'}</Math> — compact</td>
              <td style={{ padding: '0.35em 1.1em' }}>a <strong>closed</strong> loop</td>
              <td style={{ padding: '0.35em 1.1em' }}>a choice rule, and no escape from it</td>
            </tr>
            <tr>
              <td style={{ padding: '0.35em 1.1em' }}><Math>{'\\mathbb{R}^*'}</Math> — non-compact</td>
              <td style={{ padding: '0.35em 1.1em' }}>an <strong>open</strong> road</td>
              <td style={{ padding: '0.35em 1.1em' }}>a wall at one end, a degeneration</td>
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: '1.3em' }}>
          Not the data. Not the degree. <strong>The group you divided by.</strong>
        </p>
        <p style={{ opacity: 0.65, marginTop: '0.8em' }}>
          And when the compact circle appears <em>twice</em>, the family is a surface.
        </p>
      </>
    ),
    notes:
      'THE LAST LINE IS THE SETUP FOR THE TORUS and should be said lightly, almost as an aside -- two '
      + 'circles, so a 2-torus, and that is the spatial quintic Hermite family. Do not develop it here. '
      + 'HOLD THE LINE ON WHAT IS PROVED. The DIMENSION column is arithmetic. The SHAPE column is an '
      + 'observation with two measured instances, and honest phrasing is "inherited from" rather than '
      + '"determined by" -- what is seen is the quotient, and the closed direction happens to be the '
      + 'compact one. If someone in the room can turn it into a theorem, that is a good outcome for the '
      + 'talk, and the phrasing should invite that rather than pre-empt it. '
      + 'THE PRACTICAL PAYOFF, if a CAGD audience wants one: this predicts WHEN you need a fairness '
      + 'functional and when you merely need to enumerate. Discrete gauge means enumerate and compare. '
      + 'Compact gauge means a continuum with no distinguished member, so a choice rule is mandatory -- and '
      + 'if your functional is gauge-constant, as arc length is on the spatial cubic fiber, it will select '
      + 'nothing and you will not be able to tell from the residuals. '
      + 'THE NEXT TWO SLIDES NAME THE CIRCLES. The count 12 - 9 - 1 = 2 was never the hard part\\; saying '
      + 'WHICH two circles is, and the answer turns out to be three Hopf fibers with the gauge acting '
      + 'diagonally on them.',
  },

  // ---------------------------------------------------------------------------
  // 18 — III-b: the third circle, by completing the square
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>The third circle</h2>
        <p>
          Spatial PH quintic Hermite. Two of the circles are immediate — the Hopf fibers over the end
          tangents:
        </p>
        <Math display>
          {'\\mathcal{A}_0 i \\bar{\\mathcal{A}}_0 = \\mathbf{d}_0 \\Rightarrow \\mathcal{A}_0 = \\mathcal{A}_0^{*} e^{i\\varphi_0}, \\qquad \\mathcal{A}_2 i \\bar{\\mathcal{A}}_2 = \\mathbf{d}_1 \\Rightarrow \\mathcal{A}_2 = \\mathcal{A}_2^{*} e^{i\\varphi_2}'}
        </Math>
        <p>
          The displacement looks like a mess — quadratic in <Math>{'\\mathcal{A}_1'}</Math>, with cross
          terms. Integrate over the Bernstein basis,{' '}
          <Math>{'\\int_0^1 B_i^2 B_j^2 = \\binom{2}{i}\\binom{2}{j} / \\bigl(5\\binom{4}{i+j}\\bigr)'}</Math>:
        </p>
        <Math display>
          {'5\\Delta\\mathbf{p} = \\mathbf{d}_0 + \\mathbf{d}_1 + \\tfrac{2}{3}\\mathcal{A}_1 i \\bar{\\mathcal{A}}_1 + \\tfrac12\\bigl(\\mathcal{A}_1 i \\bar{S} + S i \\bar{\\mathcal{A}}_1\\bigr) + \\tfrac16\\bigl(\\mathcal{A}_0 i \\bar{\\mathcal{A}}_2 + \\mathcal{A}_2 i \\bar{\\mathcal{A}}_0\\bigr)'}
        </Math>
        <p>
          with <Math>{'S = \\mathcal{A}_0 + \\mathcal{A}_2'}</Math>. Now <strong>complete the
          square</strong>: put <Math>{'Y = \\mathcal{A}_1 + \\tfrac34 S'}</Math> and the cross term is
          absorbed —
        </p>
        <Math display>
          {'Y i \\bar{Y} = T, \\qquad T = \\tfrac32 V + \\tfrac{9}{16} S i \\bar{S}, \\qquad V = 5\\Delta\\mathbf{p} - \\mathbf{d}_0 - \\mathbf{d}_1 - \\tfrac16\\bigl(\\mathcal{A}_0 i \\bar{\\mathcal{A}}_2 + \\mathcal{A}_2 i \\bar{\\mathcal{A}}_0\\bigr)'}
        </Math>
        <p>
          <strong>One more Hopf equation.</strong> So{' '}
          <Math>{'\\mathcal{A}_1'}</Math>&apos\\;s freedom is the fiber over <Math>{'T'}</Math> —{' '}
          <Math>{'Y = Y^{*} e^{i\\psi}'}</Math>, a <em>third</em> circle.
        </p>
      </>
    ),
    notes:
      'COMPLETING THE SQUARE IS THE WHOLE TRICK and it is worth doing on the board if anyone wants it. '
      + 'The cross term is (1/2)(A_1 i S-bar + S i A_1-bar), and (Y)(i)(Y-bar) with Y = A_1 + lambda S '
      + 'expands to A_1 i A_1-bar + lambda(A_1 i S-bar + S i A_1-bar) + lambda^2 S i S-bar. Matching '
      + 'against the 2/3 and 1/2 gives lambda = 3/4, and the leftover lambda^2 term is what moves to the '
      + 'right-hand side as the 9/16. Nothing subtler than that. '
      + 'NOT CLAIMED AS NEW. That this family is two-parameter and indexed by angles is classical -- '
      + 'Farouki and co-authors -- and a manipulation of this kind is very likely how it was first '
      + 'obtained. What is offered here is the FORM Act III needs: three Hopf fibers and one diagonal '
      + 'gauge, so the torus is explained rather than observed. '
      + 'THE PAYOFF IS THAT THERE IS NO SOLVER. Three angles in, an interpolant out, in closed form. '
      + 'Measured in spatialQuinticTorus.test.ts: 216 members from a 6x6x6 grid of angle triples, end '
      + 'tangents hit to 2.9e-16 and the displacement to 8.6e-16, with nothing iterated. The Bernstein '
      + 'integral is itself checked against quadrature (3.6e-8 at 4000 midpoints) so the load-bearing '
      + 'coefficients are not a mis-remembered formula. '
      + 'THE ONE FAILURE MODE, stated rather than hidden: T = 0 leaves the third fiber with nothing to '
      + 'invert. A sweep of the displacement did not find a zero (smallest |T| was 5.4), so the honest '
      + 'claim is "nonzero at the data used", not "never zero".',
  },

  // ---------------------------------------------------------------------------
  // 19 — III-b: three circles, one gauge, a torus
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Three circles, one gauge, a torus</h2>
        <p>
          So the family is parametrised in <strong>closed form</strong> by three angles — and the gauge
          is the <strong>diagonal</strong>. Under <Math>{'\\mathcal{A} \\mapsto \\mathcal{A}e^{i\\theta}'}</Math>,
          the factor commutes with <Math>{'i'}</Math>, so <Math>{'\\mathbf{d}_0'}</Math>,{' '}
          <Math>{'\\mathbf{d}_1'}</Math> and the polarisation are all fixed — hence{' '}
          <Math>{'T'}</Math> is fixed, and <Math>{'Y \\mapsto Y e^{i\\theta}'}</Math>,{' '}
          <Math>{'\\mathcal{A}_1 \\mapsto \\mathcal{A}_1 e^{i\\theta}'}</Math>. All three angles
          shift together and nothing changes:
        </p>
        <Math display>
          {'\\text{the family} \\;=\\; (S^1)^3 / S^1_{\\text{diagonal}} \\;\\cong\\; T^2'}
        </Math>
        <p style={{ marginTop: '0.6em' }}>Measured, with no solver anywhere:</p>
        <Math display>
          {'\\text{216 members from } 6^3 \\text{ triples: } \\mathbf{d} \\text{ to } 2.9\\!\\times\\!10^{-16},\\; \\Delta\\mathbf{p} \\text{ to } 8.6\\!\\times\\!10^{-16}'}
        </Math>
        <p>
          The diagonal shift leaves the hodograph fixed to <Math>{'2.8\\times10^{-15}'}</Math>\\; each
          remaining circle closes at <Math>{'2\\pi'}</Math> to <Math>{'3.3\\times10^{-16}'}</Math>\\; and
          the two tangent directions span a genuine 2-plane —{' '}
          <Math>{'\\sin\\angle = 0.228'}</Math>, so it is a <strong>surface</strong>, not a curve.
        </p>
        <p style={{ marginTop: '0.8em' }}>
          <strong>The compact circle appeared twice. That is the whole reason it is a torus.</strong>
        </p>
      </>
    ),
    notes:
      'THIS CLOSES ACT III, so land the last line and let it sit. Act III-a claimed the SHAPE of a '
      + 'solution family is inherited from the group the free parameter lives in. Here the group is S^1 '
      + 'and it appears three times against one diagonal gauge, so the family is T^2 -- the principle '
      + 'instantiated rather than merely illustrated. '
      + 'WHY sin(angle) = 0.228 AND NOT SOMETHING NEAR 1: the two tangent directions are independent but '
      + 'far from orthogonal, which is expected -- there is no reason for a natural angle coordinate to be '
      + 'orthogonal to another one. What matters is that it is bounded away from zero, since zero would '
      + 'mean the two circles trace the SAME loop and the family would be a circle, not a surface. '
      + 'IF ASKED WHETHER IT IS EXACTLY T^2 rather than some other surface: what is measured is that both '
      + 'parameters are 2pi-periodic and their tangent directions are independent, which gives a closed '
      + 'surface swept doubly periodically. The third circle T depends on the first two, so strictly this '
      + 'is a circle bundle over T^2 quotiented by the diagonal\\; that it is the TRIVIAL bundle -- hence '
      + 'exactly T^2 and not, say, a Klein bottle -- is not proved here. Say "a torus" and be ready to '
      + 'concede "a doubly periodic closed surface" if pressed. '
      + 'AND THE HONEST LIMIT: T = 0 would break the parametrisation. Not found in a sweep, not proved '
      + 'impossible.',
  },

  // ===========================================================================
  // ACT IV — WHOSE SUBJECT THIS IS
  //
  // The act that was going to be "the dictionary and the lattice" is instead the credit map and the
  // reading path. That is the honest ending: the theory these three acts present is published, the
  // invariance question is closed as of 2026, and what this deck adds is the checking and the editor.
  // An outlook act would have been the weakest thing here\\; a bibliography that says exactly who
  // established what is the strongest.
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // 20 — the apparent conflict, and why there is none
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Möbius is all the point maps. Lie is the rest.</h2>
        <p>Two results that look like they disagree:</p>
        <ul style={{ fontSize: '0.9em' }}>
          <li>
            For <Math>{'n \\geq 3'}</Math>, the PH-preserving <strong>mappings</strong> are
            (anti-)Möbius. <span style={{ opacity: 0.6 }}>Altavilla–Schröcker–Šír–Vršek 2026</span>
          </li>
          <li style={{ marginTop: '0.3em' }}>
            <strong>Lie sphere</strong> transformations preserve rational PH — offsets of a PH curve are
            rational PH. <span style={{ opacity: 0.6 }}>Peternell–Pottmann 1998</span>
          </li>
        </ul>
        <p style={{ marginTop: '0.8em' }}>
          They do not disagree, because <strong>a Lie transformation is not a mapping of points.</strong>{' '}
          It acts on <em>contact elements</em>\\; the image of a curve is a <strong>wave front</strong>, with
          cusps on the evolute. It is outside the class the first theorem quantifies over.
        </p>
        <p style={{ marginTop: '0.8em' }}>
          And then the classical fact that makes them one statement:
        </p>
        <p style={{ textAlign: 'center' }}>
          <strong>the point-preserving Lie sphere transformations are precisely the Möbius transformations.</strong>
        </p>
        <table style={{ margin: '1em auto 0', borderCollapse: 'collapse', fontSize: '0.82em' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid currentColor', opacity: 0.7 }}>
              <th style={{ padding: '0.3em 1em', textAlign: 'left' }} />
              <th style={{ padding: '0.3em 1em' }}>circles?</th>
              <th style={{ padding: '0.3em 1em' }}>points?</th>
              <th style={{ padding: '0.3em 1em' }}>PH?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.3em 1em' }}>the planar group <Math>{"\\Phi' = \\Psi^2"}</Math></td>
              <td style={{ padding: '0.3em 1em', textAlign: 'center' }}>no</td>
              <td style={{ padding: '0.3em 1em', textAlign: 'center' }}>yes</td>
              <td style={{ padding: '0.3em 1em', textAlign: 'center' }}>yes</td>
            </tr>
            <tr>
              <td style={{ padding: '0.3em 1em' }}>Lie sphere</td>
              <td style={{ padding: '0.3em 1em', textAlign: 'center' }}>yes</td>
              <td style={{ padding: '0.3em 1em', textAlign: 'center' }}>no</td>
              <td style={{ padding: '0.3em 1em', textAlign: 'center' }}>yes</td>
            </tr>
            <tr>
              <td style={{ padding: '0.3em 1em' }}><strong>Möbius</strong></td>
              <td style={{ padding: '0.3em 1em', textAlign: 'center' }}><strong>yes</strong></td>
              <td style={{ padding: '0.3em 1em', textAlign: 'center' }}><strong>yes</strong></td>
              <td style={{ padding: '0.3em 1em', textAlign: 'center' }}><strong>yes</strong></td>
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: '0.9em', opacity: 0.75 }}>
          Möbius is the <em>intersection</em> — which is why it answers two different questions.
        </p>
      </>
    ),
    notes:
      "THIS SLIDE EXISTS BECAUSE ERIC ASKED THE OBVIOUS QUESTION: did they forget Lie sphere "
      + 'transformations? They did not -- the theorem quantifies over POINT MAPPINGS, and a Lie '
      + 'transformation is not one. Say that first, because it is the whole resolution. '
      + 'THE TABLE IS THE PAYOFF. Conformal is NOT the same as circle-preserving -- only Mobius preserves '
      + 'circles -- so the huge planar group of dilation-squared maps sits entirely outside Lie sphere '
      + 'geometry, while Lie transformations sit outside the class of point maps. Mobius is where the two '
      + 'conditions meet, and that is the structural reason it is the answer to both questions. '
      + 'ONE THING TO CHECK WHEN READING THE 2026 PAPER, and it is the same slippage that muddled our own '
      + 'discussion: WHICH class is being preserved. Mobius does NOT preserve POLYNOMIAL PH -- it makes it '
      + 'rational -- so "PH-preserving" there must mean rational PH, or the property that the speed is '
      + 'rational. Do not quote the theorem without that qualification. '
      + 'AND THE GEOMETRIC READING OF THE LIE HALF: offsetting is the model non-Mobius Lie transformation, '
      + 'and the offset speed is sigma*(1 - eps*kappa) -- rational, vanishing exactly at the cusp. The '
      + 'SIGNED speed stays rational\\; it is the absolute value that breaks polynomiality, which is why Lie '
      + 'geometry insists on ORIENTED spheres.',
  },

  // ---------------------------------------------------------------------------
  // 21 — who established what
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>Whose subject this is</h2>
        <table style={{ margin: '0 auto', borderCollapse: 'collapse', fontSize: '0.82em' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid currentColor', opacity: 0.7 }}>
              <th style={{ padding: '0.3em 1em', textAlign: 'left' }}>the result</th>
              <th style={{ padding: '0.3em 1em', textAlign: 'left' }}>whose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.3em 1em' }}><Math>{"\\mathbf{c}' = w^2"}</Math>, and the whole classical theory</td>
              <td style={{ padding: '0.3em 1em' }}>Farouki</td>
            </tr>
            <tr>
              <td style={{ padding: '0.3em 1em' }}><Math>{'\\mathcal{A}i\\bar{\\mathcal{A}}'}</Math>, the spatial spinor form</td>
              <td style={{ padding: '0.3em 1em' }}>Choi, Han &amp\\; Farouki</td>
            </tr>
            <tr>
              <td style={{ padding: '0.3em 1em' }}><strong>the spin cover unifying every incarnation</strong> — Act I</td>
              <td style={{ padding: '0.3em 1em' }}>Choi et al., 2002</td>
            </tr>
            <tr>
              <td style={{ padding: '0.3em 1em' }}><strong>every Laguerre model inside one <Math>{'\\mathbb{R}^{4,2}'}</Math></strong> — slide 6</td>
              <td style={{ padding: '0.3em 1em' }}>Krasauskas, 2017</td>
            </tr>
            <tr>
              <td style={{ padding: '0.3em 1em' }}>PH curves <em>and</em> PN surfaces from Laguerre geometry</td>
              <td style={{ padding: '0.3em 1em' }}>Peternell &amp\\; Pottmann, 1998</td>
            </tr>
            <tr>
              <td style={{ padding: '0.3em 1em' }}>Lie = two Möbius + one parallel</td>
              <td style={{ padding: '0.3em 1em' }}>Cecil &amp\\; Chern</td>
            </tr>
            <tr style={{ borderTop: '1px solid currentColor' }}>
              <td style={{ padding: '0.3em 1em' }}>
                <strong>PH-preserving maps, completely</strong> — slides 9, 11
              </td>
              <td style={{ padding: '0.3em 1em' }}>
                <strong>Altavilla, Schröcker, Šír &amp\\; Vršek, 2026</strong>
              </td>
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: '1.2em' }}>
          What these three acts add is not a theorem. It is that <strong>every number on every slide was
          measured before it was written</strong> — and the editor the theory is for.
        </p>
      </>
    ),
    notes:
      'SAY THIS SLIDE WITHOUT APOLOGY AND WITHOUT INFLATION. The theory in Acts I-III is published: the '
      + 'spin-cover unification is Choi et al. 2002, the R^{4,2} embedding is Krasauskas 2017, the '
      + 'Laguerre invariance is Peternell-Pottmann 1998, and the invariance question is CLOSED as of 2026 '
      + 'by Altavilla-Schrocker-Sir-Vrsek. Presenting any of it as new would be false and, in this room, '
      + 'immediately caught. '
      + 'WHAT IS ACTUALLY DIFFERENT HERE is the checking. Every dimension count, every residual, every '
      + 'claim about a fiber closing or a road ending was measured in a test before it reached a slide, '
      + 'and the measurement is named in these notes. That is unusual for a theory talk and it is worth '
      + 'saying plainly: not "we discovered", but "we verified, and here is what it cost". '
      + 'AND THE HONEST HIERARCHY: the unmatched work is the EDITOR -- interactive curvature-extrema '
      + 'control under a drag, with a monotone bound. None of the literature above touches it. The '
      + 'contact-order argument establishes that in the PLANE the quantity it controls is a genuine '
      + 'conformal invariant, which is what makes the conformal setting the right home for it rather than '
      + 'a detour. In SPACE that is open (kappa\' = 0 is not conformally invariant), and it is the '
      + 'sharpest question this work has.',
  },

  // ---------------------------------------------------------------------------
  // 22 — the reading path
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>The reading path</h2>
        <ol style={{ fontSize: '0.86em', lineHeight: 1.5 }}>
          <li>
            <strong>Choi et al. (2002)</strong>, <em>Clifford Algebra, Spin Representation, and Rational
            Parameterization of Curves and Surfaces</em>, Adv. Comput. Math.
            <br />
            <span style={{ opacity: 0.65 }}>Acts I and II, done properly and first.</span>
          </li>
          <li style={{ marginTop: '0.4em' }}>
            <strong>Krasauskas (2017)</strong>, <em>Unifying Theory of Pythagorean-Normal Surfaces Based on
            Geometric Algebra</em>, AACA 27:491–502.
            <br />
            <span style={{ opacity: 0.65 }}>
              Cyclographic, Blaschke and isotropic models all inside <Math>{'\\mathbb{R}^{4,2}'}</Math>.
            </span>
          </li>
          <li style={{ marginTop: '0.4em' }}>
            <strong>Altavilla, Schröcker, Šír &amp\\; Vršek (2026)</strong>, <em>A Complete Characterization
            of Pythagorean Hodograph Preserving Mappings</em>, Proc. Roy. Soc. A.
            <br />
            <span style={{ opacity: 0.65 }}>
              The invariance question, closed. Read closely — the residue conditions are the “no-log”
              condition met from the other side.
            </span>
          </li>
          <li style={{ marginTop: '0.4em' }}>
            <strong>Peternell &amp\\; Pottmann (1998)</strong>, <em>A Laguerre geometric approach to rational
            offsets</em>, CAGD 15(3):223–249. And <strong>Cecil</strong>, <em>Lie Sphere Geometry</em>.
            <br />
            <span style={{ opacity: 0.65 }}>Where the circles live. Kosinka &amp\\; Jüttler for the Minkowski cell.</span>
          </li>
          <li style={{ marginTop: '0.4em' }}>
            <strong>Farouki (2023)</strong>, <em>Partition of the space of planar quintic PH curves</em>,
            CAGD 106:102242.
            <br />
            <span style={{ opacity: 0.65 }}>How a moduli question is actually posed and answered in print.</span>
          </li>
        </ol>
        <p style={{ marginTop: '0.8em', opacity: 0.75 }}>
          <strong>The people:</strong> Farouki · Šír, Schröcker, Vršek, Altavilla · Krasauskas, Peternell,
          Pottmann · Kosinka, Jüttler.
        </p>
      </>
    ),
    notes:
      'THIS SLIDE IS FOR THE ROOM AND FOR US. Ordered by what to read FIRST, not by date -- Choi et al. '
      + 'and Krasauskas before anything else, because they are the two papers these acts re-present, and '
      + 'reading them will change how the acts should be told. '
      + 'THE 2026 PAPER IS THE ONE TO READ CLOSELY. Its residue conditions on Psi are the same "no-log" '
      + 'condition that turned up in our own spinor derivation from the other direction -- so we were '
      + 'rediscovering a piece of it, which is a good sign about the derivation and a clear sign about '
      + 'the priority. '
      + 'WHAT IS NOT ON THIS LIST, because a search did not find it: the moduli geometry of the conformal '
      + 'PH CURVE variety -- dimension 2n+6, moduli 2n-6, the codimension-3 bendable locus, the singular '
      + 'stratum at lifted polynomials. Farouki 2023 does exactly this KIND of thing for planar quintics, '
      + 'so the technique is established and the specific object may be unclaimed. Treat that as "not '
      + 'found", not "not taken" -- and read Farouki 2023 to see the standard before deciding anything.',
  },
]

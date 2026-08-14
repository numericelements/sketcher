// ============================================================================
// INSIDE THE CHART
//   What the space of rational PH curves feels like from within — and where it ends
//
// A FIGURE DECK, and the figures carry the argument. Its companion is price-of-a-circle,
// which is the theory: the ledger, the atlas, the proofs. This one asks a different
// question — not "what does rationality cost" but "what is it like to be in there and
// move". Nothing here is proved; everything here is DRIVEN.
//
// THE SPINE, and it is the shape of the space rather than a list of results:
//
//   you are always INSIDE a chart          coordinates: the dials and the fibre
//   the chart has an EDGE                  roads that end, and a horizon at tan θ = ∞
//   there is more than one KIND of chart   the σ = h·w family needs its own
//   Möbius moves you BETWEEN charts        free in the column form
//
// WHY EACH FIGURE HAS TO EARN ITS PLACE. The sibling ph-interpolation deck already shows
// the one- and two-pole families live (its slides 16-17), so nothing here repeats that.
// A figure belongs only if it shows something the prose cannot: a number moving the wrong
// way, a handle that stops responding, a corner that refuses to soften.
//
// THE TWO MODES, borrowed from ph-interpolation because they are the right pair:
//
//   STRICT   the honest coordinates. Exactly 4(n+1) − 4m fibre directions plus m dials
//            are live; everything dependent is greyed, so the picture SHOWS the count.
//   FREE     the optimiser, one control point at a time, ends anchored unless selected.
//            Inside a chart it carries NO PH constraints — only what you asked for.
//
// AUDIENCE: someone who knows what a PH curve is and has seen a rational one. The theory
// is cited to price-of-a-circle and to FOUNDATIONS, never re-derived.
//
// STATUS: title, slide 1, THE DEGREE-4 PAIR — the pole on the sphere (slide 3) and the same pole on
// the curve (slide 4), sharing chartModel.ts and ChartControls.tsx — and the first half of the
// DEGREE-6 PAIR (slide 5), which holds full C¹ Hermite data and shows the answer set rather than one
// answer. That pair has its own state and strip (hermiteModel.ts, HermiteControls.tsx): it is a
// different family holding different data, and one store with a degree switch would make every handle
// in both conditional. Next: slide 6, the same configuration drawn as the curve, with strict/free.
// ============================================================================
import type { SlideDefinition } from '../framework/types'
import Math from '../framework/Math'
import { Tag, Cite, TagLegend } from '../framework/SlideTag'
import HermiteSphereFigure from './HermiteSphereFigure'
import PoleCurveFigure from './PoleCurveFigure'
import PoleSphereFigure from './PoleSphereFigure'

export const slides: SlideDefinition[] = [
  // ---------------------------------------------------------------------------
  // 1 — title
  // ---------------------------------------------------------------------------
  {
    type: 'title',
    content: (
      <>
        <h1>Inside the Chart</h1>
        <div className="subtitle">
          What the space of rational Pythagorean-hodograph curves feels like from within —
          and where it ends
        </div>
        <div className="author">Eric Demers</div>
        <div className="event">Polytechnique Montréal</div>
        <div className="event note" style={{ marginTop: '1.6em' }}>
          The figures are the argument. Every number on them is measured, and one of them
          used to be wrong.
        </div>
        <TagLegend />
      </>
    ),
    notes:
      'THIS IS A FIGURE DECK AND THE TITLE SLIDE SHOULD SET THAT EXPECTATION IMMEDIATELY. The '
      + 'companion, price-of-a-circle, is the theory: the ledger, the atlas, the proofs. This one '
      + 'asks what it is LIKE to be inside the space and move. Nothing here is proved; everything '
      + 'here is driven. '
      + 'THE TITLE IS THE OPERATING POSITION. You are never looking at this space from outside — you '
      + 'are always somewhere in it, with a dial and some sliders, and the interesting things happen '
      + 'when you push a handle until it stops responding. "Inside a chart, PH costs nothing" is the '
      + 'thesis, and the title states the condition under which the good thing is true. '
      + 'THE LINE ABOUT A WRONG NUMBER IS DELIBERATE and worth ten seconds if the room is technical. '
      + 'One headline figure in the companion deck claimed a factor of 510 in arc length across the '
      + 'family. Building the dial for THIS deck exposed a short-basis bug underneath it; the true '
      + 'figure is 1.03. The number had passed its own pinning test the whole time, because the test '
      + 'was faithfully measuring output from broken machinery. Saying that up front buys the rest of '
      + 'the deck its credibility.',
  },

  // ---------------------------------------------------------------------------
  // 2 — what a chart is, and why you are always in one
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['MEAS']} />
        <h2>You are always inside one</h2>
        <p>
          A rational PH curve is <Math>{'c = p/w'}</Math>, and the roots of{' '}
          <Math>{'w'}</Math> are its <strong>poles</strong> — the parameters where the curve runs to
          infinity. Fix where those poles are and the family you can reach becomes something you can
          put coordinates on. That is a <em>chart</em>, and everything in this deck happens in one.
        </p>

        <p style={{ marginBottom: '0.15em' }}>
          <strong>The coordinates, and there is no slack in the count.</strong>
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto 1fr',
            gap: '0.3em 1.3em',
            margin: '0.45em 0 0.5em 1.2em',
            fontSize: '0.82em',
            lineHeight: 1.45,
            alignItems: 'baseline',
          }}
        >
          <span><Math>{'m'}</Math></span>
          <span><strong>dials</strong></span>
          <span>
            one twist rate <Math>{'\\lambda_k'}</Math> per pole — a named handle, not a coordinate
            index
          </span>
          <span><Math>{'4(n+1) - 4m'}</Math></span>
          <span><strong>fibre</strong></span>
          <span>
            a linear subspace: hold the dials and the admissible spinors form a{' '}
            <em>vector space</em>
          </span>
          <span><Math>{'4(n+1) - 3m'}</Math></span>
          <span>together</span>
          <span>and that is the whole dimension of what a fixed pole placement can reach</span>
        </div>
        <p style={{ marginLeft: '1.2em' }}>
          For the curve this deck opens with — a rational PH <strong>quartic</strong>, spinor degree
          2, one pole — that is <Math>{'8'}</Math> fibre directions and <Math>{'1'}</Math> dial.
          Nine numbers. The next slide puts the <em>dial</em> on screen, because it is the one with a
          name and the one that runs out; the fibre gets the slide after that.
        </p>

        <p style={{ marginTop: '0.5em' }}>
          The reason to care is not bookkeeping. Inside a chart the Pythagorean condition{' '}
          <strong>is already satisfied</strong> — there is nothing to enforce and no residual to
          drift, so a member costs a nullspace and a linear combination and arrives in well under a
          millisecond. An optimiser working here carries only the objectives you actually wanted.
        </p>
        <p style={{ textAlign: 'center', margin: '0.6em 0' }}>
          <strong style={{ fontSize: '1.1em' }}>
            Inside a chart, PH costs nothing. That is the whole reason to want one.
          </strong>
        </p>
        <p style={{ opacity: 0.8 }}>
          Two questions follow, and the rest of the deck is those two questions. What do the handles
          actually <em>do</em> when you move them? And what happens when you push one until it stops?
        </p>
        <Cite>
          The dimension count is <Math>{'\\texttt{FOUNDATIONS F17}'}</Math> (fibre) and{' '}
          <Math>{'\\texttt{F19}'}</Math> (the variety, and that the chart read forward is a rational
          parametrisation). Timings and the scaling are measured in{' '}
          <Math>{'\\texttt{sp11ChartScales.test.ts}'}</Math>. The theory is{' '}
          <em>The Price of a Circle</em>; none of it is re-derived here.
        </Cite>
      </>
    ),
    notes:
      'THE JOB OF THIS SLIDE IS TO MAKE "CHART" CONCRETE IN UNDER A MINUTE, because the title leans '
      + 'on the word and the audience should own it before the first figure. Poles are where the '
      + 'curve reaches infinity; fix them and what you can reach has coordinates. That is all a chart '
      + 'is here. '
      + 'GIVE THE COUNT AS A COUNT, not as a formula to admire. m dials, 4(n+1) - 4m fibre '
      + 'directions, and for the quartic that opens the deck it is nine numbers total. Nine is a '
      + 'number a listener can hold, and the first figure lets them move all nine, so the count '
      + 'stops being abstract on the very next slide. '
      + 'DO NOT PROMISE ALL NINE HANDLES HERE. The next figure exposes the DIAL only, and '
      + 'deliberately: it is the coordinate with a name and the one that runs out, and eight fibre '
      + 'sliders beside it would bury the two readouts that carry the argument. The fibre gets its '
      + 'own figure, in strict mode, where the greying is the point. '
      + 'THE FIBRE BEING LINEAR IS THE PART THAT SURPRISES PEOPLE. Hold the dials and the admissible '
      + 'spinors form a VECTOR SPACE — you can add two of them. That is why the strict mode can grey '
      + 'out dependent control points honestly rather than by convention: the number of free ones is '
      + 'derived, not designed. '
      + 'THEN THE THESIS, and it is worth landing hard because it is the reason the whole line of '
      + 'work exists: inside a chart PH costs NOTHING. No constraint, no residual, sub-millisecond. '
      + 'An optimiser in here carries only what you asked for. Everything the companion deck says '
      + 'about atlases is downstream of this one sentence. '
      + 'CLOSE BY POSING THE TWO QUESTIONS the deck answers, so the figures arrive as answers rather '
      + 'than demonstrations: what do the handles DO, and what happens when one stops.',
  },

  // ---------------------------------------------------------------------------
  // 3 — the pole, seen on the sphere. First half of a pair; the second half is the
  //     SAME state (chartModel.ts), so the handles carry across.
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['THM', 'MEAS']} />
        <h2>Where the pole shows itself</h2>
        <PoleSphereFigure />
        <p style={{ marginTop: '0.5em' }}>
          A pole is where the curve runs to infinity — and on the curve you cannot see it, because it
          happens off the piece you drew. On the <strong>tangent indicatrix</strong> you cannot miss
          it. Since <Math>{'T = N/\\sigma'}</Math>, the denominator <Math>{'w'}</Math> cancels
          outright, so this spherical curve stays finite and smooth exactly where the space curve
          does not.
        </p>
        <p>
          Follow the two branches into the violet point. They arrive from opposite directions and
          stop dead — <Math>{'|T^{\\prime}(r)|'}</Math> reads machine zero. That is a{' '}
          <strong>cusp</strong>, and <em>moving the pole moves it</em>.
        </p>
        <p style={{ textAlign: 'center', margin: '0.6em 0' }}>
          <strong style={{ fontSize: '1.1em' }}>
            No pole without a corner. It is an <em>if and only if</em>.
          </strong>
        </p>
        <p>
          <Math>{'T^{\\prime} = (N^{\\prime}\\sigma - N\\sigma^{\\prime})/\\sigma^2'}</Math> vanishes
          exactly when <Math>{'\\{N, N^{\\prime}\\}'}</Math> are linearly dependent — which is the
          no-log condition, the thing the whole chart is built to satisfy. So the corner is not a
          feature of our seed. It is the pole, wearing its other face.
        </p>
        <p style={{ opacity: 0.8 }}>
          The <strong>twist</strong> dial is the chart&rsquo;s own coordinate:{' '}
          <Math>{'\\lambda = \\tan\\theta'}</Math>, so the <Math>{'\\sigma = 0'}</Math> stratum — the
          circle and the whole conformal family — sits at <Math>{'\\pm 90^{\\circ}'}</Math> rather
          than at infinity. Turn it all the way and the corner does <em>not</em> soften; at any
          finite angle the pole is a genuine pole, so the cusp is genuinely there.
        </p>
        <Cite>
          The <em>iff</em> is Kalkan, Scharler, Schr&ouml;cker &amp; &Scaron;&iacute;r (CAGD 2022),
          Rem. 4.7, in our chart. Measured here in{' '}
          <Math>{'\\texttt{tangentIndicatrix.test.ts}'}</Math> — a cusp at every pole, one per root,
          by cancellation rather than by vanishing. The dial&rsquo;s{' '}
          <Math>{'\\sigma(r) \\propto 1/\\lambda^2'}</Math> is{' '}
          <Math>{'\\texttt{stratumIsTheHorizon.test.ts}'}</Math>; that the slider has no dead
          positions is <Math>{'\\texttt{poleSliderHasNoHoles.test.ts}'}</Math>.
        </Cite>
      </>
    ),
    notes:
      'THIS SLIDE AND THE NEXT ARE ONE FIGURE IN TWO VIEWS, and it is worth saying so before you '
      + 'touch anything: the handles are the same handles and the state carries across, so whatever '
      + 'you set up here is what the next slide opens on. '
      + 'LEAD WITH THE ASYMMETRY. On the curve the pole is invisible -- it happens past the drawn '
      + 'piece. On the sphere it is the most obvious thing in the picture. That is because T = N/sigma '
      + 'has no w in it at all: the denominator cancels, which is the PH property seen on the sphere. '
      + 'THEN LET THEM MOVE THE POLE and watch the violet point travel. The claim to make is the '
      + 'strong one, because it is a theorem rather than an observation about our seed: there is no '
      + 'setting of any handle here that gives a pole without a corner. T-prime vanishes exactly when '
      + '{N, N-prime} are dependent, and that IS the no-log condition. Kalkan-Scharler-Schroecker-Sir '
      + 'Rem 4.7. '
      + 'THE TWIST DIAL IS SECONDARY HERE and can be left for questions. lambda = tan(theta) puts the '
      + 'sigma = 0 stratum -- the circle, the conformal family -- at the end of a finite slider rather '
      + 'than at infinity. Turning it does not soften the corner, and that is the right answer: at any '
      + 'finite angle the pole is genuine. '
      + 'IF ASKED WHY THE CORNER IS DRAWN AS TWO BRANCHES: an earlier version highlighted a fixed '
      + 'parameter window either side of the pole, and since the indicatrix speed near the pole grows '
      + 'as the dial turns, that window swept an ever-longer arc and the corner LOOKED like it was '
      + 'opening up and going away -- the opposite of what the slide says. Branches have no window to '
      + 'get wrong. Worth admitting if the room is technical; it is the same class of error as the '
      + 'retracted arc-length number on the title slide.',
  },

  // ---------------------------------------------------------------------------
  // 4 — the same pole, on the curve. Same state, same controls; what changes is
  //     which of the two objects is drawn and which gestures make sense.
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['MEAS']} />
        <h2>The same pole, on the curve</h2>
        <PoleCurveFigure />
        <p style={{ marginTop: '0.5em' }}>
          Same configuration, same handles — the sphere put away and the curve drawn instead. Only the
          piece you would actually edit is here, <Math>{'t \\in [0,1]'}</Math>, with the pole outside
          it. The link to the last slide is exact and worth stating even though nothing draws it:{' '}
          <Math>{'N(r) = -p(r)'}</Math>, so the corner on the sphere <strong>is</strong> the direction
          the curve escapes along out past <Math>{'t = 1'}</Math>.
        </p>
        <p>
          Push the pole toward the drawn interval. <em>Infinity to curve</em> closes, and the limit is
          a <strong>geometric event</strong> — not a solver giving up.
        </p>
        <p style={{ textAlign: 'center', margin: '0.6em 0' }}>
          <strong style={{ fontSize: '1.1em' }}>
            But the drawn piece barely notices. It <em>reshapes</em>.
          </strong>
        </p>
        <p>
          <Math>{'\\|c^{\\prime}(1)\\|'}</Math> ought to grow more than a thousandfold across that
          slider. It grows <strong>sixfold</strong>: the data is held, so the solve shrinks{' '}
          <Math>{'\\sigma(1)'}</Math> to compensate and the curve absorbs the pole&rsquo;s approach by
          changing shape. The blow-up is real and it lives past <Math>{'t = 1'}</Math>.
        </p>
        <p style={{ opacity: 0.8 }}>
          <strong>Strict</strong> holds the six data numbers: only the far endpoint is yours, the
          interior control points are outputs, and the three sliders are exactly what is left over —
          one dial, one pole, one fibre dimension that closes. <strong>Free</strong> makes every
          control point a handle, one at a time, with the ends holding each other. Nothing in either
          mode enforces the Pythagorean condition, because inside the chart there is nothing to
          enforce.
        </p>
        <Cite>
          <Math>{'N(r) = -p(r)'}</Math>, and that the two branches leave the cusp antiparallel, are
          measured in <Math>{'\\texttt{tangentIndicatrix.test.ts}'}</Math>. The slider having no dead
          positions, the sixfold figure, and every member on it being exactly PH with the data still
          held are <Math>{'\\texttt{poleSliderHasNoHoles.test.ts}'}</Math>.
        </Cite>
      </>
    ),
    notes:
      'OPEN BY POINTING AT THE VIOLET RAY and saying it is the same vector as the last slide. Not '
      + 'analogous, not corresponding -- the same one, because N(r) = -p(r) exactly. The sphere said '
      + '"here is a direction"; this says "here is what escapes along it". '
      + 'THEN THE POLE SLIDER, which is the shared handle and the reason the two slides are a pair. '
      + 'Walk it in and the run-out reaches further and further; infinity-to-curve is the number '
      + 'saying how close it has come. Stress that this is geometry: nothing is failing, the curve '
      + 'genuinely passes through infinity there. '
      + 'THE MEASURED SURPRISE IS THE THIRD PARAGRAPH and it corrects the obvious caption. Everyone '
      + 'expects the speed at the end to explode as the pole arrives -- sigma(1)/(1-r)^2, a factor of '
      + 'about 1340 across this slider. It is 6.6, because the DATA IS HELD and the solve shrinks '
      + 'sigma(1) to compensate. The curve reshapes rather than blowing up. That is worth dwelling on '
      + 'because it is exactly what an editor wants: the constraint absorbs the motion. '
      + 'THE TWO MODES ARE THE DECK GRAMMAR. Strict = the honest coordinates, derived points grey, '
      + 'sliders for what is left. Free = drag anything, ends held. Say the punchline once: neither '
      + 'mode enforces PH, because inside a chart there is nothing to enforce. '
      + 'IF YOU HAVE TIME, go back one slide and forward again with a different pole set -- the state '
      + 'persists, and seeing the sphere and the curve agree twice is what makes the pairing land.',
  },

  // ---------------------------------------------------------------------------
  // 5 — degree 6, one pole, full C¹ Hermite. The first rational family in which
  //     the classical interpolation problem is posable at all, and the sphere
  //     shows its answer set with both ends of the arc pinned.
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['MEAS']} />
        <h2>Nine numbers held, two left over</h2>
        <HermiteSphereFigure />
        <p style={{ marginTop: '0.5em' }}>
          The last pair held six numbers — <Math>{'c^{\\prime}(0)'}</Math> and{' '}
          <Math>{'c(1)'}</Math>. The classical Hermite problem asks for more: <em>both</em> end
          tangents and the displacement between the ends. Nine. Degree 4 cannot answer it — its fibre
          is eight-dimensional and the map to those nine numbers has <strong>rank seven</strong>, so
          two of them are simply unreachable.
        </p>
        <p>
          <strong>Degree 6 with one pole is the first rational family where the question can be
          asked.</strong> Fibre twelve, the map full rank nine, and what is left over is
        </p>
        <p style={{ textAlign: 'center', margin: '0.4em 0' }}>
          <Math>{'12 - 9 - 1 = 2'}</Math>
        </p>
        <p>
          — the same two dimensions the polynomial PH quintic has, plus two roads the polynomial case
          does not have: the twist <Math>{'\\lambda'}</Math> at the pole, and where the pole sits.
        </p>
        <p style={{ opacity: 0.8 }}>
          The two leftover dimensions are both circles, and we can drive one of them. Pinning{' '}
          <Math>{'\\mathcal{A}(0)'}</Math> exactly spends the Hopf gauge; the phase of{' '}
          <Math>{'\\mathcal{A}(1)'}</Math> against it is then a coordinate that returns at{' '}
          <Math>{'2\\pi'}</Math> <em>by construction</em>. The other closes too — after 2180 steps —
          so the slider drives a stretch of it rather than the whole turn.
        </p>
        <Cite>
          The rank, the two circles and the 2180-step closure are{' '}
          <Math>{'\\texttt{degree6TwoCircles.test.ts}'}</Math>; that all four handles track is{' '}
          <Math>{'\\texttt{degree6HandlesTrack.test.ts}'}</Math>. That the walk finding them is
          trustworthy at all rests on a control it can fail —{' '}
          <Math>{'\\texttt{fiberClosure.test.ts}'}</Math>.
        </Cite>
      </>
    ),
    notes:
      'THE POINT OF THE FAN IS THE CONVERGENCE AT THE TWO ENDS. Say it before anything else: every '
      + 'pale arc is a different rational PH sextic, all of them through the same C1 Hermite data, and '
      + 'they all leave the sphere at the same two points. That is what "the data is held" looks like. '
      + 'WHY DEGREE 6 AND NOT DEGREE 4. Degree 4 cannot interpolate C1 Hermite data at all -- rank 7 of '
      + '9, two numbers unreachable. This is not a preference for a bigger example; it is the first one '
      + 'that exists. Worth saying because the previous pair held six numbers and someone will ask why '
      + 'the convention changed. '
      + 'THE TWO FIBRE SLIDERS ARE DIFFERENT KINDS OF HANDLE and it is worth being straight about it. '
      + 'psi is a genuine circle: it turns A(1) on its Hopf fibre and comes home at 360 degrees to '
      + '2.4e-16 -- by construction, not by luck, because the target at 2pi IS the target at 0. The '
      + 'other coordinate closes too but its loop is 2180 steps, about two minutes to walk, so the '
      + 'slider drives a bounded road along it. '
      + 'IF ASKED WHETHER IT IS A TORUS: what is measured is that psi closes and that the fibre of psi '
      + 'closes -- a circle bundle over a circle. That is a torus or a Klein bottle; orientability was '
      + 'not measured, so do not say torus. On the polynomial quintic the same structure IS the '
      + 'classical torus. '
      + 'ONE WRONG ALARM WORTH TELLING IF THE ROOM IS TECHNICAL: the first walk we tried looked like it '
      + 'escaped a compact fibre -- |A| grew sixfold. It had not. The monomial spinor norm is a bad '
      + 'proxy; the Bernstein coefficients barely moved and every invariant held to 1e-14. The control '
      + 'that caught it was running the same walk on the polynomial quintic, where the answer is known.',
  },
]

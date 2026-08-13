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
// STATUS: title, slide 1, and the first figure (the horizon dial) built.
// ============================================================================
import type { SlideDefinition } from '../framework/types'
import Math from '../framework/Math'
import { Tag, Cite, TagLegend } from '../framework/SlideTag'
import HorizonDialFigure from './HorizonDialFigure'

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
          name and the one that runs out; the fibre gets its own figure later.
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
  // 3 — the first figure: turn the dial until the chart runs out
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['MEAS']} />
        <h2>Turn it until it stops</h2>
        <HorizonDialFigure />
        <p style={{ marginTop: '0.5em' }}>
          One pole, one dial, a rational PH quartic — the nine coordinates of the previous slide,
          with the dial on screen. The data is <em>held</em>: the ends never move, so everything you
          see is motion inside a single fibre.
        </p>
        <p>
          Push θ toward <Math>{'\\pm 90^{\\circ}'}</Math> and the chart&rsquo;s own coordinate{' '}
          <Math>{'\\sigma(r)'}</Math> runs out — five orders of magnitude, smoothly, because{' '}
          <Math>{'\\sigma(r) \\propto 1/\\lambda^2'}</Math> and{' '}
          <Math>{'\\lambda = \\tan\\theta'}</Math>. That endpoint is the{' '}
          <Math>{'\\sigma = 0'}</Math> stratum: the circle, and the whole conformal family. So the
          dial is a walk toward the part of the space this chart cannot hold.
        </p>
        <p style={{ textAlign: 'center', margin: '0.6em 0' }}>
          <strong style={{ fontSize: '1.1em' }}>
            The coordinate collapses. The cusp does not.
          </strong>
        </p>
        <p>
          <Math>{'|T^{\\prime}(r)|'}</Math> sits at machine zero the whole way, and the speed just
          off the pole <em>grows sevenfold</em>. Which is right: at any finite{' '}
          <Math>{'\\theta'}</Math> the pole is a real pole, so the curve does reach infinity and the
          corner is real. It goes only <em>at</em> <Math>{'\\sigma(r) = 0'}</Math> — an angle the
          chart does not contain.
        </p>
        <p style={{ opacity: 0.8 }}>
          So the edge is not soft. You can approach it in the coordinate and never arrive in the
          geometry, which is why the other family needs a chart of its own rather than more of this
          one.
        </p>
        <Cite>
          <Math>{'\\sigma(r) \\propto 1/\\lambda^2'}</Math>, the angle substitution, and the cusp
          persisting are measured in{' '}
          <Math>{'\\texttt{stratumIsTheHorizon.test.ts}'}</Math>. That the stratum is smooth — these
          are ordinary points of the variety, not a singularity — is{' '}
          <Math>{'\\texttt{sp11VarietyRank.test.ts}'}</Math>.
        </Cite>
      </>
    ),
    notes:
      'LET THEM TURN IT BEFORE YOU EXPLAIN IT. The two readouts move in opposite directions and that '
      + 'contrast is the entire slide; a viewer who has watched it happen needs one sentence, and a '
      + 'viewer told first needs three. '
      + 'THE DIAL IS AN ANGLE FOR A MEASURED REASON, worth saying if anyone asks why not lambda. '
      + 'sigma(r) falls off as 1/lambda^2, so a linear lambda slider can never arrive and spends '
      + 'nearly all its travel doing nothing. lambda = tan(theta) puts the stratum at the end of a '
      + 'finite slider. '
      + 'THE EXPECTATION THIS FIGURE BROKE is worth ten seconds because it is the honest version. It '
      + 'was built to show the cusp FADING as the pole stopped being a pole. It does not fade -- it '
      + 'sharpens. At any finite theta the pole is genuinely a pole, so the cusp is genuinely there; '
      + 'it goes only AT sigma = 0, which is not an angle the chart contains. '
      + 'AND THAT IS WHY THERE ARE TWO CHART TYPES rather than one with a soft edge. The coordinate '
      + 'is continuous to the boundary; the geometry is not. If someone asks whether you could just '
      + 'extend the chart -- no, and this figure is the reason. '
      + 'IF ASKED WHETHER THE STRATUM IS A SINGULARITY: no. Those are ordinary smooth points of the '
      + 'variety, full Jacobian rank. It is the CHART that fails there, not the space.',
  },
]

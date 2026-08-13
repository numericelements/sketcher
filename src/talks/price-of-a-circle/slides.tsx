// ============================================================================
// THE PRICE OF A CIRCLE — what rationality buys in PH curves, and what it charges.
//
// THE THESIS, and it took a correction to state honestly. The tempting opening is "rational PH
// curves can be circles and polynomial ones cannot" — true, but NOT a fact about PH. No polynomial
// CURVE of any kind is a circle; the restriction is polynomiality, and PH is innocent. The honest
// version is sharper:
//
//     Polynomial PH gives the PH property on a family that is unbounded and open.
//     Rational PH gives the SAME property on the shapes rational curves can make —
//     circles, conics, bounded and closed curves — and charges a solvability condition
//     plus the loss of compactness for it.
//
// So this deck is a LEDGER. Not "rational is better", not "rational is harder" — priced.
//
// WHY IT IS A SEPARATE DECK from two-points-or-a-circle. That deck's axis is PLANE versus SPACE and
// its thesis is the invisible degree of freedom. This one's axis is POLYNOMIAL versus RATIONAL and
// its thesis is a trade. Same objects, different question — and the two acts of the older deck are
// this one's background, not its content. Where a derivation is needed it is CITED there rather
// than repeated.
//
// AUDIENCE: someone who already knows what a PH curve is. One recap slide, then straight in.
//
// THE ARC (built through 13; 14-16 planned; two END slides built ahead of them, see below):
//
//   1  title, with the tag legend
//   2  a circle is not a polynomial -- the shape, and whose fault it is        [THM]
//   3  what polynomial PH gives you for free: every spinor works               [LIT]
//   4  and the fiber is a torus -- compact, sweepable, length cannot choose     [LIT] [MEAS]
//   5  weights are the missing ingredient, and weights mean POLES              [LIT]
//   6  integration stops being a map and becomes an equation                    [LIT]
//   7  where the condition comes from -- one pole in a line, then the general  [LIT]
//   8  THE CIRCLE, INTEGRATED -- the whole apparatus by hand, and an arctangent [THM]
//   9  FROM THE HODOGRAPH TO THE SPINOR -- the requirement on what you choose  [LIT]
//  10  a real pole, and a dial -- the circle's opposite, lambda made visible    [THM] [MEAS]
//  11  and most spinors fail it -- the condition, and genericity                [LIT]
//  12  THE FAMILY IS COMPLETELY KNOWN -- and ours is a chart on it, declared    [LIT]
//  13  what the poles hand back: a degree and a dial each (F16, F17)            [MEAS]
//  14  torus x roads -- and the roads end at cusps and pole collisions          [MEAS]
//  15  arc length: when it survives and when it does not, from the two examples [LIT] [MEAS]
//  16  the ledger, both columns                                                 --
//  17  what is open, and where to go next                                       [OPEN]
//  18  TWO WAYS IN -- the strategy: more charts from inside, optimisation from  [LIT] [OPEN]
//      outside, and why they are complementary rather than one being a fallback
//  19  THE FIRST MOVE, MADE -- complex poles: bounded curves in closed form,    [MEAS]
//      and the circle still outside, on sigma(r) = 0
//
// 18 and 19 are BUILT and sit at the end of the array, out of order. They were written when the
// strategy question came up; 14-16 slot in ahead of them.
//
// ⚠ THE FAILURE MODE THIS DECK IS MOST PRONE TO, named after it happened twice on 2026-08-12.
// These slides are written in conversation, and the conversation carries context the DECK DOES NOT.
// Twice already a slide used a referent that exists only in the discussion:
//   · sigma silently changed from "the speed" to "the speed's numerator" between two slides, invisible
//     because w = 1 makes them the same object in the polynomial case;
//   · a slide was titled "Where the condition comes from" when no CONDITION had ever been named on a
//     slide -- it had been mentioned once, in a subordinate clause, and never as an object.
// THE TEST, applied before any slide is called done: read it with NO memory of the discussion. Every
// "the X" must have been introduced as an X on an earlier slide, and every sentence must have a
// stated origin. A slide that only parses for someone who was in the room is not finished.
//
// STANDING RULE, inherited and worth repeating: every borrowed statement carries a Cite, and a
// novelty claim is not made until the bibliography of whatever we are already citing has been
// checked. That rule was written after three separate finds in one day turned out to have owners.
// ============================================================================
import type { SlideDefinition } from '../framework/types'
import Math from '../framework/Math'
import { Tag, Cite, TagLegend } from '../framework/SlideTag'

export const slides: SlideDefinition[] = [
  // ---------------------------------------------------------------------------
  // 1 — title
  // ---------------------------------------------------------------------------
  {
    type: 'title',
    content: (
      <>
        <h1>The Price of a Circle</h1>
        <div className="subtitle">
          What rationality buys in Pythagorean-hodograph curves, and what it charges
        </div>
        <div className="author">Eric Demers</div>
        <div className="event">Polytechnique Montréal</div>
        <div className="event note" style={{ marginTop: '1.6em' }}>
          A ledger, not an argument. Every claim carries its status.
        </div>
        <TagLegend />
      </>
    ),
    notes:
      'THIS DECK IS A LEDGER AND THE TITLE SLIDE SHOULD SAY SO. Not "rational is better", not '
      + '"rational is harder" -- PRICED, with both columns visible at the end. A room that expects an '
      + 'advocacy talk will misread every slide until told otherwise, so say it in the first ten '
      + 'seconds. '
      + 'THE COMPANION DECK IS two-points-or-a-circle, and the relationship is worth one sentence if '
      + 'anyone asks: that one is PLANE versus SPACE and ends on the invisible degree of freedom; '
      + 'this one is POLYNOMIAL versus RATIONAL and ends on a trade. Its two acts are this deck-s '
      + 'background. Derivations live there and are cited, not repeated. '
      + 'THE TAG LEGEND IS NOW SHARED CODE (framework/SlideTag). Same convention, same colours, so a '
      + 'reader who has seen one deck reads the other without relearning it.',
  },

  // ---------------------------------------------------------------------------
  // 2 — the shape you cannot make, and whose fault it is
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="THM" />
        <h2>A circle is not a polynomial</h2>
        <p>
          Start with the shape, because it is the whole motive. Take the unit circle in its standard
          rational form:
        </p>
        <Math display>
          {"\\mathbf{c}(t) \\;=\\; \\Bigl(\\tfrac{1-t^2}{1+t^2},\\; \\tfrac{2t}{1+t^2}\\Bigr)"}
        </Math>
        <p>Differentiate and take the norm — three lines, and worth doing on the board:</p>
        <Math display>
          {"\\mathbf{c}'(t) \\;=\\; \\frac{1}{(1+t^2)^2}\\bigl(-4t,\\; 2-2t^2\\bigr), \\qquad \\|\\mathbf{c}'\\|^2 = \\frac{4(1+t^2)^2}{(1+t^2)^4}"}
        </Math>
        <Math display>{"\\|\\mathbf{c}'(t)\\| \\;=\\; \\frac{2}{1+t^2} \\qquad \\text{— rational.}"}</Math>
        <p style={{ marginTop: '0.6em' }}>
          <strong>So the circle is a Pythagorean-hodograph curve.</strong> Its speed is a rational
          function, exactly the defining property. Nothing about PH excludes it.
        </p>
        <p>
          But no <em>polynomial</em> curve is a circle, and the reason is not deep: a non-constant
          polynomial is unbounded, so <Math>{"\\|\\mathbf{c}(t)\\| \\to \\infty"}</Math>. A circle is
          bounded. That is the entire obstruction — and it applies to <em>every</em> polynomial curve,
          Pythagorean or not.
        </p>
        <p style={{ textAlign: 'center', margin: '0.8em 0' }}>
          <strong style={{ fontSize: '1.15em' }}>
            The restriction is <em>polynomiality</em>. PH is innocent.
          </strong>
        </p>
        <p>
          Which sets the question this deck answers. The property you want and the shape you want are{' '}
          <em>compatible</em> — the circle proves it. They are merely both incompatible with being a
          polynomial. So:
        </p>
        <p style={{ textAlign: 'center' }}>
          <strong>What does it cost to have the PH property on the rational shapes?</strong>
        </p>
        <p style={{ opacity: 0.65 }}>
          Everything bounded goes the same way: ellipses, conic arcs, any closed curve. And with it
          goes the reason one wants PH in the first place — exact offsets and exact arc length on the
          shapes CAD actually uses.
        </p>
        <Cite>
          The rational parametrisation of the circle is classical (the Weierstrass or half-angle
          substitution). The speed computation here is three lines and is done on the slide rather
          than cited, so nobody has to take it on trust.
        </Cite>
      </>
    ),
    notes:
      'DO THE THREE LINES. This slide asks the room to accept a claim that sounds like it should be '
      + 'false -- a circle is a PH curve -- and the derivation is short enough to remove all doubt in '
      + 'twenty seconds. Differentiate the standard rational circle, square, and watch (1+t^2)^2 '
      + 'cancel out of the numerator. The speed is 2 over (1 + t squared). '
      + 'THE CORRECTION THAT SHAPED THIS SLIDE, and it is worth having ready because the wrong '
      + 'version is very tempting: "rational PH curves can be circles, polynomial ones cannot" is '
      + 'TRUE but it is not a fact about PH. No polynomial curve of ANY kind is a circle. Saying it '
      + 'the loose way invites a listener to conclude that PH is the restrictive thing, which is '
      + 'exactly backwards and poisons the rest of the deck. Put the blame where it belongs: '
      + 'POLYNOMIALITY. '
      + 'WHY THIS IS THE OPENING AND NOT THE COUNTING. The counting arguments -- degrees of freedom, '
      + 'poles, conditions -- are the body of the deck, but they answer a question nobody has asked '
      + 'yet. A shape you cannot make is a motive; a dimension count is not. Show the thing that is '
      + 'missing first. '
      + 'THM is the honest tag: unbounded-ness of non-constant polynomials is a proof, and the circle '
      + 'computation is done on screen. Nothing here is borrowed except the parametrisation itself.',
  },

  // ---------------------------------------------------------------------------
  // 3 — what the polynomial world hands you, and hands you for nothing
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="LIT" />
        <h2>Every spinor works</h2>
        <p>
          Written as a condition, PH looks forbidding — four polynomials tied by an identity, the kind
          of thing that usually has almost no solutions:
        </p>
        <Math display>
          {"x'^2 + y'^2 + z'^2 \\;=\\; \\sigma^2, \\qquad x',\\,y',\\,z',\\,\\sigma \\in \\mathbb{R}[t]"}
        </Math>
        <p>
          The spinor turns it into a <em>substitution</em>. Take <strong>any</strong> quaternion
          polynomial at all — no conditions, nothing to check:
        </p>
        <Math display>
          {"\\mathbf{c}' \\;=\\; \\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}, \\qquad \\sigma \\;=\\; |\\mathcal{A}|^2"}
        </Math>
        <p style={{ opacity: 0.75 }}>
          One word about <Math>{'\\sigma'}</Math>, because it changes meaning later and the change is
          easy to miss: here it is the <em>speed itself</em>, since there is no denominator yet. Once
          there is one it becomes the speed&rsquo;s <strong>numerator</strong>. Same symbol, and in the
          polynomial world nothing distinguishes them.
        </p>
        <p>and the identity holds by construction, because the quaternion norm is multiplicative:</p>
        <Math display>
          {"\\bigl\\|\\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}\\bigr\\| \\;=\\; |\\mathcal{A}|\\,|\\mathbf{i}|\\,|\\mathcal{A}^{*}| \\;=\\; |\\mathcal{A}|^2"}
        </Math>
        <p>
          Nothing was imposed. No system to solve, no residual to measure, no seed to hunt for. And the
          map goes <strong>onto</strong>: every spatial PH curve arises this way. Then integrate, term
          by term —
        </p>
        <Math display>
          {"\\mathbf{c}(t) \\;=\\; \\int \\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}\\,dt"}
        </Math>
        <p>— which also cannot fail. One constant of integration: the point you start from.</p>
        <p style={{ textAlign: 'center', margin: '0.8em 0' }}>
          <strong style={{ fontSize: '1.15em' }}>PH is a substitution, not a constraint.</strong>
        </p>
        <p>
          The degrees follow for free —{' '}
          <Math>{"\\deg \\mathcal{A} = n \\;\\Longrightarrow\\; \\deg \\mathbf{c}' = 2n \\;\\Longrightarrow\\; \\deg \\mathbf{c} = 2n+1"}</Math>
          {' '}— which is why the classical PH degrees are odd: 3, 5, 7.
        </p>
        <p style={{ opacity: 0.65 }}>
          Two caveats carried, not hidden. <Math>{'\\mathcal{A}'}</Math> is not unique:{' '}
          <Math>{'\\mathcal{A}'}</Math> and <Math>{'\\mathcal{A}e^{i\\theta}'}</Math> give the same curve,
          and that circle is the subject of the companion deck. And the <em>general</em> polynomial
          hodograph carries a real factor,{' '}
          <Math>{"h\\cdot\\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}"}</Math> — the bare sandwich is the{' '}
          <strong>primitive</strong> case.
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.5em' }}>
          <strong>
            Hold on to &ldquo;nothing to check&rdquo;. It is the one thing rationality takes away.
          </strong>
        </p>
        <Cite>
          Quaternion and Hopf-map representations: Farouki &amp; Sakkalis (1994); Choi, Lee &amp; Moon
          (2002). That the form is <em>forced</em> rather than lucky — the spin cover parametrising a
          cone — is Choi, Han, Lee, Roh &amp; Wee (2002). The real factor <Math>{'h'}</Math> is
          Kubota (1972).
        </Cite>
      </>
    ),
    notes:
      'THE RHETORICAL JOB IS TO MAKE "UNCONDITIONAL" FEEL REMARKABLE, because a room that has always '
      + 'had it will not notice it. Frame it against the rest of geometric design: "give me a curve '
      + 'with property X" is normally a constrained problem with a solver and a residual. This '
      + 'repository puts it in one line -- everywhere else a PH curve is FOUND BY A SOLVER and its '
      + 'residual is a measurement; in the polynomial world it is a SUBSTITUTION. Say that sentence. '
      + 'DO THE MULTIPLICATIVITY LINE, it takes ten seconds and it is WHY nothing is imposed: the '
      + 'quaternion norm is multiplicative, so the norm of the sandwich is |A| times |i| times |A|, '
      + 'which is |A| squared, a polynomial. The Pythagorean identity is not SATISFIED here, it is '
      + 'MANUFACTURED. '
      + 'ONTO MATTERS AS MUCH AS EASY. It would be a far weaker slide if the construction merely '
      + 'produced SOME PH curves. It produces all of them (primitively), so nothing is traded away '
      + 'for the convenience -- which is precisely the trade the rest of the deck prices, and here '
      + 'there is none to price. '
      + 'PLANT THE LAST LINE HARD AND DO NOT ELABORATE IT. "Nothing to check" is what slide 6 removes, '
      + 'and the removal only lands if the room was told to hold on to it. One sentence, then move on. '
      + 'SIGMA CHANGES MEANING LATER AND THE SLIDE NOW SAYS SO. Here sigma IS the speed; from '
      + 'slide 7 on it is the speed-s NUMERATOR, the speed being sigma over w-squared. In the '
      + 'polynomial world w = 1, so the two are the same object and nothing distinguishes '
      + 'them -- which is exactly why a reader sails past the change and is then confused. '
      + 'Measured on a real reader 2026-08-12, who asked outright. The code settles which '
      + 'convention wins: rationalPHOnePoleSpatial documents sigma as "the speed numerator". '
      + 'DO NOT EXPLAIN THE GAUGE HERE. A and A e^{i theta} giving the same curve is a whole act of '
      + 'the companion deck; a faded line is enough, and opening it here derails the trade this deck '
      + 'is pricing. Same for Kubota-s h: carried, not developed. '
      + 'LIT throughout -- none of this slide is ours.',
  },

  // ---------------------------------------------------------------------------
  // 4 — the second gift: the answer set has a shape, and it is compact
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['LIT', 'MEAS']} />
        <h2>And the answer set is a torus</h2>
        <p>
          Interpolation in this world has a shape, and it is the same shape every time. Everything
          reduces to one equation — solve the <strong>sandwich</strong> for <Math>{'X'}</Math>:
        </p>
        <Math display>
          {"X\\,\\mathbf{i}\\,X^{*} = \\mathbf{v} \\qquad\\Longrightarrow\\qquad X = \\sqrt{|\\mathbf{v}|}\\;\\, n\\, e^{\\varphi \\mathbf{i}}"}
        </Math>
        <p>
          One solution from a half-way construction, and all the rest by a <em>free angle</em>. And
          note what is <em>forced</em>: <Math>{'|X|^2 = |\\mathbf{v}|'}</Math>. The sandwich pins the
          norm — remember that, it does all the work below.
        </p>
        <p>
          A Hermite problem is a <strong>chain</strong> of these: the end tangents, then closure. Each
          link contributes an angle, only their differences matter, and one global gauge divides out:
        </p>
        <Math display>
          {"\\bigl(S^1\\bigr)^{k+1} \\big/ S^1_{\\text{diag}} \\;=\\; T^{k}"}
        </Math>
        <p>
          Spatial cubic — 2 links — a <strong>circle</strong>. Spatial quintic — 3 links — a{' '}
          <strong>torus</strong>.
        </p>
        <p style={{ textAlign: 'center', margin: '0.7em 0' }}>
          <strong style={{ fontSize: '1.12em' }}>
            Compact. Closed in every direction. You can sweep it and come back, and see all of it at
            once.
          </strong>
        </p>
        <p>
          Now the cost of that, and it follows from the one forced line above. Because{' '}
          <Math>{'|X|^2 = |\\mathbf{v}|'}</Math> holds at every link, <strong>length barely sees the
          family</strong>:
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto auto',
            gap: '0.3em 1.5em',
            justifyContent: 'center',
            margin: '0.6em 0',
            fontSize: '0.78em',
            lineHeight: 1.5,
            alignItems: 'baseline',
          }}
        >
          <span style={{ opacity: 0.6 }} />
          <span style={{ opacity: 0.6 }}>the fiber</span>
          <span style={{ opacity: 0.6 }}>arc length</span>
          <span>spatial cubic</span>
          <span>a circle</span>
          <span>
            <strong>constant</strong> on all of it
          </span>
          <span>spatial quintic</span>
          <span>a torus</span>
          <span>
            depends on <Math>{'\\beta'}</Math> <strong>alone</strong> — blind along{' '}
            <Math>{'\\alpha'}</Math>
          </span>
        </div>
        <p>
          The mechanism is one line: <Math>{'e^{\\theta\\mathbf{i}}'}</Math> commutes with{' '}
          <Math>{'\\mathbf{i}'}</Math>, so <Math>{'\\alpha'}</Math> cancels out of the closure vector
          entirely.
        </p>
        <p style={{ textAlign: 'center' }}>
          <strong>You cannot pick a member by asking for the shortest.</strong>
        </p>
        <p>
          Which is a genuine problem — and a <em>comfortable</em> one. Choosing inside a compact set is
          a solved kind of difficulty: enumerate it, sample it, optimise over it, and know you have
          seen everything there is.
        </p>
        <p style={{ opacity: 0.65 }}>
          Measured: on a traced cubic fiber the sandwich identity holds to{' '}
          <Math>{'3.3\\times10^{-16}'}</Math> and <Math>{'|Z|^2'}</Math> is constant at the value the
          data predicts, to every printed digit.
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.4em' }}>
          <strong>
            Hold on to <em>compact</em> as well. Unlike &ldquo;nothing to check&rdquo;, this one does
            not vanish when we go rational — it survives, in a smaller form.
          </strong>
        </p>
        <Cite>
          The chain reading and every formula here: Farouki, Giannelli, Manni &amp; Sestini,{' '}
          <em>Identification of spatial PH quintic Hermite interpolants with near-optimal shape
          measures</em>, CAGD <strong>25</strong> (2008) 274–297 — Prop. 1, eq. (49), and the abstract
          for arc length depending on one parameter. Worked out in{' '}
          <Math>{'\\texttt{docs/PH\\_SANDWICH\\_CHAIN.md}'}</Math>, pinned in{' '}
          <Math>{'\\texttt{phSandwichChain.test.ts}'}</Math>.
        </Cite>
      </>
    ),
    notes:
      'THE WHOLE SLIDE HANGS ON ONE FORCED LINE, so do not let it slide past: |X|^2 = |v|. The '
      + 'sandwich fixes the NORM, at every link, from the data alone. Every "arc length is constant" '
      + 'result in this subject is that line and nothing more -- FGMS08 say as much, and the doc says '
      + 'it in those words. If the room takes one thing, take that. '
      + 'COMPACT IS THE WORD TO DELIVER SLOWLY. The angles are periodic, so the family closes in '
      + 'every direction. That is what makes the polynomial selection problem comfortable: you can '
      + 'enumerate a compact set and know you have seen everything. A room that has only ever worked '
      + 'here will not realise this is a privilege. '
      + 'BE PRECISE ABOUT THE TWO ROWS, they are not the same claim. On the CUBIC circle the arc '
      + 'length is constant outright -- no two members differ in length. On the QUINTIC torus it '
      + 'depends on beta ALONE, so it is blind along alpha but not along beta. Saying "constant on '
      + 'the fiber" for the quintic would be wrong, and somebody who knows FGMS08 will catch it: '
      + 'their L(beta) has four stationary points, which are the four helical interpolants. '
      + 'THE alpha CANCELLATION IS WORTH SHOWING IF ASKED: exp(theta u) commutes with u, so in '
      + 'A_0 u A_2-star the two exponentials combine into exp(-beta u) and alpha disappears. Hence d '
      + 'depends only on beta, hence |d|, hence L. One line, and it explains both rows at once. '
      + 'THE CLOSING LINE IS DELIBERATELY DIFFERENT FROM SLIDE 3-s. That one planted something that '
      + 'gets DESTROYED (nothing to check). This one plants something that SURVIVES -- the loop '
      + 'closes in the rational family too, and arc length is constant along it, measured. If both '
      + 'slides ended "hold on to this", the room would expect both to be taken away and the later '
      + 'payoff would be muddied. Say the difference out loud.',
  },

  // ---------------------------------------------------------------------------
  // 5 — the hinge: what a circle actually costs, in the currency of poles
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['LIT', 'MEAS']} />
        <h2>Weights are poles</h2>
        <p>
          A circle needs a denominator. And in Bézier form the denominator is not some extra object
          bolted on — it <em>is</em> the weights:
        </p>
        <Math display>
          {"\\mathbf{c}(t) \\;=\\; \\frac{\\sum_i w_i \\mathbf{P}_i B_i(t)}{\\sum_i w_i B_i(t)}, \\qquad w(t) := \\sum_i w_i B_i(t)"}
        </Math>
        <p>
          All weights equal makes <Math>{'w'}</Math> constant, and the curve polynomial. Unequal
          weights make <Math>{'w'}</Math> non-constant — and a non-constant polynomial{' '}
          <strong>has roots</strong>. Each root is a place the curve passes through infinity.
        </p>
        <p style={{ textAlign: 'center', margin: '0.7em 0' }}>
          <strong style={{ fontSize: '1.12em' }}>
            The weight function and the pole set are one object, described twice.
          </strong>
        </p>
        <p>So the freedom is bought at a fixed exchange rate:</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto auto',
            gap: '0.3em 1.6em',
            justifyContent: 'center',
            margin: '0.6em 0',
            fontSize: '0.78em',
            lineHeight: 1.5,
            alignItems: 'baseline',
          }}
        >
          <span style={{ opacity: 0.6 }}>denominator</span>
          <span style={{ opacity: 0.6 }}>what the weights can do</span>
          <span style={{ opacity: 0.6 }}>poles</span>
          <span>
            <Math>{'\\deg w = 0'}</Math>
          </span>
          <span>all equal — no freedom at all</span>
          <span>none — polynomial</span>
          <span>
            <Math>{'\\deg w = 1'}</Math>
          </span>
          <span>
            an <strong>arithmetic progression</strong> — 2 parameters
          </span>
          <span>1</span>
          <span>
            <Math>{'\\deg w = 2'}</Math>
          </span>
          <span>values of a quadratic — 3 parameters</span>
          <span>2</span>
        </div>
        <p style={{ opacity: 0.65 }}>
          The middle row is measured, and it surprises people: degree-elevating a <em>linear</em>{' '}
          <Math>{'w'}</Math> to the curve degree just interpolates its two ends, so five weights carry
          two parameters and nothing more.
        </p>
        <p>And the circle prices itself. Its denominator is</p>
        <Math display>{"w(t) \\;=\\; 1 + t^2, \\qquad \\text{roots } t = \\pm i"}</Math>
        <p style={{ textAlign: 'center', margin: '0.6em 0' }}>
          <strong style={{ fontSize: '1.12em' }}>
            A circle costs two poles — and they are <em>complex</em>.
          </strong>
        </p>
        <p>
          Which is exactly why it is bounded. On <Math>{'\\mathbb{R}P^1'}</Math> the poles of{' '}
          <Math>{'\\mathbf{c} = \\mathbf{p}/w'}</Math> are the roots of <Math>{'w'}</Math>,{' '}
          <em>plus</em> <Math>{'t = \\infty'}</Math> whenever{' '}
          <Math>{'\\deg \\mathbf{p} > \\deg w'}</Math>. A curve stays bounded on the real line precisely
          when <strong>none of its poles is real</strong> — and the circle&rsquo;s two sit off the
          axis, so it never runs anywhere.
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.5em' }}>
          <strong>
            So you cannot ask for the circle and decline the poles. The poles <em>are</em> the
            purchase.
          </strong>
        </p>
        <Cite>
          The rational Bézier form and its weights are standard. The arithmetic-progression row is
          measured here and pinned in{' '}
          <Math>{'\\texttt{rationalPHConstruction.test.ts}'}</Math>. The pole at{' '}
          <Math>{'t = \\infty'}</Math> is the ordinary projective bookkeeping, stated because it is
          easy to forget and it is where the polynomial family sits.
        </Cite>
      </>
    ),
    notes:
      'THIS IS THE HINGE OF THE DECK. Everything before it is what you have; everything after is what '
      + 'it costs. The turn happens on one sentence -- the weight function and the pole set are ONE '
      + 'OBJECT -- and if that lands, the rest of the deck is consequences. Deliver it slowly. '
      + 'THE ARGUMENT IS EMBARRASSINGLY SHORT AND THAT IS ITS STRENGTH: a non-constant polynomial has '
      + 'roots. That is the whole thing. Nobody can dispute it and nobody can wriggle out of it, '
      + 'which is why the price is unavoidable rather than a matter of method. '
      + 'THE CIRCLE PRICING ITSELF IS THE BEST MOMENT ON THE SLIDE. Slide 2 asked what a circle costs; '
      + 'here is the invoice, and it is exact: w = 1 + t squared, two poles, both complex. Point at '
      + 'the fact that they are complex, because it explains boundedness in the same breath -- a real '
      + 'pole is a place the curve runs to infinity, and the circle has none. '
      + 'BE CAREFUL WITH THE BOUNDEDNESS STATEMENT, it needs both halves. No real roots of w is not '
      + 'enough on its own: if deg p exceeds deg w the curve still runs off as t goes to infinity, '
      + 'and that is a pole at t = infinity. On the projective line the honest statement is that '
      + 'boundedness means NO POLE IS REAL, counting infinity among the candidates. The circle has '
      + 'deg p = deg w = 2, so it passes both tests. Our own one-pole family fails both -- a real '
      + 'pole, and deg p = 4 against deg w = 1. '
      + 'THE ARITHMETIC PROGRESSION IS WORTH THE FADED LINE because it is the sharpest possible form '
      + 'of "weight freedom is bought with poles". A reader who expects five independent weights on a '
      + 'quartic gets two. If somebody asks why: elevating a linear w just linearly interpolates its '
      + 'end values, and elevation is exact, so there is nothing else it could do. '
      + 'DO NOT MENTION THE NO-LOG CONDITION YET. This slide establishes that poles are unavoidable, '
      + 'nothing more. The difficulty they cause is the next slide, and it lands far harder if the '
      + 'room has first accepted the poles as the price of a shape they wanted.',
  },

  // ---------------------------------------------------------------------------
  // 6 — the bill arrives, and it is narrower than people say
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="LIT" />
        <h2>Integration stops being free</h2>
        <p>
          The spinor construction survives the move intact. Write the rational curve as a vector
          polynomial over a scalar one and differentiate:
        </p>
        <Math display>
          {"\\mathbf{c} = \\mathbf{p}/w \\qquad\\Longrightarrow\\qquad \\mathbf{c}' = (\\mathbf{p}'w - \\mathbf{p}w')\\big/w^2 \\;=:\\; \\mathbf{N}/w^2"}
        </Math>
        <p>
          <Math>{'w^2'}</Math> is positive, so PH asks that{' '}
          <Math>{"\\|\\mathbf{N}\\|"}</Math> be a polynomial — which is the previous condition applied to{' '}
          <Math>{'\\mathbf{N}'}</Math> rather than to <Math>{"\\mathbf{c}'"}</Math>. The theorem
          transfers word for word:
        </p>
        <Math display>{"\\mathbf{N} \\;=\\; \\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}"}</Math>
        <p>
          <strong>So PH is still a substitution.</strong> Choose any spinor and any weight, and{' '}
          <Math>{'\\mathbf{N}/w^2'}</Math> is a genuine Pythagorean hodograph — rational speed{' '}
          <Math>{'|\\mathcal{A}|^2/w^2'}</Math>, nothing imposed, exactly as before.
        </p>
        <p>
          What changed is the <em>last</em> step. Before, you integrated term by term. Now you have to
          recover <Math>{'\\mathbf{p}'}</Math> from
        </p>
        <Math display>{"\\mathbf{p}'w - \\mathbf{p}w' \\;=\\; \\mathbf{N}"}</Math>
        <p>
          — a linear system in <Math>{'\\mathbf{p}'}</Math>&rsquo;s coefficients, and one that can be{' '}
          <strong>inconsistent</strong>. Two integrals say why:
        </p>
        <Math display>
          {"\\int (t-r)^{-2}\\,dt = -(t-r)^{-1} \\;\\; \\checkmark \\qquad\\qquad \\int (t-r)^{-1}\\,dt = \\log(t-r) \\;\\; \\times"}
        </Math>
        <p>
          The <em>double</em> pole that <Math>{'w^2'}</Math> hands you is harmless. The{' '}
          <em>simple</em> pole hiding inside it is not — and no <Math>{'\\mathbf{p}/w'}</Math> is a
          logarithm. So the curve exists only if that logarithm is <strong>absent</strong>, which is a
          requirement on <Math>{'\\mathbf{N}'}</Math> at every pole of <Math>{'w'}</Math>.
        </p>
        <p style={{ textAlign: 'center', margin: '0.8em 0' }}>
          <strong style={{ fontSize: '1.15em' }}>
            PH is still free. It is <em>integration</em> that stopped being free.
          </strong>
        </p>
        <p>
          That distinction is worth holding. The property is not what costs — you can always build a
          rational Pythagorean <em>hodograph</em>. What you cannot always do is integrate it back to a
          rational <em>curve</em>. Slide 3&rsquo;s &ldquo;nothing to check&rdquo; is gone, and this is
          the exact place it went.
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.5em' }}>
          <strong>So: what has to hold at a pole?</strong>
        </p>
        <p style={{ opacity: 0.65 }}>
          That is the next slide. The <em>solved</em> form of the requirement, and what it means
          geometrically, stay in the second act of the companion deck — this deck needs only the
          requirement itself and what it costs.
        </p>
        <Cite>
          Kalkan, Scharler, Schröcker &amp; Šír, <em>Rational Framing Motions and Spatial Rational
          Pythagorean Hodograph Curves</em>, CAGD (2022), §1: the integral &ldquo;does not need to
          produce a rational curve … a complete characterization of this subset seems to be a very
          difficult problem.&rdquo; Derivation of the residue condition:{' '}
          <Math>{'\\texttt{two-points-or-a-circle}'}</Math>, Act II.
        </Cite>
      </>
    ),
    notes:
      'THE SENTENCE THIS SLIDE EXISTS FOR is narrower than the usual telling, and getting it right '
      + 'matters: PH IS STILL FREE, INTEGRATION IS NOT. People say "rational PH is hard" and leave the '
      + 'room believing the PYTHAGOREAN property is what costs. It is not. Pick any spinor and any '
      + 'weight and N over w-squared has rational speed -- a perfectly good Pythagorean hodograph, '
      + 'nothing imposed. The failure is at the LAST step, recovering the curve from its hodograph. '
      + 'THE TWO INTEGRALS ARE THE WHOLE MECHANISM and they take fifteen seconds. A double pole '
      + 'integrates to something rational; a simple pole integrates to a logarithm; and p over w is '
      + 'never a logarithm. So w-squared in the denominator is NOT the problem -- the problem is the '
      + 'simple pole hiding inside the double one. Expect that to be counterintuitive; it is the one '
      + 'genuinely surprising step. '
      + 'CALL BACK TO SLIDE 3 EXPLICITLY. The room was told to hold on to "nothing to check". This is '
      + 'where it goes, and naming the moment is worth more than the mechanism -- a talk that takes '
      + 'something away should say so out loud rather than let the audience notice later. '
      + 'DO NOT DERIVE THE RESIDUE CONDITION HERE. The companion deck spends four slides on it and '
      + 'this deck is pricing a trade, not deriving one. State that a condition exists, cite the '
      + 'derivation, move to what it costs. If somebody asks for it in the room, the one-line version '
      + 'for a single pole is N-prime(r) = 0, and it is obviously necessary because N = p-prime '
      + '(t - r) minus p gives N-prime = p-double-prime times (t - r). '
      + 'LIT: the setup, the obstruction and the quoted sentence are all theirs.',
  },

  // ---------------------------------------------------------------------------
  // 7 — where the condition comes from, simplest case first
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="LIT" />
        <h2>What has to hold at a pole</h2>
        <p
          style={{
            borderLeft: '3px solid rgba(59,130,246,0.5)',
            paddingLeft: '0.8em',
            opacity: 0.9,
          }}
        >
          <strong>What we are solving for.</strong> <Math>{'\\mathbf{N}'}</Math> has to be{' '}
          <em>two things at once</em>:
        </p>
        <Math display>
          {"\\mathbf{N} = \\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*} \\quad \\text{(you chose this)} \\qquad\\qquad \\mathbf{N} = \\mathbf{p}'w - \\mathbf{p}w' \\quad \\text{(and it must be this)}"}
        </Math>
        <p style={{ opacity: 0.9 }}>
          The first is yours — pick a spinor and you have it. The second is a demand: it must be the
          Wronskian of a numerator <Math>{'\\mathbf{p}'}</Math> you <strong>do not have yet</strong>,
          over the denominator <Math>{'w'}</Math> you fixed. The requirement we are after is exactly
          that those two descriptions are <strong>compatible</strong>. So the way to find it is:{' '}
          <em>suppose <Math>{'\\mathbf{p}'}</Math> exists, and see what <Math>{'\\mathbf{N}'}</Math>{' '}
          is forced to satisfy.</em>
        </p>
        <p>
          Take the simplest case first — a <strong>single</strong> pole,{' '}
          <Math>{'w = t - r'}</Math>. Then <Math>{'w^2 = (t-r)^2'}</Math>, so expand{' '}
          <Math>{'\\mathbf{N}'}</Math> about <Math>{'r'}</Math> and divide:
        </p>
        <Math display>
          {"\\mathbf{N}/w^2 \\;=\\; \\mathbf{N}(r)\\,(t-r)^{-2} \\;+\\; \\mathbf{N}'(r)\\,(t-r)^{-1} \\;+\\; (\\text{analytic})"}
        </Math>
        <p style={{ textAlign: 'center', opacity: 0.75, marginTop: '-0.2em' }}>
          the first integrates to <Math>{'-\\mathbf{N}(r)(t-r)^{-1}'}</Math>, still rational — the
          second to <strong>a logarithm</strong>
        </p>
        <p>
          So the coefficient of <Math>{'1/(t-r)'}</Math> <em>is</em>{' '}
          <Math>{"\\mathbf{N}'(r)"}</Math>, and killing the logarithm is exactly
        </p>
        <Math display>{"\\mathbf{N}'(r) \\;=\\; 0"}</Math>
        <p>
          And that is not an arbitrary demand — it is forced. Supposing{' '}
          <Math>{'\\mathbf{p}'}</Math> exists, the second description of{' '}
          <Math>{'\\mathbf{N}'}</Math> reads{' '}
          <Math>{"\\mathbf{N} = \\mathbf{p}'(t-r) - \\mathbf{p}"}</Math>, and differentiating collapses
          it:
        </p>
        <Math display>
          {"\\mathbf{N}' = \\mathbf{p}''(t-r) + \\mathbf{p}' - \\mathbf{p}' = \\mathbf{p}''\\,(t-r) \\qquad\\Longrightarrow\\qquad \\mathbf{N}'(r) = 0"}
        </Math>
        <p>
          — for <em>any</em> polynomial <Math>{'\\mathbf{p}'}</Math> whatsoever. Two routes, one
          answer. So the requirement
        </p>
        <p style={{ textAlign: 'center', margin: '0.5em 0' }}>
          <strong style={{ fontSize: '1.12em' }}>
            says exactly that <em>there exists</em> a <Math>{'\\mathbf{p}'}</Math> with{' '}
            <Math>{"\\mathbf{N} = \\mathbf{p}'w - \\mathbf{p}w'"}</Math>.
          </strong>
        </p>
        <p>
          Which is what you were after, since <Math>{'\\mathbf{p}'}</Math> <em>is</em> the
          curve&rsquo;s numerator: <em>&ldquo;such a <Math>{'\\mathbf{p}'}</Math> exists&rdquo;</em> and{' '}
          <em>&ldquo;the curve exists&rdquo;</em> are the same sentence. Not a hurdle on top of
          existence — <strong>existence, rewritten</strong>, and rewritten as a test you can run on{' '}
          <Math>{'\\mathbf{N}'}</Math> alone, without attempting the solve.
        </p>
        <p>
          <strong>Now more than one pole</strong>, and only one thing changes. Splitting off the root
          leaves a cofactor behind, <Math>{'w = (t-r)\\varphi'}</Math> with{' '}
          <Math>{'\\varphi(r) \\neq 0'}</Math>, so the thing you expand is no longer{' '}
          <Math>{'\\mathbf{N}'}</Math> but
        </p>
        <Math display>
          {"\\mathbf{N}/w^2 \\;=\\; \\mathbf{g}\\,(t-r)^{-2}, \\qquad \\mathbf{g} := \\mathbf{N}/\\varphi^{2}"}
        </Math>
        <p>
          Now expand a second time — the same two lines as before, with{' '}
          <Math>{'\\mathbf{g}'}</Math> standing where <Math>{'\\mathbf{N}'}</Math> stood:
        </p>
        <Math display>
          {"\\mathbf{N}/w^2 \\;=\\; \\mathbf{g}(r)\\,(t-r)^{-2} \\;+\\; \\mathbf{g}'(r)\\,(t-r)^{-1} \\;+\\; (\\text{analytic})"}
        </Math>
        <p style={{ textAlign: 'center', opacity: 0.75, marginTop: '-0.2em' }}>
          first term still rational — second term still <strong>the logarithm</strong>
        </p>
        <p>
          So the coefficient of <Math>{'1/(t-r)'}</Math> is{' '}
          <Math>{"\\mathbf{g}'(r)"}</Math>, and the requirement is{' '}
          <Math>{"\\mathbf{g}'(r) = 0"}</Math>. It is the identical statement — only the thing being
          expanded has changed. Now unpack it, by the quotient rule on{' '}
          <Math>{"\\mathbf{g} = \\mathbf{N}\\varphi^{-2}"}</Math>:
        </p>
        <Math display>
          {"\\mathbf{g}' = (\\mathbf{N}'\\varphi - 2\\mathbf{N}\\varphi')\\big/\\varphi^{3} \\qquad\\Longrightarrow\\qquad \\mathbf{g}'(r) = 0 \\iff \\mathbf{N}'(r)\\,\\varphi(r) = 2\\,\\mathbf{N}(r)\\,\\varphi'(r)"}
        </Math>
        <p>
          and divide through by <Math>{'\\varphi(r) \\neq 0'}</Math>:
        </p>
        <Math display>
          {"\\mathbf{N}'(r) \\;=\\; 2\\,\\mathbf{N}(r)\\,\\Sigma, \\qquad \\Sigma := \\varphi'(r)/\\varphi(r) = \\sum 1/(r_k - r_l)"}
        </Math>
        <p>
          <Math>{'\\Sigma'}</Math> sums over the <em>other</em> roots and knows only where the poles
          sit — nothing about the curve enters it. And the two cases agree, which is the check worth
          doing: one pole means <Math>{'\\varphi = 1'}</Math>, hence{' '}
          <Math>{'\\mathbf{g} = \\mathbf{N}'}</Math> and <Math>{'\\Sigma = 0'}</Math>, and the general
          form collapses back to <Math>{"\\mathbf{N}'(r) = 0"}</Math>.
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.4em' }}>
          <strong>
            <Math>{'\\mathbf{N}'}</Math> is a vector, so its residue is one too —{' '}
            <strong>three real conditions per simple pole</strong>.
          </strong>
        </p>
        <Cite>
          The partial-fraction analysis is classical. The general form is Kalkan et al. (2022) Thm.
          4.6, stated there as linear dependence of the Taylor coefficients. The one-line argument for
          a single pole — that the condition merely says <Math>{'\\mathbf{N}'}</Math> is a Wronskian —
          is <Math>{'\\texttt{FOUNDATIONS F16}'}</Math>.
        </Cite>
      </>
    ),
    notes:
      'THIS SLIDE WAS MISSING AND A READER CAUGHT IT: the next slide computes Sigma = -i/2 for the '
      + 'circle and checks the condition by hand, and until now the audience had never seen either '
      + 'derived. You cannot hand-check a formula you were handed. The deck traded a citation for a '
      + 'slide and it was the right trade. '
      + 'THE ORIENTING BOX IS THE MOST IMPORTANT THING ON THE SLIDE, and it was added after a reader '
      + 'said the opening came from nowhere. He was right, and the diagnosis is precise: the slide '
      + 'computed for half a screen before ever saying WHAT IT WAS SOLVING FOR. The frame is one idea -- '
      + 'N has to be TWO THINGS AT ONCE. It is the sandwich, which you chose. It must ALSO be the '
      + 'Wronskian of a numerator you do not have. The requirement is exactly that those two '
      + 'descriptions agree. Say that before any algebra and both arguments below become obviously the '
      + 'same question asked from opposite ends. '
      + 'AND IT RESCUES THE LOGIC OF THE FIRST ARGUMENT, which is otherwise sneaky: it SUPPOSES p exists '
      + 'in order to find out when p exists. Framed as -- assume it, and see what N is forced to satisfy '
      + '-- that is an ordinary necessity argument. Unframed it reads as circular, and a careful '
      + 'listener stops there rather than following. '
      + 'THE SECOND EXPANSION IS WRITTEN OUT, NOT SUMMARISED, and that was asked for. A draft said "the '
      + 'coefficient of 1/(t-r) is g-prime(r)" and moved on -- true, but the reader had just been shown '
      + 'the one-pole expansion explicitly and wanted to SEE the same two lines again with g in place of '
      + 'N. Showing it costs one display and makes the general case a substitution rather than a new '
      + 'argument. The whole delta between the two cases is which function gets expanded. '
      + 'THE QUOTIENT-RULE STEP IS ALSO SHOWN NOW, so Sigma arrives rather than being asserted: g-prime is '
      + '(N-prime phi minus 2 N phi-prime) over phi-cubed, setting it to zero at r and multiplying by phi '
      + 'cubed gives N-prime(r) phi(r) = 2 N(r) phi-prime(r), and dividing by phi(r) produces Sigma as the '
      + 'logarithmic derivative. Every symbol on the final line has now been derived on the slide. '
      + 'THE ORDER WAS WRONG AND A READER FOUND THE EXACT SEAM. He could see that killing g-prime(r) '
      + 'removes the 1/(t-r) term, and could not see what N-prime(r) = 0 had to do with it -- did it kill '
      + 'a 1/(t-r) as well? It IS the same one, and the slide never said so. With a single pole phi is '
      + 'identically 1, so g IS N, and the coefficient of 1/(t-r) is literally N-prime(r). One sentence, '
      + 'and it was missing. '
      + 'SO THE SLIDE NOW EXPANDS N/w-squared DIRECTLY IN THE ONE-POLE CASE, before phi or g exist at all. '
      + 'The residue is visible with no machinery, the condition is read straight off it, and only THEN '
      + 'does the Wronskian argument arrive as confirmation rather than as a separate mystery. The general '
      + 'case then changes exactly one thing -- the cofactor phi means you expand N over phi-squared '
      + 'instead of N -- which is a small delta rather than a new derivation. '
      + 'GENERAL LESSON, and it applies to the whole deck: when two arguments reach the same place, SHOW '
      + 'the simplest one in a form where nothing is abstracted away, and present the other as agreement. '
      + 'Presenting both at full generality makes them look unrelated, which is precisely what happened. '
      + 'LEAD WITH THE ONE-POLE ARGUMENT, NOT THE PARTIAL FRACTIONS. It is one line, it needs no '
      + 'residues, and it makes the condition feel INEVITABLE rather than technical: N = p-prime '
      + '(t - r) minus p gives N-prime = p-double-prime times (t - r), which vanishes at r for ANY p. '
      + 'The condition says nothing more than "N must be the Wronskian of some polynomial". A room '
      + 'that hears that first will read the general derivation as bookkeeping rather than as magic. '
      + 'SAY EXISTS, NOT SOME. A draft read "N must be the Wronskian of SOME polynomial" and a reader '
      + 'took it to mean any polynomial would do -- which would make the requirement vacuous. It is an '
      + 'EXISTENCE claim: there is a p with N = p-prime w minus p w-prime. English makes those two '
      + 'readings of "some" equally available, so use the unambiguous word. '
      + 'AND SAY WHY THE REPHRASING IS WORTH ANYTHING, which the draft did not. Two beats. First, p IS '
      + 'the curve-s numerator, so "such a p exists" and "the curve exists" are the same sentence -- '
      + 'the requirement is not an extra hurdle on top of existence, it IS existence in another form. '
      + 'Second, and this is the practical half: it is a test on N ALONE. You can decide whether the '
      + 'curve exists without ever attempting the solve. That is the whole reason to have a condition '
      + 'rather than just running the linear system and seeing what happens. '
      + 'THE GENERAL CASE IS SIX LINES AND THE ONLY SUBTLE STEP IS THE FIRST: the Laurent NUMERATOR is '
      + 'N over phi-squared, not N. Differentiating phi-to-the-minus-two is what produces the second '
      + 'term and hence the Sigma. Getting that wrong is a real error -- it happened in this project '
      + 'in a related computation and survived because at one pole phi is identically 1 and the '
      + 'mistake is invisible. '
      + 'SIGMA KNOWS ONLY THE ROOTS. Say it plainly; it is what makes the condition tractable, and it '
      + 'is the reason a builder can choose the pole configuration first and the spinor second. '
      + 'THE CONSISTENCY CHECK EARNS ITS LINE. One pole gives phi = 1, Sigma = 0, and the general form '
      + 'collapses to the one-line version. Two derivations meeting is worth more to an audience than '
      + 'either alone.',
  },

  // ---------------------------------------------------------------------------
  // 8 — the worked case, on the curve the deck is named after
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="THM" />
        <h2>The circle, integrated</h2>
        <p>
          Everything so far has been general. Take the curve we started with and run the machinery on
          it by hand — it fits on this slide.
        </p>
        <Math display>{"\\mathbf{p} = (1-t^2,\\; 2t), \\qquad w = 1+t^2"}</Math>
        <Math display>
          {"\\mathbf{N} = \\mathbf{p}'w - \\mathbf{p}w' = (-2t-2t^3,\\; 2+2t^2) - (2t-2t^3,\\; 4t^2) = (-4t,\\; 2-2t^2)"}
        </Math>
        <Math display>
          {"\\|\\mathbf{N}\\|^2 = 16t^2 + (2-2t^2)^2 = 4(1+t^2)^2 \\qquad\\Longrightarrow\\qquad \\sigma = 2(1+t^2) = 2w"}
        </Math>
        <p>
          <strong>And here is where <Math>{'\\sigma'}</Math> parts company with the speed.</strong>{' '}
          <Math>{'\\sigma = \\|\\mathbf{N}\\|'}</Math> is the speed&rsquo;s{' '}
          <em>numerator</em>; the speed is{' '}
          <Math>{"\\|\\mathbf{c}'\\| = \\sigma/w^2"}</Math>. On slide 3 they were the same
          thing because <Math>{'w = 1'}</Math>, which is why nothing warned you.
        </p>
        <p>
          <strong>
            Note that: <Math>{'\\sigma = 2w'}</Math>.
          </strong>{' '}
          The speed numerator carries a factor of the denominator. Park it — it comes back in a
          moment.
        </p>
        <p>
          Now the condition. The poles are the roots of <Math>{'w'}</Math>, at{' '}
          <Math>{'t = \\pm i'}</Math>. At <Math>{'t = i'}</Math> write{' '}
          <Math>{'w = (t-i)(t+i)'}</Math>, so <Math>{'\\varphi = t+i'}</Math> and
        </p>
        <Math display>
          {"\\Sigma = \\varphi'(i)/\\varphi(i) = 1/(2i) = -i/2"}
        </Math>
        <p>
          and the residue condition <Math>{"\\mathbf{N}'(r) = 2\\mathbf{N}(r)\\Sigma"}</Math> is one line
          each side:
        </p>
        <Math display>
          {"\\mathbf{N}(i) = (-4i,\\; 4), \\quad \\mathbf{N}'(i) = (-4,\\; -4i), \\quad 2\\mathbf{N}(i)\\Sigma = (-i)(-4i,\\;4) = (-4,\\; -4i)"}
        </Math>
        <p style={{ textAlign: 'center', margin: '0.6em 0' }}>
          <strong style={{ fontSize: '1.12em' }}>It holds exactly. Five lines, on paper.</strong>
        </p>
        <p>
          As it must — the circle <em>is</em> a rational curve, so its hodograph integrates rationally
          by construction. The value is not the answer; it is watching the condition confirm something
          you already knew, which is how you learn to trust it where you do not.
        </p>
        <p>Now spend the observation we parked. The arc length:</p>
        <Math display>
          {"\\int \\sigma/w^2 \\,dt \\;=\\; \\int \\frac{2w}{w^2}\\,dt \\;=\\; \\int \\frac{2}{1+t^2}\\,dt \\;=\\; 2\\arctan t"}
        </Math>
        <p style={{ textAlign: 'center', margin: '0.6em 0' }}>
          <strong style={{ fontSize: '1.12em' }}>
            The circle&rsquo;s arc length is an <em>arctangent</em> — not rational.
          </strong>
        </p>
        <p>
          Which nobody should find shocking: arc length on a circle <em>is</em> the angle, and the
          rational parametrisation is the tangent half-angle substitution, so{' '}
          <Math>{'\\theta = 2\\arctan t'}</Math> exactly.
        </p>
        <p style={{ textAlign: 'center' }}>
          <strong>
            So on one curve: the condition for the <em>curve</em> to be rational holds, and the
            condition for its <em>arc length</em> to be rational fails. They are different conditions.
          </strong>
        </p>
        <p style={{ opacity: 0.65 }}>
          And the reason is on the slide: <Math>{'\\sigma = 2w'}</Math> vanishes at the pole, so{' '}
          <Math>{'\\sigma/w^2'}</Math> keeps a simple pole exactly where{' '}
          <Math>{'\\mathbf{N}/w^2'}</Math> does not.
        </p>
        <Cite>
          The parametrisation and the arctangent are classical. The residue condition is Kalkan et al.
          (2022) Thm. 4.6, derived in <Math>{'\\texttt{two-points-or-a-circle}'}</Math> Act II. The
          arithmetic here is done on the slide so nothing has to be taken on trust.
        </Cite>
      </>
    ),
    notes:
      'THIS SLIDE EXISTS BECAUSE ERIC ASKED FOR A BUILD-UP FROM SIMPLE CASES, and he was right: the '
      + 'deck had four slides of general machinery before any of it touched a curve. The circle is the '
      + 'ideal specimen -- it is the curve the deck is NAMED after, everyone knows it, and the whole '
      + 'apparatus fits on one screen with nothing hidden. '
      + 'DO THE ARITHMETIC LIVE IF THE ROOM WILL SIT FOR IT. Every step is a line: the Wronskian by '
      + 'the product rule, the norm by expanding a square, Sigma from a two-factor denominator, and '
      + 'then the condition. Nobody has to believe anything. '
      + 'THE POINT IS NOT THAT IT PASSES -- of course it passes, the circle is rational. The point is '
      + 'that the machinery CONFIRMS something already known, which is the only way an audience learns '
      + 'to trust it in a case where they do not know the answer. Say that; it is the pedagogical '
      + 'content of the slide. '
      + 'THE ARCTANGENT IS THE BEST MOMENT IN THE DECK SO FAR, and it works because it is not '
      + 'surprising at all once said: arc length on a circle IS the angle, and the rational '
      + 'parametrisation is the half-angle substitution. A listener who has been told rational PH '
      + 'curves have awkward arc length now has the reason in a form they cannot forget. '
      + 'AND IT SPLITS THE TWO CONDITIONS, which is the load-bearing takeaway. On this ONE curve the '
      + 'curve-rationality condition holds and the arc-length one fails. They are not the same '
      + 'condition, and anyone who assumed PH implies nice arc length has just watched the assumption '
      + 'break on the friendliest possible example. sigma = 2w is why, and it is visible. '
      + 'SIGMA = 2w IS ALSO THE SMALLEST INSTANCE OF THE (n-2)/n LAW -- deg h = n - 2 = 0, h = 2 -- '
      + 'which is why the conformal PH members never have rational arc length either. Do not open that '
      + 'here; it is a later slide and it lands better once this example is in the room-s memory.',
  },

  // ---------------------------------------------------------------------------
  // 9 — pushing the requirement onto the thing you actually choose
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="LIT" />
        <h2>From the hodograph to the spinor</h2>
        <p
          style={{
            borderLeft: '3px solid rgba(59,130,246,0.5)',
            paddingLeft: '0.8em',
            opacity: 0.9,
          }}
        >
          <strong>Why bother.</strong> On the circle we already had the curve, so we had{' '}
          <Math>{'\\mathbf{N}'}</Math>, and could check the requirement directly. But when you{' '}
          <em>build</em> one you choose <Math>{'\\mathcal{A}'}</Math> —{' '}
          <Math>{'\\mathbf{N}'}</Math> is downstream of it. A requirement on{' '}
          <Math>{'\\mathbf{N}'}</Math> is a requirement on something you <em>compute</em>, not on
          something you <em>pick</em>. So push it down.
        </p>
        <p>
          Substitute <Math>{"\\mathbf{N} = \\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}"}</Math> and
          differentiate by the product rule:
        </p>
        <Math display>
          {"\\mathbf{N}' = \\mathcal{A}'\\,\\mathbf{i}\\,\\mathcal{A}^{*} + \\mathcal{A}\\,\\mathbf{i}\\,(\\mathcal{A}')^{*}"}
        </Math>
        <p>so the requirement, everything evaluated at the pole, reads</p>
        <Math display>
          {"\\mathcal{A}'\\,\\mathbf{i}\\,\\mathcal{A}^{*} + \\mathcal{A}\\,\\mathbf{i}\\,(\\mathcal{A}')^{*} \\;=\\; 2\\,\\bigl(\\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}\\bigr)\\,\\Sigma"}
        </Math>
        <p>
          You cannot cancel one <Math>{'\\mathcal{A}'}</Math>. It stands on the{' '}
          <strong>left</strong> of the <Math>{'\\mathbf{i}'}</Math> and its conjugate on the{' '}
          <strong>right</strong>, and no single division reaches both. But you can strip them{' '}
          <em>together</em> — multiply by <Math>{'\\mathcal{A}^{-1}'}</Math> on the left and{' '}
          <Math>{'(\\mathcal{A}^{*})^{-1}'}</Math> on the right, which is legal because every nonzero
          quaternion has an inverse.
        </p>
        <p>
          Name what survives — the <strong>logarithmic derivative</strong> of the spinor, one
          quaternion built from its value and its velocity at the pole — and use that conjugation
          reverses products:
        </p>
        <Math display>
          {"V := \\mathcal{A}^{-1}\\mathcal{A}', \\qquad (\\mathcal{A}')^{*}(\\mathcal{A}^{*})^{-1} = \\bigl(\\mathcal{A}^{-1}\\mathcal{A}'\\bigr)^{*} = V^{*}"}
        </Math>
        <p>
          The right-hand side collapses too, since <Math>{'\\Sigma'}</Math> is a <em>real</em> number
          and commutes with everything. What is left standing is
        </p>
        <Math display>
          {"V\\,\\mathbf{i} \\;+\\; \\mathbf{i}\\,V^{*} \\;=\\; 2\\,\\Sigma\\,\\mathbf{i}"}
        </Math>
        <p style={{ textAlign: 'center', margin: '0.5em 0' }}>
          <strong style={{ fontSize: '1.12em' }}>
            Every trace of <Math>{'\\mathcal{A}'}</Math> is gone. One quaternion equation, one
            quaternion unknown.
          </strong>
        </p>
        <p>
          And it solves in four lines. Write{' '}
          <Math>{'V = v_0 + v_1\\mathbf{i} + v_2\\mathbf{j} + v_3\\mathbf{k}'}</Math> and use{' '}
          <Math>{'\\mathbf{ji} = -\\mathbf{k}'}</Math>, <Math>{'\\mathbf{ki} = \\mathbf{j}'}</Math>,{' '}
          <Math>{'\\mathbf{ij} = \\mathbf{k}'}</Math>, <Math>{'\\mathbf{ik} = -\\mathbf{j}'}</Math>:
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto',
            gap: '0.15em 0.8em',
            justifyContent: 'center',
            margin: '0.5em 0',
            alignItems: 'baseline',
          }}
        >
          <span>
            <Math>{'V\\,\\mathbf{i}'}</Math>
          </span>
          <span>
            <Math>{'=\\; -v_1 + v_0\\mathbf{i} + v_3\\mathbf{j} - v_2\\mathbf{k}'}</Math>
          </span>
          <span>
            <Math>{'\\mathbf{i}\\,V^{*}'}</Math>
          </span>
          <span>
            <Math>{'=\\; +v_1 + v_0\\mathbf{i} + v_3\\mathbf{j} - v_2\\mathbf{k}'}</Math>
          </span>
          <span style={{ borderTop: '1px solid rgba(0,0,0,0.25)', paddingTop: '0.2em' }}>
            <Math>{'\\text{sum}'}</Math>
          </span>
          <span style={{ borderTop: '1px solid rgba(0,0,0,0.25)', paddingTop: '0.2em' }}>
            <Math>{'=\\; 2v_0\\mathbf{i} + 2v_3\\mathbf{j} - 2v_2\\mathbf{k}'}</Math>
          </span>
        </div>
        <p>
          Compare with <Math>{'2\\Sigma\\mathbf{i}'}</Math> and read it off:{' '}
          <Math>{'v_0 = \\Sigma'}</Math>, <Math>{'v_2 = v_3 = 0'}</Math>, and{' '}
          <Math>{'v_1'}</Math> <strong>free</strong> — free because the two{' '}
          <Math>{'v_1'}</Math> terms <em>cancelled</em>, not because we chose to leave it alone.
          Call it <Math>{'\\lambda'}</Math>. Unwinding <Math>{"V = \\mathcal{A}^{-1}\\mathcal{A}'"}</Math>:
        </p>
        <Math display>
          {"\\mathcal{A}'(r) \\;=\\; \\mathcal{A}(r)\\,\\bigl(\\Sigma + \\lambda\\,\\mathbf{i}\\bigr), \\qquad \\lambda \\in \\mathbb{R}"}
        </Math>
        <p style={{ textAlign: 'center' }}>
          <strong>
            And at a single pole <Math>{'\\Sigma = 0'}</Math>, leaving{' '}
            <Math>{"\\mathcal{A}'(r) = \\lambda\\,\\mathcal{A}(r)\\,\\mathbf{i}"}</Math> — which is what the
            next slide builds with.
          </strong>
        </p>
        <p style={{ opacity: 0.65 }}>
          Note what the requirement does <em>not</em> mention: where the spinor <em>is</em>. Only how
          it is <strong>moving</strong> at the pole.
        </p>
        <Cite>
          The reduction is <Math>{'\\texttt{FOUNDATIONS F14}'}</Math>, pinned in{' '}
          <Math>{'\\texttt{rationalPHSpatialResidue.test.ts}'}</Math>; the geometry of{' '}
          <Math>{'\\lambda'}</Math> is <Math>{'\\texttt{F16}'}</Math>. Kalkan et al. (2022) reach the
          same conditions by a different route — framing motions and dual quaternions, Thm. 3.6.
        </Cite>
      </>
    ),
    notes:
      'THIS SLIDE WAS MISSING AND A READER FOUND THE SEAM, again. Slide 7 ends on a requirement about '
      + 'N; slide 10 builds with a requirement about A; nothing connected them. The companion deck '
      + 'derives it across two slides and this deck had decided to cite rather than repeat -- which '
      + 'is fine for a SOLVED FORM but not for the step that changes which variable you are talking '
      + 'about. '
      + 'THE MOTIVATION IS THE ORIENTING BOX AND IT IS SPECIFIC TO THIS DECK. On the circle we HAD the '
      + 'curve, hence N, and checked directly. When you BUILD one, N is downstream of A -- so a '
      + 'requirement on N is a requirement on a computed thing, not on a chosen thing. That is the '
      + 'whole reason to translate, and it is worth saying before any algebra. '
      + 'THE SIDEDNESS IS THE MECHANICAL CRUX. A on the left of the i, A-star on the right; no single '
      + 'division reaches both, so you strip from BOTH SIDES AT ONCE, which is available only because '
      + 'H is a division ring. Do the gesture with your hands. '
      + 'v_1 IS FREE BECAUSE IT CANCELLED. Say it in those words. The two v_1 terms appear with '
      + 'opposite signs and vanish from the sum, so lambda is not a parameter anyone inserted -- it is '
      + 'what the equation failed to constrain. That is a better story than "and there is a free '
      + 'parameter", and it is the honest one. '
      + 'THE LAST FADED LINE PLANTS THE GEOMETRY without spending it: the requirement says nothing '
      + 'about WHERE the spinor is, only how it MOVES at the pole. That is what makes lambda a RATE '
      + 'rather than a position, which is the return-side story a few slides on.',
  },

  // ---------------------------------------------------------------------------
  // 10 — the other regime, where the dials live
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['THM', 'MEAS']} />
        <h2>A real pole, and a dial</h2>
        <p>
          The circle&rsquo;s poles were complex, which is why it never ran anywhere. Put one on the{' '}
          <em>real</em> axis instead and the character changes completely. Take the pole at{' '}
          <Math>{'t = -1'}</Math>, write <Math>{'u := t+1'}</Math> so that{' '}
          <Math>{'w = u'}</Math>, and choose
        </p>
        <Math display>
          {"\\mathcal{A}(t) \\;=\\; 1 \\;+\\; \\lambda\\,\\mathbf{i}\\,u \\;+\\; \\mathbf{j}\\,u^2"}
        </Math>
        <p>
          The requirement holds <strong>by construction</strong>, for every{' '}
          <Math>{'\\lambda'}</Math>: since <Math>{'\\mathcal{A}(r) = 1'}</Math> and{' '}
          <Math>{"\\mathcal{A}'(r) = \\lambda\\mathbf{i}"}</Math>, the demand{' '}
          <Math>{"\\mathcal{A}'(r) = \\lambda\\,\\mathcal{A}(r)\\,\\mathbf{i}"}</Math> is satisfied
          outright. Nothing solved, nothing searched for — and <Math>{'\\lambda'}</Math> is left over.
        </p>
        <p>And it is not an idle parameter. Compute the sandwich at two values:</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto auto',
            gap: '0.3em 1.4em',
            justifyContent: 'center',
            margin: '0.5em 0',
            fontSize: '0.8em',
            alignItems: 'baseline',
          }}
        >
          <span>
            <Math>{'\\lambda = 0'}</Math>
          </span>
          <span>
            <Math>{"\\mathbf{N} = (1-u^4,\\; 0,\\; -2u^2)"}</Math>
          </span>
          <span>
            the <Math>{'\\mathbf{j}'}</Math>-part vanishes — <strong>planar</strong>
          </span>
          <span>
            <Math>{'\\lambda = 1'}</Math>
          </span>
          <span>
            <Math>{"\\mathbf{N} = (1+u^2-u^4,\\; 2u^3,\\; -2u^2)"}</Math>
          </span>
          <span>
            <strong>spatial</strong>
          </span>
        </div>
        <p style={{ textAlign: 'center', margin: '0.6em 0' }}>
          <strong style={{ fontSize: '1.12em' }}>
            Turn the dial, and the curve lifts out of the plane.
          </strong>
        </p>
        <p>
          Solving <Math>{"\\mathbf{p}'w - \\mathbf{p}w' = \\mathbf{N}"}</Math> — the same linear system,
          four lines of back-substitution — gives, at <Math>{'\\lambda = 1'}</Math>:
        </p>
        <Math display>
          {"\\mathbf{c}(t) \\;=\\; \\bigl(-1/u + u - u^3/3,\\;\\; u^2,\\;\\; -2u\\bigr), \\qquad \\sigma = |\\mathcal{A}|^2 = 1 + u^2 + u^4"}
        </Math>
        <p>
          A rational <strong>quartic</strong> — five control points, and the weights come out{' '}
          <Math>{'1,\\; 1.25,\\; 1.5,\\; 1.75,\\; 2'}</Math>: slide 5&rsquo;s arithmetic progression, with
          numbers in it.
        </p>
        <p>And now the arc length, which is where the two examples separate:</p>
        <Math display>
          {"\\int \\sigma/w^2\\,dt \\;=\\; \\int \\bigl(u^{-2} + 1 + u^2\\bigr)\\,du \\;=\\; -1/u + u + u^3/3"}
        </Math>
        <p style={{ textAlign: 'center', margin: '0.5em 0' }}>
          <strong style={{ fontSize: '1.12em' }}>Rational. No logarithm anywhere.</strong>
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto auto',
            gap: '0.28em 1.6em',
            justifyContent: 'center',
            margin: '0.6em 0',
            fontSize: '0.76em',
            lineHeight: 1.5,
            alignItems: 'baseline',
          }}
        >
          <span style={{ opacity: 0.6 }} />
          <span style={{ opacity: 0.6 }}>the circle</span>
          <span style={{ opacity: 0.6 }}>this one</span>
          <span>poles</span>
          <span>
            <Math>{'\\pm i'}</Math> — complex
          </span>
          <span>
            <Math>{'-1'}</Math> — real
          </span>
          <span>reaches infinity?</span>
          <span>never — bounded</span>
          <span>
            yes, at <Math>{'t = -1'}</Math>
          </span>
          <span>
            <Math>{'\\sigma'}</Math> at the pole
          </span>
          <span>
            <Math>{'\\sigma = 2w'}</Math> — vanishes
          </span>
          <span>
            <Math>{'\\sigma(r) = 1'}</Math>
          </span>
          <span>arc length</span>
          <span>
            <Math>{'2\\arctan t'}</Math>
          </span>
          <span>
            <strong>rational</strong>
          </span>
          <span>a dial?</span>
          <span>none in this chart</span>
          <span>
            <Math>{'\\lambda'}</Math>, and you can see it
          </span>
        </div>
        <p style={{ textAlign: 'center' }}>
          <strong>Two examples, two regimes. Between them they carry the rest of the deck.</strong>
        </p>
        <Cite>
          The closed form{' '}
          <Math>{"\\mathcal{A} = \\mathcal{B}_0 + \\lambda(\\mathcal{B}_0\\mathbf{i})(t-r) + \\mathcal{B}_2(t-r)^2"}</Math>
          {' '}— the requirement met by substitution rather than by solving — is{' '}
          <Math>{'\\texttt{FOUNDATIONS F16}'}</Math>. Every number on this slide is pinned in{' '}
          <Math>{'\\texttt{onePoleWorkedExample.test.ts}'}</Math> (6 tests).
        </Cite>
      </>
    ),
    notes:
      'THIS SLIDE ANSWERS A PROBLEM THE DECK HAD CREATED FOR ITSELF. The circle motivates everything '
      + 'and was the only worked example -- but its poles are COMPLEX, and the lambda and r dials live '
      + 'in the real-pole chart. Advertising those dials right after the circle would be selling '
      + 'machinery that does not apply to the thing that motivated it. A second example fixes that '
      + 'honestly, and it turns out to be the circle-s opposite on every axis. '
      + 'THE REQUIREMENT IS MET BY CONSTRUCTION, AND THAT IS THE POINT. A(r) = 1 and A-prime(r) = '
      + 'lambda i, so the demand holds for EVERY lambda with nothing solved. After two slides of '
      + '"this is a real constraint and most things fail it", showing a family that satisfies it '
      + 'outright is the reassurance the deck owes. '
      + 'LAMBDA = 0 PLANAR, LAMBDA = 1 SPATIAL is the best thing on the slide. The twist rate stops '
      + 'being an abstract parameter and becomes THE THING THAT LIFTS THE CURVE OUT OF THE PLANE, in '
      + 'an example small enough to check by hand. Do NOT claim this holds in general -- it is a '
      + 'property of this particular B_0 and B_2, and asserting more would be exactly the overreach '
      + 'this deck keeps having to retract. '
      + 'THE WEIGHTS ARE A CALLBACK WITH NUMBERS IN IT. Slide 5 said a linear denominator forces the '
      + 'weights into an arithmetic progression; here they are, 1 to 2 in steps of a quarter. Point '
      + 'at it -- an abstract structural claim landing as concrete arithmetic four slides later is how '
      + 'a deck earns trust. '
      + 'AND THE PAIR IS THE PAYOFF. The comparison table is why both examples exist: complex versus '
      + 'real poles, bounded versus not, sigma vanishing at the pole versus not, arctangent versus '
      + 'rational, no dial versus a visible one. Every later slide can now point at one of two curves '
      + 'the room has actually seen, instead of at a parameter count. '
      + 'HOW THIS WAS CHECKED, and it matters: every number was derived by hand first, then pinned. '
      + 'The test disagreed once -- on the weights -- and the TEST was wrong, not the hand computation '
      + '(degree elevation had been coded as a monomial-to-Bernstein conversion). Reading a red test '
      + 'as authoritative would have put 1, 1.5, 2, 2.5, 3 on this slide.',
  },

  // ---------------------------------------------------------------------------
  // 11 — how expensive the condition actually is, which is the pricing question
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['LIT', 'MEAS']} />
        <h2>Most spinors fail</h2>
        <p>
          So how expensive is that condition? The bad news first. It is{' '}
          <strong>three real conditions per simple pole</strong> —{' '}
          <Math>{'\\mathbf{N}'}</Math> is a vector, so its residue is one too. And the consequence is
          put bluntly by the people who characterised it:
        </p>
        <p
          style={{
            borderLeft: '3px solid rgba(216,154,154,0.6)',
            paddingLeft: '0.8em',
            fontStyle: 'italic',
          }}
        >
          &ldquo;rather surprisingly, for a generic choice of <Math>{'\\mathcal{A}'}</Math> and{' '}
          <Math>{'\\alpha'}</Math> only polynomial solutions can be obtained&rdquo;
        </p>
        <p>
          Read that as a warning to anyone building one:{' '}
          <strong>
            pick a spinor, pick a weight, and hope — and you will never produce a rational PH curve.
          </strong>{' '}
          Not rarely. Never.
        </p>
        <p>
          But as a <em>price</em> it is far smaller than that sounds, for two reasons.
        </p>
        <p style={{ marginBottom: '0.15em' }}>
          <strong>1. It prices sampling, not the family.</strong>
        </p>
        <p style={{ marginLeft: '1.2em' }}>
          The statement fixes the <em>input pair</em> and asks what comes out. A curve you{' '}
          <em>construct</em> has an input pair that is anything but generic — it was manufactured.
          Singular matrices are measure zero too, and there is no shortage of them.
        </p>
        <p style={{ marginBottom: '0.15em', marginTop: '0.4em' }}>
          <strong>2. The rarity is not even uniform.</strong>
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto auto',
            gap: '0.28em 1.6em',
            justifyContent: 'center',
            margin: '0.5em 0',
            fontSize: '0.76em',
            lineHeight: 1.5,
            alignItems: 'baseline',
          }}
        >
          <span style={{ opacity: 0.6 }}>pole multiplicity</span>
          <span style={{ opacity: 0.6 }}>condition</span>
          <span style={{ opacity: 0.6 }}>how rare</span>
          <span>
            <Math>{'n = 1'}</Math>
          </span>
          <span>
            <Math>{"\\{\\mathbf{f}_0,\\mathbf{f}_1\\}"}</Math> dependent
          </span>
          <span>codimension 2</span>
          <span>
            <Math>{'n = 2'}</Math>
          </span>
          <span>
            <Math>{"\\det(\\mathbf{f}_0,\\mathbf{f}_1,\\mathbf{f}_2) = 0"}</Math>
          </span>
          <span>codimension 1</span>
          <span>
            <Math>{'n \\geq 3'}</Math>
          </span>
          <span>
            <em>automatic</em>
          </span>
          <span>
            <strong>not rare at all</strong>
          </span>
        </div>
        <p>
          At multiplicity three or more the condition is <em>always</em> satisfiable. Nothing to pay.
        </p>
        <p>
          And there is a systematic way in that costs nothing either. <strong>Invert a polynomial PH
          curve.</strong> Möbius maps are conformal, so they scale speed by a rational factor and
          rational speed stays rational. Measured here: the condition then holds at <em>every</em> root
          of the denominator, not merely at the one the theorem asks for.
        </p>
        <p style={{ textAlign: 'center', margin: '0.7em 0' }}>
          <strong style={{ fontSize: '1.15em' }}>
            The condition taxes blind search. It does not tax the family.
          </strong>
        </p>
        <p style={{ opacity: 0.65 }}>
          Nine Möbius specimens, dependence <Math>{'\\leq 6\\times10^{-15}'}</Math> at every root,
          against <Math>{'0.39-0.85'}</Math> for generic pairs. Structural, not lucky: with{' '}
          <Math>{"w = \\|\\mathbf{r} - \\mathbf{c}\\|^2"}</Math> the roots are exactly where the
          complexified curve meets the isotropic cone at the inversion centre.
        </p>
        <Cite>
          Genericity and the multiplicity cases: Kalkan et al. (2022), §1, §4, Lemmas 4.2–4.4. The
          Möbius route is their ref. [1] (2008). The every-root measurement is ours, pinned in{' '}
          <Math>{'\\texttt{rationalPHConstruction.test.ts}'}</Math>.
        </Cite>
      </>
    ),
    notes:
      'THE VERDICT IS THE SLIDE, and in a pricing deck it has to be delivered as one: the condition '
      + 'taxes BLIND SEARCH, not the family. Give the bad news first and let it sit for a beat -- '
      + '"pick and hope" never works, which really is worth knowing -- then take it apart. A room that '
      + 'leaves with only the first half will conclude rational PH is impractical, which is wrong. '
      + 'THE QUANTIFIER IS THE WHOLE TRICK, and it is easy to get backwards. Their statement fixes the '
      + 'INPUT pair and asks what comes out; it says nothing about how many rational PH curves exist. '
      + 'The singular-matrix analogy lands it in one sentence and I would use it every time: measure '
      + 'zero, and no shortage of them. '
      + 'THE MULTIPLICITY TABLE IS THE MORE USEFUL FACT and it is what the word "generic" hides. At '
      + 'multiplicity three or more the condition is AUTOMATIC (Lemma 4.4), which is why their own '
      + 'Example 5.1 takes alpha = t cubed. Rarity is a property of the DENOMINATOR-S ROOT STRUCTURE, '
      + 'not of rational PH curves, and a builder chooses that structure. '
      + 'THE MOBIUS ROUTE IS OLDER THAN THE THEOREM -- it is reference [1] of the paper being cited, '
      + 'from 2008. Do not present it as a discovery. What is measured here is only that it overshoots: '
      + 'the theorem asks for the dependence at ONE root and inversion delivers it at ALL of them, for '
      + 'a structural reason (w is the squared distance to the centre, so its roots are where the '
      + 'complexified curve meets the isotropic cone there). Quote the control alongside the number or '
      + 'neither means anything. '
      + 'IF ASKED WHETHER THIS CONTRADICTS "MOST SPINORS FAIL": no, and the answer is the quantifier '
      + 'again. A Mobius image is a manufactured input pair. It lands in the codimension-2 set every '
      + 'time BY CONSTRUCTION, which is exactly what a systematic method is supposed to do.',
  },

  // ---------------------------------------------------------------------------
  // 12 — the complete answer exists, and it is not ours
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="LIT" />
        <h2>The family is completely known</h2>
        <p>
          Before going further it is worth saying plainly what the state of the subject is, because
          everything so far has been a <em>construction</em>, and a construction is easily mistaken
          for a theory. Rational PH space curves were characterised <strong>completely</strong> in
          2022:
        </p>
        <p
          style={{
            textAlign: 'center',
            margin: '0.5em 0 0.7em',
            padding: '0.4em 0.8em',
            borderTop: '1px solid rgba(0,0,0,0.15)',
            borderBottom: '1px solid rgba(0,0,0,0.15)',
          }}
        >
          <strong>Bahar Kalkan, Daniel F. Scharler, Hans-Peter Schröcker, Zbyněk Šír</strong>
          <br />
          <em>Rational Framing Motions and Spatial Rational Pythagorean Hodograph Curves</em>
          <br />
          <span style={{ opacity: 0.75 }}>Computer Aided Geometric Design (2022) · arXiv:2111.04600</span>
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '0.55em 1.1em',
            margin: '0.7em 0',
            alignItems: 'baseline',
            fontSize: '0.86em',
          }}
        >
          <span style={{ opacity: 0.6, whiteSpace: 'nowrap' }}>Thm 3.5</span>
          <span>
            every rational PH curve <em>admits</em> a framing motion with{' '}
            <Math>{'\\mathcal{A}'}</Math> in normal form — so the normalisation below excludes nothing.
          </span>
          <span style={{ opacity: 0.6, whiteSpace: 'nowrap' }}>Thm 3.6</span>
          <span>
            rational PH curves are <strong>precisely</strong> the trajectories of the origin under{' '}
            <Math>{'\\mathcal{C} = (\\alpha + \\varepsilon \\mathbf{b})\\,\\mathcal{A}'}</Math> subject to a{' '}
            <em>linear</em> condition, of which one form is
          </span>
          <span />
          <Math display>
            {"\\alpha\\mathbf{b}' - \\alpha'\\mathbf{b} \\;=\\; \\mu\\,\\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}, \\qquad \\mu \\in \\mathbb{R}[t]"}
          </Math>
          <span style={{ opacity: 0.6, whiteSpace: 'nowrap' }}>Thm 4.6</span>
          <span>
            and a truly rational (non-polynomial) solution exists <em>iff</em> the Taylor coefficients
            of <Math>{"\\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}"}</Math> at a root of{' '}
            <Math>{'\\alpha'}</Math> are <strong>linearly dependent</strong> — every multiplicity, real
            roots and complex ones alike.
          </span>
        </div>
        <p>
          That middle line is our Wronskian: <Math>{'\\alpha'}</Math> is the denominator,{' '}
          <Math>{'\\mathbf{b}'}</Math> the numerator up to a factor, and{' '}
          <Math>{'\\mu'}</Math> the real factor we set to 1 without saying so.
        </p>
        <p style={{ textAlign: 'center', margin: '0.7em 0' }}>
          <strong style={{ fontSize: '1.12em' }}>
            So the set of rational PH curves is not an open question. It is known, and it is theirs.
          </strong>
        </p>
        <p>
          What this deck has built is a <strong>chart</strong> on that set — a way of writing members
          down — and it is honest about being partial. It assumes:
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '0.25em 1.2em',
            justifyContent: 'start',
            margin: '0.5em 0 0.5em 1.2em',
            fontSize: '0.78em',
            lineHeight: 1.5,
            alignItems: 'baseline',
          }}
        >
          <span>real poles</span>
          <span style={{ opacity: 0.7 }}>the strip needs conjugation to commute with evaluation</span>
          <span>simple roots</span>
          <span style={{ opacity: 0.7 }}>the expansion assumed multiplicity one</span>
          <span>
            <Math>{'\\sigma(r) \\neq 0'}</Math>
          </span>
          <span style={{ opacity: 0.7 }}>
            we divided by <Math>{'\\mathcal{A}(r)'}</Math>
          </span>
          <span>
            <Math>{'\\mu = 1'}</Math>
          </span>
          <span style={{ opacity: 0.7 }}>the primitive case, taken silently</span>
        </div>
        <p>
          And the circle fails the third. Its poles are complex and{' '}
          <Math>{'\\sigma(\\pm i) = 0'}</Math> — the spinor is <em>isotropic</em> there, of vanishing
          norm without being zero, so there is nothing to divide by. Nothing is wrong with the circle:
          it satisfies Theorem 4.6 exactly, as it must. <strong>The chart simply does not reach it.</strong>
        </p>
        <p style={{ opacity: 0.65 }}>
          What <em>is</em> open, in the authors&rsquo; own words: the <em>dimension and basis</em> of
          the solution space (&ldquo;will not be formally treated&rdquo;), denominators with{' '}
          <em>several linear factors</em> (&ldquo;a topic of future research&rdquo;), and{' '}
          <em>interpolation</em>, which they note the theory enables and do not carry out. The
          characterisation is finished; its <strong>structure</strong> is not.
        </p>
        <Cite>
          Theorems 3.5, 3.6 and 4.6; the open items are their §3 preamble and Rem. 5.2. Two of the
          four authors are also on Altavilla–Schröcker–Šír–Vršek (2026) on PH-preserving mappings, so
          this is one active line rather than an isolated paper.
        </Cite>
      </>
    ),
    notes:
      'THIS SLIDE EXISTS TO PREVENT ONE MISREADING, and it is the misreading a deck like this invites: '
      + 'that the construction it has been building IS the state of the art. It is not. The set of '
      + 'rational PH space curves was completely characterised in 2022, and a listener who leaves '
      + 'without knowing that has been misled by omission. '
      + 'THE NORMALISATION IS NOT A RESTRICTION, and Thm 3.5 is what says so -- every rational PH '
      + 'curve ADMITS the normal form. Worth stating, because "precisely, subject to A being reduced" '
      + 'sounds like a hypothesis that might exclude things, and it does not. '
      + 'THE MIDDLE LINE IS OUR WRONSKIAN IN THEIR NOTATION. alpha is w, b is p up to a factor, and mu '
      + 'is the real factor this deck set to 1 without ever saying so. Point at it: the deck has been '
      + 'working inside their Theorem 3.6 the whole time without the room being told. '
      + 'THE FOUR ASSUMPTIONS ARE LISTED BECAUSE A CHART SHOULD DECLARE ITS DOMAIN. Real poles, simple '
      + 'roots, sigma nonzero at the pole, mu = 1. Each has a one-line reason and none of them is a '
      + 'defect -- they are the price of a parametrisation that needs no solver. '
      + 'AND THE CIRCLE FAILS ONE, WHICH IS THE HONEST WAY TO END. sigma vanishes at its complex '
      + 'poles: the spinor is ISOTROPIC there -- vanishing norm, NOT zero -- so A(r) is not '
      + 'invertible. Say isotropic and not "vanishes", because an earlier version of this material '
      + 'claimed the spinor vanished, which was a packing artefact and false; the circle satisfies '
      + 'Thm 4.6 perfectly. Over REAL poles the two notions coincide, which is why the distinction '
      + 'never arose until a complex pole turned up. '
      + 'AND IF ASKED ABOUT COMPLEXIFYING THE CHART: the natural frame is H tensor C, isomorphic to '
      + 'the two-by-two complex matrices, where quaternion conjugation is the adjugate and sigma is '
      + 'the DETERMINANT. Then the single condition is det A(r) nonzero and real and complex poles are '
      + 'on equal footing; lambda becomes complex, conjugate-paired across a root pair, so the '
      + 'parameter count is unchanged. That is standard complexification, not a new idea, and Kalkan '
      + 'et al. already handle complex roots -- it would extend OUR chart, not the theory.',
  },

  // ---------------------------------------------------------------------------
  // 13 — the return side opens: the poles come with handles
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="MEAS" />
        <h2>What the poles hand back</h2>
        <p>
          The cost column is closed. Here is the return, and it is not what you would guess: the poles
          you were <em>forced</em> to buy turn out to come with <strong>handles</strong>. Two per pole,
          and both have geometric names rather than being coordinates on a solution set.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '0.5em 1.2em',
            margin: '0.7em 0',
            alignItems: 'baseline',
          }}
        >
          <span style={{ fontSize: '1.1em' }}>
            <Math>{'\\lambda'}</Math>
          </span>
          <span>
            the frame&rsquo;s <strong>twist rate</strong> at the pole. With{' '}
            <Math>{'q = \\mathcal{A}/|\\mathcal{A}|'}</Math> the angular velocity there is exactly{' '}
            <Math>{'\\omega = 2\\lambda\\,\\mathbf{e}_1'}</Math> — purely about the tangent, so it spins
            the frame and leaves the curve&rsquo;s direction alone.
          </span>
          <span style={{ fontSize: '1.1em' }}>
            <Math>{'r'}</Math>
          </span>
          <span>
            where the curve <strong>passes through infinity</strong>, since{' '}
            <Math>{'w(r) = 0'}</Math>. Move it and you move that passage.
          </span>
        </div>
        <p>
          You have already watched the first one work: at <Math>{'\\lambda = 0'}</Math> the worked
          example was <em>planar</em>, and turning the dial to <Math>{'\\lambda = 1'}</Math> lifted it
          out of the plane.
        </p>
        <p>
          And the arithmetic is more generous than one dial per pole. Hold the dials, prescribe a
          start point and a start tangent, and the freedom left over is
        </p>
        <Math display>{"4n - 4m - 3 \\qquad (\\deg \\mathcal{A} = n, \\;\\; m \\text{ poles})"}</Math>
        <p>
          which is <strong>exactly one</strong> when <Math>{'n = m + 1'}</Math>. Read that off:
        </p>
        <p style={{ textAlign: 'center', margin: '0.7em 0' }}>
          <strong style={{ fontSize: '1.12em' }}>
            each extra pole buys one more <em>degree of curve</em> and one more <em>twist dial</em> —
            and the sweepable freedom stays one-dimensional.
          </strong>
        </p>
        <p>
          Measured at <Math>{'m = 1, 2, 3'}</Math>, which is curve degrees 4, 5 and 6. Nothing is lost
          on the way up: the loop you can walk is still a loop.
        </p>
        <p style={{ opacity: 0.65 }}>
          There is no analogue of this in the polynomial family. There the only freedom is{' '}
          <em>phase</em>, so a higher degree simply gives a bigger torus — more angles, no new kind of
          handle, and nothing with a name.
        </p>
        <Cite>
          What <Math>{'\\lambda'}</Math> and <Math>{'r'}</Math> mean is{' '}
          <Math>{'\\texttt{FOUNDATIONS F16}'}</Math>; the count and the{' '}
          <Math>{'n = m+1'}</Math> relation are <Math>{'\\texttt{F17}'}</Math>, measured in{' '}
          <Math>{'\\texttt{multiPoleLoop.test.ts}'}</Math> and implemented in{' '}
          <Math>{'\\texttt{rationalPHMultiPoleSpatial}'}</Math>.
        </Cite>
      </>
    ),
    notes:
      'THIS OPENS THE RETURN COLUMN and the framing matters: the poles were a COST, forced on you by '
      + 'wanting weights, and it now turns out they came with handles. That reversal is the slide. Do '
      + 'not present the dials as a feature somebody designed -- they are what was left over. '
      + 'THE NAMES ARE THE POINT, NOT THE COUNT. A parameter with a geometric meaning is worth more to '
      + 'a builder than three without one. lambda is the twist rate, and the precise statement is that '
      + 'the angular velocity at the pole is 2 lambda times e_1 -- PURELY TANGENTIAL, so it rotates '
      + 'the frame about the tangent and leaves the tangent itself alone. r is where the curve meets '
      + 'infinity. Both are things you can point at on a screen. '
      + 'AND THE ROOM HAS ALREADY SEEN LAMBDA WORK, which is why the worked example was built before '
      + 'this slide rather than after. lambda = 0 planar, lambda = 1 spatial. Refer back to it '
      + 'explicitly; an abstract dial two slides after a concrete one is a much easier sell. '
      + 'THE FORMULA IS DELIBERATELY ONE LINE AND THE CONSEQUENCE IS BOLD. This deck has been concrete '
      + 'throughout -- shapes, weights, hand-checkable conditions -- and a dimension count is a '
      + 'different register. State 4n - 4m - 3, say what it equals at n = m + 1, and move to the '
      + 'consequence. The derivation belongs to the companion deck and to F17. '
      + 'THE CLOSING CONTRAST IS THE HONEST GAIN. In the polynomial family more degree means a bigger '
      + 'torus: more angles, no new KIND of freedom, nothing with a name. Here an extra pole buys a '
      + 'degree AND a named dial while the loop stays one-dimensional. That is a structural difference, '
      + 'not just a bigger number, and it is the strongest thing in the return column.',
  },

  // ---------------------------------------------------------------------------
  // (built out of order — belongs at the END, after the ledger)
  // Two ways in: the strategy for reaching the rest of the family
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['LIT', 'OPEN']} />
        <h2>Two ways in</h2>
        <p>
          The family is completely characterised and our construction is a patch on it. So how do you
          reach the rest? Two attacks, and they are <em>complementary</em> — neither is the
          other&rsquo;s fallback.
        </p>

        <p style={{ marginBottom: '0.15em' }}>
          <strong>From the inside — more charts.</strong>
        </p>
        <p style={{ marginLeft: '1.2em' }}>
          What a chart buys is not coverage, it is that <strong>PH costs nothing inside it</strong>:
          nothing to enforce, no residual to drift, and <em>coordinates</em>, so you can drag along it.
          Measured in this repository: <Math>{'0.016'}</Math> ms per member from the chart, against{' '}
          <Math>{'19'}</Math> s for a solver to find one feasible seed at conformal degree 6.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gap: '0.3em 1.1em',
            margin: '0.5em 0 0.5em 1.2em',
            fontSize: '0.76em',
            lineHeight: 1.45,
            alignItems: 'baseline',
          }}
        >
          <span>complex poles</span>
          <span style={{ opacity: 0.8 }}>
            complexify to <Math>{'\\mathbb{H}\\otimes\\mathbb{C} \\cong M_2(\\mathbb{C})'}</Math>, where{' '}
            <Math>{'\\sigma = \\det\\mathcal{A}'}</Math>; the solve is already{' '}
            <Math>{'\\mathbb{C}'}</Math>-linear, <Math>{'\\lambda'}</Math> becomes complex and
            conjugate-paired, count unchanged
          </span>
          <span>
            <strong>low</strong>
          </span>
          <span>
            <Math>{'\\mu \\neq 1'}</Math>
          </span>
          <span style={{ opacity: 0.8 }}>one more linear unknown, as in their own system</span>
          <span>
            <strong>low</strong>
          </span>
          <span>multiplicity ≥ 2</span>
          <span style={{ opacity: 0.8 }}>
            re-derive the expansion; the conditions are already known, and at multiplicity 3 or more
            there is <em>no</em> condition left
          </span>
          <span>
            <strong>medium</strong>
          </span>
          <span>
            <Math>{'\\sigma(r) = 0'}</Math>
          </span>
          <span style={{ opacity: 0.8 }}>
            <Math>{'\\mathcal{A}(r)'}</Math> is <strong>rank one</strong> — nonzero but singular. The
            strip has nothing to divide by, and it does not degrade, it <em>stops</em>
          </span>
          <span>
            <strong>structural</strong>
          </span>
        </div>
        <p style={{ marginLeft: '1.2em', opacity: 0.75 }}>
          The last row is where charts should give way rather than be contorted — and it is not a
          corner: the whole conformal family lives there, since{' '}
          <Math>{'\\sigma = h\\,w'}</Math> vanishes at every pole.
        </p>

        <p style={{ marginBottom: '0.15em', marginTop: '0.5em' }}>
          <strong>From the outside — and it is not a nonlinear problem.</strong>
        </p>
        <p style={{ marginLeft: '1.2em' }}>
          Prescribe <Math>{'\\alpha'}</Math> and <Math>{'\\mathcal{A}'}</Math> and the defining
          conditions are <strong>linear</strong> in what remains, so the solution set is a{' '}
          <em>vector space</em>. No Newton, no seed hunt. But two traps, and both are about knowing
          when you have failed:
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '0.3em 1.1em',
            margin: '0.4em 0 0.4em 1.2em',
            fontSize: '0.78em',
            lineHeight: 1.45,
            alignItems: 'baseline',
          }}
        >
          <span>
            <strong>1</strong>
          </span>
          <span>
            the system is <em>always</em> solvable — trivial solutions{' '}
            <Math>{'\\mathbf{b} = \\alpha\\mathbf{b}_0'}</Math> exist for any input. So{' '}
            <strong>a zero residual proves nothing.</strong>
          </span>
          <span>
            <strong>2</strong>
          </span>
          <span>
            the acceptance test is not convergence, it is <em>divisibility</em>: the solution is a{' '}
            <strong>polynomial</strong> curve precisely when <Math>{'\\alpha'}</Math> divides{' '}
            <Math>{'\\mathbf{b}'}</Math>.
          </span>
        </div>
        <p style={{ marginLeft: '1.2em' }}>
          So the outside <em>also</em> needs the characterisation — Thm 4.6 says which{' '}
          <Math>{'(\\alpha, \\mathcal{A})'}</Math> admit non-polynomial solutions at all. Without it you
          solve successfully, every time, and get polynomials.
        </p>
        <p style={{ textAlign: 'center', margin: '0.6em 0' }}>
          <strong style={{ fontSize: '1.1em' }}>
            The hard part is the same on both sides: landing on the condition. A chart lands on it by
            construction; a solver has to search for it.
          </strong>
        </p>
        <p>
          Which is why they feed each other. Charts hand the solver feasible seeds in microseconds.
          The solver, run where no chart reaches, locates a missing stratum <em>empirically</em>. And
          inside a chart the optimiser carries <strong>no PH constraints at all</strong> — only the
          objectives you actually wanted.
        </p>
        <p style={{ opacity: 0.65 }}>
          First move: complexify. It is the cheap one, and it brings <em>bounded</em> curves into
          closed form for the first time. Not the circle — the next slide says why not.
        </p>
        <Cite>
          Linearity of the defining conditions, the trivial solutions, and the divisibility test are
          Kalkan et al. (2022), Thm. 3.6 conditions (7)–(9) and Lemma 4.1; the multiplicity cases are
          Lemmas 4.3–4.4 and Thm. 4.6. The two timings are this repository&rsquo;s:{' '}
          <Math>{'\\texttt{rationalPHOnePoleSpatial}'}</Math> and{' '}
          <Math>{'\\texttt{conformalPHCurve.findMember}'}</Math>.
        </Cite>
      </>
    ),
    notes:
      'THE SLIDE EXISTS BECAUSE "WE HAVE A CHART, THE THEORY IS COMPLETE" IS A DEAD END WITHOUT A '
      + 'PLAN. This is the plan, and its shape is the point: two attacks that are complementary '
      + 'rather than one being a fallback for the other. '
      + 'THE STRONGEST ARGUMENT FOR CHARTS IS NOT COVERAGE. It is that PH costs nothing inside one -- '
      + 'no constraint to enforce, no residual to drift, and COORDINATES, which is what lets you drag. '
      + 'The two timings make it concrete: 0.016 ms from the chart against 19 s for a solver to find '
      + 'one seed. That is a factor of a million on the step everyone treats as setup. '
      + 'AND THE DEEPEST ONE, worth saying slowly: inside a chart an optimiser carries NO PH '
      + 'CONSTRAINTS. It carries only the objectives you actually wanted -- interpolation data, '
      + 'fairness, a curvature bound. The long-running solver-quality problem in this repository is '
      + 'about navigating a constrained landscape; in chart coordinates most of that landscape is not '
      + 'there. That is a different problem, not a faster one. '
      + 'THE OUTSIDE IS LINEAR AND THAT SURPRISES PEOPLE. Prescribe alpha and A and the conditions are '
      + 'linear in the rest; the solution family is a VECTOR SPACE, which their introduction '
      + 'advertises as the practical benefit. Nobody needs Newton for feasibility. '
      + 'BUT THE TWO TRAPS ARE THE USEFUL PART OF THIS SLIDE, because they invert the usual habit. '
      + 'The system is ALWAYS solvable -- trivial solutions b = alpha b_0 exist for any input -- so a '
      + 'residual of zero is not evidence of anything. And the acceptance test is DIVISIBILITY, not '
      + 'convergence: Lemma 4.1 says the solution is a polynomial curve exactly when alpha divides b. '
      + 'An engineer who checks residuals and ships will ship polynomial curves and never know. '
      + 'SO BOTH SIDES NEED THE CHARACTERISATION, which is the sentence to land. The chart satisfies '
      + 'the condition BY CONSTRUCTION; the solver must SEARCH for it. Same difficulty, two places to '
      + 'put it. '
      + 'THE sigma = 0 ROW IS NOT A CORNER CASE and the faded line says so: the entire conformal '
      + 'family lives there, because sigma = h w vanishes at every pole. That is the family the '
      + 'interactive figures in the sibling deck are built on, so "charts give way here" is a '
      + 'statement about real code, not about a hypothetical stratum.',
  },

  // ---------------------------------------------------------------------------
  // (built out of order — follows "Two ways in")
  // The first move executed: complex poles, and the shape it does NOT reach
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['MEAS']} />
        <h2>The first move, made</h2>
        <p>
          A real pole is not a technicality. It is a place the curve <em>runs to infinity</em> — so a
          chart built on real poles cannot produce a bounded curve at all. Push the poles off the real
          axis, in conjugate pairs, and <Math>{'w'}</Math> has no real root: it is positive on the
          whole line, and so is the curve finite there.
        </p>
        <p>
          The move costs almost nothing, because the equation does not change shape. Complexify the
          quaternions — <Math>{'\\mathbb{H}\\otimes\\mathbb{C} \\cong M_2(\\mathbb{C})'}</Math>, in
          which <Math>{'\\sigma = \\det\\mathcal{A}'}</Math> — and the same line reads
        </p>
        <p style={{ textAlign: 'center' }}>
          <Math display>{'\\mathcal{A}\'(r) \\;=\\; \\mathcal{A}(r)\\,(\\Sigma + \\lambda i)'}</Math>
        </p>
        <p>
          with complex entries and a <strong>complex</strong> <Math>{'\\lambda'}</Math>. The dial that
          was a twist rate on the real line becomes a twist rate <em>and</em> a scale.
        </p>

        <p style={{ marginBottom: '0.15em' }}>
          <strong>What is measured, not assumed.</strong>
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '0.3em 1.1em',
            margin: '0.35em 0 0.5em 1.2em',
            fontSize: '0.78em',
            lineHeight: 1.45,
            alignItems: 'baseline',
          }}
        >
          <span>one <Math>{'\\lambda'}</Math>, two poles</span>
          <span style={{ opacity: 0.85 }}>
            imposing the condition at <Math>{'r'}</Math> satisfies it at{' '}
            <Math>{'r^{*}'}</Math> automatically, with <Math>{'\\lambda^{*}'}</Math>. Not arranged —
            the residual at the partner pole is <Math>{'6{\\cdot}10^{-16}'}</Math> without anything
            being asked of it.
          </span>
          <span>the count survives</span>
          <span style={{ opacity: 0.85 }}>
            a pair costs <strong>eight</strong> real conditions, which is still{' '}
            <strong>four per pole</strong>. So{' '}
            <Math>{'4(n+1) - 4\\,\\#\\text{poles}'}</Math> is unchanged — pinned at{' '}
            <Math>{'12 - 8 = 4'}</Math> and <Math>{'20 - 16 = 4'}</Math>.
          </span>
          <span>the solve stays linear</span>
          <span style={{ opacity: 0.85 }}>
            the condition matrix is <Math>{'\\mathbb{C}'}</Math>-linear in the spinor; a member comes
            from a null space, not a search.
          </span>
          <span>and it is bounded</span>
          <span style={{ opacity: 0.85 }}>
            <Math>{'w > 0'}</Math> on all of <Math>{'\\mathbb{R}'}</Math>, curve and speed finite far
            outside the design interval, PH exact to <Math>{'10^{-12}'}</Math>.
          </span>
        </div>

        <p style={{ marginTop: '0.6em' }}>
          And the shape the deck is named after is <em>still</em> outside. The circle&rsquo;s poles are
          a conjugate pair — <Math>{'w = 1 + t^2'}</Math>, poles at <Math>{'\\pm i'}</Math> — so it sits
          exactly where this move was supposed to reach. It does not, and the reason is the row we
          already flagged as structural:
        </p>
        <p style={{ textAlign: 'center' }}>
          <Math display>
            {'\\sigma(i)^2 = \\langle N(i), N(i)\\rangle = (-4i)^2 + 4^2 = 0 , \\qquad N(i) \\neq 0'}
          </Math>
        </p>
        <p>
          The pole is not a bad pole. <Math>{'N(i)'}</Math> is a perfectly good nonzero vector — it is{' '}
          <strong>isotropic</strong>, null for the form the light cone is built from. So{' '}
          <Math>{'\\mathcal{A}(i)'}</Math> is rank one, and the strip has nothing to divide by.
        </p>
        <p style={{ textAlign: 'center', margin: '0.6em 0' }}>
          <strong style={{ fontSize: '1.05em' }}>
            Complexifying moved the wall. It did not remove it — and the circle is on the far side of
            the one that is left.
          </strong>
        </p>
        <Cite>
          Measured in this repository:{' '}
          <Math>{'\\texttt{rationalPHComplexPoleSpatial}'}</Math> and its test. The characterisation
          that covers the excluded stratum is Kalkan, Scharler, Schröcker &amp; Šír (2022), Thm. 3.6.
        </Cite>
      </>
    ),
    notes:
      'THIS SLIDE IS THE PREVIOUS SLIDE\'S PROMISE, CASHED. "Complexify" was listed as the cheap first '
      + 'move; this is what came back, with numbers, so the strategy slide is not left as a wish list. '
      + 'LEAD WITH WHY A REAL POLE IS FATAL, because it is easy to hear "complex poles" as generality '
      + 'for its own sake. It is not: a real pole IS the point where the curve escapes to infinity, so '
      + 'the real-pole chart cannot make a bounded curve -- not "is bad at it", CANNOT. Off the real '
      + 'axis, w has no real root, and boundedness is free. '
      + 'THE ELEGANT PART IS THAT NOTHING CHANGES SHAPE. Same equation, complex entries, because '
      + 'H tensor C is just 2x2 complex matrices and sigma is the determinant. Say that slowly -- it is '
      + 'the reason the move was cheap. '
      + 'THE MEASUREMENT WORTH PAUSING ON is the first row. One complex lambda handles BOTH poles: you '
      + 'impose the condition at r and it holds at r-conjugate to 6e-16 without being asked. That is '
      + 'the conjugate symmetry of a real-coefficient problem doing the work, and it is why the '
      + 'condition count per pole did not go up. '
      + 'THEN THE TURN, and do not soften it: the circle is STILL out. Its poles are +/- i, a conjugate '
      + 'pair, precisely the case this move was built for -- and it fails anyway, on sigma(i) = 0. '
      + 'N(i) is NOT zero. It is a nonzero ISOTROPIC vector, null for the light-cone form. This '
      + 'distinction cost a retracted commit earlier in this work; state it carefully. '
      + 'THE HONEST SUMMARY IS "the wall moved, it did not vanish", and that is a better result than a '
      + 'clean win would have been, because it says exactly which stratum to attack next.',
  },
]

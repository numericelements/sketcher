// ============================================================================
// TWO POINTS OR A CIRCLE — what changes when a PH curve leaves the plane.
//
// WHAT THIS DECK IS. A LITERATURE REVIEW, and it says so on the title slide. Not a conference talk,
// not a contribution: scaffolding toward one. The material is Choi et al. 2002 (the spin cover),
// Farouki-Sakkalis / Choi-Han-Farouki (the quaternion form), and the classical no-log analysis of
// rational PH; what is ours is a handful of measurements, and those carry the tag that says so.
//
// THE THESIS, one sentence: the spinor carries one degree of freedom the cone cannot see, that
// degree of freedom is two points in the plane and a circle in space, and every difference between
// planar and spatial PH in this deck is that one difference cashed out.
//
// THE TAG ON EVERY SLIDE is the device. docs/THE_LATTICE.md established the discipline for a doc;
// this deck puts it on screen. A reader can see at a glance what is settled, what is somebody
// else's theorem, what was measured here, and where the edge is. The OPEN slides are the point of
// the deck, not an embarrassment: they are the contribution map.
//
// NO FIGURES, for now and by choice. A review deck can be equations and text, exactly like the
// hodograph-light-cone deck, which means this is not gated on r3f, the WebGL context budget, or any
// 3D figure work. Figures come later, where they earn their place. The one that would earn it first
// is slide 3's Hopf fiber, and the LAST slide's lambda slider.
//
// THE DECK AS BUILT — 16 slides, complete 2026-08-11. Slide numbers are the array's.
//
//   1  title, with the tag legend
//
//   ACT I — the cone, and the one thing it cannot see
//     2  speed as a coordinate: gamma = (c-prime, sigma) on the cone          [LIT]
//     3  the plane: square the radius, double the angle                       [LIT]
//     4  space: square the radius, rotate i                                   [LIT]
//     5  the count: dim H minus dim cone = 1, so something is invisible       [THM]
//     6  two points, or a circle -- the title, earned                         [LIT]
//     7  one atom, one chain, both counts (sandwich, circle, torus)           [LIT] [MEAS]
//
//   ACT II — and what happens when you divide
//     8  the cone survives, the integration does not                          [LIT]
//     9  what has to vanish -- the residue condition derived                  [LIT] [MEAS]
//    10  everything about the spinor cancels: V i + i V* = 2 Sigma i          [LIT] [MEAS]
//    11  grow, spin, but do not tilt -- the title, earned a second time       [LIT] [MEAS]
//    12  the nonlinearity is one number wide                                  [LIT] [MEAS]
//    13  three, because space is three-dimensional (the kernel/cokernel ledger) [LIT] [MEAS]
//    14  rare -- but not scarce: the multiplicity table, and the Mobius way in  [LIT] [MEAS]
//
//    15  what you actually get: a degree-4 rational Bezier, measured           [MEAS]
//
//    16  where the edge actually is (rewritten after the literature check)    [OPEN]
//    17  build the exceptional case -- the figure that does not exist yet     [OPEN]
//    18  references, marked read / not read
//
// THE TITLE CLOSES ITS OWN LOOP. The contrast lands on slide 5; on slide 10 the FREE parameter in
// the residue condition turns out to be that same circle. Slide 10 must say so in those words --
// it is the only place the deck earns its name twice, and it costs one sentence.
//
// RELATION TO hodograph-light-cone. Deliberate overlap, Eric's call: that deck's thesis is SYMMETRY
// (which chart survives which group, Mobius/Laguerre/Lie); this one's is CONSTRUCTION (how the
// family is shaped and how a member is built). Same objects, different question.
//
// ⚠ AND THIS DECK IS NOT THE ONLY THING MOVING. A freeze on hodograph-light-cone was proposed here
// and never held -- it could not, because another session is working the same branch and the same
// material. As of 2026-08-11 that session has landed FOUNDATIONS F16 and F17, core/
// rationalPHOnePoleSpatial.ts and rationalPHMultiPoleSpatial.ts, and the ph-interpolation deck's
// rational figures (RationalPHLoopFigure, RationalPHTwoPoleFigure). Those SUPERSEDE parts of Act II
// here, which was written against F14 alone:
//   · F16 — lambda is a TWIST RATE and r is where the curve meets INFINITY. Slide 12 names the free
//     direction as the gauge and stops; F16 says what it does.
//   · F16 — with one pole the condition is simply N'(r) = 0, and it is obviously necessary since
//     N = p'(t-r) - p gives N' = p''(t-r). Slide 10's partial fractions are the hard route.
//   · F17 — F14's "quadratic, so elimination" was too pessimistic; the admissible spinors form a
//     linear subspace of dimension 4(n+1) - 4m. Slide 13 still repeats the pessimism.
//   · The C1 Hermite count on slide 16 says "no slider". True for TWELVE prescribed conditions;
//     with six the fiber is a closed loop (onePoleLoop.test.ts). The family has three freedoms: the
//     compact Hopf phase, plus lambda and r.
// RECONCILE BEFORE PRESENTING. Read docs/CURVATURE_FOUNDATIONS.md F16 and F17 first.
//
// NOTATION, SETTLED — the quaternion conjugate is a STAR, A*, never a bar. Two reasons and both
// matter. (a) It is what the code says: src/core/quaternion.ts writes r-prime = A i A* fourteen
// times, docs/PH_SANDWICH_CHAIN.md writes X u X* = v, and Farouki writes the same. A deck whose job
// is to send people to that code must not use a notation the code does not. (b) KaTeX renders \bar q
// as an ACCENT construct -- a two-row vlist with the macron skewed left:-0.1667em to correct for the
// italic slant -- so on a descender letter such as q the bar sits visibly up and to the left of the
// glyph. The star is a plain superscript with no accent metrics at all. Absolute-value bars in
// |A|^2 are untouched; those are a norm, not a conjugate.
//
// OPEN BUG, FRAMEWORK-LEVEL — EVERY TALL KaTeX VLIST RIDES UP. Confirmed 2026-08-11 on three
// independent constructs: an accent (bar-q looked "higher than q"), a fraction (denominator left
// sitting on the surrounding baseline with bar and numerator stacked above), and a summation with
// limits (the big sigma floating a line above its own equals sign). Different macros with one
// thing in common: KaTeX builds them all as display:inline-table (.vlist-t) whose FIRST row carries
// the visible content and whose SECOND row (.vlist-t2 plus a 2px .vlist-s cell) carries the depth.
// An inline-table takes its baseline from the first row, so if anything in the cascade collapses
// that second row the whole construct rides up by roughly its own depth. That also explains why
// sub- and superscripts look fine: the error is proportional to the construct's height, so a small
// vlist is off by a hair and a fraction or a summation is off by half a line.
//   KaTeX sets .katex{line-height:1.2} itself and reveal-overrides.css has no KaTeX rules at all,
// so the interference comes from elsewhere; Tailwind preflight is the standing suspect, since these
// pages load both. NOT FIXED, because the cascade cannot be resolved from source — only from a
// rendered page with computed styles. A guessed rule in framework CSS is worse than the bug.
//
// WORKAROUND IN FORCE FOR THIS DECK — avoid TALL vlists, which costs nothing at slide scale:
//   fraction        -> a solidus, a/b                 (reads better projected anyway)
//   sum, prod       -> NO limits on the operator at all; put the range beside it as plain text.
//                      (Prefixing textstyle is NOT enough: it only moves the limit from under the
//                      operator to a subscript on it, and that subscript is itself a vlist, which
//                      then rides up to superscript height. Measured on screen 2026-08-11.)
//   underbrace      -> a caption line under the display
//   boxed           -> surrounding emphasis
//   conjugate bar   -> the star, A*, which the codebase uses anyway (see NOTATION above)
// Still present and unavoidable: ORDINARY SUB- AND SUPERSCRIPTS are vlists too, so they ride up as
// well — by a hair, since the error scales with the construct's height, and r_k reads fine on
// screen while a big operator's subscript does not. That is why this can only be worked around and
// not solved in the payloads: subscripts cannot be written out of this material. sqrt (3 uses) and
// hat (5) are likewise short vlists, unreported so far; if either ever looks wrong it is this bug.
//
// SOURCE-LEVEL DIAGNOSIS IS EXHAUSTED. reveal-overrides.css has no KaTeX rules; katex.min.css sets
// its own line-height 1.2; reveal.css's one universal rule is scoped to .reveal .r-stack > * which
// this deck never uses; and the KaTeX fonts clearly load, so the stylesheet is being applied. The
// remaining candidates all need COMPUTED styles on a .vlist-s cell in a live page. Next step, when
// somebody has a browser open: check whether .katex .vlist > span keeps position:relative and
// whether the .vlist-t2 depth row has non-zero height. Do not guess a rule into framework CSS.
//
// ✅ THE LITERATURE CHECK — DONE 2026-08-11, and the verdict is that ACT II IS THEIRS.
//
//   Kalkan, Scharler, Schröcker & Šír, "Rational Framing Motions and Spatial Rational Pythagorean
//   Hodograph Curves", CAGD (2022); arXiv 2111.04600. It was already in ~/Documents/Carlotta as
//   "2022 Rational PH.pdf", unread. Two of its authors are also on the 2026 PH-preserving paper the
//   hodograph-light-cone deck cites, so this is the same group, one paper over.
//
//   SAME OBJECTS: A in H[t], the sandwich A i A*, a real denominator alpha (our w), and their eq (4)
//     r = integral of lambda * A i A* dt. Their §1 states our exact problem and calls a complete
//     characterization "a very difficult problem".
//   SAME WRONSKIAN: Thm 3.6 condition (9) is alpha b' - alpha' b = mu * A i A*, which is our
//     p'w - p w' = N with mu the real factor this deck flags as the primitive-case caveat.
//   THE GAUGE IS THEIRS AS A NORMALISATION: Def 3.4, "reduced with respect to i" = no right factors
//     in the sub-algebra generated by 1 and i. That sub-algebra is our span{1,i}; slide 6's circle
//     is their normalisation, divided out by hand.
//   THE CONDITION IS THEIRS AND MORE GENERAL: Thm 4.6 — a truly rational PH curve exists iff the
//     Taylor coefficients of A i A* at a root of alpha are LINEARLY DEPENDENT. At a simple root that
//     is {N(r), N'(r)} dependent; ours pins the constant only because we take the primitive case.
//   AND THEY COVER WHAT SLIDE 14 CLAIMED WAS OPEN: multiplicity n = 2 (Lemma 4.3), n >= 3 (Lemma
//     4.4, where it is ALWAYS satisfiable), complex roots (Thm 4.6 + Lemma 4.5), and the geometry
//     (Rem 4.7: cusp of the tangent indicatrix, or inflection with one more derivative). The
//     n-hat-prime = 0 corollary of slide 11 is their cusp condition, so it needs no test of ours.
//   AND THE HEADLINE WE LACKED: "for a generic choice of A and alpha only polynomial solutions can
//     be obtained" — truly rational spatial PH curves are EXCEPTIONAL. Now on slide 13.
//
//   WHAT SURVIVES AS OURS: the ROUTE only. They go via framing motions, dual quaternions and a
//   triangular system in a beta-adic basis; we go partial fractions -> logarithmic derivative ->
//   V i + i V* = 2 Sigma i. More elementary, and exposition is what a review deck is for.
//   ACTIONS TAKEN: slides 10-13 tagged LIT + MEAS (now VERIFIED, not "believed"); every borrowed
//   statement carries a Cite line; slide 14 rewritten around what the authors THEMSELVES leave open.
//   STILL OWED: read Altavilla-Schrocker-Sir-Vrsek 2026 (in the folder as "2026 A complete
//   characterization of PH preserving mappings") for its residue conditions on Psi, and the 2019
//   survey for the rational-PH state of the art.
//
// ⚠ SUPERSEDED — kept for the record. Raised by Eric 2026-08-11, and the same reflex that
// cost docs/THE_LATTICE.md most of its page: assuming that because we derived something here, it is
// ours. Status, established by reading the repo rather than the sources:
//   KNOWN, and the hodograph-light-cone deck says so on its slide 23 — the obstruction is classical
//     and appears as "residue conditions on Psi" in Altavilla-Schrocker-Sir-Vrsek 2026, with
//     dPhi/dz = Psi^2. That is the COMPLEX/planar form, and it is F13's condition.
//   NEVER CHECKED, anywhere in this repository — the SPATIAL version. The quaternion residue
//     condition, the reduction to V i + i V* = 2 Sigma i, its solution V = Sigma + lambda i, the
//     gauge-plane reading, and the kernel/cokernel ledger. FOUNDATIONS F14 records them and the
//     other deck's notes call them "F13 one dimension up" — with NO citation, because nobody looked.
//   ESTIMATE: low odds this is new mathematics. Rational PH space curves are a studied subject, the
//     quaternion form is the standard tool, the derivation is a few lines, and the 2026 paper
//     explicitly covers n >= 3 so it plausibly carries the spatial conditions already. The
//     PACKAGING may well be ours, and that needs no tag in a review deck.
//   ACTION TAKEN: slides 10-13 retagged from MEAS alone to LIT + MEAS. THE_LATTICE defines LIT as
//     "believed to be in the literature — a pointer to check, not a fact yet", which is exactly this
//     state. MEAS alone reads as a novelty claim the deck cannot support.
//   ACTION OWED: read Altavilla-Schrocker-Sir-Vrsek 2026 (arXiv 2512.19587) for whether its residue
//     conditions extend to n >= 3, and Farouki on rational PH space curves. Until then no slide may
//     imply the spatial condition is ours.
//
// PARKED — deferred on purpose, none of it changes any mathematics:
//   1. The `Tag` component lives here. If a second deck adopts the convention, move it to
//      framework/ and give it real CSS instead of the inline styles below.
//   2. No outline slide, same reason as the other deck: an outline written before the content is a
//      promise that gets broken.
//   3. The ENDING (slide 14) is the one beat that depends on work not yet done -- the one-pole
//      rational spatial PH figure. Slides 1-13 are writable today; decide 14 when we reach it.
//   4. Slide 1's motivating list (arc length / offsets / sampling / frames) may be one line instead
//      of five for an audience that already knows why PH exists. Open question, deliberately.
// ============================================================================
import type { ReactNode } from 'react'
import type { SlideDefinition } from '../framework/types'
import Math from '../framework/Math'

/**
 * The status tag every content slide carries. The convention is docs/THE_LATTICE.md's:
 * a slide with no tag is a slide somebody wanted to be true.
 */
type Status = 'LIT' | 'THM' | 'MEAS' | 'OPEN'

const TAG_COLOR: Record<Status, string> = {
  LIT: '#8aa8c8',
  THM: '#8fc99b',
  MEAS: '#d8b978',
  OPEN: '#d89a9a',
}

function Tag({ status }: { status: Status | Status[] }): ReactNode {
  const all = Array.isArray(status) ? status : [status]
  return (
    <span
      style={{
        position: 'absolute',
        top: '0.6em',
        right: '0.9em',
        display: 'flex',
        gap: '0.4em',
        fontSize: '0.42em',
        letterSpacing: '0.18em',
        fontWeight: 400,
        opacity: 0.75,
      }}
    >
      {all.map((s) => (
        <span
          key={s}
          style={{
            color: TAG_COLOR[s],
            border: `1px solid ${TAG_COLOR[s]}`,
            borderRadius: '0.25em',
            padding: '0.15em 0.5em',
          }}
        >
          {s}
        </span>
      ))}
    </span>
  )
}

/**
 * The source line at the foot of a slide. A review deck that names a fact and not its owner is the
 * failure mode docs/THE_LATTICE.md section 5 warns about, so every borrowed statement carries one.
 */
function Cite({ children }: { children: ReactNode }): ReactNode {
  return (
    <div
      style={{
        position: 'absolute',
        left: '1.4em',
        right: '1.4em',
        bottom: '0.5em',
        fontSize: '0.38em',
        lineHeight: 1.4,
        opacity: 0.55,
        textAlign: 'left',
        fontStyle: 'italic',
      }}
    >
      {children}
    </div>
  )
}

export const slides: SlideDefinition[] = [
  // ---------------------------------------------------------------------------
  // 1 — title
  // ---------------------------------------------------------------------------
  {
    type: 'title',
    content: (
      <>
        <h1>Two Points or a Circle</h1>
        <div className="subtitle">
          What changes when a Pythagorean-hodograph curve leaves the plane
        </div>
        <div className="author">Eric Demers</div>
        <div className="event">Polytechnique Montréal</div>
        <div className="event note" style={{ marginTop: '1.6em' }}>
          A reading of the literature. Every claim carries its status.
        </div>
        <div
          style={{
            marginTop: '1.2em',
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '0.35em 1em',
            fontSize: '0.42em',
            lineHeight: 1.5,
            maxWidth: '26em',
            marginLeft: 'auto',
            marginRight: 'auto',
            textAlign: 'left',
            opacity: 0.8,
          }}
        >
          <span style={{ color: TAG_COLOR.LIT, letterSpacing: '0.14em' }}>LIT</span>
          <span>published elsewhere — a pointer, cited</span>
          <span style={{ color: TAG_COLOR.THM, letterSpacing: '0.14em' }}>THM</span>
          <span>proved, ours or cited precisely</span>
          <span style={{ color: TAG_COLOR.MEAS, letterSpacing: '0.14em' }}>MEAS</span>
          <span>measured here, with a pinning test named</span>
          <span style={{ color: TAG_COLOR.OPEN, letterSpacing: '0.14em' }}>OPEN</span>
          <span>not known to us</span>
        </div>
      </>
    ),
    notes:
      'THE LEGEND GOES ON THE TITLE SLIDE, NOT LATER. If the tag is the deck-s device the reader has '
      + 'to meet it before slide 1, not discover it on slide 6. It also sets expectations honestly in '
      + 'four lines: this is a map of known territory and you will be told where the edges are. '
      + 'THE TITLE IS A QUESTION THE ROOM CAN HOLD. It is answered on slide 5 and paid out again on '
      + 'slide 10, where the free parameter in the rational condition turns out to BE that circle. '
      + 'Say the title out loud once and do not explain it -- three slides from now it explains itself. '
      + 'WHAT THE TITLE DELIBERATELY DOES NOT PROMISE: a theorem. This deck is exposition and '
      + 'scaffolding. The one line to have ready if asked what is new here: the measurements, and the '
      + 'editor they serve.',
  },

  // ---------------------------------------------------------------------------
  // 2 — the opening move: refuse to treat sigma as derived
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="LIT" />
        <h2>Stop computing the speed. Carry it.</h2>
        <p>Every question you actually want to ask a curve goes through its speed.</p>
        <Math display>{"\\sigma(t) \\;=\\; \\|\\mathbf{c}'(t)\\|"}</Math>
        <p>
          Arc length <Math>{'\\int \\sigma\\,dt'}</Math>. Offsets{' '}
          <Math>{'\\mathbf{c} \\pm d\\,\\hat{\\mathbf{n}}'}</Math>. Equal-arc-length sampling.
          Rotation-minimizing frames.{' '}
          <strong>
            Every one of them needs <Math>{'\\sigma'}</Math> — and <Math>{'\\sigma'}</Math> is the one
            thing about a polynomial curve that is not itself polynomial.
          </strong>
        </p>
        <p>
          Make it polynomial and they part into two easy families: what <em>divides</em> by{' '}
          <Math>{'\\sigma'}</Math> turns <strong>rational</strong> — offsets, the unit tangent{' '}
          <Math>{"\\hat{\\mathbf{t}} = \\mathbf{c}'/\\sigma"}</Math>, curvature, the frames — and what{' '}
          <em>integrates</em> <Math>{'\\sigma'}</Math> turns <strong>exact</strong>, so arc length is a
          polynomial and equal spacing is a root-find rather than a quadrature.
        </p>
        <p>
          The Pythagorean-hodograph condition is: <em>make <Math>{'\\sigma'}</Math> a polynomial.</em>{' '}
          That is normally read as a constraint on <Math>{"\\mathbf{c}'"}</Math>. Take the other reading.
        </p>
        <p style={{ textAlign: 'center', margin: '0.8em 0' }}>
          <strong style={{ fontSize: '1.15em' }}>
            Stop computing <Math>{'\\sigma'}</Math>. Carry it.
          </strong>
        </p>
        <p>Adjoin the speed as a coordinate — one new vector, carrying both:</p>
        <Math display>
          {"\\boldsymbol{\\gamma}(t) \\;=\\; \\bigl(\\mathbf{c}'(t),\\; \\sigma(t)\\bigr)"}
        </Math>
        <p>
          Measure it with the form the condition already wrote — <Math>{'n'}</Math> plus signs and one
          minus, a <strong>Minkowski</strong> form of signature <Math>{'(n,1)'}</Math>:
        </p>
        <Math display>
          {"\\langle \\boldsymbol{\\gamma}, \\boldsymbol{\\gamma}\\rangle \\;:=\\; \\|\\mathbf{c}'\\|^2 - \\sigma^2"}
        </Math>
        <p>
          In such a form a <em>nonzero</em> vector can have zero length. Those are called{' '}
          <strong>null</strong>, and they form the <strong>light cone</strong>. The PH condition is
          exactly <Math>{'\\langle \\boldsymbol{\\gamma}, \\boldsymbol{\\gamma}\\rangle = 0'}</Math>.
        </p>
        <p style={{ marginTop: '0.6em' }}>
          <strong>
            PH <Math>{'\\iff'}</Math> <Math>{'\\boldsymbol{\\gamma}'}</Math> is a{' '}
            <em>polynomial</em> curve on the light cone.
          </strong>
        </p>
        <p style={{ opacity: 0.65 }}>
          Every regular curve has this lift and it costs nothing — membership on the cone is free. PH
          asks whether the lift can be taken <strong>algebraically</strong>.{' '}
          <strong>
            The cone is not a model we chose. It is the PH equation, written without eliminating{' '}
            <Math>{'\\sigma'}</Math>.
          </strong>
        </p>
        <p style={{ marginTop: '0.8em' }}>
          The rest of the talk is one question: <strong>what parametrizes that cone?</strong> The answer
          is different in the plane and in space, and that difference is the talk.
        </p>
        <Cite>
          Choi, Han, Lee, Roh &amp; Wee, <em>Clifford Algebra, Spin Representation, and Rational
          Parameterization of Curves and Surfaces</em>, Adv. Comput. Math. (2002).
        </Cite>
      </>
    ),
    notes:
      'PROVENANCE, and say it: the reframing is Choi, Han, Lee, Roh, Wee 2002, Clifford Algebra, Spin '
      + 'Representation, and Rational Parameterization of Curves and Surfaces, Adv. Comput. Math. In '
      + 'the Laguerre form it is Krasauskas 2017. The cone reading is NOT new. What this slide claims '
      + 'is only that it is the CHEAP reading -- it makes the next three slides forced rather than '
      + 'clever. '
      + 'THE EMPHASIS TO HOLD: membership on the cone is free, PH is about the lift being ALGEBRAIC. If '
      + 'that lands, slide 4-s dimension count lands by itself and needs no defending. '
      + 'n IS UNSPECIFIED ON PURPOSE. The whole thesis is that ONE thing changes between n = 2 and '
      + 'n = 3. Writing the (n,1) statement once and specialising twice makes that structural; doing '
      + 'the plane first and generalising later makes it look like an afterthought. '
      + 'WHAT I AM NOT SAYING, and would resist if asked. (a) MOBIUS: a signature invites O(n,1) and '
      + 'that is a different talk -- here the cone is a place to BUILD, not a group to act by. (b) The '
      + 'identity for gamma-prime, which is curvature times sigma squared, so gamma-prime goes '
      + 'lightlike exactly at inflections. True, lovely, and a distraction from this arc; it belongs to '
      + 'the hodograph-light-cone deck. '
      + 'THE MOTIVATING LIST SAYS "NEEDS SIGMA", NOT "IS RATIONAL IN c AND SIGMA", AND THE DIFFERENCE '
      + 'IS NOT PEDANTRY. A first draft claimed all four items were rational in c and sigma; that is '
      + 'true of offsets, the unit tangent and curvature, and FALSE of the other three. Arc length is '
      + 'an INTEGRAL of sigma, not a rational expression in it -- what PH buys there is closed-form '
      + 'integrability. Equal-arc-length sampling INVERTS the arc-length function, which is root-'
      + 'finding either way; what PH buys is that the function being inverted is a polynomial. And a '
      + 'rotation-minimizing frame is defined by an ODE, not by any formula in c and sigma -- it is '
      + 'rational only for RRMF curves and then via the SPINOR. Promising rationality there would '
      + 'promise something this deck cannot deliver, and somebody in a PH room would know it. '
      + 'The corrected split -- what DIVIDES by sigma turns rational, what INTEGRATES sigma turns '
      + 'exact -- is also better motivation, because the four items become four different ways sigma '
      + 'intrudes rather than four synonyms. That is what earns the list its space on the slide; under '
      + 'the old framing it should have been cut to one line. '
      + 'THREE NOTATION DECISIONS, ALL MADE AGAINST A FIRST DRAFT AND NONE TO BE QUIETLY UNDONE. '
      + '(a) NO GENERIC BILINEAR FORM. The draft introduced the pairing on a generic vector (v,s). Two '
      + 'faults: s is the universal arc-length letter and this very slide writes the arc-length '
      + 'integral four lines above, and the deck NEVER uses the form on anything except gamma -- so it '
      + 'was abstraction that cost a beat and bought nothing. The pairing is defined on gamma itself. '
      + 'If a later slide genuinely needs the form on another vector, introduce it THERE. '
      + '(b) THE FORM GETS ITS OWN DISPLAY LINE. In the draft it was jammed after the R^(n,1) on the '
      + 'same line, so the definition read as subordinate to the thing it defines and the word null '
      + 'arrived before its meaning. Typography, not ordering. '
      + '(c) NULL IS GLOSSED IN ONE SENTENCE, because the first reading of "gamma is null" is '
      + '"gamma is zero" -- measured on a real reader. The gloss also does a second job: a nonzero '
      + 'vector of zero length is WHY there is a cone at all, so the cone becomes a consequence rather '
      + 'than imported vocabulary. '
      + 'THE CLOSING LINE WAS AN APOLOGY AND IS NOW A CLAIM. It read "nothing has been done here except '
      + 'refusing to treat sigma as derived" -- defensive, and "derived" collides with the derivatives '
      + 'all over this slide. It now says the cone is not a model we chose, it is the PH equation '
      + 'written without ELIMINATING sigma. Eliminating is also the precise verb: squaring and '
      + 'substituting is literally elimination. '
      + 'IF ASKED WHY SIGNATURE (n,1) RATHER THAN ANY QUADRIC: because sigma is at least zero is a real '
      + 'constraint -- only the UPPER half of the cone is ever occupied -- and the Minkowski form is '
      + 'what makes the speed a coordinate rather than an arbitrary auxiliary variable. '
      + 'DO NOT SAY "FUTURE CONE", although it is the standard name for that upper half. This deck has '
      + 'no clock in it: sigma is a speed we chose to carry, not a time, and "future" borrows a '
      + 'physical reading we decline everywhere else. "The half with sigma at least zero" is also '
      + 'strictly more informative, since it carries its own reason. Same trade as glossing R^(n,1) as '
      + 'n plus signs and one minus. '
      + 'MEASURED, if the number is wanted: core/__tests__/hodographLightCone.test.ts pins gamma on the '
      + 'cone for planar spinors of degree 1, 2, 3 and quaternion spinors of degree 1, 2, worst 1.0e-15 '
      + 'relative. Tagged LIT and not MEAS because the STATEMENT is the literature-s; only our '
      + 'arithmetic is ours.',
  },

  // ---------------------------------------------------------------------------
  // 3 — the plane: square the radius, double the angle
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="LIT" />
        <h2>The plane: square the radius, double the angle</h2>
        <p>
          The last slide ended on a question — <em>what parametrizes the cone?</em> In the plane it was
          answered before anyone asked. The cone is <Math>{'x^2 + y^2 = s^2'}</Math>, and its
          polynomial solutions are the <strong>Pythagorean triples</strong>:
        </p>
        <Math display>{"(x,\\,y,\\,s) \\;=\\; \\bigl(u^2 - v^2,\\;\\; 2uv,\\;\\; u^2 + v^2\\bigr)"}</Math>
        <p>
          Identify the plane with <Math>{'\\mathbb{C}'}</Math> <em>itself</em> — the hodograph vector{' '}
          <Math>{'(x,y)'}</Math> is the number <Math>{'x + iy'}</Math>, and{' '}
          <Math>{'\\mathbb{R}^2'}</Math> is <strong>all</strong> of <Math>{'\\mathbb{C}'}</Math>. Then
          with <Math>{'w = u + iv'}</Math> the first two coordinates collapse into one, and the third
          is not a further condition — it is <em>forced</em>, since <Math>{'|w^2| = |w|^2'}</Math>:
        </p>
        <Math display>{"x + iy \\;=\\; w^2, \\qquad s \\;=\\; |w|^2"}</Math>
        <p>
          So the PH condition in the plane is the representation everybody already knows — reached not
          by inspiration but by asking what parametrizes a cone:
        </p>
        <Math display>{"\\mathbf{c}' \\;=\\; w^2, \\qquad \\sigma \\;=\\; |w|^2"}</Math>
        <p>
          And in polar form it stops being algebra. Put <Math>{'w = r\\,e^{i\\varphi}'}</Math>:
        </p>
        <Math display>
          {"w^2 = r^2 e^{2i\\varphi}, \\qquad |w|^2 = r^2 \\qquad \\Longrightarrow \\qquad \\bigl(r^2\\cos 2\\varphi,\\; r^2 \\sin 2\\varphi,\\; r^2\\bigr)"}
        </Math>
        <p style={{ textAlign: 'center', margin: '0.7em 0' }}>
          <strong style={{ fontSize: '1.15em' }}>Square the radius. Double the angle.</strong>
        </p>
        <p>
          Distance from the axis <Math>{'= r^2 =\\;'}</Math> height: the map lands on the{' '}
          <Math>{'45^\\circ'}</Math> cone and covers all of it. And exactly one other{' '}
          <Math>{'w'}</Math> lands on each point —
        </p>
        <Math display>{"(-w)^2 = w^2, \\qquad |-w|^2 = |w|^2"}</Math>
        <p style={{ marginTop: '0.6em' }}>
          <strong>
            Forget <Math>{'w'}</Math> and keep the curve, and what you have lost is a{' '}
            <em>sign</em>. Two points. That is the answer in the plane.
          </strong>
        </p>
        <p style={{ opacity: 0.65 }}>
          Exactly, pointwise: the map is onto the <em>upper</em> half of the cone — the half with{' '}
          <Math>{'\\sigma \\geq 0'}</Math>, a speed having no choice about that — and two-to-one away
          from the apex. For a <em>curve</em> the general polynomial solution carries a real factor,{' '}
          <Math>{"\\mathbf{c}' = h\\,w^2"}</Math> — you may also slide along the ray. The perfect
          square is the <strong>primitive</strong> case, and it is the case everyone means.
        </p>
        <Cite>
          Complex model for planar PH curves: Farouki &amp; Sakkalis. The real factor{' '}
          <Math>{'h'}</Math> in the general polynomial Pythagorean triple: Kubota (1972).
        </Cite>
      </>
    ),
    notes:
      'THE THESIS OF THE SLIDE, and it is a rhetorical one: c-prime = w-squared is the representation '
      + 'this room already knows, and the slide gives it back to them as something FORCED. It is the '
      + 'payoff of slide 1-s closing question. Nobody had to be clever; Euclid parametrised this cone '
      + 'and the complex form is his triple written in one letter. If the room feels "of course", the '
      + 'slide has worked -- the same feeling slide 1 was aiming at, and for the same reason. '
      + 'SAY THE IDENTIFICATION OUT LOUD: R^2 IS ALL OF C. It is not hygiene, it is SETUP. A draft went '
      + 'straight from the vector (x,y) to the number x + iy and then wrote c-prime = w-squared, '
      + 'equating a vector with a complex number, without ever saying the plane was being identified '
      + 'with C. That silence costs slide 3 its central move: "R^3 is only the IMAGINARY part of H" is '
      + 'a CONTRAST, and with nothing to contrast against it arrives from nowhere. One clause here '
      + 'buys the pivot there. '
      + 'AND THE COUNT IS TWO, NOT ONE. The same draft said the three coordinates "become one" and '
      + 'then referred to the third coordinate two clauses later. They become TWO -- one complex '
      + 'equation packaging x and y, plus s -- and the point worth making is not that the count '
      + 'shrank but that s is FORCED rather than imposed. '
      + 'PROVENANCE. The triples are Euclid. The complex representation for PLANAR PH curves is '
      + 'Farouki and Sakkalis 1990. The real factor h is Kubota 1972 -- the general polynomial '
      + 'Pythagorean triple is h times the primitive one. Tagged LIT, all of it. '
      + 'THE h FACTOR STAYS, AND HERE IS WHY IT IS NOT PEDANTRY. Pointwise, every null vector is a '
      + 'perfect square and the map is exactly two-to-one; that statement is clean and needs no '
      + 'caveat. For a CURVE it is false as stated -- c-prime need only be h times a square, and a '
      + 'square factor can move between h and w, so even the decomposition is not unique in general. '
      + 'Claiming "every planar PH hodograph is w-squared" is the same shape of error as the first '
      + 'draft-s "all of these are rational in c and sigma", and somebody in a PH room knows Kubota. '
      + 'The honest version costs one faded sentence and buys the geometric remark that h is a slide '
      + 'ALONG THE RAY, which keeps the polar picture intact rather than damaging it. '
      + 'SAY THE POLAR SENTENCE SLOWLY AND DO NOT ELABORATE IT. Square the radius, double the angle. '
      + 'It is four words, it is the whole map, and slide 3 changes exactly one of them. Anything '
      + 'added here is something the room has to hold while the contrast arrives. '
      + 'WHAT I AM NOT SAYING. Do NOT preview space. The title of the deck is a question and this '
      + 'slide answers half of it; the phrase "that is the answer in the plane" is the only signal '
      + 'allowed, and it is enough. Resist also: the double angle as the reason PH curves cannot '
      + 'inflect below a degree, Mobius, and the tangent-turns-twice figure from the interpolation '
      + 'deck. All good, none of them this slide. '
      + 'ANSWER IF ASKED, AND ONLY IF ASKED -- WHAT IS THE APEX? It is sigma = 0, hence w = 0, hence '
      + 'c-prime = 0: a CUSP. The tip of the cone is exactly where a PH curve cusps, and that same '
      + 'sigma = 0 is the only true wall on a drag at the end of this deck. Genuinely good, and '
      + 'genuinely not this slide -- slide 3 needs the room holding "two points" and nothing else. '
      + 'MEASURED, if a number is wanted: core/__tests__/hodographLightCone.test.ts pins gamma on the '
      + 'cone for planar spinors of degree 1, 2, 3. Still LIT -- the statement is classical and only '
      + 'the arithmetic is ours.',
  },

  // ---------------------------------------------------------------------------
  // 4 — space: square the radius, rotate i
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="LIT" />
        <h2>
          Space: square the radius, rotate <Math>{'\\mathbf{i}'}</Math>
        </h2>
        <p>
          One dimension up. The cone is <Math>{"\\|\\mathbf{v}\\|^2 = s^2"}</Math> with{' '}
          <Math>{"\\mathbf{v} \\in \\mathbb{R}^3"}</Math> — a cone over the <em>sphere</em>{' '}
          <Math>{'S^2'}</Math> rather than over a circle. Same question: what parametrizes it?
        </p>
        <p>
          What made <Math>{'\\mathbb{C}'}</Math> work was a <strong>multiplicative norm</strong>, and
          there is exactly one more of those to reach for:{' '}
          <Math>{'\\mathbb{H}'}</Math>, Hamilton&apos;s quaternions — four real dimensions, with{' '}
          <Math>{"|\\mathcal{A}|^2 = \\mathcal{A}\\mathcal{A}^{*}"}</Math> a sum of four squares.
          But here the identification breaks. In the plane <Math>{'\\mathbb{R}^2'}</Math> was{' '}
          <em>all</em> of <Math>{'\\mathbb{C}'}</Math>; <Math>{'\\mathbb{R}^3'}</Math> is only the{' '}
          <em>imaginary</em> part of <Math>{'\\mathbb{H}'}</Math>. The map must land there — and{' '}
          <Math>{'\\mathcal{A}^2'}</Math> does not. The <strong>sandwich</strong> does:
        </p>
        <Math display>
          {"\\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*} \\;\\in\\; \\mathbb{R}^3, \\qquad \\bigl\\|\\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}\\bigr\\| \\;=\\; |\\mathcal{A}|\\,|\\mathbf{i}|\\,|\\mathcal{A}^{*}| \\;=\\; |\\mathcal{A}|^2"}
        </Math>
        <p>
          Null again, and the second coordinate forced again — for the same reason as in the plane, the
          norm being multiplicative. So the PH condition in space is:
        </p>
        <Math display>
          {"\\mathbf{c}' \\;=\\; \\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}, \\qquad \\sigma \\;=\\; |\\mathcal{A}|^2"}
        </Math>
        <p>
          Now polar, exactly as before. Split off the length:{' '}
          <Math>{'\\mathcal{A} = R\\,q'}</Math> with <Math>{'R = |\\mathcal{A}| \\geq 0'}</Math> and{' '}
          <Math>{'q'}</Math> a <em>unit</em> quaternion:
        </p>
        <Math display>
          {"\\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*} = R^2\\,\\bigl(q\\,\\mathbf{i}\\,q^{*}\\bigr), \\qquad |\\mathcal{A}|^2 = R^2 \\qquad \\Longrightarrow \\qquad \\bigl(R^2\\,\\hat{\\mathbf{n}},\\; R^2\\bigr)"}
        </Math>
        <p>
          and <Math>{'\\hat{\\mathbf{n}} = q\\,\\mathbf{i}\\,q^{*}'}</Math> is nothing but{' '}
          <Math>{'q'}</Math> <strong>rotating the fixed vector</strong>{' '}
          <Math>{'\\mathbf{i}'}</Math>. That is what unit quaternions do. A point of{' '}
          <Math>{'S^2'}</Math>.
        </p>
        <p style={{ textAlign: 'center', margin: '0.7em 0' }}>
          <strong style={{ fontSize: '1.15em' }}>
            Square the radius. Rotate <Math>{'\\mathbf{i}'}</Math>.
          </strong>
        </p>
        <p>
          One word changed. And the <em>doubling</em> did not go away either:{' '}
          <Math>{'q = \\cos(\\theta/2) + \\sin(\\theta/2)\\,\\hat{\\mathbf{u}}'}</Math> turns by{' '}
          <Math>{'\\theta/2'}</Math> in order to rotate by <Math>{'\\theta'}</Math>. The quaternion{' '}
          <strong>half-angle</strong> is the plane&apos;s double angle in its usual clothes.
        </p>
        <p style={{ marginTop: '0.6em' }}>
          <strong>
            In the plane, exactly two <Math>{'w'}</Math> gave each point of the cone. How many{' '}
            <Math>{'\\mathcal{A}'}</Math> give each point here?
          </strong>{' '}
          Do not read it off the picture. <em>Count it.</em>
        </p>
        <p style={{ opacity: 0.65 }}>
          Pointwise the map is again onto the upper half — take{' '}
          <Math>{'\\mathcal{A} = \\sqrt{s}\\,q'}</Math> for any <Math>{'q'}</Math> carrying{' '}
          <Math>{'\\mathbf{i}'}</Math> to <Math>{"\\mathbf{v}/\\|\\mathbf{v}\\|"}</Math> — and at the
          level of <em>curves</em> the same primitive-versus-general caveat applies as in the plane.
        </p>
        <Cite>
          Quaternion and Hopf-map representations of spatial PH curves: Farouki &amp; Sakkalis (1994);
          Choi, Lee &amp; Moon (2002) — both built on the characterisation of Pythagorean polynomial
          quadruples.
        </Cite>
      </>
    ),
    notes:
      'PROVENANCE. The quaternion form for spatial PH curves is Farouki and Sakkalis 1994, and '
      + 'Choi, Lee, Moon 2002; core/quaternion.ts carries both in its header. The Clifford-algebra '
      + 'unification that makes it inevitable rather than lucky is Choi et al. 2002 again -- same '
      + 'paper as slide 1. All LIT. '
      + 'DO NOT SAY THE WORD HOPF ON THIS SLIDE. It is the right name and it arrives on slide 5. '
      + 'Saying it here hands the room the answer to the question this slide just asked, because '
      + 'anyone who knows the word knows the fibers are circles. The whole three-slide structure -- '
      + 'ASK here, COUNT on slide 4, EXHIBIT on slide 5 -- exists so that the circle is PREDICTED by '
      + 'arithmetic before it is seen. Do not collapse those three into one. '
      + 'WHY THE SANDWICH AND NOT A SQUARE -- expect this question, it is the good one. R^3 is the '
      + 'imaginary part of H, so the map has to produce an imaginary quaternion, and A-squared does '
      + 'not. Check it directly: the conjugate of A i A-bar is A times (minus i) times A-bar, which is '
      + 'minus itself, so it is purely imaginary. In the plane no sandwich was needed because R^2 IS '
      + 'all of C. And note the plane is not secretly a sandwich either: w i w-bar is just i times '
      + '|w| squared, degenerate, because C commutes. The two maps genuinely differ. '
      + 'IF PUSHED ON THE UNIFICATION, and only then: both are the spinor-to-null-vector map of the '
      + 'relevant Clifford algebra. Writing H as a right C-vector space, A = u + jv with (u,v) in C^2, '
      + 'the null vector is the rank-one Hermitian matrix built from that pair, and the plane is the '
      + 'same construction over R instead of C. That is the honest common statement, and it is a '
      + 'digression on this slide -- the room does not need it to follow the arithmetic. '
      + 'THE HALF-ANGLE REMARK IS FOR THE ENGINEERS IN THE ROOM. Anyone who has used quaternions has '
      + 'been bitten by the half-angle and thinks of it as an implementation quirk. It is not: it is '
      + 'the SAME quadratic spinor-to-vector map that doubled the angle in the plane. That lands well '
      + 'and it costs one sentence. '
      + 'TO CHECK BEFORE THIS IS STATED MORE STRONGLY: the exact curve-level statement in space -- '
      + 'whether every spatial PH hodograph is A i A-bar times a real polynomial factor, on the nose, '
      + 'with the same primitive case as Kubota gives in the plane. The pointwise claim on this slide '
      + 'is verified and exact; the curve-level one is deliberately worded as "the same caveat '
      + 'applies" and should be pinned against Farouki before it hardens into an assertion.',
  },

  // ---------------------------------------------------------------------------
  // 5 — the count, before the answer
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="THM" />
        <h2>The count, before the answer</h2>
        <p>
          Neither slide said how many spinors sit above a point of the cone. We do not need a new idea
          to find out — the polar forms already on screen answer it by bookkeeping.
        </p>
        <p>
          <strong>In the plane.</strong> <Math>{'w = r\\,e^{i\\varphi}'}</Math> is a radius and a point
          of the circle <Math>{'S^1'}</Math>. Its image is a height and a direction:
        </p>
        <Math display>
          {"r \\;\\mapsto\\; r^2 \\quad (1 \\to 1), \\qquad\\quad e^{i\\varphi} \\;\\mapsto\\; e^{2i\\varphi} \\quad (S^1 \\to S^1,\\;\\; 1 \\to 1)"}
        </Math>
        <p>
          <strong>In space.</strong> <Math>{'\\mathcal{A} = R\\,q'}</Math> is a radius and a{' '}
          <em>unit quaternion</em> — and the unit quaternions are the 3-sphere{' '}
          <Math>{'S^3'}</Math>. <strong>Three</strong> parameters, not one. Its image is a height and
          a direction on <Math>{'S^2'}</Math>:
        </p>
        <Math display>
          {"R \\;\\mapsto\\; R^2 \\quad (1 \\to 1), \\qquad\\quad q \\;\\mapsto\\; q\\,\\mathbf{i}\\,q^{*} \\quad (S^3 \\to S^2,\\;\\; 3 \\to 2)"}
        </Math>
        <table
          style={{
            margin: '1em auto',
            borderCollapse: 'collapse',
            fontSize: '0.62em',
            lineHeight: 1.6,
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.25)', opacity: 0.7 }}>
              <th style={{ padding: '0.3em 1.1em', textAlign: 'left' }} />
              <th style={{ padding: '0.3em 1.1em' }}>spinor</th>
              <th style={{ padding: '0.3em 1.1em' }}>dim</th>
              <th style={{ padding: '0.3em 1.1em' }}>cone</th>
              <th style={{ padding: '0.3em 1.1em' }}>dim</th>
              <th style={{ padding: '0.3em 1.1em' }}>left over</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.3em 1.1em', textAlign: 'left', opacity: 0.7 }}>plane</td>
              <td style={{ padding: '0.3em 1.1em', textAlign: 'center' }}>
                <Math>{'\\mathbb{C}'}</Math>
              </td>
              <td style={{ padding: '0.3em 1.1em', textAlign: 'center' }}>2</td>
              <td style={{ padding: '0.3em 1.1em', textAlign: 'center' }}>
                <Math>{'\\mathbb{R}^{2,1}'}</Math>
              </td>
              <td style={{ padding: '0.3em 1.1em', textAlign: 'center' }}>2</td>
              <td style={{ padding: '0.3em 1.1em', textAlign: 'center' }}>
                <strong>0</strong>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '0.3em 1.1em', textAlign: 'left', opacity: 0.7 }}>space</td>
              <td style={{ padding: '0.3em 1.1em', textAlign: 'center' }}>
                <Math>{'\\mathbb{H}'}</Math>
              </td>
              <td style={{ padding: '0.3em 1.1em', textAlign: 'center' }}>4</td>
              <td style={{ padding: '0.3em 1.1em', textAlign: 'center' }}>
                <Math>{'\\mathbb{R}^{3,1}'}</Math>
              </td>
              <td style={{ padding: '0.3em 1.1em', textAlign: 'center' }}>3</td>
              <td style={{ padding: '0.3em 1.1em', textAlign: 'center' }}>
                <strong>1</strong>
              </td>
            </tr>
          </tbody>
        </table>
        <p style={{ textAlign: 'center', margin: '0.7em 0' }}>
          <strong style={{ fontSize: '1.15em' }}>One parameter has nowhere to go.</strong>
        </p>
        <p>
          Not because we failed to find it — because there is <em>no room for it in the target</em>.
          Over every point of the cone sits a whole one-parameter family of{' '}
          <Math>{'\\mathcal{A}'}</Math>, and the arithmetic knows this before we know what the family
          is.
        </p>
        <p style={{ marginTop: '0.6em' }}>
          <strong>
            And the question has changed kind. In the plane, &ldquo;how many?&rdquo; has a number for
            an answer. In space it does not — the answer is a <em>shape</em>.
          </strong>
        </p>
        <p style={{ opacity: 0.65 }}>
          What the count does <em>not</em> settle: one-dimensional, yes — but a line? an arc? closed or
          open? That distinction decides everything later, and no amount of counting will give it. (And
          at the apex <Math>{'\\mathcal{A} = 0'}</Math> the map degenerates and the count fails — the
          same apex where the curve cusps.)
        </p>
      </>
    ),
    notes:
      'THE ONE ERROR THIS SLIDE EXISTS TO PREVENT: that a unit quaternion is "one parameter, like '
      + 'e^{i phi}". It is THREE -- the unit quaternions are S^3, a 3-sphere sitting in the four real '
      + 'dimensions of H. Everything on this slide turns on that, and it is exactly the slip a room '
      + 'makes when it reads A = R q as the obvious analogue of w = r e^{i phi}. Put weight on the '
      + 'word THREE. If only one sentence survives, it is that S^3 has three parameters and S^2 has '
      + 'two, so the map q to q i q-bar cannot be injective. '
      + 'WHAT IS ACTUALLY PROVED, since the tag says THM. At a regular point the fiber of a smooth '
      + 'surjection has dimension (domain minus image) = 4 - 3 = 1. That is all, and it is elementary. '
      + 'THM here means PROVED, not DEEP -- do not oversell it. Its force is that it is unavoidable: '
      + 'the conclusion arrives from counting alone, with no knowledge of what the fiber is. '
      + 'NO NEW MACHINERY, AND SAY SO. The count is read straight off the polar forms already on '
      + 'slides 2 and 3. That is worth pointing at: the audience has had the answer on screen for two '
      + 'slides without being asked to look at it. '
      + 'WHAT THE COUNT CANNOT DO, and the faded line says it: dimension one does not mean CIRCLE. A '
      + 'line, a half-open arc and a circle are all one-dimensional. The difference is COMPACTNESS, '
      + 'and compactness is precisely what makes the interpolation families close up into a circle and '
      + 'a torus later rather than running off to infinity. So slide 5 is not decoration -- it '
      + 'supplies the one thing the counting provably cannot. State the gap here so slide 5 is '
      + 'answering a question rather than adding a fact. '
      + 'STILL DO NOT SAY HOPF. One more slide. '
      + 'THE APEX AGAIN. A = 0 gives c-prime = 0, a cusp, and it is the one point where the rank drops '
      + 'and the count is void. Same apex as slide 2, and the same sigma = 0 that is the only true '
      + 'wall on a drag at the end of the deck. Mention only if asked. '
      + 'FIRST TABLE IN THE DECK, inline-styled, same choice the hodograph-light-cone deck made. If a '
      + 'second table appears, extract a class rather than copying this one.',
  },

  // ---------------------------------------------------------------------------
  // 6 — the payoff: two points, or a circle
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="LIT" />
        <h2>Two points, or a circle</h2>
        <p>The missing parameter, written down. Multiply the spinor by a unit complex number:</p>
        <Math display>
          {"\\bigl(\\mathcal{A}e^{i\\theta}\\bigr)\\,\\mathbf{i}\\,\\bigl(\\mathcal{A}e^{i\\theta}\\bigr)^{*} \\;=\\; \\mathcal{A}\\,e^{i\\theta}\\,\\mathbf{i}\\,e^{-i\\theta}\\,\\mathcal{A}^{*} \\;=\\; \\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}"}
        </Math>
        <p>
          because <Math>{'e^{i\\theta}'}</Math> <strong>commutes with</strong>{' '}
          <Math>{'\\mathbf{i}'}</Math> — it lives in the copy of <Math>{'\\mathbb{C}'}</Math> that{' '}
          <Math>{'\\mathbf{i}'}</Math> generates inside <Math>{'\\mathbb{H}'}</Math>. The height is
          untouched too, since <Math>{"\\bigl|\\mathcal{A}e^{i\\theta}\\bigr|^2 = |\\mathcal{A}|^2"}</Math>.
          A whole circle of spinors, one point of the cone.
        </p>
        <p>
          And it is <em>all</em> of the fiber, not merely a family inside it. If{' '}
          <Math>{"\\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*} = \\mathcal{B}\\,\\mathbf{i}\\,\\mathcal{B}^{*}"}</Math>{' '}
          with equal norms, then <Math>{'U = \\mathcal{A}^{-1}\\mathcal{B}'}</Math> is a unit
          quaternion with
        </p>
        <Math display>
          {"U\\,\\mathbf{i}\\,U^{*} = \\mathbf{i} \\quad\\Longleftrightarrow\\quad U\\mathbf{i} = \\mathbf{i}U, \\qquad\\quad \\{\\,U : U\\mathbf{i} = \\mathbf{i}U\\,\\} = \\mathrm{span}\\{1,\\mathbf{i}\\} \\cong \\mathbb{C}"}
        </Math>
        <p style={{ marginTop: '0.5em' }}>
          <strong>
            The fiber is the unit circle of the <Math>{'\\mathbb{C}'}</Math> that{' '}
            <Math>{'\\mathbf{i}'}</Math> generates.
          </strong>{' '}
          So it is <em>closed</em> and bounded — a genuine circle, not a line and not an arc. That is
          the compactness the counting could not deliver, and it is why the solution families later
          <em> close up</em> instead of running away.
        </p>
        <p>
          On unit quaternions the map <Math>{'q \\mapsto q\\,\\mathbf{i}\\,q^{*}'}</Math> is{' '}
          <Math>{'S^3 \\to S^2'}</Math>: the <strong>Hopf fibration</strong> (Hopf, 1931), whose fibers
          are great circles. A redundancy the object itself cannot see has a standard name — a{' '}
          <strong>gauge</strong>.
        </p>
        <div style={{ textAlign: 'center', margin: '0.9em 0', lineHeight: 1.9 }}>
          <div>
            <strong>plane</strong> — forget <Math>{'w'}</Math>, and you have lost a{' '}
            <em>sign</em>. <Math>{'\\mathbb{Z}/2'}</Math>. <strong>Two points.</strong>
          </div>
          <div>
            <strong>space</strong> — forget <Math>{'\\mathcal{A}'}</Math>, and you have lost a{' '}
            <em>phase</em>. <Math>{'S^1'}</Math>. <strong>A circle.</strong>
          </div>
        </div>
        <p style={{ textAlign: 'center' }}>
          <strong style={{ fontSize: '1.12em' }}>
            That is the entire difference. Everything after this slide is a consequence of it.
          </strong>
        </p>
        <Cite>
          The fibration is Hopf (1931). The gauge appears in the rational-PH literature as a{' '}
          <em>normalisation</em>: Kalkan, Scharler, Schröcker &amp; Šír, CAGD (2022), Def. 3.4 call{' '}
          <Math>{'\\mathcal{A}'}</Math> &ldquo;reduced with respect to <Math>{'\\mathbf{i}'}</Math>
          &rdquo; when it has no right factors in the sub-algebra generated by 1 and{' '}
          <Math>{'\\mathbf{i}'}</Math> — precisely this circle, divided out by hand.
        </Cite>
      </>
    ),
    notes:
      'THIS IS THE TITLE SLIDE OF THE DECK. Deliver the two lines -- a sign, a phase -- slowly, and '
      + 'then STOP. Do not gloss them, do not preview the torus, do not reach for interpolation '
      + 'counts. The room has been carrying the question since slide 3 and the pause is the payoff. '
      + 'THE COMPLETENESS ARGUMENT IS NOT A FLOURISH. Exhibiting a one-parameter family is NOT the '
      + 'same as identifying the fiber -- slide 4 guaranteed a dimension, nothing more, and a '
      + 'one-dimensional family could sit inside a larger one. The centralizer argument closes it: '
      + 'U i U* = i says exactly that U commutes with i, and the elements of H commuting with i are '
      + 'span{1,i}. Three lines, and they turn "here is a circle" into "here is THE circle". '
      + 'COMPACTNESS IS THE DEBT SLIDE 4 INCURRED, and this slide pays it. Slide 4-s faded line said '
      + 'counting cannot distinguish a line, an arc and a circle, and that the difference decides '
      + 'everything later. It does: a CLOSED fiber is why the cubic fiber is a loop you can walk all '
      + 'the way around, and why the quintic family is a torus rather than a plane. Say the word '
      + 'CLOSED with weight. '
      + 'NOW THE NAME IS ALLOWED. Hopf 1931. Withheld on slides 3 and 4 on purpose, because anyone who '
      + 'knows the word knows the fibers are circles, and the whole ASK-COUNT-EXHIBIT structure exists '
      + 'so the circle is predicted before it is seen. '
      + 'GAUGE IS INTRODUCED HERE and used for the rest of the deck -- glossed once, as a redundancy '
      + 'in the description that the object cannot see. It is the same word the residue condition '
      + 'needs at slide 10, where the free direction turns out to be THIS circle. That callback is '
      + 'the deck earning its title a second time; it only works if the word is planted here. '
      + 'IF ASKED FOR THE COMMON STATEMENT COVERING BOTH ROWS, and only if asked: write the spinor as '
      + 'a pair over the coefficient field -- R^2 for the plane, C^2 for space, using H as a right '
      + 'C-vector space -- and in both cases the null vector is built the same way and the fiber is '
      + 'the group of UNIT SCALARS of that field. R gives plus-or-minus one; C gives the circle. So '
      + 'the whole difference is that the scalars grew from R to C. That is the deepest form of this '
      + 'slide and it needs machinery the deck has not set up, so it stays in the pocket. '
      + 'PROVENANCE: the fibration is Hopf 1931; the gauge statement for PH spinors is in Choi et al. '
      + '2002 and in Farouki-s book. LIT throughout -- none of this slide is ours.',
  },

  // ---------------------------------------------------------------------------
  // 7 — what the circle does: one formula, both counts
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['LIT', 'MEAS']} />
        <h2>One atom, one chain, both counts</h2>
        <p>
          What does the gauge actually <em>do</em>? Ask an interpolation problem. Everything reduces to
          one equation — solve the <strong>sandwich</strong> for <Math>{'X'}</Math>:
        </p>
        <Math display>
          {"X\\,\\mathbf{i}\\,X^{*} = \\mathbf{v} \\qquad\\Longrightarrow\\qquad X = \\sqrt{|\\mathbf{v}|}\\;\\, n\\; e^{\\varphi \\mathbf{i}}"}
        </Math>
        <p>
          One solution from the half-way vector{' '}
          <Math>{"n = (\\delta + \\mathbf{i})\\,/\\,|\\delta + \\mathbf{i}|"}</Math> with{' '}
          <Math>{"\\delta = \\mathbf{v}/|\\mathbf{v}|"}</Math>, and all the rest by{' '}
          <Math>{'e^{\\varphi\\mathbf{i}}'}</Math> — <strong>slide 5&rsquo;s circle, one equation at a
          time</strong>. Note also that <Math>{'|X|^2 = |\\mathbf{v}|'}</Math> is <em>forced</em>: the
          sandwich fixes the norm.
        </p>
        <p>
          The plane has the same atom, and it answers differently:{' '}
          <Math>{'w^2 = d \\Rightarrow w = \\pm\\sqrt{d}'}</Math>. <strong>Two</strong>, not a circle.
        </p>
        <p>
          A Hermite problem is a <strong>chain</strong> of these atoms — end tangents, then closure.
          Each link is free by its own answer; one <em>global</em> gauge acts on all links at once and
          must be divided out. So both counts come from one formula:
        </p>
        <Math display>
          {"\\text{plane:}\\;\\; 2^{\\,k+1}/2 = 2^{k} \\qquad\\qquad\\qquad \\text{space:}\\;\\; (S^1)^{k+1}\\big/ S^1_{\\text{diag}} = T^{k}"}
        </Math>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto auto auto',
            gap: '0.3em 1.6em',
            justifyContent: 'center',
            margin: '0.9em 0',
            fontSize: '0.75em',
            lineHeight: 1.7,
          }}
        >
          <span style={{ opacity: 0.6 }} />
          <span style={{ opacity: 0.6 }}>links</span>
          <span style={{ opacity: 0.6 }}>plane</span>
          <span style={{ opacity: 0.6 }}>space</span>
          <span style={{ opacity: 0.7 }}>cubic</span>
          <span>2</span>
          <span>
            <strong>2</strong> answers
          </span>
          <span>
            a <strong>circle</strong>
          </span>
          <span style={{ opacity: 0.7 }}>quintic</span>
          <span>3</span>
          <span>
            <strong>4</strong> answers
          </span>
          <span>
            a <strong>torus</strong>
          </span>
        </div>
        <p>
          Those planar numbers are the classical ones — and here is the measurement that ties the two
          columns together. Give the spatial quintic <em>coplanar</em> data and the four planar
          interpolants appear inside the torus at four <em>exact</em> quarter-turns,
        </p>
        <Math display>
          {"(\\alpha,\\beta) \\;=\\; (0,0),\\;\\; (\\pi,0),\\;\\; (\\pi/2,\\pi),\\;\\; (3\\pi/2,\\pi)"}
        </Math>
        <p style={{ marginTop: '0.5em' }}>
          matched to <Math>{'10^{-15}'}</Math>.{' '}
          <strong>The finite list is not replaced by the continuum — it is embedded in it.</strong>
        </p>
        <p style={{ opacity: 0.65 }}>
          Measured here: the cubic&rsquo;s sandwich identity holds to <Math>{'3.3 \\times 10^{-16}'}</Math>{' '}
          with <Math>{'|Z|^2'}</Math> constant at the predicted value to every printed digit; the
          quintic&rsquo;s arc length depends on <Math>{'\\beta'}</Math> alone, since{' '}
          <Math>{'e^{\\theta\\mathbf{i}}'}</Math> commutes with <Math>{'\\mathbf{i}'}</Math> and{' '}
          <Math>{'\\alpha'}</Math> cancels.
        </p>
        <Cite>
          Farouki, Giannelli, Manni &amp; Sestini, <em>Identification of spatial PH quintic Hermite
          interpolants with near-optimal shape measures</em>, CAGD <strong>25</strong> (2008) 274–297
          — Prop. 1 and eq. (49). Planar counts are classical.
        </Cite>
      </>
    ),
    notes:
      'SOURCES. The chain reading and every formula on this slide are docs/PH_SANDWICH_CHAIN.md, '
      + 'which reads [FGMS08] -- Farouki, GIANNELLI, Manni, Sestini, CAGD 25 (2008) 274-297 -- plus '
      + '[FKS02] Farouki, al-Kandari, Sakkalis for the original two-parameter result. Worth saying '
      + 'aloud that Carlotta Giannelli is the second author: this is her own paper on exactly this '
      + 'question, and the collaboration runs through it. The half-way construction n = (delta + u) '
      + 'over |delta + u| is [FGMS08] eq. (49); our quatFromSandwich was written independently and is '
      + 'literally that formula. '
      + 'THE UNIFYING FORMULA IS DERIVED IN THIS DECK, NOT QUOTED -- say so if pressed. The planar '
      + 'count works out as follows for the quintic: w_0 and w_2 are each a square root of the end '
      + 'tangent (2 each), the closure is one complex equation QUADRATIC in the middle coefficient (2 '
      + 'more), giving 8, and the global sign gauge flips all three at once, giving 4. That is the '
      + 'classical planar quintic Hermite count, reproduced. The cubic gives 2 links, 4 over 2 = 2, '
      + 'also classical. So the formula is a CHECK against known numbers rather than a new claim, and '
      + 'that is exactly why it is safe to put on a slide. '
      + 'THE POINT OF THE SLIDE, and it is the point of the whole act: the plane and space differ in '
      + 'ONE place -- what a single sandwich answers -- and both classical counts fall out of that one '
      + 'difference. Two per link gives a finite list; a circle per link gives a torus. Nothing else '
      + 'changes, not the chain, not the closure, not the gauge quotient. '
      + 'THE QUARTER-TURN MEASUREMENT IS THE ACT-CLOSING FACT. The four planar interpolants sit at '
      + 'exact quarter-turns of the spatial torus, matched to 1e-15, computed against an INDEPENDENT '
      + 'planar solver. Why beta is 0 or pi: a planar curve needs A(t) in span{1,k} up to gauge, and '
      + 'for in-plane data n_i is pure and lies in span{i,j}, so n_i exp(phi i) enters span{1,k} only '
      + 'when cos phi = 0. Hence phi is plus or minus pi over 2 and beta is 0 or pi. A generic beta '
      + 'has NO planar member at any alpha -- measured minimum planarity 3.1e-2 at beta = 1.3. '
      + 'DO NOT SAY the gauge count and the interpolation count are the same number. They are not. The '
      + 'gauge fiber in the plane is two points; the planar quintic Hermite problem has FOUR '
      + 'solutions. The relation is that a discrete gauge makes the solution set discrete -- the '
      + 'counts are linked by the formula, not equal. Conflating them would be the loudest error '
      + 'available on this slide. '
      + 'IMPLEMENTATION WARNING, not for the slide but paid for once: a 90 by 90 sweep of the torus '
      + 'found only the two beta = 0 members, because beta = pi falls between samples on a 90-step '
      + 'grid over [0, 4 pi). Sample at resolutions that hit beta = pi exactly, or search the four '
      + 'predicted points directly. '
      + 'MEAS is earned by the numbers -- 3.3e-16, the constant |Z| squared, the 1e-15 quarter-turns, '
      + 'the four stationary points of L(beta) -- all from our own code, pinned in '
      + 'core/__tests__/phSandwichChain.test.ts and the phSpatialQuintic tests. LIT is earned by '
      + 'everything else on the slide.',
  },

  // ===========================================================================
  // ACT II — AND WHAT HAPPENS WHEN YOU DIVIDE
  //
  // Act I built the cone and found the circle the cone cannot see. This act does ONE thing: it goes
  // rational, and shows that the cone survives the move completely intact while the INTEGRATION does
  // not. The act's whole content is that single relocation of the difficulty, and then the shape of
  // the condition that repairs it -- which turns out to be Act I's circle, one last time.
  //
  // The room will arrive expecting to start over. It does not have to, and saying so early is what
  // buys attention for the part that IS new.
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // 8 — the cone survives, the integration does not
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="LIT" />
        <h2>The cone survives. The integration does not.</h2>
        <p>A rational curve is a vector polynomial over a scalar one. Differentiate it:</p>
        <Math display>
          {"\\mathbf{c} = \\mathbf{p}/w \\qquad\\Longrightarrow\\qquad \\mathbf{c}' = (\\mathbf{p}'w - \\mathbf{p}w')\\big/ w^2"}
        </Math>
        <p>Name that numerator — it is a Wronskian:</p>
        <Math display>
          {"\\mathbf{N} \\;:=\\; \\mathbf{p}'w - \\mathbf{p}w', \\qquad \\mathbf{c}' = \\mathbf{N}/w^2, \\qquad \\|\\mathbf{c}'\\| = \\|\\mathbf{N}\\|/w^2"}
        </Math>
        <p>
          <Math>{'w^2'}</Math> is positive, so PH says <Math>{"\\|\\mathbf{N}\\|"}</Math> is a
          polynomial — which is Act I&rsquo;s condition, applied to <Math>{'\\mathbf{N}'}</Math>. The
          theorem transfers verbatim:
        </p>
        <Math display>{"\\mathbf{N} \\;=\\; \\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}"}</Math>
        <p style={{ marginTop: '0.5em' }}>
          <strong>
            The spinor squares to the <em>Wronskian</em>, not to the derivative.
          </strong>{' '}
          The polynomial case is the corner <Math>{'w = \\mathrm{const}'}</Math>, where the two happen
          to coincide.
        </p>
        <p>
          So nothing from Act I is lost. <Math>{"\\boldsymbol{\\gamma} = (\\mathbf{N},\\, \\|\\mathbf{N}\\|)"}</Math>{' '}
          is still a polynomial curve on the cone; square the radius, rotate{' '}
          <Math>{'\\mathbf{i}'}</Math>; the fiber is still a circle. The hodograph is that same cone
          curve, divided by <Math>{'w^2'}</Math>.
        </p>
        <p style={{ textAlign: 'center', margin: '0.8em 0' }}>
          <strong style={{ fontSize: '1.12em' }}>
            Rational PH does not break the cone. It breaks the <em>integration</em>.
          </strong>
        </p>
        <p>
          In Act I you chose <Math>{'\\mathcal{A}'}</Math>, formed{' '}
          <Math>{"\\mathbf{c}'"}</Math>, and integrated. Always polynomial, always fine. Now the arrow
          reverses — you must <em>solve</em>
        </p>
        <Math display>
          {"\\mathbf{p}'w - \\mathbf{p}w' = \\mathbf{N} \\qquad \\text{for } \\mathbf{p}"}
        </Math>
        <p>
          a linear system in <Math>{'\\mathbf{p}'}</Math>&rsquo;s coefficients — and it can be{' '}
          <strong>inconsistent</strong>. Choose <Math>{'\\mathcal{A}'}</Math> and{' '}
          <Math>{'w'}</Math> freely and <Math>{'\\mathbf{N}/w^2'}</Math> is genuinely Pythagorean. It
          simply is not the derivative of anything <em>rational</em> unless something vanishes.
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.4em' }}>
          <strong>Integration was a map. Now it is an equation.</strong>
        </p>
        <p style={{ opacity: 0.65 }}>
          <Math>{'w'}</Math> must not vanish on the parameter interval, or the curve has a pole there.
          Its roots <em>elsewhere</em> in <Math>{'\\mathbb{C}'}</Math> are exactly what the next slide
          is about.
        </p>
        <Cite>
          Kalkan, Scharler, Schröcker &amp; Šír, <em>Rational Framing Motions and Spatial Rational
          Pythagorean Hodograph Curves</em>, CAGD (2022), §1: &ldquo;the integral does not need to
          produce a rational curve … a complete characterization of this subset seems to be a very
          difficult problem.&rdquo;
        </Cite>
      </>
    ),
    notes:
      'SAY THIS SENTENCE SLOWLY: THE SPINOR SQUARES TO THE WRONSKIAN, NOT TO THE DERIVATIVE. It is '
      + 'the opening line of FOUNDATIONS F14 and it is the thing people get wrong, because in the '
      + 'polynomial case N and c-prime coincide and the distinction never shows. Everything in the '
      + 'rest of the act depends on the spinor sitting on N. '
      + 'THE REASSURANCE IS THE POINT OF THE SLIDE, not politeness. The room has just spent six slides '
      + 'on the cone and will arrive at the word RATIONAL expecting to start over. It does not have '
      + 'to: the same gamma, the same sandwich, the same circle, one level down under a division. '
      + 'Saying "nothing from Act I is lost" plainly is what buys attention for the part that is '
      + 'genuinely new. '
      + 'MAP VERSUS EQUATION is the act in five words. In the polynomial world integration is a MAP -- '
      + 'you apply it and you are done. In the rational world it is an EQUATION -- you pose it and it '
      + 'may have no solution. Nothing else about the construction changed. Two of the three '
      + 'ingredients, the spinor and the weight, stay free; only integrability costs anything. '
      + 'WHAT NOT TO SAY YET. Do NOT derive the residue condition here, do not mention partial '
      + 'fractions, and above all do not say the word QUADRATIC or compare 2D with 3D. Slides 9 '
      + 'through 12 do all of that in order, and the contrast lands only if this slide leaves the room '
      + 'with a clean unanswered question: what has to vanish? '
      + 'PROVENANCE. The 2D story is FOUNDATIONS F13 (the Wronskian F-prime D minus F D-prime equals S '
      + 'squared, solved by integrating the squared hodograph); the spatial statement is F14, pinned '
      + 'by core/__tests__/rationalPHSpatialResidue.test.ts. The obstruction itself is classical and '
      + 'also appears as the residue conditions on Psi in Altavilla, Schrocker, Sir, Vrsek 2026. LIT: '
      + 'the setup on this slide is all somebody else-s; our measurements start on slide 10.',
  },

  // ---------------------------------------------------------------------------
  // 9 — what has to vanish
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['LIT', 'MEAS']} />
        <h2>What has to vanish</h2>
        <p>
          A rational function integrates to a rational function exactly when its partial fractions
          carry no <Math>{'1/(t-r)'}</Math> term. And note which pole is the dangerous one:
        </p>
        <Math display>
          {"\\int (t-r)^{-2}\\,dt = -(t-r)^{-1} \\;\\; \\checkmark \\qquad\\qquad \\int (t-r)^{-1}\\,dt = \\log(t-r) \\;\\; \\times"}
        </Math>
        <p>
          <strong>The double pole is harmless.</strong> So <Math>{'w^2'}</Math> in the denominator is
          not the problem — the problem is the <em>simple</em> pole hiding inside it.
        </p>
        <p>
          Let <Math>{'w'}</Math> have roots <Math>{'r_1, \\ldots, r_m'}</Math> — the{' '}
          <em>poles of the curve</em>, all outside the parameter interval. Work at{' '}
          <strong>one</strong> of them, <Math>{'r_k'}</Math>, and split off just that factor:
        </p>
        <Math display>
          {"w = (t-r_k)\\,\\varphi \\quad\\text{with }\\varphi\\text{ carrying the other roots, so } \\varphi(r_k) \\neq 0"}
        </Math>
        <p>
          Then the double pole is exposed and everything else is regular there:
        </p>
        <Math display>
          {"\\mathbf{N}/w^2 = \\mathbf{g}\\,(t-r_k)^{-2}, \\qquad \\mathbf{g} := \\mathbf{N}/\\varphi^{2}"}
        </Math>
        <p>
          Now expand <Math>{'\\mathbf{g}'}</Math> about <Math>{'r'}</Math>, and the two poles separate
          themselves:
        </p>
        <Math display>
          {"\\mathbf{N}/w^2 \\;=\\; \\mathbf{g}(r_k)\\,(t-r_k)^{-2} \\;+\\; \\mathbf{g}'(r_k)\\,(t-r_k)^{-1} \\;+\\; (\\text{analytic})"}
        </Math>
        <p style={{ textAlign: 'center', opacity: 0.75, marginTop: '-0.2em' }}>
          the first term is <em>harmless</em> — the second is <strong>the logarithm</strong>
        </p>
        <p>
          So the whole condition is <Math>{"\\mathbf{g}'(r_k) = 0"}</Math>. Unpack it —{' '}
          <Math>{"\\mathbf{g}' = (\\mathbf{N}'\\varphi - 2\\mathbf{N}\\varphi')/\\varphi^{3}"}</Math>,
          and <Math>{'\\varphi(r_k) \\neq 0'}</Math> divides out:
        </p>
        <Math display>
          {"\\mathbf{N}'(r_k) \\;=\\; 2\\,\\mathbf{N}(r_k)\\,\\Sigma_k, \\qquad \\Sigma_k := \\varphi'(r_k)/\\varphi(r_k)"}
        </Math>
        <p>
          And <Math>{'\\Sigma_k'}</Math> is not mysterious — it is the <em>logarithmic derivative</em>{' '}
          of <Math>{'\\varphi'}</Math> at the pole, and a product log-differentiates into a sum:
        </p>
        <Math display>
          {"\\Sigma_k \\;=\\; \\sum \\, 1/(r_k - r_l) \\qquad\\quad \\text{over all other roots } l \\neq k"}
        </Math>
        <p>
          <Math>{'k'}</Math> is the pole you are standing at; <Math>{'l'}</Math> runs over the{' '}
          <em>others</em>. One sum per pole, each omitting its own root — so{' '}
          <Math>{'\\Sigma_k'}</Math> measures how <em>unbalanced</em> the other poles are around this
          one, and vanishes when they sit symmetrically either side.
        </p>
        <p>
          It knows nothing about the curve, only about <Math>{'w'}</Math>. And{' '}
          <Math>{'\\mathbf{N}'}</Math> is a <em>vector</em>, so this is{' '}
          <strong>three real conditions per simple root</strong>.
        </p>
        <p>
          <strong>So the count of conditions is the count of poles.</strong> Constant{' '}
          <Math>{'w'}</Math> has no roots at all — no conditions, nowhere for a logarithm to appear,
          and that is precisely why Act I was free.
        </p>
        <p style={{ opacity: 0.65 }}>
          The check that the derivation is right rather than merely plausible: put{' '}
          <Math>{'\\mathbf{N} = S^2'}</Math> for the plane, so{' '}
          <Math>{"\\mathbf{N}' = 2SS'"}</Math>, and it collapses to{' '}
          <Math>{"S'(r) = S(r)\\,\\Sigma"}</Math> — the known planar condition, reproduced to{' '}
          <Math>{'1.8 \\times 10^{-15}'}</Math>.
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.5em' }}>
          <strong>
            But this is a condition on <Math>{'\\mathbf{N}'}</Math>. And{' '}
            <Math>{"\\mathbf{N} = \\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}"}</Math>. What does it
            say about the <em>spinor</em>?
          </strong>
        </p>
        <Cite>
          Kalkan et al. (2022), Thm. 4.6 give the general form: a truly rational PH curve exists iff
          the Taylor coefficients of <Math>{"\\mathcal{A}\\mathbf{i}\\mathcal{A}^{*}"}</Math> at a root
          of the denominator are <em>linearly dependent</em>. For a simple root that is{' '}
          <Math>{"\\{\\mathbf{N}(r), \\mathbf{N}'(r)\\}"}</Math> dependent; the condition here pins the
          constant because it takes the primitive case.
        </Cite>
      </>
    ),
    notes:
      'THE COUNTERINTUITIVE BIT IS THE FIRST LINE, AND IT IS WORTH A PAUSE. Everyone sees w-squared in '
      + 'the denominator and expects the square to be the trouble. It is not: a double pole '
      + 'integrates to a rational function perfectly happily. The obstruction is the SIMPLE pole '
      + 'hiding inside the double one, which is why the derivation has to expand g to FIRST order and '
      + 'not merely evaluate it. If the room gets that, the rest of the slide is bookkeeping. '
      + 'THE DERIVATION IS SHORT ENOUGH TO DO LIVE if anyone wants it: split w = (t-r) phi, so N over '
      + 'w-squared is g over (t-r)-squared with g = N over phi-squared; Taylor g at r; the '
      + '1/(t-r) coefficient is g-prime(r); set it to zero; expand g-prime by the quotient rule and '
      + 'divide by phi(r), which is nonzero by construction. Six lines. '
      + 'SAY WHAT THE ROOTS ARE, out loud, the first time they appear. Measured on a real reader '
      + '2026-08-11: he followed the whole derivation and then asked "so the roots are the zeros of '
      + 'w?". They are, and the slide had never said so. They are the POLES OF THE CURVE, they lie '
      + 'outside the parameter interval or the segment has a pole in it, and they are real or in '
      + 'conjugate pairs since w has real coefficients. k indexes which root you are standing at and '
      + 'l runs over the others, so Sigma differs from root to root. '
      + 'THE COUNT OF CONDITIONS IS THE COUNT OF POLES, and that line is the bridge back to Act I. '
      + 'Constant w has no roots, hence no conditions, hence the polynomial case was free -- not by '
      + 'good fortune but because a logarithm needs a pole to live at. It also sets up the ending: ONE '
      + 'pole is the simplest genuinely rational case, and there Sigma is an EMPTY SUM, so Sigma = 0 '
      + 'and the condition collapses to its shortest possible form. '
      + 'k IS FIXED, l IS SUMMED, AND THE SLIDE USED TO HIDE THAT. A first draft derived with a '
      + 'generic root r and a generic phi, then jumped to r_k and r_l in the closed form without ever '
      + 'introducing the indexing -- a notation switch in the middle of a derivation, and it is what '
      + 'a real reader stopped on. Now the roots are named r_1 through r_m up front, the work happens '
      + 'at ONE of them, and phi is defined in words as "w carrying the other roots". '
      + 'IF ASKED HOW THE SUM WORKS, the concrete answer lands better than the formula. Roots at 2, '
      + '-1 and 5 give Sigma = 0 at r = 2 (one third minus one third), minus one half at r = -1, plus '
      + 'one half at r = 5. Three roots, three different Sigmas, three separate conditions -- not one '
      + 'sum over pairs. The zero at r = 2 is worth pointing at: the other two roots sit at equal '
      + 'distance either side, so they cancel. Sigma is an IMBALANCE measure, and it blows up when '
      + 'another pole crowds in close. '
      + 'SIGMA KNOWS ONLY THE ROOTS. Say this plainly -- it is the fact that makes the condition '
      + 'tractable later. Sigma is data about w and about nothing else: fix where the poles are and '
      + 'Sigma is a number, the same number for every curve with that weight. '
      + 'THE CROSS-CHECK IS NOT DECORATION. Substituting N = S-squared must reproduce the planar '
      + 'condition, and it does, to 1.8e-15. That is what separates a correct derivation from a '
      + 'plausible one, and it is the reason MEAS shares this slide-s tag with LIT. The planar side is '
      + 'FOUNDATIONS F13; the spatial derivation and the number are F14, pinned by '
      + 'core/__tests__/rationalPHSpatialResidue.test.ts. '
      + 'THREE CONDITIONS PER ROOT is stated here as arithmetic -- N is a vector, so a vector equation '
      + 'is three real ones. WHY it must be exactly three, structurally, is slide 12-s ledger (the '
      + 'kernel of p to p-prime w minus p w-prime is the translations, so the rank falls short by the '
      + 'dimension of space). Do not preview that; it is the punchline of the ledger slide. '
      + 'ALSO NOT YET: linear versus quadratic, and anything about 2D being easier. The cross-check '
      + 'above uses the 2D substitution as EVIDENCE, which is a different job from the CONTRAST on '
      + 'slide 12. Keep them apart or slide 12 has nothing left to say. '
      + 'THE CLOSING QUESTION IS THE HINGE OF THE ACT. Everything so far is about N. But N is the '
      + 'sandwich, and the interesting object is the spinor underneath it. Ask the question and stop.',
  },

  // ---------------------------------------------------------------------------
  // 10 — the two-sided strip
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['LIT', 'MEAS']} />
        <h2>Everything about the spinor cancels</h2>
        <p
          style={{
            borderLeft: '3px solid rgba(59,130,246,0.5)',
            paddingLeft: '0.8em',
            opacity: 0.85,
          }}
        >
          <strong>Where we are.</strong> The condition we have is on <Math>{'\\mathbf{N}'}</Math> — but{' '}
          <Math>{'\\mathbf{N}'}</Math> is <em>computed</em>, not chosen. What you choose is{' '}
          <Math>{'\\mathcal{A}'}</Math>. This slide moves the condition into the variable you control.
          And note how narrow it is: a logarithm can only be born <em>at a pole</em>, so{' '}
          <Math>{'\\mathcal{A}'}</Math> is pinned only at the roots of <Math>{'w'}</Math> and is free
          everywhere else.
        </p>
        <p>
          Put <Math>{"\\mathbf{N} = \\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}"}</Math> into the
          condition and differentiate by the product rule:
        </p>
        <Math display>
          {"\\mathbf{N}' \\;=\\; \\mathcal{A}'\\,\\mathbf{i}\\,\\mathcal{A}^{*} \\;+\\; \\mathcal{A}\\,\\mathbf{i}\\,(\\mathcal{A}')^{*}"}
        </Math>
        <p>
          so the residue condition, everything evaluated at the pole <Math>{'r_k'}</Math>, reads
        </p>
        <Math display>
          {"\\mathcal{A}'\\,\\mathbf{i}\\,\\mathcal{A}^{*} \\;+\\; \\mathcal{A}\\,\\mathbf{i}\\,(\\mathcal{A}')^{*} \\;=\\; 2\\,\\bigl(\\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}\\bigr)\\,\\Sigma_k"}
        </Math>
        <p>
          You cannot divide one <Math>{'\\mathcal{A}'}</Math> away. It stands on the{' '}
          <strong>left</strong> of the <Math>{'\\mathbf{i}'}</Math> and its conjugate on the{' '}
          <strong>right</strong>, and no single division reaches both. But you can strip them{' '}
          <em>simultaneously</em> — multiply by <Math>{'\\mathcal{A}^{-1}'}</Math> on the left and{' '}
          <Math>{'(\\mathcal{A}^{*})^{-1}'}</Math> on the right, which is legal because every nonzero
          quaternion has an inverse.
        </p>
        <p>
          Name what survives — an <strong>abbreviation, not a new unknown</strong>: one quaternion,
          built from the spinor and its velocity at the single point <Math>{'r_k'}</Math>. It is the{' '}
          <strong>logarithmic derivative</strong> of the spinor, the quaternion analogue of{' '}
          <Math>{"f'/f"}</Math>. With it, and using that conjugation reverses products:
        </p>
        <Math display>
          {"V \\;:=\\; \\mathcal{A}^{-1}\\mathcal{A}', \\qquad\\qquad (\\mathcal{A}')^{*}(\\mathcal{A}^{*})^{-1} \\;=\\; \\bigl(\\mathcal{A}^{-1}\\mathcal{A}'\\bigr)^{*} \\;=\\; V^{*}"}
        </Math>
        <p>
          The right-hand side collapses too, since <Math>{'\\Sigma_k'}</Math> is a{' '}
          <em>real</em> number and commutes with everything. What is left standing is:
        </p>
        <Math display>
          {"V\\,\\mathbf{i} \\;+\\; \\mathbf{i}\\,V^{*} \\;=\\; 2\\,\\Sigma_k\\,\\mathbf{i}"}
        </Math>
        <p style={{ textAlign: 'center', margin: '0.7em 0' }}>
          <strong style={{ fontSize: '1.12em' }}>
            One quaternion equation, one quaternion unknown. Every trace of{' '}
            <Math>{'\\mathcal{A}'}</Math> is gone.
          </strong>
        </p>
        <p>
          And notice what that leaves. The condition never mentions <em>where</em> the spinor is — only
          how it is <strong>moving</strong>. Whatever it turns out to say, it is a statement about the
          logarithmic derivative and about nothing else.
        </p>
        <p style={{ opacity: 0.65 }}>
          Derived in <Math>{'\\text{F14}'}</Math> and pinned by{' '}
          <Math>{'\\texttt{rationalPHSpatialResidue.test.ts}'}</Math>: spinors built to satisfy what
          this equation demands kill the residue to <Math>{'10^{-16}'}</Math>, and an off-form spinor
          leaves it at <Math>{'1.3'}</Math>.
        </p>
        <Cite>
          The reduction to a logarithmic derivative is this project&rsquo;s route (F14). Kalkan et al.
          (2022) reach the same conditions through framing motions and dual quaternions — Thm. 3.6,
          conditions (7)–(9) — where <Math>{"\\alpha\\mathbf{b}' - \\alpha'\\mathbf{b} = \\mu\\,\\mathcal{A}\\mathbf{i}\\mathcal{A}^{*}"}</Math>{' '}
          is the same Wronskian.
        </Cite>
      </>
    ),
    notes:
      'THE ORIENTING BOX AT THE TOP EXISTS BECAUSE A READER GOT LOST HERE. Measured 2026-08-11: '
      + 'slides 8, 9 and 10 are three consecutive technical steps and the deck never restated what '
      + 'they were FOR, so by the middle of the run the question "what are we trying to achieve" was '
      + 'live and unanswered. The answer is one sentence -- the condition is on N, but N is COMPUTED '
      + 'and A is CHOSEN, so the derivation exists to move the condition into the variable you '
      + 'control -- and it costs four lines to say. Do not delete it as redundant; it is redundant '
      + 'only to somebody who has not drifted. The second half of the box is the reassurance that '
      + 'makes the whole thing feel smaller: a logarithm can only be born at a pole, so A is pinned '
      + 'only at the roots of w and is completely free everywhere else. '
      + 'V IS AN ABBREVIATION, AND THE SLIDE NOW SAYS SO IN THOSE WORDS. The confusion it prevents is '
      + 'specific and was observed: "do we solve for V and then use it to solve for A?" No. V is not '
      + 'carried as a numerical unknown. Its equation is solved SYMBOLICALLY, once, and the answer is '
      + 'a SHAPE (Sigma plus lambda i) rather than a value; that shape is then unwound back into a '
      + 'relation between A and A-prime. Slide 11 now does that unwinding as an explicit step for the '
      + 'same reason. '
      + 'THE SIDEDNESS IS THE MECHANICAL CRUX AND IT DESERVES A BEAT. A is on the LEFT of the i, A-star '
      + 'is on the RIGHT. Multiplying by A-inverse from the left kills the first but leaves the '
      + 'second untouched; there is no single division that reaches both. The move is to strip from '
      + 'BOTH SIDES AT ONCE, and that is available only because H is a division ring -- every nonzero '
      + 'quaternion is invertible. Do the gesture with your hands if the room is awake. '
      + 'CHECK THE MIDDLE STEP IF ASKED. First term: A-inverse times (A-prime i A-star) times '
      + 'A-star-inverse leaves (A-inverse A-prime) i, which is V i. Second: A-inverse times (A i '
      + 'A-prime-star) times A-star-inverse leaves i times A-prime-star times A-star-inverse, and '
      + 'since conjugation reverses products that is i V-star. Right side: Sigma is real so it moves '
      + 'freely, and A-inverse A i A-star A-star-inverse is just i. Hence V i + i V-star = 2 Sigma i. '
      + 'THE PAYOFF SENTENCE IS "EVERY TRACE OF A IS GONE". A room expecting a messy quaternion '
      + 'identity gets a two-term equation instead. That collapse is the entire reason this slide '
      + 'exists, and it is what makes the next slide readable -- solving four real components by hand '
      + 'is only reasonable because the equation got this small first. '
      + 'THE FRAMING SENTENCE MATTERS MORE THAN IT LOOKS: the condition says nothing about WHERE the '
      + 'spinor is, only about how it MOVES. That is what makes the next slide an interpretation of '
      + 'velocity -- grow, spin, tilt -- rather than a constraint on position. Plant it here. '
      + 'ASSUMED: A(r_k) is not zero, since we inverted it. That stratum is real and is named on the '
      + 'open slide; do not quietly pretend it does not exist, but do not derail this slide with it. '
      + 'WHAT NOT TO SAY YET. Do not solve the equation -- the componentwise solve is the next slide, '
      + 'and it lands far harder when the room has stared at V i + i V-star for a moment first. And '
      + 'do NOT say linear or quadratic or compare with the plane; the sidedness remark here is '
      + 'MECHANICAL (why the strip must be two-sided), not the 2D-versus-3D contrast, which is slide '
      + '12 and needs its own room. '
      + 'MEAS: the reduction in this form is ours, written up as FOUNDATIONS F14 and pinned by '
      + 'core/__tests__/rationalPHSpatialResidue.test.ts. The underlying obstruction -- that a '
      + 'rational integrand must have vanishing residues -- is classical and belongs to nobody.',
  },

  // ---------------------------------------------------------------------------
  // 11 — grow, spin, but do not tilt  (the title, earned a second time)
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['LIT', 'MEAS']} />
        <h2>Grow, spin, but do not tilt</h2>
        <p>
          Solve it. Write <Math>{'V = v_0 + v_1\\mathbf{i} + v_2\\mathbf{j} + v_3\\mathbf{k}'}</Math>{' '}
          and use <Math>{'\\mathbf{ji} = -\\mathbf{k}'}</Math>,{' '}
          <Math>{'\\mathbf{ki} = \\mathbf{j}'}</Math>, <Math>{'\\mathbf{ij} = \\mathbf{k}'}</Math>,{' '}
          <Math>{'\\mathbf{ik} = -\\mathbf{j}'}</Math>:
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto',
            gap: '0.15em 0.8em',
            justifyContent: 'center',
            margin: '0.7em 0',
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
          The <Math>{'v_1'}</Math> terms <em>cancel</em>. Set that equal to{' '}
          <Math>{'2\\Sigma_k\\mathbf{i}'}</Math> and read off the components:
        </p>
        <Math display>
          {"v_0 = \\Sigma_k, \\qquad v_2 = v_3 = 0, \\qquad v_1 \\;\\text{ free} \\qquad\\Longrightarrow\\qquad V = \\Sigma_k + \\lambda\\mathbf{i}, \\;\\; \\lambda \\in \\mathbb{R}"}
        </Math>
        <p>
          Now <strong>unwind the abbreviation</strong>. <Math>{"V = \\mathcal{A}^{-1}\\mathcal{A}'"}</Math>{' '}
          means <Math>{"\\mathcal{A}' = \\mathcal{A}V"}</Math>, so the condition, written at last in
          the variable you actually choose:
        </p>
        <Math display>
          {"\\mathcal{A}'(r_k) \\;=\\; \\mathcal{A}(r_k)\\,\\bigl(\\Sigma_k + \\lambda\\mathbf{i}\\bigr)"}
        </Math>
        <p>
          Not a value for <Math>{'\\mathcal{A}'}</Math> — a <em>link</em> between{' '}
          <Math>{'\\mathcal{A}(r_k)'}</Math> and <Math>{"\\mathcal{A}'(r_k)"}</Math>, two things you
          would otherwise have chosen independently.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto auto',
            gap: '0.35em 1.4em',
            justifyContent: 'center',
            margin: '0.9em 0',
            fontSize: '0.78em',
            lineHeight: 1.5,
            alignItems: 'baseline',
          }}
        >
          <span style={{ opacity: 0.6 }}>component</span>
          <span style={{ opacity: 0.6 }}>moving in it…</span>
          <span style={{ opacity: 0.6 }}>the condition says</span>
          <span>
            <Math>{'v_0'}</Math> (real)
          </span>
          <span>
            <strong>scales</strong> the spinor, so scales the speed
          </span>
          <span>
            forced to <Math>{'\\Sigma_k'}</Math>
          </span>
          <span>
            <Math>{'v_1'}</Math> (the <Math>{'\\mathbf{i}'}</Math> part)
          </span>
          <span>
            <strong>spins</strong> along the fiber — moves nothing
          </span>
          <span>
            <strong>free</strong>
          </span>
          <span>
            <Math>{'v_2, v_3'}</Math> (<Math>{'\\mathbf{j},\\mathbf{k}'}</Math>)
          </span>
          <span>
            <strong>tilts</strong> the direction <Math>{'\\hat{\\mathbf{n}}'}</Math> on{' '}
            <Math>{'S^2'}</Math>
          </span>
          <span>forced to zero</span>
        </div>
        <p style={{ textAlign: 'center' }}>
          <strong style={{ fontSize: '1.12em' }}>
            At each pole the spinor may <em>grow</em> and it may <em>spin</em>. It may not{' '}
            <em>tilt</em>.
          </strong>
        </p>
        <p>
          And &ldquo;may not tilt&rdquo; is literal. At <Math>{'r_k'}</Math> we have{' '}
          <Math>{"(|\\mathcal{A}|^2)' = \\mathcal{A}(V + V^{*})\\mathcal{A}^{*} = 2\\Sigma_k|\\mathcal{A}|^2"}</Math>
          , and <Math>{"\\mathbf{N}' = 2\\mathbf{N}\\Sigma_k"}</Math>, so the quotient rule on{' '}
          <Math>{"\\hat{\\mathbf{n}} = \\mathbf{N}/|\\mathcal{A}|^2"}</Math> gives{' '}
          <Math>{"\\hat{\\mathbf{n}}'(r_k) = 0"}</Math> exactly: <strong>the hodograph&rsquo;s
          direction is stationary at the pole.</strong>
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.6em' }}>
          <strong style={{ fontSize: '1.12em' }}>
            Now look at <em>which</em> direction is free. Right-multiplication by{' '}
            <Math>{'\\mathbf{i}'}</Math> — that is <Math>{'\\mathcal{A} \\mapsto \\mathcal{A}e^{i\\theta}'}</Math>.{' '}
            <em>It is the circle.</em>
          </strong>
        </p>
        <p style={{ opacity: 0.65 }}>
          Put together: <Math>{"\\mathcal{A}'(r_k)"}</Math> must lie on the <em>line</em>{' '}
          <Math>{"\\mathcal{A}(r_k)\\Sigma_k + \\mathbb{R}\\,\\mathcal{A}(r_k)\\mathbf{i}"}</Math> —
          inside the spinor&rsquo;s own <strong>scale-and-gauge plane</strong>. A line in{' '}
          <Math>{'\\mathbb{R}^4'}</Math> is three conditions, which is exactly the count slide 9 got
          from <Math>{'\\mathbf{N}'}</Math> being a vector. The two routes agree.
        </p>
        <Cite>
          &ldquo;Do not tilt&rdquo; has a classical name. Kalkan et al. (2022), Rem. 4.7: reading{' '}
          <Math>{"\\mathbf{F} = \\mathcal{A}\\mathbf{i}\\mathcal{A}^{*}"}</Math> as a curve, dependence
          of <Math>{"\\{\\mathbf{F}, \\mathbf{F}'\\}"}</Math> means the pole is a <strong>cusp of the
          tangent indicatrix</strong>; adding <Math>{"\\mathbf{F}''"}</Math> makes it an{' '}
          <strong>inflection</strong>.
        </Cite>
      </>
    ),
    notes:
      'THIS IS THE SECOND TIME THE DECK EARNS ITS TITLE, and the line to deliver slowly is the last '
      + 'bold one. The room has carried "a circle" since slide 6 as the answer to a counting question. '
      + 'Here the same circle reappears from a completely different direction -- as the ONE component '
      + 'of a residue condition that is left unconstrained. Nothing was arranged for that to happen. '
      + 'Pause after "it is the circle" and let it sit. '
      + 'THE ALGEBRA IS FOUR LINES AND SHOULD BE DONE, NOT ASSERTED. V i and i V-star each expand to '
      + 'four terms; the v_1 parts carry opposite signs and cancel, everything else doubles. Then the '
      + 'i component gives v_0 = Sigma, the j and k components give zero, and v_1 was never in the '
      + 'sum at all -- which is WHY it is free. It is free because it cancelled, not because we chose '
      + 'to leave it alone. That is worth saying in those words. '
      + 'THREE CONDITIONS, NOT FOUR, and the faded line closes the loop on it. A quaternion has four '
      + 'real components, so one might expect four conditions; the answer is three because the '
      + 'solution set is an affine LINE in R^4, not a point. And three is exactly what slide 9 '
      + 'predicted from N being a vector. Two independent routes to the same count is the kind of '
      + 'agreement worth pointing at out loud. '
      + 'THE STATIONARY DIRECTION IS A COROLLARY, NOT A CITATION. n-hat-prime = 0 at the pole is '
      + 'derived on the slide in two steps and the reader can check it; it is NOT in F14 and it has '
      + 'NO pinning test yet. TO PIN: add it to rationalPHSpatialResidue.test.ts -- build a spinor of '
      + 'the allowed form, evaluate the unit hodograph direction near the pole, confirm its '
      + 'derivative vanishes there. Until then it stands on its own two-line derivation, which is '
      + 'legitimate for a corollary shown in full but should not be quoted as measured. '
      + 'GEOMETRY WORTH HAVING READY: the allowed velocities span the tangent directions to the '
      + 'spinor-s own orbit under scaling and gauge. So the condition says the spinor may move only '
      + 'in the directions that DO NOT CHANGE THE CURVE -- its own gauge, and its own scale. That is '
      + 'why F14 calls this an INCIDENCE rather than an equation: a point required to lie on a plane '
      + 'that depends on the point. '
      + 'MEAS: the solved form is F14, pinned by core/__tests__/rationalPHSpatialResidue.test.ts '
      + '(three conditions per root, independent, normalised Gram determinant 1.0; on-form spinors '
      + 'kill the residue to 1e-16).',
  },

  // ---------------------------------------------------------------------------
  // 12 — the nonlinearity, and how wide it actually is
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['LIT', 'MEAS']} />
        <h2>The nonlinearity is one number wide</h2>
        <p>
          Do the plane first, because it is easy and it explains why space is not. There{' '}
          <Math>{'\\mathbf{N} = S^2'}</Math>, so <Math>{"\\mathbf{N}' = 2SS'"}</Math>, and the
          condition reads <Math>{"2S(r_k)S'(r_k) = 2S(r_k)^2\\Sigma_k"}</Math>. Divide by{' '}
          <Math>{'2S(r_k)'}</Math> — legal, <Math>{'\\mathbb{C}'}</Math> is a commutative field:
        </p>
        <Math display>{"S'(r_k) \\;=\\; S(r_k)\\,\\Sigma_k \\qquad\\quad \\text{— linear in } S\\text{'s coefficients}"}</Math>
        <p>
          So in the plane you never <em>solve</em> the condition. You <strong>derive</strong> it: some
          of <Math>{'S'}</Math>&rsquo;s coefficients simply come out.
        </p>
        <p>
          In space nothing divides. <Math>{'\\mathcal{A}'}</Math> stands on both sides of the{' '}
          <Math>{'\\mathbf{i}'}</Math> and <Math>{'\\mathbb{H}'}</Math> does not commute. And the
          failure is not a suspicion — scale the spinor and the residue scales by the{' '}
          <em>square</em>:
        </p>
        <Math display>
          {"\\mathcal{A} \\mapsto s\\,\\mathcal{A} \\qquad\\Longrightarrow\\qquad \\text{residue} \\;\\mapsto\\; s^2 \\cdot \\text{residue}"}
        </Math>
        <p style={{ textAlign: 'center', opacity: 0.8, marginTop: '-0.2em' }}>
          measured: <Math>{'s = 2 \\to 4.0000'}</Math>, <Math>{'s = 3 \\to 9.0000'}</Math>,{' '}
          <Math>{'s = \\tfrac12 \\to 0.2500'}</Math>
        </p>
        <p>
          <strong>It is genuinely quadratic</strong> — and a linear parametrisation cannot cover a
          quadratically cut set. Which is why the construction here that reached{' '}
          <strong>17 of 18</strong> dimensions was never going to reach the eighteenth. That was not a
          bookkeeping error. <em>Stop looking for the missing index.</em>
        </p>
        <p>
          But look at <em>where</em> the quadratic-ness sits. Write the condition out flat:
        </p>
        <Math display>
          {"\\mathcal{A}'(r_k) \\;-\\; \\mathcal{A}(r_k)\\,\\Sigma_k \\;-\\; \\lambda\\,\\mathcal{A}(r_k)\\,\\mathbf{i} \\;=\\; 0"}
        </Math>
        <p>
          <Math>{'\\lambda'}</Math> multiplies <Math>{'\\mathcal{A}'}</Math>. The system is{' '}
          <strong>bilinear</strong> in <Math>{'(\\mathcal{A}, \\lambda)'}</Math> — and that, and
          nothing else, is the nonlinearity. Meanwhile <Math>{'\\mathcal{A}(r_k)'}</Math> and{' '}
          <Math>{"\\mathcal{A}'(r_k)"}</Math> are both <em>linear</em> in the coefficients of{' '}
          <Math>{'\\mathcal{A}'}</Math>. So:
        </p>
        <p style={{ textAlign: 'center', margin: '0.7em 0' }}>
          <strong style={{ fontSize: '1.15em' }}>
            Fix <Math>{'\\lambda'}</Math>, and it is linear.
          </strong>
        </p>
        <p>
          The fiber is not a difficult variety. It is a <strong>one-real-parameter family of linear
          subspaces</strong> — one <Math>{'\\lambda'}</Math> per pole. Which turns the whole
          construction into this:
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto',
            gap: '0.2em 1.2em',
            justifyContent: 'center',
            margin: '0.7em 0',
            fontSize: '0.78em',
            lineHeight: 1.6,
            alignItems: 'baseline',
          }}
        >
          <span style={{ opacity: 0.55 }}>1</span>
          <span>
            choose the roots of <Math>{'w'}</Math> — now the <Math>{'\\Sigma_k'}</Math> are numbers
          </span>
          <span style={{ opacity: 0.55 }}>2</span>
          <span>
            choose <Math>{'\\lambda'}</Math>, one per pole &nbsp;— <strong>the slider</strong>
          </span>
          <span style={{ opacity: 0.55 }}>3</span>
          <span>
            <strong>linear solve</strong> for <Math>{'\\mathcal{A}'}</Math>&rsquo;s coefficients
          </span>
          <span style={{ opacity: 0.55 }}>4</span>
          <span>
            form <Math>{"\\mathbf{N} = \\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}"}</Math>
          </span>
          <span style={{ opacity: 0.55 }}>5</span>
          <span>
            <strong>linear solve</strong> <Math>{"\\mathbf{p}'w - \\mathbf{p}w' = \\mathbf{N}"}</Math>{' '}
            for <Math>{'\\mathbf{p}'}</Math>
          </span>
        </div>
        <p style={{ textAlign: 'center' }}>
          <strong style={{ fontSize: '1.12em' }}>Two linear solves and a slider.</strong>
        </p>
        <p style={{ opacity: 0.65 }}>
          The plane <em>derives</em>; space <em>parametrises, then solves</em>. Same obstruction,
          different algebra — and the difference is exactly that{' '}
          <Math>{'\\mathbb{C}'}</Math> lets you cancel a factor and <Math>{'\\mathbb{H}'}</Math> does
          not.
        </p>
        <Cite>
          Kalkan et al. (2022) avoid the bilinearity altogether: prescribing{' '}
          <Math>{'\\alpha'}</Math> and <Math>{'\\mathcal{A}'}</Math> makes their system (7)–(9){' '}
          <em>linear</em> in the remaining unknowns, so their solution family is a{' '}
          <strong>vector space</strong>. Same obstruction again, a third algebra.
        </Cite>
      </>
    ),
    notes:
      'THE SHAPE OF THIS SLIDE IS BAD NEWS THEN GOOD NEWS, and both halves matter. The bad news is '
      + 'real and expensive: the spatial condition is quadratic, the 2D trick does not port, and no '
      + 'linear parametrisation of the spatial rational fiber can exist. The good news is that the '
      + 'quadratic-ness is confined to ONE REAL NUMBER PER POLE, so the practical object is a slider '
      + 'over linear solves rather than a nonlinear system. Do not let the room leave with only the '
      + 'first half. '
      + 'THE SCALING MEASUREMENT IS THE PROOF AND IT IS ONE LINE. Scale the spinor by s and the '
      + 'residue scales by s squared -- 4.0000, 9.0000, 0.2500 for s = 2, 3 and one half. That is not '
      + 'an estimate, it is an exact exponent read off three numbers, and it settles the question '
      + 'without any argument about commutativity. F14, pinned by '
      + 'core/__tests__/rationalPHSpatialResidue.test.ts. '
      + 'STOP LOOKING FOR THE MISSING INDEX -- say it, because it cost real time here. The spinor '
      + 'construction in conformalPHStructure.test.ts reaches 17 of 18 dimensions and the instinct is '
      + 'to hunt for a bookkeeping slip. There is none. A linear parametrisation cannot cover a '
      + 'quadratically cut set, so the shortfall is EXPECTED. This is the slide that saves somebody a '
      + 'month, and it is worth saying that out loud. '
      + 'DERIVE VERSUS PARAMETRISE is the cleanest way to carry the contrast. In the plane the '
      + 'condition is linear in S, so coefficients are DERIVED and never solved for -- that is what '
      + 'rationalPHLinearD.ts actually does. In space you PARAMETRISE by lambda first and only then '
      + 'solve, linearly. Same obstruction, different algebra, and the whole difference is that C '
      + 'lets you cancel a factor and H does not. '
      + 'DO NOT OVERSELL "LINEAR". For FIXED lambda the system is linear in the coefficients of A. '
      + 'Jointly in (A, lambda) it is bilinear, and the fiber taken over all lambda is a union of '
      + 'linear subspaces -- ruled, not linear. If somebody asks whether the whole fiber is a linear '
      + 'space the answer is no, and the honest description is a one-parameter family of them. '
      + 'THIS SLIDE IS WHAT MAKES THE ENDING POSSIBLE. Without it the last slide would have to '
      + 'promise a Newton solve; with it, the figure is a slider and two linear solves, which is a '
      + 'thing a person can actually feel.',
  },

  // ---------------------------------------------------------------------------
  // 13 — the ledger: why exactly three
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['LIT', 'MEAS']} />
        <h2>Three, because space is three-dimensional</h2>
        <p>
          Slide 9 got &ldquo;three conditions per root&rdquo; by counting the components of a vector.
          Here is the same three from the <em>structure</em> of the equation — and the agreement is not
          a coincidence. The recovery step is a linear map:
        </p>
        <Math display>
          {"L : \\mathbf{p} \\;\\longmapsto\\; \\mathbf{p}'w - \\mathbf{p}w'"}
        </Math>
        <p>
          and it has a kernel you can write down. Put <Math>{"\\mathbf{p} = \\mathbf{c}_0 w"}</Math>{' '}
          for a <em>constant</em> vector <Math>{'\\mathbf{c}_0'}</Math>:
        </p>
        <Math display>
          {"L(\\mathbf{c}_0 w) \\;=\\; \\mathbf{c}_0 w'w - \\mathbf{c}_0 w w' \\;=\\; 0"}
        </Math>
        <p>
          And adding it does exactly one thing to the curve:{' '}
          <Math>{"(\\mathbf{p} + \\mathbf{c}_0 w)/w = \\mathbf{p}/w + \\mathbf{c}_0"}</Math>. So the
          kernel is exactly the <strong>translations</strong> — the integration constant, the one
          point you place. Its dimension is <strong>3</strong>. Now count, for one pole and a
          quadratic spinor:
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto',
            gap: '0.2em 2em',
            justifyContent: 'center',
            margin: '0.8em 0',
            fontSize: '0.8em',
            lineHeight: 1.6,
            alignItems: 'baseline',
          }}
        >
          <span style={{ opacity: 0.6 }}>
            <Math>{'\\deg w = 1'}</Math>, <Math>{'\\deg \\mathcal{A} = 2'}</Math>, so{' '}
            <Math>{'\\deg \\mathbf{N} = 4'}</Math> and <Math>{'\\deg \\mathbf{p} = 4'}</Math>
          </span>
          <span />
          <span>
            unknowns — <Math>{'\\mathbf{p}_0 \\ldots \\mathbf{p}_4'}</Math>, three components each
          </span>
          <span style={{ textAlign: 'right' }}>15</span>
          <span>
            equations — <Math>{'t^0 \\ldots t^4'}</Math>, three components each
          </span>
          <span style={{ textAlign: 'right' }}>15</span>
          <span>kernel — the translations</span>
          <span style={{ textAlign: 'right' }}>−3</span>
          <span style={{ borderTop: '1px solid rgba(0,0,0,0.25)', paddingTop: '0.25em' }}>rank</span>
          <span
            style={{
              borderTop: '1px solid rgba(0,0,0,0.25)',
              paddingTop: '0.25em',
              textAlign: 'right',
            }}
          >
            12
          </span>
          <span>
            <strong>cokernel</strong> — conditions on <Math>{'\\mathbf{N}'}</Math> for solvability
          </span>
          <span style={{ textAlign: 'right' }}>
            <strong>3</strong>
          </span>
        </div>
        <p>
          Three. And they are precisely the residue conditions at that pole — the image has
          codimension three, so three independent conditions on <Math>{'\\mathbf{N}'}</Math> must hold
          before <Math>{'\\mathbf{p}'}</Math> exists at all. The same count with{' '}
          <Math>{'m'}</Math> poles gives <Math>{'3m'}</Math>: three per root, exactly as before.
        </p>
        <p style={{ textAlign: 'center', margin: '0.7em 0' }}>
          <strong style={{ fontSize: '1.12em' }}>
            The number of conditions is the dimension of the translation kernel — which is the
            dimension of space.
          </strong>
        </p>
        <p>
          Check it against the plane. There the kernel is <Math>{'c_0 D'}</Math> with{' '}
          <Math>{'c_0'}</Math> <em>complex</em> — two real dimensions — and the residue condition is
          one <em>complex</em> equation, two real conditions. Same statement, one dimension down.
        </p>
        <p style={{ opacity: 0.65 }}>
          So the obstruction is dual to the freedom: the curve may be translated in three directions,
          and it costs exactly three conditions for the curve to exist. Measured — spinors of the
          allowed form make this system solvable to <Math>{'6 \\times 10^{-15}'}</Math>; an off-form
          spinor leaves it at <Math>{'7.8 \\times 10^{-1}'}</Math>.
        </p>
      </>
    ),
    notes:
      'THE WORD CONSTANT IS DOING THE WORK, and that is deliberate. A reader asked whether a prime '
      + 'was missing on c_0; it is not -- c_0 is a CONSTANT vector, so the product rule gives '
      + 'c_0-prime w plus c_0 w-prime and the first term is zero. An intermediate line spelling that '
      + 'out was added and then CUT, Eric-s call 2026-08-11: for this audience it reads as '
      + 'over-explaining, and the italicised "constant" already carries it. If the same question '
      + 'comes up in a room, answer it aloud rather than putting it back on the slide. '
      + 'AND SHOW WHAT THE KERNEL DOES, not just that it is a kernel. Adding c_0 w to p sends the '
      + 'curve to p/w + c_0 -- a translation by c_0, full stop. That is what makes "the kernel is the '
      + 'integration constant" a fact rather than a slogan, and it is one line of algebra. '
      + 'THE PUNCHLINE IS A DUALITY AND IT IS WORTH LANDING SLOWLY. The curve can always be translated '
      + '-- that is the integration constant, and it is three-dimensional because space is. Rank-'
      + 'nullity then charges you for it: the image drops by three, so three independent conditions '
      + 'on N are needed before p exists. THE OBSTRUCTION IS DUAL TO THE FREEDOM. The three in "three '
      + 'conditions per root" is not about N happening to have three components; it is the dimension '
      + 'of the space the curve lives in, arriving twice by different routes. '
      + 'THE PLANE IS THE CHECK, NOT AN ASIDE. F13 records it: L maps F to F-prime D minus F D-prime '
      + 'with a ONE-dimensional COMPLEX kernel (F = c times D, a translation) and an m-dimensional '
      + 'complex cokernel. Complex one is real two, and the planar residue condition is one complex '
      + 'equation -- two real conditions. Conditions per root equals the dimension of the ambient '
      + 'space in both cases. If the room only takes one thing from the slide, take that. '
      + 'THE ARITHMETIC IN FULL, if anyone wants it. With deg w = m and deg A = n: deg N = 2n, and '
      + 'matching leading coefficients in p-prime w minus p w-prime gives deg p = 2n - m + 1 (the '
      + 'leading term carries a factor k - m, which is why the degree is not the naive one). So '
      + 'unknowns are 3(2n - m + 2), equations are 3(2n + 1), kernel is 3, and cokernel = equations '
      + 'minus unknowns plus kernel = 3m. Three per root for every m. Note the system is SQUARE only '
      + 'when m = 1; for m greater than one it is overdetermined, and the 3m still comes out right. '
      + 'Do not say "square" as a general claim -- the slide shows the m = 1 case and says so. '
      + 'THE 15 BY 15 IS NOT AN INVENTED EXAMPLE. It is the system F14 actually solved, pinned in '
      + 'core/__tests__/rationalPHSpatialResidue.test.ts, with the two residuals quoted on the slide. '
      + 'One pole and a quadratic spinor is also exactly the configuration the final slide proposes '
      + 'to build, so the room is being shown the ledger of the thing they are about to see run.',
  },

  // ---------------------------------------------------------------------------
  // 14 — rare, but not scarce
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status={['LIT', 'MEAS']} />
        <h2>Rare — but not scarce</h2>
        <p>
          Conditions this stiff are usually not met. For a <em>generic</em> choice of spinor and
          denominator, the only solutions are the <strong>polynomial</strong> ones: truly rational
          spatial PH curves are the exceptional case.
        </p>
        <p>
          Be careful what that quantifies over. It fixes the <em>input pair</em> and asks what comes
          out — a statement about <strong>sampling</strong>, not about how many rational PH curves
          exist. Singular matrices are measure zero too, and there is no shortage of them.
        </p>
        <p>And the rarity is not even uniform. It is governed entirely by the roots of the denominator:</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto auto',
            gap: '0.3em 1.6em',
            justifyContent: 'center',
            margin: '0.7em 0',
            fontSize: '0.78em',
            lineHeight: 1.5,
            alignItems: 'baseline',
          }}
        >
          <span style={{ opacity: 0.6 }}>multiplicity</span>
          <span style={{ opacity: 0.6 }}>condition</span>
          <span style={{ opacity: 0.6 }}>how rare</span>
          <span><Math>{'n = 1'}</Math></span>
          <span><Math>{"\\{\\mathbf{f}_0, \\mathbf{f}_1\\}"}</Math> dependent</span>
          <span>codimension <strong>2</strong></span>
          <span><Math>{'n = 2'}</Math></span>
          <span><Math>{"\\det(\\mathbf{f}_0,\\mathbf{f}_1,\\mathbf{f}_2) = 0"}</Math></span>
          <span>codimension <strong>1</strong></span>
          <span><Math>{'n \\geq 3'}</Math></span>
          <span><em>automatic</em></span>
          <span><strong>not rare at all</strong></span>
        </div>
        <p>
          And there is a systematic way in, older than the theorem. <strong>Invert a polynomial PH
          curve.</strong> Möbius maps are conformal, so they scale speed by a rational factor and
          rational speed stays rational. Put <Math>{"\\mathbf{p} = \\mathbf{r} - \\mathbf{c}"}</Math>{' '}
          and <Math>{"w = \\mathbf{p}\\cdot\\mathbf{p}"}</Math>.
        </p>
        <p style={{ textAlign: 'center', margin: '0.7em 0' }}>
          <strong style={{ fontSize: '1.12em' }}>
            Measured here: the condition then holds at <em>every</em> root, not merely at one.
          </strong>
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto auto',
            gap: '0.25em 1.6em',
            justifyContent: 'center',
            margin: '0.5em 0',
            fontSize: '0.76em',
            alignItems: 'baseline',
          }}
        >
          <span style={{ opacity: 0.6 }} />
          <span style={{ opacity: 0.6 }}>roots of <Math>{'w'}</Math></span>
          <span style={{ opacity: 0.6 }}>dependence</span>
          <span>9 Möbius images</span>
          <span>10, all simple</span>
          <span><strong><Math>{'\\leq 6.2\\times 10^{-15}'}</Math></strong></span>
          <span>9 generic pairs (control)</span>
          <span>5–10, all simple</span>
          <span><Math>{'0.39 - 0.85'}</Math></span>
        </div>
        <p style={{ opacity: 0.65 }}>
          The mechanism is structural: <Math>{"w = \\|\\mathbf{r} - \\mathbf{c}\\|^2"}</Math>, so
          the roots of <Math>{'w'}</Math> are exactly the complex parameters where the curve meets the{' '}
          <strong>isotropic cone centred at the inversion point</strong> — and every one of them is a
          cusp of the indicatrix. Exceptional, and systematically reachable.
        </p>
        <Cite>
          Genericity and the multiplicity cases: Kalkan et al. (2022), §1, §4, Lemmas 4.2–4.4. The
          Möbius route is their ref. [1] — rational RMF curves from planar PH cubics by Möbius
          transformations (2008). The measurement is this project&rsquo;s and is not yet in a pinning
          test.
        </Cite>
      </>
    ),
    notes:
      'THIS SLIDE EXISTS BECAUSE THE FIRST VERSION OVERSTATED THE GENERICITY RESULT, and the '
      + 'objection came from the room: if you can lift a polynomial PH curve, apply a Mobius '
      + 'transformation and land back on a rational PH curve, then they cannot be rare. That is '
      + 'correct, and the construction is literally reference [1] of the paper being cited. '
      + 'THE RESOLUTION IS A QUANTIFIER, and it is worth saying slowly. Kalkan et al. fix the INPUT '
      + 'pair and ask what solutions come out; genericity is over inputs. A curve produced by '
      + 'inverting a polynomial has an input pair that is anything but generic -- it was '
      + 'manufactured. So the theorem describes a construction-s hit rate, not the size of the '
      + 'family. The singular-matrix analogy lands this in one sentence; use it. '
      + 'THE MULTIPLICITY TABLE IS THE MORE USEFUL FACT and it is what the first draft hid behind the '
      + 'word "exceptional". At multiplicity three or more the condition is AUTOMATIC (Lemma 4.4), '
      + 'which is why their own Example 5.1 takes alpha = t cubed. Rarity is a property of the '
      + 'denominator-s root structure, not of rational PH curves. '
      + 'THE MEASUREMENT IS OURS AND IT IS STRONGER THAN THE THEOREM NEEDS. Thm 4.6 asks for the '
      + 'dependence at ONE root. Nine Mobius specimens -- three spinors crossed with three inversion '
      + 'centres -- satisfy it at ALL TEN, to 6.2e-15, while nine generic pairs sit at 0.39 to 0.85. '
      + 'The control is what makes the number mean anything; quote both or neither. '
      + 'THE MECHANISM MAKES IT INEVITABLE RATHER THAN LUCKY: w is the squared distance to the '
      + 'inversion centre, so its roots are precisely where the complexified curve meets the '
      + 'isotropic cone at that centre, and the indicatrix cusps at each. Anyone can see why it '
      + 'happens at every root once it is put that way. '
      + 'PINNED: core/__tests__/rationalPHConstruction.test.ts, first describe block -- nine specimens '
      + 'plus a control, tested as a polynomial divisibility (w divides N x N-prime) so no root finder '
      + 'is needed. The tolerance there is 1e-10 rather than machine zero because synthetic division of '
      + 'a degree-27 polynomial costs about three digits; the same claim measured at the roots directly '
      + 'is 6.2e-15, and the control sits nine orders away.',
  },

  // ---------------------------------------------------------------------------
  // 15 — what you actually get
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="MEAS" />
        <h2>What you actually get</h2>
        <p>
          Take the smallest genuinely rational case — a quadratic spinor and a <em>linear</em>{' '}
          denominator, so there is one pole and <Math>{'\\Sigma = 0'}</Math>. Two things fall out at
          once. The Bézier positivity requirement <Math>{'w > 0'}</Math> on{' '}
          <Math>{'[0,1]'}</Math> is exactly &ldquo;the pole lies outside the interval&rdquo;; and the
          condition collapses to
        </p>
        <Math display>
          {"\\mathcal{A}'(r) = \\lambda\\,\\mathcal{A}(r)\\,\\mathbf{i}"}
        </Math>
        <p>
          which needs no solver at all: choose <Math>{'\\mathcal{A}_0'}</Math> and{' '}
          <Math>{'\\mathcal{A}_2'}</Math> freely and <Math>{'\\mathcal{A}_1'}</Math> comes out in{' '}
          <strong>closed form</strong> — the system splits into two <Math>{'2\\times 2'}</Math>{' '}
          blocks of determinant <Math>{'1 + (\\lambda r)^2'}</Math>. Then{' '}
          <Math>{"\\mathbf{N} = \\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*}"}</Math>, one linear solve for{' '}
          <Math>{'\\mathbf{p}'}</Math>, and degree-elevate <Math>{'w'}</Math> to match:
        </p>
        <p style={{ textAlign: 'center', margin: '0.6em 0' }}>
          <strong style={{ fontSize: '1.1em' }}>
            a rational Bézier of degree 4 — five control points, five weights.
          </strong>
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto',
            gap: '0.25em 1.4em',
            justifyContent: 'center',
            margin: '0.6em 0',
            fontSize: '0.76em',
            alignItems: 'baseline',
          }}
        >
          <span style={{ opacity: 0.6 }}>weights, measured</span>
          <span><Math>{'1,\\; 1.25,\\; 1.5,\\; 1.75,\\; 2'}</Math> — <strong>arithmetic progression</strong>, all positive</span>
          <span style={{ opacity: 0.6 }}>speed</span>
          <span><Math>{"\\|\\mathbf{c}'\\| = |\\mathcal{A}|^2/w^2"}</Math> to <Math>{'3\\times10^{-16}'}</Math></span>
          <span style={{ opacity: 0.6 }}>C¹ Hermite</span>
          <span>rank <strong>12</strong> of 13 — fiber is the <em>gauge alone</em></span>
        </div>
        <p>
          The weights are not free: elevating a linear <Math>{'w'}</Math> interpolates its two ends, so
          five weights carry two parameters. <strong>Weight freedom costs residue conditions</strong> —
          a second pole buys a freer denominator and charges three more.
        </p>
        <p>
          And the Hermite count is <strong>square</strong>. Prescribe both endpoints and both end
          tangents and the family is exhausted: <Math>{'\\lambda'}</Math> is <em>determined by the
          data</em>, not a slider. A fiber needs either less data or a higher-degree spinor.
        </p>
        <p style={{ textAlign: 'center', margin: '0.6em 0' }}>
          <strong style={{ fontSize: '1.1em' }}>
            And on this chart the arc length is <em>rational</em> too.
          </strong>
        </p>
        <p>
          Expand the speed at a pole. With <Math>{'w = (t-r_k)\\varphi'}</Math> the numerator is{' '}
          <Math>{"\\sigma/\\varphi^2"}</Math>, not <Math>{'\\sigma'}</Math>, so the coefficient of
          the logarithm carries two terms:
        </p>
        <Math display>
          {"B_k \\;=\\; \\bigl[\\,\\sigma'(r_k) - 2\\,\\sigma(r_k)\\,\\Sigma_k\\,\\bigr] \\big/ \\varphi(r_k)^2"}
        </Math>
        <p>
          And slide 12 already killed it: <Math>{"(|\\mathcal{A}|^2)' = 2\\Sigma_k|\\mathcal{A}|^2"}</Math>{' '}
          is exactly <Math>{"\\sigma'(r_k) = 2\\Sigma_k\\sigma(r_k)"}</Math>, so the bracket
          vanishes <strong>identically</strong> — one pole or many.
        </p>
        <p style={{ textAlign: 'center' }}>
          <strong>
            The condition that makes the <em>curve</em> rational is the same one that makes its{' '}
            <em>arc length</em> rational.
          </strong>
        </p>
        <p>
          But only <em>on this chart</em>. The residue of{' '}
          <Math>{'\\mathbf{N}/w^2'}</Math> also vanishes when{' '}
          <Math>{'\\mathcal{A}(r) = 0'}</Math> — the pole <em>cancels</em>, the curve is rational with
          no condition imposed at all, and the speed keeps a simple pole, so{' '}
          <strong>the logarithm survives there</strong>. That is the stratum the{' '}
          <Math>{'\\lambda'}</Math>-chart misses, and this is what it costs.
        </p>
        <p style={{ opacity: 0.65 }}>
          So exact arc-length parametrisation is available wherever{' '}
          <Math>{'\\mathcal{A}(r) \\neq 0'}</Math> and the poles are real: equal spacing and
          constant-speed motion with no quadrature. And measured on the closed fiber, arc
          length is <strong>constant</strong> along it (spread <Math>{'5.7\\times10^{-8}'}</Math>) —
          so, exactly as in the polynomial case, <em>no functional of length can choose among these
          curves</em>.
        </p>
        <Cite>
          Framework: Kalkan et al. (2022). Construction, weight progression, Hermite rank and the
          arc-length identity measured here and pinned in{' '}
          <Math>{'\\texttt{rationalPHConstruction.test.ts}'}</Math>. <strong>Rational arc length is
          not new, and not automatic</strong>: Farouki &amp; Sakkalis, CAGD <strong>74</strong> (2019),
          state that <em>&ldquo;only a subset of the rational PH curves admits rational arc
          lengths&rdquo;</em>. What is added here is <em>where</em> the subset ends —{' '}
          <Math>{'\\mathcal{A}(r) = 0'}</Math>. Complex poles untested.
        </Cite>
      </>
    ),
    notes:
      'THIS IS THE SLIDE A BUILDER WANTS, and until 2026-08-11 the deck did not have it. Eric-s '
      + 'objection was exact: we had a full act about a CONDITION and never said what comes out the '
      + 'other end, how many control points, which parameters are free, or where a slider would go. '
      + 'Everything on this slide was measured the day it was written. '
      + 'THE TWO COINCIDENCES ARE WORTH POINTING AT. First, w positive on [0,1] -- the Bezier '
      + 'requirement -- is the SAME condition as the pole lying outside the interval. Second, with '
      + 'one pole Sigma is an empty sum, so the condition needs no solver: fixing A_0 and A_2 leaves '
      + 'a 2x2 block system for A_1 with determinant 1 + (lambda r)^2, never singular. The smallest '
      + 'case is closed form. '
      + 'THE WEIGHTS IN ARITHMETIC PROGRESSION ARE A REAL DESIGN CONSTRAINT, not a curiosity. Degree-'
      + 'elevating a linear w to degree 4 interpolates its two end values, so the five weights carry '
      + 'two parameters. Anyone expecting to design with free weights needs a higher-degree '
      + 'denominator, and that costs three residue conditions per extra pole. State the trade. '
      + 'THE HERMITE RANK IS THE ANSWER TO "WHERE IS THE SLIDER", AND IT IS NO. Measured: 17 '
      + 'parameters, 4 constraints, tangent dimension 13, Hermite map rank 12, so the fiber is one '
      + 'dimensional and that one dimension is the gauge -- which changes nothing. So lambda is '
      + 'determined by C1 Hermite data. An interactive fiber needs a cubic spinor or less prescribed '
      + 'data. That is a measurement, and it killed the figure that was planned. '
      + 'THE ARC LENGTH RESULT, AND THE MISTAKE IT COST TO GET RIGHT. A first version of this slide '
      + 'said the log coefficient WAS sigma-prime(r), giving a general formula with nonzero terms '
      + '2 Sigma_k sigma(r_k). That is wrong: the Laurent numerator at a pole is sigma over phi '
      + 'squared, not sigma, and differentiating phi-to-the-minus-two adds the second term, so the '
      + 'coefficient is [sigma-prime(r_k) - 2 sigma(r_k) Sigma_k] over phi(r_k) squared. At ONE pole '
      + 'phi is identically 1 and Sigma is zero, so both terms vanish separately and the wrong '
      + 'reasoning gives the right number -- which is exactly why the measurement passed and the '
      + 'argument did not generalise. Caught by another session, measured at two poles: the true '
      + 'coefficients are 4.6e-13 and -6.3e-13 where the wrong formula predicts 1.92 and -1.48. '
      + 'THE CORRECTED RESULT IS STRONGER, and that is the version to present. The bracket vanishes '
      + 'IDENTICALLY, because sigma-prime(r_k) = 2 Sigma_k sigma(r_k) is slide 12-s own identity. So '
      + 'the arc length is rational at ANY number of poles, and the same condition buys both: the '
      + 'curve is rational AND its length is. Verified constructively at m = 2 (a rational '
      + 'antiderivative fits to 2.4e-14, agreeing with quadrature at 0.555996). Note the 2022 paper '
      + 'says rational "only in special cases" -- this family is a large one, precisely characterised. '
      + 'AND THE FIBER CARRIES THE POLYNOMIAL PUNCHLINE AFTER ALL. Arc length is CONSTANT along the '
      + 'closed loop, spread 5.7e-8 over 13 samples. onePoleLoop.test.ts used to say the rational '
      + 'fiber had none of the polynomial fiber-s virtues; it has this one. The consequence is the '
      + 'one Act I already made: length is a BLIND selector, so the choice rule has to come from '
      + 'somewhere else. '
      + 'MEAS is earned here in a way it was not earlier in the act: these numbers are not '
      + 're-verifications of somebody else-s statement. Pinned in '
      + 'core/__tests__/rationalPHConstruction.test.ts, second describe block.',
  },

  // ---------------------------------------------------------------------------
  // 14 — where the edge is
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="OPEN" />
        <h2>Where the edge actually is</h2>
        <p>
          The honest version, after the literature check. Most of Act II is <em>theirs</em> — and in a
          stronger form than this deck gives. What follows is what they leave open, in their words.
        </p>

        <p style={{ marginBottom: '0.2em' }}>
          <strong>Closed, and I had it wrong.</strong>
        </p>
        <p style={{ marginLeft: '1.2em', opacity: 0.8 }}>
          Multiple roots, complex roots, and the geometric meaning are all <em>done</em>. Lemmas
          4.2–4.4 cover multiplicity <Math>{'n = 1, 2'}</Math> and <Math>{'n \\geq 3'}</Math> — where
          the condition is <em>always</em> satisfiable. Theorem 4.6 handles complex roots by conjugate
          pairs. And Remark 4.7 names the geometry: dependence of{' '}
          <Math>{"\\{\\mathbf{F},\\mathbf{F}'\\}"}</Math> is a <strong>cusp</strong> of the tangent
          indicatrix, adding <Math>{"\\mathbf{F}''"}</Math> makes it an <strong>inflection</strong>.
        </p>

        <p style={{ marginBottom: '0.2em', marginTop: '0.5em' }}>
          <strong>1. The dimension and basis of the solution space.</strong>
        </p>
        <p style={{ marginLeft: '1.2em' }}>
          Their own words: <em>&ldquo;Questions about dimension and basis of the solution space will
          not be formally treated in this paper.&rdquo;</em> Their examples give it case by case —
          dimension 4, then 5, then 6 as the degree rises — with no general statement.
        </p>

        <p style={{ marginBottom: '0.2em', marginTop: '0.5em' }}>
          <strong>2. More than one pole.</strong>
        </p>
        <p style={{ marginLeft: '1.2em' }}>
          They observe a recursive structure for a single repeated root and then stop:{' '}
          <em>&ldquo;A similar statement for <Math>{'\\alpha'}</Math> having several linear factors is
          a topic of future research. These observations hint at the existence of nested solution
          spaces with a clear recursive generation.&rdquo;</em> Several distinct poles is exactly the
          case where our <Math>{'\\Sigma_k'}</Math> stops being zero.
        </p>

        <p style={{ marginBottom: '0.2em', marginTop: '0.5em' }}>
          <strong>3. Interpolation, and choosing.</strong>
        </p>
        <p style={{ marginLeft: '1.2em' }}>
          They note that enlarging the solution space <em>&ldquo;would allow to solve various
          interpolation problems&rdquo;</em> — and do not solve them. Act I of this talk was
          <em> entirely</em> about interpolation families and their choice rules; the rational spatial
          analogue has neither. No Hermite theory, and no criterion for picking a member.
        </p>

        <p style={{ marginBottom: '0.2em', marginTop: '0.5em' }}>
          <strong>
            4. The stratum <Math>{'\\mathcal{A}(r) = 0'}</Math> — and what it costs.
          </strong>
        </p>
        <p style={{ marginLeft: '1.2em' }}>
          Every result quoted above assumes it away. Kalkan et al. require{' '}
          <Math>{'\\mathcal{A}'}</Math> <em>reduced with respect to</em>{' '}
          <Math>{'\\mathbf{i}'}</Math>, which is exactly{' '}
          <Math>{'\\mathbf{f}_0 \\neq 0'}</Math>, i.e.{' '}
          <Math>{'\\mathcal{A}(r) \\neq 0'}</Math>. But the residue of{' '}
          <Math>{'\\mathbf{N}/w^2'}</Math> vanishes there too — the pole simply{' '}
          <em>cancels</em> — so the curve is rational with <strong>no condition imposed at all</strong>.
          And that is precisely where the arc length stops being rational: the speed keeps a simple
          pole and the logarithm survives. The chart everyone uses ends exactly at the boundary of
          arc-length rationality.
        </p>

        <p style={{ textAlign: 'center', marginTop: '0.6em' }}>
          <strong>
            Three questions theirs, one ours — and the literature check is what made the list short
            enough to see that.
          </strong>
        </p>
        <Cite>
          Kalkan, Scharler, Schröcker &amp; Šír, <em>Rational Framing Motions and Spatial Rational
          Pythagorean Hodograph Curves</em>, CAGD (2022) — §3 preamble, Rem. 5.2, §5. Checked against
          the paper 2026-08-11; an earlier draft of this slide claimed three open items that are
          Lemmas 4.3, 4.4 and Rem. 4.7.
        </Cite>
      </>
    ),
    notes:
      'THIS SLIDE WAS REWRITTEN AFTER THE LITERATURE CHECK AND THE REWRITE IS THE POINT. The first '
      + 'draft listed multiple roots, complex roots and the geometric reading as OPEN. All three are '
      + 'in Kalkan-Scharler-Schrocker-Sir 2022, which was sitting unread in the project folder. '
      + 'Saying so on the slide, out loud, is worth more than quietly deleting them: it shows the '
      + 'method working, and it is the exact failure THE_LATTICE section 5 names -- presenting known '
      + 'material as discovery. '
      + 'THE THREE SURVIVORS ARE QUOTED, NOT GUESSED, and that is the difference from the draft. Each '
      + 'one is the authors saying in print that they did not do it: dimension and basis "will not be '
      + 'formally treated"; several linear factors is "a topic of future research"; the larger '
      + 'solution space "would allow to solve various interpolation problems" and they do not. An '
      + 'OPEN item backed by the authors own sentence is worth ten backed by our not having looked. '
      + 'ITEM 3 IS THE ONE THAT CONNECTS BACK TO ACT I, and it is where this project actually has '
      + 'something. The whole first act was interpolation families -- circle, torus, choice rules, '
      + 'arc length that cannot choose. None of that exists on the rational side. That is a real gap '
      + 'and it is shaped exactly like work this repository already knows how to do. '
      + 'THE TWIST ITEM WAS DROPPED. The earlier draft argued that quaternion factorization theory '
      + 'cannot reach our object because a circle bundle is not a covering. Kalkan et al. cite and '
      + 'USE factorization theory inside their proofs -- linear left factors with a given norm '
      + 'polynomial are unique -- applied to A itself, which is precisely the untwisted use that was '
      + 'always available. The claim was not wrong, but it was answering a question nobody needed '
      + 'asked. '
      + 'ITEM 4 IS THE ONE THAT IS OURS, and it arrived last, after reading Farouki and Sakkalis '
      + '2019. Every result on this slide assumes A(r) is nonzero -- Kalkan et al. require A "reduced '
      + 'with respect to i", which IS f_0 nonzero, which IS A(r) nonzero, and their Lemma 4.2 proof '
      + 'says so explicitly. But the residue of N/w^2 vanishes on that stratum as well, because the '
      + 'pole cancels, so the curve is rational with NOTHING imposed. And the speed keeps a simple '
      + 'pole there, so the arc length is not. The chart everybody uses ends exactly at the boundary '
      + 'of arc-length rationality -- that is a REASON to care about the stratum, where before it was '
      + 'only a caveat. '
      + 'DO NOT LET THIS SLIDE DRIFT BACK. Any future addition here needs a citation showing the '
      + 'authors left it open -- or, as with item 4, an argument for why their hypothesis excludes '
      + 'it. Otherwise it does not go on the slide.',
  },

  // ---------------------------------------------------------------------------
  // 15 — what to build, and why a figure earns its place here
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <Tag status="OPEN" />
        <h2>Build the exceptional case</h2>
        <p>
          One thing in this talk cannot be shown in a formula: that the rational curves are{' '}
          <strong>rare</strong>. Generic data gives polynomials; the rational ones live on a thin set.
          A thin set is invisible in an equation and obvious in your hands — which is exactly when an
          interactive figure earns its place instead of decorating.
        </p>
        <p>
          And the instrument is already on screen. It is the sphere from Act I. The direction{' '}
          <Math>{"\\hat{\\mathbf{n}} = q\\,\\mathbf{i}\\,q^{*}"}</Math> tracing{' '}
          <Math>{'S^2'}</Math> <em>is</em> the <strong>tangent indicatrix</strong>, and its
          un-normalised form is the object the whole rational condition is stated about:
        </p>
        <Math display>
          {"\\mathbf{F} \\;=\\; \\mathcal{A}\\,\\mathbf{i}\\,\\mathcal{A}^{*} \\;=\\; \\mathbf{N}"}
        </Math>
        <p>
          So the figure is this. Draw <Math>{'\\mathbf{F}'}</Math> on the sphere. Mark the pole. Drag
          the spinor&rsquo;s coefficients and watch the two Taylor vectors{' '}
          <Math>{"\\mathbf{F}(r), \\mathbf{F}'(r)"}</Math> at that pole. They are generically
          independent and nothing rational exists. Bring them into line — <em>make the indicatrix
          cusp</em> — and a rational PH curve appears.
        </p>
        <p style={{ textAlign: 'center', margin: '0.8em 0' }}>
          <strong style={{ fontSize: '1.15em' }}>
            The rational curves live exactly where the indicatrix cusps.
          </strong>
        </p>
        <p>
          That single sentence carries Theorem 4.6 at <Math>{'n = 1'}</Math>, our{' '}
          <Math>{"\\hat{\\mathbf{n}}'(r) = 0"}</Math>, &ldquo;grow, spin, but do not tilt&rdquo;, and
          the genericity result — all four are the same picture, and the picture is on a sphere the
          audience met on slide 4.
        </p>
        <p style={{ opacity: 0.65 }}>
          Tagged <Math>{'\\textsf{OPEN}'}</Math> because it does not exist. What does exist:{' '}
          <Math>{'\\texttt{core/quaternion.ts}'}</Math>, the spatial PH modules, and{' '}
          <Math>{'\\texttt{rationalPHSpatialResidue.test.ts}'}</Math>, which already builds
          admissible spinors and solves the recovery system to{' '}
          <Math>{'6 \\times 10^{-15}'}</Math>. The mathematics is done and borrowed; the instrument
          is neither.
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.5em' }}>
          <strong>
            And the gap worth taking: Act I was interpolation — circles, tori, choice rules. The
            rational side has none of it.
          </strong>
        </p>
        <Cite>
          Kalkan et al. (2022), Rem. 4.7 (cusp and inflection of the indicatrix) and §4 (genericity).
          The sphere is Act I&rsquo;s; the reading of it as an instrument is this deck&rsquo;s
          suggestion, not the paper&rsquo;s.
        </Cite>
      </>
    ),
    notes:
      'THE ENDING CHANGED BECAUSE THE LITERATURE CHECK CHANGED IT, and that is worth knowing before '
      + 'delivering it. The planned ending was "one pole, one slider" -- a construction figure. After '
      + 'reading Kalkan et al. that is a worse idea: their construction is cleaner than ours (fix '
      + 'alpha and A, solve a LINEAR system, get a vector space of solutions), so a slider through '
      + 'our fiber would be showing off a route rather than a result. What survives, and is better, '
      + 'is that the interesting fact is a GENERICITY statement, and genericity is the one kind of '
      + 'claim a figure can carry better than a formula. '
      + 'THE SPHERE COMING BACK IS THE POINT. Slide 4 put a direction on S^2 and called it n-hat. It '
      + 'was the tangent indicatrix all along, and the entire rational condition is a statement about '
      + 'that curve on that sphere. The deck therefore closes on the object it opened with, with no '
      + 'new machinery in the last five minutes. If a figure is ever built, this is the one. '
      + 'FOUR THINGS ARE ONE PICTURE, and say it: Thm 4.6 at n = 1, the n-hat-prime = 0 corollary, '
      + '"grow, spin, but do not tilt", and the genericity result. They came from four different '
      + 'directions across two acts and they are all "the indicatrix has a cusp at the pole". That '
      + 'convergence is the best evidence the deck has that its story is the right one. '
      + 'BE HONEST ABOUT WHAT EXISTS. core/quaternion.ts, the spatial PH modules and '
      + 'rationalPHSpatialResidue.test.ts already build admissible spinors and solve the recovery '
      + 'system. What is missing is the drawing and the dragging, not the mathematics. OPEN is the '
      + 'right tag and the reason is "unbuilt", not "unknown". '
      + 'THE LAST LINE POINTS AT THE ONE REAL GAP. Act I was interpolation and choice rules; the '
      + 'rational side has neither, and Kalkan et al. say in print that a bigger solution space '
      + '"would allow to solve various interpolation problems" without solving them. That is where '
      + 'this repository could actually contribute, and it is the note to end a scaffolding deck on.',
  },

  // ---------------------------------------------------------------------------
  // 16 — references
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>References</h2>
        <p style={{ opacity: 0.7 }}>
          <strong>✓</strong> read for this deck &nbsp;·&nbsp; <strong>○</strong> cited from secondary
          sources, not verified here
        </p>
        <div style={{ fontSize: '0.72em', lineHeight: 1.55 }}>
          <p>
            <strong>✓</strong> B. Kalkan, D. F. Scharler, H.-P. Schröcker, Z. Šír,{' '}
            <em>Rational Framing Motions and Spatial Rational Pythagorean Hodograph Curves</em>,
            Computer Aided Geometric Design (2022). arXiv:2111.04600. — Act II. Thm. 3.6, Thm. 4.6,
            Lemmas 4.2–4.5, Rem. 4.7, Rem. 5.2.
          </p>
          <p>
            <strong>○</strong> R. T. Farouki, C. Giannelli, C. Manni, A. Sestini,{' '}
            <em>Identification of spatial PH quintic Hermite interpolants with near-optimal shape
            measures</em>, CAGD <strong>25</strong> (2008) 274–297. — the sandwich chain, the torus,
            arc length depending on one parameter.
          </p>
          <p>
            <strong>○</strong> H.-I. Choi, C.-Y. Han, H.-P. Lee, S.-Y. Roh, N.-S. Wee,{' '}
            <em>Clifford Algebra, Spin Representation, and Rational Parameterization of Curves and
            Surfaces</em>, Advances in Computational Mathematics (2002). — the cone and the spin
            cover, Act I.
          </p>
          <p>
            <strong>○</strong> R. T. Farouki, T. Sakkalis — planar PH curves and the complex model;
            spatial PH curves (1994). H.-I. Choi, D.-S. Lee, H.-P. Moon (2002) — the quaternion and
            Hopf-map representations.
          </p>
          <p>
            <strong>○</strong> K. K. Kubota (1972) — Pythagorean polynomial triples; the real factor{' '}
            <Math>{'h'}</Math> and the primitive case. H. Hopf (1931) — the fibration{' '}
            <Math>{'S^3 \\to S^2'}</Math>.
          </p>
          <p>
            <strong>✓</strong> R. T. Farouki, T. Sakkalis, <em>Construction of rational curves with
            rational arc lengths by direct integration</em>, CAGD <strong>74</strong> (2019) 101773.
            — &ldquo;only a subset of the rational PH curves admits rational arc lengths&rdquo;; §1,
            §2, Props. 1–3. The class is theirs; what slide 15 adds is where the subset ends.
          </p>
          <p>
            <strong>○</strong> R. T. Farouki, C. Giannelli, A. Sestini, <em>New developments in theory,
            algorithms, and applications for Pythagorean-hodograph curves</em> (2019) — the survey,
            still unread.
          </p>
          <p style={{ marginTop: '0.6em', opacity: 0.75 }}>
            <strong>Owed, and in the folder unread:</strong> A. Altavilla, H.-P. Schröcker, Z. Šír,
            L. Vršek, <em>A complete characterization of PH-preserving mappings</em> (2026), Proc.
            Roy. Soc. A, arXiv:2512.19587 — for its residue conditions on <Math>{'\\Psi'}</Math>. And
            R. T. Farouki et al., <em>New developments in theory, algorithms, and applications for
            Pythagorean-hodograph curves</em> (2019) — the survey, for the rational state of the art.
          </p>
        </div>
        <p style={{ marginTop: '0.7em', textAlign: 'center' }}>
          <strong>
            The check that produced this list also deleted three of the deck&rsquo;s open questions.
            It was worth doing before writing, not after.
          </strong>
        </p>
      </>
    ),
    notes:
      'THE TICK-AND-CIRCLE MARKING IS NOT DECORATION AND SHOULD NOT BE TIDIED AWAY. Exactly one item '
      + 'on this list was read for this deck; everything else is cited from repository headers or '
      + 'from the 2022 paper-s own introduction. Saying which is which is the same discipline as the '
      + 'slide tags, and it tells a reader precisely how much weight each line carries. If somebody '
      + 'later reads Choi et al. properly, promote it and say so. '
      + 'THE TWO OWED ITEMS ARE BOTH SITTING IN ~/Documents/Carlotta. The 2026 PH-preserving paper '
      + 'matters because the hodograph-light-cone deck already cites it for residue conditions on '
      + 'Psi, and nobody has checked whether those extend to n >= 3. The 2019 survey matters because '
      + 'it is the fastest route to whatever else in Act II is already known. Neither is a formality. '
      + 'THE CLOSING LINE IS THE DECK-S OWN LESSON. The check took under an hour, the paper was '
      + 'already in the folder, and it removed three false open questions and added one genuine '
      + 'result (genericity). Say it plainly at the end of a literature-review deck, because it is '
      + 'the methodological point the whole tag system exists to serve.',
  },
]

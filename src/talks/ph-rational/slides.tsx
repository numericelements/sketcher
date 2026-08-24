// ============================================================================
// Pythagorean–Hodograph Curves — RATIONAL
//   Two representations, and the pole between them
//
// SPLIT FROM ph-interpolation (2026-08-24, Eric's call): one deck per act. The polynomial act
// lives in ../ph-polynomial; this deck is the rational act — the divider (models, convention,
// pole algebra) and the pole-lab pair — and it is the deck the parked rational slides in
// ../ph-interpolation-wip graduate back into (spinor chart, Möbius bend, spheres, the gap,
// "what is open"). The known growth items, from the slide-9 discussion that triggered the split:
//   · the STRICT counterpart of the projective drag — direct integration in the λ-chart, exactly
//     PH at every state, which works precisely where poles are invertible (the hard side) while
//     the conformal solve is exact on the soft side: wiring both would make the GAP visible in
//     the lab itself
//   · the projective drag's acceptance (1e-5) vs its displayed ok-threshold (1e-8) — displayed
//     and enforced should be one number
//   · the renderer near the weight wall: uniform-t sampling shows chords, and the |W| < 1e-12
//     sample skip hides the t = 0 endpoint once a drag squeezes w₀ under it
// Titles and the opening slide's name are PROVISIONAL — Eric has not named this deck yet.
// ============================================================================
import type { SlideDefinition } from '../framework/types'
import PoleLab from './PoleLab'

export const slides: SlideDefinition[] = [
  // ---------------------------------------------------------------------------
  {
    type: 'title',
    content: (
      <>
        <h1>Pythagorean&ndash;Hodograph Curves &mdash; Rational</h1>
        <div className="subtitle">Two representations, and the pole between them</div>
        <div className="author">Eric Demers</div>
        <div className="event">Polytechnique Montréal</div>
        <div className="event note" style={{ marginTop: '2em' }}>
          A preliminary version, offered for discussion
        </div>
      </>
    ),
    notes:
      'THE SPLIT DECK, rational act. The thesis in one sentence: the same curve written two ways, '
      + 'and softness is a property of the WRITING -- the projective model defends it with a '
      + 'solver, the Moebius model cannot express its violation. The polynomial deck '
      + '(ph-polynomial) carries the counting story; this one carries "representations", and it '
      + 'is where the parked rational slides graduate back. Title and subtitle are provisional.',
  },
  // ---------------------------------------------------------------------------
  // SECTION II — RATIONAL. One denominator, one new actor, two writings.
  //
  // The pole pair had no act header after the cut: everything through the spatial grip slide is
  // polynomial, and slide 9 opened cold on x = q/W. This divider does for the rational act what
  // the section-I divider does for counting — one equation, one consequence, and the rows are the
  // slides that follow. (The OLD section-II divider — "Rational, twice", integrate or don't — is
  // parked with its act in ph-interpolation-wip; this one promises only what the pole pair shows.)
  // ---------------------------------------------------------------------------
  {
    type: 'title',
    content: (
      <>
        <h1>The pole, and two writings</h1>
        <div className="subtitle" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.62em', whiteSpace: 'pre', lineHeight: 2.0, textAlign: 'left', display: 'inline-block', marginTop: '0.9em' }}>
{`x = q/W          x′ = N/W²,   N = q′W − qW′,   ‖N‖² = ρ²      the same PH, one denominator later
                                               ρ = the speed numerator:  ‖x′‖ = ρ/W²

W(r) = 0         a POLE, and N(r) = −q(r)·W′(r)
                 at a SIMPLE pole,  soft  ⟺  ⟨q(r), q(r)⟩ = 0

                 unknowns                              identities

PROJECTIVE       (P, w, ρ)                             ‖N‖² = ρ²     (PH)
                 points, weights, speed coefficients

MÖBIUS           (C, h)                                ⟨C,C⟩ = 0     a curve of POINTS
                 control spheres in ℝ⁴′¹,              ⟨C′,C′⟩ = h²  (PH)
                 speed coefficients                    ‖x′‖ = h/W,  and ρ = h·W, exactly

convention:  one letter per object — the curve is C(t) = Σ CₖBₖ(t), its coefficients are Cₖ.
             W = Σ wₖBₖ is the one case change, wₖ being the weights.`}
        </div>
      </>
    ),
    notes:
      'ONE DENOMINATOR, ONE NEW ACTOR. The PH condition barely changes on becoming rational: '
      + 'x = q/W gives x-prime = N/W^2 with N = q-prime W - q W-prime, and PH still says "a perfect '
      + 'square" -- ||N||^2 = rho^2, the same demand one denominator later. What is genuinely new is '
      + 'the root of W: the curve has a POLE there, and the whole act is about what happens to the '
      + 'SPEED at one. This deck does not argue what rationality BUYS (exact arc lengths, circles, '
      + 'the Moebius orbit) -- that argument belongs to the parked second half; here rationality is '
      + 'taken and the pole is studied. '
      + 'RHO IS ONE OBJECT, NAMED TWICE ON THIS SLIDE, and Eric-s own reading caught that the first '
      + 'version left the identification implicit: the rho in ||q-prime W - q W-prime||^2 = rho^2 '
      + 'IS the rho of (P, w, rho) -- the speed numerator, the projective model-s third unknown, '
      + 'with ||x-prime|| = rho/W^2. And the Moebius model-s h is the SAME quantity in its own '
      + 'clothes: rho = h W exactly, which is the conversion conformalAsRat performs and the reason '
      + 'one lab can hold both models. Both identifications are now printed. '
      + 'THE C-EXPLAINER PARAGRAPH IS SPOKEN, NOT PRINTED, and it travelled to get there (Eric, '
      + '2026-08-24): it sat on the outline, moved here where C first works, and looked bizarre '
      + 'as a prose block under a table -- so it was cut from the slides entirely. Say it over '
      + 'the Moebius row instead: C is the curve itself, written in R^{4,1}, the model where a '
      + 'point is a sphere of radius zero. The gesture sentence (hold control points and count, '
      + 'or hold one and let the solver place the rest) is likewise a spoken line, over whichever '
      + 'slide the question arises. '
      + 'THE UNKNOWNS/IDENTITIES TABLE AND THE CONVENTION LINE were both rewritten twice under '
      + 'Eric-s reading (2026-08-24), and the record matters so neither regresses. FIRST ATTEMPT: '
      + 'projective shown as a data triple, Moebius as its defining conditions -- he asked why one '
      + 'model is coefficients and the other functions, and the answer is that NEITHER is: both '
      + 'models are coefficient data plus polynomial identities ((P, w, rho) with one identity; '
      + '(C, h) with two), exactly the code-s Rat and ConformalPHCurve. SECOND ATTEMPT said '
      + '"capitals are polynomials", which is false twice on its own slide (P and C are capitals '
      + 'and hold control data). The convention actually in force is the standard Bezier one, now '
      + 'printed: ONE LETTER PER OBJECT, the curve with (t), the coefficients with a subscript -- '
      + 'C(t) = Sigma C_k B_k(t) -- and W = Sigma w_k B_k is the single case change, w_k being the '
      + 'weights. So <C,C> = 0 is about the curve and (C, h) lists coefficients with no collision, '
      + 'and P means control points everywhere in the deck. '
      + 'WHY RHO IS AN UNKNOWN AT ALL, since it will be asked of the table: PH says ||N||^2 is the '
      + 'square OF SOME POLYNOMIAL, and to make "of some polynomial" into equations you NAME the '
      + 'polynomial and match coefficients -- rho is the name, and the solver moves its '
      + 'coefficients like any others. h is the SAME design decision in the Moebius model, and '
      + 'rho = h W is the dictionary between the two names. '
      + 'THE TWO-LINE DERIVATION THAT MAKES h INEVITABLE, worked through with Eric until it held '
      + '(2026-08-24), and worth doing aloud if anyone asks what h IS. A point lifts to '
      + '(1, x, half ||x||^2) -- null by the metric, <A,B> = a.b - a0 b4 - a4 b0 -- and the curve '
      + 'is C = W times that lift. Product rule: C-prime = W-prime Xhat + W Xhat-prime. Expand '
      + '<C-prime,C-prime> like a school binomial: the <Xhat,Xhat> term is 0 (points are null), '
      + 'the cross term is 0 (derivative of null), and <Xhat-prime,Xhat-prime> = ||x-prime||^2 '
      + 'because Xhat-prime = (0, x-prime, x.x-prime) has a ZERO first slot, killing both cross '
      + 'products in the metric. Survivor: <C-prime,C-prime> = W^2 ||x-prime||^2. So h^2 = '
      + '<C-prime,C-prime> says h = W ||x-prime|| -- h IS the lifted curve-s speed, the drawn '
      + 'speed is h/W, and rho = W^2 ||x-prime|| gives rho = h W with a reason instead of a '
      + 'formula. '
      + 'AND THE STING, which is the slide-s theorem wearing algebra: expand ||N||^2 = '
      + '||q-prime W - q W-prime||^2 modulo W and only ||q||^2 W-prime^2 survives -- so W divides '
      + 'rho EXACTLY when <q,q> vanishes at every root of W, which is every pole SOFT. A '
      + 'projective member with a hard pole has NO polynomial h: its speed blows up like 1/W^2 at '
      + 'the hard pole where a soft one blows up like 1/W. "rho = h W with h polynomial" is not '
      + 'bookkeeping; it IS the Moebius model-s constraint, and the reason the next two slides '
      + 'behave differently under the same drag. '
      + 'THE MIDDLE ROW IS TWO LINES OF ALGEBRA, and it is worth doing them aloud once, here, so the '
      + 'lab slides can just point. At a SIMPLE root r of W -- the qualifier is on the slide, '
      + 'because at a doubled root the argument says NOTHING and the lab keeps a specimen of '
      + 'exactly that -- the q-prime W term of N dies, so N(r) = -q(r) W-prime(r); substitute into '
      + '||N||^2 = rho^2 and rho(r)^2 = <q(r),q(r)> * W-prime(r)^2. So the speed numerator survives '
      + 'the pole exactly when <q(r),q(r)> = 0 -- SOFT -- and that single number is the act-s '
      + 'protagonist. '
      + 'SAY BILINEAR, NOT HERMITIAN, because at a complex pole the temptation is |q|^2. The form '
      + 'is <q,q> = sum q_i^2, complex BILINEAR: with q = a + i b it reads '
      + '(|a|^2 - |b|^2) + 2i<a,b>, so soft is |a| = |b| AND a perpendicular to b -- two vectors of '
      + 'equal length at right angles, which is what the readout draws. |q|^2 = 0 would force '
      + 'q(r) = 0 outright, a different and wrong condition. '
      + 'THE MODEL ROWS ARE DELIBERATELY PARALLEL -- same two columns, same meanings -- because the '
      + 'pair-s slides open on instruments and someone should be told the unknowns first. '
      + 'PROJECTIVE: exactly what a NURBS editor already has -- control points and weights -- plus '
      + 'rho-s coefficients, and ONE identity to satisfy, PH. MOEBIUS: control points that are '
      + 'WEIGHTED SPHERES in R^{4,1} (the centres are the rational-Bezier control points, the ends '
      + 'are point-spheres), plus h-s coefficients, and TWO identities: <C,C> = 0 -- it is a curve '
      + 'of points -- and <C-prime,C-prime> = h^2 -- it is PH. '
      + 'AND THE COUNT OF IDENTITIES IS THE LESSON, said aloud rather than printed (the "a curve '
      + 'of points for free" line was on the table and Eric cut it -- the empty cell says it): in '
      + 'R^3 any (P, w) is a curve of points automatically -- pointhood is FREE and only PH costs '
      + 'an identity. In R^{4,1} pointhood itself costs the null identity, and that identity is '
      + 'exactly the one that forces every simple pole soft. The pole pair is hiding in the '
      + 'asymmetry of the identities column. '
      + 'N IS DEFINED ON THE SLIDE NOW -- x-prime = N/W^2, N = q-prime W - q W-prime -- because '
      + 'the pole row used N(r) before any line said what N was; Eric-s own re-reading caught it. '
      + 'With the definition in row one, N(r) = -q(r) W-prime(r) is one glance: at a root of W the '
      + 'q-prime W term carries the factor W(r) = 0 and dies, and only -q W-prime survives. '
      + 'AND THE PAIR IS AN EXPERIMENT, announced as one: the SAME specimens, written two ways, and '
      + 'the only thing that changes between the two slides is what a DRAG is allowed to do. In '
      + 'the projective model the PH condition is restored around your gesture and nothing protects '
      + '<q,q> at the poles -- watch |a| and |b| come apart. In the Moebius model, <C,C> = 0 '
      + 'evaluated at a root of W forces <q,q> = 0 identically, so softness cannot break because '
      + 'the model cannot write the broken state. A property maintained by a solver versus a '
      + 'property carried by the representation -- that is the pair, and it is the deck-s '
      + '"representations" claim at its smallest. '
      + 'PROVENANCE, so the claim discipline holds at the act boundary too: the (P, w, rho) side is '
      + 'the standard rational Bezier data with PH imposed coefficient by coefficient; the R^{4,1} '
      + 'side is the conformal construction whose weighted-sphere control polygon has NO search '
      + 'hits so far -- "not found", not "new", and Choi, Lee & Moon is the paper to read before '
      + 'anyone says otherwise.',
  },

  // ---------------------------------------------------------------------------
  // 9 / 10 — THE POLE LAB. Two slides, one instrument, and the number beside the verdict.
  // ---------------------------------------------------------------------------
  {
    type: 'content',
    content: (
      <>
        <h2>A pole is soft or hard, and one number decides it</h2>
        <PoleLab model="projective" />
      </>
    ),
    notes:
      'THE LAB SLIDE, and the first of a pair. Rational PH curves have poles, and a pole is SOFT ' +
      'or HARD. The whole decision is one number, and it is two lines of algebra to get to it: ' +
      'for x = q/W, at a root r of W the hodograph numerator is N(r) = -q(r)W\'(r), because the ' +
      'q\'W term dies. Substituting into the PH condition ||N||^2 = rho^2 gives ' +
      'rho(r)^2 = <q(r),q(r)> * W\'(r)^2, so at a SIMPLE pole the pole is soft exactly when ' +
      '<q(r),q(r)> = 0. Everything the button prints is that. docs/POLE_ALGEBRA.md has every step. ' +
      'WHY THE READOUT SHOWS TWO VECTORS. At a complex pole q(r) is a complex 3-vector, which is ' +
      'six numbers with i in them. Write q(r) = a + i*b and <q,q> = (|a|^2-|b|^2) + 2i<a,b>, so ' +
      'SOFT means |a| = |b| AND a perpendicular to b -- two lengths and an angle, three real ' +
      'numbers you can read aloud. That is the picture: two vectors of equal length at right ' +
      'angles. Drag a control point here and watch them come apart. ' +
      'THE NUMBER IS SHOWN BESIDE THE VERDICT ON PURPOSE. The threshold between soft and hard is ' +
      'ours, not the mathematics\', so the slide shows what the label was read from. A test moves ' +
      'that threshold to absurd values and checks the label flips while the number does not. ' +
      'THE SPECIMENS ARE CHOSEN, NOT SAMPLED. Each is a curve whose character is settled by ' +
      'algebra: the lambda-chart quartic has one real simple pole and sigma = 8.21; the MIXED one ' +
      'carries two soft poles and one hard in the same curve; and two of them are cases where the ' +
      'QUESTION IS MALFORMED and the readout says so instead of answering -- a DOUBLE real pole, ' +
      'where W\'(r) = 0 makes N(r) = 0 whatever q does, and a pole whose numerator CANCELS, where ' +
      'the fraction reduces and there is no pole at all. Those two are in the lab because they are ' +
      'the cases that catch people, and one of them caught this deck: the first version of section ' +
      '6 of the algebra document was FALSE for exactly the doubled-pole reason. ' +
      'ODD DEGREE CARRIES A THEOREM HERE. A real polynomial of odd degree has a real root, so an ' +
      'odd-degree curve always has a real pole -- and a genuine simple real pole is always hard. ' +
      'So no odd-degree curve with genuine simple poles can be all-soft, which is the parity ' +
      'theorem of the conformal model arrived at from this side with no conformal model in it. The ' +
      'lab shows it by simply having no odd-degree soft specimen to offer.',
  },

  {
    type: 'content',
    content: (
      <>
        <h2>In the Möbius model you cannot make a pole hard</h2>
        <PoleLab model="mobius" />
      </>
    ),
    notes:
      'THE SECOND OF THE PAIR, and the same instrument reading the same curves. What changes is ' +
      'what a DRAG is allowed to do. ' +
      'The conformal representation is C = (W, q, cinf) with the null condition <C,C> = 0, which ' +
      'as a polynomial identity reads ||q||^2 = 2*W*cinf. Evaluate that at a root of W and the ' +
      'right side is zero, so <q(r),q(r)> = 0 -- every pole is soft, automatically, with no ' +
      'reference to PH at all. Nothing was chosen; the model cannot express anything else. So drag ' +
      'wherever you like: |a| = |b| and the right angle do not move. ' +
      'THE SAME CURVE, BOTH SLIDES. C converts to (P, w, rho) exactly, by P = q/W and rho = h*W, ' +
      'so the conformal specimens are legal members of the projective slide too and the two open ' +
      'on the same thing. Measured: the control points differ by 0.0e+0. The difference is the ' +
      'solver, not the curve. ' +
      'WHERE A HARD POLE HIDES, and the lab has the specimen. The identity above needed W\'(r) != 0. ' +
      'At a DOUBLED root it says nothing -- and that is the only room a null curve has. Lift the ' +
      'hard quartic as (2w^2, 2wq, ||q||^2) and it appears at conformal degree 8 with every pole ' +
      'doubled and the numerator cancelling there. The readout refuses to call it a pole, which is ' +
      'right: it is not a curve of the model\'s own degree. One drag splits the double root and ' +
      'everything comes back soft. Hard to soft, never back. ' +
      'AND THE DEGREES ARE EVEN, WHICH IS A THEOREM. ||q||^2 is a sum of real squares, so each of ' +
      'its real roots has EVEN multiplicity; from ||q||^2 = 2*W*cinf that makes ' +
      'mult(W) + mult(cinf) even, so (t-r) divides cinf exactly when mult(W) is odd. An odd-degree ' +
      'W must have a real root of odd multiplicity, so an odd-degree member always factors -- it ' +
      'is a lower-degree curve in disguise. That is why this slide offers only even degrees, and ' +
      'it is not a limitation of the search. It already cost this deck two slides that were ' +
      'drawing quartics inside quintic polygons.',
  },
]

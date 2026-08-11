# The Lattice of PH Families — a map of known territory, with two cells marked

The families we work with are not a list, they are a lattice, and the lattice has a mechanism.
This page is the skeleton of the theory document: **the table, with every cell tagged.** It is
deliberately one page. The theory gets written from it, not before it.

**What this page is NOT.** It is not a discovery map. Eric's correction, and it is the right one:
*"It is like we are rewriting Farouki's book."* The complex representation of planar PH curves, the
quaternion/Hopf form for spatial PH, rational PH curves, their offsets — all of that is in the book
or the surrounding literature. An earlier draft tagged those `[LIT]` and still *read* as though the
table were new. It is a map, and most of the territory has been walked. What is plausibly ours is
narrow and stated in §0.

**The discipline.** Every cell carries exactly one of:

| tag | means |
|---|---|
| `[THM]` | proved, and the proof is ours or cited precisely |
| `[LIT]` | believed to be in the literature — **a pointer to check, not a fact yet** |
| `[MEAS]` | measured here, with a pinning test named |
| `[OPEN]` | not known to us |

Nothing else is allowed. A cell with no tag is a cell someone wanted to be true.
**The `[LIT]` rows are the reading list**; they are from memory and none of them is verified.

---

## 0′. THE LITERATURE CHECK, and it costs us most of this page

Searched 2026-08-10, at Eric's prompting ("those are known facts"). He was right, and the `[LIT]`
rows were not merely unverified — they were **larger than this page assumed**. Three findings, all
verified against sources:

- **Choi, Han, Lee, Roh, Wee et al. (2002)**, *Clifford Algebra, Spin Representation, and Rational
  Parameterization of Curves and Surfaces*, Adv. Comput. Math. — "unifies all known incarnations of PH
  curves into a single coherent framework." **This is §2's spine.** The spin cover as the mechanism is
  published, 2002.
- **Krasauskas (2017)**, *Unifying Theory of Pythagorean-Normal Surfaces Based on Geometric Algebra*,
  Adv. Appl. Clifford Algebras 27:491–502 — embeds the cyclographic, Blaschke-cylinder and isotropic
  models of Laguerre geometry "into one ambient pseudo-Euclidean space **ℝ⁴˙², which is known as a
  model for Lie sphere geometry.**" **This is the deck's Act I slide 6 punchline**, published.
- **Peternell & Pottmann (1998)**, *A Laguerre geometric approach to rational offsets*, CAGD
  15(3):223–249 — PH curves *and* PN surfaces built from arbitrary rational curves/surfaces by a change
  of Laguerre model. Curves and surfaces as one theory, which is the "every dimension" Eric expected.
- **Cecil–Chern**: any Lie sphere transformation is a composition of **two Möbius transformations and a
  parallel transformation**; Möbius and Laguerre generate the Lie group. This CLOSES the gap flagged
  earlier — Lie-invariance of rational PH/PN follows from the two special cases.

**Consequence.** The reframing this page organises is substantially Choi et al. 2002 + Krasauskas 2017,
with Peternell–Pottmann 1998 under the invariance argument. It remains useful as exposition and as the
introduction to the editor. It is **not** a contribution, and the honest response to "the theory has
little to say at the end" is that the theory was already written, properly, by others.

**What plausibly survives** (and needs its own literature check): the **moduli geometry of the
conformal PH CURVE variety** — dimension 2n+6, moduli 2n−6, the codimension-3 bendable locus, the
singular stratum at lifted polynomials. Krasauskas does surfaces and representation-unification, not
the stratification of a curve variety. Narrower claim, better odds.

**Read before writing another slide:** Choi et al. 2002, Krasauskas 2017.

---

## 0. What is actually ours

Everything else on this page is somebody else's, or open. Three things are not:

1. **PH-ness as an O(4,1)-invariant condition**, with the control structure mapping one-for-one under
   Möbius — control *spheres* and Farin beads both. This is the cell where Farouki's machinery does
   not already answer the question, because the quaternion form does **not** commute with Möbius
   (`core/phMobius`), which is what sent the work into the conformal model in the first place.
   `[MEAS]`
2. **The counts**: family 2n+6, moduli 2n−6, and bent polynomials a *proper* codimension-3
   subvariety of the conformal family. `[MEAS]` (`conformalPHStructure.test.ts`)
3. **The editing side** — the sliding mechanism, curvature-extrema control under a drag. Not in the
   book at all, and the reason this repository exists (`CLAUDE.md`).

---

## 1. There are two kinds of arrow, and they are not the same kind

- **Group arrows.** Euclidean similarity ⊂ Möbius ⊂ Lie sphere; Laguerre ⊂ Lie sphere. A lattice of
  Cayley–Klein geometries, each the projective orthogonal group of a quadratic form.
- **Model arrows.** polynomial ⊂ rational; degree *d* ⊂ degree *d′* (elevation); complex-rational
  degree *n* ⊂ real rational degree 2*n*.

**PH is neither.** It is a *subvariety* cut inside each cell — it makes families smaller. So the
interesting statement is never "is X inside Y" (usually trivially yes) but:

> **Is X closed under G? And is the G-orbit of X all of Y?**

We have answered one instance, by measurement, and it is the template for the whole program:

> The Möbius orbit of the polynomial PH curves is a **proper** subvariety of the conformal PH
> family — bent cubics give **3 of the 6 moduli, codimension 3**. `[MEAS]`
> (`conformalPHStructure.test.ts`, "bending the cubic fibers gives 3 of the 6 moduli")

---

## 2. The mechanism: PH is a lift to the spin cover

In every cell, "PH" says *a norm form becomes a perfect square*, and it can because the quadratic
form of that geometry has a spinor factorisation. The cells are not analogies — they are the same
statement over different Clifford algebras.

| geometry | form | spin group | a curve there is | the square condition | status |
|---|---|---|---|---|---|
| Euclidean plane | ℝ² | ℂ | plane curve | hodograph = A² | `[LIT]` Farouki |
| Euclidean space | ℝ³ | Spin(3) = ℍ₁ | space curve | hodograph = A i Ā (Hopf) | `[LIT]` Choi–Han–Farouki |
| planar MAT / Minkowski | ℝ²·¹ | Spin(2,1) = SL(2,ℝ) | medial axis transform | MOS condition | `[LIT]` Kosinka–Jüttler |
| **Möbius plane** | **ℝ³·¹** | **Spin(3,1) = SL(2,ℂ)** | plane curve, on the cone | our M = A² | `[MEAS]` |
| spatial MAT | ℝ³·¹ | same group, same form | sphere family, off the cone | MOS condition | `[LIT]` — and see §2.5 |
| Laguerre | ℝ³·² | Spin(3,2) = Sp(4,ℝ) | oriented-sphere family | rational offsets | `[LIT]` Pottmann |
| **Möbius space** | **ℝ⁴·¹** | **Spin(4,1) = Sp(1,1)** | space curve | **⟨P,P⟩ ≡ 0, ⟨P′,P′⟩ = h²** | `[MEAS]` — our cell |
| Lie sphere | ℝ⁴·² | Spin(4,2) = SU(2,2) | **canal surface** | ? | `[OPEN]` |
| line geometry | ℝ³·³ | Spin(3,3) = SL(4,ℝ) | **ruled surface** | ? | `[OPEN]` |

The low-dimensional spin isomorphisms in column 3 are classical `[LIT]`. Two consequences worth
having in the front of the mind:

- **Spin(4,1) = Sp(1,1) is quaternionic.** That is *why* quaternions reappeared in the spinor
  solution of the no-log condition (`u`, `v` with π = uv) after the conformal model had apparently
  left them behind. `[MEAS]` (`conformalPHStructure.test.ts`, "the SPINOR side")
- **A curve in the Lie quadric IS a one-parameter family of spheres**, hence a canal surface; a
  curve in the Klein quadric IS a family of lines, hence a ruled surface. The two `[OPEN]` rows are
  not exotic — they are the surface theory that the curve theory becomes. `[LIT]` Cecil

### 2.5 The real axis is not the group — it is WHICH QUADRIC

Two rows of the table share the form ℝ³˙¹ exactly, so the group cannot be what separates them. One
condition does, and it is the structural one:

> **On the null quadric → the vector is a POINT, so the curve is a curve.**
> **Off it → the vector is a SPHERE, so the curve is a sphere FAMILY, and what you see is its
> envelope.**

- Our conformal PH curves satisfy ⟨P,P⟩ ≡ 0. They *are* curves in the plane or in space, lifted.
- MOS curves have **no** nullity condition. The vector is a circle, the curve is a circle family, and
  the boundary of the domain is its envelope. Hence *the medial axis*.

So conformal PH and MOS are **not the same family** — that answers Q1 as first posed, and Eric's
circle reading is what settles it. What they share is the *machinery*: both are "PH in a
Minkowski-signature form", same spinor factorisation, same square condition, so the interpolation
theory transfers even though the varieties do not. `[MEAS]` for our side, `[LIT]` for theirs.

And this axis is exactly the Möbius-vs-Lie-sphere distinction, which means the canal-surface and
ruled-surface rows need no new machinery to be placed — only a different quadric.

**A consequence already visible on screen.** In our conformal model the control points are literally
spheres: `radii()` returns √⟨C,C⟩/w, and the degree-6 seed measures
`[0, 0.81, 0.67, 1.51, 0.62, 0.62, 0]` — the two ends are **null** (they are points, the curve's
endpoints) and the five interior ones are **honest spheres of those radii**. So the control polygon
is *already* a sphere family living off the cone, and ρ₂ going negative along slide 16's road is that
sphere becoming **imaginary** (⟨C,C⟩ < 0). `[MEAS]`
Well-posed and drawable, and not yet asked: **what do the control spheres envelope, and how does that
envelope relate to the curve?** `[OPEN]`

### 2.6 Contact order is the other axis, and it has a third rung

Eric's distinction — a circle through 2 points of the boundary versus 3 points of the curve — is the
right organising idea, and there is a rung above both:

| contact | the circle family | what it produces |
|---|---|---|
| 2 points | bitangent, maximal inscribed | **medial axis** → MOS curves |
| 3 points | osculating | **evolute**, centres of curvature |
| **4 points** | osculating at a critical point | **a vertex — a curvature extremum** |

**Why the fourth rung matters here more than anywhere else.** Möbius maps take circles to circles and
preserve contact order. The osculating circle is pinned by 3-point contact, so it maps to the image
curve's osculating circle; a point of 4-point contact therefore maps to a point of 4-point contact.
If that holds, **the curvature-extrema count is already a conformal invariant** — which would
retro-justify the whole O(4,1) apparatus and answer Q3 below at a stroke. `[LIT]` — unverified, the
classical route is the Möbius-invariant form of the four-vertex theorem, and this is the **first thing
to check in the literature review.**

### The degree doubling is one phenomenon, not three

Every observed doubling is the spinor → vector map being **quadratic**:

    A ↦ A²          plane PH             deg n spinor  → deg 2n hodograph
    A ↦ A i Ā       spatial PH           same
    p ↦ (1, p, ½‖p‖²)   null lift        deg d curve   → conformal deg 2d   [MEAS] finding 1
    z ↦ P Q̄ / |Q|²      complex → real   deg n complex → deg 2n real       [MEAS]

`[OBSERVATION]` — each instance is measured or classical; the *unification* is a claim this document
makes and the theory document must prove. It also explains, in one line, why classical PH degrees
come out odd.

---

## 3. The three questions to settle first

Each is answerable, and each sharpens or kills a claim.

**Q1 — ANSWERED, and not by us.** *Are our complex-rational PH curves the same objects as MOS
curves?* **No.** They share the form ℝ³˙¹ but not the locus: ours lie ON the null quadric, MOS curves
are free of it. See §2.5. What transfers is the machinery, not the family. The follow-up worth asking
instead: **what IS the nullity condition in the medial-axis reading?** ⟨P,P⟩ = 0 there says every
medial sphere passes through a fixed point, which after an inversion at that point makes them all
*planes*. `[OPEN]` — speculative, one inversion away from being checkable.

**Q1′ — ANSWERED for PLANE curves, and it changes the standing of the whole editor.** `[THM]`
A vertex is a point of 4-point contact with a circle; Möbius and Lie sphere transformations preserve
contact. So **the curvature-extrema count of a plane curve is both Möbius- and Lie-invariant** — the
quantity this application controls is a *conformal* invariant, and the conformal model is its right
home rather than a convenience. (Eric, and classical; a precise citation is still owed. One caveat
worth stating: a Lie transformation need not carry a point curve to a point curve, so Lie-invariance
is a statement about the **Legendre lift**, not about point sets.)

**Q1″. And for SPACE curves it is NOT the same condition** — the asymmetry Eric flagged. `[OPEN]`
For a space curve the osculating *circle* has 3-point contact, and pushing to 4 requires **both**
κ′ = 0 *and* τ = 0 — far stronger than a curvature extremum. The conformally natural object is the
osculating **sphere** (4-point contact) and its higher contact, with conformal curvature in place of κ.
So:

> **In the plane, our bound is a conformal invariant. In space, κ′ = 0 is not.** The 3D conformal PH
> work therefore pairs a Möbius-invariant *family* with a non-invariant *functional*.

That tension is honest and unresolved, and naming it is better than letting a reader assume the 2D
result carries over. What the space-curve analogue costs — conformal arc length, conformal curvature,
and whether their extrema are what an editor should control — is the sharpest open question this page
has.

**Q2. Is conformal PH ⊊ rational PH?** `[OPEN]`
Möbius images of polynomial PH curves are rational PH, so conformal PH ⊆ rational PH. Is the
inclusion proper? Proper ⟹ we have found a distinguished subfamily and must say what distinguishes
it. Equality ⟹ a characterisation theorem: *the rational PH curves are exactly the O(4,1) ones.*
Measurable: compare dimensions at fixed degree against the known rational PH count.

**Q3. Which invariant's extrema does the editor control, in which geometry?** — **split by Q1′/Q1″.**
In the **plane** the question is closed: vertices are conformally invariant, so the Euclidean count the
editor already displays *is* the conformal one, and no new numerator is needed. In **space** it is open
and the honest answer is "not the same one": conformal arc length and conformal curvature are the
invariant quantities there, and `CLAUDE.md` already provides for a new invariant by supplying its
numerator. Whether an editor *should* control the conformal count in space, or the Euclidean one, is a
design question as much as a mathematical one.

---

## 4. What is missing from the picture as first drawn

- **Laguerre ℝ³·² and Minkowski ℝ²·¹/ℝ³·¹** — the cells next door, and the ones with an existing
  literature (rational offsets, medial axis transforms). Read before writing.
- **O(4,1) and O(3,2) both sit inside O(4,2).** Lie sphere geometry is the *join* of Möbius and
  Laguerre — that is the lattice, and it is already drawn in Cecil's book. `[LIT]`
- **Discrete differential geometry** (Bobenko–Suris): circular nets, discrete isothermic surfaces,
  Darboux transforms — the same groups, a mature field. Far more promising than it sounds: the
  "Farin points and circular arcs are the Möbius-covariant control structure" instinct *is* a DDG
  instinct. `[LIT]`
- **Algebraic geometry** is the right frame for the counting: these are rational curves on a quadric
  (null, Lie, or Klein). Family dimension, branch counts, reducible representations and monodromy
  around a discriminant are that subject's vocabulary, and would turn our measured dimensions into
  theorems. `[OPEN]`
- **RRMF** is a *further* spinor condition, so it enters this table as a subvariety of a subvariety,
  not as a new column. `[LIT]`
- **Number theory: real, but a footnote.** Pythagorean triples and the spinor parametrisation of a
  conic are the same algebra; rational points on quadrics is Hasse–Minkowski. One sentence, not a
  direction.

---

## 5. The risk, named

The failure mode of this document is **a beautiful taxonomy with no theorems in it.** The second
failure mode, caught on the first draft, is worse and quieter: **presenting known material as
discovery.** Farouki's book already holds the complex form, the quaternion form, and much of the
rational theory. The tags are the defence against both. If a third of the cells come back `[OPEN]`
that is not a weakness — it is the research programme, stated honestly, which is what the page is for.
If a third come back `[LIT]`, that is not a weakness either; it is the reading, and it is cheaper than
rederiving.

The unusual strength available here: this repository can cite a *measured* number with a pinning
test for most dimension claims. A theory paper that says "we verified the 12-dimensional gauge lies
in the tangent space to 1.8e-12" is doing something most theory papers cannot.

# The Lattice of PH Families — one page

The families we work with are not a list, they are a lattice, and the lattice has a mechanism.
This page is the skeleton of the theory document: **the table, with every cell tagged.** It is
deliberately one page. The theory gets written from it, not before it.

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
| **Möbius plane** = spatial MAT | **ℝ³·¹** | **Spin(3,1) = SL(2,ℂ)** | plane curve / MAT | our M = A², their MOS | `[MEAS]` + `[OPEN]` — see Q1 |
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

**Q1. Are our 2D complex-rational PH cubics the same objects as MOS curves?** `[OPEN]`
The conformal model of the plane is ℝ³·¹ — *the same quadratic form* as the spatial medial axis
transform. Same group, same signature. Either these are two readings of one family, or the square
conditions genuinely differ. This is the highest-value question on the page: if it is the same
family, a literature exists for our cell; if not, the difference is a theorem.

**Q2. Is conformal PH ⊊ rational PH?** `[OPEN]`
Möbius images of polynomial PH curves are rational PH, so conformal PH ⊆ rational PH. Is the
inclusion proper? Proper ⟹ we have found a distinguished subfamily and must say what distinguishes
it. Equality ⟹ a characterisation theorem: *the rational PH curves are exactly the O(4,1) ones.*
Measurable: compare dimensions at fixed degree against the known rational PH count.

**Q3. Which invariant's extrema does the editor control, in which geometry?** `[OPEN]`
Curvature extrema are Euclidean. Conformal geometry has conformal arc length and conformal
curvature; Lie sphere has its own. `CLAUDE.md` already says the three laws quantify over *any*
scalar invariant — so the Möbius-invariant count is a numerator away. Whether it agrees with the
Euclidean count is not known and should not be guessed.

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

The failure mode of this document is **a beautiful taxonomy with no theorems in it.** The tags are
the defence. If a third of the cells come back `[OPEN]` that is not a weakness — it is the research
programme, stated honestly, which is what the page is for.

The unusual strength available here: this repository can cite a *measured* number with a pinning
test for most dimension claims. A theory paper that says "we verified the 12-dimensional gauge lies
in the tangent space to 1.8e-12" is doing something most theory papers cannot.

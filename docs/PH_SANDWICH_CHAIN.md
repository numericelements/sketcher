# Spatial PH Hermite interpolation is a CHAIN OF SANDWICH EQUATIONS

Established 2026-08-05, while reading the sources for slide 7 of the PH-interpolation
talk. This is the structural fact that explains slide 6 after the fact, predicts the shape
of slide 7, and tells us the family is a **torus** at every degree.

Sources:

- **[FGMS08]** Farouki, **Giannelli**, Manni, Sestini, *Identification of spatial PH quintic
  Hermite interpolants with near-optimal shape measures*, CAGD **25** (2008) 274–297.
  (Carlotta Giannelli is the second author — this is her own work on exactly our question.)
- **[FKS02]** Farouki, al-Kandari, Sakkalis, *Hermite interpolation by rotation-invariant
  spatial PH curves* — reference [56] of the 2019 survey, the original two-parameter result.
- **[SJ05]** Šír, Jüttler (2005) — the `α = β = 0` convergence result.

---

## The atom: one sandwich equation

Everything reduces to solving, for a quaternion `X`,

    X u X* = v            (u = i, v a given 3-vector)

**Its solution set is a CIRCLE.** One solution is the half-way construction

    X₀ = √|v| · n,        n = (δ + u)/|δ + u|,      δ = v/|v|

and the rest are `X₀·exp(φu)`, because — [FGMS08] Proposition 1's identity —

    (λX + μXu) u (λX + μXu)* = (λ² + μ²) · X u X*

so the unit circle `λ = cos φ, μ = sin φ` acts on solutions without moving `v`. That circle
IS the gauge freedom, and it is exactly one angle per sandwich equation.

Two consequences we get for free, at every degree:

- **`|X|² = |v|` is forced.** The sandwich fixes the norm. Every "arc length is constant"
  result below is this line and nothing more.
- **`n = (δ + u)/|δ + u|` degenerates only when `δ = −u`** — a tangent exactly antipodal to
  the reference direction. `quatFromSandwich` already handles that case.

Our `quatFromSandwich` was written independently and is *literally* [FGMS08] eq. (49)'s
`nᵢ = (δᵢ + u)/|δᵢ + u|`. Good: the construction in `core/` is the standard one.

## The principle

> **A spatial PH Hermite interpolation problem is a CHAIN of sandwich equations.** Each link
> contributes one free angle. The hodograph depends only on the *differences* of those
> angles, so a chain of `k+1` sandwiches gives a **`k`-dimensional torus** of interpolants.

| | chain | free angles | family |
|---|---|---|---|
| spatial cubic  | `A₀` from the tangent; one from closure        | 1 | a **circle** |
| spatial quintic| `A₀`, `A₂` from the tangents; `B` from closure | 2 | a **torus** |

The angles are periodic, so the family is **compact and closed in every direction** — which
is why slide 6's fiber closes into a loop, and why slide 7's family should be a closed
surface (the image of a torus, possibly self-intersecting).

---

## The cubic: closed form (verified)

Our reduced equation (`phSpatialCubic.ts`, `reductionRHS`) is

    i z* + z i + 2 z i z* = F

which looked like it needed continuation because of the linear part. It does not. Note

    2(z + ½) i (z + ½)*  =  2 z i z*  +  (z i + i z*)  +  ½i

— the left-hand side plus `½i`. So with **`Z = z + ½`** the whole thing is a sandwich:

    2 Z i Z* = F + i/2        ⟺        Z i Z* = G,   G = (F + i/2)/2

    Z = √|G| · n · exp(φ i),   n = (δ_G + i)/|δ_G + i|,   z = Z − ½

**One free angle `φ`. Closed form. No Newton, no continuation.**

**Measured** (`phSandwichChain.test.ts`): on a traced fiber the identity holds to
**3.3e-16**, and `|Z|²` is constant at `1.5797703075` — equal to the predicted `|F + i/2|/2`
to all printed digits.

This retro-explains all three of slide 6's hand-derived results in one line each:

- **The isometry** (`3L = |A₀|²(1+T)`, arc length constant on the fiber): `|Z|²` is forced by
  the sandwich, and `|Z|² = |z|² + z₀ + ¼ = T + ¼`. That's it. The earlier proof was a
  correct but roundabout route to `|X|² = |v|`.
- **The ellipse**: `Z` traces a *circle*; `z = Z − ½` translates it; the middle leg is
  *linear* in `z`. A linear image of a circle is an ellipse. (Slide 6's caption "the tenth is
  a curve" could honestly become "is an ellipse".)
- **The loop closes exactly**, by periodicity in `φ` — not because a traced polyline happened
  to meet its tail. `fiberTraceIsClosed` is a check on the tracer, not on the mathematics.

### Deliberately NOT retrofitted

Slide 6 still uses predictor-corrector continuation and works. Replacing it with the closed
form would make the fiber exact, faster, and turn the slider into a literal angle — but it is
a rewrite of working code, so it waits until the later slides are built (user's call,
2026-08-05). **This doc plus the pinning test is the record so the option is not lost.**

---

## The quintic: closed form, from [FGMS08]

Data `pᵢ, p_f, dᵢ = r′(0), d_f = r′(1)`. Equations (47)–(55):

    A₀ = √|dᵢ| · nᵢ · exp(φ₀u)         nᵢ = (δᵢ + u)/|δᵢ + u|,   δᵢ = dᵢ/|dᵢ|
    A₂ = √|d_f| · n_f · exp(φ₂u)       n_f = (δ_f + u)/|δ_f + u|

    closure:   B u B* = d       B = 3A₀ + 4A₁ + 3A₂
               d = c + 5(A₀uA₂* + A₂uA₀*)
               c = 120(p_f − pᵢ) − 15(dᵢ + d_f)

    B = √|d| · n · exp(φ₁u)            n = (δ_d + u)/|δ_d + u|,   δ_d = d/|d|
    A₁ = ¼B − ¾(A₀ + A₂)

The closure integral

    ∫₀¹ A u A* dt = ⅕A₀uA₀* + ⅒(A₀uA₁*+A₁uA₀*) + 1/30(A₀uA₂*+4A₁uA₁*+A₂uA₀*)
                    + ⅒(A₁uA₂*+A₂uA₁*) + ⅕A₂uA₂*

is what collapses into the single sandwich `BuB* = d` — the third link in the chain. (The
degree-4 hodograph coefficients here match our general `bernsteinSquare` exactly; in the
planar case `d₂ = ⅙(A₀uA₂* + 4A₁uA₁* + A₂uA₀*)` reduces to `(w₀w₂ + 2w₁²)/3`.)

**Only differences matter**, so `φ₁ = 0` without loss and the two essential parameters are

    α = ½(φ₀ + φ₂)        β = φ₂ − φ₀

### Arc length depends on β ALONE

[FGMS08] abstract: *"the arc length of the interpolants depends on only one of the
parameters, and four (general) helical PH quintic interpolants always exist"* — they are the
stationary points of `L(β)`. The survey says the same in the other notation: arc lengths are
*"determined (within a certain range) by the difference ψ₂ − ψ₀."*

The mechanism is visible in the algebra: `exp(θu)` commutes with `u`, so

    A₀ u A₂*  =  √(|dᵢ||d_f|) · nᵢ · u exp(−βu) · n_f*

— **`α` cancels**. Hence `d` depends only on `β` ([FGMS08] line 551: *"the vector (50)
depends only on β"*), hence `|d|`, hence `L`.

So one rung up the ladder from the cubic's isometry:

| | family | arc length depends on |
|---|---|---|
| spatial cubic  | 1 angle (a circle) | **nothing** — constant |
| spatial quintic| 2 angles (a torus) | **β only** — independent of `α` |

`α` is a pure shape parameter that cannot change the length. On a heatmap over the `(α,β)`
square, arc length must show as **horizontal banding** — a free visual check that any
implementation of the above is correct.

### Choosing `(α, β)`: the literature already has criteria

[FGMS08] propose **HL** (helical), **HC**, **BV**, **CC**, judged against **ERMF**
(rotation-minimizing-frame energy), and conclude *"CC appears to be an excellent pragmatic
selection scheme."* They warn: *"a random or ad hoc choice for (α, β) might easily result in
one of these poorly-shaped interpolants."* Also measured there: HL does **not** minimise ERMF
in general, so *"the helicity property is not necessarily per se a 'good shape' indicator."*

An honest tension worth a slide: [SJ05] prove `α = β = 0` gives **fourth-order convergence**
to a sampled analytic curve — but at a *fixed* step size it is a poor shape choice
(`%ERMF = 34` versus near-optimal for CC). **Asymptotically optimal, practically bad.**

---

## MEASURED (2026-08-07) — `core/phSpatialQuintic.ts`, pinned in its test file

**Only `P₂` and `P₃` move.** `P₁ = pᵢ + dᵢ/5` and `P₄ = p_f − d_f/5` are the end tangents
over five, so the data pins them: swept over the whole torus their extent is **exactly zero**
(< 1e-12). The two-parameter family lives entirely in the two middle control points, which is
why the figure needs two surfaces and not four.

**The surfaces are NOT quadrics.** Fitting a general quadric to a 40×40 sweep of `P₂` leaves
a residual of `1.2e-5` (`P₃`: `2.0e-6`), against `3.7e-10` for a degenerate one-point cloud
— eleven orders above machine zero. They are genuine trigonometric surfaces with no name to
give them; draw them as a mesh, don't claim a classification. (The cubic's ellipse came from
`z i + i z*` being *linear*; the quintic's middle legs are *bilinear*, and that is the
difference.)

**`L(β)` has exactly FOUR stationary points** — for the test data at `β ≈ 1.561, 4.571,
7.845, 10.854` over `[0,4π)`, with `L ∈ [2.188, 2.288]` against a chord of `2.083`. These are
[FGMS08]'s four general helical interpolants, reproduced from our own code. Note they are
*not* at round multiples of `π`: they are data-dependent, unlike the planar members below.

**THE FOUR PLANAR INTERPOLANTS SIT AT THE QUARTER-TURNS.** With coplanar data the classical
planar quintic Hermite problem's four solutions (slide 5) appear in the spatial family at four
*exact* points, matched to **1e-15**:

| planar branch | `(α, β)` | arc length |
|---|---|---|
| 1 | `(0, 0)`      | 2.1748 |
| 0 | `(π, 0)`      | 2.1748 |
| 3 | `(π/2, π)`    | 2.1281 |
| 2 | `(3π/2, π)`   | 2.1281 |

**Why `β ∈ {0, π}`:** a planar curve needs `A(t) ∈ span{1,k}` up to a global gauge. For
in-plane data `nᵢ` is pure and lies in `span{i,j}`, and `nᵢ·exp(φi)` enters `span{1,k}` only
when `cos φ = 0`. So `φ₀, φ₂ ∈ {±π/2}` and `β = φ₂ − φ₀ ∈ {0, ±π}`. A generic `β` has no
planar member at any `α` (measured: min planarity `3.1e-2` at `β = 1.3`).

And the arc lengths pair up by `β` — computed by the *independent* planar solver — which is a
free confirmation of the gate from outside this module.

⚠ **Grid-artifact warning, paid for once.** A 90×90 sweep of the torus found only the two
`β = 0` members and reported "2 planar members". `β = π` falls at `j = 22.5` on a 90-step
`[0,4π)` grid — *between samples*. Sample the torus at resolutions that hit `β = π` exactly,
or search the four predicted points directly.

## Still open

- Degeneracies are benign as far as tested: an antipodal tangent `dᵢ = (−1.5,0,0)` works, and
  straight-line data gives 0/3600 nulls with arc length exactly `1.000000000`. No case yet
  found where `d = 0`; if one exists it is a codimension-3 accident.
- Whether the `P₂`/`P₃` surfaces self-intersect, and what that means for picking a point on
  them by clicking.

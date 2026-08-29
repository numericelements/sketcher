# The Surjectivity Quest — how many control points can be positioned ANYWHERE

Eric's conjecture (2026-08-29, stated during the triangularity discussion): *for a PH curve of
degree n, in the plane and in space, any (n+3)/2 control points can be positioned arbitrarily and
the remaining points completed to a genuine PH curve* — degrees 3, 5, 7, 9 → 3, 4, 5, 6 points.
"Independently controllable" = surjectivity of the evaluation map (curve) ↦ (positions of the held
points), for every choice of held indices.

This document records what is PROVEN, what is MEASURED, and where the freedom END —
because the campaign found the boundary.

## The verdict, in one table

| count held | status |
|---|---|
| (n+3)/2 — the conjecture | HOLDS everywhere tested: PROVEN for all m+3 prefix+suffix splits per degree (two-ends theorem) plus grade-1; ~3,700 verified instances across every choice of held points at degrees 3, 5, 7, 9, zero surviving failures |
| (n+3)/2 + 1 (degree 9, hold 7) | FAILS, often and grip-dependently: 40 surviving infeasibility candidates (`surjectivity-candidates.json`), up to 11/12 configurations refused on the worst grip |

Dimension-counting says hold-7 at degree 9 is legal (a 1-parameter family remains — measured, all
120 choices). Realness says otherwise. The last count with position-them-anywhere freedom is the
OBJECT count — (n+1)/2 spinor coefficients plus one integration constant — exactly (n+3)/2.

## What is proven

**The cascade theorem (Eric's causal argument, repaired).** Hold the first m+2 points anywhere
(P₁ ≠ P₀). Bernstein products CONVOLVE coefficients, so leg j involves only spinor coefficients of
index ≤ j−1 — and in the first leg where a coefficient appears, it appears LINEARLY (its own
square waits until leg 2j+1). So the system triangularizes: 𝒜₀ from L₁ by the pointwise cone
surjectivity (every vector is 𝒜i𝒜*); each later 𝒜ⱼ from leg j+1 by inverting the polar map
v ↦ 𝒜₀iv* + vi𝒜₀* — linear ℝ⁴ → ℝ³, kernel exactly the gauge line 𝒜₀i, surjective. One point
per object, any positions, constructively. Mirror-symmetric from the far end; the 2D version is a
complex square root and then divisions. (Eric's original "integration is causal" intuition fails
for a single polynomial — polynomials are global — but holds coefficient-wise via convolution.)

**The coplanarity lemma.** Any 3 points are coplanar; the planar problem in their plane has
solutions (2D: complex solutions ARE planar curves, and ℂ is closed); a planar PH curve is a
spatial one. So degree 3 is settled for ALL choices, and more generally every COPLANAR
configuration whose 2D problem is solvable is feasible at every choice — counterexamples must
be genuinely 3D. (Caveat, added with the 2D check below: "ℂ is closed" guarantees complex
roots, not FINITE ones — at higher degrees a 2D configuration can in principle push all roots
to infinity, so the lemma's blanket form holds verbatim only at degree 3, where the square
system is a single quadratic per leg. No actual infinite-root configuration has been found.)

**Grade-1 extension.** One gap, far endpoint excluded: the held data are leg-SUMS whose newest
coefficient still enters linearly (sum of polars = polar of the combined quaternion) — cascade
still runs. This is the mechanism under the planar count-1 rule.

**The two-ends theorem (the lean companion's construction, 2026-08-29; verified here).** Hold
any PREFIX of p points and SUFFIX of q points with p + q = m + 2, arbitrary positions. The left
cascade determines 𝒜₀…𝒜_{p−2}, the mirrored right cascade determines 𝒜_p…𝒜_m, and exactly one
Bernstein coefficient λ = 𝒜_{p−1} — the shadow of t^{p−1}(1−t)^{q−1}, whose degree is p+q−2 = m
EXACTLY — stays free. The one remaining condition (total displacement) is quadratic in λ:
c·λiλ* + polar(B,λ) = V with c > 0, and COMPLETING THE SQUARE ON THE SANDWICH reduces it to a
single Hopf inversion, solvable for every right-hand side. That proves all m+3 prefix+suffix
splits per degree — subsuming both one-sided cascades (p = 0, m+2) and the literature's Hermite
grip (p = q = 2) — constructively: `spatialTwoEnds.ts`, validated to machine precision at
degrees 5–11 in `twoEndsConstruction.test.ts`. Nondegeneracy: nonzero first prescribed leg at
each end.

**The wall, mechanised.** The same bookkeeping explains why m+3 held points fail: one more
condition and the interpolation direction would need degree m+1 > m — λ is gone, the system is
square, and realness can refuse. The measured boundary (the 40 candidates) is this mechanism
made visible. Corollary for proof strategy: any proof of the full conjecture must be sharp
enough to FAIL at m+3, which rules out every soft argument (dimension counting, genericity,
Sard) from the start.

**Literature.** The degree-5 Hermite choice {P₀,P₁,P₄,P₅}: spatial PH quintics match arbitrary
C¹ Hermite data (Farouki–al-Kandari–Sakkalis 2002; Farouki–Giannelli–Manni–Sestini CAGD 2008).
Now a special case of the two-ends theorem.

## What is measured (the campaign, 2026-08-29; all probes deterministic)

Solver: multi-start Gauss–Newton onto the held targets (`spatialFibre.correctToGrip`), escalating
through: more starts → constructive cascade where the grip is consecutive → the REVERSED problem
(t → 1−t maps grip G to {n−g}; feasibility is invariant, and the mirror is often a start-anchored
cascade) → CASCADE-MANIFOLD seeding (complete indices 0..m+1 with held values plus synthetic
points, build the exact cascade curve through them, correct only the remainder). A found solution
is a PROOF for that instance; a surviving failure is evidence, not proof, of infeasibility.

- Degree 7, three grips × 40 random configs + 48 hostiles: all solved. Hostiles = five-point
  subsets of six-point configurations PROVEN infeasible by the exhaustive resultant solver
  (`solveSpatialSepticSixPoints`) — one point from impossibility, the safe count is easy.
- Degree 5: all 15 grips × 12 configs — 180/180. Degree 7: all 56 grips × 12 — 672/672 after
  rescues. Degree 9 hold-6: all 210 grips × 8 — 1,680/1,680 after rescues.
- Degree 9 hold-7 (16 sampled grips × 15): 42 suspects survived 400+ starts in both orientations.
- **The decisive differential**: the cascade-manifold rescue dissolved the hold-6 suspects
  12/12 — and the hold-7 suspects only 2/42. Same solver, same rescue, same degree. The 40
  survivors are as close to genuinely infeasible as numerics gets; their exact coordinates are in
  `surjectivity-candidates.json`.
- Failure rates are GRIP-dependent (e.g. {0,1,2,3,4,7,9}: 11/12 refused; {0,…,6}: 1/15) —
  each grip's rate measures its reachable-region deficit.

**Solver lesson, earned repeatedly:** random multi-start fails precisely on the TRIANGULAR
(cascade-like) grips that are analytically easiest — narrow basins — and sails through the
genuinely quadratic scattered grips. The rescue ladder above is the remedy; reversal also
exposed (and cured) a stark orientation bias (0/15 vs 11/15 on mirror-image grips).

## The 2D check (the lean companion's caveat, resolved 2026-08-29)

The lean companion warned that the 2D baseline is a SQUARE system (no slack), so "arbitrary
positions" in the plane could hide a discriminant — configurations whose roots all sit at
infinity. Swept: degree 5 (all 15 grips × 8) and degree 7 (all 56 × 8) clean; degree 9 hold-6
(all 210 × 4, K=5 homotopy) returned THREE empty verdicts, each with all 32 paths diverged,
robust to six independent gammas AND to raising the escape bound to 1e9, with even a
0.15-perturbed neighbourhood reading empty.

That robustness was the tell, not the proof: an open region of genuine emptiness is
algebraically impossible for a square system whose sibling configurations solve (the finite
root count drops only on closed algebraic sets). The oracle settled it — all three grips have
a length-4 consecutive prefix (one after reversal), so w₀…w₂ come EXACTLY from the division
cascade, and Newton from cascade-seeded tails found verified solutions for ALL THREE, with
generator coefficients of magnitude 5e3 to 7e5. The homotopy's divergence verdict had misfiled
huge-but-finite roots (`BIG` = 1e5, and tracking collapses near the blow-up long before that).
Pinned: `planarSubsetHomotopyBlindSpot.test.ts`.

Consequences:
- **No 2D counterexample; the conjecture stands in the plane at every sampled configuration.**
  What exists is a BLOW-UP REGION: near the (measure-zero) locus where a grade-1 grip's tail
  division degenerates (w₄ = RHS/B with B → 0), the one finite root runs enormous. Exactly ON
  such a locus with nonzero RHS the 2D problem would be genuinely infeasible — that is the
  real (thin) discriminant the caveat anticipated; random sampling can only ever see its
  neighbourhood, as huge solutions.
- **Solver lesson #2: a homotopy divergence report is NOT an emptiness certificate** on
  near-triangular grips — the count-1 structure leaves one finite path among 31 divergent
  ones, and it is lost first. Cascade-seeded Newton is the oracle there.
- **The lesson was turned on our own evidence**: the three inlined hold-7 candidates were
  re-attacked with seed scales 5 → 2000 (750 extra starts each, exactly the scale range that
  had hidden the 2D roots) — all three RESIST. The 3D boundary evidence survives its own
  audit; the same coplanar specimens embedded at z=0 also resist the standard 3D ladder,
  consistently with their 2D solutions being the (huge) planar members the ladder's
  moderate-scale seeds cannot reach.

## The scattered program (begun 2026-08-30)

The route to the scattered grips, opened on the minimal case — degree 5, hold {0,1,3,5}
(prefix 2, one interior point, suffix 1). Every scattered grip reduces the same way: cascade
away the prefix and suffix jets, leaving r+1 free quaternions and r+1 block conditions (the
two-ends theorem is r = 0). For {0,1,3,5} (r = 1) the reduction is, with 𝒜₀ fixed by the
first leg and λ₁ = 𝒜₁, λ₂ = 𝒜₂ free:

    (1)  ½·polar(𝒜₀,λ₁) + ⅔·S(λ₁) + ⅙·polar(𝒜₀,λ₂) = 5(P₃−P₁)
    (2)  ½·polar(λ₁,λ₂)  +  S(λ₂)                    = 5(P₅−P₃)

**What is proven here so far:**
- **The inner square completes**: (2) ⟺ S(λ₂ + λ₁/2) = V + S(λ₁)/4 — a Hopf inversion for
  every λ₁, exactly the two-ends mechanism, with the gauge angle θ free. What remains is the
  OUTER problem: (1) after substituting λ₂(λ₁, θ) — three equations in five unknowns, reduced
  in the 𝒜₀-frame to a circle-reachability equation. Not yet closed in closed form; solved
  reliably by Gauss–Newton (`scatteredQuinticReduction.test.ts`).
- **Properness for {0,1,3,5}** — the a-priori bound: the homogeneous parts vanish
  TRIANGULARLY (S(λ₁) = 0 ⟹ λ₁ = 0 ⟹ S(λ₂) = 0 ⟹ λ₂ = 0, using |S(q)| = |q|²), so
  |targets| ≳ |λ|² and the image is closed. Measured signature: solutions scale like
  √(target scale) through scale 1000. CORRECTED (the lean companion, 2026-08-30): this kill
  uses only anisotropy of the square, which holds over ℂ too (w² = 0 ⟺ w = 0) — so the SAME
  grip is proper in the plane, and there the square homogeneous system upgrades straight to
  full surjectivity (trivial zero fibre ⟹ finite morphism ⟹ onto): 2D {0,1,3,5} is
  completely solved, every target. The plane-vs-space contrast is ALGEBRAIC CLOSURE, not
  properness; the earlier 2D blow-up specimens live at grips that are genuinely non-proper —
  in both dimensions (e.g. {0,1,2,3,4,8}: after the leg kills, one block equation on three
  coefficients has nontrivial zeros).

**The kill-cascade is a CERTIFICATE, not a classification.** The triangular argument
mechanises into the KILL-CASCADE (a block whose live pair terms reduce to one diagonal
w·S(𝒜ⱼ) kills 𝒜ⱼ; iterate). Exact scan (`propernessKillCascade.test.ts`): it certifies
{0,1,3,5}, {0,1,4,5}, {0,2,4,5} at degree 5; four grips at degree 7; the five
perfectly-spread grips at degree 9 (counts m+1 — the companion notes the closed-form
criterion: the elimination order works iff each block's top index reaches the diagonal of its
newest coefficient, left-to-right, right-to-left, or two-ended). Two facts keep the
certificate honest in BOTH directions:
- properness can hold where the certificate fails — {0,2,3,5} at degree 5 (the companion's
  proof, verified numerically, sphere-minimum 1.0e-1 over 60 starts): substituting
  u = 𝒜₀+½𝒜₁, v = 𝒜₂+½𝒜₁ forces |u| = |v| = ½|𝒜₁| onto i-circles, and the middle block
  reduces to 2cos(φ−ψ) − 2(cosφ+cosψ) + 18 = 0, whose left side is ≥ 12;
- genuine escapes exist — {0,2,4,5,6,9} holds both endpoints yet reaches sphere-minimum
  6e-36 (block sums let S(𝒜₀) cancel against polar terms inside a gap); grips missing an
  endpoint always escape benignly through unheld end-legs.

**THE FILTER, run (the companion's demand — and it bites).** The kill-cascade at hold-(m+3):
the degree-7 square case {0,1,2,3,4,5} — where HALF of all polygons are infeasible
(SEPTIC_SIX_POINTS) — is interior-proper by the certificate; at degree 9 hold-7, 30 of 120
grips are interior-proper, including three of the nine candidate grips with FULL kills
({0,1,3,4,5,8,9}, {0,1,3,5,7,8,9}, {0,2,3,4,6,8,9}). So PROPERNESS HOLDS WHERE SURJECTIVITY
IS FALSE: the program "proper ⟹ closed, + open + connected ⟹ surjective" is REFUTED as
stated — it would prove a false theorem. The separating ingredient is the one still without
a route: the critical-value set must not disconnect the target space (a closed image whose
boundary is a measure-zero critical set can still be a half-space), and THAT is what fails
at m+3. Silver lining: on a fully-killed hold-7 grip, properness makes the INFEASIBLE set
open — the candidates sit in robust open regions, strengthening the boundary evidence.

**The outer problem, in its better shape (the companion's elimination order).** λ₂ enters
(1) only linearly through polar(𝒜₀,·), which is onto with kernel ℝ·𝒜₀i — so solve (1) first:
λ₂ = μ(λ₁) + t·𝒜₀i. Then (2) becomes, with ν = μ(λ₁) + ½λ₁ and using S(𝒜₀i) = S(𝒜₀):

    t²·S(𝒜₀) + t·polar(ν, 𝒜₀i) + S(ν) = V + ¼S(λ₁)

— for each λ₁ a PARABOLA in ℝ³ with fixed nonzero leading vector S(𝒜₀); the question is
whether the 4-parameter family of parabolas sweeps ℝ³. Everything is polynomial (quartic in
λ₁), no Hopf lift, and every ingredient is already a theorem in the companion's Cascade.lean.

**Missing, in order:** (i) close the parabola-sweep question for {0,1,3,5}; (ii) the
NON-SEPARATION ingredient — why, at m+2 only, the critical values do not wall off part of the
target space (this is now identified as THE difficulty, by the filter); (iii) openness (full
rank somewhere on every fibre). Literature for (i)–(ii): Agrachev–Lerario, systems of real
quadratic forms.

## Open

1. **Stage 3**: certify ONE candidate's infeasibility (cascade away the consecutive prefix —
   six explicit conditions on seven parameters — then SOS/Positivstellensatz or exhaustive
   low-dimensional analysis). Would make the boundary a theorem, not evidence.
2. **The scattered interior grips** (any grip that is not prefix+suffix or grade-1): measured
   clean, unproven. One reformulation worth keeping (the lean companion's): the held data are
   values of the quadratic moment maps 𝒜 ↦ Σ C_ab·𝒜ₐi𝒜_b* with coefficient matrices supported
   on anti-diagonals (a+b fixed) — surjectivity is a JOINT-NUMERICAL-RANGE question for a family
   of quaternionic quadratic forms (Dines, Brickman, Au-Yeung–Poon are the classical entry
   points, though those convexity theorems cover far fewer forms than a general grip needs).
   The hostile result hints at the geometric route: understand why spare dimensions rescue
   realness (the reachable-region boundary = the realness discriminant, where solutions collide
   pairwise and go complex).
3. **The reachable region**: over six held points at degree 9, map the family through "position
   of a 7th point" — the 40 candidates are points OUTSIDE that region; drawing it would make the
   discriminant visible (and would make a figure).
4. **ℝ⁴ and beyond**: PH in ℝⁿ is Clifford/spin (Choi–Lee–Moon); whether (n+3)/2 persists is a
   computation not yet done.

## Pinned

`surjectivityBoundary.test.ts`: reduced safe-count sweeps at degrees 5, 7, 9 (full attack
ladder, must all solve) and three of the 40 candidates hardcoded (must RESIST the bounded
ladder — if a future solver solves one, that is a discovery, not a regression: update this
document). `twoEndsConstruction.test.ts`: the two-ends theorem at machine precision, all m+3
splits, degrees 5–11. `scatteredQuinticReduction.test.ts`: the {0,1,3,5} reduction exact, the
inner square an identity, and √s properness scaling to target scale 1000.
`propernessKillCascade.test.ts`: the exact triangular-vanishing classification (5 grips at
degree 9) and the {0,2,4,5,6,9} counterexample to universal properness.
`planarSubsetHomotopyBlindSpot.test.ts`: the 2D huge-root specimen —
homotopy reads empty, cascade-seeded Newton finds the verified |w| ≈ 5e3 solution. Related:
`spatialFibreDimensionHighDegree.test.ts` (dimension m at every grip through degree 15),
`docs/SEPTIC_SIX_POINTS.md` (the square case, where realness fails half the time).

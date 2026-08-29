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
| (n+3)/2 — the conjecture | HOLDS everywhere tested: theorems at the core, ~3,700 verified instances across every choice of held points at degrees 3, 5, 7, 9, zero surviving failures |
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
configuration is feasible at every choice — counterexamples must be genuinely 3D.

**Grade-1 extension.** One gap, far endpoint excluded: the held data are leg-SUMS whose newest
coefficient still enters linearly (sum of polars = polar of the combined quaternion) — cascade
still runs. This is the mechanism under the planar count-1 rule.

**Literature.** The degree-5 Hermite choice {P₀,P₁,P₄,P₅}: spatial PH quintics match arbitrary
C¹ Hermite data (Farouki–al-Kandari–Sakkalis 2002; Farouki–Giannelli–Manni–Sestini CAGD 2008).

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

## Open

1. **Stage 3**: certify ONE candidate's infeasibility (cascade away the consecutive prefix —
   six explicit conditions on seven parameters — then SOS/Positivstellensatz or exhaustive
   low-dimensional analysis). Would make the boundary a theorem, not evidence.
2. **The non-cascade proofs at the safe count** (scattered grips, ends-held): measured clean,
   unproven. The hostile result hints at the route: understand why spare dimensions rescue
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
document). Related: `spatialFibreDimensionHighDegree.test.ts` (dimension m at every grip through
degree 15), `docs/SEPTIC_SIX_POINTS.md` (the square case, where realness fails half the time).

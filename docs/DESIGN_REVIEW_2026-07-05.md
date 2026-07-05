# Design review — full codebase, pre-push (2026-07-05)

Five parallel read-only reviews (core design, app layer, docs coherence, test
suite, duplication/dead-code with a resolved-import dependency map). Findings
merged and tiered. Nothing in Tier 1–2 touches a pinned number.

## The verdicts, condensed

- **core substrate**: publishable already — bernstein/coeffs/indexing/insert,
  curvatureFamilies, and the solver headers (measured provenance on every
  choice) are exemplary; the law comments sit where the code enforces them.
  The EDIT LAYER above it lags: two of the eight ideas (the Law-2 guard, the
  AD duals) have 4–8 homes instead of one; a superseded 656-line PH drag
  generation lingers unmarked; the star-export barrel publishes internals.
- **app layer**: strict-mode clean, @ts-nocheck 0 (was 79), four benign casts
  total; every drag routes to core with measurement-citing comments. Blockers
  are reputational: one dead 453-line legacy solver, one dead field whose
  comment describes the FORBIDDEN freeze model, three stale boundary comments.
- **docs**: CLAUDE.md + ARTICLE.md essentially ready (3 consistency touches).
  CURVATURE_ARCHITECTURE.md is the document a first reader must NOT see as-is
  (describes pre-E15/E18/E25 counting, markers-deadband, ipopt-default,
  legacy routing). THE_IDEAS V/VIII + five FOUNDATIONS facts lag. No README
  front door.
- **tests**: the pin discipline is real (labE25/stallCensus = the model).
  Five tests import a sibling repo SIX DIRECTORIES UP → all five fail at
  collection for any public cloner. Two live "tests" assert nothing. The
  one observed flake = a missing 30s timeout.
- **duplication**: ~2,860 lines dead NOW (incl. 1,014 in algebra.ts + 1,318 in
  complexAlgebra.ts — the legacy Jacobian machinery); ~1,440 test-only;
  ~2,000–2,500 live-but-duplicated (re-pointable to core). Total ≈ a third of
  the 21k sketcher optimizer/utils layer.

## TIER 1 — before push (reproducibility + honesty + correctness)

1. Gate the five external-repo tests (skipIf-exists or opt-in project):
   ericClosedCurveOracle, labE1PinnedWeights, labE7EricSolverCoreProblem,
   labE15b, labE15c.
2. Delete dead-with-teeth: sketcher/optimizer/BSplineCurveProblem.ts (453,
   zero importers); sceneStore dragConstraintState field + its freeze-model
   comment (documents what Law 2 forbids); core closedPHCurveBoundOf;
   core curvatureExtremaGradientComplexFixedWeight (non-Cols).
3. Fix the open-PH catch fall-through (moves a PH curve as plain B-spline,
   desyncs phMetadata) → mirror the closed path's warn-and-drop.
4. Test hygiene minimum: +30s timeout on coreComplexRationalDrag it#3 (the
   flake); __solver_compare + labE26WhoBlocks → skipped labs with headers.
5. Post-E25 vocabulary sweep: collapse curvatureExtremaMarkersOfNumeratorRobust
   into the plain finder (now behaviorally identical); rewrite its docstring
   and the stale "robust/noise-floor" comments (curvatureDrag header,
   curvatureFamilies "PH lives in sketcher", curvatureProblem "ONE guard",
   sceneStore front door + :744, SketcherCanvas "optimizer" RAF names).
6. Docs pass: rewrite ARCHITECTURE §2/§3/§6/§8/§9; THE_IDEAS III/IV/V/VIII +
   anchors; FOUNDATIONS addenda F2/F4/F6/F7/F8/F10-11; ARTICLE E1–E27 + "3
   families" + dynamic-range figures; CLAUDE.md markers zeros→sign-changes;
   README front-door block; stamp LINEAR_DRAG + PH_CURVATURE_REDUCTION.

## TIER 2 — high-value consolidation (with or right after the push)

7. ONE Law-2 guard: route the 8 hand-rolled bisections through
   enforceBoundNonincreasing.
8. Dead-cluster deletions: algebra.ts (−1,014) + complexAlgebra.ts (−1,318)
   dead code; core/function.ts; phDrag.ts (656, test-only) after confirming
   supersession — delete or stamp "measurement baseline (E14)".
9. Curated core/index.ts export list grouped by the eight ideas; stop
   exporting internals; slide() default 'best' → 'trust-region'; unify
   maxIterations naming.
10. Module splits: phCurveBoundDrag.ts → drag/displayState/periodicView;
    curvature.ts → numerators/signChangeLocator/complex-gradients.
11. One ad.ts (Dual/RDual/CBDual/Jet2); one dense SPD solve; one de Casteljau
    split; farinDrag imports core/complex (3-line fix).
12. Pins for the island routes (AB / complex-rational-SD / real-rational /
    plain-PH: bound-held store tests) + a core-level slideRationalFarin test.
13. Test polish: shared fixtures.ts (18× oval, 10× wavy); floor annotations
    ("measured X at pin time"); PIN / LAB-RECORD / DoD header tags; perf
    ceilings → medians.

## TIER 3 — post-push structural

14. Re-point sketcher algebra to core (~2–2.5k lines then deletable):
    BernsteinDecomposition, basis/evaluate, derivativeBD/integrateBD/
    recomposeBD (6 island files), insertKnot/unrollToOpen, utils/complex.
15. sceneStore slice split (keep drag-routing text verbatim); move shared
    algebra out of optimizer/; rename core/ipopt/ → interiorPoint/; move the
    SVG-path builder out of core; __tests__ → labs/ + pinning/.
16. The island decision: port AB/CR-PH/RR-PH drags to core vs contain as
    documented enclave (Eric's call; InteriorPointOptimizer leaves with them).

## Positives worth keeping on the record

- @ts-nocheck 79 → 0; strict everywhere; production casts: 4, benign.
- Every article-cited test exists; the pin/lab/notebook discipline is real.
- The closed-curve "S=" odd-count display bug is FIXED (both readouts wrap
  the seam) — the old memory entry is stale.
- No dead UI paths; display provably reads what the solver enforces.

## EXECUTION LOG — Tier 1 done, Tier 2 in progress (2026-07-05)

**Tier 1 — DONE** (commits eba4ed5 code, e06f13f + 43ded24 docs). External-test
gating, dead-code deletions, open-PH warn+drop, post-E25 vocabulary sweep; then
ARCHITECTURE/THE_IDEAS/FOUNDATIONS/ARTICLE brought to current state.

**Honesty correction found WHILE executing Tier 2** (commit 367e9f5). Verifying the
code contradicted a claim the Tier-1 docs had introduced: the editor does NOT run
"trust-region everywhere." Ground truth from `sceneStore.moveControlPoint` +
`slideCurve`/`slideComplexRational`:
- **Algebraic families** (polynomial/rational/complex-rational, open+closed) → the
  **ipopt `InteriorPointOptimizer`** (`slideCurve` `method:'ipopt'`,
  `slideComplexRational`, and generic `slide()`'s default `'best'` = ipopt+primal-dual).
- **PH** (open+closed) → the **trust-region** engine (`phCurveBoundDrag.ts`).
- **Farin** → the pure-weight walk (the TR call in `farinDrag.ts` is the *unwired*
  anchored variant). Docs corrected; unifying the algebraic families onto TR is now
  stated as the remaining spine step.

**Tier 2 items, as executed (several review claims corrected on inspection):**
- **#7 (one guard) — NARROWED + done** (92524e7). "8 hand-rolled bisections" was a
  surface pattern-match. Reality: the shared `enforceBoundNonincreasing` already IS the
  single guard for the algebraic families; PH has ONE pull-back that enforces TWO
  invariants (reduced bound R + value-bound P±) with a distinct fallback; Farin is a
  count-guarded WALK + reset + a 1-D ratio bisection, not straight-path bisections. The
  one real win landed: the PH reduced-bound bisection now reuses the shared guard, value
  check kept explicit.
- **#8 (dead-cluster deletions) — MOSTLY REFUTED.** `algebra.ts`/`complexAlgebra.ts` are
  NOT dead — many importers (PH-variant island, labs, SketcherCanvas, utils, tests);
  deletion is gated on the Tier-3 re-point, not now. `core/function.ts` is a 35-line
  scalar-BSpline fixture used by a real pinning test (`insert.test.ts`) — keep.
  `phDrag.ts` is superseded for production (only `closedPHDragDecouple.test.ts` uses it)
  → **stamped** MEASUREMENT BASELINE, kept as the periodic-space alternative-design ref.
- **#11 (farinDrag imports core/complex) — done** (367e9f5). The one-off cmul/cadd/cdiv
  now alias `core/complex` (no call-site churn). (One ad.ts / one dense SPD / one de
  Casteljau: not yet.)
- **#13 (perf ceilings → medians) — done as REMOVAL** (4cce1f0). Three tests asserted
  `expect(ms).toBeLessThan(...)`, contradicting THE_IDEAS idea VII §7 ("no timing
  assertions"). They produced 9 spurious full-suite "failures" under CPU contention (ms
  blown ~1000× while every tracking/bound assert held). Converted to logged-only; the
  correctness asserts stay. Concrete evidence for the item, and the suite is now
  contention-proof.

**Still open in Tier 2:** #9 (curated `index.ts`; `slide()` default `'best'`→`'trust-region'`
— NOTE: this is a real EDITOR behavior change for open rational/complex, needs measurement,
not a cleanup; maxIterations naming), #10 (module splits: `phCurveBoundDrag`, `curvature.ts`),
#11-rest (one ad.ts, one dense SPD, one de Casteljau), #12 (island route pins + a core-level
`slideRationalFarin` test).

**Caveat for whoever runs the suite:** a full `vitest run` is ~16 min and, back-to-back,
thrashes the machine — perf-sensitive tests then flake. Run PH/TR test files in isolation
to judge correctness; ignore ms/tick figures under load.

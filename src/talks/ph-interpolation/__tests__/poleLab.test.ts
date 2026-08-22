// ============================================================================
// THE POLE LAB's state machine and framing, checked headlessly.
//
// r3f cannot be rendered here, so what is pinned is what the readout would SAY: that framing a
// specimen does not stop it being PH or change any verdict, that every preset yields a readable
// pole, and that the Möbius side reads the same curve whichever model holds it.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Rat, phRelativeResidual, settleToPH, singularValues } from '../../../core/nurbsPH'
import { conformalNullResidual, poleLines, readPoles } from '../../../core/poleReadout'
import { BOUNDS, frame, frameConformal, freshState, sampleRational } from '../PoleLab'
import { PRESETS, conformalAsRat } from '../poleLabPresets'
import { project } from '../../../core/conformal'
import { bernsteinToPower } from '../../../core/conformalPHHopf'
import { definingJacobian, degreeOf, dragControlPoint, radii } from '../../../core/conformalPHCurve'

describe('the pole lab', () => {
  it('FRAMING is exact: it moves the curve into the box and changes no verdict', () => {
    const limit = Math.max(...BOUNDS.max.map(Math.abs))
    for (const p of PRESETS) {
      const raw = p.rat()
      const framed = frame(raw)
      const before = readPoles(raw)
      const after = readPoles(framed)
      const worst = Math.max(...sampleRational(framed, 80).flat().map(Math.abs))
      console.log(`    ${p.label.padEnd(32)} fits to ${worst.toFixed(2)} of ${limit},` +
        ` PH residual ${phRelativeResidual(framed).toExponential(1)},` +
        ` verdicts ${after.map((x) => x.verdict[0]).join('')}`)
      expect(worst, `${p.id} lands inside the view box`).toBeLessThan(limit)
      expect(phRelativeResidual(framed), 'and is still PH — translation and scaling are exact')
        .toBeLessThan(1e-9)
      expect(after.map((x) => x.verdict), 'and every verdict is unchanged')
        .toEqual(before.map((x) => x.verdict))
    }
  }, 120_000)

  it('every preset opens with a pole the button can print', () => {
    for (const model of ['projective', 'mobius'] as const) {
      const available = PRESETS.filter((p) => model !== 'mobius' || p.conformal)
      expect(available.length, `${model} has specimens`).toBeGreaterThan(0)
      for (const p of available) {
        const st = freshState(model, p)
        const poles = readPoles(model === 'mobius' && st.conformal
          ? frame(conformalAsRat(st.conformal))
          : st.rat)
        expect(poles.length, `${p.id} has at least one pole`).toBeGreaterThan(0)
        const lines = poleLines(poles[0])
        expect(lines.length, 'four lines, which is what the slide shows').toBe(4)
        expect(lines.every((l) => l.length < 90), 'and each fits on a slide').toBe(true)
      }
      console.log(`    ${model}: ${available.length} specimens, every one printable`)
    }
  }, 120_000)

  it('the Möbius side reads the SAME curve as the projective side', () => {
    // the point of the pairing: flipping model must not move the curve
    for (const p of PRESETS.filter((x) => x.conformal)) {
      const asProjective = frame(p.rat())
      const asMobius = frame(conformalAsRat(p.conformal!))
      let worst = 0
      for (let i = 0; i <= asProjective.P.length - 1; i++) {
        worst = Math.max(worst, Math.hypot(...asProjective.P[i].map((v, c) => v - asMobius.P[i][c])))
      }
      console.log(`    ${p.label}: the two models' control points differ by ${worst.toExponential(1)}`)
      expect(worst, 'the same curve, held two ways').toBeLessThan(1e-12)
    }
  }, 120_000)

  it('the readout prints its verdict AND the number it came from', () => {
    const hard = PRESETS.find((p) => p.id === 'hard4')
    const soft = PRESETS.find((p) => p.id === 'soft6')
    if (!hard || !soft) throw new Error('missing specimens')
    const h = poleLines(readPoles(frame(hard.rat()))[0])
    const s = poleLines(readPoles(frame(soft.rat()))[0])
    for (const line of [...h, '', ...s]) console.log(`      ${line}`)
    expect(h.join(' ')).toContain('HARD')
    expect(h.join(' '), 'the real case shows ⟨q,q⟩ = |a|² outright').toContain('|a|²')
    expect(s.join(' ')).toContain('SOFT')
    expect(s.join(' '), 'the complex case shows the two lengths').toContain('|a| =')
    expect(s.join(' '), 'and the angle').toContain('angle =')
  }, 120_000)

  it('the SPHERE is centred on its control point, in the SAME coordinates', () => {
    // The bug this guards: the projective form was framed and the conformal state was not, so the
    // sphere was drawn in the specimen's original coordinates while the points were in the box.
    const limit = Math.max(...BOUNDS.max.map(Math.abs))
    for (const p of PRESETS.filter((x) => x.conformal)) {
      const st = freshState('mobius', p)
      expect(st.conformal, `${p.id} loads a conformal state`).not.toBeNull()
      if (!st.conformal) continue
      const shown = conformalAsRat(st.conformal)
      const rs = radii(st.conformal)
      let worst = 0
      let biggest = 0
      for (let k = 0; k < st.conformal.C.length; k++) {
        const centre = project(st.conformal.C[k])
        expect(centre, 'every control sphere has a finite centre').not.toBeNull()
        if (!centre) continue
        worst = Math.max(worst, Math.hypot(centre.x - shown.P[k][0], centre.y - shown.P[k][1],
          centre.z - shown.P[k][2]))
        biggest = Math.max(biggest, Math.abs(rs[k]))
      }
      const extent = Math.max(...shown.P.flat().map(Math.abs))
      console.log(`    ${p.label.padEnd(30)} centres match the drawn points to` +
        ` ${worst.toExponential(1)};  points reach ${extent.toFixed(2)} of ${limit},` +
        ` largest radius ${biggest.toFixed(2)}`)
      expect(worst, 'the sphere centre IS the control point').toBeLessThan(1e-12)
      expect(extent, 'and the framed member is inside the box').toBeLessThan(limit)
    }
  }, 120_000)

  it('framing a conformal member keeps it NULL and keeps every verdict', () => {
    for (const p of PRESETS.filter((x) => x.conformal)) {
      const before = readPoles(conformalAsRat(p.conformal!))
      const framed = frameConformal(p.conformal!)
      const after = readPoles(conformalAsRat(framed))
      const residual = phRelativeResidual(conformalAsRat(framed))
      console.log(`    ${p.label.padEnd(30)} after framing: PH residual ${residual.toExponential(1)},` +
        ` verdicts ${after.map((x) => x.verdict[0]).join('')}`)
      expect(residual, 'a similarity is linear on ℝ⁴ʼ¹, so nullity survives exactly')
        .toBeLessThan(1e-9)
      expect(after.map((x) => x.verdict)).toEqual(before.map((x) => x.verdict))
    }
  }, 120_000)

  it('a projective drag holds the ENDS fixed and still satisfies PH', () => {
    // Freezing the dragged point AND both ends is nine of the 6d+4 unknowns, leaving 6d−5 against
    // 4d−1 equations. At d = 2 that is 7 against 7 — no slack — and pinning both ends of a
    // quadratic pins the whole polygon anyway, so the figure drops the pin below degree 3.
    //
    // HOW FAR EACH SPECIMEN GOES IS RECORDED, NOT TUNED. With the ends held, the λ-chart quartic
    // manages 14 of 30 steps against 30 for the others — it is the one whose W has TRUE DEGREE 1,
    // a degenerate weight polynomial sitting inside a degree-4 basis, and it is the hardest of the
    // set to move. When the corrector cannot hold the constraint the point simply stops and the
    // figure's residual readout turns amber. That is the honest behaviour of a hard problem, not a
    // threshold to loosen until it looks better.
    for (const p of PRESETS) {
      const start = frame(p.rat())
      const last = start.P.length - 1
      const g = Math.min(1, last)
      if (g === 0 || g === last) continue                     // nothing interior to grab
      const ends = [start.P[0].slice(), start.P[last].slice()]
      const chord = Math.hypot(...start.P[last].map((v, i) => v - start.P[0][i]))
      // the figure's own rule: pin the ends only from degree 3 up, where the counting leaves slack
      const pinEnds = last >= 3
      let cur = start
      let worstEnd = 0
      let worstResidual = 0
      let steps = 0
      for (let s = 1; s <= 30; s++) {
        const to = start.P[g].map((v, i) => v + (0.3 * chord * s / 30) * [0.7, 0.5, -0.4][i] / Math.hypot(0.7, 0.5, 0.4))
        const held = pinEnds ? [g, 0, last] : [g]
        const moved: Rat = {
          P: cur.P.map((q, k) => (k === g ? [...to] : [...q])),
          w: [...cur.w],
          rho: [...cur.rho],
        }
        const got = settleToPH(moved, last, {
          frozen: held.flatMap((i) => [3 * i, 3 * i + 1, 3 * i + 2]),
          steps: 160,
        })
        if (got.residual > 1e-5) break
        cur = got.rat
        steps = s
        worstResidual = Math.max(worstResidual, got.residual)
        worstEnd = Math.max(worstEnd,
          Math.hypot(...cur.P[0].map((v, i) => v - ends[0][i])),
          Math.hypot(...cur.P[last].map((v, i) => v - ends[1][i])))
      }
      console.log(`    ${p.label.padEnd(32)} deg ${last}: ${steps}/30 steps,` +
        ` ends ${pinEnds ? 'PINNED' : 'free  '} and moved ${worstEnd.toExponential(1)},` +
        ` worst PH residual ${worstResidual.toExponential(1)}`)
      expect(steps, `${p.id} can be dragged a useful distance`).toBeGreaterThan(10)
      if (pinEnds) {
        expect(worstEnd, 'the ends do not move at all — frozen, not weighted').toBeLessThan(1e-14)
      }
      expect(worstResidual, 'and the curve stays PH').toBeLessThan(1e-5)
      expect(phRelativeResidual(cur), 'including at the end of the drag').toBeLessThan(1e-5)
    }
  }, 300_000)

  it('MÖBIUS: a long drag keeps the soft member soft, and stays ON the model', () => {
    // The slide's claim is that ⟨C,C⟩ ≡ 0 forbids a hard pole, so this is the claim under load.
    const p = PRESETS.find((x) => x.id === 'soft6')
    if (!p?.conformal) throw new Error('missing specimen')
    let conf = frameConformal(p.conformal)
    const pts = conformalAsRat(conf).P
    const last = pts.length - 1
    const g = 2
    const start = pts[g].slice()
    const chord = Math.hypot(...pts[last].map((v, i) => v - pts[0][i]))
    let worstIso = 0
    let worstNull = conformalNullResidual(conf)
    for (let s = 1; s <= 40; s++) {
      const u = (1.5 * chord * s) / 40
      const to = start.map((v, i) => v + (u * [0.6, 0.6, -0.5][i]) / Math.hypot(0.6, 0.6, 0.5))
      conf = dragControlPoint(conf, g, { x: to[0], y: to[1], z: to[2] },
        { pinEnds: true, iterations: 60 }).state
      const poles = readPoles(conformalAsRat(conf))
      worstIso = Math.max(worstIso, ...poles.map((x) => x.isotropy))
      worstNull = Math.max(worstNull, conformalNullResidual(conf))
      expect(poles.every((x) => x.verdict === 'soft'),
        `every pole still soft after ${(u / chord).toFixed(2)} chords`).toBe(true)
    }
    console.log(`    dragged 1.5 chords: worst isotropy ${worstIso.toExponential(1)},` +
      ` worst ⟨C,C⟩ drift ${worstNull.toExponential(1)} — it never left the model`)
    expect(worstIso, 'soft to machine precision the whole way').toBeLessThan(1e-9)
    expect(worstNull, 'and ⟨C,C⟩ never drifted').toBeLessThan(1e-9)
  }, 300_000)

  it('the LIFTED doubled pole SPLITS INTO SOFT POLES on the first touch', () => {
    // This is what the specimen is for, and a fixed iteration budget hid it. The non-reduced locus
    // is a singular point of the variety, so Newton needs more steps there than anywhere else and
    // its convergence is not monotone in the size of the drag. Escalating the budget, exactly as
    // the figure does, and refusing any step that leaves ⟨C,C⟩ = 0:
    //
    //     first grab   300 iterations  →  8 genuine poles, ALL SOFT
    //     after that    80 iterations  →  still all soft, isotropy down to 2e-13
    //
    // One step off the singular locus lands at a regular point, and everything after is ordinary.
    const p = PRESETS.find((x) => x.id === 'lift8')
    if (!p?.conformal) throw new Error('missing specimen')
    let conf = frameConformal(p.conformal)
    expect(conformalNullResidual(conf), 'the lift starts exactly null').toBeLessThan(1e-11)
    const before = readPoles(conformalAsRat(conf))
    expect(before.every((x) => x.verdict === 'multiple — undefined'),
      'and starts as a DOUBLED pole, where softness is undefined').toBe(true)

    const pts = conformalAsRat(conf).P
    const chord = Math.hypot(...pts[pts.length - 1].map((v, i) => v - pts[0][i]))
    const start = pts[2].slice()
    const dir = [0.6, 0.6, -0.5]
    const dn = Math.hypot(...dir)

    let refused = 0
    let firstBudget = 0
    let worstIso = 0
    let worstNull = 0
    let genuineCount = 0
    for (let s = 1; s <= 20; s++) {
      const u = (0.6 * chord * s) / 20
      const to = start.map((v, i) => v + (u * dir[i]) / dn)
      // the figure's rule: escalate, take the BEST solve, refuse nothing
      let took = 0
      let best: typeof conf | null = null
      let bestNull = Infinity
      for (const iterations of [80, 300, 900]) {
        const r = dragControlPoint(conf, 2, { x: to[0], y: to[1], z: to[2] },
          { pinEnds: true, iterations })
        const off = conformalNullResidual(r.state)
        if (off < bestNull) { bestNull = off; best = r.state; took = iterations }
        if (off <= 1e-9) break
      }
      if (!best) { refused++; continue }
      conf = best
      if (!firstBudget) firstBudget = took
      const poles = readPoles(conformalAsRat(conf)).filter((x) => x.numerator > 1e-7)
      genuineCount = poles.length
      worstNull = Math.max(worstNull, bestNull)
      // ON the model, every genuine pole must read soft — the identity leaves no choice.
      // OFF it, the figure withholds the verdict rather than reporting one, so there is nothing
      // to assert here except that the drift is visible, which the next test covers.
      if (bestNull <= 1e-9) {
        worstIso = Math.max(worstIso, ...poles.map((x) => x.isotropy))
        expect(poles.every((x) => x.verdict === 'soft'),
          `every genuine pole is soft after ${(u / chord).toFixed(2)} chords`).toBe(true)
      } else {
        refused++
      }
    }
    console.log(`    the doubled pole split into ${genuineCount} genuine poles, all soft;` +
      ` first grab needed ${firstBudget} iterations`)
    console.log(`    over 0.6 chords: worst isotropy ${worstIso.toExponential(1)} where ON the model,` +
      ` worst ⟨C,C⟩ ${worstNull.toExponential(1)}, ${refused} of 20 steps drifted off it`)
    expect(genuineCount, 'the double root split — eight genuine poles where there were none').toBe(8)
    expect(worstIso, 'and every one of them is soft').toBeLessThan(1e-8)
    expect(refused, 'and most steps land ON the model').toBeLessThan(6)
  }, 300_000)

  it('a state OFF the model gets NO verdict — the figure withholds rather than points wrong', () => {
    // The rule: never point the wrong way, and never hide either. Softness is forced here by
    // ⟨C,C⟩ ≡ 0, so a drifted state can compute poles that read hard — reporting that as geometry
    // would point exactly opposite to the theorem. Refusing the step hides the failure instead.
    // So the step is taken, the drift is shown, and the LABEL is withheld.
    const p = PRESETS.find((x) => x.id === 'lift8')
    if (!p?.conformal) throw new Error('missing specimen')
    let conf = frameConformal(p.conformal)
    const pts = conformalAsRat(conf).P
    const chord = Math.hypot(...pts[pts.length - 1].map((v, i) => v - pts[0][i]))
    const start = pts[2].slice()
    // a deliberately violent single step, at the cheap budget — the case that drifts
    const to = start.map((v, i) => v + (1.2 * chord * [0.6, 0.6, -0.5][i]) / Math.hypot(0.6, 0.6, 0.5))
    conf = dragControlPoint(conf, 2, { x: to[0], y: to[1], z: to[2] },
      { pinEnds: true, iterations: 80 }).state
    const off = conformalNullResidual(conf)
    const poles = readPoles(conformalAsRat(conf))
    console.log(`    a violent step at the cheap budget: ⟨C,C⟩ = ${off.toExponential(1)},` +
      ` raw verdicts would read ${poles.map((x) => x.verdict[0]).join('')}`)
    expect(off, 'this is the case where the arithmetic loses').toBeGreaterThan(1e-9)
    // The figure's contract at this point: the readout shows ⟨C,C⟩ and does NOT print soft/hard.
    // What is pinned here is that the drift is detectable at all, which is what the display keys
    // off — if this ever stopped being true the caveat would silently stop appearing.
    expect(conformalNullResidual(conf), 'and it is visible to the figure').toBeGreaterThan(1e-9)
    expect(poles.length, 'while the poles are still computed and shown').toBeGreaterThan(0)
  }, 300_000)

  it('the CLEAN lifted specimen splits in 80 iterations — degree was never the difficulty', () => {
    // The obvious guess was that the lift is slow because it is conformal degree 8. It is not:
    // grabbing each lift the same way, the two HIGHEST degrees are the fastest.
    //
    //     λ-chart quartic (W true degree 1)  → conformal 8   900 iters, 295ms, never clean
    //     random hard degree 2               → conformal 4   900 iters,  87ms
    //     random hard degree 3               → conformal 6   900 iters, 180ms
    //     random hard degree 4               → conformal 8    80 iters,   3ms, ALL SOFT
    //     random hard degree 5               → conformal 10   80 iters,   9ms, ALL SOFT
    //
    // So the specimen is the difficulty, not the degree, and the lab carries both: the clean one
    // to show what the mathematics says, and the awkward one to show what the arithmetic costs.
    const p = PRESETS.find((x) => x.id === 'lift8g')
    if (!p?.conformal) throw new Error('missing specimen')
    const conf = frameConformal(p.conformal)
    expect(conformalNullResidual(conf), 'it starts exactly null').toBeLessThan(1e-11)
    // NEITHER lift gets a verdict at the start, but they trip different checks first, and that is
    // worth knowing: a lifted curve is non-reduced BOTH ways — the root is doubled AND the
    // numerator cancels there. The λ-chart lift reads 2 × 'multiple', this one 8 × 'not a pole'.
    // What they share is the only thing to assert: no soft-or-hard verdict is given.
    const before = readPoles(conformalAsRat(conf))
    expect(before.every((x) => x.verdict === 'not a pole' || x.verdict === 'multiple — undefined'),
      'a lifted hard curve is non-reduced, so it gets no verdict').toBe(true)
    expect(before.some((x) => x.verdict === 'soft' || x.verdict === 'hard'),
      'and in particular it is never called soft or hard').toBe(false)

    const pts = conformalAsRat(conf).P
    const chord = Math.hypot(...pts[pts.length - 1].map((v, i) => v - pts[0][i]))
    const to = pts[2].map((v, i) =>
      v + (0.03 * chord * [0.6, 0.6, -0.5][i]) / Math.hypot(0.6, 0.6, 0.5))
    const t0 = performance.now()
    const r = dragControlPoint(conf, 2, { x: to[0], y: to[1], z: to[2] },
      { pinEnds: true, iterations: 80 })
    const ms = performance.now() - t0
    const off = conformalNullResidual(r.state)
    const after = readPoles(conformalAsRat(r.state)).filter((x) => x.numerator > 1e-7)
    console.log(`    one touch at the CHEAPEST budget: 80 iterations in ${ms.toFixed(0)}ms,` +
      ` ⟨C,C⟩ ${off.toExponential(1)},` +
      ` ${after.length} genuine poles, worst isotropy` +
      ` ${Math.max(...after.map((x) => x.isotropy)).toExponential(1)}`)
    expect(off, 'stays on the model at the cheapest budget').toBeLessThan(1e-9)
    expect(after.length, 'the double root split into eight').toBe(8)
    expect(after.every((x) => x.verdict === 'soft'), 'and every one is soft').toBe(true)
  }, 300_000)

  it('WHY one lift moves and the other sticks: unbalanced degrees, and a rank the solver loses', () => {
    // Both are conformal degree 8, both are non-reduced, both have 32 rows against 53 unknowns.
    // What separates them is the SHAPE of the representation and, downstream of it, how much rank
    // the defining Jacobian keeps.
    //
    // Read from the ANALYTIC Jacobian, which is exact because the defining conditions are
    // quadratic. That is not fastidiousness: by central difference the dead directions read 1e-11,
    // which is the differencing noise floor and not the rank, so the tail would have been a
    // statement about the step size. Analytically they are at 1e-17 and the count is the variety's.
    const trueDeg = (p: number[]): number => {
      const sc = Math.max(...p.map(Math.abs), 1e-300)
      let n = p.length - 1
      while (n > 0 && Math.abs(p[n]) < 1e-12 * sc) n--
      return n
    }
    const seen: Record<string, { degs: number[]; live: number; smallest: number }> = {}
    for (const id of ['lift8g', 'lift8']) {
      const p = PRESETS.find((x) => x.id === id)
      if (!p?.conformal) throw new Error(`missing ${id}`)
      const st = frameConformal(p.conformal)
      expect(degreeOf(st), 'both specimens are conformal degree 8').toBe(8)
      const degs = [0, 1, 2, 3, 4].map((i) => trueDeg(bernsteinToPower(st.C.map((c) => c[i]))))

      // THE ANALYTIC ROWS, not finite differences. The defining conditions are quadratic, so
      // definingJacobian is exact — and it matters here: measured by central difference the dead
      // directions read 1e-11, which is the differencing noise floor rather than the rank. The
      // analytic rows put them at 1e-17, so the count is a fact about the variety and not about h.
      const J = definingJacobian(st)
      const sv = singularValues(J.map((r) => {
        const m = Math.hypot(...r)
        return m > 0 ? r.map((v) => v / m) : r
      }))
      const live = sv.filter((v) => v / sv[0] > 1e-9).length
      const smallest = sv[live - 1] / sv[0]
      seen[id] = { degs, live, smallest }
      console.log(`    ${p.label}`)
      console.log(`      component true degrees: W ${degs[0]}, q ${degs[1]},${degs[2]},${degs[3]},` +
        ` c∞ ${degs[4]}   —   ${J.length} rows x ${J[0].length} unknowns`)
      console.log(`      ${live} directions the Jacobian still sees,` +
        ` smallest ${smallest.toExponential(1)};` +
        ` tail ${sv.slice(-4).map((v) => (v / sv[0]).toExponential(0)).join(' ')}`)
    }

    // the clean one is BALANCED: every component at the full degree
    expect(seen.lift8g.degs.every((d) => d === 8), 'the clean lift is full degree throughout').toBe(true)
    // the awkward one is not: its denominator is degree 2 inside a degree-8 representation
    expect(seen.lift8.degs[0], 'the λ-chart lift carries a degree-2 denominator').toBe(2)
    expect(seen.lift8.degs[4], 'while its ∞-component is full degree — badly unbalanced').toBe(8)
    // and that costs rank, which is what a corrector actually feels
    expect(seen.lift8.live, 'so the Jacobian sees fewer directions there')
      .toBeLessThan(seen.lift8g.live)
    console.log(`    → the clean lift keeps ${seen.lift8g.live} directions, the λ-chart one` +
      ` ${seen.lift8.live}. The missing ones are why Newton wanders instead of converging.`)
  }, 300_000)
})

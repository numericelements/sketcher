// ============================================================================
// WHAT THE LAB'S MÖBIUS DRAG ACTUALLY COSTS — two hypotheses with no mathematics in them.
//
//   H1  The lab restarts the drag from the SAME starting curve at 80, then 300, then 900
//       iterations, keeping whichever came out cleanest. lift8 never trips the 1e-9 break, so
//       every tick pays all three. Continuing instead of restarting should be cheaper for free.
//
//   H2  solveWith accepted a step when ONE combined residual norm decreased — a norm mixing the
//       defining rows (coefficient products, ~0 on the family) with the cursor and pin rows (world
//       units). The cursor dominates, so the test could not see the constraint drift.
//
// MEASURED, and the answer is that H2 is nearly all of it and H1 is almost nothing.
//
//   · lift8's first grab of 20% of the chord: 1280 iterations and ⟨C,C⟩ at 1.6e-7, against 73
//     iterations and 8.5e-13 with the corrector. Seventeen times less work, six orders better on
//     the number the slide displays — and it now clears 1e-9 inside the first budget, so the
//     escalation stops escalating and H1 has nothing left to save.
//   · H1 alone is worth 1280 → 900 at 20%, and is WORSE at 40% (536 → 900), because continuing
//     starts each pass from an already-moved state. Not the lever.
//   · The gesture nobody complained about was already cheap: twenty successive 2% drags cost ~8
//     iterations each. Only the FIRST big grab was ever expensive.
//
// The corrector is what H2 turned into. Gating ACCEPTANCE on the relative defining residual — the
// obvious form of H2 — freezes the drag at 0% tracking, which is recorded in solveWith.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { PRESETS } from '../../talks/ph-interpolation/poleLabPresets'
import { frameConformal } from '../specimenFraming'
import { dragControlPoint, controlPoints, degreeOf, type ConformalPHCurve } from '../conformalPHCurve'
import { conformalNullResidual } from '../poleReadout'
import { vnorm, vsub } from '../quaternion'

const OUT: string[] = []
const say = (...a: unknown[]): void => { OUT.push(a.join(' ')) }

const preset = (id: string): ConformalPHCurve =>
  frameConformal(PRESETS.find((p) => p.id === id)!.conformal!)

interface Tick { iters: number; tracked: number; nullOff: number; state: ConformalPHCurve }
type Vec = { x: number; y: number; z: number }
type Policy = (f: ConformalPHCurve, i: number, to: Vec, guard: boolean) => Tick

/** The lab's policy today: three independent solves from the SAME start, keep the cleanest. */
const restartPolicy: Policy = (from, index, to, guard) => {
  let best: ConformalPHCurve | null = null
  let bestNull = Infinity
  let iters = 0, tracked = 0
  for (const iterations of [80, 300, 900]) {
    const r = dragControlPoint(from, index, to, { pinEnds: true, iterations, constraintGuard: guard })
    iters += r.iterationsUsed ?? iterations
    const off = conformalNullResidual(r.state)
    if (off < bestNull) { bestNull = off; best = r.state; tracked = r.trackingError }
    if (off <= 1e-9) break
  }
  return { iters, tracked, nullOff: bestNull, state: best ?? from }
}

/** H1: continue from the previous attempt instead of starting over. */
const continuePolicy: Policy = (from, index, to, guard) => {
  let cur = from
  let iters = 0, tracked = 0
  for (const iterations of [80, 220, 600]) {
    const r = dragControlPoint(cur, index, to, { pinEnds: true, iterations, constraintGuard: guard })
    iters += r.iterationsUsed ?? iterations
    cur = r.state; tracked = r.trackingError
    if (conformalNullResidual(cur) <= 1e-9) break
  }
  return { iters, tracked, nullOff: conformalNullResidual(cur), state: cur }
}

const target = (st0: ConformalPHCurve, index: number, f: number): Vec => {
  const n = degreeOf(st0)
  const Q = controlPoints(st0)
  const chord = vnorm(vsub(Q[n], Q[0]))
  const s0 = Q[index]
  return { x: s0.x + f * chord * 0.6, y: s0.y + f * chord * 0.6, z: s0.z - f * chord * 0.5 }
}

/** Twenty successive small drags, the way a mouse delivers a gesture. */
function gesture(id: string, policy: Policy, guard: boolean, label: string): void {
  const st0 = preset(id)
  let cur = st0
  let totalIters = 0, totalWant = 0, totalShort = 0, worstNull = 0
  const t0 = Date.now()
  for (let k = 1; k <= 20; k++) {
    const to = target(st0, 3, 0.02 * k)
    const want = vnorm(vsub(to, controlPoints(cur)[3]))
    const r = policy(cur, 3, to, guard)
    cur = r.state
    totalIters += r.iters; totalWant += want; totalShort += r.tracked
    worstNull = Math.max(worstNull, r.nullOff)
  }
  say(`  ${label.padEnd(26)} iters ${String(totalIters).padStart(5)}   ` +
    `tracked ${(100 * (1 - totalShort / totalWant)).toFixed(1).padStart(6)}%   ` +
    `worst ⟨C,C⟩ ${worstNull.toExponential(1)}   ${Date.now() - t0}ms`)
}

/** ONE grab straight from the pristine preset — the case the escalation was built for. */
function oneGrab(id: string, f: number, policy: Policy, guard: boolean, label: string): Tick {
  const st0 = preset(id)
  const to = target(st0, 3, f)
  const want = vnorm(vsub(to, controlPoints(st0)[3]))
  const t0 = Date.now()
  const r = policy(st0, 3, to, guard)
  say(`  ${label.padEnd(26)} iters ${String(r.iters).padStart(5)}   ` +
    `tracked ${(100 * (1 - r.tracked / want)).toFixed(1).padStart(6)}%   ` +
    `      ⟨C,C⟩ ${r.nullOff.toExponential(1)}   ${Date.now() - t0}ms`)
  return r
}

const VARIANTS: [string, Policy, boolean][] = [
  ['restart, no corrector', restartPolicy, false],
  ['continue (H1)', continuePolicy, false],
  ['restart + corrector (H2)', restartPolicy, true],
  ['continue + corrector', continuePolicy, true],
]

/**
 * WHICH CONTROL POINT, measured — because "it goes off the model" depends entirely on which one.
 * One 20%-of-chord grab from the pristine lift8, the figure's own escalation:
 *
 *     point   iters   ⟨C,C⟩ after      corrector: iters   ⟨C,C⟩
 *       0      1280    3.6e-6  OFF         1280          1.2e-6  OFF
 *       1       353    4.5e-15  ok          380          1.2e-10  ok
 *       2      1232    2.6e-4  OFF         1280          2.2e-7  OFF
 *       3      1280    1.6e-7  OFF           64          5.1e-14  ok
 *       4      1280    9.3e-10  ok           80          5.2e-10  ok
 *
 * Point 1 is the one that behaves today, and point 0 — the obvious one to grab — is the worst.
 *
 * AND THE LAST TWO COLUMNS DISAGREE WITH THE SOLVER, which is the open item. On points 0 and 2 the
 * corrector drives its own membership measure (definingRelative, Bernstein) to 5e-11 and 8e-10 at
 * 100% tracking — and conformalNullResidual, the number the SLIDE prints, still reads 1.2e-6 and
 * 2.2e-7. Same identity ⟨C,C⟩ ≡ 0, two normalisations, four orders apart: the displayed one
 * converts to the POWER basis first, where cancellation shrinks the scale it divides by. Displayed
 * and enforced have to be the same quantity, so one of the two has to go.
 */
function byControlPoint(guard: boolean): void {
  const st0 = preset('lift8')
  const Q = controlPoints(st0)
  const chord = vnorm(vsub(Q[degreeOf(st0)], Q[0]))
  for (const index of [0, 1, 2, 3, 4]) {
    const s0 = Q[index]
    const to = { x: s0.x + 0.2 * chord * 0.6, y: s0.y + 0.2 * chord * 0.6, z: s0.z - 0.2 * chord * 0.5 }
    const want = vnorm(vsub(to, s0))
    let bestNull = Infinity; let iters = 0; let track = 0
    for (const iterations of [80, 300, 900]) {
      const r = dragControlPoint(st0, index, to, { pinEnds: true, iterations, constraintGuard: guard })
      iters += r.iterationsUsed ?? iterations
      const off = conformalNullResidual(r.state)
      if (off < bestNull) { bestNull = off; track = r.trackingError }
      if (off <= 1e-9) break
    }
    say(`  ${guard ? 'corrector' : 'today    '} point ${index}: iters ${String(iters).padStart(4)}` +
      `  tracked ${(100 * (1 - track / want)).toFixed(1).padStart(6)}%` +
      `  ⟨C,C⟩ ${bestNull.toExponential(1)}${bestNull > 1e-9 ? '  OFF THE MODEL' : ''}`)
  }
}

/**
 * IS IT THE PINNED ENDS? No — and the SECOND grab is what proves it.
 *
 * Same point, same pins, a BIGGER move (40% against the first grab's 20%), starting from where the
 * first one landed:
 *
 *     point 1, ends pinned      1st  353 iters      2nd    8 iters
 *     point 3, with corrector   1st   73 iters      2nd    9 iters
 *
 * Forty times cheaper with nothing changed but the starting curve. And freeing the ends does not
 * rescue the first grab — it mostly makes it worse, because the min-norm step then has the whole
 * polygon to spend on and gives up early:
 *
 *     today, point 0    pinned 1280 iters 100% tracked      free  350 iters  45% tracked, ⟨C,C⟩ 3.2e-2
 *     today, point 1    pinned  353 iters 100%, 4.5e-15     free   60 iters  16% tracked, ⟨C,C⟩ 1.2e-1
 *     today, point 2    pinned 1232 iters, 2.6e-4 OFF       free  782 iters 100%, 4.9e-12  ← helps
 *     corrector, pt 3   pinned   73 iters, 8.5e-13          free 1192 iters 100%, 3.7e-12
 *
 * So the expense is the STARTING STATE — the non-reduced lift, where every pole is doubled and the
 * linearisation is short three directions — and not the boundary conditions.
 */
describe('what the Möbius drag costs', () => {
  it('shows the cost is the starting curve, not the pinned ends', () => {
    const st0 = preset('lift8')
    const Q = controlPoints(st0)
    const chord = vnorm(vsub(Q[degreeOf(st0)], Q[0]))
    const run = (from: ConformalPHCurve, index: number, pinEnds: boolean, f: number) => {
      const base = controlPoints(from)[index]
      const to = { x: base.x + f * chord * 0.6, y: base.y + f * chord * 0.6, z: base.z - f * chord * 0.5 }
      const want = vnorm(vsub(to, base))
      let nullOff = Infinity; let iters = 0; let track = 0; let best = from
      for (const iterations of [80, 300, 900]) {
        const r = dragControlPoint(from, index, to, { pinEnds, iterations })
        iters += r.iterationsUsed ?? iterations
        const off = conformalNullResidual(r.state)
        if (off < nullOff) { nullOff = off; track = r.trackingError; best = r.state }
        if (off <= 1e-9) break
      }
      return { iters, tracked: 100 * (1 - track / want), nullOff, state: best }
    }
    const first = run(st0, 1, true, 0.2)
    const second = run(first.state, 1, true, 0.4)
    say(`  point 1, ends pinned: 1st ${first.iters} iters, 2nd ${second.iters} iters (a BIGGER move)`)
    const free = run(st0, 1, false, 0.2)
    say(`  point 1, ends free:   1st ${free.iters} iters, tracked ${free.tracked.toFixed(0)}%,` +
      ` ⟨C,C⟩ ${free.nullOff.toExponential(1)}`)
    for (const line of OUT) console.log(line)
    OUT.length = 0

    expect(second.iters * 10, 'the second grab is an order cheaper — same pins, bigger move')
      .toBeLessThan(first.iters)
    expect(free.tracked, 'and freeing the ends does not rescue the first grab, it abandons it')
      .toBeLessThan(50)
  }, 900_000)

  it('says which control point leaves the model on the first grab', () => {
    say('  lift8 — ONE 20% grab, per control point:')
    byControlPoint(false)
    byControlPoint(true)
    for (const line of OUT) console.log(line)
    OUT.length = 0

    const grab = (index: number, guard: boolean): number => {
      const st0 = preset('lift8')
      const Q = controlPoints(st0)
      const chord = vnorm(vsub(Q[degreeOf(st0)], Q[0]))
      const s0 = Q[index]
      const to = { x: s0.x + 0.2 * chord * 0.6, y: s0.y + 0.2 * chord * 0.6, z: s0.z - 0.2 * chord * 0.5 }
      let bestNull = Infinity
      for (const iterations of [80, 300, 900]) {
        const r = dragControlPoint(st0, index, to, { pinEnds: true, iterations, constraintGuard: guard })
        bestNull = Math.min(bestNull, conformalNullResidual(r.state))
        if (bestNull <= 1e-9) break
      }
      return bestNull
    }
    expect(grab(1, false), 'point 1 is the one that stays on the model today').toBeLessThan(1e-9)
    expect(grab(0, false), 'the END point does not, which is what a user hits first')
      .toBeGreaterThan(1e-9)
    expect(grab(2, true), 'the corrector helps point 2 — and now provably onto the model')
      .toBeLessThan(grab(2, false))
    // Was the open item: the corrector satisfied its own measure while the figure's number still
    // said "off the model". Measuring the pointwise violation on [0,1] closed it — 5.1e-12.
    expect(grab(2, true), 'and the two measures now agree').toBeLessThan(1e-9)
  }, 900_000)

  it('measures the gesture and the first grab, per variant', () => {
    for (const id of ['lift8g', 'lift8']) {
      say(`  ${id} — twenty successive drags of control point 3, growing to 40% of the chord:`)
      for (const [label, p, g] of VARIANTS) gesture(id, p, g, label)
      say('')
      for (const f of [0.2, 0.4]) {
        say(`  ${id} — ONE grab of ${(100 * f).toFixed(0)}% of the chord, from the pristine preset:`)
        for (const [label, p, g] of VARIANTS) oneGrab(id, f, p, g, label)
        say('')
      }
    }
    for (const line of OUT) console.log(line)

    // The pinned claim: the corrector puts lift8's first grab on the model inside one budget.
    const before = oneGrab('lift8', 0.2, restartPolicy, false, '  [pin] no corrector')
    const after = oneGrab('lift8', 0.2, restartPolicy, true, '  [pin] corrector')
    expect(before.nullOff, 'without the corrector the first grab never reaches the model')
      .toBeGreaterThan(1e-9)
    expect(after.nullOff, 'with it, the same grab lands on the model').toBeLessThan(1e-9)
    expect(after.iters, 'and inside the first budget').toBeLessThan(before.iters / 4)
    expect(after.tracked / before.tracked, 'without giving up any tracking').toBeLessThan(10)
  }, 1_800_000)
})

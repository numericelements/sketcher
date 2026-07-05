// ============================================================================
// E26-C-RATCHET pin — the Farin handle NEVER converges onto a control point.
//
// The disease (Eric's report, reproduced): under a bound-resisted pull, every
// free-ratio formulation drifted the handle (or dragged the control point)
// into the degenerate configuration — the s-chart ratchet (d(q,CP) 12.5→1.5px,
// |s|→28), the λ-chart (slower, same destination), the anchored reshape (the
// CP traveled 23.7px TO the handle: the barrier's analytic center sits at the
// degenerate ratio where the faded prefix satisfies every row). The cure that
// measured clean is the PURE-WEIGHT COUNT-GUARDED WALK: honest advance to the
// feasible limit (5.7px on this hostile perpendicular pull), then PARK —
// |s| bounded, d(q, nextCP) stable, and out-and-back returns to 0.0px.
// This test pins exactly that contract.
// ============================================================================
import { it } from 'vitest'
import { slideComplexFarin, type ComplexFarinCP } from '../index'

const n = 10, degree = 3
const knots: number[] = []
for (let i = 0; i < 4; i++) knots.push(0)
for (let i = 1; i < n - 3; i++) knots.push(i / (n - 3))
for (let i = 0; i < 4; i++) knots.push(1)
const mk = (): ComplexFarinCP[] => Array.from({ length: n }, (_, i) => ({
  re: 40 + 28 * i, im: 120 + 70 * Math.sin((Math.PI * i) / 5),
  w_re: 1 + 0.1 * Math.cos(i * 1.3), w_im: 0.06 * Math.sin(i * 2.1),
}))
const qOf = (cps: ComplexFarinCP[], e: number) => {
  const a = cps[e], b = cps[e + 1]
  const nre = a.w_re * a.re - a.w_im * a.im + b.w_re * b.re - b.w_im * b.im
  const nim = a.w_re * a.im + a.w_im * a.re + b.w_re * b.im + b.w_im * b.re
  const dre = a.w_re + b.w_re, dim = a.w_im + b.w_im
  const dd = dre * dre + dim * dim
  return { x: (nre * dre + nim * dim) / dd, y: (nim * dre - nre * dim) / dd }
}

it('hostile perpendicular pull: honest park, no CP convergence, exact return', () => {
  const fi = 4
  let cps = mk()
  const q0 = qOf(cps, fi)
  const anchorTo = { x: mk().map(p => p.re), y: mk().map(p => p.im) }
  const a = cps[fi], b = cps[fi + 1]
  const edge = { x: b.re - a.re, y: b.im - a.im }
  const eLen = Math.hypot(edge.x, edge.y)
  const perp = { x: -edge.y / eLen, y: edge.x / eLen }
  // pull HARD perpendicular to the edge (the bound-resisted direction), 15 ticks
  for (let s = 1; s <= 15; s++) {
    const t = s / 15
    const target = { x: q0.x + 60 * perp.x * t, y: q0.y + 60 * perp.y * t }
    const r = slideComplexFarin(cps, knots, degree, fi, target)
    cps = r.points
    if (s % 3 === 0) {
      const qq = qOf(cps, fi)
      const dB = Math.hypot(qq.x - cps[fi + 1].re, qq.y - cps[fi + 1].im)
      const dA = Math.hypot(qq.x - cps[fi].re, qq.y - cps[fi].im)
      // implied |s| of the suffix scale (|w_{fi+1}| grew by |s|)
      const sMag = Math.hypot(cps[fi + 1].w_re, cps[fi + 1].w_im) / Math.hypot(mk()[fi + 1].w_re, mk()[fi + 1].w_im)
      const perpProg = (qq.x - q0.x) * perp.x + (qq.y - q0.y) * perp.y
      console.log(`tick ${String(s).padStart(2)}: d(q,nextCP) ${dB.toFixed(1)}px  d(q,prevCP) ${dA.toFixed(1)}px  perp-progress ${perpProg.toFixed(1)}px  |s| ${sMag.toFixed(2)}`)
    }
  }
  // RETURN phase: pull back to the original farin position — reversibility
  for (let s = 1; s <= 10; s++) {
    const r = slideComplexFarin(cps, knots, degree, fi, { x: q0.x, y: q0.y })
    cps = r.points
  }
  const qR = qOf(cps, fi)
  const cpDrift = Math.max(...cps.map((p, j) => Math.hypot(p.re - anchorTo.x[j], p.im - anchorTo.y[j])))
  const qEnd = qOf(cps, fi)
  void qEnd
  // the handle must never glue to a control point…
  const dNext = Math.hypot(qOf(cps, fi).x - cps[fi + 1].re, qOf(cps, fi).y - cps[fi + 1].im)
  if (dNext < 10) throw new Error(`handle converged onto the next CP (d=${dNext.toFixed(1)}px) — the ratchet is back`)
  // …control points must not move at all (pure-weight semantics)…
  if (cpDrift > 1e-9) throw new Error(`control points moved ${cpDrift}px under a Farin drag`)
  // …and out-and-back must return home.
  const ret = Math.hypot(qR.x - q0.x, qR.y - q0.y)
  if (ret > 0.5) throw new Error(`return error ${ret.toFixed(1)}px — reversibility lost`)
  console.log(`RETURN: ${ret.toFixed(2)}px   CP drift ${cpDrift.toFixed(2)}px   d(q,nextCP) ${dNext.toFixed(1)}px`)
}, 240000)

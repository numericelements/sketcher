// ============================================================================
// THE PLANE FIRST — a complex-rational PH cubic, and why Möbius costs nothing.
//
// Slide 4's machinery, plus one draggable point. The whole argument in 2D is two
// lines, and both are visible on screen:
//
//   z = P/Q with P, Q complex cubics. Möbius acts LINEARLY on the pair:
//
//       z ↦ (az+b)/(cz+d)      is      (P, Q) ↦ (aP + bQ, cP + dQ)
//
//   and the PH condition is that the WRONSKIAN M = P′Q − PQ′ is a perfect square.
//   The Wronskian is alternating bilinear, so M ↦ (ad − bc)·M — and every complex
//   number has a square root, so (√det·A)² is still a perfect square. PH survives
//   Möbius, proved in one line. In R³ the same fact needed the whole O(4,1) model.
//
// THE MAP DRAWN HERE is inversion in the circle of radius R about S:
//
//       μ(z) = S + R²/(z − S)        P = S(z − S) + R²,   Q = z − S
//
// so M = −R²·z′ = −R²A² = (iRA)², a perfect square with NO condition to impose and
// NOTHING TO SOLVE. Control points map pointwise, Zₖ = μ(Pₖ), and the COMPLEX
// weights come out as wₖ = Pₖ − S. That is the whole construction: closed form, so
// this figure cannot stall — the failure mode that dogged the degree-6 sliders.
//
// WHY THE FARIN POINTS ARE THE POINT. With real weights a Farin point sits ON its
// polygon edge. These weights are COMPLEX, and
//
//       qₖ = (wₖZₖ + wₖ₊₁Zₖ₊₁)/(wₖ + wₖ₊₁) = S + 2R²/(wₖ + wₖ₊₁)
//
// leaves the edge. That departure IS the extra freedom a complex-rational curve has
// over a real-weighted one, made visible: drag S and watch the beads swing off the
// chords. When S is far away μ is nearly a similarity, the weights nearly agree, and
// the beads settle back onto the midpoints — the polynomial curve, wearing a coat.
//
// AND S IS THE STRAIGHTENING CENTRE, the same object the R³ work arrived at from the
// other end: invert about it and the rational curve becomes polynomial again. Here
// you can put your finger on it.
//
// The one thing to avoid is S landing ON the curve, where Q vanishes: the image runs
// through infinity. That is not guarded away — the min|Q| readout goes red and the
// curve visibly escapes, which is more honest than a clamp and is the same pole the
// (w, q) algebra says an irreducible member never has on the real line.
// ============================================================================
import { useState } from 'react'
import { type Complex, cadd, cdiv, cnorm, csub } from '../../core/complex'
import { phCubicFromP1, curveAt, type PHCubicSolution } from '../../core/phCubic'
import FigureFrame from '../framework/FigureFrame'
import { FIG, curveStroke, ControlPolygon, DataPoint, PinnedPoint } from '../framework/figureStyle'
import type { Viewport } from '../framework/useViewport'

const P0: Complex = { re: -1.9, im: -0.6 }
const P3: Complex = { re: 1.1, im: -0.6 }
const START_P1: Complex = { re: -1.2, im: 1.0 }
const START_S: Complex = { re: 0.15, im: 1.85 }
const R = 1.5

const WORLD = { x0: -3.4, x1: 3.4, y0: -2.0, y1: 3.0 }
const BASE = { width: 900, height: 420 }

/** μ(z) = S + R²/(z − S) — inversion in the circle of radius R about S. */
const mu = (z: Complex, s: Complex): Complex =>
  cadd(s, cdiv({ re: R * R, im: 0 }, csub(z, s)))

const pathOf = (vp: Viewport, at: (t: number) => Complex, n = 240): string => {
  let d = ''
  let broke = true
  for (let i = 0; i <= n; i++) {
    const p = at(i / n)
    // A pole sends the image off to infinity; lift the pen rather than draw a
    // spurious straight line across the frame.
    if (!Number.isFinite(p.re) || !Number.isFinite(p.im) || cnorm(p) > 1e4) { broke = true; continue }
    const s = vp.toScreen({ x: p.re, y: p.im })
    d += `${broke ? 'M' : 'L'} ${s.x.toFixed(4)} ${s.y.toFixed(4)} `
    broke = false
  }
  return d
}

/** Pick the branch whose r is nearest a reference — continuous tracking, as on slide 4. */
function nearestBranch(sols: PHCubicSolution[], toR: Complex | null): number {
  if (!toR || sols.length === 0) return 0
  let best = 0
  let bestD = Infinity
  sols.forEach((s, i) => {
    const d = cnorm(csub(s.r, toR))
    if (d < bestD) { bestD = d; best = i }
  })
  return best
}

export default function ComplexRationalPHFigure() {
  const [handle, setHandle] = useState(START_P1)
  const [centre, setCentre] = useState(START_S)
  const [branchR, setBranchR] = useState<Complex | null>(null)
  /** 'p1' = the underlying cubic's shape, 's' = the inversion centre. */
  const [dragging, setDragging] = useState<'p1' | 's' | null>(null)

  const solutions = phCubicFromP1(P0, P3, handle)
  const sel = solutions[nearestBranch(solutions, branchR)]

  const polyAt = (t: number): Complex =>
    sel ? curveAt(sel.generator, sel.p0, t) : { re: 0, im: 0 }
  const imageAt = (t: number): Complex => mu(polyAt(t), centre)

  const cps = sel?.controlPoints ?? []
  /** The COMPLEX weights of the image: wₖ = Pₖ − S. */
  const weights = cps.map((p) => csub(p, centre))
  const imageCps = cps.map((p) => mu(p, centre))
  /** qₖ = S + 2R²/(wₖ + wₖ₊₁) — off the edge exactly when the weights differ in phase. */
  const farin = weights.slice(0, -1).map((w, k) =>
    cadd(centre, cdiv({ re: 2 * R * R, im: 0 }, cadd(w, weights[k + 1]))),
  )

  // --- the honest checks -------------------------------------------------------
  // |μ(z)′| must be h/w with h = |A|² of degree 2 and w = QQ̄ of degree 6. Measure the
  // speed by central difference and compare against R²·|A|²/|Q|², which is what the
  // algebra predicts. Reported, not assumed.
  let phDefect = 0
  let minQ = Infinity
  if (sel) {
    const eps = 1e-5
    for (let i = 1; i < 24; i++) {
      const t = i / 24
      const q = cnorm(csub(polyAt(t), centre))
      minQ = Math.min(minQ, q)
      const measured = cnorm(csub(imageAt(t + eps), imageAt(t - eps))) / (2 * eps)
      const predicted = (R * R * cnorm(csub(polyAt(t + eps), polyAt(t - eps))) / (2 * eps)) / (q * q)
      phDefect = Math.max(phDefect, Math.abs(measured - predicted) / Math.max(predicted, 1e-300))
    }
  }
  const wMags = weights.map(cnorm)
  const spread = Math.max(...wMags) / Math.max(Math.min(...wMags), 1e-300)
  /** How far the beads have left their chords, relative to the polygon's size. */
  const extent = Math.max(...imageCps.map((p, i) => (i ? cnorm(csub(p, imageCps[i - 1])) : 0)), 1e-9)
  const offEdge = Math.max(
    ...farin.map((q, k) => {
      const a = imageCps[k], b = imageCps[k + 1]
      const ab = csub(b, a), aq = csub(q, a)
      const L = cnorm(ab) || 1
      return Math.abs((ab.re * aq.im - ab.im * aq.re) / L) / extent
    }),
    0,
  )

  const onMove = (vp: Viewport) => (e: React.PointerEvent) => {
    if (!dragging) return
    const w = vp.toWorld(e)
    const target: Complex = { re: w.x, im: w.y }
    if (dragging === 's') { setCentre(target); return }
    const sols = phCubicFromP1(P0, P3, target)
    if (sols.length > 0) setBranchR(sols[nearestBranch(sols, branchR)].r)
    setHandle(target)
  }

  const grab = (what: 'p1' | 's') => (e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    setDragging(what)
  }

  const reset = () => {
    setHandle(START_P1)
    setCentre(START_S)
    setBranchR(null)
  }

  return (
    <FigureFrame
      world={WORLD}
      base={BASE}
      notation={[
        '(P, Q) ↦ (aP + bQ, cP + dQ)',
        'M = P′Q − PQ′ ↦ (ad − bc)·M',
        'a square stays a square ⇒ PH',
      ]}
      readouts={[
        { label: 'weight spread', value: spread.toFixed(3) },
        { label: 'beads off edge', value: offEdge.toFixed(3) },
        {
          label: 'min |Q|',
          value: Number.isFinite(minQ) ? minQ.toFixed(3) : '—',
          tone: minQ < 0.2 ? ('warn' as const) : ('plain' as const),
        },
        { label: '‖z′‖ = h/w', value: phDefect.toExponential(1), tone: 'ok' as const },
      ]}
      controls={
        <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
          reset
        </button>
      }
      caption={
        <>
          <b>The plane, first.</b> The grey curve is a polynomial PH cubic — slide 4's. Invert it about{' '}
          <b>S</b> and you get a <i>complex-rational</i> cubic that is still exactly PH, because Möbius acts
          linearly on the pair (P, Q) and the Wronskian only picks up a determinant. Nothing is solved here:
          the control points map pointwise and the complex weights are wₖ = Pₖ − S.{' '}
          <span className="text-slate-400">
            Drag S to bend; drag P₁ to reshape the cubic underneath. The beads are the Farin points — with
            complex weights they leave their edges, and that departure is the freedom you gain.
          </span>
        </>
      }
    >
      {(vp) => (
        <g onPointerMove={onMove(vp)} onPointerUp={() => setDragging(null)}>
          <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="transparent" />

          {/* the circle of inversion — the picture of what S is doing */}
          <circle
            cx={vp.toScreen({ x: centre.re, y: centre.im }).x}
            cy={vp.toScreen({ x: centre.re, y: centre.im }).y}
            r={Math.abs(vp.toScreen({ x: centre.re + R, y: centre.im }).x - vp.toScreen({ x: centre.re, y: centre.im }).x)}
            fill="none"
            stroke={FIG.color.border}
            strokeWidth={vp.px(1.5)}
            strokeDasharray={`${vp.px(5)} ${vp.px(5)}`}
          />

          {sel && (
            <>
              {/* the polynomial cubic it came from, muted */}
              <path d={pathOf(vp, polyAt)} {...curveStroke(vp, false)} />
              <ControlPolygon vp={vp} cps={cps} />

              {/* the image: still PH, now rational */}
              <ControlPolygon vp={vp} cps={imageCps} />
              <path d={pathOf(vp, imageAt)} {...curveStroke(vp, true)} />

              {/* Farin beads, with a hair line to the chord they have left */}
              {farin.map((q, k) => {
                const a = vp.toScreen({ x: imageCps[k].re, y: imageCps[k].im })
                const b = vp.toScreen({ x: imageCps[k + 1].re, y: imageCps[k + 1].im })
                const s = vp.toScreen({ x: q.re, y: q.im })
                if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) return null
                return (
                  <g key={k}>
                    <line
                      x1={(a.x + b.x) / 2} y1={(a.y + b.y) / 2} x2={s.x} y2={s.y}
                      stroke={FIG.color.derived}
                      strokeWidth={vp.px(1)}
                      strokeDasharray={`${vp.px(3)} ${vp.px(3)}`}
                    />
                    <circle cx={s.x} cy={s.y} r={vp.px(FIG.size.point * 0.42)} fill={FIG.color.derived} />
                  </g>
                )
              })}

              {imageCps.map((p, i) =>
                Number.isFinite(p.re) && Number.isFinite(p.im) ? (
                  <PinnedPoint key={`i${i}`} vp={vp} p={p} label={`Z${'₀₁₂₃'[i]}`} />
                ) : null,
              )}
              <PinnedPoint vp={vp} p={cps[0]} label="P₀" />
              <PinnedPoint vp={vp} p={cps[3]} label="P₃" />
              <DataPoint
                vp={vp}
                p={cps[1]}
                label="P₁"
                dragging={dragging === 'p1'}
                onPointerDown={grab('p1')}
              />
            </>
          )}

          <DataPoint
            vp={vp}
            p={centre}
            label="S"
            dragging={dragging === 's'}
            onPointerDown={grab('s')}
          />

          {solutions.length === 0 && (
            <text
              x={vp.base.width / 2} y={vp.base.height / 2}
              textAnchor="middle" fontSize={vp.px(FIG.size.label)} fill={FIG.color.label}
            >
              no PH cubic for this P₁ — move it
            </text>
          )}
        </g>
      )}
    </FigureFrame>
  )
}

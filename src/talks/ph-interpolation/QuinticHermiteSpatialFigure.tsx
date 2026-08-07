// ============================================================================
// SLIDE 8 — the spatial twin of slide 5. Four discrete answers become a torus.
//
// Slide 5: planar PH quintic, C¹ Hermite data, FOUR interpolants, always. Make the
// curve spatial and change nothing else, and the count becomes a two-parameter
// family. That is the deck's central move, said at the same degree with the same
// gesture, so the only thing that differs is the dimension of the answer.
//
// THE FOUR BLUE POINTS ARE THE DATA. Not an analogy — an identity:
//
//     P₁ = pᵢ + dᵢ/5        ⟺      dᵢ = 5(P₁ − P₀)
//     P₄ = p_f − d_f/5      ⟺      d_f = 5(P₅ − P₄)
//
// so dragging P₀,P₁,P₄,P₅ IS prescribing C¹ Hermite data, with no tangent handles to
// explain. Twelve conditions, drawn. 14 − 12 = 2, and the two grey points ride the
// leftover torus — reachable only through the dials, because nothing in the data
// chooses them.
//
// TWO PARAMETERISATIONS, AND THE TOGGLE IS THE LESSON
//
//   φ₀, φ₂   one dial per END. The honest torus: [0,2π)², period 2π each, no
//            identifications. But the invariant is DIAGONAL — move both together and
//            the length holds.
//   α, β     α = ½(φ₀+φ₂), β = φ₂−φ₀. The change of basis has determinant 1 but ½
//            entries, so it is NOT in GL(2,ℤ): it does not preserve the period
//            lattice. α has period 2π, β has period 4π, plus the gluing
//            (α+π, β+2π) ≡ (α,β) — the rectangle DOUBLE-COVERS the torus. Ugly
//            domain. But the invariant is now AXIS-ALIGNED: α does nothing to L.
//
// You shear the coordinates to make the conserved quantity a coordinate, and you pay
// in the shape of the domain. That is diagonalisation, and the toggle shows the trade
// instead of asserting a choice. Switching is a pure relabel, so the curve never
// moves when you flip — which is what makes the point land.
//
// WHY α CANNOT CHANGE THE LENGTH, in one sentence for the room: α is the closure
// spinor's own gauge angle in disguise. Moving α, then undoing the global gauge,
// leaves A₀ and A₂ EXACTLY fixed and spins B around its solution circle (verified to
// 1e-16) — and |B|² = |d| is forced by the sandwich, with d depending on β alone. The
// α-dial is slide 6's fiber, one link along the chain.
//
// GAUGE TRANSPORT IS LOAD-BEARING HERE. The angles are measured from a representative
// built as normalise(x̂ + δ̂), which degenerates when a tangent points at −x̂. Drag a
// blue point through that direction without transporting the reference and a fixed
// (α,β) starts naming a different curve — the picture jumps by half the figure
// (pinned as a FAILING-without-it test in core). So the references are carried from
// frame to frame and rotated to the nearest gauge.
//
// FREE mode releases everything: 14 DOF against 3 conditions, eleven spare, and
// minimum-norm spends them. Coming back to strict reads the data off the polygon and
// recovers (α,β) with anglesOf — which must subtract φ₁ first, since a dragged curve
// carries an arbitrary global gauge.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks
// and gestures. core/phSpatialQuintic and core/phSpatialFreeDragN carry the tests.
// ============================================================================
import { useMemo, useRef, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vnorm, vsub } from '../../core/quaternion'
import {
  type GaugeRefs,
  type SpatialHermiteData,
  type SpatialPHQuintic,
  anglesOf,
  arcLength,
  controlPoints,
  curveAt,
  gaugeRefsFor,
  hodographAt,
  interpolateSpatialQuintic,
  speedAt,
} from '../../core/phSpatialQuintic'
import {
  type SpatialPHCurve,
  controlPoints as freeControlPoints,
  dragSpatialFree,
} from '../../core/phSpatialFreeDragN'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const TAU = 2 * Math.PI

/** The four points that ARE the data: P₀, P₁, P₄, P₅. */
interface Ends {
  readonly p0: Vec3
  readonly p1: Vec3
  readonly p4: Vec3
  readonly p5: Vec3
}

const START_ENDS: Ends = {
  p0: { x: -1.0, y: -0.3, z: -0.15 },
  p1: { x: -0.55, y: 0.15, z: 0.25 },
  p4: { x: 0.5, y: 0.45, z: -0.3 },
  p5: { x: 1.0, y: 0.05, z: 0.2 },
}
const START = { alpha: 0.9, beta: 1.7 }
const ELLIPSE_SAMPLES = 84
const GHOSTS = 6

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

/** The identity that makes the four blue points the Hermite data. */
const dataOf = (e: Ends): SpatialHermiteData => ({
  pi: e.p0,
  pf: e.p5,
  di: { x: 5 * (e.p1.x - e.p0.x), y: 5 * (e.p1.y - e.p0.y), z: 5 * (e.p1.z - e.p0.z) },
  df: { x: 5 * (e.p5.x - e.p4.x), y: 5 * (e.p5.y - e.p4.y), z: 5 * (e.p5.z - e.p4.z) },
})

const endsOf = (cps: readonly Vec3[]): Ends => ({ p0: cps[0], p1: cps[1], p4: cps[4], p5: cps[5] })

const BOUNDS = (() => {
  const data = dataOf(START_ENDS)
  const all: Vec3[] = []
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 10; j++) {
      const q = interpolateSpatialQuintic(data, (TAU * i) / 20, (2 * TAU * j) / 10)
      if (q) all.push(...controlPoints(q))
    }
  }
  const pad = 0.3
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y), zs = all.map((p) => p.z)
  return {
    min: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.min(...zs) - pad] as [number, number, number],
    max: [Math.max(...xs) + pad, Math.max(...ys) + pad, Math.max(...zs) + pad] as [number, number, number],
  }
})()

type Mode = 'strict' | 'free'
type Params = 'ab' | 'phi'

const wrap = (x: number, period: number): number => ((x % period) + period) % period

export default function QuinticHermiteSpatialFigure() {
  const [ends, setEnds] = useState<Ends>(START_ENDS)
  const [alpha, setAlpha] = useState(START.alpha)
  const [beta, setBeta] = useState(START.beta)
  const [params, setParams] = useState<Params>('ab')
  const [mode, setMode] = useState<Mode>('strict')
  const [freeState, setFreeState] = useState<SpatialPHCurve | null>(null)
  const [freeInfo, setFreeInfo] = useState({ tracking: 0, disturbance: 0 })
  const [sliding, setSliding] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const data = useMemo(() => dataOf(ends), [ends])

  /**
   * Carried across frames and rotated to the nearest gauge, so that moving a datum
   * relabels nothing. Without this the curve flips when a tangent crosses −x̂.
   */
  const refsRef = useRef<GaugeRefs | null>(null)
  const refs = useMemo(() => {
    const next = gaugeRefsFor(data, refsRef.current)
    if (next) refsRef.current = next
    return next ?? refsRef.current
  }, [data])

  const strictCurve = useMemo(
    () => interpolateSpatialQuintic(data, alpha, beta, refs),
    [data, alpha, beta, refs],
  )
  const lastGood = useRef<SpatialPHQuintic | null>(strictCurve)
  if (strictCurve) lastGood.current = strictCurve

  const quintic: SpatialPHQuintic | null =
    mode === 'free' && freeState
      ? { A0: freeState.A[0], A1: freeState.A[1], A2: freeState.A[2], p0: freeState.p0 }
      : (strictCurve ?? lastGood.current)

  const cps = useMemo(() => (quintic ? controlPoints(quintic) : []), [quintic])

  /** The two α-ellipses — shown only while a dial is being turned. */
  const ellipses = useMemo(() => {
    if (!sliding || mode !== 'strict') return null
    const e2: [number, number, number][] = []
    const e3: [number, number, number][] = []
    for (let k = 0; k <= ELLIPSE_SAMPLES; k++) {
      const q = interpolateSpatialQuintic(data, (TAU * k) / ELLIPSE_SAMPLES, beta, refs)
      if (!q) continue
      const c = controlPoints(q)
      e2.push(tri(c[2]))
      e3.push(tri(c[3]))
    }
    return { e2, e3 }
  }, [sliding, mode, data, beta, refs])

  /**
   * Ghosts along the CURRENT α-circle, so every one of them has the same arc length
   * as the live curve. The family, drawn — and the isometry, drawn with it.
   */
  const ghosts = useMemo(() => {
    if (mode !== 'strict') return []
    const out: [number, number, number][][] = []
    for (let g = 0; g < GHOSTS; g++) {
      const a = wrap(alpha + (TAU * (g + 1)) / (GHOSTS + 1), TAU)
      const q = interpolateSpatialQuintic(data, a, beta, refs)
      if (!q) continue
      out.push(Array.from({ length: 41 }, (_, i) => tri(curveAt(q, i / 40))))
    }
    return out
  }, [mode, data, alpha, beta, refs])

  const curvePts = useMemo(
    () => (quintic ? Array.from({ length: 81 }, (_, i) => tri(curveAt(quintic, i / 80))) : []),
    [quintic],
  )

  const phError = useMemo(() => {
    if (!quintic) return 0
    let worst = 0
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      worst = Math.max(worst, Math.abs(vnorm(hodographAt(quintic, t)) - speedAt(quintic, t)))
    }
    return worst
  }, [quintic])

  /** How far the grey points roam over the whole torus — the family's size. */
  const spread = useMemo(() => {
    let m = 0
    const base = interpolateSpatialQuintic(data, 0, 0, refs)
    if (!base) return 0
    const b = controlPoints(base)
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 12; j++) {
        const q = interpolateSpatialQuintic(data, (TAU * i) / 12, (2 * TAU * j) / 12, refs)
        if (!q) continue
        const c = controlPoints(q)
        m = Math.max(m, vnorm(vsub(c[2], b[2])), vnorm(vsub(c[3], b[3])))
      }
    }
    return m
  }, [data, refs])

  const phi0 = alpha - beta / 2
  const phi2 = alpha + beta / 2

  const setPhi = (which: 0 | 2, value: number): void => {
    const p0 = which === 0 ? value : phi0
    const p2 = which === 2 ? value : phi2
    setAlpha((p0 + p2) / 2)
    setBeta(p2 - p0)
  }

  // --- mode handoff, continuous both ways ----------------------------------------
  const toFree = (): void => {
    if (quintic) setFreeState({ A: [quintic.A0, quintic.A1, quintic.A2], p0: quintic.p0 })
    setFreeInfo({ tracking: 0, disturbance: 0 })
    setMode('free')
  }
  const toStrict = (): void => {
    if (freeState) {
      const c = freeControlPoints(freeState)
      const nextEnds = endsOf(c)
      const nextData = dataOf(nextEnds)
      const nextRefs = gaugeRefsFor(nextData, refsRef.current)
      if (nextRefs) {
        refsRef.current = nextRefs
        const got = anglesOf(
          { A0: freeState.A[0], A1: freeState.A[1], A2: freeState.A[2], p0: freeState.p0 },
          nextRefs,
        )
        setAlpha(got.alpha)
        setBeta(got.beta)
      }
      setEnds(nextEnds)
    }
    setMode('strict')
  }

  const reset = (): void => {
    refsRef.current = null
    setEnds(START_ENDS)
    setAlpha(START.alpha)
    setBeta(START.beta)
    setMode('strict')
    setFreeState(null)
    setFreeInfo({ tracking: 0, disturbance: 0 })
  }

  const slide = {
    onPointerDown: () => setSliding(true),
    onPointerUp: () => setSliding(false),
    onBlur: () => setSliding(false),
  }

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 420 }}
      notation={
        mode === 'strict'
          ? ['r′ = A i A*, A quadratic', '14 DOF − 12 conditions = 2', 'four answers became a torus']
          : ['r′ = A i A*', '14 DOF − 3 dragged = 11 spare', 'min Σ |Pⱼ − Pⱼᵒˡᵈ|²']
      }
      readouts={
        mode === 'strict'
          ? [
              { label: 'spare DOF', value: '2' },
              ...(params === 'ab'
                ? [
                    { label: 'α', value: `${(wrap(alpha, TAU) / Math.PI).toFixed(3)}π` },
                    { label: 'β', value: `${(wrap(beta, 2 * TAU) / Math.PI).toFixed(3)}π` },
                  ]
                : [
                    { label: 'φ₀', value: `${(wrap(phi0, TAU) / Math.PI).toFixed(3)}π` },
                    { label: 'φ₂', value: `${(wrap(phi2, TAU) / Math.PI).toFixed(3)}π` },
                  ]),
              { label: 'P₂,P₃ roam', value: spread.toFixed(3) },
              {
                label: 'arc len',
                value: `${quintic ? arcLength(quintic).toFixed(5) : '—'} (β only)`,
                tone: 'ok' as const,
              },
              { label: '|r′|−σ', value: phError.toExponential(1), tone: 'ok' as const },
            ]
          : [
              { label: 'spare DOF', value: '11' },
              { label: 'cursor error', value: freeInfo.tracking.toFixed(4) },
              { label: 'others moved', value: freeInfo.disturbance.toFixed(4) },
              { label: '|r′|−σ', value: phError.toExponential(1), tone: 'ok' as const },
            ]
      }
      controls={
        <span className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex rounded overflow-hidden border border-slate-300">
            <button
              onClick={toStrict}
              className={`px-2 py-[0.15em] ${mode === 'strict' ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
            >
              strict
            </button>
            <button
              onClick={toFree}
              className={`px-2 py-[0.15em] ${mode === 'free' ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
            >
              free
            </button>
          </span>

          {mode === 'strict' && (
            <>
              {params === 'ab' ? (
                <>
                  <label className="flex items-center gap-1">
                    <span className="text-slate-400">α</span>
                    <input
                      type="range" min={0} max={TAU} step={TAU / 720}
                      value={wrap(alpha, TAU)}
                      onChange={(e) => setAlpha(Number(e.target.value))}
                      {...slide}
                      className="w-32"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="text-slate-400">β</span>
                    <input
                      type="range" min={0} max={2 * TAU} step={TAU / 720}
                      value={wrap(beta, 2 * TAU)}
                      onChange={(e) => setBeta(Number(e.target.value))}
                      {...slide}
                      className="w-32"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="flex items-center gap-1">
                    <span className="text-slate-400">φ₀</span>
                    <input
                      type="range" min={0} max={TAU} step={TAU / 720}
                      value={wrap(phi0, TAU)}
                      onChange={(e) => setPhi(0, Number(e.target.value))}
                      {...slide}
                      className="w-32"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="text-slate-400">φ₂</span>
                    <input
                      type="range" min={0} max={TAU} step={TAU / 720}
                      value={wrap(phi2, TAU)}
                      onChange={(e) => setPhi(2, Number(e.target.value))}
                      {...slide}
                      className="w-32"
                    />
                  </label>
                </>
              )}
              <button
                onClick={() => setParams(params === 'ab' ? 'phi' : 'ab')}
                className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
                title="the same torus in two coordinate systems"
              >
                {params === 'ab' ? 'α,β' : 'φ₀,φ₂'}
              </button>
            </>
          )}

          <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
            reset
          </button>
        </span>
      }
      caption={
        mode === 'strict' ? (
          <>
            <b>In the plane this data had four answers. In space it has a torus of them.</b> The four
            blue points <i>are</i> the C¹ Hermite data — P₁ = pᵢ + dᵢ/5 and P₄ = p_f − d_f/5 — so
            dragging them prescribes it, and fourteen degrees of freedom against twelve conditions
            leaves two. The grey points ride what is left, reachable only through the dials.{' '}
            <b>Arc length depends on β alone</b>: turn α from end to end and the readout does not move
            a digit, because α only spins the closure spinor around a circle of fixed radius. The
            ghosts are all on that circle, so they share the live curve’s length exactly.{' '}
            <span className="text-slate-400">
              Switch to φ₀,φ₂ for one dial per end — the honest square torus, but then the invariant
              is the diagonal. Drag the background to rotate.
            </span>
          </>
        ) : (
          <>
            <b>Free.</b> Nothing prescribed, so grab any of the six. Fourteen degrees of freedom
            against three conditions leaves <b>eleven</b> spare — against the spatial cubic’s seven and
            the plane’s four — so minimum-norm has that much more to decide and the rest of the polygon
            drifts further. The curve stays exactly PH throughout, because the unknowns are the
            generator: there is no constraint to violate.
          </>
        )
      }
    >
      {mode === 'strict' && (
        <>
          {ghosts.map((g, i) => (
            <Curve3D key={`gh${i}`} points={g} color={FIG.color.curveMuted} width={1.2} />
          ))}
          {ellipses && (
            <>
              <Curve3D points={ellipses.e2} color={FIG.color.derived} width={1.6} />
              <Curve3D points={ellipses.e3} color={FIG.color.derived} width={1.6} dashed />
            </>
          )}
        </>
      )}

      {quintic && cps.length === 6 && (
        <>
          <Curve3D points={curvePts} color={FIG.color.curve} width={3.5} />
          <Curve3D points={cps.map(tri)} color={FIG.color.controlPolygon} width={1.2} dashed />
        </>
      )}

      {mode === 'strict'
        ? cps.length === 6 && (
            <>
              {/* the grey pair: yours, but only through the dials */}
              <Point3D position={tri(cps[2])} color={FIG.color.derived} radius={0.05} />
              <Point3D position={tri(cps[3])} color={FIG.color.derived} radius={0.05} />
              {/* the data, drawn: drag these and you are prescribing Hermite data */}
              {([0, 1, 4, 5] as const).map((i) => (
                <DragPoint3D
                  key={i}
                  position={tri(cps[i])}
                  color={dragIdx === i ? FIG.color.dataPointDrag : FIG.color.dataPoint}
                  onDragStart={() => setDragIdx(i)}
                  onDragEnd={() => setDragIdx(null)}
                  onDrag={([x, y, z]) => {
                    const key = (['p0', 'p1', undefined, undefined, 'p4', 'p5'] as const)[i]
                    if (key) setEnds((e) => ({ ...e, [key]: { x, y, z } }))
                  }}
                />
              ))}
            </>
          )
        : cps.map((p, i) => (
            <DragPoint3D
              key={i}
              position={tri(p)}
              color={dragIdx === i ? FIG.color.dataPointDrag : FIG.color.dataPoint}
              onDragStart={() => setDragIdx(i)}
              onDragEnd={() => setDragIdx(null)}
              onDrag={([x, y, z]) => {
                if (!freeState) return
                const step = dragSpatialFree(freeState, i, { x, y, z })
                setFreeState(step.state)
                setFreeInfo({ tracking: step.trackingError, disturbance: step.disturbance })
              }}
            />
          ))}
    </Figure3D>
  )
}

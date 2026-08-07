// ============================================================================
// SLIDE 7 — two angles, a torus of interpolants, and four planar coincidences.
//
// Slide 6: pin the ends of a spatial PH CUBIC, prescribe one interior point, and one
// degree of freedom is left over — the answer is a curve, and a slider rides it.
// Move up to the QUINTIC and prescribe C¹ Hermite data at both ends:
//
//     14 DOF − 12 conditions  =  TWO left over
//
// so the answer is a SURFACE, and there are two sliders. The mathematics is slide 6's
// with one more link in the chain (docs/PH_SANDWICH_CHAIN.md): every spatial PH
// interpolation problem is a chain of sandwich equations X u X* = v, each contributing
// one angle, and only DIFFERENCES matter — so k+1 links give a k-torus. Nothing is
// solved here; given (α, β) you evaluate a formula.
//
// WHAT THE FIGURE DRAWS, AND WHY IT DRAWS ELLIPSES INSTEAD OF SURFACES
//
// Every control point is EXACTLY a single harmonic in α (measured to 1e-16; the
// reason is that the only α-dependence sits in terms LINEAR in A₀ ~ exp(iα)). So at
// fixed β each control point traces an exact ELLIPSE, and the swept surface is a
// STACK of ellipses. Slide 6's fiber is one of them.
//
// Drawing the whole surface would actively mislead. "The planar members are where the
// P₂ surface meets the data plane" is FALSE — a surface cut by a plane gives a curve,
// not four points. Planarity is TWO conditions:
//
//     P₂ in the plane   AND   P₃ in the plane
//
// (P₀,P₁,P₄,P₅ are already in it, and four points fix a plane.) Each alone cuts a
// curve out of the torus; the planar interpolants are where those two curves CROSS.
// Two conditions, two parameters ⇒ dimension zero ⇒ isolated points; the count is 4.
//
// So the figure shows the two ellipses and where each PIERCES the plane — two marks
// apiece. Generically the marks sit at different α, and the curve is not flat. Drag β
// and they slide; at β = 0 and β = π they COINCIDE, and the curve drops into the
// plane. The α slider carries the same four marks, so the merge is watchable there
// even before you find it in 3D. That coincidence IS the mechanism, and it is the one
// thing this slide has to teach.
//
// ARC LENGTH IS FROZEN UNDER α. L depends on β alone — [FGMS08], and the mechanism is
// that exp(θi) commutes with i so α cancels out of A₀ i A₂*. This needs no heatmap: drag
// α across its whole range and the readout does not move a digit. Drag β and it does.
// An invariant you watch hold is worth more than a banded picture of one.
//
// TILT breaks the coincidence on purpose. Lift d_f out of the plane and the four
// planar members do not merely move — they cease to exist, because two curves on a
// torus that crossed have been pushed apart. It is the cheapest possible proof that
// the four points are a non-generic accident of coplanar data.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks
// and gestures. core/phSpatialQuintic carries all of it, with 29 tests.
// ============================================================================
import { useMemo, useState } from 'react'
import { DoubleSide } from 'three'
import type { Vec3 } from '../../core/quaternion'
import { vnorm } from '../../core/quaternion'
import {
  type SpatialHermiteData,
  arcLength,
  controlPoints,
  curveAt,
  hodographAt,
  interpolateSpatialQuintic,
  planarity,
  planarMemberAngles,
  planeCrossingAngles,
  speedAt,
} from '../../core/phSpatialQuintic'
import Figure3D, { Curve3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const TAU = 2 * Math.PI

/** Coplanar by construction — the locus where planar members can exist at all. */
const BASE: SpatialHermiteData = {
  pi: { x: -1, y: -0.25, z: 0 },
  pf: { x: 1, y: 0.3, z: 0 },
  di: { x: 1.5, y: 1.5, z: 0 },
  df: { x: 1.4, y: -1.2, z: 0 },
}
const PLANE_NORMAL: Vec3 = { x: 0, y: 0, z: 1 }
const ELLIPSE_SAMPLES = 96
const START = { alpha: 1.1, beta: 1.9 }

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

const withTilt = (tilt: number): SpatialHermiteData =>
  tilt === 0 ? BASE : { ...BASE, df: { ...BASE.df, z: tilt } }

/** Framed once, from a sweep of the untilted family, so the view never lurches. */
const BOUNDS = (() => {
  const all: Vec3[] = []
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 12; j++) {
      const q = interpolateSpatialQuintic(BASE, (TAU * i) / 24, (2 * TAU * j) / 12)
      if (q) all.push(...controlPoints(q))
    }
  }
  const pad = 0.25
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y), zs = all.map((p) => p.z)
  return {
    min: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.min(...zs) - pad] as [number, number, number],
    max: [Math.max(...xs) + pad, Math.max(...ys) + pad, Math.max(...zs) + pad] as [number, number, number],
  }
})()

const PLANE_W = BOUNDS.max[0] - BOUNDS.min[0]
const PLANE_H = BOUNDS.max[1] - BOUNDS.min[1]
const PLANE_C: [number, number, number] = [
  (BOUNDS.max[0] + BOUNDS.min[0]) / 2,
  (BOUNDS.max[1] + BOUNDS.min[1]) / 2,
  0,
]

/** Ticks under the α slider: where each middle point pierces the plane, at this β. */
function AngleTicks({ groups }: { groups: { at: number[]; color: string }[] }) {
  return (
    <span className="relative block h-[6px] w-40">
      {groups.map((g, gi) =>
        g.at.map((a, i) => (
          <span
            key={`${gi}-${i}`}
            className="absolute top-0 w-[2px] h-[6px] rounded-sm"
            style={{ left: `calc(${(a / TAU) * 100}% - 1px)`, background: g.color }}
          />
        )),
      )}
    </span>
  )
}

export default function SpatialQuinticFigure() {
  const [alpha, setAlpha] = useState(START.alpha)
  const [beta, setBeta] = useState(START.beta)
  const [tilt, setTilt] = useState(0)

  const data = useMemo(() => withTilt(tilt), [tilt])
  const quintic = useMemo(() => interpolateSpatialQuintic(data, alpha, beta), [data, alpha, beta])
  const cps = useMemo(() => (quintic ? controlPoints(quintic) : []), [quintic])

  /** The two α-ellipses at this β — what the family looks like along one dial. */
  const ellipses = useMemo(() => {
    const e2: [number, number, number][] = []
    const e3: [number, number, number][] = []
    for (let k = 0; k <= ELLIPSE_SAMPLES; k++) {
      const q = interpolateSpatialQuintic(data, (TAU * k) / ELLIPSE_SAMPLES, beta)
      if (!q) continue
      const c = controlPoints(q)
      e2.push(tri(c[2]))
      e3.push(tri(c[3]))
    }
    return { e2, e3 }
  }, [data, beta])

  /** Where each ellipse pierces the data plane: two α apiece, or none. */
  const crossings = useMemo(
    () => ({
      p2: planeCrossingAngles(data, beta, 2, PLANE_NORMAL, BASE.pi),
      p3: planeCrossingAngles(data, beta, 3, PLANE_NORMAL, BASE.pi),
    }),
    [data, beta],
  )

  const crossPoints = useMemo(() => {
    const out: { at: [number, number, number]; index: number }[] = []
    for (const [index, angles] of [[2, crossings.p2], [3, crossings.p3]] as const) {
      for (const a of angles) {
        const q = interpolateSpatialQuintic(data, a, beta)
        if (q) out.push({ at: tri(controlPoints(q)[index]), index })
      }
    }
    return out
  }, [data, beta, crossings])

  /** The four planar interpolants — present only while the data stays coplanar. */
  const planarAngles = useMemo(() => planarMemberAngles(data), [data])
  const planarBeads = useMemo(
    () =>
      planarAngles.flatMap(([a, b]) => {
        const q = interpolateSpatialQuintic(data, a, b)
        return q ? [tri(controlPoints(q)[2]), tri(controlPoints(q)[3])] : []
      }),
    [data, planarAngles],
  )

  const curvePts = useMemo(() => {
    if (!quintic) return []
    return Array.from({ length: 81 }, (_, i) => tri(curveAt(quintic, i / 80)))
  }, [quintic])

  const phError = useMemo(() => {
    if (!quintic) return 0
    let worst = 0
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      worst = Math.max(worst, Math.abs(vnorm(hodographAt(quintic, t)) - speedAt(quintic, t)))
    }
    return worst
  }, [quintic])

  /** How nearly the two piercings agree — this is what goes to zero at a planar member. */
  const mismatch = useMemo(() => {
    if (crossings.p2.length !== 2 || crossings.p3.length !== 2) return null
    const a = [...crossings.p2].sort((x, y) => x - y)
    const b = [...crossings.p3].sort((x, y) => x - y)
    return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]))
  }, [crossings])

  const flat = quintic ? planarity(quintic) : 1
  const isFlat = flat < 1e-6

  const snap = (i: number): void => {
    const pick = planarAngles[i]
    if (!pick) return
    setAlpha(pick[0])
    setBeta(pick[1])
  }

  const reset = (): void => {
    setAlpha(START.alpha)
    setBeta(START.beta)
    setTilt(0)
  }

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 420 }}
      notation={['r′ = A i A*, A quadratic', '14 DOF − 12 conditions = 2', 'the family is a torus']}
      readouts={[
        { label: 'spare DOF', value: '2' },
        { label: 'α', value: `${(alpha / Math.PI).toFixed(3)}π` },
        { label: 'β', value: `${(beta / Math.PI).toFixed(3)}π` },
        {
          label: 'arc len',
          value: `${quintic ? arcLength(quintic).toFixed(5) : '—'} (β only)`,
          tone: 'ok' as const,
        },
        {
          label: 'piercing gap',
          value: mismatch === null ? '—' : mismatch.toExponential(1),
          tone: mismatch !== null && mismatch < 1e-6 ? ('ok' as const) : undefined,
        },
        { label: 'flat members', value: String(planarAngles.length) },
        { label: '|r′|−σ', value: phError.toExponential(1), tone: 'ok' as const },
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap">
          <label className="flex flex-col gap-[2px]">
            <span className="flex items-center gap-1">
              <span className="text-slate-400">α</span>
              <input
                type="range"
                min={0}
                max={TAU}
                step={TAU / 720}
                value={alpha}
                onChange={(e) => setAlpha(Number(e.target.value))}
                className="w-40"
              />
            </span>
            <AngleTicks
              groups={[
                { at: crossings.p2, color: FIG.color.dataPoint },
                { at: crossings.p3, color: FIG.color.curve },
              ]}
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-400">β</span>
            <input
              type="range"
              min={0}
              max={2 * TAU}
              step={TAU / 720}
              value={beta}
              onChange={(e) => setBeta(Number(e.target.value))}
              className="w-40"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-400">tilt d_f</span>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.02}
              value={tilt}
              onChange={(e) => setTilt(Number(e.target.value))}
              className="w-24"
            />
          </label>
          {planarAngles.length > 0 && (
            <span className="inline-flex rounded overflow-hidden border border-slate-300">
              {planarAngles.map((_, i) => (
                <button
                  key={i}
                  onClick={() => snap(i)}
                  className="px-2 py-[0.15em] hover:bg-slate-100 border-r border-slate-200 last:border-r-0"
                >
                  flat {i + 1}
                </button>
              ))}
            </span>
          )}
          <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
            reset
          </button>
        </span>
      }
      caption={
        <>
          <b>Two angles, so the answer is a surface — but the picture to hold is a stack of
          ellipses.</b>{' '}
          Fix β and every control point traces an exact ellipse as α turns; that ellipse is slide 6’s
          fiber, and the β dial moves you through the stack. <b>Arc length depends on β alone</b>: drag
          α from end to end and the readout does not move a digit. The four dark beads are the{' '}
          <b>planar</b> interpolants — the four classical answers from the plane, embedded here. They
          are not where a surface meets the plane, which would be a curve: being flat needs{' '}
          <i>both</i> middle points in the plane at once, and each ellipse pierces it at two α. Drag β
          and watch the marks under the α slider — <b>where they merge, the curve goes flat</b>.{' '}
          <span className="text-slate-400">
            Tilt d_f and the four cease to exist. Drag the background to rotate.
          </span>
        </>
      }
    >
      {/* the data plane — the thing "flat" is measured against */}
      <mesh position={PLANE_C}>
        <planeGeometry args={[PLANE_W, PLANE_H]} />
        <meshBasicMaterial color={FIG.color.dataPoint} transparent opacity={0.05} side={DoubleSide} />
      </mesh>

      {/* the two α-ellipses at this β: every position the data permits for P₂ and P₃ */}
      <Curve3D points={ellipses.e2} color={FIG.color.derived} width={1.6} />
      <Curve3D points={ellipses.e3} color={FIG.color.derived} width={1.6} dashed />

      {/* where each ellipse pierces the plane — the marks whose merging IS planarity */}
      {crossPoints.map((c, i) => (
        <Point3D
          key={`x${i}`}
          position={c.at}
          color={c.index === 2 ? FIG.color.dataPoint : FIG.color.curve}
          radius={0.03}
        />
      ))}

      {/* the four planar interpolants' middle points, all lying in the plane */}
      {planarBeads.map((p, i) => (
        <Point3D key={`fl${i}`} position={p} color={FIG.color.curve} radius={0.042} />
      ))}

      {quintic && cps.length === 6 && (
        <>
          <Curve3D
            points={curvePts}
            color={isFlat ? FIG.color.dataPointDrag : FIG.color.curve}
            width={3.5}
          />
          <Curve3D points={cps.map(tri)} color={FIG.color.controlPolygon} width={1.2} dashed />
          {/* pinned by the data: the ends and the two tangent legs */}
          {[0, 1, 4, 5].map((i) => (
            <Point3D key={`p${i}`} position={tri(cps[i])} color={FIG.color.pinned} radius={0.045} />
          ))}
          {/* the two that ride the ellipses */}
          <Point3D position={tri(cps[2])} color={FIG.color.dataPoint} radius={0.055} />
          <Point3D position={tri(cps[3])} color={FIG.color.dataPoint} radius={0.055} />
        </>
      )}
    </Figure3D>
  )
}

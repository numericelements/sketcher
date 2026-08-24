// ============================================================================
// THE RATIONAL PH CUBIC — the lowest degree there is, and a specimen rather than a family.
//
// Kozak–Krajnc–Vitrih (CAGD 31(1), 2014, Thm 7), as reconstructed in Kalkan–Scharler–Schröcker–Šír Ex 5.4.
// All the mathematics is in core/rationalPHCubic, verified there against the published coefficients.
//
// WHY THIS FIGURE HAS NO DRAG AND NO DIAL, stated because every other figure in this deck has both. This
// curve sits on the stratum our chart is documented as missing: its spinor is NULL at the pole (𝒜(ι)𝒜̄(ι) = 0
// with 𝒜(ι) ≠ 0), so every step that divides by 𝒜(r) or σ(r) is unavailable and there is no solver here to
// move it with. The obvious guess for a family was tested and failed: holding 𝒜's shape while moving the
// pole to ι·ρ keeps the spinor null to 1e-16 but the back-substitution for p breaks down (residuals 5e-2 to
// 1e-1 against 0.0e+0 at ρ = 1). A genuine one-parameter family here is open work, not a port — so the
// figure shows the published member honestly instead of faking motion around it.
//
// WHAT IS WORTH POINTING AT: the t slider runs well past [0,1], because this curve's third pole is at
// t = ∞ and you can watch it leave. |c| grows like t/60 — slowly, which is the trap: on [−8, 8] it reads
// 0.165 and looks bounded. The readout carries |c| so the divergence is a number rather than a claim.
// ============================================================================
import { useMemo, useState } from 'react'
import {
  arcLength,
  controlStructure,
  curveAt,
  derivativeAt,
  phDefect,
  speedAt,
} from '../../core/rationalPHCubic'
import type { Vec3 } from '../../core/quaternion'
import Figure3D, { Curve3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

export default function RationalCubicFigure() {
  const [at, setAt] = useState(0.4)
  const [reach, setReach] = useState(1)

  const control = useMemo(() => controlStructure(), [])
  /** The drawn piece: [0,1] always, plus however far the `reach` slider extends it. */
  const drawn = useMemo(
    () => Array.from({ length: 241 }, (_, i) => tri(curveAt((i / 240) * reach))),
    [reach],
  )
  const unit = useMemo(() => Array.from({ length: 121 }, (_, i) => tri(curveAt(i / 120))), [])

  const here = curveAt(at)
  const tangent = useMemo(() => {
    const d = derivativeAt(at)
    const n = Math.hypot(d.x, d.y, d.z) || 1
    const k = 0.06 / n
    return [tri(here), [here.x + d.x * k, here.y + d.y * k, here.z + d.z * k] as [number, number, number]]
  }, [at, here])

  const far = Math.hypot(...tri(curveAt(reach)))
  const bounds = useMemo(() => {
    const pts = [...drawn, ...control.points.map(tri)]
    const lo = [0, 1, 2].map((k) => Math.min(...pts.map((p) => p[k])))
    const hi = [0, 1, 2].map((k) => Math.max(...pts.map((p) => p[k])))
    const pad = 0.05 + 0.1 * Math.max(...[0, 1, 2].map((k) => hi[k] - lo[k]))
    return {
      min: [lo[0] - pad, lo[1] - pad, lo[2] - pad] as [number, number, number],
      max: [hi[0] + pad, hi[1] + pad, hi[2] + pad] as [number, number, number],
    }
  }, [drawn, control])

  return (
    <Figure3D
      bounds={bounds}
      base={{ width: 900, height: 430 }}
      notation={['ᴄ = −(t(t²−4), 2t(3t−1), t(3t+4)) / 60(t²+1)', 'degree 3', '𝒜 = (t²−1) + 3t i + 2 j + k']}
      readouts={[
        { label: 'PH defect', value: phDefect().toExponential(1), tone: 'ok' as const },
        { label: 'degree', value: '3 (numerator 3, w quadratic)' },
        { label: 'poles', value: '±i, and t = ∞' },
        { label: 't', value: at.toFixed(3) },
        { label: 'arc length 0→t', value: arcLength(at).toFixed(6) },
        { label: '‖c′(t)‖', value: speedAt(at).toFixed(4) },
        { label: `|c| at t = ${reach.toFixed(0)}`, value: far.toFixed(3), tone: far > 1 ? ('warn' as const) : ('plain' as const) },
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap justify-center">
          <label className="flex items-center gap-1">
            <span className="text-slate-400">t along the curve</span>
            <input
              type="range" min={0} max={1} step={0.002} value={at}
              onChange={(e) => setAt(Number(e.target.value))} className="w-32"
            />
          </label>
          {/* Runs far past [0,1] on purpose: the third pole is at infinity and this is how you see it. */}
          <label className="flex items-center gap-1">
            <span className="text-slate-400">follow it out to t =</span>
            <input
              type="range" min={1} max={60} step={0.5} value={reach}
              onChange={(e) => setReach(Number(e.target.value))} className="w-36"
            />
            <span className="font-mono text-slate-500">{reach.toFixed(0)}</span>
          </label>
        </span>
      }
      caption={
        <>
          <b>The lowest degree a rational PH space curve can have: three.</b> This is the curve of
          Kozak, Krajnc and Vitrih (2014), as reconstructed by Kalkan, Scharler, Schröcker and Šír — not
          ours, and verified against their coefficients: <b>N = −(1/60)·𝒜i𝒜̄</b> holds to the last digit for
          the spinor they give, so <i>PH defect</i> reads machine zero. <b>Its denominator is t² + 1</b>,
          whose roots are the <b>complex</b> pair ±i — so no finite real parameter reaches infinity, and the
          weights on [0,1] are all positive.{' '}
          <b>But count the poles projectively and there is a third, at t = ∞</b>, because the numerator has
          degree 3 while w has degree 2. Push <i>follow it out</i> and watch it leave: |c| grows like t/60,
          which is slow enough that on a short range the curve looks bounded. That is the trap — it is not.{' '}
          <span className="text-slate-400">
            <b>No handles on this one, and that is the honest part.</b> Everywhere else in this deck you can
            drag; here the spinor is <b>null at the pole</b> — 𝒜(i)𝒜̄(i) = 0 with 𝒜(i) itself nonzero, sitting
            on the null cone of the complexified quaternions — which is exactly the stratum slide 16&apos;s
            notes flag as the one our chart misses. Every step that divides by 𝒜(r) or σ(r) is unavailable,
            so there is no solver to move it with. The obvious guess for a family was tried and failed:
            keeping the spinor null while sliding the pole leaves the back-substitution inconsistent.
            Because w divides σ here, the arc length is also <b>not rational</b> — it is
            (t + 5·arctan t)/60, exact and elementary. Drag the background to rotate.
          </span>
        </>
      }
    >
      <Curve3D points={control.points.map(tri)} color={FIG.color.controlPolygon} width={1} dashed />
      {/* The extension past [0,1] is drawn muted, so the piece the curve "is" stays readable. */}
      {reach > 1.001 ? <Curve3D points={drawn} color={FIG.color.curveMuted} width={1.5} /> : null}
      <Curve3D points={unit} color={FIG.color.curve} width={3.5} />

      {control.points.map((p, i) => (
        <Point3D key={`cp${i}`} position={tri(p)} color={FIG.color.derived} radius={0.012} derived />
      ))}

      <Curve3D points={tangent} color={FIG.color.dataPoint} width={2} />
      <Point3D position={tri(here)} color={FIG.color.dataPoint} radius={0.014} />
    </Figure3D>
  )
}

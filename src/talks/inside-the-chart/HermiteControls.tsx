// ============================================================================
// THE DEGREE-6 HANDLES, WRITTEN ONCE — the sphere slide and the curve slide import the same strip.
//
// FOUR SLIDERS, and the count is derived rather than chosen: 12 handle numbers (P₀ P₁ P₅ P₆) plus
// ψ + s + λ + r is 16, which is the chart's measured dimension. Offering a fifth would be offering a
// motion the family does not have.
//
// BOTH FIBRE SLIDERS ARE CIRCLES, and both run 0–360°. ψ turns 𝒜(1) on its Hopf fibre; s runs the
// second circle, which is closed form (`rationalHermiteCircles.ts`) rather than a walk. An earlier
// version had s as a bounded road labelled 0–1, because the only way to travel that loop was a
// 2180-step continuation taking 109 s. The derivation replaced it with a formula.
//
// `modes` is false on the SPHERE slide, for the same reason as the degree-4 pair: strict and free
// differ only in which control points may be grabbed, and the sphere draws none.
// ============================================================================
import { RANGE, hermiteChart, useHermiteChart } from './hermiteModel'

const Slider = ({
  label, value, range, onChange, onSettle, width = 'w-32',
}: {
  label: string
  value: number
  range: { min: number; max: number; step: number }
  onChange: (v: number) => void
  onSettle?: () => void
  width?: string
}) => (
  <label className="flex items-center gap-1">
    <span className="text-slate-400">{label}</span>
    <input
      type="range"
      min={range.min}
      max={range.max}
      step={range.step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      onPointerUp={onSettle}
      onKeyUp={onSettle}
      className={width}
    />
  </label>
)

export default function HermiteControls({ modes = true }: { modes?: boolean }) {
  const { mode, live, psi, sAngle, theta, stalled } = useHermiteChart()
  const strict = !modes || mode === 'strict'

  return (
    <span className="flex items-center gap-3 flex-wrap justify-center">
      {modes ? (
        <span className="inline-flex rounded overflow-hidden border border-slate-300">
          {(['strict', 'free'] as const).map((m) => (
            <button
              key={m}
              onClick={() => hermiteChart.setMode(m)}
              className={`px-2 py-[0.15em] ${mode === m ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
            >
              {m}
            </button>
          ))}
        </span>
      ) : null}

      {strict ? (
        <>
          <Slider
            label="fibre ψ"
            value={psi}
            range={RANGE.psi}
            onChange={(v) => hermiteChart.setPsi(v)}
            width="w-36"
          />
          <Slider
            label="fibre s"
            value={sAngle}
            range={RANGE.sAngle}
            onChange={(v) => hermiteChart.setS(v)}
            width="w-36"
          />
          <Slider
            label="twist θ"
            value={theta}
            range={RANGE.theta}
            onChange={(v) => hermiteChart.setTheta(v)}
            onSettle={() => hermiteChart.settle()}
            width="w-36"
          />
          <Slider
            label="pole r"
            value={live.roots[0]}
            range={RANGE.pole}
            onChange={(v) => hermiteChart.setPole(v)}
            onSettle={() => hermiteChart.settle()}
          />
        </>
      ) : (
        <span className="text-slate-400">drag any control point — the ends hold each other</span>
      )}

      <button
        onClick={() => hermiteChart.reset()}
        className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
      >
        reset
      </button>
      {stalled ? <span className="text-amber-600">no member there</span> : null}
    </span>
  )
}

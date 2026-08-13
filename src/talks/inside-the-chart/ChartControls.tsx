// ============================================================================
// THE HANDLES, WRITTEN ONCE — because "the same sliders on both slides" has to be literally true.
//
// The sphere slide and the curve slide are two views of one configuration (chartModel.ts). If each
// built its own control strip they would drift apart the first time one was edited, and the pairing
// the two slides exist to make would quietly stop being a pairing. So there is one strip, and both
// import it.
//
// STRICT hides nothing and adds nothing: the three sliders ARE the leftover coordinates once the data
// is pinned — one dial, one pole, one fibre dimension. FREE releases the data, so the fibre sweep
// stops meaning anything and is hidden; the handles become the control points themselves.
// ============================================================================
import { RANGE, chart, useChart } from './chartModel'

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

export default function ChartControls() {
  const { mode, live, phase, theta, stalled } = useChart()
  const strict = mode === 'strict'

  return (
    <span className="flex items-center gap-3 flex-wrap justify-center">
      <span className="inline-flex rounded overflow-hidden border border-slate-300">
        {(['strict', 'free'] as const).map((m) => (
          <button
            key={m}
            onClick={() => chart.setMode(m)}
            className={`px-2 py-[0.15em] ${mode === m ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
          >
            {m}
          </button>
        ))}
      </span>

      <Slider
        label="pole r"
        value={live.roots[0]}
        range={RANGE.pole}
        onChange={(v) => chart.setPole(v)}
        onSettle={() => chart.settle()}
      />
      <Slider
        label="twist θ"
        value={theta}
        range={RANGE.theta}
        onChange={(v) => chart.setTheta(v)}
        onSettle={() => chart.settle()}
        width="w-36"
      />
      {strict ? (
        <Slider label="around the fibre" value={phase} range={RANGE.phase} onChange={(v) => chart.sweep(v)} />
      ) : (
        <span className="text-slate-400">drag any control point — the ends hold each other</span>
      )}

      <button
        onClick={() => chart.reset()}
        className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
      >
        reset
      </button>
      {stalled ? <span className="text-amber-600">no member there</span> : null}
    </span>
  )
}

// ============================================================================
// One slider, written once, so both views of the walk are literally the same handle.
// ============================================================================
import { PATH, useStation, walk } from './offChartModel'

export default function OffChartControls() {
  const { index, station } = useStation()
  return (
    <span className="flex items-center gap-3 flex-wrap justify-center">
      <label className="flex items-center gap-1">
        <span className="text-slate-400">walk off the chart</span>
        <input
          type="range"
          min={0}
          max={PATH.length - 1}
          step={1}
          value={index}
          onChange={(e) => walk.to(Number(e.target.value))}
          className="w-64"
        />
        <span className="tabular-nums text-slate-400 w-16">
          {index} / {PATH.length - 1}
        </span>
      </label>
      <span className={station.realPoles > 0 ? 'text-slate-500' : 'text-amber-600'}>
        {station.realPoles > 0 ? 'in the λ-chart' : 'outside it'}
      </span>
      <button
        onClick={() => walk.to(0)}
        className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
      >
        reset
      </button>
    </span>
  )
}

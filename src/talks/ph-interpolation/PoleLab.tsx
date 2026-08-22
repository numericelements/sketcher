// ============================================================================
// THE POLE LAB — one instrument, two models, and the number beside the verdict.
//
// Rational PH curves have poles, and a pole is SOFT or HARD. The whole decision is one number:
// for x = q/W, at a root r of W the hodograph numerator is N(r) = −q(r)W′(r), so with ‖N‖² = ρ²
//
//     ρ(r)² = ⟨q(r), q(r)⟩ · W′(r)²        and at a SIMPLE pole,  soft ⟺ ⟨q(r),q(r)⟩ = 0
//
// The button shows that number and the verdict it was read from, because the threshold between
// them is a choice of ours and the mathematics has no opinion about it. Everything the readout
// prints is derived in docs/POLE_ALGEBRA.md; core/poleReadout computes it; this file only draws.
//
// TWO MODELS, ONE CURVE. The conformal presets are members of BOTH — C = (W, q, c∞) converts to
// (P, w, ρ) exactly, by P = q/W and ρ = h·W — so the two slides can open on the same specimen and
// the difference is what a DRAG is allowed to do to it:
//
//     projective   the unknowns are the control points and weights; nothing forces softness, and
//                  dragging tilts |a| and |b| apart
//     Möbius       ⟨C,C⟩ ≡ 0 forces the numerator isotropic at every pole, so the alignment holds
//                  no matter where you drag
//
// WHY THE COMPLEX CASE IS TWO REAL VECTORS. q(r) = a + i·b gives ⟨q,q⟩ = (|a|²−|b|²) + 2i⟨a,b⟩, so
// soft is "|a| = |b| and a ⊥ b" — three real numbers you can read aloud instead of six with i in
// them. It matters because a genuine simple REAL pole is always hard (§6), so the case that
// displays most simply is always the boring one.
//
// ONE SPHERE AT A TIME. A conformal control point IS a weighted sphere, and drawing all of them at
// once was the thing that made the earlier sphere figures unreadable. Only the selected one is
// drawn here.
// ============================================================================
import { useMemo, useState } from 'react'
import { type ConformalPHCurve, dragControlPoint, radii } from '../../core/conformalPHCurve'
import { type Conformal, project } from '../../core/conformal'
import { type Rat, phRelativeResidual, settleToPH } from '../../core/nurbsPH'
import { type PoleReading, conformalNullResidual, poleLines, readPoles } from '../../core/poleReadout'
import type { Vec3 } from '../../core/quaternion'
import Figure3D, { type Bounds3D, Curve3D, DragPoint3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'
import { PRESETS, type Preset, conformalAsRat } from './poleLabPresets'

export type LabModel = 'projective' | 'mobius'

const tri = (p: readonly number[]): [number, number, number] => [p[0], p[1], p[2]]
export const BOUNDS: Bounds3D = { min: [-2.2, -2.2, -2.2], max: [2.2, 2.2, 2.2] }

const bern = (n: number, t: number): number[] => {
  const out = new Array<number>(n + 1).fill(0)
  out[0] = 1
  for (let k = 1; k <= n; k++) {
    for (let j = k; j >= 1; j--) out[j] = out[j] * (1 - t) + out[j - 1] * t
    out[0] *= 1 - t
  }
  return out
}

/** x(t) = Σ wₖPₖBₖ / Σ wₖBₖ, sampled on [0,1]. */
export function sampleRational(rat: Rat, n = 120): [number, number, number][] {
  const d = rat.P.length - 1
  const out: [number, number, number][] = []
  for (let i = 0; i <= n; i++) {
    const b = bern(d, i / n)
    let W = 0
    const q = [0, 0, 0]
    for (let k = 0; k <= d; k++) {
      W += rat.w[k] * b[k]
      for (let c = 0; c < 3; c++) q[c] += rat.w[k] * rat.P[k][c] * b[k]
    }
    if (Math.abs(W) < 1e-12) continue
    out.push([q[0] / W, q[1] / W, q[2] / W])
  }
  return out
}

/**
 * Centre and scale a specimen to the view box — EXACTLY, not approximately.
 *
 * Translating the control points leaves N = q′W − qW′ unchanged, because the added term
 * c·(w′W − wW′) is identically zero. Scaling them by λ scales N by λ, hence ρ by λ. So both are
 * exact operations on a PH curve and the framing cannot make a specimen stop being PH.
 */
export function frame(rat: Rat, half = 1.6): Rat {
  const pts = [...sampleRational(rat, 60), ...rat.P.map((p) => tri(p))]
  const lo = [0, 1, 2].map((c) => Math.min(...pts.map((p) => p[c])))
  const hi = [0, 1, 2].map((c) => Math.max(...pts.map((p) => p[c])))
  const mid = [0, 1, 2].map((c) => (lo[c] + hi[c]) / 2)
  const span = Math.max(...[0, 1, 2].map((c) => hi[c] - lo[c]), 1e-9)
  const lam = (2 * half) / span
  return {
    P: rat.P.map((p) => p.map((v, c) => (v - mid[c]) * lam)),
    w: [...rat.w],
    rho: rat.rho.map((v) => v * lam),
  }
}

/**
 * The same framing, applied to a CONFORMAL member — as a matrix, which is the model's whole point.
 *
 * x ↦ λ(x − c) is a similarity, hence a Möbius transformation, hence LINEAR on ℝ^{4,1}. In the
 * basis {o, e₁, e₂, e₃, ∞} where C = [w, q, o∞] and ⟨C,C⟩ = ‖q‖² − 2·w·o∞:
 *
 *     w   ↦ w
 *     q   ↦ λ(q − c·w)
 *     o∞  ↦ λ²(o∞ − ⟨q,c⟩ + ½‖c‖²·w)
 *
 * and ⟨MC,MC⟩ = λ²⟨C,C⟩, so the null condition survives EXACTLY rather than approximately. h
 * scales by λ because ‖p′‖ = h/w and w is untouched.
 *
 * THIS IS WHY THE SPHERE WAS IN THE WRONG PLACE. The first version framed the projective form and
 * left the conformal state alone, so the drawn sphere lived in the specimen's original coordinates
 * while the control points lived in the box — and the cursor was being handed to a solver working
 * in different units, which is why dragging did nothing recognisable.
 */
export function frameConformal(s: ConformalPHCurve, half = 1.6): ConformalPHCurve {
  const pts = s.C.map((c) => project(c)).filter((v): v is Vec3 => v !== null)
  const all = [...pts.map((v) => [v.x, v.y, v.z]), ...sampleRational(conformalAsRat(s), 60)]
  const lo = [0, 1, 2].map((k) => Math.min(...all.map((p) => p[k])))
  const hi = [0, 1, 2].map((k) => Math.max(...all.map((p) => p[k])))
  const c = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2)
  const span = Math.max(...[0, 1, 2].map((k) => hi[k] - lo[k]), 1e-9)
  const lam = (2 * half) / span
  const cc = c[0] * c[0] + c[1] * c[1] + c[2] * c[2]
  return {
    C: s.C.map((v) => {
      const w = v[0]
      const q = [v[1], v[2], v[3]]
      const qc = q[0] * c[0] + q[1] * c[1] + q[2] * c[2]
      return [
        w,
        lam * (q[0] - c[0] * w),
        lam * (q[1] - c[1] * w),
        lam * (q[2] - c[2] * w),
        lam * lam * (v[4] - qc + 0.5 * cc * w),
      ] as unknown as Conformal
    }),
    h: s.h.map((v) => v * lam),
  }
}

/** A sphere as three great circles — the idiom the other conformal figures already use. */
function greatCircles(centre: Vec3, radius: number, n = 64): [number, number, number][][] {
  if (!(radius > 1e-6)) return []
  const c = [centre.x, centre.y, centre.z]
  const ring = (u: number[], v: number[]): [number, number, number][] =>
    Array.from({ length: n + 1 }, (_, i) => {
      const a = (2 * Math.PI * i) / n
      return [0, 1, 2].map((k) => c[k] + radius * (Math.cos(a) * u[k] + Math.sin(a) * v[k])) as
        [number, number, number]
    })
  return [
    ring([1, 0, 0], [0, 1, 0]),
    ring([0, 1, 0], [0, 0, 1]),
    ring([0, 0, 1], [1, 0, 0]),
  ]
}

interface State {
  preset: Preset
  rat: Rat
  conformal: ConformalPHCurve | null
  selected: number
  pole: number
  showPole: boolean
}

const presetsFor = (model: LabModel): Preset[] =>
  model === 'mobius' ? PRESETS.filter((p) => p.conformal) : PRESETS

export function freshState(model: LabModel, preset: Preset): State {
  const conformal = model === 'mobius' && preset.conformal
    ? frameConformal(preset.conformal)
    : null
  return {
    preset,
    rat: frame(preset.rat()),
    conformal,
    selected: 1,
    pole: 0,
    showPole: false,
  }
}

export default function PoleLab({ model }: { model: LabModel }) {
  const available = presetsFor(model)
  const [st, setSt] = useState<State>(() => freshState(model, available[0]))
  const [dragging, setDragging] = useState<number | null>(null)

  const { preset, rat, conformal, selected, pole, showPole } = st

  // In Möbius mode the conformal state is the truth and the projective form is derived from it, so
  // the readout is reading the SAME curve either way.
  const shown: Rat = useMemo(
    () => (model === 'mobius' && conformal ? conformalAsRat(conformal) : rat),
    [model, conformal, rat],
  )
  const poles = useMemo(() => readPoles(shown), [shown])
  const cps = shown.P
  const current: PoleReading | null = poles.length ? poles[Math.min(pole, poles.length - 1)] : null

  const sphere = useMemo(() => {
    if (model !== 'mobius' || !conformal) return []
    const centre = project(conformal.C[Math.min(selected, conformal.C.length - 1)])
    const r = radii(conformal)[Math.min(selected, conformal.C.length - 1)]
    return centre ? greatCircles(centre, Math.abs(r)) : []
  }, [model, conformal, selected])

  const load = (p: Preset) => setSt(freshState(model, p))

  /**
   * Projective drag: the point goes exactly on the cursor, and the rest must follow —
   * EXCEPT THE ENDS, which stay where they are unless one of them is the point being dragged.
   *
   * Freezing their columns is a hard pin rather than a heavy weight, so the ends do not drift at
   * all; the planar figures pay a small drift for the weighted version.
   *
   * AND THE PIN IS DROPPED BELOW DEGREE 3, BY COUNTING RATHER THAN BY TASTE. Freezing three
   * control points is 9 of the 6d+4 unknowns, leaving 6d−5 against 4d−1 equations. At d = 2 that
   * is 7 against 7 — exactly determined, no slack — and in any case pinning both ends of a
   * quadratic pins the whole polygon, since there is only one point between them. Measured: with
   * the ends pinned the two degree-2 specimens manage 0 and 8 steps of a 30-step drag, against
   * 30 and 30 with the ends free, while every degree ≥ 3 specimen manages at least 24.
   */
  const dragProjective = (index: number, to: [number, number, number]) =>
    setSt((prev) => {
      const last = prev.rat.P.length - 1
      const held = last >= 3
        ? [index, ...[0, last].filter((i) => i !== index)]
        : [index]
      const moved: Rat = {
        P: prev.rat.P.map((p, k) => (k === index ? [...to] : [...p])),
        w: [...prev.rat.w],
        rho: [...prev.rat.rho],
      }
      const got = settleToPH(moved, last, {
        frozen: held.flatMap((i) => [3 * i, 3 * i + 1, 3 * i + 2]),
        steps: 160,
      })
      return got.residual > 1e-5 ? prev : { ...prev, rat: got.rat }
    })

  /**
   * Möbius drag — the budget is escalated, the BEST solve is taken, and nothing is refused.
   *
   * THE RULE THIS FIGURE FOLLOWS: never point the wrong way, but never hide either. Softness is
   * forced in this model by ⟨C,C⟩ ≡ 0 alone, so a state that has drifted off that identity can
   * show poles reading hard — and displaying that as a fact about the curve would point exactly
   * opposite to the theorem. But REFUSING the step, which is what this did first, hides the
   * numerical failure instead of correcting it, and a viewer sees a frozen figure with no reason
   * given. Both are wrong, in different directions.
   *
   * So the step is always taken, and when ⟨C,C⟩ has drifted the readout stops calling the poles
   * soft or hard and says the state is off the model, with the number. A transient artifact is
   * fine to look at; an artifact dressed as geometry is not.
   *
   * THE ESCALATION IS STILL WORTH IT, because it is what lets the specimen do its job. The
   * non-reduced locus is a SINGULAR point of the variety — Newton needs more steps there than
   * anywhere else and its convergence is not monotone in the size of the drag — so at a fixed 60
   * iterations almost nothing lands. With [80, 300, 900]:
   *
   *     first grab   300 iterations, 107ms  →  8 genuine poles, ALL SOFT, isotropy 4.5e-10
   *     after that    80 iterations, 1–3ms  →  still all soft, down to isotropy 2e-13
   *
   * The doubled pole splits into soft poles on the first touch, which is the whole content of
   * "hard is only ever a boundary point of the soft cell", and every drag after it is ordinary
   * because one step off the singular locus lands at a regular point.
   */
  const dragMobius = (index: number, to: [number, number, number]) =>
    setSt((prev) => {
      if (!prev.conformal) return prev
      let best: ConformalPHCurve | null = null
      let bestNull = Infinity
      for (const iterations of [80, 300, 900]) {
        const r = dragControlPoint(prev.conformal, index, { x: to[0], y: to[1], z: to[2] },
          { pinEnds: true, iterations })
        const off = conformalNullResidual(r.state)
        if (off < bestNull) { bestNull = off; best = r.state }
        if (off <= 1e-9) break
      }
      return best ? { ...prev, conformal: best } : prev
    })

  const drag = model === 'mobius' ? dragMobius : dragProjective
  const residual = phRelativeResidual(shown)
  // On the Möbius side softness is forced by ⟨C,C⟩ ≡ 0 alone, so a state that has drifted off that
  // identity can show poles reading HARD — an artifact of the solver, not a fact about the curve.
  // The slide claims the model cannot make a pole hard, so it has to show this number.
  const nullOff = model === 'mobius' && conformal ? conformalNullResidual(conformal) : 0

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 460 }}
      notation={[
        model === 'mobius' ? 'C = (W, q, c∞),  ⟨C,C⟩ ≡ 0' : 'x = q/W,  ‖q′W − qW′‖² = ρ²',
        `degree ${cps.length - 1}`,
        `${poles.length} pole${poles.length === 1 ? '' : 's'}`,
      ]}
      readouts={[
        { label: 'model', value: model === 'mobius' ? 'Möbius (ℝ⁴,¹)' : 'projective (P, w, ρ)' },
        { label: 'PH residual', value: residual.toExponential(1), tone: residual < 1e-8 ? 'ok' : 'warn' },
        ...(model === 'mobius'
          ? [{
            label: '⟨C,C⟩',
            value: nullOff.toExponential(1),
            tone: (nullOff < 1e-9 ? 'ok' : 'warn') as 'ok' | 'warn',
          }]
          : []),
        current
          ? {
            label: `pole ${Math.min(pole, poles.length - 1) + 1} of ${poles.length}`,
            // ⟨C,C⟩ ≡ 0 is what FORCES softness here, so a drifted state has no verdict to give:
            // saying "hard" would point opposite to the theorem, and saying "soft" would be luck.
            value: nullOff > 1e-9 ? 'off the model' : current.verdict.toUpperCase(),
            tone: nullOff > 1e-9 ? 'warn' : current.verdict === 'soft' ? 'ok' : 'plain',
          }
          : { label: 'poles', value: 'none' },
      ]}
      controls={
        <span className="flex flex-wrap items-center gap-2">
          <select
            value={preset.id}
            onChange={(e) => {
              const p = available.find((x) => x.id === e.target.value)
              if (p) load(p)
            }}
            className="px-2 py-[0.15em] rounded border border-slate-300 bg-white"
            aria-label="specimen"
          >
            {available.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <span className="inline-flex items-center gap-1">
            <button
              onClick={() => setSt((p) => ({ ...p, pole: (p.pole + poles.length - 1) % Math.max(1, poles.length) }))}
              className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
              aria-label="previous pole"
            >‹</button>
            <button
              onClick={() => setSt((p) => ({ ...p, pole: (p.pole + 1) % Math.max(1, poles.length) }))}
              className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
              aria-label="next pole"
            >›</button>
          </span>
          <button
            onClick={() => setSt((p) => ({ ...p, showPole: !p.showPole }))}
            className={`px-2 py-[0.15em] rounded border border-slate-300 ${
              showPole ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'
            }`}
          >
            show the pole
          </button>
          <button
            onClick={() => load(preset)}
            className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
          >
            reset
          </button>
        </span>
      }
      caption={
        <>
          {showPole && current ? (
            <span className="block font-mono text-[0.82em] leading-[1.5] whitespace-pre bg-slate-50 border border-slate-200 rounded px-3 py-2 mb-2 overflow-x-auto">
              {(nullOff > 1e-9
                ? [
                  `⟨C,C⟩ = ${nullOff.toExponential(2)}, not 0 — this state has drifted OFF the model.`,
                  'Softness is forced here by ⟨C,C⟩ ≡ 0, so the verdict below is arithmetic and',
                  'not geometry. The numbers are shown as they are; the label is withheld.',
                  '',
                  ...poleLines(current).slice(0, 3),
                ]
                : poleLines(current)).join('\n')}
            </span>
          ) : null}
          <b>{preset.label}.</b> {preset.note}{' '}
          {model === 'mobius'
            ? `Each blue point is the centre of a control SPHERE; the selected one is drawn. ⟨C,C⟩ ≡ 0 forces every pole isotropic, so drag where you like — |a| = |b| and the right angle do not move.${
              preset.id === 'lift8'
                ? ' This one starts on the NON-REDUCED locus — a doubled pole with a cancelling numerator, which is the only shape a hard pole can take here. Touch it and the double root SPLITS into eight genuine poles, every one soft. Hard to soft, once, and there is no way back.'
                : ''
            }`
            : `Drag any control point: it goes exactly where you put it, and the PH condition is restored around it.${
              cps.length - 1 >= 3
                ? ' The two ends stay where they are unless you grab one of them.'
                : ' At degree 2 the ends are free — pinning them would pin the whole polygon.'
            } Nothing here forces softness, so watch |a| and |b| come apart.`}{' '}
          <span className="text-slate-400">Drag the view to rotate.</span>
        </>
      }
    >
      {sphere.map((ring, i) => (
        <Curve3D key={`s${i}`} points={ring} color={FIG.color.derived} width={1.2} dashed={i > 0} />
      ))}
      <Curve3D points={cps.map(tri)} color={FIG.color.controlPolygon} width={1.2} dashed />
      <Curve3D points={sampleRational(shown)} color={FIG.color.curve} width={3.5} />
      {/* EVERY control point is blue, because every one can be grabbed. Grey would say
          "computed, not yours to move", which would be false here. Grabbing one also selects it,
          which is what chooses the sphere on the Möbius side. */}
      {cps.map((p, i) => (
        <DragPoint3D
          key={i}
          position={tri(p)}
          onDrag={(q) => drag(i, q)}
          onDragStart={() => { setDragging(i); setSt((s) => ({ ...s, selected: i })) }}
          onDragEnd={() => setDragging(null)}
          color={dragging === i ? FIG.color.dataPointDrag : FIG.color.dataPoint}
          radius={i === selected ? 0.085 : 0.065}
        />
      ))}
    </Figure3D>
  )
}

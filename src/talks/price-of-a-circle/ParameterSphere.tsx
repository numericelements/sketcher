// ============================================================================
// THE PARAMETER SPHERE — a static SVG, because the point is a picture and not a computation.
//
// This is NOT the tangent indicatrix. The indicatrix lives in ℝ³ and shows where c′/‖c′‖ points; this
// sphere is ℂ ∪ {∞}, the space the PARAMETER lives in, and the dots on it are the roots of w. The two
// get confused constantly, which is the whole reason the slide exists, so the caption says so twice.
//
// WHAT IS DRAWN, and every mark is load-bearing:
//
//   · the EQUATOR — the real line plus ∞, i.e. the parameters you actually feed in. Drawn solid and
//     heavier than the rest, because it is the road.
//   · ∞ marked ON the equator, since that is the fact slide B needs: a polynomial's pole is there.
//   · a REAL pole, a filled dot sitting on the equator — a dot on the route.
//   · a CONJUGATE PAIR, north and south, hollow — dots off the route, mirror images through the
//     equator because 𝒜 has real coefficients.
//
// No axes, no ticks, no shading. A sphere with four dots on it is the entire content and anything
// else competes with it.
// ============================================================================
import type { ReactElement } from 'react'

const W = 460
const H = 300
const CX = 200
const CY = 150
const R = 118
/** The equator seen edge-on-ish: an ellipse squashed to this fraction of the radius. */
const TILT = 0.30

/** A dot with a label, positioned in sphere coordinates. */
function Dot({
  x, y, label, filled, dy = -12,
}: { x: number; y: number; label: string; filled: boolean; dy?: number }): ReactElement {
  return (
    <g>
      <circle cx={x} cy={y} r={5} fill={filled ? '#334155' : '#fff'} stroke="#334155" strokeWidth={1.6} />
      <text x={x + 10} y={y + dy + 12} fontSize={13} fill="#334155" fontStyle="italic">{label}</text>
    </g>
  )
}

export default function ParameterSphere(): ReactElement {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: 460, display: 'block', margin: '0.2em auto 0' }}
      role="img"
      aria-label="The Riemann sphere of the parameter, with its real equator and poles on and off it"
    >
      {/* the sphere */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#cbd5e1" strokeWidth={1.5} />

      {/* the equator: front half solid, back half dashed, so it reads as a sphere */}
      <path
        d={`M ${CX - R} ${CY} A ${R} ${R * TILT} 0 0 0 ${CX + R} ${CY}`}
        fill="none" stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="4 4"
      />
      <path
        d={`M ${CX - R} ${CY} A ${R} ${R * TILT} 0 0 1 ${CX + R} ${CY}`}
        fill="none" stroke="#0f172a" strokeWidth={2.6}
      />

      {/* the road label */}
      <text x={CX} y={CY + R * TILT + 26} fontSize={13} fill="#0f172a" textAnchor="middle" fontWeight={600}>
        the equator — real t, and ∞
      </text>

      {/* infinity, on the equator */}
      <Dot x={CX - R} y={CY} label="∞" filled dy={-22} />

      {/* a real pole, on the equator (front arc) */}
      <Dot x={CX + 52} y={CY + R * TILT * 0.86} label="r" filled dy={-4} />

      {/* a conjugate pair, off the equator, mirrored through it */}
      <Dot x={CX + 24} y={CY - 62} label="r&#x0304;" filled={false} />
      <Dot x={CX + 24} y={CY + 62} label="r" filled={false} dy={-4} />
      <line
        x1={CX + 24} y1={CY - 62} x2={CX + 24} y2={CY + 62}
        stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3"
      />

      {/* legend, kept to two lines */}
      <text x={CX + R + 14} y={CY - 60} fontSize={12.5} fill="#475569">on the route</text>
      <text x={CX + R + 14} y={CY - 44} fontSize={12.5} fill="#475569">→ unbounded</text>
      <text x={CX + R + 14} y={CY + 46} fontSize={12.5} fill="#475569">off the route</text>
      <text x={CX + R + 14} y={CY + 62} fontSize={12.5} fill="#475569">→ bounded</text>
    </svg>
  )
}

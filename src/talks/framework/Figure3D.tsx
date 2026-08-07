// ============================================================================
// The 3D sibling of FigureFrame — same chrome, a WebGL viewport instead of an SVG.
//
// There is no shared "viewport" abstraction with the 2D frame and there should not
// be: 2D pans and zooms a viewBox, 3D orbits a camera. What IS shared is the chrome
// (notation strip, readouts, caption, controls) and the HANDLE PROTOCOL — a figure
// says "here are draggable points, tell me when one moves" and does not care which
// dimension it is in.
//
// THREE LESSONS FROM src/sketcher/pages/LabPH3D.tsx, paid for once and baked in here
// so no figure has to rediscover them:
//
//   1. Drag by POINTER CAPTURE on the mesh, in the plane through the point facing
//      the camera. NOT drei's TransformControls gizmo — that was the original
//      "can't drag" complaint.
//   2. Disable the orbit controls SYNCHRONOUSLY through a ref at pointer-down. A
//      React `enabled` prop updates a render too late and the view is left stuck
//      rotating.
//   3. Warm-start each tick from the CURRENT state, never from the grab moment;
//      re-solving from the grab moment every frame is what made it jumpy.
//
// RENDERING — and a trap worth recording. `frameloop="demand"` DEADLOCKS orbiting.
// drei's TrackballControls calls controls.update() inside useFrame, and update() is
// what emits the 'change' event that triggers invalidate(). On demand, no frame runs
// until something invalidates, so: pointer moves → no frame → no update() → no
// 'change' → no invalidate → no frame. The view freezes and the figure reads as a
// still picture. (This is exactly what happened; LabPH3D works because it uses the
// default "always".) So: always. The live-context problem that motivated demand is
// solved at the slide level by WhenActive instead, and one to three canvases
// rendering continuously is not a real cost.
//
// CONTEXTS. Mount is gated by WhenActive at the slide level, not here — see
// framework/slideContext for why WebGL forces that and SVG does not.
// ============================================================================
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { Line, TrackballControls } from '@react-three/drei'
import * as THREE from 'three'
import { FIG } from './figureStyle'

export interface Bounds3D {
  min: [number, number, number]
  max: [number, number, number]
}

/** Shared so a draggable point can silence the orbit controls at pointer-down. */
const ControlsContext = createContext<{ current: { enabled: boolean } | null } | null>(null)

function Rig({ bounds }: { bounds: Bounds3D }) {
  const { camera } = useThree()
  const controls = useContext(ControlsContext)
  const target = useMemo(() => {
    const c = new THREE.Vector3(
      (bounds.min[0] + bounds.max[0]) / 2,
      (bounds.min[1] + bounds.max[1]) / 2,
      (bounds.min[2] + bounds.max[2]) / 2,
    )
    const radius =
      0.5 *
      Math.hypot(
        bounds.max[0] - bounds.min[0],
        bounds.max[1] - bounds.min[1],
        bounds.max[2] - bounds.min[2],
      )
    return { c, radius: Math.max(radius, 1e-3) }
  }, [bounds])

  // Frame once. TrackballControls owns the camera afterwards, so re-running this
  // on every bounds change would fight the viewer.
  useEffect(() => {
    const d = (target.radius / Math.sin((40 * Math.PI) / 360)) * 1.25
    camera.position.set(target.c.x + d * 0.55, target.c.y - d * 0.75, target.c.z + d * 0.45)
    camera.lookAt(target.c)
    camera.updateProjectionMatrix()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <TrackballControls
      ref={controls as never}
      makeDefault
      target={target.c}
      rotateSpeed={3}
      zoomSpeed={1.2}
      noPan
    />
  )
}

// ---------------------------------------------------------------------------
// Marks
// ---------------------------------------------------------------------------

export interface Point3DProps {
  position: readonly [number, number, number]
  color?: string
  radius?: number
  /** Hollow-looking: a derived point, not yours to move. */
  derived?: boolean
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
}

/** A control point. `derived` renders it pale, matching the 2D figures' hollow dot. */
export function Point3D({ position, color, radius = 0.055, derived, onPointerDown }: Point3DProps) {
  return (
    <mesh position={position as [number, number, number]} onPointerDown={onPointerDown}>
      <sphereGeometry args={[radius, 24, 16]} />
      <meshStandardMaterial
        color={color ?? (derived ? FIG.color.derived : FIG.color.dataPoint)}
        roughness={0.45}
        metalness={0.05}
      />
    </mesh>
  )
}

export interface DragPoint3DProps {
  position: readonly [number, number, number]
  onDrag: (p: [number, number, number]) => void
  onDragStart?: () => void
  onDragEnd?: () => void
  color?: string
  radius?: number
}

/**
 * A draggable control point. Dragging happens in the plane through the point facing
 * the camera — two screen degrees of freedom mapped onto the most natural three, and
 * the reason the view is worth rotating between drags.
 */
export function DragPoint3D({
  position,
  onDrag,
  onDragStart,
  onDragEnd,
  color,
  radius = 0.07,
}: DragPoint3DProps) {
  const controls = useContext(ControlsContext)
  const plane = useRef<THREE.Plane | null>(null)
  const camDir = useMemo(() => new THREE.Vector3(), [])
  const hit = useMemo(() => new THREE.Vector3(), [])

  return (
    <mesh
      position={position as [number, number, number]}
      onPointerDown={(e) => {
        e.stopPropagation()
        ;(e.target as Element).setPointerCapture(e.pointerId)
        // Synchronously, before TrackballControls turns this into a rotation.
        if (controls?.current) controls.current.enabled = false
        e.camera.getWorldDirection(camDir)
        plane.current = new THREE.Plane().setFromNormalAndCoplanarPoint(
          camDir.clone(),
          new THREE.Vector3(...(position as [number, number, number])),
        )
        onDragStart?.()
      }}
      onPointerMove={(e) => {
        if (!plane.current) return
        e.stopPropagation()
        if (!e.ray.intersectPlane(plane.current, hit)) return
        onDrag([hit.x, hit.y, hit.z])
      }}
      onPointerUp={(e) => {
        if (!plane.current) return
        ;(e.target as Element).releasePointerCapture(e.pointerId)
        plane.current = null
        if (controls?.current) controls.current.enabled = true
        onDragEnd?.()
      }}
    >
      <sphereGeometry args={[radius, 24, 16]} />
      <meshStandardMaterial color={color ?? FIG.color.dataPoint} roughness={0.4} metalness={0.05} />
    </mesh>
  )
}

/** A polyline through world points. */
export function Curve3D({
  points,
  color,
  width = 3,
  dashed,
}: {
  points: readonly (readonly [number, number, number])[]
  color?: string
  width?: number
  dashed?: boolean
}) {
  if (points.length < 2) return null
  return (
    <Line
      points={points as [number, number, number][]}
      color={color ?? FIG.color.curve}
      lineWidth={width}
      dashed={dashed}
      dashScale={40}
    />
  )
}

// ---------------------------------------------------------------------------
// The frame
// ---------------------------------------------------------------------------

export interface Figure3DProps {
  bounds: Bounds3D
  /** Canvas height in CSS pixels. */
  height?: number
  notation?: readonly string[]
  readouts?: readonly { label: string; value: string; tone?: 'ok' | 'warn' | 'plain' }[]
  caption?: ReactNode
  controls?: ReactNode
  children: ReactNode
}

const TONE: Record<string, string> = {
  ok: 'text-emerald-600',
  warn: 'text-amber-600',
  plain: 'text-slate-600',
}

export default function Figure3D({
  bounds,
  height = 380,
  notation,
  readouts,
  caption,
  controls,
  children,
}: Figure3DProps) {
  const controlsRef = useRef<{ enabled: boolean } | null>(null)

  return (
    <div className="flex flex-col items-stretch gap-1">
      {notation && notation.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 font-mono text-[0.42em] text-slate-500">
          {notation.map((n, i) => (
            <span key={i}>{n}</span>
          ))}
        </div>
      )}

      <div
        style={{ height, background: FIG.color.background, border: `1px solid ${FIG.color.border}` }}
        className="w-full rounded overflow-hidden touch-none"
      >
        <ControlsContext.Provider value={controlsRef}>
          <Canvas camera={{ fov: 40, up: [0, 0, 1], near: 0.01, far: 500 }}>
            <Rig bounds={bounds} />
            <ambientLight intensity={0.65} />
            <directionalLight position={[4, -5, 6]} intensity={0.75} />
            <directionalLight position={[-4, 3, -2]} intensity={0.25} />
            {children}
          </Canvas>
        </ControlsContext.Provider>
      </div>

      {(readouts?.length || controls) && (
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 font-mono text-[0.42em]">
          {readouts?.map((r, i) => (
            <span key={i} className={TONE[r.tone ?? 'plain']}>
              <span className="text-slate-400">{r.label} </span>
              {r.value}
            </span>
          ))}
          {controls}
        </div>
      )}

      {caption && (
        <div className="text-center text-[0.44em] leading-snug text-slate-600 max-w-[46em] mx-auto">
          {caption}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// THE STATUS TAG AND THE SOURCE LINE — the honesty furniture a review deck needs.
//
// docs/THE_LATTICE.md section 5 names the quiet failure of this kind of work: presenting known
// material as discovery. Its defence is a tag on every claim. These two components put that on the
// SCREEN rather than only in a doc — a reader sees at a glance what is settled, whose it is, what
// was measured here, and where the edge is.
//
//   LIT   believed to be in the literature — a POINTER TO CHECK, not a fact yet
//   THM   proved, ours or cited precisely
//   MEAS  measured here, with a pinning test named
//   OPEN  not known to us — which is NOT the same as "nobody knows"
//
// Extracted from two-points-or-a-circle when a second deck adopted the convention, exactly as that
// deck's header said to do.
// ============================================================================
import type { ReactNode } from 'react'

export type Status = 'LIT' | 'THM' | 'MEAS' | 'OPEN'

export const TAG_COLOR: Record<Status, string> = {
  LIT: '#8aa8c8',
  THM: '#8fc99b',
  MEAS: '#d8b978',
  OPEN: '#d89a9a',
}

/** The status chip in the corner of a slide. Accepts one status or several. */
export function Tag({ status }: { status: Status | Status[] }): ReactNode {
  const all = Array.isArray(status) ? status : [status]
  return (
    <span
      style={{
        position: 'absolute',
        top: '0.6em',
        right: '0.9em',
        display: 'flex',
        gap: '0.4em',
        fontSize: '0.42em',
        letterSpacing: '0.18em',
        fontWeight: 400,
        opacity: 0.75,
      }}
    >
      {all.map((s) => (
        <span
          key={s}
          style={{
            color: TAG_COLOR[s],
            border: `1px solid ${TAG_COLOR[s]}`,
            borderRadius: '0.25em',
            padding: '0.15em 0.5em',
          }}
        >
          {s}
        </span>
      ))}
    </span>
  )
}

/** The source line at the foot of a slide. A borrowed statement without one is the failure above. */
export function Cite({ children }: { children: ReactNode }): ReactNode {
  return (
    <div
      style={{
        position: 'absolute',
        left: '1.4em',
        right: '1.4em',
        bottom: '0.5em',
        fontSize: '0.38em',
        lineHeight: 1.4,
        opacity: 0.55,
        textAlign: 'left',
        fontStyle: 'italic',
      }}
    >
      {children}
    </div>
  )
}

/** The legend, for a title slide. Every deck using the tags should show it before slide 1. */
export function TagLegend(): ReactNode {
  const rows: [Status, string][] = [
    ['LIT', 'published elsewhere — a pointer, cited'],
    ['THM', 'proved, ours or cited precisely'],
    ['MEAS', 'measured here, with a pinning test named'],
    ['OPEN', 'not known to us'],
  ]
  return (
    <div
      style={{
        marginTop: '1.2em',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: '0.35em 1em',
        fontSize: '0.42em',
        lineHeight: 1.5,
        maxWidth: '26em',
        marginLeft: 'auto',
        marginRight: 'auto',
        textAlign: 'left',
        opacity: 0.8,
      }}
    >
      {rows.flatMap(([s, text]) => [
        <span key={s} style={{ color: TAG_COLOR[s], letterSpacing: '0.14em' }}>
          {s}
        </span>,
        <span key={`${s}-text`}>{text}</span>,
      ])}
    </div>
  )
}

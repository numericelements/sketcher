// ============================================================================
// THE DECK SOURCES CONTAIN NO STRAY BACKSLASHES OUTSIDE THEIR MATH.
//
// This exists because a backslash bug shipped TWICE and neither tsc, eslint nor the build noticed —
// they cannot, since `&apos\;s` is valid TypeScript, valid JSX and valid JavaScript. It is only wrong
// on the screen. A one-off script meant to correct KaTeX spacing macros instead prepended a backslash
// to every prose semicolon in a deck, breaking six author lists and two possessives; the first repair
// then skipped any line containing `<Math>`, which left the inline ones broken.
//
// The rule this pins: a backslash may appear in a slide file ONLY inside a KaTeX payload — the inside
// of `{'…'}` or `{"…"}`. Everywhere else (JSX prose, presenter notes, comments) it is a mistake, and
// an HTML entity carrying one is a visible mistake.
// ============================================================================
import { describe, it, expect } from 'vitest'

// Vite's raw glob rather than node:fs — this program's `types` is vite/client only, and a test that
// stays inside the typechecked program is worth more than one that reaches for the filesystem.
const SLIDES = import.meta.glob('../*/slides.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** The character ranges that are genuine KaTeX payloads: the inside of {'…'} or {"…"}. */
function payloadRanges(src: string): [number, number][] {
  const out: [number, number][] = []
  let i = 0
  while (i < src.length) {
    if (src[i] === '{' && (src[i + 1] === "'" || src[i + 1] === '"')) {
      const quote = src[i + 1]
      let j = i + 2
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue }
        if (src[j] === quote) break
        j++
      }
      out.push([i + 2, j])
      i = j + 1
    } else {
      i++
    }
  }
  return out
}

describe('slide sources', () => {
  it('carry no backslash outside a KaTeX payload', () => {
    expect(Object.keys(SLIDES).length, 'the decks were found at all').toBeGreaterThan(1)
    for (const [file, src] of Object.entries(SLIDES)) {
      const ranges = payloadRanges(src)
      const inPayload = (k: number): boolean => ranges.some(([a, b]) => k >= a && k < b)
      // Outside a KaTeX payload the only legitimate backslash is one that starts a REAL JavaScript
      // escape — \\ \' \" \n \t \r ′ \x1b and so on. A backslash before anything else is the bug
      // this test exists for: it survives tsc, eslint and the build, and shows up only on screen.
      const LEGAL = new Set(['\\', "'", '"', '`', 'n', 't', 'r', 'b', 'f', 'v', '0', 'u', 'x'])
      const offenders: string[] = []
      for (let k = 0; k < src.length; k++) {
        if (src[k] !== '\\' || inPayload(k)) continue
        if (LEGAL.has(src[k + 1] ?? '')) {
          k++
          continue
        }
        offenders.push(src.slice(Math.max(0, k - 40), k + 10).replace(/\n/g, ' '))
      }
      if (offenders.length > 0) {
        console.log(`    ${file}:\n      ${offenders.slice(0, 8).join('\n      ')}`)
      }
      expect(offenders, `${file}: backslash outside KaTeX`).toHaveLength(0)
    }
  })

  it('carry no HTML entity broken by a backslash', () => {
    // The visible failure mode, checked directly so the diagnosis is obvious when it fires.
    for (const [file, src] of Object.entries(SLIDES)) {
      const broken = src.match(/&[a-zA-Z]+\\+;/g) ?? []
      expect(broken, `${file}: entities such as &amp; must not carry a backslash`).toHaveLength(0)
    }
  })
})

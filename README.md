# Numeric Elements

The [numericelements.com](https://numericelements.com) website — interactive
B-spline curve design with control of curvature extrema.

[![The sketcher b-spline editor — a degree-3 B-spline curve with its control polygon and live basis functions](docs/screenshot.png)](https://numericelements.com/sketcher)

Try the B-spline sketcher editor → [**sketcher**&thinsp;<sup><small>b-spline</small></sup>](https://numericelements.com/sketcher)

## The mathematics, and where to read it

This repository is the reference implementation of **curvature-extrema
controlled curve editing** (the St-Malo work, Curves & Surfaces 2026): drag
anything — control points, weights, Farin handles — and the number of
curvature extrema can only stay or drop, never grow behind your back.

Start here, in order:

1. [`CLAUDE.md`](CLAUDE.md) — **the laws**: the three rules every line of
   solver, display and test code answers to.
2. [`docs/ARTICLE.md`](docs/ARTICLE.md) — the article draft: the whole story
   in paper form; every number it cites is a named test in this repo.
3. [`docs/THE_IDEAS.md`](docs/THE_IDEAS.md) — the eight core contributions,
   each with its invariant, its home in the code, and its pinning test.
4. [`docs/CURVATURE_FOUNDATIONS.md`](docs/CURVATURE_FOUNDATIONS.md) — the
   textbook of established facts (each studied once, with evidence).
5. [`docs/LAB_NOTEBOOK_DRAG.md`](docs/LAB_NOTEBOOK_DRAG.md) — the experiment
   log (E1–E27), failed hypotheses kept alongside the confirmed ones.

The math library lives in [`src/core`](src/core); the editor in
[`src/sketcher`](src/sketcher). `bun run test` reproduces the evidence (a few
lab tests comparing against a private sibling repository skip themselves
automatically when it is absent).

## Stack

React 19 · React Router 7 · Vite 7 · TypeScript · Tailwind CSS 4 · Vitest

## Develop

```bash
bun install
bun run dev      # http://localhost:5173
bun run build    # type-check + production build to dist/
bun run test     # unit tests
```

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// Five lab tests compare against Eric's reference stack in a SIBLING repo
// (../../numericelements/git/closed-curve). For any clone without that repo,
// vitest would fail at COLLECTION (static imports resolve before it.skip can
// save you), so they are excluded unless the stack is present. The same five
// are excluded from tsc in tsconfig.app.json for the same reason.
const here = dirname(fileURLToPath(import.meta.url))
const ericStack = resolve(here, '../../git/closed-curve')
const externalStackTests = [
  'src/core/__tests__/ericClosedCurveOracle.test.ts',
  'src/core/__tests__/labE1PinnedWeights.test.ts',
  'src/core/__tests__/labE7EricSolverCoreProblem.test.ts',
  'src/core/__tests__/labE15bEricScale.test.ts',
  'src/core/__tests__/labE15cEricSolverCoreProblemScale.test.ts',
]

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      ...(existsSync(ericStack) ? [] : externalStackTests),
    ],
  },
})

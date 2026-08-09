// ============================================================================
// Cached conformal PH members, as DATA.
//
// findMember searches from random seeds and rejects on guards, which takes ~19 s at degree 6 — not
// something a slide can do while a room waits. So the member a figure opens on is pinned here
// instead, and conformalPHStructure.test.ts asserts its residual is machine zero and its guards
// still hold. That keeps it a COMPUTED member that happens to be cached, rather than a hand-tuned
// set of numbers: if an edit to the family's algebra ever invalidates it, the test goes red.
// ============================================================================
import { type ConformalPHCurve, unpack } from './conformalPHCurve'

/**
 * Degree 6. From findMember with irreducible, minOutOfPlane 0.05, minCurvatureSpread 0.35,
 * minRadiusRatio 0.08, minWeightRatio 0.2, minSpanRatio 0.3. Residual 7.6e-14, no real roots of w
 * (so a genuine sextic, not a lower-degree curve wearing a sextic polygon), out-of-plane 0.315,
 * curvature spread 0.487.
 */
export const SEXTIC_SEED: readonly number[] = [
  1.0000000000000000, -4.6419801538885022, 0.35616347555412059, 2.8581467846072357, 14.921917606387098,
  1.0440184584389132, -4.4597329020000922, 1.1145373764184732, 2.8716767178116229, 13.727865289420189,
  0.81048957604275085, -2.8607945041111056, 1.1483527205555004, 1.9495969481407056, 8.0233067162176734,
  0.59693891284296574, -1.9753510726269143, 0.31933302552549092, 0.76317945921691277, 3.1605378168749367,
  1.1716541583245539, -5.4628126508208101, 1.1401200768355209, 1.7135667385283888, 14.316501480187380,
  1.1809511030401270, -5.8937136717820371, 1.3528930126698582, 2.4443302858926192, 17.785832837838278,
  0.81881780767324797, -4.1734865595308310, 1.0048586751009669, 2.1887171072170051, 14.177887545528225,
  -5.0686641246071131, -1.9661840771846917, -1.9245176731756961, -2.1936334129931492, -2.3663811006925703,
  -4.3784918439738147,
]

export const sexticSeed = (): ConformalPHCurve => unpack(SEXTIC_SEED)

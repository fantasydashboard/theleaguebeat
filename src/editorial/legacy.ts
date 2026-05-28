/**
 * All-time legacy score — a transparent, *defined* metric.
 *
 *   legacy = titles x100  +  playoff berths x30
 *          + career win% x100  +  career cat wins x0.1
 *
 * Winning the whole thing is weighted hardest (a ring is 100, and would
 * take 1,000 cats to match), then reaching the bracket (30 each), then
 * how dominant you were rate-wise (win% x100). The cat-wins term rewards
 * the league's own currency: it lifts long-tenured grinders above
 * one-season cameos and makes sure the all-time cat king actually shows
 * up near the top, without ever letting volume eclipse a championship.
 *
 * The History page renders `LEGACY_FORMULA_LABEL` right under the
 * section headline, so the number is never a black box: the reader can
 * see exactly how it was built. Both the live adapter aggregation and
 * the demo fixture path call `computeLegacyScore`, so the displayed
 * formula always matches the displayed number.
 */

export const LEGACY_WEIGHTS = {
  title: 100,
  playoff: 30,
  winPct: 100,
  catWin: 0.1,
} as const

/** Shown verbatim on the page. Uses the multiplication sign, not "x". */
export const LEGACY_FORMULA_LABEL =
  'Legacy = titles ×100 + playoff berths ×30 + win% ×100 + cat wins ×0.1'

export function computeLegacyScore(o: {
  titles: number
  playoffApps: number
  careerWinPct: number
  totalCatWins: number
}): number {
  return Math.round(
    o.titles * LEGACY_WEIGHTS.title +
      o.playoffApps * LEGACY_WEIGHTS.playoff +
      o.careerWinPct * LEGACY_WEIGHTS.winPct +
      o.totalCatWins * LEGACY_WEIGHTS.catWin,
  )
}

# Football Voice (Phase 3)

**Date:** 2026-08-30
**Status:** Approved design, pre-implementation
**Deadline:** NFL regular season starts ~2026-09-10. ~11 days.
**Related:** `2026-08-28-football-sleeper-design.md` (Phases 1-2, shipped), `EDITORIAL.md` (the voice — not re-litigated here)

## Goal

Football stories read like football. Today they render through the points
path, which is sport-neutral prose with one baseball idiom in it.

## The finding that sets the scope

Phase 1-2's spec assumed Phase 3 meant writing football equivalents of the
baseball variant libraries — ~11,000 lines across `home.ts`, `pr.ts`,
`matchups.ts`, `lede.ts`, `swings.ts`, `draft.ts`, `history.ts`. Measured
against the code, that is wrong in a useful direction.

**The points render path is already almost sport-neutral.** `render-beat-points.ts`
and `render-matchups-points.ts` total ~1,000 lines and contain exactly **one**
baseball-specific idiom: `"Decided in the final at-bats."` Everything else
("The ladder has a new leader", "The slide isn't slowing", "Ten in a row for X")
works for any sport scored in points.

So Phase 3 is not a translation project. It is two much smaller jobs:

1. **Fix the leak.** One string.
2. **Give football an idiom.** This is the actual work, and the actual value.

Neutral copy is safe and bland. Bland is the documented failure mode — the
memo's own reference point is Yahoo's backlash over soulless recaps. A reader
should be able to tell the recap was written about *football*, not merely that
it avoided saying "at-bats".

## Locked decisions

1. **`EDITORIAL.md` governs.** Seven rules, the verb register, the banned list,
   the 15 canonical sentences. Football copy is a new dialect of that voice, not
   a new voice. Two of the canonical sentences are already football
   (`"Nabers vanished. Three catches on seven targets."`), so the manifesto
   anticipates this.
2. **New files, never edits to the baseball libraries.** Baseball is live and
   in season. Selection happens at the render layer via `sportOf(data)`. This
   makes "cannot regress baseball" a structural property, not a promise.
3. **Scope is bounded by what football actually detects.** Not 100 story types —
   the ~15 football emits today (see below). Everything else keeps the neutral
   points copy, which is honest rather than wrong.
4. **Fall through to neutral, never to baseball.** If football has no variant for
   a story type, the neutral points copy renders. A missing football variant
   produces plainer prose, never a wrong-sport idiom.
5. **No new detectors.** Phase 3 is copy only. Waiver-wire stories are a
   Phase 3.5 follow-on (they need `transactions` on the points contract).

## The bounded surface

Football emits these today, verified by running the pipeline against a real
captured league across weeks 8, 14 and 17:

| Source | Story types |
| --- | --- |
| `detection/points.ts` | `points-blowout`, `points-photo-finish`, `points-high-score`, `points-low-score`, `points-shootout`, `points-rock-fight` |
| `detection/streaks.ts` | `streak-built`, `streak-broken`, `consistency-award`, `inconsistency-award`, `basement-streak`, `throne-streak`, `three-week-comeback`, `three-week-collapse` |
| `detection/seasonStage.ts` | `opening-week`, `quarter-pole`, `halfway-point`, `last-four-weeks`, `last-two-weeks`, `final-week`, `playoff-opener`, `semifinal-week`, `championship-week`, `trade-deadline-week` |
| `detection/cadence.ts` | `monday-recap`, `midweek-trade-talk`, `friday-preview`, `sunday-final-push` |

The `points-*` six are where football's voice lives — they are the stories that
only exist because the sport is scored in points. The rest are shared concepts
where football mainly needs its own nouns and rhythm.

## What "sounds like football" means concretely

Football's idiom is distinct from baseball's in ways that matter to the copy:

| | Baseball | Football |
| --- | --- | --- |
| Cadence | daily, a grind | **one game a week**, each one heavy |
| Losing | "cold stretch" | **"a wasted week"** — there are only 14 |
| Scoring | categories won | **points hung**: "hung 140 on them" |
| Regret | a bad start | **the bench**: "left 31 on the bench" |
| Roster pain | injuries, slumps | **byes**, questionable tags, inactives |
| Blowout | a sweep | **"never a game"**, "up 40 by the 4pm slate" |
| Close game | last at-bats | **"came down to Monday night"** |

That last row is the one to get right. A football week does not end on Sunday —
it ends on Monday night, and "it came down to MNF" is the single most
football-specific sentence available. It is also honest: `previousWeekMatchups`
is the closed week, so the copy can say so.

## Architecture

```
render-beat-points.ts / render-matchups-points.ts
  → variantFor(storyType, sportOf(data), ctx)
      ├── src/editorial/football/*.ts   ← NEW, when sport is 'nfl' and a variant exists
      └── the existing neutral points copy   ← fallback, unchanged
```

| Unit | Purpose |
| --- | --- |
| `src/editorial/football/points.ts` | Variants for the six `points-*` types. The heart. |
| `src/editorial/football/streaks.ts` | Football framing for streak and consistency stories. |
| `src/editorial/football/seasonStage.ts` | A 14-week calendar reads differently from a 22-week one. |
| `src/editorial/football/index.ts` | `footballVariantFor(type, ctx)` → variant or `null`. |
| render wiring | `sportOf(data) === 'nfl'` → try football, else neutral. |

`footballVariantFor` returning `null` is the fallback path and must stay cheap
and total — no throwing, no partial strings.

## Testing

- **Voice conformance is testable and will be tested.** A lint-style test over
  every football variant asserting: no em dashes, no `--`, no emoji, no
  exclamation points, no banned intensifiers (`incredible`, `amazing`, `epic`,
  `absolutely`, `literally`, `actually`, `really`, `very`, `truly`), no
  second-person `you`, no question-mark headlines. These are mechanical rules
  from `EDITORIAL.md` and a machine should enforce them, not a reviewer's eye.
- **No baseball terms in football copy** — the inverse of the leak that started
  this: assert no `at-bat`, `inning`, `bullpen`, `dinger`, `mound`, `strikeout`.
- **Sentence-length distribution** — assert the corpus skews short (median under
  10 words), matching the manifesto's 70/25/5 target. A library that drifts into
  uniform 12-word sentences fails.
- **Fallback** — a football story type with no variant renders the neutral copy,
  never an empty string and never baseball's.
- **Baseball regression is a release gate**, as in Phases 1-2: full suite green,
  demo reel byte-identical.

## Non-goals

Basketball and hockey; new detectors; waiver-wire stories (Phase 3.5 — needs
`transactions` on the points contract); un-gating the views (Phase 4); the
Draft and History tabs, which football does not reach yet.

## Risks

1. **Volume is the enemy of quality here.** The temptation under deadline is to
   generate many variants quickly. Six strong variants per story type beat twenty
   weak ones — the weak ones are what get read as templated, which is the failure
   mode the manifesto names first.
2. **Only one real league to check against.** The captured fixture is a 10-team
   half-PPR league. Copy tuned to it may read oddly for a 12-team superflex.
   Thresholds are already relative; the copy should avoid implying a league size
   or scoring format.
3. **Preseason means the honest test is thin.** Until real games are played,
   football copy can only be judged against a completed 2025 season. That is a
   real test but not a live one.

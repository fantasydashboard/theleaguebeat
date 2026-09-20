# One Issue, all sports

Written 19 Sept 2026. Goal: bring baseball onto the Issue architecture
football now uses, so hockey and basketball are repeats rather than
inventions.

**Headline: the football work is already sport-agnostic. The directory
name `points/` is lying about it.**

---

## What I measured

Of the eighteen modules in `src/editorial/points/`, **fourteen contain
no points type at all**:

| generic (14) | points-typed (4) |
|---|---|
| `matchupStorylines` `wireFacts` `recordWatch` `recordBook` `headToHead` `luck` `draftBoard` `draftStory` `draftValue` `projectedSeason` `rosterStrength` `seasonHistory` `sleeperProjections` `playerIdBridge` | `powerScore` `previousBoard` `upsets` `liveRemaining` |

Everything built this session — storylines, the wire's contest
commentary, the weekly record book, head-to-head — is already portable.
It sits in a folder called `points` because that is where football
happened to be written, not because it is football-shaped.

**The Issue builder is generic too.** `buildWeeklyIssue` takes a plain
`WeeklyIssueInput` — league name, week, records, results, transactions,
careers, callbacks — not a `LeagueData` union. It has no idea what sport
it is describing.

**There is exactly one coupling point: `loadIssue.ts`**, which adapts
`LeagueDataH2HPoints` → `WeeklyIssueInput`. That is the file to
duplicate, not the architecture.

---

## The gap, precisely

Baseball today renders the **old three-tab experience** —
`CategoryDemo{PowerRankings,Matchups,Draft,History}View`. Football
renders **the Issue**. Those are different products sharing a brand.

To close it, four things:

### 1. `results` is the only shape mismatch

```ts
LeagueDataPointsMatchup     { homePoints, awayPoints, status }
CategoryLeagueDataMatchup   { homeCatWins, awayCatWins, ties, contestedCount }
```

`WeeklyIssueInput.results` is typed to the points one. Everything
downstream wants the same three facts: who won, by how much, and was it
close. So introduce a normalised result the Issue consumes:

```ts
interface IssueResult {
  id: string
  homeTeamId: string; awayTeamId: string
  status: 'upcoming' | 'live' | 'final'
  /** The figure each side put up — points, or categories won. */
  homeScore: number; awayScore: number
  /** How the margin should read: "by 31.7" vs "7-3-1". */
  render: 'points' | 'categories'
  ties?: number
}
```

Both adapters map into it. No section has to branch on sport; they
branch on `render`, which is a presentation fact, not a sport fact.

### 2. `records` already works

`loadIssue` maps `standings.catWins/catLosses/catTies` into
`records.wins/losses/ties` — **for football**. The contract already uses
category vocabulary for a points league, so baseball needs no change
here at all. That is a nice accident of the original design.

### 3. Four modules need a category path

- **`powerScore`** — baseball already has its own power ranking; the
  job is to emit the same `PowerRow` shape, not to rewrite the maths.
- **`upsets`** — gates on board position and margin. Margin in
  categories is "won 8-2", so it needs the normalised result above.
- **`previousBoard`** — rewinds a week to show movement. Baseball's
  equivalent rewinds category records.
- **`liveRemaining`** — football-specific (who is still playing on
  Sunday). Baseball's analogue is the overnight/daily beat, which
  already exists in `detection/overnight.ts`.

### 4. Rename the folder

`src/editorial/points/` → `src/editorial/facts/`. Fourteen of eighteen
files are already sport-neutral and the name actively misleads the next
person deciding whether hockey can reuse them. Mechanical, and worth
doing before two more sports arrive and inherit the confusion.

---

## Why this order helps hockey and basketball

Once `IssueResult` exists and `loadIssue` has a category sibling, a new
**category** sport needs only:

1. an adapter producing `CategoryLeagueData`
2. a category dictionary (stat ids → label, side, lowerIsBetter)
3. copy texture

and nothing in the Issue layer at all. Hockey and basketball are both
commonly category, so they land on the sibling baseball is about to
prove.

A new **points** sport needs the football path, which already exists.

That is the real prize here: the second category sport costs an adapter,
and the third costs an adapter.

---

## Plan

**Phase 1 — normalise the result.** Add `IssueResult`, map the points
adapter onto it, keep football byte-identical. Tests should not move.

**Phase 2 — `loadCategoryIssue`.** The sibling adapter. Baseball renders
an Issue with results, wire, trades, record book and head-to-head —
every generic module — and no power/upset section yet.

**Phase 3 — the four category paths.** `powerScore`, `upsets`,
`previousBoard`, and baseball's answer to `liveRemaining`. Baseball's
Issue is now complete.

**Phase 4 — rename `points/` → `facts/`** and correct CLAUDE.md, which
still says a new category sport needs its own detectors. It does not;
that was measured and disproved on 18 Sept.

**Phase 5 — hockey.** Adapter plus dictionary, on the proven path.

---

## What I have not verified

- **Whether baseball's existing power ranking can emit `PowerRow`
  unchanged.** It predates that shape; it may need a translation layer
  rather than a rename.
- **Whether the old category views should be retired or kept.** The
  three tabs are shipped and working; the Issue may sit beside them
  before it replaces them. That is a product call, not a technical one.
- **How much baseball copy assumes the old view structure.** ~100
  detectors feed the current pages; the Issue sections select from the
  same candidates, but the mapping is unproven.

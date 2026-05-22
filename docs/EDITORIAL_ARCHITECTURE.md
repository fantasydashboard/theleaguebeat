# Editorial Architecture — The League Beat

The system that turns a league's data into a magazine issue, every visit.

This is the architecture spec. For the brand-voice rules every
auto-generated sentence has to clear, see [`EDITORIAL.md`](../EDITORIAL.md).

---

## The mental model

Every visit to the home page is a freshly-composed magazine **issue**.
An issue is a set of **stories** detected from the league's data and
ordered by importance + freshness + personalization. Each story renders
as a **section** in the page; sections vary in order, type, and even
presence from issue to issue.

The contrast with a dashboard is structural:

| Dashboard | Magazine issue |
|---|---|
| Same widgets every visit | Variable sections per issue |
| Same priority always | Priority driven by what's happening |
| One layout | Many layouts |
| Drives off latest snapshot | Drives off events + state |
| User reads same thing twice | Each visit has new lead |

The home page is the cover of this week's issue. The Power Rankings,
Matchups, Draft, and History pages are the recurring columns. The
detection + selection + composition pipeline is the editorial desk
that decides what's in this week's issue.

---

## The four layers

```
┌─────────────────────────────────────────────────────────────────┐
│ DATA          CategoryLeagueData from per-platform adapters    │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│ DETECTION     ~130 per-category detectors emit StoryCandidate[] │
│               (standings, matchups, streaks, season-stage, etc.)│
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│ SELECTION     Score each candidate. Rank. Dedupe. Take top N.  │
│               score = weight × freshness × personalization      │
│                       × impression-decay                        │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│ COMPOSITION   Selected stories → IssueSection[] with variable   │
│               order, conditional presence, season-stage          │
│               inserts                                            │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│ RENDER        Vue components per section type                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## The story taxonomy

130+ story types organized in 13 categories. Each detector function
emits zero-or-more `StoryCandidate` objects from a `CategoryLeagueData`
input.

### A. Standings (~18)

| Type | Trigger |
|---|---|
| `new-throne` | Rank-1 team changed this week |
| `dynasty-falling` | Former #1 dropped to rank 4+ |
| `hot-climber` | Gained 4+ spots since W1 |
| `bubble-surprise` | Just moved into bubble band |
| `comeback-team` | Was rank ≥8 three weeks ago, now ≤6 |
| `identity-shift` | Cat profile flipped (was bleeder, now owner) |
| `quiet-day` | Fallback when nothing else fires (low weight) |
| `newcomer-breakout` | Sub-.500 team won their week 7+ cats |
| `locked-#1-seed` | Mathematically can't be caught |
| `mathematical-elimination` | Can't reach playoffs |
| `first-time-playoffs` | This week first time above bubble all season |
| `first-above-.500` | Crossed .500 line first time all season |
| `first-below-.500` | Dropped below .500 first time all season |
| `division-lead-change` | New leader in N or S division |
| `wild-card-shift` | Position changed in wild-card race |
| `3-way-tie-bubble` | 3+ teams tied for last spot |
| `spoiler-mode` | Eliminated team beating a contender |
| `dethroned-rivalry` | Two former champs trading the lead |

### B. Matchups (~16)

cat-sweep, cat-shutout, photo-finish, comeback-win, blowout,
punt-success, punt-failure, matchup-of-week, worst-matchup,
razor-close, rematch, playoff-rematch, division-clash, stakes-week,
spoiler-watch, lineup-mistake

### C. Streaks (~8)

streak-broken, streak-built, consistency-award, inconsistency-award,
basement-streak, throne-streak, 3-week-comeback, 3-week-collapse

### D. Categories (~9)

cat-king-change, cat-sweep-streak, cat-collapse, cat-parity,
cat-domination, cat-blowout-race, cat-punt-vindicated,
cat-balance-paradox, cat-extreme-profile

### E. Transactions (~10) — needs new data

blockbuster-trade, lopsided-trade, trade-deadline-approaching,
waiver-winner, waiver-desperation, FAAB-blowout, cut-alert,
IL-placement, IL-return, drop-and-pickup-redemption

### F. Players (~12) — needs new data

monster-night, 3-HR-game, 12+-K-game, no-hitter, hat-trick,
comeback-by-one-player, quietly-great-week, ownership-spike,
hot-streak-alert, slump-alert, surprise-rookie,
real-mlb-trade-impact

### G. Season stage (~13)

opening-week, post-draft-autopsy, quarter-pole, all-star-break,
trade-deadline-week, halfway-point, three-quarter-mark,
last-4-weeks, last-2-weeks, final-week, playoff-opener,
semifinal-week, championship-week

### H. Day-of-week cadence (~5)

monday-recap, midweek-trade-talk, friday-preview,
sunday-final-push, off-day-deep-dive

### I. Personalization (~9) — needs new infra

your-team-first-feature, your-rivals-hot-streak, your-bubble-status,
your-team-eliminated, your-team-clinched, your-key-matchup,
welcome-back-after-absence, your-best-week, your-worst-week

### J. Anniversary / history (~5)

one-year-since-championship, one-year-since-loss,
league-anniversary, repeating-pattern, same-matchup-as-last-year

### K. Commissioner / league (~5)

commissioner-change, rule-change, settings-updated,
new-member, league-rename

### L. Notable absences (~4)

lineup-not-set, empty-roster-spot, pending-trade-expiring,
waiver-claims-due

### M. Division-specific (~5)

division-race-tight, division-locked-up, division-rival-streak,
cross-division-power-shift, divisional-wild-card-implication

---

## File structure

```
src/editorial/
├── EDITORIAL.md                  # voice manifesto (root)
├── detection/
│   ├── types.ts                  # StoryCandidate, StoryType, SeasonStage
│   ├── helpers.ts                # shared math (rank-at-week, etc.)
│   ├── index.ts                  # detectAll() orchestrator
│   ├── standings.ts              # 18 story types
│   ├── matchups.ts               # 16 story types
│   ├── streaks.ts                # 8 story types
│   ├── categories.ts             # 9 story types
│   ├── transactions.ts           # 10 story types (TODO: data)
│   ├── players.ts                # 12 story types (TODO: data)
│   ├── seasonStage.ts            # 13 story types
│   ├── cadence.ts                # 5 day-of-week stories
│   ├── personalization.ts        # 9 user-specific (TODO: infra)
│   ├── anniversary.ts            # 5 historical (TODO: metadata)
│   ├── commissioner.ts           # 5 league events (TODO: data)
│   ├── absences.ts               # 4 missing-action
│   └── divisions.ts              # 5 division-specific
├── selection.ts                  # selectStoriesForIssue()
├── composition.ts                # composeIssue() — variable layout
├── render.ts                     # legacy hero/playoff/ticker renderer (used until composition takes over)
├── render-pr.ts                  # power-rankings page renderer
├── render-matchups.ts            # matchups page renderer
├── render-draft.ts               # draft page renderer
├── render-history.ts             # history page renderer
├── home.ts                       # variant library (Home headlines)
├── pr.ts                         # variant library (PR copy)
├── matchups.ts                   # variant library (Matchups copy)
├── draft.ts                      # variant library (Draft copy)
├── history.ts                    # variant library (History copy)
├── swings.ts                     # variant library (Big Swings, TODO: ingestion)
├── types.ts                      # CategoryLeagueData contract
├── fixtureAdapter.ts             # demo fixture → CategoryLeagueData
└── adapters/
    ├── sleeperAdapter.ts
    ├── yahooAdapter.ts
    ├── espnAdapter.ts
    └── colorHash.ts
```

---

## Story candidate shape

```ts
interface StoryCandidate {
  // Identity
  type: StoryType                   // 'matchup-sweep', 'trade-blockbuster', etc.
  category: StoryCategory           // 'standings', 'matchup', 'transaction', etc.

  // Scoring
  weight: number                    // 0-100 baseline importance
  freshness: number                 // 0-1 recency multiplier (1.0 = today)

  // Targeting
  scope: 'league' | 'team' | 'player' | 'matchup'
  teamIds?: string[]                // teams this story is about
  playerIds?: string[]              // players (for player-level)

  // Conditions — when this story is valid to fire
  seasonStages: SeasonStage[]
  validFromWeek?: number
  validToWeek?: number

  // Render context — payload the section template needs
  context: Record<string, any>

  // Dedupe + impression tracking
  signature: string                 // stable hash of (type + teamIds + week)
}

type SeasonStage =
  | 'preseason'      // before week 1
  | 'opening'        // weeks 1-3
  | 'settling'       // weeks 4-7
  | 'midseason'      // weeks 8 → (end - 8)
  | 'stretch'        // last 5 weeks of regular season
  | 'final'          // last 2 weeks of regular season
  | 'playoffs'       // postseason
  | 'offseason'      // after playoffs

type StoryCategory =
  | 'standings'
  | 'matchup'
  | 'streak'
  | 'category'
  | 'transaction'
  | 'player'
  | 'seasonStage'
  | 'cadence'
  | 'personalization'
  | 'anniversary'
  | 'commissioner'
  | 'absence'
  | 'division'
```

---

## Selection algorithm

```ts
function selectStoriesForIssue(
  candidates: StoryCandidate[],
  context: IssueContext,
): SelectedStory[] {
  return candidates
    .filter(c => c.seasonStages.includes(context.seasonStage))
    .filter(c => isInWeekRange(c, context.currentWeek))
    .map(c => ({
      ...c,
      score: c.weight
           * c.freshness
           * personalizationFit(c, context.viewer)
           * impressionDecay(c, context.impressions),
    }))
    .sort((a, b) => b.score - a.score)
    .pipe(dedupeByCategory({ maxPerCategory: 2 }))
    .pipe(dedupeByTeam({ maxInTop: 5 }))
    .slice(0, MAX_STORIES_PER_ISSUE)
}
```

### Scoring multipliers

**Weight (baseline):** detector-assigned, 0-100. Examples:
- `championship-week` final-week matchup: 100
- `blockbuster-trade` within 24hrs: 95
- `new-throne` in last 4 weeks of season: 90
- `cat-sweep` in any week: 80
- `streak-broken` after 5+ game run: 70
- `quiet-day` fallback: 20

**Freshness multiplier (0-1):** how recently the trigger event happened:
- Today: 1.0
- Within 24hrs: 0.85
- Within 72hrs: 0.6
- Within 1 week: 0.3
- Older: detector should not emit

**Personalization fit (0.8-1.6):**
- 1.6× if story is about viewer's team
- 1.3× if story is about viewer's division
- 1.1× if story is about viewer's last opponent
- 1.0× league-wide neutral
- 0.8× story is about a team viewer marked as muted (future)

**Impression decay (0.5-1.0):**
- Never seen: 1.0
- Seen >7 days ago: 1.0
- Seen this week: 0.9
- Seen yesterday: 0.7
- Seen today: 0.5

### Dedup rules

After scoring + sorting, before slicing top N:

- **By category**: max 2 stories per `category` make it to top
  (don't show 3 streak stories in a row).
- **By team**: max 1 story per `teamId` in the top 5
  (one team shouldn't hog the top of the page).

---

## Composition engine

```ts
function composeIssue(
  stories: SelectedStory[],
  context: IssueContext,
): IssueSection[] {
  const sections: IssueSection[] = []

  // HERO — top-ranked story drives the cover
  if (stories[0]) {
    sections.push({
      type: heroSectionForStoryType(stories[0].type),
      story: stories[0],
      priority: 100,
    })
  }

  // STORY SECTIONS — next 3-5 stories, each picks its template
  for (const story of stories.slice(1, 5)) {
    sections.push({
      type: sectionForStoryType(story.type),
      story,
      priority: scoreToSectionPriority(story.score),
    })
  }

  // ALWAYS-SHOW SECTIONS — anchored at fixed priorities
  sections.push({ type: 'standings-compact', priority: 50 })
  sections.push({ type: 'matchup-feed-today', priority: 40 })

  // SEASON-STAGE CONDITIONAL INSERTS
  if (context.seasonStage === 'final' || context.seasonStage === 'stretch') {
    sections.push({ type: 'playoff-push-detailed', priority: 60 })
  }
  if (context.seasonStage === 'opening') {
    sections.push({ type: 'draft-autopsy', priority: 80 })
  }
  if (context.seasonStage === 'playoffs') {
    sections.push({ type: 'bracket-projection', priority: 90 })
  }

  // QUICK-READS TICKER — always last
  sections.push({ type: 'quick-reads-ticker', priority: 5 })

  return sections.sort((a, b) => b.priority - a.priority)
}
```

### Section type → Vue component

| Section type | Component | When it shows |
|---|---|---|
| hero-faceoff | `HeroFaceoff.vue` | Throne change, rivalry, division clash |
| hero-solo | `HeroSolo.vue` | Hot climber, monster night, sweep |
| hero-trade | `HeroTrade.vue` (future) | Blockbuster trade |
| hero-milestone | `HeroMilestone.vue` (future) | Player milestone |
| hero-quiet | `HeroQuiet.vue` | Nothing-happened fallback |
| matchup-of-week | `MatchupOfWeek.vue` | Top 2 facing off |
| streak-watch | `StreakWatch.vue` | Long active streaks |
| division-race | `DivisionRace.vue` | Division standings drama |
| trade-recap | `TradeRecap.vue` (future) | Recent trade |
| player-spotlight | `PlayerSpotlight.vue` (future) | Player performance |
| standings-compact | (existing standings) | Always |
| matchup-feed-today | (existing live feed) | Always |
| playoff-push-detailed | (existing playoff push) | Stretch/Final only |
| draft-autopsy | (existing draft hero) | Opening only |
| bracket-projection | `BracketProjection.vue` (future) | Playoffs |
| quick-reads-ticker | (existing pills) | Always |

---

## Season-stage derivation

```ts
function deriveSeasonStage(
  currentWeek: number,
  regularSeasonEndWeek: number,
): SeasonStage {
  if (currentWeek < 1) return 'preseason'
  if (currentWeek > regularSeasonEndWeek + 3) return 'offseason'
  if (currentWeek > regularSeasonEndWeek) return 'playoffs'

  const weeksRemaining = regularSeasonEndWeek - currentWeek

  if (currentWeek <= 3) return 'opening'
  if (currentWeek <= 7) return 'settling'
  if (weeksRemaining <= 2) return 'final'
  if (weeksRemaining <= 5) return 'stretch'
  return 'midseason'
}
```

Most stories specify which `seasonStages` they're valid in. Examples:

- `opening-week`: `['opening']`
- `playoff-push-detailed`: `['stretch', 'final']`
- `championship-week`: `['playoffs']`
- `quiet-day` (fallback): all stages
- `new-throne`: all in-season stages
- `mathematical-elimination`: `['stretch', 'final']`

---

## Implementation roadmap

### Tier 1 — Free wins (NO new data)

Build all detectors that work off data we already have:
- All 18 standings detectors
- All 16 matchup detectors
- All 8 streak detectors
- All 13 season-stage detectors
- All 5 day-of-week cadence detectors
- All 5 division detectors

**Plus architecture:** types, selection, composition, 5 new section
components, home view wiring, ESPN adapter fixes (regularSeasonEndWeek,
divisions).

**Total story types unlocked:** ~65 new (on top of existing 7).

### Tier 2 — Mostly-have data

- All 9 category-level detectors (need `categoryRanksHistory`)
- All 5 division-specific detectors (already covered in Tier 1)
- All 5 anniversary detectors (need `memberJoinedAt`)

### Tier 3a — Transactions

- Build per-platform transaction-history adapter
- All 10 transaction detectors
- `TradeRecap` section component

### Tier 3b — Players

- Build daily MLB box-score ingester
- Build player-roster snapshot service
- All 12 player-event detectors
- `PlayerSpotlight` section component

### Tier 4 — Personalization

- `story_impressions` Supabase table
- Per-user impression log
- Personalization scoring
- All 9 personalization detectors

---

## Bug fixes folded in alongside Tier 1

- ESPN adapter populates `regularSeasonEndWeek` from settings
- ESPN adapter reads team `divisions` from settings
- Add `divisions: { id, name }[]` and `divisionId` (per team) to `CategoryLeagueData`
- Hero detector picks appropriate team for "leading" framing
- Playoff-push detector requires `seasonStage in ['stretch', 'final']`

---

## Design decisions (locked in)

1. **Detectors are pure functions.** Same `CategoryLeagueData` always
   produces the same candidates. Side-effect-free. Easy to test.
2. **Selection is also pure.** Same candidates + same context always
   produces the same selection.
3. **Composition is pure.** Same selection + same context always
   produces the same section list.
4. **Rendering is per-component.** Each section component knows how to
   render its story payload. No shared rendering layer.
5. **Old `render.ts` stays alive** during transition. Home view uses
   composition output when available, legacy render when not. Lets us
   ship incrementally without breaking the current product.
6. **Variant libraries (home.ts, pr.ts, etc.) stay unchanged.**
   They're the voice. Architecture work doesn't touch them.

---

## Conventions

- Detector names: `detect[Category][Subject]` (e.g.
  `detectStandingsNewThrone`).
- One detector per story type.
- Detector files export a single `detect(data, context): StoryCandidate[]`
  that runs every detector in the file.
- Index orchestrator runs all per-category detect functions in parallel
  and returns the flat candidate list.
- Detectors must never throw. Return empty array on missing data.
- All weight constants live at the top of each detector file with
  comments explaining the relative scoring.

---

## How to add a new story type

1. Pick the category. Open `src/editorial/detection/{category}.ts`.
2. Add a `detect{StoryName}(data)` function returning candidate(s).
3. Add a corresponding render path:
   - If it uses an existing section component, add the type to the
     section-type mapping in `composition.ts`.
   - If it needs a new component, create one in
     `src/components/issue/{StoryName}.vue` and register it.
4. Add tests (when test infra exists) or sanity-check with the
   preview script.
5. Update this doc's taxonomy table.

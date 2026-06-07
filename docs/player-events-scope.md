# Player Events on The Beat — Scoping Doc

Concrete plan for adding **HUGE GAME** and **BENCH BLUNDER** items to The Beat.
This is the foundation for individual-player coverage. Currently The Beat reports team-level events
(matchup finals, streak crossings, throne changes). Player events add the
micro-events that aggregate up to those team outcomes.

**Bottom line:** ~1 focused session to ship a vertical slice (Yahoo MLB), validating the editorial concept before expanding to other platforms.

---

## Editorial vision

**HUGE GAME** — a single player's standout day clears a stat threshold.

> Shohei Ohtani: 4-for-4, 2 HR, 6 RBI for Jazz on my TittyWittys.

**BENCH BLUNDER** — a benched player would have qualified for HUGE GAME, and the starting roster slot at the same position posted lower stats.

> Goof Juice benched Bo Bichette. He went 3-for-4 with 2 HR and 6 RBI. Sometimes it's like that.

**Tone discipline:** cheeky, not mean. Self-deprecating > judgmental. The Beat is the friend at the bar pointing it out, not the columnist writing a takedown.

---

## Data shape additions

Extend `CategoryLeagueData` with optional player-level fields. Optional because not every platform/sport surfaces these consistently — adapters that can populate them do; ones that can't degrade gracefully (no player items fire).

```ts
// src/editorial/types.ts

export interface CategoryLeaguePlayerPerformance {
  /** Stable cross-source identifier. Prefer mlbamId from MLB Stats API
   *  when available; fall back to a platform-specific id otherwise. */
  playerId: string
  /** The fantasy team that rostered this player on the day. */
  fantasyTeamId: string
  /** Was the player in the starting lineup for the eligible scoring
   *  period? Required for bench blunder detection. */
  started: boolean
  /** The day this performance applies to (YYYY-MM-DD). The week's
   *  scoring period is implied by the league context. */
  day: string
  /** Raw stat line as a typed map. Keys match the league's category
   *  ids (R, H, HR, RBI, SB, AVG, W, SV, K, ERA, WHIP, etc.). */
  stats: Record<string, number>
}

export interface CategoryLeaguePlayer {
  id: string
  name: string                  // "Shohei Ohtani"
  position?: string             // "DH/SP" / "OF" / "RP"
  mlbTeam?: string              // "LAA" / "NYY" — three-letter code
  photoUrl?: string             // optional, MLB-Stats-API or platform-supplied
}

// On CategoryLeagueData:
players?: CategoryLeaguePlayer[]
playerPerformances?: CategoryLeaguePlayerPerformance[]
```

Both fields are optional. Adapters that don't yet surface them just leave them undefined. The Beat detectors skip player items when the data is absent — no error, no broken UI.

---

## Yahoo MLB adapter requirements

### Required Yahoo Fantasy API endpoints

| Endpoint | Purpose |
|---|---|
| `/league/{league_key}/teams/roster;day={YYYY-MM-DD}` | Per-day rosters with started/benched flag |
| `/league/{league_key}/teams/players/stats;type=date;date={YYYY-MM-DD}` | Per-day fantasy stat lines for each rostered player |
| `/players;player_keys={keys}` | Player metadata (name, position, MLB team, photo) |

Yahoo's per-day roster history is the **critical piece** — without it, we can't reconstruct who was started vs. benched on a given day. Yahoo *does* expose this via `roster;day=`, but it's a per-team-per-day fetch (N teams × 7 days = up to 70 calls per week). Need to design adapter to batch or fetch lazily.

### Adapter signature

```ts
// src/editorial/adapters/yahooAdapter.ts

interface YahooAdapterOpts {
  // existing fields...
  /** Set true to fetch the full per-day roster + stat-line history
   *  for the current week. Without it, player events skip. Off by
   *  default to keep cold-load cheap; the Beat view can opt in. */
  includePlayerEvents?: boolean
}
```

### Player metadata strategy

Player names + photos come from **two sources, in priority order**:

1. **MLB Stats API** (`statsapi.mlb.com/api/v1/people/{id}`) — free, public, authoritative for names/positions/photos. Use `mlbamId` as the cross-source identifier.
2. **Yahoo's own player records** as fallback when we don't have an MLBAM mapping.

Cache aggressively. Player metadata changes rarely (mid-season trades, position changes). A 24-hour TTL on a `players` table in Supabase covers it.

### Cost estimate

Per league per week (12 teams, 7 days):
- Roster fetches: ~12 × 7 = **84 calls**
- Stat-line fetches: 1 league-wide call per day = **7 calls**
- Player metadata: ~25 unique players × **1 call** (cached for season)

Total cold load: ~100 calls per league per week. With caching: ~10 calls per refresh.

---

## Detector signatures

```ts
// src/editorial/detect-beat.ts (extending existing)

export type BeatCategory =
  | ...existing...
  | 'HUGE_GAME'
  | 'BENCH_BLUNDER'

export interface HugeGamePayload {
  category: 'HUGE_GAME'
  playerId: string
  playerName: string
  position?: string
  fantasyTeamId: string
  /** The triggering metric — what made it editorial-worthy. */
  trigger: 'multi-hr' | 'big-rbi' | 'cycle' | 'big-k' | 'no-hitter' | 'big-sv' | 'multi-cat'
  /** The day this performance happened (YYYY-MM-DD). */
  day: string
  /** Marquee stat-line slot (4-for-5, 2 HR, 6 RBI). */
  headlineStats: string
  /** Raw stats for the body line. */
  stats: Record<string, number>
}

export interface BenchBlunderPayload {
  category: 'BENCH_BLUNDER'
  playerId: string
  playerName: string
  position?: string
  fantasyTeamId: string
  day: string
  benchedStats: string          // "3-for-4, 2 HR, 6 RBI"
  /** The starter who was used instead (when identifiable). */
  startedPlayerId?: string
  startedPlayerName?: string
  startedStats?: string         // "0-for-4, 0 HR" — what the manager got
  /** Stat-line cost vector — what the manager missed. */
  costSummary?: string          // "Cost: 3 HR, 6 RBI, 8 TB"
}

export function detectHugeGames(data: CategoryLeagueData, now?: Date): BeatItemSeed[]
export function detectBenchBlunders(data: CategoryLeagueData, now?: Date): BeatItemSeed[]
```

---

## Editorial thresholds

### HUGE GAME triggers — fire when ANY of:

**Hitting (MLB):**
- 3+ HR in a game
- 5+ RBI in a game
- 5+ hits in a game
- Cycle
- Grand slam
- 4+ SB in a game

**Pitching (MLB):**
- 10+ K in a start
- Complete game
- No-hitter / shutout
- 0 ER in 6+ IP
- 3+ saves in a day

**Combined / 2-way (MLB):**
- 2+ HR + 5+ RBI in the same game (multi-cat)
- Shohei special (pitching start AND multi-hit day)

### BENCH BLUNDER threshold

ALL THREE must be true:
1. The benched player triggered HUGE GAME criteria
2. The fantasy manager had at least one starting slot at the same position eligible to use them
3. The slot the manager actually used posted lower stats across the matchup's scoring cats

### Importance assignment

- `high` for 4+ HR, cycle, no-hitter, or BENCH BLUNDER with 8+ cat-cost
- `med` for standard HUGE GAME thresholds, BENCH BLUNDER with 3-7 cat-cost
- `low` for marginal BENCH BLUNDERs (1-2 cat-cost)

---

## Variant pool sketches

**HUGE GAME headlines:**

```
"Shohei Ohtani: 4-for-4, 2 HR, 6 RBI for Jazz on my TittyWittys."
"Bo Bichette went off for The Queens Bombers: 3 HR, 8 RBI."
"No-hitter: Spencer Schwellenbach for Chaplao. 7 IP, 11 K."
```

**HUGE GAME bodies (data-driven):**

```
"Single-day high for the league this week."
"Goof Juice's first 3-HR game since draft day."
"Schwellenbach's first complete game of the season."
```

**BENCH BLUNDER headlines:**

```
"Goof Juice benched Bo Bichette. He went 3-for-4 with 2 HR and 6 RBI."
"Funk left Witt Jr. inactive. He cycled."
"Chaplao started Wood (0-for-4) over Bichette (3 HR)."
```

**BENCH BLUNDER bodies (data-driven):**

```
"Cost: 3 HR, 6 RBI, 8 TB. Sometimes it's like that."
"The starting slot at SS posted 0-for-4 with a K."
"Started 8 cats behind in those categories at lock-in."
```

---

## Visual treatment

### Player widget (new)

```ts
interface BeatWidget {
  kind: 'team-logo' | 'two-logos' | 'streak-chip' | 'score-chip' | 'player-photo'
  // ...
  playerName?: string
  playerPhoto?: string
  statLine?: string  // "4-for-5, 2 HR, 6 RBI"
}
```

### Featured HUGE GAME / BENCH BLUNDER layout

- **Player photo at 72px** instead of team avatar
- **Stat-line chip** ("4-for-5 · 2 HR · 6 RBI") in the content slot
- **Fantasy team logo** (small, 22px) attached to the photo to show ownership
- **Cost summary footer** on BENCH BLUNDER ("Cost: 3 HR, 6 RBI, 8 TB")

### Non-featured

- Player photo at 26px on the right (where team logos currently are)
- Compact stat-line chip below the headline

---

## Risks

| Risk | Mitigation |
|---|---|
| Yahoo's per-day roster fetch is heavy (84 calls / week / league) | Lazy fetch (only when Beat view loads), cache results in Supabase with 1-day TTL |
| Threshold tuning — too sensitive = noise, too conservative = silence | Ship with conservative thresholds, monitor item-fire-rate on real leagues, tune in V2 |
| Tone of bench blunder lands wrong (mean instead of cheeky) | Hand-curate the first variant pool, A/B test wording on Josh's own league before broad release |
| MLB Stats API rate limit / availability | Cache aggressively in Supabase, use Yahoo's name fallback when MLB Stats unavailable |
| Multi-sport scoring categories (NFL, NBA differ) | Ship MLB only for V1; design types to extend cleanly |

---

## Next-session checklist

The user wanted a clear, actionable next-session plan. Here it is, ordered:

1. **Adapter spike (4–5 hr):**
   - Pick one of the user's real Yahoo MLB leagues
   - Manually fetch per-day rosters + stat lines via Yahoo API
   - Print the raw output — verify the data we need is actually retrievable
   - Sanity check: can we identify "Bo Bichette benched on 6/3 → Wood started instead"?
2. **Type + adapter wiring (2–3 hr):**
   - Add `players` + `playerPerformances` to `CategoryLeagueData`
   - Build `yahooAdapter.includePlayerEvents` mode
   - Cache layer (Supabase table or local TTL)
3. **Detectors (2 hr):**
   - `detectHugeGames` with conservative thresholds
   - `detectBenchBlunders` with the three-condition gate
4. **Render + variant pools (2 hr):**
   - `HUGE_GAME` + `BENCH_BLUNDER` variant pools
   - Tone-tuned with 8–12 phrasings per category
5. **Visual treatment (2 hr):**
   - Player photo widget kind
   - Featured layout for player events
6. **Real-league verification (1 hr):**
   - Refresh Yahoo league, validate items fire correctly
   - Adjust thresholds based on real-data fire rate

**Total estimated time:** 13–16 focused hours, or 2 days of work.

---

## What's NOT in this scope (Phase 4+)

- ESPN MLB adapter for player events
- Sleeper MLB adapter for player events
- NFL / NBA player events (different sports, different stat categories)
- Player-trend events (WIRE PICKUP firing on +200% post-claim production)
- COLD STREAK player events ("Your top pick is 0-for-20")
- Pre-week roster optimization items (lineup decisions Sunday night)

These are real follow-ups but each has its own scoping work. Ship MLB-on-Yahoo first, validate the editorial loop works, then expand.

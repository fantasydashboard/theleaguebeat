# Your Players — daily roster performances (v1)

**Date:** 2026-06-12
**Status:** Approved design, pre-implementation
**Related:** [[project_your_column_state]]; the personal companion to The Beat's league-wide player nights.

## Goal & context

Your Column is clean but thin, and it lacks the one thing a manager checks every morning: *how did my guys do?* **Your Players** answers that — a daily digest of the viewer's roster's notable performances (best and worst) from the most recent game date. It's The Beat's marquee content (player nights) personalized to one team, and it's the daily-open hook that drives the retention Your Column exists for.

## Locked decisions

1. **Composition:** up to **2 standouts + 1 dud** (never a quiet line dressed up as either).
2. **Placement:** block **after the matchup** (`01 Season · 02 Matchup · 03 Players · 04 Rival · 05 Arc`).
3. **Scope:** **points + cats**, all platforms. Cats already carry `playerNights`; points need adapter hydration (the real cost).
4. **Voice:** compact stat lines, not sentences — `Aaron Judge — 3-4, 2 HR, 5 RBI`. Third-person, name the player. Direction shown by an ↑/↓ marker + tone color (green standout, warm-red dud), reusing the rank-line tones.

## The block

```
03   YOUR PLAYERS · YESTERDAY
 ↑   Aaron Judge      3-4, 2 HR, 5 RBI
 ↑   Gerrit Cole      7 IP, 0 ER, 11 K
 ↓   Juan Soto        0-4, 4 K
```

Renders inside the existing editorial block frame (section number + kicker). The player rows replace chips. Omitted entirely when nothing clears the bars (off-day, quiet night, or no hydrated data).

## Architecture (4 units)

### 1. Data dependency — populate `playerNights` on the points path

`playerNights` (with `ownedByTeamIds`) already reaches **cats** leagues; the **points** branches `return out` before the roster fetch + night build run. So:

- Add `playerNights?: PlayerNight[]` to `LeagueDataH2HPoints` in `src/editorial/types.ts`.
- **`yahooAdapter` points branch:** build the per-team roster map the same way the cats path does (`yahooService.getRoster(teamKey)` per team → `rosterByName: Map<normalizedName, teamKey[]>`), call `buildPlayerNights({ rosterByName, includeUnowned: true })`, and attach `playerNights` to the points `out`. Add the roster fetch to the existing points `Promise.all`.
- **`espnAdapter` points branch:** mirror it — build the ESPN roster map and call `buildEspnPlayerNights(league)`, attach to the points `out`.
- **Cats paths:** unchanged (already populated).

This adds N `getRoster` calls + the daily MLB-stats fetch to the points load — the same cost the cats Beat already pays. It degrades gracefully: if the fetch fails or returns nothing, `playerNights` is empty and the block omits.

### 2. Shared stat formatter

`formatNightStats(night)` already exists in `detect-beat.ts:743` but is unexported. **Export it** (or extract to `src/editorial/players/formatNightStats.ts` and have detect-beat import it) so The Beat and Your Players share one source of truth for `3-4, 2 HR, 5 RBI` (hitter) and `7 IP, 0 ER, 11 K` (pitcher).

### 3. New pure scorer — `src/editorial/yourColumn/buildYourPlayers.ts`

`buildYourPlayers(playerNights, teamId): YourPlayersBlock | undefined` (pure, unit-testable):

1. Pick the **latest `gameDate`** present in `playerNights`.
2. Filter to nights on that date where `ownedByTeamIds.includes(teamId)`.
3. Score each night twice: a **goodness** score and a **stinker** score (see below).
4. **Standouts:** take nights clearing the standout bar, sort by goodness desc, keep up to 2.
5. **Dud:** of the remaining nights (a player is never both), take the one clearing the stinker bar with the highest stinker score; keep 1.
6. Format each via `formatNightStats`; tag `tone: 'up' | 'down'`.
7. Return `{ label: 'Your Players', eyebrow: 'YESTERDAY', players: [{ name, line, position?, mlbTeam?, tone }] }`, standouts first then the dud. Return `undefined` if no standout and no dud clear their bars.

**Scoring bars (the honesty gate):**
- *Standout:* hitter with (≥2 H and ≥1 HR) OR ≥3 H OR ≥4 RBI OR ≥2 HR OR ≥3 SB; pitcher with a gem line — ≥6 IP and ≤1 ER, OR ≥8 K with ≤2 ER. Goodness score ranks within: weight HR, RBI, hits, SB for hitters; IP, K, and low ER for pitchers.
- *Stinker:* pitcher with ≥5 ER OR a short blowup (≤3 IP and ≥4 ER); hitter 0-for with ≥4 AB and ≥2 K. Stinker score ranks by ER (pitchers) / (AB + K) with no hits (hitters).
- A two-way player (Ohtani) is scored on the more notable of his hitting/pitching line; only that line is shown.

### 4. Wire-in + view

- `buildYourColumn` gains `players?: YourPlayersBlock`; it calls `buildYourPlayers(data.playerNights ?? [], teamId)`. `renderedBlocks` order becomes `[hero, matchup, players, rival, arc].filter(Boolean)`.
- `YourColumnView.vue` renders a player-row list for the players block: each row an ↑/↓ marker (toned), the player name, and the stat line; small muted `position · mlbTeam` allowed. No chips, no viz beyond the toned markers.

## Edge cases

- **Off-day / hydration-empty** → no nights clear the bars → block omitted (never faked).
- **Quiet night** → a 1-4 or 0-3 clears neither bar → omitted rather than mislabeled.
- **No self-duplication** → a player chosen as a standout can't also be the dud.
- **Started vs benched** → v1 counts **rostered** players (`ownedByTeamIds`), not started-only. The lineup-status split (and the benched-stud-regret angle) is a later refinement; benched regret is already The Beat's separate `BENCH_BLUNDER`.
- **Latest-date selection** uses the max `gameDate` in the data, so it tracks whatever day the hydrator last filled — robust to cron timing.

## Testing

- `buildYourPlayers` (vitest): standout selection + cap at 2; dud selection + stinker bar; quiet night → omit; latest-date pick when multiple dates present; two-way player picks the better line; no player appears twice; off-day (empty) → undefined.
- `formatNightStats`: a hitter line and a pitcher line, post-export.
- `buildYourColumn` integration: players block present and ordered after the matchup when nights exist; absent when they don't.

## Out of scope (v1)

Player headshots/photos (The Beat's `player-photo` widget); the bench-regret angle; multi-day or weekly rollups; non-MLB sports; surfacing free-agent monster nights (that's a league-wide Beat concern, not personal).

## Open risks & assumptions

1. **Points hydration cost/perf** — the per-team `getRoster` fan-out is the main new load on the points page. It mirrors the cats path, so it's known, but it does make points slower to first paint. Acceptable; revisit if it's a problem.
2. **`ownedByTeamIds` must match the team-id space** — the night's `ownedByTeamIds` are produced from the roster map's team keys, and the filter does `ownedByTeamIds.includes(teamId)` where `teamId === teams[].id`. So the roster map MUST be keyed by the same id `teams[].id` uses — `team_key` for Yahoo, `String(t.id)` for ESPN — or the filter silently matches nothing (the same trap the H2H builder hit). The plan must verify this per adapter against a real roster.
3. **Threshold tuning** — the standout/stinker bars are first-pass; they may need adjustment once seen against real rosters across quiet and loud nights.

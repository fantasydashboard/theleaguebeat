# The Weekly Reel — auto-generated league video (v1)

**Date:** 2026-08-09
**Status:** Approved design, pre-implementation
**Related:** `2026-06-11-weekly-digest-backbone-design.md` (specced, *not built*), project memory `project_distribution_strategy.md`

## Goal & context

The League Beat generates league-specific editorial across three tabs and renders
per-story share PNGs, but the highest-engagement artifact in a group chat is
video — it autoplays, it gets watched, and it makes non-members ask what it is.

This spec covers **the Weekly Reel**: a ~60-second, portrait, narrated video
generated per league per week, downloadable and shareable from the league page.

The central claim is that this is **not a new content system**. `composeIssue()`
already returns an ordered, scored, deduped list of the week's beats. That is a
shot list. The video is a third render target for a pipeline that already runs:

```
detect* → selection.ts → composition.ts ─┬─→ render.ts      → web
                                          ├─→ CoverCard.vue  → share PNG
                                          └─→ buildReel.ts   → VIDEO   ← new
```

What makes the video feel custom-built for a league is not the team names in it.
It is that **the shot list changes every week**, because the detected stories do.

## Locked decisions

1. **Visual language:** broadcast staging (wipes, lower-thirds, a persistent
   corner bug) carrying full-frame **data reveals**, set in the existing print
   identity (Barlow / Barlow Condensed, `oklch(0.055 0.012 90)`, grain). The
   ranking board is a *payoff scene*, not the whole video.
2. **Script:** 100% deterministic, from the existing variant libraries. **No LLM
   in the generation path.** No hallucination risk, no editorial drift.
3. **Voice:** neural TTS behind a vendor-agnostic adapter. ElevenLabs primary
   (a recurring narrator is a brand asset), OpenAI as failover.
4. **Delivery v1:** a Download / Share button on the league page. **No email, no
   cron.** The digest backbone is decoupled and may land before or after.
5. **Renderer:** Remotion. Accepted cost: the scene components are React and
   cannot reuse the Vue card components.
6. **v1 scenes:** the five that run on detection shipping today — Cold Open, The
   Throne, The Climb, The Board, Sign-Off.

## Non-goals for v1

- Player beats (`monster-night`, `three-hr-game`) — these sit under "Players
  (future)" in `detection/types.ts`. The most cinematic scene in the reel is
  deliberately deferred until the engine is proven.
- Per-manager personal video (Your Column as film) — N renders per league; strong
  v2, reuses ~90% of this engine.
- Season-in-review / championship film — fires once a season, proves nothing
  about cadence.
- Email digest, Discord auto-post, football copy.

## Architecture

Three clearly separated phases. The separation between **build** and **render**
is load-bearing, not stylistic — see Timing.

```
PHASE 1 — BUILD   (pure, no I/O)
  league_issues.data  →  buildReel(issueData, context)  →  Reel
                            composeIssue() → IssueSection[]
                            SectionType → SceneTemplate lookup
                            scene prop builders + VO variant libraries

PHASE 2 — VOICE   (I/O, cached)
  for each scene.vo:  synthesize(text, voiceId) → { path, durationMs }
                      cache key = sha256(text + voiceId + modelId)
  durations written back into the Reel

PHASE 3 — RENDER  (compute)
  Reel (with durations) → Remotion → MP4 + poster frame
                        → verify → Supabase Storage → league_videos
```

### Why build and render are separate

The Reel is constructed with VO *text* only. Real clip durations are unknown
until synthesis returns. Rendering before that produces the classic fault: a bar
finishes filling three seconds after the narrator said the number. Phase 2 exists
to close that loop.

## The Reel contract

The keystone type. Everything downstream depends only on this, which is what
makes the Remotion package independently testable.

```ts
export type SceneTemplate =
  | 'cold-open'
  | 'the-throne'
  | 'the-climb'
  | 'the-board'
  | 'sign-off'

export interface ReelScene<P = unknown> {
  template: SceneTemplate
  /** Typed props for the Remotion component. */
  props: P
  /** Narration script — deterministic output of the variant libraries. */
  vo: string
  /** Floor duration, independent of audio. */
  minDurationMs: number
  /** Filled in by Phase 2. Undefined at build time. */
  voDurationMs?: number
  /** Storage path of the synthesized clip. Filled in by Phase 2. */
  voPath?: string
  /** Story that drove this scene. Absent for fixed scenes. */
  storySignature?: string
}

export interface Reel {
  leagueId: string
  leagueName: string
  year: number
  week: number
  scenes: ReelScene[]
  width: 1080
  height: 1920
  fps: 30
  /** Filled in by Phase 2. */
  totalDurationMs?: number
}
```

### Scene props

| Template | Props |
| --- | --- |
| `cold-open` | `{ leagueName, week, subtitle }` |
| `the-throne` | `{ teamA, teamB, eyebrow, headline, catLines: { label, winner: 'a' \| 'b', share }[], kicker }` — `share` is a `0–1` fraction of the bar width, measuring how decisively the category was won |
| `the-climb` | `{ team, points: { week, rank }[], fromRank, toRank, spanWeeks, footnote }` |
| `the-board` | `{ rows: { rank, teamName, record, delta, highlight }[], note }` |
| `sign-off` | `{ teamA, teamB, line, brandUrl }` |

### Scene routing

`SectionType → SceneTemplate` mirrors the existing `sectionForStoryType` table.

| SectionType | SceneTemplate |
| --- | --- |
| `hero-faceoff` | `the-throne` |
| `hero-solo` | `the-climb` |
| `matchup-of-week` | `the-throne` |
| `streak-watch` | `the-climb` |
| `standings-compact` | `the-board` (anchor, always) |
| *fixed* | `cold-open`, `sign-off` (always) |

Unmapped section types are **skipped**, not rendered generically. A shorter
honest reel beats a padded one. Adding a scene later is one table row plus one
React component — additive, not architectural.

**Dedup runs AFTER the builders, not before.** *(Corrected 2026-08-09 during
implementation — the original design produced reels with zero story scenes.)*

The mapping above is many-to-one: `hero-faceoff` and `matchup-of-week` both route
to `the-throne`. Two sections surviving `composeIssue`'s own `SectionType` dedup
would produce two identical scenes back to back, so a second dedup pass on
`SceneTemplate` is needed. But running it *before* the builders is wrong: a
high-priority section claims a template slot, its builder then returns `null`,
and the viable lower-priority candidate for that slot has already been discarded.
Against the real week-8 fixture this produced `cold-open → the-board` and nothing
else, while two perfectly good story scenes sat unused.

`buildReel` therefore marks a template used only once a builder has returned a
non-`null` scene.

**Templates are chosen by what the data supports, not by `SectionType`.**
`SectionType` carries no arity guarantee — `heroSectionForStoryType` maps the
single-team story `dynasty-falling` to `hero-faceoff` because that is a *web
layout* decision. Scene templates have *data* requirements: `the-throne` needs
two teams plus a current-week matchup; `the-climb` needs one team plus three
rank-history points. So `templateForSection` supplies a **preferred** template
and the other is tried as a fallback.

The fallback is constrained: `the-climb` is only attempted for a story with
exactly one team. The Climb is a single-team scene, so a two-team story is not a
candidate for it regardless of rank history — without this guard a
`matchup-of-week` whose Throne slot was taken would fall back to a flat one-team
Climb, dropping the second team and padding the reel with a non-story.

### Structure

Fixed spine, dynamic middle. Target ~60s, floor ~35s.

| Slot | Scene | Fixed? |
| --- | --- | --- |
| 1 | Cold Open | fixed |
| 2 | hero story | chosen |
| 3 | supporting story | chosen |
| 4 | supporting story | chosen |
| 5 | The Board | fixed |
| 6 | Sign-Off | fixed |

Slots 3 and 4 are dropped when `composeIssue()` returns fewer stories. The three
fixed scenes guarantee a valid reel in any week, including a league with almost
no data.

## Timing model

```
sceneDurationMs = max(minDurationMs, LEAD_IN + voDurationMs + TAIL)
LEAD_IN = 400ms   // motion starts before the voice does
TAIL    = 700ms   // beat to land before the wipe
frames  = round(sceneDurationMs / 1000 * fps)
```

Scene-internal animation delays are expressed as **fractions of scene duration**,
not absolute seconds, so a longer VO stretches the choreography rather than
desynchronising it.

## Components

| Unit | Purpose | Depends on |
| --- | --- | --- |
| `src/editorial/video/types.ts` | `Reel`, `ReelScene`, `SceneTemplate`, per-scene prop types | — |
| `src/editorial/video/buildReel.ts` | **Pure.** `(issueData, context) → Reel`. The keystone. | `composeIssue`, scene builders |
| `src/editorial/video/scenes/*.ts` | One module per template: prop builder + VO variant library | issue data shape only |
| `video/` (separate package) | Remotion compositions, one React component per template | `Reel` type only |
| `api/_lib/tts.js` | `synthesize(text, voiceId) → { path, durationMs }`; adapter interface + cache | Supabase Storage, `vo_cache` |
| `api/video/render.js` | Orchestrates build → voice → render → verify → store for one league-week | the above |
| `src/components/video/ReelPlayer.vue` | Player, download, Web Share hand-off on the league page | `league_videos` |
| `api/v/[shareSlug].js` | Public share page with OG video tags for inline chat playback | `league_videos` |

Each unit is understandable in isolation. `buildReel` has no I/O and is the only
place editorial judgment lives.

## Data model

```sql
create table if not exists public.league_videos (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references public.leagues(id) on delete cascade,
  year         integer not null,
  week_number  integer not null,
  status       text not null default 'pending',   -- pending|rendering|ready|failed
  video_url    text,
  poster_url   text,
  duration_ms  integer,
  reel         jsonb,          -- exact Reel that produced this video
  error        text,
  created_at   timestamptz not null default now(),
  unique (league_id, year, week_number)
);

create table if not exists public.vo_cache (
  hash         text primary key,         -- sha256(text + voice_id + model_id)
  storage_path text not null,
  duration_ms  integer not null,
  created_at   timestamptz not null default now()
);
```

`reel` is stored deliberately: it allows diffing what a video **claimed** against
what the data said, after the fact. This is a release-gate tool for the
data-accuracy standard, not debug clutter.

Storage buckets:

- `league-videos` — **public read**, service-role write. Public because the
  strategy keeps reading free to maximise spread.
- `vo-cache` — private, service-role only.

## Voice caching

Cache key is `sha256(text + voiceId + modelId)`, keyed on the **fully-resolved
sentence**, not the phrase or the word.

Sentence-level is a deliberate trade. Word-level caching would approach a 100%
hit rate across all leagues but splices badly — intonation breaks at every seam,
producing GPS-navigation delivery. Sentence-level keeps prosody natural and puts
every seam at a pause that would exist anyway.

Consequences, stated honestly:

- Sentences with no league-specific content (cold open, transitions, sign-off
  framing — roughly 25% of a script) reuse across every league forever.
- Sentences containing a team name or a number are mostly fresh each week.
- Changing `ELEVENLABS_VOICE_ID` invalidates the entire cache. Treat it as
  permanent once chosen.

**Cost:** ~1–2¢ TTS plus render compute per league-week; effectively **$0 for
every subsequent view, download, and re-share** — the file is already rendered.
At 100 leagues × 20 weeks that is roughly $100–200 for a season against $2,500 of
revenue. Verify current vendor pricing before launch; the order of magnitude, not
the exact figure, is what the design rests on.

## Failure handling

The bar is set by the distribution memo: once this is shared into a real group
chat, failures are public. A broken video is worse than no video.

- **Per-league isolation.** One league's failure never blocks a batch.
- **TTS:** primary vendor fails → failover vendor → both fail → render a
  **captions-only cut**. Still shippable.
- **Render:** fails → `status='failed'`, `error` recorded, UI falls back to the
  existing share card. Nothing broken is ever surfaced.
- **Verification gate before a video is marked `ready`:** file exists and is
  non-trivial in size, duration within ±15% of `totalDurationMs`, scene count
  matches the Reel, poster frame generated. **Fail closed** — anything unverified
  stays `failed`.

## Testing

- `buildReel` is pure → snapshot tests across fixture weeks: **loud week, quiet
  week, opening week, playoff week, and a near-empty league.**
- Explicit assertion: a league with minimal data still yields a valid reel of at
  least the three fixed scenes.
- Explicit assertion: two sections mapping to the same `SceneTemplate` produce
  **one** scene, not two — the higher-priority section wins.
- Scene prop builders → unit tests, including empty and single-team edge cases.
- Timing: assert `sceneDurationMs` respects the floor and that fractional
  animation offsets stay within `[0, 1]` for both short and long VO.
- Remotion still-frame rendering → visual regression on one key frame per scene.

## Build order

**Phase 0 — local proof, no accounts.** Phases 1 and 2 below run entirely on a
laptop against fixture data and produce a real MP4. This is the go/no-go gate
before provisioning anything.

1. `Reel` types + `buildReel` + fixture snapshot tests — pure, no infra.
2. Remotion package + the five scene components; render locally from a fixture
   Reel with placeholder audio.
3. TTS adapter + `vo_cache` + duration feedback loop.
4. Hosted render + storage + `league_videos` + verification gate.
5. Delivery: `ReelPlayer.vue`, download, public share page with OG video tags.
6. *(Decoupled)* automation — cron wiring, and the digest backbone if built.

## Manual setup required

Work that cannot be done from the repo, in the order it is needed:

| # | Task | Needed by |
| --- | --- | --- |
| 1 | Run the migration (`supabase db push`) | Phase 4 |
| 2 | Create `league-videos` (public) and `vo-cache` (private) buckets + RLS | Phase 4 |
| 3 | ElevenLabs account, choose narrator voice, API key | Phase 3 |
| 4 | Render host — Remotion Lambda (AWS + IAM + S3 + deploy) **or** a container on Railway/Fly | Phase 4 |
| 5 | **Verify Remotion licensing** for Limelight Creative — free for individuals and small companies, paid company licence above a headcount threshold | before Phase 2 |
| 6 | Vercel env: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, render-host credentials; confirm `SUPABASE_SERVICE_ROLE_KEY` is set in the Vercel project | Phase 3–4 |
| 7 | Vercel `crons` entry — `vercel.json` has none today; cron frequency is plan-gated | Phase 6 only |

Items 1–4, 6 and 7 are not required for Phase 0. Item 5 is cheap to check now and
expensive to discover late.

## Accepted trade-offs

- **React tax.** Remotion is React; the app is Vue. Scene components are a second
  UI codebase in `video/`. The design language transfers (same tokens, same
  fonts) but the components do not. The alternative — screenshotting a Vue route
  frame-by-frame and stitching with ffmpeg — was rejected because it means
  rebuilding frame-accurate timing and audio sync, which is exactly what Remotion
  provides.
- **Sentence-level cache** trades hit rate for natural delivery. Deliberate.
- **The best scene is deferred.** `the-night` (player beats) is the most
  cinematic template and is intentionally out of v1 so the engine is proven
  before content work expands. It becomes the first additive scene, which also
  validates that adding scenes is cheap.

## Deferred decisions

These do not block v1 and are recorded so they are not silently forgotten:

- **Free vs. paid gating** for video specifically. Current strategy keeps reading
  free and charges the commissioner per league; the reel presumably follows, but
  it is the most expensive artifact to produce and the case for gating is not yet
  argued.
- **Aspect ratio variants.** v1 is portrait 1080×1920 only. A 1:1 or 16:9 cut may
  matter for other surfaces later.
- **Music bed.** Omitted from v1 — licensing plus mixing is its own decision, and
  the reel must work muted regardless.
- **Which platform ships first.** ESPN cannot refresh server-side (browser
  cookie-bound auth), so automated rendering is Yahoo-first exactly as the digest
  spec found. Irrelevant for the button-driven v1, which renders on demand from
  whatever the user is already looking at.

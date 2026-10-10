# Handoff — open work

Written 10 Oct 2026. Branch `magazine-cover-archive-climb-share`,
working tree clean, everything below is pushed and deployed.

Paste the prompt at the bottom into a fresh session.

---

## 1. Presentation mode — UNVERIFIED, start here

`/leagues/:id/present/monday?present=1`, reached from the "Present
what everyone needs" button on the Monday desk.

**The last fix was never confirmed by eye.** Presenting rendered a
black screen because it reused `.sheet-item`/`.frame`, which are tuned
for a grid of shrunken portrait thumbnails — `flex: 0 0 259px` beat
the width in a flex parent and `overflow: hidden` clipped the 1920px
frame to nothing. It now has its own `.stage` / `.stage-item` /
`.stage-frame` classes and shares nothing with the export sheet. I
proved it renders in a harness built from the real nesting; **nobody
has opened it on a live Monday.**

Known-rough, deliberately not tuned blind:
- Landscape slides are left-aligned at `width: min(1100px, 100%)`,
  inherited from the portrait card design. On a wide screen that
  leaves a lot of empty right-hand space.
- Ultrawide fits to height, so ~69% of width with bars either side.

Unfinished inside it:
- **`stakeFor` is wired and tested but nothing feeds it.** That is the
  hook for "anything the issue would report tomorrow" — a record in
  reach, a streak, a milestone. `recordWatch` is the source.
- The series clause says **"this season"** because `h2hRecords` only
  covers the current season. All-time needs a walk back through every
  previous league id (~140 requests) — load it lazily or cache
  completed seasons, which never change.

---

## 2. Baseball onto the Issue — Phase 1 of 5 done

Spec: `docs/superpowers/specs/2026-09-19-one-issue-all-sports.md`

The measured finding that makes this cheap: **14 of the 18 modules in
`src/editorial/points/` contain no points type at all** — including
everything built recently (storylines, wire commentary, record book,
head-to-head). `buildWeeklyIssue` takes a plain input, not a
`LeagueData` union. There is exactly one coupling point:
`loadIssue.ts`.

- **Phase 1 DONE** — `IssueResult` normalises points vs categories
  with a `render` hint, so sections branch on presentation, never on
  sport. Football output unchanged.
- **Phase 2** — `loadCategoryIssue`, the sibling adapter. Gets baseball
  results, wire, trades, record book and head-to-head immediately.
- **Phase 3** — category paths for `powerScore`, `upsets`,
  `previousBoard`, and baseball's answer to `liveRemaining`.
- **Phase 4** — rename `points/` → `facts/`; correct `CLAUDE.md`,
  which still claims a new category sport needs its own detectors. It
  does not — measured and disproved 18 Sept, zero detector files
  hardcode a stat name.
- **Phase 5** — hockey, on the proven path.

---

## 3. Hockey — blocked on league access

Spec: `docs/superpowers/specs/2026-09-18-hockey-scope.md`

**Corrected mid-session: hockey is ESPN and Yahoo, not Sleeper.** I
read `200 []` from Sleeper's nhl leagues endpoint as "Sleeper hosts
hockey". It does not. Consequence is strategic: ESPN is cookie-bound,
Yahoo is OAuth, so **hockey cannot render server-side — the Monday
cron and the Weekly Reel are unavailable to it**, not merely deferred.

Already wired: ESPN `fhl` in the sport map and in league discovery,
hockey season-start month, `espnAdapter` already takes a sport
parameter. Yahoo `SPORT_KEYS.hockey`, `GAME_KEYS.hockey` to 2024.

Blockers:
1. **Yahoo has no NHL game key past 2024.** Must be READ from
   `/games;game_codes=nhl` once authenticated — do not extrapolate,
   the gaps run 8, 8, 8, 7.
2. Hockey category dictionaries for ESPN and Yahoo.
3. `CatSide = 'hit' | 'pit'` → a role union.
4. **A per-sport stat accessor.** `x-top`, `x-duds`, `x-cover`,
   `x-headliners`, `weekHeadliners` and `expectedWeekly` all read
   `pts_half_ppr`, which is Sleeper-football-only.

**A real hockey league exists** — "Spare Parts", visible in UFD with
working projections. Unknown whether it is category or points, which
decides whether it reuses the generic engine or the football one.

---

## 4. Yahoo — approved, still gated

The Yahoo API app was approved. Nothing on our side was switched off
waiting for it; all four edge functions are present.

- `AddLeagueModal` already **fetches and renders all four sports**,
  hockey included.
- The connect screen still disables Yahoo for football:
  `:disabled="selectedSport === 'football'"` → "Baseball only".
- **Never tested since approval.** Connect Yahoo from the modal and
  watch for `[Yahoo Modal] N football leagues from Yahoo API`.
- `getGameKeys` has **zero callers** — the whole `GAME_KEYS` table is
  dead code and should be deleted so it stops misleading.
- A Yahoo hockey league will connect and then render "This sport isn't
  covered yet" from `classifyLeagueSupport`. Expected, not a bug.

---

## 5. Social cards — plan v3

`~/Projects/league-beat-graphics/x-campaign/PLAN.md`

Built: `x-top` (position boards, square, all four positions),
`x-wire-nfl` (trending adds / drops / **reversals** — the
dropped-then-rebought card, which only an aggregate feed can see).

**Build step 1 was skipped and should be done first:** lift `.tp-*`
out of `x-top` into a shared row component. Every card uses the same
six-slot row — rank, image, badge, subject, context, figure — and
without extraction the family drifts into bespoke layouts.

Also open:
- Track A ("the product, in action") is **blocked**: the only neutral
  demo league is baseball, and it is football season.
- Retire `x-record` — hand-typed, dated "through 2025", and already
  wrong. `x-race` replaces it.
- Retire `x-hero` and `x-device` — both mockups, and the plan is no
  mockups.

---

## 6. Trial / access audit — found, not actioned

Measured and reported, nothing changed:

- `hasFullAccess` gates **nothing**. Eight components import
  `useFeatureAccess`; all eight are imported by nothing. Confirmed
  against the shipped bundle: `start_trial_if_new`, `league_passes`,
  `individual_subscriptions`, `trial_expires_at` appear in **zero**
  built files.
- `league_passes` / `individual_subscriptions` are written by the
  Stripe webhook but read by nothing, and no TLB surface can initiate
  a purchase.
- **`trial_email_log` has 12 real users backfilled**, including
  josh@. The sender is not in this repo — the dead code's comment says
  "cron will catch up", so it lives in UFD against the shared
  database. **Risk: a TLB signup receiving UFD trial emails promising
  "7 days of full access" for a product that is free.** Retire the
  sender before the column.

---

## 7. Lower priority

- **The show** — `~/Projects/league-beat-graphics/show/` has
  `RUNDOWN.md`, `HOSTING.md`, `GUEST-BRIEF.md` and a week-2 run sheet.
  Never recorded.
- **Branch** is 300+ commits ahead of `main`, and production runs from
  it. Known, deliberate, worth a decision eventually.

---

## Patterns worth keeping

Four bugs this session were **plausible numbers that were silently
wrong**, and a green suite hid three of them:

- `0 * undefined = NaN` flattened every power score to zero.
- `toFixed(1)` without `round1()` disagreed on 1,000 values in range.
- The prior board was built **without** the projection the current
  board uses, so every movement arrow measured a change of model
  rather than a week of football.
- A 2^n loop overflowed 32-bit bitwise on 30+ player rosters and
  returned 0 for nine of ten dynasty teams.

So: when changing a numeric path, diff old against new directly rather
than trusting tests. Mutate the code to confirm a test actually
discriminates. And check fixtures model states that can physically
occur — several modelled claims settling in the same millisecond, or
teams being "both unbeaten" by accident of a default.

---

## PROMPT FOR THE FRESH SESSION

> Picking up The League Beat. Branch
> `magazine-cover-archive-climb-share`, tree clean, all deployed.
> Read `docs/HANDOFF.md` first — it has full context on everything
> open.
>
> Start with **verifying presentation mode**: open
> `/leagues/:id/present/monday?present=1` and tell me whether the
> slide actually renders full-screen. The last fix is unconfirmed.
>
> After that, the priorities are:
> 1. **Phase 2 of the Issue work** — `loadCategoryIssue`, the sibling
>    adapter that puts baseball on the Issue. Spec at
>    `docs/superpowers/specs/2026-09-19-one-issue-all-sports.md`.
>    This also unblocks hockey and basketball.
> 2. **Test the Yahoo connection** — the API was approved and it has
>    never been tried since.
> 3. **Extract the shared card row** before building more social
>    cards.
>
> Hockey is blocked until I get you a real ESPN `fhl` or Yahoo `nhl`
> league id, and the answer to whether "Spare Parts" is category or
> points.
>
> Verify claims against the code rather than the comments — several
> comments in this repo are now stale, and `CLAUDE.md` is wrong about
> category sports needing their own detectors.

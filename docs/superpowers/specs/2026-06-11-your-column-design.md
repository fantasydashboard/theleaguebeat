# Your Column — the personal section (v1)

**Date:** 2026-06-11
**Status:** Approved design, pre-implementation
**Related:** product memory `project_distribution_strategy.md` (the "me layer")

## Goal & context

The product is league-level; the audience is twelve individuals. For the goal (the *whole* league reads it every week and forwards it), each member needs a personal reason to open and a personal artifact to share. Today the only "you" cue is the yellow row tint. **Your Column** is the personal section of the magazine: your team's biggest story, your live matchup, your rival, your season arc — read like the magazine, one-tap shareable like a card, and reachable by all twelve members (not just account-holders).

It does NOT become a dashboard. No tools, analytics, comments, or settings — that's UFD's domain and the brand discipline that keeps TLB editorial.

## Locked decisions

1. **Identity:** hybrid. Logged-in + connected → the viewer's own team automatically (`isMyTeam`). Guests pick their team from the roster (no account), choice persisted; a soft "make this yours" sign-up nudge.
2. **Layout:** "The Column" — a personal cover (mascot + headline + stat chips), then stacked editorial blocks (matchup, rival, arc), each individually shareable.
3. **Voice:** personal *labels* only ("Your Rival", "Your Matchup", "Your Arc" — allowed wayfinding per EDITORIAL.md); editorial *sentences* stay third-person and name the team ("Juuuust a bit outside leads HomeRun Slams 7-5"), so cards forward cleanly to the whole chat.
4. **Your Rival:** the all-time nemesis (most-played / closest head-to-head); fallback to this week's opponent early-season or when no clear rival exists.
5. **Nav order:** Your Column *first* (`Your Column · The Beat · The Issue · Chronicles`). The default landing page is unchanged for now (separate, A/B-able decision).

## The blocks + selection logic

A pure module `buildYourColumn(data, teamId)` (no I/O → unit-testable) returns the rendered blocks:

- **Your Hero** — your team's biggest story this week. Run the existing cover-story detector; if the league cover story's `teamId` is the viewer's team, use it. Otherwise select the team's top angle by priority: (1) a rank move worth a headline from `seasonRankHistory`, (2) a notable streak from `standings`, (3) the team's biggest result this week from the matchups. Renders eyebrow + third-person headline + stat chips (mirrors the Issue cover).
- **Your Matchup** — the current-week matchup containing the team; live status via the existing matchup renderers (`render-matchups` / `render-matchups-points`).
- **Your Rival** — from per-opponent head-to-head records: pick the opponent with the most meetings, tie-broken by the closest cumulative record. Fallback: this week's opponent. Renders a third-person grudge line ("X leads Y 7-5 all-time"). Hidden gracefully when there is no history and no current opponent.
- **Your Arc** — the team's rank trajectory from `seasonRankHistory`, classified climb / slide / arc (reuse the `detectWildArc` logic scoped to one team), rendered chronologically ("From #6 to #1. The biggest rise on the board.").

Every block carries a one-tap **Share** that reuses the existing share system (`useShareStory` + a personal `CoverCard` variant). The page is the read; the cards are the forward.

## Data dependency (the one new plumbing piece)

"Your Rival" needs per-opponent head-to-head records.
- **Category** leagues *may* still carry an H2H matrix (`CategoryLeagueDataH2HEntry`). **The plan must verify the category adapter still populates it** — that matrix fed the Rivalries section that was stripped on 2026-06-08, so the adapter may have stopped building it. If it's gone, reuse the same builder below for both formats.
- **Points** leagues do not carry one. Add an optional `h2hRecords` field to `LeagueDataH2HPoints`, computed in the points adapters from the all-weeks matchup map they already fetch (a sibling builder to `buildPointsStandings`: per-team → per-opponent `{ wins, losses, ties, meetings }`).

`buildYourColumn` reads H2H through a thin normalizer that accepts either source, so the block logic is format-agnostic. Simplest robust path: one shared `buildH2H(teams, weeklyMatchups)` builder used by both adapters, keyed off the per-week results both already compute.

## Architecture / components

| Unit | Responsibility | Depends on |
| --- | --- | --- |
| `src/views/YourColumnView.vue` | The page: hydrate live data / snapshot, resolve viewer team, render blocks + share | `useViewerTeam`, `buildYourColumn`, share system, live-data pattern |
| `src/composables/useViewerTeam.ts` | Identity: logged-in team, else guest picker (URL `?team=` + localStorage keyed by league), + sign-up nudge state | auth store, route |
| `src/editorial/yourColumn/buildYourColumn.ts` | Pure: `(LeagueData, teamId) → { hero, matchup, rival, arc }` | cover-story + matchup + arc detectors, H2H normalizer |
| `src/editorial/h2h/buildPointsH2H.ts` | Points per-opponent H2H from the all-weeks map | `LeagueDataPointsMatchup[]` |
| `MyLeagueLayout.vue` | Add the first nav tab | — |
| `src/router/index.ts` | `/leagues/:leagueId/your-column` route | — |

The blocks reuse existing detectors and the existing share-card pipeline — `buildYourColumn` is a *selection + framing* layer over machinery that already exists, not new editorial generation.

## Edge cases

- **Guest, no team picked** → the team picker IS the page's entry state.
- **Early season / no rival history** → fallback to this week's opponent; if there's no current matchup either, the Rival block is omitted (never faked).
- **ESPN identity** → `isMyTeam` resolves for logged-in ESPN (swid); guests pick.
- **Thin/first-connect data** → any block that can't populate is omitted, not invented (data-accuracy is a release gate).
- **The picked team isn't in the league** (stale URL/localStorage) → fall back to the picker.

## Testing

- `buildYourColumn(data, teamId)` — vitest: hero selection priority, nemesis pick + fallback, arc direction, third-person voice (no "you" in sentences), no em dashes. Both formats.
- `buildPointsH2H` — vitest: per-opponent tallies, meetings count, tie handling.
- Extends the existing `src/**/*.test.ts` suite.

## Out of scope (v1)

Comments / reactions / voting (the later "social object," separate). Changing the default landing page. Per-member personalized invite links (the identity model is auto-or-pick; links are a distribution follow-up). Any analytics/tools (UFD). Multi-league cross-league "your week" home (a separate surface for the individual-subscription tier).

## Open risks & assumptions

1. **Points H2H builder** is the only new data plumbing; low risk (mirrors `buildPointsStandings`, same inputs).
2. **Guest team-pick persistence** is per-device (localStorage + URL); a member on a new device re-picks. Acceptable for v1; sign-up is the durable path.
3. **"Top angle" selection** for the hero when no cover story fires needs a clear priority order (specified above) so it's deterministic and testable.

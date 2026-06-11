# Weekly Digest — Distribution Backbone (v1)

**Date:** 2026-06-11
**Status:** Approved design, pre-implementation
**Related:** project memory `project_distribution_strategy.md`

## Goal & context

The League Beat generates high-quality, league-specific editorial across three tabs but has **no automated distribution** — readers must remember to return and share manually. The distribution research (Sleeper's invite-driven, chat-native growth; the proven league-bot category) identified automated delivery into where the league already lives as the highest-leverage growth/retention lever.

This spec covers **v1: a Monday-morning email digest**, built as a reusable **delivery backbone** (a "refresh" step + a "send/fan-out" step) so the later Discord/GroupMe bot and SMS channels, and football content, plug into the same machinery rather than re-implementing delivery.

This is a proof-of-cadence: does scheduled delivery move weekly return visits? It is intentionally the smallest slice that exercises the full pipeline (schedule → fresh content → render → send → log).

## Locked decisions

1. **Freshness:** Fresh for **Yahoo** (cron regenerates the issue server-side before sending), **last-saved snapshot** for **ESPN** (ESPN auth is browser-cookie-bound and cannot run server-side).
2. **Recipient (v1):** **Commissioner only** — the connected user (`profiles.email`). No member lists yet.
3. **Provider:** **Resend** (new account, `RESEND_API_KEY`, verified `theleaguebeat.com` sending domain).

## Architecture (Approach A: decoupled refresh + send)

A Vercel Cron triggers one serverless function weekly. It runs two clearly separated phases:

```
vercel cron (Mon AM, UTC) ──▶ api/cron/weekly-digest  (runtime: nodejs, service-role Supabase)

  PHASE 1 — REFRESH (Yahoo leagues only)
    for each active Yahoo league:
      fetch fresh data server-side via the existing `yahoo-api` edge function (stored tokens)
        → run the imported, pure editorial pipeline (yahooAdapter → renderPRPage/detectCoverStory/etc.)
        → upsert the rendered issue into `league_issues` (data jsonb)
      on failure: log + continue (Phase 2 falls back to the last saved snapshot)

  PHASE 2 — SEND / FAN-OUT (all active leagues, both platforms)
    for each active league:
      read latest `league_issues.data` (fresh Yahoo / last-saved ESPN)
      if already sent this league/year/week (digest_send_log) → skip
      buildDigestEmail(issueData, league) → { subject, html }
      Resend.send(to = commissioner email, ...)
      insert into digest_send_log
```

The **Phase 2 send step is the backbone**: it reads persisted issues and fans out to destinations. v1 has one hard-coded destination (email → commissioner). Discord/GroupMe/SMS later become additional destination handlers behind the same loop.

### Why decoupled

- Phase 2 is platform-agnostic and pure-ish (read → render → deliver), so it's reusable and testable.
- Phase 1 isolates the only piece that needs server-side adapters (the technical risk), so it can be staged/hardened without blocking the send path.

## Components

| Unit | Purpose | Depends on |
| --- | --- | --- |
| `api/cron/weekly-digest.js` | Orchestrator: runs Phase 1 then Phase 2; per-league isolation; returns a run summary | Supabase service role, Resend, the two modules below |
| `api/_lib/yahooServerIssue.js` (or `.ts`) | Phase 1: fetch fresh Yahoo data server-side + run the editorial pipeline → issue `data` | `yahoo-api` edge function, imported `yahooAdapter` + render/cover-story modules |
| `src/editorial/digest/buildDigestEmail.ts` | Pure: `(issueData, league) → { subject, html }`. The email's editorial + visual quality lives here | issue `data` shape only (no I/O) |
| `digest_send_log` table | Idempotency + audit (`league_id, year, week, sent_at`) | — |
| `vercel.json` cron entry | Schedule | — |
| Resend client wrapper | `sendDigest({ to, subject, html })` | `RESEND_API_KEY` |

Each unit is independently understandable and testable; `buildDigestEmail` is the keystone and has no dependencies beyond the issue data shape.

## Data model

New table (migration), mirroring `trial_email_log`:

```sql
create table if not exists public.digest_send_log (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references public.leagues(id) on delete cascade,
  year         integer not null,
  week_number  integer not null,
  channel      text not null default 'email',   -- forward-compat for bot/sms
  sent_at      timestamptz not null default now(),
  unique (league_id, year, week_number, channel)
);
```

The `channel` column and the unique constraint generalize the log so the future bot/SMS destinations reuse the same dedup table. No `delivery_destinations` table in v1 (recipient is implicit: the commissioner); it lands when member lists / chat webhooks do.

## The Yahoo server-side refresh (the key risk)

The editorial pipeline (`yahooAdapter`, `renderPRPage`, `detectCoverStory`, `render-pr`, etc.) is pure TS and imports cleanly into a Node serverless function. The blocker is `yahooService`, which is written for the browser (Supabase-proxied calls + the user session). The plan:

- The cron, with the **service-role** key, reads the connected user's Yahoo tokens (same storage the `yahoo-refresh`/`yahoo-api` edge functions manage).
- It invokes the existing **`yahoo-api` edge function** server-side (passing the user identity), which already handles token refresh + the Yahoo proxy — so no token logic is re-implemented.
- A thin **server-side `yahooService` shim** routes the adapter's data calls through that edge function instead of the browser path.
- The adapter + render then run unchanged, producing the same `CategoryLeagueData` → issue `data` the client produces.

The implementation plan must verify, against one real Yahoo league, that the shim produces issue data identical to the client path before relying on it. If the shim proves heavier than expected, Phase 1 can ship behind a flag and v1 falls back to last-saved for Yahoo too (degrading to the "nudge + best-effort" option) without changing Phase 2.

## The email

`buildDigestEmail` composes a brand-consistent HTML email from the issue `data`:

- **Hero:** the issue cover image + the cover headline (e.g. "Juuuust a bit outside climbed to the top."). The image reuses the existing `api/og` `@vercel/og` endpoint (already serverless and brand-consistent); the email references it by URL so no new image pipeline is needed.
- **Teasers:** 2–3 one-line section pulls (top of Power Rankings, the marquee matchup, a Department quick-read) — all already in `data`.
- **CTA:** "Read the full issue" → the live app (always fresh on open) / the public share page.
- **Footer:** unsubscribe link + brand lockup.
- Voice clears the same `EDITORIAL.md` bar; no em dashes; mascot images carry identity. The email is a first impression in the inbox, so it gets the same craft as the in-app cover.

## Error handling & idempotency

- **Per-league isolation:** every league is processed in its own try/catch; one failure logs and never aborts the batch.
- **Idempotent:** `digest_send_log`'s unique constraint means re-running the cron (or a retry) never double-sends a league/week/channel.
- **Graceful degradation:** a Phase-1 refresh failure for a league → Phase 2 still emails the last saved snapshot (better a slightly-stale issue than none).
- **Run summary:** the function returns `{ refreshed, sent, skipped, failed[] }` for observability.

## Testing

- **`buildDigestEmail`** — vitest, pure: subject + HTML for a representative issue `data`; asserts hero/teaser/CTA present, no em dashes, no broken interpolation, points-vs-category copy correct.
- **Send-decision / dedup** — vitest: "already sent" → skip; "new week" → send.
- **Cron wiring** — integration-verified once against a real league (manual trigger), confirming Phase 1 fresh-Yahoo parity and a real Resend delivery.
- Extends the existing `src/**/*.test.ts` suite; reliability is now load-bearing (a wrong auto-sent email is public), so data-accuracy is a release gate.

## Out of scope (v1) — future phases

Member email lists (+ unsubscribe per-recipient), the Discord/GroupMe bot, SMS, ESPN server-side freshness, per-league send timezones, open/click tracking, football content (separate workstream). The schema (`channel`) and the Phase-2 fan-out are shaped so these slot in without rework.

## Open risks & assumptions

1. **Yahoo server-side shim** is the main unknown; mitigated by the flag/fallback above.
2. **Resend domain verification** (`theleaguebeat.com` DNS) is a one-time external setup the user performs before the first real send.
3. **Send timezone:** v1 sends at a single UTC-based time (e.g. Monday 13:00 UTC ≈ 9am ET). Per-league timezones are deferred.
4. **"Active league" definition:** assumed = a `leagues` row for the current season with a recent issue or live status; the plan will pin the exact query (avoid emailing dormant/abandoned leagues).

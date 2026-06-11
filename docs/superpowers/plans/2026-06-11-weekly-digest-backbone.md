# Weekly Digest — Distribution Backbone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Monday-morning email digest as a reusable delivery backbone — a Vercel cron that reads each league's persisted issue, renders a brand-consistent email, sends it to the commissioner via Resend, and logs it idempotently.

**Architecture:** Decoupled from content freshness. This plan builds the **send/fan-out path** (read persisted `league_issues` → `buildDigestEmail` → Resend → `digest_send_log`). The email content comes from the last-saved snapshot. The separate **Yahoo server-side fresh refresh (spec Phase 1)** is a follow-up that needs a `yahooService`-server-side spike first; it plugs into this backbone without changing it.

**Tech Stack:** Vercel serverless (`nodejs` runtime) + Cron, Supabase (service-role), Resend (HTTP API via `fetch`, no SDK dep), esbuild (already present via Vite) to bundle the pure editorial email builder for the function, vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-06-11-weekly-digest-backbone-design.md`

---

## File Structure

| File | Responsibility | New/Modified |
| --- | --- | --- |
| `supabase/migrations/20260611_digest_send_log.sql` | Idempotency/audit table | Create |
| `src/services/issueArchive.ts` | Loosen snapshot type to accept points data | Modify |
| `src/views/IssueView.vue` | Persist points-league snapshots on live load | Modify (after line 1800) |
| `src/editorial/digest/buildDigestEmail.ts` | Pure: `(LeagueData, ctx) → { subject, html }` | Create |
| `src/editorial/digest/__tests__/buildDigestEmail.test.ts` | Unit tests for the builder | Create |
| `src/editorial/digest/serverEntry.ts` | esbuild entry re-exporting the builder | Create |
| `scripts/build-digest-server.mjs` | esbuild bundle → `api/_generated/digest-server.mjs` | Create |
| `api/_lib/resend.mjs` | `sendEmail({to,subject,html})` via Resend HTTP API | Create |
| `api/cron/weekly-digest.js` | Orchestrator: query → dedup → build → send → log | Create |
| `vercel.json` | Cron schedule + build step | Modify |
| `.gitignore` | Ignore the generated bundle | Modify |
| `package.json` | `build:digest` script; wire into `build` | Modify |

---

## Task 1: `digest_send_log` migration

**Files:**
- Create: `supabase/migrations/20260611_digest_send_log.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Weekly digest idempotency + audit log. One row per (league, week, channel)
-- that has been delivered, so the cron is safely re-runnable and never
-- double-sends. `channel` is forward-compat for the future bot/SMS fan-out.
create table if not exists public.digest_send_log (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references public.leagues(id) on delete cascade,
  year         integer not null,
  week_number  integer not null,
  channel      text not null default 'email',
  sent_at      timestamptz not null default now(),
  unique (league_id, year, week_number, channel)
);

create index if not exists idx_digest_send_log_league
  on public.digest_send_log (league_id, year, week_number desc);

-- Service-role only: the cron writes via SUPABASE_SERVICE_ROLE_KEY (bypasses
-- RLS). No client ever reads/writes this table, so RLS stays on with no
-- policies (default-deny for anon/auth roles).
alter table public.digest_send_log enable row level security;
```

- [ ] **Step 2: Verify the SQL parses (lint)**

Run: `grep -c "create table" supabase/migrations/20260611_digest_send_log.sql`
Expected: `1`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260611_digest_send_log.sql
git commit -m "feat(digest): add digest_send_log table for send idempotency"
```

> NOTE: Apply to Supabase via your normal migration flow (`supabase db push` or the dashboard) before the first real cron run. This plan does not auto-apply migrations.

---

## Task 2: Persist points-league snapshots

Points leagues currently never write to `league_issues` (only the category path does), so the digest would have no content for them. Loosen the snapshot type and add a write on the points live-load path.

**Files:**
- Modify: `src/services/issueArchive.ts`
- Modify: `src/views/IssueView.vue:1800`

- [ ] **Step 1: Loosen the snapshot data type**

In `src/services/issueArchive.ts`, change the imports and the two signatures so points data is accepted. Replace:

```typescript
import type { CategoryLeagueData } from '@/editorial/types'

export interface IssueSnapshot {
  data: CategoryLeagueData
  publishedAt: Date
}
```

with:

```typescript
import type { LeagueData } from '@/editorial/types'

export interface IssueSnapshot {
  data: LeagueData
  publishedAt: Date
}
```

Then change `readIssueSnapshot`'s return cast `data.data as CategoryLeagueData` → `data.data as LeagueData`, and `writeIssueSnapshot`'s parameter `data: CategoryLeagueData` → `data: LeagueData`.

- [ ] **Step 2: Persist the points snapshot on live load**

In `src/views/IssueView.vue`, immediately after line 1800 (`livePointsData.value = adapted`), add:

```typescript
      // Persist the points issue so the weekly-digest cron has content to
      // email. Keyed by the live week; the cron reads the latest per league.
      if (leagueRowId) {
        void writeIssueSnapshot(
          leagueRowId,
          adapted.currentSeason,
          adapted.currentWeek,
          adapted,
        )
      }
```

(`writeIssueSnapshot` is already imported at line 674; `leagueRowId` is already in scope in this function — confirm both before adding.)

- [ ] **Step 3: Typecheck**

Run: `npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -E "issueArchive|IssueView" || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 4: Manual verification**

Run `npm run dev`, open a connected **points** league's Issue, then query Supabase:
`select league_id, year, week_number from league_issues order by published_at desc limit 3;`
Expected: a row for that league appears.

- [ ] **Step 5: Commit**

```bash
git add src/services/issueArchive.ts src/views/IssueView.vue
git commit -m "feat(digest): persist points-league issue snapshots for delivery"
```

---

## Task 3: `buildDigestEmail` (pure builder + tests)

The keystone. Pure function: given a persisted `LeagueData` snapshot, render the email subject + HTML. Runs the editorial cover-story detector for the hero headline (no I/O), so it's fully unit-testable.

**Files:**
- Create: `src/editorial/digest/buildDigestEmail.ts`
- Test: `src/editorial/digest/__tests__/buildDigestEmail.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { buildDigestEmail } from '@/editorial/digest/buildDigestEmail'
import type { LeagueDataH2HPoints, CategoryLeagueDataWeeklyRanks } from '@/editorial/types'

const team = (id: string) => ({
  id, name: id, ownerName: '', ownerInitials: id.slice(0, 2), avatarUrl: undefined, avatarColor: 'x', isMyTeam: false,
})
function histFor(climber: string, ranks: number[], ids: string[]): CategoryLeagueDataWeeklyRanks[] {
  return ranks.map((cr, wi) => {
    const r: Record<string, number> = { [climber]: cr }
    let n = 1
    for (const id of ids) { if (id === climber) continue; while (n === cr) n++; r[id] = n; n++ }
    return { week: wi + 1, ranks: r }
  })
}
const T8 = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8']
const data = {
  format: 'h2h-points', leagueId: 'L', leagueName: 'Baseball Buddies', currentWeek: 12, currentSeason: 2026,
  teams: T8.map(team),
  standings: T8.map((id, i) => ({ rank: i + 1, teamId: id, catWins: 8 - i, catLosses: 3, catTies: 0, winPct: 0.7, streak: { type: 'W' as const, length: 2 }, lastSix: [], ownsCount: 0, bleedingCount: 0 })),
  seasonRankHistory: histFor('t1', [6, 5, 4, 2, 1, 1], T8),
} as unknown as LeagueDataH2HPoints

const ctx = { leagueName: 'Baseball Buddies', issueUrl: 'https://theleaguebeat.com/i/abc', ogImageUrl: 'https://theleaguebeat.com/api/og/abc', unsubscribeUrl: 'https://theleaguebeat.com/u/abc' }

describe('buildDigestEmail', () => {
  it('puts the cover headline in the subject and body', () => {
    const { subject, html } = buildDigestEmail(data, ctx)
    expect(subject).toContain('Baseball Buddies')
    expect(subject).toMatch(/climbed to the top/)
    expect(html).toMatch(/climbed to the top/)
  })
  it('includes the cover image, the read CTA, and an unsubscribe link', () => {
    const { html } = buildDigestEmail(data, ctx)
    expect(html).toContain(ctx.ogImageUrl)
    expect(html).toContain(ctx.issueUrl)
    expect(html).toContain(ctx.unsubscribeUrl)
  })
  it('emits no em dashes (EDITORIAL.md)', () => {
    const { subject, html } = buildDigestEmail(data, ctx)
    expect(subject + html).not.toMatch(/—/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- buildDigestEmail`
Expected: FAIL — `buildDigestEmail` not found.

- [ ] **Step 3: Implement the builder**

Create `src/editorial/digest/buildDigestEmail.ts`:

```typescript
/**
 * buildDigestEmail — pure renderer for the weekly digest email.
 *
 * Input is a persisted LeagueData snapshot (the same shape stored in
 * league_issues.data). Runs the cover-story detector for the hero
 * headline and pulls the top of the ladder, then composes an inline-styled
 * HTML email (email clients require inline CSS). No I/O — fully testable.
 *
 * Voice clears EDITORIAL.md: no em dashes; the headline is the forwardable
 * line. The email is a nudge: hero + one ladder line + a read CTA.
 */
import type { LeagueData } from '@/editorial/types'
import { detectCoverStory, detectPointsCoverStory } from '@/editorial/cover-story'
import { stripEmojiForEditorial } from '@/editorial/detect-lede'

export interface DigestContext {
  leagueName: string
  issueUrl: string
  ogImageUrl: string
  unsubscribeUrl: string
}

export interface DigestEmail {
  subject: string
  html: string
}

const BG = '#0a0a0b'
const CARD = '#141416'
const TEXT = '#f4f4f5'
const MUTED = '#a1a1aa'
const ACCENT = '#facc15' // brand yellow

export function buildDigestEmail(data: LeagueData, ctx: DigestContext): DigestEmail {
  const cover = data.format === 'h2h-points'
    ? detectPointsCoverStory(data)
    : detectCoverStory(data)

  const eyebrow = cover?.eyebrow ?? 'THIS WEEK'
  const headline = cover?.headline ?? `This week in ${ctx.leagueName}.`

  const standings = [...(data.standings ?? [])].sort((a, b) => a.rank - b.rank)
  const leaderName = standings[0]
    ? stripEmojiForEditorial(nameOf(data, standings[0].teamId)) || nameOf(data, standings[0].teamId)
    : null
  const ladderLine = leaderName
    ? `${leaderName} leads the ${standings.length}-team ladder.`
    : ''

  const subject = `${ctx.leagueName}: ${headline}`

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:${BG};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
<tr><td align="center" style="padding:24px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td style="font:700 12px/1 Arial,sans-serif;letter-spacing:2px;color:${ACCENT};padding:0 0 12px;">THE LEAGUE BEAT</td></tr>
    <tr><td>
      <a href="${ctx.issueUrl}" style="text-decoration:none;">
        <img src="${ctx.ogImageUrl}" alt="${esc(ctx.leagueName)} cover" width="560" style="width:100%;max-width:560px;border-radius:14px;display:block;" />
      </a>
    </td></tr>
    <tr><td style="padding:20px 0 6px;font:700 11px/1 Arial,sans-serif;letter-spacing:2px;color:#ec4899;">${esc(eyebrow)}</td></tr>
    <tr><td style="font:800 26px/1.15 Arial,sans-serif;color:${TEXT};">${esc(headline)}</td></tr>
    ${ladderLine ? `<tr><td style="padding:10px 0 0;font:400 15px/1.4 Arial,sans-serif;color:${MUTED};">${esc(ladderLine)}</td></tr>` : ''}
    <tr><td style="padding:22px 0 0;">
      <a href="${ctx.issueUrl}" style="display:inline-block;background:${ACCENT};color:#111;text-decoration:none;font:700 15px/1 Arial,sans-serif;padding:14px 22px;border-radius:10px;">Read this week's issue &rarr;</a>
    </td></tr>
    <tr><td style="padding:28px 0 0;border-top:1px solid #222;margin-top:24px;font:400 12px/1.5 Arial,sans-serif;color:#71717a;">
      You're getting this because your league is on The League Beat.
      <a href="${ctx.unsubscribeUrl}" style="color:#71717a;">Unsubscribe</a>.
    </td></tr>
  </table>
</td></tr></table></body></html>`

  return { subject, html }
}

function nameOf(data: LeagueData, teamId: string): string {
  return data.teams.find((t) => t.id === teamId)?.name ?? teamId
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- buildDigestEmail`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/editorial/digest/buildDigestEmail.ts src/editorial/digest/__tests__/buildDigestEmail.test.ts
git commit -m "feat(digest): pure buildDigestEmail renderer + tests"
```

---

## Task 4: Bundle the builder for the serverless function

The Vercel function (`.js` in `api/`) cannot reliably import TS from `src/` with the `@/` alias. Bundle a server entry to a self-contained ESM file with esbuild (the same alias-resolving pattern proven by the editorial test harnesses).

**Files:**
- Create: `src/editorial/digest/serverEntry.ts`
- Create: `scripts/build-digest-server.mjs`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Write the server entry**

Create `src/editorial/digest/serverEntry.ts`:

```typescript
// Server bundle entry — esbuild bundles this (resolving the @ alias) into
// api/_generated/digest-server.mjs so the Vercel function can import a
// self-contained module with no path-alias dependency.
export { buildDigestEmail } from './buildDigestEmail'
export type { DigestContext, DigestEmail } from './buildDigestEmail'
```

- [ ] **Step 2: Write the build script**

Create `scripts/build-digest-server.mjs`:

```javascript
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

await build({
  entryPoints: [path.join(root, 'src/editorial/digest/serverEntry.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  alias: { '@': path.join(root, 'src') },
  outfile: path.join(root, 'api/_generated/digest-server.mjs'),
  logLevel: 'info',
})
console.log('built api/_generated/digest-server.mjs')
```

- [ ] **Step 3: Wire the scripts**

In `package.json` scripts, add `build:digest` and chain it into `build`:

```json
    "build": "vite build && npm run build:digest",
    "build:digest": "node scripts/build-digest-server.mjs",
```

- [ ] **Step 4: Ignore the generated artifact**

Append to `.gitignore`:

```
api/_generated/
```

- [ ] **Step 5: Build and verify the bundle exists and exports the function**

Run: `npm run build:digest && node -e "import('./api/_generated/digest-server.mjs').then(m => console.log(typeof m.buildDigestEmail))"`
Expected: prints `function`.

- [ ] **Step 6: Commit**

```bash
git add src/editorial/digest/serverEntry.ts scripts/build-digest-server.mjs package.json .gitignore
git commit -m "build(digest): esbuild server bundle of the email builder"
```

---

## Task 5: Resend wrapper

**Files:**
- Create: `api/_lib/resend.mjs`

- [ ] **Step 1: Write the wrapper**

Create `api/_lib/resend.mjs`:

```javascript
// Minimal Resend client over the HTTP API (no SDK dependency). Sends one
// transactional email. Throws on non-2xx so the caller can log + continue.
const FROM = 'The League Beat <issues@theleaguebeat.com>'

export async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}
```

- [ ] **Step 2: Commit**

```bash
git add api/_lib/resend.mjs
git commit -m "feat(digest): Resend HTTP wrapper"
```

> SETUP (one-time, owner): create a Resend account, verify the `theleaguebeat.com` sending domain (DNS), and set `RESEND_API_KEY` in Vercel project env. The `issues@` from-address must be on the verified domain.

---

## Task 6: Cron orchestrator + schedule

**Files:**
- Create: `api/cron/weekly-digest.js`
- Modify: `vercel.json`

- [ ] **Step 1: Write the orchestrator**

Create `api/cron/weekly-digest.js`:

```javascript
// Weekly digest cron (Phase 2 — send/fan-out). For each active league with a
// persisted issue, render the email from the last-saved snapshot and send it
// to the commissioner, idempotently (digest_send_log). Per-league isolation:
// one failure never aborts the batch. Phase 1 (server-side Yahoo refresh)
// plugs in BEFORE this loop later, writing fresh data into league_issues.
import { buildDigestEmail } from '../_generated/digest-server.mjs'
import { sendEmail } from '../_lib/resend.mjs'

export const config = { runtime: 'nodejs', maxDuration: 300 }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const APP_ORIGIN = process.env.PUBLIC_APP_ORIGIN || 'https://theleaguebeat.com'

async function sb(pathAndQuery, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

export default async function handler(req, res) {
  // Vercel Cron sends a bearer token; reject anything else.
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return res.status(500).json({ error: 'missing supabase env' })
  }

  const summary = { sent: 0, skipped: 0, failed: [] }

  // Latest persisted issue per league, joined to the owner's email + name.
  // (Postgres view/RPC could pre-join; here we fetch issues then resolve.)
  const issues = await sb(
    'league_issues?select=league_id,year,week_number,data,published_at,leagues(id,league_name,user_id,profiles(email))&order=published_at.desc',
  )

  const seenLeague = new Set()
  for (const row of issues) {
    if (seenLeague.has(row.league_id)) continue // keep only the newest per league
    seenLeague.add(row.league_id)
    const league = row.leagues
    const email = league?.profiles?.email
    if (!email) { summary.skipped++; continue }

    try {
      // Idempotency: skip if already sent this league/year/week/email.
      const already = await sb(
        `digest_send_log?select=id&league_id=eq.${row.league_id}&year=eq.${row.year}&week_number=eq.${row.week_number}&channel=eq.email`,
      )
      if (already.length) { summary.skipped++; continue }

      const ctx = {
        leagueName: league.league_name,
        issueUrl: `${APP_ORIGIN}/leagues/${row.league_id}/the-issue`,
        ogImageUrl: `${APP_ORIGIN}/api/og/${row.league_id}`,
        unsubscribeUrl: `${APP_ORIGIN}/u/${row.league_id}`,
      }
      const { subject, html } = buildDigestEmail(row.data, ctx)
      await sendEmail({ to: email, subject, html })
      await sb('digest_send_log', {
        method: 'POST',
        body: JSON.stringify({ league_id: row.league_id, year: row.year, week_number: row.week_number, channel: 'email' }),
      })
      summary.sent++
    } catch (e) {
      summary.failed.push({ league_id: row.league_id, error: String(e).slice(0, 200) })
    }
  }

  return res.status(200).json(summary)
}
```

- [ ] **Step 2: Add the cron schedule + ensure the build emits the bundle**

In `vercel.json`, add a `crons` array (Monday 13:00 UTC ≈ 9am ET) and confirm the build command produces the bundle (Task 4 chained it into `build`). Add:

```json
  "crons": [
    { "path": "/api/cron/weekly-digest", "schedule": "0 13 * * 1" }
  ]
```

- [ ] **Step 3: Typecheck the wider project still builds**

Run: `npm run build 2>&1 | tail -2`
Expected: `✓ built` and the bundle step logs `built api/_generated/digest-server.mjs`.

- [ ] **Step 4: Commit**

```bash
git add api/cron/weekly-digest.js vercel.json
git commit -m "feat(digest): weekly cron orchestrator + Monday schedule"
```

> SETUP (one-time, owner): set `CRON_SECRET` and `PUBLIC_APP_ORIGIN` in Vercel env. Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>`.

---

## Task 7: Integration verification

- [ ] **Step 1: Dry-run against one real league (preview)**

Deploy to a Vercel preview with all env vars set. Open a connected league's Issue once (to ensure a `league_issues` row), then trigger the cron manually:

```bash
curl -s -X POST "$PREVIEW_URL/api/cron/weekly-digest" \
  -H "Authorization: Bearer $CRON_SECRET" | tee /tmp/digest-run.json
```
Expected: JSON `{ "sent": >=1, "skipped": .., "failed": [] }`, and the email arrives in the commissioner's inbox with the cover image, headline, and working "Read this week's issue" link.

- [ ] **Step 2: Verify idempotency**

Re-run the same curl.
Expected: `{ "sent": 0, "skipped": >=1, "failed": [] }` (the send-log prevents a double-send).

- [ ] **Step 3: Spot-check the email**

Confirm: no em dashes, the headline matches the league's current cover story, the unsubscribe link is present, and the image renders in Gmail + Apple Mail.

---

## Out of scope (this plan) — follow-ups

- **Yahoo server-side fresh refresh (spec Phase 1).** Requires a spike: can the bundled `yahooAdapter` run in the function with a server-side `yahooService` that calls the `yahoo-api` edge function using stored tokens? Brainstorm + spike → its own plan. Until then, content is last-saved.
- **Unsubscribe handling** (the `/u/:id` route currently just needs to exist; wire real opt-out when member lists land).
- **Member email lists, Discord/GroupMe bot, SMS** — additional `channel` handlers behind the Task 6 loop; the `digest_send_log.channel` column already accommodates them.
- **Football content** — separate workstream; inherits this backbone unchanged.

---

## Self-Review

- **Spec coverage:** decoupled refresh/send (this plan = send; refresh = flagged follow-up) ✓; commissioner-only recipient (Task 6 reads `profiles.email`) ✓; Resend (Task 5) ✓; `buildDigestEmail` pure + testable (Task 3) ✓; `digest_send_log` with `channel` (Task 1) ✓; idempotency + per-league isolation (Task 6) ✓; reuse `api/og` image (Task 3 `ogImageUrl`) ✓; testing (Task 3 unit + Task 7 integration) ✓. Gap surfaced and handled: points snapshots weren't persisted → Task 2 adds it.
- **Placeholder scan:** none — every code step is complete; the two one-time owner SETUP notes are external account/DNS actions, not code placeholders.
- **Type consistency:** `buildDigestEmail(LeagueData, DigestContext): DigestEmail` is consistent across Task 3 (def), Task 4 (re-export), Task 6 (call). `sendEmail({to,subject,html})` consistent across Task 5/6. `digest_send_log` columns consistent across Task 1/6.

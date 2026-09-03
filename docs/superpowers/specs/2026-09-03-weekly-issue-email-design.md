# Weekly Issue Email — Design

**Status:** spec, not built. Written 2026-09-03.

**Goal:** every Tuesday morning, everyone who asked for a league's Issue
gets an email that makes them want to open it.

---

## What already exists

Verified against the codebase and the live database, not assumed.

| | State |
|---|---|
| `/i/:leagueUUID` | Server-rendered share shell with per-issue OG tags, via SERVICE_ROLE. `www` 307 is a domain redirect, not a fault. |
| `/api/og/:slug` | Preview image, reads `league_issues` for the latest week. |
| `league_issues` | `(league_id, year, week_number)` unique, `data jsonb`, `published_at`. RLS scoped to the league's owner. |
| `trial_email_log` | `(user_id, email_id)` unique — UFD's send-once ledger. |
| Sleeper `/v1/state/nfl` | `week`, `season_type`, `season_start_date`. The week oracle. |

**Nothing sends email automatically, in either product.** UFD's emails
are hand-sent: `AdminView.vue` holds the HTML as template literals
behind "Copy HTML" buttons, and `trial_email_log` records what a human
already pasted. There is no provider dependency, no edge function and
no cron in either repo.

That reframes this work. It is not "add a cron to the existing email
system" — it is the first automated send either product has had, and
it carries the whole cost of becoming a sender: a warmed domain, DKIM
and SPF, a suppression list, and a bounce path. Budget for that
explicitly rather than discovering it after the first 200 messages go
to spam.

---

## The problem that shapes everything

**We cannot reach a league.** `leagues` is keyed by `user_id` — one row
per *person* per league — and Sleeper exposes no member emails. A
league where one manager signed up is, to us, a league of one.

So the email cannot be a broadcast to a roster we already hold. It has
to be built from people who ask for it, one at a time. That constraint
sets the architecture below, and it is also the opportunity: the list
that results is a real opted-in audience, which is the thing the free
product was supposed to produce in the first place.

---

## Architecture

```
Commissioner posts /i/:slug to the league chat
        │
        ▼
/i/:slug  ──►  "Get this every Tuesday"  ──►  confirm email
        │
        ▼
issue_subscribers  (email, league_id, confirmed_at, unsubscribed_at)
        │
        ▼
Tue 09:00 ET — Vercel Cron  ──►  /api/cron/weekly-issue
        │
        ├─ for each league with ≥1 confirmed subscriber
        ├─ skip unless the week actually closed
        ├─ build the Issue server-side, upsert league_issues
        └─ send teaser via provider ──► issue_email_log
```

### Recipients: subscribe from the share link

Chosen over two alternatives:

- **Only our signed-in users** ships fastest and reaches one person for
  most leagues. It is delivery without distribution.
- **Commissioner uploads emails** reaches the whole league in week one
  and is how a new sending domain gets blocked. Mail nobody requested,
  sent from a domain with no reputation, is the single fastest way to
  poison deliverability for every later send — including the ones
  people did ask for.

Existing signed-in users are seeded as confirmed subscribers to their
own leagues: they have an account and a relationship, and the consent
is real.

### Scope: Sleeper only, and this is not phasing

ESPN's auth is browser-cookie-bound. A cron has no cookies, so an ESPN
Issue **cannot** be built server-side — not "not yet". Yahoo may be
reachable through the existing `yahoo-refresh` edge function, but its
tokens are per-user and that is its own project.

A cron that quietly produced nothing for ESPN leagues would look like a
bug forever. Better: those leagues are ineligible, the subscribe form
says so, and nobody is offered a thing that cannot arrive.

### Content: teaser, not the issue

Subject, headline, the OG image, one link. Full-issue HTML email is a
hostile format — no grid, no web fonts, and a decade of client quirks —
and would take twice the work to produce a worse read than the page
that already exists. The email's job is to get someone to the page.

---

## Schema

`supabase/migrations/20260903_issue_subscribers.sql`

```sql
create table if not exists public.issue_subscribers (
  id              uuid primary key default gen_random_uuid(),
  league_id       uuid not null references public.leagues(id) on delete cascade,
  email           text not null,
  -- Null until the confirmation link is clicked. Nothing is ever sent
  -- to an unconfirmed row: it is what separates "someone typed this
  -- address" from "the person who owns it wants this".
  confirmed_at    timestamptz,
  confirm_token   text not null,
  -- Set, never deleted. A deleted row would let the same address be
  -- re-added by anyone and start receiving again, which is exactly
  -- what unsubscribing is supposed to prevent.
  unsubscribed_at timestamptz,
  -- 'self' | 'account' — how consent was obtained, kept for the day
  -- someone asks us to prove it.
  source          text not null default 'self',
  created_at      timestamptz not null default now(),
  unique (league_id, email)
);

-- Send-once ledger, mirroring trial_email_log. The unique constraint
-- IS the idempotency: a cron that retries, or runs twice because a
-- deploy overlapped it, cannot double-send.
create table if not exists public.issue_email_log (
  id             uuid primary key default gen_random_uuid(),
  subscriber_id  uuid not null references public.issue_subscribers(id) on delete cascade,
  league_id      uuid not null references public.leagues(id) on delete cascade,
  year           integer not null,
  week_number    integer not null,
  provider_id    text,
  sent_at        timestamptz not null default now(),
  unique (subscriber_id, year, week_number)
);
```

RLS: both tables service-role only. Subscribing goes through an API
route, not the anon client — an anon-writable subscriber table is a
spam relay, and an anon-readable one leaks every address.

---

## Cron

Vercel Cron in `vercel.json`, calling `/api/cron/weekly-issue`.
Preferred over Supabase `pg_cron` because the Issue builder is
TypeScript that already runs in this repo's serverless runtime;
reimplementing it in an edge function would be a second copy of the
editorial pipeline, and two copies drift.

**Tuesday 09:00 ET.** Monday Night Football ends late Monday; Tuesday
morning is the first moment the week is unambiguously closed and the
standings are final. Wednesday is waiver day and belongs to a different
email.

**Guards, in order:**

1. `season_type === 'regular'` — no offseason sends.
2. The week has **closed** — never inferred from "everyone has scored",
   because Sleeper points accumulate live. Use the state endpoint's
   week boundary.
3. The Issue has content. A league with no completed matchups gets
   nothing; an empty issue is worse than silence.
4. `issue_email_log` has no row for `(subscriber, year, week)`.

**Auth:** Vercel injects `CRON_SECRET`; the route rejects anything
without it. Otherwise the endpoint is a public "email everyone" button.

---

## Failure modes

| Failure | Response |
|---|---|
| Cron fires twice | Unique constraint on the log drops the second send. |
| Provider 5xx | Log the failure, do not write the log row, retry next run. Never write the row before the send returns. |
| One league throws | Catch per league. One bad league must not cancel the other 99. |
| Week has no data | Skip silently. Not an error. |
| Hard bounce | Suppress the address. A repeatedly-bouncing list is what gets a domain blocked. |
| Subscriber's league is deleted | `on delete cascade` removes both rows. |

---

## What must be true before the first send

- Sending domain with SPF, DKIM and DMARC on `theleaguebeat.com`.
- Unsubscribe link in every message, honoured immediately, plus
  `List-Unsubscribe` headers.
- Physical postal address in the footer — CAN-SPAM requires it.
- A real send to a seed list before any league sees it.

---

## Phasing

1. **Subscribe loop.** Table, API route, form on `/i/:slug`,
   double opt-in, unsubscribe. Testable with no cron and no provider,
   and it is the long pole — nothing else matters without a list.
2. **Provider + one manual send.** Prove deliverability by hand, the
   way UFD does today, before automating it.
3. **Cron.** Wire the schedule once a hand-send is known to arrive.
4. **Yahoo**, if the refresh path holds.

---

## Open questions

- **Who owns the list?** Subscribers are per league, and a league has
  no owner in our schema — only rows keyed by user. If the manager who
  connected it deletes their account, the cascade takes the subscribers
  with it. This is the same league-entity-vs-person question the
  product has deferred twice, and the email is the first feature that
  cannot route around it.
- **One email per league, or one per person?** Someone in three
  leagues gets three emails on the same Tuesday. Digesting them is
  nicer and is a different builder.
- **Provider.** Nothing is chosen. UFD names none — its "Copy HTML"
  flow means a human pastes into whatever client they like — so this is
  a genuinely open decision, not an inherited one.

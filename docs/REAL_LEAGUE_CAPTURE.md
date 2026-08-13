# Capturing a real league for the weekly Reel video

The video pipeline (`video/`) only ever renders a committed demo
fixture. This doc is how to point it at a REAL league instead, without
ever committing real league data to the repo.

## Why capture happens in the browser

The video pipeline needs a `CategoryLeagueData` JSON blob — exactly
what's stored in `league_issues.data` (see
`supabase/migrations/20260606_league_issues.sql`). That table is
protected by row-level security: a row is only readable by the
Supabase user who owns the league it belongs to (`leagues.user_id`).

Locally we only have the **anon key**, not a service-role key — and we
shouldn't wire a service-role key into a local script just to read one
league's data. The anon key alone can't satisfy that RLS policy; only
a request carrying the *signed-in user's session* can. That session
already lives in your browser's `localStorage` because you're signed
in at the app. So capture has to happen there — a Node script has no
way to authenticate as you.

## Step 1 — make sure the snapshot exists

`league_issues` is written lazily: the Issue view snapshots the most
recently **concluded** week the first time anyone loads any Issue page
for that league (see the "Snapshot write — lazy, fire-and-forget"
block in `src/views/IssueView.vue`). If nobody's opened the Issue for
your league since that week ended, the row doesn't exist yet.

Open your real league's Issue page in the browser you're signed in on:

```
https://theleaguebeat.com/leagues/<your-league-id>/the-issue
```

(`<your-league-id>` is the Supabase `leagues.id` UUID — it's already
in the URL any time you're viewing your league.) Loading that page is
enough; it writes the snapshot for you in the background. Do this
first, or Step 2 will find zero rows.

## Step 2 — download the snapshot from the browser console

With that same league's Issue page open (so your session is live and
same-origin), open DevTools → Console and paste the snippet below.

Before pasting, grab your anon key from `.env.local` — the value of
`VITE_SUPABASE_ANON_KEY` — and drop it into the `ANON_KEY` line. The
project ref (`ergxtydfgffqgkddclvr`) is already filled in.

```js
(async () => {
  const PROJECT_REF = 'ergxtydfgffqgkddclvr'
  const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`
  const ANON_KEY = 'PASTE_VITE_SUPABASE_ANON_KEY_FROM_.env.local_HERE'

  // supabase-js's localStorage key format has changed across versions
  // (e.g. `sb-<ref>-auth-token`), so find it by content rather than
  // hardcoding the exact name.
  const sessionKey = Object.keys(localStorage).find(
    (k) => k.includes(PROJECT_REF) && k.startsWith('sb-'),
  )
  if (!sessionKey) {
    console.error(
      `[capture] No Supabase session found in localStorage for project "${PROJECT_REF}". ` +
      `Make sure you're signed in to The League Beat in THIS tab, then re-run this snippet.`,
    )
    return
  }

  let session
  try {
    session = JSON.parse(localStorage.getItem(sessionKey))
  } catch (e) {
    console.error(`[capture] Found key "${sessionKey}" but it isn't valid JSON.`, e)
    return
  }

  const accessToken = session?.access_token ?? session?.currentSession?.access_token
  if (!accessToken) {
    console.error(
      `[capture] Found session key "${sessionKey}" but no access_token inside it. ` +
      `The session shape may have changed — run localStorage.getItem("${sessionKey}") ` +
      `and look for the token by hand.`,
    )
    return
  }

  const authHeaders = { apikey: ANON_KEY, Authorization: `Bearer ${accessToken}` }

  // List available snapshots so you can pick one.
  const listUrl =
    `${SUPABASE_URL}/rest/v1/league_issues` +
    `?select=id,league_id,year,week_number,published_at` +
    `&order=year.desc,week_number.desc`
  const listRes = await fetch(listUrl, { headers: authHeaders })

  if (listRes.status === 401) {
    console.error(
      '[capture] 401 Unauthorized. Either the anon key you pasted is wrong (re-check ' +
      '.env.local), or your session has expired — refresh the page to renew it and re-run.',
    )
    return
  }
  if (!listRes.ok) {
    console.error(`[capture] Query failed: ${listRes.status} ${listRes.statusText}`, await listRes.text())
    return
  }

  const rows = await listRes.json()
  if (rows.length === 0) {
    console.error(
      '[capture] Zero rows. No Issue snapshot exists yet for any league you own — ' +
      'this means Step 1 (viewing the Issue page for a concluded week) hasn\'t happened ' +
      'yet, or RLS is filtering rows because you\'re signed in as a different user than ' +
      'the league owner. Do Step 1, then re-run this snippet.',
    )
    return
  }

  console.log(`[capture] Found ${rows.length} snapshot(s):`)
  rows.forEach((r, i) =>
    console.log(`  [${i}] league_id=${r.league_id}  year=${r.year}  week=${r.week_number}  published_at=${r.published_at}`),
  )
  console.log('[capture] Run downloadIssue(<index>) to download that row, e.g. downloadIssue(0)')

  window.downloadIssue = async (index) => {
    const row = rows[index]
    if (!row) {
      console.error(`[capture] No row at index ${index}. Valid indices: 0..${rows.length - 1}`)
      return
    }
    const detailUrl = `${SUPABASE_URL}/rest/v1/league_issues?id=eq.${row.id}&select=data`
    const detailRes = await fetch(detailUrl, { headers: authHeaders })
    if (!detailRes.ok) {
      console.error(`[capture] Fetch failed: ${detailRes.status} ${detailRes.statusText}`)
      return
    }
    const [record] = await detailRes.json()
    if (!record) {
      console.error('[capture] No record came back for that id — RLS likely blocked it.')
      return
    }
    const blob = new Blob([JSON.stringify(record.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `league-${row.league_id}-${row.year}-wk${row.week_number}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    console.log(`[capture] Downloaded ${a.download}`)
  }
})()
```

It logs the available `(league_id, year, week_number)` rows, then
`downloadIssue(0)` (or whichever index) downloads that row's `data`
column as a `.json` file via your browser's normal download flow.

## Step 3 — build and render

Save the downloaded file under `.local/` at the repo root (gitignored
— see below) — for example `.local/my-league-wk7.json`. Then, from the
repo root:

```
npx vite-node scripts/export-reel-from-league.ts .local/my-league-wk7.json
```

(equivalently: `npm run export:reel:live -- .local/my-league-wk7.json`)

This runs detection + selection + `buildReel()` against your real data
and writes `video/fixtures/reel-live.json` (also gitignored — it's
real league data), printing a diagnostic summary as it goes.

Then render it:

```
cd video && npx remotion render src/Root.tsx Reel out/reel-live.mp4 --props=../video/fixtures/reel-live.json
```

Two things about that command that are easy to get wrong:

- **It renders the existing `Reel` composition, not a new one.**
  `Root.tsx`'s compositions now derive `durationInFrames`/`fps`/
  `width`/`height` from whatever `reel` is in the *resolved* props via
  Remotion's `calculateMetadata`, so `--props` correctly retargets an
  existing composition at the right length — no new composition or
  fixture needs to be committed for this to work.
- **`--props` needs a `{ "reel": ... }` wrapper, not a bare `Reel`
  object.** `scripts/export-reel-from-league.ts` already writes it in
  that wrapped shape for exactly this reason — Remotion merges the
  parsed JSON's top-level keys into the composition's `defaultProps`
  (which is `{ reel }`), so an unwrapped file would silently leave
  `defaultProps.reel` untouched and render the baked-in demo fixture
  at the baked-in demo length instead of yours. If you ever hand-edit
  `reel-live.json`, keep the wrapper.
- Remotion resolves `--props` relative to the **current working
  directory**, not the composition file's location. The command above
  is meant to be run from `video/` (after `cd video`), which is why
  the path is `../video/fixtures/reel-live.json` rather than
  `fixtures/reel-live.json` — both resolve to the same file from
  inside `video/`; use whichever reads clearer to you.

## What to look for

`export-reel-from-league.ts` prints diagnostics before the reel is
written — these are the signals for why a real reel might come out
thin:

- **team count / category count** — sanity-checks the shape actually
  looks like your league.
- **weeks of history** (`seasonRankHistory.length`) — several
  detectors (e.g. `the-climb`) need multiple weeks of rank history to
  find a trend; a league early in its season, or an adapter that isn't
  backfilling history, will starve those stories.
- **logos: N/M teams have avatarUrl** — how many teams will render a
  real logo vs. fall back to initials.
- **detected stories** — if this list is short, `selectStoriesForIssue`
  didn't find much worth telling; check the per-story `score` values
  printed alongside each type.

## A note on ESPN logos

ESPN serves team logos from a cookie-gated host. That cookie exists in
your normal browser session but not in Remotion's headless render
environment, so a real ESPN league's logos may fail to load during
render — team avatars falling back to initials (rather than the fetch
just hanging) is the expected degrade, not a bug in this pipeline.

## Where things are gitignored

- `.local/` (repo root) — save any downloaded league JSON here. Never
  committed.
- `video/fixtures/reel-live.json` — the exported Reel JSON. Real
  league data; never committed.

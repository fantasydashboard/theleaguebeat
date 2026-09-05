# What the weekly issue owes The Beat

The Beat and Chronicles were retired in favour of one Issue. This is the
inventory taken before deleting them, so the collapse subtracts
duplication rather than content.

## The Beat was category-only

Worth stating first, because it changes how much was actually at risk:
`BeatFeedView` gated on `data.format !== 'h2h-category'` and routed
everything else to `UnsupportedFormatPanel`. **A football league opening
The Beat saw an "unsupported format" panel and nothing else.** So for
points leagues the page contributed zero, and nothing is lost there.

For category (baseball) leagues it did render, which is where the debt
below comes from.

## The event kinds it produced

`render-beat-points.ts` is retained — it is a pure editorial module with
tests, and it encodes the points-league voice for eight event kinds. Its
only consumer was the deleted view, so it is currently unreferenced by
app code. **Do not delete it**; the weekly issue should absorb these.

| Kind | What it says | Issue section it becomes |
|---|---|---|
| `FINAL` | A finished matchup, with football-specific headline variants | Results — the week's games |
| `STREAK` | Runs of wins or losses | Streaks, once ≥3 weeks |
| `THRONE` | Who sits top, and for how long | Power rankings |
| `CELLAR` | Who is bottom | Power rankings |
| `RACE` | Playoff-line proximity | Playoff picture, stretch onward |
| `BRIEFING` | The week ahead | Preview / what each team needs |
| `LIVE` | Games in flight | The live Monday deck, not the issue |
| `ISSUE` | Pointer to the published issue | Retired — the issue IS the artifact |

`football/index.ts` supplies `footballFinalHeadlines`,
`footballFinalBodies` and `footballStreakLines`. That is written, tested
voice for exactly the results copy the weekly issue needs, and it should
be reused rather than rewritten.

## The player-driven kinds that never existed

`HUGE_GAME`, `BENCH_BLUNDER` and `FREE_AGENT` were absent from the
points wire because the points adapters do not fetch per-player weekly
data. They remain unavailable. Anything that needs "who scored the most
this week" needs that fetch first, and should not be promised until it
lands.

## Chronicles

Two sections, and neither survives as-is:

- **Hall of Fame** (champions by season) — belongs on the dashboard, not
  in a weekly publication. Explicitly out of scope here.
- **Departments** (archive links) — the Issue already has prev/next
  navigation, which is what this duplicated.

`CategoryDemoHistoryView` and `CategoryDemoArchiveView` still exist and
are still routable; only the nav entry is gone.

## Retired routes

`the-beat`, `chronicles`, `history` and `home` all redirect to the
Issue rather than 404. Those URLs were live for months and sit in
bookmarks and shared links.

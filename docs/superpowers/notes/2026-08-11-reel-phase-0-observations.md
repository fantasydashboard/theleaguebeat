# Weekly Reel — Phase 0 render observations

This is a factual record of what three renders of the Weekly Reel show,
scene by scene. It does not draw a conclusion or make a ship/no-ship
call — that judgment belongs to the product owner. Where something
looks weak, the weakness is described precisely (what, where) without
a recommendation attached.

## What was rendered

Three fixtures, three compositions, three MP4s, ten settled PNG stills.

| Fixture | Source | Composition | Scenes | Frames | Duration @30fps |
|---|---|---|---|---|---|
| `video/fixtures/reel.json` ("loud") | Real pipeline (`categoriesFixtureToLeagueData` → `detectAll` → `selectStoriesForIssue` → `buildReel`), unmodified — this is the committed fixture, byte-identical after re-running the exporter | `Reel` | cold-open → the-climb → the-throne → the-board | 1020 | 34.00s |
| `video/fixtures/reel-quiet.json` | Real pipeline, `--quiet` flag (empty `stories` array passed to `buildReel`, everything else identical) | `ReelQuiet` | cold-open → the-board | 390 | 13.00s |
| `video/fixtures/reel-mixed.json` | **Not pipeline output.** Hand-edited copy of `reel.json`. Only the `the-throne` scene's `headline`, four of nine `catLines[].winner`, `kicker`, `vo`, and `storySignature` were changed by hand; `cold-open`, `the-climb`, and `the-board` are untouched copies of the loud fixture's scenes | `ReelMixed` | cold-open → the-climb → the-throne → the-board | 1020 | 34.00s |

Exact per-scene frame ranges (computed from `sceneFrames()`, not estimated):

- **Loud** (`reel.json`): cold-open 0–119, the-climb 120–419, the-throne 420–749, the-board 750–1019.
- **Quiet** (`reel-quiet.json`): cold-open 0–119, the-board 120–389.
- **Mixed** (`reel-mixed.json`): identical to loud — cold-open 0–119, the-climb 120–419, the-throne 420–749, the-board 750–1019 (only scene *content* changed, not `minDurationMs`, so timing is unaffected).

Stills live in `video/out/stills/` (gitignored), one per scene per fixture,
captured at a frame inside each scene's range chosen to sit well past
that scene's fade-ins/springs so nothing is mid-animation:

```
loud-1-cold-open.png    (frame 100)   quiet-1-cold-open.png (frame 100)   mixed-1-cold-open.png  (frame 100)
loud-2-the-climb.png    (frame 320)                                      mixed-2-the-climb.png  (frame 320)
loud-3-the-throne.png   (frame 620)                                      mixed-3-the-throne.png (frame 620)
loud-4-the-board.png    (frame 900)   quiet-2-the-board.png (frame 270)   mixed-4-the-board.png  (frame 900)
```

MP4s: `video/out/reel.mp4`, `video/out/reel-quiet.mp4`, `video/out/reel-mixed.mp4` (all gitignored, all 1080×1920).

---

## Scene-by-scene observations

### Cold Open — identical across all three fixtures

Same league name ("Diamond Cuts"), week (8), and subtitle ("THE WEEK IN
REVIEW") drive this scene in all three fixtures, so `loud-1-cold-open.png`,
`quiet-1-cold-open.png`, and `mixed-1-cold-open.png` are pixel-identical
(confirmed: identical file size, 118253 bytes, for all three).

At the settled frame: black background. A small green square mark, "THE
LEAGUE BEAT" wordmark, a thin horizontal divider rule, the large white
league name "DIAMOND CUTS", a "WEEK" label, and a large green "8" — all
laid out as one vertically-and-horizontally centered flex block. No
corner bug/logo on this scene (by design — the Bug component is absent
from both bookend scenes).

Below that centered block, "THE WEEK IN REVIEW" is a *separately*
absolutely-positioned element pinned to `bottom: 150`, not part of the
centered flex flow. Measuring from the component's own layout constants
(square 120px + 56px margin + title line ~41px + divider block 68+2px +
league name ~116px + 48px margin + "WEEK" label ~38px + big number
190×0.95≈180px ≈ 670px total, centered in a 1920px canvas → occupies
roughly y≈625–1295), the subtitle line sits at roughly y≈1730. That
leaves a gap of roughly 430–440px of unbroken black between the bottom
of the "8" and the top of the subtitle, and a further ~150px of black
below the subtitle to the bottom edge of the canvas. This matches the
"content clusters in the middle third" observation named in the task:
by pixel count, content occupies roughly the middle 35% of the canvas
height, with black above and below it in comparable proportions.

### The Climb — identical in loud and mixed (Closer's Therapy data untouched)

At the settled frame (local frame 200): "SEASON ARC" small green eyebrow,
large white "CLOSER'S THERAPY" team name. An orange line chart (orange =
`theme.down`, since this team's rank number went up/worse) runs flat at
rank 1 for weeks 1–4, steps down to rank 3 for weeks 5–6, and continues
down to rank 5 (week 7) then rank 6 (week 8) — a glowing orange line with
a filled dot at the final point. Three faint horizontal gridlines cross
the chart. "W1" / "W8" axis labels sit in a row at `top: 1060`. Below
that: a large orange "1 → 6" stat, "SLID 5 SPOTS" footnote, and "Across
8 weeks" line.

Measuring from the axis-label row (`top: 1060`) to where the stat block
visually begins (anchored by `bottom: 300`, which places its top edge
around y≈1460 given its own content height), the gap is roughly 400px
of empty canvas — matching the ~400px figure named in the task.

### The Throne — LOUD (9–0 sweep)

At the settled frame (local frame 200): two circular team crests top-
center (blue gradient for Bullpen Theology, teal-green gradient for
Doubles Down). A lower-third panel with a green left-edge rule reads
"MATCHUP OF THE WEEK" / "BULLPEN THEOLOGY" / "def. DOUBLES DOWN 9–0".
Below that, 9 horizontal category bars (R, H, RBI, AVG, W, SV, K, HLD,
ERA), **every one filling from the left in solid green** against a dark
track. No bar fills from the right; no grey/neutral color appears
anywhere in the bar block. This is the only version of this scene that
had been rendered prior to this task.

Bar widths are visibly uneven despite every category being a win — this
is the logged share-compression issue, directly visible: R, H, RBI, and
AVG bars stop at roughly 52–54% of track width (shares 0.538, 0.537,
0.542, 0.516) while W, SV, and HLD reach roughly 71–78% (0.714, 0.778,
0.769) and K/ERA sit around 60–61% (0.607, 0.602). The four short bars
read, at a glance, as closer contests than the other five, even though
all nine were won outright.

"9 CATEGORIES TO 0" kicker sits at the bottom with roughly 250px of
clear black between the last bar row and the kicker text — no collision.

### The Throne — MIXED (5–4, hand-edited, first-ever render of the losing side)

Same frame, same crests, same eyebrow. Headline now reads "def. DOUBLES
DOWN 5–4"; kicker reads "5 CATEGORIES TO 4".

Of the 9 bars: R, H, RBI, W, and K fill from the **left** in green
(unchanged from the loud fixture — those four categories still winner
`'a'`). AVG, SV, HLD, and ERA now fill from the **right** in the grey/
neutral color (`theme.neutral`, `#7c8496`) — winner flipped to `'b'` by
hand for this fixture, with the same share values the loud fixture used
for those same categories.

The two-sided read, scanning top to bottom (R, H, RBI, AVG, W, SV, K,
HLD, ERA): green, green, green, grey, green, grey, green, grey, grey.
The grey fill color is visually distinct from the unfilled dark track —
`theme.neutral` (`#7c8496`) is a fully-opaque, comparatively light
blue-grey, versus the track's `trackWash` (`rgba(255,255,255,0.07)`, a
near-invisible near-black wash). A right-filling bar does not read as
"empty" or as a rendering gap; it reads as a filled bar on the other
side of the row. Each row is independently positioned (absolute inset
per bar), so a right-filling bar doesn't collide with, crowd, or
visually merge into the left-filling bars above or below it.

The same compression pattern from the loud fixture reappears here on
the right-filling side: the AVG/HLD/ERA grey bars, at shares 0.516/
0.769/0.601, are the same lengths as their green counterparts would be
at those shares — the compression is a property of the share number
itself, not of which side of the row it's drawn on.

### The Board — loud and mixed identical standings; quiet differs only in highlight

At the settled frame: "THE BOARD" two-line title top-left, 10 ranked
rows (rank / team name / category record / rank-delta), then a
"TOP 6 MAKE THE PLAYOFFS" note in accent green at the bottom.

In loud and mixed, rows 1 (Bullpen Theology), 2 (Doubles Down), and 6
(Closer's Therapy) carry the green left-edge highlight bar and a faint
green background wash — these are the teams featured in the-climb and
the-throne above. In quiet, no row is highlighted at all: with no
stories in the reel, `featuredTeamIds` is empty and every row renders in
the same plain white/grey styling, undifferentiated from the rest.

Delta indicators (▲1 green for Doubles Down and Innings Eaters, ▼1
orange for The Whiff Department and Closer's Therapy, em-dash for the
rest) are identical across all three fixtures — delta is computed from
`seasonRankHistory` and is independent of which stories ran.

Measuring from the row block's start (`top: 470`) with 10 rows at full
scale, the last row's bottom edge sits at roughly y≈1320; the note sits
at roughly y≈1770. That's a gap of roughly 450px of empty canvas between
the last standings row and the note — matching the ~450px figure named
in the task, and present identically in all three fixtures since row
count (10) and note text are the same in all three.

### Quiet fixture as a whole

Two scenes only: cold-open, then straight to the-board. No the-climb,
no the-throne, no sign-off. The reel is 13.00s versus 34.00s for the
loud/mixed fixtures — 390 frames instead of 1020.

Sign-off does not appear in *any* of the three renders, quiet included
— `buildSignOff` returns `null` in all three because the demo league
data has no `matchupsByWeek` entry for week 9. This is a property of
the underlying demo data at week 8, not something specific to the quiet
path: the loud and mixed fixtures are missing sign-off for the same
reason.

The board scene is the same full-content scene in the quiet fixture as
in the loud one — full 10-team standings, deltas, and the playoff note
— none of which depends on a story having fired.

---

## Cross-fixture notes

- `video/fixtures/reel.json` was diffed byte-for-byte before and after
  re-running `npx vite-node scripts/export-reel-fixture.ts` as part of
  this task; it is unchanged.
- `video/fixtures/reel-mixed.json` is hand-authored, not pipeline
  output. Its `the-throne` scene carries `storySignature:
  "matchup-of-week|bt+dd|8-mixed-hand-edited"` as an explicit marker
  distinguishing it from the real signature format the pipeline
  produces, so it can't be mistaken for a detected story later.
- All three fixtures share the same underlying demo league data
  (`categoriesFixtureToLeagueData()`), so any observation above that
  isn't about the-throne or story selection (cold-open content, board
  standings/deltas, sign-off's absence) holds across all three for the
  same underlying reason, not by coincidence.

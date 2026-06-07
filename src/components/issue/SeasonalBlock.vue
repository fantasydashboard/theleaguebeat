<template>
  <!-- SEASONAL BLOCK — single home-page slot that swaps content
       based on where we are in the season. Magazine convention:
       a magazine's back-of-book feature changes by issue. A
       fantasy magazine should too.

       Stage map:
         preseason   → countdown / last year's recap (TODO)
         opening     → draft autopsy (week 1-3 takeaways) (TODO)
         settling    → hidden (standard sections cover this)
         midseason   → hidden (standard sections cover this)
         stretch     → playoff picture (in / out / bubble) ✓
         final       → "win or go home" — final-week stakes (TODO)
         playoffs    → live bracket (TODO)
         offseason   → season recap (TODO)

       Hidden stages render nothing, so the home page contracts
       gracefully. Each stage is a self-contained branch — adding
       a real implementation for one doesn't ripple into the
       others. -->
  <section v-if="visibleStage" class="seasonal" :aria-labelledby="`seasonal-${visibleStage}`">
    <header class="seasonal-head">
      <p class="seasonal-eyebrow" :class="`seasonal-eyebrow-${visibleStage}`">
        <span class="seasonal-eyebrow-dot" aria-hidden="true"></span>
        {{ eyebrowFor(visibleStage) }}
      </p>
      <h2 :id="`seasonal-${visibleStage}`" class="seasonal-headline">
        {{ headlineFor(visibleStage) }}
      </h2>
    </header>

    <!-- ── PLAYOFF PICTURE (stretch + final) ─────────────────────
         The real implementation that ships first. Shows three
         buckets: locked-in, on the bubble, eliminated. Magazine
         framing on a question every late-season manager checks
         daily anyway. -->
    <div v-if="visibleStage === 'stretch' || visibleStage === 'final'" class="seasonal-pp">
      <div class="seasonal-pp-bucket seasonal-pp-bucket-in">
        <p class="seasonal-pp-label">In</p>
        <ul class="seasonal-pp-list" role="list">
          <li v-for="t in playoffPicture.locked" :key="t.teamId" class="seasonal-pp-row">
            <div class="seasonal-pp-avatar" :style="avatarStyle(t.teamId)">
              <img v-if="lookupTeam(t.teamId).avatarUrl" :src="lookupTeam(t.teamId).avatarUrl" alt="" class="avatar-image" />
              <span v-else>{{ lookupTeam(t.teamId).ownerInitials }}</span>
            </div>
            <span class="seasonal-pp-name">{{ lookupTeam(t.teamId).name }}</span>
            <span class="seasonal-pp-rank">#{{ t.rank }}</span>
          </li>
        </ul>
      </div>
      <div class="seasonal-pp-bucket seasonal-pp-bucket-bubble">
        <p class="seasonal-pp-label">Bubble</p>
        <ul class="seasonal-pp-list" role="list">
          <li v-for="t in playoffPicture.bubble" :key="t.teamId" class="seasonal-pp-row">
            <div class="seasonal-pp-avatar" :style="avatarStyle(t.teamId)">
              <img v-if="lookupTeam(t.teamId).avatarUrl" :src="lookupTeam(t.teamId).avatarUrl" alt="" class="avatar-image" />
              <span v-else>{{ lookupTeam(t.teamId).ownerInitials }}</span>
            </div>
            <span class="seasonal-pp-name">{{ lookupTeam(t.teamId).name }}</span>
            <span class="seasonal-pp-rank">#{{ t.rank }}</span>
          </li>
          <li v-if="playoffPicture.bubble.length === 0" class="seasonal-pp-empty">
            No bubble this week. The line is clean.
          </li>
        </ul>
      </div>
      <div class="seasonal-pp-bucket seasonal-pp-bucket-out">
        <p class="seasonal-pp-label">Out (mathematically tough)</p>
        <ul class="seasonal-pp-list" role="list">
          <li v-for="t in playoffPicture.outside" :key="t.teamId" class="seasonal-pp-row">
            <div class="seasonal-pp-avatar" :style="avatarStyle(t.teamId)">
              <img v-if="lookupTeam(t.teamId).avatarUrl" :src="lookupTeam(t.teamId).avatarUrl" alt="" class="avatar-image" />
              <span v-else>{{ lookupTeam(t.teamId).ownerInitials }}</span>
            </div>
            <span class="seasonal-pp-name">{{ lookupTeam(t.teamId).name }}</span>
            <span class="seasonal-pp-rank">#{{ t.rank }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- ── DRAFT AUTOPSY (opening) ──────────────────────────────
         Placeholder — fills in with real draft-vs-performance
         analysis when the data is wired up. -->
    <div v-else-if="visibleStage === 'opening'" class="seasonal-stub">
      <p>Early-season draft autopsy lands here. Which picks have justified the slot, which haven't, who got the best value pick of the draft.</p>
    </div>

    <!-- ── LIVE BRACKET (playoffs) ──────────────────────────────
         Placeholder — fills in with playoff matchup rendering. -->
    <div v-else-if="visibleStage === 'playoffs'" class="seasonal-stub">
      <p>Playoff bracket renders here. Live cat scores per matchup, advancing teams, championship path.</p>
    </div>

    <!-- ── SEASON RECAP (offseason) ─────────────────────────────
         Placeholder — fills in with champion, biggest moves, all-
         time leaderboard once season wraps. -->
    <div v-else-if="visibleStage === 'offseason'" class="seasonal-stub">
      <p>Season-in-review feature lands here. Champion, season MVP, biggest moves, league records broken.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CategoryLeagueData } from '@/editorial/types'

type Stage = 'preseason' | 'opening' | 'settling' | 'midseason' | 'stretch' | 'final' | 'playoffs' | 'offseason'

const props = defineProps<{
  data?: CategoryLeagueData
}>()

/** Compute season stage from currentWeek + regularSeasonEndWeek.
 *  Mirrors the editorial render.ts logic so the visual page agrees
 *  with the detection pipeline. */
const stage = computed<Stage>(() => {
  const d = props.data
  if (!d) return 'midseason'
  const end = d.regularSeasonEndWeek ?? 22
  const wk = d.currentWeek
  if (wk < 1) return 'preseason'
  if (wk <= 3) return 'opening'
  if (wk <= 7) return 'settling'
  // Last 2 weeks of regular season = final
  if (wk >= end - 1 && wk <= end) return 'final'
  // Last 5 weeks = stretch (5 wks deep into final, not just 2)
  if (wk >= end - 4 && wk <= end) return 'stretch'
  // After regular season = playoffs (most leagues are 2-3 weeks)
  if (wk > end && wk <= end + 4) return 'playoffs'
  if (wk > end + 4) return 'offseason'
  return 'midseason'
})

/** Stages we have something to render for. Only 'stretch' is fully
 *  implemented today (the playoff picture three-bucket layout). The
 *  other stages — opening, final, playoffs, offseason — render
 *  placeholder "lands here" copy inside dotted-border stubs, which
 *  reads as mid-build content shipped to production. Hide them all
 *  until they have real implementations.
 *
 *  When a stage gets built, remove it from the hide-list. The detector
 *  + headline + eyebrow infrastructure already supports them; the
 *  only thing missing is the body content. */
const visibleStage = computed<Stage | null>(() => {
  const s = stage.value
  if (s === 'stretch') return s
  return null
})

function eyebrowFor(s: Stage): string {
  switch (s) {
    case 'opening':    return 'OPENING WEEKS'
    case 'stretch':    return 'PLAYOFF PICTURE'
    case 'final':      return 'WIN OR GO HOME'
    case 'playoffs':   return 'BRACKET'
    case 'offseason':  return 'SEASON IN REVIEW'
    default:           return 'THE SEASON'
  }
}

function headlineFor(s: Stage): string {
  switch (s) {
    case 'opening':    return 'How the draft is holding up.'
    case 'stretch':    return 'The picture, three weeks out.'
    case 'final':      return 'Win or go home.'
    case 'playoffs':   return 'The bracket is live.'
    case 'offseason':  return 'The season, in review.'
    default:           return 'The season.'
  }
}

/* ─────────────────────────────────────────────────────────────────
   PLAYOFF PICTURE — derive in / bubble / out buckets from standings
───────────────────────────────────────────────────────────────── */

const playoffPicture = computed(() => {
  const all = props.data?.standings ?? []
  const cutoff = props.data?.playoffCutoff ?? 4
  if (all.length === 0) {
    return { locked: [], bubble: [], outside: [] }
  }

  // Locked: clearly inside the cut with a 3+ cat margin to the bubble.
  // Bubble: rows straddling the cut line by 3 cats either way.
  // Out: everyone clearly below.
  const bubbleIn = all[cutoff - 1]
  const bubbleOut = all[cutoff]
  const bubbleScore = bubbleOut
    ? (bubbleOut.catWins + bubbleOut.catTies)
    : (bubbleIn ? bubbleIn.catWins + bubbleIn.catTies : 0)
  const BUBBLE_BAND = 6  // cat-wins; rough proxy for "still in play"

  const locked = all.filter((r) =>
    r.rank <= cutoff &&
    (r.catWins + r.catTies) - bubbleScore > BUBBLE_BAND
  )
  const outside = all.filter((r) =>
    r.rank > cutoff &&
    bubbleScore - (r.catWins + r.catTies) > BUBBLE_BAND
  )
  const lockedIds = new Set(locked.map((r) => r.teamId))
  const outsideIds = new Set(outside.map((r) => r.teamId))
  const bubble = all.filter((r) => !lockedIds.has(r.teamId) && !outsideIds.has(r.teamId))

  return { locked, bubble, outside }
})

function lookupTeam(teamId: string) {
  return props.data?.teams.find((t) => t.id === teamId) ?? {
    id: teamId,
    name: `Team ${teamId}`,
    ownerName: '',
    ownerInitials: '··',
    avatarColor: 'oklch(0.4 0.05 90), oklch(0.25 0.05 90)',
    avatarUrl: undefined,
    isMyTeam: false,
  }
}

function avatarStyle(teamId: string) {
  const t = lookupTeam(teamId)
  if (t.avatarUrl) return undefined
  return { background: `linear-gradient(135deg, ${t.avatarColor})` }
}
</script>

<style scoped>
.seasonal {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.seasonal-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.seasonal-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
.seasonal-eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.seasonal-eyebrow-opening   { color: oklch(0.78 0.18 92); }
.seasonal-eyebrow-stretch   { color: oklch(0.70 0.27 350); }
.seasonal-eyebrow-final     { color: oklch(0.65 0.20 25); }
.seasonal-eyebrow-playoffs  { color: oklch(0.78 0.18 92); }
.seasonal-eyebrow-offseason { color: oklch(0.72 0.18 195); }

.seasonal-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.6rem, 2.4vw, 2.0rem);
  line-height: 1.06;
  letter-spacing: -0.01em;
  color: oklch(0.97 0.005 90);
  margin: 0;
}

.seasonal-stub {
  padding: 16px 18px;
  border-radius: 10px;
  background: oklch(0.10 0.010 90);
  border: 1px dashed oklch(0.22 0.010 90);
  font-family: 'Barlow', sans-serif;
  font-size: 0.94rem;
  color: oklch(0.65 0.010 90);
  line-height: 1.5;
}

/* ── Playoff picture grid ─────────────────────────────────── */
.seasonal-pp {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.seasonal-pp-bucket {
  padding: 14px 12px;
  border-radius: 10px;
  background: oklch(0.08 0.010 90);
  border: 1px solid oklch(0.18 0.010 90);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.seasonal-pp-bucket-in     { border-left: 3px solid oklch(0.74 0.18 145); }
.seasonal-pp-bucket-bubble { border-left: 3px solid oklch(0.78 0.18 92); }
.seasonal-pp-bucket-out    { border-left: 3px solid oklch(0.55 0.010 90); }

.seasonal-pp-label {
  margin: 0 0 4px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.74rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.62 0.010 90);
}

.seasonal-pp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.seasonal-pp-row {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}
.seasonal-pp-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.62rem;
  font-weight: 800;
  color: oklch(0.97 0.005 90);
}
.seasonal-pp-avatar .avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.seasonal-pp-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.92rem;
  color: oklch(0.92 0.008 90);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.seasonal-pp-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  color: oklch(0.55 0.010 90);
  font-variant-numeric: tabular-nums;
}
.seasonal-pp-empty {
  font-family: 'Barlow', sans-serif;
  font-size: 0.86rem;
  color: oklch(0.55 0.010 90);
  font-style: italic;
  padding: 4px 0;
}

@media (max-width: 720px) {
  .seasonal-pp { grid-template-columns: 1fr; }
}
</style>

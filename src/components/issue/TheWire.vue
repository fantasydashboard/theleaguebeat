<template>
  <!-- THE WIRE — the magazine's daily news desk.
       Horizontal scrollable carousel of "what happened in the last
       24 hours" cards. Powered by:
         - Cadence detectors (monday-recap, friday-preview, etc.)
         - Today's matchup state (live cat swings)
         - Streak events (W3 → W4 today)
         - Rank shifts (climbed / fell since yesterday)
       Player-level cards (3-HR night, monster pitching outing,
       trades, injuries) are honest placeholders until Tier 3b
       ingestion lands.
  -->
  <section v-if="hasCards" class="wire" aria-labelledby="wire-heading">
    <header class="wire-head">
      <div class="wire-head-eyebrow">
        <span class="wire-head-eyebrow-bar" aria-hidden="true"></span>
        <span class="wire-head-eyebrow-text">The Wire</span>
        <span class="wire-head-cadence" aria-label="Updates daily">DAILY</span>
      </div>
      <div class="wire-head-row">
        <h2 class="wire-headline" id="wire-heading">{{ headline }}</h2>
        <div class="wire-controls">
          <button
            type="button"
            class="wire-control"
            :disabled="atStart"
            aria-label="Scroll The Wire back"
            @click="scrollBy(-1)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button
            type="button"
            class="wire-control"
            :disabled="atEnd"
            aria-label="Scroll The Wire forward"
            @click="scrollBy(1)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>
      <p class="wire-deck">{{ deck }}</p>
    </header>

    <div
      ref="trackRef"
      class="wire-track"
      role="region"
      aria-roledescription="carousel"
      aria-label="Today's stories"
      @scroll="onTrackScroll"
    >
      <article
        v-for="(card, idx) in cards"
        :key="`${card.kind}:${card.signature}`"
        class="wire-card"
        :class="[`wire-card-${card.tone}`, { 'wire-card-placeholder': card.placeholder }]"
      >
        <p class="wire-card-eyebrow">
          <span class="wire-card-eyebrow-dot" aria-hidden="true"></span>
          {{ card.eyebrow }}
        </p>
        <h3 class="wire-card-headline">{{ card.headline }}</h3>
        <p v-if="card.body" class="wire-card-body">{{ card.body }}</p>

        <div v-if="card.teamId && teamLookup(card.teamId)" class="wire-card-team">
          <div
            class="wire-card-team-avatar"
            :style="{ background: `linear-gradient(135deg, ${teamLookup(card.teamId)!.avatarColor})` }"
          >
            <img
              v-if="teamLookup(card.teamId)!.avatarUrl"
              :src="teamLookup(card.teamId)!.avatarUrl"
              alt=""
              class="avatar-image"
            />
            <span v-else>{{ teamLookup(card.teamId)!.ownerInitials }}</span>
          </div>
          <span class="wire-card-team-name">{{ teamLookup(card.teamId)!.name }}</span>
        </div>

        <div v-if="card.placeholder" class="wire-card-soon" aria-hidden="true">
          <span>Coming soon</span>
        </div>

        <!-- Byline without the redundant "THE WIRE" tag — the
             section header already declares the publication slot.
             Just the timestamp ("3 HR AGO") to anchor freshness. -->
        <p class="wire-card-byline">
          <span>{{ card.byline }}</span>
        </p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type {
  CategoryLeagueData,
  CategoryLeagueDataTeam,
} from '@/editorial/types'
import type {
  SelectedStory,
  StoryType,
} from '@/editorial/detection/types'

const props = defineProps<{
  /** Stories selected from the detection pipeline. The Wire pulls
   *  daily-relevant stories from this set; non-daily stories are
   *  rendered elsewhere on the page. */
  stories: SelectedStory[]
  /** League data for team avatar / name lookups. */
  data?: CategoryLeagueData
  /** Optional issue date — drives bylines. Defaults to now. */
  issueDate?: Date
}>()

/* ─────────────────────────────────────────────────────────────────
   Card construction
   We mix story-driven cards with editorial filler when the live
   data doesn't produce a full deck. Always show ~6 cards so the
   carousel feels populated.
───────────────────────────────────────────────────────────────── */

type Tone = 'magenta' | 'gold' | 'teal' | 'up' | 'down' | 'neutral'

interface WireCard {
  kind: string
  signature: string
  eyebrow: string
  headline: string
  body?: string
  teamId?: string
  byline: string
  tone: Tone
  placeholder?: boolean
}

/** Story types The Wire owns. These get pulled OUT of the regular
 *  supporting sections so the carousel is the home for them. */
const WIRE_STORY_TYPES: StoryType[] = [
  // Cadence — always-on daily framing
  'monday-recap',
  'midweek-trade-talk',
  'friday-preview',
  'sunday-final-push',
  'off-day-deep-dive',
  // Matchup events that happened today
  'cat-sweep',
  'cat-shutout',
  'photo-finish',
  'comeback-win',
  'blowout',
  'razor-close',
  // Streak events that fired today
  'streak-built',
  'streak-broken',
  // Rank shifts overnight (proxied by week-over-week)
  'hot-climber',
  'comeback-team',
  'three-week-comeback',
  'three-week-collapse',
  // Transaction stories (Tier 3a — wired via detection/transactions.ts)
  'blockbuster-trade',
  'lopsided-trade',
  'faab-blowout',
  'waiver-winner',
  // Player stories (Tier 3b — pending player-stats ingester)
  'monster-night',
  'three-hr-game',
  'twelve-k-game',
  'il-placement',
  'il-return',
]

const issueDate = computed(() => props.issueDate ?? new Date())

const cards = computed<WireCard[]>(() => {
  // Only render real stories — no "coming soon" placeholders. When
  // the Wire is empty, the section header hides itself entirely
  // rather than showing fake content. As real data sources land
  // (player nights, injuries, bad beats), they flow in via new
  // detectors and the carousel fills out organically.
  return wireStories.value.map(storyToCard)
})

/** Hide the Wire entirely when no real cards are available — the
 *  parent template uses this to suppress the section header so we
 *  don't show "Today's filings" with an empty carousel underneath. */
const hasCards = computed(() => cards.value.length > 0)

const wireStories = computed(() => {
  const wireTypes = new Set<StoryType>(WIRE_STORY_TYPES)
  return props.stories
    .filter((s) => wireTypes.has(s.type))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
})

function storyToCard(story: SelectedStory): WireCard {
  const tone = toneForStoryType(story.type)
  const team = story.teamIds?.[0]
  const teamName = team ? teamLookup(team)?.name : undefined

  const eyebrow = eyebrowForStoryType(story.type)
  const headline = headlineForStoryType(story.type, teamName)
  const body = bodyForStoryType(story.type, teamName)

  return {
    kind: story.type,
    signature: story.signature,
    eyebrow,
    headline,
    body,
    teamId: team,
    byline: formatByline(story, issueDate.value),
    tone,
    placeholder: false,
  }
}

/* ─────────────────────────────────────────────────────────────────
   Copy maps
   Same voice rules as the main hero/section components — declarative,
   short, no exclamation, no em dashes.
───────────────────────────────────────────────────────────────── */

function eyebrowForStoryType(type: StoryType): string {
  switch (type) {
    case 'monday-recap':         return "MONDAY'S READ"
    case 'midweek-trade-talk':   return 'MIDWEEK'
    case 'friday-preview':       return 'WEEKEND LOOK'
    case 'sunday-final-push':    return "SUNDAY'S FINAL"
    case 'off-day-deep-dive':    return 'OFF DAY'
    case 'cat-sweep':            return 'CAT SWEEP'
    case 'cat-shutout':          return 'CAT SHUTOUT'
    case 'photo-finish':         return 'PHOTO FINISH'
    case 'comeback-win':         return 'COMEBACK'
    case 'blowout':              return 'BLOWOUT'
    case 'razor-close':          return 'RAZOR CLOSE'
    case 'streak-built':         return 'STREAK BUILT'
    case 'streak-broken':        return 'STREAK BROKEN'
    case 'hot-climber':          return 'CLIMBING'
    case 'comeback-team':        return 'COMEBACK ARC'
    case 'three-week-comeback':  return 'THREE-WEEK RUN'
    case 'three-week-collapse':  return 'THREE-WEEK FALL'
    case 'blockbuster-trade':    return 'BLOCKBUSTER'
    case 'lopsided-trade':       return 'TRADE'
    case 'faab-blowout':         return 'FAAB WAR'
    case 'waiver-winner':        return 'WAIVER WIN'
    case 'monster-night':        return 'MONSTER NIGHT'
    case 'three-hr-game':        return '3-HR GAME'
    case 'twelve-k-game':        return '12-K GAME'
    case 'il-placement':         return 'TO THE IL'
    case 'il-return':            return 'BACK FROM IL'
    default:                     return 'THE WIRE'
  }
}

function headlineForStoryType(type: StoryType, teamName?: string): string {
  const t = teamName ?? 'The leader'
  switch (type) {
    case 'monday-recap':         return 'The week landed. Here is where it left us.'
    case 'midweek-trade-talk':   return 'Trade window is open. Who is moving?'
    case 'friday-preview':       return 'Weekend swing decides plenty of cats.'
    case 'sunday-final-push':    return 'Last-day swing for the cats still in play.'
    case 'off-day-deep-dive':    return 'Quiet board. Time to read the standings.'
    case 'cat-sweep':            return `${t} swept the week.`
    case 'cat-shutout':          return `${t} got swept.`
    case 'photo-finish':         return `${t} edged it by a hair.`
    case 'comeback-win':         return `${t} clawed it back.`
    case 'blowout':              return `${t} ran away with it.`
    case 'razor-close':          return `${t} got it by one cat.`
    case 'streak-built':         return `${t} is heating up.`
    case 'streak-broken':        return `${t}'s run snapped.`
    case 'hot-climber':          return `${t} keeps climbing.`
    case 'comeback-team':        return `${t} is back.`
    case 'three-week-comeback':  return `Three weeks of gains for ${t}.`
    case 'three-week-collapse':  return `Three weeks of losses for ${t}.`
    case 'blockbuster-trade':    return `${t} pulled the trigger on a blockbuster.`
    case 'lopsided-trade':       return `${t} made a move.`
    case 'faab-blowout':         return `${t} won the FAAB war.`
    case 'waiver-winner':        return `${t} snagged off waivers.`
    case 'monster-night':        return 'Monster line off the bat last night.'
    case 'three-hr-game':        return 'A 3-HR night moved the math.'
    case 'twelve-k-game':        return 'Twelve strikeouts. The K race tightened.'
    case 'il-placement':         return 'Key player landed on the IL.'
    case 'il-return':            return 'Back from the IL just in time.'
    default:                     return 'A new beat from your league.'
  }
}

function bodyForStoryType(type: StoryType, _teamName?: string): string | undefined {
  switch (type) {
    case 'cat-sweep':            return 'All decided cats, one direction. Cleanest result of the night.'
    case 'cat-shutout':          return 'Bad night, every cat. Better luck tomorrow.'
    case 'photo-finish':
    case 'razor-close':          return 'Decided by one cat. The kind of margin that defines a week.'
    case 'comeback-win':         return 'Came back from down 7+ cats. The week looked different at noon.'
    case 'blowout':              return 'A lopsided board on every front. Nothing close.'
    case 'streak-built':         return 'Three straight wins. The conversation just changed.'
    case 'streak-broken':        return 'The run ends. Time to see what comes next.'
    case 'hot-climber':          return 'Big move up the table. The middle is shuffling.'
    case 'monday-recap':         return 'The full slate is in the books. Read every result.'
    case 'midweek-trade-talk':   return 'The week is half over. Watch for the desperate offers.'
    case 'friday-preview':       return 'Whatever is decided this weekend probably decides the week.'
    case 'sunday-final-push':    return 'Save situations and cat-leads still up for grabs.'
    case 'off-day-deep-dive':    return 'A quiet day on the board. A good day to read the matchup.'
    case 'blockbuster-trade':    return 'Multi-player swap reshapes both rosters. The standings notice.'
    case 'lopsided-trade':       return 'Trade processed. Both sides bet on a future state.'
    case 'faab-blowout':         return 'Outbid the rest of the league. The waiver pool just got thinner.'
    case 'waiver-winner':        return 'Top of the waiver order, used wisely. A roster move with stakes.'
    default:                     return undefined
  }
}

function toneForStoryType(type: StoryType): Tone {
  switch (type) {
    case 'cat-sweep':
    case 'comeback-win':
    case 'streak-built':
    case 'hot-climber':
    case 'comeback-team':
    case 'three-week-comeback':
    case 'il-return':            return 'up'
    case 'cat-shutout':
    case 'streak-broken':
    case 'three-week-collapse':
    case 'il-placement':
    case 'blowout':              return 'down'
    case 'photo-finish':
    case 'razor-close':          return 'teal'
    case 'monster-night':
    case 'three-hr-game':
    case 'twelve-k-game':
    case 'blockbuster-trade':
    case 'faab-blowout':         return 'gold'
    case 'lopsided-trade':
    case 'waiver-winner':        return 'teal'
    case 'off-day-deep-dive':    return 'neutral'
    default:                     return 'magenta'
  }
}

/* ─────────────────────────────────────────────────────────────────
   Bylines — magazine-y "FILED · 3H AGO" line.
───────────────────────────────────────────────────────────────── */

function formatByline(story: SelectedStory, _now: Date): string {
  // One relative-time stamp ("3 HR AGO") — the section header
  // already shows the date stamp ("Saturday, May 23") so repeating
  // it on every card was triple-stamping the same information.
  const minutesAgo = Math.max(1, Math.round((1 - story.freshness) * 60 * 6))
  if (minutesAgo < 60) return `${minutesAgo} MIN AGO`
  if (minutesAgo < 24 * 60) return `${Math.round(minutesAgo / 60)} HR AGO`
  return `${Math.round(minutesAgo / (60 * 24))} DAY AGO`
}

/* ─────────────────────────────────────────────────────────────────
   Placeholder cards — honest "coming soon" entries for triggers we
   don't have data for yet (player-level, transactions). Lets the
   carousel feel populated without lying about content.
───────────────────────────────────────────────────────────────── */

const PLACEHOLDERS: WireCard[] = [
  {
    kind: 'placeholder-player',
    signature: 'placeholder-player',
    eyebrow: 'PLAYER WATCH',
    headline: 'Daily player highlights are on the way.',
    body: 'Monster nights, no-hitters, hat tricks — pulled straight from yesterday\'s box scores.',
    byline: 'COMING SOON',
    tone: 'gold',
    placeholder: true,
  },
  {
    kind: 'placeholder-trades',
    signature: 'placeholder-trades',
    eyebrow: 'TRADE FEED',
    headline: 'Trade activity feed is on the way.',
    body: 'Blockbusters, waiver winners, FAAB drama — surfaced the moment they land.',
    byline: 'COMING SOON',
    tone: 'magenta',
    placeholder: true,
  },
  {
    kind: 'placeholder-injuries',
    signature: 'placeholder-injuries',
    eyebrow: 'INJURY WIRE',
    headline: 'Injury wire is on the way.',
    body: 'IL placements, return timelines, real-life roster moves that swing your week.',
    byline: 'COMING SOON',
    tone: 'down',
    placeholder: true,
  },
  {
    kind: 'placeholder-badbeats',
    signature: 'placeholder-badbeats',
    eyebrow: 'BAD BEATS',
    headline: 'Bad-beats column is on the way.',
    body: 'When the player you started went 0-fer and the one you sat went off.',
    byline: 'COMING SOON',
    tone: 'down',
    placeholder: true,
  },
  {
    kind: 'placeholder-rules',
    signature: 'placeholder-rules',
    eyebrow: 'COMMISH DESK',
    headline: 'Commissioner activity feed is on the way.',
    body: 'Rule changes, settings tweaks, new members — straight from your league office.',
    byline: 'COMING SOON',
    tone: 'teal',
    placeholder: true,
  },
]

function placeholderCards(count: number): WireCard[] {
  if (count <= 0) return []
  return PLACEHOLDERS.slice(0, count)
}

/* ─────────────────────────────────────────────────────────────────
   Headline / deck for the section itself
───────────────────────────────────────────────────────────────── */

const dayLabel = computed(() =>
  issueDate.value.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
)

const headline = computed(() => {
  // Vary by what cards exist.
  const live = wireStories.value.length
  if (live >= 3) return "What's filed today."
  if (live > 0) return 'Today\'s filings.'
  return 'A quiet day on the wire.'
})

const deck = computed(() => `${dayLabel.value} · today's stories from your league`)

/* ─────────────────────────────────────────────────────────────────
   Team lookup
───────────────────────────────────────────────────────────────── */

function teamLookup(id: string): CategoryLeagueDataTeam | undefined {
  return props.data?.teams.find((t) => t.id === id)
}

/* ─────────────────────────────────────────────────────────────────
   Carousel scroll controls
───────────────────────────────────────────────────────────────── */

const trackRef = ref<HTMLElement | null>(null)
const atStart = ref(true)
const atEnd = ref(false)

function paddedIndex(n: number): string {
  return String(n + 1).padStart(2, '0')
}

function scrollBy(direction: 1 | -1) {
  const track = trackRef.value
  if (!track) return
  const card = track.querySelector<HTMLElement>('.wire-card')
  const step = card ? card.offsetWidth + 18 : track.clientWidth * 0.85
  track.scrollBy({ left: direction * step, behavior: 'smooth' })
}

function onTrackScroll() {
  const track = trackRef.value
  if (!track) return
  atStart.value = track.scrollLeft <= 4
  atEnd.value =
    track.scrollLeft + track.clientWidth >= track.scrollWidth - 4
}

onMounted(() => onTrackScroll())
</script>

<style scoped>
.wire {
  margin-bottom: 48px;
}

.wire-head {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 22px;
}
.wire-head-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.74 0.18 145);
}
.wire-head-eyebrow-bar {
  display: inline-block;
  width: 28px;
  height: 2px;
  background: currentColor;
}
.wire-head-eyebrow-text { color: currentColor; }
.wire-head-cadence {
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  padding: 3px 8px;
  border-radius: 999px;
  background: oklch(0.74 0.18 145 / 0.14);
  color: oklch(0.74 0.18 145);
  margin-left: 4px;
}
.wire-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.wire-headline {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  letter-spacing: -0.02em;
  line-height: 1.05;
  color: oklch(0.97 0.005 90);
}
.wire-deck {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
}

/* Scroll controls */
.wire-controls { display: inline-flex; gap: 8px; }
.wire-control {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid oklch(0.20 0.015 90);
  color: oklch(0.78 0.008 90);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 140ms cubic-bezier(0.22, 1, 0.36, 1),
              background-color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .wire-control:not(:disabled):hover {
    border-color: oklch(0.55 0.010 90);
    background: oklch(0.14 0.018 90);
  }
}
.wire-control:disabled { opacity: 0.4; cursor: not-allowed; }
.wire-control:active:not(:disabled) { transform: scale(0.95); }

/* Track */
.wire-track {
  display: flex;
  gap: 18px;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  padding: 4px 0 16px;
  -webkit-overflow-scrolling: touch;
}
.wire-track::-webkit-scrollbar { display: none; }

/* Card — stripped chrome. No rounded border container; a tone-
   colored left-edge bar provides the editorial signature without
   the "stack of dashboard cards" feel. */
.wire-card {
  position: relative;
  flex: 0 0 320px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 22px 18px 24px;
  background: transparent;
  border: none;
  border-radius: 0;
  min-height: 220px;
}
/* Tone-colored left-edge bar — single-pixel visual signature that
   reads as editorial categorization without the dashboard-card
   feel. Maps to the same tone palette used everywhere else. */
.wire-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 2px;
  background: var(--wire-tone, oklch(0.32 0.012 90));
}
.wire-card-up      { --wire-tone: oklch(0.74 0.18 145); }
.wire-card-down    { --wire-tone: oklch(0.65 0.20 25); }
.wire-card-teal    { --wire-tone: oklch(0.72 0.18 195); }
.wire-card-gold    { --wire-tone: oklch(0.78 0.18 92); }
.wire-card-magenta { --wire-tone: oklch(0.70 0.27 350); }
.wire-card-neutral { --wire-tone: oklch(0.32 0.012 90); }

.wire-card-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.wire-card-up      .wire-card-eyebrow { color: oklch(0.74 0.18 145); }
.wire-card-down    .wire-card-eyebrow { color: oklch(0.65 0.20 25); }
.wire-card-teal    .wire-card-eyebrow { color: oklch(0.72 0.18 195); }
.wire-card-gold    .wire-card-eyebrow { color: oklch(0.78 0.18 92); }
.wire-card-magenta .wire-card-eyebrow { color: oklch(0.70 0.27 350); }
.wire-card-neutral .wire-card-eyebrow { color: oklch(0.55 0.010 90); }
.wire-card-eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
}

.wire-card-headline {
  margin: 4px 0 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  letter-spacing: -0.015em;
  line-height: 1.1;
  color: oklch(0.97 0.005 90);
}
.wire-card-body {
  margin: 4px 0 0;
  font-size: 0.92rem;
  line-height: 1.45;
  color: oklch(0.78 0.008 90);
}

.wire-card-team {
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.wire-card-team-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 0.78rem;
  color: oklch(0.10 0.012 90);
  overflow: hidden;
}
.avatar-image {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
  border-radius: inherit;
}
.wire-card-team-name {
  font-family: 'Barlow', sans-serif;
  font-weight: 700;
  font-size: 0.92rem;
  color: oklch(0.97 0.005 90);
}

.wire-card-soon {
  margin-top: auto;
  display: inline-flex;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.45 0.010 90);
}

.wire-card-byline {
  margin: 12px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.70rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: oklch(0.45 0.010 90);
}
.wire-card-byline-tag {
  padding: 2px 6px;
  background: oklch(0.20 0.015 90);
  border-radius: 4px;
  color: oklch(0.78 0.008 90);
}

.wire-card-num {
  position: absolute;
  top: 16px;
  right: 18px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: oklch(0.45 0.010 90);
}

@media (max-width: 720px) {
  .wire-card { flex: 0 0 260px; min-height: 220px; padding: 20px 18px 16px; }
  .wire-card-headline { font-size: 1.2rem; }
  .wire-card-body { font-size: 0.88rem; }
  .wire-head-row { flex-direction: column; align-items: flex-start; gap: 12px; }
}
</style>

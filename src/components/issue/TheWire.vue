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
        :class="[
          `wire-card-${card.tone}`,
          {
            'wire-card-placeholder': card.placeholder,
            'wire-card-lead': idx === 0,
          },
        ]"
      >
        <p class="wire-card-eyebrow">
          <span class="wire-card-eyebrow-dot" aria-hidden="true"></span>
          {{ card.eyebrow }}
        </p>
        <h3 class="wire-card-headline">{{ card.headline }}</h3>
        <p v-if="card.body" class="wire-card-body">{{ card.body }}</p>

        <!-- Player card variant — headshot + owner attribution.
             Used for monster-night / three-hr-game / twelve-k-game
             stories where the player IS the subject. -->
        <div v-if="card.player" class="wire-card-player">
          <img
            :src="card.player.headshotUrl"
            :alt="card.player.name"
            class="wire-card-player-headshot"
            loading="lazy"
          />
          <div class="wire-card-player-meta">
            <p class="wire-card-player-name">{{ card.player.name }}</p>
            <p class="wire-card-player-team">
              <span v-if="card.player.mlbTeam">{{ card.player.mlbTeam }}</span>
              <span v-if="card.player.position">{{ card.player.position }}</span>
            </p>

            <!-- Ownership chip — avatar + team name (or "YOURS" for the
                 viewer's roster, neutral "WAIVERS" for free agents).
                 Replaces the old "Owned by X" text line with a visual
                 chip that scans faster and carries brand identity. -->
            <div class="wire-card-chip-row">
              <template v-if="card.player.ownedByTeamIds.length > 0">
                <span
                  v-for="(teamId, i) in card.player.ownedByTeamIds.slice(0, 2)"
                  :key="teamId"
                  class="wire-card-chip"
                  :class="{ 'wire-card-chip-mine': card.player.isMyGuy && teamLookup(teamId)?.isMyTeam }"
                >
                  <span
                    class="wire-card-chip-avatar"
                    :style="teamLookup(teamId)?.avatarUrl ? undefined : { background: `linear-gradient(135deg, ${teamLookup(teamId)?.avatarColor ?? 'oklch(0.4 0.05 90), oklch(0.25 0.05 90)'})` }"
                  >
                    <img
                      v-if="teamLookup(teamId)?.avatarUrl"
                      :src="teamLookup(teamId)!.avatarUrl"
                      alt=""
                      class="avatar-image"
                    />
                    <span v-else>{{ teamLookup(teamId)?.ownerInitials ?? '··' }}</span>
                  </span>
                  <span class="wire-card-chip-label">
                    {{ card.player.isMyGuy && teamLookup(teamId)?.isMyTeam
                       ? 'YOURS'
                       : (teamLookup(teamId)?.name ?? card.player.ownedByTeamNames[i] ?? 'Team') }}
                  </span>
                </span>
                <span
                  v-if="card.player.ownedByTeamIds.length > 2"
                  class="wire-card-chip wire-card-chip-overflow"
                >
                  +{{ card.player.ownedByTeamIds.length - 2 }}
                </span>
              </template>
              <span v-else class="wire-card-chip wire-card-chip-fa">
                <span class="wire-card-chip-avatar wire-card-chip-avatar-fa" aria-hidden="true"></span>
                <span class="wire-card-chip-label">WAIVERS</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Team card variant — used for non-player stories. -->
        <div v-else-if="card.teamId && teamLookup(card.teamId)" class="wire-card-team">
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
import { playerHeadshotUrl, playerHeadshotFallback } from '@/utils/playerHeadshot'

const props = defineProps<{
  /** Stories selected from the detection pipeline. The Wire pulls
   *  daily-relevant stories from this set; non-daily stories are
   *  rendered elsewhere on the page. */
  stories: SelectedStory[]
  /** League data for team avatar / name lookups. */
  data?: CategoryLeagueData
  /** Optional issue date — drives bylines. Defaults to now. */
  issueDate?: Date
  /** Signature of the story currently anchoring the hero, if any.
   *  When provided, the Wire skips that story to avoid showing the
   *  same beat twice (once as cover, once as a card). */
  heroSignature?: string
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
  /** Player-card extras — populated for player-night stories so the
   *  carousel can render a headshot + stat line + owner attribution
   *  instead of the generic team-chip layout. */
  player?: {
    mlbId: number
    name: string
    position?: string
    mlbTeam?: string
    headshotUrl: string
    summaryLine: string         // e.g. "3-for-5, 2 HR, 5 RBI"
    ownedByTeamIds: string[]    // for chip avatar lookup
    ownedByTeamNames: string[]  // owner attribution
    isMyGuy: boolean
  }
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
  // Player stories (Tier 3b — wired via detection/players.ts)
  'monster-night',
  'three-hr-game',
  'twelve-k-game',
  'il-placement',
  'il-return',
  // Overnight delta (Tier 3c — wired via detection/overnight.ts)
  'matchup-tipped',
  'matchup-pulse-up',
  'matchup-pulse-down',
  'rank-shift-up',
  'rank-shift-down',
  // Bad beats — psychological hook, MY-team only
  'bench-bad-beat',
  // Wire intel — actionable add / owned disaster
  'streamer-of-day',
  'pitcher-blowup',
  // Rolling slumps — multi-day cold streaks for owned players
  'slump-hitter',
  'slump-pitcher-rolling',
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
  const heroSig = props.heroSignature
  return props.stories
    .filter((s) => wireTypes.has(s.type) && s.signature !== heroSig)
    .sort((a, b) => {
      // My-team-first ordering: stories about MY roster outrank
      // league-wide gossip of similar weight. Editorial signal:
      // "your guy went off" beats "some guy went off."
      const aMine = isMyStory(a)
      const bMine = isMyStory(b)
      if (aMine && !bMine) return -1
      if (!aMine && bMine) return 1
      // Within the same my-vs-not bucket, sort by score (weight × freshness).
      return b.score - a.score
    })
    // No artificial cap — show all real cards. Carousel handles overflow.
})

/**
 * "My story" = the viewer's team is involved. Covers two cases:
 *  - story.teamIds includes my team (most stories)
 *  - player-night story whose context.isMyGuy === true
 */
function isMyStory(story: SelectedStory): boolean {
  const ctx = story.context as Record<string, unknown>
  if (ctx?.isMyGuy === true) return true
  const myTeamId = props.data?.teams.find((t) => t.isMyTeam)?.id
  if (!myTeamId) return false
  return (story.teamIds ?? []).includes(myTeamId)
}

function storyToCard(story: SelectedStory): WireCard {
  const tone = toneForStoryType(story.type)
  const team = story.teamIds?.[0]
  const teamName = team ? teamLookup(team)?.name : undefined

  // Player-night context — populated by detection/players.ts. When
  // present, we use the player headline + stat-line summary instead
  // of the generic copy maps, and attach a `player` block for the
  // template's headshot + owner-attribution rendering.
  const ctx = story.context as Record<string, unknown>
  const isPlayerStory =
    story.type === 'three-hr-game' ||
    story.type === 'twelve-k-game' ||
    story.type === 'monster-night' ||
    story.type === 'il-placement' ||
    story.type === 'il-return' ||
    story.type === 'streamer-of-day' ||
    story.type === 'pitcher-blowup' ||
    story.type === 'slump-hitter' ||
    story.type === 'slump-pitcher-rolling'

  // Overnight-delta stories — detector ships a custom headline +
  // summary tailored to whether the viewer's team is involved.
  const isOvernightStory =
    story.type === 'matchup-tipped' ||
    story.type === 'matchup-pulse-up' ||
    story.type === 'matchup-pulse-down' ||
    story.type === 'rank-shift-up' ||
    story.type === 'rank-shift-down'

  // Transaction stories — detector ships a name-rich headline +
  // body that beats the generic "team pulled the trigger" fallback.
  const isTransactionStory =
    story.type === 'blockbuster-trade' ||
    story.type === 'lopsided-trade' ||
    story.type === 'faab-blowout' ||
    story.type === 'waiver-winner'

  let eyebrow = eyebrowForStoryType(story.type)
  let headline = headlineForStoryType(story.type, teamName)
  let body: string | undefined = bodyForStoryType(story.type, teamName)
  let player: WireCard['player'] | undefined

  if (isOvernightStory) {
    // Prefer the detector's tailored copy — it knows "involvesMe"
    // and tunes the second-person ("you climbed") vs third-person
    // ("Goof Juice climbed") framing.
    if (typeof ctx.headline === 'string') headline = ctx.headline
    if (typeof ctx.summary === 'string') body = ctx.summary as string
  }

  if (isTransactionStory) {
    // Same pattern as overnight — detector knows the players involved
    // and writes a name-rich headline that the copy map can't.
    if (typeof ctx.headline === 'string') headline = ctx.headline
    if (typeof ctx.summaryLine === 'string') body = ctx.summaryLine as string
  }

  if (isPlayerStory && typeof ctx?.mlbId === 'number') {
    // Override the generic copy with the rich player headline /
    // summary computed by the detector.
    if (typeof ctx.headline === 'string') headline = ctx.headline
    if (typeof ctx.summaryLine === 'string') body = ctx.summaryLine
    if (ctx.isMyGuy === true) {
      // My-guy variant gets a louder eyebrow.
      eyebrow = 'YOUR GUY'
    }

    const ownedByTeamNames = Array.isArray(ctx.ownedByTeamNames)
      ? (ctx.ownedByTeamNames as string[])
      : []
    const ownedByTeamIds = Array.isArray(ctx.ownedByTeamIds)
      ? (ctx.ownedByTeamIds as string[])
      : []

    player = {
      mlbId: ctx.mlbId as number,
      name: (ctx.playerName as string) ?? 'Player',
      position: ctx.position as string | undefined,
      mlbTeam: ctx.mlbTeam as string | undefined,
      headshotUrl:
        playerHeadshotUrl({
          platform: 'espn',
          sport: 'mlb',
          playerId: ctx.mlbId,
        }) || playerHeadshotFallback('mlb'),
      summaryLine: (ctx.summaryLine as string) ?? '',
      ownedByTeamIds,
      ownedByTeamNames,
      isMyGuy: ctx.isMyGuy === true,
    }
  }

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
    player,
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
    case 'matchup-tipped':       return 'OVERNIGHT FLIP'
    case 'matchup-pulse-up':     return 'OVERNIGHT GAIN'
    case 'matchup-pulse-down':   return 'OVERNIGHT SLIP'
    case 'rank-shift-up':        return 'OVERNIGHT CLIMB'
    case 'rank-shift-down':      return 'OVERNIGHT FALL'
    case 'monster-night':        return 'MONSTER NIGHT'
    case 'three-hr-game':        return '3-HR GAME'
    case 'twelve-k-game':        return '12-K GAME'
    case 'il-placement':         return 'INJURY WIRE'
    case 'il-return':            return 'BACK FROM IL'
    case 'bench-bad-beat':       return 'BAD BEAT'
    case 'streamer-of-day':      return 'OFF THE WIRE'
    case 'pitcher-blowup':       return 'BLOW-UP'
    case 'slump-hitter':         return 'COLD STREAK'
    case 'slump-pitcher-rolling': return 'COLD STREAK'
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
    case 'matchup-tipped':       return `${t}'s matchup flipped overnight.`
    case 'matchup-pulse-up':     return `${t} picked up ground overnight.`
    case 'matchup-pulse-down':   return `${t} lost ground overnight.`
    case 'rank-shift-up':        return `${t} climbed overnight.`
    case 'rank-shift-down':      return `${t} slipped overnight.`
    case 'monster-night':        return 'Monster line off the bat last night.'
    case 'three-hr-game':        return 'A 3-HR night moved the math.'
    case 'twelve-k-game':        return 'Twelve strikeouts. The K race tightened.'
    case 'il-placement':         return 'Key player landed on the IL.'
    case 'il-return':            return 'Back from the IL just in time.'
    case 'streamer-of-day':      return 'A free agent went off last night.'
    case 'pitcher-blowup':       return 'A start went sideways.'
    case 'slump-hitter':         return 'A bat has gone quiet.'
    case 'slump-pitcher-rolling': return 'An arm has gone cold.'
    default:                     return 'A new beat from your league.'
  }
}

function bodyForStoryType(type: StoryType, _teamName?: string): string | undefined {
  switch (type) {
    case 'cat-sweep':            return 'Every decided cat fell one way. A clean board.'
    case 'cat-shutout':          return 'A zero across the board. The kind of week you bury fast.'
    case 'photo-finish':         return 'One cat decided it. The thinnest margin on the docket.'
    case 'razor-close':          return 'Down to the final cat. A coin-flip week.'
    case 'comeback-win':         return 'Down seven cats by Friday. Closed it on Sunday.'
    case 'blowout':              return 'A double-digit cat gap. Not a contest, a coronation.'
    case 'streak-built':         return 'Three straight wins. The room is paying attention.'
    case 'streak-broken':        return 'The run ends. What was inevitable now feels mortal.'
    case 'hot-climber':          return 'A real move up the table. The middle is reshuffling.'
    case 'comeback-team':        return 'Out of the basement, back into the conversation.'
    case 'monday-recap':         return 'The slate is in. Here is the read.'
    case 'midweek-trade-talk':   return 'Half the week is gone. The desperate offers are coming.'
    case 'friday-preview':       return 'Whatever happens this weekend likely decides it.'
    case 'sunday-final-push':    return 'Save chances and cat leads still on the table.'
    case 'off-day-deep-dive':    return 'No box scores today. A good day to read the standings.'
    case 'blockbuster-trade':    return 'Multi-player swap. Rosters reshape, the standings notice.'
    case 'lopsided-trade':       return 'A trade clears. Both sides took the bet.'
    case 'faab-blowout':         return 'Outbid the room. The wire just thinned.'
    case 'waiver-winner':        return 'A top-priority claim, spent with intent.'
    case 'matchup-tipped':       return 'Enough cats moved overnight to flip the lead.'
    case 'matchup-pulse-up':     return 'You gained without flipping the lead.'
    case 'matchup-pulse-down':   return 'You lost ground without losing the lead. Yet.'
    case 'rank-shift-up':        return 'A real climb since yesterday. Not noise.'
    case 'rank-shift-down':      return 'A real drop since yesterday. Not noise.'
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
    case 'pitcher-blowup':
    case 'slump-hitter':
    case 'slump-pitcher-rolling':
    case 'blowout':              return 'down'
    case 'streamer-of-day':      return 'gold'
    case 'photo-finish':
    case 'razor-close':          return 'teal'
    case 'monster-night':
    case 'three-hr-game':
    case 'twelve-k-game':
    case 'blockbuster-trade':
    case 'faab-blowout':         return 'gold'
    case 'lopsided-trade':
    case 'waiver-winner':        return 'teal'
    case 'matchup-tipped':       return 'magenta'
    case 'matchup-pulse-up':
    case 'rank-shift-up':        return 'up'
    case 'matchup-pulse-down':
    case 'rank-shift-down':      return 'down'
    case 'off-day-deep-dive':    return 'neutral'
    default:                     return 'magenta'
  }
}

/* ─────────────────────────────────────────────────────────────────
   Bylines — magazine-y "FILED · 3H AGO" line.
───────────────────────────────────────────────────────────────── */

/**
 * Format a list of owner team names for the player-card attribution
 * line. "Goof Juice" → "Goof Juice"; ["A", "B"] → "A and B"; 3+
 * collapses to "A, B and 2 more."
 */
function formatOwnersList(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  const extra = names.length - 2
  return `${names[0]}, ${names[1]} and ${extra} more`
}

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

/* Player-card variant — headshot + meta. Replaces the team-chip
   row when the story is about a single player's performance. */
.wire-card-player {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: auto;
  padding-top: 8px;
}
.wire-card-player-headshot {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  background: oklch(0.14 0.018 90);
  flex-shrink: 0;
  /* MLB headshot crops are head-and-shoulders against a transparent
     PNG — the dark background fills the transparent area cleanly. */
}
.wire-card-player-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.wire-card-player-name {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 800;
  font-size: 0.98rem;
  color: oklch(0.97 0.005 90);
  letter-spacing: -0.005em;
}
.wire-card-player-team {
  margin: 0;
  display: inline-flex;
  gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
}
/* Ownership chip row — visual replacement for "Owned by X" text.
   Avatar + team name; "YOURS" treatment when the chip is the viewer's
   team; neutral "WAIVERS" when free agent. */
.wire-card-chip-row {
  margin: 6px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.wire-card-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px 3px 3px;
  border-radius: 999px;
  background: oklch(0.20 0.008 90);
  border: 1px solid oklch(0.30 0.010 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: oklch(0.78 0.012 90);
  max-width: 100%;
  overflow: hidden;
}
.wire-card-chip-avatar {
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.62rem;
  color: oklch(0.95 0.010 90);
  overflow: hidden;
}
.wire-card-chip-avatar .avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.wire-card-chip-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 14ch;
}
/* My-team variant — gold background, brighter type. */
.wire-card-chip-mine {
  background: oklch(0.32 0.14 92 / 0.30);
  border-color: oklch(0.62 0.18 92 / 0.55);
  color: oklch(0.92 0.18 92);
}
/* Overflow chip ("+N") — no avatar, compact. */
.wire-card-chip-overflow {
  padding: 3px 10px;
  color: oklch(0.62 0.010 90);
}
/* Free-agent chip — desaturated, italic gives the "anyone can grab" vibe. */
.wire-card-chip-fa {
  background: oklch(0.18 0.005 90);
  border-color: oklch(0.26 0.005 90);
  color: oklch(0.55 0.010 90);
}
.wire-card-chip-avatar-fa {
  background: oklch(0.30 0.005 90);
}

/* ─────────────────────────────────────────────────────────────────
   LEAD CARD — first card in the carousel gets a larger treatment.
   Magazine convention: a section's first story is the lead. Uniform
   cards make the eye wander; a lead anchors the section.
───────────────────────────────────────────────────────────────── */
.wire-card-lead {
  /* Lead card is meaningfully larger than the 320px regular card,
     but capped at 380px so a typical viewport still shows the next
     card alongside it. Magazine "lead" without dominating. */
  flex: 0 0 clamp(340px, 30vw, 380px);
}
.wire-card-lead .wire-card-headline {
  font-size: clamp(1.30rem, 2.2vw, 1.55rem);
  line-height: 1.12;
}
.wire-card-lead .wire-card-body {
  font-size: 0.93rem;
  line-height: 1.45;
}
.wire-card-lead .wire-card-player-headshot {
  width: 60px;
  height: 60px;
}
.wire-card-lead .wire-card-player-name {
  font-size: 1.0rem;
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

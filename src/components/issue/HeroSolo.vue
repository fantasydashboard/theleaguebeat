<template>
  <!--
    HeroSolo — single-team magazine cover.
    Used when the lead story is about one team (hot climber, comeback,
    throne streak, sweep, milestone, locked top seed, etc.). The
    eyebrow tag and headline are both driven off `story.type`; the
    sidebar pulls the team identity off `data.teams`.
  -->
  <section
    class="hero-solo"
    :class="`hero-solo-tone-${tone}`"
    :aria-labelledby="`hero-solo-headline-${componentId}`"
  >
    <div class="hero-solo-copy">
      <p class="hero-solo-eyebrow">
        <span class="hero-solo-eyebrow-bar" aria-hidden="true"></span>
        {{ eyebrow }}
        <span class="issue-cadence issue-cadence-teal" aria-label="Updates weekly">WEEKLY</span>
      </p>
      <h1 class="hero-solo-headline" :id="`hero-solo-headline-${componentId}`">
        {{ headline }}
      </h1>
      <p class="hero-solo-body">{{ body }}</p>
      <p class="issue-byline">
        <span class="issue-byline-tag">THE BEAT</span>
        <span>{{ byline }}</span>
      </p>
    </div>

    <aside class="hero-solo-team" :aria-label="`Feature team: ${team.name}`">
      <div
        class="hero-solo-avatar"
        :style="{ background: avatarBackground }"
        :class="{ 'hero-solo-avatar-placeholder': !hasTeam }"
      >
        <img v-if="team.avatarUrl" :src="team.avatarUrl" class="hero-solo-avatar-img" alt="" />
        <span v-else>{{ team.ownerInitials || '??' }}</span>
      </div>
      <p class="hero-solo-team-name">{{ team.name }}</p>
      <p v-if="team.ownerName" class="hero-solo-team-owner">{{ team.ownerName }}</p>
      <div v-if="rankBadge" class="hero-solo-rank">
        <span class="hero-solo-rank-now">#{{ rankBadge.now }}</span>
        <span
          v-if="rankBadge.delta !== 0"
          class="hero-solo-rank-delta"
          :class="rankBadge.delta > 0 ? 'hero-solo-rank-up' : 'hero-solo-rank-down'"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline v-if="rankBadge.delta > 0" points="6 15 12 9 18 15"/>
            <polyline v-else points="6 9 12 15 18 9"/>
          </svg>
          {{ rankBadge.delta > 0 ? '+' : '' }}{{ rankBadge.delta }}
        </span>
      </div>
    </aside>

    <button
      type="button"
      class="issue-section-share"
      :aria-label="`Share ${story.type} story to your league chat`"
      @click="emit('share', story)"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <polyline points="16 6 12 2 8 6"/>
        <line x1="12" y1="2" x2="12" y2="15"/>
      </svg>
      Share
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SelectedStory } from '@/editorial/detection/types'
import type { CategoryLeagueData, CategoryLeagueDataTeam } from '@/editorial/types'

const props = defineProps<{
  story: SelectedStory
  data?: CategoryLeagueData
}>()

const emit = defineEmits<{ (e: 'share', story: SelectedStory): void }>()

// Stable per-instance id so multiple heroes on a page don't share an aria-label id.
const componentId = Math.random().toString(36).slice(2, 8)

/** Pull the focus team off either context.teamId or story.teamIds[0]. */
const teamId = computed<string | undefined>(() => {
  const ctxId = (props.story.context as { teamId?: unknown }).teamId
  if (typeof ctxId === 'string') return ctxId
  return props.story.teamIds?.[0]
})

/** Look up the team record. Fall back to a placeholder shape so the
 *  component still renders cleanly when team data is missing. */
const PLACEHOLDER_TEAM: CategoryLeagueDataTeam = {
  id: 'unknown',
  name: 'Team unknown',
  ownerName: '',
  ownerInitials: '??',
  avatarColor: 'oklch(0.32 0.012 90), oklch(0.20 0.015 90)',
  isMyTeam: false,
}

const team = computed<CategoryLeagueDataTeam>(() => {
  const id = teamId.value
  if (!id) return PLACEHOLDER_TEAM
  return props.data?.teams.find((t) => t.id === id) ?? PLACEHOLDER_TEAM
})

const hasTeam = computed(() => team.value.id !== 'unknown')

const avatarBackground = computed(() => {
  // The avatarColor field is a comma-separated OKLCH stop list. Wrap
  // it in a 135-deg gradient for the avatar fill.
  return `linear-gradient(135deg, ${team.value.avatarColor})`
})

/** Optional rank chip — only shown when story.context exposes
 *  fromRank/toRank (most standings stories do). */
const rankBadge = computed<{ now: number; delta: number } | null>(() => {
  const ctx = props.story.context as {
    fromRank?: unknown
    toRank?: unknown
  }
  const from = typeof ctx.fromRank === 'number' ? ctx.fromRank : undefined
  const to = typeof ctx.toRank === 'number' ? ctx.toRank : undefined
  if (to == null) return null
  // Rank delta — a positive number means the team climbed (fromRank
  // was a bigger number than toRank).
  const delta = from != null ? from - to : 0
  return { now: to, delta }
})

/** Tone drives the accent strip and eyebrow color. Magenta for
 *  comebacks/dethronements, gold for top-seed locks, teal for
 *  category milestones, green for hot climbs, red for collapses. */
const tone = computed<'magenta' | 'gold' | 'teal' | 'green' | 'red'>(() => {
  switch (props.story.type) {
    case 'locked-top-seed':
    case 'throne-streak':
    case 'first-above-500':
      return 'gold'
    case 'hot-climber':
    case 'comeback-team':
    case 'three-week-comeback':
    case 'streak-built':
    case 'consistency-award':
    case 'first-time-playoffs':
    case 'newcomer-breakout':
    case 'cat-sweep':
      return 'green'
    case 'three-week-collapse':
    case 'streak-broken':
    case 'mathematical-elimination':
    case 'first-below-500':
    case 'basement-streak':
    case 'cat-shutout':
    case 'blowout':
      return 'red'
    case 'identity-shift':
    case 'cat-king-change':
    case 'cat-domination':
      return 'teal'
    default:
      return 'magenta'
  }
})

const eyebrow = computed(() => eyebrowFor(props.story.type))

function eyebrowFor(type: string): string {
  // Eyebrow is the magazine kicker — a short uppercase tag. Keep it
  // declarative, no exclamation, no question marks.
  switch (type) {
    case 'hot-climber':           return 'Hot climber'
    case 'comeback-team':         return 'Comeback'
    case 'three-week-comeback':   return 'Three weeks up'
    case 'three-week-collapse':   return 'Three weeks down'
    case 'throne-streak':         return 'Throne held'
    case 'locked-top-seed':       return 'Top seed locked'
    case 'streak-built':          return 'Hot streak'
    case 'streak-broken':         return 'Streak broken'
    case 'consistency-award':     return 'Quiet consistency'
    case 'inconsistency-award':   return 'Up and down'
    case 'basement-streak':       return 'Basement watch'
    case 'mathematical-elimination': return 'Eliminated'
    case 'first-time-playoffs':   return 'Into the bubble'
    case 'first-above-500':       return 'Above .500'
    case 'first-below-500':       return 'Below .500'
    case 'newcomer-breakout':     return 'Breakout week'
    case 'bubble-surprise':       return 'Bubble surprise'
    case 'identity-shift':        return 'New identity'
    case 'cat-sweep':             return 'Sweep'
    case 'cat-shutout':           return 'Shutout'
    case 'blowout':               return 'Blowout'
    case 'punt-success':          return 'Punt vindicated'
    case 'punt-failure':          return 'Punt collapse'
    case 'wild-card-shift':       return 'Wild card shift'
    case 'spoiler-mode':          return 'Spoiler mode'
    default:                      return 'This week'
  }
}

const headline = computed(() => headlineFor(props.story.type, team.value.name, props.story.context))

function headlineFor(type: string, name: string, ctx: Record<string, unknown>): string {
  const safeName = name || 'This team'

  // Pull numeric context fields we lean on across multiple branches.
  const spotsClimbed = typeof ctx.spotsClimbed === 'number' ? ctx.spotsClimbed : null
  const weeksAtTop  = typeof ctx.weeks === 'number' ? ctx.weeks : (typeof ctx.weeksAtTop === 'number' ? ctx.weeksAtTop : null)
  const streakLength = typeof ctx.streakLength === 'number' ? ctx.streakLength : (typeof ctx.brokenStreakLength === 'number' ? ctx.brokenStreakLength : null)
  const weeks = typeof ctx.weeks === 'number' ? ctx.weeks : null
  const fromRank = typeof ctx.fromRank === 'number' ? ctx.fromRank : null
  const toRank   = typeof ctx.toRank === 'number' ? ctx.toRank : null

  switch (type) {
    case 'hot-climber':
      if (spotsClimbed && spotsClimbed >= 4) return `${safeName} climbed ${spellOut(spotsClimbed)} spots.`
      return `${safeName} climbs the board.`
    case 'comeback-team':
      return `${safeName} is back.`
    case 'three-week-comeback':
      return 'Three weeks of gains.'
    case 'three-week-collapse':
      return 'Three weeks of slide.'
    case 'throne-streak':
      if (weeksAtTop && weeksAtTop >= 2) return `${safeName} holds the throne. ${capitalize(spellOut(weeksAtTop))} weeks running.`
      return `${safeName} holds the throne.`
    case 'locked-top-seed':
      return `${safeName} locked in number one.`
    case 'streak-built':
      if (streakLength) return `${safeName} ran it to ${streakLength}.`
      return `${safeName} is on a tear.`
    case 'streak-broken':
      if (streakLength && streakLength >= 3) return `${spellOut(streakLength)}-game run snapped.`
      return 'The streak ends.'
    case 'consistency-award':
      return `${safeName} holds the line.`
    case 'inconsistency-award':
      return `${safeName} can't pick a lane.`
    case 'basement-streak':
      if (weeks && weeks >= 3) return `${safeName} sits in the basement. ${capitalize(spellOut(weeks))} weeks running.`
      return `${safeName} can't climb out.`
    case 'mathematical-elimination':
      return `${safeName} is out.`
    case 'first-time-playoffs':
      return `${safeName} cracks the bubble.`
    case 'first-above-500':
      return `${safeName} crossed .500.`
    case 'first-below-500':
      return `${safeName} slipped to .500.`
    case 'newcomer-breakout':
      return `${safeName} cooked.`
    case 'bubble-surprise':
      return `${safeName} crashed the bubble.`
    case 'identity-shift':
      return `${safeName} flipped the script.`
    case 'cat-sweep':
      return `${safeName} swept the week.`
    case 'cat-shutout':
      return `${safeName} got shut out.`
    case 'blowout':
      return `${safeName} ran away with it.`
    case 'punt-success':
      return `${safeName} punted and won.`
    case 'punt-failure':
      return `${safeName} punted and paid.`
    case 'wild-card-shift':
      if (toRank && fromRank) return `${safeName} moved to seed ${toRank}.`
      return `${safeName} shifted the wild card race.`
    case 'spoiler-mode':
      return `${safeName} plays spoiler.`
    default:
      return `${safeName} is the story this week.`
  }
}

const body = computed(() => bodyFor(props.story.type, team.value.name, props.story.context))

function bodyFor(type: string, name: string, ctx: Record<string, unknown>): string {
  const safeName = name || 'This team'
  const spotsClimbed = typeof ctx.spotsClimbed === 'number' ? ctx.spotsClimbed : null
  const fromRank = typeof ctx.fromRank === 'number' ? ctx.fromRank : null
  const toRank   = typeof ctx.toRank === 'number' ? ctx.toRank : null
  const weeks    = typeof ctx.weeks === 'number' ? ctx.weeks : null
  const weeksAtTop = typeof ctx.weeksAtTop === 'number' ? ctx.weeksAtTop : null
  const streakLength = typeof ctx.streakLength === 'number' ? ctx.streakLength : null
  const gamesAhead = typeof ctx.gamesAhead === 'number' ? ctx.gamesAhead : null
  const weeksRemaining = typeof ctx.weeksRemaining === 'number' ? ctx.weeksRemaining : null

  switch (type) {
    case 'hot-climber':
      if (fromRank && toRank) return `From #${fromRank} in week one to #${toRank} today.`
      if (spotsClimbed) return `${spotsClimbed} spots since week one. The board reshuffled around them.`
      return 'The board reshuffled.'
    case 'comeback-team':
      if (fromRank && toRank) return `Sat at #${fromRank} three weeks ago. Now #${toRank}.`
      return 'Out of the basement and back in the conversation.'
    case 'three-week-comeback':
      return `${safeName} climbed in each of the last three weeks. Nothing flashy, just steady.`
    case 'three-week-collapse':
      return `${safeName} slipped in each of the last three weeks. The slide is real.`
    case 'throne-streak':
      if (weeksAtTop) return `${weeksAtTop} straight weeks at number one. Nobody has cracked the lead.`
      return 'The seat at the top has not moved.'
    case 'locked-top-seed':
      if (gamesAhead && weeksRemaining) return `${gamesAhead} cat wins ahead with ${weeksRemaining} to play. The math is closed.`
      return 'The math is closed. The top seed belongs to them.'
    case 'streak-built':
      if (streakLength) return `${streakLength} straight wins. The shape of the standings is shifting.`
      return 'Wins are stacking.'
    case 'streak-broken':
      return `${safeName} took a loss after a long run. The board resets.`
    case 'consistency-award':
      return `${safeName} won four of six. Quiet, steady, hard to bet against.`
    case 'inconsistency-award':
      return `Three wins, three losses, alternating. Read the next result anyway.`
    case 'basement-streak':
      if (weeks) return `${weeks} straight weeks near the bottom. Draft season is starting to feel close.`
      return 'A long stay at the bottom.'
    case 'mathematical-elimination':
      return `${safeName} cannot reach the cut line. Playing for next year now.`
    case 'first-time-playoffs':
      return 'First time above the bubble all year. The schedule still has games.'
    case 'first-above-500':
      return `${safeName} pushed over .500 for the first time this season.`
    case 'first-below-500':
      return `${safeName} dropped under .500. The first time it has happened this year.`
    case 'newcomer-breakout':
      return 'A team under .500 just lit up the week. The board notices.'
    case 'bubble-surprise':
      return 'Two weeks ago they were nowhere near it. Now they sit on the line.'
    case 'identity-shift':
      return 'The category profile has flipped. What worked last month does not work now.'
    case 'cat-sweep':
      return 'Every category. No splits. A clean week.'
    case 'cat-shutout':
      return `${safeName} took the zero. A loud week and not the good kind.`
    case 'blowout':
      return 'A category beating that closed early. Coast mode kicked in.'
    case 'punt-success':
      return 'The punted category did not matter. The rest of the slate did.'
    case 'punt-failure':
      return 'The punted category came back to bite.'
    case 'wild-card-shift':
      return 'The middle of the standings just moved.'
    case 'spoiler-mode':
      return 'An eliminated team is taking points from a contender. Stakes shift.'
    default:
      return `${safeName} is the team carrying this week.`
  }
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function spellOut(n: number): string {
  const words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve']
  return words[n] ?? String(n)
}

const byline = computed(() => {
  if (!props.story) return ''
  // Freshness is 0-1; convert to a rough "X hours ago" feel.
  const minutesAgo = Math.max(5, Math.round((1 - props.story.freshness) * 60 * 6))
  if (minutesAgo < 60) return `FILED · ${minutesAgo} MIN AGO`
  const hr = Math.round(minutesAgo / 60)
  if (hr < 24) return `FILED · ${hr} HR AGO`
  const d = Math.round(hr / 24)
  return `FILED · ${d} DAY${d === 1 ? '' : 'S'} AGO`
})
</script>

<style scoped>
/* Tokens — defined locally so the component renders correctly outside
   the `.demo-shell` host. Mirrors the demo-shell vocabulary. */
.hero-solo {
  --ink-1: oklch(0.97 0.005 90);
  --ink-2: oklch(0.78 0.008 90);
  --ink-3: oklch(0.55 0.010 90);
  --ink-4: oklch(0.32 0.012 90);
  --ink-5: oklch(0.20 0.015 90);
  --accent-primary:   oklch(0.78 0.18 92);
  --accent-secondary: oklch(0.70 0.27 350);
  --accent-tertiary:  oklch(0.72 0.18 195);
  --accent-up:        oklch(0.74 0.18 145);
  --accent-down:      oklch(0.65 0.20 25);

  position: relative;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 40px;
  padding: 36px 36px 32px;
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 24px;
  background:
    radial-gradient(ellipse at top right, var(--tone-bloom), transparent 60%),
    oklch(0.10 0.015 90);
  align-items: center;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
  overflow: hidden;
}

/* Tone variants — color the eyebrow + radial bloom. */
.hero-solo-tone-magenta { --tone: var(--accent-secondary); --tone-bloom: oklch(0.70 0.27 350 / 0.12); }
.hero-solo-tone-gold    { --tone: var(--accent-primary);   --tone-bloom: oklch(0.78 0.18 92 / 0.12); }
.hero-solo-tone-teal    { --tone: var(--accent-tertiary);  --tone-bloom: oklch(0.72 0.18 195 / 0.12); }
.hero-solo-tone-green   { --tone: var(--accent-up);        --tone-bloom: oklch(0.74 0.18 145 / 0.12); }
.hero-solo-tone-red     { --tone: var(--accent-down);      --tone-bloom: oklch(0.65 0.20 25 / 0.12); }

.hero-solo-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--tone);
  margin: 0 0 14px;
}
.hero-solo-eyebrow-bar {
  width: 24px;
  height: 1px;
  background: var(--tone);
}

.hero-solo-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  /* 5-6rem at desktop, scales down on mobile. */
  font-size: clamp(2.4rem, 6.2vw, 5.2rem);
  line-height: 0.9;
  letter-spacing: -0.018em;
  color: var(--ink-1);
  margin: 0 0 18px;
  /* Allow long team names to wrap rather than overflow the column. */
  overflow-wrap: anywhere;
}

.hero-solo-body {
  font-size: 1.02rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0;
  max-width: 48ch;
}

/* Right-side team chip — small, calm, never competes with headline. */
.hero-solo-team {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.hero-solo-avatar {
  width: 96px;
  height: 96px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.7rem;
  letter-spacing: 0.02em;
  color: oklch(0.12 0.012 90);
  box-shadow: 0 14px 32px -16px oklch(0 0 0 / 0.55);
  overflow: hidden;
}
.hero-solo-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.hero-solo-avatar-placeholder {
  /* Dim a missing-team avatar so it does not pretend to be real data. */
  opacity: 0.65;
  color: var(--ink-3);
}
.hero-solo-team-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: 0.02em;
  color: var(--ink-1);
  margin: 6px 0 0;
}
.hero-solo-team-owner {
  font-size: 0.78rem;
  color: var(--ink-3);
  margin: 0;
}

.hero-solo-rank {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.hero-solo-rank-now {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  padding: 3px 10px;
  border-radius: 8px;
  background: oklch(0.18 0.015 90);
  color: var(--ink-1);
}
.hero-solo-rank-delta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
}
.hero-solo-rank-up   { color: var(--accent-up); }
.hero-solo-rank-down { color: var(--accent-down); }

/* Single-column on narrow screens. */
@media (max-width: 720px) {
  .hero-solo {
    grid-template-columns: 1fr;
    padding: 28px 22px 26px;
    gap: 24px;
  }
  .hero-solo-team { order: -1; flex-direction: row; gap: 12px; text-align: left; }
  .hero-solo-avatar { width: 56px; height: 56px; border-radius: 14px; font-size: 1.1rem; }
  .hero-solo-team-name { margin: 0; }
  .hero-solo-rank { margin-left: auto; }
}
@media (max-width: 380px) {
  .hero-solo {
    padding: 22px 18px 22px;
    border-radius: 18px;
  }
  .hero-solo-headline { font-size: clamp(2rem, 9vw, 2.6rem); }
}

.issue-section-share {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  margin-top: 18px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid oklch(0.32 0.012 90);
  color: oklch(0.97 0.005 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 140ms cubic-bezier(0.22, 1, 0.36, 1),
              background-color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .issue-section-share:hover {
    border-color: oklch(0.55 0.010 90);
    background: oklch(0.14 0.018 90);
  }
}
.issue-section-share:active { transform: scale(0.97); }

.issue-cadence {
  display: inline-block;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  padding: 2px 7px;
  border-radius: 999px;
  margin-left: 6px;
}
.issue-cadence-teal { background: oklch(0.72 0.18 195 / 0.14); color: oklch(0.72 0.18 195); }
.issue-cadence-gold { background: oklch(0.78 0.18 92 / 0.14); color: oklch(0.78 0.18 92); }
.issue-cadence-up   { background: oklch(0.74 0.18 145 / 0.14); color: oklch(0.74 0.18 145); }

.issue-byline {
  margin: 14px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: oklch(0.45 0.010 90);
}
.issue-byline-tag {
  padding: 2px 6px;
  background: oklch(0.20 0.015 90);
  border-radius: 4px;
  color: oklch(0.78 0.008 90);
}
</style>

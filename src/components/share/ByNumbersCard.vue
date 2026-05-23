<template>
  <!--
    BY THE NUMBERS — datafied scoreboard share card. One massive
    numeral does the work. Supporting stats in agate type around it.
    No big team imagery. The information IS the design.

    Used for matchups, streaks, blowouts, monster nights, photo
    finishes. The numeral changes per story type: streak length,
    cat margin, score differential, etc.
  -->
  <div
    class="bnc"
    :class="`bnc-${tone}`"
    role="img"
    :aria-label="`Share card: ${headline}`"
  >
    <!-- Masthead strip -->
    <header class="bnc-mast">
      <img src="/tlb-favicon.png" alt="" class="bnc-mast-mark" />
      <div class="bnc-mast-text">
        <span class="bnc-mast-brand">THE LEAGUE BEAT</span>
        <span v-if="meta" class="bnc-mast-meta">{{ meta }}</span>
      </div>
      <span class="bnc-mast-rule" aria-hidden="true"></span>
    </header>

    <!-- Eyebrow + headline block -->
    <div class="bnc-head">
      <p class="bnc-eyebrow">
        <span class="bnc-eyebrow-bar" aria-hidden="true"></span>
        {{ eyebrow }}
      </p>
      <h1 class="bnc-headline">{{ headline }}</h1>
    </div>

    <!-- The data carrier — one big numeral, unit beneath. The numeral
         is set to absurd magazine-cover scale because that IS the
         message. -->
    <div class="bnc-numeral-block">
      <p class="bnc-numeral">{{ bigNumber }}</p>
      <p class="bnc-unit">{{ bigUnit }}</p>
    </div>

    <!-- Rule + stat block. Stats use a left-aligned label / right-
         aligned value grid so they read as a tabular block, not a
         loose list. -->
    <div class="bnc-rule" aria-hidden="true"></div>

    <dl class="bnc-stats">
      <div v-for="row in stats" :key="row.label" class="bnc-stat-row">
        <dt class="bnc-stat-label">{{ row.label }}</dt>
        <dd class="bnc-stat-value">{{ row.value }}</dd>
      </div>
    </dl>

    <!-- Team chip — small, only when we have a primary team. Lives
         near the bottom so it never competes with the numeral. -->
    <div v-if="primaryTeam" class="bnc-team-chip">
      <div
        class="bnc-team-avatar"
        :style="{ background: `linear-gradient(135deg, ${primaryTeam.avatarColor})` }"
      >
        <img
          v-if="primaryTeam.avatarUrl && !imgErrored"
          :src="primaryTeam.avatarUrl"
          alt=""
          class="bnc-team-avatar-img"
          @error="imgErrored = true"
        />
        <span v-else>{{ primaryTeam.ownerInitials }}</span>
      </div>
      <div class="bnc-team-meta">
        <p class="bnc-team-name">{{ primaryTeam.name }}</p>
        <p v-if="primaryTeam.ownerName" class="bnc-team-owner">{{ primaryTeam.ownerName }}</p>
      </div>
    </div>

    <!-- Spacer eats any remaining vertical so the footer locks to
         the bottom regardless of stat count. -->
    <div class="bnc-spacer" aria-hidden="true"></div>

    <!-- Footer -->
    <footer class="bnc-foot">
      <div class="bnc-foot-rule"></div>
      <div class="bnc-foot-row">
        <p class="bnc-foot-brand">THE LEAGUE BEAT</p>
        <p class="bnc-foot-url">theleaguebeat.com</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectedStory, StoryType } from '@/editorial/detection/types'
import type { CategoryLeagueData, CategoryLeagueDataTeam } from '@/editorial/types'

const props = defineProps<{
  story: SelectedStory
  data?: CategoryLeagueData
  metaOverride?: string
}>()

/** Toggled by the avatar img's @error. Cross-origin platform logos
 *  (ESPN especially) can 401, which would otherwise crash the
 *  html-to-image capture. Falling back to initials keeps the card
 *  shippable for every team. */
const imgErrored = ref(false)

/* ─────────────────────────────────────────────────────────────────
   Tone — drives the accent color so each story renders with a
   distinct visual register. Matches the in-page section components.
───────────────────────────────────────────────────────────────── */

type Tone = 'gold' | 'teal' | 'up' | 'down' | 'neutral'

const tone = computed<Tone>(() => {
  switch (props.story.type) {
    case 'streak-built':
    case 'throne-streak':
    case 'three-week-comeback':
    case 'cat-sweep':
    case 'comeback-win':
    case 'punt-success':
      return 'up'

    case 'streak-broken':
    case 'three-week-collapse':
    case 'basement-streak':
    case 'cat-shutout':
    case 'blowout':
    case 'punt-failure':
      return 'down'

    case 'matchup-of-week':
    case 'photo-finish':
    case 'razor-close':
    case 'division-clash':
      return 'teal'

    case 'monster-night':
    case 'three-hr-game':
    case 'twelve-k-game':
      return 'gold'

    default:
      return 'neutral'
  }
})

/* ─────────────────────────────────────────────────────────────────
   Issue meta — "WEEK N · YEAR" stripe in the masthead. Falls back
   to a season-only line if data isn't supplied.
───────────────────────────────────────────────────────────────── */

const meta = computed<string | null>(() => {
  if (props.metaOverride) return props.metaOverride.toUpperCase()
  const data = props.data
  if (!data) return null
  if (data.currentWeek && data.currentSeason) {
    return `WEEK ${data.currentWeek} · ${data.currentSeason}`
  }
  if (data.currentSeason) return `${data.currentSeason}`
  return null
})

/* ─────────────────────────────────────────────────────────────────
   Primary team — the story's main subject (first teamId).
───────────────────────────────────────────────────────────────── */

const primaryTeam = computed<CategoryLeagueDataTeam | null>(() => {
  const id = props.story.teamIds?.[0]
  if (!id || !props.data) return null
  return props.data.teams.find((t) => t.id === id) ?? null
})

function teamFor(id: string | undefined | null): CategoryLeagueDataTeam | null {
  if (!id || !props.data) return null
  return props.data.teams.find((t) => t.id === id) ?? null
}

/* ─────────────────────────────────────────────────────────────────
   Content derivation — per story type, return:
     - eyebrow:    short tag
     - headline:   the magazine line above the numeral
     - bigNumber:  the data carrier (string so we can include + or %)
     - bigUnit:    the unit shown beneath the numeral
     - stats:      3-4 supporting label/value rows

   Stories without a clean numeral fall back to a sensible default
   so the card always renders (rather than crashing on missing data).
───────────────────────────────────────────────────────────────── */

interface Content {
  eyebrow: string
  headline: string
  bigNumber: string
  bigUnit: string
  stats: { label: string; value: string }[]
}

const content = computed<Content>(() => buildContent(props.story))

const eyebrow = computed(() => content.value.eyebrow)
const headline = computed(() => content.value.headline)
const bigNumber = computed(() => content.value.bigNumber)
const bigUnit = computed(() => content.value.bigUnit)
const stats = computed(() => content.value.stats)

function buildContent(story: SelectedStory): Content {
  const ctx = story.context as Record<string, unknown>
  const teamName = primaryTeam.value?.name ?? 'The leader'

  switch (story.type) {
    /* ── Streaks ──────────────────────────────────────────────── */

    case 'streak-built': {
      const len = numFrom(ctx, 'streakLength') ?? 3
      return {
        eyebrow: 'HOT STREAK',
        headline: `${teamName} keeps winning.`,
        bigNumber: String(len),
        bigUnit: len === 1 ? 'STRAIGHT WIN' : 'STRAIGHT WINS',
        stats: [
          { label: 'LATEST', value: 'W' },
          { label: 'STREAK',  value: `${len}-0` },
          { label: 'BEAT',    value: opponentName(ctx, 'lastOpponentId') },
        ].filter((s) => s.value),
      }
    }

    case 'streak-broken': {
      const len = numFrom(ctx, 'brokenStreakLength') ?? 0
      const broken = strFrom(ctx, 'brokenStreakType') ?? 'W'
      const verb = broken === 'W' ? 'win streak' : 'losing streak'
      return {
        eyebrow: 'STREAK BROKEN',
        headline: `${teamName}'s run ends.`,
        bigNumber: String(len),
        bigUnit: len === 1 ? `${verb.toUpperCase()} (1)` : verb.toUpperCase(),
        stats: [
          { label: 'PRIOR',   value: `${len} ${broken === 'W' ? 'wins' : 'losses'}` },
          { label: 'LATEST',  value: broken === 'W' ? 'L' : 'W' },
        ],
      }
    }

    case 'throne-streak': {
      const len = numFrom(ctx, 'weeksAtTop') ?? numFrom(ctx, 'streakLength') ?? 1
      return {
        eyebrow: 'STILL ON TOP',
        headline: `${teamName} won't move.`,
        bigNumber: String(len),
        bigUnit: len === 1 ? 'WEEK AT #1' : 'WEEKS AT #1',
        stats: [
          { label: 'RANK',  value: '#1' },
          { label: 'WEEKS', value: String(len) },
        ],
      }
    }

    case 'three-week-comeback':
    case 'three-week-collapse': {
      const delta = numFrom(ctx, 'rankDelta') ?? 3
      const up = story.type === 'three-week-comeback'
      return {
        eyebrow: up ? 'CLIMBING' : 'COLLAPSE',
        headline: `${teamName} ${up ? 'climbs' : 'falls'} ${Math.abs(delta)} spots.`,
        bigNumber: `${up ? '+' : '−'}${Math.abs(delta)}`,
        bigUnit: 'RANKS IN 3 WEEKS',
        stats: [
          { label: 'FROM',  value: `#${numFrom(ctx, 'rankBefore') ?? '?'}` },
          { label: 'TO',    value: `#${numFrom(ctx, 'rankAfter') ?? '?'}` },
        ],
      }
    }

    case 'basement-streak': {
      const len = numFrom(ctx, 'weeksAtBottom') ?? numFrom(ctx, 'streakLength') ?? 1
      return {
        eyebrow: 'BASEMENT WATCH',
        headline: `${teamName} can't climb out.`,
        bigNumber: String(len),
        bigUnit: len === 1 ? 'WEEK IN LAST' : 'WEEKS IN LAST',
        stats: [
          { label: 'RANK',  value: 'LAST' },
          { label: 'WEEKS', value: String(len) },
        ],
      }
    }

    /* ── Matchups ─────────────────────────────────────────────── */

    case 'cat-sweep': {
      const wins = numFrom(ctx, 'catWins') ?? 0
      const ties = numFrom(ctx, 'ties') ?? 0
      const opp = teamFor(strFrom(ctx, 'loserTeamId'))?.name ?? 'their opponent'
      return {
        eyebrow: 'CAT SWEEP',
        headline: `${teamName} runs the table.`,
        bigNumber: `${wins}-0`,
        bigUnit: 'CATEGORIES',
        stats: [
          { label: 'OPPONENT', value: opp },
          { label: 'TIES',     value: String(ties) },
        ],
      }
    }

    case 'cat-shutout': {
      const losses = numFrom(ctx, 'catLosses') ?? 0
      const opp = teamFor(strFrom(ctx, 'winnerTeamId'))?.name ?? 'their opponent'
      return {
        eyebrow: 'CAT SHUTOUT',
        headline: `${teamName} couldn't win one.`,
        bigNumber: `0-${losses}`,
        bigUnit: 'CATEGORIES',
        stats: [
          { label: 'OPPONENT', value: opp },
        ],
      }
    }

    case 'photo-finish': {
      const each = numFrom(ctx, 'catWinsEach') ?? 0
      const ties = numFrom(ctx, 'ties') ?? 0
      const a = teamFor(strFrom(ctx, 'homeTeamId'))?.name ?? '—'
      const b = teamFor(strFrom(ctx, 'awayTeamId'))?.name ?? '—'
      return {
        eyebrow: 'PHOTO FINISH',
        headline: 'Decided by ties.',
        bigNumber: `${each}-${each}`,
        bigUnit: 'CATEGORIES',
        stats: [
          { label: 'HOME', value: a },
          { label: 'AWAY', value: b },
          { label: 'TIES', value: String(ties) },
        ],
      }
    }

    case 'razor-close': {
      const margin = numFrom(ctx, 'catMargin') ?? 1
      return {
        eyebrow: 'RAZOR CLOSE',
        headline: `Decided by ${margin}.`,
        bigNumber: `+${margin}`,
        bigUnit: margin === 1 ? 'CATEGORY' : 'CATEGORIES',
        stats: [
          { label: 'WINNER', value: teamName },
        ],
      }
    }

    case 'blowout': {
      const win = numFrom(ctx, 'winnerCatWins') ?? 0
      const lose = numFrom(ctx, 'loserCatWins') ?? 0
      const opp = teamFor(strFrom(ctx, 'loserTeamId'))?.name ?? 'their opponent'
      return {
        eyebrow: 'BLOWOUT',
        headline: `${teamName} ran them off the road.`,
        bigNumber: `${win}-${lose}`,
        bigUnit: 'CATEGORIES',
        stats: [
          { label: 'BEAT',   value: opp },
          { label: 'MARGIN', value: `+${win - lose} cats` },
        ],
      }
    }

    case 'comeback-win': {
      const deficit = numFrom(ctx, 'maxDeficit') ?? 0
      return {
        eyebrow: 'COMEBACK WIN',
        headline: `${teamName} climbed back.`,
        bigNumber: `−${deficit}`,
        bigUnit: 'BIGGEST GAP',
        stats: [
          { label: 'FINAL', value: 'W' },
        ],
      }
    }

    case 'matchup-of-week': {
      const opp = teamFor(strFrom(ctx, 'opponentTeamId'))?.name
        ?? teamFor(props.story.teamIds?.[1])?.name
        ?? 'their opponent'
      const edge = numFrom(ctx, 'projectionEdge')
      return {
        eyebrow: 'MATCHUP OF THE WEEK',
        headline: `${teamName} vs ${opp}.`,
        bigNumber: edge != null ? `${edge >= 0 ? '+' : ''}${edge}` : 'VS',
        bigUnit: edge != null ? 'PROJECTED CAT EDGE' : 'THIS WEEK',
        stats: [
          { label: 'HOME', value: teamName },
          { label: 'AWAY', value: opp },
        ],
      }
    }

    case 'punt-success':
    case 'punt-failure': {
      const wins = numFrom(ctx, 'catWins') ?? numFrom(ctx, 'winnerCatWins') ?? 0
      const losses = numFrom(ctx, 'catLosses') ?? numFrom(ctx, 'loserCatWins') ?? 0
      const success = story.type === 'punt-success'
      return {
        eyebrow: success ? 'PUNT PAYING OFF' : 'PUNT BLEEDING',
        headline: success ? `${teamName}'s strategy works.` : `${teamName}'s strategy hurts.`,
        bigNumber: `${wins}-${losses}`,
        bigUnit: 'CATEGORIES',
        stats: [
          { label: 'PUNTED',  value: `${numFrom(ctx, 'puntedCats') ?? '?'} cats` },
        ],
      }
    }

    /* ── Monster player nights (future) ───────────────────────── */

    case 'three-hr-game': {
      const hrs = numFrom(ctx, 'homeRuns') ?? 3
      const player = strFrom(ctx, 'playerName') ?? 'A bat'
      return {
        eyebrow: 'MONSTER NIGHT',
        headline: `${player} went off.`,
        bigNumber: String(hrs),
        bigUnit: hrs === 1 ? 'HOME RUN' : 'HOME RUNS',
        stats: [
          { label: 'PLAYER', value: player },
          { label: 'TEAM',   value: teamName },
        ],
      }
    }

    case 'twelve-k-game': {
      const ks = numFrom(ctx, 'strikeouts') ?? 12
      const player = strFrom(ctx, 'playerName') ?? 'An arm'
      return {
        eyebrow: 'MONSTER START',
        headline: `${player} carved them up.`,
        bigNumber: String(ks),
        bigUnit: 'STRIKEOUTS',
        stats: [
          { label: 'PLAYER', value: player },
          { label: 'TEAM',   value: teamName },
        ],
      }
    }

    case 'monster-night': {
      const stat = strFrom(ctx, 'statLine') ?? 'Big line'
      return {
        eyebrow: 'MONSTER NIGHT',
        headline: `${teamName} got a night.`,
        bigNumber: '1',
        bigUnit: 'STAR PERFORMANCE',
        stats: [
          { label: 'LINE', value: stat },
        ],
      }
    }

    /* ── Default (story type without a dedicated treatment) ───── */

    default: {
      return {
        eyebrow: (strFrom(ctx, 'eyebrow') ?? story.type.replace(/-/g, ' ')).toUpperCase(),
        headline: strFrom(ctx, 'headline') ?? `${teamName} story.`,
        bigNumber: '—',
        bigUnit: 'THIS WEEK',
        stats: [
          { label: 'TEAM', value: teamName },
        ],
      }
    }
  }
}

function numFrom(ctx: Record<string, unknown>, key: string): number | null {
  const v = ctx[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  return null
}
function strFrom(ctx: Record<string, unknown>, key: string): string | null {
  const v = ctx[key]
  if (typeof v === 'string' && v.length > 0) return v
  return null
}
function opponentName(ctx: Record<string, unknown>, key: string): string {
  const id = strFrom(ctx, key)
  if (!id) return ''
  return teamFor(id)?.name ?? ''
}
</script>

<style scoped>
/* The card is 1080x1920 (9:16). Captured via html-to-image at
   intrinsic size. Every measurement is in absolute px to make sure
   the capture is deterministic across viewports. */
.bnc {
  width: 1080px;
  height: 1920px;
  display: flex;
  flex-direction: column;
  padding: 64px 72px 56px;
  font-family: 'Barlow', system-ui, sans-serif;
  color: oklch(0.97 0.005 90);
  background:
    radial-gradient(
      120% 60% at 50% 0%,
      oklch(0.16 0.08 var(--bnc-hue) / 0.45) 0%,
      transparent 60%
    ),
    linear-gradient(180deg, oklch(0.10 0.02 90) 0%, oklch(0.06 0.014 90) 100%);
  position: relative;
  overflow: hidden;
}

/* Tone variables — each tone re-tints the radial wash up top. */
.bnc-up      { --bnc-hue: 145; --bnc-accent: oklch(0.74 0.18 145); }
.bnc-down    { --bnc-hue: 25;  --bnc-accent: oklch(0.65 0.20 25); }
.bnc-teal    { --bnc-hue: 195; --bnc-accent: oklch(0.72 0.18 195); }
.bnc-gold    { --bnc-hue: 92;  --bnc-accent: oklch(0.78 0.18 92); }
.bnc-neutral { --bnc-hue: 90;  --bnc-accent: oklch(0.78 0.18 92); }

/* ── Masthead ──────────────────────────────────────────────── */
.bnc-mast {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 64px;
}
.bnc-mast-mark {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  display: block;
  flex-shrink: 0;
}
.bnc-mast-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1;
}
.bnc-mast-brand {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 28px;
  letter-spacing: 0.04em;
  color: oklch(0.97 0.005 90);
}
.bnc-mast-meta {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
}
.bnc-mast-rule {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    oklch(0.32 0.012 90 / 0.7),
    transparent 80%
  );
  margin-left: 8px;
}

/* ── Eyebrow + headline ────────────────────────────────────── */
.bnc-head {
  margin-bottom: 32px;
}
.bnc-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  margin: 0 0 18px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 28px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--bnc-accent);
}
.bnc-eyebrow-bar {
  width: 40px;
  height: 2px;
  background: var(--bnc-accent);
}
.bnc-headline {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 76px;
  line-height: 1.0;
  letter-spacing: -0.02em;
  color: oklch(0.97 0.005 90);
  max-width: 18ch;
}

/* ── Numeral block — the data carrier ──────────────────────── */
.bnc-numeral-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin: 56px 0 32px;
  /* Negative margin lets the numeral hang a bit closer to the
     headline so the whole block reads as one composition. */
}
.bnc-numeral {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 480px;
  line-height: 0.82;
  letter-spacing: -0.04em;
  color: oklch(0.97 0.005 90);
  /* The numeral picks up the tone accent as a subtle bottom-up
     gradient overlay — gives it depth without being garish. */
  background: linear-gradient(
    180deg,
    oklch(0.97 0.005 90) 0%,
    oklch(0.97 0.005 90) 60%,
    var(--bnc-accent) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
}
.bnc-unit {
  margin: 8px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 36px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.78 0.008 90);
}

/* ── Rule + stat block ─────────────────────────────────────── */
.bnc-rule {
  height: 1px;
  background: linear-gradient(
    90deg,
    var(--bnc-accent),
    var(--bnc-accent) 30%,
    transparent 80%
  );
  margin: 16px 0 24px;
}
.bnc-stats {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr;
  row-gap: 18px;
}
.bnc-stat-row {
  display: grid;
  grid-template-columns: 200px 1fr;
  align-items: baseline;
  gap: 24px;
  border-bottom: 1px solid oklch(0.18 0.015 90);
  padding-bottom: 12px;
}
.bnc-stat-label {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 22px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
}
.bnc-stat-value {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 700;
  font-size: 32px;
  letter-spacing: -0.01em;
  color: oklch(0.97 0.005 90);
}

/* ── Team chip ─────────────────────────────────────────────── */
.bnc-team-chip {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 36px;
}
.bnc-team-avatar {
  width: 88px;
  height: 88px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  color: oklch(0.97 0.005 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 32px;
  letter-spacing: 0.04em;
}
.bnc-team-avatar-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}
.bnc-team-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.bnc-team-name {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 800;
  font-size: 32px;
  color: oklch(0.97 0.005 90);
  letter-spacing: -0.01em;
}
.bnc-team-owner {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  font-size: 22px;
  letter-spacing: 0.04em;
  color: oklch(0.55 0.010 90);
}

/* ── Spacer + Footer ───────────────────────────────────────── */
.bnc-spacer { flex: 1; min-height: 24px; }

.bnc-foot {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.bnc-foot-rule {
  height: 2px;
  background: var(--bnc-accent);
  width: 80px;
}
.bnc-foot-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}
.bnc-foot-brand {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 26px;
  letter-spacing: 0.04em;
  color: oklch(0.97 0.005 90);
}
.bnc-foot-url {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 22px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--bnc-accent);
}
</style>

<template>
  <!--
    WIRE BRIEF — terse, dense, no big imagery. Inspired by Reuters /
    AP wire dispatches: dateline, slug, tight head, short body. Used
    for Tier B situational stories (hot climber, division clash,
    three-week-comeback) where the moment doesn't warrant a numeral
    treatment but is still worth sharing.

    Composition philosophy: 95% type, 5% chrome. The card is the
    headline plus one supporting fact. Nothing more.
  -->
  <div
    class="wbc"
    :class="`wbc-${tone}`"
    role="img"
    :aria-label="`Share card: ${headline}`"
  >
    <!-- Slim masthead -->
    <header class="wbc-mast">
      <img src="/tlb-favicon.png" alt="" class="wbc-mast-mark" />
      <span class="wbc-mast-brand">THE LEAGUE BEAT</span>
      <span class="wbc-mast-rule" aria-hidden="true"></span>
      <span v-if="meta" class="wbc-mast-meta">{{ meta }}</span>
    </header>

    <!-- Dispatch tag — replaces the section-style eyebrow with a
         "DATELINE" feel. Format: "● WIRE · {SLUG}". The bullet is a
         pulse mark, the slug is the story slot. -->
    <p class="wbc-dispatch">
      <span class="wbc-dispatch-dot" aria-hidden="true"></span>
      <span class="wbc-dispatch-tag">WIRE</span>
      <span class="wbc-dispatch-sep">·</span>
      <span class="wbc-dispatch-slug">{{ slug }}</span>
    </p>

    <!-- Headline — tight, magazine-pull-quote-scaled. This carries
         the whole card; keep it under 6 words when content allows. -->
    <h1 class="wbc-headline">{{ headline }}</h1>

    <!-- One-line dek -->
    <p v-if="dek" class="wbc-dek">{{ dek }}</p>

    <!-- Supporting fact — single agate-type line. Rank, record,
         streak, whatever the most useful single number is. -->
    <div class="wbc-fact" v-if="factLabel">
      <span class="wbc-fact-label">{{ factLabel }}</span>
      <span class="wbc-fact-value">{{ factValue }}</span>
    </div>

    <!-- Small team chip — minimal, only when we have a primary
         team. Lives toward the bottom; it's signature, not subject. -->
    <div v-if="primaryTeam" class="wbc-team-chip">
      <div
        class="wbc-team-avatar"
        :style="{ background: `linear-gradient(135deg, ${primaryTeam.avatarColor})` }"
      >
        <img
          v-if="primaryTeam.avatarUrl && !imgErrored"
          :src="primaryTeam.avatarUrl"
          alt=""
          class="wbc-team-avatar-img"
          @error="imgErrored = true"
        />
        <span v-else>{{ primaryTeam.ownerInitials }}</span>
      </div>
      <div class="wbc-team-meta">
        <p class="wbc-team-name">{{ primaryTeam.name }}</p>
        <p v-if="primaryTeam.ownerName" class="wbc-team-owner">{{ primaryTeam.ownerName }}</p>
      </div>
    </div>

    <div class="wbc-spacer" aria-hidden="true"></div>

    <footer class="wbc-foot">
      <div class="wbc-foot-rule"></div>
      <div class="wbc-foot-row">
        <p class="wbc-foot-brand">THE LEAGUE BEAT</p>
        <p class="wbc-foot-url">theleaguebeat.com</p>
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

const imgErrored = ref(false)

type Tone = 'gold' | 'teal' | 'up' | 'down' | 'neutral'

const tone = computed<Tone>(() => {
  switch (props.story.type) {
    case 'hot-climber':
    case 'comeback-team':
    case 'three-week-comeback':
    case 'consistency-award':
      return 'up'

    case 'inconsistency-award':
      return 'down'

    case 'division-clash':
    case 'rematch':
    case 'stakes-week':
    case 'wild-card-shift':
    case 'three-way-tie-bubble':
      return 'teal'

    case 'newcomer-breakout':
    case 'punt-success':
      return 'gold'

    default:
      return 'neutral'
  }
})

const meta = computed<string | null>(() => {
  if (props.metaOverride) return props.metaOverride.toUpperCase()
  const data = props.data
  if (!data) return null
  if (data.currentWeek && data.currentSeason) {
    return `WEEK ${data.currentWeek} · ${data.currentSeason}`
  }
  return null
})

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
   Content per story type. Brief format keeps fields minimal:
     - slug:        the wire slug (e.g. "HOT CLIMBER")
     - headline:    tight title
     - dek:         optional one-line subhead
     - factLabel:   single supporting fact label
     - factValue:   single supporting fact value
───────────────────────────────────────────────────────────────── */

interface Content {
  slug: string
  headline: string
  dek: string | null
  factLabel: string | null
  factValue: string | null
}

const content = computed<Content>(() => buildContent(props.story))

const slug      = computed(() => content.value.slug)
const headline  = computed(() => content.value.headline)
const dek       = computed(() => content.value.dek)
const factLabel = computed(() => content.value.factLabel)
const factValue = computed(() => content.value.factValue)

function buildContent(story: SelectedStory): Content {
  const ctx = story.context as Record<string, unknown>
  const teamName = primaryTeam.value?.name ?? 'The leader'

  switch (story.type) {
    case 'hot-climber': {
      const delta = numFrom(ctx, 'rankDelta') ?? 0
      const rank = numFrom(ctx, 'currentRank')
      return {
        slug: 'HOT CLIMBER',
        headline: `${teamName} is moving up.`,
        dek: delta > 0 ? `Up ${delta} this week.` : null,
        factLabel: rank != null ? 'RANK' : null,
        factValue: rank != null ? `#${rank}` : null,
      }
    }

    case 'comeback-team': {
      const rank = numFrom(ctx, 'currentRank')
      return {
        slug: 'COMEBACK',
        headline: `${teamName} is back in it.`,
        dek: 'A team left for dead is climbing.',
        factLabel: rank != null ? 'RANK' : null,
        factValue: rank != null ? `#${rank}` : null,
      }
    }

    case 'consistency-award': {
      const wins = numFrom(ctx, 'wins')
      const losses = numFrom(ctx, 'losses')
      const record = wins != null && losses != null ? `${wins}-${losses}` : null
      return {
        slug: 'QUIET CONSISTENCY',
        headline: `${teamName} keeps showing up.`,
        dek: 'Boring is a strategy.',
        factLabel: record ? 'RECORD' : null,
        factValue: record,
      }
    }

    case 'inconsistency-award': {
      return {
        slug: 'CAN’T PICK A LANE',
        headline: `${teamName} can't find a rhythm.`,
        dek: 'Up one week, down the next.',
        factLabel: null,
        factValue: null,
      }
    }

    case 'three-week-comeback': {
      const delta = numFrom(ctx, 'rankDelta') ?? 3
      return {
        slug: 'CLIMBING',
        headline: `${teamName} climbed ${Math.abs(delta)} spots.`,
        dek: 'Three weeks ago they were buried.',
        factLabel: 'MOVE',
        factValue: `+${Math.abs(delta)}`,
      }
    }

    case 'division-clash': {
      const opp = teamFor(strFrom(ctx, 'opponentTeamId'))?.name
        ?? teamFor(props.story.teamIds?.[1])?.name
        ?? 'a rival'
      return {
        slug: 'DIVISION CLASH',
        headline: `${teamName} draws ${opp}.`,
        dek: 'Inside the division. Standings on the line.',
        factLabel: null,
        factValue: null,
      }
    }

    case 'division-lead-change': {
      return {
        slug: 'DIVISION LEAD',
        headline: `${teamName} takes the division.`,
        dek: 'The top of the bracket just shifted.',
        factLabel: 'RANK',
        factValue: '#1 in division',
      }
    }

    case 'wild-card-shift': {
      return {
        slug: 'WILD CARD',
        headline: 'The wild-card race tightens.',
        dek: 'A team moved into a playoff spot.',
        factLabel: null,
        factValue: null,
      }
    }

    case 'three-way-tie-bubble': {
      return {
        slug: 'BUBBLE',
        headline: 'Three teams. One spot.',
        dek: 'The bubble is a logjam.',
        factLabel: null,
        factValue: null,
      }
    }

    case 'rematch':
    case 'playoff-rematch': {
      const opp = teamFor(strFrom(ctx, 'opponentTeamId'))?.name
        ?? teamFor(props.story.teamIds?.[1])?.name
        ?? 'a familiar foe'
      return {
        slug: story.type === 'playoff-rematch' ? 'PLAYOFF REMATCH' : 'REMATCH',
        headline: `${teamName} meets ${opp} again.`,
        dek: 'They’ve done this dance before.',
        factLabel: null,
        factValue: null,
      }
    }

    case 'stakes-week': {
      return {
        slug: 'MUST-WIN',
        headline: `${teamName} can't drop this one.`,
        dek: 'The math gets unforgiving fast.',
        factLabel: null,
        factValue: null,
      }
    }

    case 'spoiler-mode':
    case 'spoiler-watch': {
      return {
        slug: 'SPOILER MODE',
        headline: `${teamName} can play spoiler.`,
        dek: 'No playoff hopes. Plenty to ruin.',
        factLabel: null,
        factValue: null,
      }
    }

    case 'bubble-surprise': {
      return {
        slug: 'BUBBLE SURPRISE',
        headline: 'The bubble just shifted.',
        dek: 'An unexpected team is in the mix.',
        factLabel: null,
        factValue: null,
      }
    }

    case 'newcomer-breakout': {
      return {
        slug: 'NEWCOMER',
        headline: `${teamName} arrives.`,
        dek: 'A rookie manager is making noise.',
        factLabel: null,
        factValue: null,
      }
    }

    /* Fallback — generic brief that still beats a blank card. */
    default: {
      return {
        slug: story.type.replace(/-/g, ' ').toUpperCase(),
        headline: strFrom(ctx, 'headline') ?? `${teamName} update.`,
        dek: strFrom(ctx, 'deck') ?? null,
        factLabel: null,
        factValue: null,
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
</script>

<style scoped>
.wbc {
  width: 1080px;
  height: 1920px;
  display: flex;
  flex-direction: column;
  padding: 72px 80px 56px;
  font-family: 'Barlow', system-ui, sans-serif;
  color: oklch(0.97 0.005 90);
  background: linear-gradient(180deg, oklch(0.09 0.018 90) 0%, oklch(0.06 0.014 90) 100%);
  position: relative;
  overflow: hidden;
}

.wbc-up      { --wbc-accent: oklch(0.74 0.18 145); }
.wbc-down    { --wbc-accent: oklch(0.65 0.20 25); }
.wbc-teal    { --wbc-accent: oklch(0.72 0.18 195); }
.wbc-gold    { --wbc-accent: oklch(0.78 0.18 92); }
.wbc-neutral { --wbc-accent: oklch(0.78 0.18 92); }

/* Subtle accent stripe along the left edge — a wire-service tic */
.wbc::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 6px;
  background: var(--wbc-accent);
}

/* ── Masthead ──────────────────────────────────────────────── */
.wbc-mast {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 88px;
}
.wbc-mast-mark {
  width: 48px;
  height: 48px;
  border-radius: 9px;
  display: block;
  flex-shrink: 0;
}
.wbc-mast-brand {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 24px;
  letter-spacing: 0.04em;
  color: oklch(0.97 0.005 90);
  white-space: nowrap;
}
.wbc-mast-rule {
  flex: 1;
  height: 1px;
  background: oklch(0.32 0.012 90);
}
.wbc-mast-meta {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
  white-space: nowrap;
}

/* ── Dispatch tag ──────────────────────────────────────────── */
.wbc-dispatch {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  margin: 0 0 36px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 26px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--wbc-accent);
}
.wbc-dispatch-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--wbc-accent);
}
.wbc-dispatch-tag { color: var(--wbc-accent); }
.wbc-dispatch-sep { color: oklch(0.55 0.010 90); }
.wbc-dispatch-slug { color: oklch(0.97 0.005 90); }

/* ── Headline + dek ────────────────────────────────────────── */
.wbc-headline {
  margin: 0 0 32px;
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 132px;
  line-height: 0.92;
  letter-spacing: -0.025em;
  color: oklch(0.97 0.005 90);
  max-width: 14ch;
}
.wbc-dek {
  margin: 0 0 56px;
  font-family: 'Barlow', sans-serif;
  font-weight: 500;
  font-size: 38px;
  line-height: 1.25;
  letter-spacing: -0.005em;
  color: oklch(0.78 0.008 90);
  max-width: 22ch;
}

/* ── Single supporting fact ────────────────────────────────── */
.wbc-fact {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 24px 0 24px;
  border-top: 1px solid oklch(0.18 0.015 90);
  border-bottom: 1px solid oklch(0.18 0.015 90);
}
.wbc-fact-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 22px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
}
.wbc-fact-value {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 96px;
  line-height: 1.0;
  letter-spacing: -0.02em;
  color: oklch(0.97 0.005 90);
}

/* ── Team chip ─────────────────────────────────────────────── */
.wbc-team-chip {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 56px;
}
.wbc-team-avatar {
  width: 80px;
  height: 80px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  color: oklch(0.97 0.005 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 28px;
  letter-spacing: 0.04em;
}
.wbc-team-avatar-img {
  width: 100%; height: 100%; display: block; object-fit: cover;
}
.wbc-team-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.wbc-team-name {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 800;
  font-size: 30px;
  color: oklch(0.97 0.005 90);
  letter-spacing: -0.01em;
}
.wbc-team-owner {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  font-size: 22px;
  letter-spacing: 0.04em;
  color: oklch(0.55 0.010 90);
}

/* ── Spacer + Footer ───────────────────────────────────────── */
.wbc-spacer { flex: 1; min-height: 24px; }

.wbc-foot {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.wbc-foot-rule {
  height: 2px;
  background: var(--wbc-accent);
  width: 64px;
}
.wbc-foot-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}
.wbc-foot-brand {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 26px;
  letter-spacing: 0.04em;
  color: oklch(0.97 0.005 90);
}
.wbc-foot-url {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 22px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--wbc-accent);
}
</style>

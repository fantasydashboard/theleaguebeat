<template>
  <!--
    COVER — magazine-cover treatment. Reserved for Tier S moments
    (new throne, championship, mathematical elimination, blockbuster
    trade). One massive cropped team avatar bleeding off the right
    edge anchors the composition. Stacked dramatic type on the left.

    What it is NOT: a literal mockup of a magazine page. No binding,
    no page-curl, no fake newsprint. Editorial sensibility comes from
    composition + type hierarchy, not from costume.
  -->
  <div
    class="cvr"
    :class="`cvr-${tone}`"
    role="img"
    :aria-label="`Share card: ${headline}`"
  >
    <!-- Background: tonal radial wash that anchors the type column,
         no decorative texture or noise. -->
    <div class="cvr-wash" aria-hidden="true"></div>

    <!-- Bleeding-avatar visual. Positioned right-of-center, cropped
         off the right edge. Carries the visual weight. -->
    <div
      v-if="primaryTeam"
      class="cvr-anchor"
      :style="{ background: `linear-gradient(135deg, ${primaryTeam.avatarColor})` }"
    >
      <img
        v-if="primaryTeam.avatarUrl && !imgErrored"
        :src="primaryTeam.avatarUrl"
        class="cvr-anchor-img"
        alt=""
        @error="imgErrored = true"
      />
      <span v-else class="cvr-anchor-initials">{{ primaryTeam.ownerInitials }}</span>
    </div>

    <!-- Masthead, slim at the top -->
    <header class="cvr-mast">
      <img src="/tlb-favicon.png" alt="" class="cvr-mast-mark" />
      <span class="cvr-mast-brand">THE LEAGUE BEAT</span>
      <span v-if="meta" class="cvr-mast-sep" aria-hidden="true">·</span>
      <span v-if="meta" class="cvr-mast-meta">{{ meta }}</span>
    </header>

    <!-- Title block, anchored bottom-left. Stacked type at multiple
         scales is what makes this read as a cover. -->
    <div class="cvr-title-block">
      <p class="cvr-eyebrow">
        <span class="cvr-eyebrow-bar" aria-hidden="true"></span>
        {{ eyebrow }}
      </p>

      <h1 class="cvr-title">{{ title }}</h1>

      <p class="cvr-subhead">{{ subhead }}</p>

      <!-- Stat callout — one big proof line. Optional but loaded by
           default since covers almost always benefit from a number. -->
      <div v-if="callout" class="cvr-callout">
        <span class="cvr-callout-rule"></span>
        <span class="cvr-callout-text">{{ callout }}</span>
      </div>

      <!-- Team byline -->
      <p v-if="primaryTeam" class="cvr-byline">
        <span class="cvr-byline-name">{{ primaryTeam.name }}</span>
        <span v-if="primaryTeam.ownerName" class="cvr-byline-sep">·</span>
        <span v-if="primaryTeam.ownerName" class="cvr-byline-owner">{{ primaryTeam.ownerName }}</span>
      </p>
    </div>

    <!-- Footer -->
    <footer class="cvr-foot">
      <p class="cvr-foot-brand">THE LEAGUE BEAT</p>
      <p class="cvr-foot-url">theleaguebeat.com</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectedStory } from '@/editorial/detection/types'
import type { CategoryLeagueData, CategoryLeagueDataTeam } from '@/editorial/types'

const props = defineProps<{
  story: SelectedStory
  data?: CategoryLeagueData
  metaOverride?: string
}>()

const imgErrored = ref(false)

type Tone = 'magenta' | 'gold' | 'up' | 'down'

const tone = computed<Tone>(() => {
  switch (props.story.type) {
    case 'new-throne':
    case 'locked-top-seed':
    case 'first-time-playoffs':
      return 'up'

    case 'dynasty-falling':
    case 'mathematical-elimination':
      return 'down'

    case 'blockbuster-trade':
      return 'gold'

    case 'dethroned-rivalry':
    default:
      return 'magenta'
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
   Content per story type. Covers want:
     eyebrow:  short, dramatic tag
     title:    1-3 stacked words for the headline
     subhead:  one descriptive sentence under the title
     callout:  one rule + short proof line (e.g. "FROM #6 → #1")
───────────────────────────────────────────────────────────────── */

interface Content {
  eyebrow: string
  title: string
  subhead: string
  callout: string | null
}

const content = computed<Content>(() => buildContent(props.story))

const eyebrow = computed(() => content.value.eyebrow)
const title = computed(() => content.value.title)
const subhead = computed(() => content.value.subhead)
const callout = computed(() => content.value.callout)

function buildContent(story: SelectedStory): Content {
  const ctx = story.context as Record<string, unknown>
  const teamName = primaryTeam.value?.name ?? 'A new leader'

  switch (story.type) {
    case 'new-throne': {
      const oppId = strFrom(ctx, 'dethronedTeamId') ?? props.story.teamIds?.[1]
      const dethroned = teamFor(oppId)?.name
      const from = numFrom(ctx, 'previousRank')
      const callout =
        from != null
          ? `FROM #${from} → #1 ${weeksSinceLine(ctx)}`
          : dethroned
          ? `OVERTAKES ${dethroned.toUpperCase()}`
          : null
      return {
        eyebrow: 'NEW THRONE',
        title: 'TAKEOVER.',
        subhead: `${teamName} takes the top spot.`,
        callout,
      }
    }

    case 'dynasty-falling': {
      const from = numFrom(ctx, 'previousRank') ?? 1
      const to = numFrom(ctx, 'currentRank')
      const callout = to != null ? `FROM #${from} → #${to}` : null
      return {
        eyebrow: 'TOP SPOT SLIPPING',
        title: 'CRACKS.',
        subhead: `${teamName} is losing altitude.`,
        callout,
      }
    }

    case 'dethroned-rivalry': {
      const oppId = strFrom(ctx, 'rivalTeamId') ?? props.story.teamIds?.[1]
      const rival = teamFor(oppId)?.name
      return {
        eyebrow: 'THRONE IN MOTION',
        title: 'SWAP.',
        subhead: rival
          ? `${teamName} and ${rival} trade places.`
          : `${teamName} flips the top spot.`,
        callout: null,
      }
    }

    case 'mathematical-elimination': {
      const week = numFrom(ctx, 'weekEliminated') ?? numFrom(ctx, 'week')
      return {
        eyebrow: 'ELIMINATED',
        title: 'OUT.',
        subhead: `${teamName} is mathematically done.`,
        callout: week != null ? `WEEK ${week}` : null,
      }
    }

    case 'locked-top-seed': {
      return {
        eyebrow: 'TOP SEED LOCKED',
        title: 'CLINCHED.',
        subhead: `${teamName} secures the top seed.`,
        callout: 'BYE WEEK INCOMING',
      }
    }

    case 'first-time-playoffs': {
      return {
        eyebrow: 'FIRST TIME',
        title: 'IN.',
        subhead: `${teamName} clinches their first playoff trip.`,
        callout: 'FRANCHISE FIRST',
      }
    }

    case 'blockbuster-trade': {
      const piecesA = strFrom(ctx, 'sideAPieces') ?? '—'
      const piecesB = strFrom(ctx, 'sideBPieces') ?? '—'
      return {
        eyebrow: 'BLOCKBUSTER',
        title: 'DEAL.',
        subhead: `${teamName} pulls the trigger.`,
        callout: `${piecesA} ↔ ${piecesB}`,
      }
    }

    default: {
      return {
        eyebrow: story.type.replace(/-/g, ' ').toUpperCase(),
        title: 'STORY.',
        subhead: `${teamName} story this week.`,
        callout: null,
      }
    }
  }
}

function weeksSinceLine(ctx: Record<string, unknown>): string {
  const weeks = numFrom(ctx, 'weeksToReach')
  if (weeks == null) return ''
  return `IN ${weeks} ${weeks === 1 ? 'WEEK' : 'WEEKS'}`
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
.cvr {
  width: 1080px;
  height: 1920px;
  position: relative;
  font-family: 'Barlow', system-ui, sans-serif;
  color: oklch(0.97 0.005 90);
  background: oklch(0.06 0.014 90);
  overflow: hidden;
}

.cvr-up      { --cvr-hue: 145; --cvr-accent: oklch(0.74 0.18 145); }
.cvr-down    { --cvr-hue: 25;  --cvr-accent: oklch(0.65 0.20 25); }
.cvr-gold    { --cvr-hue: 92;  --cvr-accent: oklch(0.78 0.18 92); }
.cvr-magenta { --cvr-hue: 350; --cvr-accent: oklch(0.70 0.27 350); }

/* Tonal wash anchored low-left, where the title block lives. The
   gradient does the work of "this card has a mood" without any
   imagery decoration. */
.cvr-wash {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      90% 70% at 10% 80%,
      oklch(0.16 0.10 var(--cvr-hue) / 0.55) 0%,
      transparent 60%
    ),
    radial-gradient(
      80% 60% at 90% 30%,
      oklch(0.14 0.08 var(--cvr-hue) / 0.30) 0%,
      transparent 60%
    ),
    linear-gradient(180deg, oklch(0.08 0.018 90) 0%, oklch(0.05 0.012 90) 100%);
}

/* ── Bleeding-avatar anchor ───────────────────────────────── */
.cvr-anchor {
  position: absolute;
  /* Crops the avatar so ~30% bleeds off the right edge. The visual
     weight reads as a magazine cover photo crop. */
  top: 240px;
  right: -180px;
  width: 760px;
  height: 760px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow:
    0 40px 100px oklch(0 0 0 / 0.45),
    inset 0 0 0 2px oklch(0.97 0.005 90 / 0.08);
}
.cvr-anchor-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}
.cvr-anchor-initials {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 280px;
  letter-spacing: -0.02em;
  color: oklch(0.97 0.005 90);
}

/* A soft vignette over the bottom half so the title type retains
   contrast over any avatar color combination. */
.cvr::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    transparent 0%,
    transparent 40%,
    oklch(0.05 0.012 90 / 0.55) 75%,
    oklch(0.04 0.010 90 / 0.92) 100%
  );
}

/* ── Masthead ──────────────────────────────────────────────── */
.cvr-mast {
  position: relative;
  z-index: 2;
  padding: 56px 64px 0;
  display: flex;
  align-items: center;
  gap: 14px;
}
.cvr-mast-mark {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: block;
}
.cvr-mast-brand {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 22px;
  letter-spacing: 0.04em;
  color: oklch(0.97 0.005 90);
  white-space: nowrap;
}
.cvr-mast-sep { color: oklch(0.45 0.010 90); font-size: 22px; }
.cvr-mast-meta {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
}

/* ── Title block ───────────────────────────────────────────── */
.cvr-title-block {
  position: absolute;
  z-index: 2;
  left: 64px;
  right: 64px;
  bottom: 200px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.cvr-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 28px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--cvr-accent);
}
.cvr-eyebrow-bar {
  width: 40px;
  height: 2px;
  background: var(--cvr-accent);
}
.cvr-title {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 280px;
  line-height: 0.86;
  letter-spacing: -0.04em;
  color: oklch(0.97 0.005 90);
  max-width: 12ch;
}
.cvr-subhead {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 500;
  font-size: 40px;
  line-height: 1.2;
  letter-spacing: -0.005em;
  color: oklch(0.85 0.008 90);
  max-width: 20ch;
}
.cvr-callout {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 12px;
}
.cvr-callout-rule {
  width: 56px;
  height: 3px;
  background: var(--cvr-accent);
}
.cvr-callout-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 28px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--cvr-accent);
}
.cvr-byline {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 24px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: oklch(0.78 0.008 90);
}
.cvr-byline-sep { color: oklch(0.45 0.010 90); }
.cvr-byline-owner { color: oklch(0.55 0.010 90); }

/* ── Footer ────────────────────────────────────────────────── */
.cvr-foot {
  position: absolute;
  z-index: 2;
  bottom: 56px;
  left: 64px;
  right: 64px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}
.cvr-foot-brand {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 22px;
  letter-spacing: 0.04em;
  color: oklch(0.97 0.005 90);
}
.cvr-foot-url {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 20px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cvr-accent);
}
</style>

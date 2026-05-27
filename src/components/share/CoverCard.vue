<template>
  <!-- Universal share card — a vertical (4:5) version of the home
       WeeklyCover. Every shared story renders through this one
       template so the downloaded image matches the site: same tone
       backdrop + grain, same forwardable cover line, same smart
       imagery (duel logos for trades/matchups, a single bleeding
       logo otherwise, type-led when there's no art), masthead + foot.
       Captured to PNG by useShareStory (root class `.cvr`). -->
  <div class="cvr" :class="`cvr-${tone}`" role="img" :aria-label="`Share card: ${headline}`">
    <div class="cvr-backdrop" aria-hidden="true"></div>
    <div class="cvr-grain" aria-hidden="true"></div>

    <!-- Type-led ghost numeral when there's no usable logo. -->
    <span v-if="art.mode === 'type'" class="cvr-ghost" aria-hidden="true">{{ issueNum }}</span>

    <!-- Single bleeding logo. -->
    <div v-else-if="art.mode === 'single'" class="cvr-stage cvr-stage-single" aria-hidden="true">
      <img
        v-if="!errA"
        :src="art.team.avatarUrl"
        class="cvr-art"
        alt=""
        @error="errA = true"
      />
      <div v-else class="cvr-art-fallback" :style="fallbackStyle(art.team)">{{ art.team.ownerInitials }}</div>
      <div class="cvr-vignette"></div>
    </div>

    <!-- Two-logo duel (trades / matchups). -->
    <div v-else class="cvr-stage cvr-stage-duel" aria-hidden="true">
      <span class="cvr-duel cvr-duel-b">
        <img v-if="!errB" :src="art.teamB.avatarUrl" alt="" @error="errB = true" />
        <span v-else class="cvr-duel-fallback" :style="fallbackStyle(art.teamB)">{{ art.teamB.ownerInitials }}</span>
      </span>
      <span class="cvr-duel cvr-duel-a">
        <img v-if="!errA" :src="art.teamA.avatarUrl" alt="" @error="errA = true" />
        <span v-else class="cvr-duel-fallback" :style="fallbackStyle(art.teamA)">{{ art.teamA.ownerInitials }}</span>
      </span>
      <div class="cvr-vignette"></div>
    </div>

    <!-- Masthead -->
    <header class="cvr-mast">
      <img src="/tlb-favicon.png" alt="" class="cvr-mast-mark" />
      <span class="cvr-mast-brand">THE LEAGUE BEAT</span>
      <span v-if="meta" class="cvr-mast-sep" aria-hidden="true">·</span>
      <span v-if="meta" class="cvr-mast-meta">{{ meta }}</span>
    </header>

    <!-- Title block -->
    <div class="cvr-body">
      <p class="cvr-eyebrow">
        <span class="cvr-eyebrow-dot" aria-hidden="true"></span>
        {{ eyebrow }}
      </p>
      <h1 class="cvr-headline">{{ headline }}</h1>
      <p v-if="deck" class="cvr-deck">{{ deck }}</p>
      <p v-if="art.mode === 'duel'" class="cvr-vs">
        <span>{{ art.teamA.name }}</span>
        <span class="cvr-vs-x" aria-hidden="true">vs</span>
        <span>{{ art.teamB.name }}</span>
      </p>
    </div>

    <!-- Footer -->
    <footer class="cvr-foot">
      <span class="cvr-foot-brand">THE LEAGUE BEAT</span>
      <span class="cvr-foot-url">theleaguebeat.com</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectedStory } from '@/editorial/detection/types'
import type { CategoryLeagueData, CategoryLeagueDataTeam } from '@/editorial/types'
import {
  composeCoverHeadline,
  resolveCoverArt,
  type CoverArt,
} from '@/editorial/composition/weeklyCover'
import { composeHeroDeck } from '@/editorial/composition/heroDeck'

const props = defineProps<{
  story: SelectedStory
  data?: CategoryLeagueData
  metaOverride?: string
}>()

const errA = ref(false)
const errB = ref(false)

const headline = computed(() => composeCoverHeadline(props.story))
const deck = computed(() => composeHeroDeck(props.story, props.data))

const art = computed<CoverArt>(() => resolveCoverArt(props.story, props.data?.teams))

const issueNum = computed(() => props.data?.currentWeek ?? '')

const meta = computed<string | null>(() => {
  if (props.metaOverride) return props.metaOverride.toUpperCase()
  const d = props.data
  if (d?.currentWeek && d?.currentSeason) return `WEEK ${d.currentWeek} · ${d.currentSeason}`
  if (d?.currentSeason) return `${d.currentSeason}`
  return null
})

/** Tone — identical mapping to the home WeeklyCover so the share
 *  matches the on-site card's color. */
const tone = computed<'magenta' | 'gold' | 'teal' | 'up' | 'down'>(() => {
  const t = props.story.type
  if (t === 'blockbuster-trade' || t === 'lopsided-trade') return 'gold'
  if (t === 'new-throne' || t === 'dynasty-falling' || t === 'dethroned-rivalry') return 'magenta'
  if (t === 'monster-night' || t === 'three-hr-game' || t === 'twelve-k-game' || t === 'no-hitter') return 'gold'
  if (t === 'comeback-team' || t === 'hot-climber' || t === 'streak-built' || t === 'three-week-comeback') return 'up'
  if (t === 'streak-broken' || t === 'three-week-collapse') return 'down'
  if (t === 'photo-finish' || t === 'comeback-win') return 'teal'
  return 'magenta'
})

const EYEBROW: Record<string, string> = {
  'blockbuster-trade': 'Blockbuster trade',
  'lopsided-trade': 'Trade',
  'new-throne': 'New throne',
  'dynasty-falling': 'Dynasty falling',
  'throne-streak': 'Throne held',
  'hot-climber': 'Hot climber',
  'comeback-team': 'Comeback',
  'streak-built': 'Hot streak',
  'streak-broken': 'Streak broken',
  'monster-night': 'Monster night',
  'three-hr-game': 'Three-HR game',
  'twelve-k-game': '12-K game',
  'photo-finish': 'Photo finish',
  'comeback-win': 'Comeback win',
  'blowout': 'Blowout',
  'matchup-of-week': 'Matchup of the week',
  'cat-sweep': 'Cat sweep',
  'three-week-comeback': 'Three-week run',
  'three-week-collapse': 'Three-week fall',
}
const eyebrow = computed(() => {
  const ctx = props.story.context as Record<string, unknown>
  const explicit = typeof ctx.eyebrow === 'string' ? ctx.eyebrow : null
  return (explicit ?? EYEBROW[props.story.type] ?? props.story.type.replace(/-/g, ' ')).toUpperCase()
})

function fallbackStyle(team: CategoryLeagueDataTeam) {
  return { background: `linear-gradient(135deg, ${team.avatarColor})` }
}
</script>

<style scoped>
.cvr {
  position: relative;
  width: 1080px;
  height: 1350px;
  overflow: hidden;
  isolation: isolate;
  font-family: 'Barlow', system-ui, sans-serif;
  color: oklch(0.97 0.005 90);
  background: oklch(0.055 0.012 90);
}

.cvr-magenta { --cv-hue: 350; --cv-accent: oklch(0.70 0.27 350); }
.cvr-gold    { --cv-hue: 92;  --cv-accent: oklch(0.80 0.17 92);  }
.cvr-teal    { --cv-hue: 195; --cv-accent: oklch(0.72 0.18 195); }
.cvr-up      { --cv-hue: 145; --cv-accent: oklch(0.74 0.18 145); }
.cvr-down    { --cv-hue: 25;  --cv-accent: oklch(0.65 0.20 25);  }

.cvr-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse 90% 60% at 85% 12%, oklch(0.26 0.13 var(--cv-hue) / 0.55) 0%, transparent 60%),
    radial-gradient(ellipse 70% 50% at 10% 95%, oklch(0.18 0.10 var(--cv-hue) / 0.32) 0%, transparent 60%),
    linear-gradient(180deg, oklch(0.09 0.014 90) 0%, oklch(0.05 0.012 90) 100%);
}
.cvr-grain {
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0.12;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}

.cvr-ghost {
  position: absolute;
  right: -40px;
  top: 40px;
  z-index: 1;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 720px;
  line-height: 0.8;
  letter-spacing: -0.04em;
  color: oklch(0.30 0.06 var(--cv-hue) / 0.18);
}

/* ── Single bleeding logo ──────────────────────────────────── */
.cvr-stage {
  position: absolute;
  z-index: 1;
}
.cvr-stage-single {
  top: -40px;
  right: -140px;
  width: 760px;
  height: 760px;
  overflow: hidden;
}
.cvr-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: saturate(1.05) contrast(1.04);
}
.cvr-art-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 240px;
  color: oklch(0.97 0.005 90);
}

/* ── Duel medallions ───────────────────────────────────────── */
.cvr-stage-duel {
  top: 100px;
  right: 0;
  width: 640px;
  height: 640px;
}
.cvr-duel {
  position: absolute;
  border-radius: 28px;
  overflow: hidden;
  border: 1px solid oklch(0.34 0.03 var(--cv-hue) / 0.5);
  box-shadow: 0 30px 80px oklch(0.02 0 0 / 0.6);
}
.cvr-duel img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cvr-duel-fallback {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
  font-size: 120px; color: oklch(0.97 0.005 90);
}
.cvr-duel-b {
  width: 300px; height: 300px;
  top: 0; right: 250px;
  transform: rotate(-4deg);
  filter: saturate(0.82) brightness(0.66);
}
.cvr-duel-a {
  width: 380px; height: 380px;
  bottom: 30px; right: 40px;
  transform: rotate(3deg);
  z-index: 1;
}

/* ── Vignette so the title reads over any art ──────────────── */
.cvr-vignette {
  position: absolute;
  inset: -200px -40px -40px -40px;
  background:
    linear-gradient(180deg, transparent 30%, oklch(0.05 0.012 90 / 0.55) 70%, oklch(0.05 0.012 90 / 0.96) 100%),
    linear-gradient(75deg, oklch(0.05 0.012 90) 8%, oklch(0.05 0.012 90 / 0.2) 42%, transparent 70%);
}

/* ── Masthead ──────────────────────────────────────────────── */
.cvr-mast {
  position: absolute;
  z-index: 3;
  top: 56px;
  left: 64px;
  right: 64px;
  display: flex;
  align-items: center;
  gap: 14px;
}
.cvr-mast-mark { width: 44px; height: 44px; border-radius: 8px; display: block; }
.cvr-mast-brand {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 26px;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.cvr-mast-sep { color: oklch(0.45 0.010 90); }
.cvr-mast-meta {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
}

/* ── Title block ───────────────────────────────────────────── */
.cvr-body {
  position: absolute;
  z-index: 2;
  left: 64px;
  right: 64px;
  bottom: 150px;
  display: flex;
  flex-direction: column;
  gap: 26px;
}
.cvr-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 30px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--cv-accent);
}
.cvr-eyebrow-dot {
  width: 12px; height: 12px; border-radius: 50%;
  background: var(--cv-accent);
}
.cvr-headline {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 108px;
  line-height: 0.92;
  letter-spacing: -0.02em;
  color: oklch(0.98 0.005 90);
  max-width: 14ch;
}
.cvr-deck {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 500;
  font-size: 36px;
  line-height: 1.4;
  color: oklch(0.85 0.008 90);
  max-width: 32ch;
  /* Cap so a long deck never collides with the masthead. */
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cvr-vs {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 30px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: oklch(0.78 0.010 90);
}
.cvr-vs-x { color: var(--cv-accent); font-weight: 900; }

/* ── Footer ────────────────────────────────────────────────── */
.cvr-foot {
  position: absolute;
  z-index: 3;
  bottom: 56px;
  left: 64px;
  right: 64px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding-top: 24px;
  border-top: 1px solid oklch(0.20 0.015 90);
}
.cvr-foot-brand {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 26px;
  letter-spacing: 0.04em;
}
.cvr-foot-url {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 22px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--cv-accent);
}
</style>

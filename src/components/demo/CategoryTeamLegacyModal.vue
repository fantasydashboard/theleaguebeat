<template>
  <Teleport to="body">
    <div class="ctl-root" role="presentation">
      <div class="ctl-backdrop" @click="onClose" aria-hidden="true"></div>
      <div
        ref="dialogRef"
        class="ctl-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`ctl-title-${team.id}`"
      >
        <header class="ctl-head">
          <div class="ctl-head-id">
            <div
              class="ctl-avatar"
              :style="{ background: `linear-gradient(135deg, ${team.avatarColor})` }"
            >
              <img v-if="team.avatarUrl" :src="team.avatarUrl" class="ctl-avatar-img" alt="" />
              <span v-else>{{ team.ownerInitials }}</span>
            </div>
            <div class="ctl-head-text">
              <h2 :id="`ctl-title-${team.id}`" class="ctl-title">{{ team.name }}</h2>
              <p class="ctl-sub">
                <span>{{ team.ownerName }}</span>
                <span class="ctl-sub-dot" aria-hidden="true">·</span>
                <span>{{ career.seasonsPlayed }} seasons played</span>
              </p>
            </div>
          </div>
          <button
            ref="closeBtnRef"
            type="button"
            class="ctl-close"
            aria-label="Close team legacy detail"
            @click="onClose"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </header>

        <!-- Hero summary card: legacy + rank + 4 varied stat tiles -->
        <section class="ctl-hero" :aria-label="`Legacy score ${breakdown.total}`">
          <div class="ctl-hero-left">
            <span class="ctl-hero-eyebrow">Legacy Score</span>
            <span class="ctl-hero-value" :style="{ color: teamAccent }">{{ breakdown.total }}</span>
          </div>
          <div class="ctl-hero-right">
            <span class="ctl-hero-rank-label">Rank</span>
            <span class="ctl-hero-rank-num">#{{ breakdown.rank }}</span>
            <span class="ctl-hero-rank-of">of 10</span>
          </div>
        </section>

        <!-- Varied stat strip — wider lead tile + three smaller -->
        <div class="ctl-tiles">
          <div class="ctl-tile ctl-tile-lead">
            <span class="ctl-tile-eyebrow">Titles</span>
            <span class="ctl-tile-value" :style="{ color: career.titles ? 'var(--gold)' : 'var(--ink-2)' }">{{ career.titles }}</span>
            <span class="ctl-tile-trail">in {{ career.seasonsPlayed }} seasons</span>
          </div>
          <div class="ctl-tile">
            <span class="ctl-tile-eyebrow">Playoffs</span>
            <span class="ctl-tile-value">{{ career.playoffApps }}</span>
          </div>
          <div class="ctl-tile">
            <span class="ctl-tile-eyebrow">Matchup wins</span>
            <span class="ctl-tile-value">{{ breakdown.totalMatchupWins.count }}</span>
          </div>
          <div class="ctl-tile">
            <span class="ctl-tile-eyebrow">Cat leaders</span>
            <span class="ctl-tile-value">{{ breakdown.categoryLeaderSeasons.count }}</span>
          </div>
        </div>

        <!-- Breakdown sections -->
        <section class="ctl-cats" aria-labelledby="ctl-breakdown-label">
          <p id="ctl-breakdown-label" class="ctl-eyebrow">Score breakdown</p>

          <article
            v-for="group in groupedCats"
            :key="group.key"
            class="ctl-cat"
            :class="`ctl-cat-${group.key}`"
          >
            <header class="ctl-cat-head">
              <span class="ctl-cat-tick" aria-hidden="true"></span>
              <h3 class="ctl-cat-name">{{ group.label }}</h3>
              <span class="ctl-cat-sub">{{ group.subtotal }} pts</span>
            </header>

            <ul v-if="group.items.length" class="ctl-cat-rows" role="list">
              <li v-for="item in group.items" :key="item.id" class="ctl-cat-row">
                <span class="ctl-cat-row-name">{{ item.name }}</span>
                <span class="ctl-cat-row-mult">×{{ item.count }}</span>
                <span class="ctl-cat-row-points">+{{ item.points }}</span>
              </li>
            </ul>
            <p v-else class="ctl-cat-empty">No qualifying records.</p>
          </article>
        </section>

        <footer class="ctl-foot">
          <button type="button" class="ctl-share" @click="emit('open-signup')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share on a card
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  getTeam,
  teamCareerStats,
  legacyBreakdowns,
} from '@/fixtures/categoriesLeague'
import { accentFor } from '@/utils/teamColor'
import { useDemoModal } from '@/composables/useDemoModal'

const props = defineProps<{ teamId: string }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'open-signup'): void }>()

const team = computed(() => getTeam(props.teamId))
const career = computed(() => teamCareerStats[props.teamId])
const breakdown = computed(() => legacyBreakdowns[props.teamId])
const teamAccent = computed(() => accentFor(team.value))

interface BreakdownItem { id: string; name: string; count: number; points: number }
interface BreakdownGroup { key: 'titles' | 'season' | 'category' | 'longevity'; label: string; subtotal: number; items: BreakdownItem[] }

const ITEM_LABELS: Record<string, string> = {
  championships:             'Championships',
  runnerUps:                 'Runner-up finishes',
  playoffApps:               'Playoff appearances',
  regularSeasonTitles:       'Regular-season titles',
  totalMatchupWins:          'Matchup wins',
  winningSeasons:            'Winning seasons',
  topThreeFinishes:          'Top-3 finishes',
  categoryLeaderSeasons:     'Category leader seasons',
  topThreeCatSeasons:        'Top-3 category seasons',
  bestWeeklyCatPerformances: 'Best weekly cat performances',
  seasonsPlayed:             'Seasons played',
  fiveYearPlayoffStreak:     '5+ year playoff streak',
  threeYearWinningStreak:    '3+ year winning streak',
}

const GROUP_KEYS: Record<BreakdownGroup['key'], string[]> = {
  titles:    ['championships', 'runnerUps', 'playoffApps', 'regularSeasonTitles'],
  season:    ['totalMatchupWins', 'winningSeasons', 'topThreeFinishes'],
  category:  ['categoryLeaderSeasons', 'topThreeCatSeasons', 'bestWeeklyCatPerformances'],
  longevity: ['seasonsPlayed', 'fiveYearPlayoffStreak', 'threeYearWinningStreak'],
}

const GROUP_LABELS: Record<BreakdownGroup['key'], string> = {
  titles:    'Championships & playoffs',
  season:    'Season performance',
  category:  'Category achievements',
  longevity: 'Longevity',
}

const groupedCats = computed<BreakdownGroup[]>(() => {
  const b = breakdown.value as unknown as Record<string, { count: number; points: number }>
  return (Object.keys(GROUP_KEYS) as BreakdownGroup['key'][]).map((k) => {
    const items: BreakdownItem[] = []
    for (const id of GROUP_KEYS[k]) {
      const v = b[id]
      if (v && v.count > 0) {
        items.push({ id, name: ITEM_LABELS[id], count: v.count, points: v.points })
      }
    }
    const subtotal = items.reduce((s, i) => s + i.points, 0)
    return { key: k, label: GROUP_LABELS[k], subtotal, items }
  })
})

/* Focus management + trap */
const dialogRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLElement | null>(null)

function onClose() {
  emit('close')
}

useDemoModal({ dialogRef, closeBtnRef, onClose })
</script>

<style scoped>
.ctl-root {
  position: fixed;
  inset: 0;
  z-index: 220;
  display: grid;
  place-items: center;
  padding: 24px;
  --ink-1: oklch(0.97 0.005 90);
  --ink-2: oklch(0.78 0.008 90);
  --ink-3: oklch(0.55 0.010 90);
  --ink-4: oklch(0.32 0.012 90);
  --ink-5: oklch(0.20 0.015 90);
  --accent-primary:   oklch(0.78 0.18 92);
  --accent-secondary: oklch(0.70 0.27 350);
  --accent-tertiary:  oklch(0.72 0.18 195);
  --accent-up:        oklch(0.74 0.18 145);
  --gold:             oklch(0.84 0.16 90);

  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}
.ctl-backdrop {
  position: absolute; inset: 0;
  background: oklch(0.04 0.014 90 / 0.78);
  opacity: 0;
}
.ctl-dialog {
  position: relative;
  width: 100%;
  max-width: 700px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 18px;
  padding: 24px 28px 22px;
  box-shadow:
    0 28px 72px -28px oklch(0 0 0 / 0.85),
    inset 0 1px 0 oklch(1 0 0 / 0.04);
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}
@media (prefers-reduced-motion: no-preference) {
  .ctl-backdrop { animation: ctl-fade-in 140ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .ctl-dialog {
    animation: ctl-dialog-in 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
    animation-delay: 30ms;
  }
  @keyframes ctl-fade-in { to { opacity: 1; } }
  @keyframes ctl-dialog-in { to { opacity: 1; transform: scale(1) translateY(0); } }
}
@media (prefers-reduced-motion: reduce) {
  .ctl-backdrop, .ctl-dialog { opacity: 1; transform: none; }
}

/* Header */
.ctl-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.ctl-head-id { display: flex; align-items: center; gap: 14px; min-width: 0; }
.ctl-avatar {
  width: 52px; height: 52px; border-radius: 12px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.1rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  box-shadow: 0 8px 24px -10px oklch(0 0 0 / 0.6);
  flex-shrink: 0;
}
.ctl-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ctl-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.5rem; line-height: 1.05;
  letter-spacing: -0.008em; color: var(--ink-1); margin: 0;
}
.ctl-sub {
  margin: 4px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--ink-3);
  display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.ctl-sub-dot { color: var(--ink-5); }
.ctl-close {
  width: 32px; height: 32px; display: grid; place-items: center;
  background: transparent;
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 8px;
  color: var(--ink-2);
  cursor: pointer;
  flex-shrink: 0;
}
.ctl-close:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
.ctl-close:active { transform: scale(0.97); transition-duration: 100ms; }
.ctl-close:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .ctl-close { transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1); }
}

/* Hero */
.ctl-hero {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 18px; flex-wrap: wrap;
  padding: 6px 0 8px;
  border-bottom: 1px solid oklch(0.16 0.015 90);
  margin-bottom: 14px;
}
.ctl-hero-left { display: flex; flex-direction: column; }
.ctl-hero-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ink-3); margin-bottom: 4px;
}
.ctl-hero-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(3.4rem, 10vw, 4.6rem);
  line-height: 0.86;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.ctl-hero-right {
  display: flex; flex-direction: column; align-items: flex-end;
  padding-bottom: 8px;
}
.ctl-hero-rank-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
}
.ctl-hero-rank-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 2rem;
  line-height: 1; color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.ctl-hero-rank-of { font-size: 0.72rem; color: var(--ink-4); letter-spacing: 0.1em; text-transform: uppercase; }

/* Varied stat tiles: lead is wider */
.ctl-tiles {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 22px;
}
.ctl-tile {
  background: oklch(0.12 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
}
.ctl-tile-lead {
  background:
    radial-gradient(ellipse at top right, oklch(0.84 0.16 90 / 0.08), transparent 60%),
    oklch(0.12 0.015 90);
  border-left: 2px solid var(--gold);
}
.ctl-tile-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.64rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 4px;
}
.ctl-tile-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.6rem;
  line-height: 1; color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}
.ctl-tile-lead .ctl-tile-value { font-size: 2rem; }
.ctl-tile-trail {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-4);
  margin-top: 4px;
}
@media (max-width: 560px) {
  .ctl-tiles { grid-template-columns: 1fr 1fr; }
}

/* Categories */
.ctl-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3); margin: 0 0 10px;
}
.ctl-cats { display: flex; flex-direction: column; gap: 10px; }
.ctl-cat {
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 12px;
  padding: 12px 14px 10px;
  background: oklch(0.12 0.015 90);
}
.ctl-cat-head {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 8px;
}
.ctl-cat-tick {
  width: 3px; height: 16px; border-radius: 2px;
  background: var(--ink-3);
}
.ctl-cat-titles    .ctl-cat-tick { background: var(--gold); }
.ctl-cat-season    .ctl-cat-tick { background: var(--accent-tertiary); }
.ctl-cat-category  .ctl-cat-tick { background: var(--accent-up); }
.ctl-cat-longevity .ctl-cat-tick { background: var(--ink-3); }
.ctl-cat-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800; font-size: 0.92rem;
  letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--ink-1); margin: 0;
}
.ctl-cat-sub {
  margin-left: auto;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.92rem;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--ink-1);
}
.ctl-cat-titles    .ctl-cat-sub { color: var(--gold); }
.ctl-cat-season    .ctl-cat-sub { color: var(--accent-tertiary); }
.ctl-cat-category  .ctl-cat-sub { color: var(--accent-up); }
.ctl-cat-rows { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.ctl-cat-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px 56px;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px dashed oklch(0.16 0.015 90);
}
.ctl-cat-row:last-child { border-bottom: none; }
.ctl-cat-row-name { font-size: 0.88rem; color: var(--ink-2); }
.ctl-cat-row-mult {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem; color: var(--ink-3);
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.ctl-cat-row-points {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.96rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.ctl-cat-empty {
  margin: 4px 0 0;
  font-size: 0.84rem; color: var(--ink-4);
  font-style: italic;
}

/* Footer */
.ctl-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid oklch(0.16 0.015 90);
}
.ctl-share {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800; font-size: 0.82rem;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-2);
  background: transparent;
  border: 1px solid oklch(0.28 0.015 90);
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
}
.ctl-share:hover { color: var(--ink-1); border-color: oklch(0.44 0.015 90); }
.ctl-share:active { transform: scale(0.97); transition-duration: 100ms; }
.ctl-share:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .ctl-share { transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1); }
}

@media (max-width: 560px) {
  .ctl-dialog { padding: 20px 18px 18px; }
  .ctl-hero-value { font-size: 3rem; }
}
</style>

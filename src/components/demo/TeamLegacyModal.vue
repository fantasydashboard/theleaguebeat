<template>
  <Teleport to="body">
    <div class="tl-root" role="presentation">
      <div class="tl-backdrop" @click="onClose" aria-hidden="true"></div>
      <div
        ref="dialogRef"
        class="tl-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`tl-title-${team.id}`"
      >
        <header class="tl-head">
          <div class="tl-head-id">
            <div
              class="tl-avatar"
              :style="{ background: `linear-gradient(135deg, ${team.avatarColor})` }"
            >
              <img v-if="team.avatarUrl" :src="team.avatarUrl" class="tl-avatar-img" alt="" />
              <span v-else>{{ team.ownerInitials }}</span>
            </div>
            <div class="tl-head-text">
              <h2 :id="`tl-title-${team.id}`" class="tl-title">{{ team.name }}</h2>
              <p class="tl-sub">
                <span class="tl-sub-owner">{{ team.ownerName }}</span>
                <span class="tl-sub-dot" aria-hidden="true">·</span>
                <span>{{ career.seasonsPlayed }} seasons played</span>
              </p>
            </div>
          </div>
          <button
            ref="closeBtnRef"
            type="button"
            class="tl-close"
            aria-label="Close team legacy detail"
            @click="onClose"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </header>

        <!-- HERO: massive total score + rank chip -->
        <section class="tl-hero" :aria-label="`Legacy score ${score.totalScore}`">
          <div class="tl-hero-left">
            <span class="tl-hero-eyebrow">Legacy Score</span>
            <span class="tl-hero-value" :style="{ color: teamAccent }">{{ score.totalScore }}</span>
          </div>
          <div class="tl-hero-right">
            <span class="tl-hero-rank-label">Rank</span>
            <span class="tl-hero-rank-num">#{{ score.rank }}</span>
            <span class="tl-hero-rank-of">of 10</span>
          </div>
        </section>

        <!-- Inline quick stats (NOT a 4-tile grid) -->
        <p class="tl-quick">
          <span class="tl-quick-item">Titles <strong>{{ career.championships }}</strong></span>
          <span class="tl-quick-dot" aria-hidden="true">·</span>
          <span class="tl-quick-item">Playoffs <strong>{{ career.playoffAppearances }}</strong></span>
          <span class="tl-quick-dot" aria-hidden="true">·</span>
          <span class="tl-quick-item">Wins <strong>{{ career.totalWins }}</strong></span>
          <span class="tl-quick-dot" aria-hidden="true">·</span>
          <span class="tl-quick-item">Highs <strong>{{ highScoresCount }}</strong></span>
        </p>

        <!-- Breakdown by category -->
        <section class="tl-cats" aria-labelledby="tl-breakdown-label">
          <p id="tl-breakdown-label" class="tl-eyebrow">Score breakdown</p>

          <article
            v-for="cat in groupedCats"
            :key="cat.key"
            class="tl-cat"
            :class="`tl-cat-${cat.key}`"
          >
            <header class="tl-cat-head">
              <span class="tl-cat-tick" aria-hidden="true"></span>
              <h3 class="tl-cat-name">{{ cat.label }}</h3>
              <span class="tl-cat-sub">{{ cat.subtotal }} pts</span>
            </header>

            <ul v-if="cat.items.length" class="tl-cat-rows" role="list">
              <li v-for="item in cat.items" :key="item.id" class="tl-cat-row">
                <span class="tl-cat-row-name">{{ item.name }}</span>
                <span class="tl-cat-row-mult">×{{ item.count }}</span>
                <span class="tl-cat-row-points">+{{ item.points }}</span>
              </li>
            </ul>
            <p v-else class="tl-cat-empty">No qualifying records.</p>
          </article>
        </section>

        <footer class="tl-foot">
          <button type="button" class="tl-share" @click="emit('open-signup')">
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
  legacyScores,
  teamCareerStats,
} from '@/fixtures/pillarsLeague'
import { accentFor } from '@/utils/teamColor'

const props = defineProps<{ teamId: string }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'open-signup'): void }>()

const team = computed(() => getTeam(props.teamId))
const score = computed(() => legacyScores.find(l => l.teamId === props.teamId)!)
const career = computed(() => teamCareerStats[props.teamId])
const highScoresCount = computed(() => score.value.breakdown.weeklyHighScores?.count ?? 0)

const teamAccent = computed(() => accentFor(team.value))

interface CatItem { id: string; name: string; count: number; points: number }
interface Cat { key: 'titles' | 'season' | 'scoring' | 'longevity'; label: string; subtotal: number; items: CatItem[] }

const ITEM_LABELS: Record<string, string> = {
  championships:        'Championships',
  runnerUps:            'Runner-up finishes',
  thirdPlace:           '3rd-place finishes',
  playoffApps:          'Playoff appearances',
  regularSeasonTitles:  'Regular-season titles',
  totalWins:            'Total wins',
  winningSeasons:       'Winning seasons',
  top3Finishes:         'Top-3 finishes',
  pointsLeaderSeasons:  'Points-leader seasons',
  top3ScoringSeasons:   'Top-3 scoring seasons',
  aboveAvgPPWSeasons:   'Above-average PPW seasons',
  weeklyHighScores:     'Weekly high scores',
  seasonsPlayed:        'Seasons played',
  playoffStreaks:       '3+ year playoff streak',
  winningStreaks:       '3+ year winning streak',
}

const CAT_KEYS: Record<Cat['key'], string[]> = {
  titles:    ['championships', 'runnerUps', 'thirdPlace', 'playoffApps', 'regularSeasonTitles'],
  season:    ['totalWins', 'winningSeasons', 'top3Finishes'],
  scoring:   ['pointsLeaderSeasons', 'top3ScoringSeasons', 'aboveAvgPPWSeasons', 'weeklyHighScores'],
  longevity: ['seasonsPlayed', 'playoffStreaks', 'winningStreaks'],
}

const CAT_LABELS: Record<Cat['key'], string> = {
  titles:    'Championships & playoffs',
  season:    'Season performance',
  scoring:   'Scoring achievements',
  longevity: 'Longevity',
}

const groupedCats = computed<Cat[]>(() => {
  const b = score.value.breakdown as Record<string, { count: number; points: number } | undefined>
  return (Object.keys(CAT_KEYS) as Cat['key'][]).map(k => {
    const items: CatItem[] = []
    for (const id of CAT_KEYS[k]) {
      const v = b[id]
      if (v && v.count > 0) {
        items.push({ id, name: ITEM_LABELS[id], count: v.count, points: v.points })
      }
    }
    const subtotal = items.reduce((s, i) => s + i.points, 0)
    return { key: k, label: CAT_LABELS[k], subtotal, items }
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
.tl-root {
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
  --ink-6: oklch(0.14 0.018 90);
  --ink-7: oklch(0.10 0.015 90);
  --accent-primary:   oklch(0.78 0.18 92);
  --accent-secondary: oklch(0.70 0.27 350);
  --accent-tertiary:  oklch(0.72 0.18 195);
  --accent-up:        oklch(0.74 0.18 145);
  --gold:             oklch(0.84 0.16 90);

  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}
.tl-backdrop {
  position: absolute;
  inset: 0;
  background: oklch(0.04 0.014 90 / 0.78);
  opacity: 0;
}
.tl-dialog {
  position: relative;
  width: 100%;
  max-width: 680px;
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
  .tl-backdrop { animation: tl-fade-in 140ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .tl-dialog {
    animation: tl-dialog-in 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
    animation-delay: 30ms;
  }
  @keyframes tl-fade-in { to { opacity: 1; } }
  @keyframes tl-dialog-in { to { opacity: 1; transform: scale(1) translateY(0); } }
}
@media (prefers-reduced-motion: reduce) {
  .tl-backdrop, .tl-dialog { opacity: 1; transform: none; }
}

/* Header */
.tl-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.tl-head-id { display: flex; align-items: center; gap: 14px; min-width: 0; }
.tl-avatar {
  width: 52px; height: 52px; border-radius: 12px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.1rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  box-shadow: 0 8px 24px -10px oklch(0 0 0 / 0.6);
}
.tl-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tl-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.5rem; line-height: 1.05;
  letter-spacing: -0.008em; color: var(--ink-1); margin: 0;
}
.tl-sub {
  margin: 4px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--ink-3);
  display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.tl-sub-dot { color: var(--ink-5); }
.tl-close {
  width: 32px; height: 32px; display: grid; place-items: center;
  background: transparent;
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 8px;
  color: var(--ink-2);
  cursor: pointer;
}
.tl-close:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
.tl-close:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.tl-close:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .tl-close { transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1); }
}

/* Hero */
.tl-hero {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 18px; flex-wrap: wrap;
  padding: 6px 0 4px;
  border-bottom: 1px solid oklch(0.16 0.015 90);
  margin-bottom: 14px;
}
.tl-hero-left { display: flex; flex-direction: column; }
.tl-hero-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ink-3); margin-bottom: 4px;
}
.tl-hero-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(3.6rem, 11vw, 5rem);
  line-height: 0.86;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.tl-hero-right {
  display: flex; flex-direction: column; align-items: flex-end;
  padding-bottom: 8px;
}
.tl-hero-rank-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
}
.tl-hero-rank-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 2rem;
  line-height: 1; color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.tl-hero-rank-of { font-size: 0.72rem; color: var(--ink-4); letter-spacing: 0.1em; text-transform: uppercase; }

/* Quick inline */
.tl-quick {
  margin: 0 0 22px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.95rem; font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink-3);
  display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.tl-quick-item strong { color: var(--ink-1); font-weight: 900; font-variant-numeric: tabular-nums; margin-left: 4px; }
.tl-quick-dot { color: var(--ink-5); }

/* Categories */
.tl-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3); margin: 0 0 10px;
}
.tl-cats { display: flex; flex-direction: column; gap: 12px; }
.tl-cat {
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 12px;
  padding: 12px 14px 10px;
  background: oklch(0.12 0.015 90);
}
.tl-cat-head {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 8px;
}
.tl-cat-tick {
  width: 3px; height: 16px; border-radius: 2px;
  background: var(--ink-3);
}
.tl-cat-titles .tl-cat-tick    { background: var(--gold); }
.tl-cat-season .tl-cat-tick    { background: var(--accent-tertiary); }
.tl-cat-scoring .tl-cat-tick   { background: var(--accent-secondary); }
.tl-cat-longevity .tl-cat-tick { background: var(--ink-3); }
.tl-cat-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800; font-size: 0.92rem;
  letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--ink-1); margin: 0;
}
.tl-cat-sub {
  margin-left: auto;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.92rem;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--ink-1);
}
.tl-cat-titles    .tl-cat-sub { color: var(--gold); }
.tl-cat-season    .tl-cat-sub { color: var(--accent-tertiary); }
.tl-cat-scoring   .tl-cat-sub { color: var(--accent-secondary); }
.tl-cat-rows { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.tl-cat-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 36px 56px;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px dashed oklch(0.16 0.015 90);
}
.tl-cat-row:last-child { border-bottom: none; }
.tl-cat-row-name { font-size: 0.88rem; color: var(--ink-2); }
.tl-cat-row-mult {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem; color: var(--ink-3);
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.tl-cat-row-points {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.96rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.tl-cat-empty {
  margin: 4px 0 0;
  font-size: 0.84rem; color: var(--ink-4);
  font-style: italic;
}

/* Footer */
.tl-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid oklch(0.16 0.015 90);
}
.tl-share {
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
.tl-share:hover { color: var(--ink-1); border-color: oklch(0.44 0.015 90); }
.tl-share:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.tl-share:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .tl-share { transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1); }
}

@media (max-width: 560px) {
  .tl-dialog { padding: 20px 18px 18px; }
  .tl-hero-value { font-size: 3rem; }
}
</style>

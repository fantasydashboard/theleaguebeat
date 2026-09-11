<template>
  <main class="scp">
    <header class="scp-head">
      <h1>Share card preview</h1>
      <p>
        The 1080×1350 image the Issue's <strong>↓ Image</strong> button produces,
        shown at half size. Row density changes with how many rows a section has,
        so check the boundaries — 6, 7, 11, 12 — not just a typical board.
      </p>
      <label>
        Rows
        <input v-model.number="count" type="range" min="1" max="18" />
        <b>{{ count }}</b>
        <span class="scp-density">{{ Math.min(count, MAX_ROWS) }} shown</span>
      </label>
      <label>
        <input v-model="asCards" type="checkbox" />
        render from <code>cards</code> rather than <code>rows</code>
      </label>
      <label>
        <input v-model="recordMode" type="checkbox" />
        record book (4 rows, long detail)
      </label>
      <p v-if="!isShareable(section)" class="scp-warn">
        Not shareable at this size — the Issue would not offer a button.
      </p>
    </header>

    <div class="scp-stage">
      <ShareCard :section="section" league-name="League of Record" />
    </div>
  </main>
</template>

<script setup lang="ts">
/**
 * A place to look at the share card without a signed-in league.
 *
 * The card renders off-screen during a real capture, which makes it the
 * one piece of the Issue nobody can see while building it — and the
 * failure mode is silent: a card that lays out wrong still exports, it
 * just exports wrong. This route pulls the same component on-screen with
 * a row count you can drag through the density boundaries.
 *
 * Internal, like the logo mockups beside it.
 */
import { computed, ref } from 'vue'
import ShareCard from '@/components/issue/ShareCard.vue'
import { isShareable, MAX_ROWS } from '@/editorial/share/shareCard'
import type { IssueSection } from '@/editorial/issue/types'

const count = ref(10)
const asCards = ref(true)
const recordMode = ref(false)

const TEAMS = [
  'The Aman-Ra Stars', 'Mighty Mallards', 'Scuttlebucs', 'Gridiron Man',
  'Chancla Warriors', 'The Juggernauts', 'Pigskin Prophtz', 'OverDrive',
  'East Coast Enforcers', 'Game of Throws', 'Primetime Primates',
  'Aggresive Chickens', 'StreetGliders', 'HawkForceOne', 'Dom perignons',
  'The Jabariz', 'Black Panther', 'UCDUST',
]

const section = computed<IssueSection>(() => {
  const n = count.value
  const head = {
    id: 'power-rankings',
    eyebrow: 'Power rankings',
    headline: 'Five teams have a case. Then it drops.',
  }
  if (recordMode.value) {
    return {
      id: 'record-book',
      eyebrow: 'The record book',
      headline: 'Swamp Pirates hold the league record. Not by much.',
      rows: [
        { label: 'Swamp Pirates', value: '64 wins', sub: 'Most in league history — 1 win clear of Howling Commandos.', logoColor: '#2b6cb0, #1a365d', logoInitials: 'SP' },
        { label: 'Gotham City Rogues', value: '12,000 pts', sub: '85 away, about 1 week at their pace. 3rd-highest scorer all time.', logoColor: '#2b6cb0, #1a365d', logoInitials: 'GC' },
        { label: 'Knights of the Round', value: '10,000 pts', sub: '207 away, about 2 weeks at their pace. 6th-highest scorer all time.', logoColor: '#2b6cb0, #1a365d', logoInitials: 'KR' },
        { label: 'WillXposU', value: '50 wins', sub: '3 away — reachable this season. 4th-most wins all time.', logoColor: '#2b6cb0, #1a365d', logoInitials: 'WX' },
      ],
    } as IssueSection
  }
  if (asCards.value) {
    return {
      ...head,
      cards: Array.from({ length: n }, (_, i) => ({
        teamId: `t${i}`,
        rank: i + 1,
        fieldSize: n,
        teamName: TEAMS[i % TEAMS.length],
        statValue: (105.5 - i * 1.1).toFixed(1),
        statLabel: 'pts / week',
        notes: [['Thinnest at receiver', 'Best backfield in the league',
          'Rode a soft schedule', 'Outscored by 155 and survived'][i % 4]],
        logoColor: '#2b6cb0, #1a365d',
        logoInitials: TEAMS[i % TEAMS.length].slice(0, 2).toUpperCase(),
      })),
    } as IssueSection
  }
  return {
    ...head,
    rows: Array.from({ length: n }, (_, i) => ({
      lead: String(i + 1),
      label: TEAMS[i % TEAMS.length],
      sub: 'Added Thursday · $47',
      value: (105.5 - i * 1.1).toFixed(1),
      logoColor: '#2b6cb0, #1a365d',
      logoInitials: TEAMS[i % TEAMS.length].slice(0, 2).toUpperCase(),
    })),
  } as IssueSection
})
</script>

<style scoped>
.scp { padding: 28px; color: oklch(0.94 0.01 90); background: oklch(0.1 0.01 90); min-height: 100vh; }
.scp-head { max-width: 620px; margin-bottom: 22px; }
.scp-head h1 { font-family: 'Barlow Condensed', sans-serif; font-size: 2rem; margin: 0 0 8px; }
.scp-head p { color: oklch(0.7 0.01 90); line-height: 1.5; margin: 0 0 14px; }
.scp-head label { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.scp-density { color: oklch(0.83 0.16 85); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.12em; }
.scp-warn { color: oklch(0.78 0.16 30); }

/* The component parks itself off-screen for capture; drag it back and
   halve it so the whole 1350 fits on a laptop. */
.scp-stage :deep(.share-stage) {
  position: static;
  left: auto;
  transform: scale(0.5);
  transform-origin: top left;
  width: 540px;
  height: 675px;
  z-index: auto;
}
</style>

<template>
  <!-- Rendered off-screen at true size and captured. Not `display:none`
       and not `visibility:hidden` — both give html-to-image an element
       with no layout, and the capture comes back blank. -->
  <div class="share-stage" aria-hidden="true">
    <div ref="frame" class="share-card" :style="fitVars">
      <header class="sc-head">
        <p class="sc-league">{{ leagueName }}</p>
        <h2 class="sc-headline">{{ section.headline }}</h2>
        <p v-if="label" class="sc-eyebrow">{{ label }}</p>
      </header>

      <ol class="sc-rows" role="list">
        <li v-for="(row, i) in rows" :key="`${row.label}-${i}`" class="sc-row">
          <span v-if="row.lead" class="sc-lead">{{ row.lead }}</span>
          <span
            class="sc-mark"
            :style="{ background: row.logoColor ? `linear-gradient(135deg, ${row.logoColor})` : undefined }"
          >
            <img v-if="row.logoUrl" :src="proxied(row.logoUrl)" alt="" crossorigin="anonymous" />
            <span v-else>{{ row.logoInitials }}</span>
          </span>
          <span class="sc-copy">
            <span class="sc-name">{{ row.label }}</span>
            <span v-if="row.sub" class="sc-sub">{{ row.sub }}</span>
          </span>
          <span v-if="row.value" class="sc-value">{{ row.value }}</span>
        </li>
      </ol>

      <footer class="sc-foot">
        <img class="sc-logo" src="/tlb-logo-primary.png" alt="The League Beat" />
        <span class="sc-url">theleaguebeat.com</span>
      </footer>
      <p v-if="omitted" class="sc-omitted">+{{ omitted }} more on the site</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The image itself. One section, 1080x1350, self-contained.
 *
 * Deliberately NOT the issue's own section markup. That layout answers
 * to a scrolling page with a masthead above it and the rest of the
 * issue below; this one has to stand alone in a group chat next to
 * somebody's photo of a sandwich, at whatever size the app decides to
 * preview it. Different job, different type scale, different density
 * rules — sharing a stylesheet between them would mean every change to
 * the page silently reshapes the thing people forward.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { IssueSection } from '@/editorial/issue/types'
import { proxied } from '@/editorial/present/exportSlides'
import {
  shareRows,
  omittedCount,
  shareLabelFor,
  CARD_H,
  PAD_Y,
  rowScale,
} from '@/editorial/share/shareCard'

const props = defineProps<{ section: IssueSection; leagueName: string }>()

const frame = ref<HTMLElement>()
const rows = computed(() => shareRows(props.section))
const omitted = computed(() => omittedCount(props.section))
const label = computed(() => shareLabelFor(props.section))
const fitVars = ref<Record<string, string>>({})

/**
 * Size the rows to the space that is actually left.
 *
 * Fixed density buckets were the first attempt and they overflowed: the
 * headline is real editorial copy, so it wraps to one line or three
 * depending on the week, and the leftover height is not knowable in a
 * stylesheet. Measuring the header and footer that DID render and
 * dividing what remains is the only version that cannot spill — and a
 * card that spills still exports, silently, which is the failure worth
 * engineering against.
 */
async function fit() {
  await nextTick()
  const card = frame.value
  if (!card || !rows.value.length) return
  const head = card.querySelector('.sc-head') as HTMLElement | null
  const foot = card.querySelector('.sc-foot') as HTMLElement | null
  if (!head || !foot) return
  const available = CARD_H - PAD_Y - head.offsetHeight - foot.offsetHeight
  fitVars.value = rowScale(available, rows.value.length)
}

onMounted(fit)
watch(() => [props.section, props.leagueName], fit, { deep: true })
// The headline's own wrap changes the header height once fonts land.
if (typeof document !== 'undefined' && document.fonts?.ready) {
  document.fonts.ready.then(fit)
}

defineExpose({ frame, fit })
</script>

<style scoped>
/* Off-screen rather than hidden: it must still lay out to be captured. */
.share-stage {
  position: fixed;
  left: -20000px;
  top: 0;
  pointer-events: none;
  z-index: -1;
}

.share-card {
  width: 1080px;
  height: 1350px;
  box-sizing: border-box;
  padding: 64px 64px 54px;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(120% 90% at 12% 0%, oklch(0.19 0.03 30) 0%, transparent 55%),
    oklch(0.07 0.012 90);
  color: oklch(0.97 0.01 90);
  font-family: 'Inter', system-ui, sans-serif;
  position: relative;
  overflow: hidden;
}

.sc-head { flex: none; margin-bottom: 34px; }
.sc-league {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 27px; font-weight: 800; letter-spacing: 0.2em;
  text-transform: uppercase; color: oklch(0.70 0.27 350); margin: 0 0 14px;
}
.sc-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 70px; font-weight: 900; line-height: 0.94;
  letter-spacing: -0.025em; margin: 0;
  /* Bounded, so the header cannot eat the list. Headlines are editorial
     copy of unknown length; without this a long one pushes twelve rows
     below the footer and the card exports wrong without complaining. */
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}
.sc-eyebrow {
  font-size: 26px; color: oklch(0.62 0.01 90); margin: 14px 0 0;
}

/* The list owns whatever is left between header and footer. */
.sc-rows {
  flex: 1; min-height: 0; list-style: none; margin: 0; padding: 0;
  /* Centred, not top-aligned. Rows are capped at MAX_ROW so a three-row
     trade cannot fill the card; left at flex-start it clung to the
     headline with 300px of nothing beneath it. */
  display: flex; flex-direction: column; justify-content: center;
}
/* Every size below derives from --row-h, which is measured, not chosen. */
.sc-row {
  display: flex; align-items: center;
  gap: var(--gap, 22px);
  height: var(--row-h, 96px);
  border-bottom: 1px solid oklch(0.20 0.015 90);
}
.sc-row:last-child { border-bottom: none; }

.sc-lead {
  flex: none; text-align: right;
  width: var(--lead-w, 54px); font-size: var(--lead, 42px);
  font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
  color: oklch(0.83 0.16 85); font-variant-numeric: tabular-nums;
}
.sc-mark {
  flex: none; border-radius: 14px; overflow: hidden;
  width: var(--mark, 68px); height: var(--mark, 68px);
  font-size: calc(var(--mark, 68px) * 0.34);
  background: oklch(0.22 0.02 90);
  display: grid; place-items: center; font-weight: 800;
}
.sc-mark img { width: 100%; height: 100%; object-fit: cover; }
.sc-copy { flex: 1; min-width: 0; }
.sc-name {
  display: block; font-weight: 800; letter-spacing: -0.01em;
  font-size: var(--name, 35px);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
/* Dropped rather than shrunk once rows get tight: a four-team name at
   full size beats a name and an unreadable note. */
.sc-sub {
  display: var(--sub-display, block); color: oklch(0.62 0.01 90); margin-top: 4px;
  font-size: var(--sub, 23px);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sc-value {
  flex: none; font-weight: 800; font-variant-numeric: tabular-nums;
  font-size: var(--value, 34px);
}

.sc-foot {
  flex: none; display: flex; align-items: center; gap: 18px;
  padding-top: 26px; border-top: 2px solid oklch(0.22 0.015 90);
}
.sc-logo {
  /* Height-locked, width auto — the lockup is 2.64:1 and squashing a
     wordmark is worse than not using one. */
  height: 92px; width: auto; display: block;
}
/* The whole distribution loop is this line. Somebody's league mate
   sees eleven teams ranked and a place to go. */
.sc-url {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
  font-size: 28px; letter-spacing: 0.1em; text-transform: uppercase;
  color: oklch(0.83 0.16 85); margin-left: auto;
}
.sc-omitted {
  position: absolute; right: 64px; bottom: 104px;
  font-size: 22px; color: oklch(0.55 0.01 90); margin: 0;
}
</style>

<template>
  <section
    v-for="sec in sections"
    :key="sec.id"
    :id="`issue-${sec.id}`"
    class="pub-sec"
  >
    <div class="pub-top">
      <!-- Identity marks, deliberately a fraction of cover size. A page
           where every section shouts at cover volume has no hierarchy. -->
      <div v-if="sec.visual?.logos.length" class="pub-art">
        <span
          v-for="(l, i) in sec.visual.logos"
          :key="l.teamId"
          class="pub-logo"
          :class="{ 'is-second': i > 0 }"
          :style="{ background: l.color ? `linear-gradient(135deg, ${l.color})` : undefined }"
        >
          <img v-if="l.url" :src="l.url" alt="" />
          <span v-else>{{ l.initials }}</span>
        </span>
      </div>
      <header class="pub-copy">
        <p class="pub-eyebrow">{{ sec.eyebrow }}</p>
        <h2 class="pub-headline">{{ sec.headline }}</h2>
        <p v-if="sec.support" class="pub-lede">{{ sec.support }}</p>
      </header>
    </div>

    <ul v-if="sec.chips?.length" class="pub-chips" role="list">
      <li v-for="c in sec.chips" :key="c.label">
        <span class="pub-chip-num">{{ c.value }}</span>
        <span class="pub-chip-label">{{ c.label }}</span>
      </li>
    </ul>

    <ol v-if="sec.cards?.length" class="pub-cards" role="list">
      <li v-for="card in sec.cards" :key="card.teamId">
        <span class="pub-rank">{{ card.rank }}</span>
        <span
          class="pub-av"
          :style="{ background: card.logoColor ? `linear-gradient(135deg, ${card.logoColor})` : undefined }"
        >
          <img v-if="card.logoUrl" :src="card.logoUrl" alt="" />
          <span v-else>{{ card.logoInitials }}</span>
        </span>
        <span class="pub-name">
          {{ card.teamName }}
          <small v-if="card.notes?.length">{{ card.notes[0] }}</small>
        </span>
        <span class="pub-stat">{{ card.statValue }}</span>
      </li>
    </ol>

    <ol v-else-if="sec.rows?.length" class="pub-rows" role="list">
      <li v-for="(row, i) in sec.rows" :key="`${row.label}-${i}`">
        <span v-if="row.lead" class="pub-lead">{{ row.lead }}</span>
        <span
          v-if="row.logoUrl || row.logoColor"
          class="pub-av"
          :style="{ background: row.logoColor ? `linear-gradient(135deg, ${row.logoColor})` : undefined }"
        >
          <img v-if="row.logoUrl" :src="row.logoUrl" alt="" />
          <span v-else>{{ row.logoInitials }}</span>
        </span>
        <span class="pub-name">
          {{ row.label }}
          <small v-if="row.sub">{{ row.sub }}</small>
        </span>
        <span v-if="row.value" class="pub-stat">{{ row.value }}</span>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
/**
 * The assembled issue, rendered read-only.
 *
 * Deliberately NOT the same component the league page uses. That one
 * carries Present buttons and UFD hand-offs, both of which are wrong
 * in front of an audience: the hand-offs say "your league" and "your
 * lineup" to a page the whole league is reading, and UFD's own
 * position is that its tools are your edge rather than a league-wide
 * one. Present buttons need a session that a visitor does not have.
 *
 * Keeping this a separate, simpler component makes that structural
 * rather than a flag somebody has to remember to set.
 */
import type { IssueSection } from '@/editorial/issue/types'

defineProps<{ sections: IssueSection[] }>()
</script>

<style scoped>
.pub-sec {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 26px 0;
  border-top: 1px solid oklch(0.18 0.015 90);
}
.pub-top { display: flex; align-items: flex-start; gap: 16px; }
.pub-art { display: flex; flex: none; }
.pub-logo {
  width: 54px; height: 54px; border-radius: 13px; overflow: hidden;
  display: grid; place-items: center; font-weight: 800;
  background: oklch(0.22 0.02 90);
}
.pub-logo.is-second { margin-left: -14px; }
.pub-logo img { width: 100%; height: 100%; object-fit: cover; }
.pub-copy { min-width: 0; }
.pub-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 800; letter-spacing: 0.18em;
  text-transform: uppercase; color: oklch(0.70 0.27 350); margin: 0 0 8px;
}
.pub-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: clamp(1.6rem, 3.2vw, 2.2rem);
  line-height: 1; letter-spacing: -0.008em; margin: 0 0 8px;
}
.pub-lede {
  font-size: 1.02rem; line-height: 1.55; margin: 0;
  color: oklch(0.78 0.01 90); max-width: 60ch; font-weight: 500;
}
.pub-chips { list-style: none; margin: 0; padding: 0; display: flex; gap: 28px; flex-wrap: wrap; }
.pub-chip-num { display: block; font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.7rem; }
.pub-chip-label {
  display: block; font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.64rem; font-weight: 700; letter-spacing: 0.16em;
  text-transform: uppercase; color: oklch(0.60 0.01 90); margin-top: 2px;
}
.pub-cards, .pub-rows {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 8px;
}
.pub-cards li, .pub-rows li {
  display: flex; align-items: center; gap: 14px;
  padding: 11px 15px; border-radius: 12px;
  background: oklch(0.09 0.012 90); border: 1px solid oklch(0.18 0.015 90);
}
.pub-rank, .pub-lead {
  flex: none; min-width: 22px; font-variant-numeric: tabular-nums;
  font-weight: 800; color: oklch(0.62 0.01 90);
}
.pub-av {
  width: 34px; height: 34px; border-radius: 9px; flex: none;
  overflow: hidden; display: grid; place-items: center;
  font-size: 0.7rem; font-weight: 800; background: oklch(0.22 0.02 90);
}
.pub-av img { width: 100%; height: 100%; object-fit: cover; }
.pub-name { flex: 1; min-width: 0; font-weight: 700; }
.pub-name small {
  display: block; font-weight: 400; font-size: 0.78rem;
  color: oklch(0.60 0.01 90); margin-top: 2px;
}
.pub-stat { flex: none; font-weight: 800; font-size: 1.02rem; }
</style>

<script setup lang="ts">
/**
 * The Monday desk, rendered.
 *
 * Lives ONLY on the authenticated issue page — never present mode,
 * never the public share, never a snapshot. The desk describes a
 * moment; every other surface describes a week.
 */
import type { MondayDesk } from '@/editorial/issue/buildMondayDesk'

defineProps<{ desk: MondayDesk }>()
</script>

<template>
  <section class="desk" aria-label="The Monday desk">
    <header class="desk-head">
      <p class="desk-eyebrow">
        <span class="desk-live" aria-hidden="true"></span>
        The Monday desk
      </p>
      <h2 class="desk-headline">{{ desk.headline }}</h2>
      <p class="desk-support">{{ desk.support }}</p>
    </header>

    <div class="desk-group">
      <p class="desk-group-label">Still alive</p>
      <ul class="desk-rows" role="list">
        <li v-for="r in desk.alive" :key="r.matchupId" class="desk-row">
          <span class="desk-game">
            <span class="desk-side">
              <span
                class="desk-logo"
                :style="{ background: r.left.logoColor ? `linear-gradient(135deg, ${r.left.logoColor})` : undefined }"
              >
                <img v-if="r.left.logoUrl" :src="r.left.logoUrl" class="avatar-image" alt="" />
                <span v-else>{{ r.left.logoInitials }}</span>
              </span>
              <span class="desk-name">
                <b>{{ r.left.name }}</b>
                <i v-if="r.left.rank || r.left.record">
                  <template v-if="r.left.rank">No. {{ r.left.rank }}</template>
                  <template v-if="r.left.rank && r.left.record"> · </template>
                  <template v-if="r.left.record">{{ r.left.record }}</template>
                </i>
              </span>
            </span>
            <span class="desk-line">
              <b :class="{ 'is-lead': r.left.leading }">{{ r.left.points }}</b>
              <span class="desk-dash">–</span>
              <b :class="{ 'is-lead': r.right.leading }">{{ r.right.points }}</b>
            </span>
            <span class="desk-side is-right">
              <span class="desk-name">
                <b>{{ r.right.name }}</b>
                <i v-if="r.right.rank || r.right.record">
                  <template v-if="r.right.rank">No. {{ r.right.rank }}</template>
                  <template v-if="r.right.rank && r.right.record"> · </template>
                  <template v-if="r.right.record">{{ r.right.record }}</template>
                </i>
              </span>
              <span
                class="desk-logo"
                :style="{ background: r.right.logoColor ? `linear-gradient(135deg, ${r.right.logoColor})` : undefined }"
              >
                <img v-if="r.right.logoUrl" :src="r.right.logoUrl" class="avatar-image" alt="" />
                <span v-else>{{ r.right.logoInitials }}</span>
              </span>
            </span>
          </span>
          <span class="desk-story">
            <span v-if="r.watch" class="desk-pill" :class="`is-${r.watch}`">
              {{ r.watch === 'heist' ? 'Heist watch' : 'Upset watch' }}
            </span>
            {{ r.sub }}
          </span>
        </li>
      </ul>
    </div>

    <div v-if="desk.decided.length" class="desk-group">
      <p class="desk-group-label">Done and dusted</p>
      <ul class="desk-rows" role="list">
        <li v-for="r in desk.decided" :key="r.matchupId" class="desk-row is-decided">
          <span class="desk-game">
            <span class="desk-side">
              <span
                class="desk-logo"
                :style="{ background: r.left.logoColor ? `linear-gradient(135deg, ${r.left.logoColor})` : undefined }"
              >
                <img v-if="r.left.logoUrl" :src="r.left.logoUrl" class="avatar-image" alt="" />
                <span v-else>{{ r.left.logoInitials }}</span>
              </span>
              <span class="desk-name">
                <b>{{ r.left.name }}</b>
                <i v-if="r.left.rank || r.left.record">
                  <template v-if="r.left.rank">No. {{ r.left.rank }}</template>
                  <template v-if="r.left.rank && r.left.record"> · </template>
                  <template v-if="r.left.record">{{ r.left.record }}</template>
                </i>
              </span>
            </span>
            <span class="desk-line">
              <b :class="{ 'is-lead': r.left.leading }">{{ r.left.points }}</b>
              <span class="desk-dash">–</span>
              <b :class="{ 'is-lead': r.right.leading }">{{ r.right.points }}</b>
            </span>
            <span class="desk-side is-right">
              <span class="desk-name">
                <b>{{ r.right.name }}</b>
                <i v-if="r.right.rank || r.right.record">
                  <template v-if="r.right.rank">No. {{ r.right.rank }}</template>
                  <template v-if="r.right.rank && r.right.record"> · </template>
                  <template v-if="r.right.record">{{ r.right.record }}</template>
                </i>
              </span>
              <span
                class="desk-logo"
                :style="{ background: r.right.logoColor ? `linear-gradient(135deg, ${r.right.logoColor})` : undefined }"
              >
                <img v-if="r.right.logoUrl" :src="r.right.logoUrl" class="avatar-image" alt="" />
                <span v-else>{{ r.right.logoInitials }}</span>
              </span>
            </span>
          </span>
          <span class="desk-story">
            <span v-if="r.watch" class="desk-pill" :class="`is-${r.watch}`">
              {{ r.watch === 'heist' ? 'Heist' : 'Upset' }}
            </span>
            {{ r.sub }}
          </span>
        </li>
      </ul>
    </div>

    <p class="desk-note">Live numbers. They move until the last whistle; the write-up lands with the next issue.</p>
  </section>
</template>

<style scoped>
.desk {
  margin: 2rem 0 2.5rem;
  padding: 1.5rem 1.5rem 1.1rem;
  border: 1px solid oklch(0.32 0.02 90);
  border-radius: 16px;
  background:
    radial-gradient(120% 80% at 50% 0%, oklch(0.18 0.035 92 / 0.45), transparent 65%),
    oklch(0.12 0.014 90);
}
.desk-eyebrow {
  display: flex; align-items: center; gap: 0.5rem;
  font-family: 'Barlow Condensed', sans-serif; font-weight: 800;
  font-size: 0.85rem; letter-spacing: 0.22em; text-transform: uppercase;
  color: oklch(0.70 0.27 350); margin: 0 0 0.4rem;
}
.desk-live {
  width: 9px; height: 9px; border-radius: 50%;
  background: oklch(0.70 0.27 350);
  animation: desk-pulse 1.6s ease-in-out infinite;
}
@keyframes desk-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
.desk-headline {
  margin: 0; font-weight: 900; font-size: 1.7rem; letter-spacing: -0.02em;
  color: oklch(0.97 0.005 90);
}
.desk-support { margin: 0.35rem 0 0; color: oklch(0.62 0.01 90); font-size: 1rem; }

.desk-group { margin-top: 1.25rem; }
.desk-group-label {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 800;
  font-size: 0.8rem; letter-spacing: 0.2em; text-transform: uppercase;
  color: oklch(0.85 0.17 92); margin: 0 0 0.6rem;
  display: flex; align-items: center; gap: 0.75rem;
}
.desk-group-label::after { content: ''; flex: 1; height: 1px; background: oklch(0.26 0.02 90); }

.desk-rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.desk-row {
  display: flex; flex-direction: column; gap: 0.4rem;
  background: oklch(0.15 0.012 90); border-radius: 12px; padding: 0.7rem 0.9rem;
}
.desk-row.is-decided { opacity: 0.78; }

/* The scoreline: crest, name and record on each side, scores in the
   middle. Leader on the left, so the crests and the numbers always
   describe the same team in the same order. */
.desk-game { display: flex; align-items: center; gap: 0.75rem; }
.desk-side { display: flex; align-items: center; gap: 0.6rem; flex: 1; min-width: 0; }
.desk-side.is-right { flex-direction: row-reverse; text-align: right; }
.desk-logo {
  width: 38px; height: 38px; border-radius: 10px; flex: none; overflow: hidden;
  display: grid; place-items: center; background: oklch(0.24 0.02 90);
  font-weight: 800; font-size: 0.75rem; color: oklch(0.62 0.01 90);
}
.desk-logo .avatar-image { width: 100%; height: 100%; object-fit: cover; }
.desk-name { min-width: 0; display: flex; flex-direction: column; line-height: 1.15; }
.desk-name b {
  font-weight: 800; font-size: 0.95rem; color: oklch(0.97 0.005 90);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.desk-name i {
  font-style: normal; font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
  font-size: 0.78rem; letter-spacing: 0.1em; color: oklch(0.62 0.01 90);
}
.desk-line {
  flex: none; display: flex; align-items: baseline; gap: 0.45rem;
  font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.25rem;
  color: oklch(0.62 0.01 90);
}
.desk-line b.is-lead { color: oklch(0.85 0.17 92); }
.desk-dash { color: oklch(0.48 0.01 90); font-size: 0.95rem; }

.desk-story {
  font-size: 0.85rem; color: oklch(0.62 0.01 90);
  display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
}
.desk-pill {
  flex: none; font-family: 'Barlow Condensed', sans-serif; font-weight: 800;
  font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase;
  padding: 0.15rem 0.5rem; border-radius: 999px;
  background: oklch(0.85 0.17 92); color: oklch(0.15 0.02 90);
}
.desk-pill.is-heist { background: #c81a4b; color: oklch(0.97 0.005 90); }
.desk-note { margin: 1rem 0 0; font-size: 0.8rem; color: oklch(0.48 0.01 90); }
</style>

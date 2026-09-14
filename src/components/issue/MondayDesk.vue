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
          <span
            class="desk-logo"
            :style="{ background: r.logoColor ? `linear-gradient(135deg, ${r.logoColor})` : undefined }"
          >
            <img v-if="r.logoUrl" :src="r.logoUrl" class="avatar-image" alt="" />
            <span v-else>{{ r.logoInitials }}</span>
          </span>
          <span class="desk-copy">
            <span class="desk-title-line">
              <b>{{ r.title }}</b>
              <span v-if="r.watch" class="desk-pill" :class="`is-${r.watch}`">
                {{ r.watch === 'heist' ? 'Heist watch' : 'Upset watch' }}
              </span>
            </span>
            <span class="desk-sub">{{ r.sub }}</span>
          </span>
          <span class="desk-score">{{ r.score }}</span>
        </li>
      </ul>
    </div>

    <div v-if="desk.decided.length" class="desk-group">
      <p class="desk-group-label">Done and dusted</p>
      <ul class="desk-rows" role="list">
        <li v-for="r in desk.decided" :key="r.matchupId" class="desk-row is-decided">
          <span
            class="desk-logo"
            :style="{ background: r.logoColor ? `linear-gradient(135deg, ${r.logoColor})` : undefined }"
          >
            <img v-if="r.logoUrl" :src="r.logoUrl" class="avatar-image" alt="" />
            <span v-else>{{ r.logoInitials }}</span>
          </span>
          <span class="desk-copy">
            <span class="desk-title-line"><b>{{ r.title }}</b></span>
            <span class="desk-sub">{{ r.sub }}</span>
          </span>
          <span class="desk-score">{{ r.score }}</span>
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
  display: flex; align-items: center; gap: 0.85rem;
  background: oklch(0.15 0.012 90); border-radius: 12px; padding: 0.6rem 0.9rem;
}
.desk-row.is-decided { opacity: 0.75; }
.desk-logo {
  width: 40px; height: 40px; border-radius: 10px; flex: none; overflow: hidden;
  display: grid; place-items: center; background: oklch(0.24 0.02 90);
  font-weight: 800; font-size: 0.8rem; color: oklch(0.62 0.01 90);
}
.desk-logo .avatar-image { width: 100%; height: 100%; object-fit: cover; }
.desk-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; }
.desk-title-line { display: flex; align-items: center; gap: 0.6rem; min-width: 0; }
.desk-title-line b {
  font-weight: 800; color: oklch(0.97 0.005 90);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.desk-pill {
  flex: none; font-family: 'Barlow Condensed', sans-serif; font-weight: 800;
  font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase;
  padding: 0.15rem 0.5rem; border-radius: 999px;
  background: oklch(0.85 0.17 92); color: oklch(0.15 0.02 90);
}
.desk-pill.is-heist { background: #c81a4b; color: oklch(0.97 0.005 90); }
.desk-sub { font-size: 0.85rem; color: oklch(0.62 0.01 90); }
.desk-score {
  flex: none; font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
  font-size: 1.15rem; color: oklch(0.97 0.005 90);
}
.desk-note { margin: 1rem 0 0; font-size: 0.8rem; color: oklch(0.48 0.01 90); }
</style>

<template>
  <Teleport to="body">
    <div class="cr-root" role="presentation">
      <div class="cr-backdrop" @click="onClose" aria-hidden="true"></div>
      <div
        ref="dialogRef"
        class="cr-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cr-title"
        aria-describedby="cr-sub"
      >
        <header class="cr-head">
          <div>
            <h2 id="cr-title" class="cr-title">Customize Power Rankings</h2>
            <p id="cr-sub" class="cr-sub">Adjust weights to personalize your rankings.</p>
          </div>
          <button
            ref="closeBtnRef"
            type="button"
            class="cr-close"
            aria-label="Close customize rankings"
            @click="onClose"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </header>

        <!-- Presets -->
        <section class="cr-section" aria-labelledby="cr-preset-label">
          <p id="cr-preset-label" class="cr-eyebrow cr-eyebrow-teal">Quick presets</p>
          <div class="cr-presets" role="group" aria-label="Preset weight schemes">
            <button
              v-for="p in powerRankingPresets"
              :key="p.id"
              type="button"
              class="cr-preset"
              :class="{ 'cr-preset-active': activePresetId === p.id }"
              :aria-pressed="activePresetId === p.id"
              @click="applyPreset(p.id)"
            >
              {{ p.name }}
            </button>
          </div>
        </section>

        <!-- Factors -->
        <section class="cr-section" aria-labelledby="cr-factor-label">
          <p id="cr-factor-label" class="cr-eyebrow">Factor weights</p>
          <ul class="cr-factors" role="list">
            <li
              v-for="f in factorDefs"
              :key="f.id"
              class="cr-factor"
              :class="{
                'cr-factor-leader': f.id === leaderFactorId,
                'cr-factor-off': !enabled[f.id],
              }"
            >
              <span class="cr-factor-stripe" aria-hidden="true"></span>

              <div class="cr-factor-id">
                <span class="cr-factor-icon" aria-hidden="true">
                  <FactorIcon :factor="f.id" :size="16" />
                </span>
                <div class="cr-factor-text">
                  <p class="cr-factor-name">{{ f.name }}</p>
                  <p class="cr-factor-desc">{{ f.description }}</p>
                </div>
              </div>

              <div class="cr-factor-control">
                <label class="cr-slider-wrap" :aria-label="`Weight for ${f.name}`">
                  <input
                    type="range"
                    class="cr-slider"
                    min="0"
                    max="100"
                    step="1"
                    :value="weights[f.id]"
                    :disabled="!enabled[f.id]"
                    :aria-valuetext="`${weights[f.id]} percent`"
                    :style="sliderStyle(f.id)"
                    @input="onSlider($event, f.id)"
                  />
                </label>
                <span
                  class="cr-factor-value"
                  :class="{ 'cr-factor-value-leader': f.id === leaderFactorId && enabled[f.id] }"
                  aria-hidden="true"
                >{{ weights[f.id] }}%</span>
                <button
                  type="button"
                  class="cr-switch"
                  role="switch"
                  :aria-checked="enabled[f.id]"
                  :aria-label="`${enabled[f.id] ? 'Disable' : 'Enable'} ${f.name}`"
                  @click="toggleFactor(f.id)"
                >
                  <span class="cr-switch-track" :class="{ 'cr-switch-on': enabled[f.id] }">
                    <span class="cr-switch-thumb"></span>
                  </span>
                </button>
              </div>
            </li>
          </ul>
        </section>

        <footer class="cr-foot">
          <button type="button" class="cr-reset" @click="resetToDefaults">Reset to defaults</button>
          <button type="button" class="cr-done" @click="onClose">Done</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { factorDefs, powerRankingPresets, type TeamFactorScores } from '@/fixtures/pillarsLeague'
import { useDemoPowerRankings } from '@/composables/useDemoPowerRankings'
import { useDemoModal } from '@/composables/useDemoModal'
import FactorIcon from './FactorIcon.vue'

const emit = defineEmits<{ (e: 'close'): void }>()

const {
  weights,
  enabled,
  activePresetId,
  applyPreset,
  setWeight,
  toggleFactor,
  resetToDefaults,
} = useDemoPowerRankings()

const dialogRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLElement | null>(null)

function onClose() {
  emit('close')
}

useDemoModal({ dialogRef, closeBtnRef, onClose })

function onSlider(e: Event, id: keyof TeamFactorScores) {
  const target = e.target as HTMLInputElement
  setWeight(id, Number(target.value))
}

// The factor with the highest current weight (among enabled) gets the visual accent.
const leaderFactorId = computed<keyof TeamFactorScores | null>(() => {
  let bestId: keyof TeamFactorScores | null = null
  let bestVal = -1
  for (const f of factorDefs) {
    if (!enabled.value[f.id]) continue
    if (weights.value[f.id] > bestVal) {
      bestVal = weights.value[f.id]
      bestId = f.id
    }
  }
  return bestId
})

function sliderStyle(id: keyof TeamFactorScores) {
  const v = enabled.value[id] ? weights.value[id] : 0
  return {
    background: `linear-gradient(to right, var(--cr-fill) 0%, var(--cr-fill) ${v}%, var(--cr-track) ${v}%, var(--cr-track) 100%)`,
  } as Record<string, string>
}

</script>

<style scoped>
.cr-root {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 24px;
  --ink-1: oklch(0.97 0.005 90);
  --ink-2: oklch(0.78 0.008 90);
  --ink-3: oklch(0.55 0.010 90);
  --ink-4: oklch(0.40 0.012 90);
  --ink-5: oklch(0.20 0.015 90);
  --ink-6: oklch(0.14 0.018 90);
  --ink-7: oklch(0.10 0.015 90);
  --ink-8: oklch(0.08 0.014 90);

  --accent-primary:   oklch(0.78 0.18 92);
  --accent-secondary: oklch(0.70 0.27 350);
  --accent-tertiary:  oklch(0.72 0.18 195);

  --cr-fill: var(--accent-secondary);
  --cr-track: oklch(0.20 0.015 90);

  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}

.cr-backdrop {
  position: absolute;
  inset: 0;
  background: oklch(0.04 0.014 90 / 0.78);
  opacity: 0;
  animation: cr-fade-in 140ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.cr-dialog {
  position: relative;
  width: 100%;
  max-width: 580px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 18px;
  padding: 24px 26px 22px;
  box-shadow:
    0 28px 72px -28px oklch(0 0 0 / 0.85),
    inset 0 1px 0 oklch(1 0 0 / 0.04);
  opacity: 0;
  transform: scale(0.96) translateY(8px);
  animation: cr-dialog-in 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: 30ms;
}

@media (prefers-reduced-motion: reduce) {
  .cr-backdrop,
  .cr-dialog {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

@keyframes cr-fade-in {
  to { opacity: 1; }
}
@keyframes cr-dialog-in {
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* Header */
.cr-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.cr-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.6rem;
  line-height: 1.05;
  letter-spacing: -0.008em;
  color: var(--ink-1);
  margin: 0;
}
.cr-sub {
  font-size: 0.88rem;
  color: var(--ink-3);
  margin: 4px 0 0;
  line-height: 1.45;
}
.cr-close {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 8px;
  color: var(--ink-2);
  cursor: pointer;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.cr-close:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
.cr-close:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.cr-close:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

/* Sections */
.cr-section { margin-bottom: 20px; }
.cr-section:last-of-type { margin-bottom: 0; }

.cr-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 10px;
}
.cr-eyebrow-teal { color: var(--accent-tertiary); }

/* Presets */
.cr-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cr-preset {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.84rem;
  letter-spacing: 0.04em;
  color: var(--ink-2);
  background: oklch(0.12 0.015 90);
  border: 1px solid oklch(0.22 0.015 90);
  padding: 7px 13px;
  border-radius: 999px;
  cursor: pointer;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              background-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.cr-preset:hover { color: var(--ink-1); border-color: oklch(0.34 0.015 90); }
.cr-preset:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.cr-preset:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
.cr-preset-active {
  color: oklch(0.96 0.10 350);
  background: oklch(0.70 0.27 350 / 0.14);
  border-color: oklch(0.70 0.27 350 / 0.55);
}

/* Factors */
.cr-factors {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cr-factor {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.5fr);
  gap: 16px;
  align-items: center;
  padding: 12px 12px 12px 14px;
  border-radius: 10px;
  transition: background-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.cr-factor + .cr-factor {
  border-top: 1px solid oklch(0.16 0.015 90);
}
.cr-factor-stripe {
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 2px;
  border-radius: 2px;
  background: var(--accent-secondary);
  opacity: 0;
  transform: scaleY(0.5);
  transform-origin: center;
  transition: opacity 180ms cubic-bezier(0.22, 1, 0.36, 1),
              transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.cr-factor-leader .cr-factor-stripe {
  opacity: 1;
  transform: scaleY(1);
}
.cr-factor-leader .cr-factor-name {
  color: var(--ink-1);
  font-weight: 900;
}
.cr-factor-leader {
  background: oklch(0.70 0.27 350 / 0.04);
}
.cr-factor-off .cr-factor-name,
.cr-factor-off .cr-factor-desc { opacity: 0.5; }

.cr-factor-id {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}
.cr-factor-icon {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  color: var(--ink-2);
  flex-shrink: 0;
  margin-top: 1px;
}
.cr-factor-leader .cr-factor-icon { color: var(--accent-secondary); }
.cr-factor-text { min-width: 0; }
.cr-factor-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.98rem;
  letter-spacing: 0.01em;
  color: var(--ink-1);
  margin: 0;
  line-height: 1.15;
}
.cr-factor-desc {
  font-size: 0.74rem;
  color: var(--ink-3);
  margin: 3px 0 0;
  line-height: 1.4;
}

.cr-factor-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
}

/* Slider */
.cr-slider-wrap {
  display: block;
  width: 100%;
}
.cr-slider {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 999px;
  background: var(--cr-track);
  cursor: pointer;
  outline: none;
}
.cr-slider:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 4px;
  border-radius: 999px;
}
.cr-slider:disabled { cursor: not-allowed; opacity: 0.45; }
.cr-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--ink-1);
  border: 2px solid var(--accent-secondary);
  cursor: pointer;
  margin-top: 0;
  transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.cr-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--ink-1);
  border: 2px solid var(--accent-secondary);
  cursor: pointer;
  transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: no-preference) {
  .cr-slider:hover::-webkit-slider-thumb { transform: scale(1.15); }
  .cr-slider:hover::-moz-range-thumb { transform: scale(1.15); }
}
.cr-slider:active::-webkit-slider-thumb { transform: scale(1.0); }
.cr-slider:active::-moz-range-thumb { transform: scale(1.0); }

.cr-factor-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  letter-spacing: 0.01em;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  min-width: 3.4ch;
  text-align: right;
}
.cr-factor-value-leader { color: var(--accent-primary); }
.cr-factor-off .cr-factor-value { opacity: 0.4; }

/* Switch */
.cr-switch {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: grid;
  place-items: center;
}
.cr-switch:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
  border-radius: 999px;
}
.cr-switch-track {
  position: relative;
  display: block;
  width: 30px;
  height: 18px;
  border-radius: 999px;
  background: oklch(0.22 0.015 90);
  transition: background-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.cr-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--ink-1);
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: reduce) {
  .cr-switch-track,
  .cr-switch-thumb { transition: none; }
}
.cr-switch-on { background: var(--accent-secondary); }
.cr-switch-on .cr-switch-thumb { transform: translateX(12px); }

/* Footer */
.cr-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid oklch(0.16 0.015 90);
}
.cr-reset {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
  background: transparent;
  border: none;
  padding: 6px 4px;
  cursor: pointer;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.cr-reset:hover { color: var(--ink-1); }
.cr-reset:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; border-radius: 4px; }

.cr-done {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.86rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: oklch(0.10 0.012 90);
  background: var(--accent-primary);
  border: none;
  padding: 9px 18px;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1),
              background-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: no-preference) {
  .cr-done:hover { transform: translateY(-1px); background: oklch(0.82 0.18 92); }
}
.cr-done:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.cr-done:focus-visible { outline: 2px solid var(--ink-1); outline-offset: 2px; }

@media (max-width: 560px) {
  .cr-factor {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .cr-factor-control { grid-template-columns: 1fr auto auto; }
  .cr-factor-stripe { top: 10px; bottom: 10px; }
}
</style>

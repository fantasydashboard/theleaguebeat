<template>
  <Teleport to="body">
    <Transition name="dpb">
      <div v-if="isDevMode" class="dpb-bar">
        <div class="dpb-inner">
          <span class="dpb-icon">🧪</span>
          <span class="dpb-label">Preview Mode</span>
          <span class="dpb-tier">{{ tierLabel }}</span>
          <span class="dpb-desc">{{ tierDesc }}</span>
          <div class="dpb-btns">
            <button
              v-for="t in TIERS"
              :key="t.key"
              @click="setDevTier(t.key)"
              :class="['dpb-btn', devTierOverride === t.key ? 'dpb-btn-active' : '']"
            >{{ t.label }}</button>
          </div>
          <button class="dpb-reset" @click="clearDevMode" title="Return to full admin access">
            ✕ Exit Preview
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFeatureAccess } from '@/composables/useFeatureAccess'

const { isDevMode, devTierOverride, setDevTier, clearDevMode } = useFeatureAccess()

const TIERS = [
  { key: 'free',    label: 'Free' },
  { key: 'league',  label: 'League Pass' },
  { key: 'premium', label: 'Premium' },
]

const tierLabel = computed(() => {
  const t = TIERS.find(t => t.key === devTierOverride.value)
  return t ? t.label : devTierOverride.value
})

const tierDesc = computed(() => {
  switch (devTierOverride.value) {
    case 'free':    return '— gating fully active, no pass'
    case 'league':  return '— League Pass unlocked, no Premium'
    case 'premium': return '— all features unlocked'
    default:        return ''
  }
})
</script>

<style scoped>
.dpb-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: linear-gradient(135deg, #0f1118, #0c0f1c);
  border-top: 2px solid #eab308;
  padding: 10px 20px;
  box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.6);
}

.dpb-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  max-width: 1200px;
  margin: 0 auto;
}

.dpb-icon { font-size: 16px; flex-shrink: 0; }

.dpb-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #eab308;
  flex-shrink: 0;
}

.dpb-tier {
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  background: rgba(234,179,8,0.15);
  border: 1px solid rgba(234,179,8,0.35);
  padding: 2px 10px;
  border-radius: 5px;
  flex-shrink: 0;
}

.dpb-desc {
  font-size: 12px;
  color: #6b7280;
  flex-shrink: 0;
}

.dpb-btns {
  display: flex;
  gap: 6px;
  margin-left: auto;
  flex-wrap: wrap;
}

.dpb-btn {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid #262a3a;
  background: #0a0c14;
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.12s;
  font-family: inherit;
}
.dpb-btn:hover { border-color: #374151; color: #9ca3af; }
.dpb-btn-active {
  border-color: #eab308;
  background: rgba(234,179,8,0.12);
  color: #eab308;
}

.dpb-reset {
  padding: 5px 14px;
  border-radius: 6px;
  border: 1px solid rgba(239,68,68,0.3);
  background: rgba(239,68,68,0.1);
  color: #f87171;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
  font-family: inherit;
  flex-shrink: 0;
}
.dpb-reset:hover {
  background: rgba(239,68,68,0.18);
  border-color: rgba(239,68,68,0.5);
}

/* Slide up/down transition */
.dpb-enter-active, .dpb-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.dpb-enter-from, .dpb-leave-to { transform: translateY(100%); opacity: 0; }
</style>

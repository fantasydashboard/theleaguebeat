<template>
  <Teleport to="body">
    <Transition name="nudge-slide">
      <div v-if="show" class="nudge-wrap">

        <!-- Collapsed tab (always visible after first dismiss) -->
        <div v-if="collapsed" class="nudge-tab" @click="collapsed = false">
          <span class="nudge-tab-icon">⚡</span>
          <span class="nudge-tab-text">Unlock full access</span>
          <span class="nudge-tab-caret">▲</span>
        </div>

        <!-- Full panel -->
        <div v-else class="nudge-panel">
          <!-- Header -->
          <div class="nudge-header">
            <div class="nudge-header-left">
              <span class="nudge-emoji">⚡</span>
              <div>
                <div class="nudge-title">Your free trial has ended</div>
                <div class="nudge-sub">Unlock everything again — starting at less than a cup of coffee.</div>
              </div>
            </div>
            <div class="nudge-header-right">
              <button class="nudge-collapse" @click="collapsed = true" title="Collapse">▼</button>
              <button class="nudge-close" @click="dismiss" title="Dismiss for today">✕</button>
            </div>
          </div>

          <!-- Value + Plans -->
          <div class="nudge-body">

            <!-- What they're missing -->
            <div class="nudge-features">
              <div v-for="f in features" :key="f" class="nudge-feature">
                <span class="nudge-feature-check">✓</span>
                <span>{{ f }}</span>
              </div>
            </div>

            <!-- Plan cards -->
            <div class="nudge-plans">

              <!-- Individual -->
              <div class="nudge-plan nudge-plan-green">
                <div class="nudge-plan-top">
                  <div>
                    <div class="nudge-plan-name">Individual</div>
                    <div class="nudge-plan-desc">You only · all leagues · all sports</div>
                  </div>
                  <div class="nudge-plan-price">
                    <span class="nudge-plan-amount">$49</span>
                    <span class="nudge-plan-period">/yr</span>
                  </div>
                </div>
                <button class="nudge-btn nudge-btn-green" @click="goTo('individual')">
                  Get Individual →
                </button>
                <div class="nudge-plan-alt">or <strong>$7.99/mo</strong> billed monthly</div>
              </div>

              <!-- League Pass -->
              <div class="nudge-plan nudge-plan-gold">
                <div class="nudge-plan-top">
                  <div>
                    <div class="nudge-plan-name">League Pass</div>
                    <div class="nudge-plan-desc">One league · whole team · 365 days</div>
                  </div>
                  <div class="nudge-plan-price">
                    <span class="nudge-plan-amount" style="color:#eab308;">$29</span>
                    <span class="nudge-plan-period"> one-time</span>
                  </div>
                </div>
                <button class="nudge-btn nudge-btn-gold" @click="goTo('league')">
                  Get League Pass →
                </button>
                <div class="nudge-plan-alt">Everyone in your league gets access</div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useFeatureAccess } from '@/composables/useFeatureAccess'

const router = useRouter()
const { isTrialExpired, isPaid } = useFeatureAccess()

const STORAGE_KEY = 'ufd_upgrade_nudge_last_shown'

const show = ref(false)
const collapsed = ref(false)

const features = [
  'Expand full lists, popups & team details',
  'Download & share social graphics',
  'Full power rankings with trend graph',
  'Complete league history & career stats',
  'Head-to-head records & legacy scores',
]

function getTodayStr() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

function shouldShow() {
  if (!isTrialExpired.value || isPaid.value) return false
  const last = localStorage.getItem(STORAGE_KEY)
  return last !== getTodayStr()
}

function dismiss() {
  show.value = false
  localStorage.setItem(STORAGE_KEY, getTodayStr())
}

function goTo(plan: 'individual' | 'league') {
  dismiss()
  router.push(plan === 'individual' ? '/pricing?intent=individual' : '/pricing?intent=league')
}

onMounted(() => {
  // Small delay so it doesn't pop immediately on page load
  setTimeout(() => {
    if (shouldShow()) show.value = true
  }, 2500)
})

// Also re-check when trial/paid status changes
watch([isTrialExpired, isPaid], () => {
  if (shouldShow() && !show.value) {
    setTimeout(() => { show.value = true }, 1000)
  } else if (isPaid.value) {
    show.value = false
  }
})
</script>

<style scoped>
/* ── Wrapper ── */
.nudge-wrap {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9000;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

/* ── Collapsed tab ── */
.nudge-tab {
  pointer-events: all;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: #0f1118;
  border: 1px solid rgba(234,179,8,0.4);
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  cursor: pointer;
  transition: background 0.15s;
}
.nudge-tab:hover { background: #161a24; }
.nudge-tab-icon { font-size: 13px; }
.nudge-tab-text { font-size: 12px; font-weight: 700; color: #eab308; letter-spacing: 0.04em; }
.nudge-tab-caret { font-size: 9px; color: #6b7280; }

/* ── Full panel ── */
.nudge-panel {
  pointer-events: all;
  width: 100%;
  max-width: 860px;
  background: linear-gradient(135deg, #0f1118, #0c0f1c);
  border: 1px solid rgba(234,179,8,0.3);
  border-bottom: none;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(234,179,8,0.08);
  overflow: hidden;
}

/* Top accent */
.nudge-panel::before {
  content: '';
  display: block;
  height: 2px;
  background: linear-gradient(90deg, transparent, #eab308, #22c55e, transparent);
}

/* ── Header ── */
.nudge-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 10px;
  gap: 12px;
}
.nudge-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nudge-emoji { font-size: 20px; flex-shrink: 0; }
.nudge-title { font-size: 14px; font-weight: 900; color: #fff; margin-bottom: 1px; }
.nudge-sub { font-size: 12px; color: #9ca3af; }
.nudge-header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.nudge-collapse, .nudge-close {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  border: 1px solid #1e2130;
  color: #6b7280;
  font-size: 11px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.nudge-collapse:hover, .nudge-close:hover { background: rgba(255,255,255,0.1); color: #fff; }

/* ── Body ── */
.nudge-body {
  display: flex;
  gap: 16px;
  padding: 0 20px 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}

/* Features list */
.nudge-features {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.nudge-feature {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: #9ca3af;
}
.nudge-feature-check { color: #22c55e; font-size: 11px; flex-shrink: 0; }

/* Plan cards */
.nudge-plans {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.nudge-plan {
  width: 200px;
  border-radius: 12px;
  padding: 12px 14px;
}
.nudge-plan-green {
  background: rgba(34,197,94,0.07);
  border: 1px solid rgba(34,197,94,0.3);
}
.nudge-plan-gold {
  background: rgba(234,179,8,0.07);
  border: 1px solid rgba(234,179,8,0.3);
}
.nudge-plan-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.nudge-plan-name { font-size: 13px; font-weight: 800; color: #fff; }
.nudge-plan-desc { font-size: 10px; color: #6b7280; margin-top: 2px; }
.nudge-plan-price { text-align: right; flex-shrink: 0; }
.nudge-plan-amount { font-size: 16px; font-weight: 900; color: #22c55e; }
.nudge-plan-period { font-size: 10px; color: #6b7280; }
.nudge-plan-alt { font-size: 10px; color: #4b5563; margin-top: 5px; text-align: center; }

.nudge-btn {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}
.nudge-btn-green {
  background: #22c55e;
  color: #0a0c14;
}
.nudge-btn-green:hover { background: #16a34a; }
.nudge-btn-gold {
  background: #eab308;
  color: #0a0c14;
}
.nudge-btn-gold:hover { background: #ca8a04; }

/* ── Transition ── */
.nudge-slide-enter-active { transition: transform 0.35s cubic-bezier(0.34,1.1,0.64,1), opacity 0.25s ease; }
.nudge-slide-leave-active { transition: transform 0.25s ease, opacity 0.2s ease; }
.nudge-slide-enter-from { transform: translateY(100%); opacity: 0; }
.nudge-slide-leave-to { transform: translateY(100%); opacity: 0; }
</style>

<template>
  <Teleport to="body">
    <Transition name="tour-fade">
      <div v-if="show"
        class="tour-backdrop"
        @click.self="skip">

        <div class="tour-modal">

          <!-- Progress dots -->
          <div class="tour-dots">
            <button v-for="(_, i) in steps" :key="i"
              class="tour-dot"
              :class="{ 'tour-dot-active': i === current }"
              @click="current = i" />
          </div>

          <!-- Close -->
          <button class="tour-close" @click="skip" title="Skip tour">✕</button>

          <!-- Slide content -->
          <Transition :name="slideDir" mode="out-in">
            <div :key="current" class="tour-slide">

              <!-- Icon / Illustration -->
              <div class="tour-icon">{{ steps[current].icon }}</div>

              <!-- Step number -->
              <div class="tour-step-label">{{ current + 1 }} of {{ steps.length }}</div>

              <!-- Title -->
              <h2 class="tour-title">{{ steps[current].title }}</h2>

              <!-- Body -->
              <p class="tour-body">{{ steps[current].body }}</p>

              <!-- Feature pills -->
              <div v-if="steps[current].pills" class="tour-pills">
                <span v-for="pill in steps[current].pills" :key="pill" class="tour-pill">
                  {{ pill }}
                </span>
              </div>

              <!-- Tip box -->
              <div v-if="steps[current].tip" class="tour-tip">
                <span class="tour-tip-icon">💡</span>
                <span>{{ steps[current].tip }}</span>
              </div>

            </div>
          </Transition>

          <!-- Actions -->
          <div class="tour-actions">
            <button v-if="current > 0" class="tour-btn-back" @click="prev">← Back</button>
            <div v-else class="tour-btn-spacer" />

            <button v-if="current < steps.length - 1" class="tour-btn-next" @click="next">
              Next →
            </button>
            <button v-else class="tour-btn-done" @click="finish">
              Let's go! 🚀
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const current = ref(0)
const prevIndex = ref(0)

const slideDir = computed(() =>
  current.value > prevIndex.value ? 'tour-slide-left' : 'tour-slide-right'
)

const steps = [
  {
    icon: '🎉',
    title: 'Your league is connected!',
    body: 'Welcome to Ultimate Fantasy Dashboard. You now have full access to power rankings, matchup analytics, league history, and shareable graphics. Let us show you around.',
    pills: ['Power Rankings', 'Matchups', 'History', 'Graphics'],
    tip: 'Navigate between features using the menu bar at the top.'
  },
  {
    icon: '🏆',
    title: 'Power Rankings',
    body: 'See who\'s really winning your league — not just by record. UFD factors in recent form, scoring trends, and schedule strength to rank every team. A new ranking drops every week.',
    pills: ['Weekly algorithm', 'Trend graph', 'Team deep-dive'],
    tip: 'Click any team in the rankings to pull up a detailed breakdown of what\'s driving their score.'
  },
  {
    icon: '⚡',
    title: 'Matchup Analytics',
    body: 'Track live win probability throughout the week. Every player\'s performance shifts your chances in real time — so you always know exactly where you stand, day by day.',
    pills: ['Live win probability', 'Day-by-day chart', 'Score projections'],
    tip: 'The day hover panel shows how each day\'s performance moved your win probability up or down.'
  },
  {
    icon: '📜',
    title: 'League History',
    body: 'Your league\'s full story in one place. Career stats, all-time records, head-to-head history, and a Legacy Score that ranks every manager across every season.',
    pills: ['Career stats', 'H2H records', 'Legacy score', 'Hall of Fame'],
    tip: 'Click any section header to expand the full list — the top 3 rows are always visible for free.'
  },
  {
    icon: '📲',
    title: 'Shareable Graphics',
    body: 'Download beautiful, branded graphics and drop them straight into your group chat. Best Batters, Power Rankings, Win Probability — everything your league needs to start a conversation.',
    pills: ['Best Batters / Pitchers', 'Power Rankings card', 'Win Probability'],
    tip: 'Head to Free Tools → Social Templates to find all the graphics. Download and screenshot — your league won\'t know what hit them.'
  },
]

function next() {
  if (current.value < steps.length - 1) {
    prevIndex.value = current.value
    current.value++
  }
}

function prev() {
  if (current.value > 0) {
    prevIndex.value = current.value
    current.value--
  }
}

function skip() {
  emit('close')
}

function finish() {
  emit('close')
}
</script>

<style scoped>
/* ── Backdrop ── */
.tour-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

/* ── Modal ── */
.tour-modal {
  position: relative;
  width: 100%;
  max-width: 480px;
  background: linear-gradient(145deg, #0f1118, #0c0f1c);
  border: 1px solid rgba(34, 197, 94, 0.35);
  border-radius: 20px;
  padding: 36px 32px 28px;
  box-shadow: 0 0 60px rgba(34, 197, 94, 0.12), 0 40px 80px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

/* Top accent line */
.tour-modal::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #22c55e, #06b6d4, transparent);
}

/* ── Progress dots ── */
.tour-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 24px;
}
.tour-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #1e2130;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}
.tour-dot-active {
  background: #22c55e;
  width: 24px;
  border-radius: 4px;
}

/* ── Close ── */
.tour-close {
  position: absolute;
  top: 16px; right: 16px;
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  border: 1px solid #1e2130;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.tour-close:hover { background: rgba(255,255,255,0.1); color: #fff; }

/* ── Slide ── */
.tour-slide { text-align: center; }

.tour-icon {
  font-size: 48px;
  margin-bottom: 12px;
  line-height: 1;
}

.tour-step-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #22c55e;
  margin-bottom: 8px;
}

.tour-title {
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  line-height: 1.15;
  letter-spacing: -0.01em;
  margin: 0 0 12px;
  font-family: 'Barlow Condensed', sans-serif;
}

.tour-body {
  font-size: 14px;
  color: #9ca3af;
  line-height: 1.65;
  margin: 0 0 16px;
}

/* ── Feature pills ── */
.tour-pills {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-bottom: 16px;
}
.tour-pill {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.25);
  color: #22c55e;
}

/* ── Tip ── */
.tour-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  text-align: left;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid #1e2130;
  margin-bottom: 4px;
}
.tour-tip-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
.tour-tip span:last-child { font-size: 12px; color: #6b7280; line-height: 1.5; }

/* ── Actions ── */
.tour-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
  gap: 12px;
}

.tour-btn-spacer { flex: 1; }

.tour-btn-back {
  font-size: 13px;
  font-weight: 700;
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 0;
  transition: color 0.15s;
}
.tour-btn-back:hover { color: #9ca3af; }

.tour-btn-next {
  padding: 10px 24px;
  border-radius: 10px;
  background: #22c55e;
  color: #0a0c14;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.04em;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 2px 12px rgba(34,197,94,0.3);
}
.tour-btn-next:hover { background: #16a34a; transform: translateY(-1px); }

.tour-btn-done {
  padding: 10px 24px;
  border-radius: 10px;
  background: linear-gradient(135deg, #22c55e, #06b6d4);
  color: #0a0c14;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.04em;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 2px 16px rgba(34,197,94,0.35);
}
.tour-btn-done:hover { opacity: 0.9; transform: translateY(-1px); }

/* ── Transitions ── */
.tour-fade-enter-active, .tour-fade-leave-active { transition: all 0.25s ease; }
.tour-fade-enter-from, .tour-fade-leave-to { opacity: 0; transform: scale(0.96); }

.tour-slide-left-enter-active, .tour-slide-left-leave-active,
.tour-slide-right-enter-active, .tour-slide-right-leave-active {
  transition: all 0.22s ease;
}
.tour-slide-left-enter-from { opacity: 0; transform: translateX(30px); }
.tour-slide-left-leave-to  { opacity: 0; transform: translateX(-30px); }
.tour-slide-right-enter-from { opacity: 0; transform: translateX(-30px); }
.tour-slide-right-leave-to  { opacity: 0; transform: translateX(30px); }
</style>

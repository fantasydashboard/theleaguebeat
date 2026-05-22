<template>
  <div class="min-h-screen">
    <!-- Hero Section -->
    <section class="relative pt-24 pb-20 overflow-hidden">
      <!-- Background gradient -->
      <div class="absolute inset-0 bg-gradient-to-br from-dark-bg via-dark-card to-dark-bg"></div>
      <div class="absolute inset-0" :style="{ background: `radial-gradient(circle at 30% 20%, ${sportColor}15, transparent 50%)` }"></div>
      
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-4xl mx-auto">
          <!-- Sport badge -->
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6" :style="{ borderColor: sportColor + '50', backgroundColor: sportColor + '10' }">
            <span class="text-2xl">{{ sportEmoji }}</span>
            <span class="font-semibold" :style="{ color: sportColor }">Fantasy {{ sportName }}</span>
          </div>
          
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-black text-dark-text mb-6 leading-tight">
            Dominate Your 
            <span :style="{ color: sportColor }">{{ sportName }}</span>
            League
          </h1>
          
          <p class="text-xl text-dark-textMuted mb-8 max-w-2xl mx-auto">
            Power rankings, head-to-head records, historical stats, and advanced analytics 
            to give you the edge in your fantasy {{ sportName.toLowerCase() }} league.
          </p>
          
          <!-- League types for non-football sports -->
          <div v-if="sport !== 'football'" class="flex flex-wrap items-center justify-center gap-3 mb-8">
            <span class="text-sm text-dark-textMuted">Works with:</span>
            <span class="px-3 py-1 rounded-full text-sm font-medium bg-dark-border/50 text-dark-text">H2H Points</span>
            <span class="px-3 py-1 rounded-full text-sm font-medium bg-dark-border/50 text-dark-text">H2H Categories</span>
            <span class="px-3 py-1 rounded-full text-sm font-medium bg-dark-border/50 text-dark-text">Roto</span>
          </div>
          
          <!-- CTA Buttons -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              @click="$emit('open-signup')"
              class="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
              :style="{ backgroundColor: sportColor, color: '#111' }"
            >
              Create Free Account
            </button>
            <button
              @click="scrollToFeatures"
              class="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-lg bg-dark-card border border-dark-border text-dark-text hover:bg-dark-border/50 transition-all"
            >
              See Features
            </button>
          </div>
          
          <p class="mt-4 text-sm text-dark-textMuted">
            Free forever for basic features • No credit card required
          </p>
        </div>
      </div>
    </section>

    <!-- Platform Support -->
    <section class="py-12 border-y border-dark-border bg-dark-card/30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col sm:flex-row items-center justify-center gap-8">
          <span class="text-dark-textMuted text-sm uppercase tracking-wider">Connects with</span>
          <div class="flex items-center gap-8">
            <!-- Sleeper -->
            <div class="flex items-center gap-2">
              <div class="w-10 h-10 rounded-lg bg-[#1a1a2e] flex items-center justify-center">
                <span class="text-xl">😴</span>
              </div>
              <span class="font-semibold text-dark-text">Sleeper</span>
            </div>
            <!-- Yahoo -->
            <div class="flex items-center gap-2">
              <div class="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                <span class="text-white font-bold text-sm">Y!</span>
              </div>
              <span class="font-semibold text-dark-text">Yahoo</span>
            </div>
            <!-- ESPN Coming Soon -->
            <div class="flex items-center gap-2 opacity-50">
              <div class="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center">
                <span class="text-white font-bold text-xs">ESPN</span>
              </div>
              <div>
                <span class="font-semibold text-dark-text">ESPN</span>
                <span class="text-xs text-dark-textMuted block">Coming Soon</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold text-dark-text mb-4">
            Everything You Need to Win
          </h2>
          <p class="text-lg text-dark-textMuted max-w-2xl mx-auto">
            Comprehensive tools designed specifically for fantasy {{ sportName.toLowerCase() }} managers
          </p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <!-- Power Rankings -->
          <div class="bg-dark-card rounded-2xl p-6 border border-dark-border hover:border-primary/50 transition-all">
            <div class="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
              <span class="text-2xl">⚡</span>
            </div>
            <h3 class="text-xl font-bold text-dark-text mb-2">Power Rankings</h3>
            <p class="text-dark-textMuted">
              See who's really dominating with our customizable power ranking formula. Track week-over-week changes.
            </p>
          </div>

          <!-- Historical Stats -->
          <div class="bg-dark-card rounded-2xl p-6 border border-dark-border hover:border-primary/50 transition-all">
            <div class="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4">
              <span class="text-2xl">📜</span>
            </div>
            <h3 class="text-xl font-bold text-dark-text mb-2">League History</h3>
            <p class="text-dark-textMuted">
              Every season, every matchup, every championship. Your league's complete historical record.
            </p>
          </div>

          <!-- H2H Records -->
          <div class="bg-dark-card rounded-2xl p-6 border border-dark-border hover:border-primary/50 transition-all">
            <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
              <span class="text-2xl">⚔️</span>
            </div>
            <h3 class="text-xl font-bold text-dark-text mb-2">Head-to-Head Records</h3>
            <p class="text-dark-textMuted">
              Know your rival's number. All-time records against every team in your league.
            </p>
          </div>

          <!-- Matchup Analysis -->
          <div class="bg-dark-card rounded-2xl p-6 border border-dark-border hover:border-primary/50 transition-all">
            <div class="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
              <span class="text-2xl">🎯</span>
            </div>
            <h3 class="text-xl font-bold text-dark-text mb-2">Matchup Deep Dive</h3>
            <p class="text-dark-textMuted">
              Detailed breakdowns of every matchup with position-by-position comparisons.
            </p>
          </div>

          <!-- Shareable Graphics -->
          <div class="bg-dark-card rounded-2xl p-6 border border-dark-border hover:border-primary/50 transition-all">
            <div class="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4">
              <span class="text-2xl">📸</span>
            </div>
            <h3 class="text-xl font-bold text-dark-text mb-2">Shareable Graphics</h3>
            <p class="text-dark-textMuted">
              Download beautiful power ranking graphics to share in your group chat.
            </p>
          </div>

          <!-- Draft Analysis -->
          <div class="bg-dark-card rounded-2xl p-6 border border-dark-border hover:border-primary/50 transition-all">
            <div class="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
              <span class="text-2xl">📝</span>
            </div>
            <h3 class="text-xl font-bold text-dark-text mb-2">Draft Recaps</h3>
            <p class="text-dark-textMuted">
              Relive every pick. See who reached, who got steals, and grade each team's draft.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Ultimate Tools Section -->
    <section class="py-20 bg-gradient-to-br from-yellow-500/5 via-dark-bg to-orange-500/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30 mb-4">
            <span class="text-xl">⭐</span>
            <span class="font-semibold text-yellow-500">Ultimate Tools</span>
          </div>
          <h2 class="text-3xl sm:text-4xl font-bold text-dark-text mb-4">
            Take Your Game to the Next Level
          </h2>
          <p class="text-lg text-dark-textMuted max-w-2xl mx-auto">
            AI-powered tools to optimize your lineup decisions every {{ sport === 'football' ? 'week' : 'day' }}
          </p>
        </div>

        <div class="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div class="bg-dark-card/80 backdrop-blur rounded-2xl p-6 border border-yellow-500/20">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <span class="text-2xl">🎯</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-dark-text mb-1">AI Projections</h3>
                <p class="text-dark-textMuted text-sm">
                  Advanced projections that factor in matchups, weather, and recent trends.
                </p>
              </div>
            </div>
          </div>

          <div class="bg-dark-card/80 backdrop-blur rounded-2xl p-6 border border-yellow-500/20">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <span class="text-2xl">🔄</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-dark-text mb-1">Start/Sit Recommendations</h3>
                <p class="text-dark-textMuted text-sm">
                  Never second-guess your lineup again with data-driven start/sit advice.
                </p>
              </div>
            </div>
          </div>

          <div class="bg-dark-card/80 backdrop-blur rounded-2xl p-6 border border-yellow-500/20">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <span class="text-2xl">🔍</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-dark-text mb-1">Waiver Wire Analysis</h3>
                <p class="text-dark-textMuted text-sm">
                  Find the hidden gems on waivers before your league mates do.
                </p>
              </div>
            </div>
          </div>

          <div class="bg-dark-card/80 backdrop-blur rounded-2xl p-6 border border-yellow-500/20">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <span class="text-2xl">🤝</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-dark-text mb-1">Trade Analyzer</h3>
                <p class="text-dark-textMuted text-sm">
                  Evaluate any trade with our win probability calculator.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-gradient-to-br from-dark-card to-dark-elevated rounded-3xl p-8 sm:p-12 border border-dark-border text-center relative overflow-hidden">
          <!-- Background decoration -->
          <div class="absolute inset-0 opacity-30" :style="{ background: `radial-gradient(circle at 50% 0%, ${sportColor}30, transparent 50%)` }"></div>
          
          <div class="relative">
            <span class="text-5xl mb-6 block">{{ sportEmoji }}</span>
            <h2 class="text-3xl sm:text-4xl font-bold text-dark-text mb-4">
              Ready to Dominate Your League?
            </h2>
            <p class="text-lg text-dark-textMuted mb-8 max-w-xl mx-auto">
              Join thousands of fantasy {{ sportName.toLowerCase() }} managers who've already upgraded their game.
            </p>
            
            <button
              @click="$emit('open-signup')"
              class="px-10 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl"
              :style="{ backgroundColor: sportColor, color: '#111' }"
            >
              Get Started Free
            </button>
            
            <p class="mt-4 text-sm text-dark-textMuted">
              No credit card required • Free features forever
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Other Sports Section -->
    <section class="py-16 border-t border-dark-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-8">
          <h3 class="text-xl font-bold text-dark-text mb-2">Play Other Sports?</h3>
          <p class="text-dark-textMuted">We've got you covered across all major fantasy sports</p>
        </div>
        
        <div class="flex flex-wrap items-center justify-center gap-4">
          <router-link
            v-for="otherSport in otherSports"
            :key="otherSport.id"
            :to="'/' + otherSport.id"
            class="flex items-center gap-2 px-5 py-3 rounded-xl bg-dark-card border border-dark-border hover:border-primary/50 transition-all"
          >
            <span class="text-xl">{{ otherSport.emoji }}</span>
            <span class="font-medium text-dark-text">{{ otherSport.name }}</span>
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  sport: 'football' | 'baseball' | 'basketball' | 'hockey'
}>()

defineEmits<{
  (e: 'open-signup'): void
}>()

const sportConfig = {
  football: {
    name: 'Football',
    emoji: '🏈',
    color: '#22c55e' // Green
  },
  baseball: {
    name: 'Baseball',
    emoji: '⚾',
    color: '#ef4444' // Red
  },
  basketball: {
    name: 'Basketball',
    emoji: '🏀',
    color: '#f97316' // Orange
  },
  hockey: {
    name: 'Hockey',
    emoji: '🏒',
    color: '#3b82f6' // Blue
  }
}

const allSports = [
  { id: 'football', name: 'Football', emoji: '🏈' },
  { id: 'baseball', name: 'Baseball', emoji: '⚾' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀' },
  { id: 'hockey', name: 'Hockey', emoji: '🏒' }
]

const sportName = computed(() => sportConfig[props.sport].name)
const sportEmoji = computed(() => sportConfig[props.sport].emoji)
const sportColor = computed(() => sportConfig[props.sport].color)

const otherSports = computed(() => allSports.filter(s => s.id !== props.sport))

function scrollToFeatures() {
  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

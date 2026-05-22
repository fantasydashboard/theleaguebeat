<template>
  <div class="landing-root">

    <!-- ══════════════════════════════════════════════
         HERO
    ══════════════════════════════════════════════ -->
    <section class="hero-section" aria-label="Ultimate Fantasy Dashboard">
      <div class="hero-inner">
        <div class="hero-logo-wrap">
          <img src="/UFD_V8.png" alt="Ultimate Fantasy Dashboard" class="hero-logo" />
        </div>

        <div class="hero-eyebrow"><span class="eyebrow-dot eyebrow-dot-primary"></span>Built for commissioners and league nerds</div>

        <h1 class="hero-headline">
          Keep your league
          <span class="headline-line"><span class="headline-strike">arguing</span> talking.</span>
          <span class="headline-final">All season.</span>
        </h1>

        <p class="hero-sub">
          Power rankings, win probability, draft grades, and league history. For your Sleeper, ESPN, or Yahoo league. Shareable to your group chat in one click.
        </p>

        <div class="hero-ctas">
          <button class="cta-primary" @click="$emit('open-signup')" aria-label="Connect your league for free">
            Connect your league. Free.
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <a href="#picker" class="cta-ghost" @click.prevent="scrollTo('picker')" aria-label="See how it works">
            See how it works
          </a>
        </div>

        <!-- Single hero composition: share card + caption -->
        <div class="hero-stage" aria-hidden="true">
          <div class="hero-stage-card">
            <div class="sc-card sc-pr-card">
              <div class="sc-brand-row">
                <span class="sc-brand-logo">UFD</span>
                <span class="sc-brand-sport">NFL Fantasy . PPR</span>
                <span class="sc-brand-mover">
                  <svg viewBox="0 0 12 12" width="9" height="9" aria-hidden="true"><path d="M6 1.5l4.5 6h-3v3.5h-3v-3.5h-3z" fill="currentColor"/></svg>
                  <span>MM +2</span>
                </span>
                <span class="sc-brand-week">WK 11</span>
              </div>

              <div class="sc-pr-title-row">
                <div class="sc-pr-title">Weekly Power Rankings</div>
                <div class="sc-pr-legend" aria-hidden="true">
                  <span class="legend-dot legend-mm"></span>
                  <span class="legend-dot legend-tc"></span>
                  <span class="legend-dot legend-ta"></span>
                  <span class="legend-dot legend-wwk"></span>
                  <span class="legend-dot legend-tbf"></span>
                  <span class="legend-label">last 6 weeks</span>
                </div>
              </div>

              <!-- Bump chart: rank movement over the last 6 weeks -->
              <div class="sc-pr-chart-wrap">
                <svg class="sc-pr-chart" viewBox="0 0 340 92" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="mmLineGlow" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stop-color="oklch(0.78 0.18 92)" stop-opacity="0"/>
                      <stop offset="1" stop-color="oklch(0.78 0.18 92)" stop-opacity="1"/>
                    </linearGradient>
                  </defs>
                  <g class="sc-pr-chart-grid">
                    <line x1="0" y1="12" x2="340" y2="12"/>
                    <line x1="0" y1="32" x2="340" y2="32"/>
                    <line x1="0" y1="52" x2="340" y2="52"/>
                    <line x1="0" y1="72" x2="340" y2="72"/>
                    <line x1="0" y1="86" x2="340" y2="86"/>
                  </g>
                  <!-- Mahomes Magic: 3→3→2→2→3→1 -->
                  <path class="sc-pr-line line-mm" d="M 10,52 C 31,52 53,52 74,52 S 117,32 138,32 S 181,32 202,32 S 245,52 266,52 S 309,12 330,12"/>
                  <!-- Trash Can Wins: 1→1→1→1→1→2 -->
                  <path class="sc-pr-line line-tc" d="M 10,12 C 31,12 53,12 74,12 S 117,12 138,12 S 181,12 202,12 S 245,12 266,12 S 309,32 330,32"/>
                  <!-- The Algorithm: 2→2→4→3→3→3 -->
                  <path class="sc-pr-line line-ta" d="M 10,32 C 31,32 53,32 74,32 S 117,72 138,72 S 181,52 202,52 S 245,52 266,52 S 309,52 330,52"/>
                  <!-- Waiver Wire Kid: 4→5→5→4→5→4 -->
                  <path class="sc-pr-line line-wwk" d="M 10,72 C 31,72 53,86 74,86 S 117,86 138,86 S 181,72 202,72 S 245,86 266,86 S 309,72 330,72"/>
                  <!-- Toilet Bowl FC: 5→4→3→5→4→5 -->
                  <path class="sc-pr-line line-tbf" d="M 10,86 C 31,86 53,72 74,72 S 117,52 138,52 S 181,86 202,86 S 245,72 266,72 S 309,86 330,86"/>
                  <!-- endpoint dots (current rank) -->
                  <circle class="sc-pr-dot dot-mm"  cx="330" cy="12" r="4"/>
                  <circle class="sc-pr-dot dot-tc"  cx="330" cy="32" r="3.2"/>
                  <circle class="sc-pr-dot dot-ta"  cx="330" cy="52" r="3.2"/>
                  <circle class="sc-pr-dot dot-wwk" cx="330" cy="72" r="3.2"/>
                  <circle class="sc-pr-dot dot-tbf" cx="330" cy="86" r="3.2"/>
                </svg>
              </div>

              <div class="sc-pr-table">
                <div class="sc-pr-thead">
                  <span>Rank</span><span>+/-</span><span>Team</span><span>Score</span><span>W-L</span>
                </div>
                <div v-for="(t, i) in heroCardTeams" :key="i" class="sc-pr-row" :class="i === 0 ? 'sc-pr-leader' : ''">
                  <span class="sc-pr-num" :class="i === 0 ? 'num-gold' : i === 1 ? 'num-silver' : i === 2 ? 'num-bronze' : ''">
                    <svg v-if="i === 0" class="num-crown" viewBox="0 0 14 14" width="9" height="9" aria-hidden="true"><path d="M1 4l3 3 3-5 3 5 3-3v6H1z" fill="currentColor"/></svg>
                    <span>{{ i + 1 }}</span>
                  </span>
                  <span class="sc-pr-chg" :class="t.trend > 0 ? 'chg-up' : t.trend < 0 ? 'chg-dn' : 'chg-flat'">
                    <template v-if="t.trend > 0">▲{{ t.trend }}</template>
                    <template v-else-if="t.trend < 0">▼{{ Math.abs(t.trend) }}</template>
                    <template v-else>·</template>
                  </span>
                  <div class="sc-pr-team-cell">
                    <div class="sc-pr-initials" :class="'init-' + i">{{ initials(t.name) }}</div>
                    <span class="sc-pr-name" :class="i === 0 ? 'name-gold' : ''">{{ t.name }}</span>
                  </div>
                  <div class="sc-pr-bar-wrap">
                    <div class="sc-pr-bar" :style="{ width: t.score + '%', opacity: Math.max(0.32, 1 - (i * 0.15)) }"></div>
                    <span class="sc-pr-bar-num">{{ t.pscore }}</span>
                  </div>
                  <span class="sc-pr-rec">{{ t.record }}</span>
                </div>
              </div>
              <div class="sc-watermark">ultimatefantasydashboard.com</div>
            </div>
          </div>

          <div class="hero-stage-caption">
            <div class="caption-arrow" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M6 8c8 0 18 6 22 16M32 18l-2 8 8-2"/>
              </svg>
            </div>
            <span>One screenshot. Whole league loses it.</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         PICKER
    ══════════════════════════════════════════════ -->
    <section class="picker-section" id="picker" aria-label="Connect your Sleeper, ESPN, or Yahoo fantasy league">
      <div class="section-inner">
        <div class="section-eyebrow eyebrow-secondary">Your league, your rules</div>
        <h2 class="section-headline">Works with <span class="accent-secondary">your</span> league. Right now.</h2>
        <p class="section-sub">Pick your setup. We'll show you what you'd get.</p>

        <div class="picker-grid">
          <div class="picker-step">
            <div class="picker-step-label"><span class="step-num">01</span> Your sport</div>
            <div class="picker-options" role="group" aria-label="Choose your sport">
              <button
                v-for="s in sports" :key="s.id"
                class="picker-option"
                :class="{ active: selectedSport === s.id }"
                :aria-pressed="selectedSport === s.id"
                @click="selectedSport = s.id; ensureValidFormat()"
              >
                <span class="picker-emoji" aria-hidden="true">{{ s.emoji }}</span>
                <span>{{ s.name }}</span>
              </button>
            </div>
          </div>

          <div class="picker-step">
            <div class="picker-step-label"><span class="step-num">02</span> Your platform</div>
            <div class="picker-options" role="group" aria-label="Choose your platform">
              <button
                v-for="p in platforms" :key="p.id"
                class="picker-option picker-option-platform"
                :class="{ active: selectedPlatform === p.id }"
                :aria-pressed="selectedPlatform === p.id"
                @click="selectedPlatform = p.id"
              >
                <img :src="p.logo" :alt="p.name + ' logo'" class="platform-btn-logo" />
                <span>{{ p.name }}</span>
              </button>
            </div>
          </div>

          <div class="picker-step">
            <div class="picker-step-label"><span class="step-num">03</span> Your format</div>
            <div class="picker-options" role="group" aria-label="Choose your format">
              <button
                v-for="f in formats" :key="f"
                class="picker-option"
                :class="{ active: selectedFormat === f }"
                :aria-pressed="selectedFormat === f"
                @click="selectedFormat = f"
              >{{ f }}</button>
            </div>
          </div>
        </div>

        <div class="picker-preview">
          <div class="preview-badge-row">
            <img :src="activePlatform.logo" :alt="activePlatform.name + ' logo'" class="preview-platform-logo" />
            <span class="preview-badge">{{ activeSport.emoji }} {{ activeSport.name }} . {{ activePlatform.name }} . {{ selectedFormat }}</span>
          </div>

          <div class="preview-card">
            <div class="preview-header">
              <div class="preview-header-left">
                <img :src="activePlatform.logo" :alt="activePlatform.name + ' logo'" class="preview-header-logo" />
                <span class="preview-title">Standings</span>
              </div>
              <span class="preview-week">Week {{ currentWeek }}</span>
            </div>

            <div class="preview-thead" :class="selectedFormat === 'Categories' ? 'thead-cat' : 'thead-pts'">
              <span class="pth-rank">#</span>
              <span class="pth-team">Team</span>
              <span class="pth-rec">{{ selectedFormat === 'Categories' ? 'W-L-T' : 'W-L' }}</span>
              <template v-if="selectedFormat === 'Points'">
                <span class="pth-col">PF</span>
                <span class="pth-col">All-Play</span>
              </template>
              <template v-else>
                <span class="pth-col pth-cat" v-for="cat in activeCategoryColumns" :key="cat">{{ cat }}</span>
              </template>
            </div>

            <div
              v-for="(team, i) in previewTeams"
              :key="team.name"
              class="preview-rank-row"
              :class="[selectedFormat === 'Categories' ? 'row-cat' : 'row-pts', i === 0 ? 'row-first' : '']"
            >
              <span class="prev-rank" :class="i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''">{{ i + 1 }}</span>

              <div class="prev-team-cell">
                <span class="prev-avatar" :style="{ background: team.color }" aria-hidden="true">
                  {{ initials(team.name) }}
                </span>
                <span class="prev-name">{{ team.name }}</span>
              </div>

              <template v-if="selectedFormat === 'Points'">
                <span class="prev-record">{{ team.record }}</span>
                <span class="prev-pts">{{ team.pts }}</span>
                <span class="prev-allplay">{{ team.allPlay }}</span>
              </template>

              <template v-else>
                <span class="prev-record cat-rec">{{ team.catRecord }}</span>
                <span class="prev-cat" v-for="(cv, ci) in team.cats" :key="ci">{{ cv }}</span>
              </template>
            </div>
          </div>

          <button class="cta-primary mt-6" @click="$emit('open-signup')" :aria-label="`Connect my ${activePlatform.name} league for free`">
            Connect my {{ activePlatform.name }} league. Free.
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         SHARE-CARD MOMENT
    ══════════════════════════════════════════════ -->
    <section class="moment-section" aria-label="What Sunday night looks like with UFD">
      <div class="section-inner moment-inner">
        <div class="moment-copy">
          <div class="section-eyebrow eyebrow-tertiary">Sunday, 9:47pm</div>
          <h2 class="section-headline">Watch what happens<br/><span class="accent-tertiary">when you post it.</span></h2>
          <p class="section-sub">You hit share. The card lands in the chat. The league does the rest.</p>
          <button class="cta-primary moment-cta" @click="$emit('open-signup')" aria-label="Start posting these cards in your league">
            Start posting these.
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>

        <div class="moment-stage">
          <div class="moment-card-wrap">
            <div class="card-stack" role="img" aria-label="A stack of three share cards from Ultimate Fantasy Dashboard: weekly standings, matchup of the week, and draft grades.">
              <!-- Tag chips above the stack to label what's visible -->
              <div class="card-stack-chips" aria-hidden="true">
                <span class="cs-chip cs-chip-1">Standings</span>
                <span class="cs-chip cs-chip-2">Matchups</span>
                <span class="cs-chip cs-chip-3">Draft</span>
                <span class="cs-chip cs-chip-more">+ more</span>
              </div>

              <!-- Back-left: Draft Grades -->
              <div class="sc-card sc-mini-card sc-grades-card stack-back-left">
                <div class="sc-brand-row">
                  <span class="sc-brand-logo">UFD</span>
                  <span class="sc-brand-sport">Draft Grades</span>
                  <span class="sc-brand-week">2025</span>
                </div>
                <div class="sc-mini-title">Who actually won the draft</div>
                <div class="sc-grades-list">
                  <div v-for="(g, i) in draftGrades" :key="i" class="sc-grade-row">
                    <div class="sc-grade-avatar" :class="'gav-' + i" aria-hidden="true">{{ initials(g.name) }}</div>
                    <span class="sc-grade-team">{{ g.name }}</span>
                    <span class="sc-grade-letter" :class="'grade-' + g.tone">{{ g.grade }}</span>
                  </div>
                </div>
                <div class="sc-watermark">ultimatefantasydashboard.com</div>
              </div>

              <!-- Back-right: Matchup Preview -->
              <div class="sc-card sc-mini-card sc-matchup-card stack-back-right">
                <div class="sc-brand-row">
                  <span class="sc-brand-logo">UFD</span>
                  <span class="sc-brand-sport">Matchup</span>
                  <span class="sc-brand-week">WK 12</span>
                </div>
                <div class="sc-mini-title">Matchup of the Week</div>
                <div class="sc-mu-faceoff">
                  <div class="sc-mu-side">
                    <div class="sc-mu-avatar mu-left" aria-hidden="true">MM</div>
                    <div class="sc-mu-name">Mahomes Magic</div>
                    <div class="sc-mu-proj">142.8 proj</div>
                  </div>
                  <div class="sc-mu-vs">vs</div>
                  <div class="sc-mu-side">
                    <div class="sc-mu-avatar mu-right" aria-hidden="true">TA</div>
                    <div class="sc-mu-name">The Algorithm</div>
                    <div class="sc-mu-proj">139.4 proj</div>
                  </div>
                </div>
                <div class="sc-mu-prob">
                  <span>Win prob</span>
                  <div class="sc-mu-bar"><div class="sc-mu-bar-fill" style="--w: 54%"></div></div>
                  <span class="sc-mu-pct">54%</span>
                </div>
                <div class="sc-watermark">ultimatefantasydashboard.com</div>
              </div>

              <!-- Front card: Standings -->
              <div class="sc-card sc-standings-card moment-card stack-front">
                <div class="sc-brand-row">
                  <span class="sc-brand-logo">UFD</span>
                  <span class="sc-brand-sport">NFL Fantasy . PPR</span>
                  <span class="sc-brand-week">WK 11</span>
                </div>
                <div class="sc-standings-title">Standings</div>
                <div class="sc-standings-thead">
                  <span class="std-rank">#</span>
                  <span class="std-team">Team</span>
                  <span class="std-rec">W-L</span>
                  <span class="std-pf">PF</span>
                  <span class="std-streak">Streak</span>
                </div>
                <div v-for="(t, i) in momentStandings" :key="i" class="sc-standings-row" :class="[t.playoff ? 'std-playoff' : '', t.myTeam ? 'std-myteam' : '']">
                  <span class="std-rank-val" :class="i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : ''">
                    {{ i + 1 }}<span v-if="t.playoff" class="std-playoff-dot" aria-hidden="true">●</span>
                  </span>
                  <div class="std-team-cell">
                    <div class="std-avatar" :class="'stdav-' + i" aria-hidden="true">
                      {{ initials(t.name) }}
                      <div v-if="t.myTeam" class="std-my-star" aria-hidden="true">★</div>
                    </div>
                    <span class="std-name" :class="t.myTeam ? 'std-mine-name' : ''">{{ t.name }}</span>
                  </div>
                  <span class="std-rec-val">{{ t.wins }}-{{ t.losses }}</span>
                  <span class="std-pf-val">{{ t.pf }}</span>
                  <span class="std-streak-val" :class="t.streak.startsWith('W') ? 'str-w' : 'str-l'">{{ t.streak }}</span>
                </div>
                <div class="sc-watermark">ultimatefantasydashboard.com</div>
              </div>
            </div>
          </div>

          <div class="imessage-thread" role="img" aria-label="Group chat reactions to UFD cards being shared throughout the season">
            <div class="imsg-bubble imsg-out">
              <div class="imsg-attachment" aria-hidden="true">
                <span>Standings.png</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              </div>
            </div>
            <div class="imsg-row">
              <div class="imsg-bubble imsg-in">
                <div class="imsg-name">Mike</div>
                <div class="imsg-text">bro why am i in 5th</div>
              </div>
            </div>

            <div class="imsg-bubble imsg-out imsg-out-spaced">
              <div class="imsg-attachment" aria-hidden="true">
                <span>Matchup.png</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              </div>
            </div>
            <div class="imsg-row">
              <div class="imsg-bubble imsg-in">
                <div class="imsg-name">Jess</div>
                <div class="imsg-text">it's so over for him</div>
              </div>
            </div>

            <div class="imsg-bubble imsg-out imsg-out-spaced">
              <div class="imsg-attachment" aria-hidden="true">
                <span>DraftGrades.png</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              </div>
            </div>
            <div class="imsg-row">
              <div class="imsg-bubble imsg-in">
                <div class="imsg-name">Darnell</div>
                <div class="imsg-text">an F-? that's rude</div>
                <div class="imsg-reactions" aria-hidden="true"><span>😂 4</span></div>
              </div>
            </div>

            <div class="imsg-typing" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         FINAL CTA
    ══════════════════════════════════════════════ -->
    <section class="final-cta-section" aria-label="Connect your league">
      <div class="section-inner final-inner">
        <div class="section-eyebrow eyebrow-primary">Ready</div>
        <h2 class="final-headline">
          Your league is already<br/>talking about it.<br/>
          <span class="final-accent">Be the one who started it.</span>
        </h2>
        <button class="cta-primary cta-xl" @click="$emit('open-signup')" aria-label="Connect your league for free">
          Connect your league. Free.
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        <div class="final-trust">No credit card. Sleeper, Yahoo, ESPN. Setup in 3 minutes.</div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         FAQ
    ══════════════════════════════════════════════ -->
    <section class="faq-section" aria-label="Frequently asked questions about Ultimate Fantasy Dashboard">
      <div class="section-inner">
        <div class="section-eyebrow eyebrow-secondary">Questions</div>
        <h2 class="section-headline faq-headline">Got questions?<br/><span class="accent-secondary">We've got answers.</span></h2>
        <div class="faq-list faq-list-full">
          <div v-for="(faq, i) in faqs" :key="i" class="faq-item">
            <button
              class="faq-q"
              :aria-expanded="openFaq === i"
              :aria-controls="`faq-a-${i}`"
              @click="toggleFaq(i)"
            >
              <span>{{ faq.q }}</span>
              <span class="faq-arrow" :class="{ open: openFaq === i }" aria-hidden="true">›</span>
            </button>
            <div
              :id="`faq-a-${i}`"
              class="faq-a-wrap"
              :class="{ open: openFaq === i }"
              role="region"
            >
              <div class="faq-a">{{ faq.a }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer handled by AppFooter in App.vue -->

    <!-- Minimal legal bar for landing page -->
    <div class="legal-bar">
      <span class="legal-text">© {{ new Date().getFullYear() }} Ultimate Fantasy Dashboard</span>
      <router-link to="/pricing" class="legal-link">Pricing</router-link>
      <router-link to="/free-tools" class="legal-link">Free tools</router-link>
      <router-link to="/resources" class="legal-link">Resources</router-link>
      <router-link to="/privacy" class="legal-link">Privacy</router-link>
      <a href="mailto:support@ultimatefantasydashboard.com" class="legal-link">Contact</a>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

defineEmits<{ (e: 'open-signup'): void }>()

// ── Sport / Platform / Format Picker ────────────────────────────────────────
const sports = [
  { id: 'football',   name: 'Football',   emoji: '🏈' },
  { id: 'baseball',   name: 'Baseball',   emoji: '⚾' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀' },
  { id: 'hockey',     name: 'Hockey',     emoji: '🏒' },
]
const platforms = [
  { id: 'sleeper', name: 'Sleeper', logo: '/sleeper.svg' },
  { id: 'yahoo',   name: 'Yahoo',   logo: '/yahoo-fantasy.svg' },
  { id: 'espn',    name: 'ESPN',    logo: '/espn-logo.svg' },
]
const formats = ['Points', 'Categories']

const selectedSport    = ref('football')
const selectedPlatform = ref('sleeper')
const selectedFormat   = ref('Points')

const activeSport    = computed(() => sports.find(s => s.id === selectedSport.value)!)
const activePlatform = computed(() => platforms.find(p => p.id === selectedPlatform.value)!)
const currentWeek    = computed(() => selectedSport.value === 'baseball' ? 18 : selectedSport.value === 'football' ? 11 : 14)

function ensureValidFormat() { /* both formats work for all sports */ }

const categoryColumnsBySport: Record<string, string[]> = {
  football:   ['PTS', 'YDS', 'TD'],
  baseball:   ['HR',  'SB',  'ERA'],
  basketball: ['PTS', 'REB', 'AST'],
  hockey:     ['G',   'A',   'SOG'],
}
const activeCategoryColumns = computed(() => categoryColumnsBySport[selectedSport.value] ?? ['Cat1', 'Cat2', 'Cat3'])

type PreviewTeam = {
  name: string; color: string; record: string; pts: string; allPlay: string
  catRecord: string; cats: string[]
}
const previewData: Record<string, Record<string, PreviewTeam[]>> = {
  sleeper: {
    football: [
      { name: 'Mahomes Magic',   color: 'linear-gradient(135deg,oklch(0.78 0.18 92),oklch(0.65 0.16 72))', record: '9-2', pts: '1,456', allPlay: '7-4',  catRecord: '9-2-0', cats: ['8-3', '7-4', '9-2'] },
      { name: 'Trash Can Wins',  color: 'linear-gradient(135deg,oklch(0.72 0.16 160),oklch(0.6 0.14 160))', record: '8-3', pts: '1,342', allPlay: '8-3',  catRecord: '8-3-0', cats: ['7-4', '8-3', '6-5'] },
      { name: 'The Algorithm',   color: 'linear-gradient(135deg,oklch(0.62 0.2 280),oklch(0.5 0.2 280))',  record: '7-4', pts: '1,298', allPlay: '6-5',  catRecord: '7-3-1', cats: ['5-6', '7-4', '8-3'] },
      { name: 'Waiver Wire Kid', color: 'linear-gradient(135deg,oklch(0.66 0.22 30),oklch(0.55 0.2 30))', record: '6-5', pts: '1,187', allPlay: '5-6',  catRecord: '6-4-1', cats: ['6-5', '5-6', '4-7'] },
      { name: 'Toilet Bowl FC',  color: 'linear-gradient(135deg,oklch(0.55 0.02 270),oklch(0.42 0.02 270))', record: '3-8', pts: '982',   allPlay: '2-9',  catRecord: '3-8-0', cats: ['2-9', '3-8', '2-9'] },
    ],
    baseball: [
      { name: 'Dingers Only',        color: 'linear-gradient(135deg,oklch(0.78 0.18 92),oklch(0.65 0.16 72))', record: '9-1',  pts: '87.5', allPlay: '8-2',  catRecord: '9-1-0', cats: ['9-1', '7-3', '6-4'] },
      { name: 'ERA Zero',            color: 'linear-gradient(135deg,oklch(0.72 0.18 195),oklch(0.6 0.16 195))', record: '7-3',  pts: '82.0', allPlay: '7-3',  catRecord: '7-3-0', cats: ['5-5', '8-2', '9-1'] },
      { name: 'Steals and Deals',    color: 'linear-gradient(135deg,oklch(0.72 0.16 160),oklch(0.6 0.14 160))', record: '6-4',  pts: '78.5', allPlay: '5-5',  catRecord: '6-4-0', cats: ['7-3', '6-4', '4-6'] },
      { name: 'K-Rate Kings',        color: 'linear-gradient(135deg,oklch(0.62 0.2 290),oklch(0.5 0.2 290))',  record: '5-5',  pts: '73.0', allPlay: '4-6',  catRecord: '5-5-0', cats: ['4-6', '5-5', '7-3'] },
      { name: 'Sub-.35 ERA or Bust', color: 'linear-gradient(135deg,oklch(0.55 0.02 270),oklch(0.42 0.02 270))', record: '2-8',  pts: '58.5', allPlay: '2-8',  catRecord: '2-8-0', cats: ['2-8', '2-8', '3-7'] },
    ],
    basketball: [
      { name: 'Triple Double',   color: 'linear-gradient(135deg,oklch(0.78 0.18 92),oklch(0.65 0.16 72))', record: '9-3',  pts: '1,234', allPlay: '9-3',  catRecord: '9-3-0', cats: ['8-4', '9-3', '7-5'] },
      { name: 'Giannis Mode',    color: 'linear-gradient(135deg,oklch(0.66 0.22 30),oklch(0.55 0.2 30))', record: '8-4',  pts: '1,189', allPlay: '8-4',  catRecord: '8-4-0', cats: ['7-5', '8-4', '9-3'] },
      { name: 'Points Only',     color: 'linear-gradient(135deg,oklch(0.62 0.2 280),oklch(0.5 0.2 280))',  record: '7-5',  pts: '1,102', allPlay: '6-6',  catRecord: '7-5-0', cats: ['9-3', '6-6', '5-7'] },
      { name: 'Bench Warmers',   color: 'linear-gradient(135deg,oklch(0.72 0.16 160),oklch(0.6 0.14 160))', record: '6-6',  pts: '1,041', allPlay: '5-7',  catRecord: '6-6-0', cats: ['5-7', '7-5', '6-6'] },
      { name: 'Box Score Fraud', color: 'linear-gradient(135deg,oklch(0.55 0.02 270),oklch(0.42 0.02 270))', record: '4-8',  pts: '891',   allPlay: '3-9',  catRecord: '4-8-0', cats: ['4-8', '3-9', '4-8'] },
    ],
    hockey: [
      { name: 'Save % Kings',   color: 'linear-gradient(135deg,oklch(0.78 0.18 92),oklch(0.65 0.16 72))', record: '10-2', pts: '1,567', allPlay: '9-3',  catRecord: '10-2-0', cats: ['8-4', '9-3', '10-2'] },
      { name: 'Hat Trick City', color: 'linear-gradient(135deg,oklch(0.72 0.18 195),oklch(0.6 0.16 195))', record: '8-4',  pts: '1,423', allPlay: '8-4',  catRecord: '8-3-1',  cats: ['9-3', '7-5', '8-4'] },
      { name: 'Power Play FC',  color: 'linear-gradient(135deg,oklch(0.62 0.2 290),oklch(0.5 0.2 290))',  record: '7-5',  pts: '1,312', allPlay: '6-6',  catRecord: '7-5-0',  cats: ['7-5', '8-4', '6-6'] },
      { name: 'Empty Net Bros', color: 'linear-gradient(135deg,oklch(0.72 0.16 160),oklch(0.6 0.14 160))', record: '5-7',  pts: '1,189', allPlay: '5-7',  catRecord: '5-6-1',  cats: ['5-7', '5-7', '7-5'] },
      { name: 'Penalty Box FC', color: 'linear-gradient(135deg,oklch(0.55 0.02 270),oklch(0.42 0.02 270))', record: '3-9',  pts: '978',   allPlay: '2-10', catRecord: '3-9-0',  cats: ['3-9', '3-9', '2-10'] },
    ],
  },
  yahoo: {
    football: [
      { name: 'Fantasy Felons',    color: 'linear-gradient(135deg,oklch(0.55 0.22 290),oklch(0.45 0.2 290))', record: '10-1', pts: '1,512', allPlay: '8-3',  catRecord: '10-1-0', cats: ['9-2', '8-3', '10-1'] },
      { name: 'Sunday Funday',     color: 'linear-gradient(135deg,oklch(0.7 0.18 50),oklch(0.58 0.16 50))', record: '8-3',  pts: '1,398', allPlay: '7-4',  catRecord: '8-3-0',  cats: ['7-4', '8-3', '7-4'] },
      { name: 'Touch Down Town',   color: 'linear-gradient(135deg,oklch(0.72 0.18 195),oklch(0.6 0.16 195))', record: '7-4',  pts: '1,276', allPlay: '6-5',  catRecord: '7-4-0',  cats: ['6-5', '7-4', '8-3'] },
      { name: 'No Kickers Needed', color: 'linear-gradient(135deg,oklch(0.72 0.16 160),oklch(0.6 0.14 160))', record: '5-6',  pts: '1,144', allPlay: '5-6',  catRecord: '5-6-0',  cats: ['5-6', '4-7', '5-6'] },
      { name: 'IR\'d Out',         color: 'linear-gradient(135deg,oklch(0.55 0.02 270),oklch(0.42 0.02 270))', record: '2-9',  pts: '901',   allPlay: '1-10', catRecord: '2-9-0',  cats: ['2-9', '2-9', '1-10'] },
    ],
    baseball: [
      { name: 'Diamond Dogs',     color: 'linear-gradient(135deg,oklch(0.55 0.22 290),oklch(0.45 0.2 290))', record: '8-2',  pts: '91.0', allPlay: '8-2',  catRecord: '8-2-0', cats: ['8-2', '7-3', '9-1'] },
      { name: 'Swing Kings',      color: 'linear-gradient(135deg,oklch(0.7 0.18 50),oklch(0.58 0.16 50))', record: '7-3',  pts: '84.5', allPlay: '6-4',  catRecord: '7-3-0', cats: ['6-4', '8-2', '7-3'] },
      { name: 'Launch Angle Lab', color: 'linear-gradient(135deg,oklch(0.72 0.18 195),oklch(0.6 0.16 195))', record: '5-5',  pts: '76.0', allPlay: '5-5',  catRecord: '5-5-0', cats: ['5-5', '4-6', '6-4'] },
      { name: 'Bullpen Burners',  color: 'linear-gradient(135deg,oklch(0.72 0.16 160),oklch(0.6 0.14 160))', record: '4-6',  pts: '69.0', allPlay: '4-6',  catRecord: '4-6-0', cats: ['4-6', '5-5', '4-6'] },
      { name: 'WHIP It Good',     color: 'linear-gradient(135deg,oklch(0.55 0.02 270),oklch(0.42 0.02 270))', record: '1-9',  pts: '54.0', allPlay: '2-8',  catRecord: '1-9-0', cats: ['2-8', '1-9', '1-9'] },
    ],
    basketball: [
      { name: 'Dunk Tank',       color: 'linear-gradient(135deg,oklch(0.55 0.22 290),oklch(0.45 0.2 290))', record: '10-2', pts: '1,301', allPlay: '9-3',  catRecord: '10-2-0', cats: ['10-2', '9-3', '8-4'] },
      { name: 'Mid-Range Mafia', color: 'linear-gradient(135deg,oklch(0.7 0.18 50),oklch(0.58 0.16 50))', record: '8-4',  pts: '1,198', allPlay: '8-4',  catRecord: '8-4-0',  cats: ['8-4', '8-4', '9-3'] },
      { name: 'Steal Happy',     color: 'linear-gradient(135deg,oklch(0.72 0.18 195),oklch(0.6 0.16 195))', record: '7-5',  pts: '1,089', allPlay: '6-6',  catRecord: '7-5-0',  cats: ['7-5', '6-6', '7-5'] },
      { name: 'FG% or Bust',     color: 'linear-gradient(135deg,oklch(0.72 0.16 160),oklch(0.6 0.14 160))', record: '5-7',  pts: '987',   allPlay: '5-7',  catRecord: '5-7-0',  cats: ['5-7', '7-5', '4-8'] },
      { name: 'Benchland',       color: 'linear-gradient(135deg,oklch(0.55 0.02 270),oklch(0.42 0.02 270))', record: '3-9',  pts: '876',   allPlay: '3-9',  catRecord: '3-9-0',  cats: ['3-9', '2-10', '4-8'] },
    ],
    hockey: [
      { name: 'Five Hole FC',   color: 'linear-gradient(135deg,oklch(0.55 0.22 290),oklch(0.45 0.2 290))', record: '9-3',  pts: '1,498', allPlay: '9-3',  catRecord: '9-3-0',  cats: ['9-3', '8-4', '9-3'] },
      { name: 'Zamboni Riders', color: 'linear-gradient(135deg,oklch(0.7 0.18 50),oklch(0.58 0.16 50))', record: '8-4',  pts: '1,345', allPlay: '7-5',  catRecord: '8-4-0',  cats: ['8-4', '9-3', '7-5'] },
      { name: 'Breakaway Boys', color: 'linear-gradient(135deg,oklch(0.72 0.18 195),oklch(0.6 0.16 195))', record: '6-6',  pts: '1,201', allPlay: '6-6',  catRecord: '6-6-0',  cats: ['6-6', '6-6', '8-4'] },
      { name: 'PP Specialists', color: 'linear-gradient(135deg,oklch(0.72 0.16 160),oklch(0.6 0.14 160))', record: '5-7',  pts: '1,089', allPlay: '5-7',  catRecord: '5-6-1',  cats: ['5-7', '5-7', '6-6'] },
      { name: 'Icing All Day',  color: 'linear-gradient(135deg,oklch(0.55 0.02 270),oklch(0.42 0.02 270))', record: '2-10', pts: '912',   allPlay: '2-10', catRecord: '2-10-0', cats: ['2-10', '3-9', '2-10'] },
    ],
  },
  espn: {
    football: [
      { name: 'Gronk Spike FC',    color: 'linear-gradient(135deg,oklch(0.6 0.22 15),oklch(0.5 0.2 15))', record: '9-2', pts: '1,487', allPlay: '8-3',  catRecord: '9-2-0', cats: ['8-3', '9-2', '7-4'] },
      { name: 'Scoreboard Watch',  color: 'linear-gradient(135deg,oklch(0.7 0.18 50),oklch(0.58 0.16 50))', record: '8-3', pts: '1,361', allPlay: '7-4',  catRecord: '8-3-0', cats: ['7-4', '7-4', '9-2'] },
      { name: 'Commissioner Veto', color: 'linear-gradient(135deg,oklch(0.62 0.2 320),oklch(0.5 0.2 320))', record: '6-5', pts: '1,241', allPlay: '6-5',  catRecord: '6-5-0', cats: ['6-5', '6-5', '6-5'] },
      { name: 'Garbage Time Guru', color: 'linear-gradient(135deg,oklch(0.65 0.18 230),oklch(0.5 0.18 230))', record: '5-6', pts: '1,129', allPlay: '4-7',  catRecord: '5-6-0', cats: ['4-7', '5-6', '5-6'] },
      { name: 'Punt the Season',   color: 'linear-gradient(135deg,oklch(0.55 0.02 270),oklch(0.42 0.02 270))', record: '2-9', pts: '944',   allPlay: '2-9',  catRecord: '2-9-0', cats: ['2-9', '2-9', '3-8'] },
    ],
    baseball: [
      { name: 'Clutch Factor',    color: 'linear-gradient(135deg,oklch(0.6 0.22 15),oklch(0.5 0.2 15))', record: '8-2',  pts: '89.0', allPlay: '7-3',  catRecord: '8-2-0', cats: ['7-3', '9-1', '8-2'] },
      { name: 'Exit Velocity FC', color: 'linear-gradient(135deg,oklch(0.7 0.18 50),oklch(0.58 0.16 50))', record: '7-3',  pts: '83.0', allPlay: '7-3',  catRecord: '7-3-0', cats: ['8-2', '6-4', '7-3'] },
      { name: 'OPS Kings',        color: 'linear-gradient(135deg,oklch(0.62 0.2 320),oklch(0.5 0.2 320))', record: '5-5',  pts: '74.5', allPlay: '5-5',  catRecord: '5-5-0', cats: ['5-5', '5-5', '5-5'] },
      { name: 'Five Tool Bros',   color: 'linear-gradient(135deg,oklch(0.65 0.18 230),oklch(0.5 0.18 230))', record: '4-6',  pts: '67.0', allPlay: '4-6',  catRecord: '4-6-0', cats: ['3-7', '4-6', '4-6'] },
      { name: 'BABIP Believers',  color: 'linear-gradient(135deg,oklch(0.55 0.02 270),oklch(0.42 0.02 270))', record: '1-9',  pts: '51.0', allPlay: '1-9',  catRecord: '1-9-0', cats: ['2-8', '1-9', '1-9'] },
    ],
    basketball: [
      { name: 'Zion Mode',          color: 'linear-gradient(135deg,oklch(0.6 0.22 15),oklch(0.5 0.2 15))', record: '9-3',  pts: '1,289', allPlay: '10-2', catRecord: '9-3-0',  cats: ['10-2', '9-3', '8-4'] },
      { name: 'Three Point Land',   color: 'linear-gradient(135deg,oklch(0.7 0.18 50),oklch(0.58 0.16 50))', record: '8-4',  pts: '1,201', allPlay: '7-5',  catRecord: '8-4-0',  cats: ['8-4', '7-5', '9-3'] },
      { name: 'Lottery Pick FC',    color: 'linear-gradient(135deg,oklch(0.62 0.2 320),oklch(0.5 0.2 320))', record: '7-5',  pts: '1,099', allPlay: '6-6',  catRecord: '7-5-0',  cats: ['6-6', '8-4', '7-5'] },
      { name: 'Trade Deadline All', color: 'linear-gradient(135deg,oklch(0.65 0.18 230),oklch(0.5 0.18 230))', record: '5-7',  pts: '982',   allPlay: '5-7',  catRecord: '5-7-0',  cats: ['5-7', '6-6', '5-7'] },
      { name: 'DNP Status',         color: 'linear-gradient(135deg,oklch(0.55 0.02 270),oklch(0.42 0.02 270))', record: '3-9',  pts: '844',   allPlay: '2-10', catRecord: '3-9-0',  cats: ['3-9', '2-10', '3-9'] },
    ],
    hockey: [
      { name: 'Brodeur\'s Legacy', color: 'linear-gradient(135deg,oklch(0.6 0.22 15),oklch(0.5 0.2 15))', record: '10-2', pts: '1,612', allPlay: '10-2', catRecord: '10-2-0', cats: ['10-2', '9-3', '10-2'] },
      { name: 'Slap Shot Kings',   color: 'linear-gradient(135deg,oklch(0.7 0.18 50),oklch(0.58 0.16 50))', record: '8-4',  pts: '1,401', allPlay: '8-4',  catRecord: '8-4-0',  cats: ['8-4', '8-4', '8-4'] },
      { name: 'PPG All Day',       color: 'linear-gradient(135deg,oklch(0.62 0.2 320),oklch(0.5 0.2 320))', record: '7-5',  pts: '1,287', allPlay: '7-5',  catRecord: '7-4-1',  cats: ['7-5', '7-5', '6-6'] },
      { name: 'Enforcers Only',    color: 'linear-gradient(135deg,oklch(0.65 0.18 230),oklch(0.5 0.18 230))', record: '5-7',  pts: '1,102', allPlay: '5-7',  catRecord: '5-7-0',  cats: ['5-7', '5-7', '6-6'] },
      { name: 'Offsides Again',    color: 'linear-gradient(135deg,oklch(0.55 0.02 270),oklch(0.42 0.02 270))', record: '2-10', pts: '934',   allPlay: '2-10', catRecord: '2-10-0', cats: ['2-10', '3-9', '2-10'] },
    ],
  },
}

const previewTeams = computed<PreviewTeam[]>(() =>
  previewData[selectedPlatform.value]?.[selectedSport.value] ?? previewData.sleeper.football
)

// ── Hero card (static composition) ─────────────────────────────────────────
const heroCardTeams = [
  { name: 'Mahomes Magic',   score: 92, trend: 2,  pscore: '87.4', record: '9-2' },
  { name: 'Trash Can Wins',  score: 78, trend: -1, pscore: '74.1', record: '8-3' },
  { name: 'The Algorithm',   score: 66, trend:  0, pscore: '68.9', record: '7-4' },
  { name: 'Waiver Wire Kid', score: 55, trend:  1, pscore: '61.2', record: '6-5' },
  { name: 'Toilet Bowl FC',  score: 38, trend: -2, pscore: '44.8', record: '3-8' },
]

// ── Share-card moment standings ────────────────────────────────────────────
const momentStandings = [
  { name: 'Mahomes Magic',  wins: 9, losses: 2, pf: '1,456', streak: 'W3', playoff: true,  myTeam: true  },
  { name: 'Trash Can Wins', wins: 8, losses: 3, pf: '1,342', streak: 'W2', playoff: true,  myTeam: false },
  { name: 'The Algorithm',  wins: 7, losses: 4, pf: '1,298', streak: 'L1', playoff: true,  myTeam: false },
  { name: 'Waiver Wire Kid',wins: 6, losses: 5, pf: '1,187', streak: 'W1', playoff: false, myTeam: false },
  { name: 'Bench Boss',     wins: 5, losses: 6, pf: '1,102', streak: 'L2', playoff: false, myTeam: false },
  { name: 'Toilet Bowl FC', wins: 3, losses: 8, pf: '982',   streak: 'L4', playoff: false, myTeam: false },
]

// ── Draft Grades card (mini) ──────────────────────────────────────────────
const draftGrades = [
  { name: 'Mahomes Magic',   grade: 'A+', tone: 'a' },
  { name: 'The Algorithm',   grade: 'A-', tone: 'a' },
  { name: 'Waiver Wire Kid', grade: 'B+', tone: 'b' },
  { name: 'Toilet Bowl FC',  grade: 'F-', tone: 'f' },
]

// ── FAQ ────────────────────────────────────────────────────────────────────
const openFaq = ref<number | null>(null)
const faqs = [
  {
    q: 'Does it work with my existing Sleeper / Yahoo / ESPN league?',
    a: "Yes. Just paste your league link or connect your account. We support all three platforms across football, baseball, basketball, and hockey. No setup required on your league end.",
  },
  {
    q: 'Do all my league mates need to sign up?',
    a: 'Nope. Only the person connecting the league needs an account. You can share cards and recaps with your whole league without them needing to log in.',
  },
  {
    q: 'How do I share the cards?',
    a: "Every card has a Share button. Hit it, and the card gets copied to your clipboard as an image. Paste it straight into your league group chat. That's it.",
  },
  {
    q: 'Will it ruin the trash talk?',
    a: "No. It feeds it. When Mahomes Magic drops a power rankings card showing they've been number one for six straight weeks, the group chat writes itself.",
  },
  {
    q: 'Is this just for commissioners?',
    a: "Not even close. It's built by fantasy managers, for fantasy managers. If you care about knowing your league better, clowning on your friends with data, or just seeing your stats go back years, this is for you.",
  },
  {
    q: 'How current is the data?',
    a: 'Standings, matchup scores, and rosters update throughout the week. Power rankings and weekly recaps generate automatically after each week locks.',
  },
  {
    q: 'Can I connect multiple leagues?',
    a: 'Yes. You can connect leagues across different platforms and sports in the same dashboard. Manage your dynasty, redraft, and keeper all in one place.',
  },
]

function toggleFaq(i: number) {
  openFaq.value = openFaq.value === i ? null : i
}

// ── Utils ──────────────────────────────────────────────────────────────────
function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2)
}

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' })
}
</script>

<style scoped>
/* ── Fonts ─────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&display=swap');

/* ── Tokens ────────────────────────────────────────────────────── */
.landing-root {
  /* Neutrals tinted warm toward brand hue (no pure black/white) */
  --ink-1: oklch(0.97 0.005 90);   /* near-white, off-warm */
  --ink-2: oklch(0.86 0.008 90);   /* light text */
  --ink-3: oklch(0.66 0.010 90);   /* muted text */
  --ink-3-soft: oklch(0.55 0.010 90);
  --ink-4: oklch(0.36 0.012 90);   /* dim text / borders */
  --ink-5: oklch(0.25 0.015 90);   /* dark surface */
  --ink-6: oklch(0.18 0.015 90);   /* deeper surface */
  --ink-7: oklch(0.14 0.018 90);   /* near-black bg, warm tinted */
  --ink-8: oklch(0.10 0.018 90);   /* deepest bg */

  /* Brand */
  --accent-primary: oklch(0.78 0.18 92);    /* yellow. CTA + my-team only */
  --accent-primary-soft: oklch(0.78 0.18 92 / 0.14);
  --accent-primary-faint: oklch(0.78 0.18 92 / 0.06);
  --accent-primary-border: oklch(0.78 0.18 92 / 0.35);
  --accent-secondary: oklch(0.70 0.27 350);  /* magenta-pink */
  --accent-secondary-soft: oklch(0.70 0.27 350 / 0.14);
  --accent-secondary-border: oklch(0.70 0.27 350 / 0.35);
  --accent-tertiary: oklch(0.72 0.18 195);   /* teal */
  --accent-tertiary-soft: oklch(0.72 0.18 195 / 0.14);
  --accent-tertiary-border: oklch(0.72 0.18 195 / 0.35);

  /* Signals */
  --signal-pos: oklch(0.72 0.16 160);
  --signal-neg: oklch(0.63 0.22 25);

  /* iMessage greys (slightly warm) */
  --imsg-grey: oklch(0.32 0.008 270);
  --imsg-grey-2: oklch(0.42 0.008 270);
}

/* ── Root ──────────────────────────────────────────────────────── */
.landing-root {
  font-family: 'Barlow', sans-serif;
  background: var(--ink-8);
  color: var(--ink-2);
  overflow-x: hidden;
}

/* ── Shared section styles ─────────────────────────────────────── */
.section-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}
.section-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-primary);
  margin-bottom: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.eyebrow-primary   { color: var(--accent-primary); }
.eyebrow-secondary { color: var(--accent-secondary); }
.eyebrow-tertiary  { color: var(--accent-tertiary); }
.section-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 900;
  line-height: 1.05;
  color: var(--ink-1);
  margin-bottom: 16px;
  max-width: 22ch;
}
.section-sub {
  font-size: 1.05rem;
  color: var(--ink-3);
  margin-bottom: 40px;
  max-width: 65ch;
  line-height: 1.55;
}
.accent           { color: var(--accent-primary); }
.accent-secondary { color: var(--accent-secondary); }
.accent-tertiary  { color: var(--accent-tertiary); }

/* ── CTAs ──────────────────────────────────────────────────────── */
.cta-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: var(--accent-primary);
  color: var(--ink-8);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  text-decoration: none;
}
.cta-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 14px 22px;
  background: transparent;
  color: var(--ink-2);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  border: 1px solid var(--ink-5);
  border-radius: 10px;
  cursor: pointer;
  text-decoration: none;
}
.cta-xl { padding: 18px 40px; font-size: 1.25rem; }
.mt-6 { margin-top: 24px; }

/* Hover & focus (motion-aware) */
@media (prefers-reduced-motion: no-preference) {
  .cta-primary { transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), background 0.18s, box-shadow 0.18s; }
  .cta-primary:hover { background: oklch(0.84 0.18 92); transform: translateY(-2px); box-shadow: 0 12px 36px oklch(0.78 0.18 92 / 0.28); }
  .cta-ghost { transition: color 0.18s, border-color 0.18s, background 0.18s; }
  .cta-ghost:hover { color: var(--ink-1); border-color: var(--ink-4); background: oklch(0.18 0.015 90 / 0.6); }
}
.cta-primary:focus-visible,
.cta-ghost:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 3px;
}

/* ══════════════════════════════════════════════
   HERO
══════════════════════════════════════════════ */
.hero-section {
  position: relative;
  padding: 96px 0 64px;
  overflow: hidden;
}
.hero-inner {
  position: relative;
  z-index: 2;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
  text-align: center;
}
.hero-logo-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 28px;
}
.hero-logo {
  height: 72px;
  width: auto;
  object-fit: contain;
  opacity: 1;
}
@media (max-width: 720px) {
  .hero-logo { height: 56px; }
}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 22px;
  padding: 6px 14px;
  border: 1px solid var(--ink-5);
  border-radius: 999px;
  background: oklch(0.18 0.015 90 / 0.5);
}
.eyebrow-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent-primary);
  box-shadow: 0 0 12px var(--accent-primary);
}

.hero-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 900;
  line-height: 0.95;
  color: var(--ink-1);
  text-transform: uppercase;
  letter-spacing: -0.015em;
  margin: 0 auto 22px;
  max-width: 18ch;
}
.headline-line { display: block; }
.headline-strike {
  color: var(--ink-4);
  text-decoration: line-through;
  text-decoration-thickness: 3px;
  text-decoration-color: var(--accent-secondary);
  margin-right: 0.2em;
}
.headline-final {
  display: block;
  color: var(--accent-primary);
}

.hero-sub {
  font-size: 1.15rem;
  color: var(--ink-3);
  max-width: 56ch;
  margin: 0 auto 32px;
  line-height: 1.6;
}

.hero-ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 72px;
}

/* Hero stage: card + handwritten caption */
.hero-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 36px;
  max-width: 880px;
  margin: 0 auto;
}
.hero-stage-card {
  width: 100%;
  max-width: 520px;
  position: relative;
}
.hero-stage-card::before {
  content: "";
  position: absolute;
  inset: -28px -28px -32px -28px;
  background: radial-gradient(ellipse at 50% 50%, oklch(0.78 0.18 92 / 0.10), transparent 65%);
  pointer-events: none;
  z-index: -1;
}
.hero-stage-caption {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  max-width: 180px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink-3);
  letter-spacing: 0.02em;
  line-height: 1.3;
  text-align: left;
}
.caption-arrow {
  color: var(--accent-secondary);
  opacity: 0.6;
}

/* ══════════════════════════════════════════════
   PICKER SECTION
══════════════════════════════════════════════ */
.picker-section {
  padding: 100px 0 80px;
  background: linear-gradient(180deg, var(--ink-8) 0%, var(--ink-7) 50%, var(--ink-8) 100%);
}
.picker-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  margin-bottom: 40px;
}
.picker-step-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 12px;
}
.step-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 900;
  color: var(--accent-secondary);
  border: 1px solid var(--accent-secondary-border);
  padding: 1px 6px;
  border-radius: 4px;
}
.picker-options { display: flex; flex-wrap: wrap; gap: 8px; }
.picker-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  background: transparent;
  border: 1px solid var(--ink-5);
  border-radius: 10px;
  color: var(--ink-3);
  font-family: 'Barlow', sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}
.picker-option:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: no-preference) {
  .picker-option { transition: border-color 0.15s, color 0.15s, background 0.15s; }
  .picker-option:hover { border-color: var(--ink-4); color: var(--ink-2); }
  .platform-btn-logo { transition: filter 0.15s; }
}
.picker-option.active {
  background: var(--accent-secondary-soft);
  border-color: var(--accent-secondary-border);
  color: var(--accent-secondary);
}
.picker-emoji { font-size: 1rem; }

.picker-option-platform { gap: 8px; }
.platform-btn-logo {
  width: 18px; height: 18px;
  object-fit: contain; flex-shrink: 0;
  filter: grayscale(1) brightness(0.7);
}
.picker-option.active .platform-btn-logo { filter: none; }
.picker-option:hover .platform-btn-logo  { filter: grayscale(0.3) brightness(0.85); }

.picker-preview { text-align: center; }
.preview-badge-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  background: var(--accent-secondary-soft);
  border: 1px solid var(--accent-secondary-border);
  border-radius: 999px;
  margin-bottom: 20px;
}
.preview-platform-logo { width: 18px; height: 18px; object-fit: contain; flex-shrink: 0; }
.preview-badge { font-size: 0.8rem; color: var(--accent-secondary); font-weight: 600; }

.preview-card {
  background: linear-gradient(135deg, oklch(0.16 0.015 90 / 0.98), oklch(0.12 0.018 90 / 0.98));
  border: 1px solid var(--ink-5);
  border-radius: 16px;
  overflow: hidden;
  max-width: 680px;
  margin: 0 auto;
}
.preview-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--ink-5);
}
.preview-header-left { display: flex; align-items: center; gap: 8px; }
.preview-header-logo { width: 22px; height: 22px; object-fit: contain; flex-shrink: 0; }
.preview-title {
  font-family: 'Barlow', sans-serif;
  font-size: 0.92rem; font-weight: 700; color: var(--ink-2);
}
.preview-week { font-size: 0.75rem; color: var(--ink-3-soft); }

.preview-thead {
  display: grid;
  align-items: center;
  gap: 8px;
  padding: 7px 20px;
  border-bottom: 1px solid var(--ink-6);
  font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--ink-4);
}
.thead-pts { grid-template-columns: 24px 1fr 52px 64px 64px; }
.thead-cat { grid-template-columns: 24px 1fr 56px 48px 48px 48px; }
.pth-rank  { text-align: right; }
.pth-team  { text-align: left; }
.pth-rec, .pth-col { text-align: center; }
.pth-cat   { color: var(--ink-4); }

.preview-rank-row {
  display: grid;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  border-bottom: 1px solid var(--ink-6);
}
.preview-rank-row:last-of-type { border-bottom: none; }
.row-pts { grid-template-columns: 24px 1fr 52px 64px 64px; }
.row-cat { grid-template-columns: 24px 1fr 56px 48px 48px 48px; }
.row-first { background: var(--accent-primary-faint); }

.prev-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.95rem; color: var(--ink-4); text-align: right;
}
.prev-rank.gold   { color: var(--accent-primary); }
.prev-rank.silver { color: var(--ink-3); }
.prev-rank.bronze { color: oklch(0.55 0.12 60); }

.prev-team-cell { display: flex; align-items: center; gap: 8px; min-width: 0; }
.prev-avatar {
  width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.55rem; font-weight: 700; color: var(--ink-1);
  border: 1.5px solid oklch(0.97 0.005 90 / 0.1);
}
.prev-name { font-size: 0.84rem; color: var(--ink-2); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prev-record, .prev-pts {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.8rem; font-weight: 700; color: var(--ink-3); text-align: center;
}
.prev-record.cat-rec { font-size: 0.72rem; }
.prev-allplay, .prev-cat {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; color: var(--ink-3-soft); text-align: center; font-weight: 700;
}
.row-first .prev-cat { color: var(--ink-2); }
.row-first .prev-record { color: var(--ink-1); }
.row-first .prev-pts { color: var(--accent-primary); }

/* ══════════════════════════════════════════════
   SHARE CARDS . authentic UFD output style (used in hero + moment)
══════════════════════════════════════════════ */
.sc-card {
  border-radius: 14px;
  overflow: hidden;
  position: relative;
  font-family: 'Barlow', sans-serif;
  box-shadow: 0 32px 80px -20px oklch(0.05 0.018 90 / 0.7);
}

.sc-brand-row {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 18px 10px;
  border-bottom: 1px solid oklch(0.97 0.005 90 / 0.05);
}
.sc-brand-logo {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem; font-weight: 900;
  color: var(--accent-primary);
  letter-spacing: 0.08em;
  background: var(--accent-primary-soft);
  border: 1px solid var(--accent-primary-border);
  border-radius: 4px;
  padding: 2px 6px;
}
.sc-brand-sport { font-size: 0.68rem; font-weight: 600; color: var(--ink-3-soft); flex: 1; }
.sc-brand-week  { font-size: 0.62rem; color: var(--ink-4); font-weight: 700; letter-spacing: 0.08em; }
.sc-watermark   { font-size: 0.55rem; color: var(--ink-5); font-weight: 500; padding: 6px 18px; font-family: 'Barlow', sans-serif; }

/* ─ Power Rankings card */
.sc-pr-card {
  background: linear-gradient(145deg, var(--ink-7) 0%, var(--ink-6) 100%);
  border: 1px solid var(--accent-primary-border);
}
.sc-pr-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 12px 18px 4px;
  gap: 12px;
  flex-wrap: wrap;
}
.sc-pr-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.05rem; font-weight: 900; letter-spacing: 0.04em;
  color: var(--ink-1); text-transform: uppercase;
}
.sc-pr-legend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.legend-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.legend-mm  { background: var(--accent-primary);   box-shadow: 0 0 4px oklch(0.78 0.18 92 / 0.6); }
.legend-tc  { background: oklch(0.70 0.18 145); }
.legend-ta  { background: oklch(0.62 0.20 280); }
.legend-wwk { background: oklch(0.66 0.22 30); }
.legend-tbf { background: oklch(0.55 0.02 270); }
.legend-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-4);
  margin-left: 5px;
}

.sc-brand-mover {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--accent-primary);
  background: var(--accent-primary-soft);
  padding: 2px 6px 2px 5px;
  border-radius: 4px;
  border: 1px solid var(--accent-primary-border);
  text-transform: uppercase;
}

/* Bump chart */
.sc-pr-chart-wrap {
  padding: 2px 18px 6px;
  position: relative;
}
.sc-pr-chart {
  width: 100%;
  height: 68px;
  display: block;
  overflow: visible;
}
.sc-pr-chart-grid line {
  stroke: oklch(0.97 0.005 90 / 0.05);
  stroke-width: 1;
  stroke-dasharray: 2 3;
}
.sc-pr-line {
  fill: none;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.6;
  vector-effect: non-scaling-stroke;
}
.sc-pr-line.line-mm {
  stroke: var(--accent-primary);
  stroke-width: 2.2;
  opacity: 1;
  filter: drop-shadow(0 0 4px oklch(0.78 0.18 92 / 0.45));
}
.sc-pr-line.line-tc  { stroke: oklch(0.70 0.18 145); opacity: 0.75; }
.sc-pr-line.line-ta  { stroke: oklch(0.62 0.20 280); opacity: 0.65; }
.sc-pr-line.line-wwk { stroke: oklch(0.66 0.22 30);  opacity: 0.7; }
.sc-pr-line.line-tbf { stroke: oklch(0.55 0.02 270); opacity: 0.55; }

.sc-pr-dot {
  stroke: oklch(0.10 0.012 90);
  stroke-width: 1.5;
}
.sc-pr-dot.dot-mm  { fill: var(--accent-primary); filter: drop-shadow(0 0 4px oklch(0.78 0.18 92 / 0.6)); }
.sc-pr-dot.dot-tc  { fill: oklch(0.70 0.18 145); }
.sc-pr-dot.dot-ta  { fill: oklch(0.62 0.20 280); }
.sc-pr-dot.dot-wwk { fill: oklch(0.66 0.22 30); }
.sc-pr-dot.dot-tbf { fill: oklch(0.55 0.02 270); }

.sc-pr-table { display: flex; flex-direction: column; }
.sc-pr-thead {
  display: grid;
  grid-template-columns: 28px 22px 1fr 80px 42px;
  gap: 6px;
  padding: 4px 18px;
  font-size: 0.58rem; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--ink-4);
  border-bottom: 1px solid var(--ink-6);
}
.sc-pr-row {
  display: grid;
  grid-template-columns: 28px 22px 1fr 80px 42px;
  gap: 6px; align-items: center;
  padding: 8px 18px;
  border-bottom: 1px solid var(--ink-6);
}
.sc-pr-row:last-of-type { border-bottom: none; }
.sc-pr-leader { background: var(--accent-primary-faint); }
.sc-pr-num {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--ink-5); color: var(--ink-3);
  font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 0.7rem;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.num-crown {
  position: absolute;
  top: -5px;
  right: -4px;
  color: var(--accent-primary);
  filter: drop-shadow(0 0 3px oklch(0.78 0.18 92 / 0.5));
  z-index: 1;
}
.num-gold   { background: var(--accent-primary-soft); color: var(--accent-primary); }
.num-silver { background: oklch(0.66 0.010 90 / 0.12); color: var(--ink-3); }
.num-bronze { background: oklch(0.55 0.12 60 / 0.14); color: oklch(0.62 0.12 60); }
.sc-pr-chg { font-family: 'Barlow Condensed', sans-serif; font-size: 0.7rem; font-weight: 700; }
.chg-up   { color: var(--signal-pos); }
.chg-dn   { color: var(--signal-neg); }
.chg-flat { color: var(--ink-4); }
.sc-pr-team-cell { display: flex; align-items: center; gap: 6px; min-width: 0; }
.sc-pr-initials {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.52rem; font-weight: 700; color: var(--ink-1);
  border: 1.5px solid var(--ink-5);
}
.init-0 { background: linear-gradient(135deg, var(--accent-primary), oklch(0.65 0.16 72)); border-color: var(--accent-primary); }
.init-1 { background: linear-gradient(135deg, var(--signal-pos), oklch(0.6 0.14 160)); }
.init-2 { background: linear-gradient(135deg, oklch(0.62 0.2 280), oklch(0.5 0.2 280)); }
.init-3 { background: linear-gradient(135deg, var(--signal-neg), oklch(0.55 0.2 25)); }
.init-4 { background: linear-gradient(135deg, oklch(0.55 0.02 270), oklch(0.42 0.02 270)); }
.sc-pr-name { font-size: 0.74rem; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.name-gold { color: var(--accent-primary); font-weight: 700; }
.sc-pr-bar-wrap { display: flex; align-items: center; gap: 5px; }
.sc-pr-bar {
  height: 5px; border-radius: 3px; flex-shrink: 0;
  background: linear-gradient(90deg, var(--signal-pos), oklch(0.6 0.14 160));
  transform-origin: left;
}
.sc-pr-bar-num { font-family: 'Barlow Condensed', sans-serif; font-size: 0.72rem; font-weight: 700; color: var(--signal-pos); }
.sc-pr-rec { font-size: 0.68rem; color: var(--ink-3); text-align: right; }

/* ─ Standings card */
.sc-standings-card {
  background: linear-gradient(145deg, var(--ink-7) 0%, var(--ink-6) 100%);
  border: 1px solid var(--accent-tertiary-border);
}
.sc-standings-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.05rem; font-weight: 900; letter-spacing: 0.04em;
  color: var(--ink-1); padding: 12px 18px 6px; text-transform: uppercase;
}
.sc-standings-thead {
  display: grid;
  grid-template-columns: 30px 1fr 44px 48px 40px;
  gap: 6px;
  padding: 4px 18px;
  font-size: 0.58rem; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--ink-4);
  border-bottom: 1px solid var(--ink-6);
}
.sc-standings-row {
  display: grid;
  grid-template-columns: 30px 1fr 44px 48px 40px;
  gap: 6px; align-items: center;
  padding: 7px 18px;
  border-bottom: 1px solid var(--ink-6);
}
.sc-standings-row:last-of-type { border-bottom: none; }
.std-playoff { background: oklch(0.72 0.16 160 / 0.04); }
.std-myteam  { background: var(--accent-primary-faint); }
.std-rank-val {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
  font-size: 0.85rem; color: var(--ink-4); display: flex; align-items: center; gap: 3px;
}
.rank-gold   { color: var(--accent-primary); }
.rank-silver { color: var(--ink-3); }
.rank-bronze { color: oklch(0.55 0.12 60); }
.std-playoff-dot { color: var(--signal-pos); font-size: 0.5rem; }
.std-team-cell { display: flex; align-items: center; gap: 6px; min-width: 0; }
.std-avatar {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.5rem; font-weight: 700; color: var(--ink-1);
  border: 1.5px solid var(--ink-5);
  position: relative;
}
.stdav-0 { background: linear-gradient(135deg, var(--accent-primary), oklch(0.65 0.16 72)); border-color: var(--accent-primary); }
.stdav-1 { background: linear-gradient(135deg, var(--signal-pos), oklch(0.6 0.14 160)); }
.stdav-2 { background: linear-gradient(135deg, oklch(0.62 0.2 280), oklch(0.5 0.2 280)); }
.stdav-3 { background: linear-gradient(135deg, var(--signal-neg), oklch(0.55 0.2 25)); }
.stdav-4 { background: linear-gradient(135deg, oklch(0.65 0.18 230), oklch(0.5 0.18 230)); }
.stdav-5 { background: linear-gradient(135deg, oklch(0.55 0.02 270), oklch(0.42 0.02 270)); }
.std-my-star {
  position: absolute; top: -3px; right: -3px;
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--accent-primary); color: var(--ink-8);
  font-size: 5px; display: flex; align-items: center; justify-content: center;
}
.std-name { font-size: 0.74rem; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.std-mine-name { color: var(--accent-primary); font-weight: 700; }
.std-rec-val { font-size: 0.7rem; color: var(--ink-3); font-weight: 600; }
.std-pf-val  { font-size: 0.7rem; color: var(--ink-3); text-align: right; }
.std-streak-val { font-size: 0.68rem; font-weight: 700; text-align: right; }
.str-w { color: var(--signal-pos); }
.str-l { color: var(--signal-neg); }

/* ══════════════════════════════════════════════
   SHARE-CARD MOMENT
══════════════════════════════════════════════ */
.moment-section {
  padding: 100px 0;
  background: var(--ink-7);
  position: relative;
}
.moment-inner {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 60px;
  align-items: center;
}
.moment-copy .section-headline { margin-bottom: 18px; }
.moment-cta { margin-top: 8px; }

.moment-stage {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: 44px;
  align-items: center;
}
.moment-card-wrap {
  position: relative;
  padding: 36px 28px 28px;
}
.moment-card-wrap::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 60%, oklch(0.72 0.18 195 / 0.08), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.moment-card { position: relative; }

/* ── Card stack (3 cards layered) ─────────────────────────────────────── */
.card-stack {
  position: relative;
  isolation: isolate;
}
.card-stack-chips {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  gap: 6px;
  z-index: 10;
  white-space: nowrap;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
}
.cs-chip {
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid var(--ink-5);
  background: oklch(0.12 0.014 90 / 0.92);
  color: var(--ink-2);
  backdrop-filter: none;
}
.cs-chip-1 { color: var(--accent-primary);   border-color: oklch(0.78 0.18 92 / 0.4); }
.cs-chip-2 { color: var(--accent-secondary); border-color: oklch(0.70 0.27 350 / 0.4); }
.cs-chip-3 { color: var(--accent-tertiary);  border-color: oklch(0.72 0.18 195 / 0.4); }
.cs-chip-more { color: var(--ink-3); }

.stack-front {
  position: relative;
  z-index: 3;
}
.stack-back-left,
.stack-back-right {
  position: absolute;
  z-index: 1;
  width: 84%;
  filter: drop-shadow(0 18px 36px oklch(0.06 0.012 90 / 0.55));
}
.stack-back-left {
  top: 30px;
  left: -34px;
  transform: rotate(-5deg);
  z-index: 1;
}
.stack-back-right {
  top: 14px;
  right: -38px;
  transform: rotate(4.5deg);
  z-index: 2;
}
@media (prefers-reduced-motion: no-preference) {
  .stack-back-left,
  .stack-back-right,
  .stack-front {
    transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .card-stack:hover .stack-back-left  { transform: rotate(-7deg) translate(-6px, -4px); }
  .card-stack:hover .stack-back-right { transform: rotate(6.5deg) translate(8px, -4px); }
  .card-stack:hover .stack-front      { transform: translateY(-3px); }
}

/* ── Mini share-card variant (used by matchup + grades) ───────────────── */
.sc-mini-card {
  padding: 16px 18px 18px;
}
.sc-mini-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--ink-1);
  margin: 10px 0 14px;
  line-height: 1.15;
}

/* ── Matchup of the Week card ─────────────────────────────────────────── */
.sc-mu-faceoff {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 14px;
  align-items: center;
  margin: 6px 0 14px;
}
.sc-mu-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  min-width: 0;
}
.sc-mu-avatar {
  width: 52px; height: 52px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800;
  font-family: 'Barlow Condensed', sans-serif;
  color: var(--ink-8);
  font-size: 1rem;
  letter-spacing: 0.02em;
  border: 2px solid oklch(0.18 0.012 90);
}
.mu-left  { background: linear-gradient(135deg, oklch(0.78 0.18 92), oklch(0.68 0.16 75)); }
.mu-right { background: linear-gradient(135deg, oklch(0.65 0.20 280), oklch(0.55 0.18 285)); }
.sc-mu-name {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink-1);
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.sc-mu-proj {
  font-size: 0.7rem;
  color: var(--ink-3);
  font-family: 'Barlow Condensed', sans-serif;
  letter-spacing: 0.04em;
  font-weight: 600;
}
.sc-mu-vs {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--accent-secondary);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 4px 10px;
  border: 1px solid oklch(0.70 0.27 350 / 0.3);
  border-radius: 999px;
}
.sc-mu-prob {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  font-size: 0.7rem;
  font-family: 'Barlow Condensed', sans-serif;
  color: var(--ink-3);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 700;
}
.sc-mu-bar {
  height: 7px;
  background: oklch(0.20 0.012 90);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
}
.sc-mu-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), oklch(0.72 0.18 75));
  width: var(--w);
  border-radius: 999px;
}
.sc-mu-pct {
  color: var(--accent-primary);
  font-size: 0.78rem;
  font-weight: 800;
}

/* ── Draft Grades card ────────────────────────────────────────────────── */
.sc-grades-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 6px 0 8px;
}
.sc-grade-row {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 10px;
  align-items: center;
  font-size: 0.78rem;
  color: var(--ink-1);
}
.sc-grade-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.62rem;
  font-weight: 800;
  color: var(--ink-8);
  font-family: 'Barlow Condensed', sans-serif;
  letter-spacing: 0.02em;
}
.gav-0 { background: linear-gradient(135deg, oklch(0.78 0.18 92),  oklch(0.68 0.16 75)); }
.gav-1 { background: linear-gradient(135deg, oklch(0.70 0.16 145), oklch(0.60 0.14 150)); }
.gav-2 { background: linear-gradient(135deg, oklch(0.66 0.20 30),  oklch(0.56 0.18 35)); }
.gav-3 { background: linear-gradient(135deg, oklch(0.55 0.02 270), oklch(0.42 0.02 270)); }
.sc-grade-team {
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sc-grade-letter {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.0rem;
  font-weight: 800;
  padding: 2px 10px;
  border-radius: 6px;
  min-width: 42px;
  text-align: center;
  letter-spacing: 0.04em;
}
.grade-a { background: oklch(0.70 0.18 145 / 0.18); color: oklch(0.78 0.18 145); }
.grade-b { background: oklch(0.75 0.16 75 / 0.18);  color: var(--accent-primary); }
.grade-c { background: oklch(0.68 0.18 30 / 0.18);  color: oklch(0.74 0.18 30); }
.grade-f { background: oklch(0.62 0.22 25 / 0.22);  color: oklch(0.75 0.22 25); }

/* Small breathing room between successive outgoing attachment bubbles */
.imsg-out-spaced { margin-top: 8px; }

@media (max-width: 960px) {
  .moment-stage { grid-template-columns: 1fr; gap: 32px; }
  .imessage-thread { justify-self: stretch; max-width: 360px; margin: 0 auto; }
  .moment-card-wrap { padding: 36px 14px 28px; }
  .stack-back-left  { left: -14px; }
  .stack-back-right { right: -16px; }
}

/* iMessage thread */
.imessage-thread {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 14px;
  background: oklch(0.10 0.012 270);
  border: 1px solid var(--ink-5);
  border-radius: 22px;
  position: relative;
  max-width: 260px;
  justify-self: end;
}
.imsg-row { display: flex; }
.imsg-bubble {
  max-width: 90%;
  padding: 8px 12px;
  border-radius: 18px;
  font-size: 0.82rem;
  line-height: 1.32;
  word-wrap: break-word;
}
.imsg-out {
  align-self: flex-end;
  background: var(--accent-primary);
  color: var(--ink-8);
  border-bottom-right-radius: 5px;
  margin-left: auto;
  padding: 10px 12px;
}
.imsg-in {
  background: var(--imsg-grey);
  color: var(--ink-1);
  border-bottom-left-radius: 5px;
}
.imsg-attachment {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.imsg-name {
  font-size: 0.62rem;
  font-weight: 700;
  color: oklch(0.78 0.010 90);
  margin-bottom: 2px;
  letter-spacing: 0.04em;
}
.imsg-text { color: var(--ink-1); }
.imsg-reactions {
  position: absolute;
  margin-top: 6px;
  background: var(--imsg-grey-2);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 0.7rem;
}
.imsg-typing {
  align-self: flex-start;
  display: inline-flex;
  gap: 4px;
  background: var(--imsg-grey);
  padding: 10px 14px;
  border-radius: 18px;
  border-bottom-left-radius: 5px;
  margin-top: 2px;
}
.imsg-typing span {
  width: 6px; height: 6px; border-radius: 50%;
  background: oklch(0.66 0.010 90);
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes imsg-blink {
    0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
    30%           { opacity: 1;   transform: translateY(-2px); }
  }
  .imsg-typing span { animation: imsg-blink 1.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
  .imsg-typing span:nth-child(2) { animation-delay: 0.18s; }
  .imsg-typing span:nth-child(3) { animation-delay: 0.36s; }
}

/* ══════════════════════════════════════════════
   FINAL CTA
══════════════════════════════════════════════ */
.final-cta-section {
  position: relative;
  padding: 120px 0;
  background: var(--ink-8);
  overflow: hidden;
  text-align: center;
}
.final-cta-section::before {
  content: "";
  position: absolute;
  top: 50%; left: 50%;
  width: 800px; height: 400px;
  transform: translate(-50%, -50%);
  background: radial-gradient(ellipse, oklch(0.78 0.18 92 / 0.06) 0%, transparent 65%);
  pointer-events: none;
}
.final-inner { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; }
.final-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(2.6rem, 6.5vw, 4.6rem);
  font-weight: 900;
  line-height: 1.0;
  color: var(--ink-1);
  text-transform: uppercase;
  margin: 16px 0 36px;
  max-width: 18ch;
}
.final-accent { color: var(--accent-primary); }
.final-trust {
  margin-top: 18px;
  font-size: 0.85rem;
  color: var(--ink-3-soft);
  letter-spacing: 0.03em;
}

/* ══════════════════════════════════════════════
   FAQ
══════════════════════════════════════════════ */
.faq-section {
  padding: 100px 0;
  background: var(--ink-7);
}
.faq-headline { font-size: clamp(1.8rem, 4vw, 2.8rem); margin-bottom: 40px; }
.faq-list-full { display: flex; flex-direction: column; max-width: 800px; }
.faq-item {
  border-bottom: 1px solid var(--ink-5);
}
.faq-item:first-child { border-top: 1px solid var(--ink-5); }
.faq-q {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 20px 0;
  background: transparent;
  border: none;
  font-family: 'Barlow', sans-serif;
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--ink-2);
  text-align: left;
  cursor: pointer;
}
.faq-q:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
  border-radius: 4px;
}
.faq-arrow {
  font-size: 1.5rem;
  color: var(--ink-4);
  flex-shrink: 0;
  line-height: 1;
}
@media (prefers-reduced-motion: no-preference) {
  .faq-arrow { transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), color 0.22s; }
  .faq-a-wrap { transition: grid-template-rows 0.28s cubic-bezier(0.22, 1, 0.36, 1), padding-bottom 0.22s; }
  .faq-inner-fade { transition: opacity 0.22s; }
}
.faq-arrow.open { transform: rotate(90deg); color: var(--accent-primary); }
/* Non-clipping accordion via grid 0fr → 1fr trick */
.faq-a-wrap {
  display: grid;
  grid-template-rows: 0fr;
  padding-bottom: 0;
}
.faq-a-wrap.open {
  grid-template-rows: 1fr;
  padding-bottom: 20px;
}
.faq-a-wrap > .faq-a {
  min-height: 0;
  overflow: hidden;
  font-size: 0.92rem;
  color: var(--ink-3);
  line-height: 1.65;
  max-width: 70ch;
}

/* ══════════════════════════════════════════════
   LEGAL BAR
══════════════════════════════════════════════ */
.legal-bar {
  background: var(--ink-8);
  border-top: 1px solid var(--ink-6);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  flex-wrap: wrap;
}
.legal-text { font-size: 12px; color: var(--ink-4); }
.legal-link {
  font-size: 12px;
  color: var(--ink-4);
  text-decoration: none;
}
.legal-link:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
  border-radius: 3px;
}
@media (prefers-reduced-motion: no-preference) {
  .legal-link { transition: color 0.15s; }
  .legal-link:hover { color: var(--signal-pos); }
}

/* ══════════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════════ */
@media (max-width: 900px) {
  .picker-grid { grid-template-columns: 1fr; gap: 24px; }
  .moment-inner { grid-template-columns: 1fr; gap: 40px; }
  .moment-stage { grid-template-columns: 1fr; }
  .imessage-thread { max-width: 100%; justify-self: stretch; }
  .preview-rank-row { grid-template-columns: 24px 28px 1fr 60px; }
  .prev-name { font-size: 0.75rem; }
  .hero-stage { flex-direction: column; gap: 14px; }
  .hero-stage-caption { max-width: 100%; align-items: center; text-align: center; }
  .caption-arrow { transform: rotate(90deg); }
}

@media (max-width: 600px) {
  .hero-headline { font-size: 3rem; }
  .section-headline { font-size: 1.8rem; }
  .hero-section { padding: 64px 0 48px; }
}

/* ══════════════════════════════════════════════
   REDUCED MOTION FALLBACK
══════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
</style>

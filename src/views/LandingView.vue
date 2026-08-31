<template>
  <div class="landing">
    <!-- ─────────────────────────────────────────────────────────────
         TOP NAV — minimal chrome: masthead left, account actions right.
         Distinct from the layout chrome inside the product; this is
         what a cold visitor sees.
    ────────────────────────────────────────────────────────────── -->
    <header class="landing-nav" role="banner">
      <div class="landing-nav-inner">
        <router-link to="/" class="landing-nav-brand" aria-label="The League Beat — home">
          <img src="/tlb-favicon.png" alt="" class="landing-nav-brand-mark" />
          <span class="landing-nav-brand-word">THE LEAGUE BEAT</span>
        </router-link>
        <nav class="landing-nav-actions" aria-label="Account actions">
          <button
            v-if="!authStore.isAuthenticated"
            type="button"
            class="landing-nav-link"
            @click="emit('open-signup')"
          >
            Sign in
          </button>
          <router-link
            v-else
            to="/leagues"
            class="landing-nav-link"
          >
            My leagues
          </router-link>
          <router-link
            to="/demo-categories/connect"
            class="landing-nav-cta"
          >
            Get started
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </router-link>
        </nav>
      </div>
    </header>

    <!-- ─────────────────────────────────────────────────────────────
         HERO — magazine cover. Masthead bar, huge editorial headline,
         supporting deck, dual CTAs. The voice IS the marketing.
    ────────────────────────────────────────────────────────────── -->
    <section class="hero" aria-labelledby="hero-headline">
      <div class="hero-inner">
        <div class="hero-masthead" aria-hidden="true">
          <span class="hero-masthead-bar"></span>
          <span class="hero-masthead-meta">VOL. 1 · ISSUE 1 · WEEK 8 · 2026</span>
        </div>

        <h1 class="hero-headline" id="hero-headline">
          The dynasty
          <span class="hero-headline-accent">falls.</span>
        </h1>
        <p class="hero-deck">
          Bullpen Theology just took the throne.
          <span class="hero-deck-dim">Closer's Therapy is bleeding saves.</span>
        </p>

        <p class="hero-tagline">Your league has a story. We write it.</p>

        <div class="hero-cta-row">
          <router-link to="/demo-categories/connect" class="hero-cta hero-cta-primary">
            Read the demo
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </router-link>
          <button type="button" class="hero-cta hero-cta-secondary" @click="emit('open-signup')">
            Connect your league
          </button>
        </div>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         WHAT YOU GET — three captioned sections, magazine spread.
         Each block is an editorial promise + visual proof.
    ────────────────────────────────────────────────────────────── -->
    <section class="spread" aria-labelledby="spread-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta" id="spread-heading">
          What you'll read
        </p>
        <h2 class="section-headline">A magazine that covers your league.</h2>
        <p class="section-deck">
          Every week, headlines. Every week, stories. Every week, your
          league elevated from a group chat into a publication.
        </p>
      </header>

      <div class="spread-grid">
        <article class="spread-card">
          <div class="spread-visual spread-visual-hero">
            <div class="spread-visual-eyebrow">TOP SPOT SLIPPING</div>
            <p class="spread-visual-headline">
              Port Angeles is leaking RBI, SB, and OPS.
            </p>
            <p class="spread-visual-deck">
              Not a collapse yet. But the gap between them and the new
              #1 is real.
            </p>
          </div>
          <h3 class="spread-card-title">Every week, a headline.</h3>
          <p class="spread-card-body">
            Auto-generated hero stories that read like ESPN's Sunday
            morning recap, scoped to your league.
          </p>
        </article>

        <article class="spread-card">
          <div class="spread-visual spread-visual-ranks">
            <div class="spread-visual-eyebrow spread-visual-eyebrow-teal">POWER RANKINGS</div>
            <p class="spread-visual-headline">
              Eight weeks of receipts.
            </p>
            <ul class="spread-visual-list">
              <li><strong>1.</strong> Real Men of Genius II <em class="rank-up">W4</em></li>
              <li><strong>2.</strong> Dem Bums <em class="rank-down">L3</em></li>
              <li><strong>3.</strong> Swamp Pirates <em class="rank-mute">L1</em></li>
            </ul>
          </div>
          <h3 class="spread-card-title">Rankings as a column.</h3>
          <p class="spread-card-body">
            Not a table — a written argument. Power scores explained
            in prose, not just digits.
          </p>
        </article>

        <article class="spread-card">
          <div class="spread-visual spread-visual-matchups">
            <div class="spread-visual-eyebrow spread-visual-eyebrow-up">WEEK 8 · LIVE TODAY</div>
            <p class="spread-visual-headline">What's happening now.</p>
            <ul class="spread-visual-matchup-list">
              <li>
                <span>Bryan's Buckeyes</span>
                <strong>5 — 14</strong>
                <span>Shohei me the money</span>
              </li>
              <li>
                <span>Jamestown</span>
                <strong>4 — 16</strong>
                <span>NC PALE HOSE</span>
              </li>
            </ul>
          </div>
          <h3 class="spread-card-title">Every matchup, covered.</h3>
          <p class="spread-card-body">
            Live category scoring, win-probability chips, and a beat
            reporter watching the math change in real time.
          </p>
        </article>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         HOW IT WORKS — three numbered steps. Brevity matches the voice.
    ────────────────────────────────────────────────────────────── -->
    <section class="steps" aria-labelledby="steps-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="steps-heading">
          How it works
        </p>
        <h2 class="section-headline">Three steps to your first issue.</h2>
      </header>

      <ol class="steps-list" role="list">
        <li class="steps-item">
          <p class="steps-num">01</p>
          <h3 class="steps-title">Sign in.</h3>
          <p class="steps-body">
            One click with Google. Your account stays linked across
            every league you connect.
          </p>
        </li>
        <li class="steps-item">
          <p class="steps-num">02</p>
          <h3 class="steps-title">Connect your league.</h3>
          <p class="steps-body">
            Sleeper, Yahoo, or ESPN. Paste a league ID or pick from
            your connected accounts. Takes under a minute.
          </p>
        </li>
        <li class="steps-item">
          <p class="steps-num">03</p>
          <h3 class="steps-title">Read this week's issue.</h3>
          <p class="steps-body">
            Headlines, power rankings, matchup recaps, draft stories
            and dynasty arcs. Updated every day the season is live.
          </p>
        </li>
      </ol>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         VOICE AS PROOF — a marquee of real editorial headlines from
         the library. Lets the voice speak for itself.
    ────────────────────────────────────────────────────────────── -->
    <section class="voice" aria-labelledby="voice-heading">
      <header class="section-head section-head-centered">
        <p class="section-eyebrow section-eyebrow-magenta" id="voice-heading">
          The voice
        </p>
        <h2 class="section-headline">Written like a magazine. Not a dashboard.</h2>
      </header>

      <ul class="voice-grid" role="list">
        <li class="voice-headline voice-headline-lg">The dynasty falls.</li>
        <li class="voice-headline">Bullpen Theology just took the throne.</li>
        <li class="voice-headline">Closer's Therapy is bleeding saves.</li>
        <li class="voice-headline voice-headline-lg">
          Three straight wins. The conversation just changed.
        </li>
        <li class="voice-headline">Witt went off.</li>
        <li class="voice-headline">Nabers vanished.</li>
        <li class="voice-headline">The Wagon fell to .500 for the first time all year.</li>
        <li class="voice-headline voice-headline-lg">
          Eight spots since week one. Doubles Down is the climber of
          the year.
        </li>
      </ul>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         PLATFORM PROOF — which leagues this works for.
    ────────────────────────────────────────────────────────────── -->
    <section class="platforms" aria-labelledby="platforms-heading">
      <header class="section-head section-head-centered">
        <p class="section-eyebrow section-eyebrow-teal" id="platforms-heading">
          Works with your league
        </p>
        <h2 class="section-headline">Sleeper. Yahoo. ESPN.</h2>
        <p class="section-deck">
          Baseball today. Football, basketball, and hockey coming as
          their seasons start.
        </p>
      </header>

      <ul class="platforms-grid" role="list">
        <li class="platforms-item">
          <span class="platforms-name">Sleeper</span>
          <span class="platforms-status">Available</span>
        </li>
        <li class="platforms-item">
          <span class="platforms-name">Yahoo</span>
          <span class="platforms-status">Available</span>
        </li>
        <li class="platforms-item">
          <span class="platforms-name">ESPN</span>
          <span class="platforms-status">Available</span>
        </li>
      </ul>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         FREE — The League Beat costs nothing. No tiers, no trial, no
         card. This replaced a per-league pricing section; if you are
         reinstating any kind of gate, that is a positioning change,
         not a copy tweak.
    ────────────────────────────────────────────────────────────── -->
    <section class="pricing" aria-labelledby="pricing-heading">
      <header class="section-head section-head-centered">
        <p class="section-eyebrow section-eyebrow-magenta" id="pricing-heading">
          Free
        </p>
        <h2 class="section-headline">The whole magazine. No charge.</h2>
        <p class="section-deck">
          Every issue, every week, for every manager in the league.
          No trial to start and no card to enter.
        </p>
      </header>

      <div class="pricing-card">
        <p class="pricing-eyebrow">Every league · every season</p>
        <div class="pricing-price-row">
          <span class="pricing-now">Free</span>
        </div>
        <ul class="pricing-list" role="list">
          <li>Headlines, recaps, power rankings, draft and history</li>
          <li>Every league member reads it, not just the commissioner</li>
          <li>Nothing locked, nothing blurred, nothing held back</li>
        </ul>
        <router-link to="/demo-categories/connect" class="hero-cta hero-cta-primary pricing-cta">
          Connect your league
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </router-link>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         FINAL CTA — close the page editorially.
    ────────────────────────────────────────────────────────────── -->
    <section class="closer" aria-labelledby="closer-heading">
      <div class="closer-inner">
        <h2 class="closer-headline" id="closer-heading">
          Your league's story is waiting.
        </h2>
        <p class="closer-deck">Your league story, chronicled.</p>
        <div class="hero-cta-row closer-cta-row">
          <router-link to="/demo-categories/connect" class="hero-cta hero-cta-primary">
            Read the demo
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </router-link>
          <button type="button" class="hero-cta hero-cta-secondary" @click="emit('open-signup')">
            Sign in to connect
          </button>
        </div>
      </div>
    </section>

    <TLBFooter />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLeaguesStore } from '@/stores/leaguesNew'
import TLBFooter from '@/components/TLBFooter.vue'

const router = useRouter()
const authStore = useAuthStore()
const leaguesStore = useLeaguesStore()

const emit = defineEmits<{ (e: 'open-signup'): void }>()

// Returning-user shortcut: if a signed-in user with at least one
// connected league lands here, skip the landing page and drop them
// straight on their primary league. The smart-redirect in the router
// covers the same case for direct `/` hits, but in-component logic is
// belt-and-suspenders for cases where the redirect runs before the
// stores are hydrated.
onMounted(async () => {
  if (!authStore.isAuthenticated) return
  if (leaguesStore.leagues.length === 0) {
    try {
      await leaguesStore.fetchLeagues()
    } catch {
      // Non-fatal — leave them on the landing page.
      return
    }
  }
  if (leaguesStore.leagues.length === 0) return
  const primary =
    leaguesStore.leagues.find((l) => l.is_primary) ?? leaguesStore.leagues[0]
  router.replace(`/leagues/${primary.id}/the-beat`)
})
</script>

<style scoped>
/* ─── Tokens — match the product chrome ──────────────────────────── */
.landing {
  --ink-1: oklch(0.97 0.005 90);
  --ink-2: oklch(0.78 0.008 90);
  --ink-3: oklch(0.55 0.010 90);
  --ink-5: oklch(0.20 0.015 90);
  --ink-7: oklch(0.10 0.015 90);
  --ink-8: oklch(0.08 0.014 90);
  --accent-gold:    oklch(0.78 0.18 92);
  --accent-magenta: oklch(0.70 0.27 350);
  --accent-teal:    oklch(0.72 0.18 195);
  --accent-up:      oklch(0.74 0.18 145);

  min-height: 100vh;
  background: var(--ink-8);
  color: var(--ink-1);
  font-family: 'Barlow', sans-serif;
}

/* ─── Top nav ──────────────────────────────────────────────────── */
.landing-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: oklch(0.06 0.014 90 / 0.85);
  border-bottom: 1px solid oklch(0.18 0.015 90);
  backdrop-filter: blur(8px);
}
.landing-nav-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.landing-nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: var(--ink-1);
  transition: opacity 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .landing-nav-brand:hover { opacity: 0.85; }
}
.landing-nav-brand-mark {
  width: 32px;
  height: 32px;
  border-radius: 6px;
}
.landing-nav-brand-word {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
}
.landing-nav-actions {
  display: inline-flex;
  align-items: center;
  gap: 18px;
}
.landing-nav-link {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-2);
  background: transparent;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .landing-nav-link:hover { color: var(--ink-1); }
}
.landing-nav-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--accent-gold);
  color: oklch(0.10 0.012 90);
  border: none;
  padding: 9px 16px;
  border-radius: 999px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  cursor: pointer;
  text-decoration: none;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: no-preference) {
  .landing-nav-cta:hover { transform: translateY(-1px); }
}
.landing-nav-cta:active { transform: scale(0.97); transition-duration: 100ms; }

/* ─── Hero ──────────────────────────────────────────────────────── */
.hero {
  padding: 96px 24px 80px;
  background:
    radial-gradient(ellipse at top left, oklch(0.70 0.27 350 / 0.10), transparent 50%),
    radial-gradient(ellipse at bottom right, oklch(0.72 0.18 195 / 0.08), transparent 55%),
    var(--ink-8);
  border-bottom: 1px solid oklch(0.16 0.015 90);
}
.hero-inner {
  max-width: 1180px;
  margin: 0 auto;
}
.hero-masthead {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}
.hero-masthead-bar {
  flex: 1;
  height: 1px;
  background: var(--accent-gold);
  opacity: 0.5;
}
.hero-masthead-meta {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.hero-headline {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: clamp(3.5rem, 10vw, 9rem);
  letter-spacing: -0.035em;
  line-height: 0.86;
  margin: 0 0 28px;
  color: var(--ink-1);
}
.hero-headline-accent {
  color: var(--accent-magenta);
}
.hero-deck {
  margin: 0 0 36px;
  font-family: 'Barlow', sans-serif;
  font-weight: 700;
  font-size: clamp(1.4rem, 2.6vw, 2.1rem);
  letter-spacing: -0.01em;
  line-height: 1.18;
  color: var(--ink-1);
  max-width: 28ch;
}
.hero-deck-dim {
  color: var(--ink-3);
  display: block;
  margin-top: 6px;
}
.hero-tagline {
  margin: 0 0 36px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: var(--accent-gold);
}
.hero-cta-row {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 14px;
}
.hero-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 26px;
  border-radius: 999px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  text-decoration: none;
  border: 1px solid transparent;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
              background-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.hero-cta-primary {
  background: var(--accent-gold);
  color: oklch(0.10 0.012 90);
}
.hero-cta-secondary {
  background: transparent;
  color: var(--ink-1);
  border-color: oklch(0.32 0.012 90);
}
@media (prefers-reduced-motion: no-preference) {
  .hero-cta:hover { transform: translateY(-1px); }
  .hero-cta-secondary:hover { border-color: var(--ink-2); }
}
.hero-cta:active { transform: scale(0.97); transition-duration: 100ms; }
.hero-cta:focus-visible {
  outline: 2px solid var(--accent-gold);
  outline-offset: 3px;
}

/* ─── Section scaffolding ──────────────────────────────────────── */
.section-head {
  max-width: 720px;
  margin: 0 0 56px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.section-head-centered {
  text-align: center;
  margin-left: auto;
  margin-right: auto;
}
.section-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin: 0;
  align-self: flex-start;
}
.section-head-centered .section-eyebrow { align-self: center; }
.section-eyebrow::before {
  content: '';
  display: inline-block;
  width: 28px;
  height: 2px;
  background: currentColor;
}
.section-eyebrow-magenta { color: var(--accent-magenta); }
.section-eyebrow-teal    { color: var(--accent-teal); }
.section-headline {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: clamp(2rem, 4.5vw, 3.4rem);
  letter-spacing: -0.025em;
  line-height: 1.02;
  margin: 0;
  color: var(--ink-1);
}
.section-deck {
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.55;
  color: var(--ink-2);
  max-width: 56ch;
}
.section-head-centered .section-deck { margin-left: auto; margin-right: auto; }

/* ─── Spread (what you'll read) ────────────────────────────────── */
.spread {
  padding: 96px 24px;
  max-width: 1280px;
  margin: 0 auto;
}
.spread-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
}
.spread-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.spread-visual {
  padding: 28px;
  border-radius: 14px;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  min-height: 260px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.spread-visual-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-magenta);
}
.spread-visual-eyebrow-teal { color: var(--accent-teal); }
.spread-visual-eyebrow-up   { color: var(--accent-up); }
.spread-visual-headline {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 1.6rem;
  letter-spacing: -0.02em;
  line-height: 1.05;
  color: var(--ink-1);
  margin: 0;
}
.spread-visual-deck {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--ink-2);
}
.spread-visual-list,
.spread-visual-matchup-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 0.94rem;
}
.spread-visual-list li,
.spread-visual-matchup-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  color: var(--ink-1);
}
.spread-visual-list strong { color: var(--ink-3); margin-right: 4px; }
.spread-visual-list em { font-style: normal; font-family: 'Barlow Condensed', sans-serif; font-size: 0.78rem; letter-spacing: 0.10em; padding: 2px 8px; border-radius: 6px; }
.rank-up   { color: var(--accent-up);      background: oklch(0.74 0.18 145 / 0.10); }
.rank-down { color: oklch(0.75 0.18 25);   background: oklch(0.75 0.18 25 / 0.10); }
.rank-mute { color: var(--ink-3);          background: oklch(0.20 0.015 90 / 0.5); }
.spread-visual-matchup-list strong { color: var(--ink-1); font-weight: 800; }
.spread-card-title {
  font-family: 'Barlow', sans-serif;
  font-weight: 800;
  font-size: 1.35rem;
  letter-spacing: -0.015em;
  margin: 0;
  color: var(--ink-1);
}
.spread-card-body {
  margin: 0;
  font-size: 0.98rem;
  line-height: 1.55;
  color: var(--ink-2);
}

/* ─── Steps ────────────────────────────────────────────────────── */
.steps {
  padding: 96px 24px;
  max-width: 1280px;
  margin: 0 auto;
}
.steps-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.steps-item {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 32px;
  border-radius: 14px;
  background: oklch(0.10 0.015 90 / 0.6);
  border: 1px solid oklch(0.18 0.015 90);
}
.steps-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.86rem;
  font-weight: 800;
  letter-spacing: 0.20em;
  color: var(--accent-gold);
  margin: 0;
}
.steps-title {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 1.7rem;
  letter-spacing: -0.02em;
  line-height: 1.05;
  margin: 0;
  color: var(--ink-1);
}
.steps-body {
  margin: 0;
  font-size: 1rem;
  line-height: 1.55;
  color: var(--ink-2);
}

/* ─── Voice grid ───────────────────────────────────────────────── */
.voice {
  padding: 96px 24px;
  max-width: 1280px;
  margin: 0 auto;
}
.voice-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.voice-headline {
  padding: 36px 28px;
  border-radius: 14px;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 1.55rem;
  letter-spacing: -0.02em;
  line-height: 1.08;
  color: var(--ink-1);
  display: flex;
  align-items: center;
  min-height: 140px;
}
.voice-headline-lg {
  grid-column: span 2;
  font-size: 2rem;
  background:
    linear-gradient(135deg, oklch(0.70 0.27 350 / 0.12) 0%, oklch(0.10 0.015 90) 70%);
  border-color: oklch(0.70 0.27 350 / 0.30);
}

/* ─── Platforms ────────────────────────────────────────────────── */
.platforms {
  padding: 96px 24px;
  max-width: 1280px;
  margin: 0 auto;
}
.platforms-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  list-style: none;
  padding: 0;
  margin: 0;
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
}
.platforms-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px;
  border-radius: 14px;
  background: oklch(0.10 0.015 90 / 0.6);
  border: 1px solid oklch(0.18 0.015 90);
}
.platforms-name {
  font-family: 'Barlow', sans-serif;
  font-weight: 800;
  font-size: 1.4rem;
  letter-spacing: -0.015em;
  color: var(--ink-1);
}
.platforms-status {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-up);
}

/* ─── Pricing ──────────────────────────────────────────────────── */
.pricing {
  padding: 96px 24px;
  max-width: 1280px;
  margin: 0 auto;
}
.pricing-card {
  max-width: 540px;
  margin: 0 auto;
  padding: 48px 40px;
  border-radius: 18px;
  background:
    radial-gradient(ellipse at top, oklch(0.78 0.18 92 / 0.10), transparent 60%),
    oklch(0.10 0.015 90);
  border: 1px solid oklch(0.78 0.18 92 / 0.40);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}
.pricing-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0;
}
.pricing-price-row {
  display: inline-flex;
  align-items: baseline;
  gap: 16px;
}
.pricing-now {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 5rem;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--accent-gold);
}
.pricing-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 1rem;
  color: var(--ink-2);
}
.pricing-list li {
  position: relative;
  padding-left: 22px;
}
.pricing-list li::before {
  content: '';
  position: absolute;
  left: 0; top: 0.5em;
  width: 12px; height: 2px;
  background: var(--accent-gold);
  border-radius: 2px;
}
.pricing-cta { margin-top: 8px; }

/* ─── Closer ───────────────────────────────────────────────────── */
.closer {
  padding: 96px 24px 120px;
  background:
    radial-gradient(ellipse at center, oklch(0.70 0.27 350 / 0.12), transparent 60%),
    var(--ink-8);
  border-top: 1px solid oklch(0.16 0.015 90);
}
.closer-inner {
  max-width: 880px;
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}
.closer-headline {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: clamp(2.4rem, 5.5vw, 4rem);
  letter-spacing: -0.025em;
  line-height: 1;
  margin: 0;
}
.closer-deck {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: var(--accent-gold);
  margin: 0 0 8px;
}
.closer-cta-row { margin-top: 16px; }

/* ─── Responsive ───────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .spread-grid,
  .steps-list,
  .voice-grid,
  .platforms-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .voice-headline-lg { grid-column: span 2; }
}

@media (max-width: 680px) {
  .landing-nav-inner { padding: 12px 16px; }
  .landing-nav-brand-word { display: none; }
  .hero { padding: 64px 20px 56px; }
  .hero-deck { font-size: 1.2rem; }
  .spread, .steps, .voice, .platforms, .pricing { padding: 64px 20px; }
  .spread-grid,
  .steps-list,
  .voice-grid,
  .platforms-grid {
    grid-template-columns: 1fr;
  }
  .voice-headline-lg { grid-column: 1; }
  .pricing-card { padding: 32px 24px; }
  .pricing-now { font-size: 4rem; }
  .closer { padding: 64px 20px 80px; }
}
</style>

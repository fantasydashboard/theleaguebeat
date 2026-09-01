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
            Connect your league
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </router-link>
        </nav>
      </div>
    </header>

    <!-- ─────────────────────────────────────────────────────────────
         HERO — promise first, then proof.

         The previous hero opened with a sample headline ("The dynasty
         falls. Bullpen Theology just took the throne.") and nothing
         else. A cold visitor has no idea what Bullpen Theology is, so
         the best part of the product read as gibberish. The sample
         still leads — but inside the framed issue below, where it is
         legible AS a sample. The plain sentence comes first.
    ────────────────────────────────────────────────────────────── -->
    <section class="hero" aria-labelledby="hero-headline">
      <div class="hero-inner">
        <div class="hero-head">
          <div class="hero-masthead" aria-hidden="true">
            <span class="hero-masthead-bar"></span>
            <span class="hero-masthead-meta">Sleeper · Yahoo · ESPN</span>
            <span class="hero-masthead-bar"></span>
          </div>

          <h1 class="hero-headline" id="hero-headline">
            Your league gets its own
            <span class="hero-headline-accent">magazine.</span>
          </h1>
          <p class="hero-deck">
            Connect your fantasy league and The League Beat writes the
            week — a lead story, power rankings, matchup recaps, and the
            arcs that run all season.
          </p>

          <div class="hero-cta-row">
            <router-link to="/demo-categories/home" class="hero-cta hero-cta-primary">
              Read this week's issue
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </router-link>
            <router-link to="/demo-categories/connect" class="hero-cta hero-cta-secondary">
              Connect your league
            </router-link>
          </div>

          <p class="hero-note">
            <span class="hero-note-badge">Free</span>
            <span>
              <span class="hero-note-strong">Every issue, for every manager.</span>
              No card, no trial.
            </span>
          </p>
        </div>

        <!-- The artifact. A real page from the running demo, framed so
             it reads as a specimen rather than as page furniture. -->
        <figure class="hero-shot">
          <div class="shot">
            <!-- Two captures, not one scaled one: the desktop shot is
                 1440px of layout and shrinks to illegible mush on a
                 phone, which is exactly where a link shared into a
                 league group chat gets opened. -->
            <picture>
              <source
                media="(max-width: 680px)"
                srcset="/landing/beat-m.webp"
                width="804"
                height="1582"
              />
              <img
                src="/landing/beat.webp"
                width="2200"
                height="1163"
                alt="The Beat — a League Beat issue page. The lead column reads: The bubble decides itself this week. Closer's Therapy and Mound Visitors draw each other with the cut at stake."
                fetchpriority="high"
              />
            </picture>
          </div>
          <figcaption class="shot-caption">
            An actual issue, straight from the demo league. Yours reads
            the same way, with your teams and your week.
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         WHAT YOU'LL READ — three promises, each proved by a real
         screenshot of the shipped product rather than a hand-built
         mock. Mocks drift from the app; captures cannot.
    ────────────────────────────────────────────────────────────── -->
    <section class="proof" aria-labelledby="proof-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta" id="proof-heading">
          What you'll read
        </p>
        <h2 class="section-headline">A magazine that covers your league.</h2>
        <p class="section-deck">
          Every week, headlines. Every week, stories. Every week, your
          league elevated from a group chat into a publication.
        </p>
      </header>

      <div class="proof-rows">
        <article class="proof-row">
          <div class="proof-copy">
            <h3 class="proof-title">Every week has a lead story.</h3>
            <p class="proof-body">
              The engine reads the week and writes the story that
              actually matters — who slipped, who is climbing, what is
              at stake on Sunday. Not a stat dump. A column.
            </p>
          </div>
          <div class="shot proof-shot">
            <picture>
              <source
                media="(max-width: 680px)"
                srcset="/landing/lead-m.webp"
                width="804"
                height="1294"
              />
              <!-- Alt deliberately does not quote the headline: the
                   engine rotates variants, so the two captures carry
                   different wording for the same story. -->
              <img
                src="/landing/lead.webp"
                width="1600"
                height="468"
                alt="A League Beat lead story on Closer's Therapy, with the team down five spots on an L3 streak at 44-42-2 this season."
                loading="lazy"
              />
            </picture>
          </div>
        </article>

        <article class="proof-row proof-row-flip">
          <div class="proof-copy">
            <h3 class="proof-title">Rankings that argue, not just rank.</h3>
            <p class="proof-body">
              Power score blends category record, dominance, balance and
              forward outlook — then explains itself in prose. Movement,
              streaks, and exactly which categories each team owns and
              bleeds.
            </p>
          </div>
          <div class="shot proof-shot proof-shot-fade">
            <picture>
              <source
                media="(max-width: 680px)"
                srcset="/landing/board-m.webp"
                width="804"
                height="1470"
              />
              <img
                src="/landing/board.webp"
                width="1600"
                height="912"
                alt="The Board — a ten-team power ranking ladder showing rank, team, movement, power score, category record, owns and bleeds, last six, and streak."
                loading="lazy"
              />
            </picture>
          </div>
        </article>

        <article class="proof-row">
          <div class="proof-copy">
            <h3 class="proof-title">Every matchup, called live.</h3>
            <p class="proof-body">
              Category-by-category scoring, a live win probability, and
              a beat reporter watching the math change from Monday
              through the weekend.
            </p>
          </div>
          <div class="shot proof-shot proof-shot-fade-m">
            <picture>
              <source
                media="(max-width: 680px)"
                srcset="/landing/matchup-m.webp"
                width="804"
                height="1676"
              />
              <img
                src="/landing/matchup.webp"
                width="1600"
                height="699"
                alt="A live matchup: Bullpen Theology leads Doubles Down nine categories to zero with two still contested, at 94 percent win probability, over a grid of category tiles."
                loading="lazy"
              />
            </picture>
          </div>
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
            Sleeper, Yahoo, or ESPN. Paste a league ID or pick from your
            connected accounts. Takes under a minute.
          </p>
        </li>
        <li class="steps-item">
          <p class="steps-num">03</p>
          <h3 class="steps-title">Read this week's issue.</h3>
          <p class="steps-body">
            Headlines, power rankings, matchup recaps, draft stories and
            dynasty arcs. Updated every day the season is live.
          </p>
        </li>
      </ol>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         VOICE AS PROOF — a marquee of real editorial headlines from
         the library. Lets the voice speak for itself. These are
         deliberately DIFFERENT lines from the ones in the screenshots
         above; if you edit either, keep them from overlapping or the
         page starts repeating itself.
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
        <!-- Ninth tile is load-bearing: the grid is three columns and
             the wide tiles span two, so eight items leave a hole in the
             last row. Keep the count at nine (or any multiple of three
             once spans are counted) if you edit this list. -->
        <li class="voice-headline">The leader is set. The drama is not.</li>
      </ul>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         PLATFORM PROOF — which leagues this works for. Real marks, not
         wordmarks in boxes: this is the highest-trust block on the page
         and typography alone read as unfinished.
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
          <img src="/platform/sleeper.svg" alt="" class="platforms-logo" width="56" height="56" loading="lazy" />
          <span class="platforms-name">Sleeper</span>
          <span class="platforms-status">Available</span>
        </li>
        <li class="platforms-item">
          <img src="/platform/yahoo.png" alt="" class="platforms-logo" width="56" height="56" loading="lazy" />
          <span class="platforms-name">Yahoo</span>
          <span class="platforms-status">Available</span>
        </li>
        <li class="platforms-item">
          <img src="/platform/espn.png" alt="" class="platforms-logo" width="56" height="56" loading="lazy" />
          <span class="platforms-name">ESPN</span>
          <span class="platforms-status">Available</span>
        </li>
      </ul>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         FREE — The League Beat costs nothing. No tiers, no trial, no
         card. This is deliberately a slim band rather than a section:
         "free" is a four-word fact, and giving it a full screen made
         it read as bait. If you are reinstating any kind of gate, that
         is a positioning change, not a copy tweak.
    ────────────────────────────────────────────────────────────── -->
    <section class="freeband" aria-labelledby="free-heading">
      <div class="freeband-inner">
        <p class="freeband-mark" aria-hidden="true">Free</p>
        <div class="freeband-copy">
          <h2 class="freeband-headline" id="free-heading">
            The whole magazine. No charge.
          </h2>
          <p class="freeband-body">
            Every issue, every week, for every manager in the league —
            not just the commissioner. Nothing locked, nothing blurred,
            no card to enter.
          </p>
        </div>
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
          <router-link to="/demo-categories/home" class="hero-cta hero-cta-primary">
            Read this week's issue
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </router-link>
          <router-link to="/demo-categories/connect" class="hero-cta hero-cta-secondary">
            Connect your league
          </router-link>
        </div>
        <!-- Third and last "free" beat: hero badge, mid-page band, then
             here at the point of decision. -->
        <p class="closer-free">
          <span class="closer-free-mark">Free</span>
          for the whole league. No card, no trial.
        </p>
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
  white-space: nowrap;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: no-preference) {
  .landing-nav-cta:hover { transform: translateY(-1px); }
}
.landing-nav-cta:active { transform: scale(0.97); transition-duration: 100ms; }

/* ─── Framed screenshot ─────────────────────────────────────────
   Shared frame for every product capture on the page. The border and
   lift are what make a capture read as a specimen instead of as page
   background — without them the shots dissolve into the black.
──────────────────────────────────────────────────────────────── */
.shot {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid oklch(0.26 0.015 90);
  background: oklch(0.06 0.014 90);
  box-shadow:
    0 2px 8px oklch(0 0 0 / 0.5),
    0 24px 60px oklch(0 0 0 / 0.55);
}
.shot img {
  display: block;
  width: 100%;
  height: auto;
}
.shot-caption {
  margin: 18px auto 0;
  max-width: 52ch;
  text-align: center;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--ink-3);
}

/* ─── Hero ──────────────────────────────────────────────────────── */
.hero {
  padding: 72px 24px 88px;
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
.hero-head {
  max-width: 900px;
  margin: 0 auto 56px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hero-masthead {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 460px;
  margin-bottom: 28px;
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
  white-space: nowrap;
}
.hero-headline {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: clamp(2.9rem, 7.2vw, 6rem);
  letter-spacing: -0.035em;
  line-height: 0.92;
  margin: 0 0 24px;
  color: var(--ink-1);
  text-wrap: balance;
}
.hero-headline-accent {
  color: var(--accent-magenta);
}
.hero-deck {
  margin: 0 0 34px;
  font-size: clamp(1.05rem, 1.7vw, 1.3rem);
  line-height: 1.5;
  color: var(--ink-2);
  max-width: 62ch;
  text-wrap: pretty;
}
.hero-cta-row {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
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

/* "Free" as a badge on the hero, not as its own screen further down.
   Solid rather than outlined: this is the first of the page's three
   "free" beats and the only one above the fold, so it has to land in a
   glance. The full-screen pricing section it replaced read as bait —
   the fix for wanting more emphasis is a louder badge, not that. */
.hero-note {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin: 24px 0 0;
  font-size: 1rem;
  color: var(--ink-2);
}
.hero-note-badge {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.88rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: oklch(0.14 0.012 90);
  background: var(--accent-gold);
  border-radius: 999px;
  padding: 5px 14px;
  box-shadow: 0 0 0 4px oklch(0.78 0.18 92 / 0.14);
}
.hero-note-strong {
  color: var(--ink-1);
  font-weight: 700;
}

.hero-shot {
  margin: 0;
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

/* ─── Proof rows (what you'll read) ────────────────────────────── */
.proof {
  padding: 88px 24px;
  max-width: 1280px;
  margin: 0 auto;
}
.proof-rows {
  display: flex;
  flex-direction: column;
  gap: 72px;
}
.proof-row {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 44px;
  align-items: center;
}
/* Alternate which side the capture sits on so the eye zig-zags down
   the page instead of running down one gutter. The column widths flip
   with the order — otherwise the capture lands in the narrow column
   and the copy gets the wide one, which is backwards. */
.proof-row-flip {
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
}
.proof-row-flip .proof-copy { order: 2; }
.proof-row-flip .proof-shot { order: 1; }

.proof-copy {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.proof-title {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: clamp(1.6rem, 2.6vw, 2.2rem);
  letter-spacing: -0.02em;
  line-height: 1.05;
  margin: 0;
  color: var(--ink-1);
  text-wrap: balance;
}
.proof-body {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--ink-2);
  max-width: 46ch;
}
/* The ladder capture ends mid-row on purpose — there are ten teams and
   the frame holds seven. Fading the cut edge reads as "there is more"
   rather than as a botched crop. */
.proof-shot-fade img {
  mask-image: linear-gradient(to bottom, #000 78%, transparent 100%);
}
/* Mobile-only variant: the desktop matchup capture is a complete crop
   and fading it would eat its closing line, but the phone capture is
   cut short to keep the tile from running a full screen tall. */
@media (max-width: 680px) {
  .proof-shot-fade-m img {
    mask-image: linear-gradient(to bottom, #000 82%, transparent 100%);
  }
}

/* ─── Steps ────────────────────────────────────────────────────── */
.steps {
  padding: 88px 24px;
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
  padding: 88px 24px;
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
  padding: 32px 26px;
  border-radius: 14px;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 1.5rem;
  letter-spacing: -0.02em;
  line-height: 1.08;
  color: var(--ink-1);
  display: flex;
  align-items: center;
  min-height: 118px;
}
.voice-headline-lg {
  grid-column: span 2;
  font-size: 1.95rem;
  background:
    linear-gradient(135deg, oklch(0.70 0.27 350 / 0.12) 0%, oklch(0.10 0.015 90) 70%);
  border-color: oklch(0.70 0.27 350 / 0.30);
}

/* ─── Platforms ────────────────────────────────────────────────── */
.platforms {
  padding: 88px 24px;
  max-width: 1280px;
  margin: 0 auto;
}
.platforms-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  list-style: none;
  padding: 0;
  margin: 0 auto;
  max-width: 760px;
}
.platforms-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px;
  border-radius: 14px;
  background: oklch(0.10 0.015 90 / 0.6);
  border: 1px solid oklch(0.18 0.015 90);
}
.platforms-logo {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  object-fit: contain;
  margin-bottom: 2px;
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

/* ─── Free band ────────────────────────────────────────────────── */
.freeband {
  padding: 24px 24px 40px;
  max-width: 1280px;
  margin: 0 auto;
}
.freeband-inner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 40px;
  max-width: 940px;
  margin: 0 auto;
  padding: 40px 44px;
  border-radius: 18px;
  background:
    radial-gradient(ellipse at left, oklch(0.78 0.18 92 / 0.18), transparent 68%),
    oklch(0.11 0.018 92);
  border: 1px solid oklch(0.78 0.18 92 / 0.55);
  box-shadow:
    0 0 0 1px oklch(0.78 0.18 92 / 0.10),
    0 18px 60px oklch(0.78 0.18 92 / 0.10);
}
/* Gold spine down the left edge — the band reads as a callout at a
   glance without needing the screen-sized treatment back. */
.freeband-inner::before {
  content: '';
  position: absolute;
  left: 0;
  top: 18px;
  bottom: 18px;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background: var(--accent-gold);
}
.freeband-mark {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: clamp(3.6rem, 6vw, 4.8rem);
  letter-spacing: -0.045em;
  line-height: 0.9;
  color: var(--accent-gold);
  margin: 0;
  flex-shrink: 0;
}
.freeband-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.freeband-headline {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 1.65rem;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0;
  color: var(--ink-1);
}
.freeband-body {
  margin: 0;
  font-size: 1rem;
  line-height: 1.55;
  color: var(--ink-2);
}

/* ─── Closer ───────────────────────────────────────────────────── */
.closer {
  padding: 88px 24px 110px;
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
.closer-free {
  margin: 6px 0 0;
  font-size: 1rem;
  color: var(--ink-2);
}
.closer-free-mark {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 1.15rem;
  letter-spacing: -0.01em;
  color: var(--accent-gold);
  margin-right: 4px;
}

/* ─── Responsive ───────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .steps-list,
  .voice-grid,
  .platforms-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .voice-headline-lg { grid-column: span 2; }
  .proof-row {
    grid-template-columns: 1fr;
    gap: 28px;
  }
  /* Stacked, the copy always leads — the flip only makes sense in two
     columns, and leaving it on would bury one heading below its shot. */
  .proof-row-flip .proof-copy { order: 0; }
  .proof-row-flip .proof-shot { order: 0; }
  .proof-body { max-width: none; }
}

@media (max-width: 680px) {
  .landing-nav-inner { padding: 12px 16px; }
  .landing-nav-brand-word { display: none; }
  .landing-nav-cta { font-size: 0.78rem; padding: 8px 13px; }
  .hero { padding: 52px 20px 64px; }
  .hero-head { margin-bottom: 40px; }
  .hero-cta-row { display: flex; width: 100%; }
  .hero-cta { flex: 1 1 auto; justify-content: center; }
  .proof, .steps, .voice, .platforms { padding: 64px 20px; }
  .proof-rows { gap: 56px; }
  .steps-list,
  .voice-grid,
  .platforms-grid {
    grid-template-columns: 1fr;
  }
  .voice-headline-lg { grid-column: 1; font-size: 1.6rem; }
  .freeband { padding: 16px 20px 32px; }
  .freeband-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 28px 24px;
  }
  .closer { padding: 64px 20px 80px; }
}
</style>

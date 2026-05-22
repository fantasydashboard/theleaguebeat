<template>
  <div class="mockup-page">
    <!-- ─── Page header ────────────────────────────────────────────── -->
    <header class="page-head">
      <p class="page-eyebrow">
        <span class="page-eyebrow-bar" aria-hidden="true"></span>
        Brand exploration
      </p>
      <h1 class="page-headline">The League Beat — wordmark mockups.</h1>
      <p class="page-deck">
        Eight treatments in the actual brand system: Barlow Black on
        OKLCH neutrals, magenta and gold accents. Pick what reads.
      </p>
    </header>

    <!-- ─── 1. Pure wordmark, single line ──────────────────────────── -->
    <section class="variant">
      <div class="variant-meta">
        <p class="variant-num">01</p>
        <h2 class="variant-title">Pure wordmark, single line</h2>
        <p class="variant-note">
          Barlow Black, all caps, tight tracking. The classic broadsheet
          masthead read. Reads as authority by default — no flourishes
          competing for attention.
        </p>
      </div>
      <div class="stage stage-dark">
        <div class="logo-pure">THE LEAGUE BEAT</div>
      </div>
    </section>

    <!-- ─── 2. Stacked wordmark ────────────────────────────────────── -->
    <section class="variant">
      <div class="variant-meta">
        <p class="variant-num">02</p>
        <h2 class="variant-title">Stacked wordmark</h2>
        <p class="variant-note">
          "THE LEAGUE" small over "BEAT" huge. BEAT carries the visual
          weight, which means spoken brand defaults to the punchy word.
          Most magazine-poster-coded of the bunch.
        </p>
      </div>
      <div class="stage stage-dark">
        <div class="logo-stacked">
          <span class="logo-stacked-top">THE LEAGUE</span>
          <span class="logo-stacked-bottom">BEAT</span>
        </div>
      </div>
    </section>

    <!-- ─── 3. Masthead treatment ─────────────────────────────────── -->
    <section class="variant">
      <div class="variant-meta">
        <p class="variant-num">03</p>
        <h2 class="variant-title">Masthead treatment</h2>
        <p class="variant-note">
          Newspaper masthead trope. Wordmark, thin rule, publication
          metadata in small caps below. Telegraphs "this is a real
          publication" before anyone reads a word of copy.
        </p>
      </div>
      <div class="stage stage-dark">
        <div class="logo-masthead">
          <div class="logo-masthead-mark">THE LEAGUE BEAT</div>
          <div class="logo-masthead-rule" aria-hidden="true"></div>
          <div class="logo-masthead-meta">
            <span>VOL. 1</span>
            <span>·</span>
            <span>ISSUE 8</span>
            <span>·</span>
            <span>WEEK 8 — 2026</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── 4. Separator dots ─────────────────────────────────────── -->
    <section class="variant">
      <div class="variant-meta">
        <p class="variant-num">04</p>
        <h2 class="variant-title">Separator dots</h2>
        <p class="variant-note">
          THE · LEAGUE · BEAT. Box-score / stat-line cadence baked into
          the wordmark itself. Quieter than the stacked version, more
          ownable than the pure version.
        </p>
      </div>
      <div class="stage stage-dark">
        <div class="logo-dotted">
          <span>THE</span>
          <span class="logo-dotted-sep" aria-hidden="true">·</span>
          <span>LEAGUE</span>
          <span class="logo-dotted-sep" aria-hidden="true">·</span>
          <span>BEAT</span>
        </div>
      </div>
    </section>

    <!-- ─── 5. Gold underline accent (signature move) ─────────────── -->
    <section class="variant">
      <div class="variant-meta">
        <p class="variant-num">05</p>
        <h2 class="variant-title">Underline on BEAT (signature move)</h2>
        <p class="variant-note">
          Gold accent under the loudest word. The kind of "one thing
          someone could describe in a sentence" signature that
          memorable logos earn through restraint.
        </p>
      </div>
      <div class="stage stage-dark">
        <div class="logo-underline">
          <span>THE LEAGUE </span>
          <span class="logo-underline-target">BEAT</span>
        </div>
      </div>
    </section>

    <!-- ─── 6. Wordmark + pennant mark ────────────────────────────── -->
    <section class="variant">
      <div class="variant-meta">
        <p class="variant-num">06</p>
        <h2 class="variant-title">Wordmark + pennant mark</h2>
        <p class="variant-note">
          Small pennant-flag mark next to the wordmark. Adds a
          separable graphic element that can stand alone as a favicon
          or social avatar. Sports-coded without being on-the-nose.
        </p>
      </div>
      <div class="stage stage-dark">
        <div class="logo-with-mark">
          <svg class="logo-mark-pennant" width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            <!-- Pennant on a thin pole; magenta accent body, gold staff tip. -->
            <line x1="14" y1="6" x2="14" y2="50" stroke="oklch(0.78 0.18 92)" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="14" cy="6" r="2.4" fill="oklch(0.78 0.18 92)"/>
            <path d="M14 12 L44 18 L34 24 L44 30 L14 36 Z" fill="oklch(0.70 0.27 350)" />
          </svg>
          <span class="logo-with-mark-text">THE LEAGUE BEAT</span>
        </div>
      </div>
    </section>

    <!-- ─── 7. Wordmark + waveform mark ───────────────────────────── -->
    <section class="variant">
      <div class="variant-meta">
        <p class="variant-num">07</p>
        <h2 class="variant-title">Wordmark + waveform mark</h2>
        <p class="variant-note">
          Audio-wave bars leaning into the "Beat" double meaning
          (journalism beat + rhythmic beat). More modern, slightly more
          podcast/broadcast register than the pennant.
        </p>
      </div>
      <div class="stage stage-dark">
        <div class="logo-with-mark">
          <svg class="logo-mark-wave" width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            <!-- 5 vertical bars of varying height — like an EQ readout -->
            <rect x="6"  y="22" width="6" height="12" rx="1" fill="oklch(0.97 0.005 90)"/>
            <rect x="16" y="14" width="6" height="28" rx="1" fill="oklch(0.97 0.005 90)"/>
            <rect x="26" y="6"  width="6" height="44" rx="1" fill="oklch(0.78 0.18 92)"/>
            <rect x="36" y="18" width="6" height="20" rx="1" fill="oklch(0.97 0.005 90)"/>
            <rect x="46" y="24" width="6" height="8"  rx="1" fill="oklch(0.97 0.005 90)"/>
          </svg>
          <span class="logo-with-mark-text">THE LEAGUE BEAT</span>
        </div>
      </div>
    </section>

    <!-- ─── 8. Monogram (favicon / social avatar) ─────────────────── -->
    <section class="variant">
      <div class="variant-meta">
        <p class="variant-num">08</p>
        <h2 class="variant-title">Monogram (favicon &amp; social avatar)</h2>
        <p class="variant-note">
          For the square contexts where the wordmark would die: favicon,
          iOS / Android app icon, social profile picture. Two
          treatments: stacked TLB initials, and BEAT-only as the
          loudest fragment.
        </p>
      </div>
      <div class="stage stage-dark stage-row">
        <div class="logo-monogram logo-monogram-tlb">
          <span>T</span>
          <span>L</span>
          <span>B</span>
        </div>
        <div class="logo-monogram logo-monogram-beat">
          <span>BEAT</span>
        </div>
        <div class="logo-monogram-tiny" aria-label="Favicon size preview">
          <span>LB</span>
        </div>
      </div>
    </section>

    <!-- ─── Color variants of the winning shape ───────────────────── -->
    <section class="variant">
      <div class="variant-meta">
        <p class="variant-num">09</p>
        <h2 class="variant-title">Color treatments</h2>
        <p class="variant-note">
          Same stacked wordmark in four color systems. Test how the
          brand reads against different backgrounds before deciding
          which is the canonical primary lockup.
        </p>
      </div>
      <div class="color-grid">
        <div class="color-swatch color-swatch-dark">
          <div class="logo-stacked logo-stacked-sm">
            <span class="logo-stacked-top">THE LEAGUE</span>
            <span class="logo-stacked-bottom">BEAT</span>
          </div>
          <p class="color-swatch-label">Default — white on ink</p>
        </div>
        <div class="color-swatch color-swatch-dark">
          <div class="logo-stacked logo-stacked-sm logo-stacked-gold">
            <span class="logo-stacked-top">THE LEAGUE</span>
            <span class="logo-stacked-bottom">BEAT</span>
          </div>
          <p class="color-swatch-label">Gold on ink — premium</p>
        </div>
        <div class="color-swatch color-swatch-gold">
          <div class="logo-stacked logo-stacked-sm logo-stacked-dark">
            <span class="logo-stacked-top">THE LEAGUE</span>
            <span class="logo-stacked-bottom">BEAT</span>
          </div>
          <p class="color-swatch-label">Ink on gold — inverted</p>
        </div>
        <div class="color-swatch color-swatch-dark">
          <div class="logo-stacked logo-stacked-sm logo-stacked-split">
            <span class="logo-stacked-top">THE LEAGUE</span>
            <span class="logo-stacked-bottom">BEAT</span>
          </div>
          <p class="color-swatch-label">Magenta accent — loud</p>
        </div>
      </div>
    </section>

    <!-- ─── How to read these ─────────────────────────────────────── -->
    <footer class="page-footer">
      <h2 class="page-footer-headline">How to use this page</h2>
      <ul class="page-footer-list">
        <li>
          <strong>Squint test.</strong> Step back from the screen six
          feet. The variant that still reads cleanly is the strongest
          candidate.
        </li>
        <li>
          <strong>Favicon test.</strong> Variants 1, 4, and 8 should
          survive at 16×16. The masthead and underline variants are
          chrome-only.
        </li>
        <li>
          <strong>Pair with voice.</strong> Imagine the wordmark on top
          of a headline like "The dynasty falls." If the pair earns
          its space, it's the right shape.
        </li>
      </ul>
    </footer>
  </div>
</template>

<script setup lang="ts">
/* No script logic — this page exists purely to render wordmark
   treatments in the live brand system so we can pick a direction
   before committing to vector files. */
</script>

<style scoped>
/* ─── Tokens ─────────────────────────────────────────────────────── */
.mockup-page {
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
  padding: 64px 48px 96px;
  max-width: 1200px;
  margin: 0 auto;
}

/* ─── Page head ──────────────────────────────────────────────────── */
.page-head { margin-bottom: 72px; }
.page-eyebrow {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 800;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--accent-teal);
  margin: 0 0 16px;
}
.page-eyebrow-bar { width: 28px; height: 2px; background: var(--accent-teal); }
.page-headline {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: clamp(2.5rem, 5vw, 4rem);
  letter-spacing: -0.02em;
  line-height: 0.94;
  margin: 0 0 18px;
  color: var(--ink-1);
}
.page-deck {
  font-size: 1.05rem;
  line-height: 1.55;
  color: var(--ink-2);
  max-width: 60ch;
  margin: 0;
}

/* ─── Variant section ────────────────────────────────────────────── */
.variant {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 48px;
  align-items: start;
  padding: 64px 0;
  border-top: 1px solid var(--ink-5);
}
.variant-meta { position: sticky; top: 24px; }
.variant-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem; font-weight: 800;
  letter-spacing: 0.16em;
  color: var(--accent-magenta);
  margin: 0 0 10px;
}
.variant-title {
  font-family: 'Barlow', sans-serif;
  font-weight: 800;
  font-size: 1.4rem;
  line-height: 1.15;
  letter-spacing: -0.01em;
  margin: 0 0 14px;
  color: var(--ink-1);
}
.variant-note {
  font-size: 0.94rem;
  line-height: 1.55;
  color: var(--ink-3);
  margin: 0;
  max-width: 38ch;
}

/* ─── Stages ─────────────────────────────────────────────────────── */
.stage {
  border-radius: 14px;
  padding: 80px 56px;
  display: flex; align-items: center; justify-content: center;
  min-height: 220px;
  overflow: hidden;
}
.stage-dark {
  background: var(--ink-7);
  border: 1px solid var(--ink-5);
}
.stage-row {
  flex-direction: row;
  gap: 56px;
  flex-wrap: wrap;
}

/* ─── 1. Pure wordmark ───────────────────────────────────────────── */
.logo-pure {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: clamp(2.2rem, 5vw, 4.2rem);
  letter-spacing: -0.025em;
  line-height: 1;
  color: var(--ink-1);
  text-transform: uppercase;
}

/* ─── 2. Stacked wordmark ────────────────────────────────────────── */
.logo-stacked {
  display: flex; flex-direction: column;
  align-items: flex-start;
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  line-height: 0.88;
  text-transform: uppercase;
  color: var(--ink-1);
}
.logo-stacked-top {
  font-size: clamp(0.9rem, 1.6vw, 1.4rem);
  letter-spacing: 0.32em;
  font-weight: 800;
  margin-bottom: 6px;
  color: var(--ink-2);
}
.logo-stacked-bottom {
  font-size: clamp(3.5rem, 9vw, 7rem);
  letter-spacing: -0.04em;
  font-weight: 900;
}

/* ─── 3. Masthead treatment ──────────────────────────────────────── */
.logo-masthead {
  display: flex; flex-direction: column;
  align-items: center;
}
.logo-masthead-mark {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: clamp(2.4rem, 5.5vw, 4.4rem);
  letter-spacing: -0.025em;
  text-transform: uppercase;
  color: var(--ink-1);
  line-height: 1;
  margin-bottom: 16px;
}
.logo-masthead-rule {
  width: 100%; max-width: 520px;
  height: 1px;
  background: var(--accent-gold);
  margin-bottom: 12px;
}
.logo-masthead-meta {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.76rem; font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ink-3);
}

/* ─── 4. Separator dots ──────────────────────────────────────────── */
.logo-dotted {
  display: inline-flex; align-items: center;
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: clamp(2rem, 4.5vw, 3.6rem);
  letter-spacing: -0.015em;
  text-transform: uppercase;
  color: var(--ink-1);
  line-height: 1;
}
.logo-dotted-sep {
  color: var(--accent-gold);
  margin: 0 18px;
  position: relative;
  top: -0.06em;
}

/* ─── 5. Underline accent ────────────────────────────────────────── */
.logo-underline {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: clamp(2.2rem, 5vw, 4.2rem);
  letter-spacing: -0.025em;
  text-transform: uppercase;
  color: var(--ink-1);
  line-height: 1;
}
.logo-underline-target {
  position: relative;
  display: inline-block;
}
.logo-underline-target::after {
  content: '';
  position: absolute;
  left: 0; right: 0;
  bottom: -0.18em;
  height: 6px;
  background: var(--accent-gold);
  border-radius: 2px;
}

/* ─── 6/7. Wordmark + mark ──────────────────────────────────────── */
.logo-with-mark {
  display: inline-flex; align-items: center; gap: 24px;
}
.logo-mark-pennant, .logo-mark-wave {
  flex-shrink: 0;
}
.logo-with-mark-text {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 4vw, 3.4rem);
  letter-spacing: -0.025em;
  text-transform: uppercase;
  color: var(--ink-1);
  line-height: 1;
}

/* ─── 8. Monogram ────────────────────────────────────────────────── */
.logo-monogram {
  width: 140px; height: 140px;
  border-radius: 24px;
  background: var(--ink-1);
  color: var(--ink-8);
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  display: flex; align-items: center; justify-content: center;
}
.logo-monogram-tlb {
  font-size: 3.4rem;
  letter-spacing: -0.06em;
  gap: 4px;
}
.logo-monogram-beat {
  background: var(--accent-gold);
  font-size: 1.6rem;
  letter-spacing: 0.04em;
}
.logo-monogram-tiny {
  width: 64px; height: 64px;
  border-radius: 12px;
  background: var(--ink-1);
  color: var(--ink-8);
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 1.5rem;
  letter-spacing: -0.05em;
  display: flex; align-items: center; justify-content: center;
}

/* ─── 9. Color swatches ──────────────────────────────────────────── */
.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}
.color-swatch {
  border-radius: 14px;
  padding: 48px 28px 22px;
  display: flex; flex-direction: column;
  align-items: center;
  gap: 18px;
  min-height: 200px;
  justify-content: space-between;
}
.color-swatch-dark {
  background: var(--ink-7);
  border: 1px solid var(--ink-5);
}
.color-swatch-gold {
  background: var(--accent-gold);
}
.color-swatch-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.76rem; font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0;
}
.color-swatch-gold .color-swatch-label { color: oklch(0.30 0.05 92); }

.logo-stacked-sm .logo-stacked-top { font-size: 0.7rem; letter-spacing: 0.28em; }
.logo-stacked-sm .logo-stacked-bottom { font-size: 2.4rem; letter-spacing: -0.04em; }
.logo-stacked-gold .logo-stacked-bottom { color: var(--accent-gold); }
.logo-stacked-gold .logo-stacked-top    { color: var(--accent-gold); opacity: 0.65; }
.logo-stacked-dark .logo-stacked-bottom { color: oklch(0.18 0.04 92); }
.logo-stacked-dark .logo-stacked-top    { color: oklch(0.30 0.05 92); }
.logo-stacked-split .logo-stacked-bottom { color: var(--accent-magenta); }

/* ─── Footer ─────────────────────────────────────────────────────── */
.page-footer {
  margin-top: 88px;
  padding-top: 48px;
  border-top: 1px solid var(--ink-5);
}
.page-footer-headline {
  font-family: 'Barlow', sans-serif;
  font-weight: 800;
  font-size: 1.5rem;
  letter-spacing: -0.01em;
  margin: 0 0 18px;
}
.page-footer-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex; flex-direction: column;
  gap: 14px;
  color: var(--ink-2);
  font-size: 0.98rem;
  line-height: 1.55;
  max-width: 70ch;
}
.page-footer-list strong { color: var(--ink-1); font-weight: 700; }

/* ─── Mobile ─────────────────────────────────────────────────────── */
@media (max-width: 820px) {
  .mockup-page { padding: 36px 20px 60px; }
  .variant { grid-template-columns: 1fr; gap: 28px; padding: 44px 0; }
  .variant-meta { position: static; }
  .stage { padding: 48px 24px; min-height: 160px; }
  .stage-row { gap: 24px; }
  .logo-monogram { width: 100px; height: 100px; }
  .logo-monogram-tlb { font-size: 2.4rem; }
  .logo-monogram-beat { font-size: 1.2rem; }
  .logo-monogram-tiny { width: 48px; height: 48px; font-size: 1.1rem; }
}
</style>

<template>
  <div class="home">
    <!-- ─────────────────────────────────────────────────────────────
         LIVE LOAD STATUS — only renders when a leagueId is in the
         URL and the live adapter is fetching or has errored. The
         underlying editorial keeps a fixture-derived render as its
         initial value, so the page remains visually populated.
    ────────────────────────────────────────────────────────────── -->
    <div v-if="liveLoading" class="live-banner live-banner-loading" role="status" aria-live="polite">
      <!-- Brand-aware loading mark: monogram pulses in place of the
           generic spinner ring. Quieter, more on-brand. -->
      <span class="live-banner-mark" aria-hidden="true">
        <img src="/tlb-favicon.png" alt="" class="live-banner-mark-img" />
      </span>
      Loading your league from {{ platformLabel }}. Hang tight.
    </div>
    <LiveLoadError v-else-if="liveError" :message="liveError" />

    <!-- ─────────────────────────────────────────────────────────────
         NEW ISSUE COMPOSITION — dynamic section list driven by the
         detection + selection + composition pipeline. See
         docs/EDITORIAL_ARCHITECTURE.md. Sections render in priority
         order; the legacy hero face-off below still renders for
         compatibility until Tier 1 finishes replacing it.
    ────────────────────────────────────────────────────────────── -->
    <template v-for="section in dynamicIssueSections" :key="`${section.type}:${section.story?.signature ?? 'anchor'}`">
      <HeroSolo
        v-if="section.type === 'hero-solo' && section.story"
        :story="section.story"
        :data="issueData"
      />
      <HeroQuiet
        v-else-if="section.type === 'hero-quiet'"
        :story="section.story"
        :data="issueData"
      />
      <MatchupOfWeek
        v-else-if="section.type === 'matchup-of-week' && section.story"
        :story="section.story"
        :data="issueData"
      />
      <StreakWatch
        v-else-if="section.type === 'streak-watch' && section.story"
        :story="section.story"
        :data="issueData"
      />
      <DivisionRace
        v-else-if="section.type === 'division-race' && section.story"
        :story="section.story"
        :data="issueData"
      />
      <!-- hero-faceoff falls through to the legacy inline section
           below, which already renders the face-off layout. Future
           tiers will extract it into HeroFaceoff.vue and remove the
           legacy inline section. -->
    </template>

    <!-- ─────────────────────────────────────────────────────────────
         1. THE HEADLINE — Story of Week 8
         Editorial hero, protagonist vs antagonist face-off.
         Magazine-cover read: "The dynasty falls." Closer's Therapy
         lost three straight; Bullpen Theology is the new throne.
    ────────────────────────────────────────────────────────────── -->
    <section class="hero" aria-labelledby="hero-headline">
      <div class="hero-copy">
        <p class="hero-eyebrow">
          <span class="hero-eyebrow-bar" aria-hidden="true"></span>
          {{ liveEditorial.hero.eyebrow }}
        </p>
        <h1 class="hero-headline" id="hero-headline">{{ liveEditorial.hero.headline }}</h1>
        <p class="hero-body">{{ liveEditorial.hero.body }}</p>
        <button
          type="button"
          class="hero-share"
          aria-label="Share this story to your league chat"
          @click="$emit('open-signup')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          Share this story
        </button>
      </div>

      <div
        class="hero-faceoff"
        :class="{ 'hero-faceoff-solo': !hasAntagonist }"
        :aria-label="hasAntagonist
          ? `${protagonist.name} overtaking ${antagonist.name} for first place`
          : `${protagonist.name} feature`"
      >
        <article class="faceoff-team faceoff-rise">
          <div class="faceoff-avatar" :style="{ background: `linear-gradient(135deg, ${protagonist.avatarColor})` }">
            <img v-if="protagonist.avatarUrl" :src="protagonist.avatarUrl" class="avatar-image" alt="" />
            <span v-else>{{ protagonist.ownerInitials }}</span>
          </div>
          <div class="faceoff-meta">
            <p class="faceoff-name">{{ protagonist.name }}</p>
            <p class="faceoff-owner">{{ protagonist.ownerName }}</p>
            <div class="faceoff-rankrow">
              <span class="faceoff-rankchip faceoff-rankchip-now">#{{ protagonistRank }}</span>
              <span v-if="protagonistDelta !== 0" class="faceoff-trend" :class="protagonistDelta > 0 ? 'faceoff-trend-up' : 'faceoff-trend-down'">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline v-if="protagonistDelta > 0" points="6 15 12 9 18 15"/>
                  <polyline v-else points="6 9 12 15 18 9"/>
                </svg>
                {{ protagonistDelta > 0 ? '+' : '' }}{{ protagonistDelta }}
              </span>
            </div>
          </div>
        </article>

        <div v-if="hasAntagonist" class="faceoff-verb" aria-hidden="true">
          <span class="faceoff-verb-line"></span>
          <span class="faceoff-verb-word">overtakes</span>
          <span class="faceoff-verb-line"></span>
        </div>

        <article v-if="hasAntagonist" class="faceoff-team faceoff-fall">
          <div class="faceoff-avatar faceoff-avatar-dim" :style="{ background: `linear-gradient(135deg, ${antagonist.avatarColor})` }">
            <img v-if="antagonist.avatarUrl" :src="antagonist.avatarUrl" class="avatar-image" alt="" />
            <span v-else>{{ antagonist.ownerInitials }}</span>
          </div>
          <div class="faceoff-meta">
            <p class="faceoff-name">{{ antagonist.name }}</p>
            <p class="faceoff-owner">{{ antagonist.ownerName }}</p>
            <div class="faceoff-rankrow">
              <span class="faceoff-rankchip faceoff-rankchip-fell">#{{ antagonistRank }}</span>
              <span v-if="antagonistDelta !== 0" class="faceoff-trend" :class="antagonistDelta > 0 ? 'faceoff-trend-up' : 'faceoff-trend-down'">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline v-if="antagonistDelta > 0" points="6 15 12 9 18 15"/>
                  <polyline v-else points="6 9 12 15 18 9"/>
                </svg>
                {{ antagonistDelta > 0 ? '+' : '' }}{{ antagonistDelta }}
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         2. RACE FOR THE PLAYOFFS — Seeds 5-8 bubble comparison.
         Top 6 make playoffs. Bubble = seeds 5-8 with the playoff
         line between seed 6 and seed 7. MV row gets yellow wayfinding
         tint + star pin (third-person copy elsewhere).
    ────────────────────────────────────────────────────────────── -->
    <section class="bubble" aria-labelledby="bubble-headline">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta">Playoff push</p>
        <h2 class="bubble-headline" id="bubble-headline">Four teams. Two spots.</h2>
        <p class="bubble-deck">{{ bubbleDeckText }}</p>
      </header>

      <ol class="bubble-list" role="list">
        <template v-for="(row, idx) in bubbleRows" :key="row.teamId">
          <li
            class="bubble-row"
            :class="{
              'bubble-row-in':  row.inPlayoffs,
              'bubble-row-out': !row.inPlayoffs,
              'bubble-row-mine': lookupTeam(row.teamId).isMyTeam,
            }"
          >
            <span class="bubble-seed" :class="{ 'bubble-seed-in': row.inPlayoffs }">{{ row.rank }}</span>

            <div class="bubble-team">
              <div
                class="bubble-avatar"
                :style="{ background: `linear-gradient(135deg, ${lookupTeam(row.teamId).avatarColor})` }"
              >
                <img
                  v-if="lookupTeam(row.teamId).avatarUrl"
                  :src="lookupTeam(row.teamId).avatarUrl"
                  class="avatar-image"
                  alt=""
                />
                <span v-else>{{ lookupTeam(row.teamId).ownerInitials }}</span>
                <span
                  v-if="lookupTeam(row.teamId).isMyTeam"
                  class="bubble-star"
                  aria-label="My team marker"
                  title="My team"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <polygon points="12 2 15 9 22 9.5 16.5 14.5 18 22 12 18 6 22 7.5 14.5 2 9.5 9 9"/>
                  </svg>
                </span>
              </div>
              <div class="bubble-name-block">
                <p class="bubble-name">{{ lookupTeam(row.teamId).name }}</p>
                <p class="bubble-owner">{{ lookupTeam(row.teamId).ownerName }}</p>
              </div>
            </div>

            <span class="bubble-record">{{ row.wins }}-{{ row.losses }}-{{ row.ties }}</span>

            <span class="bubble-dots" :aria-label="`Last 5 matchups: ${row.lastFive.join(', ')}`">
              <span
                v-for="(r, i) in row.lastFive"
                :key="i"
                class="bubble-dot"
                :class="r === 'W' ? 'bubble-dot-w' : r === 'L' ? 'bubble-dot-l' : 'bubble-dot-t'"
                aria-hidden="true"
              ></span>
            </span>

            <span
              class="bubble-streak"
              :class="row.streak.startsWith('W') ? 'bubble-streak-win' : row.streak.startsWith('L') ? 'bubble-streak-loss' : 'bubble-streak-tie'"
            >{{ row.streak }}</span>

            <span class="bubble-gap" :class="{ 'bubble-gap-out': !row.inPlayoffs }">
              <template v-if="row.inPlayoffs">in</template>
              <template v-else>+{{ row.gamesBack }} to bubble</template>
            </span>
          </li>

          <!-- Playoff line sits between seed 6 (idx 1) and seed 7 (idx 2). -->
          <li v-if="idx === 1" class="bubble-cutoff" aria-hidden="true">
            <span class="bubble-cutoff-line"></span>
            <span class="bubble-cutoff-label">Playoff line</span>
            <span class="bubble-cutoff-line"></span>
          </li>
        </template>
      </ol>

      <p class="bubble-closer">{{ liveEditorial.playoffPushCloser }}</p>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         3. YESTERDAY'S BIG SWINGS — Daily player digest (5 cards)
         Replaces football's "Week 10 Results" with a daily-cadence
         beat suited to category baseball.
    ────────────────────────────────────────────────────────────── -->
    <!-- Strict-live mode hides the fixture-driven Big Swings carousel.
         The replacement ("This Week's Movers") derived from live data
         is a follow-up — until then we'd rather show nothing than fake
         box-score stories with demo player names. -->
    <section v-if="!isStrictLiveMode" class="story-track-section" aria-labelledby="swings-h">
      <header class="section-head section-head-flex">
        <div>
          <p class="section-eyebrow section-eyebrow-teal">Yesterday's big swings</p>
          <h2 id="swings-h" class="section-headline">Five swings that moved the math.</h2>
        </div>
        <div class="track-arrows" aria-hidden="false">
          <button
            type="button"
            class="arrow-btn"
            :disabled="atStart"
            aria-label="Previous page"
            @click="scrollTrack(-1)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button
            type="button"
            class="arrow-btn"
            :disabled="atEnd"
            aria-label="Next page"
            @click="scrollTrack(1)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </header>

      <div
        ref="trackRef"
        class="story-track"
        role="region"
        aria-roledescription="carousel"
        aria-label="Yesterday's big swings"
      >
        <!-- ─── CARD 1: MONSTER NIGHT ──────────────────────────────── -->
        <article
          class="story-page story-page-monster"
          :style="{ '--page-tint': cardTint(swings[0]) }"
          :aria-label="`Page 1 of 5: Monster night, ${swings[0].playerName}`"
        >
          <img
            class="story-mascot story-mascot-right-bleed"
            :src="`/demo-categories-logos/${swings[0].fantasyTeamId}.jpg`"
            :alt="`${getTeam(swings[0].fantasyTeamId).name} logo`"
            @error="onMascotError"
          />
          <div class="story-content">
            <div class="story-head">
              <span class="story-index">01 / 05</span>
              <span class="story-tag story-tag-green">Monster night</span>
            </div>
            <h3 class="story-headline">{{ surnameOf(swings[0].playerName) }} dropped two.</h3>
            <div class="story-stat-block">
              <p class="story-stat-hero story-stat-hero-green">+2 HR</p>
              <p class="story-stat-label">Biggest impact</p>
              <p class="story-stat-line">{{ swings[0].statLine }}</p>
            </div>
            <p class="story-body">{{ swings[0].matchupImpact }}</p>
          </div>
        </article>

        <!-- ─── CARD 2: ACE NIGHT ──────────────────────────────────── -->
        <article
          class="story-page story-page-ace"
          :aria-label="`Page 2 of 5: Ace night, ${swings[1].playerName}`"
        >
          <img
            class="story-mascot story-mascot-stamp"
            :src="`/demo-categories-logos/${swings[1].fantasyTeamId}.jpg`"
            :alt="`${getTeam(swings[1].fantasyTeamId).name} logo`"
            @error="onMascotError"
          />
          <div class="story-content">
            <div class="story-head">
              <span class="story-index">02 / 05</span>
              <span class="story-tag story-tag-teal">Ace night</span>
            </div>
            <h3 class="story-headline">{{ surnameOf(swings[1].playerName) }} struck out 12.</h3>
            <div class="story-stat-block">
              <p class="story-stat-hero story-stat-hero-teal">12 K</p>
              <p class="story-stat-label">Biggest impact</p>
              <p class="story-stat-line">{{ swings[1].statLine }}</p>
            </div>
            <p class="story-body">{{ swings[1].matchupImpact }} Cat locked.</p>
          </div>
        </article>

        <!-- ─── CARD 3: ANOTHER ONE (CLOSER) ───────────────────────── -->
        <article
          class="story-page story-page-closer"
          :aria-label="`Page 3 of 5: Another save, ${swings[2].playerName}`"
        >
          <img
            class="story-mascot story-mascot-corner-bleed"
            :src="`/demo-categories-logos/${swings[2].fantasyTeamId}.jpg`"
            :alt="`${getTeam(swings[2].fantasyTeamId).name} logo`"
            @error="onMascotError"
          />
          <div class="story-content">
            <div class="story-head">
              <span class="story-index">03 / 05</span>
              <span class="story-tag story-tag-magenta">Another one</span>
            </div>
            <h3 class="story-headline">{{ surnameOf(swings[2].playerName) }} got the save.</h3>
            <div class="story-stat-block">
              <p class="story-stat-hero story-stat-hero-magenta">+1 SV</p>
              <p class="story-stat-label">Biggest impact</p>
              <p class="story-stat-line">{{ swings[2].statLine }}</p>
            </div>
            <p class="story-body">{{ swings[2].matchupImpact }}</p>
          </div>
        </article>

        <!-- ─── CARD 4: BREAKOUT ───────────────────────────────────── -->
        <article
          class="story-page story-page-breakout"
          :aria-label="`Page 4 of 5: Breakout, ${swings[3].playerName}`"
        >
          <img
            class="story-mascot story-mascot-dual-top"
            :src="`/demo-categories-logos/${swings[3].fantasyTeamId}.jpg`"
            :alt="`${getTeam(swings[3].fantasyTeamId).name} logo`"
            @error="onMascotError"
          />
          <div class="story-content">
            <div class="story-head">
              <span class="story-index">04 / 05</span>
              <span class="story-tag story-tag-yellow">Breakout</span>
            </div>
            <h3 class="story-headline">{{ surnameOf(swings[3].playerName) }} went 4-for-5 with a HR.</h3>
            <div class="story-stat-block">
              <p class="story-stat-hero story-stat-hero-yellow">+1 HR · +4 R</p>
              <p class="story-stat-label">Biggest impact</p>
              <p class="story-stat-line">{{ swings[3].statLine }}</p>
            </div>
            <p class="story-body">{{ swings[3].matchupImpact }}</p>
          </div>
        </article>

        <!-- ─── CARD 5: STEALTH GEM ────────────────────────────────── -->
        <article
          class="story-page story-page-gem"
          :aria-label="`Page 5 of 5: Stealth gem, ${swings[4].playerName}`"
        >
          <div class="story-content story-content-gem">
            <div class="story-head">
              <span class="story-index">05 / 05</span>
              <span class="story-tag story-tag-mute">Stealth gem</span>
            </div>
            <h3 class="story-headline story-headline-gem">{{ surnameOf(swings[4].playerName) }} now has 3 HLD this week.</h3>
            <div class="story-stat-block">
              <p class="story-stat-hero story-stat-hero-mute">+3 HLD</p>
              <p class="story-stat-label">Biggest impact</p>
              <p class="story-stat-line">{{ swings[4].statLine }}</p>
            </div>
            <p class="story-body">{{ swings[4].matchupImpact }}</p>
          </div>
        </article>
      </div>

      <div class="track-dots" role="tablist" aria-label="Page indicator">
        <button
          v-for="i in 5"
          :key="i"
          type="button"
          class="track-dot"
          :class="{ active: activePage === i }"
          :aria-selected="activePage === i"
          role="tab"
          :aria-label="`Go to page ${i} of 5`"
          @click="goToPage(i)"
        />
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         4. WEEK 8 — LIVE TODAY (cat status row per matchup)
    ────────────────────────────────────────────────────────────── -->
    <section class="live" aria-labelledby="live-headline">
      <header class="section-head section-head-flex">
        <div>
          <p class="section-eyebrow section-eyebrow-teal live-eyebrow">
            <span class="live-eyebrow-dot" aria-hidden="true"></span>
            Week {{ currentWeek }}. Live today
          </p>
          <h2 class="live-headline" id="live-headline">What's happening now.</h2>
        </div>
        <router-link to="/demo-categories/matchups" class="section-link">
          View full matchups
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </router-link>
      </header>

      <ul class="live-list" role="list">
        <li
          v-for="m in liveMatchupRows"
          :key="m.id"
          class="live-row"
          :class="{ 'live-row-spotlight': m.isSpotlight }"
          tabindex="0"
          role="link"
          :aria-label="`Open ${lookupTeam(m.homeTeamId).name} versus ${lookupTeam(m.awayTeamId).name}`"
          @click="goToMatchups"
          @keydown.enter.prevent="goToMatchups"
          @keydown.space.prevent="goToMatchups"
        >
          <span class="live-spotlight-edge" v-if="m.isSpotlight" aria-hidden="true"></span>

          <!-- Status pip -->
          <span class="live-status" :class="`live-status-${m.status}`">
            <span v-if="m.status === 'live'" class="live-status-dot" aria-hidden="true"></span>
            <svg v-else-if="m.status === 'final'" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span v-if="m.status === 'live'">LIVE</span>
            <span v-else-if="m.status === 'coasting'">COAST</span>
            <span v-else-if="m.status === 'final'">FINAL</span>
            <span v-else>SOON</span>
          </span>

          <!-- Home team -->
          <div class="live-team" :class="{ 'live-team-winning': m.aWins > m.bWins, 'live-team-losing': m.aWins < m.bWins }">
            <div class="live-avatar" :style="{ background: `linear-gradient(135deg, ${lookupTeam(m.homeTeamId).avatarColor})` }">
              <img v-if="lookupTeam(m.homeTeamId).avatarUrl" :src="lookupTeam(m.homeTeamId).avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ lookupTeam(m.homeTeamId).ownerInitials }}</span>
            </div>
            <p class="live-team-name">{{ lookupTeam(m.homeTeamId).name }}</p>
            <p class="live-team-score">{{ m.aWins }}</p>
          </div>

          <span class="live-vs" aria-hidden="true">vs</span>

          <!-- Away team -->
          <div class="live-team" :class="{ 'live-team-winning': m.bWins > m.aWins, 'live-team-losing': m.bWins < m.aWins }">
            <div class="live-avatar" :style="{ background: `linear-gradient(135deg, ${lookupTeam(m.awayTeamId).avatarColor})` }">
              <img v-if="lookupTeam(m.awayTeamId).avatarUrl" :src="lookupTeam(m.awayTeamId).avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ lookupTeam(m.awayTeamId).ownerInitials }}</span>
            </div>
            <p class="live-team-name">{{ lookupTeam(m.awayTeamId).name }}</p>
            <p class="live-team-score">{{ m.bWins }}</p>
          </div>

          <!-- Win prob chip -->
          <span
            class="live-prob"
            :style="{ color: probColorForRow(m), borderColor: probBorderForRow(m), background: probBgForRow(m) }"
          >
            {{ probSideLabelForRow(m) }} {{ probDisplayValueForRow(m) }}%
          </span>
        </li>
      </ul>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         5. STANDINGS — Compact (top 6 playoff line)
    ────────────────────────────────────────────────────────────── -->
    <section class="standings" aria-labelledby="standings-headline">
      <header class="section-head section-head-flex">
        <div>
          <p class="section-eyebrow section-eyebrow-magenta">Standings</p>
          <h2 class="standings-headline" id="standings-headline">Top {{ bubbleCutoff }} make the playoffs.</h2>
        </div>
        <router-link to="/demo-categories/power-rankings" class="section-link">
          View full rankings
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </router-link>
      </header>

      <div class="stand-head" role="presentation" aria-hidden="true">
        <span class="stand-head-cell stand-head-rank"></span>
        <span class="stand-head-cell stand-head-team">Team</span>
        <span class="stand-head-cell stand-head-rec">Cat W-L-T</span>
        <span class="stand-head-cell stand-head-last6">Last 6</span>
        <span class="stand-head-cell stand-head-streak">Streak</span>
      </div>

      <ol class="stand-list" role="list">
        <li
          v-for="row in standings"
          :key="row.teamId"
          class="stand-row"
          :class="{ 'stand-row-mine': lookupTeam(row.teamId).isMyTeam, 'stand-row-cutoff': row.rank === bubbleCutoff }"
          tabindex="0"
          role="button"
          :aria-label="`Open team detail for ${lookupTeam(row.teamId).name}`"
          @click="goToPowerRankings"
          @keydown.enter.prevent="goToPowerRankings"
          @keydown.space.prevent="goToPowerRankings"
        >
          <span class="stand-rank" :class="{ 'stand-rank-playoff': row.rank <= bubbleCutoff }">
            <span v-if="row.rank === 1" class="stand-rank-crown" aria-label="League leader">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>
              </svg>
            </span>
            <span class="stand-rank-num">{{ row.rank }}</span>
            <span v-if="row.rank <= bubbleCutoff && row.rank !== 1" class="stand-rank-dot" aria-hidden="true"></span>
          </span>

          <div class="stand-team">
            <div class="stand-avatar" :style="{ background: `linear-gradient(135deg, ${lookupTeam(row.teamId).avatarColor})` }">
              <img v-if="lookupTeam(row.teamId).avatarUrl" :src="lookupTeam(row.teamId).avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ lookupTeam(row.teamId).ownerInitials }}</span>
              <span v-if="lookupTeam(row.teamId).isMyTeam" class="stand-star" aria-label="Your team" title="Your team">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="12 2 15 9 22 9.5 16.5 14.5 18 22 12 18 6 22 7.5 14.5 2 9.5 9 9"/>
                </svg>
              </span>
            </div>
            <div class="stand-name-block">
              <p class="stand-name">{{ lookupTeam(row.teamId).name }}</p>
              <p class="stand-owner">{{ lookupTeam(row.teamId).ownerName }}</p>
            </div>
          </div>

          <span class="stand-record">{{ row.catWins }}-{{ row.catLosses }}-{{ row.catTies }}</span>

          <span class="stand-last6" :aria-label="`Last 6 matchups: ${row.lastSix.join(', ')}`">
            <span
              v-for="(r, i) in row.lastSix"
              :key="i"
              class="stand-last6-dot"
              :class="r === 'W' ? 'stand-last6-dot-w' : r === 'L' ? 'stand-last6-dot-l' : 'stand-last6-dot-t'"
              aria-hidden="true"
            ></span>
          </span>

          <span
            class="stand-streak"
            :class="row.streak.type === 'W' ? 'stand-streak-win' : row.streak.type === 'L' ? 'stand-streak-loss' : 'stand-streak-tie'"
          >{{ row.streak.type }}{{ row.streak.length }}</span>
        </li>
      </ol>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         6. CATS WON PER WEEK — multi-team chart with featured lines
    ────────────────────────────────────────────────────────────── -->
    <section class="ppw" aria-labelledby="ppw-headline">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal">Cats won per week</p>
        <h2 class="ppw-headline" id="ppw-headline">Who's been heating up.</h2>
      </header>

      <div class="ppw-chart-wrap">
        <svg
          class="ppw-chart"
          :viewBox="`0 0 ${PPW_W} ${PPW_H}`"
          role="img"
          aria-label="Weekly cats-won trajectory for every team in the league"
          preserveAspectRatio="none"
        >
          <!-- Gridlines -->
          <g class="ppw-grid" aria-hidden="true">
            <line
              v-for="gy in ppwGridY"
              :key="`pgl-${gy.value}`"
              :x1="PPW_PAD_L"
              :x2="PPW_W - PPW_PAD_R"
              :y1="gy.y"
              :y2="gy.y"
            />
            <text
              v-for="gy in ppwGridY"
              :key="`pgt-${gy.value}`"
              class="ppw-grid-label"
              :x="PPW_PAD_L - 8"
              :y="gy.y + 3"
              text-anchor="end"
            >{{ gy.value }}</text>
          </g>

          <!-- Background lines: the 7 non-featured teams at 12% opacity. -->
          <path
            v-for="bgTeamId in backgroundTeamIds"
            :key="`bg-${bgTeamId}`"
            class="ppw-line-bg"
            :d="teamPath(bgTeamId)"
            fill="none"
            :stroke="bgStrokeFor(bgTeamId)"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- League average dashed line — flat at 5.5 -->
          <path
            class="ppw-line-avg"
            :d="ppwAvgPath"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-dasharray="4 4"
          />

          <!-- Top scorer (bt) -->
          <path
            class="ppw-line-top"
            :d="topScorerPath"
            fill="none"
            :stroke="topScorerColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- My team (mv) -->
          <path
            class="ppw-line-mine"
            :d="myTeamPath"
            fill="none"
            stroke="var(--accent-primary)"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Endpoint labels -->
          <g v-if="topScorerEnd" class="ppw-end-label">
            <text
              :x="topScorerEnd.x + 6"
              :y="endpointY('top', topScorerEnd.y) + 4"
              :fill="topScorerColor"
              text-anchor="start"
            >{{ topScorerTeam.name }}</text>
          </g>
          <g v-if="myTeamEnd" class="ppw-end-label">
            <text
              :x="myTeamEnd.x + 6"
              :y="endpointY('mine', myTeamEnd.y) + 4"
              fill="var(--accent-primary)"
              text-anchor="start"
            >{{ myTeam.name }}</text>
          </g>
          <g v-if="avgEnd" class="ppw-end-label">
            <text
              :x="avgEnd.x + 6"
              :y="endpointY('avg', avgEnd.y) + 4"
              fill="var(--ink-4)"
              text-anchor="start"
            >League avg</text>
          </g>

          <!-- X axis week labels -->
          <g class="ppw-x-labels" aria-hidden="true">
            <text
              v-for="(_, i) in ppwWeekXs"
              :key="`pxl-${i}`"
              class="ppw-x-label"
              :x="ppwWeekXs[i]"
              :y="PPW_H - 6"
              text-anchor="middle"
            >Wk {{ i + 1 }}</text>
          </g>

          <!-- Annotation: Wk 6 Bullpen Theology takes #1 -->
          <g v-if="annotation" class="ppw-annotation">
            <line
              :x1="annotation.dotX"
              :y1="annotation.dotY"
              :x2="annotation.labelX"
              :y2="annotation.labelY - 6"
              stroke="var(--accent-secondary)"
              stroke-width="1"
              stroke-dasharray="2 3"
            />
            <circle :cx="annotation.dotX" :cy="annotation.dotY" r="4" fill="var(--accent-secondary)" />
            <text
              class="ppw-annotation-label"
              :x="annotation.labelX"
              :y="annotation.labelY"
              text-anchor="middle"
              fill="var(--accent-secondary)"
            >Wk 6: Bullpen Theology takes #1</text>
          </g>
        </svg>
      </div>

      <ul class="ppw-legend" role="list">
        <li class="ppw-legend-pill">
          <span class="ppw-legend-dot ppw-legend-dot-mine" aria-hidden="true"></span>
          Your team
        </li>
        <li class="ppw-legend-pill">
          <span class="ppw-legend-dot" :style="{ background: topScorerColor }" aria-hidden="true"></span>
          Top scorer this season ({{ topScorerTeam.name }})
        </li>
        <li class="ppw-legend-pill">
          <span class="ppw-legend-dash" aria-hidden="true"></span>
          League average
        </li>
      </ul>

      <p class="ppw-caption">Tap a team in the standings above to see their full weekly trajectory.</p>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         7. AROUND THE LEAGUE — 5 news ticker rows
    ────────────────────────────────────────────────────────────── -->
    <section class="ticker" aria-labelledby="ticker-headline">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-mute">Around the league</p>
        <h2 class="ticker-headline" id="ticker-headline">Five things worth knowing.</h2>
      </header>

      <ul class="ticker-list" role="list">
        <li
          v-for="(item, i) in liveEditorial.ticker"
          :key="i"
          class="ticker-row"
          :class="[`ticker-row-${tickerToneFor(item.eyebrow)}`, i < 2 ? 'ticker-row-edged' : 'ticker-row-flat']"
        >
          <span class="ticker-edge" :class="`ticker-edge-${tickerToneFor(item.eyebrow)}`" v-if="i < 2" aria-hidden="true"></span>
          <span class="ticker-dot" :class="`ticker-dot-${tickerToneFor(item.eyebrow)}`" aria-hidden="true"></span>
          <span v-if="item.eyebrow" class="ticker-tag" :class="`ticker-tag-${tickerToneFor(item.eyebrow)}`">{{ item.eyebrow }}</span>
          <p class="ticker-copy">{{ item.headline }}</p>
        </li>
      </ul>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         8. QUICK READS — footer pills
    ────────────────────────────────────────────────────────────── -->
    <section class="quick" aria-labelledby="quick-heading">
      <h2 class="section-eyebrow section-eyebrow-mute" id="quick-heading">Quick reads</h2>
      <ul class="pills" role="list">
        <li
          v-for="pill in liveEditorial.quickReads"
          :key="pill.label"
          class="pill"
          role="listitem"
        >
          <span class="pill-dot" :class="`pill-dot-${quickReadDotFor(pill.label)}`" aria-hidden="true"></span>
          <span class="pill-label">{{ formatPillLabel(pill.label) }}</span>
          <span class="pill-value">{{ pill.value }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLeaguesStore } from '@/stores/leaguesNew'
import {
  teams,
  standings2026Week8,
  matchupsWeek8,
  matchupOfTheWeekId,
  currentWeek,
  playoffCutoff,
  getTeam,
  weeklyCatsWon,
  weeklyCatLeagueAverage,
  yesterdayBigSwings,
} from '@/fixtures/categoriesLeague'
import { accentFor, accentStops } from '@/utils/teamColor'
import { smoothPath, type Point } from '@/utils/svgPath'
import { renderHomePage, type RenderedHomeCopy } from '@/editorial/render'
import { detectAll } from '@/editorial/detection'
import { selectStoriesForIssue } from '@/editorial/selection'
import { composeIssue, type IssueSection } from '@/editorial/composition'
import { deriveSeasonStage } from '@/editorial/detection/helpers'
import HeroSolo from '@/components/issue/HeroSolo.vue'
import HeroQuiet from '@/components/issue/HeroQuiet.vue'
import MatchupOfWeek from '@/components/issue/MatchupOfWeek.vue'
import StreakWatch from '@/components/issue/StreakWatch.vue'
import DivisionRace from '@/components/issue/DivisionRace.vue'
import { categoriesFixtureToLeagueData } from '@/editorial/fixtureAdapter'
import { sleeperLeagueToCategoryData } from '@/editorial/adapters/sleeperAdapter'
import { espnLeagueToCategoryData } from '@/editorial/adapters/espnAdapter'
import { yahooLeagueToCategoryData } from '@/editorial/adapters/yahooAdapter'
import type { CategoryLeagueData } from '@/editorial/types'
import { usePlatformsStore } from '@/stores/platforms'
import LiveLoadError from '@/components/demo/LiveLoadError.vue'

defineEmits<{ (e: 'open-signup'): void }>()

const router = useRouter()
const route = useRoute()

// Hero face-off — fixture defaults mirror the movement we wrote in
// seasonRankHistory (ct: W1 #1 → W8 #6 ; bt: W1 #4 → W8 #1). These act
// as the fallback when live data hasn't loaded yet, when no hero
// candidate fired, or when the winning kind has no opponent (quiet-day).
const fixtureProtagonist = getTeam('bt')
const fixtureAntagonist = getTeam('ct')

// My team — used for bubble star, standings yellow tint, and the chart line.
const myTeam = teams.find((t) => t.isMyTeam)!

// `liveData` is set alongside `liveEditorial` whenever the URL points
// the page at a real league (`?leagueId=…&platform=sleeper`). When it
// is null, every wired widget falls back to the hand-authored fixture.
const liveData = shallowRef<CategoryLeagueData | null>(null)

// Hero face-off teams — prefer live detection's protagonist/antagonist
// IDs (set on `liveEditorial.hero.protagonistTeamId` /
// `antagonistTeamId` by render.ts), falling back to the fixture pair
// when either is missing so the avatars never render broken.
const protagonist = computed(() => {
  const id = liveEditorial.value.hero.protagonistTeamId
  if (id && liveData.value) {
    const t = liveData.value.teams.find((x) => x.id === id)
    if (t) return t
  }
  return fixtureProtagonist
})
// `antagonist` only resolves when the detected hero kind has a real
// opponent (e.g. new-throne, dynasty-falling). Single-team heroes like
// bubble-surprise or hot-climber have no antagonist — in that case
// `hasAntagonist` is false and the face-off renders just the
// protagonist instead of falling back to a fixture logo (which is what
// previously caused "Closer's Therapy" to leak into live leagues).
const antagonist = computed(() => {
  const id = liveEditorial.value.hero.antagonistTeamId
  if (id && liveData.value) {
    const t = liveData.value.teams.find((x) => x.id === id)
    if (t) return t
  }
  return fixtureAntagonist
})
const hasAntagonist = computed(() => {
  if (!isStrictLiveMode.value) return true  // demo always shows both
  const id = liveEditorial.value.hero.antagonistTeamId
  if (!id || !liveData.value) return false
  return Boolean(liveData.value.teams.find((x) => x.id === id))
})

// Hero face-off ranks + season-deltas — derive from live standings so
// the chip + arrow update with the actual league state. Falls back to
// the fixture-baked values (#1 / #6 / +5 / -5) in demo mode.
function rankForTeam(teamId: string | undefined): number | undefined {
  if (!teamId) return undefined
  return liveData.value?.standings.find((s) => s.teamId === teamId)?.rank
}
function week1RankForTeam(teamId: string | undefined): number | undefined {
  if (!teamId || !liveData.value) return undefined
  const wk1 = liveData.value.seasonRankHistory.find((w) => w.week === 1)
  return wk1?.ranks[teamId]
}
const protagonistRank = computed(() => rankForTeam(protagonist.value.id) ?? 1)
const antagonistRank = computed(() => rankForTeam(antagonist.value.id) ?? 6)
const protagonistDelta = computed(() => {
  const w1 = week1RankForTeam(protagonist.value.id)
  if (typeof w1 !== 'number') return 5
  return w1 - protagonistRank.value
})
const antagonistDelta = computed(() => {
  const w1 = week1RankForTeam(antagonist.value.id)
  if (typeof w1 !== 'number') return -5
  return w1 - antagonistRank.value
})

// Weeks remaining until the regular season closes — drives the playoff
// push deck copy. Adapters that expose `regularSeasonEndWeek` (Yahoo
// today) get an accurate figure; otherwise fall back to the fixture's
// 12-week assumption. Clamped to a sensible floor so the copy stays
// grammatical when we're already in the playoffs.
const bubbleWeeksLeft = computed(() => {
  const wk = liveData.value?.currentWeek ?? currentWeek
  const end = liveData.value?.regularSeasonEndWeek ?? 12
  const left = end - wk
  if (left <= 0) return 0
  return left
})
const bubbleDeckText = computed(() => {
  const n = bubbleWeeksLeft.value
  if (n === 0) return 'Final week of the regular season.'
  if (n === 1) return 'One week left to settle the bubble.'
  return `${spellSmallNumber(n)} weeks left to settle the bubble.`
})
function spellSmallNumber(n: number): string {
  // Spelled-out forms match the rest of the editorial copy. Anything
  // past 12 falls back to digits — at that point the literal number
  // reads better than the wordy version.
  const words = [
    'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six',
    'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  ]
  return words[n] ?? String(n)
}

// Standings: live data when present, else the fixture's hand-authored row set.
const standings = computed(() =>
  liveData.value?.standings ?? standings2026Week8,
)

// Look up a team by id — prefers liveData.teams, falls back to the
// fixture's `getTeam()` so existing call sites keep working when no
// leagueId is set.
function lookupTeam(teamId: string) {
  const t = liveData.value?.teams.find((x) => x.id === teamId)
  if (t) return t
  // Fall through to fixture; if neither has it, synthesize a stub so
  // the template never crashes during transitional renders.
  try {
    return getTeam(teamId)
  } catch {
    return {
      id: teamId,
      name: `Team ${teamId}`,
      ownerName: `Manager ${teamId}`,
      ownerInitials: teamId.slice(0, 2).toUpperCase(),
      avatarUrl: undefined,
      avatarColor: 'oklch(0.62 0.18 200), oklch(0.42 0.18 220)',
      isMyTeam: false,
    }
  }
}

// TODO: wire to live daily MLB stats — needs per-game box scores +
// roster matching. For now the "Yesterday's Big Swings" carousel stays
// fixture-driven even when the rest of the page renders live data.
const swings = yesterdayBigSwings

/* ─────────────────────────────────────────────────────────────────
   BUBBLE — seeds 5..8. Same shape as football home.
───────────────────────────────────────────────────────────────── */

interface BubbleRow {
  teamId: string
  rank: number
  wins: number
  losses: number
  ties: number
  streak: string
  inPlayoffs: boolean
  gamesBack: number
  lastFive: ('W' | 'L' | 'T')[]
}

// Bubble window — top of cutoff ±2 (matches the four-team band the
// design assumes). With a 6-team playoff cutoff this is rows 5..8.
const bubbleCutoff = computed(() =>
  liveData.value?.playoffCutoff ?? playoffCutoff,
)
const bubbleRows = computed<BubbleRow[]>(() => {
  const cutoff = bubbleCutoff.value
  const list = standings.value
  const rows = list.filter((s) => s.rank >= cutoff - 1 && s.rank <= cutoff + 2)
  const cutoffStanding = list.find((s) => s.rank === cutoff)
  const cutoffWins = cutoffStanding?.catWins ?? 0
  return rows.map((s) => {
    const inPlayoffs = s.rank <= cutoff
    // Whole-game gap to the playoff line, measured in matchup-cat-wins
    // and converted to a "matchups behind" approximation. We collapse to a
    // single integer (rounded up) so the chip stays readable.
    let gamesBack = 0
    if (!inPlayoffs) {
      const diff = cutoffWins - s.catWins
      gamesBack = diff > 0 ? Math.max(1, Math.round(diff / 11)) : 1
    }
    return {
      teamId: s.teamId,
      rank: s.rank,
      wins: s.catWins,
      losses: s.catLosses,
      ties: s.catTies,
      streak: `${s.streak.type}${s.streak.length}`,
      inPlayoffs,
      gamesBack,
      lastFive: s.lastSix.slice(-5),
    }
  })
})

/* ─────────────────────────────────────────────────────────────────
   EDITORIAL — live copy from the detection + rendering pipeline.

   Source of truth:
   - Default: the hand-authored fixture (the demo experience).
   - When `?leagueId=…&platform=sleeper` is present in the URL:
     fetch live data via the matching adapter and re-render copy.
     The fixture render is kept as the synchronous initial value
     so the template never sees a null editorial during load.

   We use `shallowRef` because `RenderedHomeCopy` is a plain object
   tree of strings and we always swap the whole thing, not mutate
   it in place — shallowRef skips the unnecessary deep proxy.
───────────────────────────────────────────────────────────────── */
const liveEditorial = shallowRef<RenderedHomeCopy>(
  renderHomePage(categoriesFixtureToLeagueData()),
)
const liveLoading = ref(false)
const liveError = ref<string | null>(null)

/* ─────────────────────────────────────────────────────────────────
   NEW ISSUE PIPELINE — see docs/EDITORIAL_ARCHITECTURE.md.

   Replaces the static 7-section layout with a dynamic, magazine-style
   issue composition. Every visit gets a freshly-composed set of
   sections based on which story candidates fire from the data,
   ranked by importance + freshness + (eventually) personalization.

   For Tier 1 we render the new dynamic section list ABOVE the
   existing rendering — the legacy hero face-off + playoff push
   continue to render below for compatibility. The new system
   gradually replaces them as the rendered sections grow more
   comprehensive in future tiers.
───────────────────────────────────────────────────────────────── */
const issueSections = computed<IssueSection[]>(() => {
  const source = liveData.value ?? categoriesFixtureToLeagueData()
  const context = {
    currentWeek: source.currentWeek,
    seasonStage: deriveSeasonStage(
      source.currentWeek,
      source.regularSeasonEndWeek,
    ),
    issueDate: new Date(),
    viewer: source.teams.find((t) => t.isMyTeam)
      ? {
          userId: 'viewer',
          myTeamId: source.teams.find((t) => t.isMyTeam)?.id,
          myDivisionId: source.teams.find((t) => t.isMyTeam)?.divisionId,
        }
      : undefined,
  }
  const candidates = detectAll(source, context)
  const stories = selectStoriesForIssue(candidates, context)
  return composeIssue(stories, context)
})

/** Section types the new pipeline owns (rendered via the dynamic
 *  loop in the template). Anchor sections + existing inline content
 *  (standings, matchup feed, ticker, playoff push) keep their
 *  hand-authored rendering below. */
const NEW_SECTION_TYPES = new Set([
  'hero-faceoff',
  'hero-solo',
  'hero-quiet',
  'hero-trade',
  'hero-milestone',
  'matchup-of-week',
  'streak-watch',
  'division-race',
  'trade-recap',
  'player-spotlight',
])

const dynamicIssueSections = computed(() =>
  issueSections.value.filter((s) => NEW_SECTION_TYPES.has(s.type)),
)

/** Source league data passed to section components for team lookups. */
const issueData = computed(
  () => liveData.value ?? categoriesFixtureToLeagueData(),
)

// Two ways to bind this view to a real league:
//   - Strict mode: `/leagues/:leagueId/home` — leagueId is a Supabase
//     `leagues.id` UUID. We look up the row from the leaguesNew store
//     to discover the platform + platform_league_id. No fixture
//     fallback rendered when this mode is active.
//   - Soft mode (legacy): `/demo-categories/home?leagueId=…&platform=…`
//     — direct platform-league-id in the URL. Falls back to fixture
//     when no query params present. Kept until everything lives on the
//     new /leagues route tree.
const leaguesStore = useLeaguesStore()
const strictLeagueRecord = computed(() => {
  const uuid = route.params.leagueId
  if (typeof uuid !== 'string' || uuid.length === 0) return null
  return leaguesStore.leagues.find((l) => l.id === uuid) ?? null
})
const isStrictLiveMode = computed(() => typeof route.params.leagueId === 'string')

const liveLeagueId = computed<string | null>(() => {
  // Strict route: the platform's own league id lives on the leagues
  // store record (we keep the Supabase UUID in the URL for cleanliness).
  if (isStrictLiveMode.value) {
    return strictLeagueRecord.value?.platform_league_id ?? null
  }
  const v = route.query.leagueId
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
})
const livePlatform = computed<string | null>(() => {
  if (isStrictLiveMode.value) {
    return strictLeagueRecord.value?.platform ?? null
  }
  const v = route.query.platform
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
})

// Human-readable platform label, surfaced by the loading banner so the
// "Loading your league from X" copy matches the platform the user
// actually picked on the Connect screen.
const platformLabel = computed(() => {
  const p = livePlatform.value
  if (p === 'yahoo') return 'Yahoo'
  if (p === 'espn') return 'ESPN'
  if (p === 'sleeper') return 'Sleeper'
  return 'your league'
})

async function loadLiveData() {
  const id = liveLeagueId.value
  const platform = livePlatform.value
  if (!id || (platform !== 'sleeper' && platform !== 'espn' && platform !== 'yahoo')) {
    return  // no live binding requested
  }
  liveLoading.value = true
  liveError.value = null
  try {
    const opts = { userIdentity: collectUserIdentity() }
    const data =
      platform === 'espn'
        ? await espnLeagueToCategoryData(id, opts)
        : platform === 'yahoo'
        ? await yahooLeagueToCategoryData(id, opts)
        : await sleeperLeagueToCategoryData(id, opts)
    liveData.value = data
    liveEditorial.value = renderHomePage(data)
  } catch (err) {
    const platformName =
      platform === 'espn' ? 'ESPN' : platform === 'yahoo' ? 'Yahoo' : 'Sleeper'
    liveError.value = (err as Error).message || `Failed to load ${platformName} league data.`
  } finally {
    liveLoading.value = false
  }
}

onMounted(async () => {
  // In strict mode the leagues store may not be hydrated yet (deep link
  // or page refresh) — make sure we have the row before trying to load.
  if (isStrictLiveMode.value && leaguesStore.leagues.length === 0) {
    try {
      await leaguesStore.fetchLeagues()
    } catch (err) {
      console.warn('[CategoryDemoHomeView] fetchLeagues failed:', err)
    }
  }
  await loadLiveData()
})

// React to URL changes — switching between leagues replaces
// `route.params.leagueId`, which triggers a re-fetch through the new
// platform / platform_league_id pair. Without this watch the user
// would have to refresh after switching.
watch(
  () => route.params.leagueId,
  async (next, prev) => {
    if (next === prev) return
    liveData.value = null
    liveEditorial.value = renderHomePage(categoriesFixtureToLeagueData())
    await loadLiveData()
  },
)

/**
 * Build the cross-platform identity object the adapters need to flag
 * the signed-in user's team. Reads from the platforms store (which is
 * the source of truth for connected accounts).
 *   - sleeper: `platform_user_id` is the Sleeper `user_id`
 *   - yahoo:   `platform_user_id` is the Yahoo manager `guid`
 *   - espn:    ESPN cookies are persisted out-of-band; `swid` is the
 *              owner identifier
 * Returns an empty object if the store throws — used by every demo
 * view, so we centralize the failure handling here.
 */
function collectUserIdentity() {
  try {
    const platformsStore = usePlatformsStore()
    return {
      sleeperUserId: platformsStore.getConnection('sleeper')?.platform_user_id ?? undefined,
      yahooGuid: platformsStore.getConnection('yahoo')?.platform_user_id ?? undefined,
      espnSwid: platformsStore.getEspnCredentials()?.swid ?? undefined,
    }
  } catch {
    return {}
  }
}

/** Map a ticker eyebrow (from `eyebrowForTicker` in render.ts) to the
 *  existing tone class set the template already styles for. */
function tickerToneFor(eyebrow: string | undefined): 'green' | 'magenta' | 'teal' | 'neutral' {
  switch (eyebrow) {
    case 'HOT STREAK':    return 'green'
    case 'TOP CAT KING':  return 'green'
    case 'ROUGH PATCH':   return 'magenta'
    case 'BLOWOUT':       return 'magenta'
    case 'BUBBLE WATCH':  return 'teal'
    default:              return 'neutral'
  }
}

/** Map a quick-read pill label (from `pillLabel` in render.ts, which
 *  emits uppercase strings) to the existing dot color class set. */
function quickReadDotFor(label: string): 'tertiary' | 'secondary' | 'up' | 'mute' {
  switch (label) {
    case 'TOP CAT THIS WEEK': return 'tertiary'
    case 'BIGGEST UPSET':     return 'secondary'
    case 'HOTTEST STREAK':    return 'up'
    case 'ON THE BUBBLE':     return 'mute'
    default:                  return 'mute'
  }
}

/** Pill labels render in sentence case in the template; the renderer
 *  hands us the uppercase pill identifier. */
function formatPillLabel(label: string): string {
  return label.charAt(0) + label.slice(1).toLowerCase()
}

/* ─────────────────────────────────────────────────────────────────
   YESTERDAY'S BIG SWINGS — carousel state
───────────────────────────────────────────────────────────────── */

const trackRef = ref<HTMLElement | null>(null)
const activePage = ref(1)
const atStart = ref(true)
const atEnd = ref(false)
let trackObserver: IntersectionObserver | null = null

function scrollTrack(direction: -1 | 1) {
  const el = trackRef.value
  if (!el) return
  const firstPage = el.querySelector('.story-page') as HTMLElement | null
  const pageWidth = firstPage?.clientWidth ?? 520
  el.scrollBy({ left: direction * (pageWidth + 16), behavior: 'smooth' })
}

function goToPage(n: number) {
  const el = trackRef.value
  if (!el) return
  const pages = el.querySelectorAll('.story-page')
  const target = pages[n - 1] as HTMLElement | undefined
  target?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
}

function updateTrackEdges() {
  const el = trackRef.value
  if (!el) return
  atStart.value = el.scrollLeft < 4
  atEnd.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
}

onMounted(() => {
  const el = trackRef.value
  if (!el) return
  const pages = Array.from(el.querySelectorAll('.story-page'))
  trackObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          const idx = pages.indexOf(entry.target as Element) + 1
          if (idx > 0) activePage.value = idx
        }
      })
      updateTrackEdges()
    },
    { root: el, threshold: 0.5 },
  )
  pages.forEach((p) => trackObserver?.observe(p))

  el.addEventListener('scroll', updateTrackEdges, { passive: true })
  updateTrackEdges()
})

onBeforeUnmount(() => {
  trackObserver?.disconnect()
  trackObserver = null
  const el = trackRef.value
  el?.removeEventListener('scroll', updateTrackEdges)
})

// Surname helper — strips honorifics ("Jr."), keeps the last meaningful token.
function surnameOf(playerName: string): string {
  const parts = playerName.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return playerName
  const last = parts[parts.length - 1]
  if (/^(Jr\.?|Sr\.?|II|III|IV)$/i.test(last) && parts.length >= 2) {
    return parts[parts.length - 2]
  }
  return last
}

// Page-tint color from the fantasy team's first OKLCH stop, at 8% alpha.
function cardTint(swing: { fantasyTeamId: string }): string {
  return accentFor(getTeam(swing.fantasyTeamId)).replace(/\)$/, ' / 0.08)')
}

// If a logo image fails to load (avatarUrl missing in build), hide the element.
function onMascotError(ev: Event) {
  const el = ev.currentTarget as HTMLImageElement
  el.style.display = 'none'
}

/* ─────────────────────────────────────────────────────────────────
   WEEK N LIVE — normalized matchup feed.

   The home page's matchup feed accepts data from two sources:
     1. Fixture (`matchupsWeek8`) — uses `aWins/bWins` + per-row
        `homeWinProb/awayWinProb` already populated by the author.
     2. Live data (`liveData.matchupsCurrentWeek`) — uses
        `homeCatWins/awayCatWins`, no win-prob field. We estimate
        win probability from the cat-record gap (no async call to a
        win-prob endpoint; a real one is future work).

   `LiveMatchupRow` is the shared shape the template renders, so the
   markup only sees one kind of row.
───────────────────────────────────────────────────────────────── */

interface LiveMatchupRow {
  id: string
  homeTeamId: string
  awayTeamId: string
  status: 'live' | 'coasting' | 'final' | 'upcoming'
  aWins: number
  bWins: number
  homeWinProb: number
  awayWinProb: number
  isSpotlight: boolean
}

/**
 * Rough win-probability estimate from the current cat-record gap.
 * Each cat lead is worth ~8 percentage points, anchored to 50/50, then
 * clamped to [10, 90] so a 6-0 lead with 5 cats still in play doesn't
 * read "100% — game over". Good enough for the home page chip; the
 * Matchups page can swap in a calibrated number later.
 */
function estimateWinProb(homeWins: number, awayWins: number): number {
  const gap = homeWins - awayWins
  const raw = 50 + gap * 8
  return Math.max(10, Math.min(90, Math.round(raw)))
}

const liveMatchupRows = computed<LiveMatchupRow[]>(() => {
  const live = liveData.value?.matchupsCurrentWeek
  if (live && live.length > 0) {
    // First matchup in the feed gets the "matchup of the week" spotlight
    // — there's no equivalent of `matchupOfTheWeekId` in live data yet,
    // so we pick the first row as a sensible default. The fixture path
    // keeps its hand-authored spotlight.
    return live.map((m, idx) => {
      const homeProb = estimateWinProb(m.homeCatWins, m.awayCatWins)
      return {
        id: m.id,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        status: m.status,
        aWins: m.homeCatWins,
        bWins: m.awayCatWins,
        homeWinProb: homeProb,
        awayWinProb: 100 - homeProb,
        isSpotlight: idx === 0,
      }
    })
  }
  // Fixture fallback — preserve existing spotlight behavior.
  return matchupsWeek8.map((m) => ({
    id: m.id,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    status: m.status,
    aWins: m.aWins,
    bWins: m.bWins,
    homeWinProb: m.homeWinProb,
    awayWinProb: m.awayWinProb,
    isSpotlight: m.id === matchupOfTheWeekId,
  }))
})

/* ─────────────────────────────────────────────────────────────────
   WIN-PROB CHIP HELPERS (mirror football home, normalized-row aware).
───────────────────────────────────────────────────────────────── */

function probFavorsHomeRow(m: LiveMatchupRow) {
  return m.homeWinProb >= 50
}
function probDisplayValueForRow(m: LiveMatchupRow) {
  return probFavorsHomeRow(m) ? m.homeWinProb : m.awayWinProb
}
function probSideLabelForRow(m: LiveMatchupRow) {
  // Show the favored team's initials (e.g. "BT", "TQ"), not the raw
  // team id. Yahoo team_keys look like "458.L.21788.T.4" which would
  // render as a wall of text on the chip; the fixture used 2-letter
  // slugs like "bt" which happened to read fine. Use the lookup so
  // both modes produce a short, readable identifier.
  const favoredId = probFavorsHomeRow(m) ? m.homeTeamId : m.awayTeamId
  return (lookupTeam(favoredId).ownerInitials || '').toUpperCase()
}
function probColorForRow(m: LiveMatchupRow) {
  const favored = probFavorsHomeRow(m) ? lookupTeam(m.homeTeamId) : lookupTeam(m.awayTeamId)
  return accentFor(favored)
}
function probBorderForRow(m: LiveMatchupRow) {
  return probColorForRow(m).replace(/\)$/, ' / 0.36)')
}
function probBgForRow(m: LiveMatchupRow) {
  return probColorForRow(m).replace(/\)$/, ' / 0.10)')
}

/* ─────────────────────────────────────────────────────────────────
   NAV
───────────────────────────────────────────────────────────────── */

function goToMatchups() {
  router.push('/demo-categories/matchups')
}
function goToPowerRankings() {
  router.push('/demo-categories/power-rankings')
}

/* ─────────────────────────────────────────────────────────────────
   CATS WON PER WEEK CHART
   Y axis: 0..11 cats won per matchup week.
   Featured trio:
     bt — top scorer (uses bt's second OKLCH stop)
     mv — my team (yellow --accent-primary)
     avg — flat dashed line at 5.5 (math constant)
   Other 7 teams render at 12% opacity as background.
───────────────────────────────────────────────────────────────── */

const PPW_W = 960
const PPW_H = 280
const PPW_PAD_L = 40
const PPW_PAD_R = 130
const PPW_PAD_T = 18
const PPW_PAD_B = 24
const PPW_Y_MIN = 0
const PPW_Y_MAX = 11
const PPW_WEEKS = 8

function ppwX(week: number): number {
  return PPW_PAD_L + ((week - 1) / (PPW_WEEKS - 1)) * (PPW_W - PPW_PAD_L - PPW_PAD_R)
}
function ppwY(v: number): number {
  const clamped = Math.max(PPW_Y_MIN, Math.min(PPW_Y_MAX, v))
  const t = (clamped - PPW_Y_MIN) / (PPW_Y_MAX - PPW_Y_MIN)
  return PPW_PAD_T + (1 - t) * (PPW_H - PPW_PAD_T - PPW_PAD_B)
}

// Gridlines at meaningful cat-win marks: floor, league avg, ceiling.
const ppwGridY = computed(() =>
  [2, 5.5, 8].map((v) => ({ value: v, y: ppwY(v) })),
)
const ppwWeekXs = computed(() => Array.from({ length: PPW_WEEKS }, (_, i) => ppwX(i + 1)))

interface PPWPoint { x: number; y: number; week: number; value: number }
function ppwPoints(arr: number[]): PPWPoint[] {
  return arr.map((v, idx) => ({ x: ppwX(idx + 1), y: ppwY(v), week: idx + 1, value: v }))
}
function ppwSmooth(pts: PPWPoint[]): string {
  return smoothPath(pts as Point[])
}

// Live chart sources — prefer adapter data, fall back to fixture.
const weeklyCatsWonSource = computed<Record<string, number[]>>(
  () => liveData.value?.weeklyCatsWon ?? weeklyCatsWon,
)
const weeklyAvgSource = computed<number[]>(
  () => liveData.value?.weeklyLeagueAverage ?? weeklyCatLeagueAverage,
)
const chartTeams = computed(() =>
  liveData.value?.teams ?? teams,
)

// Top scorer: team with the highest cumulative cats-won.
// At W8 in the fixture that's bt (sum 69). Wrap in computed so the
// chart updates if the data source changes (e.g., switching to live).
const topScorerTeam = computed(() => {
  const list = chartTeams.value
  let bestId = list[0]?.id ?? 'bt'
  let best = -Infinity
  for (const t of list) {
    const arr = weeklyCatsWonSource.value[t.id]
    if (!arr) continue
    const total = arr.reduce((a, b) => a + b, 0)
    if (total > best) { best = total; bestId = t.id }
  }
  return lookupTeam(bestId)
})
// Second OKLCH stop so the top-scorer line visually separates from yellow.
const topScorerColor = computed(() => {
  const stops = accentStops(topScorerTeam.value)
  return stops[1] ?? stops[0]
})

const topScorerPoints = computed(() =>
  ppwPoints(weeklyCatsWonSource.value[topScorerTeam.value.id] ?? []),
)
const topScorerPath = computed(() => ppwSmooth(topScorerPoints.value))
const topScorerEnd = computed(() => topScorerPoints.value.at(-1) ?? null)

const myTeamPoints = computed(() =>
  ppwPoints(weeklyCatsWonSource.value[myTeam.id] ?? []),
)
const myTeamPath = computed(() => ppwSmooth(myTeamPoints.value))
const myTeamEnd = computed(() => myTeamPoints.value.at(-1) ?? null)

const avgPpwPoints = computed(() =>
  weeklyAvgSource.value.map((v, idx) => ({ x: ppwX(idx + 1), y: ppwY(v), week: idx + 1, value: v })),
)
const ppwAvgPath = computed(() => ppwSmooth(avgPpwPoints.value))
const avgEnd = computed(() => avgPpwPoints.value.at(-1) ?? null)

// Background team set — every team except the featured top scorer and my-team.
const backgroundTeamIds = computed(() =>
  chartTeams.value
    .map((t) => t.id)
    .filter((id) => id !== topScorerTeam.value.id && id !== myTeam.id),
)
function teamPath(teamId: string): string {
  return ppwSmooth(ppwPoints(weeklyCatsWonSource.value[teamId] ?? []))
}
function bgStrokeFor(teamId: string): string {
  // 12% opacity so background lines read as context, not noise.
  return accentFor(lookupTeam(teamId)).replace(/\)$/, ' / 0.12)')
}

// Annotation: at week 6 bt first holds #1 (seasonRankHistory: bt becomes 1 at W6).
// Live-data path doesn't have an authored narrative annotation, so skip it.
interface Annotation { dotX: number; dotY: number; labelX: number; labelY: number }
const annotation = computed<Annotation | null>(() => {
  if (liveData.value) return null   // fixture-only narrative annotation
  const idx = 5 // week 6 → index 5
  const btScore = weeklyCatsWon['bt']?.[idx]
  if (btScore == null) return null
  const dotX = ppwX(6)
  const dotY = ppwY(btScore)
  return { dotX, dotY, labelX: dotX, labelY: dotY - 16 }
})

// Endpoint label de-confliction. Same approach as football home.
const ENDPOINT_MIN_GAP = 14
interface EndpointLabel { id: string; rawY: number; y: number }
const endpointLabels = computed<Record<string, EndpointLabel>>(() => {
  const items: EndpointLabel[] = []
  if (topScorerEnd.value) items.push({ id: 'top', rawY: topScorerEnd.value.y, y: topScorerEnd.value.y })
  if (myTeamEnd.value) items.push({ id: 'mine', rawY: myTeamEnd.value.y, y: myTeamEnd.value.y })
  if (avgEnd.value) items.push({ id: 'avg', rawY: avgEnd.value.y, y: avgEnd.value.y })
  items.sort((a, b) => a.rawY - b.rawY)
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1]
    if (items[i].y - prev.y < ENDPOINT_MIN_GAP) {
      items[i].y = prev.y + ENDPOINT_MIN_GAP
    }
  }
  const map: Record<string, EndpointLabel> = {}
  for (const it of items) map[it.id] = it
  return map
})
function endpointY(id: 'top' | 'mine' | 'avg', rawY: number): number {
  return endpointLabels.value[id]?.y ?? rawY
}
</script>

<style scoped>
/* Tokens (--ink-N, --accent-*) inherited from .demo-shell in CategoryDemoLayout. */
.home {
  display: flex;
  flex-direction: column;
  gap: 56px;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}

/* ─── Live load banners ───────────────────────────────────────── */
.live-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid oklch(0.20 0.015 90);
  background: oklch(0.10 0.014 90);
  font-size: 0.92rem;
  color: var(--ink-2);
}
.live-banner-loading { color: var(--accent-tertiary); }
.live-banner-spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid oklch(0.72 0.18 195 / 0.30);
  border-top-color: var(--accent-tertiary);
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes live-spin { to { transform: rotate(360deg); } }
  .live-banner-spinner { animation: live-spin 0.9s linear infinite; }
}
/* Brand-aware loading mark — pulses gently instead of spinning. */
.live-banner-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}
.live-banner-mark-img {
  width: 100%;
  height: 100%;
  display: block;
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes live-pulse {
    0%, 100% { opacity: 0.55; transform: scale(0.96); }
    50%      { opacity: 1;    transform: scale(1.02); }
  }
  .live-banner-mark {
    animation: live-pulse 1.6s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }
}
.live-banner-error {
  flex-wrap: wrap;
  border-color: oklch(0.65 0.20 25 / 0.45);
  background: oklch(0.65 0.20 25 / 0.08);
}
.live-banner-error-headline {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.86rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--accent-down);
}
.live-banner-error-body {
  margin: 0;
  font-size: 0.92rem;
  color: var(--ink-2);
  flex: 1 1 240px;
}
.live-banner-action {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-1);
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 999px;
  background: oklch(0.20 0.015 90);
  border: 1px solid oklch(0.32 0.012 90);
  transition: background-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .live-banner-action:hover { background: oklch(0.26 0.015 90); }
}

/* ─── Shared section heading typography ───────────────────────── */
.section-head { margin-bottom: 18px; }
.section-head-flex {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.section-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-2);
  margin: 0 0 6px;
}
.section-eyebrow-teal    { color: var(--accent-tertiary); }
.section-eyebrow-magenta { color: var(--accent-secondary); }
.section-eyebrow-mute    { color: var(--ink-3); }

.section-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-2);
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 999px;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.section-link:hover { color: var(--ink-1); }
@media (prefers-reduced-motion: no-preference) {
  .section-link:hover { transform: translateX(2px); }
}
.section-link:active {
  transform: translateX(0);
  transition-duration: 100ms;
}
.section-link:focus-visible {
  outline: 2px solid var(--accent-tertiary);
  outline-offset: 2px;
}

/* ─── 1. HERO ─────────────────────────────────────────────────── */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 40px;
  padding: 36px 36px 32px;
  background:
    radial-gradient(ellipse at top right, oklch(0.70 0.27 350 / 0.10), transparent 60%),
    oklch(0.10 0.015 90);
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 24px;
  align-items: center;
}
.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 0 0 12px;
}
.hero-eyebrow-bar {
  width: 24px;
  height: 1px;
  background: var(--accent-secondary);
}
.hero-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.4rem, 5.5vw, 4.2rem);
  line-height: 0.92;
  letter-spacing: -0.015em;
  color: var(--ink-1);
  margin: 0 0 20px;
}
.hero-body {
  font-size: 1.02rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0 0 24px;
  max-width: 52ch;
}
.hero-share {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-2);
  background: transparent;
  border: 1px solid oklch(0.32 0.012 90);
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition:
    transform 160ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 160ms cubic-bezier(0.22, 1, 0.36, 1),
    color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.hero-share:hover { color: var(--ink-1); border-color: oklch(0.50 0.015 90); }
@media (prefers-reduced-motion: no-preference) {
  .hero-share:hover { transform: translateY(-1px); }
}
.hero-share:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.hero-share:focus-visible {
  outline: 2px solid var(--accent-tertiary);
  outline-offset: 2px;
}

.hero-faceoff {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 18px;
  align-items: center;
}
.faceoff-team {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}
.faceoff-avatar {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: 0.04em;
  color: oklch(0.12 0.012 90);
  box-shadow: 0 6px 24px -10px oklch(0 0 0 / 0.6);
  overflow: hidden;
}
.faceoff-avatar-dim { opacity: 0.55; filter: saturate(0.7); }
.faceoff-meta { display: flex; flex-direction: column; gap: 2px; }
.faceoff-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: 0.02em;
  color: var(--ink-1);
  margin: 0;
}
.faceoff-owner { font-size: 0.74rem; color: var(--ink-3); margin: 0; }
.faceoff-rankrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  margin-top: 4px;
}
.faceoff-rankchip {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 6px;
  background: oklch(0.20 0.015 90);
  color: var(--ink-2);
}
.faceoff-rankchip-now  { background: oklch(0.70 0.27 350 / 0.18); color: oklch(0.85 0.20 350); }
.faceoff-rankchip-fell { background: oklch(0.20 0.015 90); color: var(--ink-3); }
.faceoff-trend {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
}
.faceoff-trend-up   { color: var(--accent-up); }
.faceoff-trend-down { color: var(--accent-down); }

.faceoff-verb {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.faceoff-verb-line { width: 1px; height: 18px; background: oklch(0.30 0.015 90); }
.faceoff-verb-word {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
}

@media (max-width: 880px) {
  .hero {
    grid-template-columns: 1fr;
    padding: 28px 22px 26px;
    gap: 28px;
  }
}

/* ─── 2. BUBBLE ───────────────────────────────────────────────── */
.bubble {
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 20px;
  padding: 28px 28px 26px;
}
.bubble-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.6rem, 2.8vw, 2.2rem);
  line-height: 1.02;
  letter-spacing: -0.01em;
  color: var(--ink-1);
  margin: 0;
}
.bubble-deck {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ink-3);
  margin: 8px 0 0;
  max-width: 50ch;
}
.bubble-list {
  list-style: none;
  padding: 0;
  margin: 22px 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bubble-row {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 70px auto 52px 110px;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: oklch(0.11 0.015 90 / 0.5);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 10px;
  transition: border-color 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.bubble-row-in  { background: oklch(0.11 0.015 90 / 0.6); }
.bubble-row-out { background: oklch(0.10 0.015 90 / 0.5); }
.bubble-row-mine {
  background: oklch(0.78 0.18 92 / 0.04);
  border-color: oklch(0.78 0.18 92 / 0.28);
}
.bubble-seed {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.5rem;
  letter-spacing: 0.01em;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.bubble-seed-in { color: var(--ink-1); }
.bubble-team {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.bubble-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.86rem;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0;
  overflow: visible;
}
.bubble-avatar .avatar-image {
  border-radius: 10px;
  overflow: hidden;
}
.bubble-star {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: oklch(0.12 0.012 90);
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 2px oklch(0.10 0.015 90);
}
.bubble-name-block { min-width: 0; }
.bubble-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: 0.005em;
  color: var(--ink-1);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bubble-owner {
  font-size: 0.75rem;
  color: var(--ink-3);
  margin: 1px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bubble-record {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.95rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  justify-self: start;
}
.bubble-dots {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  justify-self: center;
}
.bubble-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.bubble-dot-w { background: var(--accent-up); }
.bubble-dot-l { background: var(--accent-secondary); }
.bubble-dot-t { background: var(--ink-3); }
.bubble-streak {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 6px;
  font-variant-numeric: tabular-nums;
  justify-self: end;
}
.bubble-streak-win  { color: var(--accent-up);        background: oklch(0.74 0.18 145 / 0.12); }
.bubble-streak-loss { color: var(--accent-secondary); background: oklch(0.70 0.27 350 / 0.12); }
.bubble-streak-tie  { color: var(--ink-3);            background: oklch(0.30 0.012 90 / 0.4); }
.bubble-gap {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  justify-self: end;
  white-space: nowrap;
}
.bubble-gap-out { color: var(--ink-2); }

.bubble-cutoff {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  margin: 6px 4px;
  list-style: none;
}
.bubble-cutoff-line {
  height: 1px;
  background: oklch(0.72 0.18 195 / 0.40);
}
.bubble-cutoff-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
}

.bubble-closer {
  margin: 18px 0 0;
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--ink-3);
  max-width: 60ch;
}

@media (max-width: 720px) {
  .bubble { padding: 22px 18px 20px; }
  .bubble-row {
    grid-template-columns: 24px minmax(0, 1fr) auto auto;
    grid-template-areas:
      "seed team   team   team"
      "seed record dots   streak"
      "seed gap    gap    gap";
    row-gap: 6px;
    column-gap: 10px;
    padding: 10px 12px;
  }
  .bubble-row > .bubble-seed   { grid-area: seed; align-self: center; }
  .bubble-row > .bubble-team   { grid-area: team; }
  .bubble-row > .bubble-record { grid-area: record; }
  .bubble-row > .bubble-dots   { grid-area: dots; justify-self: start; }
  .bubble-row > .bubble-streak { grid-area: streak; }
  .bubble-row > .bubble-gap    { grid-area: gap; justify-self: start; }
}

/* ─── 3. STORY TRACK ─────────────────────────────────────────── */
.section-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.35rem, 2.4vw, 1.6rem);
  line-height: 1.05;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0;
}

.track-arrows {
  display: flex;
  gap: 8px;
}
.arrow-btn {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: transparent;
  border: 1px solid oklch(0.28 0.012 90);
  color: oklch(0.85 0.008 90);
  cursor: pointer;
  transition:
    transform 200ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 200ms cubic-bezier(0.22, 1, 0.36, 1),
    color 200ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
.arrow-btn:hover:not(:disabled) {
  color: var(--ink-1);
  border-color: oklch(0.48 0.014 90);
}
@media (prefers-reduced-motion: no-preference) {
  .arrow-btn:hover:not(:disabled) { transform: scale(1.05); }
}
.arrow-btn:active:not(:disabled) {
  transform: scale(0.95);
  transition-duration: 100ms;
}
.arrow-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.arrow-btn:focus-visible {
  outline: 2px solid var(--accent-tertiary);
  outline-offset: 2px;
}

.story-track {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  padding-bottom: 8px;
}
.story-track::-webkit-scrollbar { display: none; }
.story-track { scrollbar-width: none; }

.story-page {
  flex: 0 0 520px;
  height: 440px;
  scroll-snap-align: start;
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  background: oklch(0.11 0.015 90);
  border: 1px solid oklch(0.22 0.015 90);
  padding: 32px;
  display: flex;
}

/* Page-specific tinted backgrounds. */
.story-page-monster {
  background:
    radial-gradient(ellipse at top right, var(--page-tint, oklch(0.74 0.18 145 / 0.08)), transparent 62%),
    oklch(0.11 0.015 90);
}
.story-page-ace {
  background:
    radial-gradient(ellipse at top left, oklch(0.72 0.18 195 / 0.07), transparent 60%),
    oklch(0.11 0.015 90);
}
.story-page-closer {
  background:
    radial-gradient(ellipse at bottom right, oklch(0.70 0.27 350 / 0.08), transparent 60%),
    oklch(0.11 0.015 90);
}
.story-page-breakout {
  background:
    radial-gradient(ellipse at top left, oklch(0.78 0.18 92 / 0.05), transparent 60%),
    oklch(0.11 0.015 90);
}
.story-page-gem {
  background: oklch(0.12 0.014 90);
  border-color: oklch(0.28 0.012 90 / 0.3);
}

/* Mascot placements. */
.story-mascot {
  position: absolute;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}
.story-mascot-right-bleed {
  width: 320px;
  height: 320px;
  right: -80px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.85;
  object-fit: contain;
}
.story-mascot-stamp {
  width: 80px;
  height: 80px;
  left: 24px;
  top: 24px;
  filter: saturate(0.5);
  transform: rotate(-8deg);
  border-radius: 12px;
  object-fit: contain;
}
.story-mascot-corner-bleed {
  width: 240px;
  height: 240px;
  right: -60px;
  bottom: -50px;
  opacity: 0.85;
  object-fit: contain;
}
.story-mascot-dual-top {
  width: 100px;
  height: 100px;
  left: 20px;
  top: 20px;
  border-radius: 16px;
  object-fit: contain;
}

/* Card content. */
.story-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 320px;
  margin-top: auto;
  margin-bottom: 0;
}
.story-page-ace .story-content,
.story-page-breakout .story-content { margin-top: 120px; }
.story-page-closer .story-content { max-width: 300px; }
.story-content-gem {
  max-width: 440px;
  margin-top: 0;
  gap: 16px;
}

.story-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.story-index {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--ink-4);
  font-variant-numeric: tabular-nums;
}
.story-tag {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.story-tag-teal    { color: var(--accent-tertiary); }
.story-tag-magenta { color: var(--accent-secondary); }
.story-tag-green   { color: var(--accent-up); }
.story-tag-yellow  { color: var(--accent-primary); }
.story-tag-mute    { color: var(--ink-4); }

.story-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.6rem;
  line-height: 0.94;
  letter-spacing: -0.012em;
  color: var(--ink-1);
  margin: 0;
}
.story-headline-gem { font-size: 1.9rem; }

.story-stat-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.story-stat-hero {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 4.5rem;
  line-height: 0.92;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.story-stat-hero-teal    { color: var(--accent-tertiary); }
.story-stat-hero-magenta { color: var(--accent-secondary); }
.story-stat-hero-green   { color: var(--accent-up); }
.story-stat-hero-yellow  { color: var(--accent-primary); font-size: 3.2rem; }
.story-stat-hero-mute    { color: var(--ink-2); font-size: 3.6rem; }
.story-stat-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-4);
  margin: 4px 0 0;
}
.story-stat-line {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.story-body {
  font-family: 'Barlow', sans-serif;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 0;
  max-width: 38ch;
}

/* Track dots. */
.track-dots {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 16px;
}
.track-dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 999px;
  background: oklch(0.40 0.012 90 / 0.4);
  border: 0;
  cursor: pointer;
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1), background-color 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
.track-dot.active {
  background: var(--accent-tertiary);
}
@media (prefers-reduced-motion: no-preference) {
  .track-dot.active { transform: scale(1.3); }
}
.track-dot:active {
  transform: scale(0.9);
  transition-duration: 100ms;
}
.track-dot:focus-visible {
  outline: 2px solid var(--accent-tertiary);
  outline-offset: 2px;
}

@media (max-width: 720px) {
  .story-page { flex: 0 0 88vw; height: auto; min-height: 380px; padding: 24px; }
  .track-arrows { display: none; }
  .story-headline { font-size: 2.1rem; }
  .story-stat-hero { font-size: 3.6rem; }
  .story-mascot-right-bleed { width: 220px; height: 220px; right: -60px; opacity: 0.55; }
  .story-mascot-corner-bleed { width: 180px; height: 180px; right: -50px; bottom: -40px; opacity: 0.55; }
  .story-page-ace .story-content,
  .story-page-breakout .story-content { margin-top: 80px; }
}

/* ─── 4. LIVE ─────────────────────────────────────────────────── */
.live-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
}
.live-eyebrow-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent-up);
  display: inline-block;
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes home-pulse {
    0%, 60%, 100% { opacity: 1; transform: scale(1); }
    30% { opacity: 0.4; transform: scale(1.5); }
  }
  .live-eyebrow-dot { animation: home-pulse 2.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
  .live-status-dot { animation: home-pulse 2.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
}
.live-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.35rem, 2.4vw, 1.6rem);
  line-height: 1.05;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0;
}
.live-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.live-row {
  position: relative;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: oklch(0.11 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
}
.live-row:hover { border-color: oklch(0.30 0.015 90); }
@media (prefers-reduced-motion: no-preference) {
  .live-row:hover { transform: translateY(-1px); }
}
.live-row:active {
  transform: scale(0.99);
  transition-duration: 100ms;
}
.live-row:focus-visible {
  outline: 2px solid var(--accent-tertiary);
  outline-offset: 2px;
}
.live-row-spotlight {
  border-color: oklch(0.70 0.27 350 / 0.40);
  background:
    linear-gradient(90deg, oklch(0.70 0.27 350 / 0.06), oklch(0.11 0.015 90) 30%);
}
.live-spotlight-edge {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  background: var(--accent-secondary);
}
.live-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 6px;
  white-space: nowrap;
  justify-self: start;
}
.live-status-live {
  color: var(--accent-down);
  background: oklch(0.65 0.20 25 / 0.10);
  border: 1px solid oklch(0.65 0.20 25 / 0.30);
}
.live-status-coasting {
  color: var(--accent-primary);
  background: oklch(0.78 0.18 92 / 0.08);
  border: 1px solid oklch(0.78 0.18 92 / 0.30);
}
.live-status-final {
  color: var(--accent-up);
  background: oklch(0.74 0.18 145 / 0.10);
  border: 1px solid oklch(0.74 0.18 145 / 0.30);
}
.live-status-upcoming {
  color: var(--ink-3);
  background: oklch(0.16 0.015 90);
  border: 1px solid oklch(0.22 0.015 90);
}
.live-status-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--accent-down);
  display: inline-block;
}
.live-team {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.live-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.7rem;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0;
  overflow: hidden;
}
.live-team-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--ink-2);
  margin: 0;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.live-team-score {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  margin: 0;
  flex-shrink: 0;
}
.live-team-winning .live-team-name,
.live-team-winning .live-team-score { color: var(--ink-1); font-weight: 900; }
.live-team-losing .live-team-name,
.live-team-losing .live-team-score { color: var(--ink-3); }
.live-vs {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.live-prob {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid oklch(0.22 0.015 90);
  background: oklch(0.16 0.015 90);
  color: var(--ink-2);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  justify-self: end;
}

@media (max-width: 720px) {
  .live-row {
    grid-template-columns: 62px minmax(0, 1fr);
    grid-template-areas:
      "status home"
      "status away"
      "prob   prob";
    row-gap: 6px;
    padding: 10px 12px;
  }
  .live-row > .live-status { grid-area: status; align-self: center; }
  .live-row > .live-team:first-of-type { grid-area: home; }
  .live-row > .live-team:last-of-type { grid-area: away; }
  .live-row > .live-vs { display: none; }
  .live-row > .live-prob { grid-area: prob; justify-self: start; }
}

/* ─── 5. STANDINGS ────────────────────────────────────────────── */
.standings-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.2rem, 2.1vw, 1.4rem);
  line-height: 1.05;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0;
}
.stand-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stand-head {
  display: grid;
  grid-template-columns: 50px minmax(0, 1fr) 80px 92px 52px;
  align-items: center;
  gap: 14px;
  padding: 0 14px 6px;
  margin-bottom: 2px;
}
.stand-head-cell {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.stand-head-rec    { justify-self: start; }
.stand-head-streak { justify-self: end; }
.stand-head-last6  { justify-self: center; }
.stand-row {
  position: relative;
  display: grid;
  grid-template-columns: 50px minmax(0, 1fr) 80px 92px 52px;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  background: oklch(0.10 0.015 90 / 0.5);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.stand-row:hover { border-color: oklch(0.30 0.015 90); }
@media (prefers-reduced-motion: no-preference) {
  .stand-row:hover { transform: translateX(2px); }
}
.stand-row:active {
  transform: scale(0.99);
  transition-duration: 100ms;
}
.stand-row:focus-visible {
  outline: 2px solid var(--accent-tertiary);
  outline-offset: 2px;
}
.stand-row-cutoff {
  border-bottom: 1px solid oklch(0.72 0.18 195 / 0.30);
}
.stand-row-mine {
  background: oklch(0.78 0.18 92 / 0.06);
  border-color: oklch(0.78 0.18 92 / 0.28);
}
.stand-rank {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  color: var(--ink-3);
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}
.stand-rank-playoff { color: var(--ink-1); }
.stand-rank-num { font-variant-numeric: tabular-nums; }
.stand-rank-crown {
  display: inline-flex;
  align-items: center;
  color: var(--accent-primary);
}
.stand-rank-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-tertiary);
  display: inline-block;
}
.stand-team {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.stand-avatar {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.7rem;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0;
  overflow: visible;
}
.stand-avatar .avatar-image {
  border-radius: 8px;
  overflow: hidden;
}
.stand-star {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: oklch(0.12 0.012 90);
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 2px oklch(0.10 0.015 90);
}
.stand-name-block { min-width: 0; }
.stand-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.94rem;
  letter-spacing: 0.01em;
  color: var(--ink-1);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stand-owner {
  font-size: 0.74rem;
  color: var(--ink-3);
  margin: 1px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stand-record {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.9rem;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  justify-self: start;
}
.stand-last6 {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  justify-self: center;
}
.stand-last6-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.stand-last6-dot-w { background: var(--accent-up); }
.stand-last6-dot-l { background: var(--accent-secondary); }
.stand-last6-dot-t { background: var(--ink-3); }
.stand-streak {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 6px;
  justify-self: end;
  font-variant-numeric: tabular-nums;
}
.stand-streak-win  { color: var(--accent-up);        background: oklch(0.74 0.18 145 / 0.12); }
.stand-streak-loss { color: var(--accent-secondary); background: oklch(0.70 0.27 350 / 0.12); }
.stand-streak-tie  { color: var(--ink-3);            background: oklch(0.30 0.012 90 / 0.4); }

@media (max-width: 720px) {
  .stand-head {
    grid-template-columns: 44px minmax(0, 1fr) 70px 44px;
    gap: 10px;
    padding: 0 12px 6px;
  }
  .stand-head-last6 { display: none; }
  .stand-row {
    grid-template-columns: 44px minmax(0, 1fr) 70px 44px;
    gap: 10px;
    padding: 9px 12px;
  }
  .stand-last6 { display: none; }
  .stand-name { font-size: 0.88rem; }
  .stand-owner { display: none; }
}

/* ─── 6. CATS WON PER WEEK ────────────────────────────────────── */
.ppw-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  line-height: 1.1;
  letter-spacing: -0.008em;
  color: var(--ink-1);
  margin: 0;
}
.ppw-chart-wrap {
  width: 100%;
  margin-top: 6px;
}
.ppw-chart {
  width: 100%;
  height: 280px;
  display: block;
  color: var(--ink-4);
}
.ppw-grid line {
  stroke: oklch(0.16 0.015 90);
  stroke-width: 1;
}
.ppw-grid-label,
.ppw-x-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  fill: var(--ink-4);
  letter-spacing: 0.04em;
}
.ppw-end-label text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.ppw-annotation-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.ppw-legend {
  list-style: none;
  padding: 0;
  margin: 14px 0 8px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.ppw-legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-2);
  background: transparent;
  border: 1px solid oklch(0.20 0.015 90);
  padding: 6px 11px;
  border-radius: 999px;
}
.ppw-legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
}
.ppw-legend-dot-mine {
  background: var(--accent-primary);
}
.ppw-legend-dash {
  width: 14px;
  height: 2px;
  background: linear-gradient(to right, var(--ink-4) 0 4px, transparent 4px 8px, var(--ink-4) 8px 12px, transparent 12px 14px);
}
.ppw-caption {
  margin: 8px 0 0;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--ink-3);
}

/* ─── 7. TICKER ───────────────────────────────────────────────── */
.ticker-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.2rem, 2.1vw, 1.4rem);
  line-height: 1.05;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0;
}
.ticker-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ticker-row {
  position: relative;
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 10px 14px 10px 18px;
  border-radius: 8px;
  background: oklch(0.10 0.015 90 / 0.5);
  border: 1px solid oklch(0.16 0.015 90);
  overflow: hidden;
}
.ticker-row-flat {
  background: transparent;
  border-color: oklch(0.14 0.015 90);
}
.ticker-edge {
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 0;
  width: 2px;
  border-radius: 0 2px 2px 0;
}
.ticker-edge-green    { background: var(--accent-up); }
.ticker-edge-magenta  { background: var(--accent-secondary); }
.ticker-edge-teal     { background: var(--accent-tertiary); }
.ticker-edge-neutral  { background: var(--ink-3); }
.ticker-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ticker-dot-green    { background: var(--accent-up); }
.ticker-dot-magenta  { background: var(--accent-secondary); }
.ticker-dot-teal     { background: var(--accent-tertiary); }
.ticker-dot-neutral  { background: var(--ink-3); }
.ticker-tag {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
}
.ticker-tag-green    { color: var(--accent-up);        background: oklch(0.74 0.18 145 / 0.10); }
.ticker-tag-magenta  { color: var(--accent-secondary); background: oklch(0.70 0.27 350 / 0.10); }
.ticker-tag-teal     { color: var(--accent-tertiary);  background: oklch(0.72 0.18 195 / 0.10); }
.ticker-tag-neutral  { color: var(--ink-3);            background: oklch(0.30 0.012 90 / 0.4); }
.ticker-copy {
  font-size: 0.94rem;
  line-height: 1.4;
  color: var(--ink-2);
  margin: 0;
  min-width: 0;
}

@media (max-width: 720px) {
  .ticker-row {
    grid-template-columns: auto auto;
    grid-template-areas:
      "dot tag"
      "copy copy";
    row-gap: 6px;
    padding: 10px 14px 10px 16px;
  }
  .ticker-row > .ticker-dot { grid-area: dot; }
  .ticker-row > .ticker-tag { grid-area: tag; justify-self: start; }
  .ticker-row > .ticker-copy { grid-area: copy; }
  .ticker-copy { font-size: 0.88rem; }
}

/* ─── 8. QUICK READS ──────────────────────────────────────────── */
.quick { display: flex; flex-direction: column; gap: 12px; }
.pills {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
}
.pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: oklch(0.10 0.015 90 / 0.5);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 999px;
  font-family: 'Barlow', sans-serif;
}
.pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pill-dot-tertiary  { background: var(--accent-tertiary); }
.pill-dot-secondary { background: var(--accent-secondary); }
.pill-dot-up        { background: var(--accent-up); }
.pill-dot-mute      { background: oklch(0.30 0.012 90); }
.pill-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
  flex-shrink: 0;
}
.pill-value {
  font-size: 0.86rem;
  color: var(--ink-1);
  margin-left: auto;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

/* ─── Shared avatar image ─────────────────────────────────────── */
.avatar-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  border-radius: inherit;
}
</style>

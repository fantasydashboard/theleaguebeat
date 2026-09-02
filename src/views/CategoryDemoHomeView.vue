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
         SHARE STATUS TOAST — surfaces the in-flight, success, and
         error states of the per-story share flow so users get visible
         feedback rather than silent downloads.
    ────────────────────────────────────────────────────────────── -->
    <div
      v-if="isSharing || shareError || shareSuccessToast"
      class="share-toast"
      :class="{
        'share-toast-progress': isSharing,
        'share-toast-success':  !isSharing && shareSuccessToast,
        'share-toast-error':    !isSharing && shareError,
      }"
      role="status"
      aria-live="polite"
    >
      <span class="share-toast-dot" aria-hidden="true"></span>
      <span class="share-toast-msg">
        <template v-if="isSharing">Building your card.</template>
        <template v-else-if="shareError">Share failed: {{ shareError }}</template>
        <template v-else>{{ shareSuccessToast }}</template>
      </span>
    </div>

    <!-- ─────────────────────────────────────────────────────────────
         THE BEAT — daily home stack.

         Three zones, top of page: THE LEDE (today's editorial column)
         → ON YOUR LINE (your-team-focused fact strip) → TODAY'S
         BEATS (TheWire, daily filings carousel). The weekly hero
         ("THIS WEEK") and THRONE STREAK live on THE ISSUE; the
         cover archive snapshot still composes silently below for
         issue history.
    ────────────────────────────────────────────────────────────── -->
    <TheLede v-if="showDemoContent" :lede="liveLede" />

    <OnYourLine v-if="showDemoContent" :data="issueData" />

    <TheWire
      v-if="showDemoContent"
      :stories="selectedStories"
      :data="issueData"
      :hero-signature="heroStorySignature"
    />

    <!-- ─────────────────────────────────────────────────────────────
         WEEKLY THREAD — matchup-of-week + division-race only. The
         StreakWatch surface (throne / basement) was removed: its
         framing duplicates THE LEDE's streak-watch Kind and reads
         as cacophony when both are loud the same day.
    ────────────────────────────────────────────────────────────── -->
    <template v-if="showDemoContent && weeklyNonHeroSections.length > 0">
      <EditorialBreak size="small" tone="teal" />
      <template v-for="section in weeklyNonHeroSections" :key="`${section.type}:${section.story?.signature ?? 'anchor'}`">
        <MatchupOfWeek
          v-if="section.type === 'matchup-of-week' && section.story"
          :story="section.story"
          :data="issueData"
          @share="onShareStory"
        />
        <DivisionRace
          v-else-if="section.type === 'division-race' && section.story"
          :story="section.story"
          :data="issueData"
          @share="onShareStory"
        />
      </template>
    </template>

    <!-- Legacy inline hero (the protagonist/antagonist faceoff block)
         removed — THE LEDE + ON YOUR LINE cover the top-of-page
         editorial slots now. -->

    <!-- ─────────────────────────────────────────────────────────────
         RACE FOR THE PLAYOFFS — Seeds 5-8 bubble comparison.
         Top 6 make playoffs. Bubble = seeds 5-8 with the playoff
         line between seed 6 and seed 7. MV row gets yellow wayfinding
         tint + star pin (third-person copy elsewhere).
    ────────────────────────────────────────────────────────────── -->
    <!-- Playoff push only renders in stretch (last ~5 weeks) and final
         (last ~2 weeks) stages — and during actual playoffs. In
         midseason this framing is editorially wrong (no urgency yet,
         the bubble isn't real until the math tightens). -->
    <section
      v-if="showDemoContent && showPlayoffPush"
      class="bubble"
      aria-labelledby="bubble-headline"
    >
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
                <p v-if="lookupTeam(row.teamId).ownerName" class="bubble-owner">
                  {{ lookupTeam(row.teamId).ownerName }}
                </p>
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
    <!-- Fixture swings are DEMO content. The old guard was
         `!isStrictLiveMode`, but the query-param path
         (?leagueId=&platform=) binds a real league without being
         strict mode — so a live league rendered demo baseball
         swings underneath its own masthead. Verified in a browser
         against a real Sleeper football league, which showed
         "Skubal struck out 12" and a live SV race between two
         demo baseball teams. Gate on whether ANY live league is
         bound, not on which route bound it. -->
    <section v-if="!isLiveBound" class="story-track-section" aria-labelledby="swings-h">
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

    <!-- Live scoreboard removed from the home page. It duplicated the
         dedicated Matchups page exactly (same 6-row table, same data,
         same routing target). Daily live results belong on /matchups;
         the home cover should be editorial features, not a dashboard
         widget. The matchup-of-week / rematch faceoff cards above
         carry the "what to watch this week" framing instead. -->

    <!-- Silent hairline before standings. -->
    <EditorialBreak size="small" tone="magenta" />

    <!-- ─────────────────────────────────────────────────────────────
         5. STANDINGS — Compact (top 6 playoff line)
    ────────────────────────────────────────────────────────────── -->
    <section v-if="showDemoContent" class="standings" aria-labelledby="standings-headline">
      <header class="section-head section-head-flex">
        <div>
          <p class="section-eyebrow section-eyebrow-magenta">Standings</p>
          <h2 class="standings-headline" id="standings-headline">{{ standingsHeadline }}</h2>
          <p v-if="standingsDeck" class="standings-deck">{{ standingsDeck }}</p>
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
        <template v-for="(entry, idx) in compactStandings" :key="idx">
          <li
            v-if="entry.type === 'separator'"
            class="stand-separator"
            aria-hidden="true"
          >
            <span class="stand-separator-dots">· · ·</span>
          </li>
          <li
            v-else-if="entry.type === 'playoff-line'"
            class="stand-playoff-line"
            aria-label="Playoff line"
          >
            <span class="stand-playoff-line-rule" aria-hidden="true"></span>
            <span class="stand-playoff-line-label">Playoff line</span>
            <span class="stand-playoff-line-rule" aria-hidden="true"></span>
          </li>
          <li
            v-else-if="entry.row"
            class="stand-row"
            :class="{
              'stand-row-mine': lookupTeam(entry.row.teamId).isMyTeam,
              'stand-row-cutoff': entry.row.rank === bubbleCutoff,
              'stand-row-out': entry.row.rank === bubbleCutoff + 1,
            }"
            tabindex="0"
            role="button"
            :aria-label="`Open team detail for ${lookupTeam(entry.row.teamId).name}`"
            @click="goToPowerRankings"
            @keydown.enter.prevent="goToPowerRankings"
            @keydown.space.prevent="goToPowerRankings"
          >
            <span class="stand-rank" :class="{ 'stand-rank-playoff': entry.row.rank <= bubbleCutoff }">
              <span v-if="entry.row.rank === 1" class="stand-rank-crown" aria-label="League leader">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>
                </svg>
              </span>
              <span class="stand-rank-num">{{ entry.row.rank }}</span>
              <span v-if="entry.row.rank <= bubbleCutoff && entry.row.rank !== 1" class="stand-rank-dot" aria-hidden="true"></span>
            </span>

            <div class="stand-team">
              <div class="stand-avatar" :style="{ background: `linear-gradient(135deg, ${lookupTeam(entry.row.teamId).avatarColor})` }">
                <img v-if="lookupTeam(entry.row.teamId).avatarUrl" :src="lookupTeam(entry.row.teamId).avatarUrl" class="avatar-image" alt="" />
                <span v-else>{{ lookupTeam(entry.row.teamId).ownerInitials }}</span>
                <span v-if="lookupTeam(entry.row.teamId).isMyTeam" class="stand-star" aria-label="Your team" title="Your team">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <polygon points="12 2 15 9 22 9.5 16.5 14.5 18 22 12 18 6 22 7.5 14.5 2 9.5 9 9"/>
                  </svg>
                </span>
              </div>
              <div class="stand-name-block">
                <p class="stand-name">{{ lookupTeam(entry.row.teamId).name }}</p>
                <p v-if="lookupTeam(entry.row.teamId).ownerName" class="stand-owner">
                  {{ lookupTeam(entry.row.teamId).ownerName }}
                </p>
              </div>
            </div>

            <span class="stand-record">{{ entry.row.catWins }}-{{ entry.row.catLosses }}-{{ entry.row.catTies }}</span>

            <span class="stand-last6" :aria-label="`Last 6 matchups: ${entry.row.lastSix.join(', ')}`">
              <span
                v-for="(r, i) in entry.row.lastSix"
                :key="i"
                class="stand-last6-dot"
                :class="r === 'W' ? 'stand-last6-dot-w' : r === 'L' ? 'stand-last6-dot-l' : 'stand-last6-dot-t'"
                aria-hidden="true"
              ></span>
            </span>

            <span
              v-if="entry.row.streak.length > 0"
              class="stand-streak"
              :class="entry.row.streak.type === 'W' ? 'stand-streak-win' : entry.row.streak.type === 'L' ? 'stand-streak-loss' : 'stand-streak-tie'"
            >{{ entry.row.streak.type }}{{ entry.row.streak.length }}</span>
            <span v-else class="stand-streak-empty" aria-label="No streak yet">&mdash;</span>
          </li>
        </template>
      </ol>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         6. THE CLIMB — rank trajectory. "Heating up" reads off
         rank-over-time (low = good), not noisy weekly cat counts.
         Your team + the biggest climber render bold; the rest of the
         league sits faint behind for context.
    ────────────────────────────────────────────────────────────── -->
    <section v-if="showDemoContent" class="momentum" aria-labelledby="momentum-headline">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal">
          The climb
          <span v-if="climbThroughWeekLabel" class="section-eyebrow-meta">{{ climbThroughWeekLabel }}</span>
        </p>
        <h2 class="momentum-headline" id="momentum-headline">Who's been heating up.</h2>
      </header>

      <div v-if="hasRankHistory" class="momentum-chart">
        <RankSparkline
          :data="issueData"
          :focus-team-ids="momentumFocusIds"
          :focus-colors="momentumFocusColors"
          labels="rank"
          :endpoint-logos="true"
          aria-label="Team rank trajectory across the season"
        />
      </div>
      <p v-else class="momentum-empty">
        The trajectory fills in once a few weeks are on the board.
      </p>

      <ul class="momentum-legend" role="list">
        <li v-if="myTeamId" class="momentum-legend-pill">
          <span class="momentum-legend-dot momentum-legend-dot-mine" aria-hidden="true"></span>
          Your team
        </li>
        <li v-if="climberTeam && climberTeam.id !== myTeamId" class="momentum-legend-pill">
          <span class="momentum-legend-dot momentum-legend-dot-climber" aria-hidden="true"></span>
          Biggest climber ({{ climberTeam.name }})
        </li>
        <li class="momentum-legend-pill momentum-legend-pill-mute">
          <span class="momentum-legend-dot momentum-legend-dot-field" aria-hidden="true"></span>
          The rest of the league
        </li>
      </ul>

      <p class="momentum-caption">
        Each line is a team's seed, week by week. Lines rising toward the top are the teams climbing the standings.
      </p>
    </section>

    <!-- Silent hairline. The season-arc section's own header carries
         the label. -->
    <!-- Sections "Season arcs" + "Quick reads" were removed. They
         were eight small dashboard chips that mostly restated what
         The Wire already surfaces (HOT STREAK, ROUGH PATCH, TOP CAT
         KING) without telling stories. Repeated "TOP CAT KING" twice
         in the original list was the tell that the section was
         filler, not editorial. The Wire (top of page) covers daily
         pulses; the Power Rankings page covers cumulative stats. -->

    <!-- ─────────────────────────────────────────────────────────────
         SEASONAL BLOCK — single slot that swaps content based on
         where we are in the year. Renders nothing during
         settling/midseason; carries Draft Autopsy (opening),
         Playoff Picture (stretch/final), Bracket (playoffs), or
         Season Recap (offseason) when those stages fire. Gives
         the home year-round flex without a new section every time.
    ────────────────────────────────────────────────────────────── -->
    <SeasonalBlock :data="issueData" />
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
  yesterdayBigSwings,
} from '@/fixtures/categoriesLeague'
import { accentFor } from '@/utils/teamColor'
import { renderHomePage, type RenderedHomeCopy } from '@/editorial/render'
import { renderLedePage, type RenderedLede } from '@/editorial/render-lede'
import TheLede from '@/components/issue/TheLede.vue'
import OnYourLine from '@/components/issue/OnYourLine.vue'
import { detectAll } from '@/editorial/detection'
import { selectStoriesForIssue } from '@/editorial/selection'
import { composeIssue, type IssueSection } from '@/editorial/composition'
import { deriveSeasonStage } from '@/editorial/detection/helpers'
import HeroSolo from '@/components/issue/HeroSolo.vue'
import HeroQuiet from '@/components/issue/HeroQuiet.vue'
import HeroFaceoff from '@/components/issue/HeroFaceoff.vue'
import MatchupOfWeek from '@/components/issue/MatchupOfWeek.vue'
import StreakWatch from '@/components/issue/StreakWatch.vue'
import DivisionRace from '@/components/issue/DivisionRace.vue'
import TheWire from '@/components/issue/TheWire.vue'
import EditorialBreak from '@/components/issue/EditorialBreak.vue'
import SeasonalBlock from '@/components/issue/SeasonalBlock.vue'
import RankSparkline from '@/components/issue/RankSparkline.vue'
import { composeWeeklyCover, resolveCoverImageUrl } from '@/editorial/composition/weeklyCover'
import { snapshotCover, claimIssue } from '@/services/coverArchive'
import { useShareStory } from '@/composables/useShareStory'
import { useIssueStore } from '@/stores/issueState'
import { categoriesFixtureToLeagueData } from '@/editorial/fixtureAdapter'
import { leagueFoundedSeason } from '@/utils/leagueAge'
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

// Magazine issue number + volume for the cover live in `coverMeta`
// below — read from the shared issue store so they stay in lockstep
// with the masthead instead of drifting off the fixture constants.

/** "Week of May 25" — current Monday in user's local time. */
const weekOfLabel = computed<string>(() => {
  const now = new Date()
  // Find this week's Monday.
  const day = now.getDay() // 0 Sun .. 6 Sat
  const offsetToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + offsetToMonday)
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})

/* ─────────────────────────────────────────────────────────────────
   COVER ARCHIVE — snapshot + claim on every visit during the
   issue's live week. Snapshots are idempotent on (league, season,
   week); claims are idempotent the same way. Both are localStorage
   for v1; Supabase sync can come later.
───────────────────────────────────────────────────────────────── */

/** Tone resolver — mirrors WeeklyCover.vue's `tone` computed so
 *  the snapshot stores the same color the live cover renders. */
function resolveCoverTone(storyType: string): 'magenta' | 'gold' | 'teal' | 'up' | 'down' {
  if (storyType === 'blockbuster-trade' || storyType === 'lopsided-trade') return 'gold'
  if (storyType === 'new-throne' || storyType === 'dynasty-falling' || storyType === 'dethroned-rivalry') return 'magenta'
  if (storyType === 'monster-night' || storyType === 'three-hr-game' || storyType === 'twelve-k-game' || storyType === 'no-hitter') return 'gold'
  if (storyType === 'comeback-team' || storyType === 'hot-climber' || storyType === 'streak-built' || storyType === 'three-week-comeback') return 'up'
  if (storyType === 'streak-broken' || storyType === 'three-week-collapse') return 'down'
  if (storyType === 'photo-finish' || storyType === 'comeback-win') return 'teal'
  return 'magenta'
}

// NOTE: the cover-archive snapshot/claim watch is declared LOWER in
// this file, right after `issueData` + `selectedStories`. A watch with
// `{ immediate: true }` runs its getter synchronously during setup, so
// it must be ordered after the refs it reads — otherwise it hits a TDZ
// ReferenceError ("Cannot access 'issueData' before initialization")
// during setup that blanks the entire page. See `watchCoverArchive`.
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

/**
 * Compact standings — top 3 + cut-line pair + your team + bottom team.
 * Magazine convention: show the storylines, not the full table. The
 * Power Rankings page carries the full list.
 *
 * Inserts a `separator` entry between non-contiguous rows so the eye
 * sees "there's a gap here" instead of jumping from #3 to #6 without
 * a visual cue.
 */
interface CompactRow {
  type: 'row' | 'separator' | 'playoff-line'
  row?: typeof standings2026Week8[number]
}

/**
 * Story-driven standings headline. Falls back to "Top N make the
 * playoffs." when nothing more interesting is firing. The intent is
 * that a hot leader or a tightening cut line gets editorial framing
 * instead of a generic structural label.
 *
 * Seasonal flex lives here too — late-season weeks emphasize the
 * cut-line urgency; early-season just notes who's at the top.
 */
const standingsHeadline = computed<string>(() => {
  const all = standings.value
  const cutoff = bubbleCutoff.value
  if (!all || all.length === 0) return `Top ${cutoff} make the playoffs.`

  const top = all[0]
  const topTeam = lookupTeam(top.teamId)
  const bubbleIn = all[cutoff - 1]
  const bubbleOut = all[cutoff]
  const cutGap = bubbleIn && bubbleOut
    ? (bubbleIn.catWins + bubbleIn.catTies) - (bubbleOut.catWins + bubbleOut.catTies)
    : null

  // Hot leader with a real win streak.
  if (top.streak.type === 'W' && top.streak.length >= 4) {
    return `${topTeam.name} runs the field.`
  }
  // Tight cut line — late-season urgency.
  if (cutGap !== null && cutGap > 0 && cutGap <= 3) {
    return `Cut line down to ${cutGap} ${cutGap === 1 ? 'cat' : 'cats'}.`
  }
  // Top team has a commanding gap over second.
  const secondCats = all[1] ? all[1].catWins + all[1].catTies : 0
  const topCats = top.catWins + top.catTies
  if (topCats - secondCats >= 8) {
    return `${topTeam.name} is pulling away.`
  }
  // Default — structural but honest.
  return `Top ${cutoff} make the playoffs.`
})

/** Standings deck — the small subtitle line under the headline.
 *  Always shows the cutoff number so the playoff structure is on
 *  the page regardless of which headline variant fired. Suppressed
 *  when the headline ALREADY names the cutoff (no point repeating
 *  "Top 6 make the playoffs" twice).
 */
const standingsDeck = computed<string>(() => {
  const cutoff = bubbleCutoff.value
  if (!cutoff || cutoff < 1) return ''
  const headline = standingsHeadline.value
  if (headline.startsWith('Top ')) return ''
  return `Top ${cutoff} make the playoffs.`
})

const compactStandings = computed<CompactRow[]>(() => {
  const all = standings.value
  if (!all || all.length === 0) return []
  const cutoff = bubbleCutoff.value
  const myIdx = all.findIndex((r) => lookupTeam(r.teamId).isMyTeam)

  const indices = new Set<number>()
  // Top 3
  for (let i = 0; i < Math.min(3, all.length); i++) indices.add(i)
  // Last team in (bubble) + first team out (cut line pair)
  if (cutoff >= 1 && cutoff <= all.length) indices.add(cutoff - 1)
  if (cutoff < all.length) indices.add(cutoff)
  // Your team
  if (myIdx >= 0) indices.add(myIdx)
  // Bottom team
  indices.add(all.length - 1)

  const sorted = Array.from(indices).sort((a, b) => a - b)
  const out: CompactRow[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      out.push({ type: 'separator' })
    }
    out.push({ type: 'row', row: all[sorted[i]] })
    // Inject a "Playoff line" label between the cutoff row (last
    // team in) and the next-rendered row, whenever the next row is
    // the first team out. Without this the cutoff is only signaled
    // by a thin border, which readers don't always catch.
    const currentIdx = sorted[i]
    const nextIdx = sorted[i + 1]
    const currentRank = all[currentIdx]?.rank
    const nextRank = all[nextIdx]?.rank
    if (currentRank === cutoff && nextRank === cutoff + 1) {
      out.push({ type: 'playoff-line' })
    }
  }
  return out
})

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
// THE LEDE — the day's editorial column. Date-seeded, stable across
// reloads within the same day. Initialized from fixture so first
// paint shows the demo lede; gets replaced wholesale when the live
// adapter resolves the user's actual league data.
const liveLede = shallowRef<RenderedLede | null>(
  renderLedePage(categoriesFixtureToLeagueData()),
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
/** Raw selected stories — kept around because The Wire needs to
 *  pick its OWN subset (daily-cadence stories that don't make the
 *  composition's hero/supporting slots) and rendering with the same
 *  selection output keeps everything synchronized. */
const selectedStories = computed(() => {
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
  return selectStoriesForIssue(candidates, context)
})

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
  return composeIssue(selectedStories.value, context)
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

/** True when the new composition pipeline has surfaced a hero section.
 *  We use this to suppress the legacy inline hero face-off below so
 *  the page doesn't render two competing hero treatments back-to-back. */
const HERO_SECTION_TYPES = new Set([
  'hero-faceoff',
  'hero-solo',
  'hero-quiet',
  'hero-trade',
  'hero-milestone',
])
const hasDynamicHero = computed(() =>
  issueSections.value.some((s) => HERO_SECTION_TYPES.has(s.type)),
)

/** Share handler — generates a vertical (9:16) PNG of the story via
 *  the ShareCard template and triggers the platform's share sheet
 *  (mobile) or a download + clipboard write (desktop). All failure
 *  paths log to console and surface a UI toast via shareError. */
const { shareStory: triggerShare, isSharing, shareError } = useShareStory()

/** Transient "downloaded / copied" confirmation after a successful
 *  desktop share. Cleared automatically after a beat. */
const shareSuccessToast = ref<string | null>(null)

function onShareStory(story: import('@/editorial/detection').SelectedStory) {
  console.log('[share] click → onShareStory', story.type, story.signature)
  shareSuccessToast.value = null
  triggerShare(story, issueData.value)
    .then(() => {
      // navigator.share resolves whether or not the user actually
      // shared; the file download fallback always runs on desktop.
      // Either way, surface a confirmation if there was no error.
      if (!shareError.value) {
        shareSuccessToast.value = 'Card ready. Check Downloads or paste from clipboard.'
        setTimeout(() => { shareSuccessToast.value = null }, 4000)
      }
    })
    .catch((err) => {
      console.error('[share] triggerShare rejected:', err)
    })
}

const dynamicIssueSections = computed(() =>
  issueSections.value.filter((s) => NEW_SECTION_TYPES.has(s.type)),
)

/** Split into hero vs non-hero so the home page can render the
 *  hero immediately, then The Wire and the live scoreboard, then
 *  come back to the non-hero stories further down. This is what
 *  drives the "magazine scroll rhythm" — different content blocks
 *  in different positions instead of one big section run. */
const dynamicHeroSections = computed(() =>
  dynamicIssueSections.value.filter((s) => HERO_SECTION_TYPES.has(s.type)),
)

/** Signature of the story currently anchoring the hero, if any.
 *  Passed to TheWire so it can suppress the duplicate card. */
const heroStorySignature = computed<string | undefined>(() => {
  const heroSection = dynamicHeroSections.value.find((s) => s.story)
  return heroSection?.story?.signature
})
const dynamicNonHeroSections = computed(() =>
  dynamicIssueSections.value.filter((s) => !HERO_SECTION_TYPES.has(s.type)),
)

/** THE BEAT weekly thread. Filters out streak-watch — the throne /
 *  basement framing duplicates THE LEDE's streak-watch Kind and the
 *  two surfaces reading the same story right next to each other is
 *  the cacophony bug Josh flagged. Matchup-of-week and division-race
 *  pass through unchanged. */
const weeklyNonHeroSections = computed(() =>
  dynamicNonHeroSections.value.filter((s) => s.type !== 'streak-watch'),
)

/** "Now" stamp for the daily EditorialBreak — uses the issue store's
 *  lastUpdated or falls back to now. */
const nowDate = computed(() => new Date())

/** Source league data passed to section components for team lookups. */
const issueData = computed(
  () => liveData.value ?? categoriesFixtureToLeagueData(),
)

/** Storage key for the cover archive. MUST match the key the Archive
 *  view reads with — the route's Supabase UUID for a live league, or
 *  'demo' off-route. NOTE: issueData.leagueId is the *platform* league
 *  key (e.g. Yahoo "466.l.123"), so keying snapshots by it landed them
 *  in a bucket the Archive never reads — that's why the shelf was empty. */
const archiveLeagueId = computed<string>(() => {
  const fromUrl = route.params.leagueId
  return typeof fromUrl === 'string' && fromUrl ? fromUrl : 'demo'
})

/** Cover-archive snapshot + claim. Runs on mount + every data refresh.
 *  Idempotent per (league, season, week) via the storage layer. Wrapped
 *  in try/catch — retention plumbing must never blank the page.
 *
 *  MUST stay below `issueData` + `selectedStories`: with
 *  `{ immediate: true }` the getter runs synchronously during setup,
 *  so the refs it reads have to be initialized first (TDZ). */
watch(
  () =>
    [
      archiveLeagueId.value,
      issueData.value?.currentWeek,
      issueData.value?.currentSeason,
      liveData.value,
    ] as const,
  () => {
    try {
      // In a live league, wait for real data before snapshotting — else
      // the fixture fallback cover gets written under the real key.
      const inLiveLeague =
        typeof route.params.leagueId === 'string' && route.params.leagueId.length > 0
      if (inLiveLeague && !liveData.value) return

      const data = issueData.value
      if (!data) return
      const leagueId = archiveLeagueId.value
      const week = data.currentWeek
      const season = data.currentSeason
      if (!week || !season) return

      const stories = selectedStories.value
      if (!stories || !Array.isArray(stories)) return

      const cover = composeWeeklyCover(stories, { currentWeek: week })
      if (cover) {
        const tone = resolveCoverTone(cover.story.type)
        const imageUrl = resolveCoverImageUrl(cover.story, data.teams)
        snapshotCover(leagueId, cover, week, season, tone, imageUrl)
      }
      // Claim regardless of whether a real cover composed — visiting
      // during the issue's week counts even on a quiet-cover week.
      claimIssue(leagueId, week, season)
    } catch (err) {
      console.warn('[cover-archive] snapshot/claim failed:', err)
    }
  },
  { immediate: true },
)

/** Season-stage gate for the inline playoff-push section. The
 *  framing only makes sense in the last 5 weeks of the regular
 *  season (stretch) and onward — in midseason "four teams two
 *  spots" reads as premature urgency that doesn't match the math.
 *  Composition emits the playoff-push-detailed section only in
 *  those stages; we mirror that gate on the inline rendering. */
const showPlayoffPush = computed(() => {
  const source = liveData.value ?? categoriesFixtureToLeagueData()
  const stage = deriveSeasonStage(
    source.currentWeek,
    source.regularSeasonEndWeek,
  )
  return stage === 'stretch' || stage === 'final' || stage === 'playoffs'
})

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
const issueStore = useIssueStore()
const strictLeagueRecord = computed(() => {
  const uuid = route.params.leagueId
  if (typeof uuid !== 'string' || uuid.length === 0) return null
  return leaguesStore.leagues.find((l) => l.id === uuid) ?? null
})
const isStrictLiveMode = computed(() => typeof route.params.leagueId === 'string')

/** True when this page is showing a REAL league, by either route shape:
 *  the strict `/leagues/:id/...` path or the anonymous
 *  `?leagueId=&platform=` fallback the Sleeper connect flow lands on.
 *  Fixture-backed sections must check this, never the route shape. */
const isLiveBound = computed(
  () => isStrictLiveMode.value || liveLeagueId.value !== null,
)

/**
 * Whether the page may render its fixture-backed sections.
 *
 * In pure demo mode: always. Bound to a real league: only once that
 * league's data has actually arrived. Otherwise a failed or in-flight
 * live load left the demo issue rendering underneath the error banner —
 * a football manager saw "we couldn't load this league" sitting on top
 * of a fully-written baseball issue about teams that are not theirs.
 */
const showDemoContent = computed(
  () => !isLiveBound.value || liveData.value !== null,
)

/** Earliest season we have stored for this league — same util the
 *  layout feeds the masthead. Published into the issue store on load
 *  (below) so the masthead AND the cover read one source of truth for
 *  the volume number. */
const coverFoundedSeason = computed<number | undefined>(() => {
  const league = strictLeagueRecord.value
  if (!league) return undefined
  return leagueFoundedSeason(league, leaguesStore.leagues)
})

/** Issue number + volume for the cover, read from the same issue store
 *  the masthead reads. Keeps the cover's "ISSUE 10 · VOL. 3" in lockstep
 *  with the masthead rather than drifting off the fixture constants. */
const coverMeta = computed<{ issueNumber: number; volume: number }>(() => {
  const week = issueStore.currentWeek ?? issueData.value.currentWeek ?? 1
  const season =
    issueStore.currentSeason ?? issueData.value.currentSeason ?? new Date().getFullYear()
  const founded = issueStore.leagueFoundedSeason ?? season
  return {
    issueNumber: Math.max(1, week),
    volume: Math.max(1, season - founded + 1),
  }
})

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
    // leagueRowId is the Supabase UUID (route param) — needed by
    // the snapshot helper so each adapter can save today's snapshot
    // and diff against yesterday's for overnight Wire stories.
    const leagueRowId =
      typeof route.params.leagueId === 'string'
        ? route.params.leagueId
        : undefined
    const opts = { userIdentity: collectUserIdentity(), leagueRowId }
    const data =
      platform === 'espn'
        ? await espnLeagueToCategoryData(id, opts)
        : platform === 'yahoo'
        ? await yahooLeagueToCategoryData(id, opts)
        : await sleeperLeagueToCategoryData(id, opts)

    // This is the DEMO Beat, and it is category-only: `renderHomePage`
    // and every computed below expect the category shape. Points
    // leagues have a real Beat at /leagues/:id/the-beat (BeatFeedView),
    // which requires an account.
    //
    // Before the adapter's sport gate existed this branch was never
    // reached — football came back wearing the category shape with 0-0
    // records, and the page rendered nonsense like "At 0-0 on a 6-game
    // losing run" instead of failing. Say what is true instead.
    if (data.format !== 'h2h-category') {
      liveError.value =
        'Football leagues read on your own league page. Sign in and connect this league to open it.'
      return
    }

    liveData.value = data
    liveEditorial.value = renderHomePage(data)
    liveLede.value = renderLedePage(data)
    // Publish live issue context to the shared store so the
    // layout's masthead can swap its first-paint fallback ("ISSUE ?")
    // for the real week. Includes season stage so the playoff
    // labels ("PLAYOFFS · ROUND 1") light up at the right time.
    // Founded year: prefer the platform-API truth from seasonHistory
    // (every season the platform records) over the connected-leagues
    // estimate (only seasons the user wired up to TLB).
    const historyYears = (data.seasonHistory ?? [])
      .map((s) => s.year)
      .filter((y): y is number => Number.isFinite(y))
    const connectedFounded = coverFoundedSeason.value ?? data.currentSeason
    const foundedSeason = historyYears.length > 0
      ? Math.min(connectedFounded, ...historyYears)
      : connectedFounded
    issueStore.setIssue({
      currentWeek: data.currentWeek,
      currentSeason: data.currentSeason,
      regularSeasonEndWeek: data.regularSeasonEndWeek,
      seasonStage: deriveSeasonStage(data.currentWeek, data.regularSeasonEndWeek),
      leagueFoundedSeason: foundedSeason,
      lastUpdated: new Date(),
    })
  } catch (err) {
    const platformName =
      platform === 'espn' ? 'ESPN' : platform === 'yahoo' ? 'Yahoo' : 'Sleeper'
    liveError.value = (err as Error).message || `Failed to load ${platformName} league data.`
  } finally {
    liveLoading.value = false
  }
}

onMounted(async () => {
  // Publish the fixture's current week to the issue store IMMEDIATELY
  // so the masthead renders correct issue numbers before (or in lieu
  // of) the live adapter load. Live data overwrites this if present.
  const fixtureSource = categoriesFixtureToLeagueData()
  issueStore.setIssue({
    currentWeek: fixtureSource.currentWeek,
    currentSeason: fixtureSource.currentSeason,
    regularSeasonEndWeek: fixtureSource.regularSeasonEndWeek,
    seasonStage: deriveSeasonStage(
      fixtureSource.currentWeek,
      fixtureSource.regularSeasonEndWeek,
    ),
    leagueFoundedSeason: coverFoundedSeason.value,
    lastUpdated: new Date(),
  })

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
    liveLede.value = renderLedePage(categoriesFixtureToLeagueData())
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

/* Live scoreboard helpers were removed with the "What's happening now"
   section — that table duplicated /matchups exactly. If a future
   "today's pulse" treatment is wanted (1-sentence editorial summary
   instead of a 6-row table), reach into liveData.matchupsCurrentWeek
   directly. */

/* ─────────────────────────────────────────────────────────────────
   NAV
───────────────────────────────────────────────────────────────── */

function goToPowerRankings() {
  router.push('/demo-categories/power-rankings')
}

/* ─────────────────────────────────────────────────────────────────
   THE CLIMB — rank-trajectory momentum.
   "Heating up" reads honestly off rank-over-time (low = good), not
   noisy weekly cat counts. We bold two lines against the faint field:
   the viewer's team and the biggest recent climber.
───────────────────────────────────────────────────────────────── */

/** Viewer's team id, from live data (fixture's my-team in demo).
 *  Drives the bold "your team" line. */
const myTeamId = computed<string | undefined>(
  () => issueData.value.teams.find((t) => t.isMyTeam)?.id,
)

/** Biggest climber — the team that gained the most rank positions over
 *  roughly the last four weeks (earlier when history is short).
 *  Excludes the viewer's own team. Null until there's enough history. */
const climberTeam = computed(() => {
  const hist = issueData.value.seasonRankHistory
  if (!hist || hist.length < 2) return null
  const now = hist[hist.length - 1].ranks
  const past = hist[Math.max(0, hist.length - 5)].ranks
  let bestId: string | null = null
  let bestGain = -Infinity
  for (const t of issueData.value.teams) {
    if (t.id === myTeamId.value) continue
    const r0 = past[t.id]
    const r1 = now[t.id]
    if (typeof r0 !== 'number' || typeof r1 !== 'number') continue
    const gain = r0 - r1 // positive = climbed (rank number dropped)
    if (gain > bestGain) {
      bestGain = gain
      bestId = t.id
    }
  }
  return bestId ? issueData.value.teams.find((t) => t.id === bestId) ?? null : null
})

/** Focus lines for RankSparkline — viewer first (gold), climber second
 *  (green). Colors stay index-aligned with the ids. */
const momentumFocusIds = computed<string[]>(() => {
  const ids: string[] = []
  if (myTeamId.value) ids.push(myTeamId.value)
  if (climberTeam.value && climberTeam.value.id !== myTeamId.value) {
    ids.push(climberTeam.value.id)
  }
  return ids
})
const momentumFocusColors = computed<string[]>(() => {
  const colors: string[] = []
  if (myTeamId.value) colors.push('oklch(0.80 0.17 92)') // gold — your team
  if (climberTeam.value && climberTeam.value.id !== myTeamId.value) {
    colors.push('oklch(0.74 0.18 145)') // green — biggest climber
  }
  return colors
})

const hasRankHistory = computed(
  () => (issueData.value.seasonRankHistory?.length ?? 0) >= 2,
)

/** The Climb chart trails by one week — it shows end-of-completed-
 *  week ranks because that's the only point at which a week's
 *  outcome is settled. Live standings move within the current week
 *  as cats accrue. Without a time-frame label the reader sees the
 *  same team at two different ranks in two surfaces and reads it
 *  as a bug. Caption the chart with "Through week N" so the time
 *  frame is explicit. */
const climbThroughWeekLabel = computed<string | null>(() => {
  const history = issueData.value.seasonRankHistory ?? []
  if (history.length === 0) return null
  const lastWeek = history[history.length - 1]?.week
  if (typeof lastWeek !== 'number') return null
  return `Through week ${lastWeek}`
})
</script>

<style scoped>
/* Tokens (--ink-N, --accent-*) inherited from .demo-shell in CategoryDemoLayout. */
.home {
  display: flex;
  flex-direction: column;
  /* Tightened from 56px → 28px. Sections that need more breathing
     room use their own internal padding or an EditorialBreak. The
     old 56px stacked with section padding to create excessive
     dead space between hero and Wire. */
  gap: 28px;
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
.section-eyebrow-meta {
  margin-left: 12px;
  color: var(--ink-4);
  letter-spacing: 0.10em;
  font-weight: 700;
  text-transform: none;
}

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

/* ─── 1. LEGACY HERO ─────────────────────────────────────────────
   Old inline hero treatment, only renders when the dynamic
   composition pipeline doesn't emit a hero section (essentially
   never in practice). Card chrome (border + radius + radial bg)
   stripped to match the rest of the editorial layout. */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 40px;
  padding: 24px 0 32px;
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
  /* Strip the card; the magenta accent rule on the section header
     carries the visual signature. */
  padding: 28px 0 26px;
  position: relative;
}
.bubble::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 64px;
  height: 3px;
  background: var(--accent-secondary);
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
.standings-deck {
  margin: 6px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-4);
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
  border-bottom: 1px solid oklch(0.72 0.18 195 / 0.40);
}
/* First team out of the playoffs — subtle red-tinged top edge so the
   bubble pair reads as "the line is here." */
.stand-row-out {
  border-top: 1px dashed oklch(0.65 0.20 25 / 0.40);
}

/* Inline "Playoff line" marker between the last team in and first
   team out. Two hairline rules straddling a small label — reads
   like a magazine sidebar break, not a competing row. */
.stand-playoff-line {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 2px 4px;
  margin: 4px 0;
  list-style: none;
}
.stand-playoff-line-rule {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    oklch(0.65 0.20 25 / 0.45),
    transparent
  );
}
.stand-playoff-line-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: oklch(0.65 0.20 25 / 0.85);
  white-space: nowrap;
}
.stand-row-mine {
  background: oklch(0.78 0.18 92 / 0.06);
  border-color: oklch(0.78 0.18 92 / 0.28);
}
/* Separator pseudo-row — three dots that signal "rows skipped." */
.stand-separator {
  display: flex;
  justify-content: center;
  padding: 6px 0 10px;
  list-style: none;
}
.stand-separator-dots {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: 0.35em;
  color: oklch(0.40 0.010 90);
  user-select: none;
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
.stand-streak-empty {
  justify-self: end;
  color: var(--ink-5);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

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

/* ─── 6. THE CLIMB (rank trajectory) ──────────────────────────── */
.momentum-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  line-height: 1.1;
  letter-spacing: -0.008em;
  color: var(--ink-1);
  margin: 0;
}
.momentum-chart {
  width: 100%;
  /* Match RankSparkline's viewBox ratio so the chart fills the width
     cleanly instead of floating in dead space. */
  aspect-ratio: 600 / 222;
  margin-top: 12px;
}
.momentum-empty {
  margin: 18px 0;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--ink-3);
  font-style: italic;
}
.momentum-legend {
  list-style: none;
  padding: 0;
  margin: 18px 0 8px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.momentum-legend-pill {
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
.momentum-legend-pill-mute { color: var(--ink-3); }
.momentum-legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
}
.momentum-legend-dot-mine    { background: oklch(0.80 0.17 92); }
.momentum-legend-dot-climber { background: oklch(0.74 0.18 145); }
.momentum-legend-dot-field   { background: oklch(0.40 0.012 90); }
.momentum-caption {
  margin: 8px 0 0;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--ink-3);
  max-width: 60ch;
}

@media (max-width: 720px) {
  .momentum-chart { aspect-ratio: 3 / 2; }
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

/* ─── Share toast — fixed position, bottom-center, pill ──────── */
.share-toast {
  position: fixed;
  left: 50%;
  bottom: 32px;
  transform: translateX(-50%);
  z-index: 200;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 999px;
  background: oklch(0.10 0.015 90 / 0.96);
  border: 1px solid oklch(0.20 0.015 90);
  color: oklch(0.97 0.005 90);
  font-family: 'Barlow', sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  box-shadow: 0 12px 36px oklch(0 0 0 / 0.45);
  max-width: calc(100vw - 32px);
}
.share-toast-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: oklch(0.78 0.18 92);
}
.share-toast-progress .share-toast-dot {
  background: oklch(0.78 0.18 92);
  animation: share-toast-pulse 1s infinite cubic-bezier(0.22, 1, 0.36, 1);
}
.share-toast-success {
  border-color: oklch(0.74 0.18 145 / 0.5);
}
.share-toast-success .share-toast-dot {
  background: oklch(0.74 0.18 145);
}
.share-toast-error {
  border-color: oklch(0.65 0.20 25 / 0.5);
}
.share-toast-error .share-toast-dot {
  background: oklch(0.65 0.20 25);
}
@keyframes share-toast-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}
</style>

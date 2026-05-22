<template>
  <div class="cat-rankings">
    <!-- ─────────────────────────────────────────────────────────────
         LIVE LOAD STATUS — only renders when a leagueId is in the
         URL and the live adapter is fetching or has errored.
    ────────────────────────────────────────────────────────────── -->
    <div v-if="liveLoading" class="live-banner live-banner-loading" role="status" aria-live="polite">
      <span class="live-banner-mark" aria-hidden="true">
        <img src="/tlb-favicon.png" alt="" class="live-banner-mark-img" />
      </span>
      Loading your league from {{ platformLabel }}. Hang tight.
    </div>
    <LiveLoadError v-else-if="liveError" :message="liveError" />

    <!-- ─────────────────────────────────────────────────────────────
         1. PAGE HEADER — eyebrow + headline + sub + rank-shape stats
    ────────────────────────────────────────────────────────────── -->
    <header class="page-head">
      <div class="page-head-copy">
        <p class="page-eyebrow">
          <span class="page-eyebrow-bar" aria-hidden="true"></span>
          Week {{ displayCurrentWeek }}
        </p>
        <h1 class="page-headline">Power Rankings</h1>
        <p class="page-sub">{{ livePR.subHeadline }}</p>
      </div>
      <ul class="page-context" role="list" aria-label="At a glance">
        <li class="page-context-stat">
          <span class="page-context-num">{{ displayCurrentWeek }}</span>
          <span class="page-context-label">weeks done</span>
        </li>
        <li class="page-context-sep" aria-hidden="true"></li>
        <li class="page-context-stat">
          <span class="page-context-num page-context-num-accent">+{{ biggestJump.spots }}</span>
          <span class="page-context-label">biggest jump ({{ lookupTeam(biggestJump.teamId).name }})</span>
        </li>
        <li class="page-context-sep" aria-hidden="true"></li>
        <li class="page-context-stat">
          <span class="page-context-num">{{ longestFall.fromRank }} → {{ longestFall.toRank }}</span>
          <span class="page-context-label">longest fall ({{ lookupTeam(longestFall.teamId).name }})</span>
        </li>
      </ul>
    </header>

    <!-- ─────────────────────────────────────────────────────────────
         2. HERO — Biggest Mover of the Week (bt: #4 → #1 in 8 weeks)
         Mascot huge on left, declarative sentence + stats + share on right.
    ────────────────────────────────────────────────────────────── -->
    <section class="hero" :aria-labelledby="`hero-headline-${heroMoverTeam.id}`">
      <div class="hero-portrait">
        <span class="hero-portrait-glow" aria-hidden="true"></span>
        <div
          class="hero-portrait-frame"
          :style="{ background: `linear-gradient(155deg, ${heroMoverTeam.avatarColor})` }"
        >
          <img
            v-if="heroMoverTeam.avatarUrl"
            :src="heroMoverTeam.avatarUrl"
            class="hero-portrait-image avatar-image"
            alt=""
          />
          <span v-else class="hero-portrait-initials">{{ heroMoverTeam.ownerInitials }}</span>
          <span class="hero-portrait-sheen" aria-hidden="true"></span>
        </div>
      </div>

      <div class="hero-copy">
        <p class="hero-eyebrow">
          <span class="hero-eyebrow-bar" aria-hidden="true"></span>
          {{ heroMoverCopy.eyebrow }}
        </p>
        <h2 class="hero-headline" :id="`hero-headline-${heroMoverTeam.id}`">
          {{ heroMoverCopy.headline }}
        </h2>
        <p class="hero-body">{{ heroMoverCopy.body }}</p>

        <ul class="hero-stats" role="list">
          <li class="hero-stat hero-stat-primary">
            <span class="hero-stat-num">{{ heroSpotsLabel }}</span>
            <span class="hero-stat-label">spots</span>
          </li>
          <li class="hero-stat hero-stat-tertiary">
            <span class="hero-stat-num">{{ heroStreakLabel }}</span>
            <span class="hero-stat-label">streak</span>
          </li>
          <li class="hero-stat hero-stat-leader">
            <span class="hero-stat-num">{{ heroRecordLabel }}</span>
            <span class="hero-stat-label">this season</span>
          </li>
        </ul>

        <div class="hero-actions">
          <button
            type="button"
            class="hero-share"
            :aria-label="`Share the ${heroMoverTeam.name} climb card`"
            @click="$emit('open-signup')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            Share this card
          </button>
          <span class="hero-actions-meta">{{ heroMoverCopy.kicker }}</span>
        </div>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         2. SEASON TRAJECTORY — bump chart with featured arcs
    ────────────────────────────────────────────────────────────── -->
    <section class="trajectory" aria-labelledby="trajectory-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="trajectory-heading">Power rankings over time</p>
        <h2 class="trajectory-headline">Eight weeks of receipts.</h2>
        <p class="section-sub">The featured arcs. Everyone else fades into the background.</p>
      </header>

      <div class="trajectory-chart-wrap">
        <svg
          class="trajectory-chart"
          :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
          preserveAspectRatio="none"
          role="img"
          :aria-label="trajectoryAriaLabel"
        >
          <!-- Grid -->
          <g class="trajectory-grid">
            <line
              v-for="r in 10"
              :key="`grid-${r}`"
              x1="0"
              :y1="rankY(r)"
              :x2="CHART_W"
              :y2="rankY(r)"
            />
          </g>

          <!-- Clip paths for circular endpoint logos -->
          <defs>
            <clipPath
              v-for="t in displayTeams"
              :key="`clip-${t.id}`"
              :id="`cat-endpoint-clip-${t.id}`"
            >
              <circle :cx="endpointX" :cy="rankY(currentRank(t.id))" :r="t.isMyTeam ? 16 : 14" />
            </clipPath>
          </defs>

          <!-- Background (faded) lines first -->
          <path
            v-for="t in fadedTeams"
            :key="`bg-${t.id}`"
            class="trajectory-line trajectory-line-fade"
            :d="pathForTeam(t.id)"
            :stroke="lineColorFor(t.id)"
          />

          <!-- Featured lines on top -->
          <path
            v-for="t in featuredTeams"
            :key="`fg-${t.id}`"
            class="trajectory-line"
            :class="{ 'trajectory-line-mine': t.isMyTeam }"
            :d="pathForTeam(t.id)"
            :stroke="lineColorFor(t.id)"
          />

          <!-- Annotation: bt takes #1 at week 6.
               Fixture-only — it's the hand-authored throne-change moment.
               Hidden when live data is loaded since we don't compute a
               matching annotation dynamically yet. -->
          <g class="trajectory-annotation" v-if="!liveData">
            <circle
              :cx="weekX(6)"
              :cy="rankY(1)"
              r="5"
              fill="oklch(0.70 0.27 350)"
              stroke="oklch(0.10 0.015 90)"
              stroke-width="2"
            />
            <line
              :x1="weekX(6)" :y1="rankY(1) - 8"
              :x2="weekX(6)" :y2="rankY(1) - 22"
              stroke="oklch(0.70 0.27 350)" stroke-width="1.2" stroke-linecap="round"
            />
            <text
              :x="weekX(6)" :y="rankY(1) - 28"
              text-anchor="middle"
              class="trajectory-anno-label"
            >Week 6: Bullpen Theology takes #1</text>
          </g>

          <!-- Endpoints -->
          <g
            v-for="t in displayTeams"
            :key="`endpoint-${t.id}`"
            class="trajectory-endpoint"
            :class="{
              'trajectory-endpoint-mine': t.isMyTeam,
              'trajectory-endpoint-faded': !isFeatured(t.id),
            }"
          >
            <circle
              :cx="endpointX"
              :cy="rankY(currentRank(t.id))"
              :r="t.isMyTeam ? 16 : 14"
              :fill="lineColorFor(t.id)"
            />
            <image
              v-if="t.avatarUrl"
              :href="t.avatarUrl"
              :x="endpointX - (t.isMyTeam ? 16 : 14)"
              :y="rankY(currentRank(t.id)) - (t.isMyTeam ? 16 : 14)"
              :width="t.isMyTeam ? 32 : 28"
              :height="t.isMyTeam ? 32 : 28"
              :clip-path="`url(#cat-endpoint-clip-${t.id})`"
              preserveAspectRatio="xMidYMid slice"
            />
            <circle
              :cx="endpointX"
              :cy="rankY(currentRank(t.id))"
              :r="t.isMyTeam ? 16 : 14"
              fill="none"
              :stroke="t.isMyTeam ? 'oklch(0.78 0.18 92)' : 'oklch(0.10 0.015 90)'"
              :stroke-width="t.isMyTeam ? 2 : 1.5"
            />
          </g>
        </svg>

        <ul class="trajectory-weeks" aria-hidden="true">
          <li v-for="w in weekCount" :key="`wk-${w}`">W{{ w }}</li>
        </ul>
      </div>

      <ul class="trajectory-legend" role="list">
        <li
          v-for="t in featuredTeams"
          :key="`legend-${t.id}`"
          class="trajectory-legend-pill"
          :class="{ 'trajectory-legend-pill-mine': t.isMyTeam }"
        >
          <span
            class="trajectory-legend-avatar"
            :style="{ background: `linear-gradient(135deg, ${t.avatarColor})` }"
          >
            <img v-if="t.avatarUrl" :src="t.avatarUrl" class="avatar-image" alt="" />
            <span v-else>{{ t.ownerInitials }}</span>
          </span>
          <span class="trajectory-legend-name">{{ t.name }}</span>
        </li>
        <li class="trajectory-legend-note">{{ fadedTeams.length }} others faded for clarity</li>
      </ul>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         2b. NOW VS THEN — demoted fingerprint comparison
         The old bt-vs-ct face-off survives as a compact two-row strip
         under the bump chart. Earns its place, doesn't dominate.
    ────────────────────────────────────────────────────────────── -->
    <section class="throne" aria-labelledby="throne-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta" id="throne-heading">Where the throne changed</p>
        <p class="throne-caption">The pitching side flipped.</p>
      </header>
      <div class="throne-rows" aria-label="Category fingerprint comparison">
        <article
          v-for="(side, idx) in faceoffSides"
          :key="`throne-${side.teamId}`"
          class="throne-row"
          :class="{ 'throne-row-protagonist': idx === 0, 'throne-row-antagonist': idx === 1 }"
        >
          <div class="throne-id">
            <div
              class="throne-avatar"
              :style="{ background: `linear-gradient(135deg, ${lookupTeam(side.teamId).avatarColor})` }"
            >
              <img v-if="lookupTeam(side.teamId).avatarUrl" :src="lookupTeam(side.teamId).avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ lookupTeam(side.teamId).ownerInitials }}</span>
            </div>
            <div class="throne-text">
              <p class="throne-name">{{ lookupTeam(side.teamId).name }}</p>
              <p class="throne-meta">
                <span class="throne-owns">Owns <strong>{{ side.owns }}</strong></span>
                <span class="throne-sep" aria-hidden="true">·</span>
                <span class="throne-bleeds">Bleeds <strong>{{ side.bleeds }}</strong></span>
              </p>
            </div>
          </div>
          <ul class="throne-strip" role="list" :aria-label="`${lookupTeam(side.teamId).name} category fingerprint`">
            <li
              v-for="cat in displayCategories"
              :key="`throne-${side.teamId}-${cat.id}`"
              class="throne-cell"
              :class="cellClass(side.ranks[cat.id])"
              :title="`${cat.name}: #${side.ranks[cat.id]}`"
            >
              <span class="throne-cell-label">{{ cat.label }}</span>
            </li>
          </ul>
        </article>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         4. THE BOARD — standings table
    ────────────────────────────────────────────────────────────── -->
    <section class="board" aria-labelledby="board-heading">
      <header class="section-head section-head-flex">
        <div>
          <p class="section-eyebrow section-eyebrow-magenta" id="board-heading">The Board</p>
          <h2 class="board-headline">Ten teams. One ladder.</h2>
          <p class="section-sub">Power score blends category record, dominance, balance, and forward outlook.</p>
        </div>
        <div class="board-actions">
          <button
            v-if="!liveData"
            type="button"
            class="board-customize"
            aria-label="Customize power ranking weights"
            @click="openCustomize"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Customize formula
          </button>
        </div>
      </header>

      <div class="board-wrap">
        <table class="board-table">
          <thead>
            <tr>
              <th scope="col" class="col-rank">Rk</th>
              <th scope="col" class="col-team">Team</th>
              <th scope="col" class="col-move">Move</th>
              <th scope="col" class="col-power">Power</th>
              <th scope="col" class="col-record">Cat W-L-T</th>
              <th scope="col" class="col-winpct">Win %</th>
              <th scope="col" class="col-finger">Owns / Bleeds</th>
              <th scope="col" class="col-last6">Last 6</th>
              <th scope="col" class="col-streak">Streak</th>
            </tr>
          </thead>
          <TransitionGroup tag="tbody" name="row-flip">
            <tr
              v-for="row in boardRows"
              :key="row.teamId"
              class="board-row"
              :class="{ 'is-my-team': lookupTeam(row.teamId).isMyTeam }"
              tabindex="0"
              role="button"
              :aria-label="`Open ${lookupTeam(row.teamId).name} detail`"
              @click="openDetail(row.teamId, $event)"
              @keydown.enter.prevent="openDetail(row.teamId, $event)"
              @keydown.space.prevent="openDetail(row.teamId, $event)"
            >
              <td class="col-rank">
                <span class="rank-chip" :class="rankChipClass(row.rank)" :aria-label="row.rank === 1 ? 'Rank 1, league leader' : `Rank ${row.rank}`">
                  <svg v-if="row.rank === 1" class="rank-chip-crown" width="14" height="11" viewBox="0 0 24 18" fill="currentColor" aria-hidden="true">
                    <path d="M2 2.4a1.4 1.4 0 1 1 2.45.92l2.6 4.04 3.6-4.62a1.5 1.5 0 1 1 2.7 0l3.6 4.62 2.6-4.04A1.4 1.4 0 1 1 22 2.4c0 .42-.18.8-.46 1.06L19.7 15.4H4.3L2.46 3.46A1.4 1.4 0 0 1 2 2.4ZM4.9 17h14.2v1H4.9v-1Z"/>
                  </svg>
                  <span v-else>{{ row.rank }}</span>
                </span>
              </td>
              <td class="col-team">
                <div class="team-cell">
                  <div
                    class="team-avatar"
                    :style="{ background: `linear-gradient(135deg, ${lookupTeam(row.teamId).avatarColor})` }"
                  >
                    <img
                      v-if="lookupTeam(row.teamId).avatarUrl"
                      :src="lookupTeam(row.teamId).avatarUrl"
                      class="avatar-image"
                      alt=""
                    />
                    <span v-else>{{ lookupTeam(row.teamId).ownerInitials }}</span>
                    <span v-if="lookupTeam(row.teamId).isMyTeam" class="team-star" aria-label="Your team" title="Your team">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <polygon points="12 2 15 9 22 9.5 16.5 14.5 18 22 12 18 6 22 7.5 14.5 2 9.5 9 9"/>
                      </svg>
                    </span>
                  </div>
                  <div class="team-name-block">
                    <p class="team-name">{{ lookupTeam(row.teamId).name }}</p>
                    <p class="team-desc">{{ lookupTeam(row.teamId).profileDescriptor }}</p>
                  </div>
                </div>
              </td>
              <td class="col-move">
                <span v-if="row.weekMove > 0" class="move-chip move-chip-up" :aria-label="`Up ${row.weekMove}`">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 15 12 9 18 15"/></svg>
                  {{ row.weekMove }}
                </span>
                <span v-else-if="row.weekMove < 0" class="move-chip move-chip-down" :aria-label="`Down ${Math.abs(row.weekMove)}`">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                  {{ Math.abs(row.weekMove) }}
                </span>
                <span v-else class="move-chip move-chip-flat" aria-label="Unchanged">
                  <span class="move-flat-dot" aria-hidden="true"></span>
                </span>
              </td>
              <td class="col-power">
                <div class="power-block">
                  <div class="power-bar" aria-hidden="true">
                    <span
                      class="power-bar-fill"
                      :style="{
                        transform: `scaleX(${row.powerScore / 100})`,
                        background: powerColor(row.powerScore),
                      }"
                    ></span>
                  </div>
                  <span class="power-num" :style="{ color: powerColor(row.powerScore) }">{{ row.powerScore.toFixed(1) }}</span>
                </div>
              </td>
              <td class="col-record">{{ row.standing.catWins }}-{{ row.standing.catLosses }}-{{ row.standing.catTies }}</td>
              <td class="col-winpct">
                <span :style="{ color: winPctColor(row.standing.winPct) }">{{ (row.standing.winPct * 100).toFixed(1) }}%</span>
              </td>
              <td class="col-finger">
                <ul class="finger-strip" role="list" :aria-label="`${lookupTeam(row.teamId).name} category fingerprint`">
                  <li
                    v-for="cat in displayCategories"
                    :key="`fp-${row.teamId}-${cat.id}`"
                    class="finger-cell"
                    :class="cellClass(catRanksFor(row.teamId)[cat.id])"
                    :title="`${cat.name}: #${catRanksFor(row.teamId)[cat.id]}`"
                  ></li>
                </ul>
                <p class="finger-meta">
                  <span class="finger-meta-own">Owns {{ row.standing.ownsCount }}</span>
                  <span class="finger-meta-sep" aria-hidden="true">·</span>
                  <span class="finger-meta-bleed">Bleeds {{ row.standing.bleedingCount }}</span>
                </p>
              </td>
              <td class="col-last6">
                <ul class="last6-dots" role="list" :aria-label="`Last 6 matchups: ${row.standing.lastSix.join(' ')}`">
                  <li
                    v-for="(r, i) in row.standing.lastSix"
                    :key="`l6-${row.teamId}-${i}`"
                    class="last6-dot"
                    :class="`last6-dot-${r.toLowerCase()}`"
                  ></li>
                </ul>
              </td>
              <td class="col-streak">
                <span
                  class="streak-chip"
                  :class="`streak-chip-${row.standing.streak.type.toLowerCase()}`"
                >{{ row.standing.streak.type }}{{ row.standing.streak.length }}</span>
              </td>
            </tr>
          </TransitionGroup>
        </table>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         4b. PULSE CHECK — heater + long fall + steadiest hand
         Sits between the Board and the existing Three Signals beats.
    ────────────────────────────────────────────────────────────── -->
    <section class="movement" aria-labelledby="movement-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta" id="movement-heading">Movement</p>
        <h2 class="movement-headline">Pulse check.</h2>
      </header>

      <div class="movement-layout">
        <!-- Card A: On a Heater (largest) -->
        <article class="heater-card" :aria-label="`On a heater: ${heaterTeam.name}`">
          <div class="heater-portrait">
            <span class="heater-portrait-glow" aria-hidden="true"></span>
            <div
              class="heater-portrait-frame"
              :style="{ background: `linear-gradient(135deg, ${heaterTeam.avatarColor})` }"
            >
              <img v-if="heaterTeam.avatarUrl" :src="heaterTeam.avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ heaterTeam.ownerInitials }}</span>
            </div>
          </div>
          <div class="heater-body">
            <p class="heater-eyebrow">{{ heaterCopy?.eyebrow || 'On a heater' }}</p>
            <p class="heater-team">{{ heaterTeam.name }}</p>
            <p class="heater-owner">{{ heaterTeam.ownerName }}</p>
            <div class="heater-streak" :aria-label="`${heaterStreakLabel} win streak`">
              <svg
                v-for="i in 3"
                :key="`heater-chev-${i}`"
                class="heater-chev"
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 15 12 9 18 15"/>
              </svg>
              <span class="heater-streak-label">{{ heaterStreakLabel }}</span>
            </div>
            <p class="heater-copy">{{ heaterCopy?.body || movementBeats.onHeater.body }}</p>
          </div>
        </article>

        <!-- Card B: Long Fall (compact with downward arc) -->
        <article class="fall-card" :aria-label="`Long fall: ${fallTeam.name}`">
          <p class="fall-eyebrow">{{ longFallCopy?.eyebrow || 'Long fall' }}</p>
          <div class="fall-head">
            <span
              class="fall-avatar"
              :style="{ background: `linear-gradient(135deg, ${fallTeam.avatarColor})` }"
            >
              <img v-if="fallTeam.avatarUrl" :src="fallTeam.avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ fallTeam.ownerInitials }}</span>
            </span>
            <div class="fall-id">
              <p class="fall-team">{{ fallTeam.name }}</p>
              <p class="fall-owner">{{ fallTeam.ownerName }}</p>
            </div>
          </div>
          <svg class="fall-spark" viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true">
            <path class="fall-spark-line" :d="fallSparkPath"/>
            <circle
              class="fall-spark-end"
              :cx="fallSparkEnd.x"
              :cy="fallSparkEnd.y"
              r="3.6"
            />
          </svg>
          <p class="fall-meta">
            <span class="fall-from">#{{ fallRanks.fromRank }}</span>
            <span class="fall-arrow" aria-hidden="true">to</span>
            <span class="fall-to">#{{ fallRanks.toRank }}</span>
            <span class="fall-since">since week 1</span>
          </p>
        </article>

        <!-- Card C: Steadiest Hand (text strip) -->
        <article class="steady-card" :aria-label="`Steadiest hand: ${steadyTeam.name}`">
          <p class="steady-eyebrow">{{ steadyCopy?.eyebrow || 'Steadiest hand' }}</p>
          <div class="steady-row">
            <span
              class="steady-avatar"
              :style="{ background: `linear-gradient(135deg, ${steadyTeam.avatarColor})` }"
            >
              <img v-if="steadyTeam.avatarUrl" :src="steadyTeam.avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ steadyTeam.ownerInitials }}</span>
            </span>
            <p class="steady-copy">
              <span class="steady-team">{{ steadyTeam.name }}</span>
              {{ steadyCopy?.body || `${movementBeats.steadiestHand.body}` }}
            </p>
          </div>
        </article>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         4c. EDITORIAL BEATS — three distinct shapes (Three Signals)
    ────────────────────────────────────────────────────────────── -->
    <section class="beats" aria-labelledby="beats-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta" id="beats-heading">This week's beats</p>
        <h2 class="beats-headline">Three signals to read.</h2>
      </header>

      <div class="beats-grid">
        <!-- THE KING — asymmetric, wide, logo bleeds off right -->
        <article class="beat beat-king" :aria-label="`The King: ${kingTeam.name}`" :style="{ '--team-accent': kingAccent }">
          <div class="beat-king-text">
            <p class="beat-eyebrow beat-eyebrow-up">{{ kingBeat.eyebrow }}</p>
            <h3 class="beat-headline">{{ kingBeat.headline }}</h3>
            <div class="beat-king-hero">
              <span class="beat-king-num">{{ kingBeat.weekCatRecord }}</span>
              <span class="beat-king-num-label">cats won this week</span>
            </div>
            <ul class="beat-cat-chips" role="list" v-if="kingBeat.cats">
              <li v-for="c in kingBeat.cats" :key="`king-cat-${c}`" class="beat-cat-chip beat-cat-chip-up">{{ c }}</li>
            </ul>
            <p class="beat-body">{{ kingBeat.body }}</p>
          </div>
          <div class="beat-king-portrait" aria-hidden="true">
            <span class="beat-king-glow"></span>
            <div
              class="beat-king-frame"
              :style="{ background: `linear-gradient(135deg, ${kingTeam.avatarColor})` }"
            >
              <img v-if="kingTeam.avatarUrl" :src="kingTeam.avatarUrl" class="avatar-image" alt="" />
              <span v-else class="beat-king-initials">{{ kingTeam.ownerInitials }}</span>
            </div>
          </div>
        </article>

        <!-- THE BLEEDER — narrower card, magenta tint, logo stamp top-left -->
        <article class="beat beat-bleeder" :aria-label="`The Bleeder: ${bleederTeam.name}`">
          <div class="beat-bleeder-stamp" aria-hidden="true">
            <div
              class="beat-bleeder-stamp-bg"
              :style="{ background: `linear-gradient(135deg, ${bleederTeam.avatarColor})` }"
            >
              <img v-if="bleederTeam.avatarUrl" :src="bleederTeam.avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ bleederTeam.ownerInitials }}</span>
            </div>
          </div>
          <p class="beat-eyebrow beat-eyebrow-down">{{ bleederBeat.eyebrow }}</p>
          <h3 class="beat-headline beat-headline-sm">{{ bleederBeat.headline }}</h3>
          <div class="beat-bleeder-hero">
            <span class="beat-bleeder-num">{{ bleederBeat.bleedStreak }}</span>
            <span class="beat-bleeder-num-label">weeks bleeding</span>
          </div>
          <ul class="beat-cat-chips" role="list" v-if="bleederBeat.cat">
            <li class="beat-cat-chip beat-cat-chip-down">{{ bleederBeat.cat }}</li>
          </ul>
          <p class="beat-body">{{ bleederBeat.body }}</p>
        </article>

        <!-- PROFILE SHIFT — full width below, teal-tinted, dual cat-chip visual -->
        <article class="beat beat-shift" :aria-label="`Identity shift: ${shiftTeam.name}`">
          <div class="beat-shift-id">
            <div
              class="beat-shift-avatar"
              :style="{ background: `linear-gradient(135deg, ${shiftTeam.avatarColor})` }"
            >
              <img v-if="shiftTeam.avatarUrl" :src="shiftTeam.avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ shiftTeam.ownerInitials }}</span>
            </div>
            <div>
              <p class="beat-eyebrow beat-eyebrow-teal">{{ shiftBeat.eyebrow }}</p>
              <h3 class="beat-headline beat-headline-sm">{{ shiftBeat.headline }}</h3>
            </div>
          </div>
          <div class="beat-shift-visual">
            <div class="beat-shift-side">
              <p class="beat-shift-side-label">{{ shiftBeat.fromProfile }}</p>
              <ul class="beat-cat-chips" role="list">
                <li v-for="c in shiftBeat.fromCats" :key="`from-${c}`" class="beat-cat-chip beat-cat-chip-fade">{{ c }}</li>
              </ul>
            </div>
            <div class="beat-shift-arrow" aria-hidden="true">
              <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 7h16M13 2l5 5-5 5"/>
              </svg>
              <span class="beat-shift-marker">{{ shiftBeat.monthMarker }}</span>
            </div>
            <div class="beat-shift-side">
              <p class="beat-shift-side-label">{{ shiftBeat.toProfile }}</p>
              <ul class="beat-cat-chips" role="list">
                <li v-for="c in shiftBeat.toCats" :key="`to-${c}`" class="beat-cat-chip beat-cat-chip-teal">{{ c }}</li>
              </ul>
            </div>
          </div>
          <p class="beat-body beat-body-shift">{{ shiftBeat.body }}</p>
        </article>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         5. QUICK READS — footer pills (live editorial)
    ────────────────────────────────────────────────────────────── -->
    <section class="quick" aria-labelledby="quick-heading">
      <h2 class="section-eyebrow section-eyebrow-mute" id="quick-heading">Quick reads</h2>
      <ul class="pills" role="list">
        <li
          v-for="pill in livePR.quickReads"
          :key="pill.label"
          class="pill"
        >
          <span class="pill-dot" :class="`pill-dot-${quickReadDotFor(pill.label)}`" aria-hidden="true"></span>
          <span class="pill-label">{{ formatPillLabel(pill.label) }}</span>
          <span class="pill-value">{{ pill.value }}</span>
        </li>
      </ul>
    </section>

    <!-- Modals -->
    <CategoryCustomizeRankingsModal v-if="customizeOpen" @close="closeCustomize" />
    <CategoryTeamDetailModal
      v-if="detailTeamId"
      :team-id="detailTeamId"
      @close="closeDetail"
      @open-signup="$emit('open-signup')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import {
  teams,
  categories,
  getTeam,
  catRanksFor,
  standings2026Week8,
  seasonRankHistory,
  currentWeek,
  headlineThisWeek,
  categoryBeats,
  heroMover,
  movementBeats,
  type CategoryStanding,
  type CategoryId,
} from '@/fixtures/categoriesLeague'
import { useDemoCategoryPowerRankings } from '@/composables/useDemoCategoryPowerRankings'
import CategoryCustomizeRankingsModal from '@/components/demo/CategoryCustomizeRankingsModal.vue'
import CategoryTeamDetailModal from '@/components/demo/CategoryTeamDetailModal.vue'
import { accentFor } from '@/utils/teamColor'
import { smoothPath, type Point } from '@/utils/svgPath'
import { renderPRPage, type RenderedPRCopy } from '@/editorial/render-pr'
import { categoriesFixtureToLeagueData } from '@/editorial/fixtureAdapter'
import { sleeperLeagueToCategoryData } from '@/editorial/adapters/sleeperAdapter'
import { espnLeagueToCategoryData } from '@/editorial/adapters/espnAdapter'
import { yahooLeagueToCategoryData } from '@/editorial/adapters/yahooAdapter'
import type { CategoryLeagueData } from '@/editorial/types'
import { usePlatformsStore } from '@/stores/platforms'
import LiveLoadError from '@/components/demo/LiveLoadError.vue'

defineEmits<{ (e: 'open-signup'): void }>()

const route = useRoute()

// Standings, teams, and season-rank history — prefer live data when a
// real league has been wired up, else fall back to the hand-authored
// fixture so the demo experience keeps working. Every downstream
// computed below reads from these (not the fixture imports directly)
// so toggling between fixture and live is a single source of truth.
const standings = computed(() =>
  liveData.value?.standings ?? standings2026Week8,
)
const displayTeams = computed(() =>
  liveData.value?.teams ?? teams,
)
const liveSeasonRankHistory = computed(() =>
  liveData.value?.seasonRankHistory ?? seasonRankHistory,
)
const displayCurrentWeek = computed(() =>
  liveData.value?.currentWeek ?? currentWeek,
)
const fixtureMyTeam = teams.find((t) => t.isMyTeam)!
const myTeam = computed(() => {
  const live = liveData.value?.teams.find((t) => t.isMyTeam)
  return live ?? fixtureMyTeam
})
const { liveRankings } = useDemoCategoryPowerRankings()

/* ─────────────────────────────────────────────────────────────────
   EDITORIAL — live copy from the detection + rendering pipeline.

   Source of truth:
   - Default: the hand-authored fixture (the demo experience).
   - When `?leagueId=…&platform=sleeper` is present in the URL:
     fetch live data via the matching adapter and re-render copy.
     The fixture render is kept as the synchronous initial value
     so the template never sees a null editorial during load.
───────────────────────────────────────────────────────────────── */
const liveData = shallowRef<CategoryLeagueData | null>(null)
const livePR = shallowRef<RenderedPRCopy>(
  renderPRPage(categoriesFixtureToLeagueData()),
)
const liveLoading = ref(false)
const liveError = ref<string | null>(null)
const liveLeagueId = computed(() => {
  const v = route.query.leagueId
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
})
const livePlatform = computed(() => {
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

onMounted(async () => {
  const id = liveLeagueId.value
  const platform = livePlatform.value
  if (!id || (platform !== 'sleeper' && platform !== 'espn' && platform !== 'yahoo')) {
    return  // fixture-only path
  }

  liveLoading.value = true
  liveError.value = null
  try {
    // See CategoryDemoHomeView for why we pass identity explicitly.
    const opts = { userIdentity: collectUserIdentity() }
    const data =
      platform === 'espn'
        ? await espnLeagueToCategoryData(id, opts)
        : platform === 'yahoo'
        ? await yahooLeagueToCategoryData(id, opts)
        : await sleeperLeagueToCategoryData(id, opts)
    liveData.value = data
    livePR.value = renderPRPage(data)
  } catch (err) {
    const platformLabel =
      platform === 'espn' ? 'ESPN' : platform === 'yahoo' ? 'Yahoo' : 'Sleeper'
    liveError.value = (err as Error).message || `Failed to load ${platformLabel} league data.`
  } finally {
    liveLoading.value = false
  }
})

/** See CategoryDemoHomeView.collectUserIdentity for the rationale. */
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

/** Look up a team by id — prefers liveData.teams, falls back to the
 *  fixture's `getTeam()` so existing call sites keep working when no
 *  leagueId is set. */
function lookupTeam(teamId: string) {
  const t = liveData.value?.teams.find((x) => x.id === teamId)
  if (t) return t
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

/* ─── Modals ───────────────────────────────────────────────────── */
const customizeOpen = ref(false)
const detailTeamId = ref<string | null>(null)
const lastClickedRowRef = ref<HTMLElement | null>(null)

function openCustomize() { customizeOpen.value = true }
function closeCustomize() { customizeOpen.value = false }
function openDetail(teamId: string, ev: Event) {
  detailTeamId.value = teamId
  const target = ev.currentTarget as HTMLElement | null
  if (target) lastClickedRowRef.value = target
}
function closeDetail() {
  detailTeamId.value = null
  lastClickedRowRef.value?.focus?.()
}

/* ─── Board rows ──────────────────────────────────────────────── */
interface BoardRow {
  teamId: string
  rank: number
  prevRank: number
  change: number
  weekMove: number // week-over-week rank delta from seasonRankHistory (positive = climbed)
  powerScore: number
  standing: CategoryStanding
}
// Week-over-week rank delta. Positive number = climbed (lower rank number this week).
const lastWeekRanks = computed<Record<string, number>>(() => {
  const hist = liveSeasonRankHistory.value
  return hist[hist.length - 2]?.ranks ?? {}
})
const thisWeekRanks = computed<Record<string, number>>(() => {
  const hist = liveSeasonRankHistory.value
  // Live ESPN data may not include the in-progress week in history yet
  // (buildSeasonRankHistory only writes weeks where every matchup is
  // decided). Fall back to current standings so the week-over-week move
  // chip still reflects the right ranks.
  const last = hist[hist.length - 1]?.ranks
  if (last && Object.keys(last).length > 0) return last
  const fallback: Record<string, number> = {}
  for (const s of standings.value) fallback[s.teamId] = s.rank
  return fallback
})
const boardRows = computed<BoardRow[]>(() => {
  const lwRanks = lastWeekRanks.value
  const twRanks = thisWeekRanks.value

  // Live path — the Customize composable is fixture-hardcoded
  // (`useDemoCategoryPowerRankings` imports the fixture `teams` +
  // `teamFactorScores`), so when the page is bound to a real league we
  // bypass it entirely. The board sorts by live category-win record
  // and proxies the power score as winPct × 100, which is a clean
  // first-pass score until we wire a real per-league multi-factor
  // model. Move chip still reads live week-over-week ranks.
  if (liveData.value) {
    const live = [...liveData.value.standings].sort((a, b) => a.rank - b.rank)
    return live.map((s) => {
      const lw = lwRanks[s.teamId]
      const tw = twRanks[s.teamId]
      const weekMove =
        typeof lw === 'number' && typeof tw === 'number' ? lw - tw : 0
      return {
        teamId: s.teamId,
        rank: s.rank,
        prevRank: typeof lw === 'number' ? lw : s.rank,
        change: typeof lw === 'number' ? lw - s.rank : 0,
        weekMove,
        powerScore: Math.round(s.winPct * 1000) / 10,
        standing: s as unknown as CategoryStanding,
      }
    })
  }

  // Fixture / demo path — keep the existing weighted-rankings flow so
  // the demo experience (and the Customize formula modal) behaves
  // exactly as before.
  const standingsList = standings.value
  return liveRankings.value.map((row) => {
    const s = standingsList.find((x) => x.teamId === row.teamId)
      ?? standings2026Week8.find((x) => x.teamId === row.teamId)!
    const lw = lwRanks[row.teamId]
    const tw = twRanks[row.teamId]
    const weekMove =
      typeof lw === 'number' && typeof tw === 'number' ? lw - tw : 0
    return {
      teamId: row.teamId,
      rank: row.rank,
      prevRank: row.prevRank,
      change: row.change,
      weekMove,
      powerScore: row.score,
      standing: s,
    }
  })
})

function rankChipClass(rank: number) {
  if (rank === 1) return 'rank-chip-gold'
  if (rank === 2) return 'rank-chip-silver'
  if (rank === 3) return 'rank-chip-bronze'
  return ''
}

function cellClass(rank: number) {
  if (rank <= 3) return 'cell-own'
  if (rank >= 8) return 'cell-bleed'
  return 'cell-mid'
}

function winPctColor(p: number) {
  if (p >= 0.60) return 'oklch(0.78 0.18 145)'
  if (p < 0.45)  return 'oklch(0.85 0.20 350)'
  return 'oklch(0.97 0.005 90)'
}
function powerColor(v: number) {
  if (v >= 65) return 'oklch(0.78 0.18 145)'
  if (v < 50)  return 'oklch(0.85 0.20 350)'
  return 'oklch(0.82 0.16 92)'
}

/* ─── Header context strip — rank-shape stats ────────────────── */
// Biggest jump: team with the largest positive delta from W1 to current week.
// Longest fall: team with the largest negative delta.
const seasonDeltas = computed(() => {
  const hist = liveSeasonRankHistory.value
  if (hist.length === 0) {
    // No history at all — derive a flat snapshot so downstream chips
    // still render without throwing.
    return displayTeams.value.map((t) => ({
      teamId: t.id,
      fromRank: 10,
      toRank: 10,
      delta: 0,
    }))
  }
  const first = hist[0].ranks
  const lastEntry = hist[hist.length - 1].ranks
  // Same fallback story as `thisWeekRanks`: end-of-history may not
  // include the in-progress week yet.
  let last: Record<string, number> = lastEntry
  if (Object.keys(last).length === 0) {
    last = {}
    for (const s of standings.value) last[s.teamId] = s.rank
  }
  return displayTeams.value.map((t) => ({
    teamId: t.id,
    fromRank: first[t.id] ?? 10,
    toRank: last[t.id] ?? 10,
    // delta: positive = climbed
    delta: (first[t.id] ?? 10) - (last[t.id] ?? 10),
  }))
})
const biggestJump = computed(() => {
  const sorted = [...seasonDeltas.value].sort((a, b) => b.delta - a.delta)
  const top = sorted[0]
  return { teamId: top.teamId, spots: top.delta, fromRank: top.fromRank, toRank: top.toRank }
})
const longestFall = computed(() => {
  const sorted = [...seasonDeltas.value].sort((a, b) => a.delta - b.delta)
  const bottom = sorted[0]
  return { teamId: bottom.teamId, fromRank: bottom.fromRank, toRank: bottom.toRank }
})

/* ─── Hero mover ─────────────────────────────────────────────── */
// Hero team: the renderer now surfaces `teamId` on the rendered hero
// copy, so we read it directly when present. Falls back to the fixture
// mover so the demo (no leagueId in URL) still works.
const heroMoverTeam = computed(() => {
  const id = livePR.value.hero.teamId
  if (id) return lookupTeam(id)
  return lookupTeam(heroMover.teamId)
})

// Editorial hero copy — live render when present, else fixture.
const heroMoverCopy = computed(() => livePR.value.hero)
const heroSpotsLabel = computed(
  () => heroMoverCopy.value.statChips[0]?.value ?? `+${heroMover.spots}`,
)
const heroStreakLabel = computed(
  () => heroMoverCopy.value.statChips[1]?.value ?? heroMover.streak,
)
const heroRecordLabel = computed(
  () => heroMoverCopy.value.statChips[2]?.value ?? heroMover.lastWeekRecord,
)

/* ─── Hero face-off data ─────────────────────────────────────── */
interface FaceoffSide {
  teamId: string
  ranks: Record<CategoryId, number>
  owns: number
  bleeds: number
}

// Look up a team's per-category ranks. Prefers live data (set by the
// adapter) and falls back to the fixture's `catRanksFor` helper, which
// only knows about the hand-authored teams.
function catRanksForTeam(teamId: string): Record<string, number> {
  const live = liveData.value?.categoryRanks.find((r) => r.teamId === teamId)
  if (live) return live.catRanks
  try {
    return catRanksFor(teamId) as unknown as Record<string, number>
  } catch {
    return {}
  }
}

const faceoffSides = computed<FaceoffSide[]>(() => {
  // Live: top 2 teams in the current standings — the team holding #1
  // now and whichever team it most recently passed (rank #2 is a
  // reasonable proxy when we don't have a "previous king" signal).
  // Fixture: keep the hand-authored protagonist / antagonist so the
  // "pitching side flipped" copy still matches the cells.
  let ids: string[]
  if (liveData.value) {
    const sorted = [...liveData.value.standings].sort((a, b) => a.rank - b.rank)
    ids = sorted.slice(0, 2).map((s) => s.teamId)
  } else {
    ids = [headlineThisWeek.protagonistTeamId, headlineThisWeek.antagonistTeamId]
  }
  // Categories list — prefer the live league's active cats so the
  // strip mirrors the user's league instead of the demo's 11-cat baseball.
  const activeCats = liveData.value?.categories ?? categories
  return ids.map((tid) => {
    const ranks = catRanksForTeam(tid) as Record<CategoryId, number>
    let owns = 0, bleeds = 0
    for (const c of activeCats) {
      const r = (ranks as Record<string, number>)[c.id]
      if (r == null) continue
      if (r <= 3) owns++
      else if (r >= 8) bleeds++
    }
    return { teamId: tid, ranks, owns, bleeds }
  })
})

// Active category list — live league's cats when present, else the
// fixture's 11-cat baseball. Used by the throne strip and the board's
// per-team finger strip.
const displayCategories = computed(() => liveData.value?.categories ?? categories)

/* ─── Trajectory bump chart ──────────────────────────────────── */
const CHART_W = 1000
const CHART_H = 360
const X_MARGIN = 40
const Y_MARGIN = 28
const weekCount = computed(() => Math.max(2, liveSeasonRankHistory.value.length))
const RANK_COUNT = 10
const ENDPOINT_INSET = 22
const endpointX = CHART_W - X_MARGIN

// Feature: top 3, my team, and the dynasty-falling team (defending champ
// who's slid since the start). When live data is on, find the latter by
// the biggest negative season-delta so the highlight stays meaningful.
const fallingTeamId = computed<string | undefined>(() => {
  const sorted = [...seasonDeltas.value].sort((a, b) => a.delta - b.delta)
  return sorted[0]?.teamId
})
const featuredIds = computed<string[]>(() => {
  const top3 = standings.value.slice(0, 3).map((s) => s.teamId)
  const ids = new Set<string>([...top3, myTeam.value.id])
  const falling = fallingTeamId.value
  if (falling) ids.add(falling)
  return [...ids]
})
function isFeatured(id: string) {
  return featuredIds.value.includes(id)
}
const featuredTeams = computed(() =>
  displayTeams.value
    .filter((t) => isFeatured(t.id))
    .sort((a, b) => currentRank(a.id) - currentRank(b.id)),
)
const fadedTeams = computed(() =>
  displayTeams.value
    .filter((t) => !isFeatured(t.id))
    .sort((a, b) => currentRank(a.id) - currentRank(b.id)),
)

const myTeamRankNow = computed(() => currentRank(myTeam.value.id))
const trajectoryAriaLabel = computed(
  () =>
    `Power ranking trajectory for ${displayTeams.value.length} teams across ${weekCount.value} weeks. ${myTeam.value.name} is currently number ${myTeamRankNow.value}.`,
)

function weekX(week: number) {
  const idx = week - 1
  const usableW = CHART_W - X_MARGIN * 2 - ENDPOINT_INSET
  return X_MARGIN + (idx / (weekCount.value - 1)) * usableW
}
function rankY(rank: number) {
  const idx = rank - 1
  const span = CHART_H - Y_MARGIN * 2
  return Y_MARGIN + (idx / (RANK_COUNT - 1)) * span
}
function currentRank(teamId: string) {
  // Prefer the in-progress standings (live ESPN exposes this even when
  // the week has no history entry yet), then the latest history snapshot.
  const fromStandings = standings.value.find((s) => s.teamId === teamId)?.rank
  if (fromStandings != null) return fromStandings
  const hist = liveSeasonRankHistory.value
  const lastWk = hist[hist.length - 1]
  return lastWk?.ranks[teamId] ?? 10
}
function lineColorFor(teamId: string) {
  if (teamId === myTeam.value.id) return 'oklch(0.78 0.18 92)'
  return accentFor(lookupTeam(teamId))
}
function pathForTeam(teamId: string) {
  const points: Point[] = liveSeasonRankHistory.value.map((w) => ({
    x: weekX(w.week),
    y: rankY(w.ranks[teamId] ?? 10),
  }))
  return smoothPath(points)
}

/* ─── Editorial beats — fixture-driven visual data, live editorial copy ─── */
const fxKingBeat = computed(() => categoryBeats.find((b) => b.kind === 'king')!)
const fxBleederBeat = computed(() => categoryBeats.find((b) => b.kind === 'bleeder')!)
const fxShiftBeat = computed(() => categoryBeats.find((b) => b.kind === 'profile-shift')!)

// "Three Signals" copy: prefer the live PR dynasties; fallback to fixture beats.
// Mapping: kingBeat = hittingKing, bleederBeat = puntKings, shiftBeat = pitchingKing.
// (The cards keep their fixture-driven sub-data — cats, weekCatRecord, bleedStreak,
//  fromProfile/toProfile — because those are not part of the dynasty render shape.)
const kingBeat = computed(() => {
  const live = livePR.value.dynasties.hittingKing
  if (live) {
    return { ...fxKingBeat.value, eyebrow: live.eyebrow, headline: live.headline, body: live.body }
  }
  return fxKingBeat.value
})
const bleederBeat = computed(() => {
  const live = livePR.value.dynasties.puntKings
  if (live) {
    return { ...fxBleederBeat.value, eyebrow: live.eyebrow, headline: live.headline, body: live.body }
  }
  return fxBleederBeat.value
})
const shiftBeat = computed(() => {
  const live = livePR.value.dynasties.pitchingKing
  if (live) {
    return { ...fxShiftBeat.value, eyebrow: live.eyebrow, headline: live.headline, body: live.body }
  }
  return fxShiftBeat.value
})

// Dynasty team avatars — prefer the team detected by the render
// pipeline (so the avatar matches the live headline), fall back to
// the fixture beat's teamId when no live signal fired.
const kingTeam = computed(() => {
  const id = livePR.value.dynasties.hittingKing?.teamId
  if (id) return lookupTeam(id)
  return lookupTeam(kingBeat.value.teamId)
})
const bleederTeam = computed(() => {
  const id = livePR.value.dynasties.puntKings?.teamId
  if (id) return lookupTeam(id)
  return lookupTeam(bleederBeat.value.teamId)
})
const shiftTeam = computed(() => {
  const id = livePR.value.dynasties.pitchingKing?.teamId
  if (id) return lookupTeam(id)
  return lookupTeam(shiftBeat.value.teamId)
})
const kingAccent = computed(() => accentFor(kingTeam.value))

/* ─── Pulse Check data ────────────────────────────────────────── */
// Each pulse card pairs a team avatar with editorial copy. The render
// pipeline now surfaces `teamId` on each rendered beat, so we prefer
// that and fall back to the fixture's `movementBeats` only when no
// live beat fired (demo path, or a quiet league where the heater /
// long-fall detectors found nothing).
const heaterTeam = computed(() => {
  const id = livePR.value.pulse.heater?.teamId
  if (id) return lookupTeam(id)
  return lookupTeam(movementBeats.onHeater.teamId)
})
const fallTeam = computed(() => {
  const id = livePR.value.pulse.longFall?.teamId
  if (id) return lookupTeam(id)
  return lookupTeam(movementBeats.longFall.teamId)
})
const steadyTeam = computed(() => {
  const id = livePR.value.pulse.steadyHand?.teamId
  if (id) return lookupTeam(id)
  return lookupTeam(movementBeats.steadiestHand.teamId)
})

/* ─── Heater streak label — prefer the live streak from the render
   pipeline's `pulse.heater` headline; fall back to fixture. The
   library doesn't surface a structured streak field, so we read the
   headline for the canonical "W3" / "W5" / "W7" token; defensively
   fall back if it's missing. ─────────────────────────────────────── */
const heaterStreakLabel = computed(() => {
  const headline = livePR.value.pulse.heater?.headline
  if (headline) {
    // Match a "W{n}" token; the editorial library uses this
    // consistently across heater variants.
    const m = headline.match(/W\d+/)
    if (m) return m[0]
  }
  return movementBeats.onHeater.streak
})

// Long-fall rank movement — prefer the live trajectory's
// first→last delta when available, else fall back to fixture.
const fallRanks = computed(() => {
  const traj = livePR.value.pulse.longFall?.trajectory
  if (traj && traj.length >= 2) {
    return { fromRank: traj[0], toRank: traj[traj.length - 1] }
  }
  return {
    fromRank: movementBeats.longFall.fromRank,
    toRank: movementBeats.longFall.toRank,
  }
})

// Live pulse editorial copy (eyebrow / headline / body / trajectory).
const heaterCopy = computed(() => livePR.value.pulse.heater)
const longFallCopy = computed(() => livePR.value.pulse.longFall)
const steadyCopy = computed(() => livePR.value.pulse.steadyHand)

// Fall sparkline — uses live trajectory when present, else fixture.
const FALL_W = 200
const FALL_H = 80
const fallSparkPoints = computed(() => {
  const ranks = longFallCopy.value?.trajectory?.length
    ? longFallCopy.value.trajectory
    : movementBeats.longFall.trajectory
  const padX = 6
  const padY = 8
  if (ranks.length === 0) return []
  return ranks.map((r, i) => ({
    x: padX + (i / Math.max(1, ranks.length - 1)) * (FALL_W - padX * 2),
    y: padY + ((r - 1) / (RANK_COUNT - 1)) * (FALL_H - padY * 2),
  }))
})
const fallSparkPath = computed(() => {
  const pts = fallSparkPoints.value
  if (!pts.length) return ''
  let d = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const dx = (curr.x - prev.x) / 3
    d += ` C ${(prev.x + dx).toFixed(2)},${prev.y.toFixed(2)} ${(curr.x - dx).toFixed(2)},${curr.y.toFixed(2)} ${curr.x.toFixed(2)},${curr.y.toFixed(2)}`
  }
  return d
})
const fallSparkEnd = computed(() => {
  const pts = fallSparkPoints.value
  return pts[pts.length - 1] ?? { x: 0, y: 0 }
})

/* ─── Quick-read pill formatting (matches Home pattern) ────────── */
function quickReadDotFor(label: string): 'up' | 'teal' | 'secondary' | 'mute' {
  switch (label) {
    case 'TIGHTEST RACE':   return 'up'
    case 'BIGGEST JUMP':    return 'up'
    case 'LONGEST FALL':    return 'secondary'
    case 'LONGEST STREAK':  return 'teal'
    default:                return 'mute'
  }
}
function formatPillLabel(label: string): string {
  if (!label) return ''
  return label.charAt(0) + label.slice(1).toLowerCase()
}
</script>

<style scoped>
/* Tokens (--ink-N, --accent-*) inherited from .demo-shell in CategoryDemoLayout. */
.cat-rankings {
  display: flex;
  flex-direction: column;
  gap: 64px;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}

/* ─── Live-data load + error banner (mirrors Home view) ───────── */
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
.live-banner-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 4px; overflow: hidden; flex-shrink: 0;
}
.live-banner-mark-img { width: 100%; height: 100%; display: block; }
@media (prefers-reduced-motion: no-preference) {
  @keyframes live-pulse {
    0%, 100% { opacity: 0.55; transform: scale(0.96); }
    50%      { opacity: 1;    transform: scale(1.02); }
  }
  .live-banner-mark { animation: live-pulse 1.6s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
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
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-2);
  margin: 0 0 4px;
}
.section-eyebrow-teal { color: var(--accent-tertiary); }
.section-eyebrow-magenta { color: var(--accent-secondary); }
.section-eyebrow-mute { color: var(--ink-3); }
.section-sub {
  font-size: 0.86rem;
  color: var(--ink-3);
  margin: 0;
  max-width: 65ch;
  line-height: 1.5;
}

/* ─── 1. PAGE HEADER ─────────────────────────────────────────── */
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  flex-wrap: wrap;
  padding-top: 4px;
}
.page-head-copy { max-width: 60ch; }
.page-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
  margin: 0 0 12px;
}
.page-eyebrow-bar {
  width: 24px;
  height: 1px;
  background: var(--accent-tertiary);
}
.page-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.25rem, 5vw, 3.4rem);
  line-height: 0.94;
  letter-spacing: -0.012em;
  color: var(--ink-1);
  margin: 0 0 10px;
}
.page-sub {
  font-size: 1.02rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 0;
  max-width: 62ch;
}
.page-context {
  list-style: none;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.page-context-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.page-context-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
}
.page-context-num-accent { color: var(--accent-secondary); }
.page-context-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.page-context-sep {
  width: 1px;
  height: 14px;
  background: var(--ink-5);
  display: inline-block;
}

@media (max-width: 720px) {
  .page-head { flex-direction: column; align-items: flex-start; gap: 16px; }
  .page-context { gap: 12px; }
}

/* ─── HERO — Biggest Mover of the Week ───────────────────────── */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 48px;
  align-items: center;
  padding: 8px 0 16px;
  position: relative;
}
.hero::before {
  content: '';
  position: absolute;
  inset: -20px -20px -20px -20px;
  background:
    radial-gradient(ellipse 60% 70% at 22% 50%, oklch(0.70 0.27 350 / 0.12), transparent 70%),
    radial-gradient(ellipse 40% 50% at 80% 50%, oklch(0.72 0.18 195 / 0.05), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.hero > * { position: relative; z-index: 1; }

.hero-portrait {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1 / 1;
  max-width: 320px;
  width: 100%;
  margin: 0 auto;
}
.hero-portrait-glow {
  position: absolute;
  inset: 6%;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, oklch(0.78 0.18 92 / 0.22), transparent 65%);
  filter: blur(18px);
  pointer-events: none;
}
.hero-portrait-frame {
  position: relative;
  width: 88%;
  height: 88%;
  border-radius: 36px;
  overflow: hidden;
  display: grid;
  place-items: center;
  box-shadow:
    0 24px 60px -28px oklch(0 0 0 / 0.85),
    inset 0 1px 0 oklch(1 0 0 / 0.08);
}
.hero-portrait-image { border-radius: inherit; }
.hero-portrait-initials {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(4rem, 10vw, 7rem);
  letter-spacing: 0.02em;
  color: oklch(0.12 0.012 90);
}
.hero-portrait-sheen {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 28% 22%, oklch(1 0 0 / 0.16), transparent 50%);
  pointer-events: none;
}

.hero-copy { min-width: 0; }
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
  margin: 0 0 14px;
}
.hero-eyebrow-bar {
  width: 24px;
  height: 1px;
  background: var(--accent-secondary);
}
.hero-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.4rem, 5.6vw, 3.8rem);
  line-height: 0.96;
  letter-spacing: -0.012em;
  color: var(--ink-1);
  margin: 0 0 18px;
  max-width: 22ch;
}
.hero-body {
  font-size: 1.02rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0 0 24px;
  max-width: 48ch;
}

.hero-stats {
  list-style: none;
  padding: 0;
  margin: 0 0 28px;
  display: flex;
  align-items: flex-end;
  gap: 28px;
  flex-wrap: wrap;
}
.hero-stat {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
}
.hero-stat-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 3.5vw, 2.6rem);
  line-height: 0.95;
  letter-spacing: -0.012em;
  font-variant-numeric: tabular-nums;
}
.hero-stat-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.hero-stat-primary .hero-stat-num { color: oklch(0.86 0.16 145); }      /* +spots = green up */
.hero-stat-tertiary .hero-stat-num { color: var(--accent-tertiary); }   /* streak = teal */
.hero-stat-leader .hero-stat-num { color: var(--accent-primary); }      /* last-week record = yellow leader */

.hero-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.hero-share {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-1);
  background: transparent;
  border: 1px solid oklch(0.32 0.015 90);
  padding: 10px 18px;
  border-radius: 999px;
  cursor: pointer;
  transition: color 180ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
              background-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: no-preference) {
  .hero-share:hover {
    color: var(--ink-1);
    border-color: oklch(0.50 0.015 90);
    background: oklch(0.14 0.015 90);
  }
}
.hero-share:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.hero-share:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
.hero-actions-meta {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
}

@media (max-width: 880px) {
  .hero { grid-template-columns: 1fr; gap: 24px; }
  .hero-portrait { max-width: 240px; }
}

/* ─── THRONE — demoted fingerprint comparison strip ──────────── */
.throne-caption {
  margin: 4px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--ink-2);
  letter-spacing: 0.01em;
}
.throne-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.throne-row {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 18px;
  align-items: center;
  padding: 12px 16px;
  border-radius: 12px;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
}
.throne-row-protagonist {
  border-color: oklch(0.74 0.18 145 / 0.30);
  box-shadow: inset 4px 0 0 0 oklch(0.74 0.18 145);
}
.throne-row-antagonist {
  border-color: oklch(0.70 0.27 350 / 0.30);
  box-shadow: inset 4px 0 0 0 oklch(0.70 0.27 350);
  filter: saturate(0.9);
}
.throne-id {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.throne-avatar {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  flex-shrink: 0;
  overflow: hidden;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  color: oklch(0.12 0.012 90);
}
.throne-text { min-width: 0; }
.throne-name {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  color: var(--ink-1);
  letter-spacing: 0.005em;
}
.throne-meta {
  margin: 2px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.throne-meta strong { color: var(--ink-1); font-weight: 900; font-variant-numeric: tabular-nums; }
.throne-owns strong { color: oklch(0.86 0.16 145); }
.throne-bleeds strong { color: oklch(0.85 0.20 350); }
.throne-sep { color: var(--ink-5); }
.throne-strip {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(11, minmax(0, 1fr));
  gap: 3px;
}
.throne-cell {
  aspect-ratio: 1.6 / 1;
  border-radius: 3px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.62rem;
  letter-spacing: 0.02em;
  color: oklch(0.10 0.015 90);
  background: oklch(0.18 0.015 90);
}
.throne-cell.cell-own {
  background: oklch(0.74 0.18 145 / 0.85);
  color: oklch(0.12 0.07 145);
}
.throne-cell.cell-bleed {
  background: oklch(0.70 0.27 350 / 0.75);
  color: oklch(0.12 0.05 350);
}
.throne-cell.cell-mid {
  background: oklch(0.22 0.015 90);
  color: var(--ink-3);
}
.throne-cell-label { line-height: 1; }
@media (max-width: 720px) {
  .throne-row { grid-template-columns: 1fr; gap: 10px; }
}

/* ─── TRAJECTORY (bump chart) ─────────────────────────────────── */
.trajectory-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.75rem, 3.2vw, 2.25rem);
  line-height: 1.0;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 6px 0 6px;
}
.trajectory-chart-wrap {
  background:
    radial-gradient(ellipse at top right, oklch(0.72 0.18 195 / 0.06), transparent 65%),
    oklch(0.10 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 18px;
  padding: 26px 30px 16px;
  position: relative;
}
.trajectory-chart {
  width: 100%;
  height: 360px;
  display: block;
  overflow: visible;
}
.trajectory-grid line {
  stroke: oklch(0.97 0.005 90 / 0.05);
  stroke-width: 1;
  stroke-dasharray: 2 4;
}
.trajectory-line {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.92;
  vector-effect: non-scaling-stroke;
}
.trajectory-line-fade {
  opacity: 0.13;
  stroke-width: 1.2;
}
.trajectory-line-mine {
  stroke-width: 2.6;
  opacity: 1;
  filter: drop-shadow(0 0 5px oklch(0.78 0.18 92 / 0.55));
}
.trajectory-endpoint { transition: opacity 200ms cubic-bezier(0.22, 1, 0.36, 1); }
.trajectory-endpoint-faded { opacity: 0.38; }
.trajectory-endpoint-mine {
  filter: drop-shadow(0 0 6px oklch(0.78 0.18 92 / 0.55));
}
.trajectory-anno-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  fill: oklch(0.85 0.20 350);
}
.trajectory-weeks {
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  padding-left: calc(40px * 100% / 1000);
  padding-right: calc((40px + 22px) * 100% / 1000);
}
.trajectory-weeks li {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.trajectory-legend {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  align-items: center;
}
.trajectory-legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 5px;
  border-radius: 999px;
  background: oklch(0.11 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-2);
}
.trajectory-legend-pill-mine {
  border-color: oklch(0.78 0.18 92 / 0.55);
  background: oklch(0.78 0.18 92 / 0.06);
  color: var(--ink-1);
  box-shadow: 0 0 0 1px oklch(0.78 0.18 92 / 0.25);
}
.trajectory-legend-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.66rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.trajectory-legend-note {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-4);
  margin-left: 4px;
}
@media (max-width: 720px) {
  .trajectory-chart-wrap { padding: 16px 14px 10px; }
  .trajectory-chart { height: 240px; }
  .trajectory-weeks li { font-size: 0.6rem; letter-spacing: 0.06em; }
}

/* ─── EDITORIAL BEATS ──────────────────────────────────────────── */
.beats-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.75rem, 3.2vw, 2.25rem);
  line-height: 1.0;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 6px 0 6px;
}
.beats-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
  grid-template-areas:
    'king bleeder'
    'shift shift';
  gap: 14px;
}
.beat-king { grid-area: king; }
.beat-bleeder { grid-area: bleeder; }
.beat-shift { grid-area: shift; }
@media (max-width: 880px) {
  .beats-grid { grid-template-columns: 1fr; grid-template-areas: 'king' 'bleeder' 'shift'; }
}

.beat-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin: 0 0 8px;
}
.beat-eyebrow-up { color: oklch(0.86 0.16 145); }
.beat-eyebrow-down { color: var(--accent-secondary); }
.beat-eyebrow-teal { color: var(--accent-tertiary); }

.beat-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.6rem;
  line-height: 1.05;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0 0 16px;
  max-width: 22ch;
}
.beat-headline-sm {
  font-size: 1.25rem;
  margin-bottom: 12px;
}
.beat-body {
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 14px 0 0;
  max-width: 48ch;
}

/* THE KING */
.beat-king {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.8fr);
  gap: 16px;
  align-items: center;
  padding: 24px 24px 24px 28px;
  background:
    radial-gradient(ellipse at 85% 50%, oklch(0.74 0.18 145 / 0.12), transparent 60%),
    oklch(0.11 0.015 90);
  border: 1px solid oklch(0.74 0.18 145 / 0.30);
  border-radius: 18px;
  overflow: hidden;
}
.beat-king-text { min-width: 0; }
.beat-king-hero {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.beat-king-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.6rem, 5vw, 3.6rem);
  line-height: 0.9;
  letter-spacing: -0.012em;
  color: oklch(0.86 0.16 145);
  font-variant-numeric: tabular-nums;
}
.beat-king-num-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.74rem;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.beat-king-portrait {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: 200px;
  margin-right: -36px;  /* logo bleeds off right edge */
  justify-self: end;
}
.beat-king-glow {
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, oklch(0.74 0.18 145 / 0.40), transparent 60%);
  filter: blur(18px);
  pointer-events: none;
}
.beat-king-frame {
  position: relative;
  width: 88%;
  height: 88%;
  border-radius: 28px;
  overflow: hidden;
  display: grid;
  place-items: center;
  box-shadow: 0 18px 48px -20px oklch(0 0 0 / 0.7);
}
.beat-king-initials {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 3rem;
  color: oklch(0.12 0.012 90);
}
@media (max-width: 880px) {
  .beat-king-portrait { margin-right: -20px; max-width: 140px; }
}

/* THE BLEEDER */
.beat-bleeder {
  position: relative;
  padding: 22px 22px 22px 22px;
  background:
    radial-gradient(ellipse at 12% 0%, oklch(0.70 0.27 350 / 0.16), transparent 55%),
    oklch(0.11 0.015 90);
  border: 1px solid oklch(0.70 0.27 350 / 0.30);
  border-radius: 18px;
  display: flex;
  flex-direction: column;
}
.beat-bleeder-stamp {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 36px;
  height: 36px;
}
.beat-bleeder-stamp-bg {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.78rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  opacity: 0.55;
  filter: saturate(0.5);
}
.beat-bleeder-hero {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  margin: 4px 0 10px;
}
.beat-bleeder-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.4rem, 4.4vw, 3rem);
  line-height: 0.9;
  letter-spacing: -0.012em;
  color: var(--accent-secondary);
  font-variant-numeric: tabular-nums;
}
.beat-bleeder-num-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
}

/* PROFILE SHIFT */
.beat-shift {
  padding: 24px 28px;
  background:
    radial-gradient(ellipse at 50% 0%, oklch(0.72 0.18 195 / 0.08), transparent 60%),
    oklch(0.11 0.015 90);
  border: 1px solid oklch(0.72 0.18 195 / 0.30);
  border-radius: 18px;
  display: grid;
  gap: 18px;
}
.beat-shift-id {
  display: flex;
  align-items: center;
  gap: 14px;
}
.beat-shift-avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0;
}
.beat-shift-visual {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 18px;
  padding: 14px 16px;
  border-radius: 12px;
  background: oklch(0.08 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
}
.beat-shift-side { min-width: 0; }
.beat-shift-side-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 8px;
}
.beat-shift-arrow {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: var(--accent-tertiary);
}
.beat-shift-marker {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-4);
  white-space: nowrap;
}
.beat-body-shift { margin-top: 0; max-width: 62ch; }
@media (max-width: 560px) {
  .beat-shift-visual { grid-template-columns: 1fr; gap: 12px; }
  .beat-shift-arrow { transform: rotate(90deg); }
}

/* Cat chips (shared by beats) */
.beat-cat-chips {
  list-style: none;
  padding: 0;
  margin: 0;
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
}
.beat-cat-chip {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: 6px;
  background: oklch(0.18 0.015 90);
  color: var(--ink-2);
}
.beat-cat-chip-up {
  background: oklch(0.74 0.18 145 / 0.18);
  color: oklch(0.86 0.16 145);
}
.beat-cat-chip-down {
  background: oklch(0.70 0.27 350 / 0.16);
  color: oklch(0.85 0.20 350);
}
.beat-cat-chip-teal {
  background: oklch(0.72 0.18 195 / 0.16);
  color: oklch(0.88 0.14 195);
}
.beat-cat-chip-fade {
  background: oklch(0.16 0.015 90);
  color: var(--ink-4);
}

/* ─── BOARD TABLE ─────────────────────────────────────────────── */
.board-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.75rem, 3.2vw, 2.25rem);
  line-height: 1.0;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 6px 0 6px;
}
.board-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.board-customize {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
  background: transparent;
  border: 1px solid oklch(0.72 0.18 195 / 0.40);
  padding: 7px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.board-customize:hover {
  color: oklch(0.92 0.14 195);
  border-color: oklch(0.72 0.18 195 / 0.70);
}
.board-customize:active { transform: scale(0.97); transition-duration: 100ms; }
.board-customize:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

.board-wrap {
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 16px;
  overflow: hidden;
}
.board-table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
.board-table thead th {
  text-align: left;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  padding: 14px 16px;
  background: oklch(0.08 0.014 90);
  border-bottom: 1px solid oklch(0.18 0.015 90);
}
.board-table tbody tr {
  border-bottom: 1px solid oklch(0.14 0.018 90);
  transition: background-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.board-table tbody tr:last-child { border-bottom: none; }
.board-table tbody tr:hover { background: oklch(0.12 0.015 90); }
.board-table tbody td {
  padding: 14px 16px;
  font-size: 0.92rem;
  color: var(--ink-2);
  vertical-align: middle;
}
.board-table tr.is-my-team { background: oklch(0.78 0.18 92 / 0.06); }
.board-table tr.is-my-team:hover { background: oklch(0.78 0.18 92 / 0.10); }

.col-rank { width: 56px; }
.rank-chip {
  display: inline-grid;
  place-items: center;
  width: 32px; height: 32px;
  border-radius: 10px;
  background: oklch(0.16 0.015 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.96rem;
  color: var(--ink-2);
}
.rank-chip-gold {
  background: oklch(0.78 0.18 92 / 0.18);
  color: oklch(0.78 0.18 92);
  box-shadow: inset 0 0 0 1px oklch(0.78 0.18 92 / 0.45);
}
.rank-chip-silver {
  background: oklch(0.70 0.02 90 / 0.18);
  color: oklch(0.92 0.01 90);
  box-shadow: inset 0 0 0 1px oklch(0.70 0.02 90 / 0.35);
}
.rank-chip-bronze {
  background: oklch(0.55 0.10 50 / 0.20);
  color: oklch(0.85 0.09 60);
  box-shadow: inset 0 0 0 1px oklch(0.55 0.10 50 / 0.35);
}
.rank-chip-crown {
  /* SVG path inherits currentColor from .rank-chip-gold (yellow leader) */
  display: block;
}

/* MOVE column — week-over-week rank delta pill */
.col-move { width: 84px; }
.move-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  padding: 4px 10px;
  border-radius: 999px;
  min-height: 24px;
  line-height: 1;
}
.move-chip-up {
  background: oklch(0.72 0.18 145 / 0.16);
  color: oklch(0.86 0.16 145);
}
.move-chip-down {
  background: oklch(0.65 0.20 25 / 0.16);
  color: oklch(0.78 0.20 25);
}
.move-chip-flat {
  background: transparent;
  color: var(--ink-4);
  border: 1px solid oklch(0.24 0.015 90);
  padding: 3px 10px;
}
.move-flat-dot {
  display: inline-block;
  width: 8px; height: 2px;
  border-radius: 1px;
  background: currentColor;
}

.col-team { min-width: 220px; }
.team-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.team-avatar {
  position: relative;
  width: 40px; height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.84rem;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0;
  overflow: visible;
}
.team-avatar > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: inherit;
}
.team-star {
  position: absolute;
  bottom: -3px;
  right: -3px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: oklch(0.10 0.015 90);
  display: grid;
  place-items: center;
  color: oklch(0.78 0.18 92);
  border: 1px solid oklch(0.78 0.18 92);
}
.team-name {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.01em;
  color: var(--ink-1);
}
.team-desc {
  margin: 1px 0 0;
  font-size: 0.72rem;
  color: var(--ink-4);
}

.col-record {
  width: 110px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.96rem;
  color: var(--ink-1);
}
.col-winpct {
  width: 90px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1rem;
}

.col-finger { width: 200px; }
.finger-strip {
  list-style: none;
  padding: 0;
  margin: 0 0 4px;
  display: grid;
  grid-template-columns: repeat(11, 1fr);
  gap: 2px;
}
.finger-cell {
  width: 100%;
  height: 8px;
  border-radius: 2px;
}
.finger-cell.cell-own { background: oklch(0.74 0.18 145 / 0.78); }
.finger-cell.cell-bleed { background: oklch(0.70 0.27 350 / 0.70); }
.finger-cell.cell-mid { background: oklch(0.22 0.015 90); }
.finger-meta {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.finger-meta-own { color: oklch(0.86 0.16 145); }
.finger-meta-bleed { color: oklch(0.85 0.20 350); }
.finger-meta-sep { color: var(--ink-5); }

.col-last6 { width: 86px; }
.last6-dots {
  list-style: none;
  padding: 0;
  margin: 0;
  display: inline-flex;
  gap: 3px;
}
.last6-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.last6-dot-w { background: oklch(0.74 0.18 145); }
.last6-dot-l { background: oklch(0.70 0.27 350); }
.last6-dot-t { background: oklch(0.42 0.012 90); }

.col-streak { width: 72px; }
.streak-chip {
  display: inline-grid;
  place-items: center;
  min-width: 36px;
  padding: 3px 8px;
  border-radius: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
}
.streak-chip-w {
  background: oklch(0.74 0.18 145 / 0.16);
  color: oklch(0.86 0.16 145);
}
.streak-chip-l {
  background: oklch(0.70 0.27 350 / 0.16);
  color: oklch(0.85 0.20 350);
}
.streak-chip-t {
  background: oklch(0.18 0.015 90);
  color: var(--ink-3);
}

.col-power { width: 140px; }
.power-block {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.power-bar {
  position: relative;
  flex: 1 1 auto;
  height: 6px;
  border-radius: 999px;
  background: oklch(0.18 0.015 90);
  overflow: hidden;
}
.power-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  transform-origin: left center;
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: reduce) {
  .power-bar-fill { transition: none; }
}
.power-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  min-width: 3ch;
  text-align: right;
}

/* Clickable rows */
.board-row { cursor: pointer; }
.board-row:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: -2px;
}
.board-row:active { transform: scale(0.997); transition-duration: 100ms; }

/* FLIP row reordering */
.row-flip-move { transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1); }
@media (prefers-reduced-motion: reduce) {
  .row-flip-move { transition: none; }
}

@media (max-width: 960px) {
  .col-finger, th.col-finger { display: none; }
}
@media (max-width: 720px) {
  .board-table thead th { padding: 12px 10px; font-size: 0.62rem; }
  .board-table tbody td { padding: 10px; font-size: 0.86rem; }
  .col-last6, th.col-last6 { display: none; }
  .col-move, th.col-move { display: none; }
  .team-desc { display: none; }
  .col-team { min-width: 160px; }
}

/* ─── QUICK PILLS ─────────────────────────────────────────────── */
.pills {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  align-items: center;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.84rem;
  line-height: 1.3;
  color: var(--ink-2);
}
.pill-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pill-dot-up { background: oklch(0.74 0.18 145); }
.pill-dot-secondary { background: var(--accent-secondary); }
.pill-dot-teal { background: var(--accent-tertiary); }
.pill-dot-mute { background: oklch(0.45 0.015 90); }
.pill-label {
  color: var(--ink-3);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.72rem;
}
.pill-value {
  color: var(--ink-1);
  font-weight: 600;
}

/* ─── PULSE CHECK ─────────────────────────────────────────────── */
.movement-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.75rem, 3.2vw, 2.25rem);
  line-height: 1.0;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 6px 0 6px;
}
.movement-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  grid-template-areas:
    'heater fall'
    'steady steady';
  gap: 14px;
  align-items: stretch;
}
.heater-card { grid-area: heater; }
.fall-card { grid-area: fall; }
.steady-card { grid-area: steady; }

@media (max-width: 760px) {
  .movement-layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      'heater'
      'fall'
      'steady';
  }
}

/* Card A: On a heater */
.heater-card {
  position: relative;
  background:
    radial-gradient(ellipse at 12% 50%, oklch(0.74 0.18 145 / 0.10), transparent 60%),
    oklch(0.11 0.015 90);
  border: 1px solid oklch(0.74 0.18 145 / 0.30);
  border-radius: 18px;
  padding: 24px 26px 26px;
  display: grid;
  grid-template-columns: 132px 1fr;
  gap: 24px;
  align-items: center;
  overflow: hidden;
}
.heater-portrait {
  position: relative;
  width: 132px;
  height: 132px;
}
.heater-portrait-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 35% 35%, oklch(0.74 0.18 145 / 0.40), transparent 65%);
  filter: blur(14px);
}
.heater-portrait-frame {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 24px;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.4rem;
  color: oklch(0.12 0.012 90);
  box-shadow: 0 14px 40px -20px oklch(0 0 0 / 0.7);
}
.heater-body { min-width: 0; }
.heater-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: oklch(0.86 0.16 145);
  margin: 0 0 8px;
}
.heater-team {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.6rem;
  line-height: 1.0;
  color: var(--ink-1);
}
.heater-owner {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: var(--ink-3);
}
.heater-streak {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: 12px;
  padding: 5px 11px;
  border-radius: 999px;
  background: oklch(0.74 0.18 145 / 0.16);
  color: oklch(0.86 0.16 145);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
}
.heater-chev { color: oklch(0.86 0.16 145); }
.heater-streak-label { margin-left: 6px; }
.heater-copy {
  margin: 14px 0 0;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--ink-2);
  max-width: 42ch;
}

/* Card B: Long fall */
.fall-card {
  background: oklch(0.11 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 18px;
  padding: 20px 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fall-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 0;
}
.fall-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.fall-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  color: oklch(0.12 0.012 90);
  opacity: 0.65;
  filter: saturate(0.7);
  overflow: hidden;
}
.fall-id { min-width: 0; }
.fall-team {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--ink-2);
}
.fall-owner {
  margin: 1px 0 0;
  font-size: 0.74rem;
  color: var(--ink-3);
}
.fall-spark {
  width: 100%;
  height: 80px;
  display: block;
  overflow: visible;
  margin-top: 4px;
}
.fall-spark-line {
  fill: none;
  stroke: oklch(0.85 0.20 350);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  filter: drop-shadow(0 0 5px oklch(0.70 0.27 350 / 0.4));
}
.fall-spark-end {
  fill: oklch(0.85 0.20 350);
  stroke: oklch(0.10 0.015 90);
  stroke-width: 1.4;
}
.fall-meta {
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  letter-spacing: 0.02em;
  flex-wrap: wrap;
}
.fall-from, .fall-to {
  font-weight: 900;
  font-size: 1.5rem;
  color: var(--ink-1);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.fall-to { color: var(--accent-secondary); }
.fall-arrow {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.fall-since {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-left: 4px;
}

/* Card C: Steadiest hand */
.steady-card {
  background: oklch(0.10 0.015 90);
  border: 1px dashed oklch(0.24 0.015 90);
  border-radius: 14px;
  padding: 14px 18px;
}
.steady-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 8px;
}
.steady-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.steady-avatar {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.72rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.steady-copy {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--ink-2);
}
.steady-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  color: var(--ink-1);
  letter-spacing: 0.01em;
  margin-right: 4px;
}

/* ─── Shared avatar image fill ────────────────────────────────── */
.avatar-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  border-radius: inherit;
}
</style>

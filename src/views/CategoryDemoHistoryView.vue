<template>
  <div class="cathist">
    <!-- ─────────────────────────────────────────────────────────────
         LIVE LOAD STATUS — only renders when a leagueId is in the
         URL and the live adapter is fetching or has errored. The
         underlying editorial keeps a fixture-derived render as its
         initial value, so the page remains visually populated.
    ────────────────────────────────────────────────────────────── -->
    <div v-if="liveLoading" class="live-banner live-banner-loading" role="status" aria-live="polite">
      <span class="live-banner-mark" aria-hidden="true">
        <img src="/tlb-favicon.png" alt="" class="live-banner-mark-img" />
      </span>
      Loading your league from {{ platformLabel }}. Hang tight.
    </div>
    <LiveLoadError v-else-if="liveError" :message="liveError" />
    <div
      v-else-if="liveData && displaySeasonCount <= 1"
      class="live-banner live-banner-info"
      role="status"
    >
      Season one, in progress. The record book opens when the first champion is crowned.
    </div>

    <!-- ─────────────────────────────────────────────────────────────
         SECTION 1 — PAGE HEAD
    ────────────────────────────────────────────────────────────── -->
    <header class="page-head" aria-labelledby="page-headline">
      <div class="page-head-copy">
        <p class="page-eyebrow">
          <span class="page-eyebrow-bar" aria-hidden="true"></span>
          League history
        </p>
        <h1 id="page-headline" class="page-headline">{{ pageHeadline }}</h1>
        <p class="page-sub">Champions, rivalries, and the record book.</p>
      </div>
      <ul class="page-context" role="list">
        <li class="page-context-pill"><span class="page-context-num">{{ pageContext.seasons }}</span><span class="page-context-lbl">Seasons</span></li>
        <li class="page-context-pill"><span class="page-context-num">{{ pageContext.champions }}</span><span class="page-context-lbl">Champions</span></li>
        <li class="page-context-pill"><span class="page-context-num">{{ pageContext.teamsCount }}</span><span class="page-context-lbl">Teams</span></li>
      </ul>
    </header>

    <!-- ─────────────────────────────────────────────────────────────
         SECTION 2 — HALL OF CHAMPIONS
    ────────────────────────────────────────────────────────────── -->
    <section class="champs" aria-labelledby="champs-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-gold" id="champs-heading">Hall of champions</p>
        <h2 class="section-headline">{{ trophiesHeadline }}</h2>
      </header>

      <div class="champs-rail" role="list">
        <!-- Current, undecided season — the live "chase" card. -->
        <article
          v-if="currentSeasonCard"
          class="champ-card champ-card-live"
          role="listitem"
          :aria-label="`${currentSeasonCard.year} season in progress, ${getTeam(currentSeasonCard.leaderId).name} leads`"
        >
          <p class="champ-year">{{ currentSeasonCard.year }}</p>
          <p class="champ-era champ-era-live">In progress</p>

          <div
            class="champ-avatar"
            :style="{ background: `linear-gradient(135deg, ${getTeam(currentSeasonCard.leaderId).avatarColor})` }"
          >
            <img v-if="getTeam(currentSeasonCard.leaderId).avatarUrl" :src="getTeam(currentSeasonCard.leaderId).avatarUrl" class="champ-avatar-img" alt="" />
            <span v-else>{{ getTeam(currentSeasonCard.leaderId).ownerInitials }}</span>
          </div>

          <p class="champ-team">{{ getTeam(currentSeasonCard.leaderId).name }}</p>
          <p class="champ-score">Leads the chase through Week {{ currentSeasonCard.week }}.</p>

          <footer class="champ-foot">
            <p class="champ-foot-row">
              <span class="champ-foot-lbl">Chasing</span>
              <span class="champ-foot-val">{{ getTeam(currentSeasonCard.secondId).name }}</span>
            </p>
            <p class="champ-foot-row">
              <span class="champ-foot-lbl">Crown</span>
              <span class="champ-foot-val">Undecided</span>
            </p>
          </footer>
        </article>

        <article
          v-for="rec in seasonsNewestFirst"
          :key="rec.year"
          class="champ-card"
          role="listitem"
          :aria-label="`${rec.year} champion ${champInfo(rec).name}`"
        >
          <p class="champ-year">{{ rec.year }}</p>
          <p class="champ-era">{{ champEra(rec) }}</p>

          <div
            class="champ-avatar"
            :style="{ background: `linear-gradient(135deg, ${champInfo(rec).color})` }"
          >
            <img v-if="champInfo(rec).logo" :src="champInfo(rec).logo" class="champ-avatar-img" alt="" />
            <span v-else>{{ champInfo(rec).initials }}</span>
          </div>

          <p class="champ-team">{{ champInfo(rec).name }}</p>
          <p class="champ-score">{{ champLine(rec) }}</p>

          <footer class="champ-foot">
            <p class="champ-foot-row">
              <span class="champ-foot-lbl">Runner-up</span>
              <span class="champ-foot-val">{{ runnerUpInfo(rec).name }}</span>
            </p>
            <p class="champ-foot-row">
              <span class="champ-foot-lbl">Basement</span>
              <span class="champ-foot-val">{{ basementInfo(rec).name }}</span>
            </p>
          </footer>
        </article>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         SECTION 3 — ALL-TIME LEGACY
    ────────────────────────────────────────────────────────────── -->
    <section class="legacy" aria-labelledby="legacy-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="legacy-heading">All-time legacy</p>
        <h2 class="section-headline">Who's the best to ever do it.</h2>
        <p class="legacy-context">{{ legacyManagerCount }} managers across {{ displaySeasonCount }} seasons.</p>
        <p class="legacy-formula">{{ legacyFormulaLabel }}</p>
      </header>

      <div class="podium" role="list">
        <!-- #2 -->
        <component
          :is="legacyInteractive ? 'button' : 'div'"
          v-if="podium[1]"
          :type="legacyInteractive ? 'button' : undefined"
          class="podium-card podium-2"
          :class="{ 'is-static': !legacyInteractive, 'podium-card-me': podium[1].isMyTeam }"
          role="listitem"
          @click="onLegacyClick(podium[1])"
          :style="{ '--podium-accent': accentOfEntry(podium[1]) } as any"
          :aria-label="`Rank 2 ${podium[1].name}, ${podium[1].score} legacy`"
        >
          <span class="podium-rank-badge">#2</span>
          <div
            class="podium-avatar podium-avatar-2"
            :style="{ background: `linear-gradient(135deg, ${podium[1].avatarColor})` }"
          >
            <img v-if="podium[1].logoUrl" :src="podium[1].logoUrl" class="podium-avatar-img" alt="" />
            <span v-else>{{ podium[1].ownerInitials }}</span>
          </div>
          <p class="podium-score podium-score-2">{{ podium[1].score }}</p>
          <p class="podium-team">{{ podium[1].name }}</p>
          <p class="podium-seasons">{{ podium[1].seasonsPlayed }} season{{ podium[1].seasonsPlayed === 1 ? '' : 's' }}</p>
          <ul class="podium-badges" role="list">
            <li v-if="podium[1].titles > 0" class="podium-badge podium-badge-gold">{{ podium[1].titles }} title{{ podium[1].titles === 1 ? '' : 's' }}</li>
            <li v-if="podium[1].playoffApps > 0" class="podium-badge">{{ playoffWord(podium[1].playoffApps) }}</li>
            <li class="podium-badge">{{ podium[1].totalCatWins }} cat wins</li>
          </ul>
        </component>

        <!-- #1 -->
        <component
          :is="legacyInteractive ? 'button' : 'div'"
          v-if="podium[0]"
          :type="legacyInteractive ? 'button' : undefined"
          class="podium-card podium-1"
          :class="{ 'is-static': !legacyInteractive, 'podium-card-me': podium[0].isMyTeam }"
          role="listitem"
          @click="onLegacyClick(podium[0])"
          :style="{ '--podium-accent': accentOfEntry(podium[0]) } as any"
          :aria-label="`Rank 1 ${podium[0].name}, ${podium[0].score} legacy`"
        >
          <span class="podium-rank-badge podium-rank-1">#1</span>
          <div
            class="podium-avatar podium-avatar-1"
            :style="{ background: `linear-gradient(135deg, ${podium[0].avatarColor})` }"
          >
            <img v-if="podium[0].logoUrl" :src="podium[0].logoUrl" class="podium-avatar-img" alt="" />
            <span v-else>{{ podium[0].ownerInitials }}</span>
          </div>
          <p class="podium-score podium-score-1">{{ podium[0].score }}</p>
          <p class="podium-team">{{ podium[0].name }}</p>
          <p class="podium-seasons">{{ podium[0].seasonsPlayed }} season{{ podium[0].seasonsPlayed === 1 ? '' : 's' }}</p>
          <ul class="podium-badges" role="list">
            <li v-if="podium[0].titles > 0" class="podium-badge podium-badge-gold">{{ podium[0].titles }} title{{ podium[0].titles === 1 ? '' : 's' }}</li>
            <li v-if="podium[0].playoffApps > 0" class="podium-badge">{{ playoffWord(podium[0].playoffApps) }}</li>
            <li class="podium-badge">{{ podium[0].totalCatWins }} cat wins</li>
          </ul>
          <p class="podium-1-sub">{{ podiumLede(podium[0]) }}</p>
        </component>

        <!-- #3 -->
        <component
          :is="legacyInteractive ? 'button' : 'div'"
          v-if="podium[2]"
          :type="legacyInteractive ? 'button' : undefined"
          class="podium-card podium-3"
          :class="{ 'is-static': !legacyInteractive, 'podium-card-me': podium[2].isMyTeam }"
          role="listitem"
          @click="onLegacyClick(podium[2])"
          :style="{ '--podium-accent': accentOfEntry(podium[2]) } as any"
          :aria-label="`Rank 3 ${podium[2].name}, ${podium[2].score} legacy`"
        >
          <span class="podium-rank-badge">#3</span>
          <div
            class="podium-avatar podium-avatar-3"
            :style="{ background: `linear-gradient(135deg, ${podium[2].avatarColor})` }"
          >
            <img v-if="podium[2].logoUrl" :src="podium[2].logoUrl" class="podium-avatar-img" alt="" />
            <span v-else>{{ podium[2].ownerInitials }}</span>
          </div>
          <p class="podium-score podium-score-3">{{ podium[2].score }}</p>
          <p class="podium-team">{{ podium[2].name }}</p>
          <p class="podium-seasons">{{ podium[2].seasonsPlayed }} season{{ podium[2].seasonsPlayed === 1 ? '' : 's' }}</p>
          <ul class="podium-badges" role="list">
            <li v-if="podium[2].titles > 0" class="podium-badge podium-badge-gold">{{ podium[2].titles }} title{{ podium[2].titles === 1 ? '' : 's' }}</li>
            <li v-if="podium[2].playoffApps > 0" class="podium-badge">{{ playoffWord(podium[2].playoffApps) }}</li>
            <li class="podium-badge">{{ podium[2].totalCatWins }} cat wins</li>
          </ul>
        </component>
      </div>

      <div class="legacy-rows-head" aria-hidden="true">
        <span>The rest of the field</span>
        <span class="legacy-rows-head-score">Legacy</span>
      </div>

      <ol class="legacy-rows" role="list">
        <li v-for="entry in legacyTail" :key="entry.teamId || entry.name" role="listitem">
          <component
            :is="legacyInteractive ? 'button' : 'div'"
            :type="legacyInteractive ? 'button' : undefined"
            class="legacy-row"
            @click="onLegacyClick(entry)"
            :class="{ 'legacy-row-me': entry.isMyTeam, 'is-static': !legacyInteractive }"
            :aria-label="`Rank ${entry.rank} ${entry.name}, ${entry.score} legacy`"
          >
            <span class="legacy-rank">{{ entry.rank }}</span>
            <span class="legacy-mepin" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"/></svg>
            </span>
            <div
              class="legacy-avatar"
              :style="{ background: `linear-gradient(135deg, ${entry.avatarColor})` }"
            >
              <img v-if="entry.logoUrl" :src="entry.logoUrl" class="legacy-avatar-img" alt="" />
              <span v-else>{{ entry.ownerInitials }}</span>
            </div>
            <div class="legacy-meta">
              <p class="legacy-team">{{ entry.name }}</p>
              <p class="legacy-seasons">{{ entry.seasonsPlayed }} season{{ entry.seasonsPlayed === 1 ? '' : 's' }}</p>
            </div>
            <ul class="legacy-badges" role="list">
              <li v-if="entry.titles > 0" class="legacy-badge legacy-badge-gold">{{ entry.titles }} title{{ entry.titles > 1 ? 's' : '' }}</li>
              <li v-if="entry.playoffApps > 0" class="legacy-badge">{{ playoffWord(entry.playoffApps) }}</li>
              <li class="legacy-badge">{{ entry.totalCatWins }} cat wins</li>
            </ul>
            <span class="legacy-score">{{ entry.score }}</span>
          </component>
        </li>
      </ol>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         SECTION 4 — ACROSS THE YEARS (trend chart)
    ────────────────────────────────────────────────────────────── -->
    <section class="trends" aria-labelledby="trends-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="trends-heading">Across the years</p>
        <h2 class="section-headline">When the empires rose.</h2>
        <p class="section-sub">Top three plus your team are highlighted. Rest are dimmed for focus.</p>
      </header>

      <div class="trends-chart-wrap">
        <svg
          class="trends-chart"
          :viewBox="`0 0 ${TX_W} ${TX_H}`"
          preserveAspectRatio="none"
          role="img"
          aria-label="Cumulative legacy score per team across seasons 2021 through 2026"
        >
          <g class="trends-grid">
            <line v-for="g in gridLines" :key="`g-${g.v}`"
              :x1="0" :y1="g.y" :x2="TX_W" :y2="g.y" />
          </g>
          <g class="trends-xticks">
            <text v-for="(y, i) in trendYears" :key="`yr-${y}`"
              :x="xFor(i)" :y="TX_H - 6"
              text-anchor="middle">{{ y }}</text>
          </g>

          <!-- Annotation marker: 2024 dynasty begins -->
          <g class="trends-annotation" v-if="ctTrendValueAt2024 != null">
            <line
              :x1="xFor(3)" :y1="yFor(ctTrendValueAt2024)"
              :x2="xFor(3)" :y2="yFor(ctTrendValueAt2024) - 28"
              stroke="oklch(0.84 0.16 90 / 0.6)"
              stroke-width="1"
              stroke-dasharray="2 3"
            />
            <text
              :x="xFor(3)" :y="yFor(ctTrendValueAt2024) - 34"
              text-anchor="middle"
              fill="oklch(0.84 0.16 90)"
              class="trends-annot-text"
            >2024 · Dynasty begins</text>
          </g>

          <!-- Lines -->
          <g
            v-for="row in legacyTrend"
            :key="`line-${row.teamId}`"
            :class="['trends-line-group', getTeam(row.teamId).isMyTeam ? 'is-me' : '', isFeatured(row.teamId) ? 'is-featured' : 'is-dim']"
          >
            <path
              :d="pathFor(row.cumulative)"
              :stroke="getTeam(row.teamId).isMyTeam ? 'oklch(0.84 0.16 90)' : accentOf(row.teamId)"
              :stroke-width="getTeam(row.teamId).isMyTeam ? 2.6 : 1.6"
              fill="none"
              stroke-linejoin="round"
              stroke-linecap="round"
              :style="getTeam(row.teamId).isMyTeam ? 'filter: drop-shadow(0 0 4px oklch(0.84 0.16 90 / 0.55))' : ''"
            />
            <circle
              :cx="xFor(row.cumulative.length - 1)"
              :cy="yFor(row.cumulative[row.cumulative.length - 1])"
              :r="getTeam(row.teamId).isMyTeam ? 5 : 3.5"
              :fill="getTeam(row.teamId).isMyTeam ? 'oklch(0.84 0.16 90)' : accentOf(row.teamId)"
            />
          </g>

          <!-- Right-edge labels (only for featured teams, staggered) -->
          <g class="trends-endlabels">
            <text v-for="lbl in endpointLabels" :key="`lbl-${lbl.teamId}`"
              :x="lbl.x" :y="lbl.y"
              :fill="getTeam(lbl.teamId).isMyTeam ? 'oklch(0.84 0.16 90)' : accentOf(lbl.teamId)"
            >{{ getTeam(lbl.teamId).name.split(' ')[0] }}</text>
          </g>
        </svg>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         SECTION 5 — ALL-TIME SERIES (H2H matrix)
    ────────────────────────────────────────────────────────────── -->
    <section class="h2h" aria-labelledby="h2h-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="h2h-heading">All-time series</p>
        <h2 class="section-headline">Who owns who.</h2>
        <p class="section-sub">Read horizontally. Each row shows that team's record against opponents.</p>
      </header>

      <div class="h2h-matrix-wrap">
        <table class="h2h-matrix" role="table" aria-label="All-time head-to-head matrix">
          <thead>
            <tr>
              <th scope="col" class="h2h-corner" aria-label="Team"></th>
              <th
                v-for="cid in teamIds"
                :key="`col-${cid}`"
                scope="col"
                class="h2h-col-head"
              >
                <div
                  class="h2h-col-avatar"
                  :style="{ background: `linear-gradient(135deg, ${getTeam(cid).avatarColor})` }"
                  :title="getTeam(cid).name"
                >
                  <img v-if="getTeam(cid).avatarUrl" :src="getTeam(cid).avatarUrl" class="h2h-col-avatar-img" alt="" />
                  <span v-else>{{ getTeam(cid).ownerInitials }}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="rid in teamIds"
              :key="`row-${rid}`"
              :class="getTeam(rid).isMyTeam ? 'h2h-row-me' : ''"
            >
              <th scope="row" class="h2h-row-head">
                <div
                  class="h2h-row-avatar"
                  :style="{ background: `linear-gradient(135deg, ${getTeam(rid).avatarColor})` }"
                >
                  <img v-if="getTeam(rid).avatarUrl" :src="getTeam(rid).avatarUrl" class="h2h-row-avatar-img" alt="" />
                  <span v-else>{{ getTeam(rid).ownerInitials }}</span>
                </div>
                <span class="h2h-row-name">{{ getTeam(rid).name }}</span>
              </th>
              <td
                v-for="cid in teamIds"
                :key="`cell-${rid}-${cid}`"
                class="h2h-cell"
                :class="cellClass(rid, cid)"
              >
                <span v-if="rid === cid" class="h2h-cell-self" aria-hidden="true">—</span>
                <button
                  v-else
                  type="button"
                  class="h2h-cell-btn"
                  :style="{ '--cell-tint': cellTint(rid, cid) } as any"
                  :aria-label="`${getTeam(rid).name} vs ${getTeam(cid).name}: ${cellRecord(rid, cid)}, ${cellDiffLabel(rid, cid)}`"
                  @click="openRivalryModal(rid, cid)"
                >
                  <span class="h2h-cell-rec">{{ cellRecord(rid, cid) }}</span>
                  <span class="h2h-cell-diff">{{ cellDiffLabel(rid, cid) }}</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         SECTION 6 — THE CATEGORY DYNASTIES (category-specific)
    ────────────────────────────────────────────────────────────── -->
    <section class="dynasties" aria-labelledby="dynasties-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="dynasties-heading">The dynasties</p>
        <h2 class="section-headline">Six years, eleven cats, one ladder.</h2>
      </header>

      <div class="dyn-grid">
        <!-- Hitting king — wider, green-tinted, logo larger -->
        <article class="dyn-card dyn-hitting" aria-labelledby="dyn-hit">
          <p class="dyn-eyebrow" id="dyn-hit">{{ hittingBeat.eyebrow }}</p>
          <div class="dyn-body">
            <div
              class="dyn-avatar dyn-avatar-lg"
              :style="{ background: `linear-gradient(135deg, ${getTeam(hittingBeat.teamId).avatarColor})` }"
            >
              <img v-if="getTeam(hittingBeat.teamId).avatarUrl" :src="getTeam(hittingBeat.teamId).avatarUrl" class="dyn-avatar-img" alt="" />
              <span v-else>{{ getTeam(hittingBeat.teamId).ownerInitials }}</span>
            </div>
            <div class="dyn-text">
              <h3 class="dyn-headline">{{ hittingBeat.headline }}</h3>
              <p class="dyn-prose">{{ hittingBeat.body }}</p>
              <div class="dyn-foot">
                <ul class="dyn-cats" role="list">
                  <li v-for="c in hittingBeat.cats" :key="c" class="dyn-cat-chip dyn-cat-chip-hit">{{ c }}</li>
                </ul>
                <p class="dyn-stat">
                  <span class="dyn-stat-num">{{ hittingBeat.catWinTotal }}</span>
                  <span class="dyn-stat-lbl">hitting cats won</span>
                </p>
              </div>
            </div>
          </div>
        </article>

        <!-- Pitching king — narrower, teal-tinted, logo smaller -->
        <article class="dyn-card dyn-pitching" aria-labelledby="dyn-pit">
          <p class="dyn-eyebrow" id="dyn-pit">{{ pitchingBeat.eyebrow }}</p>
          <div
            class="dyn-avatar"
            :style="{ background: `linear-gradient(135deg, ${getTeam(pitchingBeat.teamId).avatarColor})` }"
          >
            <img v-if="getTeam(pitchingBeat.teamId).avatarUrl" :src="getTeam(pitchingBeat.teamId).avatarUrl" class="dyn-avatar-img" alt="" />
            <span v-else>{{ getTeam(pitchingBeat.teamId).ownerInitials }}</span>
          </div>
          <h3 class="dyn-headline">{{ pitchingBeat.headline }}</h3>
          <p class="dyn-prose">{{ pitchingBeat.body }}</p>
          <div class="dyn-foot">
            <ul class="dyn-cats" role="list">
              <li v-for="c in pitchingBeat.cats" :key="c" class="dyn-cat-chip dyn-cat-chip-pit">{{ c }}</li>
            </ul>
            <p class="dyn-stat">
              <span class="dyn-stat-num">{{ pitchingBeat.catWinTotal }}</span>
              <span class="dyn-stat-lbl">pitching cats won</span>
            </p>
          </div>
        </article>

        <!-- Punt kings — full-width, magenta border, asymmetric layout -->
        <article class="dyn-card dyn-punt" aria-labelledby="dyn-punt">
          <div class="dyn-punt-side">
            <p class="dyn-eyebrow dyn-eyebrow-punt" id="dyn-punt">{{ puntBeat.eyebrow }}</p>
            <h3 class="dyn-headline">{{ puntBeat.headline }}</h3>
            <p class="dyn-prose">{{ puntBeat.body }}</p>
          </div>
          <div class="dyn-punt-meta">
            <div
              class="dyn-avatar dyn-avatar-md"
              :style="{ background: `linear-gradient(135deg, ${getTeam(puntBeat.teamId).avatarColor})` }"
            >
              <img v-if="getTeam(puntBeat.teamId).avatarUrl" :src="getTeam(puntBeat.teamId).avatarUrl" class="dyn-avatar-img" alt="" />
              <span v-else>{{ getTeam(puntBeat.teamId).ownerInitials }}</span>
            </div>
            <p class="dyn-mega">
              <span class="dyn-mega-num">{{ puntBeat.puntStreak }}</span>
              <span class="dyn-mega-lbl">seasons</span>
            </p>
            <p class="dyn-mega-trail">Punted {{ puntBeat.puntedCat }}</p>
          </div>
        </article>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         SECTION 7 — THE RECORD BOOK (Hall of Fame / Shame)
    ────────────────────────────────────────────────────────────── -->
    <section class="awards" aria-labelledby="awards-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta" id="awards-heading">The record book</p>
        <h2 class="section-headline">Hall of Fame. Hall of Shame.</h2>
      </header>

      <div class="awards-filters" role="tablist" aria-label="Award scope">
        <button
          type="button"
          class="awards-filter"
          :class="{ 'awards-filter-active': activeAwardScope === 'all-time' }"
          role="tab"
          :aria-selected="activeAwardScope === 'all-time'"
          @click="activeAwardScope = 'all-time'"
        >All-time</button>
        <button
          type="button"
          class="awards-filter"
          :class="{ 'awards-filter-active': activeAwardScope === 'season' }"
          role="tab"
          :aria-selected="activeAwardScope === 'season'"
          @click="activeAwardScope = 'season'"
        >Season</button>
      </div>

      <div
        v-if="activeAwardScope === 'season'"
        class="awards-years"
        role="tablist"
        aria-label="Season year"
      >
        <span class="awards-years-label">Year</span>
        <button
          v-for="year in availableSeasons"
          :key="year"
          type="button"
          class="awards-year"
          :class="{ 'awards-year-active': selectedSeason === year }"
          role="tab"
          :aria-selected="selectedSeason === year"
          @click="selectedSeason = year"
        >{{ year }}</button>
      </div>

      <!-- HALL OF FAME -->
      <h3 class="awards-sub awards-sub-fame">Hall of Fame</h3>
      <div class="fame-grid">
        <button type="button" class="fame-a"
          @click="onRecordClick(fameEntries[0])"
          :aria-label="`${fameEntries[0].eyebrow}: ${getTeam(fameEntries[0].teamId).name} ${fameEntries[0].value}`">
          <span class="fame-a-eyebrow">{{ fameEntries[0].eyebrow }}</span>
          <div class="fame-a-body">
            <div class="fame-a-id">
              <div class="fame-a-avatar" :style="{ background: `linear-gradient(135deg, ${getTeam(fameEntries[0].teamId).avatarColor})` }">
                <img v-if="getTeam(fameEntries[0].teamId).avatarUrl" :src="getTeam(fameEntries[0].teamId).avatarUrl" alt="" />
                <span v-else>{{ getTeam(fameEntries[0].teamId).ownerInitials }}</span>
              </div>
              <div class="fame-a-id-text">
                <p class="fame-a-team">{{ getTeam(fameEntries[0].teamId).name }}</p>
                <p class="fame-a-when">{{ fameEntries[0].metric }}</p>
              </div>
            </div>
            <p class="fame-a-value">{{ fameEntries[0].value }}</p>
          </div>
          <p v-if="fameEntries[0].context" class="fame-a-trail">{{ fameEntries[0].context }}</p>
        </button>

        <button type="button" class="fame-b"
          @click="onRecordClick(fameEntries[1])"
          :aria-label="`${fameEntries[1].eyebrow}: ${getTeam(fameEntries[1].teamId).name} ${fameEntries[1].value}`">
          <span class="fame-tile-eyebrow">{{ fameEntries[1].eyebrow }}</span>
          <div class="fame-b-mid">
            <div class="fame-b-avatar" :style="{ background: `linear-gradient(135deg, ${getTeam(fameEntries[1].teamId).avatarColor})` }">
              <img v-if="getTeam(fameEntries[1].teamId).avatarUrl" :src="getTeam(fameEntries[1].teamId).avatarUrl" alt="" />
              <span v-else>{{ getTeam(fameEntries[1].teamId).ownerInitials }}</span>
            </div>
            <p class="fame-b-team">{{ getTeam(fameEntries[1].teamId).name }}</p>
          </div>
          <p class="fame-b-value">{{ fameEntries[1].value }}</p>
          <p class="fame-b-sub">{{ fameEntries[1].metric }}</p>
        </button>

        <button type="button" class="fame-c"
          @click="onRecordClick(fameEntries[2])"
          :aria-label="`${fameEntries[2].eyebrow}: ${getTeam(fameEntries[2].teamId).name} ${fameEntries[2].value}`">
          <span class="fame-tile-eyebrow">{{ fameEntries[2].eyebrow }}</span>
          <div class="fame-c-row">
            <p class="fame-c-value">{{ fameEntries[2].value }}</p>
            <div class="fame-c-id">
              <div class="fame-c-avatar" :style="{ background: `linear-gradient(135deg, ${getTeam(fameEntries[2].teamId).avatarColor})` }">
                <img v-if="getTeam(fameEntries[2].teamId).avatarUrl" :src="getTeam(fameEntries[2].teamId).avatarUrl" alt="" />
                <span v-else>{{ getTeam(fameEntries[2].teamId).ownerInitials }}</span>
              </div>
              <p class="fame-c-team">{{ getTeam(fameEntries[2].teamId).name }}</p>
            </div>
          </div>
          <p v-if="fameEntries[2].context" class="fame-c-sub">{{ fameEntries[2].context }}</p>
        </button>

        <button type="button" class="fame-d"
          @click="onRecordClick(fameEntries[3])"
          :aria-label="`${fameEntries[3].eyebrow}: ${getTeam(fameEntries[3].teamId).name} ${fameEntries[3].value}`">
          <span class="fame-d-eyebrow">{{ fameEntries[3].eyebrow }}</span>
          <p class="fame-d-text">
            <strong>{{ getTeam(fameEntries[3].teamId).name }}</strong>
            <span class="fame-d-dot" aria-hidden="true">·</span>
            <span class="fame-d-pct">{{ fameEntries[3].value }}</span>
            <span class="fame-d-dot" aria-hidden="true">·</span>
            <span class="fame-d-rec">{{ fameEntries[3].metric }}</span>
          </p>
        </button>
      </div>

      <!-- HALL OF SHAME -->
      <h3 class="awards-sub awards-sub-shame">Hall of Shame</h3>
      <div class="shame-grid">
        <button type="button" class="shame-a"
          @click="onRecordClick(shameEntries[0])"
          :aria-label="`${shameEntries[0].eyebrow}: ${getTeam(shameEntries[0].teamId).name} ${shameEntries[0].value}`">
          <span class="shame-tile-eyebrow">{{ shameEntries[0].eyebrow }}</span>
          <p class="shame-a-value">{{ shameEntries[0].value }}</p>
          <div class="shame-a-foot">
            <div class="shame-a-avatar" :style="{ background: `linear-gradient(135deg, ${getTeam(shameEntries[0].teamId).avatarColor})` }">
              <img v-if="getTeam(shameEntries[0].teamId).avatarUrl" :src="getTeam(shameEntries[0].teamId).avatarUrl" alt="" />
              <span v-else>{{ getTeam(shameEntries[0].teamId).ownerInitials }}</span>
            </div>
            <div>
              <p class="shame-a-team">{{ getTeam(shameEntries[0].teamId).name }}</p>
              <p class="shame-a-when">{{ shameEntries[0].metric }}</p>
            </div>
          </div>
        </button>

        <button type="button" class="shame-b"
          @click="onRecordClick(shameEntries[1])"
          :aria-label="`${shameEntries[1].eyebrow}: ${getTeam(shameEntries[1].teamId).name} ${shameEntries[1].value}`">
          <span class="shame-tile-eyebrow">{{ shameEntries[1].eyebrow }}</span>
          <div class="shame-b-row">
            <div class="shame-b-text">
              <p class="shame-b-value">{{ shameEntries[1].value }}</p>
              <p class="shame-b-sub">{{ shameEntries[1].metric }}</p>
              <p class="shame-b-team">{{ getTeam(shameEntries[1].teamId).name }}</p>
            </div>
            <div class="shame-b-avatar" :style="{ background: `linear-gradient(135deg, ${getTeam(shameEntries[1].teamId).avatarColor})` }">
              <img v-if="getTeam(shameEntries[1].teamId).avatarUrl" :src="getTeam(shameEntries[1].teamId).avatarUrl" alt="" />
              <span v-else>{{ getTeam(shameEntries[1].teamId).ownerInitials }}</span>
            </div>
          </div>
        </button>

        <button type="button" class="shame-c"
          @click="onRecordClick(shameEntries[2])"
          :aria-label="`${shameEntries[2].eyebrow}: ${getTeam(shameEntries[2].teamId).name} ${shameEntries[2].value}`">
          <span class="shame-c-eyebrow">{{ shameEntries[2].eyebrow }}</span>
          <p class="shame-c-text">
            <strong>{{ getTeam(shameEntries[2].teamId).name }}</strong>
            <span class="shame-c-dot" aria-hidden="true">·</span>
            <span class="shame-c-value">{{ shameEntries[2].value }}</span>
            <span class="shame-c-dot" aria-hidden="true">·</span>
            <span class="shame-c-trail">{{ shameEntries[2].context || shameEntries[2].metric }}</span>
          </p>
        </button>

        <button type="button" class="shame-d"
          @click="onRecordClick(shameEntries[3])"
          :aria-label="`${shameEntries[3].eyebrow}: ${getTeam(shameEntries[3].teamId).name} ${shameEntries[3].value}`">
          <span class="shame-d-eyebrow">{{ shameEntries[3].eyebrow }}</span>
          <p class="shame-d-text">
            <strong>{{ getTeam(shameEntries[3].teamId).name }}</strong>
            <span class="shame-d-dot" aria-hidden="true">·</span>
            <span class="shame-d-pct">{{ shameEntries[3].value }}</span>
            <span v-if="shameEntries[3].context" class="shame-d-dot" aria-hidden="true">·</span>
            <span v-if="shameEntries[3].context" class="shame-d-rec">{{ shameEntries[3].context }}</span>
          </p>
        </button>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         SECTION 8 — CAREER STATISTICS
    ────────────────────────────────────────────────────────────── -->
    <section class="career" aria-labelledby="career-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-mute" id="career-heading">Career statistics</p>
        <h2 class="section-headline">The whole picture.</h2>
      </header>

      <div class="career-table-wrap">
        <table class="career-table" aria-label="All-time team statistics">
          <thead>
            <tr>
              <th scope="col" class="th-team">Team</th>
              <th scope="col" class="th-num">Seasons</th>
              <th scope="col" class="th-num">Titles</th>
              <th scope="col" class="th-num">Record</th>
              <th scope="col" class="th-num">Win %</th>
              <th scope="col" class="th-num">Hit W</th>
              <th scope="col" class="th-num">Pitch W</th>
              <th scope="col" class="th-num">Cat +/-</th>
              <th scope="col" class="th-cat">Best cat</th>
              <th scope="col" class="th-cat">Worst cat</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in careerRows"
              :key="row.teamId"
              :class="getTeam(row.teamId).isMyTeam ? 'career-row-me' : ''"
            >
              <th scope="row" class="td-team">
                <button type="button" class="career-row-btn" @click="openLegacyModal(row.teamId)" :aria-label="`Open legacy detail for ${getTeam(row.teamId).name}`">
                  <div class="career-avatar" :style="{ background: `linear-gradient(135deg, ${getTeam(row.teamId).avatarColor})` }">
                    <img v-if="getTeam(row.teamId).avatarUrl" :src="getTeam(row.teamId).avatarUrl" alt="" />
                    <span v-else>{{ getTeam(row.teamId).ownerInitials }}</span>
                  </div>
                  <span class="career-team-name">{{ getTeam(row.teamId).name }}</span>
                </button>
              </th>
              <td class="td-num">{{ row.seasonsPlayed }}</td>
              <td class="td-num">
                <span v-if="row.titles > 0" class="career-title-chip">{{ row.titles }}</span>
                <span v-else class="career-dash">—</span>
              </td>
              <td class="td-num">{{ row.totalCatWins }}-{{ row.totalCatLosses }}-{{ row.totalCatTies }}</td>
              <td class="td-num">{{ (row.careerWinPct * 100).toFixed(1) }}%</td>
              <td class="td-num">{{ row.hitCatsWon }}</td>
              <td class="td-num">{{ row.pitchCatsWon }}</td>
              <td class="td-num" :class="row.catDifferential >= 0 ? 'td-pos' : 'td-neg'">{{ formatDiff(row.catDifferential) }}</td>
              <td class="td-cat"><span class="career-cat-chip career-cat-best">{{ row.bestCat }}</span></td>
              <td class="td-cat"><span class="career-cat-chip career-cat-worst">{{ row.worstCat }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Modals -->
    <CategoryTeamLegacyModal
      v-if="activeLegacyTeamId"
      :team-id="activeLegacyTeamId"
      @close="activeLegacyTeamId = null"
      @open-signup="$emit('open-signup')"
    />
    <CategoryRivalryModal
      v-if="activeRivalry"
      :team-a-id="activeRivalry.a"
      :team-b-id="activeRivalry.b"
      :override-narrative="rivalryOverrideFor(activeRivalry.a, activeRivalry.b)"
      @close="activeRivalry = null"
      @open-signup="$emit('open-signup')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import {
  teams,
  getTeam as getFixtureTeam,
  seasonHistory,
  teamCareerStats,
  legacyBreakdowns,
  legacyTrend,
  h2hMatrix,
  yearlyCatRecords,
  recordBook,
  categoryDynastyBeats,
  type CategoryRecordBookEntry,
} from '@/fixtures/categoriesLeague'
import CategoryTeamLegacyModal from '@/components/demo/CategoryTeamLegacyModal.vue'
import CategoryRivalryModal from '@/components/demo/CategoryRivalryModal.vue'
import { accentFor } from '@/utils/teamColor'
import { linearPath, type Point } from '@/utils/svgPath'
import { renderHistoryPage, type RenderedHistoryCopy } from '@/editorial/render-history'
import { categoriesFixtureToLeagueData } from '@/editorial/fixtureAdapter'
import { sleeperLeagueToCategoryData } from '@/editorial/adapters/sleeperAdapter'
import { espnLeagueToCategoryData } from '@/editorial/adapters/espnAdapter'
import { yahooLeagueToCategoryData } from '@/editorial/adapters/yahooAdapter'
import { LEGACY_FORMULA_LABEL, computeLegacyScore } from '@/editorial/legacy'
import type { CategoryLeagueData, CategoryLeagueDataTeam } from '@/editorial/types'
import { usePlatformsStore } from '@/stores/platforms'
import { useLeaguesStore } from '@/stores/leaguesNew'
import LiveLoadError from '@/components/demo/LiveLoadError.vue'

defineEmits<{ (e: 'open-signup'): void }>()

const route = useRoute()

/* ─────────────────────────────────────────────────────────────────
   LIVE DATA — same pattern as CategoryDemoHomeView.

   Default: fixture-derived render so the page is visually populated
   on every load. When `?leagueId=…&platform=sleeper` is present, we
   refetch via the adapter and swap the editorial copy. The rest of
   the view (chart, matrix, career table) reads from the same fixture
   refs today; the editorial is the first surface to go live.
───────────────────────────────────────────────────────────────── */
const liveData = shallowRef<CategoryLeagueData | null>(null)
const liveEditorial = shallowRef<RenderedHistoryCopy>(
  renderHistoryPage(categoriesFixtureToLeagueData()),
)
const liveLoading = ref(false)
const liveError = ref<string | null>(null)

/** Live-aware team lookup. Prefers the connected league's teams, falls
 *  back to the fixture (demo + transitional renders), then a synthesized
 *  stub so the template never crashes on an unknown id. Shadows the
 *  fixture import so every getTeam(...) call in this view is live-aware. */
function getTeam(id: string): CategoryLeagueDataTeam {
  const live = liveData.value?.teams.find((t) => t.id === id)
  if (live) return live
  // The fixture getTeam RETURNS undefined (not throws) for unknown ids,
  // so guard the result — never hand the template an undefined team.
  let fixture: CategoryLeagueDataTeam | undefined
  try {
    fixture = getFixtureTeam(id)
  } catch {
    fixture = undefined
  }
  if (fixture) return fixture
  return {
    id,
    name: `Team ${id}`,
    ownerName: '',
    ownerInitials: (id || '?').slice(0, 2).toUpperCase(),
    avatarUrl: undefined,
    avatarColor: 'oklch(0.40 0.05 90), oklch(0.25 0.05 90)',
    isMyTeam: false,
  }
}

// Two ways to bind to a real league (mirrors CategoryDemoHomeView):
//   - Strict:  /leagues/:leagueId/history — leagueId is the Supabase
//     leagues.id UUID; resolve platform + platform_league_id from the
//     leagues store.
//   - Soft (legacy): /demo-categories/history?leagueId=…&platform=…
const leaguesStore = useLeaguesStore()
const strictLeagueRecord = computed(() => {
  const uuid = route.params.leagueId
  if (typeof uuid !== 'string' || uuid.length === 0) return null
  return leaguesStore.leagues.find((l) => l.id === uuid) ?? null
})
const isStrictLiveMode = computed(() => typeof route.params.leagueId === 'string')

/* ─── Multi-season aggregation from the user's connected leagues ────
   Yahoo (and ESPN/Sleeper) register each season as a separate league.
   We match the current league's siblings by name + platform + sport,
   so a 3-year-old league shows 3 seasons even when the platform's
   renew chain is empty. */
const siblingLeagues = computed(() => {
  const cur = strictLeagueRecord.value
  if (!cur) return []
  return leaguesStore.leagues.filter(
    (l) =>
      l.platform === cur.platform &&
      l.sport === cur.sport &&
      l.league_name === cur.league_name,
  )
})

/** Connected prior-season league keys (one per season, excluding the
 *  current season). Passed to the adapter to build real history. */
const priorSeasonKeys = computed<string[]>(() => {
  const cur = strictLeagueRecord.value
  if (!cur) return []
  const bySeason = new Map<string, string>()
  for (const l of siblingLeagues.value) {
    if (l.id === cur.id || String(l.season) === String(cur.season)) continue
    if (!bySeason.has(String(l.season))) {
      bySeason.set(String(l.season), l.platform_league_id)
    }
  }
  return [...bySeason.values()]
})

/** Distinct seasons this league has existed (connected), including the
 *  current one. Drives the page-head count + adaptive sparse states. */
const liveSeasonCount = computed<number>(() => {
  const cur = strictLeagueRecord.value
  if (!cur) return 0
  const seasons = new Set(siblingLeagues.value.map((l) => String(l.season)))
  seasons.add(String(cur.season))
  return seasons.size
})

/** Season count for display — real connected-season count on a live
 *  league, fixture/completed count in the demo. */
const displaySeasonCount = computed<number>(() => {
  if (isStrictLiveMode.value && strictLeagueRecord.value) return liveSeasonCount.value
  return liveData.value?.seasonHistory?.length ?? seasonHistory.length
})

/* Champion / runner-up / basement display — prefer the denormalized
   name + logo on the season record (past-season team keys don't
   resolve against the current league's teams), fall back to getTeam. */
function champInfo(rec: any) {
  const t = getTeam(rec.championTeamId)
  return {
    name: rec.championName ?? t.name,
    logo: rec.championLogo ?? t.avatarUrl,
    initials: t.ownerInitials,
    color: t.avatarColor,
  }
}
function runnerUpInfo(rec: any) {
  return { name: rec.runnerUpName ?? getTeam(rec.runnerUpTeamId).name }
}
function basementInfo(rec: any) {
  return { name: rec.basementName ?? getTeam(rec.basementTeamId).name }
}

const liveLeagueId = computed<string | null>(() => {
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

onMounted(async () => {
  // Strict route deep-link / refresh: the leagues store may not be
  // hydrated yet, so fetch it before we can resolve the platform +
  // platform_league_id for this league row.
  if (isStrictLiveMode.value && leaguesStore.leagues.length === 0) {
    try {
      await leaguesStore.fetchLeagues()
    } catch (err) {
      console.warn('[CategoryDemoHistoryView] fetchLeagues failed:', err)
    }
  }

  const id = liveLeagueId.value
  const platform = livePlatform.value
  if (!id || (platform !== 'sleeper' && platform !== 'espn' && platform !== 'yahoo')) {
    return   // fixture-only path (demo, or league row not resolved yet)
  }

  liveLoading.value = true
  liveError.value = null
  try {
    // leagueRowId is the Supabase UUID (route param) — passed for parity
    // with the home view's adapter options.
    const leagueRowId =
      typeof route.params.leagueId === 'string' ? route.params.leagueId : undefined
    const opts = {
      userIdentity: collectUserIdentity(),
      leagueRowId,
      priorSeasonKeys: priorSeasonKeys.value,
    }
    const data =
      platform === 'espn'
        ? await espnLeagueToCategoryData(id, opts)
        : platform === 'yahoo'
        ? await yahooLeagueToCategoryData(id, opts)
        : await sleeperLeagueToCategoryData(id, opts)
    liveData.value = data
    liveEditorial.value = renderHistoryPage(data)
  } catch (err) {
    const label =
      platform === 'espn' ? 'ESPN' : platform === 'yahoo' ? 'Yahoo' : 'Sleeper'
    liveError.value = (err as Error).message || `Failed to load ${label} league data.`
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

/* ─── Page head — reactive to live data when present ───────── */
const pageHeadline = computed(() => {
  const n = displaySeasonCount.value
  if (n <= 0) return 'A fresh ledger.'
  if (n === 1) return 'Season one, in progress.'
  return `${numberToWord(n)} years of receipts.`
})
function numberToWord(n: number): string {
  const words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve']
  return words[n] ?? `${n}`
}
const pageContext = computed(() => {
  const seasonsArr = liveData.value?.seasonHistory ?? seasonHistory
  const championsCount = new Set(seasonsArr.map((s) => s.championTeamId)).size
  const teamsCount = (liveData.value?.teams ?? teams).length
  return { seasons: displaySeasonCount.value, champions: championsCount, teamsCount }
})


/* ─── Seasons / champions ──────────────────────────────────── */
const seasonsNewestFirst = computed(() => {
  const src = liveData.value?.seasonHistory ?? seasonHistory
  return [...src].sort((a, b) => b.year - a.year)
})

/** Champions-section headline, scaled to how many crowns exist. */
const trophiesHeadline = computed(() => {
  const n = seasonsNewestFirst.value.length
  if (n === 0) return 'The record opens soon.'
  const word = numberToWord(n)
  const cap = word.charAt(0).toUpperCase() + word.slice(1)
  return `${cap} ${n === 1 ? 'trophy' : 'trophies'}.`
})

/* ─── Champion-card copy + era, derived from the real season data ─── */

/** Specific, varied line per champion — number-anchored, and rotated
 *  by year so consecutive cards don't share a shape (or repeat "crown"
 *  next to the era tag). */
function champLine(rec: any): string {
  const runner = rec.runnerUpName ?? getTeam(rec.runnerUpTeamId).name
  const hasRunner = !!runner && !String(runner).startsWith('Team ')
  const r = rec.championRecord
  const opts: string[] = []
  if (r && hasRunner) opts.push(`Finished ${r}. ${runner} a step back.`)
  if (r) opts.push(`Closed the season at ${r}.`)
  if (hasRunner) opts.push(`Beat out ${runner} for the title.`)
  opts.push('Champions, and the book remembers.')
  return opts[rec.year % opts.length] ?? opts[0]
}

/** Earliest season this league has existed (across connected seasons). */
const foundingYear = computed<number>(() => {
  const years = seasonsNewestFirst.value.map((s) => s.year)
  if (isStrictLiveMode.value && strictLeagueRecord.value) {
    for (const l of siblingLeagues.value) {
      const y = Number(l.season)
      if (Number.isFinite(y)) years.push(y)
    }
    const cy = Number(strictLeagueRecord.value.season)
    if (Number.isFinite(cy)) years.push(cy)
  }
  return years.length ? Math.min(...years) : 0
})

/** Era tag — every champion gets a real, varied one (keeps the card
 *  row aligned and adds editorial texture instead of a blank slot). */
function champEra(rec: any): string {
  const key = (r: any) => r.championName ?? r.championTeamId
  if (rec.year === foundingYear.value) return 'The founding'
  const prior = seasonsNewestFirst.value.find((s) => s.year === rec.year - 1)
  if (prior && key(prior) === key(rec)) return 'Back-to-back'
  const wonEarlier = seasonsNewestFirst.value.some((s) => s.year < rec.year && key(s) === key(rec))
  return wonEarlier ? 'Back on top' : 'First crown'
}

/** The current, undecided season — rendered as a "the chase" card so
 *  the champions rail isn't half-empty and the past ties to the now. */
const currentSeasonCard = computed(() => {
  const d = liveData.value
  if (!d || !isStrictLiveMode.value) return null
  const sorted = [...d.standings].sort((a, b) => a.rank - b.rank)
  const leader = sorted[0]
  if (!leader) return null
  return {
    year: d.currentSeason,
    week: d.currentWeek,
    leaderId: leader.teamId,
    secondId: sorted[1]?.teamId ?? '',
  }
})

/* ─── Editorial wiring for dynasty beats ───────────────────────
   The fixture beats carry layout-critical metadata (cats array, the
   catWinTotal numbers, the punt-streak number). The editorial only
   supplies eyebrow/headline/body. We overlay the editorial copy on
   the fixture row when the fixture row exists, and otherwise rely
   on the editorial-derived team id to keep the avatar block valid.
─────────────────────────────────────────────────────────────── */
const hittingFixture = computed(() => categoryDynastyBeats.find((b) => b.kind === 'hitting-king')!)
const pitchingFixture = computed(() => categoryDynastyBeats.find((b) => b.kind === 'pitching-king')!)
const puntFixture = computed(() => categoryDynastyBeats.find((b) => b.kind === 'punt-kings')!)

const hittingBeat = computed(() => {
  const ed = liveEditorial.value.dynasties.hitting
  const fx = hittingFixture.value
  if (!ed) return fx
  // teamId from editorial when live data drove it; fall back to fixture so the
  // avatar block always resolves.
  const detectedTeamId = liveData.value
    ? topCareerByPicker(liveData.value, (s) => s.hitCatsWon) ?? fx.teamId
    : fx.teamId
  const detectedCount = liveData.value?.teamCareerStats?.[detectedTeamId]?.hitCatsWon ?? fx.catWinTotal
  return {
    ...fx,
    eyebrow: ed.eyebrow,
    headline: ed.headline,
    body: ed.body || fx.body,
    teamId: detectedTeamId,
    catWinTotal: detectedCount,
  }
})

const pitchingBeat = computed(() => {
  const ed = liveEditorial.value.dynasties.pitching
  const fx = pitchingFixture.value
  if (!ed) return fx
  const detectedTeamId = liveData.value
    ? topCareerByPicker(liveData.value, (s) => s.pitchCatsWon) ?? fx.teamId
    : fx.teamId
  const detectedCount = liveData.value?.teamCareerStats?.[detectedTeamId]?.pitchCatsWon ?? fx.catWinTotal
  return {
    ...fx,
    eyebrow: ed.eyebrow,
    headline: ed.headline,
    body: ed.body || fx.body,
    teamId: detectedTeamId,
    catWinTotal: detectedCount,
  }
})

const puntBeat = computed(() => {
  // Detection is intentionally skipped for punt-kings (see detect-history.ts).
  // The fixture beat remains the source of truth for this slot.
  return puntFixture.value
})

function topCareerByPicker(
  data: CategoryLeagueData,
  picker: (s: NonNullable<CategoryLeagueData['teamCareerStats']>[string]) => number,
): string | null {
  const career = data.teamCareerStats
  if (!career) return null
  const entries = Object.values(career)
  if (entries.length === 0) return null
  const top = entries.reduce((best, s) => (picker(s) > picker(best) ? s : best))
  return top.teamId
}

/* ─── Legacy podium and tail ───────────────────────────────────
   Live league: real per-manager aggregation across connected seasons
   (data.managerLegacy). Demo: the fixture teams, scored with the SAME
   defined formula so the on-page formula caption stays honest in both
   modes. Entries are self-contained for display so a manager who has
   left the league still renders (no getTeam dependency). */
interface LegacyDisplay {
  rank: number
  score: number
  teamId: string            // '' for managers no longer in the league
  name: string
  logoUrl?: string
  avatarColor: string
  ownerInitials: string
  isMyTeam: boolean
  seasonsPlayed: number
  titles: number
  playoffApps: number
  totalCatWins: number
  careerWinPct: number
}

const legacyFormulaLabel = LEGACY_FORMULA_LABEL

/** Live legacy cards are non-interactive for now: the detail modal is
 *  still fixture-backed, so opening it on a real team would leak demo
 *  data. The demo route keeps the modal. */
const legacyInteractive = computed(() => !isStrictLiveMode.value)

const legacyEntries = computed<LegacyDisplay[]>(() => {
  const live = liveData.value?.managerLegacy
  if (live && live.length > 0) {
    return live.map((m) => ({
      rank: m.rank,
      score: m.legacyScore,
      teamId: m.teamId ?? '',
      name: m.name,
      logoUrl: m.logoUrl,
      avatarColor: m.avatarColor,
      ownerInitials: m.ownerInitials,
      isMyTeam: m.isMyTeam,
      seasonsPlayed: m.seasonsPlayed,
      titles: m.titles,
      playoffApps: m.playoffApps,
      totalCatWins: m.totalCatWins,
      careerWinPct: m.careerWinPct,
    }))
  }
  return Object.values(legacyBreakdowns)
    .map((b) => {
      const c = teamCareerStats[b.teamId]
      const t = getTeam(b.teamId)
      const careerWinPct = c?.careerWinPct ?? 0
      return {
        rank: 0,
        score: computeLegacyScore({
          titles: c?.titles ?? 0,
          playoffApps: c?.playoffApps ?? 0,
          careerWinPct,
          totalCatWins: c?.totalCatWins ?? 0,
        }),
        teamId: b.teamId,
        name: t.name,
        logoUrl: t.avatarUrl,
        avatarColor: t.avatarColor,
        ownerInitials: t.ownerInitials,
        isMyTeam: t.isMyTeam,
        seasonsPlayed: c?.seasonsPlayed ?? 0,
        titles: c?.titles ?? 0,
        playoffApps: c?.playoffApps ?? 0,
        totalCatWins: c?.totalCatWins ?? 0,
        careerWinPct,
      } as LegacyDisplay
    })
    .sort((a, b) => b.score - a.score || b.titles - a.titles || b.totalCatWins - a.totalCatWins)
    .map((e, i) => ({ ...e, rank: i + 1 }))
})

const podium = computed(() => legacyEntries.value.slice(0, 3))
const legacyTail = computed(() => legacyEntries.value.slice(3))

/** Lead OKLCH stop of an entry's gradient — the card's glow accent. */
function accentOfEntry(e: LegacyDisplay): string {
  const stops = e.avatarColor
    .split(/\)\s*,\s*/)
    .map((s) => (s.endsWith(')') ? s : `${s})`))
  return stops[0]
}

function onLegacyClick(e: LegacyDisplay): void {
  if (legacyInteractive.value && e.teamId) openLegacyModal(e.teamId)
}

/** Win% as a leading-dot rate, e.g. .598. */
function legacyPct(n: number): string {
  return n.toFixed(3).replace(/^0\./, '.')
}

/** "1 playoff" / "2 playoffs" — correct pluralization. */
function playoffWord(n: number): string {
  return `${n} playoff${n === 1 ? '' : 's'}`
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Number-anchored lede for the #1 hero card. Title-holders lead with
 *  the ring; the ringless lead with the positive so it never opens on
 *  "0 titles". Seasons show as their own tag, so they stay out of here. */
function podiumLede(e: LegacyDisplay): string {
  if (e.titles > 0) {
    const r = `${numberToWord(e.titles)} ${e.titles === 1 ? 'ring' : 'rings'}`
    return `${cap(r)}, ${legacyPct(e.careerWinPct)} lifetime.`
  }
  if (e.playoffApps > 0) {
    const p = `${numberToWord(e.playoffApps)} playoff berth${e.playoffApps === 1 ? '' : 's'}`
    return `${cap(p)}, ${legacyPct(e.careerWinPct)} lifetime, still ringless.`
  }
  return `${e.totalCatWins} cat wins, ${legacyPct(e.careerWinPct)} lifetime.`
}

/** Distinct managers across all connected seasons — reconciles the
 *  16-deep legacy list with the current-season "12 teams" pill. */
const legacyManagerCount = computed(() => legacyEntries.value.length)

const teamIds = teams.map((t) => t.id)

const careerRows = computed(() => {
  return [...Object.values(teamCareerStats)].sort(
    (a, b) => (legacyBreakdowns[a.teamId]?.total ?? 0) < (legacyBreakdowns[b.teamId]?.total ?? 0) ? 1 : -1,
  )
})

function accentOf(id: string) {
  return accentFor(getTeam(id))
}

function formatDiff(n: number): string {
  if (n > 0) return `+${n}`
  if (n < 0) return `${n}`
  return '0'
}

/* ─── Trend chart geometry ─────────────────────────────────── */
const TX_W = 1000
const TX_H = 320
const TX_PAD_L = 36
const TX_PAD_R = 120
const TX_PAD_T = 18
const TX_PAD_B = 28
const Y_MAX = 1700
const trendYears = [2021, 2022, 2023, 2024, 2025, 2026]
const gridLines = [400, 800, 1200, 1600].map((v) => ({ v, y: yFor(v) }))

function xFor(i: number) {
  const span = trendYears.length - 1
  return TX_PAD_L + ((TX_W - TX_PAD_L - TX_PAD_R) * (i / span))
}
function yFor(v: number) {
  const yRange = TX_H - TX_PAD_T - TX_PAD_B
  return TX_PAD_T + yRange * (1 - v / Y_MAX)
}
function pathFor(values: number[]) {
  const pts: Point[] = values.map((v, i) => ({ x: xFor(i), y: yFor(v) }))
  return linearPath(pts)
}

const featuredTeamIds = computed(() => {
  // Top 3 by legacy + my team
  const top3 = podium.value.map((p) => p.teamId)
  const myId = teams.find((t) => t.isMyTeam)?.id
  const result = new Set(top3)
  if (myId) result.add(myId)
  return result
})
function isFeatured(id: string): boolean {
  return featuredTeamIds.value.has(id)
}

const ctTrendValueAt2024 = computed(() => {
  const row = legacyTrend.find((r) => r.teamId === 'ct')
  return row?.cumulative[3] ?? null
})

/* Endpoint labels with stagger to avoid overlap. */
const endpointLabels = computed(() => {
  type Lbl = { teamId: string; x: number; y: number }
  const lbls: Lbl[] = []
  // Only featured teams get labels
  for (const row of legacyTrend) {
    if (!isFeatured(row.teamId)) continue
    const last = row.cumulative.length - 1
    lbls.push({
      teamId: row.teamId,
      x: xFor(last) + 10,
      y: yFor(row.cumulative[last]) + 4,
    })
  }
  // Stagger by y — push pairs that are within 14px apart
  lbls.sort((a, b) => a.y - b.y)
  for (let i = 1; i < lbls.length; i++) {
    const gap = lbls[i].y - lbls[i - 1].y
    if (gap < 14) lbls[i].y = lbls[i - 1].y + 14
  }
  return lbls
})

/* ─── H2H matrix helpers ───────────────────────────────────── */
function getH2H(a: string, b: string): { aWins: number; bWins: number; ties: number; catDiffA: number; meetings: number } | null {
  if (a === b) return null
  // canonical alphabetized lookup
  const lo = a < b ? a : b
  const hi = a < b ? b : a
  const cell = h2hMatrix.find((c) => c.teamA === lo && c.teamB === hi)
  if (!cell) return null
  const m = cell.recordA.match(/^(\d+)-(\d+)-(\d+)$/)
  if (!m) return null
  const aWins = parseInt(m[1], 10)
  const bWins = parseInt(m[2], 10)
  const ties  = parseInt(m[3], 10)
  if (a < b) {
    return { aWins, bWins, ties, catDiffA: cell.catDiffA, meetings: cell.meetings }
  }
  // viewing from b (=a-param)
  return { aWins: bWins, bWins: aWins, ties, catDiffA: -cell.catDiffA, meetings: cell.meetings }
}

function cellRecord(rid: string, cid: string): string {
  if (rid === cid) return '—'
  const r = getH2H(rid, cid)
  if (!r) return '—'
  return r.ties ? `${r.aWins}-${r.bWins}-${r.ties}` : `${r.aWins}-${r.bWins}`
}
function cellDiffLabel(rid: string, cid: string): string {
  if (rid === cid) return ''
  const r = getH2H(rid, cid)
  if (!r) return ''
  return r.catDiffA === 0 ? '0 cats' : (r.catDiffA > 0 ? `+${r.catDiffA} cats` : `${r.catDiffA} cats`)
}
function cellClass(rid: string, cid: string): string {
  if (rid === cid) return 'h2h-cell-diag'
  const r = getH2H(rid, cid)
  if (!r) return ''
  const diff = r.aWins - r.bWins
  if (diff === 0) return 'h2h-cell-even'
  return diff > 0 ? 'h2h-cell-win' : 'h2h-cell-loss'
}
function cellTint(rid: string, cid: string): string {
  if (rid === cid) return '0'
  const r = getH2H(rid, cid)
  if (!r) return '0'
  const total = r.aWins + r.bWins
  if (!total) return '0'
  const diff = Math.abs(r.aWins - r.bWins)
  if (diff === 0) return '0'
  const ratio = Math.max(0.35, Math.min(1, diff / Math.max(4, total)))
  return ratio.toFixed(2)
}

/* ─── Record book ──────────────────────────────────────────── */
const activeAwardScope = ref<'all-time' | 'season'>('all-time')
const availableSeasons = [2025, 2024, 2023, 2022, 2021] as const
const selectedSeason = ref<number>(availableSeasons[0])

/* All-time scope. Editorial-driven when live data has provided record
   candidates; fall back to the fixture record book otherwise so the
   layout always has four fame + four shame tiles to render.

   We preserve the fixture's eyebrow (uppercase tile label) + teamId
   + value layout slots, and promote the editorial body into the
   `context` slot — that's the supplemental sub-line each tile already
   displays. The editorial owns voice; the fixture owns layout shape. */
const allTimeFame = computed<CategoryRecordBookEntry[]>(() => {
  const edFame = liveEditorial.value.recordBook.fame
  const fxFame = recordBook.filter((r) => r.kind === 'fame')
  if (edFame.length === 0) return fxFame
  return fxFame.map((fx, i) => {
    const ed = edFame[i]
    if (!ed) return fx
    return { ...fx, context: ed.body || fx.context }
  })
})
const allTimeShame = computed<CategoryRecordBookEntry[]>(() => {
  const edShame = liveEditorial.value.recordBook.shame
  const fxShame = recordBook.filter((r) => r.kind === 'shame')
  if (edShame.length === 0) return fxShame
  return fxShame.map((fx, i) => {
    const ed = edShame[i]
    if (!ed) return fx
    return { ...fx, context: ed.body || fx.context }
  })
})

// Season-scoped entries derive from yearlyCatRecords for the selected year.
const seasonFame = computed<CategoryRecordBookEntry[]>(() => {
  const y = selectedSeason.value
  const yearEntries = yearlyCatRecords.filter((r) => r.year === y)
  // Best team by total cat wins this year — sum bestValue per team (winners only)
  const winsByTeam = new Map<string, number>()
  for (const r of yearEntries) {
    winsByTeam.set(r.bestTeamId, (winsByTeam.get(r.bestTeamId) ?? 0) + r.bestValue)
  }
  const topMostWins = [...winsByTeam.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['ct', 0]
  // Best single-cat: max bestValue in year
  const best = yearEntries.reduce((acc, r) => (r.bestValue > acc.bestValue ? r : acc), yearEntries[0])
  // Biggest cat gap: bestValue - worstValue
  const biggestGap = yearEntries.reduce(
    (acc, r) => (r.bestValue - r.worstValue > acc.gap ? { row: r, gap: r.bestValue - r.worstValue } : acc),
    { row: yearEntries[0], gap: -Infinity },
  )
  // Champion of that year (used for best record holder)
  const seasonRec = seasonHistory.find((s) => s.year === y)
  const champId = seasonRec?.championTeamId ?? 'ct'
  return [
    { id: `season-most-wins-${y}`,    kind: 'fame', eyebrow: 'MOST CAT WINS', metric: `Total cat wins · ${y}`,
      teamId: topMostWins[0], value: `${topMostWins[1]}`, context: `Across the ${y} season.` },
    { id: `season-best-record-${y}`,  kind: 'fame', eyebrow: 'BEST CAT W-L',   metric: `Highest cat win rate · ${y}`,
      teamId: champId, value: seasonRec?.championRecord.split('-').slice(0,2).join('-') ?? '0-0',
      context: `${getTeam(champId).name} won it all.` },
    { id: `season-best-cat-${y}`,     kind: 'fame', eyebrow: 'BEST SINGLE-CAT', metric: `${best.catId} wins · ${y}`,
      teamId: best.bestTeamId, value: `${best.bestValue}`,
      context: `${best.bestValue} ${best.catId} wins.` },
    { id: `season-biggest-gap-${y}`,  kind: 'fame', eyebrow: 'BIGGEST DOMINANCE', metric: `${biggestGap.row.catId} gap to #10 · ${y}`,
      teamId: biggestGap.row.bestTeamId, value: `${biggestGap.gap}`,
      context: `${biggestGap.row.bestValue} wins vs ${biggestGap.row.worstValue} for last.` },
  ]
})
const seasonShame = computed<CategoryRecordBookEntry[]>(() => {
  const y = selectedSeason.value
  const yearEntries = yearlyCatRecords.filter((r) => r.year === y)
  const lossesByTeam = new Map<string, number>()
  for (const r of yearEntries) {
    // Use 30 (cat-wins available) - worstValue as loss count proxy
    lossesByTeam.set(r.worstTeamId, (lossesByTeam.get(r.worstTeamId) ?? 0) + (30 - r.worstValue))
  }
  const topMostLosses = [...lossesByTeam.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['ws', 0]
  const worst = yearEntries.reduce((acc, r) => (r.worstValue < acc.worstValue ? r : acc), yearEntries[0])
  const biggestGap = yearEntries.reduce(
    (acc, r) => (r.bestValue - r.worstValue > acc.gap ? { row: r, gap: r.bestValue - r.worstValue } : acc),
    { row: yearEntries[0], gap: -Infinity },
  )
  const seasonRec = seasonHistory.find((s) => s.year === y)
  const baseId = seasonRec?.basementTeamId ?? 'ws'
  return [
    { id: `season-most-losses-${y}`,  kind: 'shame', eyebrow: 'MOST CAT LOSSES',  metric: `Total cat losses · ${y}`,
      teamId: topMostLosses[0], value: `${topMostLosses[1]}`, context: `The basement of ${y}.` },
    { id: `season-worst-record-${y}`, kind: 'shame', eyebrow: 'WORST CAT W-L',     metric: `Lowest cat win rate · ${y}`,
      teamId: baseId, value: seasonRec?.basementRecord.split('-').slice(0,2).join('-') ?? '0-0',
      context: `${getTeam(baseId).name} carried the cellar.` },
    { id: `season-worst-cat-${y}`,    kind: 'shame', eyebrow: 'WORST SINGLE-CAT',  metric: `Lowest ${worst.catId} wins · ${y}`,
      teamId: worst.worstTeamId, value: `${worst.worstValue}`,
      context: `${worst.worstValue} ${worst.catId} wins all season.` },
    { id: `season-biggest-deficit-${y}`, kind: 'shame', eyebrow: 'BIGGEST DEFICIT', metric: `Largest gap to #1 · ${y}`,
      teamId: biggestGap.row.worstTeamId, value: `${biggestGap.gap}`,
      context: `Trailed leader by ${biggestGap.gap} ${biggestGap.row.catId} wins.` },
  ]
})

const fameEntries = computed(() => activeAwardScope.value === 'all-time' ? allTimeFame.value : seasonFame.value)
const shameEntries = computed(() => activeAwardScope.value === 'all-time' ? allTimeShame.value : seasonShame.value)

// Click handler — no top-10 modal scope yet; leaving as future hook (no-op).
function onRecordClick(_entry: CategoryRecordBookEntry) {
  // Intentional no-op: top-10 award modal not in scope for category league yet.
  // Cards remain interactive (focus/active states) for discoverability.
}

/* ─── Rivalry editorial passthrough — provides the marquee/procedural
   narrative that the rivalry modal will display as its lead paragraph.
   The modal already falls back to its existing authored profile, then
   to a procedural string, when no override is provided. */
function rivalryOverrideFor(a: string, b: string): string | null {
  const key = a < b ? `${a}-${b}` : `${b}-${a}`
  const entry = liveEditorial.value.rivalryProfiles[key]
  if (!entry) return null
  // Use the body when it carries something specific; otherwise headline.
  const text = entry.body && entry.body.length > 0 ? entry.body : entry.headline
  return text && text.length > 0 ? text : null
}

/* ─── Modals state ─────────────────────────────────────────── */
const activeLegacyTeamId = ref<string | null>(null)
const activeRivalry = ref<{ a: string; b: string } | null>(null)

function openLegacyModal(id: string) { activeLegacyTeamId.value = id }
function openRivalryModal(a: string, b: string) { activeRivalry.value = { a, b } }
</script>

<style scoped>
.cathist {
  --gold:   oklch(0.84 0.16 90);
  --silver: oklch(0.80 0.012 90);
  --bronze: oklch(0.62 0.12 50);

  display: flex;
  flex-direction: column;
  gap: 56px;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}

/* ─── Shared section heading typography ───────────────────────── */
.section-head { margin-bottom: 18px; }
.section-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-2);
  margin: 0 0 6px;
}
.section-eyebrow-teal    { color: var(--accent-tertiary); }
.section-eyebrow-magenta { color: var(--accent-secondary); }
.section-eyebrow-mute    { color: var(--ink-3); }
.section-eyebrow-gold    { color: var(--gold); }
.section-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 3.6vw, 2.4rem);
  line-height: 0.96;
  letter-spacing: -0.012em;
  color: var(--ink-1);
  margin: 0 0 4px;
}
.section-sub {
  font-size: 0.88rem;
  color: var(--ink-3);
  margin: 0;
  max-width: 65ch;
  line-height: 1.5;
}

/* ─── Live load banner (mirrors CategoryDemoHomeView) ──────────── */
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
.live-banner-info {
  color: var(--ink-2);
  border-color: oklch(0.22 0.015 90);
}
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
  color: var(--accent-secondary);
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

/* ─── Page header ─────────────────────────────────────────────── */
.page-head {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) auto;
  align-items: end;
  gap: 32px;
  padding: 24px 0 18px;
  border-bottom: 1px solid oklch(0.16 0.015 90);
}
.page-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 0 0 10px;
}
.page-eyebrow-bar { width: 24px; height: 1px; background: var(--accent-secondary); }
.page-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2rem, 5.4vw, 2.6rem);
  line-height: 0.94;
  letter-spacing: -0.015em;
  color: var(--ink-1);
  margin: 0 0 8px;
}
.page-sub {
  font-size: 1rem;
  color: var(--ink-2);
  margin: 0;
  max-width: 56ch;
  line-height: 1.5;
}
.page-context {
  list-style: none;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid oklch(0.18 0.015 90);
  background: oklch(0.10 0.015 90);
}
.page-context-pill {
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 1px solid oklch(0.18 0.015 90);
}
.page-context-pill:last-child { border-right: none; }
.page-context-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.4rem;
  line-height: 1;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}
.page-context-lbl {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
  margin-top: 4px;
}
@media (max-width: 720px) {
  .page-head { grid-template-columns: 1fr; gap: 18px; }
  .page-context { align-self: flex-start; flex-wrap: wrap; }
  .page-context-pill { padding: 8px 14px; }
}

/* ─── 2. HALL OF CHAMPIONS ────────────────────────────────────── */
.champs-rail {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 4px 4px 12px;
  margin: 0 -4px;
}
.champs-rail::-webkit-scrollbar { height: 6px; }
.champs-rail::-webkit-scrollbar-thumb { background: oklch(0.20 0.015 90); border-radius: 3px; }
.champ-card {
  flex: 0 0 280px;
  height: 380px;
  scroll-snap-align: start;
  position: relative;
  border: 1px solid oklch(0.22 0.04 90);
  border-radius: 18px;
  padding: 22px 22px 18px;
  background:
    radial-gradient(ellipse at top, oklch(0.84 0.16 90 / 0.12), transparent 60%),
    linear-gradient(180deg, oklch(0.13 0.015 90), oklch(0.08 0.014 90));
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}
.champ-year {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 4rem;
  line-height: 0.88;
  color: var(--gold);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  margin: 0;
  align-self: flex-start;
}
.champ-era {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 4px 0 18px;
  align-self: flex-start;
}

/* Live "chase" card — the undecided current season. Green identity so
   it reads as in-progress, not a trophy. */
.champ-card-live {
  border-color: oklch(0.50 0.16 145 / 0.55);
  background:
    radial-gradient(ellipse at top, oklch(0.74 0.18 145 / 0.12), transparent 60%),
    linear-gradient(180deg, oklch(0.13 0.015 90), oklch(0.08 0.014 90));
}
.champ-card-live .champ-year { color: oklch(0.78 0.16 145); }
.champ-era-live { color: oklch(0.74 0.18 145); }
.champ-avatar {
  width: 88px; height: 88px;
  border-radius: 18px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.6rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  border: 2px solid var(--gold);
  box-shadow:
    0 0 0 4px oklch(0.84 0.16 90 / 0.12),
    0 12px 32px -12px oklch(0 0 0 / 0.6);
  margin-bottom: 14px;
}
.champ-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.champ-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.2rem;
  line-height: 1.1;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0 0 6px;
  text-align: center;
}
.champ-score {
  font-size: 0.84rem;
  color: var(--ink-3);
  margin: 0 0 auto;
  text-align: center;
  max-width: 26ch;
  line-height: 1.4;
}
.champ-foot {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid oklch(0.18 0.015 90);
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.champ-foot-row {
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  font-size: 0.74rem;
}
.champ-foot-lbl {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.champ-foot-val {
  color: var(--ink-2);
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── 3. LEGACY ──────────────────────────────────────────────── */
.podium {
  display: grid;
  grid-template-columns: 1fr 1.18fr 1fr;
  align-items: end;
  gap: 14px;
  margin-bottom: 24px;
}
.podium-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border-radius: 16px;
  padding: 18px 16px 16px;
  cursor: pointer;
  color: inherit;
  font: inherit;
  border: 1px solid;
}
.podium-card:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: no-preference) {
  .podium-card { transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1); }
  .podium-card:hover { transform: translateY(-2px); }
}
.podium-card:active { transform: scale(0.99); transition-duration: 100ms; }

/* Live mode: legacy cards are display-only (the detail modal is still
   fixture-backed), so suppress the click affordances — no pointer, no
   hover lift, no press. */
.podium-card.is-static,
.legacy-row.is-static { cursor: default; }
.podium-card.is-static:active,
.legacy-row.is-static:active { transform: none; }
@media (prefers-reduced-motion: no-preference) {
  .podium-card.is-static:hover { transform: none; }
  .legacy-row.is-static:hover { transform: none; border-color: oklch(0.16 0.015 90); }
  .legacy-row-me.is-static:hover { border-color: oklch(0.78 0.18 92 / 0.55); }
}

/* Manager count — reconciles the 16-deep list with the 12-team pill. */
.legacy-context {
  margin: 10px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.98rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--ink-2);
}

/* The defined legacy formula, shown so the score is never a black box. */
.legacy-formula {
  margin: 4px 0 0;
  font-size: 0.72rem;
  letter-spacing: 0.03em;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}

/* The signed-in manager's own card — findable at a glance on a page
   that is explicitly "your league". Magenta ring stays distinct from
   the gold #1 treatment and the per-card accent borders. */
.podium-card-me {
  box-shadow: inset 0 0 0 2px oklch(0.72 0.16 330 / 0.85);
}

/* Column header above the tail, so the right-hand number stays labeled
   once the formula caption has scrolled out of view. */
.legacy-rows-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 22px 2px 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.legacy-rows-head-score { color: var(--ink-2); }
.podium-1 {
  order: 2;
  border-color: oklch(0.50 0.10 90);
  background:
    radial-gradient(ellipse at top, oklch(0.84 0.16 90 / 0.22), transparent 65%),
    linear-gradient(180deg, oklch(0.16 0.04 90), oklch(0.10 0.02 90));
  padding-top: 26px;
  padding-bottom: 22px;
  min-height: 260px;
}
.podium-2 { order: 1; border-color: oklch(0.30 0.012 90);
  background:
    radial-gradient(ellipse at top, color-mix(in oklch, var(--podium-accent) 14%, transparent), transparent 65%),
    linear-gradient(180deg, oklch(0.13 0.012 90), oklch(0.10 0.012 90));
  min-height: 220px;
}
.podium-3 { order: 3; border-color: oklch(0.30 0.06 50);
  background:
    radial-gradient(ellipse at top, color-mix(in oklch, var(--podium-accent) 12%, transparent), transparent 60%),
    linear-gradient(180deg, oklch(0.13 0.02 90), oklch(0.10 0.012 90));
  min-height: 200px;
}
.podium-rank-badge {
  position: absolute;
  top: 12px;
  left: 14px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 900;
  letter-spacing: 0.08em;
  color: var(--ink-3);
}
.podium-rank-1 { color: var(--gold); }
.podium-avatar {
  border-radius: 16px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  box-shadow: 0 10px 28px -12px oklch(0 0 0 / 0.6);
  margin-bottom: 8px;
}
.podium-avatar-1 { width: 80px; height: 80px; font-size: 1.4rem; border: 2px solid var(--gold); }
.podium-avatar-2 { width: 64px; height: 64px; font-size: 1.1rem; border: 2px solid var(--silver); }
.podium-avatar-3 { width: 56px; height: 56px; font-size: 1rem;   border: 2px solid var(--bronze); }
.podium-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.podium-score {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  line-height: 0.86;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  margin: 0 0 4px;
}
.podium-score-1 { font-size: 4rem; color: var(--gold); }
.podium-score-2 { font-size: 3rem; color: var(--silver); }
.podium-score-3 { font-size: 2.4rem; color: var(--bronze); }
.podium-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  line-height: 1.1;
  color: var(--ink-1);
  margin: 0 0 3px;
}
.podium-seasons {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 10px;
}
.podium-badges {
  list-style: none;
  padding: 0;
  margin: 0;
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}
.podium-badge {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-2);
  background: oklch(0.18 0.015 90 / 0.7);
  border: 1px solid oklch(0.22 0.015 90);
  padding: 3px 8px;
  border-radius: 999px;
}
.podium-badge-gold {
  color: var(--gold);
  border-color: oklch(0.50 0.12 90 / 0.5);
  background: oklch(0.84 0.16 90 / 0.10);
}
.podium-1-sub {
  margin: 12px 0 0;
  font-size: 0.8rem;
  color: var(--ink-3);
  max-width: 24ch;
}

.legacy-rows { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.legacy-row {
  display: grid;
  grid-template-columns: 28px 16px 36px minmax(160px, 1.8fr) minmax(0, 1.7fr) 70px;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 12px;
  cursor: pointer;
  color: inherit;
  font: inherit;
  text-align: left;
  width: 100%;
}
.legacy-row-me {
  border-color: oklch(0.78 0.18 92 / 0.55);
  background:
    linear-gradient(90deg, oklch(0.78 0.18 92 / 0.06), oklch(0.78 0.18 92 / 0)),
    oklch(0.10 0.015 90);
}
.legacy-row:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .legacy-row { transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1); }
  .legacy-row:hover { transform: translateY(-1px); border-color: oklch(0.30 0.015 90); }
}
.legacy-row:active { transform: scale(0.99); transition-duration: 100ms; }
.legacy-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1rem;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.legacy-mepin { color: oklch(0.84 0.16 90); display: inline-flex; align-items: center; }
.legacy-row:not(.legacy-row-me) .legacy-mepin { visibility: hidden; }
.legacy-avatar {
  width: 36px; height: 36px; border-radius: 9px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.78rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.legacy-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.legacy-meta { min-width: 0; }
.legacy-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.96rem;
  line-height: 1.1;
  color: var(--ink-1);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.legacy-seasons {
  font-size: 0.74rem;
  color: var(--ink-4);
  margin: 2px 0 0;
}
.legacy-badges {
  list-style: none; padding: 0; margin: 0;
  display: inline-flex; gap: 6px; flex-wrap: wrap;
}
.legacy-badge {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--ink-3);
  background: oklch(0.13 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  padding: 3px 7px;
  border-radius: 999px;
}
.legacy-badge-gold {
  color: var(--gold);
  border-color: oklch(0.50 0.12 90 / 0.5);
  background: oklch(0.84 0.16 90 / 0.08);
}
.legacy-score {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.4rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  text-align: right;
  letter-spacing: -0.005em;
}

@media (max-width: 720px) {
  .podium {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .podium-1, .podium-2, .podium-3 { order: 0; min-height: auto; }
  .legacy-row {
    grid-template-columns: 24px 0 32px minmax(0, 1fr) 60px;
    gap: 8px;
  }
  .legacy-mepin { display: none; }
  .legacy-badges { grid-column: 1 / -1; padding-left: 56px; }
}

/* ─── 4. TRENDS CHART ────────────────────────────────────────── */
.trends-chart-wrap {
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 14px;
  padding: 12px 8px 4px;
}
.trends-chart {
  width: 100%;
  height: 360px;
  display: block;
}
@media (max-width: 720px) {
  .trends-chart { height: 260px; }
}
.trends-grid line {
  stroke: oklch(0.18 0.015 90);
  stroke-width: 1;
  stroke-dasharray: 3 4;
}
.trends-xticks text {
  fill: var(--ink-4);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.trends-line-group.is-featured path { opacity: 0.92; }
.trends-line-group.is-dim path { opacity: 0.13; }
.trends-line-group.is-dim circle { opacity: 0.18; }
.trends-line-group.is-me path { opacity: 1; }
.trends-endlabels text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.trends-annot-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ─── 5. H2H MATRIX ──────────────────────────────────────────── */
.h2h-matrix-wrap {
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 14px;
  padding: 14px;
  overflow-x: auto;
}
.h2h-matrix {
  border-collapse: separate;
  border-spacing: 4px;
  width: 100%;
  min-width: 820px;
}
.h2h-corner { width: 180px; }
.h2h-col-head {
  padding: 2px 0;
  text-align: center;
}
.h2h-col-avatar, .h2h-row-avatar {
  width: 30px; height: 30px;
  border-radius: 8px;
  display: inline-grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.72rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  vertical-align: middle;
}
.h2h-col-avatar-img, .h2h-row-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.h2h-row-head {
  text-align: left;
  font-weight: 600;
  padding-right: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.h2h-row-me .h2h-row-name { color: oklch(0.84 0.16 90); }
.h2h-row-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.84rem;
  color: var(--ink-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}
.h2h-cell {
  text-align: center;
  padding: 0;
}
.h2h-cell-self {
  display: inline-block;
  width: 100%;
  padding: 12px 0;
  color: var(--ink-3);
  font-weight: 700;
}
.h2h-cell-btn {
  width: 100%;
  height: 46px;
  display: grid;
  place-items: center;
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 6px;
  background: oklch(0.12 0.015 90);
  font-family: 'Barlow Condensed', sans-serif;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  padding: 0 2px;
  gap: 1px;
}
.h2h-cell-rec {
  font-weight: 800;
  font-size: 0.8rem;
}
.h2h-cell-diff {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--ink-3);
}
.h2h-cell-win .h2h-cell-btn {
  background: color-mix(in oklch, oklch(0.74 0.18 145) calc(var(--cell-tint, 0) * 32%), oklch(0.12 0.015 90));
  border-color: oklch(0.74 0.18 145 / 0.4);
}
.h2h-cell-win .h2h-cell-diff { color: oklch(0.74 0.18 145); }
.h2h-cell-loss .h2h-cell-btn {
  background: color-mix(in oklch, oklch(0.70 0.27 350) calc(var(--cell-tint, 0) * 32%), oklch(0.12 0.015 90));
  border-color: oklch(0.70 0.27 350 / 0.4);
}
.h2h-cell-loss .h2h-cell-diff { color: oklch(0.70 0.27 350); }
.h2h-cell-even .h2h-cell-btn { background: oklch(0.14 0.015 90); }
.h2h-cell-btn:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 1px; }
@media (prefers-reduced-motion: no-preference) {
  .h2h-cell-btn { transition: transform 140ms cubic-bezier(0.22, 1, 0.36, 1), border-color 140ms cubic-bezier(0.22, 1, 0.36, 1); }
  @media (hover: hover) and (pointer: fine) {
    .h2h-cell-btn:hover { transform: scale(1.04); border-color: oklch(0.40 0.015 90); }
  }
}
.h2h-cell-btn:active { transform: scale(0.98); transition-duration: 100ms; }

/* ─── 6. DYNASTIES ───────────────────────────────────────────── */
.dyn-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 14px;
}
.dyn-card {
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 16px;
  padding: 20px 22px;
}
.dyn-hitting {
  background:
    linear-gradient(135deg, oklch(0.74 0.18 145 / 0.06), oklch(0.10 0.015 90) 60%);
  border-left: 3px solid var(--accent-up);
}
.dyn-pitching {
  background:
    linear-gradient(135deg, oklch(0.72 0.18 195 / 0.08), oklch(0.10 0.015 90) 60%);
  border-left: 3px solid var(--accent-tertiary);
}
.dyn-punt {
  grid-column: 1 / -1;
  border-left: 3px solid var(--accent-secondary);
  background:
    linear-gradient(90deg, oklch(0.70 0.27 350 / 0.06), transparent 60%),
    oklch(0.10 0.015 90);
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 20px;
  align-items: center;
  padding: 22px 24px;
}
.dyn-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 800;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--accent-up);
  margin: 0 0 10px;
}
.dyn-pitching .dyn-eyebrow { color: var(--accent-tertiary); }
.dyn-eyebrow-punt { color: var(--accent-secondary) !important; }

.dyn-body {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 18px;
  align-items: center;
}
.dyn-text { min-width: 0; }
.dyn-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.3rem;
  line-height: 1.1;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0 0 8px;
}
.dyn-prose {
  font-size: 0.94rem;
  color: var(--ink-2);
  line-height: 1.5;
  margin: 0;
  max-width: 56ch;
}
.dyn-avatar {
  width: 56px; height: 56px;
  border-radius: 14px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.1rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  box-shadow: 0 10px 28px -14px oklch(0 0 0 / 0.6);
  margin-bottom: 14px;
}
.dyn-avatar-md { width: 80px; height: 80px; font-size: 1.4rem; margin-bottom: 0; }
.dyn-avatar-lg { width: 92px; height: 92px; font-size: 1.6rem; margin-bottom: 0; }
.dyn-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }

.dyn-foot {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding-top: 12px;
  border-top: 1px dashed oklch(0.18 0.015 90);
}
.dyn-cats {
  list-style: none; padding: 0; margin: 0;
  display: inline-flex; gap: 4px;
}
.dyn-cat-chip {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid;
}
.dyn-cat-chip-hit {
  color: var(--accent-up);
  border-color: oklch(0.74 0.18 145 / 0.4);
  background: oklch(0.74 0.18 145 / 0.08);
}
.dyn-cat-chip-pit {
  color: var(--accent-tertiary);
  border-color: oklch(0.72 0.18 195 / 0.4);
  background: oklch(0.72 0.18 195 / 0.08);
}
.dyn-stat { margin: 0; text-align: right; }
.dyn-stat-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.6rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  display: block;
  line-height: 1;
}
.dyn-stat-lbl {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-4);
}

/* Punt card right side */
.dyn-punt-side { min-width: 0; }
.dyn-punt-meta {
  display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
  text-align: right;
}
.dyn-mega {
  margin: 8px 0 0;
  display: flex; align-items: baseline; gap: 6px;
}
.dyn-mega-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(3.6rem, 9vw, 5rem);
  line-height: 0.86;
  letter-spacing: -0.02em;
  color: var(--accent-secondary);
  font-variant-numeric: tabular-nums;
}
.dyn-mega-lbl {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.86rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
}
.dyn-mega-trail {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 0;
}

@media (max-width: 720px) {
  .dyn-grid { grid-template-columns: 1fr; }
  .dyn-body { grid-template-columns: 1fr; gap: 14px; }
  .dyn-punt { grid-template-columns: 1fr; }
  .dyn-punt-meta { align-items: flex-start; text-align: left; }
}

/* ─── 7. AWARDS ──────────────────────────────────────────────── */
.awards-filters {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  margin-bottom: 18px;
}
.awards-filter {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-3);
  background: transparent;
  border: none;
  padding: 5px 14px;
  border-radius: 999px;
  cursor: pointer;
}
.awards-filter-active {
  background: oklch(0.18 0.015 90);
  color: var(--ink-1);
}
.awards-filter:active { transform: scale(0.97); transition-duration: 100ms; }
.awards-filter:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

.awards-years {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  margin-left: 4px;
  flex-wrap: wrap;
}
.awards-years-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-4);
  margin-right: 6px;
}
.awards-year {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.86rem;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: var(--ink-3);
  background: transparent;
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 999px;
  padding: 4px 12px;
  cursor: pointer;
}
.awards-year:hover { color: var(--ink-1); border-color: oklch(0.30 0.018 90); }
.awards-year:active { transform: scale(0.99); transition-duration: 100ms; }
.awards-year:focus-visible { outline: 2px solid var(--accent-secondary); outline-offset: 2px; }
.awards-year-active {
  color: oklch(0.10 0.012 90);
  background: var(--accent-secondary);
  border-color: var(--accent-secondary);
}

.awards-sub {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.86rem; font-weight: 800;
  letter-spacing: 0.18em; text-transform: uppercase;
  margin: 26px 0 12px;
}
.awards-sub-fame  { color: var(--accent-up); }
.awards-sub-shame { color: var(--accent-secondary); }

.fame-grid, .shame-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.fame-a { grid-column: 1 / -1; }
.fame-d { grid-column: 1 / -1; }
.shame-c { grid-column: 1 / -1; }
.shame-d { grid-column: 1 / -1; }

.fame-a, .fame-b, .fame-c, .fame-d,
.shame-a, .shame-b, .shame-c, .shame-d {
  text-align: left;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 14px;
  padding: 16px 18px;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.fame-a, .fame-b, .fame-c, .fame-d { border-left: 3px solid var(--accent-up); }
.shame-a, .shame-b, .shame-c, .shame-d { border-left: 3px solid var(--accent-secondary); }
.fame-a:focus-visible, .fame-b:focus-visible, .fame-c:focus-visible, .fame-d:focus-visible,
.shame-a:focus-visible, .shame-b:focus-visible, .shame-c:focus-visible, .shame-d:focus-visible {
  outline: 2px solid var(--accent-primary); outline-offset: 2px;
}
@media (prefers-reduced-motion: no-preference) {
  .fame-a, .fame-b, .fame-c, .fame-d,
  .shame-a, .shame-b, .shame-c, .shame-d {
    transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .fame-a:hover, .fame-b:hover, .fame-c:hover, .fame-d:hover { transform: translateY(-1px); border-color: oklch(0.30 0.015 90); border-left-color: var(--accent-up); }
  .shame-a:hover, .shame-b:hover, .shame-c:hover, .shame-d:hover { transform: translateY(-1px); border-color: oklch(0.30 0.015 90); border-left-color: var(--accent-secondary); }
}
.fame-a:active, .fame-b:active, .fame-c:active, .fame-d:active,
.shame-a:active, .shame-b:active, .shame-c:active, .shame-d:active {
  transform: scale(0.99); transition-duration: 100ms;
}

.fame-tile-eyebrow, .fame-a-eyebrow, .fame-d-eyebrow,
.shame-tile-eyebrow, .shame-c-eyebrow, .shame-d-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  display: block;
  margin-bottom: 8px;
}
.fame-tile-eyebrow, .fame-a-eyebrow, .fame-d-eyebrow { color: var(--accent-up); }
.shame-tile-eyebrow, .shame-c-eyebrow, .shame-d-eyebrow { color: var(--accent-secondary); }

.fame-a {
  background:
    radial-gradient(ellipse at right, oklch(0.74 0.18 145 / 0.08), transparent 60%),
    oklch(0.10 0.015 90);
}
.fame-a-body {
  display: flex;
  align-items: center;
  gap: 22px;
  justify-content: space-between;
  flex-wrap: wrap;
}
.fame-a-id { display: flex; align-items: center; gap: 12px; }
.fame-a-avatar {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.fame-a-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fame-a-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.1rem;
  color: var(--ink-1);
  margin: 0;
}
.fame-a-when {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-3);
  margin: 2px 0 0;
}
.fame-a-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(3.4rem, 9vw, 5rem);
  line-height: 0.86;
  letter-spacing: -0.02em;
  color: var(--accent-up);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.fame-a-trail {
  margin: 12px 0 0;
  font-size: 0.86rem;
  color: var(--ink-3);
}

.fame-b-mid {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
  margin-bottom: 8px;
}
.fame-b-avatar {
  width: 40px; height: 40px; border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.92rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.fame-b-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fame-b-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.96rem;
  color: var(--ink-1);
  margin: 0;
}
.fame-b-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.4rem;
  line-height: 0.9;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.fame-b-sub {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
  margin: 4px 0 0;
}

.fame-c {
  background:
    linear-gradient(135deg, oklch(0.14 0.04 145 / 0.18), oklch(0.10 0.015 90) 70%);
}
.fame-c-row { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.fame-c-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.6rem;
  line-height: 0.86;
  color: var(--accent-up);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.fame-c-id { display: inline-flex; align-items: center; gap: 8px; }
.fame-c-avatar {
  width: 32px; height: 32px; border-radius: 8px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.78rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.fame-c-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fame-c-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800; font-size: 0.92rem;
  color: var(--ink-1);
  margin: 0;
}
.fame-c-sub {
  font-size: 0.82rem;
  color: var(--ink-3);
  margin: 10px 0 0;
}

.fame-d { padding: 12px 16px; display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.fame-d-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.96rem;
  color: var(--ink-2);
  margin: 0;
}
.fame-d-text strong { color: var(--ink-1); font-weight: 900; }
.fame-d-pct { color: var(--accent-up); font-weight: 900; }
.fame-d-rec { color: var(--ink-3); }
.fame-d-dot { color: var(--ink-5); margin: 0 6px; }

.shame-a-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 3.4rem;
  line-height: 0.86;
  letter-spacing: -0.02em;
  color: var(--accent-secondary);
  font-variant-numeric: tabular-nums;
  margin: 0 0 12px;
}
.shame-a-foot { display: flex; align-items: center; gap: 10px; }
.shame-a-avatar {
  width: 40px; height: 40px; border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.92rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.shame-a-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.shame-a-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.96rem;
  color: var(--ink-1);
  margin: 0;
}
.shame-a-when {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-3);
  margin: 2px 0 0;
}

.shame-b-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.shame-b-text { min-width: 0; }
.shame-b-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.6rem;
  line-height: 0.86;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.shame-b-sub {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
  margin: 4px 0 6px;
}
.shame-b-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.96rem;
  color: var(--ink-2);
  margin: 0;
}
.shame-b-avatar {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  flex-shrink: 0;
}
.shame-b-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }

.shame-c { padding: 14px 18px; }
.shame-c-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.05rem;
  color: var(--ink-2);
  margin: 0;
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px;
}
.shame-c-text strong { color: var(--ink-1); font-weight: 900; }
.shame-c-value {
  font-weight: 900;
  font-size: 1.5rem;
  color: var(--accent-secondary);
  font-variant-numeric: tabular-nums;
}
.shame-c-trail { color: var(--ink-3); font-weight: 600; font-size: 0.92rem; }
.shame-c-dot { color: var(--ink-5); margin: 0 6px; }

.shame-d { padding: 12px 16px; display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.shame-d-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.96rem;
  color: var(--ink-2);
  margin: 0;
}
.shame-d-text strong { color: var(--ink-1); font-weight: 900; }
.shame-d-pct { color: var(--accent-secondary); font-weight: 900; }
.shame-d-rec { color: var(--ink-3); }
.shame-d-dot { color: var(--ink-5); margin: 0 6px; }

@media (max-width: 720px) {
  .fame-grid, .shame-grid { grid-template-columns: 1fr; }
  .fame-a-value { font-size: 3rem; }
  .shame-a-value { font-size: 2.8rem; }
}

/* ─── 8. CAREER TABLE ────────────────────────────────────────── */
.career-table-wrap {
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 14px;
  padding: 6px 0;
  overflow-x: auto;
}
.career-table {
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;
}
.career-table thead th {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
  text-align: left;
  padding: 12px 12px;
  border-bottom: 1px solid oklch(0.18 0.015 90);
  white-space: nowrap;
}
.career-table thead th.th-num,
.career-table thead th.th-cat { text-align: right; }
.career-table tbody tr { border-bottom: 1px solid oklch(0.14 0.015 90); }
.career-table tbody tr:last-child { border-bottom: none; }
.career-row-me {
  background:
    linear-gradient(90deg, oklch(0.78 0.18 92 / 0.06), oklch(0.78 0.18 92 / 0)),
    transparent;
}
.career-table .td-team { padding: 0 12px; text-align: left; font-weight: inherit; }
.career-row-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  padding: 10px 0;
  text-align: left;
}
.career-row-btn:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
.career-avatar {
  width: 32px; height: 32px; border-radius: 8px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.78rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.career-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.career-team-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.94rem;
  color: var(--ink-1);
  white-space: nowrap;
}
.career-table .td-num {
  padding: 10px 12px;
  text-align: right;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.career-table .td-cat {
  padding: 10px 12px;
  text-align: right;
}
.career-table .td-pos { color: var(--accent-up); }
.career-table .td-neg { color: var(--accent-secondary); }
.career-title-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  padding: 2px 6px;
  border-radius: 6px;
  background: oklch(0.84 0.16 90 / 0.14);
  color: var(--gold);
  font-weight: 900;
  font-size: 0.86rem;
}
.career-dash { color: var(--ink-5); }
.career-cat-chip {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 900;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid;
  font-variant-numeric: tabular-nums;
}
.career-cat-best {
  color: var(--accent-up);
  border-color: oklch(0.74 0.18 145 / 0.4);
  background: oklch(0.74 0.18 145 / 0.08);
}
.career-cat-worst {
  color: var(--accent-secondary);
  border-color: oklch(0.70 0.27 350 / 0.4);
  background: oklch(0.70 0.27 350 / 0.08);
}

/* ─── 9. FOOTNOTES ───────────────────────────────────────────── */
.pills {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex; flex-wrap: wrap; gap: 8px;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 999px;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  font-size: 0.84rem;
  color: var(--ink-2);
}
.pill-dot { width: 8px; height: 8px; border-radius: 50%; }
.pill-dot-gold { background: var(--gold); }
.pill-dot-secondary { background: var(--accent-secondary); }
.pill-dot-tertiary { background: var(--accent-tertiary); }
.pill-dot-mute { background: var(--ink-4); }
.pill-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-3);
}
.pill-value { color: var(--ink-1); font-weight: 600; }
</style>

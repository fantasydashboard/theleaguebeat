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
        <p class="section-sub">Where every team finished, season by season. Top three and your team in color; the rest dimmed. 2026 is the current standings.</p>
      </header>

      <div class="bump-wrap">
        <svg
          class="bump-chart"
          :viewBox="`0 0 ${TX_W} ${TX_H}`"
          preserveAspectRatio="none"
          role="img"
          aria-label="Finish position by season for each manager"
        >
          <!-- faint rank gridlines -->
          <g class="bump-grid">
            <line v-for="r in bumpMaxRank" :key="`r-${r}`"
              :x1="TX_PAD_L" :y1="yForRank(r)" :x2="TX_W - TX_PAD_R" :y2="yForRank(r)" />
          </g>
          <!-- year ticks -->
          <g class="bump-xticks">
            <text v-for="(y, i) in trendYears" :key="`yr-${y}`"
              :x="xFor(i)" :y="TX_H - 8" text-anchor="middle">{{ y }}</text>
          </g>
          <!-- dimmed connectors -->
          <path v-for="s in dimBump" :key="`dim-${s.key}`"
            :d="s.path" class="bump-line-dim" fill="none" />
          <!-- featured lines -->
          <path v-for="s in featuredBump" :key="`line-${s.key}`"
            :d="s.path" :stroke="s.lineColor"
            class="bump-line" :class="{ 'is-me': s.isMyTeam }"
            fill="none" stroke-linejoin="round" stroke-linecap="round" />
        </svg>

        <!-- y-axis hints -->
        <span class="bump-axis bump-axis-top">1st</span>
        <span class="bump-axis bump-axis-bot">{{ bumpMaxRank }}th</span>

        <!-- HTML overlay: logo nodes for featured, faint dots for the rest -->
        <div class="bump-overlay">
          <template v-for="s in dimBump" :key="`ddots-${s.key}`">
            <span v-for="nd in s.displayNodes" :key="`dd-${s.key}-${nd.i}`"
              class="bump-dot-dim" :style="{ left: nd.xPct + '%', top: nd.yPct + '%' }" />
          </template>
          <template v-for="s in featuredBump" :key="`fnodes-${s.key}`">
            <div v-for="nd in s.displayNodes" :key="`fn-${s.key}-${nd.i}`"
              class="bump-node" :class="{ 'is-me': s.isMyTeam }"
              :style="{ left: nd.xPct + '%', top: nd.yPct + '%', '--node-accent': s.lineColor } as any">
              <div class="bump-node-avatar" :style="{ background: `linear-gradient(135deg, ${s.avatarColor})` }">
                <img v-if="s.logoUrl" :src="s.logoUrl" alt="" />
                <span v-else>{{ s.ownerInitials }}</span>
              </div>
            </div>
          </template>
          <span v-for="lbl in bumpLabels" :key="`lbl-${lbl.key}`"
            class="bump-label" :style="{ left: lbl.xPct + '%', top: lbl.yPct + '%', color: lbl.color }">{{ lbl.name }}</span>
        </div>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         SECTION 5 — ALL-TIME SERIES (H2H matrix)
    ────────────────────────────────────────────────────────────── -->
    <section class="h2h" aria-labelledby="h2h-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="h2h-heading">The rivalries</p>
        <h2 class="section-headline">Who owns who.</h2>
        <p class="section-sub">Head-to-head from this season's matchups.</p>
      </header>

      <div v-if="rivalries.length" class="rivalry-grid">
        <article
          v-for="r in rivalries"
          :key="r.kind"
          class="rivalry-card"
          :class="{ 'rivalry-card-me': r.kind !== 'blowout' }"
        >
          <p class="rivalry-eyebrow">{{ r.eyebrow }}</p>

          <div class="rivalry-faces">
            <div class="rivalry-face">
              <div
                class="rivalry-avatar"
                :class="{ 'rivalry-avatar-me': getTeam(r.leftId).isMyTeam }"
                :style="{ background: `linear-gradient(135deg, ${getTeam(r.leftId).avatarColor})` }"
              >
                <img v-if="getTeam(r.leftId).avatarUrl" :src="getTeam(r.leftId).avatarUrl" alt="" />
                <span v-else>{{ getTeam(r.leftId).ownerInitials }}</span>
              </div>
              <p class="rivalry-name">{{ getTeam(r.leftId).name }}</p>
            </div>

            <p class="rivalry-record">
              {{ r.leftWins }}<span class="rivalry-dash">–</span>{{ r.rightWins }}<span v-if="r.ties" class="rivalry-ties">–{{ r.ties }}</span>
            </p>

            <div class="rivalry-face">
              <div
                class="rivalry-avatar"
                :class="{ 'rivalry-avatar-me': getTeam(r.rightId).isMyTeam }"
                :style="{ background: `linear-gradient(135deg, ${getTeam(r.rightId).avatarColor})` }"
              >
                <img v-if="getTeam(r.rightId).avatarUrl" :src="getTeam(r.rightId).avatarUrl" alt="" />
                <span v-else>{{ getTeam(r.rightId).ownerInitials }}</span>
              </div>
              <p class="rivalry-name">{{ getTeam(r.rightId).name }}</p>
            </div>
          </div>

          <p class="rivalry-meta">
            <span v-if="r.dominantCatDiff > 0">+{{ r.dominantCatDiff }} cats</span>
            <span v-if="r.dominantCatDiff > 0" class="rivalry-dot" aria-hidden="true">·</span>
            <span>{{ r.meetings }} meeting{{ r.meetings === 1 ? '' : 's' }}</span>
          </p>
          <p class="rivalry-caption">{{ r.caption }}</p>
        </article>
      </div>

      <p v-else class="rivalry-empty">Head-to-head meetings haven't been logged yet this season.</p>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         SECTION 6 — THE CATEGORY DYNASTIES (category-specific)
    ────────────────────────────────────────────────────────────── -->
    <section class="dynasties" aria-labelledby="dynasties-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="dynasties-heading">Category crowns</p>
        <h2 class="section-headline">Who rules each cat.</h2>
        <p class="section-sub">This season's category leaders. Moves every week.</p>
      </header>

      <div v-if="categoryCrowns.length" class="crown-grid">
        <article
          v-for="c in categoryCrowns"
          :key="c.kind"
          class="crown-card"
          :class="`crown-${c.kind}`"
        >
          <p class="crown-eyebrow">{{ c.eyebrow }}</p>
          <div class="crown-id">
            <div
              class="crown-avatar"
              :class="{ 'crown-avatar-me': getTeam(c.teamId).isMyTeam }"
              :style="{ background: `linear-gradient(135deg, ${getTeam(c.teamId).avatarColor})` }"
            >
              <img v-if="getTeam(c.teamId).avatarUrl" :src="getTeam(c.teamId).avatarUrl" alt="" />
              <span v-else>{{ getTeam(c.teamId).ownerInitials }}</span>
            </div>
            <p class="crown-name">{{ getTeam(c.teamId).name }}</p>
          </div>
          <p class="crown-count">
            <span class="crown-num">{{ c.count }}</span>
            <span class="crown-label">{{ c.kind === 'punt' ? 'cats in the cellar' : 'cats led' }}</span>
          </p>
          <ul v-if="c.cats.length" class="crown-cats" role="list">
            <li v-for="cat in c.cats" :key="cat" class="crown-cat-chip" :class="`crown-cat-${c.kind}`">{{ cat }}</li>
          </ul>
          <p class="crown-caption">{{ c.caption }}</p>
        </article>
      </div>

      <p v-else class="crown-empty">Category leaders post once the season's first matchups settle.</p>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         SECTION 7 — THE RECORD BOOK (Hall of Fame / Shame)
    ────────────────────────────────────────────────────────────── -->
    <section class="awards" aria-labelledby="awards-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta" id="awards-heading">The record book</p>
        <h2 class="section-headline">Hall of Fame. Hall of Shame.</h2>
        <p class="section-sub">All-time, across every season the league has played.</p>
      </header>

      <!-- HALL OF FAME -->
      <h3 class="awards-sub awards-sub-fame">Hall of Fame</h3>
      <div class="fame-grid">
        <button type="button" class="fame-a"
          @click="onRecordClick(fameEntries[0])"
          :aria-label="`${fameEntries[0].eyebrow}: ${fameEntries[0].name} ${fameEntries[0].value}`">
          <span class="fame-a-eyebrow">{{ fameEntries[0].eyebrow }}</span>
          <div class="fame-a-body">
            <div class="fame-a-id">
              <div class="fame-a-avatar" :style="{ background: `linear-gradient(135deg, ${fameEntries[0].avatarColor})` }">
                <img v-if="fameEntries[0].avatarUrl" :src="fameEntries[0].avatarUrl" alt="" />
                <span v-else>{{ fameEntries[0].ownerInitials }}</span>
              </div>
              <div class="fame-a-id-text">
                <p class="fame-a-team">{{ fameEntries[0].name }}</p>
                <p class="fame-a-when">{{ fameEntries[0].metric }}</p>
              </div>
            </div>
            <p class="fame-a-value">{{ fameEntries[0].value }}</p>
          </div>
          <p v-if="fameEntries[0].context" class="fame-a-trail">{{ fameEntries[0].context }}</p>
        </button>

        <button type="button" class="fame-b"
          @click="onRecordClick(fameEntries[1])"
          :aria-label="`${fameEntries[1].eyebrow}: ${fameEntries[1].name} ${fameEntries[1].value}`">
          <span class="fame-tile-eyebrow">{{ fameEntries[1].eyebrow }}</span>
          <div class="fame-b-mid">
            <div class="fame-b-avatar" :style="{ background: `linear-gradient(135deg, ${fameEntries[1].avatarColor})` }">
              <img v-if="fameEntries[1].avatarUrl" :src="fameEntries[1].avatarUrl" alt="" />
              <span v-else>{{ fameEntries[1].ownerInitials }}</span>
            </div>
            <p class="fame-b-team">{{ fameEntries[1].name }}</p>
          </div>
          <p class="fame-b-value">{{ fameEntries[1].value }}</p>
          <p class="fame-b-sub">{{ fameEntries[1].metric }}</p>
        </button>

        <button type="button" class="fame-c"
          @click="onRecordClick(fameEntries[2])"
          :aria-label="`${fameEntries[2].eyebrow}: ${fameEntries[2].name} ${fameEntries[2].value}`">
          <span class="fame-tile-eyebrow">{{ fameEntries[2].eyebrow }}</span>
          <div class="fame-c-row">
            <p class="fame-c-value">{{ fameEntries[2].value }}</p>
            <div class="fame-c-id">
              <div class="fame-c-avatar" :style="{ background: `linear-gradient(135deg, ${fameEntries[2].avatarColor})` }">
                <img v-if="fameEntries[2].avatarUrl" :src="fameEntries[2].avatarUrl" alt="" />
                <span v-else>{{ fameEntries[2].ownerInitials }}</span>
              </div>
              <p class="fame-c-team">{{ fameEntries[2].name }}</p>
            </div>
          </div>
          <p v-if="fameEntries[2].context" class="fame-c-sub">{{ fameEntries[2].context }}</p>
        </button>

        <button type="button" class="fame-d"
          @click="onRecordClick(fameEntries[3])"
          :aria-label="`${fameEntries[3].eyebrow}: ${fameEntries[3].name} ${fameEntries[3].value}`">
          <span class="fame-d-eyebrow">{{ fameEntries[3].eyebrow }}</span>
          <p class="fame-d-text">
            <strong>{{ fameEntries[3].name }}</strong>
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
          :aria-label="`${shameEntries[0].eyebrow}: ${shameEntries[0].name} ${shameEntries[0].value}`">
          <span class="shame-tile-eyebrow">{{ shameEntries[0].eyebrow }}</span>
          <p class="shame-a-value">{{ shameEntries[0].value }}</p>
          <div class="shame-a-foot">
            <div class="shame-a-avatar" :style="{ background: `linear-gradient(135deg, ${shameEntries[0].avatarColor})` }">
              <img v-if="shameEntries[0].avatarUrl" :src="shameEntries[0].avatarUrl" alt="" />
              <span v-else>{{ shameEntries[0].ownerInitials }}</span>
            </div>
            <div>
              <p class="shame-a-team">{{ shameEntries[0].name }}</p>
              <p class="shame-a-when">{{ shameEntries[0].metric }}</p>
            </div>
          </div>
        </button>

        <button type="button" class="shame-b"
          @click="onRecordClick(shameEntries[1])"
          :aria-label="`${shameEntries[1].eyebrow}: ${shameEntries[1].name} ${shameEntries[1].value}`">
          <span class="shame-tile-eyebrow">{{ shameEntries[1].eyebrow }}</span>
          <div class="shame-b-row">
            <div class="shame-b-text">
              <p class="shame-b-value">{{ shameEntries[1].value }}</p>
              <p class="shame-b-sub">{{ shameEntries[1].metric }}</p>
              <p class="shame-b-team">{{ shameEntries[1].name }}</p>
            </div>
            <div class="shame-b-avatar" :style="{ background: `linear-gradient(135deg, ${shameEntries[1].avatarColor})` }">
              <img v-if="shameEntries[1].avatarUrl" :src="shameEntries[1].avatarUrl" alt="" />
              <span v-else>{{ shameEntries[1].ownerInitials }}</span>
            </div>
          </div>
        </button>

        <button type="button" class="shame-c"
          @click="onRecordClick(shameEntries[2])"
          :aria-label="`${shameEntries[2].eyebrow}: ${shameEntries[2].name} ${shameEntries[2].value}`">
          <span class="shame-c-eyebrow">{{ shameEntries[2].eyebrow }}</span>
          <p class="shame-c-text">
            <strong>{{ shameEntries[2].name }}</strong>
            <span class="shame-c-dot" aria-hidden="true">·</span>
            <span class="shame-c-value">{{ shameEntries[2].value }}</span>
            <span class="shame-c-dot" aria-hidden="true">·</span>
            <span class="shame-c-trail">{{ shameEntries[2].context || shameEntries[2].metric }}</span>
          </p>
        </button>

        <button type="button" class="shame-d"
          @click="onRecordClick(shameEntries[3])"
          :aria-label="`${shameEntries[3].eyebrow}: ${shameEntries[3].name} ${shameEntries[3].value}`">
          <span class="shame-d-eyebrow">{{ shameEntries[3].eyebrow }}</span>
          <p class="shame-d-text">
            <strong>{{ shameEntries[3].name }}</strong>
            <span class="shame-d-dot" aria-hidden="true">·</span>
            <span class="shame-d-pct">{{ shameEntries[3].value }}</span>
            <span v-if="shameEntries[3].context" class="shame-d-dot" aria-hidden="true">·</span>
            <span v-if="shameEntries[3].context" class="shame-d-rec">{{ shameEntries[3].context }}</span>
          </p>
        </button>
      </div>
    </section>

    <!-- Modals -->
    <CategoryTeamLegacyModal
      v-if="activeLegacyTeamId"
      :team-id="activeLegacyTeamId"
      @close="activeLegacyTeamId = null"
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
  recordBook,
  categoryDynastyBeats,
  type CategoryRecordBookEntry,
} from '@/fixtures/categoriesLeague'
import CategoryTeamLegacyModal from '@/components/demo/CategoryTeamLegacyModal.vue'
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

/* ─── Category crowns — this season's per-cat leaders ──────────
   The old "dynasties" beat needed per-category history every season
   (which cat each team won), data we don't fetch for past years. So
   this is the honest, *current-season* version, built from the live
   categoryRanks the adapter already computes: who leads the most
   hitting cats, the most pitching cats, and who's stuck in the cellar.
   It moves every week — a freshness beat as well as a real one.
   Demo route maps the fixture dynasty beats into the same shape. */
interface CrownBeat {
  kind: 'bats' | 'arms' | 'punt'
  eyebrow: string
  teamId: string
  count: number
  cats: string[]
  caption: string
}

const categoryCrowns = computed<CrownBeat[]>(() => {
  const data = liveData.value
  if (data && data.categoryRanks?.length) {
    const numTeams = data.teams.length
    const sideOf = new Map(data.categories.map((c) => [c.id, c.side]))
    const labelOf = new Map(data.categories.map((c) => [c.id, c.label]))
    type Tally = { teamId: string; hitLed: string[]; pitLed: string[]; punted: string[] }
    const tallies: Tally[] = data.categoryRanks.map((cr) => {
      const hitLed: string[] = []
      const pitLed: string[] = []
      const punted: string[] = []
      for (const [catId, rank] of Object.entries(cr.catRanks)) {
        const lbl = labelOf.get(catId) ?? catId
        if (rank === 1) {
          if (sideOf.get(catId) === 'hit') hitLed.push(lbl)
          else if (sideOf.get(catId) === 'pit') pitLed.push(lbl)
        }
        if (numTeams > 0 && rank >= numTeams) punted.push(lbl)
      }
      return { teamId: cr.teamId, hitLed, pitLed, punted }
    })
    const bats = [...tallies].sort((a, b) => b.hitLed.length - a.hitLed.length)[0]
    const arms = [...tallies].sort((a, b) => b.pitLed.length - a.pitLed.length)[0]
    const punt = [...tallies].sort((a, b) => b.punted.length - a.punted.length)[0]
    const out: CrownBeat[] = []
    if (bats && bats.hitLed.length > 0) {
      out.push({
        kind: 'bats', eyebrow: 'The bats', teamId: bats.teamId,
        count: bats.hitLed.length, cats: bats.hitLed,
        caption: `${getTeam(bats.teamId).name} leads the league in ${bats.hitLed.length} hitting cat${bats.hitLed.length === 1 ? '' : 's'} this season.`,
      })
    }
    if (arms && arms.pitLed.length > 0) {
      out.push({
        kind: 'arms', eyebrow: 'The arms', teamId: arms.teamId,
        count: arms.pitLed.length, cats: arms.pitLed,
        caption: `${getTeam(arms.teamId).name} owns the mound, fronting ${arms.pitLed.length} pitching cat${arms.pitLed.length === 1 ? '' : 's'}.`,
      })
    }
    if (punt && punt.punted.length > 0) {
      out.push({
        kind: 'punt', eyebrow: 'The punt', teamId: punt.teamId,
        count: punt.punted.length, cats: punt.punted,
        caption: `${getTeam(punt.teamId).name} sits dead last in ${punt.punted.length} cat${punt.punted.length === 1 ? '' : 's'}. The line nobody wants.`,
      })
    }
    return out
  }
  // Demo fallback — map fixture dynasty beats into crown beats.
  const fxMeta: Record<string, { kind: CrownBeat['kind']; eyebrow: string }> = {
    'hitting-king': { kind: 'bats', eyebrow: 'The bats' },
    'pitching-king': { kind: 'arms', eyebrow: 'The arms' },
    'punt-kings': { kind: 'punt', eyebrow: 'The punt' },
  }
  return categoryDynastyBeats.map((b) => {
    const meta = fxMeta[b.kind] ?? { kind: 'bats' as const, eyebrow: 'The bats' }
    return {
      kind: meta.kind,
      eyebrow: meta.eyebrow,
      teamId: b.teamId,
      count: b.cats?.length ?? 0,
      cats: b.cats ?? [],
      caption: b.body || b.headline || '',
    }
  })
})

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

/* ─── Across the years — finish-position bump chart ──────────────
   The page already ranks managers two ways (champions, legacy). The one
   thing those can't show is *movement*: who climbed, who fell, who won
   the founding year and vanished. So this plots each manager's FINISH
   (1 = top) per season — lines cross as teams pass each other, logos sit
   at every node. Featured = top-3 by legacy + you; the rest are faint
   connectors. Real ranks from managerLegacy.seasons; the demo derives a
   finish order from fixture cumulative volume. */
const TX_W = 1000
const TX_H = 380
const TX_PAD_L = 64           // room for the "1ST" y-axis label
const TX_PAD_R = 96
const TX_PAD_T = 26
const TX_PAD_B = 52           // keeps last-place logo nodes off the year ticks
const trendGold = 'oklch(0.84 0.16 90)'

interface BumpRawNode { i: number; rank: number }
interface BumpRaw {
  key: string
  name: string
  logoUrl?: string
  avatarColor: string
  ownerInitials: string
  isMyTeam: boolean
  featured: boolean
  nodes: BumpRawNode[]
}

const trendYears = computed<number[]>(() => {
  const live = liveData.value?.managerLegacy
  if (live && live.length) {
    const ys = new Set<number>()
    for (const m of live) for (const s of m.seasons) ys.add(s.year)
    return [...ys].sort((a, b) => a - b)
  }
  return [2021, 2022, 2023, 2024, 2025, 2026]
})

const bumpRaw = computed<BumpRaw[]>(() => {
  const years = trendYears.value
  const live = liveData.value?.managerLegacy
  if (live && live.length) {
    return live.map((m) => {
      const nodes: BumpRawNode[] = []
      years.forEach((yr, i) => {
        const s = m.seasons.find((x) => x.year === yr)
        if (s && s.rank > 0 && s.rank < 900) nodes.push({ i, rank: s.rank })
      })
      return {
        key: m.managerGuid,
        name: m.name,
        logoUrl: m.logoUrl,
        avatarColor: m.avatarColor,
        ownerInitials: m.ownerInitials,
        isMyTeam: m.isMyTeam,
        featured: m.rank <= 3 || m.isMyTeam,
        nodes,
      }
    })
  }
  // Demo: derive a per-season finish order from fixture cumulative volume.
  const n = years.length
  const ranksByTeam = new Map<string, number[]>()
  for (let i = 0; i < n; i++) {
    const order = legacyTrend
      .map((r) => ({ teamId: r.teamId, v: r.cumulative[i] ?? 0 }))
      .sort((a, b) => b.v - a.v)
    order.forEach((o, idx) => {
      const arr = ranksByTeam.get(o.teamId) ?? new Array(n).fill(0)
      arr[i] = idx + 1
      ranksByTeam.set(o.teamId, arr)
    })
  }
  const top3 = new Set(podium.value.slice(0, 3).map((p) => p.teamId))
  return legacyTrend.map((r) => {
    const t = getTeam(r.teamId)
    const ranks = ranksByTeam.get(r.teamId) ?? []
    return {
      key: r.teamId,
      name: t.name,
      logoUrl: t.avatarUrl,
      avatarColor: t.avatarColor,
      ownerInitials: t.ownerInitials,
      isMyTeam: t.isMyTeam,
      featured: top3.has(r.teamId) || t.isMyTeam,
      nodes: ranks.map((rank, i) => ({ i, rank })).filter((x) => x.rank > 0),
    }
  })
})

const bumpMaxRank = computed(() => {
  let max = 2
  for (const s of bumpRaw.value) for (const nd of s.nodes) if (nd.rank > max) max = nd.rank
  return max
})

function xFor(i: number) {
  const span = Math.max(1, trendYears.value.length - 1)
  return TX_PAD_L + (TX_W - TX_PAD_L - TX_PAD_R) * (i / span)
}
function yForRank(rank: number) {
  const yRange = TX_H - TX_PAD_T - TX_PAD_B
  const span = Math.max(1, bumpMaxRank.value - 1)
  return TX_PAD_T + yRange * ((rank - 1) / span)   // rank 1 at top
}
/** Lead OKLCH stop of any gradient string — the line/node color. */
function firstStop(avatarColor: string): string {
  const stops = avatarColor
    .split(/\)\s*,\s*/)
    .map((s) => (s.endsWith(')') ? s : `${s})`))
  return stops[0]
}
interface BumpDisplayNode { i: number; rank: number; xPct: number; yPct: number }
interface BumpLine extends BumpRaw {
  path: string
  displayNodes: BumpDisplayNode[]
  lineColor: string
}
const bumpSeries = computed<BumpLine[]>(() =>
  bumpRaw.value.map((s) => {
    const pts: Point[] = s.nodes.map((nd) => ({ x: xFor(nd.i), y: yForRank(nd.rank) }))
    return {
      ...s,
      path: linearPath(pts),
      displayNodes: s.nodes.map((nd) => ({
        i: nd.i,
        rank: nd.rank,
        xPct: (xFor(nd.i) / TX_W) * 100,
        yPct: (yForRank(nd.rank) / TX_H) * 100,
      })),
      lineColor: s.isMyTeam ? trendGold : firstStop(s.avatarColor),
    }
  }),
)

const featuredBump = computed(() => bumpSeries.value.filter((s) => s.featured))
const dimBump = computed(() => bumpSeries.value.filter((s) => !s.featured))

/* Name labels at each featured line's last node, staggered vertically
   so neighbors don't collide. Positions are container percentages. */
const bumpLabels = computed(() => {
  type Lbl = { key: string; name: string; color: string; xPct: number; yPct: number }
  const lbls: Lbl[] = []
  for (const s of featuredBump.value) {
    const last = s.displayNodes[s.displayNodes.length - 1]
    if (!last) continue
    lbls.push({
      key: s.key,
      name: s.name.split(' ')[0],
      color: s.lineColor,
      xPct: ((xFor(last.i) + 14) / TX_W) * 100,
      yPct: last.yPct,
    })
  }
  lbls.sort((a, b) => a.yPct - b.yPct)
  for (let i = 1; i < lbls.length; i++) {
    if (lbls[i].yPct - lbls[i - 1].yPct < 5.5) lbls[i].yPct = lbls[i - 1].yPct + 5.5
  }
  return lbls
})

/* ─── The rivalries — current-season head-to-head story cards ──
   Recast from the 12x12 all-time matrix (which would have required
   expensive cross-season matchup fetching) into a few real rivalry
   stories built from the current season's h2h matrix the adapter
   already computes: who owns you, who you own, and the league's most
   lopsided non-you series. Honest scope (this season), magazine shape. */

interface RivalryDisplay {
  kind: 'owned-by' | 'you-own' | 'blowout'
  eyebrow: string
  leftId: string            // displayed left; this is the *dominant* team
  rightId: string           // displayed right; the dominated team
  leftWins: number
  rightWins: number
  ties: number
  meetings: number
  dominantCatDiff: number   // absolute; left's cat advantage over right
  caption: string
}

const rivalries = computed<RivalryDisplay[]>(() => {
  const matrix = liveData.value?.h2hMatrix ?? h2hMatrix
  const teamsList = liveData.value?.teams ?? teams
  if (!matrix || matrix.length === 0) return []
  const myId = teamsList.find((t) => t.isMyTeam)?.id ?? null

  const parseRec = (r: string) => {
    const m = r.match(/^(\d+)-(\d+)(?:-(\d+))?$/)
    if (!m) return { w: 0, l: 0, t: 0 }
    return { w: parseInt(m[1], 10), l: parseInt(m[2], 10), t: parseInt(m[3] ?? '0', 10) }
  }
  const nameOf = (id: string) => teamsList.find((t) => t.id === id)?.name ?? 'Them'

  // Re-shape each of-the-viewer entry from my perspective.
  const myEntries = myId
    ? matrix
        .map((e) => {
          const rec = parseRec(e.recordA)
          const aIsMe = e.teamA === myId
          const bIsMe = e.teamB === myId
          if (!aIsMe && !bIsMe) return null
          const oppId = aIsMe ? e.teamB : e.teamA
          const myWins = aIsMe ? rec.w : rec.l
          const oppWins = aIsMe ? rec.l : rec.w
          const myCatDiff = aIsMe ? e.catDiffA : -e.catDiffA
          return { oppId, myWins, oppWins, ties: rec.t, meetings: e.meetings, myCatDiff }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    : []

  const out: RivalryDisplay[] = []

  // Your tormentor — opponent with the biggest net wins over you.
  const tormentor = myEntries
    .filter((x) => x.oppWins > x.myWins)
    .sort((a, b) => (b.oppWins - b.myWins) - (a.oppWins - a.myWins))[0]
  if (tormentor && myId) {
    out.push({
      kind: 'owned-by',
      eyebrow: 'Owned by',
      leftId: tormentor.oppId,
      rightId: myId,
      leftWins: tormentor.oppWins,
      rightWins: tormentor.myWins,
      ties: tormentor.ties,
      meetings: tormentor.meetings,
      dominantCatDiff: Math.abs(tormentor.myCatDiff),
      caption: `${nameOf(tormentor.oppId)} has your number.`,
    })
  }

  // Your prey — your most lopsided winning series.
  const prey = myEntries
    .filter((x) => x.myWins > x.oppWins)
    .sort((a, b) => (b.myWins - b.oppWins) - (a.myWins - a.oppWins))[0]
  if (prey && myId) {
    out.push({
      kind: 'you-own',
      eyebrow: 'You own',
      leftId: myId,
      rightId: prey.oppId,
      leftWins: prey.myWins,
      rightWins: prey.oppWins,
      ties: prey.ties,
      meetings: prey.meetings,
      dominantCatDiff: Math.abs(prey.myCatDiff),
      caption: `${nameOf(prey.oppId)} is your customer.`,
    })
  }

  // League's biggest non-you blowout — keeps the third card neutral
  // when you're already represented in the first two.
  const blowoutCand = matrix
    .filter((e) => !myId || (e.teamA !== myId && e.teamB !== myId))
    .map((e) => {
      const rec = parseRec(e.recordA)
      return { e, rec, diff: Math.abs(rec.w - rec.l) }
    })
    .filter((x) => x.diff > 0)
    .sort((a, b) => b.diff - a.diff)[0]
  if (blowoutCand) {
    const { e, rec } = blowoutCand
    const aWinsMore = rec.w >= rec.l
    const dominantId = aWinsMore ? e.teamA : e.teamB
    const dominatedId = aWinsMore ? e.teamB : e.teamA
    const domWins = aWinsMore ? rec.w : rec.l
    const dedWins = aWinsMore ? rec.l : rec.w
    const domCatDiff = aWinsMore ? e.catDiffA : -e.catDiffA
    out.push({
      kind: 'blowout',
      eyebrow: 'League blowout',
      leftId: dominantId,
      rightId: dominatedId,
      leftWins: domWins,
      rightWins: dedWins,
      ties: rec.t,
      meetings: e.meetings,
      dominantCatDiff: Math.abs(domCatDiff),
      caption: `${nameOf(dominantId)} owns ${nameOf(dominatedId)}.`,
    })
  }

  return out
})

/* ─── Record book — real, all-time trophy case ────────────────
   Self-contained entries (carry their own name/logo/color) so a record
   held by a manager who has left the league still renders. Live: real
   all-time records from managerLegacy + per-season detail. Demo: the
   fixture record book, resolved through getTeam. Four fame + four shame
   so the bold asymmetric layout always has its slots filled. */
interface RecordDisplay {
  id: string
  eyebrow: string
  value: string
  metric: string
  context?: string
  name: string
  avatarUrl?: string
  avatarColor: string
  ownerInitials: string
  isMyTeam: boolean
}

const recordBookCards = computed<{ fame: RecordDisplay[]; shame: RecordDisplay[] }>(() => {
  const live = liveData.value?.managerLegacy
  if (live && live.length) {
    const disp = (m: NonNullable<typeof live>[number]) => ({
      name: m.name, avatarUrl: m.logoUrl, avatarColor: m.avatarColor,
      ownerInitials: m.ownerInitials, isMyTeam: m.isMyTeam,
    })
    const pct = (n: number) => n.toFixed(3).replace(/^0\./, '.')
    const maxBy = (f: (m: typeof live[number]) => number) => [...live].sort((a, b) => f(b) - f(a))[0]
    const minBy = (f: (m: typeof live[number]) => number) => [...live].sort((a, b) => f(a) - f(b))[0]

    // Single-season extremes across everyone's per-season detail.
    let big = { m: live[0], year: 0, cats: -1 }
    let worstS = { m: live[0], year: 0, cats: Infinity }
    for (const m of live) {
      for (const s of m.seasons) {
        if (s.catWins > big.cats) big = { m, year: s.year, cats: s.catWins }
        if (s.completed && s.catWins < worstS.cats) worstS = { m, year: s.year, cats: s.catWins }
      }
    }

    const catKing = maxBy((m) => m.totalCatWins)
    const bestPct = maxBy((m) => m.careerWinPct)
    const mostPlayoffs = maxBy((m) => m.playoffApps)
    const mostLosses = maxBy((m) => m.totalCatLosses)
    const worstPct = minBy((m) => m.careerWinPct)
    const drought = [...live]
      .filter((m) => m.titles === 0)
      .sort((a, b) => b.seasonsPlayed - a.seasonsPlayed || b.totalCatWins - a.totalCatWins)[0] ?? live[0]

    const fame: RecordDisplay[] = [
      { id: 'most-cat-wins', eyebrow: 'MOST CAREER CAT WINS', metric: 'Total cat wins, all seasons',
        value: String(catKing.totalCatWins), context: `${catKing.seasonsPlayed} seasons of receipts.`, ...disp(catKing) },
      { id: 'best-ratio', eyebrow: 'BEST CAT W-L RATIO', metric: 'Career cat-win rate',
        value: pct(bestPct.careerWinPct),
        context: bestPct.titles > 0 ? `${bestPct.titles} ring${bestPct.titles > 1 ? 's' : ''} to back it up.` : 'Dominant, ring or not.',
        ...disp(bestPct) },
      { id: 'most-playoffs', eyebrow: 'MOST PLAYOFF BERTHS', metric: 'Trips to the bracket',
        value: String(mostPlayoffs.playoffApps),
        context: mostPlayoffs.titles > 0 ? `Cashed ${mostPlayoffs.titles} into a title.` : 'Always there. No ring yet.',
        ...disp(mostPlayoffs) },
      { id: 'biggest-season', eyebrow: 'BIGGEST SEASON', metric: `Cat wins in ${big.year}`,
        value: String(big.cats), context: 'The high-water mark.', ...disp(big.m) },
    ]
    const shame: RecordDisplay[] = [
      { id: 'most-losses', eyebrow: 'MOST CAREER CAT LOSSES', metric: 'Total cat losses, all seasons',
        value: String(mostLosses.totalCatLosses), context: 'Somebody has to wear it.', ...disp(mostLosses) },
      { id: 'worst-ratio', eyebrow: 'WORST CAT W-L RATIO', metric: 'Career cat-win rate',
        value: pct(worstPct.careerWinPct), ...disp(worstPct) },
      { id: 'worst-season', eyebrow: 'WORST SEASON', metric: `Cat wins in ${worstS.year}`,
        value: String(worstS.cats), context: 'A year to bury.', ...disp(worstS.m) },
      { id: 'drought', eyebrow: 'LONGEST TITLE DROUGHT', metric: 'Seasons, zero titles',
        value: String(drought.seasonsPlayed), context: 'Still chasing the first.', ...disp(drought) },
    ]
    return { fame, shame }
  }

  // Demo fallback — fixture record book, resolved through getTeam.
  const map = (e: CategoryRecordBookEntry): RecordDisplay => {
    const t = getTeam(e.teamId)
    return {
      id: e.id, eyebrow: e.eyebrow, value: e.value, metric: e.metric, context: e.context,
      name: t.name, avatarUrl: t.avatarUrl, avatarColor: t.avatarColor,
      ownerInitials: t.ownerInitials, isMyTeam: t.isMyTeam,
    }
  }
  return {
    fame: recordBook.filter((e) => e.kind === 'fame').map(map),
    shame: recordBook.filter((e) => e.kind === 'shame').map(map),
  }
})

const fameEntries = computed(() => recordBookCards.value.fame)
const shameEntries = computed(() => recordBookCards.value.shame)

// Click handler — no top-10 modal scope yet; intentional no-op.
function onRecordClick(_entry: RecordDisplay) {
  // Cards remain interactive (focus/active states) for discoverability.
}

/* ─── Modals state ─────────────────────────────────────────── */
const activeLegacyTeamId = ref<string | null>(null)

function openLegacyModal(id: string) { activeLegacyTeamId.value = id }
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

/* ─── 4. ACROSS THE YEARS — bump chart ───────────────────────── */
.bump-wrap {
  position: relative;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 14px;
  padding: 10px 8px 4px;
}
.bump-chart {
  width: 100%;
  height: 400px;
  display: block;
}
@media (max-width: 720px) {
  .bump-chart { height: 300px; }
}
.bump-grid line {
  stroke: oklch(0.17 0.012 90);
  stroke-width: 1;
}
.bump-xticks text {
  fill: var(--ink-3);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.bump-line-dim {
  stroke: oklch(0.42 0.012 90 / 0.30);
  stroke-width: 1.3;
}
.bump-line {
  stroke-width: 2.6;
  opacity: 0.95;
}
.bump-line.is-me {
  stroke-width: 3.4;
  filter: drop-shadow(0 0 5px oklch(0.84 0.16 90 / 0.5));
}

/* Y-axis hints — finish 1 at top, last at bottom. */
.bump-axis {
  position: absolute;
  left: 12px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.bump-axis-top { top: 16px; }
.bump-axis-bot { bottom: 30px; }

/* Logo-node overlay — positioned in % to track the stretched SVG.
   Inset matches .bump-wrap padding so the box equals the chart box. */
.bump-overlay {
  position: absolute;
  inset: 10px 8px 4px;
  pointer-events: none;
}
.bump-node {
  position: absolute;
  transform: translate(-50%, -50%);
}
.bump-node-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 11px;
  color: oklch(0.97 0.01 90);
  box-shadow: 0 0 0 2px oklch(0.08 0.01 90), 0 0 0 3.5px var(--node-accent);
}
.bump-node-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.bump-node.is-me .bump-node-avatar {
  width: 32px;
  height: 32px;
  box-shadow:
    0 0 0 2px oklch(0.08 0.01 90),
    0 0 0 4px oklch(0.84 0.16 90),
    0 0 10px oklch(0.84 0.16 90 / 0.5);
}
.bump-dot-dim {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: oklch(0.55 0.012 90 / 0.65);
  transform: translate(-50%, -50%);
}
.bump-line-dim { opacity: 0.55; }
.bump-label {
  position: absolute;
  transform: translateY(-50%);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* ─── 5. THE RIVALRIES — head-to-head story cards ──────────── */
.rivalry-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
@media (max-width: 820px) {
  .rivalry-grid { grid-template-columns: 1fr; }
}
.rivalry-card {
  display: flex;
  flex-direction: column;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 14px;
  padding: 16px 14px 14px;
}
.rivalry-card-me {
  border-color: oklch(0.78 0.18 92 / 0.45);
  background:
    radial-gradient(ellipse at top, oklch(0.78 0.18 92 / 0.06), transparent 65%),
    oklch(0.10 0.015 90);
}
.rivalry-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 12px;
}
.rivalry-card-me .rivalry-eyebrow { color: oklch(0.84 0.16 90); }

.rivalry-faces {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.rivalry-face {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 0;
}
.rivalry-avatar {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.85rem;
  color: oklch(0.12 0.012 90);
  margin-bottom: 6px;
}
.rivalry-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.rivalry-avatar-me {
  box-shadow: 0 0 0 2px oklch(0.10 0.015 90), 0 0 0 3px oklch(0.84 0.16 90);
}
.rivalry-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.01em;
  color: var(--ink-1);
  margin: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rivalry-record {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2rem;
  line-height: 1;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  margin: 0;
  text-align: center;
}
.rivalry-dash {
  margin: 0 4px;
  color: var(--ink-3);
  font-weight: 700;
}
.rivalry-ties {
  font-size: 0.85rem;
  color: var(--ink-3);
  font-weight: 700;
  margin-left: 4px;
}
.rivalry-meta {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
  text-align: center;
  margin: 0 0 8px;
}
.rivalry-dot { margin: 0 6px; opacity: 0.5; }
.rivalry-caption {
  font-size: 0.86rem;
  line-height: 1.35;
  color: var(--ink-2);
  text-align: center;
  margin: 0;
}
.rivalry-empty {
  font-style: italic;
  color: var(--ink-3);
  text-align: center;
  padding: 24px 12px;
  border: 1px dashed oklch(0.18 0.015 90);
  border-radius: 12px;
}

/* ─── 6. CATEGORY CROWNS — this season's per-cat leaders ──────── */
.crown-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
@media (max-width: 820px) {
  .crown-grid { grid-template-columns: 1fr; }
}
.crown-card {
  display: flex;
  flex-direction: column;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 16px;
  padding: 18px 18px 16px;
}
.crown-bats  { background: linear-gradient(160deg, oklch(0.74 0.18 145 / 0.07), oklch(0.10 0.015 90) 55%); border-color: oklch(0.74 0.18 145 / 0.30); }
.crown-arms  { background: linear-gradient(160deg, oklch(0.72 0.18 195 / 0.08), oklch(0.10 0.015 90) 55%); border-color: oklch(0.72 0.18 195 / 0.30); }
.crown-punt  { background: linear-gradient(160deg, oklch(0.70 0.27 350 / 0.07), oklch(0.10 0.015 90) 55%); border-color: oklch(0.70 0.27 350 / 0.30); }
.crown-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  margin: 0 0 12px;
}
.crown-bats .crown-eyebrow { color: var(--accent-up); }
.crown-arms .crown-eyebrow { color: var(--accent-tertiary); }
.crown-punt .crown-eyebrow { color: var(--accent-secondary); }

.crown-id {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.crown-avatar {
  width: 44px; height: 44px;
  border-radius: 11px;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.85rem;
  color: oklch(0.12 0.012 90);
  flex: none;
}
.crown-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.crown-avatar-me { box-shadow: 0 0 0 2px oklch(0.10 0.015 90), 0 0 0 3px oklch(0.84 0.16 90); }
.crown-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800; font-size: 1rem;
  color: var(--ink-1);
  margin: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.crown-count {
  display: flex; align-items: baseline; gap: 8px;
  margin: 0 0 12px;
}
.crown-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 2.4rem; line-height: 1;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}
.crown-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-3);
}
.crown-cats {
  list-style: none; padding: 0; margin: 0 0 12px;
  display: flex; flex-wrap: wrap; gap: 5px;
}
.crown-cat-chip {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.72rem;
  letter-spacing: 0.06em;
  padding: 3px 9px; border-radius: 999px;
  border: 1px solid;
}
.crown-cat-bats { color: var(--accent-up); border-color: oklch(0.74 0.18 145 / 0.4); background: oklch(0.74 0.18 145 / 0.08); }
.crown-cat-arms { color: var(--accent-tertiary); border-color: oklch(0.72 0.18 195 / 0.4); background: oklch(0.72 0.18 195 / 0.08); }
.crown-cat-punt { color: var(--accent-secondary); border-color: oklch(0.70 0.27 350 / 0.4); background: oklch(0.70 0.27 350 / 0.08); }
.crown-caption {
  font-size: 0.88rem; line-height: 1.4;
  color: var(--ink-2);
  margin: auto 0 0;
}
.crown-empty {
  font-style: italic;
  color: var(--ink-3);
  text-align: center;
  padding: 24px 12px;
  border: 1px dashed oklch(0.18 0.015 90);
  border-radius: 12px;
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

<template>
  <div class="catdraft">
    <!-- ─────────────────────────────────────────────────────────────
         LIVE LOAD STATUS — only renders when a leagueId is in the URL
         and the live adapter is fetching, has errored, or returned
         data without a draft section. The underlying editorial keeps
         a fixture-derived render as its initial value so the page
         stays visually populated during load.
    ────────────────────────────────────────────────────────────── -->
    <LiveLoadError v-if="liveError" :message="liveError" />
    <UnsupportedFormatPanel
      v-if="unsupportedFormat"
      :format="unsupportedFormat"
      :league-name="unsupportedLeagueName ?? undefined"
      :platform="livePlatform ?? undefined"
    />
    <div
      v-else-if="isStrictLiveMode && !liveData && !liveError"
      class="draft-loading"
      role="status"
      aria-live="polite"
    >
      <div class="draft-loading-bar" aria-hidden="true">
        <span class="draft-loading-bar-fill"></span>
      </div>
      <div class="draft-loading-stage">
        <div class="draft-loading-logo-shadow">
          <div class="draft-loading-logo" aria-hidden="true">
            <img src="/tlb-favicon.png" alt="" />
          </div>
        </div>
        <p class="draft-loading-title">{{ loadingTitle }}</p>
        <p class="draft-loading-sub">{{ loadingSubline }}</p>
      </div>
    </div>

    <template v-else>
    <!-- "No draft data" info banner — shown after data loads when the
         platform doesn't expose draft picks for this format. -->
    <div v-if="liveData && !liveData.draft" class="live-banner live-banner-info" role="status">
      <p class="live-banner-error-headline">No draft data available for this league.</p>
      <p class="live-banner-error-body">{{ platformLabel }} hasn't exposed it for this format. Showing the demo draft below.</p>
    </div>

    <!-- ─── 1. PAGE HEAD ───────────────────────────────────────── -->
    <header class="page-head">
      <div class="page-head-copy">
        <p class="page-eyebrow">
          <span class="page-eyebrow-bar" aria-hidden="true"></span>
          Draft 2026
        </p>
        <h1 class="page-headline">The receipts.</h1>
        <p class="page-sub">Eight weeks in. Who drafted a champion. Who left cats on the board.</p>
      </div>
      <ul class="page-context" role="list" aria-label="Draft at a glance">
        <li class="page-context-stat">
          <span class="page-context-num">180</span>
          <span class="page-context-label">picks</span>
        </li>
        <li class="page-context-sep" aria-hidden="true"></li>
        <li class="page-context-stat">
          <span class="page-context-num">8</span>
          <span class="page-context-label">weeks scored</span>
        </li>
        <li class="page-context-sep" aria-hidden="true"></li>
        <li class="page-context-stat">
          <span class="page-context-num page-context-num-pos">{{ stealCount }}</span>
          <span class="page-context-label">steals</span>
        </li>
        <li class="page-context-sep" aria-hidden="true"></li>
        <li class="page-context-stat">
          <span class="page-context-num page-context-num-neg">{{ disasterCount }}</span>
          <span class="page-context-label">disasters</span>
        </li>
      </ul>
    </header>

    <!-- ─── 2. AWARDS ─────────────────────────────────────────── -->
    <section v-if="!isPointsMode && showAwardsSection" class="awards" aria-labelledby="awards-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta" id="awards-heading">The awards</p>
        <h2 class="section-headline">Three from the draft floor.</h2>
      </header>

      <div class="awards-grid">
        <!-- Best draft (full-width hero) -->
        <article v-if="bestTeam" class="award-best">
          <span class="award-best-chrome-top" aria-hidden="true"></span>
          <span class="award-best-chrome-bottom" aria-hidden="true"></span>
          <span class="award-best-glow" aria-hidden="true"></span>
          <div class="award-best-portrait">
            <div
              class="award-best-avatar"
              :style="{ background: `linear-gradient(135deg, ${bestTeam.avatarColor})` }"
            >
              <img v-if="bestTeam.avatarUrl" :src="bestTeam.avatarUrl" class="avatar-img" alt="" />
              <span v-else>{{ bestTeam.ownerInitials }}</span>
            </div>
          </div>
          <div class="award-best-body">
            <p class="award-best-eyebrow">Best draft of 2026</p>
            <h3 class="award-best-headline">{{ bestDraftCopy.headline }}</h3>
            <p class="award-best-copy">{{ bestDraftCopy.body }}</p>
            <ul class="award-best-stats" role="list">
              <li>
                <span class="award-best-stat-num award-best-stat-num-pos">{{ bestDraftCopy.stats.steals }}</span>
                <span class="award-best-stat-label">steals</span>
              </li>
              <li class="award-best-stat-sep" aria-hidden="true"></li>
              <li>
                <span class="award-best-stat-num">{{ bestDraftCopy.stats.hits }}</span>
                <span class="award-best-stat-label">hits</span>
              </li>
              <li class="award-best-stat-sep" aria-hidden="true"></li>
              <li>
                <span class="award-best-stat-num award-best-stat-num-neg">{{ bestDraftCopy.stats.busts }}</span>
                <span class="award-best-stat-label">busts</span>
              </li>
              <li class="award-best-stat-sep" aria-hidden="true"></li>
              <li>
                <span class="award-best-stat-num">{{ bestDraftCopy.stats.earlyHitRate }}</span>
                <span class="award-best-stat-label">early hit rate</span>
              </li>
            </ul>
            <button
              type="button"
              class="award-best-cta"
              :aria-label="`Open ${bestTeam.name} draft breakdown`"
              @click="openTeamModal(bestTeam.id, $event)"
            >
              Open team draft
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
          <p class="award-best-grade" :aria-label="`Grade ${bestDraftCopy.grade}`">
            {{ bestDraftCopy.grade }}
          </p>
        </article>

        <!-- Steal of the draft -->
        <article
          v-if="stealPick && stealTeam"
          class="award-steal"
          tabindex="0"
          role="button"
          :aria-label="`Open ${stealPick.playerName} pick detail`"
          @click="openPickModal(stealPick.pickOverall)"
          @keydown.enter.prevent="openPickModal(stealPick.pickOverall)"
          @keydown.space.prevent="openPickModal(stealPick.pickOverall)"
        >
          <span class="award-steal-edge" aria-hidden="true"></span>
          <span class="award-steal-corner award-steal-corner-tl" aria-hidden="true"></span>
          <span class="award-steal-corner award-steal-corner-br" aria-hidden="true"></span>
          <p class="award-steal-eyebrow">Steal of the draft</p>
          <div class="award-steal-row">
            <div class="award-steal-glyph" :style="{ background: posBg(stealPick.position), color: posFg(stealPick.position) }">
              {{ stealPick.position }}
            </div>
            <div class="award-steal-text">
              <h3 class="award-steal-name">{{ stealPick.playerName }}</h3>
              <p class="award-steal-meta">
                <span class="award-pos-pill" :style="{ background: posBg(stealPick.position), color: posFg(stealPick.position) }">{{ stealPick.position }}</span>
                <span class="dot" aria-hidden="true">·</span>
                {{ stealPick.mlbTeam }}
                <span class="dot" aria-hidden="true">·</span>
                R{{ stealPick.round }} pick #{{ stealPick.pickOverall }}
              </p>
            </div>
          </div>
          <p class="award-steal-value">+{{ stealAwardCopy.valueScore }}</p>
          <p class="award-steal-body">{{ stealAwardCopy.body }}</p>
          <div class="award-steal-by">
            <div
              class="award-by-avatar"
              :style="{ background: `linear-gradient(135deg, ${stealTeam.avatarColor})` }"
            >
              <img v-if="stealTeam.avatarUrl" :src="stealTeam.avatarUrl" class="avatar-img" alt="" />
              <span v-else>{{ stealTeam.ownerInitials }}</span>
            </div>
            <span class="award-by-label">Drafted by {{ stealTeam.name }}</span>
          </div>
        </article>

        <!-- Bust of the draft -->
        <article
          v-if="bustPick && bustTeam"
          class="award-bust"
          tabindex="0"
          role="button"
          :aria-label="`Open ${bustPick.playerName} pick detail`"
          @click="openPickModal(bustPick.pickOverall)"
          @keydown.enter.prevent="openPickModal(bustPick.pickOverall)"
          @keydown.space.prevent="openPickModal(bustPick.pickOverall)"
        >
          <span class="award-bust-tape" aria-hidden="true"></span>
          <span class="award-bust-corner award-bust-corner-tr" aria-hidden="true"></span>
          <span class="award-bust-corner award-bust-corner-bl" aria-hidden="true"></span>
          <p class="award-bust-eyebrow">Bust of the draft</p>
          <h3 class="award-bust-name">{{ bustPick.playerName }}</h3>
          <p class="award-bust-meta">
            <span class="award-pos-pill" :style="{ background: posBg(bustPick.position), color: posFg(bustPick.position) }">{{ bustPick.position }}</span>
            <span class="dot" aria-hidden="true">·</span>
            {{ bustPick.mlbTeam }}
            <span class="dot" aria-hidden="true">·</span>
            R{{ bustPick.round }} pick #{{ bustPick.pickOverall }}
          </p>
          <p class="award-bust-value">{{ bustAwardCopy.valueScore }}</p>
          <p class="award-bust-body">{{ bustAwardCopy.body }}</p>
          <div class="award-steal-by">
            <div
              class="award-by-avatar"
              :style="{ background: `linear-gradient(135deg, ${bustTeam.avatarColor})` }"
            >
              <img v-if="bustTeam.avatarUrl" :src="bustTeam.avatarUrl" class="avatar-img" alt="" />
              <span v-else>{{ bustTeam.ownerInitials }}</span>
            </div>
            <span class="award-by-label">Drafted by {{ bustTeam.name }}</span>
          </div>
        </article>
      </div>
    </section>

    <!-- ─── 3. GRADES — PODIUM + COMPACT ROWS ─────────────────── -->
    <section v-if="!isPointsMode" class="standings" aria-labelledby="grades-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="grades-heading">The grades</p>
        <h2 class="section-headline">Where ten owners landed.</h2>
      </header>

      <div class="podium">
        <!-- #2 silver -->
        <article
          class="podium-card podium-silver"
          :class="{ 'is-my-team': teamFor(podiumRanks[1]).isMyTeam }"
          tabindex="0"
          role="button"
          :aria-label="`Open ${teamFor(podiumRanks[1]).name} draft breakdown`"
          @click="openTeamModal(podiumRanks[1].teamId, $event)"
          @keydown.enter.prevent="openTeamModal(podiumRanks[1].teamId, $event)"
          @keydown.space.prevent="openTeamModal(podiumRanks[1].teamId, $event)"
        >
          <span class="podium-medal podium-medal-silver" aria-hidden="true">2</span>
          <div class="podium-avatar podium-avatar-silver"
            :style="{ background: `linear-gradient(135deg, ${teamFor(podiumRanks[1]).avatarColor})` }">
            <img v-if="teamFor(podiumRanks[1]).avatarUrl" :src="teamFor(podiumRanks[1]).avatarUrl" class="avatar-img" alt="" />
            <span v-else>{{ teamFor(podiumRanks[1]).ownerInitials }}</span>
          </div>
          <p class="podium-team-name">{{ teamFor(podiumRanks[1]).name }}</p>
          <p class="podium-team-owner">{{ teamFor(podiumRanks[1]).ownerName }}</p>
          <p class="podium-grade podium-grade-silver">{{ podiumRanks[1].grade }}</p>
          <p class="podium-stats">
            <span class="podium-stat-pos">{{ podiumRanks[1].stats.steals }} steal{{ podiumRanks[1].stats.steals === 1 ? '' : 's' }}</span>
            <span class="dot" aria-hidden="true">·</span>
            <span>{{ podiumRanks[1].stats.hits }} hits</span>
            <span class="dot" aria-hidden="true">·</span>
            <span class="podium-stat-neg">{{ podiumRanks[1].stats.busts }} busts</span>
          </p>
          <p class="podium-editorial">{{ podiumRanks[1].narrative }}</p>
        </article>

        <!-- #1 gold -->
        <article
          class="podium-card podium-gold"
          :class="{ 'is-my-team': teamFor(podiumRanks[0]).isMyTeam }"
          tabindex="0"
          role="button"
          :aria-label="`Open ${teamFor(podiumRanks[0]).name} draft breakdown`"
          @click="openTeamModal(podiumRanks[0].teamId, $event)"
          @keydown.enter.prevent="openTeamModal(podiumRanks[0].teamId, $event)"
          @keydown.space.prevent="openTeamModal(podiumRanks[0].teamId, $event)"
        >
          <span class="podium-medal podium-medal-gold" aria-hidden="true">1</span>
          <div class="podium-avatar podium-avatar-gold"
            :style="{ background: `linear-gradient(135deg, ${teamFor(podiumRanks[0]).avatarColor})` }">
            <img v-if="teamFor(podiumRanks[0]).avatarUrl" :src="teamFor(podiumRanks[0]).avatarUrl" class="avatar-img" alt="" />
            <span v-else>{{ teamFor(podiumRanks[0]).ownerInitials }}</span>
          </div>
          <p class="podium-team-name podium-team-name-large">{{ teamFor(podiumRanks[0]).name }}</p>
          <p class="podium-team-owner">{{ teamFor(podiumRanks[0]).ownerName }}</p>
          <p class="podium-grade podium-grade-gold">{{ podiumRanks[0].grade }}</p>
          <p class="podium-stats">
            <span class="podium-stat-pos">{{ podiumRanks[0].stats.steals }} steal{{ podiumRanks[0].stats.steals === 1 ? '' : 's' }}</span>
            <span class="dot" aria-hidden="true">·</span>
            <span>{{ podiumRanks[0].stats.hits }} hits</span>
            <span class="dot" aria-hidden="true">·</span>
            <span class="podium-stat-neg">{{ podiumRanks[0].stats.busts }} busts</span>
          </p>
          <p class="podium-editorial">{{ podiumRanks[0].narrative }}</p>
        </article>

        <!-- #3 bronze -->
        <article
          class="podium-card podium-bronze"
          :class="{ 'is-my-team': teamFor(podiumRanks[2]).isMyTeam }"
          tabindex="0"
          role="button"
          :aria-label="`Open ${teamFor(podiumRanks[2]).name} draft breakdown`"
          @click="openTeamModal(podiumRanks[2].teamId, $event)"
          @keydown.enter.prevent="openTeamModal(podiumRanks[2].teamId, $event)"
          @keydown.space.prevent="openTeamModal(podiumRanks[2].teamId, $event)"
        >
          <span class="podium-medal podium-medal-bronze" aria-hidden="true">3</span>
          <div class="podium-avatar podium-avatar-bronze"
            :style="{ background: `linear-gradient(135deg, ${teamFor(podiumRanks[2]).avatarColor})` }">
            <img v-if="teamFor(podiumRanks[2]).avatarUrl" :src="teamFor(podiumRanks[2]).avatarUrl" class="avatar-img" alt="" />
            <span v-else>{{ teamFor(podiumRanks[2]).ownerInitials }}</span>
          </div>
          <p class="podium-team-name">{{ teamFor(podiumRanks[2]).name }}</p>
          <p class="podium-team-owner">{{ teamFor(podiumRanks[2]).ownerName }}</p>
          <p class="podium-grade podium-grade-bronze">{{ podiumRanks[2].grade }}</p>
          <p class="podium-stats">
            <span class="podium-stat-pos">{{ podiumRanks[2].stats.steals }} steal{{ podiumRanks[2].stats.steals === 1 ? '' : 's' }}</span>
            <span class="dot" aria-hidden="true">·</span>
            <span>{{ podiumRanks[2].stats.hits }} hits</span>
            <span class="dot" aria-hidden="true">·</span>
            <span class="podium-stat-neg">{{ podiumRanks[2].stats.busts }} busts</span>
          </p>
          <p class="podium-editorial">{{ podiumRanks[2].narrative }}</p>
        </article>
      </div>

      <!-- Compact rows 4-10 -->
      <ul class="rest" role="list">
        <li
          v-for="g in restRanks"
          :key="g.teamId"
          class="rest-row"
          :class="{ 'is-my-team': teamFor(g).isMyTeam }"
          tabindex="0"
          role="button"
          :aria-label="`Open ${teamFor(g).name} draft breakdown`"
          @click="openTeamModal(g.teamId, $event)"
          @keydown.enter.prevent="openTeamModal(g.teamId, $event)"
          @keydown.space.prevent="openTeamModal(g.teamId, $event)"
        >
          <span class="rest-rank">{{ g.rank }}</span>
          <div class="rest-avatar"
            :style="{ background: `linear-gradient(135deg, ${teamFor(g).avatarColor})` }">
            <img v-if="teamFor(g).avatarUrl" :src="teamFor(g).avatarUrl" class="avatar-img" alt="" />
            <span v-else>{{ teamFor(g).ownerInitials }}</span>
          </div>
          <div class="rest-text">
            <p class="rest-name">{{ teamFor(g).name }}</p>
            <p class="rest-owner">{{ teamFor(g).ownerName }}</p>
          </div>
          <span class="rest-grade" :class="`rest-grade-${gradeBand(g.grade)}`">{{ g.grade }}</span>
          <p class="rest-stats">
            <span class="rest-stat-pos">{{ g.stats.steals }} S</span>
            <span class="rest-sep" aria-hidden="true"></span>
            <span>{{ g.stats.hits }} H</span>
            <span class="rest-sep" aria-hidden="true"></span>
            <span>{{ g.stats.misses }} M</span>
            <span class="rest-sep" aria-hidden="true"></span>
            <span class="rest-stat-neg">{{ g.stats.busts }} B</span>
          </p>
        </li>
      </ul>
    </section>

    <!-- ─── 4. THE BOARD ─────────────────────────────────────── -->
    <!-- ─── POINTS DRAFT BOARD ────────────────────────────────
         Football picks carry no value score, so this is the board
         without the value colouring: who took whom, and where. The
         value-driven sections above and below stay hidden rather than
         rendering zeros that would read as real judgements.
    ──────────────────────────────────────────────────────── -->
    <section v-if="isPointsMode" class="board" aria-labelledby="points-board-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta" id="points-board-heading">The board</p>
        <h2 class="section-headline">
          {{ livePointsData?.draft?.totalPicks ?? 0 }} picks. The whole draft.
        </h2>
        <p class="section-sub">
          Every pick, by round and by team, in the order they came off the board.
        </p>
      </header>

      <div v-if="pointsBoardRows.length === 0" class="points-board-empty">
        This league has no draft on record.
      </div>

      <div v-else class="board-scroll">
        <div class="board-grid" :style="{ '--team-count': pointsDraftColumns.length }">
          <div
            v-for="teamId in pointsDraftColumns"
            :key="`phdr-${teamId}`"
            class="board-col-head"
            :class="{ 'is-my-team': pointsTeam(teamId).isMyTeam }"
          >
            <div
              class="board-col-avatar"
              :style="{ background: `linear-gradient(135deg, ${pointsTeam(teamId).avatarColor})` }"
            >
              <img v-if="pointsTeam(teamId).avatarUrl" :src="pointsTeam(teamId).avatarUrl" class="avatar-img" alt="" />
              <span v-else>{{ pointsTeam(teamId).ownerInitials }}</span>
            </div>
            <p class="board-col-name">{{ pointsTeam(teamId).name }}</p>
          </div>

          <template v-for="row in pointsBoardRows" :key="`prd-${row.round}`">
            <div
              v-for="(cell, ci) in row.cells"
              :key="`prd-${row.round}-${ci}`"
              class="board-cell board-cell-static"
            >
              <!-- A cell can hold more than one pick: traded picks are
                   routine in dynasty and keeper leagues. -->
              <div v-for="pick in cell" :key="pick.pickOverall" class="points-pick">
                <span class="board-cell-num">#{{ pick.pickOverall }}</span>
                <span class="board-cell-name">{{ pick.playerName }}</span>
                <div class="board-cell-foot">
                  <span
                    v-if="pick.position"
                    class="board-cell-pos"
                    :style="{ background: posBg(pick.position), color: posFg(pick.position) }"
                  >{{ pick.position }}</span>
                  <span v-if="pick.mlbTeam" class="points-pick-team">{{ pick.mlbTeam }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <p v-if="pointsPositionCounts.length" class="rounds-pills-eyebrow">Position breakdown</p>
      <ul v-if="pointsPositionCounts.length" class="rounds-pills" role="list">
        <li
          v-for="pb in pointsPositionCounts"
          :key="pb.position"
          class="rounds-pill"
          :style="{ background: posBg(pb.position), color: posFg(pb.position), borderColor: posBg(pb.position) }"
        >
          <span class="rounds-pill-pos">{{ pb.position }}</span>
          <span class="rounds-pill-sep" aria-hidden="true">·</span>
          <span class="rounds-pill-count">{{ pb.count }} drafted</span>
        </li>
      </ul>
    </section>

    <section v-if="!isPointsMode" class="board" aria-labelledby="board-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta" id="board-heading">The board</p>
        <h2 class="section-headline">All 180 picks. Color-coded by value.</h2>
        <p class="section-sub">Snake order. Green is positive value over draft slot, magenta is negative. Click any pick.</p>
      </header>

      <div class="board-scroll">
        <div class="board-grid" :style="{ '--team-count': teams.length }">
          <div
            v-for="t in boardTeams"
            :key="`hdr-${t.id}`"
            class="board-col-head"
            :class="{ 'is-my-team': t.isMyTeam }"
          >
            <div class="board-col-avatar"
              :style="{ background: `linear-gradient(135deg, ${t.avatarColor})` }">
              <img v-if="t.avatarUrl" :src="t.avatarUrl" class="avatar-img" alt="" />
              <span v-else>{{ t.ownerInitials }}</span>
            </div>
            <p class="board-col-name">{{ t.name }}</p>
            <span class="board-col-grade" :class="`rest-grade-${gradeBand(gradeForTeam(t.id).grade)}`">{{ gradeForTeam(t.id).grade }}</span>
          </div>

          <button
            v-for="cell in boardCells"
            :key="cell.pick.pickOverall"
            type="button"
            class="board-cell"
            :style="{ background: cellBg(cell.pick.valueScore), borderColor: cellBorder(cell.pick.valueScore) }"
            :aria-label="`${cell.pick.playerName}, ${cell.pick.position}, pick ${cell.pick.pickOverall}, value ${cell.pick.valueScore}`"
            @click="openPickModal(cell.pick.pickOverall)"
          >
            <span class="board-cell-num">#{{ cell.pick.pickOverall }}</span>
            <span class="board-cell-name">{{ cell.pick.playerName }}</span>
            <div class="board-cell-foot">
              <span class="board-cell-pos" :style="{ background: posBg(cell.pick.position), color: posFg(cell.pick.position) }">{{ cell.pick.position }}</span>
              <span class="board-cell-val" :style="{ color: valueColor(cell.pick.valueScore) }">
                {{ cell.pick.valueScore > 0 ? '+' : '' }}{{ cell.pick.valueScore }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </section>

    <!-- ─── 5. BY THE ROUND ──────────────────────────────────── -->
    <section v-if="!isPointsMode" class="rounds" aria-labelledby="rounds-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="rounds-heading">By the round</p>
        <h2 class="section-headline">When the draft delivered. When it didn't.</h2>
      </header>

      <ul class="rounds-list" role="list">
        <li v-for="r in roundSummary" :key="r.round" class="rounds-row">
          <span class="rounds-chip">R{{ r.round }}</span>
          <div class="rounds-bar" :aria-label="`Round ${r.round}: ${r.hits} hits, ${r.misses} misses`">
            <span class="rounds-bar-hits" :style="{ width: `${(r.hits / 10) * 100}%` }">{{ r.hits > 0 ? `${r.hits} hit${r.hits === 1 ? '' : 's'}` : '' }}</span>
            <span class="rounds-bar-neutral" :style="{ width: `${(r.neutral / 10) * 100}%` }"></span>
            <span class="rounds-bar-misses" :style="{ width: `${(r.misses / 10) * 100}%` }">{{ r.misses > 0 ? `${r.misses} miss${r.misses === 1 ? '' : 'es'}` : '' }}</span>
          </div>
          <span class="rounds-avg" :style="{ color: valueColor(r.avgValue) }">
            {{ r.avgValue >= 0 ? '+' : '' }}{{ r.avgValue.toFixed(1) }}
            <span class="rounds-avg-label">avg</span>
          </span>
          <p v-if="roundNarratives.get(r.round)" class="rounds-narrative">
            {{ roundNarratives.get(r.round) }}
          </p>
        </li>
      </ul>

      <p class="rounds-pills-eyebrow">Position breakdown</p>
      <ul class="rounds-pills" role="list">
        <li
          v-for="pb in positionBreakdown"
          :key="pb.position"
          class="rounds-pill"
          :style="{ background: posBg(pb.position), color: posFg(pb.position), borderColor: posBg(pb.position) }"
        >
          <span class="rounds-pill-pos">{{ pb.position }}</span>
          <span class="rounds-pill-sep" aria-hidden="true">·</span>
          <span class="rounds-pill-count">{{ pb.count }} drafted</span>
          <span class="rounds-pill-sep" aria-hidden="true">·</span>
          <span class="rounds-pill-avg">avg {{ pb.avgValue >= 0 ? '+' : '' }}{{ pb.avgValue.toFixed(1) }}</span>
        </li>
      </ul>
    </section>

    <!-- ─── 6. PUNT REPORT ───────────────────────────────────── -->
    <section v-if="!isPointsMode" class="punt" aria-labelledby="punt-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="punt-heading">Punt report</p>
        <h2 class="section-headline">Three teams ditched a cat. Two were right.</h2>
      </header>

      <div class="punt-grid">
        <!-- Successful punt (left, wider, green) -->
        <article class="punt-card punt-success">
          <span class="punt-chip punt-chip-success" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Win
          </span>
          <div class="punt-team">
            <div
              class="punt-avatar"
              :style="{ background: `linear-gradient(135deg, ${puntSuccessTeam.avatarColor})` }"
            >
              <img v-if="puntSuccessTeam.avatarUrl" :src="puntSuccessTeam.avatarUrl" class="avatar-img" alt="" />
              <span v-else>{{ puntSuccessTeam.ownerInitials }}</span>
            </div>
            <p class="punt-team-name">{{ puntSuccessTeam.name }}</p>
          </div>
          <p class="punt-cat-label">Punted</p>
          <p class="punt-cat-big">{{ puntSuccess.category }}</p>
          <h3 class="punt-headline">{{ puntSuccess.headline }}</h3>
          <p class="punt-body">{{ puntSuccess.body }}</p>
          <p class="punt-rank">
            Currently <span class="punt-rank-num">#{{ puntSuccess.thisSeasonRank }}</span> in {{ puntSuccess.category }}
          </p>
        </article>

        <!-- Failed punt (right, narrower, magenta) -->
        <article class="punt-card punt-failure">
          <span class="punt-chip punt-chip-failure" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Fail
          </span>
          <div class="punt-team">
            <div
              class="punt-avatar"
              :style="{ background: `linear-gradient(135deg, ${puntFailureTeam.avatarColor})` }"
            >
              <img v-if="puntFailureTeam.avatarUrl" :src="puntFailureTeam.avatarUrl" class="avatar-img" alt="" />
              <span v-else>{{ puntFailureTeam.ownerInitials }}</span>
            </div>
            <p class="punt-team-name">{{ puntFailureTeam.name }}</p>
          </div>
          <p class="punt-cat-label">Tried to punt</p>
          <p class="punt-cat-big">{{ puntFailure.category }}</p>
          <h3 class="punt-headline">{{ puntFailure.headline }}</h3>
          <p class="punt-body">{{ puntFailure.body }}</p>
          <p class="punt-rank">
            Currently <span class="punt-rank-num punt-rank-num-neg">#{{ puntFailure.thisSeasonRank }}</span> in {{ puntFailure.category }}
          </p>
        </article>

        <!-- Balanced champ (full-width below, yellow) -->
        <article class="punt-balanced">
          <div class="punt-balanced-id">
            <div
              class="punt-avatar punt-avatar-large"
              :style="{ background: `linear-gradient(135deg, ${puntBalancedTeam.avatarColor})` }"
            >
              <img v-if="puntBalancedTeam.avatarUrl" :src="puntBalancedTeam.avatarUrl" class="avatar-img" alt="" />
              <span v-else>{{ puntBalancedTeam.ownerInitials }}</span>
            </div>
            <div class="punt-balanced-text">
              <p class="punt-balanced-eyebrow">Balanced champ</p>
              <h3 class="punt-balanced-headline">{{ puntBalanced.headline }}</h3>
              <p class="punt-balanced-body">{{ puntBalanced.body }}</p>
            </div>
          </div>
          <ul class="punt-finger" role="list" aria-label="Category fingerprint">
            <li
              v-for="c in balancedCatChips"
              :key="c.cat"
              class="punt-finger-chip"
              :class="`punt-finger-${c.band}`"
            >
              <span class="punt-finger-cat">{{ c.cat }}</span>
              <span class="punt-finger-rank">#{{ c.rank }}</span>
            </li>
          </ul>
        </article>
      </div>
    </section>

    <!-- ─── 7. CATEGORY KINGS ────────────────────────────────── -->
    <section v-if="!isPointsMode" class="kings" aria-labelledby="kings-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="kings-heading">Category kings</p>
        <h2 class="section-headline">Three category storylines.</h2>
      </header>

      <div class="kings-grid">
        <!-- Five-tool elite (left) -->
        <article
          class="king-card king-fivetool"
          tabindex="0"
          role="button"
          :aria-label="`Open ${kingFiveTool.playerName} pick detail`"
          @click="openPickModal(kingFiveToolPick.pickOverall)"
          @keydown.enter.prevent="openPickModal(kingFiveToolPick.pickOverall)"
          @keydown.space.prevent="openPickModal(kingFiveToolPick.pickOverall)"
        >
          <p class="king-eyebrow king-eyebrow-fivetool">{{ kingFiveTool.eyebrow }}</p>
          <div class="king-player">
            <div class="king-glyph" :style="{ background: posBg(kingFiveToolPick.position), color: posFg(kingFiveToolPick.position) }">
              {{ kingFiveToolPick.position }}
            </div>
            <div>
              <h3 class="king-player-name">{{ kingFiveToolPick.playerName }}</h3>
              <p class="king-player-meta">{{ kingFiveToolPick.mlbTeam }} · {{ kingFiveToolPick.position }} · R{{ kingFiveToolPick.round }} pick #{{ kingFiveToolPick.pickOverall }}</p>
            </div>
          </div>
          <ul class="king-cats" role="list" aria-label="Categories delivered">
            <li v-for="c in (kingFiveTool.cats ?? [])" :key="c" class="king-cat-chip">{{ c }}</li>
          </ul>
          <h3 class="king-headline">{{ kingFiveTool.headline }}</h3>
          <p class="king-body">{{ kingFiveTool.body }}</p>
        </article>

        <!-- Late-round gem (right) -->
        <article
          class="king-card king-late"
          tabindex="0"
          role="button"
          :aria-label="`Open ${kingLatePick.playerName} pick detail`"
          @click="openPickModal(kingLatePick.pickOverall)"
          @keydown.enter.prevent="openPickModal(kingLatePick.pickOverall)"
          @keydown.space.prevent="openPickModal(kingLatePick.pickOverall)"
        >
          <p class="king-eyebrow king-eyebrow-late">{{ kingLate.eyebrow }}</p>
          <div class="king-late-pick">{{ kingLate.draftRoundPick }}</div>
          <h3 class="king-player-name">{{ kingLatePick.playerName }}</h3>
          <p class="king-player-meta">{{ kingLatePick.mlbTeam }} · {{ kingLatePick.position }}</p>
          <h3 class="king-headline">{{ kingLate.headline }}</h3>
          <p class="king-body">{{ kingLate.body }}</p>
        </article>

        <!-- Broken cat (full-width below, magenta) -->
        <article
          class="king-broken"
          tabindex="0"
          role="button"
          :aria-label="`Open ${kingBrokenPick.playerName} pick detail`"
          @click="openPickModal(kingBrokenPick.pickOverall)"
          @keydown.enter.prevent="openPickModal(kingBrokenPick.pickOverall)"
          @keydown.space.prevent="openPickModal(kingBrokenPick.pickOverall)"
        >
          <span class="king-broken-tape" aria-hidden="true"></span>
          <div class="king-broken-id">
            <div class="king-broken-glyph" :style="{ background: posBg(kingBrokenPick.position), color: posFg(kingBrokenPick.position) }">
              {{ kingBrokenPick.position }}
            </div>
            <div class="king-broken-text">
              <p class="king-eyebrow king-eyebrow-broken">{{ kingBroken.eyebrow }}</p>
              <h3 class="king-broken-player">{{ kingBrokenPick.playerName }}</h3>
              <p class="king-player-meta">{{ kingBrokenPick.mlbTeam }} · drafted by {{ getTeam(kingBroken.brokenTeamId ?? '').name }}</p>
            </div>
          </div>
          <div class="king-broken-cat">
            <p class="king-broken-cat-label">Now last in</p>
            <p class="king-broken-cat-big">{{ kingBroken.brokenCat }}</p>
          </div>
          <div class="king-broken-copy">
            <h3 class="king-headline">{{ kingBroken.headline }}</h3>
            <p class="king-body">{{ kingBroken.body }}</p>
          </div>
        </article>
      </div>
    </section>

    <!-- ─── 8. QUICK READS ───────────────────────────────────── -->
    <section v-if="!isPointsMode" class="quick" aria-labelledby="quick-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta" id="quick-heading">Quick reads</p>
      </header>
      <ul class="quick-pills" role="list">
        <li class="quick-pill quick-pill-pos">
          <span class="quick-dot" aria-hidden="true"></span>
          <div class="quick-pill-text">
            <span class="quick-pill-eyebrow">Highest value pick</span>
            <span class="quick-pill-label">{{ quickReadsCopy.highestValuePick }}</span>
          </div>
        </li>
        <li class="quick-pill quick-pill-neg">
          <span class="quick-dot" aria-hidden="true"></span>
          <div class="quick-pill-text">
            <span class="quick-pill-eyebrow">Biggest bust</span>
            <span class="quick-pill-label">{{ quickReadsCopy.biggestBust }}</span>
          </div>
        </li>
        <li class="quick-pill quick-pill-pos">
          <span class="quick-dot" aria-hidden="true"></span>
          <div class="quick-pill-text">
            <span class="quick-pill-eyebrow">Best late round</span>
            <span class="quick-pill-label">{{ quickReadsCopy.bestLateRound }}</span>
          </div>
        </li>
        <li class="quick-pill quick-pill-teal">
          <span class="quick-dot" aria-hidden="true"></span>
          <div class="quick-pill-text">
            <span class="quick-pill-eyebrow">Most cats delivered</span>
            <span class="quick-pill-label">{{ quickReadsCopy.mostCategoriesDelivered }}</span>
          </div>
        </li>
      </ul>
    </section>

    <!-- Modals -->
    <CategoryTeamDraftModal
      v-if="teamModalId"
      :team-id="teamModalId"
      @close="closeTeamModal"
      @open-signup="$emit('open-signup')"
      @open-pick="onOpenPickFromTeam"
    />
    <CategoryPlayerPickModal
      v-if="pickModalOverall !== null"
      :pick-overall="pickModalOverall"
      @close="closePickModal"
    />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  teams,
  getTeam,
  draftPicks2026,
  categoryDraftAwards,
  categoryTeamDraftGrades,
  puntReports,
  categoryKingBeats,
  draftQuickReads,
  catRanksFor,
  type CategoryTeamDraftGrade,
  type PlayerPosition,
  type CategoryId,
} from '@/fixtures/categoriesLeague'
import CategoryTeamDraftModal from '@/components/demo/CategoryTeamDraftModal.vue'
import CategoryPlayerPickModal from '@/components/demo/CategoryPlayerPickModal.vue'
import { renderDraftPage, type RenderedDraftCopy } from '@/editorial/render-draft'
import { categoriesFixtureToLeagueData } from '@/editorial/fixtureAdapter'
import type { LeagueDataH2HPoints } from '@/editorial/types'
import { buildDraftBoard, draftPositionCounts } from '@/editorial/points/draftBoard'
import { sleeperLeagueToCategoryData } from '@/editorial/adapters/sleeperAdapter'
import { espnLeagueToCategoryData } from '@/editorial/adapters/espnAdapter'
import { yahooLeagueToCategoryData } from '@/editorial/adapters/yahooAdapter'
import type { CategoryLeagueData } from '@/editorial/types'
import { usePlatformsStore } from '@/stores/platforms'
import { useLeaguesStore } from '@/stores/leaguesNew'
import LiveLoadError from '@/components/demo/LiveLoadError.vue'
import UnsupportedFormatPanel from '@/components/editorial/UnsupportedFormatPanel.vue'

defineEmits<{ (e: 'open-signup'): void }>()

const route = useRoute()

/* ─────────────────────────────────────────────────────────────────
   LIVE-DATA PIPELINE — same shape as CategoryDemoHomeView.

   Source of truth:
   - Default: the hand-authored fixture (demo experience).
   - When `?leagueId=…&platform=sleeper` is present in the URL:
     fetch live data via the adapter and re-render copy.
     The fixture render stays as the synchronous initial value so
     the template never sees a null editorial during load.

   When the live league has no draft data, `liveData.draft` is
   undefined and `renderDraftPage` returns the empty bundle. The
   template falls back to the fixture-based renders via the helper
   `awardSafe` / `puntSafe` / etc. computed wrappers below.
───────────────────────────────────────────────────────────────── */
const liveData = shallowRef<CategoryLeagueData | null>(null)
const liveDraftEditorial = shallowRef<RenderedDraftCopy>(
  renderDraftPage(categoriesFixtureToLeagueData()),
)
const liveLoading = ref(false)
const liveError = ref<string | null>(null)
// Set when the adapter resolves to a non-category format (Phase 0:
// h2h-points). Drives the UnsupportedFormatPanel.
const unsupportedFormat = ref<string | null>(null)
const unsupportedLeagueName = ref<string | null>(null)

// Two ways to bind to a real league (mirrors the other live views):
//   - Strict: /leagues/:leagueId/draft — leagueId is the Supabase UUID
//   - Soft (legacy): /demo-categories/draft?leagueId=…&platform=…
const leaguesStore = useLeaguesStore()
const strictLeagueRecord = computed(() => {
  const uuid = route.params.leagueId
  if (typeof uuid !== 'string' || uuid.length === 0) return null
  return leaguesStore.leagues.find((l) => l.id === uuid) ?? null
})
const isStrictLiveMode = computed(() => typeof route.params.leagueId === 'string')

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

// Human-readable platform label, surfaced by the loading and
// "no draft data" banners so the copy matches the platform the user
// actually picked on the Connect screen.
const platformLabel = computed(() => {
  const p = livePlatform.value
  if (p === 'yahoo') return 'Yahoo'
  if (p === 'espn') return 'ESPN'
  if (p === 'sleeper') return 'Sleeper'
  return 'your league'
})

// Editorial-voice loading copy. Same shape as Beat / Issue / Chronicles
// / Power Rankings / Matchups so all surfaces feel like one publication.
const loadingTitle = computed(() => `Pulling the draft.`)
const loadingSubline = computed(() => {
  const league = strictLeagueRecord.value?.league_name
  if (league) return `Reading ${league} picks from ${platformLabel.value}.`
  return `Reading the picks from ${platformLabel.value}.`
})

async function loadDraft() {
  if (isStrictLiveMode.value && leaguesStore.leagues.length === 0) {
    try {
      await leaguesStore.fetchLeagues()
    } catch (err) {
      console.warn('[CategoryDemoDraftView] fetchLeagues failed:', err)
    }
  }

  // Reset prior render state — component is reused across leagues.
  liveData.value = null
  liveError.value = null
  unsupportedFormat.value = null
  unsupportedLeagueName.value = null

  const id = liveLeagueId.value
  const platform = livePlatform.value
  if (!id || (platform !== 'sleeper' && platform !== 'espn' && platform !== 'yahoo')) {
    return  // fixture-only path
  }

  liveLoading.value = true
  liveError.value = null
  try {
    // See CategoryDemoHomeView for why we pass identity explicitly.
    const leagueRowId =
      typeof route.params.leagueId === 'string' ? route.params.leagueId : undefined
    const opts = { userIdentity: collectUserIdentity(), leagueRowId }
    const data =
      platform === 'espn'
        ? await espnLeagueToCategoryData(id, opts)
        : platform === 'yahoo'
        ? await yahooLeagueToCategoryData(id, opts)
        : await sleeperLeagueToCategoryData(id, opts)
    // Points leagues render the real draft board. There is no value
    // model for football picks, so the value-driven sections (awards,
    // grades, rounds hit/miss) stay hidden rather than showing zeros.
    if (data.format === 'h2h-points') {
      livePointsData.value = data
      if (leagueRowId && data.leagueName) {
        void leaguesStore.maybeBackfillLeagueName(leagueRowId, data.leagueName)
      }
      return
    }
    // Format gate — any remaining non-category format still routes to
    // the UnsupportedFormatPanel.
    if (data.format !== 'h2h-category') {
      unsupportedFormat.value = data.format
      unsupportedLeagueName.value = data.leagueName
      if (leagueRowId && data.leagueName) {
        void leaguesStore.maybeBackfillLeagueName(leagueRowId, data.leagueName)
      }
      return
    }
    liveData.value = data
    liveDraftEditorial.value = renderDraftPage(data)
    if (leagueRowId && data.leagueName) {
      void leaguesStore.maybeBackfillLeagueName(leagueRowId, data.leagueName)
    }
  } catch (err) {
    const platformLabel =
      platform === 'espn' ? 'ESPN' : platform === 'yahoo' ? 'Yahoo' : 'Sleeper'
    liveError.value = (err as Error).message || `Failed to load ${platformLabel} league data.`
  } finally {
    liveLoading.value = false
  }
}

onMounted(() => {
  void loadDraft()
})

// Watch for league-switcher navigation.
watch(
  () => route.params.leagueId,
  (next, prev) => {
    if (next === prev) return
    void loadDraft()
  },
)

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

/* ─── Awards ───────────────────────────────────────────────
   Same gating discipline as the Power Rankings MOVEMENT section:
   when there's no live award (best draft / steal / bust) AND we
   have a live league, return null so the card can hide rather than
   leak the fixture's pick into the user's real league view. Pure
   fixture mode (no liveData) keeps the fixture fallback so the
   demo page reads as before. */
const bestTeam = computed(() => {
  const id = liveDraftEditorial.value.awards.bestDraft?.teamId
    ?? (liveData.value ? null : categoryDraftAwards.bestDraft.teamId)
  return id ? getTeam(id) : null
})
const stealPick = computed(() => {
  const live = liveDraftEditorial.value.awards.steal
  if (!live && liveData.value) return null
  const pid = live?.playerId ?? categoryDraftAwards.steal.playerId
  return draftPicks2026.find((p) => p.playerId === pid)
    ?? synthesizePickFromLive(live)
    ?? draftPicks2026.find((p) => p.playerId === categoryDraftAwards.steal.playerId)
    ?? null
})
const stealTeam = computed(() => stealPick.value ? getTeam(stealPick.value.draftedByTeamId) : null)
const bustPick  = computed(() => {
  const live = liveDraftEditorial.value.awards.bust
  if (!live && liveData.value) return null
  const pid = live?.playerId ?? categoryDraftAwards.bust.playerId
  return draftPicks2026.find((p) => p.playerId === pid)
    ?? synthesizePickFromLive(live)
    ?? draftPicks2026.find((p) => p.playerId === categoryDraftAwards.bust.playerId)
    ?? null
})
const bustTeam  = computed(() => bustPick.value ? getTeam(bustPick.value.draftedByTeamId) : null)

/** Live h2h-points data. The draft board is the one section of this
 *  page that is genuinely format-agnostic — picks, rounds and teams
 *  mean the same thing in both sports — so points leagues render it
 *  and nothing else. */
const livePointsData = shallowRef<LeagueDataH2HPoints | null>(null)
const isPointsMode = computed(() => livePointsData.value !== null)

/** Team display for the points board, resolved from the league's own
 *  teams. Never falls back to the fixture `getTeam`: Sleeper roster ids
 *  are plain "1".."12" and would collide with demo team ids, printing
 *  someone else's league onto this page. */
function pointsTeam(teamId: string) {
  const t = livePointsData.value?.teams.find((x) => x.id === teamId)
  return (
    t ?? {
      id: teamId,
      name: `Team ${teamId}`,
      ownerName: `Manager ${teamId}`,
      ownerInitials: teamId.slice(0, 2).toUpperCase(),
      avatarUrl: undefined,
      avatarColor: 'oklch(0.62 0.18 200), oklch(0.42 0.18 220)',
      isMyTeam: false,
    }
  )
}

/** Board layout comes from the pure module so the awkward cases
 *  (traded picks, auction drafts, uneven rounds) are tested directly
 *  rather than through this view. */
const pointsDraftBoard = computed(() =>
  buildDraftBoard([...(livePointsData.value?.draft?.picks ?? [])]),
)
const pointsDraftColumns = computed(() => pointsDraftBoard.value.columns)
const pointsBoardRows = computed(() => pointsDraftBoard.value.rows)
const pointsPositionCounts = computed(() =>
  draftPositionCounts([...(livePointsData.value?.draft?.picks ?? [])]),
)

/** Hide the entire awards header when no award has data — prevents
 *  the "Three things you need to know." headline from sitting above
 *  an empty grid in a live league where the editorial layer didn't
 *  surface any awards. */
const showAwardsSection = computed(
  () => !!bestTeam.value || !!stealPick.value || !!bustPick.value,
)

/* Cross-source fallback: when the live editorial points at a pick
   we don't have in the fixture, build a minimal draft-pick shape
   from the live league data so the click-handlers and visual chrome
   don't crash. Returns undefined when no live data is present. */
function synthesizePickFromLive(
  award: { playerId: string; pickOverall: number; draftedByTeamId: string } | null | undefined,
): typeof draftPicks2026[number] | undefined {
  if (!award || !liveData.value?.draft) return undefined
  const p = liveData.value.draft.picks.find((x) => x.pickOverall === award.pickOverall)
  if (!p) return undefined
  return {
    pickOverall: p.pickOverall,
    pickInRound: ((p.pickOverall - 1) % 10) + 1,
    round: p.round,
    playerId: p.playerId,
    playerName: p.playerName,
    position: p.position as PlayerPosition,
    mlbTeam: p.mlbTeam,
    draftedByTeamId: p.draftedByTeamId,
    stats: {},
    valueScore: p.valueScore ?? 0,
    tier: 'hit',
  } as unknown as typeof draftPicks2026[number]
}

/* Resolved hero-award copy: live render with the original fixture
   render as a final safety net. The page-head stats fall through
   the live render too. */
const bestDraftCopy = computed(() => {
  const live = liveDraftEditorial.value.awards.bestDraft
  if (live) {
    return {
      headline: live.headline,
      body: live.body,
      grade: live.gradeLetter,
      stats: live.stats,
    }
  }
  return {
    headline: categoryDraftAwards.bestDraft.headline,
    body: categoryDraftAwards.bestDraft.body,
    grade: categoryDraftAwards.bestDraft.grade,
    stats: categoryDraftAwards.bestDraft.stats,
  }
})
const stealAwardCopy = computed(() => {
  const live = liveDraftEditorial.value.awards.steal
  if (live) {
    return {
      body: live.body,
      valueScore: live.valueScore,
    }
  }
  return {
    body: categoryDraftAwards.steal.body,
    valueScore: categoryDraftAwards.steal.valueScore,
  }
})
const bustAwardCopy = computed(() => {
  const live = liveDraftEditorial.value.awards.bust
  if (live) {
    return {
      body: live.body,
      valueScore: live.valueScore,
    }
  }
  return {
    body: categoryDraftAwards.bust.body,
    valueScore: categoryDraftAwards.bust.valueScore,
  }
})

/* ─── Page-head counts ───────────────────────────────────── */
const stealCount = computed(() =>
  draftPicks2026.filter((p) => p.tier === 'jackpot' || p.tier === 'steal').length,
)
const disasterCount = computed(() =>
  draftPicks2026.filter((p) => p.tier === 'disaster' || p.tier === 'bust').length,
)

/* ─── Grades — podium + rest ─────────────────────────────── */
// Grade-letter ladder shared between live and fixture renders.
const GRADE_ORDER = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'] as const
function gradeWeight(grade: string): number {
  const idx = (GRADE_ORDER as readonly string[]).indexOf(grade)
  return idx === -1 ? GRADE_ORDER.length : idx
}

/* When live draft editorial exposes grades for every team, we
   rebuild the ranked grade list from it (preserving the rank ordering
   used by the podium / compact rows). Otherwise, fall back to the
   fixture's hand-authored ranking. */
const sortedGrades = computed<CategoryTeamDraftGrade[]>(() => {
  const liveGrades = liveDraftEditorial.value.teamGrades
  const liveTeamIds = Object.keys(liveGrades)
  if (liveTeamIds.length === 0) {
    return [...categoryTeamDraftGrades].sort((a, b) => a.rank - b.rank)
  }
  // Build CategoryTeamDraftGrade-shaped rows from the live render.
  // Rank order: by grade letter strength, then by total steals-busts.
  const rows: CategoryTeamDraftGrade[] = liveTeamIds.map((teamId) => {
    const live = liveGrades[teamId]
    return {
      teamId,
      rank: 0,                            // assigned after sort
      grade: live.gradeLetter,
      headline: live.headline,
      narrative: live.body,
      stats: live.stats,
    }
  })
  rows.sort((a, b) => {
    const w = gradeWeight(a.grade) - gradeWeight(b.grade)
    if (w !== 0) return w
    return (b.stats.steals - b.stats.busts) - (a.stats.steals - a.stats.busts)
  })
  rows.forEach((r, i) => { r.rank = i + 1 })
  return rows
})
const podiumRanks = computed(() => sortedGrades.value.slice(0, 3))
const restRanks   = computed(() => sortedGrades.value.slice(3))

function teamFor(g: CategoryTeamDraftGrade) {
  return getTeam(g.teamId)
}
function gradeBand(grade: string): 'aplus' | 'a' | 'b' | 'c' | 'd' {
  if (grade === 'A+') return 'aplus'
  if (grade.startsWith('A')) return 'a'
  if (grade.startsWith('B')) return 'b'
  if (grade.startsWith('C')) return 'c'
  return 'd'
}
function gradeForTeam(teamId: string): CategoryTeamDraftGrade {
  // Prefer the freshly-computed sorted list so the board column
  // grade matches the podium grade after a live re-render.
  return sortedGrades.value.find((g) => g.teamId === teamId)
    ?? categoryTeamDraftGrades.find((g) => g.teamId === teamId)!
}

/* ─── Board ──────────────────────────────────────────────── */
// Board team-column order = draft slot order (round 1, left to right).
// Order: ws, ch, fb, mv, ct, ie, qs, wd, dd, bt
const DRAFT_COLUMN_ORDER = ['ws', 'ch', 'fb', 'mv', 'ct', 'ie', 'qs', 'wd', 'dd', 'bt'] as const

const boardTeams = computed(() => DRAFT_COLUMN_ORDER.map((id) => getTeam(id)))

interface BoardCell {
  pick: typeof draftPicks2026[number]
}
const boardCells = computed<BoardCell[]>(() => {
  const cells: BoardCell[] = []
  // Rows = rounds 1..18. Columns = boardTeams.
  // For odd rounds, column N's pick is pickInRound = N (left to right).
  // For even rounds, column N's pick is pickInRound = 11 - N (right to left).
  for (let round = 1; round <= 18; round++) {
    for (let col = 1; col <= 10; col++) {
      const pickInRound = round % 2 === 1 ? col : 11 - col
      const pick = draftPicks2026.find(
        (p) => p.round === round && p.pickInRound === pickInRound,
      )
      if (pick) cells.push({ pick })
    }
  }
  return cells
})

function cellBg(val: number): string {
  const intensity = Math.min(Math.abs(val) / 80, 1)
  if (val >= 5) {
    const alpha = 0.10 + intensity * 0.30
    return `oklch(0.72 0.18 145 / ${alpha.toFixed(2)})`
  }
  if (val <= -5) {
    const alpha = 0.10 + intensity * 0.30
    return `oklch(0.70 0.27 350 / ${alpha.toFixed(2)})`
  }
  return 'oklch(0.14 0.018 90)'
}
function cellBorder(val: number): string {
  if (val >= 25)  return 'oklch(0.72 0.18 145 / 0.55)'
  if (val >= 5)   return 'oklch(0.72 0.18 145 / 0.30)'
  if (val <= -25) return 'oklch(0.70 0.27 350 / 0.55)'
  if (val <= -5)  return 'oklch(0.70 0.27 350 / 0.30)'
  return 'oklch(0.20 0.015 90)'
}
function valueColor(val: number): string {
  if (val >= 5)  return 'oklch(0.86 0.18 145)'
  if (val <= -5) return 'oklch(0.80 0.20 350)'
  return 'oklch(0.78 0.008 90)'
}

function posBg(pos: PlayerPosition): string {
  switch (pos) {
    case 'C':  return 'oklch(0.74 0.15 60 / 0.20)'
    case '1B': return 'oklch(0.68 0.18 245 / 0.20)'
    case '2B': return 'oklch(0.68 0.18 220 / 0.20)'
    case '3B': return 'oklch(0.65 0.20 25 / 0.20)'
    case 'SS': return 'oklch(0.65 0.20 295 / 0.20)'
    case 'OF': return 'oklch(0.72 0.18 145 / 0.20)'
    case 'DH': return 'oklch(0.78 0.18 92 / 0.20)'
    case 'SP': return 'oklch(0.72 0.18 195 / 0.22)'
    case 'RP': return 'oklch(0.70 0.27 350 / 0.20)'
  }
}
function posFg(pos: PlayerPosition): string {
  switch (pos) {
    case 'C':  return 'oklch(0.84 0.15 60)'
    case '1B': return 'oklch(0.82 0.18 245)'
    case '2B': return 'oklch(0.82 0.18 220)'
    case '3B': return 'oklch(0.80 0.20 25)'
    case 'SS': return 'oklch(0.80 0.20 295)'
    case 'OF': return 'oklch(0.84 0.18 145)'
    case 'DH': return 'oklch(0.88 0.18 92)'
    case 'SP': return 'oklch(0.84 0.18 195)'
    case 'RP': return 'oklch(0.82 0.22 350)'
  }
}

/* ─── Round summary ──────────────────────────────────────── */
interface RoundRow {
  round: number
  hits: number
  misses: number
  neutral: number
  avgValue: number
}
const roundSummary = computed<RoundRow[]>(() => {
  const out: RoundRow[] = []
  for (let r = 1; r <= 18; r++) {
    const picks = draftPicks2026.filter((p) => p.round === r)
    let hits = 0, misses = 0, neutral = 0, sum = 0
    for (const p of picks) {
      if (p.valueScore >= 5) hits++
      else if (p.valueScore <= -5) misses++
      else neutral++
      sum += p.valueScore
    }
    out.push({ round: r, hits, misses, neutral, avgValue: sum / picks.length })
  }
  return out
})

/* ─── Position breakdown ─────────────────────────────────── */
interface PosBreak {
  position: PlayerPosition
  count: number
  avgValue: number
}
const positionBreakdown = computed<PosBreak[]>(() => {
  const positions: PlayerPosition[] = ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'OF', 'DH']
  return positions
    .map((pos) => {
      const picks = draftPicks2026.filter((p) => p.position === pos)
      const sum = picks.reduce((s, p) => s + p.valueScore, 0)
      return {
        position: pos,
        count: picks.length,
        avgValue: picks.length > 0 ? sum / picks.length : 0,
      }
    })
    .filter((pb) => pb.count > 0)
})

/* ─── Punt report data ───────────────────────────────────── */
const fixturePuntSuccess  = puntReports.find((p) => p.kind === 'success')!
const fixturePuntFailure  = puntReports.find((p) => p.kind === 'failure')!
const fixturePuntBalanced = puntReports.find((p) => p.kind === 'balanced')!

const puntSuccess = computed(() => {
  const live = liveDraftEditorial.value.puntReport.success
  if (!live) return fixturePuntSuccess
  return {
    kind: 'success' as const,
    teamId: live.teamId,
    category: live.category ?? fixturePuntSuccess.category,
    headline: live.headline,
    body: live.body,
    thisSeasonRank: live.thisSeasonRank ?? fixturePuntSuccess.thisSeasonRank,
  }
})
const puntFailure = computed(() => {
  const live = liveDraftEditorial.value.puntReport.failure
  if (!live) return fixturePuntFailure
  return {
    kind: 'failure' as const,
    teamId: live.teamId,
    category: live.category ?? fixturePuntFailure.category,
    headline: live.headline,
    body: live.body,
    thisSeasonRank: live.thisSeasonRank ?? fixturePuntFailure.thisSeasonRank,
  }
})
const puntBalanced = computed(() => {
  const live = liveDraftEditorial.value.puntReport.balanced
  if (!live) return fixturePuntBalanced
  return {
    kind: 'balanced' as const,
    teamId: live.teamId,
    category: 'NONE',
    headline: live.headline,
    body: live.body,
    thisSeasonRank: 0,
  }
})
const puntSuccessTeam  = computed(() => getTeam(puntSuccess.value.teamId))
const puntFailureTeam  = computed(() => getTeam(puntFailure.value.teamId))
const puntBalancedTeam = computed(() => getTeam(puntBalanced.value.teamId))

const balancedCatChips = computed(() => {
  const ranks = catRanksFor(puntBalanced.value.teamId)
  const catList: CategoryId[] = ['R', 'H', 'HR', 'RBI', 'SB', 'AVG', 'W', 'SV', 'K', 'HLD', 'ERA']
  return catList.map((cat) => {
    const rank = ranks[cat]
    let band: 'own' | 'mid' | 'bleed'
    if (rank <= 3) band = 'own'
    else if (rank <= 7) band = 'mid'
    else band = 'bleed'
    return { cat, rank, band }
  })
})

/* ─── Category kings ─────────────────────────────────────── */
const fixtureKingFiveTool = categoryKingBeats.find((k) => k.kind === 'five-tool')!
const fixtureKingLate     = categoryKingBeats.find((k) => k.kind === 'late-round-gem')!
const fixtureKingBroken   = categoryKingBeats.find((k) => k.kind === 'broken-cat')!

const kingFiveTool = computed(() => {
  const live = liveDraftEditorial.value.categoryKings.fiveTool
  if (!live) return fixtureKingFiveTool
  return {
    kind: 'five-tool' as const,
    eyebrow: live.eyebrow,
    headline: live.headline,
    body: live.body,
    playerId: live.playerId,
    cats: live.cats ?? fixtureKingFiveTool.cats,
  }
})
const kingLate = computed(() => {
  const live = liveDraftEditorial.value.categoryKings.lateRoundGem
  if (!live) return fixtureKingLate
  return {
    kind: 'late-round-gem' as const,
    eyebrow: live.eyebrow,
    headline: live.headline,
    body: live.body,
    playerId: live.playerId,
    round: fixtureKingLate.round,
    draftRoundPick: live.draftRoundPick ?? fixtureKingLate.draftRoundPick,
  }
})
const kingBroken = computed(() => {
  const live = liveDraftEditorial.value.categoryKings.brokenCat
  if (!live) return fixtureKingBroken
  return {
    kind: 'broken-cat' as const,
    eyebrow: live.eyebrow,
    headline: live.headline,
    body: live.body,
    playerId: live.playerId,
    brokenCat: live.brokenCat ?? fixtureKingBroken.brokenCat,
    brokenTeamId: live.brokenTeamId ?? fixtureKingBroken.brokenTeamId,
  }
})

const kingFiveToolPick = computed(() =>
  draftPicks2026.find((p) => p.playerId === kingFiveTool.value.playerId)
    ?? draftPicks2026.find((p) => p.playerId === fixtureKingFiveTool.playerId)!,
)
const kingLatePick = computed(() =>
  draftPicks2026.find((p) => p.playerId === kingLate.value.playerId)
    ?? draftPicks2026.find((p) => p.playerId === fixtureKingLate.playerId)!,
)
const kingBrokenPick = computed(() =>
  draftPicks2026.find((p) => p.playerId === kingBroken.value.playerId)
    ?? draftPicks2026.find((p) => p.playerId === fixtureKingBroken.playerId)!,
)

/* ─── Quick-read pills ───────────────────────────────────── */
/* Live pills, keyed by pill name for direct template lookup. The
   fallback uses the fixture's labels when the live render returned
   an empty bundle. */
const quickReadsCopy = computed(() => {
  const byPill = new Map<string, string>()
  for (const p of liveDraftEditorial.value.quickReads) {
    byPill.set(p.pill, p.value)
  }
  return {
    highestValuePick:        byPill.get('highest-value-pick')       ?? draftQuickReads.highestValuePick.label,
    biggestBust:             byPill.get('biggest-bust')             ?? draftQuickReads.biggestBust.label,
    bestLateRound:           byPill.get('best-late-round')          ?? draftQuickReads.bestLateRound.label,
    mostCategoriesDelivered: byPill.get('most-categories-delivered') ?? draftQuickReads.mostCategoriesDelivered.label,
  }
})

/* ─── By-the-round narratives ────────────────────────────── */
/* Map round number → editorial sentence from the live render. The
   numerical hit/miss/avg figures already come from `roundSummary`
   which we keep as the source of truth for the bar chart widths. */
const roundNarratives = computed(() => {
  const out = new Map<number, string>()
  for (const r of liveDraftEditorial.value.byTheRound) {
    out.set(r.round, r.narrative)
  }
  return out
})

/* ─── Modal state ────────────────────────────────────────── */
const teamModalId = ref<string | null>(null)
const pickModalOverall = ref<number | null>(null)
const lastFocused = ref<HTMLElement | null>(null)

function openTeamModal(teamId: string, ev?: Event) {
  lastFocused.value = (ev?.currentTarget as HTMLElement | null) ?? null
  teamModalId.value = teamId
}
function closeTeamModal() {
  teamModalId.value = null
  nextTick(() => lastFocused.value?.focus?.())
}
function openPickModal(pickOverall: number) {
  lastFocused.value = (document.activeElement as HTMLElement) ?? null
  pickModalOverall.value = pickOverall
}
function closePickModal() {
  pickModalOverall.value = null
  nextTick(() => lastFocused.value?.focus?.())
}
function onOpenPickFromTeam(pickOverall: number) {
  // Switch from team modal to player modal.
  teamModalId.value = null
  nextTick(() => {
    pickModalOverall.value = pickOverall
  })
}
</script>

<style scoped>
/* Points draft board — the value-free variant. */
.board-cell-static {
  cursor: default;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.points-pick {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.points-pick + .points-pick {
  padding-top: 6px;
  border-top: 1px solid oklch(0.24 0.015 90);
}
.points-pick-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: oklch(0.58 0.010 90);
}
.points-board-empty {
  padding: 28px;
  border-radius: 12px;
  border: 1px solid oklch(0.20 0.015 90);
  color: oklch(0.62 0.010 90);
}

/* Tokens inherited from .demo-shell in CategoryDemoLayout. */
.catdraft {
  --accent-positive: oklch(0.72 0.18 145);

  display: flex;
  flex-direction: column;
  gap: 64px;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}

/* ─── LOADING STATE ───────────────────────────────────────────── */
/* Mirrors Beat / Issue / Chronicles / Power Rankings / Matchups. */
.draft-loading {
  position: relative;
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  background:
    radial-gradient(ellipse 600px 400px at 50% 35%, oklch(0.66 0.22 0 / 0.10), transparent 70%),
    radial-gradient(ellipse 700px 400px at 50% 95%, oklch(0.78 0.18 92 / 0.06), transparent 70%);
  animation: draft-loading-glow 4s ease-in-out infinite alternate;
}
@keyframes draft-loading-glow {
  0%   { opacity: 0.85; }
  100% { opacity: 1.00; }
}
.draft-loading-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: oklch(0.18 0.015 90);
  overflow: hidden;
  z-index: 100;
  pointer-events: none;
}
.draft-loading-bar-fill {
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, transparent 0%, var(--accent-primary) 50%, transparent 100%);
  animation: draft-loading-slide 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
@keyframes draft-loading-slide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
.draft-loading-stage {
  max-width: 560px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.draft-loading-logo-shadow {
  margin: 0 0 28px;
  filter: drop-shadow(0 12px 32px oklch(0 0 0 / 0.45));
}
.draft-loading-logo {
  position: relative;
  width: 88px;
  height: 88px;
  perspective: 800px;
}
.draft-loading-logo img {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 18px;
  animation:
    draft-loading-logo-in 320ms cubic-bezier(0.23, 1, 0.32, 1) both,
    draft-loading-spin 2.4s cubic-bezier(0.65, 0, 0.35, 1) infinite 320ms;
}
@keyframes draft-loading-logo-in {
  0%   { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes draft-loading-spin {
  0%, 100% { transform: rotateY(-50deg); }
  50%      { transform: rotateY( 50deg); }
}
.draft-loading-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 3.4vw, 2.6rem);
  line-height: 1.05;
  letter-spacing: -0.014em;
  color: var(--ink-1);
  margin: 0 0 10px;
  animation: draft-loading-text-in 360ms cubic-bezier(0.23, 1, 0.32, 1) 320ms both;
}
.draft-loading-sub {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ink-3);
  margin: 0;
  max-width: 42ch;
  animation: draft-loading-text-in 360ms cubic-bezier(0.23, 1, 0.32, 1) 400ms both;
}
@keyframes draft-loading-text-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ─── SECTION REVEAL STAGGER ──────────────────────────────────── */
.catdraft > *:not(.draft-loading) {
  animation: draft-section-in 360ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
.catdraft > *:not(.draft-loading):nth-child(1) { animation-delay: 0ms; }
.catdraft > *:not(.draft-loading):nth-child(2) { animation-delay: 60ms; }
.catdraft > *:not(.draft-loading):nth-child(3) { animation-delay: 120ms; }
.catdraft > *:not(.draft-loading):nth-child(4) { animation-delay: 180ms; }
.catdraft > *:not(.draft-loading):nth-child(n+5) { animation-delay: 240ms; }
@keyframes draft-section-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .catdraft > *:not(.draft-loading) { animation: none; }
}

/* ─── Shared section heads ──────────────────────────────── */
.section-head { margin-bottom: 18px; }
.section-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin: 0 0 8px;
}
.section-eyebrow-magenta { color: var(--accent-secondary); }
.section-eyebrow-teal    { color: var(--accent-tertiary); }
.section-eyebrow::before {
  content: '';
  width: 24px;
  height: 1px;
  background: currentColor;
}
.section-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.75rem, 3.2vw, 2.25rem);
  line-height: 1.0;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 6px 0 0;
}
.section-sub {
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--ink-3);
  margin: 8px 0 0;
  max-width: 60ch;
}

/* ─── Page head ─────────────────────────────────────────── */
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
  color: var(--accent-secondary);
  margin: 0 0 12px;
}
.page-eyebrow-bar { width: 24px; height: 1px; background: var(--accent-secondary); }
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
  max-width: 52ch;
}
.page-context {
  list-style: none;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.page-context-stat { display: inline-flex; align-items: baseline; gap: 6px; }
.page-context-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
}
.page-context-num-pos { color: var(--accent-positive); }
.page-context-num-neg { color: var(--accent-secondary); }
.page-context-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.page-context-sep {
  width: 1px; height: 14px;
  background: var(--ink-5);
  display: inline-block;
}

@media (max-width: 720px) {
  .page-head { flex-direction: column; align-items: flex-start; gap: 16px; }
  .page-context { gap: 10px; }
}

/* ─── Awards ────────────────────────────────────────────── */
.awards-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 18px;
}
.award-best {
  grid-column: 1 / -1;
  position: relative;
  display: grid;
  grid-template-columns: 132px 1fr auto;
  gap: 28px;
  align-items: center;
  padding: 26px 30px;
  border-radius: 18px;
  background:
    radial-gradient(ellipse 50% 100% at 0% 50%, oklch(0.78 0.18 92 / 0.12), transparent 65%),
    oklch(0.11 0.015 90);
  border: 1px solid oklch(0.78 0.18 92 / 0.30);
  overflow: hidden;
}
.award-best-chrome-top,
.award-best-chrome-bottom {
  position: absolute;
  left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    transparent,
    oklch(0.78 0.18 92 / 0.7) 30%,
    oklch(0.92 0.16 92) 50%,
    oklch(0.78 0.18 92 / 0.7) 70%,
    transparent);
  pointer-events: none;
}
.award-best-chrome-top { top: 0; }
.award-best-chrome-bottom { bottom: 0; }
.award-best-glow {
  position: absolute;
  inset: -20px;
  background: radial-gradient(ellipse 30% 60% at 80% 50%, oklch(0.78 0.18 92 / 0.20), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.award-best > * { position: relative; z-index: 1; }
.award-best-portrait { width: 132px; height: 132px; }
.award-best-avatar {
  width: 132px; height: 132px;
  border-radius: 24px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.6rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  box-shadow: 0 12px 32px -10px oklch(0 0 0 / 0.55);
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.award-best-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-primary);
  margin: 0 0 8px;
}
.award-best-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.6rem, 3.6vw, 2.0rem);
  line-height: 0.98;
  letter-spacing: -0.008em;
  color: var(--ink-1);
  margin: 0 0 12px;
  max-width: 36ch;
}
.award-best-copy {
  font-size: 1rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0 0 16px;
  max-width: 56ch;
}
.award-best-stats {
  list-style: none;
  padding: 0;
  margin: 0 0 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  font-family: 'Barlow Condensed', sans-serif;
}
.award-best-stats li { display: inline-flex; align-items: baseline; gap: 6px; font-size: 0.86rem; }
.award-best-stat-num {
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  font-size: 1rem;
  color: var(--ink-1);
}
.award-best-stat-num-pos { color: var(--accent-positive); }
.award-best-stat-num-neg { color: var(--accent-secondary); }
.award-best-stat-label {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.award-best-stat-sep { width: 1px; height: 12px; background: var(--ink-5); }
.award-best-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.88rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: oklch(0.10 0.012 90);
  background: var(--accent-primary);
  border: none;
  padding: 10px 18px;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .award-best-cta:hover { transform: translateY(-1px); background: oklch(0.82 0.18 92); }
}
.award-best-cta:active { transform: scale(0.97); transition-duration: 100ms; }
.award-best-cta:focus-visible { outline: 2px solid var(--ink-1); outline-offset: 2px; }
.award-best-grade {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(5rem, 12vw, 8rem);
  line-height: 0.84;
  letter-spacing: -0.04em;
  color: oklch(0.92 0.18 92);
  margin: 0;
  filter: drop-shadow(0 0 30px oklch(0.78 0.18 92 / 0.6));
  align-self: center;
}

/* Steal */
.award-steal {
  position: relative;
  padding: 22px 24px;
  border-radius: 18px;
  background: oklch(0.72 0.18 145 / 0.06);
  border: 1px solid oklch(0.72 0.18 145 / 0.25);
  cursor: pointer;
  overflow: hidden;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), border-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .award-steal:hover { transform: translateY(-1px); border-color: oklch(0.72 0.18 145 / 0.50); }
  .award-bust:hover  { transform: translateY(-1px); border-color: oklch(0.70 0.27 350 / 0.50); }
}
.award-steal:active, .award-bust:active { transform: scale(0.99); transition-duration: 100ms; }
.award-steal:focus-visible, .award-bust:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
.award-steal-edge {
  position: absolute;
  top: 0; bottom: 0; left: 0;
  width: 3px;
  background: var(--accent-positive);
}
.award-steal-corner, .award-bust-corner {
  position: absolute;
  width: 18px; height: 18px;
  pointer-events: none;
}
.award-steal-corner-tl {
  top: 8px; left: 8px;
  border-top: 2px solid oklch(0.72 0.18 145 / 0.60);
  border-left: 2px solid oklch(0.72 0.18 145 / 0.60);
}
.award-steal-corner-br {
  bottom: 8px; right: 8px;
  border-bottom: 2px solid oklch(0.72 0.18 145 / 0.60);
  border-right: 2px solid oklch(0.72 0.18 145 / 0.60);
}
.award-bust-corner-tr {
  top: 16px; right: 8px;
  border-top: 2px solid oklch(0.70 0.27 350 / 0.60);
  border-right: 2px solid oklch(0.70 0.27 350 / 0.60);
}
.award-bust-corner-bl {
  bottom: 8px; left: 8px;
  border-bottom: 2px solid oklch(0.70 0.27 350 / 0.60);
  border-left: 2px solid oklch(0.70 0.27 350 / 0.60);
}
.award-steal-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.86 0.18 145);
  margin: 0 0 12px;
}
.award-steal-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 10px;
}
.award-steal-glyph {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.92rem;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.award-steal-text { min-width: 0; }
.award-steal-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.3rem, 2.4vw, 1.7rem);
  line-height: 1.0;
  letter-spacing: -0.008em;
  color: var(--ink-1);
  margin: 0;
}
.award-steal-meta {
  margin: 4px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.dot { color: var(--ink-4); }
.award-pos-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  font-weight: 800;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
}
.award-steal-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(3.5rem, 8vw, 5rem);
  line-height: 0.86;
  letter-spacing: -0.025em;
  color: oklch(0.84 0.18 145);
  margin: 4px 0 12px;
  font-variant-numeric: tabular-nums;
}
.award-steal-body {
  font-size: 0.96rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 0 0 16px;
  max-width: 44ch;
}
.award-steal-by, .award-bust .award-steal-by {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.award-by-avatar {
  width: 28px; height: 28px;
  border-radius: 8px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.76rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.award-by-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-2);
}

/* Bust */
.award-bust {
  position: relative;
  padding: 20px 22px 22px;
  border-radius: 18px;
  background: oklch(0.70 0.27 350 / 0.06);
  border: 1px solid oklch(0.70 0.27 350 / 0.25);
  cursor: pointer;
  overflow: hidden;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), border-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.award-bust-tape {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 7px;
  background-image: repeating-linear-gradient(
    -45deg,
    oklch(0.78 0.18 92) 0 12px,
    oklch(0.16 0.018 90) 12px 24px
  );
}
.award-bust-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 12px 0 12px;
}
.award-bust-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.1rem, 2.0vw, 1.55rem);
  line-height: 1.0;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0;
}
.award-bust-meta {
  margin: 4px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.award-bust-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.4rem, 5vw, 3rem);
  line-height: 0.86;
  letter-spacing: -0.025em;
  color: oklch(0.78 0.22 350);
  margin: 8px 0 10px;
  font-variant-numeric: tabular-nums;
}
.award-bust-body {
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 0 0 14px;
  max-width: 38ch;
}

@media (max-width: 920px) {
  .award-best { grid-template-columns: 80px 1fr; gap: 18px; padding: 20px 22px; }
  .award-best-grade { display: none; }
  .award-best-portrait, .award-best-avatar { width: 80px; height: 80px; font-size: 1.6rem; border-radius: 18px; }
}
@media (max-width: 720px) {
  .awards-grid { grid-template-columns: 1fr; }
}

/* ─── Standings / Grades ────────────────────────────────── */
.podium {
  display: grid;
  grid-template-columns: 0.9fr 1.05fr 0.85fr;
  gap: 16px;
  align-items: end;
  margin-bottom: 18px;
}
.podium-card {
  position: relative;
  border-radius: 16px;
  padding: 22px;
  cursor: pointer;
  text-align: left;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), border-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
  border: 1px solid oklch(0.20 0.015 90);
  background: oklch(0.11 0.015 90);
}
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .podium-card:hover { transform: translateY(-2px); }
}
.podium-card:active { transform: scale(0.99); transition-duration: 100ms; }
.podium-card:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
.podium-card.is-my-team { border-color: oklch(0.78 0.18 92 / 0.55); }
.podium-medal {
  display: inline-grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.92rem;
  letter-spacing: -0.005em;
  width: 28px; height: 28px;
  border-radius: 999px;
  margin-bottom: 14px;
}
.podium-medal-gold {
  background: oklch(0.78 0.18 92 / 0.20);
  color: oklch(0.92 0.18 92);
  border: 1px solid oklch(0.78 0.18 92 / 0.45);
}
.podium-medal-silver {
  background: oklch(0.78 0.008 90 / 0.18);
  color: oklch(0.92 0.008 90);
  border: 1px solid oklch(0.78 0.008 90 / 0.40);
}
.podium-medal-bronze {
  background: oklch(0.62 0.10 60 / 0.18);
  color: oklch(0.80 0.12 60);
  border: 1px solid oklch(0.62 0.10 60 / 0.40);
}
.podium-avatar {
  border-radius: 16px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  margin-bottom: 14px;
  box-shadow: 0 12px 32px -10px oklch(0 0 0 / 0.55);
}
.podium-avatar-gold { width: 72px; height: 72px; }
.podium-avatar-silver { width: 64px; height: 64px; }
.podium-avatar-bronze { width: 56px; height: 56px; }

.podium-gold {
  background:
    radial-gradient(ellipse 80% 90% at 20% 0%, oklch(0.78 0.18 92 / 0.10), transparent 65%),
    oklch(0.12 0.015 90);
  border-color: oklch(0.78 0.18 92 / 0.32);
  padding: 30px 26px;
}
.podium-silver {
  background:
    radial-gradient(ellipse 80% 90% at 20% 0%, oklch(0.78 0.008 90 / 0.06), transparent 65%),
    oklch(0.11 0.015 90);
  border-color: oklch(0.78 0.008 90 / 0.20);
}
.podium-bronze {
  background:
    radial-gradient(ellipse 80% 90% at 20% 0%, oklch(0.62 0.10 60 / 0.06), transparent 65%),
    oklch(0.11 0.015 90);
  border-color: oklch(0.62 0.10 60 / 0.22);
}

.podium-team-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.15rem;
  line-height: 1.0;
  color: var(--ink-1);
  margin: 0 0 4px;
}
.podium-team-name-large { font-size: 1.4rem; }
.podium-team-owner {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 14px;
}
.podium-grade {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  line-height: 0.86;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  margin: 0 0 14px;
}
.podium-grade-gold {
  font-size: clamp(3.5rem, 7vw, 5rem);
  color: oklch(0.92 0.18 92);
  filter: drop-shadow(0 0 24px oklch(0.78 0.18 92 / 0.45));
}
.podium-grade-silver {
  font-size: clamp(2.8rem, 5.5vw, 4rem);
  color: oklch(0.92 0.008 90);
}
.podium-grade-bronze {
  font-size: clamp(2.4rem, 4.5vw, 3.4rem);
  color: oklch(0.80 0.12 60);
}
.podium-stats {
  margin: 0 0 12px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-2);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.podium-stat-pos { color: var(--accent-positive); }
.podium-stat-neg { color: var(--accent-secondary); }
.podium-editorial {
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0;
  max-width: 40ch;
}

.podium > :nth-child(1) { order: 1; }
.podium > :nth-child(2) { order: 2; }
.podium > :nth-child(3) { order: 3; }

@media (max-width: 880px) {
  .podium { grid-template-columns: 1fr; gap: 12px; }
  .podium > :nth-child(1) { order: 2; }
  .podium > :nth-child(2) { order: 1; }
  .podium > :nth-child(3) { order: 3; }
}

/* Rows 4-10 */
.rest {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rest-row {
  display: grid;
  grid-template-columns: 24px 36px minmax(0, 1fr) 48px auto;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-radius: 10px;
  background: oklch(0.11 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  cursor: pointer;
  transition: background 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .rest-row:hover { background: oklch(0.14 0.015 90); border-color: oklch(0.26 0.015 90); }
}
.rest-row:active { transform: scale(0.99); transition-duration: 100ms; }
.rest-row:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
.rest-row.is-my-team {
  border-color: oklch(0.78 0.18 92 / 0.50);
  background: oklch(0.78 0.18 92 / 0.05);
}
.rest-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  color: var(--ink-3);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.rest-avatar {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.rest-text { min-width: 0; }
.rest-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.98rem;
  color: var(--ink-1);
  margin: 0;
}
.rest-owner {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 1px 0 0;
}
.rest-grade {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.rest-grade-aplus { color: oklch(0.92 0.18 92); }
.rest-grade-a     { color: oklch(0.86 0.16 145); }
.rest-grade-b     { color: oklch(0.86 0.10 195); }
.rest-grade-c     { color: oklch(0.78 0.18 50); }
.rest-grade-d     { color: oklch(0.78 0.22 350); }
.rest-stats {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-2);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.rest-stat-pos { color: var(--accent-positive); }
.rest-stat-neg { color: var(--accent-secondary); }
.rest-sep { width: 1px; height: 10px; background: var(--ink-5); }

@media (max-width: 600px) {
  .rest-row { grid-template-columns: 20px 32px minmax(0, 1fr) auto; grid-template-rows: auto auto; }
  .rest-stats { grid-column: 2 / -1; grid-row: 2; }
}

/* ─── Board ─────────────────────────────────────────────── */
.board-scroll {
  overflow-x: auto;
  margin-top: 16px;
  scrollbar-width: thin;
}
.board-grid {
  display: grid;
  grid-template-columns: repeat(var(--team-count, 10), minmax(100px, 1fr));
  gap: 6px;
  min-width: 1100px;
}
.board-col-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px 12px;
  border-bottom: 1px solid oklch(0.18 0.015 90);
}
.board-col-head.is-my-team .board-col-name { color: var(--accent-primary); }
.board-col-avatar {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.82rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.board-col-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--ink-2);
  text-align: center;
  max-width: 100px;
  line-height: 1.05;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.board-col-grade {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.82rem;
  letter-spacing: -0.01em;
}
.board-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 8px 7px;
  border-radius: 8px;
  border: 1px solid;
  cursor: pointer;
  text-align: left;
  color: var(--ink-1);
  font-family: 'Barlow', sans-serif;
  transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
  min-height: 70px;
}
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .board-cell:hover { transform: translateY(-1px); }
}
.board-cell:active { transform: scale(0.99); transition-duration: 100ms; }
.board-cell:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; z-index: 1; }
.board-cell-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--ink-3);
}
.board-cell-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  line-height: 1.05;
  color: var(--ink-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.board-cell-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}
.board-cell-pos {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  padding: 2px 5px;
  border-radius: 4px;
}
.board-cell-val {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
}

/* ─── Rounds ─────────────────────────────────────────────── */
.rounds-list {
  list-style: none;
  padding: 0;
  margin: 0 0 28px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rounds-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 92px;
  align-items: center;
  gap: 14px;
}
.rounds-chip {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  letter-spacing: -0.01em;
  color: var(--ink-2);
  text-align: center;
  padding: 6px 0;
  border-radius: 8px;
  background: oklch(0.13 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
}
.rounds-bar {
  position: relative;
  display: flex;
  align-items: stretch;
  height: 28px;
  border-radius: 6px;
  overflow: hidden;
  background: oklch(0.13 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
}
.rounds-bar-hits, .rounds-bar-neutral, .rounds-bar-misses {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}
.rounds-bar-hits {
  background: oklch(0.72 0.18 145 / 0.40);
  color: oklch(0.94 0.10 145);
}
.rounds-bar-neutral { background: transparent; }
.rounds-bar-misses {
  background: oklch(0.70 0.27 350 / 0.40);
  color: oklch(0.94 0.10 350);
}
.rounds-avg {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
  text-align: right;
  display: inline-flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 6px;
}
.rounds-avg-label {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.rounds-pills-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 12px;
}
.rounds-pills {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.rounds-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.rounds-pill-pos { font-weight: 900; letter-spacing: 0.08em; }
.rounds-pill-sep { color: oklch(0.20 0.015 90); }

/* ─── Punt report ───────────────────────────────────────── */
.punt-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 16px;
}
.punt-card {
  position: relative;
  padding: 22px 24px 24px;
  border-radius: 16px;
  overflow: hidden;
}
.punt-success {
  background:
    radial-gradient(ellipse 80% 100% at 0% 0%, oklch(0.72 0.18 145 / 0.10), transparent 65%),
    oklch(0.11 0.015 90);
  border: 1px solid oklch(0.72 0.18 145 / 0.28);
}
.punt-failure {
  background:
    radial-gradient(ellipse 80% 100% at 100% 0%, oklch(0.70 0.27 350 / 0.10), transparent 65%),
    oklch(0.11 0.015 90);
  border: 1px solid oklch(0.70 0.27 350 / 0.28);
}
.punt-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 12px;
}
.punt-chip-success {
  background: oklch(0.72 0.18 145 / 0.16);
  color: oklch(0.88 0.18 145);
  border: 1px solid oklch(0.72 0.18 145 / 0.40);
}
.punt-chip-failure {
  background: oklch(0.70 0.27 350 / 0.16);
  color: oklch(0.84 0.20 350);
  border: 1px solid oklch(0.70 0.27 350 / 0.40);
}
.punt-team {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.punt-avatar {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  flex-shrink: 0;
}
.punt-team-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  color: var(--ink-1);
  margin: 0;
}
.punt-cat-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.70rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 4px;
}
.punt-cat-big {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(3rem, 6vw, 4.2rem);
  line-height: 0.86;
  letter-spacing: -0.025em;
  margin: 0 0 14px;
  font-variant-numeric: tabular-nums;
}
.punt-success .punt-cat-big { color: oklch(0.86 0.18 145); }
.punt-failure .punt-cat-big { color: oklch(0.84 0.20 350); }
.punt-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.15rem;
  line-height: 1.1;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0 0 8px;
}
.punt-body {
  font-size: 0.94rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0 0 14px;
  max-width: 44ch;
}
.punt-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0;
}
.punt-rank-num {
  font-weight: 900;
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
  color: oklch(0.86 0.18 145);
}
.punt-rank-num-neg { color: oklch(0.82 0.20 350); }

/* Balanced champ — full width below */
.punt-balanced {
  grid-column: 1 / -1;
  position: relative;
  padding: 22px 24px;
  border-radius: 16px;
  background:
    radial-gradient(ellipse 70% 100% at 0% 50%, oklch(0.78 0.18 92 / 0.10), transparent 65%),
    oklch(0.11 0.015 90);
  border: 1px solid oklch(0.78 0.18 92 / 0.32);
  display: grid;
  grid-template-columns: minmax(280px, 1fr) auto;
  gap: 28px;
  align-items: center;
}
.punt-balanced-id { display: flex; gap: 16px; align-items: center; min-width: 0; }
.punt-avatar-large { width: 64px; height: 64px; border-radius: 14px; font-size: 1.2rem; }
.punt-balanced-text { min-width: 0; }
.punt-balanced-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-primary);
  margin: 0 0 4px;
}
.punt-balanced-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.25rem, 2.4vw, 1.55rem);
  line-height: 1.1;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0 0 8px;
  max-width: 50ch;
}
.punt-balanced-body {
  font-size: 0.94rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0;
  max-width: 56ch;
}
.punt-finger {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 360px;
}
.punt-finger-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 44px;
  padding: 6px 0;
  border-radius: 8px;
  border: 1px solid;
  font-family: 'Barlow Condensed', sans-serif;
}
.punt-finger-cat {
  font-weight: 900;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
}
.punt-finger-rank {
  font-weight: 700;
  font-size: 0.70rem;
  letter-spacing: 0.04em;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}
.punt-finger-own {
  background: oklch(0.72 0.18 145 / 0.18);
  color: oklch(0.88 0.18 145);
  border-color: oklch(0.72 0.18 145 / 0.36);
}
.punt-finger-mid {
  background: oklch(0.78 0.16 75 / 0.10);
  color: oklch(0.86 0.14 75);
  border-color: oklch(0.78 0.16 75 / 0.28);
}
.punt-finger-bleed {
  background: oklch(0.70 0.27 350 / 0.14);
  color: oklch(0.84 0.20 350);
  border-color: oklch(0.70 0.27 350 / 0.32);
}

@media (max-width: 880px) {
  .punt-grid { grid-template-columns: 1fr; }
  .punt-balanced { grid-template-columns: 1fr; gap: 16px; }
}

/* ─── Category kings ─────────────────────────────────────── */
.kings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 16px;
}
.king-card {
  position: relative;
  padding: 22px 24px 24px;
  border-radius: 16px;
  background: oklch(0.11 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  cursor: pointer;
  overflow: hidden;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), border-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .king-card:hover { transform: translateY(-1px); }
}
.king-card:active { transform: scale(0.99); transition-duration: 100ms; }
.king-card:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
.king-fivetool {
  background:
    radial-gradient(ellipse 80% 100% at 0% 0%, oklch(0.78 0.18 92 / 0.10), transparent 65%),
    oklch(0.11 0.015 90);
  border-color: oklch(0.78 0.18 92 / 0.30);
}
.king-late {
  background:
    radial-gradient(ellipse 80% 100% at 100% 0%, oklch(0.72 0.18 145 / 0.08), transparent 65%),
    oklch(0.11 0.015 90);
  border-color: oklch(0.72 0.18 145 / 0.26);
}
.king-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin: 0 0 14px;
}
.king-eyebrow-fivetool { color: var(--accent-primary); }
.king-eyebrow-late     { color: oklch(0.86 0.18 145); }
.king-eyebrow-broken   { color: var(--accent-secondary); }
.king-player {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.king-glyph {
  width: 56px; height: 56px;
  border-radius: 14px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.0rem;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.king-player-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.3rem;
  line-height: 1.0;
  letter-spacing: -0.008em;
  color: var(--ink-1);
  margin: 0 0 4px;
}
.king-player-meta {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0;
}
.king-cats {
  list-style: none;
  padding: 0;
  margin: 0 0 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.king-cat-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.74rem;
  letter-spacing: 0.10em;
  color: oklch(0.88 0.18 145);
  background: oklch(0.72 0.18 145 / 0.16);
  border: 1px solid oklch(0.72 0.18 145 / 0.32);
  border-radius: 999px;
}
.king-late-pick {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.4rem, 2.6vw, 1.8rem);
  letter-spacing: 0.04em;
  color: oklch(0.86 0.18 145);
  margin: 0 0 8px;
}
.king-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.20rem;
  line-height: 1.1;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0 0 8px;
}
.king-body {
  font-size: 0.94rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0;
  max-width: 50ch;
}

/* Broken cat — full width below */
.king-broken {
  position: relative;
  grid-column: 1 / -1;
  padding: 24px 26px;
  border-radius: 16px;
  background:
    radial-gradient(ellipse 70% 100% at 100% 50%, oklch(0.70 0.27 350 / 0.12), transparent 65%),
    oklch(0.11 0.015 90);
  border: 1px solid oklch(0.70 0.27 350 / 0.32);
  cursor: pointer;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(220px, 1.2fr) auto minmax(0, 1.4fr);
  gap: 28px;
  align-items: center;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), border-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .king-broken:hover { transform: translateY(-1px); border-color: oklch(0.70 0.27 350 / 0.50); }
}
.king-broken:active { transform: scale(0.99); transition-duration: 100ms; }
.king-broken:focus-visible { outline: 2px solid var(--accent-secondary); outline-offset: 2px; }
.king-broken-tape {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 6px;
  background-image: repeating-linear-gradient(
    -45deg,
    oklch(0.70 0.27 350) 0 10px,
    oklch(0.16 0.018 90) 10px 20px
  );
}
.king-broken-id { display: flex; align-items: center; gap: 14px; min-width: 0; }
.king-broken-glyph {
  width: 56px; height: 56px;
  border-radius: 14px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.0rem;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.king-broken-text { min-width: 0; }
.king-broken-player {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  line-height: 1.0;
  color: var(--ink-1);
  margin: 0 0 4px;
}
.king-broken-cat {
  text-align: center;
  padding: 12px 18px;
  border-left: 1px solid oklch(0.20 0.015 90);
  border-right: 1px solid oklch(0.20 0.015 90);
}
.king-broken-cat-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 4px;
}
.king-broken-cat-big {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.4rem, 5vw, 3.4rem);
  line-height: 0.86;
  letter-spacing: -0.025em;
  color: oklch(0.84 0.20 350);
  margin: 0;
}
.king-broken-copy { min-width: 0; }

@media (max-width: 880px) {
  .kings-grid { grid-template-columns: 1fr; }
  .king-broken { grid-template-columns: 1fr; gap: 16px; }
  .king-broken-cat { border: 1px solid oklch(0.20 0.015 90); border-radius: 10px; padding: 12px; }
}

/* ─── Quick reads ────────────────────────────────────────── */
.quick-pills {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.quick-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  background: oklch(0.11 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 12px;
}
.quick-dot {
  width: 10px; height: 10px; border-radius: 50%;
  flex-shrink: 0;
}
.quick-pill-pos  .quick-dot { background: var(--accent-positive); }
.quick-pill-neg  .quick-dot { background: var(--accent-secondary); }
.quick-pill-teal .quick-dot { background: var(--accent-tertiary); }
.quick-pill-text { display: flex; flex-direction: column; min-width: 0; }
.quick-pill-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.70rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.quick-pill-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  color: var(--ink-1);
  margin-top: 2px;
}

@media (max-width: 720px) {
  .quick-pills { grid-template-columns: 1fr; }
}

/* ─── Live load banners ──────────────────────────────────── */
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
.live-banner-error,
.live-banner-info {
  flex-wrap: wrap;
}
.live-banner-error {
  border-color: oklch(0.65 0.20 25 / 0.45);
  background: oklch(0.65 0.20 25 / 0.08);
}
.live-banner-info {
  border-color: oklch(0.72 0.15 60 / 0.40);
  background: oklch(0.72 0.15 60 / 0.08);
}
.live-banner-error-headline {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.86rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--accent-down, oklch(0.80 0.20 350));
}
.live-banner-info .live-banner-error-headline {
  color: oklch(0.86 0.15 60);
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

/* ─── Round narrative line (live editorial) ──────────────── */
.rounds-narrative {
  grid-column: 1 / -1;
  margin: 6px 0 0;
  padding-left: 8px;
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--ink-3);
  max-width: 80ch;
}
</style>

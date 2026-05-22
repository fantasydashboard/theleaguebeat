<template>
  <div class="space-y-6">
    <!-- Header with Controls -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Matchups</h1>
        <p class="text-base text-dark-textMuted">
          Head-to-head battles with deep analysis and win probability
        </p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Refresh Button -->
        <button 
          @click="refreshData" 
          :disabled="isRefreshing"
          class="btn-secondary flex items-center gap-2"
        >
          <svg 
            class="w-4 h-4" 
            :class="{ 'animate-spin': isRefreshing }" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
        </button>
        <select v-model="selectedSeason" @change="onSeasonChange" class="select">
          <option v-for="season in leagueStore.historicalSeasons" :key="season.season" :value="season.season">
            {{ season.season }} Season
          </option>
        </select>
        <select v-model="selectedWeek" @change="loadMatchups" class="select">
          <option value="">Select Week...</option>
          <option v-for="week in availableWeeks" :key="week" :value="week">
            Week {{ week }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
    </div>

    <template v-else-if="matchups.length > 0">
      <!-- Week Summary Stats (moved to top) -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">Week {{ selectedWeek }} Summary</h2>
          </div>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-primary mb-2">
                {{ weekStats.highest_score.toFixed(1) }}
              </div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Highest Score</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.highest_scorer }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-red-400 mb-2">
                {{ weekStats.lowest_score.toFixed(1) }}
              </div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Lowest Score</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.lowest_scorer }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-green-400 mb-2">
                {{ weekStats.closest_matchup.toFixed(1) }}
              </div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Closest Game</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.closest_teams }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-cyan-400 mb-2">
                {{ weekStats.avg_score.toFixed(1) }}
              </div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">League Average</div>
              <div class="text-sm font-semibold text-dark-text">All Teams</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Matchup Selector Buttons -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">⚔️</span>
            <h2 class="card-title">Select Matchup to Analyze</h2>
          </div>
          <p class="text-sm text-dark-textMuted mt-2 hidden md:block">
            💡 Click any matchup to see head-to-head history, win probability, and detailed analysis
          </p>
          <p class="text-sm text-primary mt-2 md:hidden flex items-center gap-1">
            <span class="animate-pulse">👇</span>
            <span>Tap a matchup below to see win probability analysis</span>
          </p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              v-for="matchup in matchups"
              :key="matchup.matchup_id"
              @click="selectMatchup(matchup)"
              :class="[
                'p-4 rounded-xl border-2 transition-all text-left',
                selectedMatchup?.matchup_id === matchup.matchup_id
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                  : 'border-dark-border bg-dark-card hover:border-primary/50 hover:bg-dark-border/30'
              ]"
            >
              <!-- Status Badge -->
              <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-semibold text-dark-textMuted uppercase tracking-wide">Matchup {{ matchup.matchup_id }}</span>
                <span :class="getMatchupStatusClass(matchup)" class="text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1">
                  <span v-if="getMatchupStatusLabel(matchup) === 'Live'" class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                  {{ getMatchupStatusLabel(matchup) }}
                </span>
              </div>
              
              <!-- Team 1 -->
              <div class="space-y-1.5 mb-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5 flex-1 min-w-0">
                    <div class="relative">
                      <img 
                        :src="matchup.team1_avatar" 
                        :alt="matchup.team1_name" 
                        :class="[
                          'w-9 h-9 rounded-full ring-2',
                          matchup.team1_won ? 'ring-green-500' : 'ring-dark-border'
                        ]"
                        @error="handleImageError" 
                      />
                      <!-- Gold star for user's team -->
                      <div v-if="isMyTeam(matchup.team1_roster_id)" class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <span class="text-[10px]">★</span>
                      </div>
                    </div>
                    <span :class="[
                      'text-sm font-semibold truncate',
                      getTeamColorClassForMatchup(matchup.team1_roster_id, matchup, 'text')
                    ]">{{ matchup.team1_name }}</span>
                  </div>
                  <div class="text-right flex-shrink-0 ml-2">
                    <span class="text-lg font-bold text-white">
                      {{ getLiveScore(matchup.team1_roster_id, matchup.team1_points).toFixed(1) }}
                    </span>
                    <div class="text-xs" :class="getTeamColorClassForMatchup(matchup.team1_roster_id, matchup, 'text')">
                      proj {{ getTeamProjectedTotal(matchup.team1_roster_id).toFixed(1) }}
                    </div>
                  </div>
                </div>
                <div class="text-xs text-dark-textMuted pl-11">
                  {{ getStandingsText(matchup.team1_roster_id) }}
                </div>
              </div>
              
              <!-- VS Divider -->
              <div class="flex items-center gap-2 my-2">
                <div class="flex-1 h-px bg-dark-border"></div>
                <span class="text-xs font-medium text-dark-textMuted px-2">VS</span>
                <div class="flex-1 h-px bg-dark-border"></div>
              </div>
              
              <!-- Team 2 -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5 flex-1 min-w-0">
                    <div class="relative">
                      <img 
                        :src="matchup.team2_avatar" 
                        :alt="matchup.team2_name" 
                        :class="[
                          'w-9 h-9 rounded-full ring-2',
                          matchup.team2_won ? 'ring-green-500' : 'ring-dark-border'
                        ]"
                        @error="handleImageError" 
                      />
                      <!-- Gold star for user's team -->
                      <div v-if="isMyTeam(matchup.team2_roster_id)" class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <span class="text-[10px]">★</span>
                      </div>
                    </div>
                    <span :class="[
                      'text-sm font-semibold truncate',
                      getTeamColorClassForMatchup(matchup.team2_roster_id, matchup, 'text')
                    ]">{{ matchup.team2_name }}</span>
                  </div>
                  <div class="text-right flex-shrink-0 ml-2">
                    <span class="text-lg font-bold text-white">
                      {{ getLiveScore(matchup.team2_roster_id, matchup.team2_points).toFixed(1) }}
                    </span>
                    <div class="text-xs" :class="getTeamColorClassForMatchup(matchup.team2_roster_id, matchup, 'text')">
                      proj {{ getTeamProjectedTotal(matchup.team2_roster_id).toFixed(1) }}
                    </div>
                  </div>
                </div>
                <div class="text-xs text-dark-textMuted pl-11">
                  {{ getStandingsText(matchup.team2_roster_id) }}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Selected Matchup Analysis -->
      <template v-if="selectedMatchup && matchupAnalysis">
        <!-- Win Probability -->
        <div id="matchup-analysis-section" ref="analysisSection" class="card scroll-mt-4">
          <div class="card-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">🎲</span>
                <h2 class="card-title">Win Probability</h2>
              </div>
              <!-- Share Probability Button -->
              <button 
                @click="downloadFullMatchupAnalysis"
                :disabled="isDownloadingFullAnalysis"
                class="btn-primary flex items-center gap-2"
              >
                <svg v-if="!isDownloadingFullAnalysis" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="!isDownloadingFullAnalysis" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloadingFullAnalysis ? 'Generating...' : shareToast === 'success' ? 'Copied! 📋' : 'Share Probability' }}
              </button>
            </div>
            <p class="card-subtitle mt-2">Live probability based on current scores and projections</p>
          </div>
          <div class="card-body">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <!-- Team 1 Probability -->
              <div :class="[
                'text-center p-6 rounded-xl border-2',
                isMyTeam(selectedMatchup.team1_roster_id) 
                  ? 'bg-gradient-to-br from-primary/15 to-primary/5 border-primary/40' 
                  : 'bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/30'
              ]">
                <div class="relative inline-block">
                  <img 
                    :src="selectedMatchup.team1_avatar" 
                    :alt="selectedMatchup.team1_name" 
                    :class="[
                      'w-20 h-20 rounded-full mx-auto mb-3 border-4',
                      getTeamColorClass(selectedMatchup.team1_roster_id, 'border')
                    ]"
                    @error="handleImageError" 
                  />
                  <!-- Gold star for user's team -->
                  <div v-if="isMyTeam(selectedMatchup.team1_roster_id)" class="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    <span class="text-sm text-gray-900">★</span>
                  </div>
                </div>
                <div :class="[
                  'font-bold text-xl mb-2',
                  getTeamColorClass(selectedMatchup.team1_roster_id, 'text')
                ]">{{ selectedMatchup.team1_name }}</div>
                <div :class="[
                  'text-5xl font-black mb-3',
                  getTeamColorClass(selectedMatchup.team1_roster_id, 'text')
                ]">{{ liveWinProbability.team1.toFixed(1) }}%</div>
                <div class="space-y-1 text-sm">
                  <div class="text-white">Current: {{ getLiveScore(selectedMatchup.team1_roster_id, selectedMatchup.team1_points).toFixed(1) }} pts</div>
                  <div :class="getTeamColorClass(selectedMatchup.team1_roster_id, 'text')">Projected: {{ getTeamProjectedTotal(selectedMatchup.team1_roster_id).toFixed(1) }}</div>
                </div>
              </div>

              <!-- Team 2 Probability -->
              <div :class="[
                'text-center p-6 rounded-xl border-2',
                isMyTeam(selectedMatchup.team2_roster_id) 
                  ? 'bg-gradient-to-br from-primary/15 to-primary/5 border-primary/40' 
                  : isMyMatchup(selectedMatchup)
                    ? 'bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/30'
                    : 'bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/30'
              ]">
                <div class="relative inline-block">
                  <img 
                    :src="selectedMatchup.team2_avatar" 
                    :alt="selectedMatchup.team2_name" 
                    :class="[
                      'w-20 h-20 rounded-full mx-auto mb-3 border-4',
                      getTeamColorClass(selectedMatchup.team2_roster_id, 'border')
                    ]"
                    @error="handleImageError" 
                  />
                  <!-- Gold star for user's team -->
                  <div v-if="isMyTeam(selectedMatchup.team2_roster_id)" class="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    <span class="text-sm text-gray-900">★</span>
                  </div>
                </div>
                <div :class="[
                  'font-bold text-xl mb-2',
                  getTeamColorClass(selectedMatchup.team2_roster_id, 'text')
                ]">{{ selectedMatchup.team2_name }}</div>
                <div :class="[
                  'text-5xl font-black mb-3',
                  getTeamColorClass(selectedMatchup.team2_roster_id, 'text')
                ]">{{ liveWinProbability.team2.toFixed(1) }}%</div>
                <div class="space-y-1 text-sm">
                  <div class="text-white">Current: {{ getLiveScore(selectedMatchup.team2_roster_id, selectedMatchup.team2_points).toFixed(1) }} pts</div>
                  <div :class="getTeamColorClass(selectedMatchup.team2_roster_id, 'text')">Projected: {{ getTeamProjectedTotal(selectedMatchup.team2_roster_id).toFixed(1) }}</div>
                </div>
              </div>
            </div>

            <!-- Probability Bar with Gradient Fade -->
            <div class="relative h-12 bg-dark-border/30 rounded-full overflow-hidden">
              <!-- Gradient background that fades between team colors -->
              <div 
                class="absolute inset-0 transition-all duration-500"
                :style="gradientBarStyle"
              ></div>
              
              <!-- Team 1 Name (left side) -->
              <div class="absolute left-0 top-0 h-full flex items-center justify-start px-4 z-10">
                <span :class="[
                  'font-bold text-sm drop-shadow-md',
                  isMyTeam(selectedMatchup.team1_roster_id) ? 'text-gray-900' : 'text-white'
                ]">
                  {{ selectedMatchup.team1_name }}
                </span>
              </div>
              
              <!-- Team 2 Name (right side) -->
              <div class="absolute right-0 top-0 h-full flex items-center justify-end px-4 z-10">
                <span :class="[
                  'font-bold text-sm drop-shadow-md',
                  isMyTeam(selectedMatchup.team2_roster_id) ? 'text-gray-900' : 'text-white'
                ]">
                  {{ selectedMatchup.team2_name }}
                </span>
              </div>
            </div>

            <!-- Win Probability Progression Chart (Always visible) -->
            <div class="mt-4">
              <div ref="winProbChartEl" class="h-52"></div>
              <div class="text-[10px] text-dark-textMuted text-center mt-1">
                Win probability changes throughout the week based on game results
              </div>
            </div>

            <!-- Game Status Sentence -->
            <div class="mt-4 p-4 bg-dark-border/30 rounded-lg">
              <div class="flex items-start gap-3">
                <span class="text-2xl">🎯</span>
                <div class="flex-1">
                  <div class="font-semibold text-dark-text mb-1">What Needs to Happen</div>
                  <p class="text-dark-textMuted">
                    {{ getGameStatusSentence() }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Upset Alert -->
            <div v-if="matchupAnalysis.upsetPotential > 30" class="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div class="flex items-center gap-2 text-yellow-400">
                <span class="text-xl">⚠️</span>
                <span class="font-semibold">Upset Alert!</span>
              </div>
              <p class="text-sm text-dark-textMuted mt-1">
                This is a competitive matchup with {{ matchupAnalysis.upsetPotential.toFixed(0) }}% upset potential
              </p>
            </div>
          </div>
        </div>

        <!-- Scouting Reports Section (Full Width, Above Matchup Preview) -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🔍</span>
              <h2 class="card-title">Scouting Reports</h2>
            </div>
          </div>
          <div class="card-body">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Team 1 Scouting Report -->
              <div :class="[
                'p-4 rounded-xl border',
                isMyTeam(selectedMatchup.team1_roster_id) 
                  ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30' 
                  : 'bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/30'
              ]">
                <div class="flex items-center gap-3 mb-4">
                  <div class="relative">
                    <img 
                      :src="selectedMatchup.team1_avatar" 
                      :alt="selectedMatchup.team1_name" 
                      :class="[
                        'w-12 h-12 rounded-full border-2',
                        getTeamColorClass(selectedMatchup.team1_roster_id, 'border')
                      ]"
                      @error="handleImageError" 
                    />
                    <div v-if="isMyTeam(selectedMatchup.team1_roster_id)" class="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span class="text-xs text-gray-900">★</span>
                    </div>
                  </div>
                  <div>
                    <div :class="[
                      'font-bold text-lg',
                      getTeamColorClass(selectedMatchup.team1_roster_id, 'text')
                    ]">{{ selectedMatchup.team1_name }}</div>
                    <div class="mt-1">
                      <div class="text-[10px] text-dark-textMuted mb-1">Recent Form</div>
                      <div class="flex gap-1">
                        <span
                          v-for="(result, idx) in scoutingReports.team1.recentForm"
                          :key="idx"
                          :class="['w-6 h-6 rounded flex items-center justify-center text-xs font-bold', result === 'W' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400']"
                        >{{ result }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="space-y-3">
                  <div v-if="scoutingReports.team1.strengths.length > 0">
                    <div class="text-xs font-semibold text-green-400 mb-1">✓ Strengths</div>
                    <ul class="space-y-1 text-sm text-dark-textMuted">
                      <li v-for="(strength, idx) in scoutingReports.team1.strengths.slice(0, 3)" :key="idx">• {{ strength }}</li>
                    </ul>
                  </div>
                  <div v-if="scoutingReports.team1.weaknesses.length > 0">
                    <div class="text-xs font-semibold text-red-400 mb-1">✗ Weaknesses</div>
                    <ul class="space-y-1 text-sm text-dark-textMuted">
                      <li v-for="(weakness, idx) in scoutingReports.team1.weaknesses.slice(0, 3)" :key="idx">• {{ weakness }}</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <!-- Team 2 Scouting Report -->
              <div :class="[
                'p-4 rounded-xl border',
                isMyTeam(selectedMatchup.team2_roster_id) 
                  ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30' 
                  : 'bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/30'
              ]">
                <div class="flex items-center gap-3 mb-4">
                  <div class="relative">
                    <img 
                      :src="selectedMatchup.team2_avatar" 
                      :alt="selectedMatchup.team2_name" 
                      :class="[
                        'w-12 h-12 rounded-full border-2',
                        getTeamColorClass(selectedMatchup.team2_roster_id, 'border')
                      ]"
                      @error="handleImageError" 
                    />
                    <div v-if="isMyTeam(selectedMatchup.team2_roster_id)" class="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span class="text-xs text-gray-900">★</span>
                    </div>
                  </div>
                  <div>
                    <div :class="[
                      'font-bold text-lg',
                      getTeamColorClass(selectedMatchup.team2_roster_id, 'text')
                    ]">{{ selectedMatchup.team2_name }}</div>
                    <div class="mt-1">
                      <div class="text-[10px] text-dark-textMuted mb-1">Recent Form</div>
                      <div class="flex gap-1">
                        <span
                          v-for="(result, idx) in scoutingReports.team2.recentForm"
                          :key="idx"
                          :class="['w-6 h-6 rounded flex items-center justify-center text-xs font-bold', result === 'W' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400']"
                        >{{ result }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="space-y-3">
                  <div v-if="scoutingReports.team2.strengths.length > 0">
                    <div class="text-xs font-semibold text-green-400 mb-1">✓ Strengths</div>
                    <ul class="space-y-1 text-sm text-dark-textMuted">
                      <li v-for="(strength, idx) in scoutingReports.team2.strengths.slice(0, 3)" :key="idx">• {{ strength }}</li>
                    </ul>
                  </div>
                  <div v-if="scoutingReports.team2.weaknesses.length > 0">
                    <div class="text-xs font-semibold text-red-400 mb-1">✗ Weaknesses</div>
                    <ul class="space-y-1 text-sm text-dark-textMuted">
                      <li v-for="(weakness, idx) in scoutingReports.team2.weaknesses.slice(0, 3)" :key="idx">• {{ weakness }}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Matchup Preview (Full Width, Clean Design) -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">🔮</span>
                <h2 class="card-title">Matchup Preview</h2>
              </div>
              <!-- Share Preview Button - Yellow primary style -->
              <button 
                @click="downloadMatchupPreview"
                :disabled="isDownloadingPreview"
                class="btn-primary flex items-center gap-2"
              >
                <svg v-if="!isDownloadingPreview" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="!isDownloadingPreview" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloadingPreview ? 'Generating...' : shareToast === 'success' ? 'Copied! 📋' : 'Share Preview' }}
              </button>
            </div>
          </div>
          <div class="card-body">
            <!-- AI Preview Text (Auto-generated) -->
            <div v-if="matchupPreviewText || isGeneratingPreview" class="mb-6 p-4 bg-dark-border/20 rounded-xl border border-dark-border">
              <p v-if="matchupPreviewText" class="text-sm text-dark-textMuted leading-relaxed italic">
                "{{ matchupPreviewText }}"
              </p>
              <div v-else class="flex items-center gap-2 text-sm text-dark-textMuted">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Generating preview...
              </div>
            </div>

            <!-- Matchup Preview Container (for download) -->
            <div ref="matchupPreviewContainer" class="space-y-4">
              <!-- Team Headers -->
              <div class="grid grid-cols-7 items-center text-sm font-semibold pb-3 border-b border-dark-border">
                <div class="col-span-3 flex items-center gap-2">
                  <div class="relative">
                    <img 
                      :src="selectedMatchup.team1_avatar" 
                      :class="[
                        'w-8 h-8 rounded-full border-2',
                        getTeamColorClass(selectedMatchup.team1_roster_id, 'border')
                      ]"
                      @error="handleImageError" 
                    />
                    <div v-if="isMyTeam(selectedMatchup.team1_roster_id)" class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <span class="text-[8px] text-gray-900">★</span>
                    </div>
                  </div>
                  <span :class="getTeamColorClass(selectedMatchup.team1_roster_id, 'text')">{{ selectedMatchup.team1_name }}</span>
                </div>
                <div class="col-span-1 text-center text-dark-textMuted">VS</div>
                <div class="col-span-3 flex items-center justify-end gap-2">
                  <span :class="getTeamColorClass(selectedMatchup.team2_roster_id, 'text')">{{ selectedMatchup.team2_name }}</span>
                  <div class="relative">
                    <img 
                      :src="selectedMatchup.team2_avatar" 
                      :class="[
                        'w-8 h-8 rounded-full border-2',
                        getTeamColorClass(selectedMatchup.team2_roster_id, 'border')
                      ]"
                      @error="handleImageError" 
                    />
                    <div v-if="isMyTeam(selectedMatchup.team2_roster_id)" class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <span class="text-[8px] text-gray-900">★</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Starter Comparison Table -->
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-xs text-dark-textMuted border-b border-dark-border/50">
                      <th class="text-left py-2 px-1 font-medium">Player</th>
                      <th class="text-center py-2 px-1 font-medium w-14">Pts</th>
                      <th class="text-center py-2 px-1 font-medium w-14">Avg</th>
                      <th class="text-center py-2 px-1 font-medium w-14">High</th>
                      <th class="text-center py-2 px-1 font-medium w-10">ADV</th>
                      <th class="text-center py-2 px-1 font-medium w-14">High</th>
                      <th class="text-center py-2 px-1 font-medium w-14">Avg</th>
                      <th class="text-center py-2 px-1 font-medium w-14">Pts</th>
                      <th class="text-right py-2 px-1 font-medium">Player</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="(slot, idx) in starterComparison" 
                      :key="idx"
                      class="border-b border-dark-border/30 hover:bg-dark-border/10"
                    >
                      <!-- Team 1 Player -->
                      <td class="py-2 px-1">
                        <div class="flex items-center gap-2">
                          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded" :class="getPositionBadgeClass(slot.position)">
                            {{ slot.position }}
                          </span>
                          <span class="text-dark-text font-medium truncate max-w-[100px]">{{ slot.team1Player?.name || '—' }}</span>
                        </div>
                      </td>
                      <td class="text-center py-2 px-1">
                        <div class="flex items-center justify-center gap-1">
                          <!-- Lock icon for final games -->
                          <span v-if="slot.team1Player?.gameStatus === 'final'" class="text-dark-textMuted text-xs">🔒</span>
                          <!-- Live indicator for in-progress games -->
                          <span v-else-if="slot.team1Player?.gameStatus === 'live'" class="text-yellow-400 text-xs animate-pulse">●</span>
                          <span :class="[
                            'font-semibold',
                            slot.team1Player?.gameStatus === 'final' ? 'text-white' 
                              : slot.team1Player?.gameStatus === 'live' ? 'text-dark-textMuted'
                              : getTeamColorClass(selectedMatchup.team1_roster_id, 'text')
                          ]">
                            <!-- Final: show actual (white), Live: show actual (gray), Upcoming: show projection (team color) -->
                            {{ slot.team1Player?.gameStatus === 'final' 
                                ? (slot.team1Player?.actualPoints?.toFixed(1) || '0.0')
                                : slot.team1Player?.gameStatus === 'live'
                                  ? (slot.team1Player?.actualPoints?.toFixed(1) || '0.0')
                                  : (slot.team1Player?.projected?.toFixed(1) || '—') }}
                          </span>
                        </div>
                        <!-- Show projection below for live games -->
                        <div v-if="slot.team1Player?.gameStatus === 'live'" class="text-[10px] text-dark-textMuted">
                          proj {{ slot.team1Player?.projected?.toFixed(1) || '—' }}
                        </div>
                      </td>
                      <td class="text-center py-2 px-1 text-dark-textMuted">
                        {{ slot.team1Player?.avg10?.toFixed(1) || '—' }}
                      </td>
                      <td class="text-center py-2 px-1 text-dark-textMuted">
                        {{ slot.team1Player?.best10?.toFixed(1) || '—' }}
                      </td>
                      <!-- Advantage Arrow -->
                      <td class="text-center py-2 px-1">
                        <span 
                          v-if="slot.team1Player && slot.team2Player"
                          class="text-lg font-bold"
                          :class="slot.advantage === 'team1' 
                            ? getTeamColorClass(selectedMatchup.team1_roster_id, 'text')
                            : slot.advantage === 'team2' 
                              ? getTeamColorClass(selectedMatchup.team2_roster_id, 'text')
                              : 'text-dark-border'"
                        >
                          {{ slot.advantage === 'team1' ? '◀' : slot.advantage === 'team2' ? '▶' : '•' }}
                        </span>
                        <span v-else class="text-dark-border">•</span>
                      </td>
                      <!-- Team 2 Stats -->
                      <td class="text-center py-2 px-1 text-dark-textMuted">
                        {{ slot.team2Player?.best10?.toFixed(1) || '—' }}
                      </td>
                      <td class="text-center py-2 px-1 text-dark-textMuted">
                        {{ slot.team2Player?.avg10?.toFixed(1) || '—' }}
                      </td>
                      <td class="text-center py-2 px-1">
                        <div class="flex items-center justify-center gap-1">
                          <!-- Lock icon for final games -->
                          <span v-if="slot.team2Player?.gameStatus === 'final'" class="text-dark-textMuted text-xs">🔒</span>
                          <!-- Live indicator for in-progress games -->
                          <span v-else-if="slot.team2Player?.gameStatus === 'live'" class="text-yellow-400 text-xs animate-pulse">●</span>
                          <span :class="[
                            'font-semibold',
                            slot.team2Player?.gameStatus === 'final' ? 'text-white' 
                              : slot.team2Player?.gameStatus === 'live' ? 'text-dark-textMuted'
                              : getTeamColorClass(selectedMatchup.team2_roster_id, 'text')
                          ]">
                            <!-- Final: show actual (white), Live: show actual (gray), Upcoming: show projection (team color) -->
                            {{ slot.team2Player?.gameStatus === 'final' 
                                ? (slot.team2Player?.actualPoints?.toFixed(1) || '0.0')
                                : slot.team2Player?.gameStatus === 'live'
                                  ? (slot.team2Player?.actualPoints?.toFixed(1) || '0.0')
                                  : (slot.team2Player?.projected?.toFixed(1) || '—') }}
                          </span>
                        </div>
                        <!-- Show projection below for live games -->
                        <div v-if="slot.team2Player?.gameStatus === 'live'" class="text-[10px] text-dark-textMuted">
                          proj {{ slot.team2Player?.projected?.toFixed(1) || '—' }}
                        </div>
                      </td>
                      <!-- Team 2 Player -->
                      <td class="py-2 px-1 text-right">
                        <span class="text-dark-text font-medium truncate max-w-[100px]">{{ slot.team2Player?.name || '—' }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Projected Totals -->
              <div class="grid grid-cols-3 gap-4 p-4 bg-dark-border/20 rounded-xl">
                <div class="text-center">
                  <div :class="[
                    'text-2xl font-bold',
                    getTeamColorClass(selectedMatchup.team1_roster_id, 'text')
                  ]">{{ getTeamProjectedTotal(selectedMatchup.team1_roster_id).toFixed(1) }}</div>
                  <div class="text-xs text-dark-textMuted mt-1">Projected Total</div>
                </div>
                <div class="text-center flex items-center justify-center">
                  <span class="text-lg text-dark-textMuted">vs</span>
                </div>
                <div class="text-center">
                  <div :class="[
                    'text-2xl font-bold',
                    getTeamColorClass(selectedMatchup.team2_roster_id, 'text')
                  ]">{{ getTeamProjectedTotal(selectedMatchup.team2_roster_id).toFixed(1) }}</div>
                  <div class="text-xs text-dark-textMuted mt-1">Projected Total</div>
                </div>
              </div>

              <!-- Injury Alerts (if any) -->
              <div v-if="team1Injuries.length > 0 || team2Injuries.length > 0" class="grid grid-cols-2 gap-4">
                <div v-if="team1Injuries.length > 0" class="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div class="text-xs font-semibold text-yellow-400 mb-2">🏥 {{ selectedMatchup.team1_name }} Injuries</div>
                  <div class="space-y-1">
                    <div 
                      v-for="injury in team1Injuries.slice(0, 3)" 
                      :key="injury.playerId"
                      class="text-xs text-dark-textMuted"
                    >
                      {{ injury.playerName }} ({{ injury.status }})
                    </div>
                  </div>
                </div>
                <div v-if="team2Injuries.length > 0" class="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div class="text-xs font-semibold text-yellow-400 mb-2">🏥 {{ selectedMatchup.team2_name }} Injuries</div>
                  <div class="space-y-1">
                    <div 
                      v-for="injury in team2Injuries.slice(0, 3)" 
                      :key="injury.playerId"
                      class="text-xs text-dark-textMuted"
                    >
                      {{ injury.playerName }} ({{ injury.status }})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistical Comparison -->
        <div class="card">
          <div class="card-header flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📊</span>
              <h2 class="card-title">Statistical Comparison ({{ selectedSeason }})</h2>
            </div>
            <!-- Share Comparison Button - Yellow primary style -->
            <button
              @click="downloadStatComparison"
              :disabled="isDownloadingComparison"
              class="btn btn-primary flex items-center gap-2 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {{ isDownloadingComparison ? 'Generating...' : shareToast === 'success' ? 'Copied! 📋' : 'Share Comparison' }}
            </button>
          </div>
          <div class="card-body">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-dark-border bg-dark-border/30">
                    <th class="text-left p-3 text-dark-textMuted font-semibold">Statistic</th>
                    <th class="text-center p-3 font-semibold" :class="getTeamColorClass(selectedMatchup.team1_roster_id, 'text')">{{ selectedMatchup.team1_name }}</th>
                    <th class="text-center p-3 text-dark-textMuted font-semibold">Advantage</th>
                    <th class="text-center p-3 font-semibold" :class="getTeamColorClass(selectedMatchup.team2_roster_id, 'text')">{{ selectedMatchup.team2_name }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="stat in comparisonStats" :key="stat.label" class="border-b border-dark-border/50 hover:bg-dark-border/10">
                    <td class="p-3 text-dark-text font-medium">{{ stat.label }}</td>
                    <td class="text-center p-3">
                      <span :class="stat.team1Better ? getTeamColorClass(selectedMatchup.team1_roster_id, 'text') + ' font-bold' : 'text-dark-textSecondary'">
                        {{ stat.team1Value }}
                      </span>
                    </td>
                    <td class="text-center p-3">
                      <div v-if="stat.team1Better" :class="[
                        'font-semibold',
                        getTeamColorClass(selectedMatchup.team1_roster_id, 'text')
                      ]">
                        ◀ {{ selectedMatchup.team1_name }}
                      </div>
                      <div v-else-if="stat.team2Better" :class="[
                        'font-semibold',
                        getTeamColorClass(selectedMatchup.team2_roster_id, 'text')
                      ]">
                        {{ selectedMatchup.team2_name }} ▶
                      </div>
                      <div v-else class="text-dark-textMuted">
                        Even
                      </div>
                    </td>
                    <td class="text-center p-3">
                      <span :class="stat.team2Better ? getTeamColorClass(selectedMatchup.team2_roster_id, 'text') + ' font-bold' : 'text-dark-textSecondary'">
                        {{ stat.team2Value }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Historical Matchups (Lifetime) -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📜</span>
              <h2 class="card-title">Lifetime Series</h2>
            </div>
            <p class="card-subtitle mt-2">All-time head-to-head results across all seasons</p>
          </div>
          <div class="card-body">
            <!-- Series Record -->
            <div class="text-center mb-6 p-4 bg-dark-border/20 rounded-lg">
              <div class="text-sm text-dark-textMuted mb-2">Lifetime Record</div>
              <div class="flex items-center justify-center gap-4">
                <div class="text-center">
                  <div class="text-3xl font-bold" :class="historicalMatchups.team1Wins > historicalMatchups.team2Wins ? 'text-green-400' : 'text-dark-textSecondary'">
                    {{ historicalMatchups.team1Wins }}
                  </div>
                  <div class="text-xs text-dark-textMuted">{{ selectedMatchup.team1_name }}</div>
                </div>
                <div class="text-2xl text-dark-textMuted">-</div>
                <div class="text-center">
                  <div class="text-3xl font-bold" :class="historicalMatchups.team2Wins > historicalMatchups.team1Wins ? 'text-green-400' : 'text-dark-textSecondary'">
                    {{ historicalMatchups.team2Wins }}
                  </div>
                  <div class="text-xs text-dark-textMuted">{{ selectedMatchup.team2_name }}</div>
                </div>
              </div>
              <div v-if="historicalMatchups.ties > 0" class="text-xs text-dark-textMuted mt-2">
                {{ historicalMatchups.ties }} tie(s)
              </div>
            </div>

            <!-- Recent Matchups -->
            <div v-if="historicalMatchups.games.length > 0" class="space-y-3">
              <div class="text-sm font-semibold text-dark-text mb-3">Recent History</div>
              <div
                v-for="(game, idx) in historicalMatchups.games.slice(0, 5)"
                :key="idx"
                class="p-3 bg-dark-border/20 rounded-lg border border-dark-border"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="text-xs text-dark-textMuted">
                    <span class="font-semibold">{{ game.season }} Season</span>
                    <span class="mx-2">•</span>
                    <span>Week {{ game.week }}</span>
                  </div>
                  <div class="text-xs text-dark-textMuted">
                    Margin: {{ game.margin.toFixed(1) }}
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="text-sm" :class="game.team1Won ? 'text-green-400 font-bold' : 'text-dark-textSecondary'">
                    {{ selectedMatchup.team1_name }}: {{ game.team1Score.toFixed(1) }}
                  </div>
                  <div class="text-sm text-right" :class="game.team2Won ? 'text-green-400 font-bold' : 'text-dark-textSecondary'">
                    {{ selectedMatchup.team2_name }}: {{ game.team2Score.toFixed(1) }}
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-center py-6 text-dark-textMuted">
              No previous matchups between these teams
            </div>
          </div>
        </div>
      </template>
    </template>

    <div v-else class="card">
      <div class="card-body text-center py-12">
        <p class="text-dark-textMuted">Select a season and week to view matchups</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { sleeperService } from '@/services/sleeper'
import type { SleeperRoster, SleeperMatchup, SleeperUser } from '@/types/sleeper'
import ApexCharts from 'apexcharts'
import { trackCardShare } from '@/services/shareTracking'

const leagueStore = useLeagueStore()

// State
const selectedSeason = ref('')
const selectedWeek = ref('')
const isLoading = ref(false)
const isRefreshing = ref(false)
const matchupsData = ref<SleeperMatchup[]>([])
const playerProjections = ref<Map<string, any>>(new Map())
const aiInsights = ref<Map<number, string>>(new Map())
const selectedMatchup = ref<MatchupDisplay | null>(null)
const matchupAnalysis = ref<any>(null)
const comparisonStats = ref<any[]>([])
const historicalMatchups = ref<any>({ team1Wins: 0, team2Wins: 0, ties: 0, games: [] })
const scoutingReports = ref<any>({ team1: { strengths: [], weaknesses: [], recentForm: [] }, team2: { strengths: [], weaknesses: [], recentForm: [] } })

// New state for Matchup Preview
const matchupPreviewText = ref('')
const isGeneratingPreview = ref(false)
const starterComparison = ref<any[]>([])
const injuryReport = ref<any[]>([])
const playerLast10Stats = ref<Map<string, { best: number; avg: number }>>(new Map())
const matchupPreviewContainer = ref<HTMLElement | null>(null)
const isDownloadingPreview = ref(false)
const isDownloadingFullAnalysis = ref(false)
const isDownloadingComparison = ref(false)
const shareToast = ref<'idle'|'success'|'error'>('idle')

// Win Probability Chart state
const showWinProbChart = ref(false)
const winProbChartEl = ref<HTMLElement | null>(null)
let winProbChartInstance: ApexCharts | null = null

// Analysis section ref for mobile scrolling
const analysisSection = ref<HTMLElement | null>(null)

interface TeamStats {
  championships: number
  alltime_wins: number
  alltime_losses: number
  ppg: number
  h2h_wins: number
  h2h_losses: number
}

interface MatchupDisplay {
  matchup_id: number
  team1_name: string
  team1_avatar: string
  team1_points: number
  team1_projected: number
  team1_roster_id: number
  team1_won: boolean
  team1_stats: TeamStats
  team2_name: string
  team2_avatar: string
  team2_points: number
  team2_projected: number
  team2_roster_id: number
  team2_won: boolean
  team2_stats: TeamStats
  is_complete: boolean
  ai_insight: string
}

interface H2HTeam {
  roster_id: number
  name: string
  owner_id: string
}

// Computed
const availableWeeks = computed(() => {
  if (!selectedSeason.value) return []
  
  const matchups = leagueStore.historicalMatchups.get(selectedSeason.value)
  if (!matchups) return []
  
  return Array.from(matchups.keys()).sort((a, b) => a - b)
})

// Monte Carlo win probability using actual scores + projections for remaining players
const liveWinProbability = computed(() => {
  if (!selectedMatchup.value) {
    return { team1: 50, team2: 50 }
  }
  
  // Get the matchup data directly from Sleeper
  const team1Matchup = matchupsData.value.find(m => m.roster_id === selectedMatchup.value!.team1_roster_id)
  const team2Matchup = matchupsData.value.find(m => m.roster_id === selectedMatchup.value!.team2_roster_id)
  
  // Use Sleeper's official points (most accurate)
  const team1SleeperPoints = team1Matchup?.points || 0
  const team2SleeperPoints = team2Matchup?.points || 0
  
  // Get live projections for remaining player calculations
  const team1Live = getLiveTeamProjection(selectedMatchup.value.team1_roster_id)
  const team2Live = getLiveTeamProjection(selectedMatchup.value.team2_roster_id)
  
  console.log('🎲 Monte Carlo Debug:', {
    team1: { 
      name: selectedMatchup.value.team1_name,
      sleeperPoints: team1SleeperPoints,
      liveActual: team1Live.actual.toFixed(1), 
      liveRemaining: team1Live.projected.toFixed(1), 
      liveTotal: team1Live.total.toFixed(1),
      debug: team1Live.debugInfo
    },
    team2: { 
      name: selectedMatchup.value.team2_name,
      sleeperPoints: team2SleeperPoints,
      liveActual: team2Live.actual.toFixed(1), 
      liveRemaining: team2Live.projected.toFixed(1), 
      liveTotal: team2Live.total.toFixed(1),
      debug: team2Live.debugInfo
    }
  })
  
  // Determine remaining points to be scored
  // If Sleeper points > our calculated actual, use Sleeper as the "actual" floor
  const team1Actual = Math.max(team1SleeperPoints, team1Live.actual)
  const team2Actual = Math.max(team2SleeperPoints, team2Live.actual)
  
  // Remaining = total projection - actual scored
  // If projection < actual (player exceeded projection), remaining = 0
  const team1Remaining = Math.max(0, team1Live.total - team1Actual)
  const team2Remaining = Math.max(0, team2Live.total - team2Actual)
  
  console.log('🎲 Adjusted values:', {
    team1: { actual: team1Actual.toFixed(1), remaining: team1Remaining.toFixed(1) },
    team2: { actual: team2Actual.toFixed(1), remaining: team2Remaining.toFixed(1) }
  })
  
  // Check if matchup is complete (no remaining projections)
  if (selectedMatchup.value.is_complete || (team1Remaining < 0.5 && team2Remaining < 0.5)) {
    console.log('🎲 Matchup complete - using actual scores')
    if (team1Actual > team2Actual) return { team1: 100, team2: 0 }
    if (team2Actual > team1Actual) return { team1: 0, team2: 100 }
    return { team1: 50, team2: 50 }
  }
  
  // Monte Carlo simulation
  const simulations = 10000
  let team1Wins = 0
  
  // Standard deviation as percentage of remaining projected points (~30% volatility)
  const volatilityFactor = 0.30
  
  for (let i = 0; i < simulations; i++) {
    // Team 1: actual points + simulated remaining (with variance)
    const team1StdDev = Math.max(1, team1Remaining * volatilityFactor)
    const team1Simulated = team1Actual + team1Remaining + gaussianRandom() * team1StdDev
    
    // Team 2: actual points + simulated remaining (with variance)
    const team2StdDev = Math.max(1, team2Remaining * volatilityFactor)
    const team2Simulated = team2Actual + team2Remaining + gaussianRandom() * team2StdDev
    
    if (team1Simulated > team2Simulated) {
      team1Wins++
    } else if (Math.abs(team1Simulated - team2Simulated) < 0.01) {
      team1Wins += 0.5
    }
  }
  
  const team1Prob = Math.round((team1Wins / simulations) * 100)
  
  console.log('🎲 Monte Carlo result:', { team1Prob, team2Prob: 100 - team1Prob })
  
  return {
    team1: team1Prob,
    team2: 100 - team1Prob
  }
})

// Box-Muller transform for gaussian random numbers
function gaussianRandom(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

// Team 1 injuries
const team1Injuries = computed(() => {
  if (!selectedMatchup.value) return []
  return injuryReport.value.filter(injury => 
    injury.teamName === selectedMatchup.value!.team1_name
  )
})

// Team 2 injuries
const team2Injuries = computed(() => {
  if (!selectedMatchup.value) return []
  return injuryReport.value.filter(injury => 
    injury.teamName === selectedMatchup.value!.team2_name
  )
})

// Get matchup status (Live vs Final)
function getMatchupStatusLabel(matchup: MatchupDisplay): string {
  // Check if this is the current week
  const currentSeason = leagueStore.historicalSeasons[0]
  const currentWeek = currentSeason?.settings?.leg || 1
  const isCurrentWeek = selectedSeason.value === currentSeason?.season && 
                        parseInt(selectedWeek.value) === currentWeek
  
  if (matchup.is_complete) {
    return 'Final'
  }
  
  if (isCurrentWeek && (matchup.team1_points > 0 || matchup.team2_points > 0)) {
    return 'Live'
  }
  
  return 'Scheduled'
}

function getMatchupStatusClass(matchup: MatchupDisplay): string {
  const status = getMatchupStatusLabel(matchup)
  
  switch (status) {
    case 'Live':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    case 'Final':
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    default:
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
  }
}

// Check if this is the current user's team
function isMyTeam(rosterId: number): boolean {
  const rosters = leagueStore.historicalRosters.get(selectedSeason.value) || []
  const roster = rosters.find(r => r.roster_id === rosterId)
  if (!roster) return false
  return roster.owner_id === leagueStore.currentUserId
}

// Check if the current user is playing in this matchup
function isMyMatchup(matchup: MatchupDisplay | null): boolean {
  if (!matchup) return false
  return isMyTeam(matchup.team1_roster_id) || isMyTeam(matchup.team2_roster_id)
}

// Get team color class - simplified logic:
// - My team = primary/gold
// - Opponent (when I'm playing) = cyan
// - Both teams when I'm not playing = cyan
// Get team color class for a specific matchup (used in matchup selector cards)
function getTeamColorClassForMatchup(rosterId: number, matchup: MatchupDisplay, type: 'text' | 'border' | 'bg' = 'text'): string {
  // If user's team, always gold
  if (isMyTeam(rosterId)) {
    switch (type) {
      case 'text': return 'text-primary'
      case 'border': return 'border-primary'
      case 'bg': return 'bg-primary'
    }
  }
  
  // Check if user is in this specific matchup
  if (isMyMatchup(matchup)) {
    // User is playing - opponent gets cyan
    switch (type) {
      case 'text': return 'text-cyan-400'
      case 'border': return 'border-cyan-500'
      case 'bg': return 'bg-cyan-500'
    }
  }
  
  // User is NOT in this matchup - use cyan for team1, orange for team2
  const isTeam1 = rosterId === matchup.team1_roster_id
  if (isTeam1) {
    switch (type) {
      case 'text': return 'text-cyan-400'
      case 'border': return 'border-cyan-500'
      case 'bg': return 'bg-cyan-500'
    }
  } else {
    switch (type) {
      case 'text': return 'text-orange-400'
      case 'border': return 'border-orange-500'
      case 'bg': return 'bg-orange-500'
    }
  }
}

function getTeamColorClass(rosterId: number, type: 'text' | 'border' | 'bg' = 'text'): string {
  // If user's team, always gold
  if (isMyTeam(rosterId)) {
    switch (type) {
      case 'text': return 'text-primary'
      case 'border': return 'border-primary'
      case 'bg': return 'bg-primary'
    }
  }
  
  // Check if user is in this matchup
  if (selectedMatchup.value && isMyMatchup(selectedMatchup.value)) {
    // User is playing - opponent gets cyan
    switch (type) {
      case 'text': return 'text-cyan-400'
      case 'border': return 'border-cyan-500'
      case 'bg': return 'bg-cyan-500'
    }
  }
  
  // User is NOT in this matchup - use cyan for team1, orange for team2
  if (selectedMatchup.value) {
    const isTeam1 = rosterId === selectedMatchup.value.team1_roster_id
    if (isTeam1) {
      switch (type) {
        case 'text': return 'text-cyan-400'
        case 'border': return 'border-cyan-500'
        case 'bg': return 'bg-cyan-500'
      }
    } else {
      switch (type) {
        case 'text': return 'text-orange-400'
        case 'border': return 'border-orange-500'
        case 'bg': return 'bg-orange-500'
      }
    }
  }
  
  // Fallback to cyan
  switch (type) {
    case 'text': return 'text-cyan-400'
    case 'border': return 'border-cyan-500'
    case 'bg': return 'bg-cyan-500'
  }
}

// Get team hex color for charts/SVGs
function getTeamHexColor(rosterId: number): string {
  if (isMyTeam(rosterId)) return '#F5C451' // primary gold
  
  // Check if user is in this matchup
  if (selectedMatchup.value && isMyMatchup(selectedMatchup.value)) {
    return '#06B6D4' // cyan for opponent when user is playing
  }
  
  // User is NOT in matchup - cyan for team1, orange for team2
  if (selectedMatchup.value) {
    const isTeam1 = rosterId === selectedMatchup.value.team1_roster_id
    return isTeam1 ? '#06B6D4' : '#F97316' // cyan or orange
  }
  
  return '#06B6D4' // fallback cyan
}

// Get gradient style for the Win Probability bar - as computed for reactivity
const gradientBarStyle = computed(() => {
  if (!selectedMatchup.value) return {}
  
  const team1Color = getTeamHexColor(selectedMatchup.value.team1_roster_id)
  const team2Color = getTeamHexColor(selectedMatchup.value.team2_roster_id)
  const prob = liveWinProbability.value.team1
  
  // Create a gradient that fades directly from team1 to team2
  // The fade zone is centered at the probability point
  const fadeWidth = 15 // percentage width of the fade zone
  const fadeStart = Math.max(0, prob - fadeWidth / 2)
  const fadeEnd = Math.min(100, prob + fadeWidth / 2)
  
  return {
    background: `linear-gradient(to right, ${team1Color} 0%, ${team1Color} ${fadeStart}%, ${team2Color} ${fadeEnd}%, ${team2Color} 100%)`
  }
})

// Keep function version for backward compatibility
function getGradientBarStyle(): Record<string, string> {
  return gradientBarStyle.value
}

// Get standings text for a team
function getStandingsText(rosterId: number): string {
  const rosters = leagueStore.historicalRosters.get(selectedSeason.value) || []
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  
  // Check display settings
  let showDivision = false
  try {
    const displaySettings = JSON.parse(localStorage.getItem('display_settings') || '{}')
    showDivision = displaySettings.showDivisionInStandings || false
  } catch (e) {}
  
  // Sort rosters by wins, then points
  const sortedRosters = [...rosters].sort((a, b) => {
    const aWins = a.settings?.wins || 0
    const bWins = b.settings?.wins || 0
    if (bWins !== aWins) return bWins - aWins
    return (b.settings?.fpts || 0) - (a.settings?.fpts || 0)
  })
  
  const teamIndex = sortedRosters.findIndex(r => r.roster_id === rosterId)
  if (teamIndex === -1) return ''
  
  const rank = teamIndex + 1
  const roster = rosters.find(r => r.roster_id === rosterId)
  
  // Check if league has divisions and setting is enabled
  const hasDivisions = rosters.some(r => r.settings?.division)
  
  if (showDivision && hasDivisions && roster?.settings?.division) {
    // Get division name from league metadata
    const divisionId = roster.settings.division
    const divisionNames = seasonInfo?.metadata?.division_names || {}
    const divisionName = divisionNames[divisionId] || `Division ${divisionId}`
    
    // Calculate division rank
    const divisionRosters = rosters.filter(r => r.settings?.division === divisionId)
    const sortedDivision = [...divisionRosters].sort((a, b) => {
      const aWins = a.settings?.wins || 0
      const bWins = b.settings?.wins || 0
      if (bWins !== aWins) return bWins - aWins
      return (b.settings?.fpts || 0) - (a.settings?.fpts || 0)
    })
    const divRank = sortedDivision.findIndex(r => r.roster_id === rosterId) + 1
    
    return `${getOrdinal(divRank)} in ${divisionName}`
  }
  
  return `Currently ${getOrdinal(rank)} place`
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// Get player name from players store
function getPlayerName(playerId: string): string {
  const player = leagueStore.players[playerId]
  if (player) {
    return player.full_name || `${player.first_name} ${player.last_name}`
  }
  return `Player ${playerId}`
}

// Check if a player's game is complete (simplified - based on if they have points)
function isPlayerGameComplete(playerId: string, rosterId: number): boolean {
  const teamMatchup = matchupsData.value.find(m => m.roster_id === rosterId)
  if (!teamMatchup || !teamMatchup.players_points) return true
  
  // If player has points recorded, consider game complete for now
  // In a real implementation, we'd check NFL game status
  const playerPoints = teamMatchup.players_points[playerId]
  return playerPoints !== undefined && playerPoints !== null
}

// Get remaining players (players who haven't finished their games)
function getRemainingPlayers(rosterId: number): string[] {
  const teamMatchup = matchupsData.value.find(m => m.roster_id === rosterId)
  if (!teamMatchup || !teamMatchup.starters) return []
  
  // For current week, check projection data to see who still has games
  // Players with projections but 0 or low points might still be playing
  const remaining: string[] = []
  
  teamMatchup.starters.forEach(playerId => {
    if (!playerId || playerId === '0') return
    
    const projection = playerProjections.value.get(playerId)
    const actualPoints = teamMatchup.players_points?.[playerId] || 0
    const projectedPoints = projection?.stats?.pts_ppr || projection?.stats?.pts_half_ppr || 0
    
    // If projected points exist and actual is significantly less, player might still be playing
    // This is a heuristic - ideally we'd have live game status
    if (projectedPoints > 0 && actualPoints < projectedPoints * 0.8) {
      remaining.push(playerId)
    }
  })
  
  return remaining
}

// Generate the smart game status sentence
function getGameStatusSentence(): string {
  if (!selectedMatchup.value) return ''
  
  const matchup = selectedMatchup.value
  const team1Points = matchup.team1_points
  const team2Points = matchup.team2_points
  const team1Projected = matchup.team1_projected
  const team2Projected = matchup.team2_projected
  const pointDiff = Math.abs(team1Points - team2Points)
  
  // Determine winning and losing team
  const team1Winning = team1Points >= team2Points
  const winningTeam = team1Winning ? matchup.team1_name : matchup.team2_name
  const losingTeam = team1Winning ? matchup.team2_name : matchup.team1_name
  const winningRosterId = team1Winning ? matchup.team1_roster_id : matchup.team2_roster_id
  const losingRosterId = team1Winning ? matchup.team2_roster_id : matchup.team1_roster_id
  
  // Get remaining players for each team
  const winningRemaining = getRemainingPlayers(winningRosterId)
  const losingRemaining = getRemainingPlayers(losingRosterId)
  
  const totalRemaining = winningRemaining.length + losingRemaining.length
  
  // CASE 1: Both teams have finished all their players
  if (totalRemaining === 0) {
    if (team1Points === team2Points) {
      return `${matchup.team1_name} and ${matchup.team2_name} are tied!`
    }
    return `${winningTeam} beats ${losingTeam}.`
  }
  
  // CASE 2: Winning team finished, losing team still has players
  if (winningRemaining.length === 0 && losingRemaining.length > 0) {
    if (pointDiff > 5) {
      return `${winningTeam} beats ${losingTeam}.`
    } else {
      return `${losingTeam} needs ${winningTeam} to score -${pointDiff.toFixed(2)} points to win.`
    }
  }
  
  // CASE 3: Losing team finished, winning team still has players
  if (losingRemaining.length === 0 && winningRemaining.length > 0) {
    if (pointDiff > 5) {
      return `${winningTeam} beats ${losingTeam}.`
    } else {
      const winningPlayerNames = winningRemaining.slice(0, 3).map(id => getPlayerName(id)).join(', ')
      return `${losingTeam} needs ${winningPlayerNames} to score -${pointDiff.toFixed(2)} points to win.`
    }
  }
  
  // CASE 4: 3 or fewer players remaining total - be specific
  if (totalRemaining <= 3) {
    const losingPlayerNames = losingRemaining.map(id => getPlayerName(id)).join(', ')
    const winningPlayerNames = winningRemaining.map(id => getPlayerName(id)).join(', ')
    
    // Only losing team has players remaining
    if (winningRemaining.length === 0) {
      return `${losingTeam} needs ${losingPlayerNames} to score ${pointDiff.toFixed(1)} points to beat ${winningTeam}.`
    }
    
    // Both teams have players remaining
    return `${losingTeam} needs ${losingPlayerNames} to outscore ${winningPlayerNames} by ${pointDiff.toFixed(2)} points to beat ${winningTeam}.`
  }
  
  // CASE 5: More than 3 players remaining - use projections
  const projectedLoser = team1Projected < team2Projected ? matchup.team1_name : matchup.team2_name
  const projectedWinner = team1Projected >= team2Projected ? matchup.team1_name : matchup.team2_name
  const projDiff = Math.abs(team1Projected - team2Projected)
  
  // Check who is projected to win vs who is currently winning
  if (projectedWinner === losingTeam) {
    // Currently losing but projected to win
    return `${losingTeam} is projected to come back and win by ${projDiff.toFixed(2)} points.`
  }
  
  return `${projectedLoser} needs to exceed projected points by ${projDiff.toFixed(2)} points to beat ${projectedWinner}.`
}

// Calculate projected points from actual player projections using league scoring
function calculateTeamProjected(roster: SleeperRoster, rosterId: number): number {
  // Find the matchup data for this roster to get starters
  const teamMatchup = matchupsData.value.find(m => m.roster_id === rosterId)
  
  if (!teamMatchup || !teamMatchup.starters || teamMatchup.starters.length === 0) {
    // Fallback to season average if no starters data
    return calculateTeamProjectedFallback(roster, rosterId)
  }
  
  // Sum up projections for all starters using league-specific scoring
  let totalProjected = 0
  let playersWithProjections = 0
  
  teamMatchup.starters.forEach(playerId => {
    if (!playerId || playerId === '0') return
    
    const projectedPoints = calculatePlayerProjectedPoints(playerId)
    if (projectedPoints > 0) {
      totalProjected += projectedPoints
      playersWithProjections++
    }
  })
  
  // If we got projections for most starters, use it
  if (playersWithProjections >= teamMatchup.starters.length * 0.5) {
    return totalProjected
  }
  
  // Otherwise fall back to season average
  return calculateTeamProjectedFallback(roster, rosterId)
}

// Calculate fantasy points from individual stats (PPR scoring)
// Calculate fantasy points from raw stats using league scoring settings
function calculatePointsFromStats(stats: any): number {
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  const scoringSettings = seasonInfo?.scoring_settings || {}
  
  let points = 0
  
  // Apply each stat with the league's scoring setting
  Object.entries(stats).forEach(([stat, value]) => {
    if (typeof value === 'number' && scoringSettings[stat]) {
      points += value * scoringSettings[stat]
    }
  })
  
  // If no scoring settings found, use PPR defaults
  if (Object.keys(scoringSettings).length === 0) {
    // Passing
    points += (stats.pass_yd || 0) * 0.04
    points += (stats.pass_td || 0) * 4
    points -= (stats.pass_int || 0) * 1
    
    // Rushing
    points += (stats.rush_yd || 0) * 0.1
    points += (stats.rush_td || 0) * 6
    
    // Receiving (PPR)
    points += (stats.rec || 0) * 1
    points += (stats.rec_yd || 0) * 0.1
    points += (stats.rec_td || 0) * 6
    
    // Fumbles
    points -= (stats.fum_lost || 0) * 2
  }
  
  return points
}

// Calculate projected points for a player using league scoring
let projectionDebugLogged = false
function calculatePlayerProjectedPoints(playerId: string): number {
  const projection = playerProjections.value.get(playerId)
  if (!projection || !projection.stats) return 0
  
  const stats = projection.stats
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  const scoringSettings = seasonInfo?.scoring_settings || {}
  const recValue = scoringSettings.rec ?? 1 // Default to PPR
  
  // Debug log once
  if (!projectionDebugLogged) {
    projectionDebugLogged = true
    console.log('🔍 Projection Debug:', {
      playerId,
      recValue,
      hasPtsPpr: stats.pts_ppr !== undefined,
      ptsPpr: stats.pts_ppr,
      hasPtsHalfPpr: stats.pts_half_ppr !== undefined,
      ptsHalfPpr: stats.pts_half_ppr,
      hasPtsStd: stats.pts_std !== undefined,
      ptsStd: stats.pts_std,
      rawStats: { rec: stats.rec, rec_yd: stats.rec_yd, rush_yd: stats.rush_yd, pass_yd: stats.pass_yd }
    })
  }
  
  // Check for pre-calculated totals first (Sleeper sometimes provides these)
  // Try format-specific first
  if (recValue >= 0.9 && stats.pts_ppr !== undefined && stats.pts_ppr > 0) {
    return stats.pts_ppr
  }
  if (recValue >= 0.4 && recValue < 0.9 && stats.pts_half_ppr !== undefined && stats.pts_half_ppr > 0) {
    return stats.pts_half_ppr
  }
  if (recValue < 0.4 && stats.pts_std !== undefined && stats.pts_std > 0) {
    return stats.pts_std
  }
  
  // Try any pre-calculated value and adjust for format
  if (stats.pts_ppr !== undefined && stats.pts_ppr > 0) {
    const rec = stats.rec || 0
    return stats.pts_ppr - (1 - recValue) * rec
  }
  if (stats.pts_half_ppr !== undefined && stats.pts_half_ppr > 0) {
    const rec = stats.rec || 0
    return stats.pts_half_ppr + (recValue - 0.5) * rec
  }
  if (stats.pts_std !== undefined && stats.pts_std > 0) {
    const rec = stats.rec || 0
    return stats.pts_std + recValue * rec
  }
  
  // Calculate from individual stats
  let points = 0
  
  // Passing
  points += (stats.pass_yd || 0) * (scoringSettings.pass_yd || 0.04)
  points += (stats.pass_td || 0) * (scoringSettings.pass_td || 4)
  points += (stats.pass_int || 0) * (scoringSettings.pass_int || -1)
  points += (stats.pass_2pt || 0) * (scoringSettings.pass_2pt || 2)
  
  // Rushing
  points += (stats.rush_yd || 0) * (scoringSettings.rush_yd || 0.1)
  points += (stats.rush_td || 0) * (scoringSettings.rush_td || 6)
  points += (stats.rush_2pt || 0) * (scoringSettings.rush_2pt || 2)
  
  // Receiving
  points += (stats.rec || 0) * recValue
  points += (stats.rec_yd || 0) * (scoringSettings.rec_yd || 0.1)
  points += (stats.rec_td || 0) * (scoringSettings.rec_td || 6)
  points += (stats.rec_2pt || 0) * (scoringSettings.rec_2pt || 2)
  
  // Bonus yards
  points += (stats.bonus_rec_yd_100 || 0) * (scoringSettings.bonus_rec_yd_100 || 0)
  points += (stats.bonus_rush_yd_100 || 0) * (scoringSettings.bonus_rush_yd_100 || 0)
  
  // Fumbles
  points += (stats.fum_lost || 0) * (scoringSettings.fum_lost || -2)
  points += (stats.fum || 0) * (scoringSettings.fum || 0)
  
  // Kicking
  points += (stats.fgm || 0) * (scoringSettings.fgm || 3)
  points += (stats.fgm_0_19 || 0) * (scoringSettings.fgm_0_19 || 3)
  points += (stats.fgm_20_29 || 0) * (scoringSettings.fgm_20_29 || 3)
  points += (stats.fgm_30_39 || 0) * (scoringSettings.fgm_30_39 || 3)
  points += (stats.fgm_40_49 || 0) * (scoringSettings.fgm_40_49 || 4)
  points += (stats.fgm_50p || 0) * (scoringSettings.fgm_50p || 5)
  points += (stats.xpm || 0) * (scoringSettings.xpm || 1)
  points += (stats.fgmiss || 0) * (scoringSettings.fgmiss || 0)
  points += (stats.xpmiss || 0) * (scoringSettings.xpmiss || 0)
  
  // Defense
  points += (stats.def_td || 0) * (scoringSettings.def_td || 6)
  points += (stats.sack || 0) * (scoringSettings.sack || 1)
  points += (stats.int || 0) * (scoringSettings.int || 2)
  points += (stats.fum_rec || 0) * (scoringSettings.fum_rec || 2)
  points += (stats.safe || 0) * (scoringSettings.safe || 2)
  points += (stats.blk_kick || 0) * (scoringSettings.blk_kick || 2)
  
  // Points allowed (for DST)
  if (stats.pts_allow !== undefined) {
    const ptsAllow = stats.pts_allow
    if (ptsAllow === 0) points += scoringSettings.pts_allow_0 || 10
    else if (ptsAllow <= 6) points += scoringSettings.pts_allow_1_6 || 7
    else if (ptsAllow <= 13) points += scoringSettings.pts_allow_7_13 || 4
    else if (ptsAllow <= 20) points += scoringSettings.pts_allow_14_20 || 1
    else if (ptsAllow <= 27) points += scoringSettings.pts_allow_21_27 || 0
    else if (ptsAllow <= 34) points += scoringSettings.pts_allow_28_34 || -1
    else points += scoringSettings.pts_allow_35p || -4
  }
  
  return points
}

// Fallback: calculate based on team's season average
function calculateTeamProjectedFallback(roster: SleeperRoster, rosterId: number): number {
  const matchupsByWeek = leagueStore.historicalMatchups.get(selectedSeason.value) || new Map()
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  const playoffStart = seasonInfo?.settings?.playoff_week_start || 15
  
  let totalPoints = 0
  let gamesPlayed = 0
  
  // Calculate average from completed weeks
  matchupsByWeek.forEach((weekMatchups, week) => {
    if (week >= playoffStart) return
    
    const teamMatchup = weekMatchups.find(m => m.roster_id === rosterId)
    if (teamMatchup && teamMatchup.points && teamMatchup.points > 0) {
      totalPoints += teamMatchup.points
      gamesPlayed++
    }
  })
  
  // Return season average, or fallback to roster fpts / games
  if (gamesPlayed > 0) {
    return totalPoints / gamesPlayed
  }
  
  // Fallback: use roster settings fpts
  const fpts = roster.settings?.fpts || 0
  const wins = roster.settings?.wins || 0
  const losses = roster.settings?.losses || 0
  const totalGames = wins + losses
  
  return totalGames > 0 ? fpts / totalGames : 100
}

// Refresh data from Sleeper
async function refreshData() {
  if (!selectedSeason.value || !selectedWeek.value) return
  
  isRefreshing.value = true
  
  try {
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
    if (!seasonInfo) {
      console.error('Season not found')
      return
    }
    
    const week = parseInt(selectedWeek.value)
    
    // Fetch FRESH matchup data from Sleeper API (not from cache)
    console.log(`🔄 Fetching fresh matchup data for Week ${week}...`)
    const freshMatchups = await sleeperService.getMatchups(seasonInfo.league_id, week)
    
    // Update the store with fresh data
    const seasonMatchups = leagueStore.historicalMatchups.get(selectedSeason.value) || new Map()
    seasonMatchups.set(week, freshMatchups)
    leagueStore.historicalMatchups.set(selectedSeason.value, seasonMatchups)
    
    // Update local matchupsData
    matchupsData.value = freshMatchups
    
    // Re-fetch projections for all players
    await fetchProjectionsForMatchups(selectedSeason.value, week)
    
    // Re-fetch rosters for updated standings
    const freshRosters = await sleeperService.getLeagueRosters(seasonInfo.league_id)
    leagueStore.historicalRosters.set(selectedSeason.value, freshRosters)
    
    // Re-fetch player data to get updated injury statuses
    console.log('🔄 Fetching fresh player data for injury statuses...')
    const freshPlayers = await sleeperService.getPlayers()
    // Update the store's players object
    Object.assign(leagueStore.players, freshPlayers)
    
    // Clear debug logs so we can see fresh data
    teamProjectionDebugLogged.clear()
    
    // If a matchup is selected, re-analyze it with fresh data
    if (selectedMatchup.value) {
      // Find the updated matchup data
      const updatedMatchup = matchups.value.find(m => m.matchup_id === selectedMatchup.value!.matchup_id)
      if (updatedMatchup) {
        selectedMatchup.value = updatedMatchup
        analyzeMatchup()
        buildStarterComparison()
        buildInjuryReport()
      }
    }
    
    console.log('✅ Data refreshed with fresh API data!')
  } catch (error) {
    console.error('Failed to refresh data:', error)
  } finally {
    isRefreshing.value = false
  }
}

function calculateTeamStats(
  rosterId: number,
  opponentRosterId: number,
  allSeasons: any[],
  currentSeasonWeek: number
): TeamStats {
  let championships = 0
  let alltime_wins = 0
  let alltime_losses = 0
  let season_points = 0
  let season_games = 0
  let h2h_wins = 0
  let h2h_losses = 0
  
  // Calculate across all seasons
  allSeasons.forEach(season => {
    const rosters = leagueStore.historicalRosters.get(season.season) || []
    const matchups = leagueStore.historicalMatchups.get(season.season) || new Map()
    const playoffStart = season.settings?.playoff_week_start || 15
    
    const myRoster = rosters.find(r => {
      const users = leagueStore.historicalUsers.get(season.season) || []
      const currentSeasonRoster = leagueStore.historicalRosters.get(selectedSeason.value)?.find(cr => cr.roster_id === rosterId)
      if (!currentSeasonRoster) return false
      const myUser = users.find(u => u.user_id === r.owner_id)
      const currentUser = leagueStore.historicalUsers.get(selectedSeason.value)?.find(u => u.user_id === currentSeasonRoster.owner_id)
      return myUser?.user_id === currentUser?.user_id
    })
    
    if (!myRoster) return
    
    // Check for championship
    // Championship is matchup_id 1 in the LAST week of playoffs (usually week 17)
    const playoffEnd = playoffStart + 2 // Typically 3 weeks of playoffs
    let championshipWeek = playoffEnd
    
    // Find the actual last week with matchups (in case season ended early)
    const weeksWithMatchups = Array.from(matchups.keys()).filter(w => w >= playoffStart)
    if (weeksWithMatchups.length > 0) {
      championshipWeek = Math.max(...weeksWithMatchups)
    }
    
    const championshipMatchups = matchups.get(championshipWeek) || []
    const myChampMatch = championshipMatchups.find(m => m.roster_id === myRoster.roster_id && m.matchup_id === 1)
    
    if (myChampMatch) {
      const opponent = championshipMatchups.find(m => m.matchup_id === 1 && m.roster_id !== myRoster.roster_id)
      if (opponent && (myChampMatch.points || 0) > (opponent.points || 0)) {
        championships++
      }
    }
    
    // Calculate W-L and PPG
    matchups.forEach((weekMatchups, week) => {
      if (week >= playoffStart) return // Exclude playoffs for regular season stats
      
      const myMatch = weekMatchups.find(m => m.roster_id === myRoster.roster_id)
      if (!myMatch || !myMatch.matchup_id) return
      
      const opponent = weekMatchups.find(
        m => m.matchup_id === myMatch.matchup_id && m.roster_id !== myRoster.roster_id
      )
      
      if (opponent) {
        if ((myMatch.points || 0) > (opponent.points || 0)) alltime_wins++
        else if ((myMatch.points || 0) < (opponent.points || 0)) alltime_losses++
        
        // PPG for current season only
        if (season.season === selectedSeason.value && week <= currentSeasonWeek) {
          season_points += myMatch.points || 0
          season_games++
        }
      }
    })
    
    // Calculate H2H record against specific opponent
    const opponentRoster = rosters.find(r => {
      const users = leagueStore.historicalUsers.get(season.season) || []
      const currentSeasonOpponent = leagueStore.historicalRosters.get(selectedSeason.value)?.find(cr => cr.roster_id === opponentRosterId)
      if (!currentSeasonOpponent) return false
      const oppUser = users.find(u => u.user_id === r.owner_id)
      const currentOppUser = leagueStore.historicalUsers.get(selectedSeason.value)?.find(u => u.user_id === currentSeasonOpponent.owner_id)
      return oppUser?.user_id === currentOppUser?.user_id
    })
    
    if (opponentRoster) {
      matchups.forEach((weekMatchups) => {
        const myMatch = weekMatchups.find(m => m.roster_id === myRoster.roster_id)
        const oppMatch = weekMatchups.find(m => m.roster_id === opponentRoster.roster_id)
        
        if (myMatch && oppMatch && myMatch.matchup_id === oppMatch.matchup_id) {
          if ((myMatch.points || 0) > (oppMatch.points || 0)) h2h_wins++
          else if ((myMatch.points || 0) < (oppMatch.points || 0)) h2h_losses++
        }
      })
    }
  })
  
  return {
    championships,
    alltime_wins,
    alltime_losses,
    ppg: season_games > 0 ? season_points / season_games : 0,
    h2h_wins,
    h2h_losses
  }
}

const matchups = computed((): MatchupDisplay[] => {
  if (!matchupsData.value.length) return []
  
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  const rosters = leagueStore.historicalRosters.get(selectedSeason.value) || []
  const users = leagueStore.historicalUsers.get(selectedSeason.value) || []
  const currentWeek = parseInt(selectedWeek.value)
  
  if (!seasonInfo) return []
  
  // Group matchups by matchup_id
  const matchupGroups = new Map<number, SleeperMatchup[]>()
  
  matchupsData.value.forEach(matchup => {
    if (!matchup.matchup_id) return
    
    if (!matchupGroups.has(matchup.matchup_id)) {
      matchupGroups.set(matchup.matchup_id, [])
    }
    matchupGroups.get(matchup.matchup_id)!.push(matchup)
  })
  
  const result: MatchupDisplay[] = []
  
  matchupGroups.forEach((teams, matchupId) => {
    if (teams.length !== 2) return
    
    const team1 = teams[0]
    const team2 = teams[1]
    
    const roster1 = rosters.find(r => r.roster_id === team1.roster_id)
    const roster2 = rosters.find(r => r.roster_id === team2.roster_id)
    
    const user1 = users.find(u => u.user_id === roster1?.owner_id)
    const user2 = users.find(u => u.user_id === roster2?.owner_id)
    
    // Calculate comprehensive stats
    const team1Stats = calculateTeamStats(
      team1.roster_id,
      team2.roster_id,
      leagueStore.historicalSeasons,
      currentWeek
    )
    
    const team2Stats = calculateTeamStats(
      team2.roster_id,
      team1.roster_id,
      leagueStore.historicalSeasons,
      currentWeek
    )
    
    // Calculate projected points (use team's season average PPG)
    const team1Projected = calculateTeamProjected(roster1!, team1.roster_id)
    const team2Projected = calculateTeamProjected(roster2!, team2.roster_id)
    
    // Determine if matchup is complete
    const isCurrentWeek = selectedSeason.value === leagueStore.historicalSeasons[0]?.season &&
                          parseInt(selectedWeek.value) === (seasonInfo?.settings?.leg || 1)
    const hasPoints = (team1.points || 0) > 0 || (team2.points || 0) > 0
    const isComplete = !isCurrentWeek || (hasPoints && !isCurrentWeek)
    
    result.push({
      matchup_id: matchupId,
      team1_name: sleeperService.getTeamName(roster1!, user1),
      team1_avatar: sleeperService.getAvatarUrl(roster1!, user1, seasonInfo),
      team1_points: team1.points || 0,
      team1_projected: team1Projected,
      team1_roster_id: team1.roster_id,
      team1_won: (team1.points || 0) > (team2.points || 0),
      team1_stats: team1Stats,
      team2_name: sleeperService.getTeamName(roster2!, user2),
      team2_avatar: sleeperService.getAvatarUrl(roster2!, user2, seasonInfo),
      team2_points: team2.points || 0,
      team2_projected: team2Projected,
      team2_roster_id: team2.roster_id,
      team2_won: (team2.points || 0) > (team1.points || 0),
      team2_stats: team2Stats,
      is_complete: isComplete,
      ai_insight: aiInsights.value.get(matchupId) || ''
    })
  })
  
  return result.sort((a, b) => a.matchup_id - b.matchup_id)
})

const weekStats = computed(() => {
  if (!matchupsData.value.length) {
    return {
      highest_score: 0,
      highest_scorer: 'N/A',
      lowest_score: 0,
      lowest_scorer: 'N/A',
      closest_matchup: 0,
      closest_teams: 'N/A',
      avg_score: 0
    }
  }
  
  const rosters = leagueStore.historicalRosters.get(selectedSeason.value) || []
  const users = leagueStore.historicalUsers.get(selectedSeason.value) || []
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  
  let highestScore = 0
  let highestScorer = 'N/A'
  let lowestScore = Infinity
  let lowestScorer = 'N/A'
  let totalScore = 0
  let scoreCount = 0
  
  matchupsData.value.forEach(matchup => {
    const score = matchup.points || 0
    const roster = rosters.find(r => r.roster_id === matchup.roster_id)
    const user = users.find(u => u.user_id === roster?.owner_id)
    const name = sleeperService.getTeamName(roster!, user)
    
    totalScore += score
    scoreCount++
    
    if (score > highestScore) {
      highestScore = score
      highestScorer = name
    }
    
    if (score < lowestScore) {
      lowestScore = score
      lowestScorer = name
    }
  })
  
  let closestMargin = Infinity
  let closestTeams = 'N/A'
  
  matchups.value.forEach(matchup => {
    const margin = Math.abs(matchup.team1_points - matchup.team2_points)
    if (margin < closestMargin) {
      closestMargin = margin
      closestTeams = `${matchup.team1_name} vs ${matchup.team2_name}`
    }
  })
  
  return {
    highest_score: highestScore,
    highest_scorer: highestScorer,
    lowest_score: lowestScore === Infinity ? 0 : lowestScore,
    lowest_scorer: lowestScorer,
    closest_matchup: closestMargin === Infinity ? 0 : closestMargin,
    closest_teams: closestTeams,
    avg_score: scoreCount > 0 ? totalScore / scoreCount : 0
  }
})

// H2H Matrix
const h2hMatrix = computed(() => {
  const rosters = leagueStore.historicalRosters.get(selectedSeason.value) || []
  const users = leagueStore.historicalUsers.get(selectedSeason.value) || []
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  
  const teams: H2HTeam[] = rosters.map(roster => {
    const user = users.find(u => u.user_id === roster.owner_id)
    return {
      roster_id: roster.roster_id,
      name: sleeperService.getTeamName(roster, user),
      owner_id: roster.owner_id
    }
  })
  
  return { teams }
})

function getH2HRecord(rowRosterId: number, colRosterId: number): string {
  if (rowRosterId === colRosterId) return '—'
  
  let wins = 0
  let losses = 0
  
  // Get owner IDs for tracking across seasons
  const currentRosters = leagueStore.historicalRosters.get(selectedSeason.value) || []
  const currentUsers = leagueStore.historicalUsers.get(selectedSeason.value) || []
  
  const rowRoster = currentRosters.find(r => r.roster_id === rowRosterId)
  const colRoster = currentRosters.find(r => r.roster_id === colRosterId)
  
  if (!rowRoster || !colRoster) return '0-0'
  
  const rowUser = currentUsers.find(u => u.user_id === rowRoster.owner_id)
  const colUser = currentUsers.find(u => u.user_id === colRoster.owner_id)
  
  // Check all seasons
  leagueStore.historicalSeasons.forEach(season => {
    const rosters = leagueStore.historicalRosters.get(season.season) || []
    const users = leagueStore.historicalUsers.get(season.season) || []
    const matchups = leagueStore.historicalMatchups.get(season.season) || new Map()
    
    const rowSeasonRoster = rosters.find(r => {
      const user = users.find(u => u.user_id === r.owner_id)
      return user?.user_id === rowUser?.user_id
    })
    
    const colSeasonRoster = rosters.find(r => {
      const user = users.find(u => u.user_id === r.owner_id)
      return user?.user_id === colUser?.user_id
    })
    
    if (!rowSeasonRoster || !colSeasonRoster) return
    
    matchups.forEach((weekMatchups) => {
      const rowMatch = weekMatchups.find(m => m.roster_id === rowSeasonRoster.roster_id)
      const colMatch = weekMatchups.find(m => m.roster_id === colSeasonRoster.roster_id)
      
      if (rowMatch && colMatch && rowMatch.matchup_id === colMatch.matchup_id) {
        if ((rowMatch.points || 0) > (colMatch.points || 0)) wins++
        else if ((rowMatch.points || 0) < (colMatch.points || 0)) losses++
      }
    })
  })
  
  return `${wins}-${losses}`
}

function getCellClass(rowRosterId: number, colRosterId: number): string {
  if (rowRosterId === colRosterId) return 'bg-dark-border/30'
  
  const record = getH2HRecord(rowRosterId, colRosterId)
  const [wins, losses] = record.split('-').map(Number)
  
  if (wins > losses) return 'bg-green-500/10 text-green-400'
  if (losses > wins) return 'bg-red-500/10 text-red-400'
  return ''
}

// Methods
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'https://sleepercdn.com/avatars/thumbs/default'
}

async function generateMatchupInsight(matchup: MatchupDisplay) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    alert('OpenAI API key not configured.')
    return
  }
  
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  const isPreview = !matchup.is_complete
  
  const prompt = isPreview 
    ? `You are a fantasy football analyst. Write a 2-3 sentence matchup preview for:

${matchup.team1_name} (${matchup.team1_stats.alltime_wins}-${matchup.team1_stats.alltime_losses}) vs ${matchup.team2_name} (${matchup.team2_stats.alltime_wins}-${matchup.team2_stats.alltime_losses})

Season PPG: ${matchup.team1_stats.ppg.toFixed(1)} vs ${matchup.team2_stats.ppg.toFixed(1)}
H2H Record: ${matchup.team1_stats.h2h_wins}-${matchup.team1_stats.h2h_losses} (${matchup.team1_name} leads)
Championships: ${matchup.team1_stats.championships} vs ${matchup.team2_stats.championships}

Focus on: playoff implications, streaks, recent form, H2H history. Keep it punchy and engaging!`
    : `You are a fantasy football analyst. ${matchup.team1_name} (${matchup.team1_points.toFixed(1)}) vs ${matchup.team2_name} (${matchup.team2_points.toFixed(1)}).

Write what the losing team needs to happen to win (e.g., "Team A needs Player X to score 15.3 points to win" or "Team B needs Player Y to outscore Player Z by 8 points"). Keep it to 1-2 sentences, specific and actionable.`
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a witty fantasy football analyst.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 150
      })
    })
    
    if (!response.ok) throw new Error('API error')
    
    const data = await response.json()
    const insight = data.choices[0]?.message?.content || 'Analysis unavailable.'
    
    aiInsights.value.set(matchup.matchup_id, insight)
  } catch (error) {
    console.error('Failed to generate insight:', error)
    aiInsights.value.set(matchup.matchup_id, 'Unable to generate insight. Please try again.')
  }
}

async function loadMatchups() {
  if (!selectedSeason.value || !selectedWeek.value) return
  
  isLoading.value = true
  aiInsights.value.clear()
  
  try {
    const season = selectedSeason.value
    const week = parseInt(selectedWeek.value)
    const allMatchups = leagueStore.historicalMatchups.get(season)
    
    if (allMatchups) {
      matchupsData.value = allMatchups.get(week) || []
      
      // Fetch projections for all players in this week's matchups
      await fetchProjectionsForMatchups(season, week)
    }
  } catch (error) {
    console.error('Failed to load matchups:', error)
  } finally {
    isLoading.value = false
  }
}

// Fetch projections for all players in the current week's matchups
async function fetchProjectionsForMatchups(season: string, week: number) {
  try {
    // Collect all player IDs from all matchups
    const allPlayerIds: string[] = []
    
    matchupsData.value.forEach(matchup => {
      if (matchup.starters && matchup.starters.length > 0) {
        allPlayerIds.push(...matchup.starters.filter(id => id && id !== '0'))
      }
    })
    
    // Remove duplicates
    const uniquePlayerIds = [...new Set(allPlayerIds)]
    
    if (uniquePlayerIds.length === 0) {
      console.log('No player IDs found for projections')
      return
    }
    
    console.log(`📊 Fetching projections for ${uniquePlayerIds.length} players...`)
    
    // Fetch projections from Sleeper
    const projections = await sleeperService.getPlayerProjections(
      season,
      week,
      uniquePlayerIds,
      'regular'
    )
    
    playerProjections.value = projections
    console.log(`✅ Got projections for ${projections.size} players`)
    
    // Debug: Log sample projection data to see structure
    if (projections.size > 0) {
      const firstEntry = projections.entries().next().value
      if (firstEntry) {
        console.log('📋 Sample projection data:', {
          playerId: firstEntry[0],
          data: firstEntry[1],
          statsKeys: firstEntry[1]?.stats ? Object.keys(firstEntry[1].stats) : 'no stats',
          sampleStats: firstEntry[1]?.stats ? {
            pts_ppr: firstEntry[1].stats.pts_ppr,
            pts_half_ppr: firstEntry[1].stats.pts_half_ppr,
            pts_std: firstEntry[1].stats.pts_std,
            rec: firstEntry[1].stats.rec,
            rec_yd: firstEntry[1].stats.rec_yd,
            rush_yd: firstEntry[1].stats.rush_yd,
            pass_yd: firstEntry[1].stats.pass_yd
          } : 'no stats'
        })
      }
    }
    
  } catch (error) {
    console.error('Failed to fetch projections:', error)
    playerProjections.value = new Map()
  }
}

function onSeasonChange() {
  selectedWeek.value = ''
  matchupsData.value = []
  aiInsights.value.clear()
  
  if (availableWeeks.value.length > 0) {
    // Get current week from league settings, or default to week before last (not including playoffs)
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
    const currentWeek = seasonInfo?.settings?.leg || seasonInfo?.settings?.playoff_week_start || 14
    
    // If current week is available, use it; otherwise use the most recent completed week
    if (availableWeeks.value.includes(currentWeek)) {
      selectedWeek.value = currentWeek.toString()
    } else {
      // Find the highest week that's not beyond current week
      const validWeeks = availableWeeks.value.filter(w => w <= currentWeek)
      selectedWeek.value = validWeeks.length > 0 
        ? validWeeks[validWeeks.length - 1].toString()
        : availableWeeks.value[0].toString() // Fallback to first week
    }
    
    loadMatchups()
  }
}

// Analyzer functions
function selectMatchup(matchup: MatchupDisplay) {
  selectedMatchup.value = matchup
  matchupPreviewText.value = '' // Reset preview text
  analyzeMatchup()
  buildStarterComparison()
  buildInjuryReport()
  // Auto-generate AI preview
  generateMatchupPreview()
  
  // On mobile, scroll to the analysis section after a brief delay
  setTimeout(() => {
    const isMobile = window.innerWidth < 768
    if (isMobile) {
      const analysisEl = document.getElementById('matchup-analysis-section')
      if (analysisEl) {
        analysisEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, 100)
}

async function analyzeMatchup() {
  if (!selectedMatchup.value || !selectedSeason.value || !selectedWeek.value) return
  
  const team1Id = selectedMatchup.value.team1_roster_id
  const team2Id = selectedMatchup.value.team2_roster_id
  
  // Calculate team statistics
  const team1Stats = calculateSeasonStats(team1Id)
  const team2Stats = calculateSeasonStats(team2Id)
  
  // Run Monte Carlo simulation
  const simulation = runMonteCarloSim(team1Stats, team2Stats)
  
  matchupAnalysis.value = simulation
  
  // Build comparison stats
  buildComparisonStats(team1Stats, team2Stats)
  
  // Build historical matchups (lifetime)
  buildLifetimeHistory(team1Id, team2Id)
  
  // Build scouting reports
  buildScoutingReports(team1Stats, team2Stats, team1Id, team2Id)
}

function calculateSeasonStats(rosterId: number) {
  const matchupsByWeek = leagueStore.historicalMatchups.get(selectedSeason.value) || new Map()
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  const playoffStart = seasonInfo?.settings?.playoff_week_start || 15
  const selectedWeekNum = parseInt(selectedWeek.value)
  
  let totalPoints = 0
  let games = 0
  let wins = 0
  let losses = 0
  let weeklyScores: number[] = []
  let recentScores: number[] = []
  
  matchupsByWeek.forEach((weekMatchups, week) => {
    // Exclude current week if incomplete and exclude playoffs
    if (week >= playoffStart || week > selectedWeekNum) return
    
    const myMatch = weekMatchups.find(m => m.roster_id === rosterId)
    if (!myMatch?.matchup_id) return
    
    const opponent = weekMatchups.find(m => 
      m.matchup_id === myMatch.matchup_id && m.roster_id !== rosterId
    )
    
    if (opponent) {
      const myPoints = myMatch.points || 0
      const oppPoints = opponent.points || 0
      
      totalPoints += myPoints
      games++
      weeklyScores.push(myPoints)
      
      if (myPoints > oppPoints) wins++
      else if (myPoints < oppPoints) losses++
      
      // Last 3 weeks
      if (week >= selectedWeekNum - 2 && week < selectedWeekNum) {
        recentScores.push(myPoints)
      }
    }
  })
  
  const avgPPG = games > 0 ? totalPoints / games : 0
  
  // Calculate standard deviation
  let stdDev = 0
  if (weeklyScores.length > 1) {
    const mean = avgPPG
    const squaredDiffs = weeklyScores.map(score => Math.pow(score - mean, 2))
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / weeklyScores.length
    stdDev = Math.sqrt(variance)
  }
  
  const highScore = weeklyScores.length > 0 ? Math.max(...weeklyScores) : 0
  const lowScore = weeklyScores.length > 0 ? Math.min(...weeklyScores) : 0
  
  return {
    avgPPG,
    stdDev,
    wins,
    losses,
    games,
    highScore,
    lowScore,
    recentScores,
    weeklyScores
  }
}

function runMonteCarloSim(team1Stats: any, team2Stats: any, iterations = 10000) {
  let team1Wins = 0
  let team2Wins = 0
  
  for (let i = 0; i < iterations; i++) {
    // Generate scores using normal distribution
    const team1Score = team1Stats.avgPPG + (Math.random() - 0.5) * 2 * team1Stats.stdDev
    const team2Score = team2Stats.avgPPG + (Math.random() - 0.5) * 2 * team2Stats.stdDev
    
    if (team1Score > team2Score) team1Wins++
    else team2Wins++
  }
  
  const team1WinProb = (team1Wins / iterations) * 100
  const team2WinProb = (team2Wins / iterations) * 100
  
  const favoriteProb = Math.max(team1WinProb, team2WinProb)
  const upsetPotential = 100 - favoriteProb
  
  return {
    team1WinProb,
    team2WinProb,
    team1Projected: team1Stats.avgPPG,
    team2Projected: team2Stats.avgPPG,
    team1Min: team1Stats.avgPPG - team1Stats.stdDev,
    team1Max: team1Stats.avgPPG + team1Stats.stdDev,
    team2Min: team2Stats.avgPPG - team2Stats.stdDev,
    team2Max: team2Stats.avgPPG + team2Stats.stdDev,
    upsetPotential
  }
}

function buildComparisonStats(team1Stats: any, team2Stats: any) {
  comparisonStats.value = [
    {
      label: 'Record',
      team1Value: `${team1Stats.wins}-${team1Stats.losses}`,
      team2Value: `${team2Stats.wins}-${team2Stats.losses}`,
      team1Better: team1Stats.wins > team2Stats.wins,
      team2Better: team2Stats.wins > team1Stats.wins
    },
    {
      label: 'Average PPG',
      team1Value: team1Stats.avgPPG.toFixed(1),
      team2Value: team2Stats.avgPPG.toFixed(1),
      team1Better: team1Stats.avgPPG > team2Stats.avgPPG,
      team2Better: team2Stats.avgPPG > team1Stats.avgPPG
    },
    {
      label: 'High Score',
      team1Value: team1Stats.highScore.toFixed(1),
      team2Value: team2Stats.highScore.toFixed(1),
      team1Better: team1Stats.highScore > team2Stats.highScore,
      team2Better: team2Stats.highScore > team1Stats.highScore
    },
    {
      label: 'Low Score',
      team1Value: team1Stats.lowScore.toFixed(1),
      team2Value: team2Stats.lowScore.toFixed(1),
      team1Better: team1Stats.lowScore > team2Stats.lowScore,
      team2Better: team2Stats.lowScore > team1Stats.lowScore
    },
    {
      label: 'Consistency (StdDev)',
      team1Value: team1Stats.stdDev.toFixed(1),
      team2Value: team2Stats.stdDev.toFixed(1),
      team1Better: team1Stats.stdDev < team2Stats.stdDev, // Lower is better
      team2Better: team2Stats.stdDev < team1Stats.stdDev
    }
  ]
}

function buildLifetimeHistory(team1RosterId: number, team2RosterId: number) {
  const team1UserId = selectedMatchup.value?.team1_roster_id ? 
    getRosterOwner(team1RosterId, selectedSeason.value) : null
  const team2UserId = selectedMatchup.value?.team2_roster_id ?
    getRosterOwner(team2RosterId, selectedSeason.value) : null
  
  if (!team1UserId || !team2UserId) return
  
  let team1Wins = 0
  let team2Wins = 0
  let ties = 0
  const games: any[] = []
  
  // Get the current active season and week from Sleeper
  // settings.leg is the current NFL week the league is in
  const currentActiveSeason = leagueStore.historicalSeasons[0]
  const currentActiveWeek = currentActiveSeason?.settings?.leg || 1
  
  // Loop through ALL seasons for lifetime record
  leagueStore.historicalSeasons.forEach(seasonInfo => {
    const rosters = leagueStore.historicalRosters.get(seasonInfo.season) || []
    const matchups = leagueStore.historicalMatchups.get(seasonInfo.season)
    if (!matchups) return
    
    const roster1 = rosters.find(r => r.owner_id === team1UserId)
    const roster2 = rosters.find(r => r.owner_id === team2UserId)
    if (!roster1 || !roster2) return
    
    // Determine if this is the current active season
    const isCurrentSeason = seasonInfo.season === currentActiveSeason?.season
    
    matchups.forEach((weekMatchups, week) => {
      const match1 = weekMatchups.find(m => m.roster_id === roster1.roster_id)
      const match2 = weekMatchups.find(m => m.roster_id === roster2.roster_id)
      
      if (!match1 || !match2) return
      if (match1.matchup_id !== match2.matchup_id) return
      
      // Only include completed matchups:
      // - Past seasons: all matchups are complete
      // - Current season: only weeks before the current active week are complete
      if (isCurrentSeason && week >= currentActiveWeek) return
      
      const score1 = match1.points || 0
      const score2 = match2.points || 0
      
      // Skip games that haven't been played yet (both scores are 0)
      if (score1 === 0 && score2 === 0) return
      
      if (score1 > score2) team1Wins++
      else if (score2 > score1) team2Wins++
      else ties++
      
      games.push({
        season: seasonInfo.season,
        week,
        team1Score: score1,
        team2Score: score2,
        margin: Math.abs(score1 - score2),
        team1Won: score1 > score2,
        team2Won: score2 > score1
      })
    })
  })
  
  games.sort((a, b) => {
    if (b.season !== a.season) return b.season.localeCompare(a.season)
    return b.week - a.week
  })
  
  historicalMatchups.value = {
    team1Wins,
    team2Wins,
    ties,
    games
  }
}

function getRosterOwner(rosterId: number, season: string): string | null {
  const rosters = leagueStore.historicalRosters.get(season) || []
  const roster = rosters.find(r => r.roster_id === rosterId)
  return roster?.owner_id || null
}

function buildScoutingReports(team1Stats: any, team2Stats: any, team1RosterId: number, team2RosterId: number) {
  // Team 1 Report
  const team1Strengths: string[] = []
  const team1Weaknesses: string[] = []
  
  if (team1Stats.avgPPG > 110) team1Strengths.push('Strong scoring average')
  if (team1Stats.stdDev < 15) team1Strengths.push('Consistent week-to-week')
  if (team1Stats.wins > team1Stats.losses + 2) team1Strengths.push('Strong win record')
  if (team1Stats.highScore > 140) team1Strengths.push('High scoring ceiling')
  
  if (team1Stats.avgPPG < 100) team1Weaknesses.push('Below average scoring')
  if (team1Stats.stdDev > 25) team1Weaknesses.push('Inconsistent performances')
  if (team1Stats.lowScore < 80) team1Weaknesses.push('Low scoring floor')
  
  // Team 2 Report
  const team2Strengths: string[] = []
  const team2Weaknesses: string[] = []
  
  if (team2Stats.avgPPG > 110) team2Strengths.push('Strong scoring average')
  if (team2Stats.stdDev < 15) team2Strengths.push('Consistent week-to-week')
  if (team2Stats.wins > team2Stats.losses + 2) team2Strengths.push('Strong win record')
  if (team2Stats.highScore > 140) team2Strengths.push('High scoring ceiling')
  
  if (team2Stats.avgPPG < 100) team2Weaknesses.push('Below average scoring')
  if (team2Stats.stdDev > 25) team2Weaknesses.push('Inconsistent performances')
  if (team2Stats.lowScore < 80) team2Weaknesses.push('Low scoring floor')
  
  // Recent form (last 3 weeks) - now properly calculated
  const team1Form = getRecentForm(team1Stats.weeklyScores, team1RosterId)
  const team2Form = getRecentForm(team2Stats.weeklyScores, team2RosterId)
  
  scoutingReports.value = {
    team1: {
      strengths: team1Strengths,
      weaknesses: team1Weaknesses,
      recentForm: team1Form
    },
    team2: {
      strengths: team2Strengths,
      weaknesses: team2Weaknesses,
      recentForm: team2Form
    }
  }
}

function getRecentForm(weeklyScores: number[], rosterId: number): string[] {
  const matchupsByWeek = leagueStore.historicalMatchups.get(selectedSeason.value) || new Map()
  const form: string[] = []
  
  // Get last 3 completed weeks (not including current incomplete week)
  const selectedWeekNum = parseInt(selectedWeek.value)
  const playoffStart = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)?.settings?.playoff_week_start || 15
  
  const recentWeeks = Array.from(matchupsByWeek.keys())
    .filter(w => w < selectedWeekNum && w < playoffStart)
    .sort((a, b) => b - a)
  
  // Process weeks until we have 3 valid results (skip bye weeks)
  for (const week of recentWeeks) {
    if (form.length >= 3) break
    
    const weekMatchups = matchupsByWeek.get(week) || []
    
    // Find this team's matchup
    const myMatchup = weekMatchups.find(m => m.roster_id === rosterId)
    if (!myMatchup || !myMatchup.matchup_id) {
      continue // Skip - no matchup (bye week)
    }
    
    // Find opponent
    const opponent = weekMatchups.find(m => 
      m.matchup_id === myMatchup.matchup_id && m.roster_id !== rosterId
    )
    
    if (!opponent) {
      continue // Skip - no opponent found
    }
    
    const myPoints = myMatchup.points || 0
    const oppPoints = opponent.points || 0
    
    // Skip bye weeks where points are 0
    if (myPoints === 0 && oppPoints === 0) {
      continue
    }
    
    if (myPoints > oppPoints) {
      form.push('W')
    } else if (myPoints < oppPoints) {
      form.push('L')
    } else {
      form.push('T')
    }
  }
  
  return form
}

// ===== NEW MATCHUP PREVIEW FUNCTIONS =====

// Get player's last 10 weeks stats (best and average)
function getPlayerLast10Stats(playerId: string): { best: number; avg: number } {
  // Check cache first
  if (playerLast10Stats.value.has(playerId)) {
    return playerLast10Stats.value.get(playerId)!
  }
  
  const scores: number[] = []
  const currentWeek = parseInt(selectedWeek.value)
  
  // Look through current season's matchups
  const matchupsByWeek = leagueStore.historicalMatchups.get(selectedSeason.value) || new Map()
  
  // Get last 10 weeks (or fewer if not available)
  const weeksToCheck = Array.from(matchupsByWeek.keys())
    .filter(w => w < currentWeek)
    .sort((a, b) => b - a)
    .slice(0, 10)
  
  weeksToCheck.forEach(week => {
    const weekMatchups = matchupsByWeek.get(week) || []
    weekMatchups.forEach(m => {
      if (m.players_points && m.players_points[playerId] !== undefined) {
        scores.push(m.players_points[playerId])
      }
    })
  })
  
  // If no scores in current season, check previous season
  if (scores.length < 5 && leagueStore.historicalSeasons.length > 1) {
    const prevSeason = leagueStore.historicalSeasons[1]
    const prevMatchups = leagueStore.historicalMatchups.get(prevSeason.season) || new Map()
    
    Array.from(prevMatchups.keys())
      .sort((a, b) => b - a)
      .slice(0, 10 - scores.length)
      .forEach(week => {
        const weekMatchups = prevMatchups.get(week) || []
        weekMatchups.forEach(m => {
          if (m.players_points && m.players_points[playerId] !== undefined) {
            scores.push(m.players_points[playerId])
          }
        })
      })
  }
  
  const result = {
    best: scores.length > 0 ? Math.max(...scores) : 0,
    avg: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  }
  
  playerLast10Stats.value.set(playerId, result)
  return result
}

// Build starter vs starter comparison
function buildStarterComparison() {
  if (!selectedMatchup.value) {
    starterComparison.value = []
    return
  }
  
  const team1Matchup = matchupsData.value.find(m => m.roster_id === selectedMatchup.value!.team1_roster_id)
  const team2Matchup = matchupsData.value.find(m => m.roster_id === selectedMatchup.value!.team2_roster_id)
  
  if (!team1Matchup?.starters || !team2Matchup?.starters) {
    starterComparison.value = []
    return
  }
  
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  const rosterPositions = seasonInfo?.roster_positions || []
  
  // Get starter slots (filter out BN positions)
  const starterSlots = rosterPositions.filter(pos => pos !== 'BN')
  
  const comparison: any[] = []
  
  starterSlots.forEach((position, idx) => {
    const team1PlayerId = team1Matchup.starters[idx]
    const team2PlayerId = team2Matchup.starters[idx]
    
    const team1Player = team1PlayerId && team1PlayerId !== '0' ? getPlayerInfo(team1PlayerId, team1Matchup) : null
    const team2Player = team2PlayerId && team2PlayerId !== '0' ? getPlayerInfo(team2PlayerId, team2Matchup) : null
    
    // Determine advantage based on what's being displayed:
    // Final: actual points, Live/Upcoming: projected points
    let advantage = 'even'
    if (team1Player && team2Player) {
      // Get the points that will be displayed for comparison
      const team1Pts = team1Player.gameStatus === 'final' 
        ? (team1Player.actualPoints || 0) 
        : (team1Player.projected || 0)
      const team2Pts = team2Player.gameStatus === 'final' 
        ? (team2Player.actualPoints || 0) 
        : (team2Player.projected || 0)
      
      const diff = team1Pts - team2Pts
      if (diff > 2) advantage = 'team1'
      else if (diff < -2) advantage = 'team2'
    } else if (team1Player && !team2Player) {
      advantage = 'team1'
    } else if (!team1Player && team2Player) {
      advantage = 'team2'
    }
    
    comparison.push({
      position,
      team1Player,
      team2Player,
      advantage
    })
  })
  
  starterComparison.value = comparison
}

// Get player info with projections, actual points, and stats
function getPlayerInfo(playerId: string, teamMatchup: any) {
  const player = leagueStore.players[playerId]
  const last10 = getPlayerLast10Stats(playerId)
  
  // Get projected points using league-specific scoring (Sleeper updates these live during games)
  const projected = calculatePlayerProjectedPoints(playerId)
  
  // Get actual points scored (from players_points in matchup data)
  const actualPoints = teamMatchup.players_points?.[playerId]
  const hasActualPoints = actualPoints !== undefined && actualPoints !== null
  
  // Determine game status:
  // - 'final' = has actual points and game is done (actual >= 90% of projection or projection is 0)
  // - 'live' = has some points but game still in progress
  // - 'upcoming' = no actual points yet (game hasn't started)
  let gameStatus: 'final' | 'live' | 'upcoming' = 'upcoming'
  
  if (hasActualPoints) {
    // If actual points are close to or exceed projection, consider it final
    // Also final if projection is 0 (player not expected to play)
    if (projected === 0 || actualPoints >= projected * 0.9) {
      gameStatus = 'final'
    } else if (actualPoints > 0 || (actualPoints === 0 && projected > 0)) {
      // Has points or has 0 but expected to score - could be live
      // The key insight: if Sleeper recorded actual points but they're well below projection,
      // the game is likely still in progress
      gameStatus = actualPoints < projected * 0.5 ? 'live' : 'final'
    }
  }
  
  // Determine what to display:
  // - Final: show actual points with lock
  // - Live: show the projected points (Sleeper updates these during games)
  // - Upcoming: show projected points
  let displayPoints = projected
  if (gameStatus === 'final' && hasActualPoints) {
    displayPoints = actualPoints
  }
  // For live games, we show the projection which Sleeper updates during the game
  
  return {
    id: playerId,
    name: player?.full_name || player?.first_name + ' ' + player?.last_name || `Player ${playerId}`,
    position: player?.position || 'N/A',
    team: player?.team || 'FA',
    projected,
    actualPoints: hasActualPoints ? actualPoints : null,
    gameStatus,
    displayPoints,
    best10: last10.best,
    avg10: last10.avg,
    injuryStatus: player?.injury_status || null
  }
}

// Build injury report for both teams
function buildInjuryReport() {
  if (!selectedMatchup.value) {
    injuryReport.value = []
    return
  }
  
  const team1Matchup = matchupsData.value.find(m => m.roster_id === selectedMatchup.value!.team1_roster_id)
  const team2Matchup = matchupsData.value.find(m => m.roster_id === selectedMatchup.value!.team2_roster_id)
  
  const injuries: any[] = []
  
  // Check team 1 starters
  if (team1Matchup?.starters) {
    team1Matchup.starters.forEach(playerId => {
      if (!playerId || playerId === '0') return
      const player = leagueStore.players[playerId]
      if (player?.injury_status) {
        injuries.push({
          playerId,
          playerName: player.full_name || `${player.first_name} ${player.last_name}`,
          teamName: selectedMatchup.value!.team1_name,
          status: player.injury_status,
          note: player.injury_notes || player.injury_body_part || null
        })
      }
    })
  }
  
  // Check team 2 starters
  if (team2Matchup?.starters) {
    team2Matchup.starters.forEach(playerId => {
      if (!playerId || playerId === '0') return
      const player = leagueStore.players[playerId]
      if (player?.injury_status) {
        injuries.push({
          playerId,
          playerName: player.full_name || `${player.first_name} ${player.last_name}`,
          teamName: selectedMatchup.value!.team2_name,
          status: player.injury_status,
          note: player.injury_notes || player.injury_body_part || null
        })
      }
    })
  }
  
  injuryReport.value = injuries
}

// Generate AI matchup preview with COMPREHENSIVE context
async function generateMatchupPreview() {
  if (!selectedMatchup.value) return
  
  isGeneratingPreview.value = true
  
  const matchup = selectedMatchup.value
  
  // Get season info for playoff detection
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  const playoffStart = seasonInfo?.settings?.playoff_week_start || 15
  const weekNum = parseInt(selectedWeek.value)
  const isPlayoffWeek = weekNum >= playoffStart
  const playoffRound = isPlayoffWeek ? weekNum - playoffStart + 1 : 0
  
  // Build context for AI
  const team1Record = `${matchup.team1_stats.alltime_wins}-${matchup.team1_stats.alltime_losses}`
  const team2Record = `${matchup.team2_stats.alltime_wins}-${matchup.team2_stats.alltime_losses}`
  const h2hRecord = `${matchup.team1_stats.h2h_wins}-${matchup.team1_stats.h2h_losses}`
  
  // Get standings position
  const team1Standing = getStandingsText(matchup.team1_roster_id)
  const team2Standing = getStandingsText(matchup.team2_roster_id)
  
  // Get recent form streaks
  const team1Form = scoutingReports.value.team1.recentForm.join('')
  const team2Form = scoutingReports.value.team2.recentForm.join('')
  const team1Streak = getStreakDescription(scoutingReports.value.team1.recentForm)
  const team2Streak = getStreakDescription(scoutingReports.value.team2.recentForm)
  
  // Calculate last 3 weeks average
  const team1Last3Avg = calculateRecentAverage(matchup.team1_roster_id, 3)
  const team2Last3Avg = calculateRecentAverage(matchup.team2_roster_id, 3)
  
  // Get playoff matchup history
  const playoffHistory = getPlayoffMatchupHistory(matchup.team1_roster_id, matchup.team2_roster_id)
  
  // Find key injured players
  const team1InjuredStarters = team1Injuries.value.filter(i => i.status === 'Out' || i.status === 'Doubtful')
  const team2InjuredStarters = team2Injuries.value.filter(i => i.status === 'Out' || i.status === 'Doubtful')
  const team1InjuryNote = team1InjuredStarters.length > 0 
    ? `Key injuries: ${team1InjuredStarters.map(i => `${i.playerName} (${i.status})`).join(', ')}` 
    : 'No significant injuries'
  const team2InjuryNote = team2InjuredStarters.length > 0 
    ? `Key injuries: ${team2InjuredStarters.map(i => `${i.playerName} (${i.status})`).join(', ')}` 
    : 'No significant injuries'
  
  // Find top projected players
  const team1TopPlayer = starterComparison.value
    .filter(s => s.team1Player)
    .sort((a, b) => (b.team1Player?.projected || 0) - (a.team1Player?.projected || 0))[0]
  const team2TopPlayer = starterComparison.value
    .filter(s => s.team2Player)
    .sort((a, b) => (b.team2Player?.projected || 0) - (a.team2Player?.projected || 0))[0]
  
  // Calculate positional advantages
  const positionalAdvantages = starterComparison.value.reduce((acc, slot) => {
    if (slot.advantage === 'team1') acc.team1++
    else if (slot.advantage === 'team2') acc.team2++
    return acc
  }, { team1: 0, team2: 0 })

  // Build playoff context
  let playoffContext = ''
  if (isPlayoffWeek) {
    const roundNames = ['Quarterfinals', 'Semifinals', 'Championship']
    const roundName = roundNames[playoffRound - 1] || `Playoff Round ${playoffRound}`
    playoffContext = `
PLAYOFF CONTEXT:
This is a ${roundName} matchup! The stakes couldn't be higher.
${playoffHistory.totalGames > 0 
  ? `Playoff history between these teams: ${playoffHistory.team1Wins}-${playoffHistory.team2Wins} (${playoffHistory.team1Wins > playoffHistory.team2Wins ? matchup.team1_name + ' leads' : playoffHistory.team2Wins > playoffHistory.team1Wins ? matchup.team2_name + ' leads' : 'tied'})`
  : 'These teams have never met in the playoffs before!'}
`
  }

  const prompt = `Write an engaging 4-5 sentence fantasy football matchup preview for Week ${selectedWeek.value}. Be specific, analytical, and build excitement:

MATCHUP TYPE: ${isPlayoffWeek ? `🏆 PLAYOFF ${['QUARTERFINAL', 'SEMIFINAL', 'CHAMPIONSHIP'][playoffRound - 1] || 'GAME'}` : 'Regular Season'}

TEAMS:
${matchup.team1_name} (${team1Record} season, ${team1Standing})
vs 
${matchup.team2_name} (${team2Record} season, ${team2Standing})
${playoffContext}
RECENT PERFORMANCE (Last 3 Weeks):
${matchup.team1_name}: ${team1Last3Avg.toFixed(1)} PPG, Form: ${team1Form} - ${team1Streak}
${matchup.team2_name}: ${team2Last3Avg.toFixed(1)} PPG, Form: ${team2Form} - ${team2Streak}

SEASON STATS:
Season PPG: ${matchup.team1_stats.ppg.toFixed(1)} vs ${matchup.team2_stats.ppg.toFixed(1)}
Head-to-Head all-time: ${h2hRecord} (${historicalMatchups.value.games.length} total meetings)
${matchup.team1_stats.h2h_wins > matchup.team1_stats.h2h_losses ? `${matchup.team1_name} leads the series` : matchup.team1_stats.h2h_wins < matchup.team1_stats.h2h_losses ? `${matchup.team2_name} leads the series` : 'Series is tied'}
Championships: ${matchup.team1_stats.championships} vs ${matchup.team2_stats.championships}
Position advantages: ${matchup.team1_name} has ${positionalAdvantages.team1}, ${matchup.team2_name} has ${positionalAdvantages.team2}

KEY PLAYERS:
${matchup.team1_name} star: ${team1TopPlayer?.team1Player?.name || 'N/A'} (${team1TopPlayer?.team1Player?.position || ''}, proj ${team1TopPlayer?.team1Player?.projected?.toFixed(1) || 0}, avg ${team1TopPlayer?.team1Player?.avg10?.toFixed(1) || 'N/A'})
${matchup.team2_name} star: ${team2TopPlayer?.team2Player?.name || 'N/A'} (${team2TopPlayer?.team2Player?.position || ''}, proj ${team2TopPlayer?.team2Player?.projected?.toFixed(1) || 0}, avg ${team2TopPlayer?.team2Player?.avg10?.toFixed(1) || 'N/A'})

INJURIES:
${matchup.team1_name}: ${team1InjuryNote}
${matchup.team2_name}: ${team2InjuryNote}

INSTRUCTIONS:
${isPlayoffWeek 
  ? '- EMPHASIZE the playoff stakes and what\'s on the line\n- Mention if this is a revenge game or rematch\n- Build drama and excitement for the elimination game'
  : '- Mention playoff implications if relevant\n- Discuss who needs this win more'}
- Reference the last 3 weeks performance and momentum
- Highlight the key player matchup
- Note any concerning injuries
- Be specific with numbers and stats
- Write in an engaging sports broadcast style`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
        'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || ''
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    })
    
    if (!response.ok) {
      // Try OpenAI as fallback
      const openaiKey = import.meta.env.VITE_OPENAI_API_KEY
      if (openaiKey) {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an exciting, analytical fantasy football broadcaster who provides detailed matchup previews with specific stats and drama.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_tokens: 400
          })
        })
        
        if (openaiResponse.ok) {
          const data = await openaiResponse.json()
          matchupPreviewText.value = data.choices[0]?.message?.content || 'Unable to generate preview.'
          return
        }
      }
      throw new Error('API error')
    }
    
    const data = await response.json()
    matchupPreviewText.value = data.content[0]?.text || 'Unable to generate preview.'
  } catch (error) {
    console.error('Failed to generate preview:', error)
    // Generate a detailed fallback preview without AI
    const playoffNote = isPlayoffWeek 
      ? `This ${['Quarterfinal', 'Semifinal', 'Championship'][playoffRound - 1] || 'playoff'} matchup has everything on the line. ` 
      : ''
    
    matchupPreviewText.value = `${playoffNote}${matchup.team1_name} (${team1Record}, averaging ${team1Last3Avg.toFixed(1)} over the last 3 weeks) faces ${matchup.team2_name} (${team2Record}, ${team2Last3Avg.toFixed(1)} PPG recently) in Week ${selectedWeek.value}. ` +
      `${matchup.team1_stats.h2h_wins > matchup.team1_stats.h2h_losses ? matchup.team1_name + ' leads' : matchup.team1_stats.h2h_wins < matchup.team1_stats.h2h_losses ? matchup.team2_name + ' leads' : 'The series is tied'} ` +
      `the all-time series ${h2hRecord} across ${historicalMatchups.value.games.length} meetings. ` +
      `Watch for ${team1TopPlayer?.team1Player?.name || 'the top player'} vs ${team2TopPlayer?.team2Player?.name || 'the opposition'} as the key matchup that could decide this one.`
  } finally {
    isGeneratingPreview.value = false
  }
}

// Helper function to load UFD logo as base64 for downloads
async function loadUFDLogo(): Promise<string> {
  try {
    const response = await fetch('/UFD_V8.png')
    if (!response.ok) return ''
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve('')
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn('Failed to load UFD logo:', e)
    return ''
  }
}

// Download MATCHUP PREVIEW as PNG - Shows player comparison table
async function downloadMatchupPreview() {
  if (!selectedMatchup.value) return
  trackCardShare({ dashboard_type: 'matchup_preview' })

  isDownloadingPreview.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
    const leagueName = seasonInfo?.name || 'League'
    
    const WIDTH = 700
    
    // Team colors
    const team1Color = '#06B6D4'
    const team1ColorLight = '#22d3ee'
    const team2Color = '#F97316'
    const team2ColorLight = '#fb923c'
    
    // Create canvas-based avatar from initials (fallback)
    const createFallbackAvatar = (name: string, bgColor: string, borderColor: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100
      const ctx = canvas.getContext('2d')
      if (!ctx) return ''
      
      const gradient = ctx.createLinearGradient(0, 0, 100, 100)
      gradient.addColorStop(0, borderColor)
      gradient.addColorStop(1, bgColor)
      
      ctx.beginPath()
      ctx.arc(50, 50, 46, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 4
      ctx.stroke()
      
      const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
      ctx.fillStyle = 'white'
      ctx.font = 'bold 36px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(initials, 50, 52)
      
      return canvas.toDataURL('image/png')
    }
    
    // Load avatar through our proxy API or use fallback
    const loadAvatarAsBase64 = async (avatarUrl: string, name: string, bgColor: string, borderColor: string): Promise<string> => {
      if (!avatarUrl) return createFallbackAvatar(name, bgColor, borderColor)
      
      try {
        // Extract avatar ID from URL
        const avatarId = avatarUrl.split('/').pop()
        if (!avatarId) return createFallbackAvatar(name, bgColor, borderColor)
        
        // Use our proxy API
        const proxyUrl = `/api/avatar?id=${avatarId}`
        const response = await fetch(proxyUrl)
        
        if (!response.ok) {
          return createFallbackAvatar(name, bgColor, borderColor)
        }
        
        const blob = await response.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => resolve(createFallbackAvatar(name, bgColor, borderColor))
          reader.readAsDataURL(blob)
        })
      } catch (e) {
        return createFallbackAvatar(name, bgColor, borderColor)
      }
    }
    
    // Load UFD logo and both avatars
    const [ufdLogoBase64, team1AvatarBase64, team2AvatarBase64] = await Promise.all([
      loadUFDLogo(),
      loadAvatarAsBase64(selectedMatchup.value.team1_avatar, selectedMatchup.value.team1_name, team1Color, team1ColorLight),
      loadAvatarAsBase64(selectedMatchup.value.team2_avatar, selectedMatchup.value.team2_name, team2Color, team2ColorLight)
    ])
    
    const container = document.createElement('div')
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      width: ${WIDTH}px;
      background: linear-gradient(135deg, #1a1d2e 0%, #0d0f18 100%);
      color: #f7f7ff;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 24px;
      box-sizing: border-box;
    `
    
    // Build player rows HTML
    const playerRows = starterComparison.value.map(slot => `
      <tr style="border-bottom: 1px solid rgba(58, 61, 82, 0.5);">
        <td style="padding: 8px 4px; text-align: left;">
          <span style="display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; padding: 2px 6px; min-width: 28px; border-radius: 4px; background: ${getPositionColorForDownload(slot.position)}; color: white; text-align: center;">
            ${slot.position}
          </span>
          <span style="font-size: 12px; margin-left: 8px; color: #f7f7ff;">${slot.team1Player?.name || '—'}</span>
        </td>
        <td style="padding: 8px 4px; text-align: center; font-weight: bold; color: ${team1Color};">${slot.team1Player?.projected?.toFixed(1) || '—'}</td>
        <td style="padding: 8px 4px; text-align: center; color: #9ca3af;">${slot.team1Player?.avg10?.toFixed(1) || '—'}</td>
        <td style="padding: 8px 4px; text-align: center; font-size: 16px; font-weight: bold; color: ${slot.advantage === 'team1' ? team1Color : slot.advantage === 'team2' ? team2Color : '#4a5568'};">
          ${slot.advantage === 'team1' ? '◀' : slot.advantage === 'team2' ? '▶' : '•'}
        </td>
        <td style="padding: 8px 4px; text-align: center; color: #9ca3af;">${slot.team2Player?.avg10?.toFixed(1) || '—'}</td>
        <td style="padding: 8px 4px; text-align: center; font-weight: bold; color: ${team2Color};">${slot.team2Player?.projected?.toFixed(1) || '—'}</td>
        <td style="padding: 8px 4px; text-align: right;">
          <span style="font-size: 12px; color: #f7f7ff;">${slot.team2Player?.name || '—'}</span>
          <span style="display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; padding: 2px 6px; min-width: 28px; border-radius: 4px; background: ${getPositionColorForDownload(slot.position)}; color: white; margin-left: 8px; text-align: center;">
            ${slot.position}
          </span>
        </td>
      </tr>
    `).join('')
    
    // Calculate projected totals
    const team1Projected = getTeamProjectedTotal(selectedMatchup.value.team1_roster_id)
    const team2Projected = getTeamProjectedTotal(selectedMatchup.value.team2_roster_id)
    
    // Avatar HTML (always valid since we have fallback SVG)
    const team1AvatarHtml = `<img src="${team1AvatarBase64}" style="width: 48px; height: 48px; border-radius: 50%; border: 3px solid ${team1Color};" />`
    const team2AvatarHtml = `<img src="${team2AvatarBase64}" style="width: 48px; height: 48px; border-radius: 50%; border: 3px solid ${team2Color};" />`
    
    container.innerHTML = `
      <!-- Header with Logo and Title - Centered as Group -->
      <div style="display: flex; justify-content: center; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 20px;">
          ${ufdLogoBase64 ? `<img src="${ufdLogoBase64}" style="width: 70px; height: 70px; object-fit: contain;" />` : ''}
          <div>
            <div style="font-size: 32px; font-weight: 800; color: #f7f7ff;">Matchup Preview</div>
            <div style="font-size: 16px; color: #9ca3af;">${leagueName} &bull; Week ${selectedWeek.value}</div>
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div style="height: 1px; background: linear-gradient(to right, rgba(245, 196, 81, 0.5), rgba(245, 196, 81, 0.1)); margin-bottom: 20px;"></div>
      
      <!-- Team Headers -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 16px; background: rgba(38, 42, 58, 0.5); border-radius: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${team1AvatarHtml}
          <div>
            <div style="font-size: 18px; font-weight: bold; color: ${team1Color};">${selectedMatchup.value.team1_name}</div>
            <div style="font-size: 12px; color: #9ca3af;">${selectedMatchup.value.team1_stats.alltime_wins}-${selectedMatchup.value.team1_stats.alltime_losses} this season</div>
          </div>
        </div>
        <div style="font-size: 20px; color: #6b7280;">VS</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div>
            <div style="font-size: 18px; font-weight: bold; color: ${team2Color}; text-align: right;">${selectedMatchup.value.team2_name}</div>
            <div style="font-size: 12px; color: #9ca3af; text-align: right;">${selectedMatchup.value.team2_stats.alltime_wins}-${selectedMatchup.value.team2_stats.alltime_losses} this season</div>
          </div>
          ${team2AvatarHtml}
        </div>
      </div>
      
      <!-- Starter Comparison Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="font-size: 11px; color: #6b7280; border-bottom: 1px solid rgba(58, 61, 82, 0.8);">
            <th style="padding: 8px 4px; text-align: left; font-weight: 500;">Player</th>
            <th style="padding: 8px 4px; text-align: center; font-weight: 500;">Proj</th>
            <th style="padding: 8px 4px; text-align: center; font-weight: 500;">Avg</th>
            <th style="padding: 8px 4px; text-align: center; font-weight: 500;">ADV</th>
            <th style="padding: 8px 4px; text-align: center; font-weight: 500;">Avg</th>
            <th style="padding: 8px 4px; text-align: center; font-weight: 500;">Proj</th>
            <th style="padding: 8px 4px; text-align: right; font-weight: 500;">Player</th>
          </tr>
        </thead>
        <tbody>
          ${playerRows}
        </tbody>
      </table>
      
      <!-- Projected Totals -->
      <div style="display: flex; justify-content: space-around; align-items: center; padding: 20px; background: rgba(38, 42, 58, 0.5); border-radius: 12px; margin-bottom: 16px;">
        <div style="text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: ${team1Color};">${team1Projected.toFixed(1)}</div>
          <div style="font-size: 12px; color: #9ca3af;">Projected</div>
        </div>
        <div style="font-size: 18px; color: #6b7280;">vs</div>
        <div style="text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: ${team2Color};">${team2Projected.toFixed(1)}</div>
          <div style="font-size: 12px; color: #9ca3af;">Projected</div>
        </div>
      </div>
      
      <!-- Footer with Promo -->
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid rgba(58, 61, 82, 0.5);">
        <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
          ${ufdLogoBase64 ? `<img src="${ufdLogoBase64}" style="width: 48px; height: 48px; object-fit: contain;" />` : ''}
          <div>
            <div style="font-size: 14px; color: #9ca3af;">
              See a complete breakdown of every matchup in your league at
            </div>
            <div style="font-size: 18px; font-weight: bold; color: #facc15;">
              ultimatefantasydashboard.com/matchups
            </div>
          </div>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    
    const canvas = await html2canvas(container, {
      backgroundColor: '#0d0f18',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true
    })
    
    document.body.removeChild(container)
    
    // Share to clipboard
    const _shareBlobPromise = new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
        })
        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': _shareBlobPromise })])
          shareToast.value = 'success'
          setTimeout(() => { shareToast.value = 'idle' }, 3000)
        } else {
          const _shareUrl = URL.createObjectURL(await _shareBlobPromise)
          const link = document.createElement('a')
          link.download = `matchup-preview-week-${selectedWeek.value}-${selectedMatchup.value.team1_name.replace(/[^a-z0-9]/gi, '-')}-vs-${selectedMatchup.value.team2_name.replace(/[^a-z0-9]/gi, '-')}.png`.toLowerCase()
          link.href = _shareUrl
          link.click()
          URL.revokeObjectURL(_shareUrl)
        }
    
  } catch (error) {
    console.error('Failed to generate matchup preview image:', error)
    shareToast.value = 'error'
      setTimeout(() => { shareToast.value = 'idle' }, 4000)
  } finally {
    isDownloadingPreview.value = false
  }
}

// Helper function for position colors in download
function getPositionColorForDownload(position: string): string {
  const colors: Record<string, string> = {
    'QB': '#ef4444',
    'RB': '#22c55e',
    'WR': '#3b82f6',
    'TE': '#f97316',
    'K': '#8b5cf6',
    'DEF': '#6b7280',
    'FLEX': '#ec4899',
    'SUPER_FLEX': '#14b8a6',
    'REC_FLEX': '#06b6d4'
  }
  return colors[position] || '#6b7280'
}

// Download full matchup analysis as PNG (Win Probability + Scouting + Preview)
async function downloadFullMatchupAnalysis() {
  if (!selectedMatchup.value) return
  trackCardShare({ dashboard_type: 'matchup_full_analysis' })

  isDownloadingFullAnalysis.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
    const leagueName = seasonInfo?.name || 'League'
    
    // Mobile-optimized width - wider for better readability on phones
    const WIDTH = 720
    
    // SHARE COLORS: Team 1 = Cyan (#06B6D4), Team 2 = Orange (#F97316)
    const team1Color = '#06B6D4'
    const team1ColorLight = '#22d3ee'
    const team2Color = '#F97316'
    const team2ColorLight = '#fb923c'
    
    // Create canvas-based avatar from initials (fallback)
    const createFallbackAvatar = (name: string, bgColor: string, borderColor: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100
      const ctx = canvas.getContext('2d')
      if (!ctx) return ''
      
      const gradient = ctx.createLinearGradient(0, 0, 100, 100)
      gradient.addColorStop(0, borderColor)
      gradient.addColorStop(1, bgColor)
      
      ctx.beginPath()
      ctx.arc(50, 50, 46, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 4
      ctx.stroke()
      
      const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
      ctx.fillStyle = 'white'
      ctx.font = 'bold 36px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(initials, 50, 52)
      
      return canvas.toDataURL('image/png')
    }
    
    // Load avatar through our proxy API or use fallback
    const loadAvatarAsBase64 = async (avatarUrl: string, name: string, bgColor: string, borderColor: string): Promise<string> => {
      if (!avatarUrl) return createFallbackAvatar(name, bgColor, borderColor)
      
      try {
        // Extract avatar ID from URL (e.g., https://sleepercdn.com/avatars/thumbs/abc123 -> abc123)
        const avatarId = avatarUrl.split('/').pop()
        if (!avatarId) return createFallbackAvatar(name, bgColor, borderColor)
        
        // Use our proxy API
        const proxyUrl = `/api/avatar?id=${avatarId}`
        const response = await fetch(proxyUrl)
        
        if (!response.ok) {
          console.warn('Proxy fetch failed, using fallback')
          return createFallbackAvatar(name, bgColor, borderColor)
        }
        
        const blob = await response.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => resolve(createFallbackAvatar(name, bgColor, borderColor))
          reader.readAsDataURL(blob)
        })
      } catch (e) {
        console.warn('Failed to load avatar, using fallback:', e)
        return createFallbackAvatar(name, bgColor, borderColor)
      }
    }
    
    // Load UFD logo and both avatars
    const [ufdLogoBase64, team1AvatarBase64, team2AvatarBase64] = await Promise.all([
      loadUFDLogo(),
      loadAvatarAsBase64(selectedMatchup.value.team1_avatar, selectedMatchup.value.team1_name, team1Color, team1ColorLight),
      loadAvatarAsBase64(selectedMatchup.value.team2_avatar, selectedMatchup.value.team2_name, team2Color, team2ColorLight)
    ])
    
    const container = document.createElement('div')
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      width: ${WIDTH}px;
      background: linear-gradient(145deg, #1a1d2e 0%, #0d0f18 100%);
      color: #f7f7ff;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 40px;
      box-sizing: border-box;
    `
    
    // Calculate values
    const team1Projected = getTeamProjectedTotal(selectedMatchup.value.team1_roster_id)
    const team2Projected = getTeamProjectedTotal(selectedMatchup.value.team2_roster_id)
    const winProb1 = liveWinProbability.value.team1
    const winProb2 = liveWinProbability.value.team2
    
    const team1Name = selectedMatchup.value.team1_name
    const team2Name = selectedMatchup.value.team2_name
    
    // Check if user's team is involved
    const isTeam1MyTeam = isMyTeam(selectedMatchup.value.team1_roster_id)
    const isTeam2MyTeam = isMyTeam(selectedMatchup.value.team2_roster_id)
    
    // Build SVG chart for win probability progression
    const baseProb = matchupAnalysis.value?.team1WinProb || 50
    const currentProb = liveWinProbability.value.team1
    const { data: team1ChartData, completedWindows } = generateProgressionData(baseProb, currentProb)
    const team2ChartData = team1ChartData.map(v => v !== null ? 100 - v : null)
    
    const chartWidth = 640
    const chartHeight = 180
    const padding = { top: 40, right: 20, bottom: 35, left: 55 }
    const plotWidth = chartWidth - padding.left - padding.right
    const plotHeight = chartHeight - padding.top - padding.bottom
    
    const getX = (i: number) => padding.left + (i / 5) * plotWidth
    const getY = (val: number) => padding.top + plotHeight - (val / 100) * plotHeight
    
    // Build path for team 1
    let team1Path = ''
    let team1Points = ''
    team1ChartData.forEach((val, i) => {
      if (val !== null) {
        const x = getX(i)
        const y = getY(val)
        if (team1Path === '') {
          team1Path = `M ${x} ${y}`
        } else {
          team1Path += ` L ${x} ${y}`
        }
        team1Points += `<circle cx="${x}" cy="${y}" r="8" fill="${team1Color}"/>`
      }
    })
    
    // Build path for team 2
    let team2Path = ''
    let team2Points = ''
    team2ChartData.forEach((val, i) => {
      if (val !== null) {
        const x = getX(i)
        const y = getY(val)
        if (team2Path === '') {
          team2Path = `M ${x} ${y}`
        } else {
          team2Path += ` L ${x} ${y}`
        }
        team2Points += `<circle cx="${x}" cy="${y}" r="8" fill="${team2Color}"/>`
      }
    })
    
    const chartLabels = ['Pre', 'TNF', 'Sun 1', 'Sun 4', 'SNF', 'MNF']
    const xLabels = chartLabels.map((label, i) => {
      const x = getX(i)
      const isCompleted = i < completedWindows
      return `<text x="${x}" y="${chartHeight - 8}" text-anchor="middle" font-size="14" font-weight="600" fill="${isCompleted ? '#9CA3AF' : '#4B5563'}">${label}</text>`
    }).join('')
    
    const yLabels = [0, 50, 100].map(val => {
      const y = getY(val)
      return `<text x="${padding.left - 12}" y="${y + 5}" text-anchor="end" font-size="14" font-weight="600" fill="#9CA3AF">${val}%</text>`
    }).join('')
    
    const gridLines = [0, 25, 50, 75, 100].map(val => {
      const y = getY(val)
      return `<line x1="${padding.left}" y1="${y}" x2="${chartWidth - padding.right}" y2="${y}" stroke="#374151" stroke-dasharray="4"/>`
    }).join('')
    
    const chartSvg = `
      <svg width="${chartWidth}" height="${chartHeight}" xmlns="http://www.w3.org/2000/svg">
        ${gridLines}
        <path d="${team1Path}" fill="none" stroke="${team1Color}" stroke-width="4"/>
        <path d="${team2Path}" fill="none" stroke="${team2Color}" stroke-width="4"/>
        ${team1Points}
        ${team2Points}
        ${xLabels}
        ${yLabels}
        <!-- Legend - Centered -->
        <circle cx="${chartWidth / 2 - 120}" cy="16" r="8" fill="${team1Color}"/>
        <text x="${chartWidth / 2 - 102}" y="21" font-size="12" font-weight="700" fill="#d1d5db">${team1Name}</text>
        <circle cx="${chartWidth / 2 + 60}" cy="16" r="8" fill="${team2Color}"/>
        <text x="${chartWidth / 2 + 78}" y="21" font-size="12" font-weight="700" fill="#d1d5db">${team2Name}</text>
      </svg>
    `
    
    // Build player rows with team colors and live/final status
    const playerRows = starterComparison.value.map(slot => {
      const advColor = slot.advantage === 'team1' ? team1ColorLight : slot.advantage === 'team2' ? team2ColorLight : '#4B5563'
      const advSymbol = slot.advantage === 'team1' ? '◀' : slot.advantage === 'team2' ? '▶' : '•'
      
      // Determine display for team 1
      const t1Status = slot.team1Player?.gameStatus || 'upcoming'
      const t1Color = t1Status === 'final' ? '#ffffff' : t1Status === 'live' ? '#9ca3af' : team1ColorLight
      const t1Icon = t1Status === 'final' ? '🔒 ' : t1Status === 'live' ? '● ' : ''
      const t1Pts = slot.team1Player?.displayPoints?.toFixed(1) || '—'
      const t1Label = t1Status === 'upcoming' ? 'proj' : t1Status === 'live' ? 'live' : 'final'
      
      // Determine display for team 2
      const t2Status = slot.team2Player?.gameStatus || 'upcoming'
      const t2Color = t2Status === 'final' ? '#ffffff' : t2Status === 'live' ? '#9ca3af' : team2ColorLight
      const t2Icon = t2Status === 'final' ? '🔒 ' : t2Status === 'live' ? '● ' : ''
      const t2Pts = slot.team2Player?.displayPoints?.toFixed(1) || '—'
      const t2Label = t2Status === 'upcoming' ? 'proj' : t2Status === 'live' ? 'live' : 'final'
      
      return `
        <div style="display: flex; align-items: center; padding: 14px 0; border-bottom: 1px solid rgba(58, 61, 82, 0.5);">
          <div style="display: flex; align-items: center; justify-content: center; width: 56px; height: 36px; font-size: 16px; font-weight: bold; border-radius: 10px; background: ${getPositionColorForDownload(slot.position)}; color: white; flex-shrink: 0;">
            ${slot.position}
          </div>
          <div style="flex: 1; display: flex; align-items: center; margin-left: 14px;">
            <div style="flex: 1; text-align: left;">
              <div style="font-size: 18px; font-weight: 700; color: #f7f7ff; margin-bottom: 4px;">${slot.team1Player?.name || '—'}</div>
              <div style="font-size: 16px; color: ${t1Color}; font-weight: 800;">${t1Icon}${t1Pts} <span style="color: #6b7280; font-weight: 500; font-size: 13px;">${t1Label}</span></div>
            </div>
            <div style="width: 50px; text-align: center; font-size: 28px; font-weight: bold; color: ${advColor};">
              ${advSymbol}
            </div>
            <div style="flex: 1; text-align: right;">
              <div style="font-size: 18px; font-weight: 700; color: #f7f7ff; margin-bottom: 4px;">${slot.team2Player?.name || '—'}</div>
              <div style="font-size: 16px; color: ${t2Color}; font-weight: 800;">${t2Icon}${t2Pts} <span style="color: #6b7280; font-weight: 500; font-size: 13px;">${t2Label}</span></div>
            </div>
          </div>
        </div>
      `
    }).join('')
    
    // Build scouting HTML - HORIZONTAL layout with strengths/weaknesses on left, form on right
    const buildScoutingHtml = (teamName: string, report: any, color: string, borderColor: string, bgRgba: string) => {
      const strengths = report.strengths.slice(0, 2).map((s: string) => `<div style="font-size: 14px; color: #d1d5db; margin-bottom: 6px; line-height: 1.4; letter-spacing: 0.3px; word-spacing: 2px;">✓ ${s}</div>`).join('')
      const weaknesses = report.weaknesses.slice(0, 2).map((w: string) => `<div style="font-size: 14px; color: #d1d5db; margin-bottom: 6px; line-height: 1.4; letter-spacing: 0.3px; word-spacing: 2px;">✗ ${w}</div>`).join('')
      const form = report.recentForm.map((r: string) => `
        <span style="display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 8px; font-size: 18px; font-weight: bold; margin-right: 6px; background: ${r === 'W' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}; color: ${r === 'W' ? '#22c55e' : '#ef4444'};">${r}</span>
      `).join('')
      
      return `
        <div style="padding: 18px; background: ${bgRgba}; border: 2px solid ${borderColor}; border-radius: 16px; margin-bottom: 12px;">
          <div style="font-weight: 800; color: ${color}; margin-bottom: 14px; font-size: 20px;">${teamName}</div>
          <div style="display: flex; gap: 20px;">
            <!-- Strengths/Weaknesses on left -->
            <div style="flex: 1; min-width: 0;">
              ${strengths ? `<div style="margin-bottom: 10px;"><div style="font-size: 11px; font-weight: 800; color: #22c55e; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">Strengths</div>${strengths}</div>` : ''}
              ${weaknesses ? `<div><div style="font-size: 11px; font-weight: 800; color: #ef4444; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">Weaknesses</div>${weaknesses}</div>` : ''}
            </div>
            <!-- Recent Form on right -->
            <div style="flex-shrink: 0;">
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Form</div>
              <div style="display: flex; align-items: center;">${form}</div>
            </div>
          </div>
        </div>
      `
    }
    
    container.innerHTML = `
      <!-- Header with Logo and Title - Centered as Group -->
      <div style="display: flex; justify-content: center; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 20px;">
          ${ufdLogoBase64 ? `<img src="${ufdLogoBase64}" style="width: 70px; height: 70px; object-fit: contain;" />` : ''}
          <div>
            <div style="font-size: 32px; font-weight: 800; color: #f7f7ff;">Win Probability</div>
            <div style="font-size: 16px; color: #9ca3af;">${leagueName} &bull; Week ${selectedWeek.value}</div>
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div style="height: 1px; background: linear-gradient(to right, rgba(245, 196, 81, 0.5), rgba(245, 196, 81, 0.1)); margin-bottom: 24px;"></div>
      
      <!-- Win Probability Section -->
      <div style="background: rgba(38, 42, 58, 0.6); border-radius: 20px; padding: 28px; margin-bottom: 20px; border: 2px solid rgba(100, 116, 139, 0.2);">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 28px;">🎲</span>
          <span style="font-size: 22px; font-weight: 800; color: #f7f7ff; margin-left: 10px; vertical-align: middle;">Win Probability</span>
        </div>
        
        <!-- Team Probabilities - Side by Side -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div style="text-align: center; flex: 1;">
            <img src="${team1AvatarBase64}" style="width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 12px; display: block; border: 4px solid ${team1ColorLight}; object-fit: cover;" />
            <div style="font-size: 18px; font-weight: 800; color: ${team1ColorLight}; margin-bottom: 6px;">${selectedMatchup.value.team1_name}</div>
            <div style="font-size: 48px; font-weight: 900; color: ${team1ColorLight}; line-height: 1;">${winProb1.toFixed(0)}%</div>
            <div style="font-size: 15px; color: #9ca3af; margin-top: 6px;">Proj: ${team1Projected.toFixed(1)}</div>
          </div>
          <div style="font-size: 32px; color: #4a5568; padding: 0 12px; font-weight: 900;">VS</div>
          <div style="text-align: center; flex: 1;">
            <img src="${team2AvatarBase64}" style="width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 12px; display: block; border: 4px solid ${team2ColorLight}; object-fit: cover;" />
            <div style="font-size: 18px; font-weight: 800; color: ${team2ColorLight}; margin-bottom: 6px;">${selectedMatchup.value.team2_name}</div>
            <div style="font-size: 48px; font-weight: 900; color: ${team2ColorLight}; line-height: 1;">${winProb2.toFixed(0)}%</div>
            <div style="font-size: 15px; color: #9ca3af; margin-top: 6px;">Proj: ${team2Projected.toFixed(1)}</div>
          </div>
        </div>
        
        <!-- Probability Bar with Gradient Fade -->
        <div style="height: 44px; background: linear-gradient(to right, ${team1Color} 0%, ${team1Color} ${Math.max(0, winProb1 - 8)}%, ${team2Color} ${Math.min(100, winProb1 + 8)}%, ${team2Color} 100%); border-radius: 22px; overflow: hidden; position: relative; margin-bottom: 20px; border: 2px solid #374151;">
          <div style="position: absolute; left: 0; top: 0; height: 100%; display: flex; align-items: center; padding-left: 16px;">
            <span style="color: ${isTeam1MyTeam ? '#1a1d2e' : 'white'}; font-weight: 800; font-size: 16px; text-shadow: 0 1px 3px rgba(0,0,0,0.4);">${team1Name}</span>
          </div>
          <div style="position: absolute; right: 0; top: 0; height: 100%; display: flex; align-items: center; padding-right: 16px;">
            <span style="color: ${isTeam2MyTeam ? '#1a1d2e' : 'white'}; font-weight: 800; font-size: 16px; text-shadow: 0 1px 3px rgba(0,0,0,0.4);">${team2Name}</span>
          </div>
        </div>
        
        <!-- Win Probability Chart -->
        <div style="background: rgba(13, 15, 24, 0.5); border-radius: 12px; padding: 10px;">
          ${chartSvg}
        </div>
      </div>
      
      <!-- Scouting Reports Section -->
      <div style="background: rgba(38, 42, 58, 0.6); border-radius: 20px; padding: 28px; margin-bottom: 20px; border: 2px solid rgba(100, 116, 139, 0.2);">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 28px;">🔍</span>
          <span style="font-size: 22px; font-weight: 800; color: #f7f7ff; margin-left: 10px; vertical-align: middle;">Scouting Reports</span>
        </div>
        ${buildScoutingHtml(selectedMatchup.value.team1_name, scoutingReports.value.team1, team1ColorLight, 'rgba(6, 182, 212, 0.3)', 'rgba(6, 182, 212, 0.08)')}
        ${buildScoutingHtml(selectedMatchup.value.team2_name, scoutingReports.value.team2, team2ColorLight, 'rgba(249, 115, 22, 0.3)', 'rgba(249, 115, 22, 0.08)')}
      </div>
      
      <!-- Footer with Promo -->
      <div style="text-align: center; padding-top: 24px; border-top: 1px solid rgba(58, 61, 82, 0.5); margin-top: 20px;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
          ${ufdLogoBase64 ? `<img src="${ufdLogoBase64}" style="width: 48px; height: 48px; object-fit: contain;" />` : ''}
          <div>
            <div style="font-size: 14px; color: #9ca3af;">
              See a complete breakdown of every matchup in your league at
            </div>
            <div style="font-size: 18px; font-weight: bold; color: #facc15;">
              ultimatefantasydashboard.com/matchups
            </div>
          </div>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    
    const canvas = await html2canvas(container, {
      backgroundColor: '#0d0f18',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true
    })
    
    document.body.removeChild(container)
    
    // Share to clipboard
    const _shareBlobPromise = new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
        })
        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': _shareBlobPromise })])
          shareToast.value = 'success'
          setTimeout(() => { shareToast.value = 'idle' }, 3000)
        } else {
          const _shareUrl = URL.createObjectURL(await _shareBlobPromise)
          const link = document.createElement('a')
          link.download = `matchup-week-${selectedWeek.value}-${selectedMatchup.value.team1_name.replace(/[^a-z0-9]/gi, '-')}-vs-${selectedMatchup.value.team2_name.replace(/[^a-z0-9]/gi, '-')}.png`.toLowerCase()
          link.href = _shareUrl
          link.click()
          URL.revokeObjectURL(_shareUrl)
        }
    
  } catch (error) {
    console.error('Failed to generate matchup analysis image:', error)
    shareToast.value = 'error'
      setTimeout(() => { shareToast.value = 'idle' }, 4000)
  } finally {
    isDownloadingFullAnalysis.value = false
  }
}

// Download STAT COMPARISON as PNG - Shows Statistical Comparison + Lifetime Series
async function downloadStatComparison() {
  if (!selectedMatchup.value) return
  trackCardShare({ dashboard_type: 'matchup_stat_comparison' })

  isDownloadingComparison.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
    const leagueName = seasonInfo?.name || 'League'
    
    const WIDTH = 700
    
    // Team colors
    const team1Color = '#06B6D4'
    const team1ColorLight = '#22d3ee'
    const team2Color = '#F97316'
    const team2ColorLight = '#fb923c'
    
    // Create canvas-based avatar from initials (fallback)
    const createFallbackAvatar = (name: string, bgColor: string, borderColor: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100
      const ctx = canvas.getContext('2d')
      if (!ctx) return ''
      
      const gradient = ctx.createLinearGradient(0, 0, 100, 100)
      gradient.addColorStop(0, borderColor)
      gradient.addColorStop(1, bgColor)
      
      ctx.beginPath()
      ctx.arc(50, 50, 46, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 4
      ctx.stroke()
      
      const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
      ctx.fillStyle = 'white'
      ctx.font = 'bold 36px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(initials, 50, 52)
      
      return canvas.toDataURL('image/png')
    }
    
    // Load avatar through our proxy API or use fallback
    const loadAvatarAsBase64 = async (avatarUrl: string, name: string, bgColor: string, borderColor: string): Promise<string> => {
      if (!avatarUrl) return createFallbackAvatar(name, bgColor, borderColor)
      
      try {
        const avatarId = avatarUrl.split('/').pop()
        if (!avatarId) return createFallbackAvatar(name, bgColor, borderColor)
        
        const proxyUrl = `/api/avatar?id=${avatarId}`
        const response = await fetch(proxyUrl)
        
        if (!response.ok) {
          return createFallbackAvatar(name, bgColor, borderColor)
        }
        
        const blob = await response.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => resolve(createFallbackAvatar(name, bgColor, borderColor))
          reader.readAsDataURL(blob)
        })
      } catch (e) {
        return createFallbackAvatar(name, bgColor, borderColor)
      }
    }
    
    // Load UFD logo and both avatars
    const [ufdLogoBase64, team1AvatarBase64, team2AvatarBase64] = await Promise.all([
      loadUFDLogo(),
      loadAvatarAsBase64(selectedMatchup.value.team1_avatar, selectedMatchup.value.team1_name, team1Color, team1ColorLight),
      loadAvatarAsBase64(selectedMatchup.value.team2_avatar, selectedMatchup.value.team2_name, team2Color, team2ColorLight)
    ])
    
    const container = document.createElement('div')
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      width: ${WIDTH}px;
      background: linear-gradient(135deg, #1a1d2e 0%, #0d0f18 100%);
      color: #f7f7ff;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 28px;
      box-sizing: border-box;
    `
    
    // Build stat comparison rows
    const statRows = comparisonStats.value.map(stat => {
      const team1Better = stat.team1Better
      const team2Better = stat.team2Better
      return `
        <tr style="border-bottom: 1px solid rgba(58, 61, 82, 0.5);">
          <td style="padding: 10px 8px; text-align: left; font-weight: 500; color: #d1d5db;">${stat.label}</td>
          <td style="padding: 10px 8px; text-align: center; ${team1Better ? `color: ${team1ColorLight}; font-weight: bold;` : 'color: #9ca3af;'}">
            ${stat.team1Value}
          </td>
          <td style="padding: 10px 8px; text-align: center; font-size: 12px; font-weight: 600; ${team1Better ? `color: ${team1ColorLight};` : team2Better ? `color: ${team2ColorLight};` : 'color: #6b7280;'}">
            ${team1Better ? '◀' : team2Better ? '▶' : '•'}
          </td>
          <td style="padding: 10px 8px; text-align: center; ${team2Better ? `color: ${team2ColorLight}; font-weight: bold;` : 'color: #9ca3af;'}">
            ${stat.team2Value}
          </td>
        </tr>
      `
    }).join('')
    
    // Build recent matchups history
    const recentGamesHtml = historicalMatchups.value.games.slice(0, 5).map((game: any) => {
      return `
        <div style="padding: 12px; background: rgba(38, 42, 58, 0.4); border-radius: 8px; border: 1px solid rgba(58, 61, 82, 0.5); margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="font-size: 11px; color: #9ca3af;">
              <span style="font-weight: 600;">${game.season} Season</span>
              <span style="margin: 0 6px;">•</span>
              <span>Week ${game.week}</span>
            </div>
            <div style="font-size: 11px; color: #6b7280;">
              Margin: ${game.margin.toFixed(1)}
            </div>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <div style="font-size: 13px; ${game.team1Won ? `color: #4ade80; font-weight: bold;` : 'color: #9ca3af;'}">
              ${selectedMatchup.value.team1_name}: ${game.team1Score.toFixed(1)}
            </div>
            <div style="font-size: 13px; ${game.team2Won ? `color: #4ade80; font-weight: bold;` : 'color: #9ca3af;'}">
              ${selectedMatchup.value.team2_name}: ${game.team2Score.toFixed(1)}
            </div>
          </div>
        </div>
      `
    }).join('')
    
    // Determine who leads the series
    const team1Leads = historicalMatchups.value.team1Wins > historicalMatchups.value.team2Wins
    const team2Leads = historicalMatchups.value.team2Wins > historicalMatchups.value.team1Wins
    
    container.innerHTML = `
      <!-- Header with Logo and Title - Centered as Group -->
      <div style="display: flex; justify-content: center; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 20px;">
          ${ufdLogoBase64 ? `<img src="${ufdLogoBase64}" style="width: 70px; height: 70px; object-fit: contain;" />` : ''}
          <div>
            <div style="font-size: 32px; font-weight: 800; color: #f7f7ff;">Matchup Comparison</div>
            <div style="font-size: 16px; color: #9ca3af;">${leagueName} &bull; Week ${selectedWeek.value}</div>
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div style="height: 1px; background: linear-gradient(to right, rgba(245, 196, 81, 0.5), rgba(245, 196, 81, 0.1)); margin-bottom: 20px;"></div>
      
      <!-- Team Headers -->
      <div style="display: flex; justify-content: center; align-items: center; gap: 24px; margin-bottom: 20px;">
        <div style="text-align: center;">
          <img src="${team1AvatarBase64}" style="width: 56px; height: 56px; border-radius: 50%; border: 3px solid ${team1ColorLight}; margin-bottom: 6px;" />
          <div style="font-size: 13px; font-weight: 700; color: ${team1ColorLight};">${selectedMatchup.value.team1_name}</div>
        </div>
        <div style="font-size: 20px; color: #4a5568; font-weight: 900;">VS</div>
        <div style="text-align: center;">
          <img src="${team2AvatarBase64}" style="width: 56px; height: 56px; border-radius: 50%; border: 3px solid ${team2ColorLight}; margin-bottom: 6px;" />
          <div style="font-size: 13px; font-weight: 700; color: ${team2ColorLight};">${selectedMatchup.value.team2_name}</div>
        </div>
      </div>
      
      <!-- Statistical Comparison Section -->
      <div style="background: rgba(38, 42, 58, 0.6); border-radius: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid rgba(100, 116, 139, 0.2);">
        <div style="text-align: center; margin-bottom: 16px;">
          <span style="font-size: 20px;">📊</span>
          <span style="font-size: 16px; font-weight: 700; color: #f7f7ff; margin-left: 8px; vertical-align: middle;">Statistical Comparison (${selectedSeason.value})</span>
        </div>
        
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="font-size: 11px; color: #6b7280; border-bottom: 2px solid rgba(58, 61, 82, 0.8);">
              <th style="padding: 10px 8px; text-align: left; font-weight: 600;">Statistic</th>
              <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: ${team1ColorLight};">${selectedMatchup.value.team1_name}</th>
              <th style="padding: 10px 8px; text-align: center; font-weight: 600;">ADV</th>
              <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: ${team2ColorLight};">${selectedMatchup.value.team2_name}</th>
            </tr>
          </thead>
          <tbody>
            ${statRows}
          </tbody>
        </table>
      </div>
      
      <!-- Lifetime Series Section -->
      <div style="background: rgba(38, 42, 58, 0.6); border-radius: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid rgba(100, 116, 139, 0.2);">
        <div style="text-align: center; margin-bottom: 16px;">
          <span style="font-size: 20px;">📜</span>
          <span style="font-size: 16px; font-weight: 700; color: #f7f7ff; margin-left: 8px; vertical-align: middle;">Lifetime Series</span>
        </div>
        
        <!-- Series Record -->
        <div style="text-align: center; padding: 16px; background: rgba(38, 42, 58, 0.4); border-radius: 12px; margin-bottom: 16px;">
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 8px;">All-Time Record</div>
          <div style="display: flex; justify-content: center; align-items: center; gap: 20px;">
            <div style="text-align: center;">
              <div style="font-size: 36px; font-weight: 900; ${team1Leads ? 'color: #4ade80;' : 'color: #9ca3af;'}">${historicalMatchups.value.team1Wins}</div>
              <div style="font-size: 11px; color: #6b7280;">${selectedMatchup.value.team1_name}</div>
            </div>
            <div style="font-size: 24px; color: #4a5568; font-weight: 900;">-</div>
            <div style="text-align: center;">
              <div style="font-size: 36px; font-weight: 900; ${team2Leads ? 'color: #4ade80;' : 'color: #9ca3af;'}">${historicalMatchups.value.team2Wins}</div>
              <div style="font-size: 11px; color: #6b7280;">${selectedMatchup.value.team2_name}</div>
            </div>
          </div>
          ${historicalMatchups.value.ties > 0 ? `<div style="font-size: 11px; color: #6b7280; margin-top: 8px;">${historicalMatchups.value.ties} tie(s)</div>` : ''}
        </div>
        
        <!-- Recent History -->
        ${historicalMatchups.value.games.length > 0 ? `
          <div style="font-size: 12px; font-weight: 600; color: #d1d5db; margin-bottom: 10px;">Recent History</div>
          ${recentGamesHtml}
        ` : `
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 13px;">
            No previous matchups between these teams
          </div>
        `}
      </div>
      
      <!-- Footer with Promo -->
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid rgba(58, 61, 82, 0.5);">
        <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
          ${ufdLogoBase64 ? `<img src="${ufdLogoBase64}" style="width: 48px; height: 48px; object-fit: contain;" />` : ''}
          <div>
            <div style="font-size: 14px; color: #9ca3af;">
              See a complete breakdown of every matchup in your league at
            </div>
            <div style="font-size: 18px; font-weight: bold; color: #facc15;">
              ultimatefantasydashboard.com/matchups
            </div>
          </div>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    
    const canvas = await html2canvas(container, {
      backgroundColor: '#0d0f18',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true
    })
    
    document.body.removeChild(container)
    
    // Share to clipboard
    const _shareBlobPromise = new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
        })
        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': _shareBlobPromise })])
          shareToast.value = 'success'
          setTimeout(() => { shareToast.value = 'idle' }, 3000)
        } else {
          const _shareUrl = URL.createObjectURL(await _shareBlobPromise)
          const link = document.createElement('a')
          link.download = `matchup-comparison-${selectedMatchup.value.team1_name.replace(/[^a-z0-9]/gi, '-')}-vs-${selectedMatchup.value.team2_name.replace(/[^a-z0-9]/gi, '-')}.png`.toLowerCase()
          link.href = _shareUrl
          link.click()
          URL.revokeObjectURL(_shareUrl)
        }
    
  } catch (error) {
    console.error('Failed to generate stat comparison image:', error)
    shareToast.value = 'error'
      setTimeout(() => { shareToast.value = 'idle' }, 4000)
  } finally {
    isDownloadingComparison.value = false
  }
}

// Helper to describe a streak
function getStreakDescription(recentForm: string[]): string {
  if (recentForm.length === 0) return 'no recent games'
  
  const wins = recentForm.filter(r => r === 'W').length
  const losses = recentForm.filter(r => r === 'L').length
  
  // Check for streaks
  if (recentForm.every(r => r === 'W')) return `on a ${recentForm.length}-game win streak`
  if (recentForm.every(r => r === 'L')) return `on a ${recentForm.length}-game losing streak`
  if (recentForm[0] === 'W' && recentForm[1] === 'W') return `won 2 straight`
  if (recentForm[0] === 'L' && recentForm[1] === 'L') return `lost 2 straight`
  if (recentForm[0] === 'W') return `coming off a win`
  return `coming off a loss`
}

// Calculate average points over last N weeks
function calculateRecentAverage(rosterId: number, weeks: number): number {
  const matchupsByWeek = leagueStore.historicalMatchups.get(selectedSeason.value) || new Map()
  const selectedWeekNum = parseInt(selectedWeek.value)
  
  const recentScores: number[] = []
  
  // Get scores from recent weeks (excluding current week)
  for (let week = selectedWeekNum - 1; week >= 1 && recentScores.length < weeks; week--) {
    const weekMatchups = matchupsByWeek.get(week)
    if (!weekMatchups) continue
    
    const matchup = weekMatchups.find((m: any) => m.roster_id === rosterId)
    if (matchup && matchup.points > 0) {
      recentScores.push(matchup.points)
    }
  }
  
  if (recentScores.length === 0) return 0
  return recentScores.reduce((a, b) => a + b, 0) / recentScores.length
}

// Get playoff matchup history between two teams
function getPlayoffMatchupHistory(roster1Id: number, roster2Id: number): { team1Wins: number, team2Wins: number, totalGames: number } {
  let team1Wins = 0
  let team2Wins = 0
  
  // Search through all seasons for playoff matchups
  leagueStore.historicalSeasons.forEach(seasonInfo => {
    const matchups = leagueStore.historicalMatchups.get(seasonInfo.season) || new Map()
    const rosters = leagueStore.historicalRosters.get(seasonInfo.season) || []
    
    const playoffStart = seasonInfo.settings?.playoff_week_start || 15
    
    // Find the roster IDs for these users in this season
    const roster1 = rosters.find(r => r.roster_id === roster1Id)
    const roster2 = rosters.find(r => r.roster_id === roster2Id)
    
    if (!roster1 || !roster2) return
    
    // Check playoff weeks
    matchups.forEach((weekMatchups, week) => {
      if (week < playoffStart) return // Not a playoff week
      
      const match1 = weekMatchups.find((m: any) => m.roster_id === roster1.roster_id)
      const match2 = weekMatchups.find((m: any) => m.roster_id === roster2.roster_id)
      
      if (!match1 || !match2) return
      if (match1.matchup_id !== match2.matchup_id) return // Not playing each other
      
      const score1 = match1.points || 0
      const score2 = match2.points || 0
      
      if (score1 === 0 && score2 === 0) return // Game not played
      
      if (score1 > score2) team1Wins++
      else if (score2 > score1) team2Wins++
    })
  })
  
  return { team1Wins, team2Wins, totalGames: team1Wins + team2Wins }
}

// Get team's total projected points - LIVE: actual points scored + projections for remaining players
let teamProjectionDebugLogged = new Set<number>()
function getTeamProjectedTotal(rosterId: number): number {
  const teamMatchup = matchupsData.value.find(m => m.roster_id === rosterId)
  if (!teamMatchup?.starters) {
    return 0
  }
  
  let total = 0
  let actualCount = 0
  let projectedCount = 0
  
  teamMatchup.starters.forEach(playerId => {
    if (!playerId || playerId === '0') return
    
    // Check if player has actual points recorded (game started/finished)
    const actualPoints = teamMatchup.players_points?.[playerId]
    const hasActualPoints = actualPoints !== undefined && actualPoints !== null
    
    if (hasActualPoints) {
      // Use actual points - player's game has started or finished
      total += actualPoints
      actualCount++
    } else {
      // Use projection - player hasn't played yet
      const playerProj = calculatePlayerProjectedPoints(playerId)
      total += playerProj
      projectedCount++
    }
  })
  
  // Log once per team
  if (!teamProjectionDebugLogged.has(rosterId)) {
    teamProjectionDebugLogged.add(rosterId)
    const sleeperTotal = teamMatchup.points || 0
    console.log(`📊 Team ${rosterId}: projected total=${total.toFixed(1)}, sleeper points=${sleeperTotal.toFixed(1)}, players with actual=${actualCount}, players with projection=${projectedCount}`)
  }
  
  return total
}

// Get live team projection: actual points for completed players + projections for remaining
function getLiveTeamProjection(rosterId: number): { total: number, actual: number, projected: number, debugInfo: any } {
  const teamMatchup = matchupsData.value.find(m => m.roster_id === rosterId)
  if (!teamMatchup?.starters) return { total: 0, actual: 0, projected: 0, debugInfo: { error: 'no matchup data' } }
  
  let actualTotal = 0
  let projectedTotal = 0
  const playerBreakdown: any[] = []
  
  // First, get the official team total from Sleeper (this is the most accurate)
  const sleeperTotal = teamMatchup.points || 0
  
  teamMatchup.starters.forEach(playerId => {
    if (!playerId || playerId === '0') {
      playerBreakdown.push({ playerId, status: 'empty slot' })
      return
    }
    
    // Check if player has actual points recorded
    const actualPoints = teamMatchup.players_points?.[playerId]
    const hasActualPoints = actualPoints !== undefined && actualPoints !== null
    const projectedPoints = calculatePlayerProjectedPoints(playerId)
    
    if (hasActualPoints) {
      actualTotal += actualPoints
      playerBreakdown.push({ 
        playerId, 
        actual: actualPoints, 
        projected: projectedPoints,
        status: 'has actual',
        usedValue: actualPoints
      })
    } else {
      projectedTotal += projectedPoints
      playerBreakdown.push({ 
        playerId, 
        actual: null, 
        projected: projectedPoints,
        status: 'using projection',
        usedValue: projectedPoints
      })
    }
  })
  
  return {
    total: actualTotal + projectedTotal,
    actual: actualTotal,
    projected: projectedTotal,
    debugInfo: {
      rosterId,
      sleeperTotal,
      calculatedTotal: actualTotal + projectedTotal,
      startersCount: teamMatchup.starters.length,
      playersWithActual: playerBreakdown.filter(p => p.status === 'has actual').length,
      playersWithProjection: playerBreakdown.filter(p => p.status === 'using projection').length
    }
  }
}

// Get live projection for matchup cards (to be used in pairedMatchups)
function getMatchupLiveProjection(rosterId: number): number {
  const liveData = getLiveTeamProjection(rosterId)
  return liveData.total
}

// Get live score for matchup cards - uses Sleeper's actual matchup points if available
function getLiveScore(rosterId: number, fallbackPoints: number): number {
  const teamMatchup = matchupsData.value.find(m => m.roster_id === rosterId)
  if (!teamMatchup) return fallbackPoints
  
  // Sleeper's points field is always the most up-to-date actual score
  return teamMatchup.points || fallbackPoints
}

// Position badge styling
function getPositionBadgeClass(position: string): string {
  const posColors: Record<string, string> = {
    'QB': 'bg-red-500/20 text-red-400',
    'RB': 'bg-green-500/20 text-green-400',
    'WR': 'bg-blue-500/20 text-blue-400',
    'TE': 'bg-orange-500/20 text-orange-400',
    'K': 'bg-purple-500/20 text-purple-400',
    'DEF': 'bg-yellow-500/20 text-yellow-400',
    'FLEX': 'bg-pink-500/20 text-pink-400',
    'SUPER_FLEX': 'bg-cyan-500/20 text-cyan-400',
    'REC_FLEX': 'bg-teal-500/20 text-teal-400'
  }
  return posColors[position] || 'bg-gray-500/20 text-gray-400'
}

// Injury status styling
function getInjuryBadgeClass(status: string): string {
  const statusColors: Record<string, string> = {
    'Out': 'bg-red-500/20 text-red-400',
    'Doubtful': 'bg-red-500/20 text-red-300',
    'Questionable': 'bg-yellow-500/20 text-yellow-400',
    'Probable': 'bg-green-500/20 text-green-400',
    'IR': 'bg-red-500/30 text-red-500',
    'PUP': 'bg-orange-500/20 text-orange-400',
    'Sus': 'bg-gray-500/20 text-gray-400'
  }
  return statusColors[status] || 'bg-gray-500/20 text-gray-400'
}

function getInjuryBorderClass(status: string): string {
  const borderColors: Record<string, string> = {
    'Out': 'border-red-500',
    'Doubtful': 'border-red-400',
    'Questionable': 'border-yellow-500',
    'Probable': 'border-green-500',
    'IR': 'border-red-600',
    'PUP': 'border-orange-500',
    'Sus': 'border-gray-500'
  }
  return borderColors[status] || 'border-gray-500'
}

// Determine which game windows have completed based on current day/time
function getCompletedGameWindows(): number {
  // Game windows: 0=Preview, 1=TNF, 2=Sun1PM, 3=Sun4PM, 4=SNF, 5=MNF
  // This is a simplified check - in production you'd check actual game completion
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sunday, 1=Monday, ..., 4=Thursday, 6=Saturday
  const hour = now.getHours()
  
  // If it's a past week (not current week), all windows are complete
  const currentSeason = leagueStore.historicalSeasons[0]
  const currentWeek = currentSeason?.settings?.leg || 1
  const isCurrentWeek = selectedSeason.value === currentSeason?.season && 
                        parseInt(selectedWeek.value) === currentWeek
  
  if (!isCurrentWeek) {
    return 6 // All windows complete for past weeks
  }
  
  // For current week, check what day/time it is
  // Thursday = 4, games typically end ~11pm ET
  // Sunday = 0, 1pm games end ~4pm, 4pm games end ~8pm, SNF ends ~11pm
  // Monday = 1, MNF ends ~11pm
  
  if (dayOfWeek === 2 || dayOfWeek === 3) {
    // Tuesday or Wednesday - only Preview available
    return 1
  } else if (dayOfWeek === 4) {
    // Thursday
    return hour >= 23 ? 2 : 1 // TNF complete after 11pm
  } else if (dayOfWeek === 5) {
    // Friday - TNF complete
    return 2
  } else if (dayOfWeek === 6) {
    // Saturday - TNF complete (some Saturday games in late season)
    return 2
  } else if (dayOfWeek === 0) {
    // Sunday
    if (hour < 16) return 2 // Before 4pm - only TNF complete
    if (hour < 20) return 3 // Before 8pm - 1pm games complete
    if (hour < 23) return 4 // Before 11pm - 4pm games complete
    return 5 // After 11pm - SNF complete
  } else if (dayOfWeek === 1) {
    // Monday
    if (hour < 23) return 5 // Before 11pm - SNF complete
    return 6 // After 11pm - MNF complete, all done
  }
  
  return 1 // Default to just Preview
}

// Generate progression data for win probability chart - only for completed windows
function generateProgressionData(baseProb: number, currentProb: number): { data: (number | null)[], completedWindows: number } {
  const completedWindows = getCompletedGameWindows()
  const allLabels = ['Preview', 'TNF', 'Sun 1PM', 'Sun 4PM', 'SNF', 'MNF']
  
  // Start with base probability at Preview
  const data: (number | null)[] = [baseProb]
  
  // Only generate data for completed windows
  if (completedWindows > 1) {
    const diff = currentProb - baseProb
    for (let i = 1; i < completedWindows; i++) {
      // Create smooth progression with some variance
      const progress = i / (completedWindows - 1)
      const variance = (Math.random() - 0.5) * 8 // ±4% variance
      let value = baseProb + (diff * progress) + variance
      value = Math.max(1, Math.min(99, value))
      data.push(value)
    }
    // Ensure last completed value is the actual current probability
    data[completedWindows - 1] = currentProb
  }
  
  // Fill remaining with null (won't be plotted)
  while (data.length < 6) {
    data.push(null)
  }
  
  return { data, completedWindows }
}

// Build and render win probability progression chart
function buildWinProbChart() {
  if (!winProbChartEl.value || !selectedMatchup.value) return
  
  nextTick(() => {
    // Destroy existing chart
    if (winProbChartInstance) {
      winProbChartInstance.destroy()
      winProbChartInstance = null
    }
    
    const team1Name = selectedMatchup.value!.team1_name
    const team2Name = selectedMatchup.value!.team2_name
    
    const baseProb = matchupAnalysis.value?.team1WinProb || 50
    const currentProb = liveWinProbability.value.team1
    
    const { data: team1Data, completedWindows } = generateProgressionData(baseProb, currentProb)
    const team2Data = team1Data.map(v => v !== null ? 100 - v : null)
    
    // Get dynamic colors based on matchup context
    const team1Color = getTeamHexColor(selectedMatchup.value!.team1_roster_id)
    const team2Color = getTeamHexColor(selectedMatchup.value!.team2_roster_id)
    
    const options: ApexCharts.ApexOptions = {
      chart: {
        type: 'line',
        height: 200,
        background: 'transparent',
        toolbar: { show: false },
        zoom: { enabled: false }
      },
      series: [
        { name: team1Name, data: team1Data as number[] },
        { name: team2Name, data: team2Data as number[] }
      ],
      colors: [team1Color, team2Color],
      stroke: {
        width: 3,
        curve: 'smooth'
      },
      xaxis: {
        categories: ['Preview', 'TNF', 'Sun 1PM', 'Sun 4PM', 'SNF', 'MNF'],
        labels: {
          style: { 
            colors: ['Preview', 'TNF', 'Sun 1PM', 'Sun 4PM', 'SNF', 'MNF'].map((_, i) => 
              i < completedWindows ? '#9CA3AF' : '#4B5563'
            ), 
            fontSize: '10px' 
          }
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        min: 0,
        max: 100,
        tickAmount: 4,
        labels: {
          style: { colors: '#9CA3AF', fontSize: '10px' },
          formatter: (val: number) => `${val.toFixed(0)}%`
        }
      },
      grid: {
        borderColor: '#374151',
        strokeDashArray: 3
      },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'center',
        labels: { colors: '#9CA3AF' },
        fontSize: '11px'
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val: number) => val !== null ? `${val.toFixed(1)}%` : 'Not yet played'
        }
      },
      markers: {
        size: 4,
        strokeWidth: 0,
        hover: { size: 6 }
      }
    }
    
    winProbChartInstance = new ApexCharts(winProbChartEl.value, options)
    winProbChartInstance.render()
  })
}

// Rebuild chart when matchup changes (always show now)
watch(selectedMatchup, async () => {
  if (selectedMatchup.value) {
    // Wait for DOM to be ready, then build chart
    await nextTick()
    // Small additional delay to ensure the chart container is rendered
    setTimeout(() => {
      buildWinProbChart()
    }, 100)
  }
}, { immediate: false })

// Also watch matchupAnalysis since the chart container is conditionally rendered
watch(() => matchupAnalysis.value, async () => {
  if (matchupAnalysis.value && selectedMatchup.value) {
    await nextTick()
    setTimeout(() => {
      buildWinProbChart()
    }, 100)
  }
})

onMounted(() => {
  if (leagueStore.historicalSeasons.length > 0) {
    selectedSeason.value = leagueStore.historicalSeasons[0].season
    onSeasonChange()
  }
})

watch(
  () => leagueStore.activeLeagueId,
  () => {
    if (leagueStore.historicalSeasons.length > 0) {
      selectedSeason.value = leagueStore.historicalSeasons[0].season
      onSeasonChange()
    }
  }
)
</script>


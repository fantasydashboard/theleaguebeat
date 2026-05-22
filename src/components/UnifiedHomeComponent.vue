<template>
  <div class="space-y-8">
    <!-- Offseason Notice Banner - Only show when season is complete -->
    <div v-if="isSeasonComplete" class="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4 flex items-start gap-3">
      <div class="text-slate-400 text-xl flex-shrink-0">📅</div>
      <div>
        <p class="text-slate-200 font-semibold">It's the offseason</p>
        <p class="text-slate-400 text-sm mt-1">You're viewing last season's data ({{ currentSeason }}). The {{ Number(currentSeason) + 1 }} season will appear automatically once Week 1 begins.</p>
      </div>
    </div>

    <!-- Settings Gear at Top -->
    <div class="flex justify-end">
      <router-link to="/settings" class="p-2 rounded-lg bg-dark-card border border-dark-border hover:border-yellow-400 transition-colors">
        <svg class="w-6 h-6 text-dark-textMuted hover:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </router-link>
    </div>

    <!-- Hero Section - Current Week Matchups -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600/10 via-dark-card to-dark-bg border border-dark-border">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-600/5 via-transparent to-transparent"></div>
      
      <div class="relative p-6 md:p-8">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-1.5 h-10 bg-emerald-600 rounded-full"></div>
          <div>
            <h1 class="text-3xl md:text-4xl font-black text-dark-text tracking-tight">{{ leagueName }}</h1>
            <p class="text-dark-textMuted text-base mt-1">
              {{ currentSeason }} Season • Week {{ displayWeek }}
              <span v-if="isSeasonComplete" class="ml-2 text-green-400">(Season Complete)</span>
              <span class="ml-2 px-2 py-0.5 rounded text-xs font-medium" :class="scoringTypeBadgeClass">{{ scoringTypeLabel }}</span>
            </p>
          </div>
        </div>

        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <LoadingSpinner size="md" :message="loadingStatus || 'Loading...'" />
        </div>
      </div>
    </div>

    <!-- League Leaders -->
    <div>
      <h2 class="text-2xl font-black text-dark-text mb-4 flex items-center gap-2">
        <span class="text-2xl">👑</span>League Leaders
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- ROTO League Leaders -->
        <template v-if="isRotoMode">
          <!-- Most Categories Led -->
          <div
            @click="openLeaderModal('rotoCategoryLeader')"
            class="group relative overflow-hidden rounded-xl bg-dark-card border border-green-500/20 hover:border-green-500/40 transition-all cursor-pointer"
          >
            <div class="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
            <div class="relative p-5">
              <div class="text-xs uppercase tracking-wider text-green-400 font-bold mb-3">
                Most Categories Led
              </div>
              <div class="flex items-center gap-3 mb-3">
                <img
                  :src="getLogoUrl(rotoCategoryLeader?.logo_url)"
                  class="w-12 h-12 rounded-full border-2 border-green-500/50 object-cover"
                  @error="handleImageError"
                />
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-lg text-dark-text truncate">
                    {{ rotoCategoryLeader?.name || 'N/A' }}
                  </div>
                  <div class="text-sm text-dark-textMuted">
                    {{ (rotoPointsData[rotoCategoryLeader?.team_key] || 0).toFixed(1) }} roto pts
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div class="text-2xl font-black text-green-400">
                  Leading {{ rotoCategoryLeader?.count || 0 }} of {{ statCategories.length }} categories
                </div>
                <div class="text-xs text-green-400/70 group-hover:text-green-400 transition-colors">Click for details →</div>
              </div>
            </div>
          </div>

          <!-- Most Balanced -->
          <div
            @click="openLeaderModal('rotoMostBalanced')"
            class="group relative overflow-hidden rounded-xl bg-dark-card border border-yellow-500/20 hover:border-yellow-500/40 transition-all cursor-pointer"
          >
            <div class="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
            <div class="relative p-5">
              <div class="text-xs uppercase tracking-wider text-yellow-400 font-bold mb-3">
                Most Balanced
              </div>
              <div class="flex items-center gap-3 mb-3">
                <img
                  :src="getLogoUrl(rotoMostBalanced?.logo_url)"
                  class="w-12 h-12 rounded-full border-2 border-yellow-500/50 object-cover"
                  @error="handleImageError"
                />
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-lg text-dark-text truncate">
                    {{ rotoMostBalanced?.name || 'N/A' }}
                  </div>
                  <div class="text-sm text-dark-textMuted">
                    {{ (rotoPointsData[rotoMostBalanced?.team_key] || 0).toFixed(1) }} roto pts
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div class="text-2xl font-black text-yellow-400">
                  Worst rank: {{ rotoMostBalanced?.worstRankLabel || 'N/A' }}
                </div>
                <div class="text-xs text-yellow-400/70 group-hover:text-yellow-400 transition-colors">Click for details →</div>
              </div>
            </div>
          </div>
        </template>

        <!-- H2H League Leaders (Points or Category) -->
        <template v-else>
          <!-- Points League: Most Points / Category League: Best Cat Win % -->
          <div
            @click="openLeaderModal(isPointsLeague ? 'mostPoints' : 'bestCatWinPct')"
            class="group relative overflow-hidden rounded-xl bg-dark-card border border-yellow-500/20 hover:border-yellow-500/40 transition-all cursor-pointer"
          >
            <div class="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
            <div class="relative p-5">
              <div class="text-xs uppercase tracking-wider text-yellow-400 font-bold mb-3">
                {{ isPointsLeague ? 'Most Points' : 'Best Category Win %' }}
              </div>
              <div class="flex items-center gap-3 mb-3">
                <img
                  :src="getLogoUrl(isPointsLeague ? leaders.mostPoints?.logo_url : leaders.bestCatWinPct?.logo_url)"
                  class="w-12 h-12 rounded-full border-2 border-yellow-500/50 object-cover"
                  @error="handleImageError"
                />
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-lg text-dark-text truncate">
                    {{ isPointsLeague ? (leaders.mostPoints?.name || 'N/A') : (leaders.bestCatWinPct?.name || 'N/A') }}
                  </div>
                  <div class="text-sm text-dark-textMuted">
                    {{ isPointsLeague
                      ? `${leaders.mostPoints?.wins || 0}-${leaders.mostPoints?.losses || 0}`
                      : `${leaders.bestCatWinPct?.totalCategoryWins || leaders.bestCatWinPct?.wins || 0}-${leaders.bestCatWinPct?.totalCategoryLosses || leaders.bestCatWinPct?.losses || 0}` }}
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div class="text-2xl font-black text-yellow-400">
                  {{ isPointsLeague
                    ? (leaders.mostPoints?.points_for?.toFixed(1) || '0.0')
                    : getCatWinPct(leaders.bestCatWinPct) + '%' }}
                </div>
                <div class="text-xs text-yellow-400/70 group-hover:text-yellow-400 transition-colors">Click for details →</div>
              </div>
            </div>
          </div>

          <!-- Points League: Best All-Play / Category League: Most Dominant Wins -->
          <div
            @click="openLeaderModal(isPointsLeague ? 'bestAllPlay' : 'mostDominant')"
            class="group relative overflow-hidden rounded-xl bg-dark-card border border-blue-500/20 hover:border-blue-500/40 transition-all cursor-pointer"
          >
            <div class="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
            <div class="relative p-5">
              <div class="text-xs uppercase tracking-wider text-blue-400 font-bold mb-1">
                {{ isPointsLeague ? 'Best All-Play' : 'Most Dominant Wins' }}
              </div>
              <div v-if="!isPointsLeague" class="text-[10px] text-dark-textMuted mb-2">Weeks with ≤2 category losses</div>
              <div v-else class="mb-3"></div>
              <div class="flex items-center gap-3 mb-3">
                <img
                  :src="getLogoUrl(isPointsLeague ? leaders.bestAllPlay?.logo_url : leaders.mostDominant?.logo_url)"
                  class="w-12 h-12 rounded-full border-2 border-blue-500/50 object-cover"
                  @error="handleImageError"
                />
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-lg text-dark-text truncate">
                    {{ isPointsLeague ? (leaders.bestAllPlay?.name || 'N/A') : (leaders.mostDominant?.name || 'N/A') }}
                  </div>
                  <div class="text-sm text-dark-textMuted">
                    {{ isPointsLeague
                      ? (leaders.bestAllPlay ? `${leaders.bestAllPlay.wins}-${leaders.bestAllPlay.losses}` : '')
                      : (leaders.mostDominant ? `${leaders.mostDominant.totalCategoryWins || leaders.mostDominant.wins || 0}-${leaders.mostDominant.totalCategoryLosses || leaders.mostDominant.losses || 0}` : '') }}
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div class="text-2xl font-black text-blue-400">
                  {{ isPointsLeague
                    ? `${leaders.bestAllPlay?.all_play_wins || 0}-${leaders.bestAllPlay?.all_play_losses || 0}`
                    : `${teamDominantWins.get(leaders.mostDominant?.team_key) || 0} weeks` }}
                </div>
                <div class="text-xs text-blue-400/70 group-hover:text-blue-400 transition-colors">Click for details →</div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- League Standings - Full Width -->
    <div class="card">
      <div class="card-header">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🏆</span>
              <h2 class="card-title">League Standings</h2>
            </div>
            <div class="flex items-center gap-2 text-sm mt-1">
              <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span class="text-dark-textMuted">Select <span class="text-yellow-400">team</span> for details</span>
            </div>
            <p v-if="!isPointsLeague && hasRealPerCategoryData" class="text-xs text-dark-textMuted mt-1 italic">
              {{ isRotoMode ? 'Category columns show ranking points (1st place = most points). Total Roto Pts is the sum across all categories.' : 'Category columns show how many times each team won that stat category across all completed weeks.' }}
            </p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button 
              @click="downloadStandings" 
              :disabled="isGeneratingDownload" 
              class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
              :style="standingsCopyState === 'success' ? 'background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid #10b981;' : standingsCopyState === 'error' ? 'background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid #ef4444;' : 'background: transparent; color: #facc15; border: 1px solid #facc15;'"
            >
              <svg v-if="isGeneratingDownload" class="w-5 h-5 animate-spin pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else-if="standingsCopyState === 'success'" class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {{ isGeneratingDownload ? 'Generating...' : standingsCopyState === 'success' ? 'Copied! 📋' : standingsCopyState === 'error' ? 'Saved instead ↓' : 'Share' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Mobile scroll hint for category leagues - only when content overflows -->
      <div 
        v-if="!isPointsLeague && showScrollHint" 
        class="px-4 py-2 bg-dark-border/30 border-b border-dark-border sm:flex hidden items-center justify-center gap-2 text-xs text-dark-textMuted"
      >
        <svg class="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <span>Swipe to see all categories</span>
      </div>

      <!-- Mobile: column-page nav bar -->
      <div class="sm:hidden border-b border-dark-border bg-dark-border/20 pb-2 pt-1">
        <div class="flex items-center justify-center gap-3">
          <button @click="standingsColumnPage = Math.max(0, standingsColumnPage - 1)" :disabled="standingsColumnPage === 0"
            class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
            :class="standingsColumnPage === 0 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="flex gap-1.5">
            <div v-for="(_, i) in standingsTotalPages" :key="i"
              class="w-2 h-2 rounded-full transition-colors"
              :class="i === standingsColumnPage ? 'bg-yellow-400' : 'bg-dark-border/60'"
            />
          </div>
          <button @click="standingsColumnPage = Math.min(standingsTotalPages - 1, standingsColumnPage + 1)" :disabled="standingsColumnPage >= standingsTotalPages - 1"
            class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
            :class="standingsColumnPage >= standingsTotalPages - 1 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="card-body overflow-x-auto scrollbar-thin sm:overflow-x-auto" ref="standingsTableRef" @scroll="checkScrollHint">
        <table class="w-full">
          <thead>
            <tr class="text-left text-xs text-dark-textMuted uppercase border-b border-dark-border">
              <th class="py-3 px-3 w-12 cursor-pointer hover:text-yellow-400" @click="setSortColumn('rank')">
                # <span v-if="sortColumn === 'rank'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="py-3 px-3">
                <span :class="standingsColumnPage === 1 ? 'hidden sm:inline' : ''">Team</span>
              </th>


              <!-- W-L-T or Roto Pts: only on page 0 (mobile), always on desktop -->
              <th v-if="isRotoMode" class="py-3 px-3 text-center cursor-pointer hover:text-yellow-400 whitespace-nowrap" :class="standingsColumnPage > 0 ? 'hidden sm:table-cell' : ''" @click="setSortColumn('pf')" title="Total Roto Points">
                Roto Pts <span v-if="sortColumn === 'pf'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th v-else class="py-3 px-3 text-center cursor-pointer hover:text-yellow-400 whitespace-nowrap" :class="standingsColumnPage > 0 ? 'hidden sm:table-cell' : ''" @click="setSortColumn('record')" title="Total Category W-L-T">
                W-L-T <span v-if="sortColumn === 'record'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
              </th>
              
              <!-- Extra columns: always on desktop, only on page 1 on mobile -->
              <template v-if="hasRealPerCategoryData">
                <th 
                  v-for="(cat, idx) in displayCategories" 
                  :key="cat.stat_id"
                  class="py-3 px-2 text-center cursor-pointer hover:text-yellow-400 whitespace-nowrap"
                  :class="standingsColumnPage === 0 || Math.floor(idx / 4) + 1 !== standingsColumnPage ? 'hidden sm:table-cell' : ''"
                  :title="cat.name + ' — Total times won this category across all matchup weeks'"
                  @click="setSortColumn('cat_' + cat.stat_id)"
                >
                  <div class="flex flex-col items-center">
                    <span class="text-[10px]">{{ cat.display_name }}</span>
                    <span v-if="sortColumn === 'cat_' + cat.stat_id" class="text-[8px] text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </div>
                </th>
              </template>
              
              <template v-else-if="showTotalCategoryWins">
                <th class="py-3 px-3 text-center cursor-pointer hover:text-yellow-400" :class="standingsColumnPage === 0 ? 'hidden sm:table-cell' : ''" @click="setSortColumn('catWins')">
                  Cat W <span v-if="sortColumn === 'catWins'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="py-3 px-3 text-center cursor-pointer hover:text-yellow-400" :class="standingsColumnPage === 0 ? 'hidden sm:table-cell' : ''" @click="setSortColumn('catLosses')">
                  Cat L <span v-if="sortColumn === 'catLosses'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="py-3 px-3 text-center cursor-pointer hover:text-yellow-400" :class="standingsColumnPage === 0 ? 'hidden sm:table-cell' : ''" @click="setSortColumn('allPlay')">
                  All-Play <span v-if="sortColumn === 'allPlay'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
              </template>
              
              <template v-else>
                <th class="py-3 px-3 text-center cursor-pointer hover:text-yellow-400" :class="standingsColumnPage === 0 ? 'hidden sm:table-cell' : ''" @click="setSortColumn('allPlay')">
                  All-Play <span v-if="sortColumn === 'allPlay'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="py-3 px-3 text-right cursor-pointer hover:text-yellow-400" :class="standingsColumnPage === 0 ? 'hidden sm:table-cell' : ''" @click="setSortColumn('pf')">
                  PF <span v-if="sortColumn === 'pf'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="py-3 px-3 text-right cursor-pointer hover:text-yellow-400" :class="standingsColumnPage === 0 ? 'hidden sm:table-cell' : ''" @click="setSortColumn('pa')">
                  PA <span v-if="sortColumn === 'pa'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="team in sortedTeams" 
              :key="team.team_key"
              @click="openTeamDetailModal(team)"
              class="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors cursor-pointer"
              :class="{ 'bg-yellow-500/10 ring-2 ring-yellow-500/50 ring-inset': team.is_my_team }"
            >
              <td class="py-3 px-3">
                <div class="flex items-center justify-center">
                  <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-dark-border text-dark-textMuted">
                    {{ team.regularSeasonRank }}
                  </span>
                </div>
              </td>

              <!-- Desktop team cell: always full. Mobile page 0: full. Mobile page 1: logo only -->
              <!-- Team cell: logo always visible; name hidden on mobile pages 1+ -->
              <td class="py-3 px-1 sm:px-3" style="max-width: 0; width: 50%;">
                <div class="flex items-center gap-2">
                  <div class="relative flex-shrink-0">
                    <img 
                      :src="getLogoUrl(team.logo_url)" 
                      :alt="team.name"
                      class="w-8 h-8 rounded-full object-cover ring-2"
                      :class="team.is_my_team ? 'ring-yellow-500' : 'ring-dark-border'"
                      @error="handleImageError"
                    />
                    <div v-if="team.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span class="text-[8px] text-gray-900 font-bold">★</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 min-w-0" :class="standingsColumnPage >= 1 ? 'hidden sm:flex' : ''">
                    <span class="font-semibold text-dark-text truncate sm:max-w-none" :class="standingsColumnPage === 0 ? 'max-w-[120px]' : ''" style="">{{ team.name }}</span>
                    <span v-if="team.playoffFinish === 1" class="text-yellow-400 text-base flex-shrink-0" title="League Champion">🏆</span>
                    <span v-else-if="team.playoffFinish === 2" class="text-gray-300 text-sm flex-shrink-0" title="Runner-up">🥈</span>
                    <span v-else-if="team.playoffFinish === 3" class="text-amber-600 text-sm flex-shrink-0" title="Third Place">🥉</span>
                  </div>
                </div>
              </td>

              <td class="py-3 px-3 text-center" :class="standingsColumnPage > 0 ? 'hidden sm:table-cell' : ''">
                <template v-if="isRotoMode">
                  <span class="font-bold text-green-400">{{ (rotoPointsData[team.team_key] || team.points_for || 0).toFixed(1) }}</span>
                </template>
                <template v-else>
                  <span class="font-bold whitespace-nowrap" :class="getRecordClass(team)">
                    {{ team.wins }}-{{ team.losses }}{{ team.ties > 0 ? `-${team.ties}` : '' }}
                  </span>
                </template>
              </td>
              
              <template v-if="isRotoMode && statCategories.length > 0">
                <td
                  v-for="(cat, catIdx) in displayCategories"
                  :key="cat.stat_id"
                  class="py-3 px-2 text-center"
                  :class="standingsColumnPage === 0 || Math.floor(catIdx / 4) + 1 !== standingsColumnPage ? 'hidden sm:table-cell' : ''"
                >
                  <span class="text-sm font-bold" :class="getRotoRankClass(perCategoryWinsData[team.team_key]?.[cat.stat_id] || 0)">
                    {{ (perCategoryWinsData[team.team_key]?.[cat.stat_id] || 0) % 1 === 0 ? (perCategoryWinsData[team.team_key]?.[cat.stat_id] || 0) : (perCategoryWinsData[team.team_key]?.[cat.stat_id] || 0).toFixed(1) }}
                  </span>
                </td>
              </template>
              <template v-else-if="hasRealPerCategoryData">
                <td
                  v-for="(cat, catIdx) in displayCategories"
                  :key="cat.stat_id"
                  class="py-3 px-2 text-center"
                  :class="standingsColumnPage === 0 || Math.floor(catIdx / 4) + 1 !== standingsColumnPage ? 'hidden sm:table-cell' : ''"
                >
                  <span class="text-sm font-medium" :class="getCategoryWinClass(team.categoryWins?.[cat.stat_id] || 0, cat.stat_id)">
                    {{ team.categoryWins?.[cat.stat_id] || 0 }}
                  </span>
                </td>
              </template>
              
              <template v-else-if="showTotalCategoryWins">
                <td class="py-3 px-3 text-center" :class="standingsColumnPage === 0 ? 'hidden sm:table-cell' : ''">
                  <span class="text-sm font-bold text-green-400">{{ team.totalCategoryWins || 0 }}</span>
                </td>
                <td class="py-3 px-3 text-center" :class="standingsColumnPage === 0 ? 'hidden sm:table-cell' : ''">
                  <span class="text-sm font-bold text-red-400">{{ team.totalCategoryLosses || 0 }}</span>
                </td>
                <td class="py-3 px-3 text-center" :class="standingsColumnPage === 0 ? 'hidden sm:table-cell' : ''">
                  <span class="text-sm">{{ team.all_play_wins || 0 }}-{{ team.all_play_losses || 0 }}</span>
                </td>
              </template>
              
              <template v-else>
                <td class="py-3 px-3 text-center" :class="standingsColumnPage === 0 ? 'hidden sm:table-cell' : ''">
                  <span :class="getAllPlayClass(team)">{{ team.all_play_wins }}-{{ team.all_play_losses }}</span>
                </td>
                <td class="py-3 px-3 text-right" :class="standingsColumnPage === 0 ? 'hidden sm:table-cell' : ''">
                  <span class="font-medium" :class="getPointsForClass(team)">{{ team.points_for?.toFixed(1) || '0.0' }}</span>
                </td>
                <td class="py-3 px-3 text-right" :class="standingsColumnPage === 0 ? 'hidden sm:table-cell' : ''">
                  <span :class="getPointsAgainstClass(team)">{{ team.points_against?.toFixed(1) || '0.0' }}</span>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Standings Over Time Chart -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📈</span>
            <h2 class="card-title">Standings Over Time</h2>
          </div>

        </div>
        <p class="text-sm text-dark-textMuted mt-1">Track how team rankings have changed throughout the season</p>
      </div>
      <div class="card-body">
        <div v-if="isLoadingChart" class="flex items-center justify-center py-12">
          <LoadingSpinner size="sm" :message="`Loading chart data (${chartLoadProgress})...`" />
        </div>
        <div v-else-if="chartSeries.length > 0" class="relative" ref="standingsChartRef">
          <!-- Desktop: full chart -->
          <div class="hidden sm:block">
            <apexchart 
              ref="apexChartRef"
              type="line" 
              height="400" 
              :options="chartOptions" 
              :series="chartSeries"
              @updated="onChartUpdated"
            />
            <!-- Team avatar overlays at end of lines -->
            <div 
              v-for="(team, idx) in sortedTeams" 
              :key="'avatar-' + team.team_key"
              class="absolute cursor-pointer transition-opacity duration-200"
              :class="{ 'opacity-30': standingsHoveredTeamKey && standingsHoveredTeamKey !== team.team_key }"
              :style="getChartAvatarStyle(team)"
              @mouseenter="standingsHoveredTeamKey = team.team_key"
              @mouseleave="standingsHoveredTeamKey = null"
            >
              <div class="relative">
                <img 
                  :src="getLogoUrl(team.logo_url)" 
                  :alt="team.name"
                  class="w-6 h-6 rounded-full object-cover"
                  :style="{ boxShadow: `0 0 0 2px ${team.is_my_team ? '#F5C451' : getStandingsTeamColor(team)}` }"
                  @error="handleImageError"
                />
                <div v-if="team.is_my_team" class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span class="text-[6px] text-gray-900 font-bold">★</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Mobile: windowed chart showing ~6 weeks at a time -->
          <div class="sm:hidden">
            <div class="relative">
              <apexchart 
                type="line" 
                height="320" 
                :options="mobileChartOptions" 
                :series="mobileChartSeries"
              />
              <!--
                Avatar column: use justify-between so items sit at fractions 0, 1/(n-1), 2/(n-1)...1
                which exactly matches ApexCharts' y-axis data point spacing.
                Padding top/bottom matches ApexCharts' internal plot area offsets (top≈12, bottom≈32).
                Avatar size 16px (w-4 h-4) so they don't crowd each other.
              -->
              <div
                class="absolute right-0 top-0 bottom-0 flex flex-col justify-between items-end pointer-events-none"
                style="padding-top: 12px; padding-bottom: 32px; padding-right: 2px;"
              >
                <div
                  v-for="team in mobileChartTeamOrder"
                  :key="'mob-avatar-' + team.team_key"
                  class="flex items-center justify-end"
                >
                  <img 
                    :src="getLogoUrl(team.logo_url)" 
                    :alt="team.name"
                    class="w-4 h-4 rounded-full object-cover flex-shrink-0"
                    :style="{ boxShadow: `0 0 0 2px ${team.is_my_team ? '#F5C451' : getStandingsTeamColor(team)}` }"
                    @error="handleImageError"
                  />
                </div>
              </div>
            </div>
            <!-- Unified nav: arrows + yellow dots -->
            <div class="flex items-center justify-center gap-3 mt-3">
              <button
                @click="chartWeekOffset = Math.min(chartWeekOffset + 6, Math.max(0, (chartOptions?.xaxis?.categories?.length || 0) - 6))"
                :disabled="chartWeekOffset >= Math.max(0, (chartOptions?.xaxis?.categories?.length || 0) - 6)"
                class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                :class="chartWeekOffset >= Math.max(0, (chartOptions?.xaxis?.categories?.length || 0) - 6) ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div class="flex gap-1.5">
                <div v-for="(_, i) in mobileChartTotalPages" :key="i"
                  class="w-2 h-2 rounded-full transition-colors"
                  :class="i === mobileChartCurrentPage ? 'bg-yellow-400' : 'bg-dark-border/60'"
                />
              </div>
              <button
                @click="chartWeekOffset = Math.max(0, chartWeekOffset - 6)"
                :disabled="chartWeekOffset === 0"
                class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                :class="chartWeekOffset === 0 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
            <p class="text-center text-xs text-dark-textMuted mt-1">{{ mobileChartLabel }}</p>
          </div>
        </div>
        <div v-else class="text-center py-12 text-dark-textMuted">
          <p>Not enough data to show standings over time</p>
          <p class="text-sm mt-1">Chart will appear once at least 2 weeks have been completed</p>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">📊</span>
          <h2 class="card-title">Quick Stats</h2>
        </div>
      </div>
      <div class="card-body">
        <!-- Desktop: grid layout (unchanged) -->
        <div class="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div 
            v-for="stat in quickStats" 
            :key="stat.label" 
            @click="openQuickStatModal(stat.type)"
            @mouseenter="stat.team && (standingsHoveredTeamKey = stat.team.team_key)"
            @mouseleave="standingsHoveredTeamKey = null"
            class="flex items-center gap-3 p-3 rounded-lg bg-dark-border/20 hover:bg-dark-border/40 cursor-pointer transition-colors group"
          >
            <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
              <img v-if="stat.team" :src="getLogoUrl(stat.team.logo_url)" class="w-full h-full object-cover" @error="handleImageError" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[10px] text-dark-textMuted uppercase">{{ stat.icon }} {{ stat.label }}</div>
              <div class="font-semibold text-dark-text truncate text-sm">{{ stat.team?.name || 'N/A' }}</div>
              <div class="text-xs font-bold" :class="stat.valueClass">{{ stat.value }}</div>
            </div>
            <div class="text-dark-textMuted/50 group-hover:text-yellow-400 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Mobile: single card with yellow nav only -->
        <div class="sm:hidden">
          <div class="px-2">
            <!-- Active card -->
            <div
              v-if="quickStats[quickStatIndex]"
              @click="openQuickStatModal(quickStats[quickStatIndex].type)"
              class="flex items-center gap-4 p-4 rounded-xl bg-dark-border/20 cursor-pointer active:bg-dark-border/40 transition-colors"
            >
              <div class="w-14 h-14 rounded-full overflow-hidden bg-dark-border flex-shrink-0 ring-2 ring-dark-border">
                <img v-if="quickStats[quickStatIndex].team" :src="getLogoUrl(quickStats[quickStatIndex].team.logo_url)" class="w-full h-full object-cover" @error="handleImageError" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[11px] text-dark-textMuted uppercase tracking-wide mb-0.5">
                  {{ quickStats[quickStatIndex].icon }} {{ quickStats[quickStatIndex].label }}
                </div>
                <div class="font-bold text-dark-text text-base truncate">{{ quickStats[quickStatIndex].team?.name || 'N/A' }}</div>
                <div class="text-sm font-bold mt-0.5" :class="quickStats[quickStatIndex].valueClass">{{ quickStats[quickStatIndex].value }}</div>
              </div>
            </div>
          </div>

<div class="flex items-center justify-center gap-3 mt-3">
            <!-- Left arrow -->
            <button @click="quickStatIndex = Math.max(0, quickStatIndex - 1)" :disabled="quickStatIndex === 0"
              class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
              :class="quickStatIndex === 0 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <!-- Dots -->
            <div class="flex gap-1.5">
              <button v-for="(_, i) in quickStats" :key="i" @click="quickStatIndex = i"
                class="w-2 h-2 rounded-full transition-colors"
                :class="i === quickStatIndex ? 'bg-yellow-400' : 'bg-dark-border/60'"
              />
            </div>
            <!-- Right arrow -->
            <button @click="quickStatIndex = Math.min(quickStats.length - 1, quickStatIndex + 1)" :disabled="quickStatIndex >= quickStats.length - 1"
              class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
              :class="quickStatIndex >= quickStats.length - 1 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Platform Badge -->
    <div class="flex justify-center">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border" :class="platformBadgeClass">
        <img 
          :src="platformLogo" 
          :alt="platformName"
          class="w-5 h-5"
        />
        <span class="text-sm" :class="platformSubTextClass">{{ platformName }} Fantasy {{ sportName }} • {{ scoringTypeLabel }}</span>
      </div>
    </div>

    <!-- Leader Modal -->
    <Teleport to="body">
      <div 
        v-if="showLeaderModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closeLeaderModal"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-dark-text">{{ leaderModalTitle }}</h3>
              <p class="text-sm text-dark-textMuted">{{ currentSeason }} Season Leaderboard</p>
            </div>
            <div class="flex items-center gap-2">
              <button 
                @click="downloadLeaderImage" 
                :disabled="isDownloadingLeader"
                class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50"
                :style="leaderCopyState === 'success' ? 'background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid #10b981;' : 'background: transparent; color: #facc15; border: 1px solid #facc15;'"
              >
                <svg v-if="isDownloadingLeader" class="w-4 h-4 animate-spin pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else-if="leaderCopyState === 'success'" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                {{ isDownloadingLeader ? 'Generating...' : leaderCopyState === 'success' ? 'Copied! 📋' : 'Share' }}
              </button>
              <button @click="closeLeaderModal" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div class="p-6 border-b border-dark-border" :class="leaderModalGradient">
            <div class="flex items-center gap-4">
              <img 
                :src="getLogoUrl(leaderModalData.leader?.logo_url)" 
                :alt="leaderModalData.leader?.name"
                class="w-16 h-16 rounded-full ring-4 object-cover"
                :class="leaderModalRingColor"
                @error="handleImageError"
              />
              <div class="flex-1">
                <div class="text-xl font-bold text-dark-text">{{ leaderModalData.leader?.name }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaderModalData.leader?.wins }}-{{ leaderModalData.leader?.losses }}</div>
              </div>
              <div class="text-right">
                <div class="text-3xl font-black" :class="leaderModalTextColor">{{ leaderModalValue }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaderModalUnit }}</div>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">{{ leaderModalListTitle }}</h4>
            <div class="space-y-3">
              <div 
                v-for="(team, index) in leaderModalData.comparison.slice(0, leaderModalListLimit)" 
                :key="team.team_key"
                class="flex items-center gap-3"
              >
                <div class="w-6 text-center">
                  <span class="text-sm font-bold" :class="index === 0 ? leaderModalTextColor : 'text-dark-textMuted'">{{ index + 1 }}</span>
                </div>
                <img :src="getLogoUrl(team.logo_url)" :alt="team.name" class="w-8 h-8 rounded-full object-cover" @error="handleImageError" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium text-dark-text truncate">{{ team.name }}</span>
                  </div>
                  <div class="h-2.5 bg-dark-border rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-500"
                      :class="leaderModalBarColor"
                      :style="{ width: `${(team.value / leaderModalData.maxValue) * 100}%` }"
                    ></div>
                  </div>
                </div>
                <div class="w-24 text-right">
                  <div class="text-sm font-semibold" :class="index === 0 ? leaderModalTextColor : 'text-dark-text'">
                    {{ formatLeaderValue(team.value) }}
                  </div>
                  <div class="text-[10px] text-dark-textMuted">{{ leaderModalUnit }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Team Detail Modal -->
    <Teleport to="body">
      <div 
        v-if="showTeamDetailModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showTeamDetailModal = false"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <!-- Header -->
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
            <div class="flex items-center gap-4">
              <img 
                :src="getLogoUrl(selectedTeamDetail?.logo_url)" 
                :alt="selectedTeamDetail?.name"
                class="w-12 h-12 rounded-full ring-2 ring-red-600 object-cover"
                @error="handleImageError"
              />
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-xl font-bold text-dark-text">{{ selectedTeamDetail?.name }}</h3>
                  <span v-if="selectedTeamDetail?.playoffFinish === 1" class="text-yellow-400 text-xl" title="League Champion">🏆</span>
                  <span v-else-if="selectedTeamDetail?.playoffFinish === 2" class="text-gray-300 text-lg" title="Runner-up">🥈</span>
                  <span v-else-if="selectedTeamDetail?.playoffFinish === 3" class="text-amber-600 text-lg" title="Third Place">🥉</span>
                </div>
                <p class="text-sm text-dark-textMuted">Team Details - {{ currentSeason }} Season</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button 
                @click="downloadTeamDetailImage" 
                :disabled="isDownloadingTeamDetail"
                class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50"
                :style="teamDetailCopyState === 'success' ? 'background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid #10b981;' : 'background: transparent; color: #facc15; border: 1px solid #facc15;'"
              >
                <svg v-if="isDownloadingTeamDetail" class="w-4 h-4 animate-spin pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else-if="teamDetailCopyState === 'success'" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                {{ isDownloadingTeamDetail ? 'Generating...' : teamDetailCopyState === 'success' ? 'Copied! 📋' : 'Share' }}
              </button>
              <button @click="showTeamDetailModal = false" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Top Stats Cards -->
          <div class="p-6 border-b border-dark-border">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <template v-if="isRotoMode">
                <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                  <div class="text-2xl font-black text-green-400">{{ (rotoPointsData[selectedTeamDetail?.team_key] || selectedTeamDetail?.points_for || 0).toFixed(1) }}</div>
                  <div class="text-xs text-dark-textMuted mt-1">Roto Pts</div>
                </div>
                <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                  <div class="flex items-center justify-center">
                    <span class="text-2xl font-black text-yellow-400">#{{ selectedTeamDetail?.regularSeasonRank }}</span>
                  </div>
                  <div class="text-xs text-dark-textMuted mt-1">Rank</div>
                </div>
                <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                  <div class="text-2xl font-black text-cyan-400">{{ (rotoMaxPoints - (rotoPointsData[selectedTeamDetail?.team_key] || 0)).toFixed(1) }}</div>
                  <div class="text-xs text-dark-textMuted mt-1">Pts Back</div>
                </div>
                <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                  <div class="text-2xl font-black" :class="getRotoBalanceClass(selectedTeamDetail?.team_key)">{{ getRotoBalanceScore(selectedTeamDetail?.team_key) }}</div>
                  <div class="text-xs text-dark-textMuted mt-1">Balance</div>
                </div>
              </template>
              <template v-else>
                <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                  <div class="text-2xl font-black text-dark-text">{{ selectedTeamDetail?.wins }}-{{ selectedTeamDetail?.losses }}{{ selectedTeamDetail?.ties > 0 ? `-${selectedTeamDetail.ties}` : '' }}</div>
                  <div class="text-xs text-dark-textMuted mt-1">Record</div>
                </div>
                <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                  <div class="flex items-center justify-center">
                    <span class="text-2xl font-black text-yellow-400">#{{ selectedTeamDetail?.regularSeasonRank }}</span>
                  </div>
                  <div class="text-xs text-dark-textMuted mt-1">Rank</div>
                </div>
                <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                  <div class="text-2xl font-black text-cyan-400">{{ selectedTeamDetail?.all_play_wins }}-{{ selectedTeamDetail?.all_play_losses }}</div>
                  <div class="text-xs text-dark-textMuted mt-1">All-Play</div>
                </div>
                <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                  <div class="text-2xl font-black text-green-400">{{ isPointsLeague ? pointsLeagueTeamDetailStats.ppg : teamDetailAvgCatsPerWeek }}</div>
                  <div class="text-xs text-dark-textMuted mt-1">{{ isPointsLeague ? 'PPG' : 'Cats/Week' }}</div>
                </div>
              </template>
            </div>
          </div>
          
          <!-- Points League: Season Breakdown -->
          <template v-if="isPointsLeague">
            <div class="p-6 border-b border-dark-border">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Season Breakdown</h4>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div class="bg-dark-border/20 rounded-xl p-4">
                  <div class="text-lg font-bold text-green-400">{{ pointsLeagueTeamDetailStats.highScore }}</div>
                  <div class="text-xs text-dark-textMuted">High Score</div>
                </div>
                <div class="bg-dark-border/20 rounded-xl p-4">
                  <div class="text-lg font-bold text-red-400">{{ pointsLeagueTeamDetailStats.lowScore }}</div>
                  <div class="text-xs text-dark-textMuted">Low Score</div>
                </div>
                <div class="bg-dark-border/20 rounded-xl p-4">
                  <div class="text-lg font-bold text-dark-text">{{ pointsLeagueTeamDetailStats.totalPoints }}</div>
                  <div class="text-xs text-dark-textMuted">Total Points</div>
                </div>
                <div class="bg-dark-border/20 rounded-xl p-4">
                  <div class="text-lg font-bold text-dark-text">{{ pointsLeagueTeamDetailStats.pointsAgainst }}</div>
                  <div class="text-xs text-dark-textMuted">Points Against</div>
                </div>
                <div class="bg-dark-border/20 rounded-xl p-4">
                  <div class="text-lg font-bold" :class="parseFloat(pointsLeagueTeamDetailStats.pointDiff) >= 0 ? 'text-green-400' : 'text-red-400'">
                    {{ parseFloat(pointsLeagueTeamDetailStats.pointDiff) >= 0 ? '+' : '' }}{{ pointsLeagueTeamDetailStats.pointDiff }}
                  </div>
                  <div class="text-xs text-dark-textMuted">Point Differential</div>
                </div>
                <div class="bg-dark-border/20 rounded-xl p-4">
                  <div class="text-lg font-bold text-dark-text">{{ pointsLeagueTeamDetailStats.winStreak }}</div>
                  <div class="text-xs text-dark-textMuted">Current Streak</div>
                </div>
              </div>
            </div>
            
            <!-- Points League: Weekly Points Chart -->
            <div class="p-6 border-b border-dark-border">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Points Per Week</h4>
              <div class="h-48">
                <apexchart 
                  v-if="pointsLeagueTeamDetailChartOptions" 
                  type="line" 
                  height="100%" 
                  :options="pointsLeagueTeamDetailChartOptions" 
                  :series="pointsLeagueTeamDetailChartSeries" 
                />
              </div>
            </div>
            
            <!-- Points League: Week-by-Week Results -->
            <div class="p-6">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Week-by-Week Results</h4>
              <div class="flex flex-wrap gap-2">
                <div 
                  v-for="(result, idx) in pointsLeagueTeamDetailStats.weeklyResults" 
                  :key="idx"
                  class="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                  :class="result.won ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'"
                  :title="`Week ${result.week || (idx + 1)}: ${result.points?.toFixed(1) || '0.0'} pts`"
                >
                  {{ result.won ? 'W' : 'L' }}
                </div>
              </div>
              <p class="text-xs text-dark-textMuted mt-3">Hover over a week to see points scored</p>
            </div>
          </template>
          
          <!-- Roto League: Category Rankings -->
          <template v-else-if="isRotoMode">
            <div class="p-6">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Category Rankings</h4>
              <p class="text-xs text-dark-textMuted mb-4">Ranking points per category ({{ leagueStore.yahooTeams?.length || 12 }} = 1st place, 1 = last). Higher is better.</p>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div
                  v-for="cat in statCategories"
                  :key="cat.stat_id"
                  class="bg-dark-border/20 rounded-xl p-3"
                >
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs text-dark-textMuted font-medium">{{ cat.display_name }}</span>
                    <span
                      class="text-xs px-1.5 py-0.5 rounded font-bold"
                      :class="getRotoRankBadgeClass(perCategoryWinsData[selectedTeamDetail?.team_key]?.[cat.stat_id] || 0)"
                    >
                      {{ formatRotoRankLabel(perCategoryWinsData[selectedTeamDetail?.team_key]?.[cat.stat_id] || 0) }}
                    </span>
                  </div>
                  <div class="text-lg font-bold" :class="getRotoRankValueClass(perCategoryWinsData[selectedTeamDetail?.team_key]?.[cat.stat_id] || 0)">
                    {{ formatRotoPoints(perCategoryWinsData[selectedTeamDetail?.team_key]?.[cat.stat_id] || 0) }} pts
                  </div>
                  <div class="h-1.5 bg-dark-border rounded-full overflow-hidden mt-2">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="getRotoRankBarClass(perCategoryWinsData[selectedTeamDetail?.team_key]?.[cat.stat_id] || 0)"
                      :style="{ width: `${((perCategoryWinsData[selectedTeamDetail?.team_key]?.[cat.stat_id] || 0) / (leagueStore.yahooTeams?.length || 12)) * 100}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Category League: Category Performance Chart -->
          <template v-else>
            <div class="p-6 border-b border-dark-border">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Weekly Category Wins vs League Average</h4>
              <div class="h-48">
                <apexchart 
                  v-if="teamDetailChartOptions" 
                  type="line" 
                  height="100%" 
                  :options="teamDetailChartOptions" 
                  :series="teamDetailChartSeries" 
                />
              </div>
            </div>
            
            <!-- Category Breakdown -->
            <div class="p-6 border-b border-dark-border">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Category Breakdown</h4>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div 
                  v-for="cat in teamDetailCategories" 
                  :key="cat.stat_id"
                  class="bg-dark-border/20 rounded-xl p-3"
                >
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs text-dark-textMuted font-medium">{{ cat.display_name }}</span>
                    <span 
                      class="text-xs px-1.5 py-0.5 rounded font-bold"
                      :class="cat.rankClass"
                    >
                      #{{ cat.rank }}
                    </span>
                  </div>
                  <div class="text-lg font-bold" :class="cat.valueClass">{{ cat.wins }}</div>
                  <div class="h-1.5 bg-dark-border rounded-full overflow-hidden mt-2">
                    <div 
                      class="h-full rounded-full transition-all"
                      :class="cat.barClass"
                      :style="{ width: `${cat.pct}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Week-by-Week Results -->
            <div class="p-6">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Week-by-Week Results</h4>
              <div class="flex flex-wrap gap-2">
                <div 
                  v-for="(result, idx) in teamDetailWeeklyResults" 
                  :key="idx"
                  class="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                  :class="result.won ? 'bg-green-500/20 text-green-400' : (result.tied ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400')"
                  :title="`Week ${idx + 1}: ${result.catWins}-${result.catLosses} vs ${result.opponent}`"
                >
                  {{ result.won ? 'W' : (result.tied ? 'T' : 'L') }}
                </div>
              </div>
              <p class="text-xs text-dark-textMuted mt-3">Hover over a week to see category score and opponent</p>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, Teleport } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'
import { yahooService } from '@/services/yahoo'
import { espnService } from '@/services/espn'
import { getEspnCookiesFromExtension } from '@/services/espnExtension'
import { sleeperService } from '@/services/sleeper'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { trackCardShare } from '@/services/shareTracking'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()
const platformsStore = usePlatformsStore()

const isLoading = ref(false)
const isLoadingChart = ref(false)
const isGeneratingDownload = ref(false)
const standingsCopyState = ref<'idle' | 'success' | 'error'>('idle')
const isDownloadingLeader = ref(false)
const leaderCopyState = ref<'idle' | 'success' | 'error'>('idle')
const isDownloadingTeamDetail = ref(false)
const teamDetailCopyState = ref<'idle' | 'success' | 'error'>('idle')
const shareToast = ref<'idle'|'success'|'error'>('idle')
const chartLoadProgress = ref('')
const loadingStatus = ref('')
const defaultAvatar = computed(() => {
  // Use data URI for ESPN to prevent 404 loops - this is a simple gray circle with "ESPN" text
  if (leagueStore.activePlatform === 'espn') return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwIiB5PSI1OCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzg4OCIgZm9udC1zaXplPSIxOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPkVTUE48L3RleHQ+PC9zdmc+'
  return 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_2_g.png'
})

// Track images that have already errored to prevent infinite loops
const erroredImages = new Set<string>()

// Reactive map to track broken logos - this ensures Vue re-renders with fallback
const brokenLogos = ref(new Set<string>())

// Helper function to get logo URL with fallback for broken images
function getLogoUrl(logoUrl: string | undefined): string {
  if (!logoUrl) return defaultAvatar.value
  if (brokenLogos.value.has(logoUrl)) return defaultAvatar.value
  return logoUrl
}

// Helper to load image via CORS proxy for downloads
// External CDNs (ESPN, Sleeper, Yahoo) don't send CORS headers, so we need workarounds
async function loadImageAsBase64(url: string, fallbackName: string): Promise<string> {
  if (!url) return createPlaceholderAvatar(fallbackName)
  
  // Skip proxy for data URIs and local files - use directly
  if (url.startsWith('data:') || url.startsWith('/') || url.startsWith('blob:')) {
    return url
  }
  
  // For external CDN URLs (Yahoo, ESPN, Sleeper), try CORS proxy first
  const corsProxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ]
  
  for (const proxyFn of corsProxies) {
    try {
      const proxyUrl = proxyFn(url)
      console.log(`[Download] Trying proxy for ${fallbackName}`)
      
      const response = await fetch(proxyUrl, { 
        signal: AbortSignal.timeout(4000)
      })
      
      if (!response.ok) {
        console.log(`[Download] Proxy returned ${response.status} for ${fallbackName}`)
        continue
      }
      
      const blob = await response.blob()
      
      // Verify it's actually an image
      if (!blob.type.startsWith('image/') || blob.size < 100) {
        console.log(`[Download] Invalid blob for ${fallbackName}: type=${blob.type}, size=${blob.size}`)
        continue
      }
      
      return new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          if (result && result.startsWith('data:image')) {
            console.log(`[Download] Successfully loaded image for ${fallbackName}`)
            resolve(result)
          } else {
            resolve(createPlaceholderAvatar(fallbackName))
          }
        }
        reader.onerror = () => resolve(createPlaceholderAvatar(fallbackName))
        reader.readAsDataURL(blob)
      })
    } catch (e) {
      console.log(`[Download] Proxy failed for ${fallbackName}:`, e)
      continue
    }
  }
  
  // Proxy failed, use ui-avatars as final fallback
  console.log(`[Download] Proxies failed for ${fallbackName}, trying ui-avatars`)
  return await loadFromUiAvatars(fallbackName)
}

// Load avatar from ui-avatars.com (supports CORS)
async function loadFromUiAvatars(name: string): Promise<string> {
  // Generate a consistent color based on the name
  const colors = ['0D8ABC', '3498DB', '9B59B6', 'E91E63', 'F39C12', '1ABC9C', '2ECC71', 'E74C3C', '00BCD4', '8E44AD']
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  const bgColor = colors[colorIndex]
  
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bgColor}&color=fff&size=64&bold=true&format=png`
  
  try {
    const response = await fetch(avatarUrl, { signal: AbortSignal.timeout(3000) })
    if (response.ok) {
      const blob = await response.blob()
      return new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          if (result && result.startsWith('data:')) {
            console.log(`[Download] ui-avatars success for ${name}`)
            resolve(result)
          } else {
            resolve(createPlaceholderAvatar(name))
          }
        }
        reader.onerror = () => resolve(createPlaceholderAvatar(name))
        reader.readAsDataURL(blob)
      })
    }
  } catch (e) {
    console.log(`[Download] ui-avatars failed for ${name}:`, e)
  }
  
  return createPlaceholderAvatar(name)
}

// Create a placeholder avatar with team initial
function createPlaceholderAvatar(teamName: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#3a3d52'
    ctx.beginPath()
    ctx.arc(32, 32, 32, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(teamName.charAt(0).toUpperCase(), 32, 34)
  }
  return canvas.toDataURL('image/png')
}

// Platform styling
const platformName = computed(() => {
  if (leagueStore.activePlatform === 'espn') return 'ESPN'
  if (leagueStore.activePlatform === 'sleeper') return 'Sleeper'
  return 'Yahoo'
})

const platformLogo = computed(() => {
  if (leagueStore.activePlatform === 'espn') return '/espn-logo.svg'
  if (leagueStore.activePlatform === 'sleeper') return '/sleeper-logo.svg'
  return '/yahoo-fantasy.svg'
})

const sportName = computed(() => {
  // For Sleeper, get from currentLeague.sport
  if (leagueStore.activePlatform === 'sleeper' && leagueStore.currentLeague?.sport) {
    const sport = leagueStore.currentLeague.sport
    const names: Record<string, string> = { nfl: 'Football', mlb: 'Baseball', nba: 'Basketball', nhl: 'Hockey' }
    return names[sport] || 'Fantasy'
  }
  
  // Check saved leagues
  const saved = leagueStore.savedLeagues.find(l => l.league_id === leagueStore.activeLeagueId)
  if (saved?.sport) {
    const names: Record<string, string> = { football: 'Football', baseball: 'Baseball', basketball: 'Basketball', hockey: 'Hockey', nfl: 'Football', mlb: 'Baseball', nba: 'Basketball', nhl: 'Hockey' }
    return names[saved.sport] || 'Fantasy'
  }
  
  return 'Fantasy'
})

const platformBadgeClass = computed(() => {
  if (leagueStore.activePlatform === 'espn') return 'bg-[#0719b2]/10 border-[#0719b2]/30'
  if (leagueStore.activePlatform === 'sleeper') return 'bg-[#01b5a5]/10 border-[#01b5a5]/30'
  return 'bg-purple-600/10 border-purple-600/30'
})

const platformTextClass = computed(() => {
  if (leagueStore.activePlatform === 'espn') return 'text-[#0719b2]'
  if (leagueStore.activePlatform === 'sleeper') return 'text-[#01b5a5]'
  return 'text-purple-400'
})

const platformSubTextClass = computed(() => {
  if (leagueStore.activePlatform === 'espn') return 'text-[#3d5fc4]'
  if (leagueStore.activePlatform === 'sleeper') return 'text-[#02d4c3]'
  return 'text-purple-300'
})

// Scoring type - read from store for both Yahoo and ESPN
const scoringType = computed(() => {
  // Try yahooLeague first (array format for Yahoo, mapped from ESPN)
  const yahooLeagueData = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
  if (yahooLeagueData?.scoring_type) {
    console.log('[scoringType] from yahooLeague:', yahooLeagueData.scoring_type)
    return yahooLeagueData.scoring_type
  }
  // Try currentLeague
  if (leagueStore.currentLeague?.scoring_type) {
    console.log('[scoringType] from currentLeague:', leagueStore.currentLeague.scoring_type)
    return leagueStore.currentLeague.scoring_type
  }
  // Try savedLeagues using activeLeagueId
  const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === leagueStore.activeLeagueId)
  if (savedLeague?.scoring_type) {
    console.log('[scoringType] from savedLeagues:', savedLeague.scoring_type)
    return savedLeague.scoring_type
  }
  console.log('[scoringType] defaulting to head')
  return 'head'
})

// League settings (for category stat details - Yahoo only)
const statCategories = ref<any[]>([])
const loadedSeason = ref<string>('')

// Sorting
const sortColumn = ref('record')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Modal
const showLeaderModal = ref(false)
const leaderModalType = ref('')

// Team Detail Modal
const showTeamDetailModal = ref(false)
const selectedTeamDetail = ref<any>(null)
const teamDetailChartSeries = ref<any[]>([])
const teamDetailChartOptions = ref<any>(null)
const teamDetailWeeklyResults = ref<any[]>([])

// Scroll hint - show only when table overflows
const showScrollHint = ref(false)
const standingsTableRef = ref<HTMLElement | null>(null)

// Chart refs for avatar positioning
const standingsChartRef = ref<HTMLElement | null>(null)
const apexChartRef = ref<any>(null)
const avatarPositions = ref<Map<string, { top: number, right: number }>>(new Map())

// Chart
const chartSeries = ref<any[]>([])
const chartOptions = ref<any>(null)
const standingsHoveredTeamKey = ref<string | null>(null)

// ── Mobile carousel state ─────────────────────────────────────────────────
const standingsColumnPage = ref(0)  // 0 = record col, 1 = extra cols (team name hidden)
const quickStatIndex = ref(0)       // active quick stat card on mobile
const chartWeekOffset = ref(0)      // 0 = latest weeks visible, higher = further back

// How many column pages the standings table has on mobile.
// Page 0 = W-L-T only. Pages 1..N = non-overlapping batches of 5 extra columns.
const MOBILE_COLS_PER_PAGE = 4  // number of category columns per slide on mobile

const standingsTotalPages = computed(() => {
  if (hasRealPerCategoryData.value) {
    const cats = displayCategories.value.length
    return 1 + Math.max(1, Math.ceil(cats / MOBILE_COLS_PER_PAGE))
  }
  if (showTotalCategoryWins.value) return 2  // page 0 + Cat W/L/All-Play
  return 2  // page 0 (W-L-T) + page 1 (All-Play, PF, PA)
})

// Data
const transactionCounts = ref<Map<string, number>>(new Map())
const teamCategoryWins = ref<Map<string, Record<string, number>>>(new Map())
const teamTotalCategoryWins = ref<Map<string, number>>(new Map())
const teamTotalCategoryLosses = ref<Map<string, number>>(new Map())
const espnHasRealStatValues = ref(false) // Track if ESPN provided real per-category stat values
const perCategoryWinsData = ref<Record<string, Record<string, number>>>({}) // For roto: per-category ranking points
const rotoPointsData = ref<Record<string, number>>({}) // For roto: total roto points per team
const rotoMaxPoints = ref(0) // For roto: highest roto point total
const isRotoMode = ref(false) // Whether current league is roto
const weeklyStandings = ref<Map<number, any[]>>(new Map())

// ESPN calculated standings from getStandings() - has correct wins/losses for category leagues
const espnCalculatedStandings = ref<Map<string, { wins: number; losses: number; ties: number; categoryWins: number; categoryLosses: number }>>(new Map())
const displayMatchups = ref<any[]>([])

// Computed: Get regular season ranks based on category win percentage
// This ensures teams are ranked by regular season performance, not playoff results
const regularSeasonRanks = computed(() => {
  const ranks = new Map<string, number>()
  
  // Use the store's official team order - this comes directly from the platform API
  // and uses the platform's real tiebreaker rules (head-to-head, division record, etc.)
  // The store sorts by wins desc, then points_for desc, and assigns team.rank
  const storeTeams = [...leagueStore.yahooTeams].sort((a, b) => {
    // Primary: wins descending
    if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0)
    // Secondary: fewer losses
    if ((a.losses || 0) !== (b.losses || 0)) return (a.losses || 0) - (b.losses || 0)
    // Tertiary: points for descending
    return (b.points_for || 0) - (a.points_for || 0)
  })
  
  storeTeams.forEach((team, idx) => {
    ranks.set(team.team_key, idx + 1)
  })
  
  return ranks
})

// Store weekly matchup results per team: team_key -> week -> { catWins, catLosses, opponent, won, tied }
const weeklyMatchupResults = ref<Map<string, Map<number, any>>>(new Map())

// Determine actual playoff finish from bracket data (not regular season rank)
// Returns Map<team_key, finish> where finish = 1 (champion), 2 (runner-up), 3 (third place)
const playoffFinishMap = computed(() => {
  const finishes = new Map<string, number>()
  
  if (!isSeasonComplete.value) return finishes
  
  // SLEEPER: Use actual winners bracket data
  if (leagueStore.activePlatform === 'sleeper') {
    const season = leagueStore.currentLeague?.season || new Date().getFullYear().toString()
    const bracket = leagueStore.historicalBrackets?.get(season)
    
    if (bracket && bracket.length > 0) {
      // Find the highest round number (championship round)
      const maxRound = Math.max(...bracket.map((m: any) => m.r || 0))
      
      // Championship match: highest round, match 1
      const championship = bracket.find((m: any) => m.r === maxRound && m.m === 1)
      if (championship) {
        if (championship.w) {
          finishes.set(`sleeper_${championship.w}`, 1) // Champion
        }
        if (championship.l) {
          finishes.set(`sleeper_${championship.l}`, 2) // Runner-up
        }
      }
      
      // 3rd place match: highest round, match 2
      const thirdPlace = bracket.find((m: any) => m.r === maxRound && m.m === 2)
      if (thirdPlace && thirdPlace.w) {
        finishes.set(`sleeper_${thirdPlace.w}`, 3) // Third place
      }
      
      console.log('[PlayoffFinish] Sleeper bracket results:', Object.fromEntries(finishes))
    } else {
      console.log('[PlayoffFinish] No bracket data available for Sleeper season', season)
    }
    return finishes
  }
  
  // YAHOO: team.rank from standings API reflects final placement for completed seasons
  if (leagueStore.activePlatform === 'yahoo') {
    leagueStore.yahooTeams.forEach(team => {
      if (team.rank && team.rank <= 3) {
        finishes.set(team.team_key, team.rank)
      }
    })
    return finishes
  }
  
  // ESPN: Use team.rank (playoffSeed) - may not reflect actual finish
  // TODO: Add ESPN bracket support when available
  if (leagueStore.activePlatform === 'espn') {
    // For ESPN, we don't have reliable playoff finish data
    // Don't assign trophies based on regular season rank alone
    return finishes
  }
  
  return finishes
})
const espnWeeklyScores = ref<Map<string, Map<number, number>>>(new Map())

// Computed
const leagueName = computed(() => {
  const league = leagueStore.yahooLeague
  // yahooLeague could be an array where index 0 has league info
  if (Array.isArray(league)) {
    return league[0]?.name || 'League'
  }
  return league?.name || 'League'
})

// Effective league key - use the actually loaded league (might be previous season)
const effectiveLeagueKey = computed(() => {
  // If currentLeague has a league_id set (might be previous season), use that
  if (leagueStore.currentLeague?.league_id) return leagueStore.currentLeague.league_id
  // Fall back to active league
  return leagueStore.activeLeagueId
})

const currentSeason = computed(() => {
  // First check season loaded directly from Yahoo API
  if (loadedSeason.value) return loadedSeason.value
  // Then check yahooLeague from API
  const league = leagueStore.yahooLeague
  if (Array.isArray(league) && league[0]?.season) {
    return league[0].season
  }
  if (league?.season) {
    return league.season
  }
  // Fall back to currentLeague
  return leagueStore.currentLeague?.season || new Date().getFullYear().toString()
})
const currentWeek = computed(() => {
  // Try currentLeague first (populated from saved league)
  if (leagueStore.currentLeague?.settings?.leg) return leagueStore.currentLeague.settings.leg
  // Fall back to yahooLeague
  return leagueStore.yahooLeague?.current_week || 1
})
const totalWeeks = computed(() => {
  // Try currentLeague first
  if (leagueStore.currentLeague?.settings?.end_week) return parseInt(leagueStore.currentLeague.settings.end_week)
  // Fall back to yahooLeague
  return parseInt(leagueStore.yahooLeague?.end_week) || 25
})
const isSeasonComplete = computed(() => {
  // Try currentLeague first
  if (leagueStore.currentLeague?.status === 'complete') return true
  // Fall back to yahooLeague
  return leagueStore.yahooLeague?.is_finished === 1
})
const displayWeek = computed(() => isSeasonComplete.value ? totalWeeks.value : currentWeek.value)

const isPointsLeague = computed(() => {
  const st = (scoringType.value || '').toLowerCase()
  const result = st.includes('point') || st === 'headpoint'
  console.log('[isPointsLeague] scoringType:', scoringType.value, 'result:', result)
  return result
})

const scoringTypeLabel = computed(() => {
  const st = (scoringType.value || '').toLowerCase()
  if (st.includes('roto')) return 'Roto'
  if (st.includes('point') || st === 'headpoint') return 'H2H Points'
  if (st.includes('head')) return 'H2H Categories'
  return 'Categories'
})

const scoringTypeBadgeClass = computed(() => {
  if (scoringType.value?.includes('roto')) return 'bg-purple-500/20 text-purple-400'
  // All league types use green badge
  return 'bg-green-500/20 text-green-400'
})

// Format matchups with category win data
const formattedMatchups = computed(() => {
  console.log('[formattedMatchups] displayMatchups count:', displayMatchups.value.length)
  return displayMatchups.value.map(m => {
    // Handle both formats: teams[] array (Yahoo) or team1/team2 directly (ESPN)
    const team1 = m.teams?.[0] || m.team1 || null
    const team2 = m.teams?.[1] || m.team2 || null
    
    // For category leagues, count wins from stat_winners array or use pre-calculated values
    let team1CatWins = '-'
    let team2CatWins = '-'
    
    // First try pre-calculated values from store (for category matchups)
    // Check multiple field name formats (Yahoo uses team1_wins, ESPN uses home_category_wins)
    if (m.team1_wins !== undefined || m.team2_wins !== undefined) {
      team1CatWins = (m.team1_wins ?? 0).toString()
      team2CatWins = (m.team2_wins ?? 0).toString()
    } else if (m.home_category_wins !== undefined || m.away_category_wins !== undefined) {
      // ESPN format
      team1CatWins = (m.home_category_wins ?? 0).toString()
      team2CatWins = (m.away_category_wins ?? 0).toString()
    } else if (team1?.category_wins !== undefined || team2?.category_wins !== undefined) {
      // Team-level category wins
      team1CatWins = (team1?.category_wins ?? 0).toString()
      team2CatWins = (team2?.category_wins ?? 0).toString()
    } else if (m.stat_winners && m.stat_winners.length > 0 && team1 && team2) {
      // Calculate from stat_winners if not pre-calculated
      const t1Key = team1.team_key
      const t2Key = team2.team_key
      let t1Wins = 0
      let t2Wins = 0
      
      for (const sw of m.stat_winners) {
        if (sw.is_tied === true || sw.is_tied === '1') {
          // Tie - don't count for either
        } else if (sw.winner_team_key === t1Key) {
          t1Wins++
        } else if (sw.winner_team_key === t2Key) {
          t2Wins++
        }
      }
      
      team1CatWins = t1Wins.toString()
      team2CatWins = t2Wins.toString()
    }
    
    return {
      ...m,
      matchup_id: m.matchup_id || m.id,
      team1,
      team2,
      team1_cat_wins: team1CatWins,
      team2_cat_wins: team2CatWins
    }
  })
})

const displayCategories = computed(() => {
  // For ESPN category leagues without real stat values, we don't have per-category data
  // So don't display individual category columns - we'll show total only
  if (leagueStore.activePlatform === 'espn' && !isPointsLeague.value && !espnHasRealStatValues.value) {
    return [] // Empty - we'll show total cat wins column instead
  }
  
  return statCategories.value.filter(cat => {
    if (cat.is_only_display_stat === '1' || cat.is_only_display_stat === 1) return false
    return true
  })
})

// Flag to indicate if we have real per-category breakdown (Yahoo always has it, ESPN only if stat values were found)
const hasRealPerCategoryData = computed(() => {
  if (leagueStore.activePlatform === 'yahoo' && !isPointsLeague.value) return true
  if (leagueStore.activePlatform === 'espn' && !isPointsLeague.value && espnHasRealStatValues.value) return true
  return false
})

// For ESPN category leagues without real stat values, show total category wins column
const showTotalCategoryWins = computed(() => {
  return leagueStore.activePlatform === 'espn' && !isPointsLeague.value && !espnHasRealStatValues.value
})

const numCategories = computed(() => displayCategories.value.length || 12)

const teamsWithStats = computed(() => {
  // Debug: log the data structures we're working with
  if (leagueStore.yahooTeams.length > 0 && isPointsLeague.value) {
    console.log('[teamsWithStats] Computing for', leagueStore.yahooTeams.length, 'teams')
    console.log('[teamsWithStats] espnWeeklyScores size:', espnWeeklyScores.value.size)
  }
  
  // Debug for category leagues
  if (leagueStore.yahooTeams.length > 0 && !isPointsLeague.value) {
    console.log('[teamsWithStats CATEGORY] Computing for', leagueStore.yahooTeams.length, 'teams')
    // Log actual store data
    const sample = leagueStore.yahooTeams[0]
    console.log('[teamsWithStats CATEGORY] Sample team from store:', {
      name: sample?.name,
      wins: sample?.wins,
      losses: sample?.losses,
      category_wins: sample?.category_wins,
      category_losses: sample?.category_losses
    })
  }
  
  return leagueStore.yahooTeams.map(team => {
    // For ESPN: totalMoves is pre-calculated correctly from transactionCounter (acquisitions + drops + trades)
    // For Yahoo/Sleeper: use transactionCounts map populated from API
    // Prioritize totalMoves since ESPN's individual transaction API counting is unreliable
    const transactions = team.totalMoves 
      ?? transactionCounts.value.get(team.team_key) 
      ?? ((team.transactionCounter?.acquisitions || 0) + (team.transactionCounter?.drops || 0) + (team.transactionCounter?.trades || 0))
    const categoryWins = teamCategoryWins.value.get(team.team_key) || {}
    const numTeams = leagueStore.yahooTeams.length
    
    // Use store data directly - same as Matchups page does
    let teamWins = team.wins || 0
    let teamLosses = team.losses || 0
    let teamTies = team.ties || 0
    const teamPointsFor = team.points_for ?? 0
    
    // For ESPN category leagues with ROTO calculation, use category totals as the "record"
    // since we don't have actual matchup win/loss data
    const totalCatWins = teamTotalCategoryWins.value.get(team.team_key) || 0
    const totalCatLosses = teamTotalCategoryLosses.value.get(team.team_key) || 0
    
    // Only substitute category totals as the record when at least 1 week is complete.
    // During week 1 in progress, totalCatWins/totalLosses come from partial live data
    // and must not be shown as a final W-L record.
    const yahooLeagueDataForCheck = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
    const currWeekForCheck = parseInt(yahooLeagueDataForCheck?.current_week) || 1
    const hasCompletedWeeksForRecord = isSeasonComplete.value || currWeekForCheck > 1
    if (!isPointsLeague.value && leagueStore.activePlatform === 'espn' && teamWins === 0 && teamLosses === 0 && hasCompletedWeeksForRecord) {
      // Use category totals as record for display (only after week 1 is fully complete)
      teamWins = totalCatWins
      teamLosses = totalCatLosses
      console.log('[teamsWithStats] ESPN category - using category totals as record for', team.name, ':', teamWins, '-', teamLosses)
    }
    
    let all_play_wins = 0
    let all_play_losses = 0
    let all_play_ties = 0
    
    if (isPointsLeague.value) {
      // For points leagues, calculate all-play week by week
      // For each week, compare this team's score against every other team's score
      
      // Get weekly scores for this team
      const teamWeeklyScores = espnWeeklyScores.value.get(team.team_key)
      
      if (teamWeeklyScores && teamWeeklyScores.size > 0) {
        // ESPN path: use espnWeeklyScores
        teamWeeklyScores.forEach((teamScore, week) => {
          // Compare against every other team for this week
          for (const opponent of leagueStore.yahooTeams) {
            if (opponent.team_key === team.team_key) continue
            const oppWeeklyScores = espnWeeklyScores.value.get(opponent.team_key)
            const oppScore = oppWeeklyScores?.get(week) || 0
            
            if (teamScore > oppScore) all_play_wins++
            else if (teamScore < oppScore) all_play_losses++
            else all_play_ties++
          }
        })
      } else {
        // Yahoo path: use weeklyMatchupResults which has points per week
        const teamMatchupResults = weeklyMatchupResults.value.get(team.team_key)
        
        if (teamMatchupResults && teamMatchupResults.size > 0) {
          // Build a map of week -> score for all teams first
          const allTeamScoresByWeek = new Map<string, Map<number, number>>()
          
          for (const t of leagueStore.yahooTeams) {
            const tResults = weeklyMatchupResults.value.get(t.team_key)
            if (tResults) {
              const scoreMap = new Map<number, number>()
              tResults.forEach((result, week) => {
                scoreMap.set(week, result.points || 0)
              })
              allTeamScoresByWeek.set(t.team_key, scoreMap)
            }
          }
          
          // Now calculate all-play using weekly scores
          const thisTeamScores = allTeamScoresByWeek.get(team.team_key)
          if (thisTeamScores) {
            thisTeamScores.forEach((teamScore, week) => {
              for (const opponent of leagueStore.yahooTeams) {
                if (opponent.team_key === team.team_key) continue
                const oppScores = allTeamScoresByWeek.get(opponent.team_key)
                const oppScore = oppScores?.get(week) || 0
                
                if (teamScore > oppScore) all_play_wins++
                else if (teamScore < oppScore) all_play_losses++
                else all_play_ties++
              }
            })
          }
        } else {
          // Fallback: estimate from total points (less accurate but better than nothing)
          // This gives "power ranking" style result based on season totals
          const teamPoints = teamPointsFor
          const weeksPlayed = teamWins + teamLosses + teamTies
          
          for (const opponent of leagueStore.yahooTeams) {
            if (opponent.team_key === team.team_key) continue
            const oppPoints = opponent.points_for || 0
            // Estimate weekly comparison based on average
            if (teamPoints > oppPoints) all_play_wins += weeksPlayed
            else if (teamPoints < oppPoints) all_play_losses += weeksPlayed
            else all_play_ties += weeksPlayed
          }
        }
      }
    } else {
      // For H2H Categories, use calculated wins/losses (matchup wins, not category wins)
      // Calculate all-play based on matchup win percentage
      const totalGames = teamWins + teamLosses + teamTies
      const weeksPlayed = totalGames || 1
      
      const matchupWinPct = teamWins / Math.max(1, totalGames)
      all_play_wins = Math.round(matchupWinPct * weeksPlayed * (numTeams - 1))
      all_play_losses = weeksPlayed * (numTeams - 1) - all_play_wins
    }
    
    // Calculate luck score based on all-play vs actual matchup wins
    const matchupWins = teamWins
    const matchupLosses = teamLosses
    const totalMatchups = matchupWins + matchupLosses
    const totalAllPlay = all_play_wins + all_play_losses + all_play_ties
    const expectedMatchupWinPct = totalAllPlay > 0 ? all_play_wins / totalAllPlay : 0.5
    const expectedMatchupWins = expectedMatchupWinPct * totalMatchups
    const luckScore = matchupWins - expectedMatchupWins
    
    // Use regular season rank from computed weeklyStandings (matches chart)
    // Falls back to Yahoo's rank if weeklyStandings hasn't loaded yet
    const regularSeasonRank = regularSeasonRanks.value.get(team.team_key) || team.rank || 999
    
    // Playoff finish: Use ACTUAL playoff/bracket results, not regular season rank
    // 1 = Champion (🏆), 2 = Runner-up (🥈), 3 = Third place (🥉)
    const playoffFinish = playoffFinishMap.value.get(team.team_key) || null
    
    return {
      ...team,
      // Override with calculated values (fixes ESPN category leagues with zero store data)
      wins: teamWins,
      losses: teamLosses,
      ties: teamTies,
      points_for: teamPointsFor,
      all_play_wins,
      all_play_losses,
      all_play_ties,
      transactions,
      categoryWins,
      totalCategoryWins: teamTotalCategoryWins.value.get(team.team_key) || 0,
      totalCategoryLosses: teamTotalCategoryLosses.value.get(team.team_key) || 0,
      luckScore,
      regularSeasonRank,
      playoffFinish
    }
  })
})

const sortedTeams = computed(() => {
  const teams = [...teamsWithStats.value]
  
  teams.sort((a, b) => {
    let aVal: number, bVal: number
    
    if (sortColumn.value === 'rank') {
      aVal = a.regularSeasonRank || 999
      bVal = b.regularSeasonRank || 999
    } else if (sortColumn.value === 'record') {
      // Multi-level sort: wins desc, losses asc, points_for desc
      const winDiff = (b.wins || 0) - (a.wins || 0)
      if (winDiff !== 0) {
        return sortDirection.value === 'desc' ? winDiff : -winDiff
      }
      const lossDiff = (a.losses || 0) - (b.losses || 0)
      if (lossDiff !== 0) {
        return sortDirection.value === 'desc' ? lossDiff : -lossDiff
      }
      const pfDiff = (b.points_for || 0) - (a.points_for || 0)
      return sortDirection.value === 'desc' ? pfDiff : -pfDiff
    } else if (sortColumn.value === 'allPlay') {
      aVal = a.all_play_wins / Math.max(1, a.all_play_wins + a.all_play_losses + (a.all_play_ties || 0))
      bVal = b.all_play_wins / Math.max(1, b.all_play_wins + b.all_play_losses + (b.all_play_ties || 0))
    } else if (sortColumn.value === 'pf') {
      aVal = isRotoMode.value ? (rotoPointsData.value[a.team_key] || a.points_for || 0) : (a.points_for || 0)
      bVal = isRotoMode.value ? (rotoPointsData.value[b.team_key] || b.points_for || 0) : (b.points_for || 0)
    } else if (sortColumn.value === 'pa') {
      aVal = a.points_against || 0
      bVal = b.points_against || 0
    } else if (sortColumn.value === 'catWins') {
      aVal = a.totalCategoryWins || 0
      bVal = b.totalCategoryWins || 0
    } else if (sortColumn.value === 'catLosses') {
      aVal = a.totalCategoryLosses || 0
      bVal = b.totalCategoryLosses || 0
    } else if (sortColumn.value.startsWith('cat_')) {
      const catId = sortColumn.value.replace('cat_', '')
      aVal = a.categoryWins?.[catId] || 0
      bVal = b.categoryWins?.[catId] || 0
    } else {
      // Default fallback uses regular season rank
      aVal = a.regularSeasonRank || 999
      bVal = b.regularSeasonRank || 999
    }
    
    return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
  })
  
  return teams
})

const defaultTeam = { name: 'N/A', logo_url: defaultAvatar, wins: 0, losses: 0, points_for: 0, all_play_wins: 0, all_play_losses: 0, all_play_ties: 0 }

// Calculate dominant wins per team (weeks with 0, 1, or 2 category losses)
const teamDominantWins = computed(() => {
  const result = new Map<string, number>()
  
  if (isPointsLeague.value) {
    return result
  }
  
  // Initialize all teams
  leagueStore.yahooTeams.forEach(team => result.set(team.team_key, 0))
  
  // METHOD 1: Use weeklyMatchupResults directly (most reliable - works for ESPN + Yahoo + Sleeper)
  // weeklyMatchupResults: team_key -> week -> { catWins, catLosses, opponent, won, tied }
  if (weeklyMatchupResults.value.size > 0) {
    for (const [teamKey, weekMap] of weeklyMatchupResults.value) {
      let dominantCount = 0
      for (const [, matchup] of weekMap) {
        // Dominant win = won the matchup with 0, 1, or 2 category losses
        const catLosses = matchup.catLosses || 0
        if (matchup.won && catLosses <= 2) {
          dominantCount++
        }
      }
      result.set(teamKey, dominantCount)
    }
    return result
  }
  
  // METHOD 2: Fallback to weeklyStandings differential (original approach for Yahoo)
  const standingsWeeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
  
  if (standingsWeeks.length < 2) {
    return result
  }
  
  // Find active weeks (where cumulative wins changed)
  const activeWeeks: number[] = []
  let prevTotalWins = -1
  
  for (const week of standingsWeeks) {
    const weekData = weeklyStandings.value.get(week)
    if (!weekData || weekData.length === 0) continue
    
    const totalWins = weekData.reduce((sum: number, t: any) => sum + (t.wins || 0), 0)
    
    if (prevTotalWins >= 0 && totalWins !== prevTotalWins) {
      activeWeeks.push(week)
    }
    prevTotalWins = totalWins
  }
  
  // For each active week, calculate weekly category losses and check if ≤2
  for (const week of activeWeeks) {
    const weekIdx = standingsWeeks.indexOf(week)
    if (weekIdx <= 0) continue
    
    const prevWeek = standingsWeeks[weekIdx - 1]
    const currentStandings = weeklyStandings.value.get(week)
    const prevStandings = weeklyStandings.value.get(prevWeek)
    
    leagueStore.yahooTeams.forEach(team => {
      const currentTeamData = currentStandings?.find((t: any) => t.team_key === team.team_key)
      const prevTeamData = prevStandings?.find((t: any) => t.team_key === team.team_key)
      
      const currentCumLosses = currentTeamData?.losses || 0
      const prevCumLosses = prevTeamData?.losses || 0
      
      const weeklyLosses = currentCumLosses - prevCumLosses
      
      // Dominant win = 0, 1, or 2 category losses that week
      if (weeklyLosses >= 0 && weeklyLosses <= 2) {
        result.set(team.team_key, (result.get(team.team_key) || 0) + 1)
      }
    })
  }
  
  return result
})

const leaders = computed(() => {
  const teams = teamsWithStats.value
  if (!teams || teams.length === 0) {
    return { bestRecord: defaultTeam, mostPoints: defaultTeam, mostCatWins: defaultTeam, bestAllPlay: defaultTeam, bestCatWinPct: defaultTeam, mostDominant: defaultTeam }
  }
  
  // If no weeks are complete yet, return empty leaders so cards don't show
  // stale/last-season data or fake simulated numbers
  const yahooLeagueDataL = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
  const currWeekL = parseInt(yahooLeagueDataL?.current_week) || 1
  if (!isSeasonComplete.value && currWeekL <= 1) {
    return { bestRecord: defaultTeam, mostPoints: defaultTeam, mostCatWins: defaultTeam, bestAllPlay: defaultTeam, bestCatWinPct: defaultTeam, mostDominant: defaultTeam }
  }
  
  const sortedByRecord = [...teams].sort((a, b) => {
    const aWinPct = (a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0))
    const bWinPct = (b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0))
    return bWinPct - aWinPct
  })
  
  const sortedByPoints = [...teams].sort((a, b) => (b.points_for || 0) - (a.points_for || 0))
  const sortedByCatWins = [...teams].sort((a, b) => (b.wins || 0) - (a.wins || 0))
  const sortedByAllPlay = [...teams].sort((a, b) => (b.all_play_wins || 0) - (a.all_play_wins || 0))
  
  // Category win percentage (totalCategoryWins / (totalCategoryWins + totalCategoryLosses))
  // Falls back to team.wins/losses if totalCategoryWins not available
  const sortedByCatWinPct = [...teams].sort((a, b) => {
    const aWins = a.totalCategoryWins || a.wins || 0
    const aLosses = a.totalCategoryLosses || a.losses || 0
    const bWins = b.totalCategoryWins || b.wins || 0
    const bLosses = b.totalCategoryLosses || b.losses || 0
    const aTotal = aWins + aLosses
    const bTotal = bWins + bLosses
    const aPct = aTotal > 0 ? aWins / aTotal : 0
    const bPct = bTotal > 0 ? bWins / bTotal : 0
    return bPct - aPct
  })
  
  // Most dominant wins (weeks with ≤2 category losses)
  const sortedByDominant = [...teams].sort((a, b) => {
    const aDom = teamDominantWins.value.get(a.team_key) || 0
    const bDom = teamDominantWins.value.get(b.team_key) || 0
    return bDom - aDom
  })
  
  return {
    bestRecord: sortedByRecord[0] || defaultTeam,
    mostPoints: sortedByPoints[0] || defaultTeam,
    mostCatWins: sortedByCatWins[0] || defaultTeam,
    bestAllPlay: sortedByAllPlay[0] || defaultTeam,
    bestCatWinPct: sortedByCatWinPct[0] || defaultTeam,
    mostDominant: sortedByDominant[0] || defaultTeam
  }
})

// Roto League Leaders: Most Categories Led
const rotoCategoryLeader = computed(() => {
  if (!isRotoMode.value) return null
  const teams = leagueStore.yahooTeams
  if (!teams || teams.length === 0) return null
  const numTeams = teams.length
  let bestTeam: any = null
  let bestCount = -1
  for (const team of teams) {
    const tk = team.team_key
    let leadCount = 0
    for (const [, pts] of Object.entries(perCategoryWinsData.value[tk] || {})) {
      if (pts >= numTeams) leadCount++ // pts === numTeams means 1st place in that category
    }
    if (leadCount > bestCount) {
      bestCount = leadCount
      bestTeam = team
    }
  }
  return bestTeam ? { ...bestTeam, count: bestCount } : null
})

// Roto League Leaders: Most Balanced (highest minimum ranking across all categories)
const rotoMostBalanced = computed(() => {
  if (!isRotoMode.value) return null
  const teams = leagueStore.yahooTeams
  if (!teams || teams.length === 0) return null
  let bestTeam: any = null
  let bestMin = -1
  for (const team of teams) {
    const tk = team.team_key
    const rankings = Object.values(perCategoryWinsData.value[tk] || {})
    if (rankings.length === 0) continue
    const minRank = Math.min(...rankings)
    if (minRank > bestMin) {
      bestMin = minRank
      bestTeam = team
    }
  }
  // Generate ordinal label for worst rank
  const worstRankLabel = bestMin > 0 ? getOrdinal(bestMin) : 'N/A'
  return bestTeam ? { ...bestTeam, worstRank: bestMin, worstRankLabel } : null
})

// Helper: ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinal(n: number): string {
  const rounded = Math.round(n)
  const s = ['th', 'st', 'nd', 'rd']
  const v = rounded % 100
  return rounded + (s[(v - 20) % 10] || s[v] || s[0])
}

// Leader Modal Data - Top 5 only
const leaderModalData = computed(() => {
  const teams = teamsWithStats.value
  let comparison: any[] = []
  let maxValue = 1
  
  if (leaderModalType.value === 'bestRecord') {
    // Best to worst (highest win % first)
    comparison = [...teams].sort((a, b) => {
      const aWinPct = (a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0))
      const bWinPct = (b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0))
      return bWinPct - aWinPct
    }).map(t => ({ ...t, value: (t.wins || 0) / Math.max(1, (t.wins || 0) + (t.losses || 0)) * 100 }))
    maxValue = 100
  } else if (leaderModalType.value === 'hottest') {
    // Hottest: points leagues = most points last 3 weeks, roto = most roto pts, category leagues = most cat wins
    if (isPointsLeague.value) {
      comparison = [...teams].sort((a, b) => {
        const aLast3 = last3WeeksPoints.value.get(a.team_key) || 0
        const bLast3 = last3WeeksPoints.value.get(b.team_key) || 0
        return bLast3 - aLast3
      }).map(t => ({ ...t, value: last3WeeksPoints.value.get(t.team_key) || 0 }))
      maxValue = Math.max(...teams.map(t => last3WeeksPoints.value.get(t.team_key) || 0), 1)
    } else if (isRotoMode.value) {
      comparison = [...teams].sort((a, b) => {
        const aRoto = rotoPointsData.value[a.team_key] || a.points_for || 0
        const bRoto = rotoPointsData.value[b.team_key] || b.points_for || 0
        return bRoto - aRoto
      }).map(t => ({ ...t, value: rotoPointsData.value[t.team_key] || t.points_for || 0 }))
      maxValue = Math.max(...teams.map(t => rotoPointsData.value[t.team_key] || t.points_for || 0), 1)
    } else {
      comparison = [...teams].sort((a, b) => {
        const aLast3 = last3WeeksWins.value.get(a.team_key) || 0
        const bLast3 = last3WeeksWins.value.get(b.team_key) || 0
        return bLast3 - aLast3
      }).map(t => ({ ...t, value: last3WeeksWins.value.get(t.team_key) || 0 }))
      maxValue = Math.max(...teams.map(t => last3WeeksWins.value.get(t.team_key) || 0), 1)
    }
  } else if (leaderModalType.value === 'coldest') {
    // Coldest: points leagues = fewest points last 3 weeks, roto = fewest roto pts, category leagues = fewest cat wins
    if (isPointsLeague.value) {
      comparison = [...teams].sort((a, b) => {
        const aLast3 = last3WeeksPoints.value.get(a.team_key) || 0
        const bLast3 = last3WeeksPoints.value.get(b.team_key) || 0
        return aLast3 - bLast3
      }).map(t => ({ ...t, value: last3WeeksPoints.value.get(t.team_key) || 0 }))
      maxValue = Math.max(...teams.map(t => last3WeeksPoints.value.get(t.team_key) || 0), 1)
    } else if (isRotoMode.value) {
      comparison = [...teams].sort((a, b) => {
        const aRoto = rotoPointsData.value[a.team_key] || a.points_for || 0
        const bRoto = rotoPointsData.value[b.team_key] || b.points_for || 0
        return aRoto - bRoto
      }).map(t => ({ ...t, value: rotoPointsData.value[t.team_key] || t.points_for || 0 }))
      maxValue = Math.max(...teams.map(t => rotoPointsData.value[t.team_key] || t.points_for || 0), 1)
    } else {
      comparison = [...teams].sort((a, b) => {
        const aLast3 = last3WeeksWins.value.get(a.team_key) || 0
        const bLast3 = last3WeeksWins.value.get(b.team_key) || 0
        return aLast3 - bLast3
      }).map(t => ({ ...t, value: last3WeeksWins.value.get(t.team_key) || 0 }))
      maxValue = Math.max(...teams.map(t => last3WeeksWins.value.get(t.team_key) || 0), 1)
    }
  } else if (leaderModalType.value === 'mostPoints') {
    // Most points (points leagues)
    comparison = [...teams].sort((a, b) => (b.points_for || 0) - (a.points_for || 0)).map(t => ({ ...t, value: t.points_for || 0 }))
    maxValue = Math.max(...teams.map(t => t.points_for || 0), 1)
  } else if (leaderModalType.value === 'bestCatWinPct') {
    // Best category win percentage (category leagues)
    // Falls back to team.wins/losses if totalCategoryWins not available
    comparison = [...teams].sort((a, b) => {
      const aWins = a.totalCategoryWins || a.wins || 0
      const aLosses = a.totalCategoryLosses || a.losses || 0
      const bWins = b.totalCategoryWins || b.wins || 0
      const bLosses = b.totalCategoryLosses || b.losses || 0
      const aTotal = aWins + aLosses
      const bTotal = bWins + bLosses
      const aPct = aTotal > 0 ? aWins / aTotal : 0
      const bPct = bTotal > 0 ? bWins / bTotal : 0
      return bPct - aPct
    }).map(t => {
      const wins = t.totalCategoryWins || t.wins || 0
      const losses = t.totalCategoryLosses || t.losses || 0
      const total = wins + losses
      const pct = total > 0 ? (wins / total) * 100 : 0
      return { ...t, value: pct }
    })
    maxValue = 100
  } else if (leaderModalType.value === 'mostDominant') {
    // Most dominant wins (weeks with ≤2 category losses)
    comparison = [...teams].sort((a, b) => {
      const aDom = teamDominantWins.value.get(a.team_key) || 0
      const bDom = teamDominantWins.value.get(b.team_key) || 0
      return bDom - aDom
    }).map(t => ({ ...t, value: teamDominantWins.value.get(t.team_key) || 0 }))
    maxValue = Math.max(...teams.map(t => teamDominantWins.value.get(t.team_key) || 0), 1)
  } else if (leaderModalType.value === 'bestAllPlay') {
    comparison = [...teams].sort((a, b) => (b.all_play_wins || 0) - (a.all_play_wins || 0)).map(t => ({ ...t, value: t.all_play_wins || 0 }))
    maxValue = Math.max(...teams.map(t => t.all_play_wins || 0), 1)
  } else if (leaderModalType.value === 'mostMoves') {
    // Most to fewest
    comparison = [...teams].sort((a, b) => (b.transactions || 0) - (a.transactions || 0)).map(t => ({ ...t, value: t.transactions || 0 }))
    maxValue = Math.max(...teams.map(t => t.transactions || 0), 1)
  } else if (leaderModalType.value === 'fewestMoves') {
    // Fewest to most
    comparison = [...teams].sort((a, b) => (a.transactions || 0) - (b.transactions || 0)).map(t => ({ ...t, value: t.transactions || 0 }))
    maxValue = Math.max(...teams.map(t => t.transactions || 0), 1)
  } else if (leaderModalType.value === 'rotoCategoryLeader') {
    // Roto: most categories led (rank = numTeams)
    const numTeams = leagueStore.yahooTeams.length
    comparison = [...teams].map(t => {
      let leadCount = 0
      for (const [, pts] of Object.entries(perCategoryWinsData.value[t.team_key] || {})) {
        if (pts >= numTeams) leadCount++
      }
      return { ...t, value: leadCount }
    }).sort((a, b) => b.value - a.value)
    maxValue = Math.max(...comparison.map(t => t.value), 1)
  } else if (leaderModalType.value === 'rotoMostBalanced') {
    // Roto: most balanced (highest minimum ranking)
    comparison = [...teams].map(t => {
      const rankings = Object.values(perCategoryWinsData.value[t.team_key] || {})
      const minRank = rankings.length > 0 ? Math.min(...rankings) : 0
      return { ...t, value: minRank }
    }).sort((a, b) => b.value - a.value)
    maxValue = Math.max(...comparison.map(t => t.value), 1)
  }

  // Show all teams (no limit)
  return { comparison, maxValue, leader: comparison[0] }
})

const leaderModalTitle = computed(() => {
  if (leaderModalType.value === 'bestRecord') return 'Best Record'
  if (leaderModalType.value === 'mostPoints') return 'Most Points'
  if (leaderModalType.value === 'bestCatWinPct') return 'Best Category Win %'
  if (leaderModalType.value === 'mostDominant') return 'Most Dominant Wins (≤2 cat losses)'
  if (leaderModalType.value === 'bestAllPlay') return 'Best All-Play Record'
  if (leaderModalType.value === 'luckiest') return '🍀 Luckiest Teams'
  if (leaderModalType.value === 'unluckiest') return '😢 Unluckiest Teams'
  if (leaderModalType.value === 'hottest') return '🔥 Hottest Teams'
  if (leaderModalType.value === 'coldest') return '❄️ Coldest Teams'
  if (leaderModalType.value === 'mostMoves') return '📈 Most Active Teams'
  if (leaderModalType.value === 'fewestMoves') return '🪨 Least Active Teams'
  if (leaderModalType.value === 'rotoCategoryLeader') return '👑 Most Categories Led'
  if (leaderModalType.value === 'rotoMostBalanced') return '⚖️ Most Balanced Teams'
  return ''
})

const leaderModalTextColor = computed(() => {
  if (leaderModalType.value === 'bestRecord' || leaderModalType.value === 'luckiest') return 'text-green-400'
  if (leaderModalType.value === 'mostPoints' || leaderModalType.value === 'bestCatWinPct' || leaderModalType.value === 'hottest' || leaderModalType.value === 'rotoMostBalanced') return 'text-yellow-400'
  if (leaderModalType.value === 'mostDominant' || leaderModalType.value === 'bestAllPlay' || leaderModalType.value === 'mostMoves') return 'text-blue-400'
  if (leaderModalType.value === 'unluckiest') return 'text-red-400'
  if (leaderModalType.value === 'coldest') return 'text-cyan-400'
  if (leaderModalType.value === 'fewestMoves') return 'text-purple-400'
  if (leaderModalType.value === 'rotoCategoryLeader') return 'text-green-400'
  return 'text-blue-400'
})

const leaderModalBarColor = computed(() => {
  if (leaderModalType.value === 'bestRecord' || leaderModalType.value === 'luckiest') return 'bg-green-500'
  if (leaderModalType.value === 'mostPoints' || leaderModalType.value === 'bestCatWinPct' || leaderModalType.value === 'hottest' || leaderModalType.value === 'rotoMostBalanced') return 'bg-yellow-500'
  if (leaderModalType.value === 'mostDominant' || leaderModalType.value === 'bestAllPlay' || leaderModalType.value === 'mostMoves') return 'bg-blue-500'
  if (leaderModalType.value === 'unluckiest') return 'bg-red-500'
  if (leaderModalType.value === 'coldest') return 'bg-cyan-500'
  if (leaderModalType.value === 'fewestMoves') return 'bg-purple-500'
  if (leaderModalType.value === 'rotoCategoryLeader') return 'bg-green-500'
  return 'bg-blue-500'
})

const leaderModalRingColor = computed(() => {
  if (leaderModalType.value === 'bestRecord' || leaderModalType.value === 'luckiest') return 'ring-green-500'
  if (leaderModalType.value === 'mostPoints' || leaderModalType.value === 'bestCatWinPct' || leaderModalType.value === 'hottest' || leaderModalType.value === 'rotoMostBalanced') return 'ring-yellow-500'
  if (leaderModalType.value === 'mostDominant' || leaderModalType.value === 'bestAllPlay' || leaderModalType.value === 'mostMoves') return 'ring-blue-500'
  if (leaderModalType.value === 'unluckiest') return 'ring-red-500'
  if (leaderModalType.value === 'coldest') return 'ring-cyan-500'
  if (leaderModalType.value === 'fewestMoves') return 'ring-purple-500'
  if (leaderModalType.value === 'rotoCategoryLeader') return 'ring-green-500'
  return 'ring-blue-500'
})

const leaderModalGradient = computed(() => {
  if (leaderModalType.value === 'bestRecord' || leaderModalType.value === 'luckiest') return 'bg-gradient-to-r from-green-500/10 to-transparent'
  if (leaderModalType.value === 'mostPoints' || leaderModalType.value === 'bestCatWinPct' || leaderModalType.value === 'hottest' || leaderModalType.value === 'rotoMostBalanced') return 'bg-gradient-to-r from-yellow-500/10 to-transparent'
  if (leaderModalType.value === 'mostDominant' || leaderModalType.value === 'bestAllPlay' || leaderModalType.value === 'mostMoves') return 'bg-gradient-to-r from-blue-500/10 to-transparent'
  if (leaderModalType.value === 'unluckiest') return 'bg-gradient-to-r from-red-500/10 to-transparent'
  if (leaderModalType.value === 'coldest') return 'bg-gradient-to-r from-cyan-500/10 to-transparent'
  if (leaderModalType.value === 'fewestMoves') return 'bg-gradient-to-r from-purple-500/10 to-transparent'
  if (leaderModalType.value === 'rotoCategoryLeader') return 'bg-gradient-to-r from-green-500/10 to-transparent'
  return 'bg-gradient-to-r from-blue-500/10 to-transparent'
})

const leaderModalValue = computed(() => {
  const leader = leaderModalData.value.leader
  if (!leader) return '0'
  if (leaderModalType.value === 'bestRecord') return getWinPercentage(leader)
  if (leaderModalType.value === 'hottest' || leaderModalType.value === 'coldest') {
    if (isPointsLeague.value) {
      return `${(last3WeeksPoints.value.get(leader.team_key) || 0).toFixed(1)}`
    }
    if (isRotoMode.value) {
      return `${(rotoPointsData.value[leader.team_key] || leader.points_for || 0).toFixed(1)}`
    }
    return `${last3WeeksWins.value.get(leader.team_key) || 0}`
  }
  if (leaderModalType.value === 'mostPoints') return leader.points_for?.toFixed(1) || '0'
  if (leaderModalType.value === 'bestCatWinPct') return getCatWinPct(leader) + '%'
  if (leaderModalType.value === 'mostDominant') return `${teamDominantWins.value.get(leader.team_key) || 0}`
  if (leaderModalType.value === 'bestAllPlay') return `${leader.all_play_wins || 0}-${leader.all_play_losses || 0}`
  if (leaderModalType.value === 'luckiest' || leaderModalType.value === 'unluckiest') return (leader.luckScore > 0 ? '+' : '') + (leader.luckScore || 0).toFixed(0)
  if (leaderModalType.value === 'mostMoves' || leaderModalType.value === 'fewestMoves') return leader.transactions?.toString() || '0'
  if (leaderModalType.value === 'rotoCategoryLeader') return `${leader.value || 0} categories`
  if (leaderModalType.value === 'rotoMostBalanced') return getOrdinal(leader.value || 0)
  return `${leader.all_play_wins || 0}-${leader.all_play_losses || 0}`
})

const leaderModalUnit = computed(() => {
  if (leaderModalType.value === 'bestRecord') return 'Win %'
  if (leaderModalType.value === 'hottest' || leaderModalType.value === 'coldest') return isPointsLeague.value ? 'Points (Last 3)' : isRotoMode.value ? 'Roto Points' : 'Cats (Last 3)'
  if (leaderModalType.value === 'mostPoints') return 'Total Points'
  if (leaderModalType.value === 'bestCatWinPct') return 'Category Win %'
  if (leaderModalType.value === 'mostDominant') return 'Dominant Weeks'
  if (leaderModalType.value === 'bestAllPlay') return 'All-Play Wins'
  if (leaderModalType.value === 'luckiest' || leaderModalType.value === 'unluckiest') return 'Luck Score'
  if (leaderModalType.value === 'mostMoves' || leaderModalType.value === 'fewestMoves') return 'Transactions'
  if (leaderModalType.value === 'rotoCategoryLeader') return 'Categories Led'
  if (leaderModalType.value === 'rotoMostBalanced') return 'Worst Category Rank'
  return 'All-Play Record'
})

// Quick stats show top 5, others show top 10
const leaderModalListLimit = computed(() => {
  const quickStatTypes = ['hottest', 'coldest', 'mostMoves', 'fewestMoves']
  return quickStatTypes.includes(leaderModalType.value) ? 5 : 10
})

const leaderModalListTitle = computed(() => {
  const quickStatTypes = ['hottest', 'coldest', 'mostMoves', 'fewestMoves']
  return quickStatTypes.includes(leaderModalType.value) ? 'Top 5' : 'Top Ten Comparison'
})

// Team Detail Modal Computed
const teamDetailAvgCatsPerWeek = computed(() => {
  if (!selectedTeamDetail.value) return '0.0'
  const totalCatWins = selectedTeamDetail.value.wins || 0
  const weeks = Array.from(weeklyStandings.value.keys()).length || 1
  return (totalCatWins / weeks).toFixed(1)
})

// Points League Team Detail Stats (for football-style view)
const pointsLeagueTeamDetailStats = computed(() => {
  if (!selectedTeamDetail.value) {
    return {
      ppg: '0.0',
      highScore: '0.0',
      lowScore: '0.0',
      totalPoints: '0.0',
      pointsAgainst: '0.0',
      pointDiff: '0.0',
      winStreak: 'N/A',
      weeklyResults: []
    }
  }
  
  const team = selectedTeamDetail.value
  const pointsFor = team.points_for || 0
  const pointsAgainst = team.points_against || 0
  const totalGames = (team.wins || 0) + (team.losses || 0)
  const ppg = totalGames > 0 ? (pointsFor / totalGames).toFixed(1) : '0.0'
  
  // Get weekly results from weeklyMatchupResults map - REAL DATA ONLY
  const teamMatchups = weeklyMatchupResults.value.get(team.team_key)
  const weeklyResults: { won: boolean; points: number; week: number }[] = []
  let highScore = 0
  let lowScore = Infinity
  let totalPointsAgainst = 0
  
  console.log(`[TeamDetailStats] Getting data for team: ${team.name} (${team.team_key})`)
  console.log(`[TeamDetailStats] weeklyMatchupResults has team: ${teamMatchups ? 'yes' : 'no'}, size: ${teamMatchups?.size || 0}`)
  
  if (teamMatchups && teamMatchups.size > 0) {
    // Sort weeks and build results array from REAL data
    const sortedWeeks = Array.from(teamMatchups.keys()).sort((a, b) => a - b)
    console.log(`[TeamDetailStats] Processing ${sortedWeeks.length} weeks of REAL matchup data`)
    
    sortedWeeks.forEach(week => {
      const result = teamMatchups.get(week)
      if (result) {
        const pts = result.points || 0
        weeklyResults.push({ won: result.won, points: pts, week })
        
        if (pts > highScore) highScore = pts
        if (pts > 0 && pts < lowScore) lowScore = pts
        // Handle both field names for backward compatibility with cached data
        totalPointsAgainst += result.opponentPoints || result.oppPoints || 0
      }
    })
    
    console.log(`[TeamDetailStats] Built ${weeklyResults.length} weekly results, sample:`, weeklyResults.slice(0, 3))
  } else if (espnWeeklyScores.value.size > 0) {
    // Fallback: Use espnWeeklyScores for points + weeklyStandings for W/L
    console.log(`[TeamDetailStats] Using espnWeeklyScores fallback for team ${team.name}`)
    const teamScores = espnWeeklyScores.value.get(team.team_key)
    
    if (teamScores && teamScores.size > 0) {
      // Build W/L from weeklyStandings cumulative wins
      const standingsWeeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
      const cumulativeWinsPerWeek = new Map<number, number>()
      for (const week of standingsWeeks) {
        const weekData = weeklyStandings.value.get(week)
        const teamStanding = weekData?.find((t: any) => t.team_key === team.team_key)
        if (teamStanding) cumulativeWinsPerWeek.set(week, teamStanding.wins || 0)
      }
      
      const sortedScoreWeeks = Array.from(teamScores.keys()).sort((a, b) => a - b)
      
      sortedScoreWeeks.forEach(week => {
        const pts = teamScores.get(week) || 0
        
        // Determine W/L from cumulative wins change
        const cumWins = cumulativeWinsPerWeek.get(week) || 0
        const prevWeekIdx = standingsWeeks.indexOf(week) - 1
        const prevCumWins = prevWeekIdx >= 0 ? (cumulativeWinsPerWeek.get(standingsWeeks[prevWeekIdx]) || 0) : 0
        const won = cumWins > prevCumWins
        
        weeklyResults.push({ won, points: pts, week })
        
        if (pts > highScore) highScore = pts
        if (pts > 0 && pts < lowScore) lowScore = pts
      })
      
      // Estimate points against from opponent scores
      // If we have all teams' scores, find the opponent for each week via scores comparison
      // Otherwise use the team's known points_against
      totalPointsAgainst = pointsAgainst
      
      console.log(`[TeamDetailStats] Built ${weeklyResults.length} weekly results from espnWeeklyScores`)
    }
  } else {
    console.warn(`[TeamDetailStats] No matchup data found for team ${team.team_key}`)
  }
  
  // Calculate streak from end (most recent first)
  let currentStreak = 0
  let streakType = ''
  for (let i = weeklyResults.length - 1; i >= 0; i--) {
    const result = weeklyResults[i]
    if (i === weeklyResults.length - 1) {
      streakType = result.won ? 'W' : 'L'
      currentStreak = 1
    } else if ((result.won && streakType === 'W') || (!result.won && streakType === 'L')) {
      currentStreak++
    } else {
      break
    }
  }
  
  // NO FAKE DATA - If we don't have real matchup data, show what we have from season totals
  // DO NOT generate random weekly scores - that's misleading to users
  if (weeklyResults.length === 0 && totalGames > 0) {
    console.warn('[TeamDetail] No real weekly matchup data available for team:', team.name)
    // Use season totals for high/low (not ideal but at least it's real data)
    highScore = pointsFor / totalGames * 1.15 // Estimate high as 15% above avg
    lowScore = pointsFor / totalGames * 0.85  // Estimate low as 15% below avg
    // Note: weeklyResults stays empty - chart will show "No data available"
  }
  
  if (lowScore === Infinity) lowScore = 0
  
  // Use actual points against if we calculated it, otherwise use team data
  const finalPointsAgainst = totalPointsAgainst > 0 ? totalPointsAgainst : pointsAgainst
  
  return {
    ppg,
    highScore: highScore.toFixed(1),
    lowScore: lowScore.toFixed(1),
    totalPoints: pointsFor.toFixed(1),
    pointsAgainst: finalPointsAgainst.toFixed(1),
    pointDiff: (pointsFor - finalPointsAgainst).toFixed(1),
    winStreak: currentStreak > 0 ? `${streakType}${currentStreak}` : '-',
    weeklyResults
  }
})

// Points League Team Detail Chart Options
const pointsLeagueTeamDetailChartOptions = computed(() => {
  const weeklyResults = pointsLeagueTeamDetailStats.value.weeklyResults
  if (weeklyResults.length === 0) return null
  
  // Build week labels - use real week numbers from matchup data
  let weekLabels = weeklyResults.map((_, i) => `Wk ${i + 1}`)
  if (selectedTeamDetail.value) {
    // Try weeklyMatchupResults first (Yahoo, Sleeper)
    const teamMatchups = weeklyMatchupResults.value.get(selectedTeamDetail.value.team_key)
    if (teamMatchups && teamMatchups.size > 0) {
      const sortedWeeks = Array.from(teamMatchups.keys()).sort((a, b) => a - b)
      weekLabels = sortedWeeks.map(w => `Wk ${w}`)
    } else if (espnWeeklyScores.value.size > 0) {
      // Fallback to espnWeeklyScores (ESPN)
      const teamScores = espnWeeklyScores.value.get(selectedTeamDetail.value.team_key)
      if (teamScores) {
        const sortedWeeks = Array.from(teamScores.keys()).sort((a, b) => a - b)
        weekLabels = sortedWeeks.map(w => `Wk ${w}`)
      }
    }
  }
  
  return {
    chart: {
      type: 'line',
      toolbar: { show: false },
      background: 'transparent',
      animations: { enabled: true, easing: 'easeinout', speed: 500 }
    },
    stroke: {
      curve: 'smooth',
      width: [3, 2],
      dashArray: [0, 5]
    },
    colors: ['#22c55e', '#6b7280'],
    xaxis: {
      categories: weekLabels,
      labels: { style: { colors: '#9ca3af', fontSize: '10px' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: { 
        style: { colors: '#9ca3af' },
        formatter: (val: number) => val.toFixed(0)
      }
    },
    grid: {
      borderColor: '#374151',
      strokeDashArray: 3
    },
    legend: {
      show: true,
      position: 'top',
      labels: { colors: '#9ca3af' }
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val: number) => val.toFixed(1) + ' pts' }
    }
  }
})

// Points League Team Detail Chart Series - Uses REAL data only
const pointsLeagueTeamDetailChartSeries = computed(() => {
  const weeklyResults = pointsLeagueTeamDetailStats.value.weeklyResults
  
  if (weeklyResults.length === 0) {
    console.warn('[Chart] No weekly results data available for points league chart')
    return []
  }
  
  // Verify we have actual points data (not zeros)
  const hasRealData = weeklyResults.some(r => r.points > 0)
  if (!hasRealData) {
    console.warn('[Chart] Weekly results exist but all points are 0 - possible data issue')
  }
  
  // Calculate weekly league averages from all teams' REAL matchup results
  const weeklyLeagueAvgs: number[] = []
  
  // Get actual week numbers from the selected team's matchup data
  // (weeks may not start at 1 - e.g., hockey starts at week 15)
  const selectedTeam = selectedTeamDetail.value
  let actualWeekNums: number[] = []
  
  if (selectedTeam) {
    const teamMatchups = weeklyMatchupResults.value.get(selectedTeam.team_key)
    if (teamMatchups && teamMatchups.size > 0) {
      actualWeekNums = Array.from(teamMatchups.keys()).sort((a, b) => a - b)
    }
  }
  
  // Fallback: collect all week numbers from espnWeeklyScores
  if (actualWeekNums.length === 0 && espnWeeklyScores.value.size > 0) {
    const allWeeks = new Set<number>()
    espnWeeklyScores.value.forEach(weekMap => weekMap.forEach((_, week) => allWeeks.add(week)))
    actualWeekNums = [...allWeeks].sort((a, b) => a - b)
  }
  
  // Fallback: generate sequential week numbers starting at 1
  if (actualWeekNums.length === 0) {
    actualWeekNums = weeklyResults.map((_, i) => i + 1)
  }
  
  for (let weekIdx = 0; weekIdx < weeklyResults.length; weekIdx++) {
    const weekNum = actualWeekNums[weekIdx] || (weekIdx + 1)
    let totalPoints = 0
    let teamCount = 0
    
    // Try weeklyMatchupResults first
    leagueStore.yahooTeams.forEach(team => {
      const teamMatchups = weeklyMatchupResults.value.get(team.team_key)
      if (teamMatchups) {
        const weekResult = teamMatchups.get(weekNum)
        if (weekResult && weekResult.points > 0) {
          totalPoints += weekResult.points
          teamCount++
        }
      }
    })
    
    // Fallback to espnWeeklyScores if no matchup data
    if (teamCount === 0 && espnWeeklyScores.value.size > 0) {
      // Find the actual week number (espnWeeklyScores uses real week numbers)
      const allWeeks = new Set<number>()
      espnWeeklyScores.value.forEach(weekMap => weekMap.forEach((_, week) => allWeeks.add(week)))
      const sortedWeeks = [...allWeeks].sort((a, b) => a - b)
      const actualWeek = sortedWeeks[weekIdx]
      
      if (actualWeek !== undefined) {
        espnWeeklyScores.value.forEach(weekMap => {
          const score = weekMap.get(actualWeek)
          if (score && score > 0) {
            totalPoints += score
            teamCount++
          }
        })
      }
    }
    
    // Calculate average for this week
    const weekAvg = teamCount > 0 ? totalPoints / teamCount : 0
    weeklyLeagueAvgs.push(parseFloat(weekAvg.toFixed(1)))
  }
  
  console.log(`[Chart] Built points chart with ${weeklyResults.length} weeks of REAL data`)
  
  return [
    {
      name: selectedTeamDetail.value?.name || 'Team',
      data: weeklyResults.map(r => parseFloat(r.points?.toFixed(1) || '0'))
    },
    {
      name: 'League Avg',
      data: weeklyLeagueAvgs
    }
  ]
})

const teamDetailCategories = computed(() => {
  if (!selectedTeamDetail.value || displayCategories.value.length === 0) return []
  
  const team = selectedTeamDetail.value
  const cats = displayCategories.value.map(cat => {
    const wins = team.categoryWins?.[cat.stat_id] || 0
    
    // Calculate rank for this category
    const allTeamWins = teamsWithStats.value.map(t => ({
      teamKey: t.team_key,
      wins: t.categoryWins?.[cat.stat_id] || 0
    })).sort((a, b) => b.wins - a.wins)
    
    const rank = allTeamWins.findIndex(t => t.teamKey === team.team_key) + 1
    const maxWins = Math.max(...allTeamWins.map(t => t.wins), 1)
    const pct = (wins / maxWins) * 100
    
    // Color classes based on rank
    let rankClass = 'bg-dark-border text-dark-textMuted'
    let valueClass = 'text-dark-text'
    let barClass = 'bg-dark-textMuted'
    
    const totalTeams = teamsWithStats.value.length
    if (rank <= Math.ceil(totalTeams * 0.25)) {
      rankClass = 'bg-green-500/20 text-green-400'
      valueClass = 'text-green-400'
      barClass = 'bg-green-500'
    } else if (rank <= Math.ceil(totalTeams * 0.5)) {
      rankClass = 'bg-cyan-500/20 text-cyan-400'
      valueClass = 'text-cyan-400'
      barClass = 'bg-cyan-500'
    } else if (rank > totalTeams - Math.ceil(totalTeams * 0.25)) {
      rankClass = 'bg-red-500/20 text-red-400'
      valueClass = 'text-red-400'
      barClass = 'bg-red-500'
    }
    
    return {
      ...cat,
      wins,
      rank,
      pct,
      rankClass,
      valueClass,
      barClass
    }
  })
  
  // Sort by wins descending (best categories first)
  return cats.sort((a, b) => b.wins - a.wins)
})

// Calculate last 3 weeks category wins for each team
const last3WeeksWins = computed(() => {
  const result = new Map<string, number>()
  
  console.log('[last3WeeksWins] Computing...')
  console.log('[last3WeeksWins] isPointsLeague:', isPointsLeague.value)
  console.log('[last3WeeksWins] platform:', leagueStore.activePlatform)
  console.log('[last3WeeksWins] weeklyMatchupResults size:', weeklyMatchupResults.value.size)
  
  // Initialize all teams with 0
  leagueStore.yahooTeams.forEach(team => result.set(team.team_key, 0))
  
  // METHOD 1: Use weeklyMatchupResults directly (most reliable - has catWins per week)
  // This works for ESPN, Yahoo, and Sleeper category leagues
  if (weeklyMatchupResults.value.size > 0) {
    // Get all weeks that have matchup data, sorted
    const matchupWeeks = Array.from(
      new Set([...weeklyMatchupResults.value.values()].flatMap(m => [...m.keys()]))
    ).sort((a, b) => a - b)
    
    const last3Weeks = matchupWeeks.slice(-3)
    console.log('[last3WeeksWins] Using weeklyMatchupResults - all weeks:', matchupWeeks, 'last 3:', last3Weeks)
    
    for (const [teamKey, weekMap] of weeklyMatchupResults.value) {
      let totalCatWins = 0
      
      for (const week of last3Weeks) {
        const matchup = weekMap.get(week)
        if (matchup) {
          if (isPointsLeague.value) {
            // Points league: count matchup wins
            if (matchup.won) totalCatWins++
          } else {
            // Category league: sum up category wins
            totalCatWins += matchup.catWins || 0
          }
        }
      }
      
      result.set(teamKey, totalCatWins)
    }
    
    console.log('[last3WeeksWins] Result from weeklyMatchupResults (first 3):', [...result.entries()].slice(0, 3))
    return result
  }
  
  // METHOD 2: Fallback to total category wins for ESPN category leagues without weekly data
  if (!isPointsLeague.value && leagueStore.activePlatform === 'espn') {
    console.log('[last3WeeksWins] ESPN category fallback - using total category wins')
    leagueStore.yahooTeams.forEach(team => {
      const totalCatWins = teamTotalCategoryWins.value.get(team.team_key) || 0
      result.set(team.team_key, totalCatWins)
    })
    console.log('[last3WeeksWins] ESPN fallback result:', [...result.entries()].slice(0, 3))
    return result
  }
  
  // METHOD 3: Fallback to weeklyStandings differential (original approach for Yahoo)
  const standingsWeeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
  console.log('[last3WeeksWins] Fallback to weeklyStandings - weeks:', standingsWeeks.length)
  
  if (standingsWeeks.length < 2) {
    console.log('[last3WeeksWins] Not enough standings weeks, returning zeros')
    return result
  }
  
  // For CATEGORY leagues: calculate weekly category wins from cumulative standings
  if (!isPointsLeague.value) {
    // Find weeks where cumulative wins actually changed (not playoff/inactive weeks)
    const activeWeeks: number[] = []
    let prevTotalWins = -1
    
    for (const week of standingsWeeks) {
      const weekData = weeklyStandings.value.get(week)
      if (!weekData || weekData.length === 0) continue
      
      const totalWins = weekData.reduce((sum: number, t: any) => sum + (t.wins || 0), 0)
      
      if (prevTotalWins >= 0 && totalWins !== prevTotalWins) {
        activeWeeks.push(week)
      }
      prevTotalWins = totalWins
    }
    
    console.log('[last3WeeksWins] Active weeks (where wins changed):', activeWeeks)
    
    const last3ActiveWeeks = activeWeeks.slice(-3)
    
    if (last3ActiveWeeks.length === 0) {
      console.log('[last3WeeksWins] No active weeks found, returning zeros')
      return result
    }
    
    console.log('[last3WeeksWins] Using last 3 active weeks:', last3ActiveWeeks)
    
    leagueStore.yahooTeams.forEach(team => {
      let totalCatWins = 0
      
      for (const week of last3ActiveWeeks) {
        const weekIdx = standingsWeeks.indexOf(week)
        if (weekIdx <= 0) continue
        
        const prevWeek = standingsWeeks[weekIdx - 1]
        const currentStandings = weeklyStandings.value.get(week)
        const prevStandings = weeklyStandings.value.get(prevWeek)
        
        const currentTeamData = currentStandings?.find((t: any) => t.team_key === team.team_key)
        const prevTeamData = prevStandings?.find((t: any) => t.team_key === team.team_key)
        
        const currentCumWins = currentTeamData?.wins || 0
        const prevCumWins = prevTeamData?.wins || 0
        
        totalCatWins += Math.max(0, currentCumWins - prevCumWins)
      }
      
      result.set(team.team_key, totalCatWins)
    })
    
    console.log('[last3WeeksWins] Category standings result (first 3):', [...result.entries()].slice(0, 3))
    return result
  }
  
  // For POINTS leagues without weeklyMatchupResults: use team records
  console.log('[last3WeeksWins] Points league fallback - no matchup data')
  return result
})

// Last 3 weeks POINTS scored (for points leagues hottest/coldest)
const last3WeeksPoints = computed(() => {
  const result = new Map<string, number>()
  
  // Initialize all teams with 0
  leagueStore.yahooTeams.forEach(team => result.set(team.team_key, 0))
  
  if (!isPointsLeague.value) return result
  
  // METHOD 1: Use weeklyMatchupResults (Yahoo/Sleeper - has .points per week)
  if (weeklyMatchupResults.value.size > 0) {
    const matchupWeeks = Array.from(
      new Set([...weeklyMatchupResults.value.values()].flatMap(m => [...m.keys()]))
    ).sort((a, b) => a - b)
    
    const last3Weeks = matchupWeeks.slice(-3)
    console.log('[last3WeeksPoints] Using weeklyMatchupResults - last 3 weeks:', last3Weeks)
    
    for (const [teamKey, weekMap] of weeklyMatchupResults.value) {
      let totalPoints = 0
      for (const week of last3Weeks) {
        const matchup = weekMap.get(week)
        if (matchup) {
          totalPoints += matchup.points || 0
        }
      }
      result.set(teamKey, totalPoints)
    }
    
    console.log('[last3WeeksPoints] Result (first 3):', [...result.entries()].slice(0, 3))
    return result
  }
  
  // METHOD 2: Use espnWeeklyScores (ESPN - has score per week)
  if (espnWeeklyScores.value.size > 0) {
    const allWeeks = new Set<number>()
    espnWeeklyScores.value.forEach(weekMap => weekMap.forEach((_, week) => allWeeks.add(week)))
    const sortedWeeks = [...allWeeks].sort((a, b) => a - b)
    const last3Weeks = sortedWeeks.slice(-3)
    console.log('[last3WeeksPoints] Using espnWeeklyScores - last 3 weeks:', last3Weeks)
    
    for (const [teamKey, weekMap] of espnWeeklyScores.value) {
      let totalPoints = 0
      for (const week of last3Weeks) {
        totalPoints += weekMap.get(week) || 0
      }
      result.set(teamKey, totalPoints)
    }
    
    console.log('[last3WeeksPoints] Result (first 3):', [...result.entries()].slice(0, 3))
    return result
  }
  
  console.log('[last3WeeksPoints] No weekly score data available from matchups/scores')
  
  // METHOD 3: Use weeklyStandings cumulative points_for (ESPN basketball fallback)
  // Derive weekly points by subtracting consecutive weeks' cumulative totals
  const standingsWeeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
  if (standingsWeeks.length >= 2) {
    console.log('[last3WeeksPoints] Using weeklyStandings cumulative points - weeks available:', standingsWeeks.length)
    
    // Get the last 4 weeks of standings (need N+1 to calculate N weeks of diffs)
    const relevantWeeks = standingsWeeks.slice(-4)
    
    leagueStore.yahooTeams.forEach(team => {
      let totalPoints = 0
      
      // Calculate points per week from cumulative differences
      for (let i = 1; i < relevantWeeks.length; i++) {
        const currentWeekData = weeklyStandings.value.get(relevantWeeks[i])
        const prevWeekData = weeklyStandings.value.get(relevantWeeks[i - 1])
        
        const currentTeam = currentWeekData?.find((t: any) => t.team_key === team.team_key)
        const prevTeam = prevWeekData?.find((t: any) => t.team_key === team.team_key)
        
        const weekPoints = (currentTeam?.points_for || 0) - (prevTeam?.points_for || 0)
        if (weekPoints > 0) totalPoints += weekPoints
      }
      
      result.set(team.team_key, totalPoints)
    })
    
    console.log('[last3WeeksPoints] Standings-derived result (first 3):', [...result.entries()].slice(0, 3).map(([k, v]) => [k, v.toFixed(1)]))
    return result
  }
  
  console.log('[last3WeeksPoints] No data available at all')
  return result
})

// ── Mobile chart windowing ────────────────────────────────────────────────
const MOBILE_WEEKS_VISIBLE = 6

const mobileChartLabel = computed(() => {
  const allWeeks = chartOptions.value?.xaxis?.categories || []
  const total = allWeeks.length
  if (total === 0) return ''
  const endIdx = total - chartWeekOffset.value
  const startIdx = Math.max(0, endIdx - MOBILE_WEEKS_VISIBLE)
  const start = allWeeks[startIdx] || ''
  const end = allWeeks[endIdx - 1] || ''
  return `${start} – ${end}`
})

const mobileChartSeries = computed(() => {
  if (!chartSeries.value.length || !chartOptions.value) return []
  const allWeeks = chartOptions.value?.xaxis?.categories || []
  const total = allWeeks.length
  const endIdx = total - chartWeekOffset.value
  const startIdx = Math.max(0, endIdx - MOBILE_WEEKS_VISIBLE)
  return chartSeries.value.map(s => ({
    ...s,
    data: (s.data || []).slice(startIdx, endIdx)
  }))
})

const mobileChartOptions = computed(() => {
  if (!chartOptions.value) return null
  const allWeeks = chartOptions.value?.xaxis?.categories || []
  const total = allWeeks.length
  const endIdx = total - chartWeekOffset.value
  const startIdx = Math.max(0, endIdx - MOBILE_WEEKS_VISIBLE)
  const visibleWeeks = allWeeks.slice(startIdx, endIdx)
  return {
    ...chartOptions.value,
    chart: { ...chartOptions.value.chart, toolbar: { show: false }, animations: { enabled: false } },
    xaxis: { ...chartOptions.value.xaxis, categories: visibleWeeks },
    legend: { show: false },
    yaxis: { ...chartOptions.value.yaxis, reversed: true, min: 1, max: sortedTeams.value.length }
  }
})

// Teams ordered by their rank at the END of the visible mobile window
const mobileChartTeamOrder = computed(() => {
  if (!chartSeries.value.length || !sortedTeams.value.length) return sortedTeams.value
  const allWeeks = chartOptions.value?.xaxis?.categories || []
  const total = allWeeks.length
  const endIdx = total - chartWeekOffset.value
  const lastVisibleIdx = Math.max(0, endIdx - 1)
  const rankAtEnd = chartSeries.value.map(s => ({
    name: s.name,
    rank: s.data?.[lastVisibleIdx] ?? 999
  }))
  return [...sortedTeams.value].sort((a, b) => {
    const ra = rankAtEnd.find(r => r.name === a.name)?.rank ?? 999
    const rb = rankAtEnd.find(r => r.name === b.name)?.rank ?? 999
    return ra - rb
  })
})

// Pagination helpers for chart dots
const mobileChartTotalPages = computed(() => {
  const total = chartOptions.value?.xaxis?.categories?.length || 0
  if (total <= MOBILE_WEEKS_VISIBLE) return 1
  const maxOffset = Math.max(0, total - MOBILE_WEEKS_VISIBLE)
  // Each step is MOBILE_WEEKS_VISIBLE wide; we always snap to multiples.
  // Total distinct pages = number of steps + 1 (for page at offset 0)
  return Math.ceil(maxOffset / MOBILE_WEEKS_VISIBLE) + 1
})
const mobileChartCurrentPage = computed(() => {
  // Dot 0 = oldest (max offset), last dot = latest (offset 0)
  const total = chartOptions.value?.xaxis?.categories?.length || 0
  const maxOffset = Math.max(0, total - MOBILE_WEEKS_VISIBLE)
  const maxStep = Math.ceil(maxOffset / MOBILE_WEEKS_VISIBLE)
  const currentStep = Math.round(chartWeekOffset.value / MOBILE_WEEKS_VISIBLE)
  return maxStep - currentStep  // invert so latest = last dot
})

// Quick Stats - without luckiest/unluckiest
const quickStats = computed(() => {
  const teams = teamsWithStats.value
  
  // For points leagues: hottest/coldest = most/fewest points in last 3 weeks
  // For category leagues: hottest/coldest = most/fewest cat wins in last 3 weeks
  if (isPointsLeague.value) {
    const teamsWithLast3 = teams.map(t => ({
      ...t,
      last3Points: last3WeeksPoints.value.get(t.team_key) || 0
    }))
    
    const hottest = [...teamsWithLast3].sort((a, b) => b.last3Points - a.last3Points)[0]
    const coldest = [...teamsWithLast3].sort((a, b) => a.last3Points - b.last3Points)[0]
    
    console.log('[quickStats] Points league - hottest:', hottest?.name, hottest?.last3Points.toFixed(1), 'pts | coldest:', coldest?.name, coldest?.last3Points.toFixed(1), 'pts')
    
    const mostActive = [...teams].sort((a, b) => (b.transactions || 0) - (a.transactions || 0))[0]
    const leastActive = [...teams].sort((a, b) => (a.transactions || 0) - (b.transactions || 0))[0]
    
    return [
      { icon: '🔥', label: 'Hottest', team: hottest, value: hottest ? `${hottest.last3Points.toFixed(1)} pts` : '-', valueClass: 'text-orange-400', type: 'hottest' },
      { icon: '❄️', label: 'Coldest', team: coldest, value: coldest ? `${coldest.last3Points.toFixed(1)} pts` : '-', valueClass: 'text-cyan-400', type: 'coldest' },
      { icon: '📈', label: 'Most Moves', team: mostActive, value: mostActive?.transactions?.toString() || '0', valueClass: 'text-blue-400', type: 'mostMoves' },
      { icon: '🪨', label: 'Fewest Moves', team: leastActive, value: leastActive?.transactions?.toString() || '0', valueClass: 'text-purple-400', type: 'fewestMoves' }
    ]
  }
  
  // Roto leagues: hottest/coldest = most/fewest total roto points
  // TODO: Weekly roto point snapshots would make this more accurate (show last 3 weeks change).
  // For now, use total roto points as the proxy since we skip matchup loading for roto leagues.
  if (isRotoMode.value) {
    const teamsWithRoto = teams.map(t => ({
      ...t,
      rotoPts: rotoPointsData.value[t.team_key] || t.points_for || 0,
      // Check for points_change from Yahoo standings (weekly change)
      ptsChange: (t as any).points_change ?? null
    }))

    // If points_change exists on any team, use it for hottest/coldest
    const hasPointsChange = teamsWithRoto.some(t => t.ptsChange !== null && t.ptsChange !== undefined)

    let hottest: typeof teamsWithRoto[0]
    let coldest: typeof teamsWithRoto[0]
    let hottestValue: string
    let coldestValue: string

    if (hasPointsChange) {
      hottest = [...teamsWithRoto].sort((a, b) => (b.ptsChange || 0) - (a.ptsChange || 0))[0]
      coldest = [...teamsWithRoto].sort((a, b) => (a.ptsChange || 0) - (b.ptsChange || 0))[0]
      hottestValue = hottest ? `+${hottest.ptsChange} pts change` : '-'
      coldestValue = coldest ? `${coldest.ptsChange} pts change` : '-'
    } else {
      hottest = [...teamsWithRoto].sort((a, b) => b.rotoPts - a.rotoPts)[0]
      coldest = [...teamsWithRoto].sort((a, b) => a.rotoPts - b.rotoPts)[0]
      hottestValue = hottest ? `${hottest.rotoPts.toFixed(1)} roto pts` : '-'
      coldestValue = coldest ? `${coldest.rotoPts.toFixed(1)} roto pts` : '-'
    }

    const mostActive = [...teams].sort((a, b) => (b.transactions || 0) - (a.transactions || 0))[0]
    const leastActive = [...teams].sort((a, b) => (a.transactions || 0) - (b.transactions || 0))[0]

    return [
      { icon: '🔥', label: 'Highest Roto Pts', team: hottest, value: hottestValue, valueClass: 'text-orange-400', type: 'hottest' },
      { icon: '❄️', label: 'Fewest Roto Pts', team: coldest, value: coldestValue, valueClass: 'text-cyan-400', type: 'coldest' },
      { icon: '📈', label: 'Most Moves', team: mostActive, value: mostActive?.transactions?.toString() || '0', valueClass: 'text-blue-400', type: 'mostMoves' },
      { icon: '🪨', label: 'Fewest Moves', team: leastActive, value: leastActive?.transactions?.toString() || '0', valueClass: 'text-purple-400', type: 'fewestMoves' }
    ]
  }

  // H2H Category leagues: use wins
  const teamsWithLast3 = teams.map(t => ({
    ...t,
    last3Wins: last3WeeksWins.value.get(t.team_key) || 0
  }))

  // Debug log
  if (teams.length > 0) {
    console.log('[quickStats] Category league - teams count:', teams.length)
    console.log('[quickStats] last3WeeksWins map size:', last3WeeksWins.value.size)
    console.log('[quickStats] Sample team last3Wins values:', teamsWithLast3.slice(0, 3).map(t => ({ name: t.name, last3Wins: t.last3Wins })))
  }

  const hottest = [...teamsWithLast3].sort((a, b) => b.last3Wins - a.last3Wins)[0]
  const coldest = [...teamsWithLast3].sort((a, b) => a.last3Wins - b.last3Wins)[0]

  const hasWeeklyData = weeklyMatchupResults.value.size > 0
  const winsLabel = hasWeeklyData ? 'cat wins' : 'total cat'

  console.log('[quickStats] RESULT - hottest:', hottest?.name, 'with', hottest?.last3Wins, winsLabel, '| coldest:', coldest?.name, 'with', coldest?.last3Wins, winsLabel)

  const mostActive = [...teams].sort((a, b) => (b.transactions || 0) - (a.transactions || 0))[0]
  const leastActive = [...teams].sort((a, b) => (a.transactions || 0) - (b.transactions || 0))[0]

  const stats = [
    { icon: '🔥', label: 'Hottest', team: hottest, value: hottest ? `${hottest.last3Wins} ${winsLabel}` : '-', valueClass: 'text-orange-400', type: 'hottest' },
    { icon: '❄️', label: 'Coldest', team: coldest, value: coldest ? `${coldest.last3Wins} ${winsLabel}` : '-', valueClass: 'text-cyan-400', type: 'coldest' },
    { icon: '📈', label: 'Most Moves', team: mostActive, value: mostActive?.transactions?.toString() || '0', valueClass: 'text-blue-400', type: 'mostMoves' },
    { icon: '🪨', label: 'Fewest Moves', team: leastActive, value: leastActive?.transactions?.toString() || '0', valueClass: 'text-purple-400', type: 'fewestMoves' }
  ]

  return stats
})

// Open quick stat modal - reuses the leader modal
function openQuickStatModal(type: string) {
  leaderModalType.value = type
  showLeaderModal.value = true
}

// Chart updated event handler
function onChartUpdated() {
  setTimeout(updateAvatarPositions, 100)
}

// Update avatar positions based on actual chart rendering
function updateAvatarPositions() {
  if (!apexChartRef.value?.chart) return
  
  const chart = apexChartRef.value.chart
  const weeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
  if (weeks.length === 0) return
  
  const lastWeek = weeks[weeks.length - 1]
  const lastDataPointIndex = weeks.length - 1
  
  const newPositions = new Map<string, { top: number, right: number }>()
  
  leagueStore.yahooTeams.forEach((team, seriesIndex) => {
    const weekData = weeklyStandings.value.get(lastWeek) || []
    const teamStanding = weekData.find((t: any) => t.team_key === team.team_key)
    const lastRank = teamStanding?.rank || leagueStore.yahooTeams.length
    
    // Get the actual Y position from ApexCharts
    try {
      const w = chart.w
      const yaxis = w.globals.yAxisScale[0]
      const plotHeight = w.globals.gridHeight
      const plotTop = w.globals.translateY
      
      // Calculate Y position - reversed axis means rank 1 is at top
      const totalTeams = leagueStore.yahooTeams.length
      const yPercent = (lastRank - 1) / Math.max(1, totalTeams - 1)
      const yPos = plotTop + (yPercent * plotHeight) - 12 // -12 to center 24px avatar
      
      // X position - right edge of plot
      const rightPadding = 8
      
      newPositions.set(team.team_key, { top: yPos, right: rightPadding })
    } catch (e) {
      // Fallback positioning
      const totalTeams = leagueStore.yahooTeams.length
      const yPercent = (lastRank - 1) / Math.max(1, totalTeams - 1)
      const yPos = 15 + (yPercent * 340) - 12
      newPositions.set(team.team_key, { top: yPos, right: 8 })
    }
  })
  
  avatarPositions.value = newPositions
}

// Get avatar style for a team
function getChartAvatarStyle(team: any): Record<string, string> {
  const pos = avatarPositions.value.get(team.team_key)
  if (pos) {
    return {
      top: `${pos.top}px`,
      right: `${pos.right}px`
    }
  }
  
  // Fallback: calculate position
  const weeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
  if (weeks.length === 0) return { display: 'none' }
  
  const lastWeek = weeks[weeks.length - 1]
  const weekData = weeklyStandings.value.get(lastWeek) || []
  const teamStanding = weekData.find((t: any) => t.team_key === team.team_key)
  const lastRank = teamStanding?.rank || sortedTeams.value.length
  
  const totalTeams = sortedTeams.value.length
  const yPercent = (lastRank - 1) / Math.max(1, totalTeams - 1)
  const yPos = 15 + (yPercent * 340) - 12
  
  return {
    top: `${yPos}px`,
    right: '8px'
  }
}

// Get color for team in standings chart (matches line colors)
function getStandingsTeamColor(team: any): string {
  const teamColors = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1', '#14B8A6', '#F43F5E']
  // Find the team's original index in yahooTeams array (this is how buildChart assigns colors)
  const originalIdx = leagueStore.yahooTeams.findIndex((t: any) => t.team_key === team.team_key)
  if (originalIdx === -1) return teamColors[0]
  // User's team gets yellow
  if (team.is_my_team) return '#F5C451'
  return teamColors[originalIdx % teamColors.length]
}

// Open team detail modal
function openTeamDetailModal(team: any) {
  selectedTeamDetail.value = team
  showTeamDetailModal.value = true
  
  // Build the weekly chart data
  buildTeamDetailChart(team)
  
  // Build weekly results
  buildTeamDetailWeeklyResults(team)
}

function buildTeamDetailChart(team: any) {
  const weeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
  if (weeks.length === 0) {
    teamDetailChartSeries.value = []
    teamDetailChartOptions.value = null
    return
  }
  
  // Get team's weekly matchup data
  const teamMatchups = weeklyMatchupResults.value.get(team.team_key)
  
  const teamWeeklyCatWins: number[] = []
  const opponentWeeklyCatWins: number[] = []
  
  weeks.forEach(week => {
    const matchup = teamMatchups?.get(week)
    if (matchup) {
      teamWeeklyCatWins.push(matchup.catWins || 0)
      opponentWeeklyCatWins.push(matchup.catLosses || 0) // catLosses = opponent's wins
    } else {
      // Fallback: estimate from totals
      const avgPerWeek = (team.wins || 0) / weeks.length
      teamWeeklyCatWins.push(avgPerWeek)
      opponentWeeklyCatWins.push(avgPerWeek)
    }
  })
  
  teamDetailChartSeries.value = [
    { name: 'Your Cats Won', data: teamWeeklyCatWins },
    { name: 'Opponent Cats Won', data: opponentWeeklyCatWins }
  ]
  
  teamDetailChartOptions.value = {
    chart: { type: 'line', background: 'transparent', toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { curve: 'smooth', width: [3, 3] },
    colors: ['#22c55e', '#ef4444'], // Green for team, Red for opponent
    markers: { size: [5, 5] },
    xaxis: {
      categories: weeks.map(w => `Wk ${w}`),
      labels: { style: { colors: '#9CA3AF', fontSize: '10px' } }
    },
    yaxis: {
      min: 0,
      labels: { style: { colors: '#9CA3AF', fontSize: '10px' }, formatter: (val: number) => val.toFixed(0) }
    },
    grid: { borderColor: '#374151', strokeDashArray: 3 },
    legend: { show: true, position: 'top', horizontalAlign: 'right', labels: { colors: '#9CA3AF' } },
    tooltip: { 
      theme: 'dark',
      y: { formatter: (val: number) => `${val} categories` }
    }
  }
}

function buildTeamDetailWeeklyResults(team: any) {
  const weeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
  const teamMatchups = weeklyMatchupResults.value.get(team.team_key)
  
  const results: any[] = []
  
  weeks.forEach(week => {
    const matchup = teamMatchups?.get(week)
    if (matchup) {
      results.push({
        won: matchup.won,
        tied: matchup.tied,
        catWins: matchup.catWins || 0,
        catLosses: matchup.catLosses || 0,
        opponent: matchup.opponentName || 'Unknown'
      })
    } else {
      // No data available
      results.push({
        won: false,
        tied: false,
        catWins: 0,
        catLosses: 0,
        opponent: 'Unknown'
      })
    }
  })
  
  teamDetailWeeklyResults.value = results
}

// Helper functions
function getTeamRecord(teamKey: string | undefined) {
  if (!teamKey) return '0-0'
  const team = leagueStore.yahooTeams.find(t => t.team_key === teamKey)
  if (!team) return '0-0'
  return `${team.wins || 0}-${team.losses || 0}${team.ties > 0 ? `-${team.ties}` : ''}`
}

function getWinPercentage(team: any) {
  const total = (team.wins || 0) + (team.losses || 0)
  if (total === 0) return '0%'
  return ((team.wins / total) * 100).toFixed(0) + '%'
}

function getCatWinPct(team: any) {
  // Try totalCategoryWins first, fallback to regular wins (which are category wins for category leagues)
  const catWins = team?.totalCategoryWins || team?.wins || 0
  const catLosses = team?.totalCategoryLosses || team?.losses || 0
  const total = catWins + catLosses
  if (total === 0) return '0'
  return ((catWins / total) * 100).toFixed(1)
}

function getMatchupScoreClass(matchup: any, teamIndex: number) {
  const t1 = matchup.team1_cat_wins || 0
  const t2 = matchup.team2_cat_wins || 0
  if (teamIndex === 0) {
    if (t1 > t2) return 'text-green-400'
    if (t1 < t2) return 'text-red-400'
  } else {
    if (t2 > t1) return 'text-green-400'
    if (t2 < t1) return 'text-red-400'
  }
  return 'text-dark-text'
}

function getAverageCategoryWins(catId: string): number {
  const teams = teamsWithStats.value
  if (teams.length === 0) return 0
  const total = teams.reduce((sum, t) => sum + (t.categoryWins?.[catId] || 0), 0)
  return total / teams.length
}

function setSortColumn(col: string) {
  if (sortColumn.value === col) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = col
    sortDirection.value = col === 'rank' ? 'asc' : 'desc'
  }
}

function getRankClass(rank: number) {
  if (rank === 1) return 'bg-yellow-500/20 text-yellow-400'
  if (rank === 2) return 'bg-gray-400/20 text-gray-300'
  if (rank === 3) return 'bg-orange-600/20 text-orange-400'
  return 'bg-dark-border text-dark-textMuted'
}

function getRecordClass(team: any) {
  const teams = teamsWithStats.value
  if (!teams || teams.length === 0) return 'text-dark-text'
  
  // Sort by win percentage
  const sorted = [...teams].sort((a, b) => {
    const aWinPct = (a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0))
    const bWinPct = (b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0))
    return bWinPct - aWinPct
  })
  
  if (team.team_key === sorted[0]?.team_key) return 'text-green-400'
  if (team.team_key === sorted[sorted.length - 1]?.team_key) return 'text-red-400'
  return 'text-dark-text'
}

function getAllPlayClass(team: any) {
  const teams = teamsWithStats.value
  if (!teams || teams.length === 0) return 'text-dark-textMuted'
  
  // Sort by all-play win percentage
  const sorted = [...teams].sort((a, b) => {
    const aWinPct = a.all_play_wins / Math.max(1, a.all_play_wins + a.all_play_losses + (a.all_play_ties || 0))
    const bWinPct = b.all_play_wins / Math.max(1, b.all_play_wins + b.all_play_losses + (b.all_play_ties || 0))
    return bWinPct - aWinPct
  })
  
  if (team.team_key === sorted[0]?.team_key) return 'text-green-400'
  if (team.team_key === sorted[sorted.length - 1]?.team_key) return 'text-red-400'
  return 'text-dark-textMuted'
}

function getPointsForClass(team: any) {
  const teams = teamsWithStats.value
  if (!teams || teams.length === 0) return 'text-dark-text'
  
  // Sort by points for (highest first)
  const sorted = [...teams].sort((a, b) => (b.points_for || 0) - (a.points_for || 0))
  
  if (team.team_key === sorted[0]?.team_key) return 'text-green-400'
  if (team.team_key === sorted[sorted.length - 1]?.team_key) return 'text-red-400'
  return 'text-dark-text'
}

function getPointsAgainstClass(team: any) {
  const teams = teamsWithStats.value
  if (!teams || teams.length === 0) return 'text-dark-textMuted'
  
  // Sort by points against (lowest first is best)
  const sorted = [...teams].sort((a, b) => (a.points_against || 0) - (b.points_against || 0))
  
  if (team.team_key === sorted[0]?.team_key) return 'text-green-400'
  if (team.team_key === sorted[sorted.length - 1]?.team_key) return 'text-red-400'
  return 'text-dark-textMuted'
}

function getRotoRankClass(points: number) {
  const n = leagueStore.yahooTeams?.length || 12
  if (points >= n - 1) return 'text-green-400' // top 2
  if (points >= n - 3) return 'text-green-300' // top 4
  if (points <= 2) return 'text-red-400' // bottom 2
  if (points <= 4) return 'text-red-300' // bottom 4
  return 'text-gray-300'
}

// Roto team detail modal helpers
function getRotoBalanceScore(teamKey: string) {
  const rankings = Object.values(perCategoryWinsData.value[teamKey] || {}) as number[]
  if (rankings.length === 0) return '—'
  const mean = rankings.reduce((a, b) => a + b, 0) / rankings.length
  const variance = rankings.reduce((sum, r) => sum + (r - mean) ** 2, 0) / rankings.length
  const stdDev = Math.sqrt(variance)
  const n = leagueStore.yahooTeams?.length || 12
  const maxStdDev = (n - 1) / 2
  const score = Math.max(0, Math.round(100 - (stdDev / maxStdDev * 100)))
  return score.toString()
}
function getRotoBalanceClass(teamKey: string) {
  const score = parseInt(getRotoBalanceScore(teamKey))
  if (isNaN(score)) return 'text-gray-400'
  if (score >= 70) return 'text-green-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400'
}
function getRotoRankBadgeClass(points: number) {
  const n = leagueStore.yahooTeams?.length || 12
  if (points >= n - 1) return 'bg-green-500/20 text-green-400'
  if (points >= n - 3) return 'bg-green-500/10 text-green-300'
  if (points <= 2) return 'bg-red-500/20 text-red-400'
  if (points <= 4) return 'bg-red-500/10 text-red-300'
  return 'bg-dark-border/30 text-dark-textMuted'
}
function getRotoRankValueClass(points: number) {
  const n = leagueStore.yahooTeams?.length || 12
  if (points >= n - 1) return 'text-green-400'
  if (points >= n - 3) return 'text-green-300'
  if (points <= 2) return 'text-red-400'
  if (points <= 4) return 'text-red-300'
  return 'text-dark-text'
}
function getRotoRankBarClass(points: number) {
  const n = leagueStore.yahooTeams?.length || 12
  if (points >= n - 1) return 'bg-green-500'
  if (points >= n - 3) return 'bg-green-400'
  if (points <= 2) return 'bg-red-500'
  if (points <= 4) return 'bg-red-400'
  return 'bg-yellow-500'
}
function formatRotoRankLabel(points: number) {
  const n = leagueStore.yahooTeams?.length || 12
  const rank = n - Math.round(points) + 1
  if (rank <= 0 || rank > n) return `#${Math.round(points)}`
  const suffix = rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'
  return `#${rank}${suffix}`
}
function formatRotoPoints(points: number) {
  return points % 1 === 0 ? points.toString() : points.toFixed(1)
}

function getCategoryWinClass(wins: number, catId: string) {
  // Find the max and min values for this category across all teams
  const teams = teamsWithStats.value
  if (!teams || teams.length === 0) return 'text-dark-text'
  
  let maxWins = -Infinity
  let minWins = Infinity
  
  for (const team of teams) {
    const teamWins = team.categoryWins?.[catId] || 0
    if (teamWins > maxWins) maxWins = teamWins
    if (teamWins < minWins) minWins = teamWins
  }
  
  // Only highlight the single best (green) and worst (red) values
  if (wins === maxWins && maxWins > minWins) return 'text-green-400'
  if (wins === minWins && minWins < maxWins) return 'text-red-400'
  return 'text-dark-text'
}

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  const originalSrc = img.src
  // Prevent infinite loop - only try fallback once per image
  if (erroredImages.has(originalSrc)) {
    return // Already tried fallback for this image
  }
  erroredImages.add(originalSrc)
  // Add to reactive set so Vue re-renders with fallback
  brokenLogos.value = new Set([...brokenLogos.value, originalSrc])
  img.src = defaultAvatar.value
}
function openLeaderModal(type: string) { leaderModalType.value = type; showLeaderModal.value = true }
function closeLeaderModal() { showLeaderModal.value = false }
function formatLeaderValue(value: number) {
  if (leaderModalType.value === 'bestRecord') return value.toFixed(0) + '%'
  if (leaderModalType.value === 'bestCatWinPct') return value.toFixed(2) + '%'
  if (leaderModalType.value === 'hottest' || leaderModalType.value === 'coldest') return isPointsLeague.value ? value.toFixed(1) : isRotoMode.value ? value.toFixed(1) : Math.round(value).toString()
  if (leaderModalType.value === 'mostCatWins' && !isPointsLeague.value) return value + ' wins'
  if (leaderModalType.value === 'mostCatWins' && isPointsLeague.value) return value.toFixed(1)
  if (leaderModalType.value === 'mostDominant') return value + ' weeks'
  if (leaderModalType.value === 'mostPoints' || leaderModalType.value === 'fewestPoints') return value.toFixed(2)
  if (leaderModalType.value === 'rotoCategoryLeader') return Math.round(value).toString()
  if (leaderModalType.value === 'rotoMostBalanced') return getOrdinal(value)
  // Default: cap at 2 decimal places
  return Number.isInteger(value) ? value.toString() : value.toFixed(2)
}

// Distribute total category wins proportionally across categories
async function distributeCategoryWins() {
  const catWins = new Map<string, Record<string, number>>()

  // Initialize all teams with zero wins per category
  for (const team of leagueStore.yahooTeams) {
    catWins.set(team.team_key, {})
  }

  // For Yahoo category leagues, fetch all completed weeks and aggregate stat_winners
  // leagueStore.yahooMatchups only has the current (in-progress) week
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey || !leagueKey.includes('.l.')) {
    teamCategoryWins.value = catWins
    return
  }

  const yahooLeagueArr = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
  const currWeek = parseInt(yahooLeagueArr?.current_week) || currentWeek.value || 1
  const completedWeeks = Math.max(0, currWeek - 1)

  if (completedWeeks === 0) {
    teamCategoryWins.value = catWins
    return
  }

  try {
    for (let week = 1; week <= completedWeeks; week++) {
      const weekMatchups = await yahooService.getCategoryMatchups(leagueKey, week)
      for (const matchup of weekMatchups) {
        if (!matchup.stat_winners?.length) continue
        const t1Key = matchup.teams?.[0]?.team_key
        const t2Key = matchup.teams?.[1]?.team_key
        if (!t1Key || !t2Key) continue

        for (const sw of matchup.stat_winners) {
          if (sw.is_tied === true || sw.is_tied === '1') continue
          const statId = String(sw.stat_id)
          const winnerKey = sw.winner_team_key
          if (!winnerKey) continue

          const w = catWins.get(winnerKey) || {}
          w[statId] = (w[statId] || 0) + 1
          catWins.set(winnerKey, w)
        }
      }
    }
  } catch (e) {
    console.warn('[distributeCategoryWins] Error fetching Yahoo category matchups:', e)
  }

  teamCategoryWins.value = catWins
}

// Build standings chart from weekly data
function buildChart() {
  const weeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
  if (weeks.length < 2) {
    chartSeries.value = []
    return
  }
  
  const teamColors = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1', '#14B8A6', '#F43F5E']
  
  // Get the index of the hovered team
  const hoveredIdx = standingsHoveredTeamKey.value 
    ? leagueStore.yahooTeams.findIndex((t: any) => t.team_key === standingsHoveredTeamKey.value)
    : -1
  
  // Get colors for each team - faded when another team is hovered
  const colors = leagueStore.yahooTeams.map((team: any, idx: number) => {
    const baseColor = team.is_my_team ? '#F5C451' : teamColors[idx % teamColors.length]
    // If someone is hovered and it's not this team, fade it
    if (hoveredIdx !== -1 && idx !== hoveredIdx) {
      // Convert hex to rgba with low opacity
      const r = parseInt(baseColor.slice(1, 3), 16)
      const g = parseInt(baseColor.slice(3, 5), 16)
      const b = parseInt(baseColor.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, 0.2)`
    }
    return baseColor
  })
  
  // Stroke widths - hovered line is thicker
  const strokeWidths = leagueStore.yahooTeams.map((_: any, idx: number) => {
    if (hoveredIdx === -1) return 2  // No hover, all same
    return idx === hoveredIdx ? 3 : 2
  })
  
  // Marker sizes - only show markers for hovered team
  const markerSizes = leagueStore.yahooTeams.map((_: any, idx: number) => {
    if (hoveredIdx === -1) return 0  // No hover, no markers
    return idx === hoveredIdx ? 12 : 0  // Only hovered team shows markers
  })
  
  const series = leagueStore.yahooTeams.map((team: any, idx: number) => {
    const data = weeks.map(week => {
      const weekData = weeklyStandings.value.get(week) || []
      const teamStanding = weekData.find((t: any) => t.team_key === team.team_key)
      return teamStanding?.rank || leagueStore.yahooTeams.length
    })
    
    return { name: team.name, data, color: colors[idx] }
  })
  
  chartSeries.value = series
  
  chartOptions.value = {
    chart: { 
      type: 'line', 
      background: 'transparent', 
      toolbar: { show: false }, 
      zoom: { enabled: false }, 
      animations: { enabled: false },
      events: {
        mounted: () => setTimeout(updateAvatarPositions, 100),
        updated: () => setTimeout(updateAvatarPositions, 100)
      }
    },
    colors: colors,
    stroke: { curve: 'smooth', width: strokeWidths },
    markers: { 
      size: markerSizes,
      strokeWidth: 0,
      hover: { size: 0 }
    },
    dataLabels: {
      enabled: hoveredIdx !== -1,
      enabledOnSeries: hoveredIdx !== -1 ? [hoveredIdx] : [],
      formatter: function(val: number) {
        // Just show the rank number (val is the rank from the series data)
        return val.toString()
      },
      style: {
        fontSize: '11px',
        fontWeight: 'bold',
        colors: ['#fff']
      },
      background: {
        enabled: false
      },
      offsetY: 0
    },
    xaxis: {
      categories: weeks.map(w => `Wk ${w}`),
      labels: { style: { colors: '#9CA3AF', fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      reversed: true,
      min: 1,
      max: leagueStore.yahooTeams.length,
      tickAmount: leagueStore.yahooTeams.length - 1,
      forceNiceScale: false,
      labels: { style: { colors: '#9CA3AF', fontSize: '11px' }, formatter: (val: number) => Math.round(val).toString() }
    },
    grid: { borderColor: '#374151', strokeDashArray: 3, padding: { right: 50 } },
    legend: { show: false },
    tooltip: { enabled: false }  // Disable tooltip since we show markers with labels
  }
}

// Shared image loading helpers for download functions (CORS-friendly)
// Pre-cache: stores base64 images keyed by URL so downloads don't need to re-fetch
const teamImageCache = new Map<string, string>()

function createTeamPlaceholder(teamName: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const colors = ['#0D8ABC', '#3498DB', '#9B59B6', '#E91E63', '#F39C12', '#1ABC9C', '#2ECC71', '#E74C3C', '#00BCD4', '#8E44AD']
    const colorIndex = teamName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    ctx.fillStyle = colors[colorIndex]
    ctx.beginPath()
    ctx.arc(32, 32, 32, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(teamName.charAt(0).toUpperCase(), 32, 34)
  }
  return canvas.toDataURL('image/png')
}

function drawCircularImage(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.beginPath()
    ctx.arc(32, 32, 32, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(img, 0, 0, 64, 64)
  }
  return canvas.toDataURL('image/png')
}

// Pre-cache all team images in background (called after data loads)
async function preCacheTeamImages(teams: any[]) {
  console.log(`[Image Cache] Pre-caching ${teams.length} team images...`)
  const failedTeams: any[] = []
  
  for (const team of teams) {
    if (!team.logo_url || teamImageCache.has(team.logo_url)) continue
    try {
      const base64 = await loadSingleTeamImage(team.logo_url, team.name)
      // Check if we got a real image or a placeholder
      if (base64 && !base64.includes('createTeamPlaceholder') && base64.length > 500) {
        teamImageCache.set(team.logo_url, base64)
      } else {
        teamImageCache.set(team.logo_url, base64)
        failedTeams.push(team)
      }
    } catch {
      failedTeams.push(team)
    }
    await new Promise(r => setTimeout(r, 100))
  }
  
  // Retry failed teams after a delay (CORS proxies may have been rate-limited)
  if (failedTeams.length > 0) {
    console.log(`[Image Cache] Retrying ${failedTeams.length} failed images after delay...`)
    await new Promise(r => setTimeout(r, 2000))
    for (const team of failedTeams) {
      try {
        const base64 = await loadSingleTeamImage(team.logo_url, team.name)
        teamImageCache.set(team.logo_url, base64)
      } catch { /* give up */ }
      await new Promise(r => setTimeout(r, 300))
    }
  }
  
  console.log(`[Image Cache] Cached ${teamImageCache.size} team images`)
}

// Core image loading - single image via our own Vercel proxy (no CORS issues)
async function loadSingleTeamImage(logoUrl: string, teamName: string): Promise<string> {
  const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve('')
      reader.readAsDataURL(blob)
    })
  }

  const dataUrlToCircular = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        try { resolve(drawCircularImage(img)) } catch { resolve('') }
      }
      img.onerror = () => resolve('')
      img.src = dataUrl
    })
  }

  const tryFetch = async (url: string, label: string): Promise<string> => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!response.ok) return ''
      const blob = await response.blob()
      if (blob.size < 100) return ''
      const dataUrl = await blobToDataUrl(blob)
      if (!dataUrl?.startsWith('data:')) return ''
      const result = await dataUrlToCircular(dataUrl)
      if (result) console.log(`[Download] ${teamName}: ✓ ${label}`)
      return result
    } catch { return '' }
  }

  // Method 1: Our own Vercel serverless proxy (same-origin, no CORS, reliable)
  const ownProxy = `/api/proxy-image?url=${encodeURIComponent(logoUrl)}`
  const proxyResult = await tryFetch(ownProxy, 'own proxy')
  if (proxyResult) return proxyResult

  // Method 2: Direct fetch (works for some CDNs that allow CORS)
  const directResult = await tryFetch(logoUrl, 'direct fetch')
  if (directResult) return directResult

  // Method 3: img tag with crossOrigin (works if browser already cached it)
  const imgTagResult = await new Promise<string>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { try { resolve(drawCircularImage(img)) } catch { resolve('') } }
    img.onerror = () => resolve('')
    img.src = logoUrl
    setTimeout(() => resolve(''), 3000)
  })
  if (imgTagResult) {
    console.log(`[Download] ${teamName}: ✓ img tag`)
    return imgTagResult
  }

  console.log(`[Download] ${teamName}: all methods failed, using placeholder`)
  return createTeamPlaceholder(teamName)
}

async function loadTeamImageCORS(team: any): Promise<string> {
  if (!team.logo_url) return createTeamPlaceholder(team.name)
  
  // Check cache first
  const cached = teamImageCache.get(team.logo_url)
  if (cached) {
    console.log(`[Image] ${team.name}: loaded from cache`)
    return cached
  }
  
  // Not cached, load and cache it
  const result = await loadSingleTeamImage(team.logo_url, team.name)
  teamImageCache.set(team.logo_url, result)
  console.log(`[Image] ${team.name}: loaded and cached`)
  return result
}

// Download standings as shareable image
async function downloadStandings() {
  trackCardShare({ dashboard_type: 'standings_card' })
  isGeneratingDownload.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    
    // Team colors for chart
    const teamColors = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1', '#14B8A6', '#F43F5E']
    const getTeamColor = (idx: number) => teamColors[idx % teamColors.length]
    
    // Helper to load logo (same as header)
    const loadLogo = async (): Promise<string> => {
      try {
        const response = await fetch('/UFD_V8.png')
        const blob = await response.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => resolve('')
          reader.readAsDataURL(blob)
        })
      } catch (e) {
        console.warn('Failed to load logo:', e)
        return ''
      }
    }
    
    // Use shared helpers
    const createPlaceholder = createTeamPlaceholder
    const loadTeamImage = loadTeamImageCORS
    
    const logoBase64 = await loadLogo()
    
    // Pre-load all team images SEQUENTIALLY (parallel can throttle/drop some)
    console.log('[Download Standings] Loading team images...')
    const imageMap = new Map<string, string>()
    for (const team of sortedTeams.value) {
      const base64 = await loadTeamImage(team)
      imageMap.set(team.team_key, base64)
    }
    console.log(`[Download Standings] Loaded ${imageMap.size} team images`)
    
    // Create container - use fixed width of 800px for consistent downloads regardless of team count
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 800px; font-family: system-ui, -apple-system, sans-serif;'
    
    // Split teams for two columns
    const midpoint = Math.ceil(sortedTeams.value.length / 2)
    const firstHalf = sortedTeams.value.slice(0, midpoint)
    const secondHalf = sortedTeams.value.slice(midpoint)
    
    // Calculate number of teams for percentage color thresholds
    const numTeams = sortedTeams.value.length
    const topThird = Math.ceil(numTeams / 3)
    const bottomThird = numTeams - Math.ceil(numTeams / 3)
    
    // Generate standings row - matching power rankings style
    const generateStandingsRow = (team: any, rank: number) => {
      // Record (wins-losses-ties)
      const record = `${team.wins || 0}-${team.losses || 0}${(team.ties || 0) > 0 ? `-${team.ties}` : ''}`
      
      // For points leagues, show total points; for category leagues, show cat win %
      let statValue: string
      let statLabel: string
      
      if (isPointsLeague.value) {
        statValue = (team.points_for || 0).toFixed(1)
        statLabel = 'Points'
      } else {
        const totalCats = (team.wins || 0) + (team.losses || 0) + (team.ties || 0)
        statValue = totalCats > 0 ? ((team.wins || 0) / totalCats * 100).toFixed(0) + '%' : '0%'
        statLabel = 'Cat Win %'
      }
      
      // Conditional color: green for top third, yellow for middle, red for bottom third
      let pctColor = '#f59e0b' // yellow default (middle)
      if (rank <= topThird) {
        pctColor = '#10b981' // green for top
      } else if (rank > bottomThird) {
        pctColor = '#ef4444' // red for bottom
      }
      
      // Trophy icon for playoff finishers
      let trophyIcon = ''
      if (team.playoffFinish === 1) {
        trophyIcon = '<span style="margin-left: 6px; font-size: 16px;" title="League Champion">🏆</span>'
      } else if (team.playoffFinish === 2) {
        trophyIcon = '<span style="margin-left: 6px; font-size: 14px;" title="Runner-up">🥈</span>'
      } else if (team.playoffFinish === 3) {
        trophyIcon = '<span style="margin-left: 6px; font-size: 14px;" title="Third Place">🥉</span>'
      }
      
      return `
      <div style="display: flex; height: 80px; padding: 0 12px; background: rgba(38, 42, 58, 0.4); border-radius: 10px; margin-bottom: 6px; border: 1px solid rgba(58, 61, 82, 0.4); box-sizing: border-box;">
        <!-- Rank Number - white -->
        <div style="width: 44px; flex-shrink: 0; padding-top: 8px;">
          <span style="font-size: 36px; font-weight: 900; color: #ffffff; font-family: 'Impact', 'Arial Black', sans-serif; letter-spacing: -2px; line-height: 1;">${rank}</span>
        </div>
        <!-- Team Logo - 48px logo -->
        <div style="width: 60px; flex-shrink: 0; padding-top: 16px;">
          <img src="${imageMap.get(team.team_key) || createPlaceholder(team.name)}" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid #3a3d52; background: #262a3a; object-fit: cover;" />
        </div>
        <!-- Team Info with trophy -->
        <div style="flex: 1; min-width: 0; padding-top: 16px;">
          <div style="font-size: 14px; font-weight: 700; color: #f7f7ff; white-space: nowrap; overflow: visible; line-height: 1.2; display: flex; align-items: center;">${team.name}${trophyIcon}</div>
          <div style="font-size: 11px; color: #9ca3af; line-height: 1.2; margin-top: 4px;">${record}</div>
        </div>
        <!-- Stat Value - big and colorful with label -->
        <div style="width: 65px; flex-shrink: 0; text-align: center; padding-top: 14px;">
          <div style="font-size: 22px; font-weight: bold; color: ${pctColor}; line-height: 1;">${statValue}</div>
          <div style="font-size: 9px; color: #6b7280; margin-top: 2px; text-transform: uppercase;">${statLabel}</div>
        </div>
      </div>
    `}
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Yellow Bar with site name -->
        <div style="background: #facc15; padding: 10px 24px 10px 24px; text-align: center; overflow: visible;">
          <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px; display: block; margin-top: -17px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- HEADER - Logo on left with text next to it -->
        <div style="display: flex; align-items: center; padding: 16px 24px; border-bottom: 1px solid rgba(250, 204, 21, 0.2); position: relative; z-index: 10;">
          <!-- Main Logo - maintain aspect ratio -->
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 70px; width: auto; flex-shrink: 0; margin-right: 24px; display: block;" />` : ''}
          <!-- Title and League Info - vertically centered -->
          <div style="flex: 1; margin-top: -14px;">
            <div style="font-size: 42px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 8px rgba(250, 204, 21, 0.4); line-height: 1;">League Standings</div>
            <div style="font-size: 20px; margin-top: 8px; font-weight: 600; line-height: 1;">
              <span style="color: #e5e7eb;">${leagueName.value}</span>
              <span style="color: #6b7280; margin: 0 8px;">•</span>
              <span style="color: #facc15; font-weight: 700;">Week ${displayWeek.value}</span>
            </div>
          </div>
        </div>
        
        <!-- Main content area -->
        <div style="padding: 16px 24px 12px 24px; position: relative;">
          
          <!-- Standings (Two Columns) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; position: relative; z-index: 1;">
            <div>${firstHalf.map((team, idx) => generateStandingsRow(team, idx + 1)).join('')}</div>
            <div>${secondHalf.map((team, idx) => generateStandingsRow(team, idx + midpoint + 1)).join('')}</div>
          </div>
          
          <!-- Trend Chart -->
          <div style="background: rgba(38, 42, 58, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid rgba(250, 204, 21, 0.2); position: relative; z-index: 1;">
            <h3 style="color: #facc15; font-size: 18px; margin: 0 0 12px 0; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Standings Trend</h3>
            <div id="standings-trend-chart" style="height: 220px; width: 100%; min-width: 400px; position: relative;"></div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="padding: 20px 24px 20px 24px; text-align: center; position: relative; z-index: 1;">
          <span style="font-size: 24px; font-weight: bold; color: #facc15; letter-spacing: -0.5px; display: block; margin-top: -35px;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    
    // Create trend chart with team logos at endpoints
    const trendChartContainer = container.querySelector('#standings-trend-chart')
    const weeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
    
    console.log('Download chart: weeks available =', weeks.length, 'trendChartContainer =', !!trendChartContainer)
    
    if (trendChartContainer && weeks.length < 2) {
      (trendChartContainer as HTMLElement).innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 20px;">
          <p style="color: #9ca3af; font-size: 14px; margin: 0 0 6px 0; font-weight: 600;">Not enough data to show standings over time</p>
          <p style="color: #6b7280; font-size: 12px; margin: 0;">Chart will appear once at least 2 weeks have been completed</p>
        </div>
      `
    }

    if (trendChartContainer && weeks.length >= 2) {
      try {
        const ApexCharts = (await import('apexcharts')).default
        console.log('ApexCharts loaded successfully')
      
      // Get last 7 weeks of data
      const maxWeeksToShow = 7
      const startIdx = Math.max(0, weeks.length - maxWeeksToShow)
      const weeksToShow = weeks.slice(startIdx)
      
      // Build series with last 7 weeks
      const trendSeries = sortedTeams.value.map((team) => {
        const data = weeksToShow.map(week => {
          const weekData = weeklyStandings.value.get(week) || []
          const teamStanding = weekData.find((t: any) => t.team_key === team.team_key)
          return teamStanding?.rank || sortedTeams.value.length
        })
        return {
          name: team.name,
          data: data
        }
      })
      
      const trendChart = new ApexCharts(trendChartContainer, {
        chart: {
          type: 'line',
          height: 220,
          width: '100%',
          background: 'transparent',
          toolbar: { show: false },
          animations: { enabled: false }
        },
        series: trendSeries,
        colors: sortedTeams.value.map((team, idx) => getTeamColor(idx)),
        stroke: {
          width: 2,
          curve: 'smooth'
        },
        markers: {
          size: 0,
          strokeWidth: 0
        },
        xaxis: {
          categories: weeksToShow.map(w => `Wk ${w}`),
          labels: {
            style: {
              colors: '#9ca3af',
              fontSize: '10px'
            }
          }
        },
        yaxis: {
          reversed: true,
          min: 1,
          max: sortedTeams.value.length,
          tickAmount: sortedTeams.value.length - 1,
          forceNiceScale: false,
          labels: {
            style: {
              colors: '#9ca3af',
              fontSize: '10px'
            },
            formatter: (value: number) => `#${Math.round(value)}`
          }
        },
        legend: {
          show: false
        },
        grid: {
          borderColor: '#374151',
          strokeDashArray: 3,
          padding: { right: 50 }
        },
        tooltip: { enabled: false }
      })
      
      await trendChart.render()
      
      // Wait for chart to render, then add team logos at endpoints
      // Use longer wait for larger leagues
      const waitTime = sortedTeams.value.length > 8 ? 800 : 600
      await new Promise(resolve => setTimeout(resolve, waitTime))
      
      console.log('Chart rendered, adding logos...')
      
      // Add team logos at the final data point of each line
      const chartEl = trendChartContainer.querySelector('.apexcharts-inner') as HTMLElement
      const plotArea = trendChartContainer.querySelector('.apexcharts-plot-series') as HTMLElement
      
      if (chartEl && plotArea) {
        console.log('Adding logos to chart - plotArea found')
        const plotRect = plotArea.getBoundingClientRect()
        const containerRect = (trendChartContainer as HTMLElement).getBoundingClientRect()
        
        const plotLeft = plotRect.left - containerRect.left
        const plotTop = plotRect.top - containerRect.top
        const plotHeight = plotRect.height
        const plotWidth = plotRect.width
        
        const logoContainer = document.createElement('div')
        logoContainer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;'
        
        for (let i = 0; i < sortedTeams.value.length; i++) {
          const team = sortedTeams.value[i]
          const seriesData = trendSeries[i]?.data || []
          if (seriesData.length === 0) continue
          
          const lastRank = seriesData[seriesData.length - 1]
          
          // Calculate y position based on rank (inverted axis: rank 1 at top, rank N at bottom)
          const yPercent = (lastRank - 1) / (numTeams - 1)
          const yPos = plotTop + (yPercent * plotHeight)
          
          // X position is at the right edge of the plot area
          const xPos = plotLeft + plotWidth
          
          const logoSize = 20
          
          const logoDiv = document.createElement('div')
          logoDiv.style.cssText = `
            position: absolute;
            left: ${xPos - logoSize / 2 + 4}px;
            top: ${yPos - logoSize / 2}px;
            width: ${logoSize}px;
            height: ${logoSize}px;
            border-radius: 50%;
            overflow: hidden;
            border: 2px solid ${team.is_my_team ? '#F5C451' : getTeamColor(i)};
            background: #262a3a;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          `
          logoDiv.innerHTML = `<img src="${imageMap.get(team.team_key) || ''}" style="width: 100%; height: 100%; object-fit: cover;" />`
          logoContainer.appendChild(logoDiv)
        }
        
        ;(trendChartContainer as HTMLElement).style.position = 'relative'
        trendChartContainer.appendChild(logoContainer)
      }
      
      // Wait for logos to render
      await new Promise(resolve => setTimeout(resolve, 300))
      } catch (chartError) {
        console.error('Error rendering chart:', chartError)
      }
    } else {
      // No chart data - wait for images only
      console.log('Skipping chart render - weeks:', weeks.length, 'container:', !!trendChartContainer)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Capture the image with fixed width
    const canvas = await html2canvas(container, {
      backgroundColor: '#0a0c14',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      width: 800
    })
    
    document.body.removeChild(container)
    
    // Copy to clipboard instead of downloading
    const safeLeagueName = leagueName.value.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-')
    // Safari fix: call clipboard.write() synchronously with a Promise<Blob>
    // so it's within the user gesture, but resolves async after canvas renders
    const blobPromise = new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
    })
    const blob = blobPromise  // alias for fallback download path

    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })])
        standingsCopyState.value = 'success'
        setTimeout(() => { standingsCopyState.value = 'idle' }, 3000)
      } catch (_clipErr) {
        const b = await blobPromise
        const url = URL.createObjectURL(b)
        const link = document.createElement('a')
        link.download = `Standings - Week ${displayWeek.value} - ${safeLeagueName}.png`
        link.href = url; link.click(); URL.revokeObjectURL(url)
        standingsCopyState.value = 'success'
        setTimeout(() => { standingsCopyState.value = 'idle' }, 3000)
      }
    } else {
      const b = await blobPromise
      const url = URL.createObjectURL(b)
      const link = document.createElement('a')
      link.download = `Standings - Week ${displayWeek.value} - ${safeLeagueName}.png`
      link.href = url; link.click(); URL.revokeObjectURL(url)
    }

  } catch (error) {
    console.error('Error generating standings image:', error)
    standingsCopyState.value = 'error'
    setTimeout(() => { standingsCopyState.value = 'idle' }, 4000)
  } finally {
    isGeneratingDownload.value = false
  }
}

// Download Leader Modal image (Most Category Wins, Best All Play, etc.)
async function downloadLeaderImage() {
  trackCardShare({ dashboard_type: 'leaderboard_card' })
  isDownloadingLeader.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    
    const rankings = leaderModalData.value.comparison.slice(0, leaderModalListLimit.value)
    if (rankings.length === 0) {
      isDownloadingLeader.value = false
      return
    }
    
    // Load UFD logo
    const loadLogo = async (): Promise<string> => {
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
      } catch (e) { return '' }
    }
    
    const logoBase64 = await loadLogo()
    const leader = rankings[0]
    
    // Use shared helpers
    const createPlaceholder = createTeamPlaceholder
    const loadTeamImage = loadTeamImageCORS
    
    // Pre-load all team images SEQUENTIALLY
    console.log('[Download Leader] Loading team images...')
    const imageMap = new Map<string, string>()
    for (const team of rankings) {
      const base64 = await loadTeamImage(team)
      imageMap.set(team.name, base64)
    }
    
    console.log(`[Download Leader] Loaded ${imageMap.size} team images`)
    
    const maxValue = leaderModalData.value.maxValue
    
    // Get accent color based on modal type
    const getAccentColor = (): string => {
      if (leaderModalType.value === 'bestRecord') return '#22c55e' // green
      if (leaderModalType.value === 'mostPoints' || leaderModalType.value === 'bestCatWinPct') return '#eab308' // yellow
      if (leaderModalType.value === 'hottest') return '#f97316' // orange
      if (leaderModalType.value === 'mostDominant' || leaderModalType.value === 'bestAllPlay') return '#3b82f6' // blue
      if (leaderModalType.value === 'coldest') return '#06b6d4' // cyan
      if (leaderModalType.value === 'mostMoves') return '#3b82f6' // blue
      if (leaderModalType.value === 'fewestMoves') return '#a855f7' // purple
      if (leaderModalType.value === 'rotoCategoryLeader') return '#22c55e' // green
      if (leaderModalType.value === 'rotoMostBalanced') return '#eab308' // yellow
      return '#eab308' // default yellow
    }
    const accentColor = getAccentColor()
    
    // Format value for display
    const formatValue = (val: number): string => {
      if (leaderModalType.value === 'bestRecord') return val.toFixed(0) + '%'
      if (leaderModalType.value === 'bestCatWinPct') return val.toFixed(2) + '%'
      if (leaderModalType.value === 'mostDominant') return Math.round(val).toString()
      return Math.round(val).toString()
    }
    
    // Get value unit for display in rows
    const getValueUnit = (): string => {
      if (leaderModalType.value === 'mostPoints') return 'Points'
      if (leaderModalType.value === 'bestCatWinPct') return 'Cat Win %'
      if (leaderModalType.value === 'mostDominant') return 'Dom. Weeks'
      if (leaderModalType.value === 'bestAllPlay') return 'All-Play Wins'
      if (leaderModalType.value === 'hottest' || leaderModalType.value === 'coldest') return isPointsLeague.value ? 'Points (Last 3)' : isRotoMode.value ? 'Roto Points' : 'Cats (Last 3)'
      if (leaderModalType.value === 'mostMoves' || leaderModalType.value === 'fewestMoves') return 'Moves'
      if (leaderModalType.value === 'rotoCategoryLeader') return 'Categories Led'
      if (leaderModalType.value === 'rotoMostBalanced') return 'Worst Rank'
      return ''
    }
    const valueUnit = getValueUnit()
    
    // Generate ranking rows
    const generateRows = () => {
      return rankings.map((team: any, idx: number) => {
        const barWidth = maxValue > 0 ? (team.value / maxValue) * 100 : 0
        const isFirst = idx === 0
        
        return `
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="width: 20px; text-align: center; font-weight: bold; font-size: 12px; color: ${isFirst ? accentColor : '#6b7280'};">${idx + 1}</div>
            <img src="${imageMap.get(team.name) || createPlaceholder(team.name)}" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${isFirst ? accentColor : '#3a3d52'};" />
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 12px; font-weight: 600; color: #e5e7eb; margin-bottom: 5px;">${team.name}</div>
              <div style="height: 6px; background: rgba(58, 61, 82, 0.5); border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; width: ${barWidth}%; background: ${accentColor}; opacity: ${isFirst ? 1 : 0.6}; border-radius: 3px;"></div>
              </div>
            </div>
            <div style="width: 65px; text-align: right;">
              <div style="font-size: 13px; font-weight: bold; color: ${isFirst ? accentColor : '#e5e7eb'};">${formatValue(team.value)}</div>
              <div style="font-size: 9px; color: #6b7280; margin-top: 1px;">${valueUnit}</div>
            </div>
          </div>
        `
      }).join('')
    }
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 480px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Yellow Bar -->
        <div style="background: #facc15; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">${leaderModalTitle.value}</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName.value}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #facc15; font-weight: 600;">Week ${displayWeek.value}, ${currentSeason.value}</span>
            </div>
          </div>
        </div>
        
        <!-- Featured Leader -->
        <div style="padding: 12px 16px; background: linear-gradient(135deg, ${accentColor}20 0%, transparent 100%); border-bottom: 1px solid ${accentColor}30;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${imageMap.get(leader.name) || createPlaceholder(leader.name)}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid ${accentColor}80;" />
            <div style="flex: 1;">
              <div style="font-size: 15px; font-weight: bold; color: #ffffff;">${leader.name}</div>
              <div style="font-size: 11px; color: #9ca3af;">${leader.wins || 0}-${leader.losses || 0}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 26px; font-weight: 900; color: ${accentColor};">${formatValue(leader.value)}</div>
            </div>
          </div>
        </div>
        
        <!-- Rankings List -->
        <div style="padding: 12px 16px;">
          <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">${leaderModalListTitle.value}</div>
          ${generateRows()}
        </div>
        
        <!-- Footer -->
        <div style="padding: 10px 16px; text-align: center; border-top: 1px solid rgba(250, 204, 21, 0.2);">
          <span style="font-size: 14px; font-weight: bold; color: #facc15;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 300))
    
    const finalCanvas = await html2canvas(container, {
      backgroundColor: '#0a0c14',
      scale: 2,
      useCORS: true,
      allowTaint: true
    })
    
    document.body.removeChild(container)
    
    const canvas = finalCanvas
    const safeTitle = leaderModalTitle.value.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-')
    const _shareBlobPromise = new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
    })
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': _shareBlobPromise })])
        leaderCopyState.value = 'success'
        setTimeout(() => { leaderCopyState.value = 'idle' }, 3000)
      } catch (_clipErr) {
        const _shareBlob = await _shareBlobPromise
        const _shareUrl = URL.createObjectURL(_shareBlob)
        const link = document.createElement('a')
        link.download = `${safeTitle}-${currentSeason.value}.png`
        link.href = _shareUrl; link.click(); URL.revokeObjectURL(_shareUrl)
        leaderCopyState.value = 'success'
        setTimeout(() => { leaderCopyState.value = 'idle' }, 3000)
      }
    } else {
      const _shareBlob = await _shareBlobPromise
      const _shareUrl = URL.createObjectURL(_shareBlob)
      const link = document.createElement('a')
      link.download = `${safeTitle}-${currentSeason.value}.png`
      link.href = _shareUrl; link.click(); URL.revokeObjectURL(_shareUrl)
    }
  } catch (error) {
    console.error('Error generating leader image:', error)
    leaderCopyState.value = 'error'
    setTimeout(() => { leaderCopyState.value = 'idle' }, 4000)
  } finally {
    isDownloadingLeader.value = false
  }
}

// Download Team Detail Modal image
async function downloadTeamDetailImage() {
  if (!selectedTeamDetail.value) return
  trackCardShare({ dashboard_type: 'team_detail_card' })
  
  isDownloadingTeamDetail.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    const team = selectedTeamDetail.value
    
    // Load UFD logo
    const loadLogo = async (): Promise<string> => {
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
      } catch (e) { return '' }
    }
    
    const logoBase64 = await loadLogo()
    
    // Use shared helpers
    const createPlaceholder = createTeamPlaceholder
    
    // Load team logo using CORS-friendly helper
    console.log(`[Download Team] Loading team logo for ${team.name}...`)
    const teamLogoBase64 = await loadTeamImageCORS(team)
    console.log(`[Download Team] Team logo loaded`)
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 480px; font-family: system-ui, -apple-system, sans-serif;'
    
    const tiesText = team.ties > 0 ? `-${team.ties}` : ''
    const playoffBadge = team.playoffFinish === 1 ? '🏆' : (team.playoffFinish === 2 ? '🥈' : (team.playoffFinish === 3 ? '🥉' : ''))
    
    // Check if this is a points league
    const isPoints = isPointsLeague.value
    const stats = pointsLeagueTeamDetailStats.value
    
    // Generate weekly results - different for points vs category leagues
    const generateWeeklyResults = () => {
      if (isPoints) {
        // For points leagues, show weekly scores with W/L color
        return stats.weeklyResults.slice(0, 20).map((result: any) => {
          const bgColor = result.won ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'
          const textColor = result.won ? '#22c55e' : '#ef4444'
          return `
            <div style="width: 40px; height: 32px; border-radius: 6px; background: ${bgColor}; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 10px; font-weight: bold; color: ${textColor};">${result.points?.toFixed(0) || '0'}</span>
            </div>
          `
        }).join('')
      } else {
        // For category leagues, show W/L/T indicators
        const weeklyResults = teamDetailWeeklyResults.value.slice(0, 20)
        return weeklyResults.map((result: any) => {
          const bgColor = result.won ? 'rgba(34, 197, 94, 0.2)' : (result.tied ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)')
          const textColor = result.won ? '#22c55e' : (result.tied ? '#eab308' : '#ef4444')
          const label = result.won ? 'W' : (result.tied ? 'T' : 'L')
          return `
            <div style="width: 32px; height: 32px; border-radius: 6px; background: ${bgColor}; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 11px; font-weight: bold; color: ${textColor};">${label}</span>
            </div>
          `
        }).join('')
      }
    }
    
    // Generate stats section - different for points vs category leagues
    const generateStatsSection = () => {
      if (isPoints) {
        // Points league stats
        return `
          <div style="padding: 12px 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; border-bottom: 1px solid rgba(58, 61, 82, 0.5);">
            <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
              <div style="font-size: 18px; font-weight: 900; color: #ffffff;">${team.wins}-${team.losses}${tiesText}</div>
              <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">Record</div>
            </div>
            <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
              <div style="font-size: 18px; font-weight: 900; color: #eab308;">#${team.regularSeasonRank}</div>
              <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">Rank</div>
            </div>
            <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
              <div style="font-size: 18px; font-weight: 900; color: #22c55e;">${stats.ppg}</div>
              <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">PPG</div>
            </div>
            <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
              <div style="font-size: 18px; font-weight: 900; color: #06b6d4;">${team.all_play_wins}-${team.all_play_losses}</div>
              <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">All-Play</div>
            </div>
          </div>
          
          <!-- Points Breakdown -->
          <div style="padding: 12px 16px; border-bottom: 1px solid rgba(58, 61, 82, 0.5);">
            <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Season Stats</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
              <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="font-size: 14px; font-weight: bold; color: #22c55e;">${stats.highScore}</div>
                <div style="font-size: 9px; color: #9ca3af;">High</div>
              </div>
              <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="font-size: 14px; font-weight: bold; color: #ef4444;">${stats.lowScore}</div>
                <div style="font-size: 9px; color: #9ca3af;">Low</div>
              </div>
              <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="font-size: 14px; font-weight: bold; color: #facc15;">${stats.totalPoints}</div>
                <div style="font-size: 9px; color: #9ca3af;">Total</div>
              </div>
              <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="font-size: 14px; font-weight: bold; color: #9ca3af;">${stats.pointsAgainst}</div>
                <div style="font-size: 9px; color: #9ca3af;">Pts Against</div>
              </div>
              <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="font-size: 14px; font-weight: bold; color: ${parseFloat(stats.pointDiff) >= 0 ? '#22c55e' : '#ef4444'};">${parseFloat(stats.pointDiff) >= 0 ? '+' : ''}${stats.pointDiff}</div>
                <div style="font-size: 9px; color: #9ca3af;">Diff</div>
              </div>
              <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="font-size: 14px; font-weight: bold; color: #e5e7eb;">${stats.winStreak}</div>
                <div style="font-size: 9px; color: #9ca3af;">Streak</div>
              </div>
            </div>
          </div>
        `
      } else {
        // Category league stats - show ALL categories
        const allCategories = teamDetailCategories.value
        const numTeams = sortedTeams.value.length
        const topThird = Math.ceil(numTeams / 3)
        const bottomThird = numTeams - Math.ceil(numTeams / 3)
        // Use 3 columns if more than 10 categories, otherwise 2
        const gridCols = allCategories.length > 10 ? 3 : 2
        const generateCategories = () => {
          return allCategories.map((cat: any) => {
            const rankColor = cat.rank <= topThird ? '#22c55e' : (cat.rank <= bottomThird ? '#eab308' : '#ef4444')
            return `
              <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 8px 10px; display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 11px; color: #9ca3af;">${cat.display_name}</span>
                <span style="font-size: 11px; padding: 3px 8px; border-radius: 4px; background: ${rankColor}20; color: ${rankColor}; font-weight: 700;">#${cat.rank}</span>
              </div>
            `
          }).join('')
        }
        
        return `
          <div style="padding: 12px 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; border-bottom: 1px solid rgba(58, 61, 82, 0.5);">
            <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
              <div style="font-size: 18px; font-weight: 900; color: #ffffff;">${team.wins}-${team.losses}${tiesText}</div>
              <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">Record</div>
            </div>
            <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
              <div style="font-size: 18px; font-weight: 900; color: #eab308;">#${team.regularSeasonRank}</div>
              <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">Rank</div>
            </div>
            <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
              <div style="font-size: 18px; font-weight: 900; color: #06b6d4;">${team.all_play_wins}-${team.all_play_losses}</div>
              <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">All-Play</div>
            </div>
            <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
              <div style="font-size: 18px; font-weight: 900; color: #22c55e;">${teamDetailAvgCatsPerWeek.value}</div>
              <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">Cats/Week</div>
            </div>
          </div>
          
          <!-- Category Breakdown -->
          <div style="padding: 12px 16px; border-bottom: 1px solid rgba(58, 61, 82, 0.5);">
            <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Category Breakdown</div>
            <div style="display: grid; grid-template-columns: repeat(${gridCols}, 1fr); gap: 6px;">
              ${generateCategories()}
            </div>
          </div>
        `
      }
    }
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Yellow Bar -->
        <div style="background: #facc15; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header with Team -->
        <div style="display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 11px; color: #9ca3af; margin-bottom: 2px;">${leagueName.value}</div>
            <div style="font-size: 12px; color: #facc15; font-weight: 600;">${currentSeason.value} Season • ${isPoints ? 'H2H Points' : 'H2H Categories'}</div>
          </div>
        </div>
        
        <!-- Team Hero -->
        <div style="padding: 16px; background: linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, transparent 100%); border-bottom: 1px solid rgba(234, 179, 8, 0.2);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${teamLogoBase64}" style="width: 56px; height: 56px; border-radius: 50%; border: 3px solid rgba(234, 179, 8, 0.5);" />
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px; font-weight: 900; color: #ffffff;">${team.name}</span>
                ${playoffBadge ? `<span style="font-size: 18px;">${playoffBadge}</span>` : ''}
              </div>
              <div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">Rank #${team.regularSeasonRank}</div>
            </div>
          </div>
        </div>
        
        ${generateStatsSection()}
        
        <!-- Weekly Results -->
        <div style="padding: 12px 16px;">
          <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Weekly ${isPoints ? 'Scores' : 'Results'}</div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            ${generateWeeklyResults()}
          </div>
        </div>
        
        <!-- Footer -->
        <div style="padding: 10px 16px; text-align: center; border-top: 1px solid rgba(250, 204, 21, 0.2);">
          <span style="font-size: 14px; font-weight: bold; color: #facc15;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 300))
    
    const finalCanvas = await html2canvas(container, {
      backgroundColor: '#0a0c14',
      scale: 2,
      useCORS: true,
      allowTaint: true
    })
    
    document.body.removeChild(container)
    
    const canvas = finalCanvas
    const safeTeamName = team.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-')
    const _shareBlobPromise = new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
    })
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': _shareBlobPromise })])
        teamDetailCopyState.value = 'success'
        setTimeout(() => { teamDetailCopyState.value = 'idle' }, 3000)
      } catch (_clipErr) {
        const _shareBlob = await _shareBlobPromise
        const _shareUrl = URL.createObjectURL(_shareBlob)
        const link = document.createElement('a')
        link.download = `${safeTeamName}-${currentSeason.value}.png`
        link.href = _shareUrl; link.click(); URL.revokeObjectURL(_shareUrl)
        teamDetailCopyState.value = 'success'
        setTimeout(() => { teamDetailCopyState.value = 'idle' }, 3000)
      }
    } else {
      const _shareBlob = await _shareBlobPromise
      const _shareUrl = URL.createObjectURL(_shareBlob)
      const link = document.createElement('a')
      link.download = `${safeTeamName}-${currentSeason.value}.png`
      link.href = _shareUrl; link.click(); URL.revokeObjectURL(_shareUrl)
    }
  } catch (error) {
    console.error('Error generating team detail image:', error)
    teamDetailCopyState.value = 'error'
    setTimeout(() => { teamDetailCopyState.value = 'idle' }, 4000)
  } finally {
    isDownloadingTeamDetail.value = false
  }
}

// Load league settings
async function loadLeagueSettings() {
  const leagueKey = effectiveLeagueKey.value || leagueStore.activeLeagueId
  if (!leagueKey) return
  
  // For ESPN, scoring type is already in the store (set during league loading)
  if (leagueStore.activePlatform === 'espn') {
    console.log('[loadLeagueSettings] ESPN platform - using store data')
    console.log('[loadLeagueSettings] scoringType:', scoringType.value)
    statCategories.value = [] // ESPN doesn't need category details
    return
  }
  
  // For Yahoo, call the API
  try {
    // Get league details to get the season
    const leagueDetails = await yahooService.getLeagueDetails(leagueKey)
    if (leagueDetails?.[0]?.season) {
      loadedSeason.value = leagueDetails[0].season
      console.log('Loaded season from API:', loadedSeason.value)
    }
    
    const settings = await yahooService.getLeagueScoringSettings(leagueKey)
    if (settings) {
      // Note: scoringType is now computed from store, no need to set it here
      const cats = settings.stat_categories || []
      statCategories.value = cats.map((c: any) => ({
        stat_id: c.stat?.stat_id || c.stat_id,
        name: c.stat?.name || c.name,
        display_name: c.stat?.display_name || c.display_name,
        is_only_display_stat: c.stat?.is_only_display_stat || c.is_only_display_stat
      })).filter((c: any) => c.stat_id)
      
      console.log('Loaded scoring type:', scoringType.value, 'Categories:', statCategories.value.length)
    }
  } catch (e) {
    console.error('Error loading league settings:', e)
  }
}

// Load all matchup data for chart
async function loadAllMatchups() {
  const leagueKey = effectiveLeagueKey.value || leagueStore.activeLeagueId
  if (!leagueKey) {
    console.log('No league key, skipping matchup load')
    return
  }
  
  console.log(`Loading matchups for league: ${leagueKey}, platform: ${leagueStore.activePlatform}`)
  isLoadingChart.value = true
  
  // For Sleeper, use REAL historical matchups data
  if (leagueStore.activePlatform === 'sleeper') {
    console.log('[Sleeper] Loading REAL matchups from historical data')
    const season = leagueStore.currentLeague?.season || new Date().getFullYear().toString()
    const currentWeek = leagueStore.currentLeague?.settings?.leg || 1
    const sleeperSport = (leagueStore.currentLeague as any)?.sport || 
      leagueStore.savedLeagues?.find((l: any) => l.league_id === leagueStore.activeLeagueId)?.sport || 'nfl'
    const playoffStart = leagueStore.currentLeague?.settings?.playoff_week_start || 
      (sleeperSport === 'nba' ? 22 : 15)
    // Regular season only: playoff_week_start is the FIRST playoff week, so regular season ends at playoffStart - 1
    const endWeek = Math.min(currentWeek, playoffStart - 1)
    const startWeek = 1
    
    console.log(`[Sleeper] Regular season weeks ${startWeek}-${endWeek} (playoffStart: ${playoffStart}, currentWeek: ${currentWeek})`)
    
    // Get current week matchups for display
    const currentWeekMatchups = leagueStore.historicalMatchups.get(season)?.get(currentWeek) || []
    
    // Transform current week to display format
    const matchupMap = new Map<number, any>()
    for (const m of currentWeekMatchups) {
      const matchupId = m.matchup_id
      if (!matchupMap.has(matchupId)) {
        matchupMap.set(matchupId, { matchup_id: matchupId, teams: [] })
      }
      
      const team = leagueStore.yahooTeams.find(t => t.roster_id === m.roster_id)
      matchupMap.get(matchupId).teams.push({
        team_key: `sleeper_${m.roster_id}`,
        name: team?.name || `Team ${m.roster_id}`,
        points: m.points || 0,
        projected_points: m.projected_points || 0,
        logo_url: team?.logo_url || '',
        is_my_team: false,
        wins: team?.wins || 0,
        losses: team?.losses || 0
      })
    }
    
    displayMatchups.value = Array.from(matchupMap.values())
    
    // Load REAL standings progression from actual matchups
    const standings = new Map<number, any[]>()
    const allMatchupResults = new Map<string, Map<number, any>>()
    
    // Initialize matchup results map for each team
    leagueStore.yahooTeams.forEach(t => {
      allMatchupResults.set(t.team_key, new Map())
    })
    
    // Track cumulative wins/losses per team
    const cumulativeWins = new Map<string, number>()
    const cumulativeLosses = new Map<string, number>()
    const cumulativeTies = new Map<string, number>()
    const cumulativePoints = new Map<string, number>()
    
    leagueStore.yahooTeams.forEach(t => {
      cumulativeWins.set(t.team_key, 0)
      cumulativeLosses.set(t.team_key, 0)
      cumulativeTies.set(t.team_key, 0)
      cumulativePoints.set(t.team_key, 0)
    })
    
    for (let week = startWeek; week <= endWeek; week++) {
      chartLoadProgress.value = `Week ${week}/${endWeek}`
      
      const weekMatchups = leagueStore.historicalMatchups.get(season)?.get(week) || []
      console.log(`[Sleeper] Week ${week}: ${weekMatchups.length} roster entries`)
      
      // Group matchups by matchup_id
      const weekMatchupMap = new Map<number, any[]>()
      for (const m of weekMatchups) {
        if (!weekMatchupMap.has(m.matchup_id)) {
          weekMatchupMap.set(m.matchup_id, [])
        }
        weekMatchupMap.get(m.matchup_id).push(m)
      }
      
      // Process each matchup to determine winners
      for (const [matchupId, rosters] of weekMatchupMap) {
        if (rosters.length !== 2) continue
        
        const r1 = rosters[0]
        const r2 = rosters[1]
        const team1Key = `sleeper_${r1.roster_id}`
        const team2Key = `sleeper_${r2.roster_id}`
        const team1Points = r1.points || 0
        const team2Points = r2.points || 0
        
        // Update cumulative points
        cumulativePoints.set(team1Key, (cumulativePoints.get(team1Key) || 0) + team1Points)
        cumulativePoints.set(team2Key, (cumulativePoints.get(team2Key) || 0) + team2Points)
        
        // Determine winner (only if points exist - game was played)
        let team1Won = false
        let team2Won = false
        let isTied = false
        if (team1Points > 0 || team2Points > 0) {
          if (team1Points > team2Points) {
            team1Won = true
            cumulativeWins.set(team1Key, (cumulativeWins.get(team1Key) || 0) + 1)
            cumulativeLosses.set(team2Key, (cumulativeLosses.get(team2Key) || 0) + 1)
          } else if (team2Points > team1Points) {
            team2Won = true
            cumulativeWins.set(team2Key, (cumulativeWins.get(team2Key) || 0) + 1)
            cumulativeLosses.set(team1Key, (cumulativeLosses.get(team1Key) || 0) + 1)
          } else {
            isTied = true
            cumulativeTies.set(team1Key, (cumulativeTies.get(team1Key) || 0) + 1)
            cumulativeTies.set(team2Key, (cumulativeTies.get(team2Key) || 0) + 1)
          }
        }
        
        // Get team names for display
        const team1Data = leagueStore.yahooTeams.find(t => t.team_key === team1Key)
        const team2Data = leagueStore.yahooTeams.find(t => t.team_key === team2Key)
        
        // Store matchup results for team detail view
        const team1Results = allMatchupResults.get(team1Key)
        const team2Results = allMatchupResults.get(team2Key)
        
        if (team1Results) {
          team1Results.set(week, {
            points: team1Points,
            opponentPoints: team2Points,
            won: team1Won,
            tied: isTied,
            opponent: team2Key,
            opponentName: team2Data?.name || 'Unknown'
          })
        }
        if (team2Results) {
          team2Results.set(week, {
            points: team2Points,
            opponentPoints: team1Points,
            won: team2Won,
            tied: isTied,
            opponent: team1Key,
            opponentName: team1Data?.name || 'Unknown'
          })
        }
      }
      
      // Build standings for this week
      const weekStandings = leagueStore.yahooTeams.map(t => ({
        team_key: t.team_key,
        name: t.name,
        wins: cumulativeWins.get(t.team_key) || 0,
        losses: cumulativeLosses.get(t.team_key) || 0,
        ties: cumulativeTies.get(t.team_key) || 0,
        points_for: cumulativePoints.get(t.team_key) || 0,
        rank: 0
      })).sort((a, b) => {
        // Sort by wins descending (record-based, not percentage)
        if (b.wins !== a.wins) return b.wins - a.wins
        // Fewer losses is better
        if (a.losses !== b.losses) return a.losses - b.losses
        // Points for as final tiebreaker
        return b.points_for - a.points_for
      })
      
      weekStandings.forEach((t, idx) => t.rank = idx + 1)
      standings.set(week, weekStandings)
    }
    
    weeklyStandings.value = standings
    weeklyMatchupResults.value = allMatchupResults
    console.log(`[Sleeper] Loaded REAL data for ${standings.size} weeks, ${allMatchupResults.size} teams`)
    
    // DEBUG: Compare our calculated final standings with store data
    if (standings.size > 0) {
      const lastWeek = Math.max(...standings.keys())
      const finalCalc = standings.get(lastWeek)
      console.log(`[Sleeper DEBUG] Final week ${lastWeek} calculated standings:`)
      finalCalc?.forEach((t: any) => {
        const storeTeam = leagueStore.yahooTeams.find(st => st.team_key === t.team_key)
        console.log(`  #${t.rank} ${t.name}: ${t.wins}-${t.losses} (calc) vs ${storeTeam?.wins}-${storeTeam?.losses} (store, rank ${storeTeam?.rank})`)
      })
    }
    
    buildChart()
    isLoadingChart.value = false
    chartLoadProgress.value = ''
    return
  }
  
  // For ESPN, fetch matchups week-by-week (like Power Rankings does)
  if (leagueStore.activePlatform === 'espn') {
    console.log('[ESPN loadAllMatchups v5.0] FETCHING REAL MATCHUPS')
    displayMatchups.value = leagueStore.yahooMatchups || []
    
    try {
      // Parse league key to get ESPN details
      const parts = leagueKey.split('_')
      const sport = parts[1] as 'football' | 'baseball' | 'basketball' | 'hockey'
      const espnLeagueId = parts[2]
      const season = parseInt(parts[3])
      
      // Set ESPN credentials from platformsStore (same as league store does)
      const credentials = platformsStore.getEspnCredentials()
      if (credentials) {
        console.log('[ESPN loadAllMatchups v5.0] Setting credentials from platformsStore')
        espnService.setCredentials(credentials.espn_s2, credentials.swid)
      } else {
        console.log('[ESPN loadAllMatchups v5.0] WARNING: No ESPN credentials in platformsStore!')
      }
      
      // Use static espnService import (like Power Rankings does)
      const league = await espnService.getLeague(sport, espnLeagueId, season)
      
      const currentWeek = league?.status?.currentMatchupPeriod || 15
      const espnCompletedWeeks = Math.max(1, currentWeek - 1)
      
      // ESPN basketball matchup periods don't always match actual matchup weeks
      // For H2H Each Category: team.wins/losses are CATEGORY totals, not matchup weeks
      // e.g., 8-0 = won 8 categories in 1 week (with 8 categories)
      // actualWeeks = max(W+L+T) / numCategories
      const maxTeamRecord = Math.max(1, ...leagueStore.yahooTeams.map(t => 
        (t.wins || 0) + (t.losses || 0) + (t.ties || 0)
      ))
      const catCount = numCategories.value || 8 // H2H Each Category leagues have category count
      const actualMatchupWeeks = !isPointsLeague.value ? Math.max(1, Math.round(maxTeamRecord / catCount)) : maxTeamRecord
      
      // Fetch all ESPN periods to not miss data
      const completedWeeks = espnCompletedWeeks
      
      console.log('[ESPN loadAllMatchups] Fetching', completedWeeks, 'ESPN periods (actual matchup weeks:', actualMatchupWeeks, ', maxRecord:', maxTeamRecord, ', categories:', catCount, ')')
      
      // Initialize maps
      const allMatchupResults = new Map<string, Map<number, any>>()
      leagueStore.yahooTeams.forEach(t => {
        allMatchupResults.set(t.team_key, new Map())
      })
      
      // Track cumulative wins for standings
      const teamStats = new Map<string, { wins: number; losses: number; ties: number; catWins: number; catLosses: number }>()
      leagueStore.yahooTeams.forEach(t => {
        teamStats.set(t.team_key, { wins: 0, losses: 0, ties: 0, catWins: 0, catLosses: 0 })
      })
      
      // Fetch each week's matchups (like Power Rankings does)
      let weeksWithMatchupWinners = 0
      for (let week = 1; week <= completedWeeks; week++) {
        try {
          const matchups = await espnService.getMatchups(sport, espnLeagueId, season, week, true)
          
          let weekHadWinnerData = false
          for (const matchup of matchups) {
            if (!matchup.awayTeamId) continue
            
            const homeKey = `espn_${espnLeagueId}_${season}_${matchup.homeTeamId}`
            const awayKey = `espn_${espnLeagueId}_${season}_${matchup.awayTeamId}`
            
            const homeStats = teamStats.get(homeKey)
            const awayStats = teamStats.get(awayKey)
            if (!homeStats || !awayStats) continue
            
            // Count category wins
            let homeCatWins = 0
            let awayCatWins = 0
            
            if (matchup.homePerCategoryResults && Object.keys(matchup.homePerCategoryResults).length > 0) {
              for (const result of Object.values(matchup.homePerCategoryResults)) {
                if (result === 'WIN') homeCatWins++
                else if (result === 'LOSS') awayCatWins++
              }
              if (week === 1) console.log('[ESPN loadAllMatchups] Week 1 - using homePerCategoryResults, home:', homeCatWins, 'away:', awayCatWins)
            } else if ((matchup.homeCategoryWins || 0) > 0 || (matchup.awayCategoryWins || 0) > 0) {
              homeCatWins = matchup.homeCategoryWins || 0
              awayCatWins = matchup.awayCategoryWins || 0
              if (week === 1) console.log('[ESPN loadAllMatchups] Week 1 - using homeCategoryWins, home:', homeCatWins, 'away:', awayCatWins)
            }
            
            // Track category totals
            homeStats.catWins += homeCatWins
            homeStats.catLosses += awayCatWins
            awayStats.catWins += awayCatWins
            awayStats.catLosses += homeCatWins
            
            // Determine matchup winner and store result
            let homeWon = false
            let awayWon = false
            let tied = false
            
            if (isPointsLeague.value) {
              // Points league: winner is determined by total score
              const homeScore = matchup.homeScore || 0
              const awayScore = matchup.awayScore || 0
              if (homeScore > awayScore) {
                homeStats.wins++
                awayStats.losses++
                homeWon = true
                weekHadWinnerData = true
              } else if (awayScore > homeScore) {
                awayStats.wins++
                homeStats.losses++
                awayWon = true
                weekHadWinnerData = true
              } else if (homeScore > 0 || awayScore > 0) {
                homeStats.ties++
                awayStats.ties++
                tied = true
                weekHadWinnerData = true
              }
              
              // Store matchup results with points
              allMatchupResults.get(homeKey)?.set(week, {
                week,
                opponent: awayKey,
                won: homeWon,
                tied,
                points: homeScore,
                opponentPoints: awayScore,
                catWins: homeCatWins,
                catLosses: awayCatWins
              })
              allMatchupResults.get(awayKey)?.set(week, {
                week,
                opponent: homeKey,
                won: awayWon,
                tied,
                points: awayScore,
                opponentPoints: homeScore,
                catWins: awayCatWins,
                catLosses: homeCatWins
              })
            } else {
              // Category league: use category wins, fall back to scores if needed
              // For some ESPN sports, homeScore/awayScore ARE the category win totals
              if (homeCatWins === 0 && awayCatWins === 0) {
                const homeScore = matchup.homeScore || 0
                const awayScore = matchup.awayScore || 0
                if (homeScore > 0 || awayScore > 0) {
                  homeCatWins = homeScore
                  awayCatWins = awayScore
                }
              }
              
              if (homeCatWins > awayCatWins) {
                homeStats.wins++
                awayStats.losses++
                homeWon = true
                weekHadWinnerData = true
              } else if (awayCatWins > homeCatWins) {
                awayStats.wins++
                homeStats.losses++
                awayWon = true
                weekHadWinnerData = true
              } else if (homeCatWins > 0 || awayCatWins > 0) {
                homeStats.ties++
                awayStats.ties++
                tied = true
                weekHadWinnerData = true
              }
            
              // Store matchup results with catWins and points
              allMatchupResults.get(homeKey)?.set(week, {
                week,
                opponent: awayKey,
                won: homeWon,
                tied,
                points: matchup.homeScore || 0,
                opponentPoints: matchup.awayScore || 0,
                catWins: homeCatWins,
                catLosses: awayCatWins
              })
              allMatchupResults.get(awayKey)?.set(week, {
                week,
                opponent: homeKey,
                won: awayWon,
                tied,
                points: matchup.awayScore || 0,
                opponentPoints: matchup.homeScore || 0,
                catWins: awayCatWins,
                catLosses: homeCatWins
              })
            }
          }
          
          if (weekHadWinnerData) weeksWithMatchupWinners++
        } catch (weekErr) {
          console.warn('[ESPN loadAllMatchups] Week', week, 'error:', weekErr)
        }
      }
      
      const matchupCoverage = actualMatchupWeeks > 0 ? weeksWithMatchupWinners / actualMatchupWeeks : 0
      console.log('[ESPN loadAllMatchups] Matchup winner coverage:', weeksWithMatchupWinners, '/', actualMatchupWeeks, '(' + Math.round(matchupCoverage * 100) + '%) [ESPN periods:', completedWeeks, ']')
      
      // Always keep matchup data, filter to weeks with actual results
      const filteredResults = new Map<string, Map<number, any>>()
      allMatchupResults.forEach((teamMatchups, teamKey) => {
        const filtered = new Map<number, any>()
        teamMatchups.forEach((result, week) => {
          const hasPoints = (result.points || 0) > 0 || (result.opponentPoints || 0) > 0
          const hasCatData = (result.catWins || 0) > 0 || (result.catLosses || 0) > 0
          const hasWinner = result.won || result.tied
          if (hasPoints || hasCatData || hasWinner) {
            filtered.set(week, result)
          }
        })
        filteredResults.set(teamKey, filtered)
      })
      weeklyMatchupResults.value = filteredResults
      
      // Update team records from matchup data if we have enough
      if (matchupCoverage >= 0.5) {
        leagueStore.yahooTeams.forEach(team => {
          const stats = teamStats.get(team.team_key)
          if (stats && (stats.wins > 0 || stats.losses > 0)) {
            console.log('[ESPN loadAllMatchups] Updating', team.name, ':', stats.wins, '-', stats.losses)
            team.wins = stats.wins
            team.losses = stats.losses
            team.ties = stats.ties
            team.category_wins = stats.catWins
            team.category_losses = stats.catLosses
          }
        })
      }
      
      const weeksKept = filteredResults.size > 0 ? [...filteredResults.values()][0].size : 0
      console.log(`[ESPN loadAllMatchups] Kept ${weeksKept} weeks with actual data (coverage: ${Math.round(matchupCoverage * 100)}%)`)
      
      console.log('[ESPN loadAllMatchups] DONE - weeklyMatchupResults size:', weeklyMatchupResults.value.size)
      
    } catch (err) {
      console.error('[ESPN loadAllMatchups] Error:', err)
    }
    
    // Now build standings from the data we just fetched
    const yahooLeagueData = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
    const endWeek = yahooLeagueData?.end_week || 25
    const startWeek = yahooLeagueData?.start_week || 1
    const currWeek = yahooLeagueData?.current_week || currentWeek.value || 1
    
    const chartEndWeek = isSeasonComplete.value ? endWeek : Math.min(currWeek, endWeek)
    
    buildStandingsFromRealMatchups(startWeek, chartEndWeek)
    buildChart()
    
    isLoadingChart.value = false
    chartLoadProgress.value = ''
    return
  }
  
  // For H2H Categories, we need to simulate standings over time
  // since Yahoo doesn't give us weekly W-L for category leagues
  // Instead, we'll generate estimated standings based on final standings
  const yahooLeagueArr = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
  const maxWeek = totalWeeks.value || 25
  const startWeek = parseInt(yahooLeagueArr?.start_week) || 1
  const currWeek = parseInt(yahooLeagueArr?.current_week) || currentWeek.value || maxWeek
  const endWeek = isSeasonComplete.value ? maxWeek : Math.min(currWeek, maxWeek)
  // Yahoo's current_week is the IN-PROGRESS week — only weeks strictly before it are
  // completed and should appear in the standings-over-time chart.
  const lastCompletedWeek = isSeasonComplete.value ? maxWeek : Math.max(0, currWeek - 1)
  
  console.log(`[Yahoo] Loading matchups for weeks ${startWeek}-${endWeek}, isSeasonComplete: ${isSeasonComplete.value}, isPointsLeague: ${isPointsLeague.value}`)
  
  // Set displayMatchups from store initially while we load full data
  if (leagueStore.yahooMatchups?.length > 0) {
    displayMatchups.value = leagueStore.yahooMatchups
    console.log(`[Yahoo] Initial displayMatchups from store: ${displayMatchups.value.length}`)
  }
  
  try {
    // For category leagues (NOT roto), load actual matchup data per week
    const isRotoLeague = (scoringType.value || '').toLowerCase().includes('roto')
    if (!isPointsLeague.value && !isRotoLeague) {
      console.log('Category league detected - loading weekly matchup data')
      
      const standings = new Map<number, any[]>()
      const allMatchupResults = new Map<string, Map<number, any>>()
      
      // Initialize matchup results map for each team
      leagueStore.yahooTeams.forEach(t => {
        allMatchupResults.set(t.team_key, new Map())
      })
      
      // Cumulative category wins per team
      const cumulativeCatWins = new Map<string, number>()
      const cumulativeCatLosses = new Map<string, number>()
      const cumulativeMatchupWins = new Map<string, number>()
      const cumulativeMatchupLosses = new Map<string, number>()
      
      leagueStore.yahooTeams.forEach(t => {
        cumulativeCatWins.set(t.team_key, 0)
        cumulativeCatLosses.set(t.team_key, 0)
        cumulativeMatchupWins.set(t.team_key, 0)
        cumulativeMatchupLosses.set(t.team_key, 0)
      })
      
      for (let week = startWeek; week <= endWeek; week++) {
        chartLoadProgress.value = `Week ${week}/${endWeek}`
        
        try {
          const matchups = await yahooService.getCategoryMatchups(leagueKey, week)
          console.log(`Week ${week}: ${matchups.length} matchups`)
          
          for (const matchup of matchups) {
            if (!matchup.teams || matchup.teams.length < 2) continue
            
            const t1 = matchup.teams[0]
            const t2 = matchup.teams[1]
            const t1Key = t1?.team_key
            const t2Key = t2?.team_key
            
            if (!t1Key || !t2Key) continue
            
            // Count category wins from stat_winners
            let t1CatWins = 0
            let t2CatWins = 0
            let ties = 0
            
            if (matchup.stat_winners && matchup.stat_winners.length > 0) {
              for (const sw of matchup.stat_winners) {
                // is_tied can be boolean true or string '1'
                if (sw.is_tied === true || sw.is_tied === '1') {
                  ties++
                } else if (sw.winner_team_key === t1Key) {
                  t1CatWins++
                } else if (sw.winner_team_key === t2Key) {
                  t2CatWins++
                }
              }
            } else {
              // Fallback: try to get wins from team data directly
              t1CatWins = parseInt(t1?.win_count || t1?.wins || '0', 10)
              t2CatWins = parseInt(t2?.win_count || t2?.wins || '0', 10)
              ties = parseInt(t1?.tie_count || matchup.ties || '0', 10)
            }
            
            // Determine matchup winner
            const t1Won = t1CatWins > t2CatWins
            const t2Won = t2CatWins > t1CatWins
            const tied = t1CatWins === t2CatWins
            
            // Update cumulative stats
            cumulativeCatWins.set(t1Key, (cumulativeCatWins.get(t1Key) || 0) + t1CatWins)
            cumulativeCatLosses.set(t1Key, (cumulativeCatLosses.get(t1Key) || 0) + t2CatWins)
            cumulativeCatWins.set(t2Key, (cumulativeCatWins.get(t2Key) || 0) + t2CatWins)
            cumulativeCatLosses.set(t2Key, (cumulativeCatLosses.get(t2Key) || 0) + t1CatWins)
            
            if (t1Won) {
              cumulativeMatchupWins.set(t1Key, (cumulativeMatchupWins.get(t1Key) || 0) + 1)
              cumulativeMatchupLosses.set(t2Key, (cumulativeMatchupLosses.get(t2Key) || 0) + 1)
            } else if (t2Won) {
              cumulativeMatchupWins.set(t2Key, (cumulativeMatchupWins.get(t2Key) || 0) + 1)
              cumulativeMatchupLosses.set(t1Key, (cumulativeMatchupLosses.get(t1Key) || 0) + 1)
            }
            
            // Store matchup result for each team
            const t1TeamData = leagueStore.yahooTeams.find(t => t.team_key === t1Key)
            const t2TeamData = leagueStore.yahooTeams.find(t => t.team_key === t2Key)
            
            allMatchupResults.get(t1Key)?.set(week, {
              catWins: t1CatWins,
              catLosses: t2CatWins,
              won: t1Won,
              tied: tied,
              opponentKey: t2Key,
              opponentName: t2TeamData?.name || 'Unknown'
            })
            
            allMatchupResults.get(t2Key)?.set(week, {
              catWins: t2CatWins,
              catLosses: t1CatWins,
              won: t2Won,
              tied: tied,
              opponentKey: t1Key,
              opponentName: t1TeamData?.name || 'Unknown'
            })
          }
          
          // Build week standings
          const weekStandings = leagueStore.yahooTeams.map(t => ({
            team_key: t.team_key,
            name: t.name,
            wins: cumulativeCatWins.get(t.team_key) || 0,
            losses: cumulativeCatLosses.get(t.team_key) || 0,
            matchupWins: cumulativeMatchupWins.get(t.team_key) || 0,
            matchupLosses: cumulativeMatchupLosses.get(t.team_key) || 0
          })).sort((a, b) => {
            // Sort by matchup wins first, then cat win %
            if (b.matchupWins !== a.matchupWins) return b.matchupWins - a.matchupWins
            const aWinPct = a.wins / Math.max(1, a.wins + a.losses)
            const bWinPct = b.wins / Math.max(1, b.wins + b.losses)
            return bWinPct - aWinPct
          })
          
          weekStandings.forEach((t, idx) => (t as any).rank = idx + 1)
          // Only add completed weeks to the standings-over-time chart.
          // Yahoo's current_week is in-progress, so weeks > lastCompletedWeek aren't real yet.
          if (week <= lastCompletedWeek) {
            standings.set(week, weekStandings)
          }

          // Always store the most recent matchups that have data
          // (not just the last week, in case playoffs/offseason has no matchups)
          if (matchups.length > 0) {
            displayMatchups.value = matchups
            console.log(`[Category] Set displayMatchups from week ${week} with ${matchups.length} matchups`)
          }
          
        } catch (e) {
          console.error(`Error loading week ${week}:`, e)
        }
      }
      
      weeklyStandings.value = standings
      weeklyMatchupResults.value = allMatchupResults
      
      // Store final cumulative category wins/losses for use in computed properties
      teamTotalCategoryWins.value = cumulativeCatWins
      teamTotalCategoryLosses.value = cumulativeCatLosses
      
      console.log(`Loaded ${standings.size} weeks of category matchup data, displayMatchups: ${displayMatchups.value.length}`)

    } else if (isRotoLeague) {
      // ── ROTO LEAGUE — no weekly matchups, compute from season stats ──
      console.log('[Roto] Roto league detected — skipping matchup loading, computing from season stats')

      const { yahooService } = await import('@/services/yahoo')
      const leagueKey = leagueStore.activeLeagueId || ''

      // Fetch league settings for stat categories
      const settings = await yahooService.getLeagueSettings(leagueKey)
      const rawCats: any[] = settings?.stat_categories?.stats || settings?.stat_categories || []

      const rotoCats: any[] = []
      const lowerIsBetter = new Set<string>()

      for (const cat of rawCats) {
        const s = cat?.stat || cat
        const sid = String(s?.stat_id ?? '')
        if (!sid) continue
        if (s?.is_only_display_stat === '1' || s?.is_only_display_stat === 1) continue
        if (s?.sort_order === '0' || s?.sort_order === 0) lowerIsBetter.add(sid)
        rotoCats.push({
          stat_id: sid,
          name: s?.display_name || s?.name || `Stat ${sid}`,
          display_name: s?.abbr || s?.display_name || s?.name || `S${sid}`
        })
      }
      lowerIsBetter.add('26') // ERA
      lowerIsBetter.add('27') // WHIP

      if (rotoCats.length > 0) statCategories.value = rotoCats
      console.log('[Roto] Categories:', rotoCats.map(c => c.display_name))

      // Fetch season stats for each team
      const teamSeasonStats: Record<string, Record<string, number>> = {}
      for (const team of leagueStore.yahooTeams) {
        const teamKey = team.team_key || team.team_id
        try {
          const stats = await yahooService.getTeamSeasonStats(teamKey)
          teamSeasonStats[teamKey] = stats
        } catch (e) {
          console.warn(`[Roto] Failed to fetch stats for ${team.name}:`, e)
          teamSeasonStats[teamKey] = {}
        }
      }

      // Rank teams per category and assign ranking points
      const numTeams = leagueStore.yahooTeams.length
      const perCategoryRankingPoints: Record<string, Record<string, number>> = {}
      for (const team of leagueStore.yahooTeams) {
        perCategoryRankingPoints[team.team_key] = {}
      }

      for (const cat of rotoCats) {
        const sid = cat.stat_id
        const isLower = lowerIsBetter.has(sid)
        const teamValues = leagueStore.yahooTeams.map(team => ({
          teamKey: team.team_key,
          value: teamSeasonStats[team.team_key]?.[sid] ?? 0
        }))
        teamValues.sort((a, b) => isLower ? (a.value - b.value) : (b.value - a.value))

        let i = 0
        while (i < teamValues.length) {
          let j = i + 1
          while (j < teamValues.length && teamValues[j].value === teamValues[i].value) j++
          const tiedCount = j - i
          const totalPoints = Array.from({ length: tiedCount }, (_, k) => numTeams - (i + k)).reduce((a, b) => a + b, 0)
          const avgPoints = totalPoints / tiedCount
          for (let k = i; k < j; k++) {
            perCategoryRankingPoints[teamValues[k].teamKey][sid] = avgPoints
          }
          i = j
        }
      }

      // Compute total roto points (use Yahoo's if available)
      const totalRotoPoints: Record<string, number> = {}
      for (const team of leagueStore.yahooTeams) {
        const tk = team.team_key
        let total = 0
        for (const sid of Object.keys(perCategoryRankingPoints[tk] || {})) {
          total += perCategoryRankingPoints[tk][sid]
        }
        totalRotoPoints[tk] = (team.points_for > 0) ? team.points_for : total
      }
      console.log('[Roto] Total roto points:', totalRotoPoints)

      // Store roto data for the standings table
      const maxRoto = Math.max(...Object.values(totalRotoPoints))

      // Update teamTotalCategoryWins to hold roto ranking points per category
      const rotoCatWins = new Map<string, number>()
      for (const team of leagueStore.yahooTeams) {
        rotoCatWins.set(team.team_key, totalRotoPoints[team.team_key] || 0)
      }
      teamTotalCategoryWins.value = rotoCatWins

      // Store per-category ranking data for the standings table
      perCategoryWinsData.value = perCategoryRankingPoints
      rotoPointsData.value = totalRotoPoints
      rotoMaxPoints.value = maxRoto
      isRotoMode.value = true

      console.log(`[Roto] Loaded roto standings for ${numTeams} teams`)

      // Default sort by roto points for roto leagues
      sortColumn.value = 'pf'
      sortDirection.value = 'desc'

    } else {
      // For points leagues, load actual matchup data
      const standings = new Map<number, any[]>()
      const allMatchupResults = new Map<string, Map<number, any>>()
      
      // Initialize matchup results map for each team
      leagueStore.yahooTeams.forEach(t => {
        allMatchupResults.set(t.team_key, new Map())
      })
      
      for (let week = startWeek; week <= endWeek; week++) {
        chartLoadProgress.value = `Week ${week}/${endWeek}`
        
        try {
          const matchups = await yahooService.getMatchups(leagueKey, week)
          console.log(`Week ${week}: ${matchups.length} matchups`)
          
          const cumulativeWins = new Map<string, number>()
          const cumulativeLosses = new Map<string, number>()
          const cumulativeTies = new Map<string, number>()
          const cumulativePoints = new Map<string, number>()
          
          if (week > startWeek) {
            const prevStandings = standings.get(week - 1) || []
            prevStandings.forEach(t => {
              cumulativeWins.set(t.team_key, t.wins || 0)
              cumulativeLosses.set(t.team_key, t.losses || 0)
              cumulativeTies.set(t.team_key, t.ties || 0)
              cumulativePoints.set(t.team_key, t.points_for || 0)
            })
          } else {
            leagueStore.yahooTeams.forEach(t => {
              cumulativeWins.set(t.team_key, 0)
              cumulativeLosses.set(t.team_key, 0)
              cumulativeTies.set(t.team_key, 0)
              cumulativePoints.set(t.team_key, 0)
            })
          }
          
          for (const matchup of matchups) {
            if (!matchup.teams || matchup.teams.length < 2) continue
            const t1 = matchup.teams[0]
            const t2 = matchup.teams[1]
            
            // Get points for this week
            const t1Points = parseFloat(t1.team_points?.total || t1.points || '0')
            const t2Points = parseFloat(t2.team_points?.total || t2.points || '0')
            
            // Skip incomplete matchups (in-progress week with no winner yet AND no scores)
            if (!matchup.winner_team_key && !(matchup.is_tied === true || matchup.is_tied === '1') && t1Points === 0 && t2Points === 0) {
              console.log(`[Yahoo Points] Skipping week ${week} matchup - no winner and no scores (in-progress)`)
              continue
            }
            
            // Determine winner/tie
            const isTied = matchup.is_tied === true || matchup.is_tied === '1' || (!matchup.winner_team_key && t1Points === t2Points && t1Points > 0)
            const t1Won = !isTied && matchup.winner_team_key === t1.team_key
            const t2Won = !isTied && matchup.winner_team_key === t2.team_key
            
            // If still no winner and not a tie, skip (truly in-progress)
            if (!t1Won && !t2Won && !isTied) {
              console.log(`[Yahoo Points] Skipping week ${week} matchup - no winner yet (in-progress)`)
              continue
            }
            
            // Get team names for display
            const t1TeamData = leagueStore.yahooTeams.find(t => t.team_key === t1.team_key)
            const t2TeamData = leagueStore.yahooTeams.find(t => t.team_key === t2.team_key)
            
            // Store matchup results for each team
            const t1Results = allMatchupResults.get(t1.team_key)
            const t2Results = allMatchupResults.get(t2.team_key)
            
            if (t1Results) {
              t1Results.set(week, {
                points: t1Points,
                opponentPoints: t2Points,
                won: t1Won,
                tied: isTied,
                opponent: t2.team_key,
                opponentName: t2TeamData?.name || 'Unknown'
              })
            }
            if (t2Results) {
              t2Results.set(week, {
                points: t2Points,
                opponentPoints: t1Points,
                won: t2Won,
                tied: isTied,
                opponent: t1.team_key,
                opponentName: t1TeamData?.name || 'Unknown'
              })
            }
            
            // Track cumulative points
            cumulativePoints.set(t1.team_key, (cumulativePoints.get(t1.team_key) || 0) + t1Points)
            cumulativePoints.set(t2.team_key, (cumulativePoints.get(t2.team_key) || 0) + t2Points)
            
            if (isTied) {
              cumulativeTies.set(t1.team_key, (cumulativeTies.get(t1.team_key) || 0) + 1)
              cumulativeTies.set(t2.team_key, (cumulativeTies.get(t2.team_key) || 0) + 1)
            } else if (matchup.winner_team_key) {
              if (matchup.winner_team_key === t1.team_key) {
                cumulativeWins.set(t1.team_key, (cumulativeWins.get(t1.team_key) || 0) + 1)
                cumulativeLosses.set(t2.team_key, (cumulativeLosses.get(t2.team_key) || 0) + 1)
              } else {
                cumulativeWins.set(t2.team_key, (cumulativeWins.get(t2.team_key) || 0) + 1)
                cumulativeLosses.set(t1.team_key, (cumulativeLosses.get(t1.team_key) || 0) + 1)
              }
            }
          }
          
          const weekStandings = leagueStore.yahooTeams.map(t => ({
            team_key: t.team_key,
            name: t.name,
            wins: cumulativeWins.get(t.team_key) || 0,
            losses: cumulativeLosses.get(t.team_key) || 0,
            ties: cumulativeTies.get(t.team_key) || 0,
            points_for: cumulativePoints.get(t.team_key) || 0
          })).sort((a, b) => {
            // Sort by wins descending (record-based)
            if (b.wins !== a.wins) return b.wins - a.wins
            if (a.losses !== b.losses) return a.losses - b.losses
            return (b.points_for || 0) - (a.points_for || 0)
          })
          
          weekStandings.forEach((t, idx) => (t as any).rank = idx + 1)
          // Only add completed weeks to the standings-over-time chart.
          // Yahoo's current_week is in-progress, so weeks > lastCompletedWeek aren't real yet.
          if (week <= lastCompletedWeek) {
            standings.set(week, weekStandings)
          }

          if (week === endWeek) {
            displayMatchups.value = matchups
          }
          
        } catch (e) {
          console.error(`Error loading week ${week}:`, e)
        }
      }
      
      weeklyStandings.value = standings
      weeklyMatchupResults.value = allMatchupResults
    }
    
    buildChart()
    console.log(`Chart built with ${weeklyStandings.value.size} weeks of data`)
    
  } catch (e) {
    console.error('Error loading matchups:', e)
  } finally {
    isLoadingChart.value = false
    chartLoadProgress.value = ''
  }
}

// Generate standings progression for category leagues
// Since we can't get weekly W-L from Yahoo for category leagues,
// we simulate the progression based on final standings
// Build standings from REAL weekly matchup results - NO SIMULATION
function buildStandingsFromRealMatchups(startWeek: number, endWeek: number) {
  console.log('=== BUILD v5.0 PLATFORMSTORE CREDENTIALS ===')
  console.log(`[Standings] Building REAL standings from matchups, weeks ${startWeek}-${endWeek}`)
  console.log('[Standings] yahooTeams count:', leagueStore.yahooTeams?.length)
  console.log('[Standings] weeklyMatchupResults size:', weeklyMatchupResults.value.size)
  
  // Debug: show which weeks have data for first team
  const firstTeamKey = leagueStore.yahooTeams[0]?.team_key
  const firstTeamMatchups = weeklyMatchupResults.value.get(firstTeamKey)
  if (firstTeamMatchups) {
    console.log('[Standings DEBUG] First team weeks with data:', [...firstTeamMatchups.keys()])
    const sampleWeek = [...firstTeamMatchups.keys()][0]
    if (sampleWeek !== undefined) {
      console.log('[Standings DEBUG] First team week', sampleWeek, 'data:', firstTeamMatchups.get(sampleWeek))
    }
  }
  
  const standings = new Map<number, any[]>()
  const teams = leagueStore.yahooTeams
  
  if (teams.length === 0) {
    console.warn('[Standings] No teams available')
    return
  }
  
  // Check if we have real matchup data
  const hasRealMatchupData = weeklyMatchupResults.value.size > 0 && 
    [...weeklyMatchupResults.value.values()].some(teamMatchups => teamMatchups.size > 0)
  
  console.log(`[Standings] hasRealMatchupData: ${hasRealMatchupData}, weeklyMatchupResults size: ${weeklyMatchupResults.value.size}`)
  
  if (!hasRealMatchupData) {
    console.warn('[Standings] No real matchup data available, using team records')
    // Fallback: just use final standings for all weeks (not ideal but at least not random)
    for (let week = startWeek; week <= endWeek; week++) {
      const weekStandings = teams.map(team => ({
        team_key: team.team_key,
        name: team.name,
        wins: team.wins || 0,
        losses: team.losses || 0,
        ties: team.ties || 0,
        points_for: team.points_for || 0
      })).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins
        if (a.losses !== b.losses) return a.losses - b.losses
        return (b.points_for || 0) - (a.points_for || 0)
      })
      weekStandings.forEach((t, idx) => (t as any).rank = idx + 1)
      standings.set(week, weekStandings)
    }
    weeklyStandings.value = standings
    console.log(`[Standings] Created ${standings.size} weeks of standings from final records`)
    return
  }
  
  // Track cumulative stats per team
  const cumulativeWins = new Map<string, number>()
  const cumulativeLosses = new Map<string, number>()
  const cumulativeTies = new Map<string, number>()
  const cumulativePoints = new Map<string, number>()
  
  teams.forEach(team => {
    cumulativeWins.set(team.team_key, 0)
    cumulativeLosses.set(team.team_key, 0)
    cumulativeTies.set(team.team_key, 0)
    cumulativePoints.set(team.team_key, 0)
  })
  
  // Collect all actual week numbers that have matchup data (ESPN periods may not be sequential)
  const allWeeksWithData = new Set<number>()
  weeklyMatchupResults.value.forEach(teamMatchups => {
    teamMatchups.forEach((_, week) => allWeeksWithData.add(week))
  })
  
  // Use weeks with data if available, otherwise fall back to range
  const weeksToProcess = allWeeksWithData.size > 0 
    ? [...allWeeksWithData].sort((a, b) => a - b)
    : Array.from({ length: endWeek - startWeek + 1 }, (_, i) => startWeek + i)
  
  console.log(`[Standings] Processing ${weeksToProcess.length} weeks with data:`, weeksToProcess)
  
  // Process each week's REAL matchup results
  for (const week of weeksToProcess) {
    // Add this week's results to cumulative totals
    teams.forEach(team => {
      const teamMatchups = weeklyMatchupResults.value.get(team.team_key)
      const weekResult = teamMatchups?.get(week)
      
      // Debug: log first team's first week result
      if (week === weeksToProcess[0] && team === teams[0] && weekResult) {
        console.log(`[Standings DEBUG] ${team.name} week ${week} result:`, weekResult)
      }
      
      if (weekResult) {
        if (weekResult.won) {
          cumulativeWins.set(team.team_key, (cumulativeWins.get(team.team_key) || 0) + 1)
        } else if (weekResult.tied) {
          cumulativeTies.set(team.team_key, (cumulativeTies.get(team.team_key) || 0) + 1)
        } else {
          cumulativeLosses.set(team.team_key, (cumulativeLosses.get(team.team_key) || 0) + 1)
        }
        
        // Track points for tiebreakers
        const points = weekResult.points || 0
        cumulativePoints.set(team.team_key, (cumulativePoints.get(team.team_key) || 0) + points)
      }
    })
    
    // Build standings for this week based on cumulative record
    const weekStandings = teams.map(team => ({
      team_key: team.team_key,
      name: team.name,
      wins: cumulativeWins.get(team.team_key) || 0,
      losses: cumulativeLosses.get(team.team_key) || 0,
      ties: cumulativeTies.get(team.team_key) || 0,
      points_for: cumulativePoints.get(team.team_key) || 0
    })).sort((a, b) => {
      // Sort by wins descending (record-based, not percentage)
      if (b.wins !== a.wins) return b.wins - a.wins
      // Fewer losses is better
      if (a.losses !== b.losses) return a.losses - b.losses
      // Points for as final tiebreaker
      return (b.points_for || 0) - (a.points_for || 0)
    })
    
    weekStandings.forEach((t, idx) => (t as any).rank = idx + 1)
    standings.set(week, weekStandings)
  }
  
  weeklyStandings.value = standings
  console.log(`[Standings] Built REAL standings for ${standings.size} weeks from actual matchup data`)
  
  // Debug: show sample
  if (standings.size > 0) {
    const lastWeek = Math.max(...standings.keys())
    const lastWeekStandings = standings.get(lastWeek)
    if (lastWeekStandings && lastWeekStandings.length > 0) {
      console.log(`[Standings] Week ${lastWeek} sample:`, lastWeekStandings.slice(0, 3).map(t => `${t.name}: ${t.wins}-${t.losses}`))
    }
  }
}

// DEPRECATED: This function creates FAKE data - only use as absolute last resort
function generateStandingsProgression(startWeek: number, endWeek: number) {
  console.warn('[Standings] WARNING: Using SIMULATED standings - this should only happen as a fallback!')
  
  const standings = new Map<number, any[]>()
  const numWeeks = endWeek - startWeek + 1
  
  // Get final standings from yahooTeams
  const finalStandings = [...leagueStore.yahooTeams].sort((a, b) => (a.rank || 999) - (b.rank || 999))
  
  for (let week = startWeek; week <= endWeek; week++) {
    const weekProgress = (week - startWeek + 1) / numWeeks
    
    // Calculate intermediate standings - proportional to progress
    const weekStandings = finalStandings.map(team => {
      const finalWins = team.wins || 0
      const finalLosses = team.losses || 0
      
      // Proportional wins/losses up to this week
      const winsToDate = Math.round(finalWins * weekProgress)
      const lossesToDate = Math.round(finalLosses * weekProgress)
      
      return {
        team_key: team.team_key,
        name: team.name,
        wins: winsToDate,
        losses: lossesToDate
      }
    }).sort((a, b) => {
      const aWinPct = a.wins / Math.max(1, a.wins + a.losses)
      const bWinPct = b.wins / Math.max(1, b.wins + b.losses)
      if (Math.abs(aWinPct - bWinPct) < 0.001) return b.wins - a.wins
      return bWinPct - aWinPct
    })
    
    weekStandings.forEach((t, idx) => (t as any).rank = idx + 1)
    standings.set(week, weekStandings)
  }
  
  weeklyStandings.value = standings
  console.log(`[Standings] Generated SIMULATED standings for ${standings.size} weeks (NOT REAL DATA)`)
}

// Load all data for Yahoo
async function loadAllData() {
  // Use effectiveLeagueKey which might be the previous season if current has no data
  const leagueKey = effectiveLeagueKey.value || leagueStore.activeLeagueId
  if (!leagueKey || leagueStore.activePlatform !== 'yahoo') return
  
  console.log(`loadAllData using league key: ${leagueKey}`)
  isLoading.value = true
  
  try {
    if (authStore.user?.id) await yahooService.initialize(authStore.user.id)
    
    await loadLeagueSettings()
    
    // Fetch transaction counts
    const transCounts = await yahooService.getTransactionCounts(leagueKey)
    transactionCounts.value = transCounts
    console.log(`Loaded transaction counts for ${transCounts.size} teams`)
    
    // Distribute category wins proportionally
    if (!isPointsLeague.value && displayCategories.value.length > 0) {
      await distributeCategoryWins()
    }
    
    isLoading.value = false
    
    // Pre-cache team images for downloads
    preCacheTeamImages(sortedTeams.value)
    
    // Load matchups in background for chart
    loadAllMatchups()
    
  } catch (e) {
    console.error('Error loading baseball data:', e)
    isLoading.value = false
  }
}

// Load all data for ESPN
async function loadEspnData() {
  const leagueKey = leagueStore.activeLeagueId
  console.log('[ESPN HOME] loadEspnData called:', {
    leagueKey,
    activePlatform: leagueStore.activePlatform,
    yahooTeamsCount: leagueStore.yahooTeams?.length,
    isPointsLeague: isPointsLeague.value
  })
  
  if (!leagueKey || leagueStore.activePlatform !== 'espn') {
    console.log('[ESPN HOME] Early return:', { leagueKey, platform: leagueStore.activePlatform })
    return
  }
  
  // Prevent double-loading from multiple watchers firing simultaneously
  if (isLoading.value) {
    console.log('[ESPN HOME] Already loading, skipping duplicate call')
    return
  }
  
  console.log('[ESPN HOME] loadEspnData for:', leagueKey)
  isLoading.value = true
  loadingStatus.value = 'Initializing ESPN data...'
  
  try {
    // Settings are already in store, just log them
    loadLeagueSettings()
    
    // Parse league key to get ESPN details
    const parts = leagueKey.split('_')
    const sport = parts[1] as 'football' | 'baseball' | 'basketball' | 'hockey'
    const espnLeagueId = parts[2]
    const season = parseInt(parts[3])
    
    // Set ESPN credentials from platformsStore (same as league store does)
    const credentials = platformsStore.getEspnCredentials()
    if (credentials) {
      console.log('[ESPN HOME v5.0] Setting credentials from platformsStore')
      espnService.setCredentials(credentials.espn_s2, credentials.swid)
    } else {
      console.log('[ESPN HOME v5.0] No ESPN credentials in platformsStore')
    }
    
    // Use static espnService import
    loadingStatus.value = 'Loading ESPN data...'
    
    // For category leagues, calculate standings from matchups (like Power Rankings does)
    // This bypasses the API's zero values and calculates real wins/losses
    loadingStatus.value = 'Calculating standings from matchups...'
    try {
      const league = await espnService.getLeague(sport, espnLeagueId, season)
      const currentWeek = league?.status?.currentMatchupPeriod || 15
      const completedWeeks = Math.max(1, currentWeek - 1)
      
      console.log('[ESPN HOME] Calculating standings for', completedWeeks, 'completed weeks')
      
      // Initialize team stats
      const teamStats = new Map<string, { wins: number; losses: number; ties: number; catWins: number; catLosses: number }>()
      for (const team of leagueStore.yahooTeams) {
        teamStats.set(team.team_key, { wins: 0, losses: 0, ties: 0, catWins: 0, catLosses: 0 })
      }
      
      // Fetch each week's matchups and calculate wins (exactly like Power Rankings)
      let weeksWithWinnerData = 0
      for (let week = 1; week <= completedWeeks; week++) {
        try {
          const matchups = await espnService.getMatchups(sport, espnLeagueId, season, week, true)
          
          let weekHadWinner = false
          for (const matchup of matchups) {
            if (!matchup.awayTeamId) continue // Skip bye weeks
            
            const homeKey = `espn_${espnLeagueId}_${season}_${matchup.homeTeamId}`
            const awayKey = `espn_${espnLeagueId}_${season}_${matchup.awayTeamId}`
            
            const homeStats = teamStats.get(homeKey)
            const awayStats = teamStats.get(awayKey)
            
            if (!homeStats || !awayStats) continue
            
            // Count category wins from per-category results
            let homeCatWins = 0
            let awayCatWins = 0
            
            if (matchup.homePerCategoryResults && Object.keys(matchup.homePerCategoryResults).length > 0) {
              for (const result of Object.values(matchup.homePerCategoryResults)) {
                if (result === 'WIN') homeCatWins++
                else if (result === 'LOSS') awayCatWins++
              }
            } else if ((matchup.homeCategoryWins || 0) > 0 || (matchup.awayCategoryWins || 0) > 0) {
              homeCatWins = matchup.homeCategoryWins || 0
              awayCatWins = matchup.awayCategoryWins || 0
            }
            
            // Track category totals
            homeStats.catWins += homeCatWins
            homeStats.catLosses += awayCatWins
            awayStats.catWins += awayCatWins
            awayStats.catLosses += homeCatWins
            
            // Determine matchup winner
            if (homeCatWins > awayCatWins) {
              homeStats.wins++
              awayStats.losses++
              weekHadWinner = true
            } else if (awayCatWins > homeCatWins) {
              awayStats.wins++
              homeStats.losses++
              weekHadWinner = true
            } else if (homeCatWins > 0 || awayCatWins > 0) {
              homeStats.ties++
              awayStats.ties++
              weekHadWinner = true
            }
          }
          if (weekHadWinner) weeksWithWinnerData++
        } catch (weekErr) {
          console.warn(`[ESPN HOME] Error fetching week ${week}:`, weekErr)
        }
      }
      
      // Only use calculated standings if we got winner data for most weeks
      // ESPN API often returns scoreByStat: null, so partial data would be worse than record.overall
      const winnerCoverage = completedWeeks > 0 ? weeksWithWinnerData / completedWeeks : 0
      console.log('[ESPN HOME] Winner data coverage:', weeksWithWinnerData, '/', completedWeeks, '(' + Math.round(winnerCoverage * 100) + '%)')
      
      if (winnerCoverage >= 0.75) {
        // Update espnCalculatedStandings AND directly update yahooTeams in the store
      const standingsMap = new Map<string, { wins: number; losses: number; ties: number; categoryWins: number; categoryLosses: number }>()
      
      for (const [teamKey, stats] of teamStats) {
        standingsMap.set(teamKey, {
          wins: stats.wins,
          losses: stats.losses,
          ties: stats.ties,
          categoryWins: stats.catWins,
          categoryLosses: stats.catLosses
        })
        
        // DIRECTLY update the team in yahooTeams
        const team = leagueStore.yahooTeams.find(t => t.team_key === teamKey)
        if (team) {
          team.wins = stats.wins
          team.losses = stats.losses
          team.ties = stats.ties
          team.category_wins = stats.catWins
          team.category_losses = stats.catLosses
          console.log(`[ESPN HOME] Updated ${team.name}: ${stats.wins}-${stats.losses} (Cat: ${stats.catWins}-${stats.catLosses})`)
        }
      }
      
      espnCalculatedStandings.value = standingsMap
      console.log('[ESPN HOME] Calculated standings for', standingsMap.size, 'teams')
      } else {
        console.log('[ESPN HOME] Insufficient matchup winner data (' + weeksWithWinnerData + '/' + completedWeeks + ' weeks) - keeping original record.overall data')
        // Don't overwrite team records - the record.overall from ESPN API is correct
        // Just log what record.overall has
        leagueStore.yahooTeams.forEach(team => {
          console.log(`[ESPN HOME] Keeping original record for ${team.name}: ${team.wins}-${team.losses}`)
        })
      }
      
    } catch (standingsErr) {
      console.warn('[ESPN HOME] Could not calculate standings:', standingsErr)
    }
    
    // Fetch transactions for move counts
    loadingStatus.value = 'Fetching transactions...'
    try {
      const transactions = await espnService.getTransactions(sport, espnLeagueId, season)
      console.log('[ESPN] Fetched transactions:', transactions.length)
      
      // Debug: log sample transaction structure
      if (transactions.length > 0) {
        console.log('[ESPN] Sample transaction structure:', JSON.stringify(transactions[0], null, 2))
        console.log('[ESPN] Transaction keys:', Object.keys(transactions[0]))
      }
      
      // Build a mapping from ESPN team ID to team_key for lookup
      // team_key format is: espn_LEAGUEID_SEASON_TEAMID
      const espnIdToTeamKey = new Map<number, string>()
      leagueStore.yahooTeams.forEach(team => {
        const parts = team.team_key.split('_')
        if (parts.length >= 4 && parts[0] === 'espn') {
          const teamId = parseInt(parts[parts.length - 1])
          if (!isNaN(teamId)) {
            espnIdToTeamKey.set(teamId, team.team_key)
          }
        }
        if (team.team_id) {
          const teamIdNum = parseInt(team.team_id)
          if (!isNaN(teamIdNum)) {
            espnIdToTeamKey.set(teamIdNum, team.team_key)
          }
        }
      })
      console.log('[ESPN] Team ID mapping:', Object.fromEntries(espnIdToTeamKey))
      
      // Count transactions per team
      const counts = new Map<string, number>()
      // Initialize all teams with 0
      leagueStore.yahooTeams.forEach(team => {
        counts.set(team.team_key, 0)
      })
      
      // Track team IDs we find in transactions
      const foundTeamIds = new Set<number>()
      
      transactions.forEach((tx: any) => {
        // ESPN transactions can have team info in multiple places
        // Try multiple fields to find the team ID
        const teamId = tx.teamId || tx.team?.id || tx.memberId
        
        if (teamId) {
          foundTeamIds.add(teamId)
          const teamKey = espnIdToTeamKey.get(teamId)
          if (teamKey) {
            counts.set(teamKey, (counts.get(teamKey) || 0) + 1)
          }
        }
        
        // Also count by items array if present (for add/drop transactions)
        if (tx.items && Array.isArray(tx.items)) {
          tx.items.forEach((item: any) => {
            // fromTeamId = team that dropped player
            // toTeamId = team that picked up player
            if (item.fromTeamId && item.fromTeamId > 0) {
              foundTeamIds.add(item.fromTeamId)
              const fromKey = espnIdToTeamKey.get(item.fromTeamId)
              if (fromKey) {
                counts.set(fromKey, (counts.get(fromKey) || 0) + 1)
              }
            }
            if (item.toTeamId && item.toTeamId > 0) {
              foundTeamIds.add(item.toTeamId)
              const toKey = espnIdToTeamKey.get(item.toTeamId)
              if (toKey) {
                counts.set(toKey, (counts.get(toKey) || 0) + 1)
              }
            }
          })
        }
        
        // Check for executionType-based structure
        if (tx.executionType && tx.bidAmount !== undefined) {
          // This is a waiver/FA transaction - try to find team info
          const txTeamId = tx.memberId || tx.teamId
          if (txTeamId) {
            foundTeamIds.add(txTeamId)
            const teamKey = espnIdToTeamKey.get(txTeamId)
            if (teamKey) {
              counts.set(teamKey, (counts.get(teamKey) || 0) + 1)
            }
          }
        }
      })
      
      console.log('[ESPN] Found team IDs in transactions:', Array.from(foundTeamIds))
      transactionCounts.value = counts
      console.log('[ESPN] Transaction counts from API:', Object.fromEntries(counts))
      
      // If all counts are 0, try using transactionCounter from team data
      const totalFromApi = Array.from(counts.values()).reduce((sum, c) => sum + c, 0)
      if (totalFromApi === 0) {
        console.log('[ESPN] API counts all zero, checking team transactionCounter...')
        leagueStore.yahooTeams.forEach(team => {
          // First try pre-calculated totalMoves, then fall back to extracting from object
          let txCount = team.totalMoves || 0
          if (!txCount) {
            // transactionCounter is an object with acquisitions, drops, trades, etc.
            const txData = team.transactionCounter || team.transactions || {}
            if (typeof txData === 'object' && txData !== null) {
              txCount = (txData.acquisitions || 0) + (txData.drops || 0) + (txData.trades || 0) + (txData.moveToIR || 0) + (txData.moveToActive || 0)
            } else if (typeof txData === 'number') {
              txCount = txData
            }
          }
          counts.set(team.team_key, txCount)
        })
        transactionCounts.value = counts
        console.log('[ESPN] Transaction counts from team data:', Object.fromEntries(counts))
      }
    } catch (txErr) {
      console.warn('[ESPN] Could not fetch transactions:', txErr)
      // Fallback: use transactionCounter from team data
      const counts = new Map<string, number>()
      leagueStore.yahooTeams.forEach(team => {
        // First try pre-calculated totalMoves, then fall back to extracting from object
        let txCount = team.totalMoves || 0
        if (!txCount) {
          // transactionCounter is an object with acquisitions, drops, trades, etc.
          const txData = team.transactionCounter || team.transactions || {}
          if (typeof txData === 'object' && txData !== null) {
            txCount = (txData.acquisitions || 0) + (txData.drops || 0) + (txData.trades || 0) + (txData.moveToIR || 0) + (txData.moveToActive || 0)
          } else if (typeof txData === 'number') {
            txCount = txData
          }
        }
        counts.set(team.team_key, txCount)
      })
      transactionCounts.value = counts
      console.log('[ESPN] Using fallback transaction counts from team data:', Object.fromEntries(counts))
    }
    
    // Fetch all historical matchups for proper streak/weekly data
    // Use week-by-week fetch (like Power Rankings) to get full category data
    loadingStatus.value = 'Fetching matchup history...'
    try {
      // Get league settings for current week and season weeks
      const league = await espnService.getLeague(sport, espnLeagueId, season)
      const currentWeek = league?.status?.currentMatchupPeriod || 15
      const regularSeasonWeeks = league?.settings?.regularSeasonMatchupPeriodCount || 25
      
      console.log('[ESPN] League currentWeek:', currentWeek, 'regularSeasonWeeks:', regularSeasonWeeks)
      
      // Build weekly matchup results 
      const allMatchupResults = new Map<string, Map<number, any>>()
      const weeklyScores = new Map<string, Map<number, number>>()
      
      // Build a mapping from ESPN team ID to team_key for lookup
      const espnIdToTeamKey = new Map<number, string>()
      leagueStore.yahooTeams.forEach(team => {
        const parts = team.team_key.split('_')
        if (parts.length >= 4 && parts[0] === 'espn') {
          const teamId = parseInt(parts[parts.length - 1])
          if (!isNaN(teamId)) {
            espnIdToTeamKey.set(teamId, team.team_key)
          }
        }
        if (team.team_id) {
          const teamIdNum = parseInt(team.team_id)
          if (!isNaN(teamIdNum)) {
            espnIdToTeamKey.set(teamIdNum, team.team_key)
          }
        }
        allMatchupResults.set(team.team_key, new Map())
        weeklyScores.set(team.team_key, new Map())
      })
      
      console.log('[ESPN] Team key mapping (teamId -> team_key):', Object.fromEntries(espnIdToTeamKey))
      
      // Check if this is a category league
      const isCategoryLeague = !isPointsLeague.value
      
      // Process each week's matchups (fetch week-by-week like Power Rankings for full data)
      let matchupsProcessed = 0
      let scoresRecorded = 0
      let methodPerCategory = 0
      let methodCumulativeScore = 0
      let methodWinnerField = 0
      let methodTotalPoints = 0
      let methodFallback = 0
      let weeksWithRealWinners = 0
      
      // Only process completed weeks (up to currentWeek - 1)
      const completedWeeks = Math.min(currentWeek - 1, regularSeasonWeeks)
      console.log('[ESPN] Will process', completedWeeks, 'completed weeks')
      
      for (let week = 1; week <= completedWeeks; week++) {
        let weekHadRealWinner = false
        try {
          // Fetch this week's matchups with full views (like Power Rankings)
          const matchups = await espnService.getMatchups(sport, espnLeagueId, season, week, true)
          
          if (week === 1 && matchups.length > 0) {
            console.log('[ESPN DEBUG] Week 1 matchup data:', {
              homeTeamId: matchups[0].homeTeamId,
              awayTeamId: matchups[0].awayTeamId,
              homeScore: matchups[0].homeScore,
              awayScore: matchups[0].awayScore,
              winner: matchups[0].winner,
              homeCategoryWins: matchups[0].homeCategoryWins,
              awayCategoryWins: matchups[0].awayCategoryWins,
              hasHomePerCategoryResults: !!matchups[0].homePerCategoryResults,
              homePerCategoryResultsKeys: matchups[0].homePerCategoryResults ? Object.keys(matchups[0].homePerCategoryResults).length : 0
            })
          }
          
          for (const matchup of matchups) {
            if (!matchup.awayTeamId) continue // Skip bye weeks
            
            const homeTeamKey = espnIdToTeamKey.get(matchup.homeTeamId) || `espn_${espnLeagueId}_${season}_${matchup.homeTeamId}`
            const awayTeamKey = espnIdToTeamKey.get(matchup.awayTeamId) || `espn_${espnLeagueId}_${season}_${matchup.awayTeamId}`
            const homeScore = matchup.homeScore || 0
            const awayScore = matchup.awayScore || 0
            
            matchupsProcessed++
            
            // Determine winner using multiple methods (same as Power Rankings)
            let homeWon = false
            let awayWon = false
            let isTied = false
            let homeCatWins = 0
            let awayCatWins = 0
            let homeCatLosses = 0
            let awayCatLosses = 0
            
            if (isCategoryLeague) {
              // Method 1: Use per-category results (best - from SCOREBOARD/BOXSCORE views)
              if (matchup.homePerCategoryResults && Object.keys(matchup.homePerCategoryResults).length > 0) {
                for (const [statId, result] of Object.entries(matchup.homePerCategoryResults)) {
                  if (result === 'WIN') {
                    homeCatWins++
                  } else if (result === 'LOSS') {
                    homeCatLosses++
                  }
                }
                for (const [statId, result] of Object.entries(matchup.awayPerCategoryResults || {})) {
                  if (result === 'WIN') {
                    awayCatWins++
                  } else if (result === 'LOSS') {
                    awayCatLosses++
                  }
                }
                homeWon = homeCatWins > awayCatWins
                awayWon = awayCatWins > homeCatWins
                isTied = homeCatWins === awayCatWins
                methodPerCategory++
                weekHadRealWinner = true
              }
              // Method 2: Use cumulativeScore category wins
              else if ((matchup.homeCategoryWins || 0) > 0 || (matchup.awayCategoryWins || 0) > 0) {
                homeCatWins = matchup.homeCategoryWins || 0
                awayCatWins = matchup.awayCategoryWins || 0
                homeCatLosses = matchup.homeCategoryLosses || 0
                awayCatLosses = matchup.awayCategoryLosses || 0
                homeWon = homeCatWins > awayCatWins
                awayWon = awayCatWins > homeCatWins
                isTied = homeCatWins === awayCatWins
                methodCumulativeScore++
                weekHadRealWinner = true
              }
              // Method 3: Use winner field
              else if (matchup.winner && matchup.winner !== 'UNDECIDED') {
                homeWon = matchup.winner === 'HOME'
                awayWon = matchup.winner === 'AWAY'
                isTied = matchup.winner === 'TIE'
                // For category leagues, scores represent category wins
                homeCatWins = homeScore
                awayCatWins = awayScore
                homeCatLosses = awayScore
                awayCatLosses = homeScore
                methodWinnerField++
                weekHadRealWinner = true
              }
              // Method 4: Use totalPoints (which ARE category wins in H2H Each Category)
              else if (homeScore > 0 || awayScore > 0) {
                homeWon = homeScore > awayScore
                awayWon = awayScore > homeScore
                isTied = homeScore === awayScore
                // Scores = category wins for category leagues
                homeCatWins = homeScore
                awayCatWins = awayScore
                homeCatLosses = awayScore
                awayCatLosses = homeScore
                methodTotalPoints++
                weekHadRealWinner = true
              }
              // Fallback: Still record matchup as tie (don't skip!)
              else {
                methodFallback++
                isTied = true  // Treat unknown as tie rather than skipping
                console.log(`[ESPN] Week ${week}: No winner data available, treating as incomplete`)
              }
            } else {
              // Points league
              homeWon = homeScore > awayScore
              awayWon = awayScore > homeScore
              isTied = homeScore === awayScore
              if (homeScore > 0 || awayScore > 0) {
                weekHadRealWinner = true
              }
            }
            
            // Record for home team
            const homeResults = allMatchupResults.get(homeTeamKey)
            if (homeResults) {
              homeResults.set(week, {
                won: homeWon,
                tied: isTied,
                points: homeScore,
                opponentPoints: awayScore,
                opponent: awayTeamKey,
                catWins: homeCatWins,
                catLosses: homeCatLosses
              })
            }
            
            // Record for away team
            const awayResults = allMatchupResults.get(awayTeamKey)
            if (awayResults) {
              awayResults.set(week, {
                won: awayWon,
                tied: isTied,
                points: awayScore,
                opponentPoints: homeScore,
                opponent: homeTeamKey,
                catWins: awayCatWins,
                catLosses: awayCatLosses
              })
            }
            
            // Record weekly scores
            const homeScoresMap = weeklyScores.get(homeTeamKey)
            if (homeScoresMap) {
              homeScoresMap.set(week, homeScore)
              scoresRecorded++
            }
            const awayScoresMap = weeklyScores.get(awayTeamKey)
            if (awayScoresMap) {
              awayScoresMap.set(week, awayScore)
              scoresRecorded++
            }
          }
        } catch (weekErr) {
          console.warn(`[ESPN] Could not fetch week ${week}:`, weekErr)
        }
        if (weekHadRealWinner) weeksWithRealWinners++
      }
      
      // Check if we got real winner data for enough weeks
      const matchupWinnerCoverage = completedWeeks > 0 ? weeksWithRealWinners / completedWeeks : 0
      console.log('[ESPN] Matchup winner coverage:', weeksWithRealWinners, '/', completedWeeks, '(' + Math.round(matchupWinnerCoverage * 100) + '%)')
      
      // Always keep matchup data, filter to only weeks with actual results
      // ESPN period numbering doesn't map 1:1 to real weeks, so coverage % is unreliable
      const filteredResults = new Map<string, Map<number, any>>()
      allMatchupResults.forEach((teamMatchups, teamKey) => {
        const filtered = new Map<number, any>()
        teamMatchups.forEach((result, week) => {
          // Keep weeks where there was actual activity
          const hasPoints = (result.points || 0) > 0 || (result.opponentPoints || 0) > 0
          const hasCatData = (result.catWins || 0) > 0 || (result.catLosses || 0) > 0
          const hasWinner = result.won || result.tied
          if (hasPoints || hasCatData || hasWinner) {
            filtered.set(week, result)
          }
        })
        filteredResults.set(teamKey, filtered)
      })
      weeklyMatchupResults.value = filteredResults
      const weeksKept = filteredResults.size > 0 ? [...filteredResults.values()][0].size : 0
      console.log(`[ESPN] Kept ${weeksKept} weeks with actual data out of ${completedWeeks} periods (coverage: ${Math.round(matchupWinnerCoverage * 100)}%)`)
      // Always set weekly scores if we have any data (used for hottest/coldest points calculation)
      const totalScoresRecorded = [...weeklyScores.values()].reduce((sum, m) => sum + m.size, 0)
      if (totalScoresRecorded > 0) {
        espnWeeklyScores.value = weeklyScores
        console.log('[ESPN] Preserved espnWeeklyScores with', totalScoresRecorded, 'score entries')
      } else {
        espnWeeklyScores.value = new Map()
      }
      
      console.log('[ESPN] Built matchup results for', allMatchupResults.size, 'teams')
      console.log('[ESPN] Processed', matchupsProcessed, 'matchups, recorded', scoresRecorded, 'scores')
      console.log('[ESPN] Winner determination methods used:', {
        perCategory: methodPerCategory,
        cumulativeScore: methodCumulativeScore,
        winnerField: methodWinnerField,
        totalPoints: methodTotalPoints,
        fallback: methodFallback
      })
      
      // Debug: show sample data and calculated wins
      const sampleTeam = leagueStore.yahooTeams[0]
      if (sampleTeam) {
        const sampleMatchups = allMatchupResults.get(sampleTeam.team_key)
        const sampleScores = weeklyScores.get(sampleTeam.team_key)
        console.log(`[ESPN] Sample team ${sampleTeam.name} (${sampleTeam.team_key}):`)
        console.log('  - Matchup weeks:', sampleMatchups?.size || 0)
        console.log('  - Score weeks:', sampleScores?.size || 0)
        
        // Calculate wins/losses from matchup results
        let wins = 0, losses = 0, ties = 0
        sampleMatchups?.forEach((result) => {
          if (result.won) wins++
          else if (result.tied) ties++
          else losses++
        })
        console.log(`  - Calculated record: ${wins}-${losses}-${ties}`)
      }
      
    } catch (matchupErr) {
      console.warn('[ESPN] Could not fetch all matchups, using generated data:', matchupErr)
      // Fall back to generated data
      const yahooLeagueData = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
      const endWeek = yahooLeagueData?.end_week || 25
      const startWeek = yahooLeagueData?.start_week || 1
      generateEspnMatchupResults(startWeek, endWeek)
    }
    
    // Load matchups from store
    displayMatchups.value = leagueStore.yahooMatchups || []
    console.log('[ESPN] Matchups from store:', displayMatchups.value.length)
    
    // Fetch real category stats breakdown for ESPN category leagues
    if (!isPointsLeague.value) {
      loadingStatus.value = 'Analyzing category statistics...'
      console.log('[ESPN] Category league detected - fetching real category stats')
      try {
        const categoryBreakdown = await espnService.getCategoryStatsBreakdown(sport, espnLeagueId, season)
        
        console.log('[ESPN] Got category breakdown:', {
          categoriesCount: categoryBreakdown.categories.length,
          teamsCount: categoryBreakdown.teamCategoryWins.size
        })
        
        // Set stat categories from ESPN
        statCategories.value = categoryBreakdown.categories
        
        // Convert Maps to use team_key format consistent with yahooTeams
        const convertedCatWins = new Map<string, Record<string, number>>()
        const convertedTotalWins = new Map<string, number>()
        const convertedTotalLosses = new Map<string, number>()
        
        for (const team of leagueStore.yahooTeams) {
          const espnKey = `espn_${team.team_id}`
          
          const catWins = categoryBreakdown.teamCategoryWins.get(espnKey)
          if (catWins) {
            convertedCatWins.set(team.team_key, catWins)
          }
          
          const totalWins = categoryBreakdown.teamTotalCategoryWins.get(espnKey) || 0
          const totalLosses = categoryBreakdown.teamTotalCategoryLosses.get(espnKey) || 0
          convertedTotalWins.set(team.team_key, totalWins)
          convertedTotalLosses.set(team.team_key, totalLosses)
        }
        
        teamCategoryWins.value = convertedCatWins
        teamTotalCategoryWins.value = convertedTotalWins
        teamTotalCategoryLosses.value = convertedTotalLosses
        espnHasRealStatValues.value = categoryBreakdown.hasRealStatValues
        
        console.log('[ESPN] Category wins set for', convertedCatWins.size, 'teams, hasRealStatValues:', categoryBreakdown.hasRealStatValues)
        console.log('[ESPN] Total category wins sample:', Object.fromEntries([...convertedTotalWins.entries()].slice(0, 3)))
        
      } catch (error) {
        console.error('[ESPN] Error fetching category breakdown:', error)
        // Fall back to distribution method
        if (displayCategories.value.length > 0) {
          await distributeCategoryWins()
        }
      }
    }
    
    // Build standings from REAL matchup data (not simulated)
    loadingStatus.value = 'Building standings chart...'
    const yahooLeagueData = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
    const endWeek = yahooLeagueData?.end_week || 25
    const startWeek = yahooLeagueData?.start_week || 1
    const currWeek = yahooLeagueData?.current_week || currentWeek.value || 1
    
    // Only show weeks up to current week (not future weeks)
    const chartEndWeek = isSeasonComplete.value ? endWeek : Math.min(currWeek, endWeek)
    
    // Use REAL matchup data to build standings
    buildStandingsFromRealMatchups(startWeek, chartEndWeek)
    buildChart()
    
    loadingStatus.value = ''
    isLoading.value = false
    isLoadingChart.value = false
    
    // Pre-cache team images for downloads
    preCacheTeamImages(sortedTeams.value)
    
  } catch (e) {
    console.error('[ESPN] Error loading data:', e)
    loadingStatus.value = ''
    isLoading.value = false
  }
}

// Load all data for Sleeper
async function loadSleeperData() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey || leagueStore.activePlatform !== 'sleeper') return
  
  console.log('[Sleeper] loadSleeperData for:', leagueKey)
  isLoading.value = true
  loadingStatus.value = 'Loading Sleeper data...'
  
  try {
    // Data is already in store from transformation, just set up the display
    loadLeagueSettings()
    
    // Transaction counts - fetch from Sleeper API since roster.settings.total_moves is unreliable
    const counts = new Map<string, number>()
    leagueStore.yahooTeams.forEach(team => counts.set(team.team_key, 0))
    
    try {
      const leagueId = leagueStore.activeLeagueId || ''
      const currentWeek = leagueStore.currentLeague?.settings?.leg || 18
      console.log('[Sleeper] Fetching transactions for weeks 1-' + currentWeek)
      
      const allTransactions = await sleeperService.getAllTransactions(leagueId, currentWeek)
      console.log('[Sleeper] Total transactions fetched:', allTransactions.length)
      
      // Count completed add/drop/trade transactions per roster
      for (const tx of allTransactions) {
        if (tx.status !== 'complete') continue
        // roster_ids contains all rosters involved in this transaction
        const rosterIds = tx.roster_ids || []
        for (const rosterId of rosterIds) {
          const teamKey = `sleeper_${rosterId}`
          counts.set(teamKey, (counts.get(teamKey) || 0) + 1)
        }
      }
      
      console.log('[Sleeper] Transaction counts:', Object.fromEntries(counts))
    } catch (txErr) {
      console.warn('[Sleeper] Failed to fetch transactions:', txErr)
      // Fallback to roster data
      leagueStore.yahooTeams.forEach(team => {
        counts.set(team.team_key, team.transactions || 0)
      })
    }
    transactionCounts.value = counts
    
    isLoading.value = false
    loadingStatus.value = ''
    
    // Pre-cache team images for downloads
    preCacheTeamImages(sortedTeams.value)
    
    // Load matchups in background for chart
    loadAllMatchups()
    
  } catch (e) {
    console.error('[Sleeper] Error loading data:', e)
    loadingStatus.value = ''
    isLoading.value = false
  }
}

// FALLBACK ONLY: Generate ESTIMATED matchup results when real ESPN API data is unavailable
// This function should only be called if getAllMatchups() fails
// WARNING: This data is NOT REAL - it's estimated from season totals
function generateEspnMatchupResults(startWeek: number, endWeek: number) {
  console.warn('[ESPN FALLBACK] Generating ESTIMATED matchup results - real API data unavailable!')
  console.warn('[ESPN FALLBACK] Weekly scores and standings will be approximations, not actual data!')
  
  const allMatchupResults = new Map<string, Map<number, any>>()
  const weeklyScores = new Map<string, Map<number, number>>()
  const teams = leagueStore.yahooTeams
  const numWeeks = endWeek - startWeek + 1
  
  // Initialize maps for each team
  teams.forEach(team => {
    allMatchupResults.set(team.team_key, new Map())
    weeklyScores.set(team.team_key, new Map())
  })
  
  // For points leagues, distribute wins/losses evenly and use average weekly score
  // NO RANDOM ELEMENTS - use deterministic distribution based on season totals
  teams.forEach(team => {
    const totalWins = team.wins || 0
    const totalLosses = team.losses || 0
    const totalTies = team.ties || 0
    const totalPoints = team.points_for || 0
    const avgPointsPerWeek = numWeeks > 0 ? totalPoints / numWeeks : 0
    
    const teamResults = allMatchupResults.get(team.team_key)!
    const teamScores = weeklyScores.get(team.team_key)!
    
    // Distribute wins/losses evenly across weeks (deterministic, not random)
    const totalGames = totalWins + totalLosses + totalTies
    const winsPerWeek = totalGames > 0 ? totalWins / totalGames : 0.5
    
    for (let week = startWeek; week <= endWeek; week++) {
      const weekIndex = week - startWeek
      
      // Deterministic win/loss based on proportion (not random)
      // If team has 60% win rate, first 60% of weeks are wins
      const proportionComplete = (weekIndex + 1) / numWeeks
      const expectedWins = Math.floor(totalWins * proportionComplete)
      const previousExpectedWins = weekIndex > 0 ? Math.floor(totalWins * (weekIndex / numWeeks)) : 0
      const won = expectedWins > previousExpectedWins
      
      // Use average points (no random variance)
      const weekScore = avgPointsPerWeek
      
      teamResults.set(week, {
        won: won,
        tied: false,
        points: weekScore,
        catWins: won ? 1 : 0,
        catLosses: won ? 0 : 1
      })
      
      teamScores.set(week, weekScore)
    }
  })
  
  weeklyMatchupResults.value = allMatchupResults
  espnWeeklyScores.value = weeklyScores
  console.warn(`[ESPN FALLBACK] Generated ESTIMATED data for ${teams.length} teams across ${numWeeks} weeks`)
  console.warn('[ESPN FALLBACK] For accurate data, check that ESPN API is accessible')
}

// Watch for hover changes to update chart
watch(standingsHoveredTeamKey, () => {
  // Rebuild chart with new hover state
  if (weeklyStandings.value.size > 0) {
    buildChart()
  }
})

watch(() => leagueStore.activeLeagueId, () => {
  if (leagueStore.activePlatform === 'yahoo') loadAllData()
  if (leagueStore.activePlatform === 'espn') loadEspnData()
  if (leagueStore.activePlatform === 'sleeper') loadSleeperData()
})

// Watch for currentLeague changes (happens when fallback to previous season occurs)
watch(() => leagueStore.currentLeague?.league_id, (newKey, oldKey) => {
  if (newKey && newKey !== oldKey) {
    console.log(`Current league changed from ${oldKey} to ${newKey}, reloading data...`)
    if (leagueStore.activePlatform === 'yahoo') loadAllData()
    if (leagueStore.activePlatform === 'espn') loadEspnData()
    if (leagueStore.activePlatform === 'sleeper') loadSleeperData()
  }
})

watch(() => leagueStore.yahooTeams, () => {
  console.log('[HOME watch yahooTeams]', {
    yahooTeamsLength: leagueStore.yahooTeams?.length,
    activePlatform: leagueStore.activePlatform
  })
  
  if (leagueStore.yahooTeams.length > 0) {
    if (leagueStore.activePlatform === 'yahoo') loadAllData()
    if (leagueStore.activePlatform === 'espn') loadEspnData()
    if (leagueStore.activePlatform === 'sleeper') loadSleeperData()
  }
}, { immediate: true })

// Watch for matchups changes (they might load after teams)
watch(() => leagueStore.yahooMatchups, () => {
  if (leagueStore.yahooMatchups?.length > 0) {
    console.log('[Watch yahooMatchups] matchups changed:', leagueStore.yahooMatchups.length, 'platform:', leagueStore.activePlatform)
    // Only auto-set if displayMatchups is currently empty (don't override chart-loaded matchups)
    if (displayMatchups.value.length === 0) {
      displayMatchups.value = leagueStore.yahooMatchups
    }
  }
}, { immediate: true })

function checkScrollHint() {
  if (standingsTableRef.value) {
    const { scrollWidth, clientWidth } = standingsTableRef.value
    showScrollHint.value = scrollWidth > clientWidth
  }
}

onMounted(async () => {
  console.log('[HOME onMounted v5.0]', {
    yahooTeamsLength: leagueStore.yahooTeams?.length,
    activePlatform: leagueStore.activePlatform,
    activeLeagueId: leagueStore.activeLeagueId
  })
  
  // Set ESPN credentials from platformsStore (same as league store does)
  if (leagueStore.activePlatform === 'espn') {
    const credentials = platformsStore.getEspnCredentials()
    if (credentials) {
      console.log('[HOME onMounted] Setting ESPN credentials from platformsStore')
      espnService.setCredentials(credentials.espn_s2, credentials.swid)
    } else {
      console.log('[HOME onMounted] No ESPN credentials in platformsStore')
    }
    
    // Try to auto-refresh credentials from Chrome extension (non-blocking)
    getEspnCookiesFromExtension().then(result => {
      if (result.espn_s2 && result.swid) {
        console.log('[HOME] Auto-refreshed ESPN credentials from Chrome extension')
        espnService.setCredentials(result.espn_s2, result.swid)
        
        // Also update the stored credentials
        platformsStore.storeEspnCredentials({
          espn_s2: result.espn_s2,
          swid: result.swid,
          leagueId: leagueStore.activeLeagueId?.split('_')[2] || '',
          sport: (leagueStore.activeSport as any) || 'football',
          season: leagueStore.activeSeason || new Date().getFullYear()
        })
      }
    }).catch(() => {
      // Extension not installed or not available - that's fine
    })
  }
  
  if (leagueStore.yahooTeams.length > 0) {
    if (leagueStore.activePlatform === 'yahoo') loadAllData()
    if (leagueStore.activePlatform === 'espn') loadEspnData()
    if (leagueStore.activePlatform === 'sleeper') loadSleeperData()
  }
  
  // Check scroll hint after a delay for DOM to settle
  setTimeout(checkScrollHint, 500)
  window.addEventListener('resize', checkScrollHint)
  
  // Listen for ESPN credential updates from Chrome extension
  window.addEventListener('espn-credentials-updated', handleExtensionCredentialSync)
})

// Handler for Chrome extension credential sync
function handleExtensionCredentialSync(event: Event) {
  const detail = (event as CustomEvent).detail
  console.log('[HOME] ESPN credentials updated via Chrome extension', detail)
  
  if (detail?.espn_s2 && detail?.swid) {
    // Apply fresh credentials
    espnService.setCredentials(detail.espn_s2, detail.swid)
    
    // Clear ESPN matchup caches so we fetch with new credentials
    espnService.clearLeagueCache(
      leagueStore.activeLeagueId || '',
      (leagueStore.activeSport as any) || 'basketball',
      leagueStore.activeSeason || new Date().getFullYear()
    )
    
    console.log('[HOME] ESPN credentials refreshed via extension - reloading data...')
    
    // Reload ESPN data with fresh credentials
    if (leagueStore.activePlatform === 'espn' && leagueStore.yahooTeams.length > 0) {
      loadEspnData()
    }
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkScrollHint)
  window.removeEventListener('espn-credentials-updated', handleExtensionCredentialSync)
})
</script>

<style scoped>
/* Standings chart - make lines easier to hover */
:deep(.apexcharts-series path) {
  cursor: pointer;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Ensure tooltip is always on top */
:deep(.apexcharts-tooltip) {
  z-index: 100;
}
</style>

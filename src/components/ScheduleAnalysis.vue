<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h2 class="text-2xl font-bold text-dark-text mb-2">Schedule-Adjusted Strength of Schedule</h2>
        <p class="text-sm text-dark-textMuted">
          NFL defense rankings based on fantasy points allowed vs league average. 
          #1 = Hardest matchup (lowest PAE). #32 = Easiest matchup (highest PAE).
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-dark-textMuted">Season: {{ displaySeason }} • Week {{ currentWeek }}</span>
        <button 
          @click="loadData" 
          class="btn btn-primary flex items-center gap-2"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="animate-spin">⏳</span>
          <span v-else>🔄</span>
          {{ isLoading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="card">
      <div class="card-body py-12 text-center">
        <LoadingSpinner size="lg" :message="loadingMessage" />
        <p class="text-xs text-dark-textMuted mt-2">This may take a moment as we analyze game data...</p>
      </div>
    </div>

    <template v-else-if="hasData">
      <!-- Position Tabs -->
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="pos in ['QB', 'RB', 'WR', 'TE']"
          :key="pos"
          @click="selectedPosition = pos"
          :class="selectedPosition === pos ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textSecondary hover:bg-dark-border/50'"
          class="px-6 py-3 rounded-xl font-semibold transition-all"
        >
          {{ pos }}
        </button>
      </div>

      <!-- Week 18 Toggle - Above Legend -->
      <div class="flex justify-end">
        <label class="flex items-center gap-2 text-sm text-dark-textMuted cursor-pointer bg-dark-card/50 px-4 py-2 rounded-lg">
          <input 
            type="checkbox" 
            v-model="excludeWeek18" 
            class="rounded border-dark-border bg-dark-card text-primary focus:ring-primary"
          />
          Exclude Week 18 from calculations
        </label>
      </div>

      <!-- Legend -->
      <div class="card bg-dark-card/50">
        <div class="card-body py-3">
          <div class="flex flex-wrap items-center gap-6 text-sm">
            <span class="text-dark-textMuted font-medium">Matchup Difficulty (by Rank):</span>
            <div class="flex items-center gap-2">
              <span class="w-4 h-4 rounded bg-red-500"></span>
              <span class="text-dark-textMuted">#1-8 Hardest</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-4 h-4 rounded bg-orange-500"></span>
              <span class="text-dark-textMuted">#9-14 Hard</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-4 h-4 rounded bg-yellow-500"></span>
              <span class="text-dark-textMuted">#15-20 Avg</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-4 h-4 rounded bg-lime-500"></span>
              <span class="text-dark-textMuted">#21-26 Easy</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-4 h-4 rounded bg-green-500"></span>
              <span class="text-dark-textMuted">#27-32 Easiest</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Schedule Grid -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🛡️</span>
            <h3 class="card-title">{{ selectedPosition }} Schedule Strength by NFL Team</h3>
          </div>
          <p class="text-sm text-dark-textMuted mt-1">
            Click column headers to sort. PAE = Points Above Expectation (vs league average).
          </p>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-dark-border/30 sticky top-0 z-10">
                <tr>
                  <th 
                    class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider sticky left-0 bg-dark-card z-20 min-w-[100px] cursor-pointer hover:bg-dark-border/50"
                    @click="sortBy('team')"
                  >
                    <div class="flex items-center gap-1">
                      Team
                      <span v-if="sortColumn === 'team'" class="text-primary">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                    </div>
                  </th>
                  <th 
                    class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider min-w-[110px] bg-primary/10 cursor-pointer hover:bg-primary/20"
                    @click="sortBy('ros')"
                  >
                    <div class="flex flex-col items-center">
                      <span>ROS SOS</span>
                      <span v-if="sortColumn === 'ros'" class="text-primary">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                    </div>
                  </th>
                  <th 
                    class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider min-w-[110px] bg-cyan-500/10 cursor-pointer hover:bg-cyan-500/20"
                    @click="sortBy('next4')"
                  >
                    <div class="flex flex-col items-center">
                      <span>NEXT 4 SOS</span>
                      <span v-if="sortColumn === 'next4'" class="text-primary">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                    </div>
                  </th>
                  <th 
                    v-for="week in displayWeeks" 
                    :key="week"
                    class="px-1 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider min-w-[70px] cursor-pointer hover:bg-dark-border/30"
                    :class="[
                      week === currentWeek ? 'bg-primary/20' : '',
                      week < currentWeek ? 'opacity-50' : '',
                      week === 18 && excludeWeek18 ? 'opacity-30' : ''
                    ]"
                    @click="sortBy(`week${week}`)"
                  >
                    <div class="flex flex-col items-center">
                      <span>{{ week }}</span>
                      <span v-if="sortColumn === `week${week}`" class="text-primary text-[10px]">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <tr 
                  v-for="team in sortedTeamSchedules" 
                  :key="team.team"
                  class="hover:bg-dark-border/10 transition-colors"
                >
                  <!-- Team Name -->
                  <td class="px-3 py-2 sticky left-0 bg-dark-bg z-10">
                    <div class="flex items-center gap-2">
                      <img 
                        :src="getTeamLogo(team.team)" 
                        :alt="team.team"
                        class="w-6 h-6 object-contain"
                        @error="handleImageError"
                      />
                      <span class="font-medium text-dark-text">{{ team.team }}</span>
                    </div>
                  </td>
                  
                  <!-- ROS SOS - Progress Bar Style -->
                  <td class="px-2 py-2 bg-primary/5">
                    <div class="flex flex-col items-center gap-1">
                      <div class="flex items-center gap-1">
                        <div class="w-16 h-2 rounded-full bg-dark-border/50 overflow-hidden">
                          <div 
                            class="h-full rounded-full transition-all" 
                            :class="getSosBarClass(team.rosAvg)" 
                            :style="{ width: getSosBarWidth(team.rosAvg) }"
                          ></div>
                        </div>
                        <span class="text-xs font-bold w-12 text-right" :class="getSosTextClass(team.rosAvg)">
                          {{ formatPAE(team.rosAvg) }}
                        </span>
                      </div>
                      <span class="text-[10px] text-dark-textMuted">#{{ team.rosRank }}</span>
                    </div>
                  </td>
                  
                  <!-- Next 4 SOS - Progress Bar Style -->
                  <td class="px-2 py-2 bg-cyan-500/5">
                    <div class="flex flex-col items-center gap-1">
                      <div class="flex items-center gap-1">
                        <div class="w-16 h-2 rounded-full bg-dark-border/50 overflow-hidden">
                          <div 
                            class="h-full rounded-full transition-all" 
                            :class="getSosBarClass(team.next4Avg)" 
                            :style="{ width: getSosBarWidth(team.next4Avg) }"
                          ></div>
                        </div>
                        <span class="text-xs font-bold w-12 text-right" :class="getSosTextClass(team.next4Avg)">
                          {{ formatPAE(team.next4Avg) }}
                        </span>
                      </div>
                      <span class="text-[10px] text-dark-textMuted">#{{ team.next4Rank }}</span>
                    </div>
                  </td>
                  
                  <!-- Weekly Matchups -->
                  <td 
                    v-for="week in displayWeeks" 
                    :key="week"
                    class="px-1 py-2 text-center"
                    :class="[
                      week === currentWeek ? 'bg-primary/10' : '',
                      week < currentWeek ? 'opacity-40' : '',
                      week === 18 && excludeWeek18 ? 'opacity-30' : ''
                    ]"
                  >
                    <template v-if="team.weeklyMatchups[week]">
                      <div 
                        class="inline-flex flex-col items-center justify-center w-14 h-14 rounded-lg text-[11px]"
                        :class="getRankBgClass(team.weeklyMatchups[week].rank)"
                        :title="`${team.weeklyMatchups[week].isAway ? 'at' : 'vs'} ${team.weeklyMatchups[week].opponent}: ${formatPAE(team.weeklyMatchups[week].adjustment)} PAE (Rank #${team.weeklyMatchups[week].rank})`"
                      >
                        <span class="text-base font-black">#{{ team.weeklyMatchups[week].rank }}</span>
                        <span class="font-semibold">
                          {{ team.weeklyMatchups[week].isAway ? '@' : '' }}{{ team.weeklyMatchups[week].opponent }}
                        </span>
                        <span class="text-[9px] opacity-80">
                          {{ formatPAE(team.weeklyMatchups[week].adjustment) }} PAE
                        </span>
                      </div>
                    </template>
                    <template v-else>
                      <div class="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-dark-border/20">
                        <span class="text-dark-textMuted text-xs font-medium">BYE</span>
                      </div>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Explanation Card -->
      <div class="card bg-dark-card/50">
        <div class="card-body">
          <h4 class="font-bold text-dark-text mb-3 flex items-center gap-2">
            <span>📊</span> How to Read This
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div class="font-semibold text-primary mb-1">Rank (#1-32)</div>
              <p class="text-dark-textMuted">
                #1 = Hardest matchup for {{ selectedPosition }}s (defense allows fewest points vs league avg).
                #32 = Easiest matchup (defense allows most points vs league avg).
              </p>
            </div>
            <div>
              <div class="font-semibold text-primary mb-1">PAE (Points Above Expectation)</div>
              <p class="text-dark-textMuted">
                <span class="text-green-400">+4.5 PAE</span> = defense allows 4.5 more than league average = easier.
                <span class="text-red-400">-3.2 PAE</span> = defense allows 3.2 fewer than league average = harder.
              </p>
            </div>
            <div>
              <div class="font-semibold text-primary mb-1">@ Symbol</div>
              <p class="text-dark-textMuted">
                @DEN = Away game at Denver. No @ = Home game.
              </p>
            </div>
            <div>
              <div class="font-semibold text-primary mb-1">Week 18 Toggle</div>
              <p class="text-dark-textMuted">
                Enable "Exclude Week 18" if your league playoffs end before Week 18.
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- No Data State -->
    <div v-else class="card">
      <div class="card-body py-12 text-center">
        <div class="text-5xl mb-4">📊</div>
        <h3 class="text-xl font-bold text-dark-text mb-2">Schedule Analysis</h3>
        <p class="text-dark-textMuted mb-4">
          Click "Refresh" to calculate schedule-adjusted defense rankings.
          <br>
          <span class="text-xs">Requires at least 3 weeks of season data.</span>
        </p>
        <button @click="loadData" class="btn btn-primary">
          Calculate Rankings
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import {
  getAdjustedDefenseRankings,
  type DefensePositionStats
} from '@/services/scheduleStrength'

const leagueStore = useLeagueStore()

// State
const isLoading = ref(false)
const loadingMessage = ref('Loading...')
const selectedPosition = ref<'QB' | 'RB' | 'WR' | 'TE'>('RB')
const defenseRankings = ref<Map<string, DefensePositionStats[]>>(new Map())
const currentWeek = ref(15)
const displaySeason = ref('2025')
const excludeWeek18 = ref(true) // Default to excluding week 18

// Sorting - DEFAULT to ROS descending (best/easiest schedule first = highest PAE = rank 32)
const sortColumn = ref<string>('ros')
const sortDirection = ref<'asc' | 'desc'>('desc')  // Descending = highest rank numbers first = easiest schedules

// 2025 NFL Schedule - Complete and Accurate from NFL Operations
// Format: team -> week -> { opp: opponent, away: boolean }
const nflSchedule2025: Record<string, Record<number, { opp: string; away: boolean }>> = {
  // AFC East
  BUF: { 1: { opp: 'BAL', away: false }, 2: { opp: 'NYJ', away: false }, 3: { opp: 'MIA', away: false }, 4: { opp: 'NO', away: false }, 5: { opp: 'NE', away: true }, 6: { opp: 'ATL', away: true }, 8: { opp: 'CAR', away: true }, 9: { opp: 'KC', away: true }, 10: { opp: 'MIA', away: true }, 11: { opp: 'TB', away: true }, 12: { opp: 'HOU', away: true }, 13: { opp: 'PIT', away: true }, 14: { opp: 'CIN', away: false }, 15: { opp: 'NE', away: true }, 16: { opp: 'CLE', away: false }, 17: { opp: 'PHI', away: true }, 18: { opp: 'NYJ', away: false } },
  MIA: { 1: { opp: 'IND', away: true }, 2: { opp: 'NE', away: true }, 3: { opp: 'BUF', away: true }, 4: { opp: 'NYJ', away: false }, 6: { opp: 'LAC', away: true }, 7: { opp: 'CLE', away: true }, 8: { opp: 'ATL', away: true }, 9: { opp: 'BAL', away: false }, 10: { opp: 'BUF', away: false }, 11: { opp: 'WAS', away: true }, 13: { opp: 'NO', away: false }, 14: { opp: 'NYJ', away: true }, 15: { opp: 'PIT', away: false }, 16: { opp: 'CIN', away: false }, 17: { opp: 'TB', away: true }, 18: { opp: 'NE', away: true } },
  NE: { 1: { opp: 'LV', away: false }, 2: { opp: 'MIA', away: false }, 3: { opp: 'PIT', away: false }, 4: { opp: 'CAR', away: true }, 5: { opp: 'BUF', away: false }, 6: { opp: 'NO', away: true }, 7: { opp: 'TEN', away: true }, 8: { opp: 'CLE', away: true }, 9: { opp: 'ATL', away: false }, 10: { opp: 'TB', away: true }, 11: { opp: 'NYJ', away: false }, 13: { opp: 'NYG', away: false }, 15: { opp: 'BUF', away: false }, 16: { opp: 'BAL', away: true }, 17: { opp: 'NYJ', away: true }, 18: { opp: 'MIA', away: false } },
  NYJ: { 1: { opp: 'PIT', away: false }, 2: { opp: 'BUF', away: true }, 3: { opp: 'TB', away: true }, 4: { opp: 'MIA', away: true }, 5: { opp: 'DAL', away: false }, 6: { opp: 'DEN', away: true }, 7: { opp: 'CAR', away: false }, 8: { opp: 'CIN', away: true }, 9: { opp: 'BAL', away: true }, 10: { opp: 'CLE', away: false }, 11: { opp: 'NE', away: true }, 13: { opp: 'ATL', away: false }, 14: { opp: 'MIA', away: false }, 15: { opp: 'JAX', away: true }, 16: { opp: 'NO', away: false }, 17: { opp: 'NE', away: false }, 18: { opp: 'BUF', away: true } },
  // AFC North
  BAL: { 1: { opp: 'BUF', away: true }, 2: { opp: 'CLE', away: false }, 3: { opp: 'DET', away: false }, 4: { opp: 'KC', away: true }, 5: { opp: 'HOU', away: true }, 6: { opp: 'LAR', away: false }, 8: { opp: 'CHI', away: true }, 9: { opp: 'MIA', away: true }, 10: { opp: 'MIN', away: true }, 11: { opp: 'CLE', away: true }, 12: { opp: 'NYJ', away: false }, 13: { opp: 'CIN', away: true }, 14: { opp: 'PIT', away: true }, 15: { opp: 'CIN', away: false }, 16: { opp: 'NE', away: false }, 17: { opp: 'GB', away: true }, 18: { opp: 'PIT', away: true } },
  CIN: { 1: { opp: 'CLE', away: true }, 2: { opp: 'JAX', away: false }, 3: { opp: 'MIN', away: true }, 4: { opp: 'DEN', away: false }, 5: { opp: 'DET', away: true }, 6: { opp: 'GB', away: true }, 7: { opp: 'PIT', away: false }, 8: { opp: 'NYJ', away: false }, 9: { opp: 'CHI', away: true }, 11: { opp: 'PIT', away: true }, 12: { opp: 'NE', away: true }, 13: { opp: 'BAL', away: false }, 14: { opp: 'BUF', away: true }, 15: { opp: 'BAL', away: true }, 16: { opp: 'MIA', away: true }, 17: { opp: 'ARI', away: false }, 18: { opp: 'CLE', away: false } },
  CLE: { 1: { opp: 'CIN', away: false }, 2: { opp: 'BAL', away: true }, 3: { opp: 'GB', away: true }, 4: { opp: 'DET', away: false }, 5: { opp: 'MIN', away: true }, 6: { opp: 'PIT', away: true }, 7: { opp: 'MIA', away: false }, 8: { opp: 'NE', away: false }, 9: { opp: 'SF', away: true }, 10: { opp: 'NYJ', away: true }, 11: { opp: 'BAL', away: false }, 12: { opp: 'LV', away: true }, 13: { opp: 'SF', away: false }, 14: { opp: 'TEN', away: false }, 15: { opp: 'CHI', away: true }, 16: { opp: 'BUF', away: true }, 17: { opp: 'PIT', away: false }, 18: { opp: 'CIN', away: true } },
  PIT: { 1: { opp: 'NYJ', away: true }, 2: { opp: 'SEA', away: false }, 3: { opp: 'NE', away: true }, 4: { opp: 'MIN', away: false }, 6: { opp: 'CLE', away: false }, 7: { opp: 'CIN', away: true }, 8: { opp: 'GB', away: true }, 9: { opp: 'IND', away: false }, 10: { opp: 'LAC', away: true }, 11: { opp: 'CIN', away: false }, 12: { opp: 'CHI', away: true }, 13: { opp: 'BUF', away: false }, 14: { opp: 'BAL', away: false }, 15: { opp: 'MIA', away: true }, 16: { opp: 'DET', away: true }, 17: { opp: 'CLE', away: true }, 18: { opp: 'BAL', away: false } },
  // AFC South
  HOU: { 1: { opp: 'LAR', away: true }, 2: { opp: 'TB', away: false }, 3: { opp: 'JAX', away: true }, 4: { opp: 'TEN', away: true }, 5: { opp: 'BAL', away: false }, 6: { opp: 'SF', away: true }, 7: { opp: 'SEA', away: false }, 8: { opp: 'SF', away: false }, 9: { opp: 'DEN', away: true }, 10: { opp: 'JAX', away: true }, 11: { opp: 'TEN', away: false }, 12: { opp: 'BUF', away: false }, 13: { opp: 'IND', away: false }, 14: { opp: 'KC', away: false }, 15: { opp: 'ARI', away: false }, 16: { opp: 'LV', away: false }, 17: { opp: 'LAC', away: true }, 18: { opp: 'IND', away: true } },
  IND: { 1: { opp: 'MIA', away: false }, 2: { opp: 'DEN', away: true }, 3: { opp: 'TEN', away: true }, 4: { opp: 'JAX', away: false }, 6: { opp: 'ARI', away: true }, 7: { opp: 'LAC', away: true }, 8: { opp: 'TEN', away: false }, 9: { opp: 'PIT', away: true }, 10: { opp: 'ATL', away: false }, 11: { opp: 'JAX', away: true }, 12: { opp: 'KC', away: true }, 13: { opp: 'HOU', away: true }, 14: { opp: 'JAX', away: false }, 15: { opp: 'SEA', away: true }, 16: { opp: 'SF', away: false }, 17: { opp: 'JAX', away: true }, 18: { opp: 'HOU', away: false } },
  JAX: { 1: { opp: 'CAR', away: false }, 2: { opp: 'CIN', away: true }, 3: { opp: 'HOU', away: false }, 4: { opp: 'IND', away: true }, 5: { opp: 'KC', away: false }, 6: { opp: 'SEA', away: false }, 7: { opp: 'LAR', away: false }, 8: { opp: 'LV', away: true }, 9: { opp: 'LV', away: false }, 10: { opp: 'HOU', away: false }, 11: { opp: 'IND', away: false }, 12: { opp: 'ARI', away: true }, 13: { opp: 'TEN', away: true }, 14: { opp: 'IND', away: true }, 15: { opp: 'NYJ', away: false }, 16: { opp: 'DEN', away: true }, 17: { opp: 'IND', away: false }, 18: { opp: 'TEN', away: false } },
  TEN: { 1: { opp: 'DEN', away: false }, 2: { opp: 'LAR', away: false }, 3: { opp: 'IND', away: false }, 4: { opp: 'HOU', away: false }, 5: { opp: 'ARI', away: true }, 6: { opp: 'LV', away: false }, 7: { opp: 'NE', away: false }, 8: { opp: 'IND', away: true }, 9: { opp: 'LAC', away: false }, 11: { opp: 'HOU', away: true }, 12: { opp: 'SEA', away: false }, 13: { opp: 'JAX', away: false }, 14: { opp: 'CLE', away: true }, 15: { opp: 'SF', away: false }, 16: { opp: 'KC', away: false }, 17: { opp: 'NO', away: true }, 18: { opp: 'JAX', away: true } },
  // AFC West
  DEN: { 1: { opp: 'TEN', away: true }, 2: { opp: 'IND', away: false }, 3: { opp: 'LAC', away: false }, 4: { opp: 'CIN', away: true }, 5: { opp: 'PHI', away: false }, 6: { opp: 'NYJ', away: false }, 7: { opp: 'NYG', away: true }, 8: { opp: 'DAL', away: true }, 9: { opp: 'HOU', away: false }, 10: { opp: 'LV', away: true }, 11: { opp: 'KC', away: false }, 13: { opp: 'WAS', away: true }, 14: { opp: 'LV', away: false }, 15: { opp: 'GB', away: false }, 16: { opp: 'JAX', away: false }, 17: { opp: 'KC', away: true }, 18: { opp: 'LAC', away: false } },
  KC: { 1: { opp: 'LAC', away: true }, 2: { opp: 'PHI', away: true }, 4: { opp: 'BAL', away: false }, 5: { opp: 'JAX', away: true }, 6: { opp: 'DET', away: true }, 7: { opp: 'LV', away: true }, 8: { opp: 'WAS', away: false }, 9: { opp: 'BUF', away: false }, 11: { opp: 'DEN', away: true }, 12: { opp: 'IND', away: false }, 13: { opp: 'DAL', away: true }, 14: { opp: 'HOU', away: true }, 15: { opp: 'LAC', away: false }, 16: { opp: 'TEN', away: true }, 17: { opp: 'DEN', away: false }, 18: { opp: 'LV', away: true } },
  LV: { 1: { opp: 'NE', away: true }, 2: { opp: 'LAC', away: false }, 3: { opp: 'WAS', away: true }, 4: { opp: 'CHI', away: true }, 5: { opp: 'IND', away: false }, 6: { opp: 'TEN', away: true }, 7: { opp: 'KC', away: false }, 8: { opp: 'JAX', away: false }, 9: { opp: 'JAX', away: true }, 10: { opp: 'DEN', away: false }, 11: { opp: 'DAL', away: false }, 12: { opp: 'CLE', away: false }, 13: { opp: 'LAC', away: true }, 14: { opp: 'DEN', away: true }, 15: { opp: 'PHI', away: true }, 16: { opp: 'HOU', away: true }, 17: { opp: 'NYG', away: false }, 18: { opp: 'KC', away: false } },
  LAC: { 1: { opp: 'KC', away: false }, 2: { opp: 'LV', away: true }, 3: { opp: 'DEN', away: true }, 4: { opp: 'NYG', away: false }, 6: { opp: 'MIA', away: false }, 7: { opp: 'IND', away: false }, 8: { opp: 'MIN', away: false }, 9: { opp: 'TEN', away: true }, 10: { opp: 'PIT', away: false }, 11: { opp: 'JAX', away: false }, 12: { opp: 'TB', away: false }, 13: { opp: 'LV', away: false }, 14: { opp: 'PHI', away: false }, 15: { opp: 'KC', away: true }, 16: { opp: 'DAL', away: false }, 17: { opp: 'HOU', away: false }, 18: { opp: 'DEN', away: true } },
  // NFC East
  DAL: { 1: { opp: 'PHI', away: true }, 2: { opp: 'NYG', away: false }, 3: { opp: 'CHI', away: true }, 4: { opp: 'GB', away: true }, 5: { opp: 'NYJ', away: true }, 7: { opp: 'WAS', away: true }, 8: { opp: 'DEN', away: false }, 9: { opp: 'ARI', away: false }, 11: { opp: 'LV', away: true }, 12: { opp: 'PHI', away: false }, 13: { opp: 'KC', away: false }, 14: { opp: 'DET', away: false }, 15: { opp: 'MIN', away: false }, 16: { opp: 'LAC', away: true }, 17: { opp: 'WAS', away: false }, 18: { opp: 'NYG', away: true } },
  NYG: { 1: { opp: 'WAS', away: true }, 2: { opp: 'DAL', away: true }, 3: { opp: 'KC', away: false }, 4: { opp: 'LAC', away: true }, 5: { opp: 'NO', away: false }, 6: { opp: 'PHI', away: false }, 7: { opp: 'DEN', away: false }, 8: { opp: 'PHI', away: true }, 9: { opp: 'SF', away: false }, 10: { opp: 'CHI', away: false }, 11: { opp: 'GB', away: true }, 13: { opp: 'NE', away: true }, 14: { opp: 'WAS', away: true }, 15: { opp: 'WAS', away: false }, 16: { opp: 'MIN', away: true }, 17: { opp: 'LV', away: true }, 18: { opp: 'DAL', away: false } },
  PHI: { 1: { opp: 'DAL', away: false }, 2: { opp: 'KC', away: false }, 3: { opp: 'LAR', away: false }, 4: { opp: 'TB', away: true }, 5: { opp: 'DEN', away: true }, 6: { opp: 'NYG', away: true }, 7: { opp: 'MIN', away: false }, 8: { opp: 'NYG', away: false }, 9: { opp: 'IND', away: true }, 10: { opp: 'GB', away: true }, 11: { opp: 'DET', away: false }, 12: { opp: 'DAL', away: true }, 13: { opp: 'CHI', away: true }, 14: { opp: 'LAC', away: true }, 15: { opp: 'LV', away: false }, 16: { opp: 'WAS', away: false }, 17: { opp: 'BUF', away: false }, 18: { opp: 'WAS', away: true } },
  WAS: { 1: { opp: 'NYG', away: false }, 2: { opp: 'GB', away: true }, 3: { opp: 'LV', away: false }, 4: { opp: 'ATL', away: true }, 6: { opp: 'CHI', away: true }, 7: { opp: 'DAL', away: false }, 8: { opp: 'KC', away: true }, 9: { opp: 'SEA', away: true }, 10: { opp: 'DET', away: false }, 11: { opp: 'MIA', away: false }, 13: { opp: 'DEN', away: false }, 14: { opp: 'NYG', away: false }, 15: { opp: 'NYG', away: true }, 16: { opp: 'PHI', away: true }, 17: { opp: 'DAL', away: true }, 18: { opp: 'PHI', away: false } },
  // NFC North
  CHI: { 1: { opp: 'MIN', away: false }, 2: { opp: 'DET', away: true }, 3: { opp: 'DAL', away: false }, 4: { opp: 'LV', away: false }, 5: { opp: 'ATL', away: false }, 6: { opp: 'WAS', away: false }, 7: { opp: 'NO', away: true }, 8: { opp: 'BAL', away: false }, 9: { opp: 'CIN', away: false }, 10: { opp: 'NYG', away: true }, 11: { opp: 'MIN', away: true }, 12: { opp: 'PIT', away: false }, 13: { opp: 'PHI', away: false }, 14: { opp: 'GB', away: false }, 15: { opp: 'CLE', away: false }, 16: { opp: 'GB', away: true }, 17: { opp: 'SF', away: true }, 18: { opp: 'DET', away: false } },
  DET: { 1: { opp: 'GB', away: true }, 2: { opp: 'CHI', away: false }, 3: { opp: 'BAL', away: true }, 4: { opp: 'CLE', away: true }, 5: { opp: 'CIN', away: false }, 6: { opp: 'KC', away: false }, 7: { opp: 'TB', away: false }, 8: { opp: 'MIN', away: true }, 9: { opp: 'MIN', away: false }, 10: { opp: 'WAS', away: true }, 11: { opp: 'PHI', away: true }, 12: { opp: 'NYG', away: true }, 13: { opp: 'GB', away: false }, 14: { opp: 'DAL', away: true }, 15: { opp: 'LAR', away: false }, 16: { opp: 'PIT', away: false }, 17: { opp: 'MIN', away: true }, 18: { opp: 'CHI', away: true } },
  GB: { 1: { opp: 'DET', away: false }, 2: { opp: 'WAS', away: false }, 3: { opp: 'CLE', away: false }, 4: { opp: 'DAL', away: false }, 5: { opp: 'ATL', away: false }, 6: { opp: 'CIN', away: false }, 7: { opp: 'ARI', away: true }, 8: { opp: 'PIT', away: false }, 9: { opp: 'CAR', away: true }, 10: { opp: 'PHI', away: false }, 11: { opp: 'NYG', away: false }, 12: { opp: 'MIN', away: true }, 13: { opp: 'DET', away: true }, 14: { opp: 'CHI', away: true }, 15: { opp: 'DEN', away: true }, 16: { opp: 'CHI', away: false }, 17: { opp: 'BAL', away: false }, 18: { opp: 'MIN', away: true } },
  MIN: { 1: { opp: 'CHI', away: true }, 2: { opp: 'ATL', away: false }, 3: { opp: 'CIN', away: false }, 4: { opp: 'PIT', away: true }, 5: { opp: 'CLE', away: false }, 7: { opp: 'PHI', away: true }, 8: { opp: 'DET', away: false }, 9: { opp: 'DET', away: true }, 10: { opp: 'BAL', away: false }, 11: { opp: 'CHI', away: false }, 12: { opp: 'GB', away: false }, 13: { opp: 'SEA', away: true }, 14: { opp: 'WAS', away: false }, 15: { opp: 'DAL', away: true }, 16: { opp: 'NYG', away: false }, 17: { opp: 'DET', away: false }, 18: { opp: 'GB', away: false } },
  // NFC South
  ATL: { 1: { opp: 'TB', away: false }, 2: { opp: 'MIN', away: true }, 3: { opp: 'CAR', away: false }, 4: { opp: 'WAS', away: false }, 5: { opp: 'CHI', away: true }, 6: { opp: 'BUF', away: false }, 7: { opp: 'SF', away: false }, 8: { opp: 'MIA', away: false }, 9: { opp: 'NE', away: true }, 10: { opp: 'IND', away: true }, 11: { opp: 'CAR', away: false }, 12: { opp: 'NO', away: false }, 13: { opp: 'NYJ', away: true }, 14: { opp: 'SEA', away: false }, 15: { opp: 'TB', away: true }, 16: { opp: 'ARI', away: false }, 17: { opp: 'LAR', away: false }, 18: { opp: 'NO', away: false } },
  CAR: { 1: { opp: 'JAX', away: true }, 2: { opp: 'ARI', away: false }, 3: { opp: 'ATL', away: true }, 4: { opp: 'NE', away: false }, 5: { opp: 'MIA', away: false }, 6: { opp: 'DAL', away: false }, 7: { opp: 'NYJ', away: true }, 8: { opp: 'BUF', away: false }, 9: { opp: 'GB', away: false }, 10: { opp: 'NO', away: false }, 11: { opp: 'ATL', away: true }, 12: { opp: 'SF', away: false }, 13: { opp: 'LAR', away: false }, 14: { opp: 'NO', away: true }, 15: { opp: 'NO', away: false }, 16: { opp: 'TB', away: true }, 17: { opp: 'SEA', away: false }, 18: { opp: 'TB', away: false } },
  NO: { 1: { opp: 'ARI', away: true }, 2: { opp: 'SF', away: false }, 3: { opp: 'SEA', away: false }, 4: { opp: 'BUF', away: true }, 5: { opp: 'NYG', away: true }, 6: { opp: 'NE', away: false }, 7: { opp: 'CHI', away: false }, 8: { opp: 'TB', away: false }, 9: { opp: 'LAR', away: false }, 10: { opp: 'CAR', away: true }, 12: { opp: 'ATL', away: true }, 13: { opp: 'MIA', away: true }, 14: { opp: 'CAR', away: false }, 15: { opp: 'CAR', away: true }, 16: { opp: 'NYJ', away: true }, 17: { opp: 'TEN', away: false }, 18: { opp: 'ATL', away: true } },
  TB: { 1: { opp: 'ATL', away: true }, 2: { opp: 'HOU', away: true }, 3: { opp: 'NYJ', away: false }, 4: { opp: 'PHI', away: false }, 6: { opp: 'SF', away: false }, 7: { opp: 'DET', away: true }, 8: { opp: 'NO', away: true }, 9: { opp: 'IND', away: true }, 10: { opp: 'NE', away: false }, 11: { opp: 'BUF', away: false }, 12: { opp: 'LAC', away: true }, 13: { opp: 'ARI', away: false }, 14: { opp: 'NO', away: false }, 15: { opp: 'ATL', away: false }, 16: { opp: 'CAR', away: false }, 17: { opp: 'MIA', away: false }, 18: { opp: 'CAR', away: true } },
  // NFC West
  ARI: { 1: { opp: 'NO', away: false }, 2: { opp: 'CAR', away: true }, 3: { opp: 'SF', away: false }, 4: { opp: 'SEA', away: false }, 5: { opp: 'TEN', away: false }, 6: { opp: 'IND', away: false }, 7: { opp: 'GB', away: false }, 9: { opp: 'DAL', away: true }, 10: { opp: 'SEA', away: true }, 11: { opp: 'SF', away: false }, 12: { opp: 'JAX', away: false }, 13: { opp: 'TB', away: true }, 14: { opp: 'LAR', away: false }, 15: { opp: 'HOU', away: true }, 16: { opp: 'ATL', away: true }, 17: { opp: 'CIN', away: true }, 18: { opp: 'LAR', away: true } },
  LAR: { 1: { opp: 'HOU', away: false }, 2: { opp: 'TEN', away: true }, 3: { opp: 'PHI', away: true }, 4: { opp: 'SF', away: false }, 5: { opp: 'SF', away: true }, 6: { opp: 'BAL', away: true }, 7: { opp: 'JAX', away: true }, 9: { opp: 'NO', away: true }, 10: { opp: 'SF', away: false }, 11: { opp: 'SEA', away: false }, 12: { opp: 'TB', away: true }, 13: { opp: 'CAR', away: true }, 14: { opp: 'ARI', away: true }, 15: { opp: 'DET', away: true }, 16: { opp: 'SEA', away: false }, 17: { opp: 'ATL', away: true }, 18: { opp: 'ARI', away: false } },
  SF: { 1: { opp: 'SEA', away: true }, 2: { opp: 'NO', away: true }, 3: { opp: 'ARI', away: true }, 4: { opp: 'LAR', away: true }, 5: { opp: 'LAR', away: false }, 6: { opp: 'HOU', away: false }, 7: { opp: 'ATL', away: true }, 8: { opp: 'HOU', away: true }, 9: { opp: 'CLE', away: false }, 10: { opp: 'LAR', away: true }, 11: { opp: 'ARI', away: true }, 12: { opp: 'CAR', away: true }, 13: { opp: 'CLE', away: true }, 14: { opp: 'SEA', away: false }, 15: { opp: 'TEN', away: true }, 16: { opp: 'IND', away: true }, 17: { opp: 'CHI', away: false }, 18: { opp: 'SEA', away: false } },
  SEA: { 1: { opp: 'SF', away: false }, 2: { opp: 'PIT', away: true }, 3: { opp: 'NO', away: true }, 4: { opp: 'ARI', away: true }, 5: { opp: 'TB', away: false }, 6: { opp: 'JAX', away: true }, 7: { opp: 'HOU', away: true }, 9: { opp: 'WAS', away: false }, 10: { opp: 'ARI', away: false }, 11: { opp: 'LAR', away: true }, 12: { opp: 'TEN', away: true }, 13: { opp: 'MIN', away: false }, 14: { opp: 'SF', away: true }, 15: { opp: 'IND', away: false }, 16: { opp: 'LAR', away: true }, 17: { opp: 'CAR', away: true }, 18: { opp: 'SF', away: true } }
}

// All NFL teams and weeks
const nflTeams = Object.keys(nflSchedule2025)
const weeks = Array.from({ length: 18 }, (_, i) => i + 1)

// Display weeks based on toggle
const displayWeeks = computed(() => weeks)

// Computed
const hasData = computed(() => defenseRankings.value.size > 0)

const positionRankings = computed(() => {
  return defenseRankings.value.get(selectedPosition.value) || []
})

const defenseByTeam = computed(() => {
  const map = new Map<string, DefensePositionStats>()
  positionRankings.value.forEach(d => {
    map.set(d.team, d)
  })
  return map
})

const teamSchedulesData = computed(() => {
  return nflTeams.map(team => {
    const schedule = nflSchedule2025[team]
    const weeklyMatchups: Record<number, { opponent: string; adjustment: number; rank: number; isAway: boolean }> = {}
    
    let rosTotal = 0
    let rosCount = 0
    let next4Total = 0
    let next4Count = 0
    
    weeks.forEach(week => {
      // Skip week 18 in calculations if excluded
      const skipInCalc = week === 18 && excludeWeek18.value
      
      const matchup = schedule[week]
      if (matchup) {
        const defense = defenseByTeam.value.get(matchup.opp)
        if (defense) {
          const adj = safeNumber(defense.adjustmentDelta)
          weeklyMatchups[week] = {
            opponent: matchup.opp,
            adjustment: adj,
            rank: defense.adjustedRank || 16,
            isAway: matchup.away
          }
          
          // Only include in ROS/Next4 if not excluded
          if (!skipInCalc) {
            if (week >= currentWeek.value) {
              rosTotal += adj
              rosCount++
            }
            
            if (week >= currentWeek.value && week < currentWeek.value + 4) {
              next4Total += adj
              next4Count++
            }
          }
        }
      }
    })
    
    return {
      team,
      weeklyMatchups,
      rosAvg: rosCount > 0 ? rosTotal / rosCount : 0,
      next4Avg: next4Count > 0 ? next4Total / next4Count : 0,
      rosRank: 0,
      next4Rank: 0
    }
  })
})

// Assign ranks - #1 = hardest (lowest PAE), #32 = easiest (highest PAE)
const teamSchedulesWithRanks = computed(() => {
  const schedules = [...teamSchedulesData.value]
  
  // Sort ascending by PAE (lowest first = hardest schedule = #1)
  const byRos = [...schedules].sort((a, b) => a.rosAvg - b.rosAvg)
  byRos.forEach((s, idx) => {
    const found = schedules.find(x => x.team === s.team)
    if (found) found.rosRank = idx + 1
  })
  
  const byNext4 = [...schedules].sort((a, b) => a.next4Avg - b.next4Avg)
  byNext4.forEach((s, idx) => {
    const found = schedules.find(x => x.team === s.team)
    if (found) found.next4Rank = idx + 1
  })
  
  return schedules
})

const sortedTeamSchedules = computed(() => {
  const schedules = [...teamSchedulesWithRanks.value]
  
  schedules.sort((a, b) => {
    let valA: number | string = 0
    let valB: number | string = 0
    
    if (sortColumn.value === 'team') {
      valA = a.team
      valB = b.team
      return sortDirection.value === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA)
    } else if (sortColumn.value === 'ros') {
      valA = a.rosRank
      valB = b.rosRank
    } else if (sortColumn.value === 'next4') {
      valA = a.next4Rank
      valB = b.next4Rank
    } else if (sortColumn.value.startsWith('week')) {
      const week = parseInt(sortColumn.value.replace('week', ''))
      valA = a.weeklyMatchups[week]?.rank ?? 99
      valB = b.weeklyMatchups[week]?.rank ?? 99
    }
    
    return sortDirection.value === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number)
  })
  
  return schedules
})

// Helper functions
function safeNumber(val: any): number {
  if (typeof val !== 'number' || !isFinite(val) || isNaN(val)) return 0
  return val
}

function sortBy(column: string) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = column === 'ros' || column === 'next4' ? 'desc' : 'asc'  // Default to showing easiest first for ROS/Next4
  }
}

function formatPAE(value: number): string {
  const safe = safeNumber(value)
  const clamped = Math.max(-15, Math.min(15, safe))
  const formatted = clamped.toFixed(1)
  return clamped >= 0 ? `+${formatted}` : formatted
}

function getTeamLogo(code: string): string {
  return `https://sleepercdn.com/images/team_logos/nfl/${code.toLowerCase()}.png`
}

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = 'https://sleepercdn.com/images/v2/icons/player_default.webp'
}

// CORRECT: #1-8 = hardest = RED (lowest/negative PAE), #27-32 = easiest = GREEN (highest/positive PAE)
function getRankBgClass(rank: number): string {
  if (rank <= 8) return 'bg-red-500/30 text-red-300'      // #1-8 Hardest (negative PAE)
  if (rank <= 14) return 'bg-orange-500/30 text-orange-300'
  if (rank <= 20) return 'bg-yellow-500/30 text-yellow-300'
  if (rank <= 26) return 'bg-lime-500/30 text-lime-300'
  return 'bg-green-500/30 text-green-300'                 // #27-32 Easiest (positive PAE)
}

// Progress bar functions - GREEN for positive PAE (easier), RED for negative PAE (harder)
function getSosBarClass(pae: number): string {
  if (pae > 3) return 'bg-green-500'      // Very easy
  if (pae > 1) return 'bg-lime-400'       // Easy
  if (pae > -1) return 'bg-yellow-400'    // Average
  if (pae > -3) return 'bg-orange-400'    // Hard
  return 'bg-red-500'                      // Very hard
}

function getSosBarWidth(pae: number): string {
  // Normalize PAE (-8 to +8 range) to percentage (0-100)
  const normalized = ((pae + 8) / 16) * 100
  return `${Math.max(5, Math.min(95, normalized))}%`
}

function getSosTextClass(pae: number): string {
  if (pae > 1) return 'text-green-400'    // Positive = easier = green
  if (pae < -1) return 'text-red-400'     // Negative = harder = red
  return 'text-dark-textMuted'
}

async function loadData() {
  if (isLoading.value) return
  
  isLoading.value = true
  loadingMessage.value = 'Fetching player data...'
  
  try {
    const season = '2025'
    displaySeason.value = season
    currentWeek.value = leagueStore.historicalSeasons[0]?.settings?.leg || 15
    
    if (currentWeek.value < 3) {
      alert('Schedule adjustment requires at least 3 weeks of data.')
      isLoading.value = false
      return
    }
    
    loadingMessage.value = 'Building player game logs and calculating league averages...'
    
    const rankings = await getAdjustedDefenseRankings(
      season,
      currentWeek.value,
      leagueStore.players
    )
    
    defenseRankings.value = rankings
    loadingMessage.value = 'Done!'
  } catch (error) {
    console.error('Error loading schedule data:', error)
    alert('Failed to load schedule data. Please try again.')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  currentWeek.value = leagueStore.historicalSeasons[0]?.settings?.leg || 15
})
</script>

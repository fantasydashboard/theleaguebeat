<template>
  <div class="overflow-x-auto">

    <!-- ── BY DIVISION view ── -->
    <template v-if="showByDivision && divisionGroups.length > 1">
      <div v-for="(group, gi) in divisionGroups" :key="group.name" :class="gi > 0 ? 'mt-6' : ''">
        <div class="flex items-center gap-2 mb-2 px-2">
          <span class="text-xs font-bold uppercase tracking-widest text-dark-textMuted">{{ group.name }}</span>
          <div class="flex-1 h-px bg-dark-border/40"></div>
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-dark-border/50">
              <th class="text-left py-3 px-2 text-dark-textMuted font-medium">#</th>
              <th class="text-left py-3 px-2 text-dark-textMuted font-medium">Team</th>
              <th v-if="leagueType !== 'roto'" class="text-center py-3 px-2 text-dark-textMuted font-medium">Record</th>
              <th v-if="leagueType === 'categories'" class="text-center py-3 px-2 text-dark-textMuted font-medium">Cat Record</th>
              <th class="text-right py-3 px-2 text-dark-textMuted font-medium">{{ leagueType === 'roto' ? 'Roto Pts' : 'PF' }}</th>
              <th v-if="leagueType === 'points'" class="text-right py-3 px-2 text-dark-textMuted font-medium">PA</th>
              <th v-if="leagueType !== 'roto'" class="text-center py-3 px-2 text-dark-textMuted font-medium">Win%</th>
              <th v-if="showStreak && leagueType !== 'roto'" class="text-center py-3 px-2 text-dark-textMuted font-medium">Streak</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(entry, index) in group.entries"
              :key="entry.team.teamId"
              class="border-b border-dark-border/20 hover:bg-dark-border/10 transition-colors cursor-pointer"
              :class="{ 'bg-primary/5': isMyTeam(entry.team.teamId) }"
              @click="$emit('select-team', entry)"
            >
              <td class="py-3 px-2">
                <span class="font-semibold" :class="getRankClass(index)">{{ index + 1 }}</span>
              </td>
              <td class="py-3 px-2">
                <div class="flex items-center gap-3">
                  <div class="relative">
                    <img v-if="entry.team.avatar" :src="entry.team.avatar" :alt="entry.team.name" class="w-8 h-8 rounded-full" />
                    <div v-else class="w-8 h-8 rounded-full bg-dark-border flex items-center justify-center text-xs font-bold text-dark-textMuted">
                      {{ entry.team.name.substring(0, 2).toUpperCase() }}
                    </div>
                    <div v-if="isMyTeam(entry.team.teamId)" class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                      <span class="text-[6px] text-gray-900 font-bold">★</span>
                    </div>
                  </div>
                  <div class="min-w-0">
                    <div class="font-medium truncate" :class="isMyTeam(entry.team.teamId) ? 'text-primary' : 'text-dark-text'">{{ entry.team.name }}</div>
                    <div v-if="entry.team.owner" class="text-xs text-dark-textMuted truncate">{{ entry.team.owner }}</div>
                  </div>
                </div>
              </td>
              <td v-if="leagueType !== 'roto'" class="py-3 px-2 text-center">
                <span class="font-medium text-dark-text">{{ entry.wins }}-{{ entry.losses }}<span v-if="entry.ties">-{{ entry.ties }}</span></span>
              </td>
              <td v-if="leagueType === 'categories'" class="py-3 px-2 text-center">
                <span class="text-dark-textMuted text-xs">{{ entry.categoryWins || 0 }}-{{ entry.categoryLosses || 0 }}</span>
              </td>
              <td class="py-3 px-2 text-right"><span class="font-medium text-dark-text">{{ formatNumber(entry.pointsFor) }}</span></td>
              <td v-if="leagueType === 'points'" class="py-3 px-2 text-right"><span class="text-dark-textMuted">{{ formatNumber(entry.pointsAgainst) }}</span></td>
              <td v-if="leagueType !== 'roto'" class="py-3 px-2 text-center">
                <span class="text-xs px-2 py-0.5 rounded-full" :class="getWinPctClass(entry.winPercentage)">{{ (entry.winPercentage * 100).toFixed(1) }}%</span>
              </td>
              <td v-if="showStreak && leagueType !== 'roto'" class="py-3 px-2 text-center">
                <span v-if="entry.streak" class="text-xs font-medium" :class="entry.streak.startsWith('W') ? 'text-green-400' : 'text-red-400'">{{ entry.streak }}</span>
                <span v-else class="text-dark-textMuted">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ── NORMAL flat view ── -->
    <template v-else>
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-dark-border/50">
            <th class="text-left py-3 px-2 text-dark-textMuted font-medium">#</th>
            <th class="text-left py-3 px-2 text-dark-textMuted font-medium">Team</th>
            <th v-if="leagueType !== 'roto'" class="text-center py-3 px-2 text-dark-textMuted font-medium">Record</th>
            <th
              v-if="leagueType === 'categories'"
              class="text-center py-3 px-2 text-dark-textMuted font-medium"
            >
              Cat Record
            </th>
            <th class="text-right py-3 px-2 text-dark-textMuted font-medium">
              {{ leagueType === 'roto' ? 'Roto Pts' : 'PF' }}
            </th>
            <th v-if="leagueType === 'points'" class="text-right py-3 px-2 text-dark-textMuted font-medium">PA</th>
            <th v-if="leagueType !== 'roto'" class="text-center py-3 px-2 text-dark-textMuted font-medium">Win%</th>
            <th v-if="showStreak && leagueType !== 'roto'" class="text-center py-3 px-2 text-dark-textMuted font-medium">Streak</th>
            <th v-if="showGamesBack" class="text-right py-3 px-2 text-dark-textMuted font-medium">GB</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(entry, index) in standings" 
            :key="entry.team.teamId"
            class="border-b border-dark-border/20 hover:bg-dark-border/10 transition-colors cursor-pointer"
            :class="{
              'bg-primary/5': isMyTeam(entry.team.teamId),
              'bg-green-500/5': isPlayoffTeam(index),
            }"
            @click="$emit('select-team', entry)"
          >
            <td class="py-3 px-2">
              <div class="flex items-center gap-1">
                <span class="font-semibold" :class="getRankClass(index)">{{ entry.rank || index + 1 }}</span>
                <span v-if="isPlayoffTeam(index)" class="text-green-400 text-xs">●</span>
              </div>
            </td>
            <td class="py-3 px-2">
              <div class="flex items-center gap-3">
                <div class="relative">
                  <img v-if="entry.team.avatar" :src="entry.team.avatar" :alt="entry.team.name" class="w-8 h-8 rounded-full" />
                  <div v-else class="w-8 h-8 rounded-full bg-dark-border flex items-center justify-center text-xs font-bold text-dark-textMuted">
                    {{ entry.team.name.substring(0, 2).toUpperCase() }}
                  </div>
                  <div v-if="isMyTeam(entry.team.teamId)" class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                    <span class="text-[6px] text-gray-900 font-bold">★</span>
                  </div>
                </div>
                <div class="min-w-0">
                  <div class="font-medium truncate" :class="isMyTeam(entry.team.teamId) ? 'text-primary' : 'text-dark-text'">{{ entry.team.name }}</div>
                  <div v-if="entry.team.owner" class="text-xs text-dark-textMuted truncate">{{ entry.team.owner }}</div>
                </div>
              </div>
            </td>
            <td v-if="leagueType !== 'roto'" class="py-3 px-2 text-center">
              <span class="font-medium text-dark-text">{{ entry.wins }}-{{ entry.losses }}<span v-if="entry.ties">-{{ entry.ties }}</span></span>
            </td>
            <td v-if="leagueType === 'categories'" class="py-3 px-2 text-center">
              <span class="text-dark-textMuted text-xs">
                {{ entry.categoryWins || 0 }}-{{ entry.categoryLosses || 0 }}
                <span v-if="entry.categoryTies">-{{ entry.categoryTies }}</span>
              </span>
            </td>
            <td class="py-3 px-2 text-right">
              <span class="font-medium text-dark-text">{{ formatNumber(entry.pointsFor) }}</span>
            </td>
            <td v-if="leagueType === 'points'" class="py-3 px-2 text-right">
              <span class="text-dark-textMuted">{{ formatNumber(entry.pointsAgainst) }}</span>
            </td>
            <td v-if="leagueType !== 'roto'" class="py-3 px-2 text-center">
              <span class="text-xs px-2 py-0.5 rounded-full" :class="getWinPctClass(entry.winPercentage)">{{ (entry.winPercentage * 100).toFixed(1) }}%</span>
            </td>
            <td v-if="showStreak && leagueType !== 'roto'" class="py-3 px-2 text-center">
              <span v-if="entry.streak" class="text-xs font-medium" :class="entry.streak.startsWith('W') ? 'text-green-400' : 'text-red-400'">{{ entry.streak }}</span>
              <span v-else class="text-dark-textMuted">-</span>
            </td>
            <td v-if="showGamesBack" class="py-3 px-2 text-right">
              <span class="text-dark-textMuted">{{ entry.gamesBack === 0 ? '-' : entry.gamesBack?.toFixed(1) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Legend -->
    <div class="flex items-center gap-4 mt-4 text-xs text-dark-textMuted">
      <div v-if="!showByDivision" class="flex items-center gap-1">
        <span class="text-green-400">●</span>
        <span>Playoff Position (Top {{ playoffTeamCount }})</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="w-3 h-3 bg-primary/30 rounded"></span>
        <span>Your Team</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UnifiedStandingsEntry, LeagueType } from '@/config/sports'

const props = defineProps<{
  standings: UnifiedStandingsEntry[]
  leagueType: LeagueType
  myTeamId?: string
  playoffTeams?: number
  showStreak?: boolean
  showGamesBack?: boolean
  showByDivision?: boolean
}>()

defineEmits<{
  (e: 'select-team', entry: UnifiedStandingsEntry): void
}>()

const playoffTeamCount = computed(() => props.playoffTeams || 6)

// Group standings by division. Falls back to alphabetical bucket if no division data.
const divisionGroups = computed(() => {
  const divMap = new Map<string, UnifiedStandingsEntry[]>()
  for (const entry of props.standings) {
    const div: string = (entry as any).division || (entry as any).divisionName || 'Division 1'
    if (!divMap.has(div)) divMap.set(div, [])
    divMap.get(div)!.push(entry)
  }
  // Sort teams within each division by wins desc, then pointsFor desc
  const groups = Array.from(divMap.entries()).map(([name, entries]) => ({
    name,
    entries: [...entries].sort((a, b) => (b.wins - a.wins) || ((b.pointsFor || 0) - (a.pointsFor || 0)))
  }))
  // Sort divisions alphabetically
  groups.sort((a, b) => a.name.localeCompare(b.name))
  return groups
})

function isMyTeam(teamId: string): boolean {
  return props.myTeamId === teamId
}

function isPlayoffTeam(index: number): boolean {
  return index < playoffTeamCount.value
}

function getRankClass(index: number): string {
  if (index === 0) return 'text-yellow-400'
  if (index === 1) return 'text-gray-300'
  if (index === 2) return 'text-amber-600'
  return 'text-dark-textMuted'
}

function getWinPctClass(pct: number): string {
  if (pct >= 0.7) return 'bg-green-500/20 text-green-400'
  if (pct >= 0.5) return 'bg-blue-500/20 text-blue-400'
  if (pct >= 0.3) return 'bg-yellow-500/20 text-yellow-400'
  return 'bg-red-500/20 text-red-400'
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) return '0'
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
  return value.toFixed(1)
}
</script>

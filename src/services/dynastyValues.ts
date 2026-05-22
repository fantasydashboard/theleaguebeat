/**
 * Dynasty Values Service
 * Fetches dynasty trade values from DynastyProcess.com's open data repository
 * Data is updated weekly and includes player ID mappings
 * 
 * Source: https://github.com/dynastyprocess/data
 * 
 * Note: values-players.csv uses FantasyPros IDs, so we need db_playerids.csv
 * to map to Sleeper IDs
 */

// Dynasty value for a single player
export interface DynastyPlayerValue {
  player_id: string          // Sleeper player ID
  player_name: string
  position: string
  team: string
  age: number
  
  // Values (higher = more valuable)
  value_1qb: number          // Standard 1QB league value
  value_2qb: number          // Superflex/2QB league value
  
  // Expert Consensus Ranks
  ecr_1qb: number
  ecr_2qb: number
  
  // Value tiers for display
  tier_1qb: string           // 'Elite', 'Starter', 'Depth', 'Taxi', 'Cut'
  tier_2qb: string
}

// Dynasty value for draft picks
export interface DynastyPickValue {
  pick: string               // e.g., "2024 1st", "2025 2nd"
  round: number
  year: number
  value_1qb: number
  value_2qb: number
}

// Team dynasty summary
export interface TeamDynastyValue {
  roster_id: number
  team_name: string
  avatar: string
  total_value_1qb: number
  total_value_2qb: number
  avg_age: number
  position_values: {
    QB: number
    RB: number
    WR: number
    TE: number
  }
  top_assets: DynastyPlayerValue[]
  contender_score: number    // Higher = more win-now, Lower = rebuilding
}

// Cache for dynasty values
let playerValuesCache: Map<string, DynastyPlayerValue> | null = null
let pickValuesCache: DynastyPickValue[] | null = null
let lastFetchTime: number = 0
const CACHE_DURATION = 1000 * 60 * 60 // 1 hour cache

/**
 * Parse CSV text into rows
 */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) {
    console.warn('CSV has fewer than 2 lines')
    return []
  }
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  console.log('📋 CSV Headers:', headers)
  
  const rows: Record<string, string>[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim().replace(/"/g, '') || ''
    })
    rows.push(row)
  }
  
  return rows
}

/**
 * Parse a single CSV line (handles quoted values with commas)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  
  return result
}

/**
 * Calculate tier based on value
 */
function calculateTier(value: number): string {
  if (value >= 7000) return 'Elite'
  if (value >= 4500) return 'Starter+'
  if (value >= 2500) return 'Starter'
  if (value >= 1000) return 'Bench'
  if (value >= 500) return 'Taxi'
  return 'Cut'
}

/**
 * Fetch player ID mappings from DynastyProcess
 * This maps FantasyPros IDs to Sleeper IDs
 */
async function fetchPlayerIdMappings(): Promise<Map<string, string>> {
  try {
    console.log('🔗 Fetching player ID mappings...')
    
    const response = await fetch(
      'https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_playerids.csv'
    )
    
    if (!response.ok) {
      console.warn('Failed to fetch player ID mappings:', response.status)
      return new Map()
    }
    
    const text = await response.text()
    const rows = parseCSV(text)
    
    // Map fantasypros_id -> sleeper_id
    const idMap = new Map<string, string>()
    
    for (const row of rows) {
      const fpId = row['fantasypros_id'] || row['fp_id']
      const sleeperId = row['sleeper_id']
      
      if (fpId && sleeperId) {
        idMap.set(fpId, sleeperId)
      }
    }
    
    console.log(`✅ Loaded ${idMap.size} player ID mappings`)
    return idMap
    
  } catch (error) {
    console.error('Failed to fetch player ID mappings:', error)
    return new Map()
  }
}

/**
 * Fetch player dynasty values from DynastyProcess
 */
export async function fetchDynastyPlayerValues(): Promise<Map<string, DynastyPlayerValue>> {
  // Return cache if still valid
  if (playerValuesCache && Date.now() - lastFetchTime < CACHE_DURATION) {
    console.log('📦 Using cached dynasty values')
    return playerValuesCache
  }
  
  try {
    console.log('📊 Fetching dynasty values from DynastyProcess...')
    
    // First, fetch the values file
    const response = await fetch(
      'https://raw.githubusercontent.com/dynastyprocess/data/master/files/values.csv'
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch dynasty values: ${response.status}`)
    }
    
    const text = await response.text()
    console.log('📄 Values CSV length:', text.length, 'chars')
    
    if (text.length < 100) {
      console.warn('Values CSV seems too short, may be an error')
    }
    
    const rows = parseCSV(text)
    console.log('📊 Parsed', rows.length, 'value rows')
    
    if (rows.length > 0) {
      console.log('📋 Sample row:', rows[0])
    }
    
    // Also fetch player ID mappings to get Sleeper IDs
    const idMappings = await fetchPlayerIdMappings()
    
    const valuesMap = new Map<string, DynastyPlayerValue>()
    
    for (const row of rows) {
      // The values.csv has different column names
      // Check for various possible column names
      const fpId = row['fp_id'] || row['fantasypros_id'] || row['player_id'] || ''
      const sleeperId = row['sleeper_id'] || idMappings.get(fpId) || ''
      
      // Skip if we can't find a Sleeper ID
      if (!sleeperId) continue
      
      const value1QB = parseInt(row['value_1qb'] || row['value'] || '0', 10) || 0
      const value2QB = parseInt(row['value_2qb'] || row['value_sf'] || row['value'] || '0', 10) || 0
      
      // Skip players with 0 value
      if (value1QB === 0 && value2QB === 0) continue
      
      const playerValue: DynastyPlayerValue = {
        player_id: sleeperId,
        player_name: row['player'] || row['player_name'] || row['name'] || 'Unknown',
        position: row['pos'] || row['position'] || 'FLEX',
        team: row['team'] || 'FA',
        age: parseFloat(row['age'] || '0') || 0,
        value_1qb: value1QB,
        value_2qb: value2QB,
        ecr_1qb: parseInt(row['ecr_1qb'] || row['ecr'] || '999', 10) || 999,
        ecr_2qb: parseInt(row['ecr_2qb'] || row['ecr_sf'] || row['ecr'] || '999', 10) || 999,
        tier_1qb: calculateTier(value1QB),
        tier_2qb: calculateTier(value2QB)
      }
      
      valuesMap.set(sleeperId, playerValue)
    }
    
    console.log(`✅ Loaded dynasty values for ${valuesMap.size} players`)
    
    // Debug: log a few sample values
    if (valuesMap.size > 0) {
      const samples = Array.from(valuesMap.values()).slice(0, 3)
      console.log('📋 Sample players:', samples.map(p => `${p.player_name}: ${p.value_1qb}`))
    }
    
    playerValuesCache = valuesMap
    lastFetchTime = Date.now()
    
    return valuesMap
    
  } catch (error) {
    console.error('Failed to fetch dynasty values:', error)
    // Return empty map on error, don't break the app
    return new Map()
  }
}

/**
 * Generate basic dynasty values from Sleeper player data
 * This is a fallback when DynastyProcess data isn't available
 * Values are estimated based on age and position
 */
export async function generateFallbackDynastyValues(
  sleeperPlayers: Record<string, any>,
  rosteredPlayerIds: Set<string>
): Promise<Map<string, DynastyPlayerValue>> {
  console.log('🔄 Generating fallback dynasty values from Sleeper data...')
  
  const valuesMap = new Map<string, DynastyPlayerValue>()
  
  // Base values by position (rough estimates)
  const baseValues: Record<string, { base: number, agePeak: number, decayRate: number }> = {
    QB: { base: 5000, agePeak: 28, decayRate: 300 },
    RB: { base: 4000, agePeak: 24, decayRate: 600 },
    WR: { base: 4500, agePeak: 26, decayRate: 400 },
    TE: { base: 3000, agePeak: 27, decayRate: 350 }
  }
  
  for (const [playerId, player] of Object.entries(sleeperPlayers)) {
    // Only include rostered players and relevant positions
    if (!rosteredPlayerIds.has(playerId)) continue
    
    const pos = player.position
    if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) continue
    
    const posConfig = baseValues[pos]
    if (!posConfig) continue
    
    // Calculate age (Sleeper provides birth_date as string like "1998-04-05")
    let age = 25 // default
    if (player.birth_date) {
      const birthYear = parseInt(player.birth_date.split('-')[0], 10)
      age = new Date().getFullYear() - birthYear
    } else if (player.age) {
      age = player.age
    }
    
    // Calculate value based on age curve
    // Peak value at agePeak, decrease before and after
    const yearsDiff = Math.abs(age - posConfig.agePeak)
    const ageAdjustment = yearsDiff * posConfig.decayRate
    
    // Young players get a premium
    const youthBonus = age < posConfig.agePeak ? (posConfig.agePeak - age) * 200 : 0
    
    let value = Math.max(100, posConfig.base - ageAdjustment + youthBonus)
    
    // Adjust for years of experience (rookies get a bump for potential)
    if (player.years_exp === 0) {
      value *= 1.2
    } else if (player.years_exp === 1) {
      value *= 1.1
    }
    
    // SuperFlex adjustment for QBs
    const valueSF = pos === 'QB' ? value * 1.8 : value
    
    const playerValue: DynastyPlayerValue = {
      player_id: playerId,
      player_name: player.full_name || `${player.first_name} ${player.last_name}`,
      position: pos,
      team: player.team || 'FA',
      age: age,
      value_1qb: Math.round(value),
      value_2qb: Math.round(valueSF),
      ecr_1qb: 999,
      ecr_2qb: 999,
      tier_1qb: calculateTier(Math.round(value)),
      tier_2qb: calculateTier(Math.round(valueSF))
    }
    
    valuesMap.set(playerId, playerValue)
  }
  
  console.log(`✅ Generated fallback values for ${valuesMap.size} players`)
  
  return valuesMap
}

/**
 * Fetch draft pick values from DynastyProcess
 */
export async function fetchDynastyPickValues(): Promise<DynastyPickValue[]> {
  if (pickValuesCache && Date.now() - lastFetchTime < CACHE_DURATION) {
    return pickValuesCache
  }
  
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/dynastyprocess/data/master/files/values-picks.csv'
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch pick values: ${response.status}`)
    }
    
    const text = await response.text()
    const rows = parseCSV(text)
    
    const picks: DynastyPickValue[] = []
    
    for (const row of rows) {
      const pick = row['pick'] || row['player'] || ''
      if (!pick) continue
      
      // Parse pick string like "2024 1st" or "2025 Mid 2nd"
      const yearMatch = pick.match(/(\d{4})/)
      const roundMatch = pick.match(/(1st|2nd|3rd|4th)/i)
      
      picks.push({
        pick,
        year: yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear(),
        round: roundMatch ? 
          { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4 }[roundMatch[1].toLowerCase() as '1st' | '2nd' | '3rd' | '4th'] || 1 
          : 1,
        value_1qb: parseInt(row['value_1qb'] || row['value'] || '0', 10),
        value_2qb: parseInt(row['value_2qb'] || row['value_sf'] || row['value'] || '0', 10)
      })
    }
    
    pickValuesCache = picks
    return picks
    
  } catch (error) {
    console.error('Failed to fetch pick values:', error)
    return []
  }
}

/**
 * Calculate team dynasty values from roster
 */
export function calculateTeamDynastyValue(
  rosterId: number,
  teamName: string,
  avatar: string,
  playerIds: string[],
  playerValues: Map<string, DynastyPlayerValue>,
  isSuperFlex: boolean = false
): TeamDynastyValue {
  const valueKey = isSuperFlex ? 'value_2qb' : 'value_1qb'
  
  let totalValue = 0
  let totalAge = 0
  let playerCount = 0
  const positionValues = { QB: 0, RB: 0, WR: 0, TE: 0 }
  const assets: DynastyPlayerValue[] = []
  
  for (const playerId of playerIds) {
    const playerValue = playerValues.get(playerId)
    if (!playerValue) continue
    
    const value = isSuperFlex ? playerValue.value_2qb : playerValue.value_1qb
    totalValue += value
    
    if (playerValue.age > 0) {
      totalAge += playerValue.age
      playerCount++
    }
    
    // Add to position totals
    const pos = playerValue.position as keyof typeof positionValues
    if (positionValues[pos] !== undefined) {
      positionValues[pos] += value
    }
    
    assets.push(playerValue)
  }
  
  // Sort assets by value and take top 5
  assets.sort((a, b) => {
    const aVal = isSuperFlex ? a.value_2qb : a.value_1qb
    const bVal = isSuperFlex ? b.value_2qb : b.value_1qb
    return bVal - aVal
  })
  
  // Calculate contender score (higher = more win-now, lower = rebuilding)
  // Dynasty contender calculation considers:
  // 1. Total roster value (most important)
  // 2. Value concentration in top assets (contenders have stars)
  // 3. Age profile (younger = rebuilding, prime age = contender)
  // 4. Position balance (contenders are well-rounded)
  
  const avgAge = playerCount > 0 ? totalAge / playerCount : 25
  
  // Top asset value - contenders have elite players
  const top3Value = assets.slice(0, 3).reduce((sum, a) => {
    return sum + (isSuperFlex ? a.value_2qb : a.value_1qb)
  }, 0)
  
  // Calculate percentage of value in top assets
  const topAssetConcentration = totalValue > 0 ? (top3Value / totalValue) : 0
  
  // Age score: Prime age (25-28) = highest, very young or old = lower
  // Young teams (avg < 24) are rebuilding
  // Old teams (avg > 29) are past prime
  // Prime teams (25-28) are contending
  let ageScore = 0
  if (avgAge >= 25 && avgAge <= 28) {
    ageScore = 100 // Prime window
  } else if (avgAge >= 24 && avgAge < 25) {
    ageScore = 80 // Almost ready
  } else if (avgAge > 28 && avgAge <= 29) {
    ageScore = 85 // Still in window
  } else if (avgAge > 29 && avgAge <= 30) {
    ageScore = 60 // Closing window
  } else if (avgAge < 24) {
    ageScore = 40 // Rebuilding (young)
  } else {
    ageScore = 30 // Past prime
  }
  
  // Position balance score - penalize teams with all value in one position
  const posValues = Object.values(positionValues)
  const maxPosValue = Math.max(...posValues)
  const posBalanceScore = totalValue > 0 ? (1 - (maxPosValue / totalValue) * 0.5) * 100 : 50
  
  // Star power score - do you have elite assets?
  const eliteCount = assets.filter(a => {
    const val = isSuperFlex ? a.value_2qb : a.value_1qb
    return val >= 6000
  }).length
  const starterPlusCount = assets.filter(a => {
    const val = isSuperFlex ? a.value_2qb : a.value_1qb
    return val >= 4000 && val < 6000
  }).length
  const starPowerScore = Math.min(100, (eliteCount * 25) + (starterPlusCount * 10))
  
  // Final contender score weighted:
  // - 40% star power (do you have the players to win now?)
  // - 30% age profile (are your players in their prime?)
  // - 20% total value (overall roster quality)
  // - 10% position balance (are you well-rounded?)
  const valueScore = Math.min(100, totalValue / 400) // Normalize: 40k = 100
  
  const contenderScore = Math.round(
    (starPowerScore * 0.40) +
    (ageScore * 0.30) +
    (valueScore * 0.20) +
    (posBalanceScore * 0.10)
  )
  
  return {
    roster_id: rosterId,
    team_name: teamName,
    avatar,
    total_value_1qb: isSuperFlex ? 0 : totalValue,
    total_value_2qb: isSuperFlex ? totalValue : 0,
    avg_age: playerCount > 0 ? Math.round(totalAge / playerCount * 10) / 10 : 0,
    position_values: positionValues,
    top_assets: assets.slice(0, 5),
    contender_score: contenderScore
  }
}

/**
 * Get player value by Sleeper ID
 */
export function getPlayerDynastyValue(
  playerId: string,
  playerValues: Map<string, DynastyPlayerValue>,
  isSuperFlex: boolean = false
): number {
  const player = playerValues.get(playerId)
  if (!player) return 0
  return isSuperFlex ? player.value_2qb : player.value_1qb
}

/**
 * Get tier color class for display
 */
export function getTierColorClass(tier: string): string {
  switch (tier) {
    case 'Elite': return 'text-yellow-400 bg-yellow-500/20'
    case 'Starter+': return 'text-green-400 bg-green-500/20'
    case 'Starter': return 'text-cyan-400 bg-cyan-500/20'
    case 'Bench': return 'text-blue-400 bg-blue-500/20'
    case 'Taxi': return 'text-purple-400 bg-purple-500/20'
    case 'Cut': return 'text-gray-400 bg-gray-500/20'
    default: return 'text-gray-400 bg-gray-500/20'
  }
}

/**
 * Format dynasty value for display
 */
export function formatDynastyValue(value: number): string {
  if (value >= 10000) {
    return (value / 1000).toFixed(1) + 'k'
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'k'
  }
  return value.toString()
}

/**
 * Clear the cache (useful for manual refresh)
 */
export function clearDynastyValuesCache(): void {
  playerValuesCache = null
  pickValuesCache = null
  lastFetchTime = 0
  console.log('🗑️ Dynasty values cache cleared')
}

// Export service as default
export default {
  fetchDynastyPlayerValues,
  fetchDynastyPickValues,
  calculateTeamDynastyValue,
  getPlayerDynastyValue,
  getTierColorClass,
  formatDynastyValue,
  clearDynastyValuesCache,
  generateFallbackDynastyValues
}

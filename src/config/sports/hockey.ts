/**
 * Hockey Sport Configuration
 * 
 * Supports: Yahoo, ESPN
 * League Types: Points (H2H), Categories (H2H), Rotisserie
 */

import type { SportConfig, StatDefinition, PositionDefinition, StatCategory } from './types'

// =============================================================================
// POSITIONS
// =============================================================================

const positions: PositionDefinition[] = [
  { id: 'C', name: 'Center', shortName: 'C' },
  { id: 'LW', name: 'Left Wing', shortName: 'LW' },
  { id: 'RW', name: 'Right Wing', shortName: 'RW' },
  { id: 'D', name: 'Defenseman', shortName: 'D' },
  { id: 'G', name: 'Goalie', shortName: 'G' },
  { id: 'F', name: 'Forward', shortName: 'F', eligible: ['C', 'LW', 'RW'], isFlex: true },
  { id: 'W', name: 'Winger', shortName: 'W', eligible: ['LW', 'RW'], isFlex: true },
  { id: 'UTIL', name: 'Utility', shortName: 'UTIL', eligible: ['C', 'LW', 'RW', 'D'], isFlex: true },
  { id: 'BN', name: 'Bench', shortName: 'BN' },
  { id: 'IR', name: 'Injured Reserve', shortName: 'IR' },
  { id: 'IR+', name: 'Injured Reserve Plus', shortName: 'IR+' },
]

// =============================================================================
// STATS - SKATER SCORING
// =============================================================================

const skaterScoringStats: StatDefinition[] = [
  { id: 'G', name: 'Goals', shortName: 'G', precision: 0 },
  { id: 'A', name: 'Assists', shortName: 'A', precision: 0 },
  { id: 'PTS', name: 'Points', shortName: 'PTS', precision: 0 },
  { id: 'PPG', name: 'Power Play Goals', shortName: 'PPG', precision: 0 },
  { id: 'PPA', name: 'Power Play Assists', shortName: 'PPA', precision: 0 },
  { id: 'PPP', name: 'Power Play Points', shortName: 'PPP', precision: 0 },
  { id: 'SHG', name: 'Short Handed Goals', shortName: 'SHG', precision: 0 },
  { id: 'SHA', name: 'Short Handed Assists', shortName: 'SHA', precision: 0 },
  { id: 'SHP', name: 'Short Handed Points', shortName: 'SHP', precision: 0 },
  { id: 'GWG', name: 'Game Winning Goals', shortName: 'GWG', precision: 0 },
  { id: 'OTG', name: 'Overtime Goals', shortName: 'OTG', precision: 0 },
  { id: 'ENG', name: 'Empty Net Goals', shortName: 'ENG', precision: 0 },
  { id: 'HAT', name: 'Hat Tricks', shortName: 'HAT', precision: 0 },
]

// =============================================================================
// STATS - SKATER SHOTS
// =============================================================================

const skaterShotStats: StatDefinition[] = [
  { id: 'SOG', name: 'Shots on Goal', shortName: 'SOG', precision: 0 },
  { id: 'SH%', name: 'Shooting Percentage', shortName: 'SH%', format: 'percentage', precision: 1 },
  { id: 'BLK', name: 'Blocked Shots', shortName: 'BLK', precision: 0 },
  { id: 'HIT', name: 'Hits', shortName: 'HIT', precision: 0 },
]

// =============================================================================
// STATS - SKATER MISC
// =============================================================================

const skaterMiscStats: StatDefinition[] = [
  { id: 'PIM', name: 'Penalty Minutes', shortName: 'PIM', precision: 0 },
  { id: '+/-', name: 'Plus/Minus', shortName: '+/-', precision: 0 },
  { id: 'TOI', name: 'Time on Ice', shortName: 'TOI', precision: 0 },
  { id: 'GP', name: 'Games Played', shortName: 'GP', precision: 0 },
  { id: 'FOW', name: 'Faceoffs Won', shortName: 'FOW', precision: 0 },
  { id: 'FOL', name: 'Faceoffs Lost', shortName: 'FOL', precision: 0 },
  { id: 'FO%', name: 'Faceoff Win %', shortName: 'FO%', format: 'percentage', precision: 1 },
  { id: 'TK', name: 'Takeaways', shortName: 'TK', precision: 0 },
  { id: 'GV', name: 'Giveaways', shortName: 'GV', isNegative: true, precision: 0 },
]

// =============================================================================
// STATS - GOALIE
// =============================================================================

const goalieStats: StatDefinition[] = [
  { id: 'W_G', name: 'Wins', shortName: 'W', precision: 0 },
  { id: 'L_G', name: 'Losses', shortName: 'L', isNegative: true, precision: 0 },
  { id: 'OTL', name: 'Overtime Losses', shortName: 'OTL', precision: 0 },
  { id: 'GA', name: 'Goals Against', shortName: 'GA', isNegative: true, precision: 0 },
  { id: 'GAA', name: 'Goals Against Average', shortName: 'GAA', isNegative: true, precision: 2 },
  { id: 'SV', name: 'Saves', shortName: 'SV', precision: 0 },
  { id: 'SA', name: 'Shots Against', shortName: 'SA', precision: 0 },
  { id: 'SV%', name: 'Save Percentage', shortName: 'SV%', format: 'percentage', precision: 3 },
  { id: 'SO', name: 'Shutouts', shortName: 'SO', precision: 0 },
  { id: 'GS_G', name: 'Games Started', shortName: 'GS', precision: 0 },
  { id: 'MIN_G', name: 'Minutes Played', shortName: 'MIN', precision: 0 },
]

// =============================================================================
// STAT CATEGORIES
// =============================================================================

const statCategories: StatCategory[] = [
  { id: 'scoring', name: 'Scoring', stats: skaterScoringStats },
  { id: 'shots', name: 'Shots & Blocks', stats: skaterShotStats },
  { id: 'misc', name: 'Miscellaneous', stats: skaterMiscStats },
  { id: 'goalie', name: 'Goaltending', stats: goalieStats },
]

// =============================================================================
// BUILD ALL STATS MAP
// =============================================================================

const allStats: Record<string, StatDefinition> = {}
statCategories.forEach(cat => {
  cat.stats.forEach(stat => {
    allStats[stat.id] = stat
  })
})

// =============================================================================
// POINTS SCORING CONFIG
// =============================================================================

const pointsConfig = {
  defaults: {
    // Skater scoring
    G: 3,
    A: 2,
    PTS: 0, // Usually G+A already, but some leagues use this
    PPG: 1, // Bonus
    PPA: 0.5, // Bonus
    SHG: 2, // Bonus
    SHA: 1, // Bonus
    GWG: 1, // Bonus
    HAT: 3, // Bonus
    
    // Shots/physical
    SOG: 0.3,
    HIT: 0.3,
    BLK: 0.5,
    
    // Misc
    PIM: 0.3,
    '+/-': 0.5,
    
    // Goalie
    W_G: 4,
    L_G: -2,
    GA: -1,
    SV: 0.2,
    SO: 3,
  },
  statKeys: [
    'G', 'A', 'PTS', 'PPG', 'PPA', 'SHG', 'SHA', 'GWG', 'HAT',
    'SOG', 'HIT', 'BLK', 'PIM', '+/-',
    'W_G', 'L_G', 'GA', 'SV', 'SO'
  ]
}

// =============================================================================
// CATEGORY STAT IDS (for category/roto leagues)
// =============================================================================

// Common category setups
const categoryStatIds = [
  // Skater (7-8 typical)
  'G', 'A', 'PTS', '+/-', 'PIM', 'PPP', 'SOG', 'HIT',
  // Goalie (3-4 typical)
  'W_G', 'GAA', 'SV%', 'SO'
]

// Extended categories
const extendedCategoryStatIds = [
  'PPG', 'PPA', 'SHG', 'SHA', 'GWG', 'BLK', 'FOW', 'TK',
  'SV', 'GA', 'OTL'
]

// =============================================================================
// PLATFORM MAPPINGS
// =============================================================================

const platformMappings = {
  yahoo: {
    // Yahoo hockey stat IDs (skater)
    GP: '0',
    G: '1',
    A: '2',
    PTS: '3',
    '+/-': '4',
    PIM: '5',
    PPG: '8',
    PPA: '9',
    PPP: '10',
    SHG: '11',
    SHA: '12',
    SHP: '13',
    GWG: '14',
    SOG: '16',
    HIT: '31',
    BLK: '32',
    // Yahoo hockey stat IDs (goalie)
    W_G: '19',
    L_G: '20',
    GA: '22',
    GAA: '23',
    SA: '24',
    SV: '25',
    'SV%': '26',
    SO: '27',
    GS_G: '18',
  },
  espn: {
    // ESPN hockey stat IDs (skater)
    G: '0',
    A: '1',
    PTS: '2',
    '+/-': '3',
    PIM: '4',
    PPG: '5',
    PPA: '6',
    PPP: '7',
    SHG: '8',
    SHA: '9',
    GWG: '10',
    SOG: '14',
    HIT: '31',
    BLK: '32',
    // ESPN hockey stat IDs (goalie)
    W_G: '19',
    L_G: '20',
    OTL: '21',
    GA: '22',
    GAA: '23',
    SA: '24',
    SV: '25',
    'SV%': '26',
    SO: '27',
  }
}

// =============================================================================
// EXPORT CONFIG
// =============================================================================

export const hockeyConfig: SportConfig = {
  id: 'hockey',
  name: 'Hockey',
  emoji: '🏒',
  color: '#0ea5e9', // Sky blue
  
  positions,
  statCategories,
  allStats,
  pointsConfig,
  categoryStatIds,
  platformMappings,
  
  seasonConfig: {
    regularSeasonWeeks: 24, // ~24 weeks
    playoffWeeks: 3,
    typicalPlayoffTeams: 6,
  }
}

// Export helper for extended categories
export const hockeyExtendedCategories = extendedCategoryStatIds

export default hockeyConfig

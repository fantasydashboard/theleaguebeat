/**
 * Basketball Sport Configuration
 * 
 * Supports: Yahoo, ESPN
 * League Types: Points (H2H), Categories (H2H), Rotisserie
 */

import type { SportConfig, StatDefinition, PositionDefinition, StatCategory } from './types'

// =============================================================================
// POSITIONS
// =============================================================================

const positions: PositionDefinition[] = [
  { id: 'PG', name: 'Point Guard', shortName: 'PG' },
  { id: 'SG', name: 'Shooting Guard', shortName: 'SG' },
  { id: 'SF', name: 'Small Forward', shortName: 'SF' },
  { id: 'PF', name: 'Power Forward', shortName: 'PF' },
  { id: 'C', name: 'Center', shortName: 'C' },
  { id: 'G', name: 'Guard', shortName: 'G', eligible: ['PG', 'SG'], isFlex: true },
  { id: 'F', name: 'Forward', shortName: 'F', eligible: ['SF', 'PF'], isFlex: true },
  { id: 'UTIL', name: 'Utility', shortName: 'UTIL', eligible: ['PG', 'SG', 'SF', 'PF', 'C'], isFlex: true },
  { id: 'BN', name: 'Bench', shortName: 'BN' },
  { id: 'IL', name: 'Injured List', shortName: 'IL' },
  { id: 'IL+', name: 'Injured List Plus', shortName: 'IL+' },
]

// =============================================================================
// STATS - SCORING
// =============================================================================

const scoringStats: StatDefinition[] = [
  { id: 'PTS', name: 'Points', shortName: 'PTS', precision: 0 },
  { id: 'FGM', name: 'Field Goals Made', shortName: 'FGM', precision: 0 },
  { id: 'FGA', name: 'Field Goals Attempted', shortName: 'FGA', precision: 0 },
  { id: 'FG%', name: 'Field Goal Percentage', shortName: 'FG%', format: 'percentage', precision: 1 },
  { id: 'FTM', name: 'Free Throws Made', shortName: 'FTM', precision: 0 },
  { id: 'FTA', name: 'Free Throws Attempted', shortName: 'FTA', precision: 0 },
  { id: 'FT%', name: 'Free Throw Percentage', shortName: 'FT%', format: 'percentage', precision: 1 },
  { id: '3PM', name: 'Three-Pointers Made', shortName: '3PM', precision: 0 },
  { id: '3PA', name: 'Three-Pointers Attempted', shortName: '3PA', precision: 0 },
  { id: '3P%', name: 'Three-Point Percentage', shortName: '3P%', format: 'percentage', precision: 1 },
]

// =============================================================================
// STATS - REBOUNDS
// =============================================================================

const reboundStats: StatDefinition[] = [
  { id: 'REB', name: 'Total Rebounds', shortName: 'REB', precision: 0 },
  { id: 'OREB', name: 'Offensive Rebounds', shortName: 'OREB', precision: 0 },
  { id: 'DREB', name: 'Defensive Rebounds', shortName: 'DREB', precision: 0 },
]

// =============================================================================
// STATS - PLAYMAKING
// =============================================================================

const playmakingStats: StatDefinition[] = [
  { id: 'AST', name: 'Assists', shortName: 'AST', precision: 0 },
  { id: 'TO', name: 'Turnovers', shortName: 'TO', isNegative: true, precision: 0 },
  { id: 'AST/TO', name: 'Assist/Turnover Ratio', shortName: 'A/TO', precision: 2 },
]

// =============================================================================
// STATS - DEFENSE
// =============================================================================

const defenseStats: StatDefinition[] = [
  { id: 'STL', name: 'Steals', shortName: 'STL', precision: 0 },
  { id: 'BLK', name: 'Blocks', shortName: 'BLK', precision: 0 },
  { id: 'PF', name: 'Personal Fouls', shortName: 'PF', isNegative: true, precision: 0 },
]

// =============================================================================
// STATS - MISC
// =============================================================================

const miscStats: StatDefinition[] = [
  { id: 'MIN', name: 'Minutes Played', shortName: 'MIN', precision: 0 },
  { id: 'GP', name: 'Games Played', shortName: 'GP', precision: 0 },
  { id: 'GS', name: 'Games Started', shortName: 'GS', precision: 0 },
  { id: 'DD', name: 'Double-Doubles', shortName: 'DD', precision: 0 },
  { id: 'TD', name: 'Triple-Doubles', shortName: 'TD', precision: 0 },
  { id: 'EJ', name: 'Ejections', shortName: 'EJ', isNegative: true, precision: 0 },
  { id: 'TF', name: 'Technical Fouls', shortName: 'TF', isNegative: true, precision: 0 },
]

// =============================================================================
// STAT CATEGORIES
// =============================================================================

const statCategories: StatCategory[] = [
  { id: 'scoring', name: 'Scoring', stats: scoringStats },
  { id: 'rebounds', name: 'Rebounds', stats: reboundStats },
  { id: 'playmaking', name: 'Playmaking', stats: playmakingStats },
  { id: 'defense', name: 'Defense', stats: defenseStats },
  { id: 'misc', name: 'Miscellaneous', stats: miscStats },
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
    PTS: 1,
    REB: 1.2,
    AST: 1.5,
    STL: 3,
    BLK: 3,
    TO: -1,
    FGM: 0,
    FGA: 0,
    FTM: 0,
    FTA: 0,
    '3PM': 0.5,
    OREB: 0,
    DREB: 0,
    DD: 0,
    TD: 0,
    EJ: -5,
    TF: -2,
  },
  statKeys: [
    'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO',
    'FGM', 'FGA', 'FTM', 'FTA', '3PM',
    'OREB', 'DREB', 'DD', 'TD', 'EJ', 'TF'
  ]
}

// =============================================================================
// CATEGORY STAT IDS (for category/roto leagues)
// =============================================================================

// Standard 9-category leagues
const categoryStatIds = [
  'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO',
  'FG%', 'FT%', '3PM'
]

// Extended/alternative categories
const extendedCategoryStatIds = [
  '3P%', 'OREB', 'DREB', 'DD', 'TD', 'FGM', 'FTM', 'GP', 'MIN'
]

// =============================================================================
// PLATFORM MAPPINGS
// =============================================================================

const platformMappings = {
  yahoo: {
    // Yahoo basketball stat IDs
    GP: '0',
    GS: '1',
    MIN: '2',
    FGA: '3',
    FGM: '4',
    'FG%': '5',
    FTA: '6',
    FTM: '7',
    'FT%': '8',
    '3PA': '9',
    '3PM': '10',
    '3P%': '11',
    PTS: '12',
    OREB: '13',
    DREB: '14',
    REB: '15',
    AST: '16',
    STL: '17',
    BLK: '18',
    TO: '19',
    PF: '21',
  },
  espn: {
    // ESPN basketball stat IDs
    PTS: '0',
    BLK: '1',
    STL: '2',
    AST: '3',
    OREB: '4',
    DREB: '5',
    REB: '6',
    EJ: '7',
    FF: '8',     // Flagrant Fouls
    PF: '9',     // Personal Fouls
    TF: '10',    // Technical Fouls
    TO: '11',
    DQ: '12',    // Disqualifications
    FGM: '13',
    FGA: '14',
    FTM: '15',
    FTA: '16',
    '3PM': '17',
    '3PA': '18',
    'FG%': '19',
    'FT%': '20',
    '3P%': '21',
    DD: '37',
    TD: '38',
    GP: '40',
    MIN: '41',
    GS: '42',
  }
}

// =============================================================================
// EXPORT CONFIG
// =============================================================================

export const basketballConfig: SportConfig = {
  id: 'basketball',
  name: 'Basketball',
  emoji: '🏀',
  color: '#f97316', // Orange
  
  positions,
  statCategories,
  allStats,
  pointsConfig,
  categoryStatIds,
  platformMappings,
  
  seasonConfig: {
    regularSeasonWeeks: 21, // ~21 weeks
    playoffWeeks: 3,
    typicalPlayoffTeams: 6,
  }
}

// Export helper for extended categories
export const basketballExtendedCategories = extendedCategoryStatIds

export default basketballConfig

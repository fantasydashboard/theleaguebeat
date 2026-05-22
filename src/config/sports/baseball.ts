/**
 * Baseball Sport Configuration
 * 
 * Supports: Yahoo, ESPN
 * League Types: Points (H2H), Categories (H2H), Rotisserie
 */

import type { SportConfig, StatDefinition, PositionDefinition, StatCategory } from './types'

// =============================================================================
// POSITIONS
// =============================================================================

const positions: PositionDefinition[] = [
  { id: 'C', name: 'Catcher', shortName: 'C' },
  { id: '1B', name: 'First Base', shortName: '1B' },
  { id: '2B', name: 'Second Base', shortName: '2B' },
  { id: '3B', name: 'Third Base', shortName: '3B' },
  { id: 'SS', name: 'Shortstop', shortName: 'SS' },
  { id: 'LF', name: 'Left Field', shortName: 'LF' },
  { id: 'CF', name: 'Center Field', shortName: 'CF' },
  { id: 'RF', name: 'Right Field', shortName: 'RF' },
  { id: 'OF', name: 'Outfield', shortName: 'OF', eligible: ['LF', 'CF', 'RF'], isFlex: true },
  { id: 'UTIL', name: 'Utility', shortName: 'UTIL', eligible: ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'OF', 'DH'], isFlex: true },
  { id: 'SP', name: 'Starting Pitcher', shortName: 'SP' },
  { id: 'RP', name: 'Relief Pitcher', shortName: 'RP' },
  { id: 'P', name: 'Pitcher', shortName: 'P', eligible: ['SP', 'RP'], isFlex: true },
  { id: 'DH', name: 'Designated Hitter', shortName: 'DH' },
  { id: 'BN', name: 'Bench', shortName: 'BN' },
  { id: 'IL', name: 'Injured List', shortName: 'IL' },
  { id: 'IL+', name: 'Injured List Plus', shortName: 'IL+' },
  { id: 'NA', name: 'Not Active', shortName: 'NA' },
]

// =============================================================================
// STATS - BATTING
// =============================================================================

const battingStats: StatDefinition[] = [
  // Counting stats
  { id: 'R', name: 'Runs', shortName: 'R', precision: 0 },
  { id: 'HR', name: 'Home Runs', shortName: 'HR', precision: 0 },
  { id: 'RBI', name: 'Runs Batted In', shortName: 'RBI', precision: 0 },
  { id: 'SB', name: 'Stolen Bases', shortName: 'SB', precision: 0 },
  { id: 'H', name: 'Hits', shortName: 'H', precision: 0 },
  { id: '2B', name: 'Doubles', shortName: '2B', precision: 0 },
  { id: '3B', name: 'Triples', shortName: '3B', precision: 0 },
  { id: 'BB', name: 'Walks', shortName: 'BB', precision: 0 },
  { id: 'HBP', name: 'Hit By Pitch', shortName: 'HBP', precision: 0 },
  { id: 'AB', name: 'At Bats', shortName: 'AB', precision: 0 },
  { id: 'PA', name: 'Plate Appearances', shortName: 'PA', precision: 0 },
  
  // Rate stats
  { id: 'AVG', name: 'Batting Average', shortName: 'AVG', format: 'ratio', precision: 3 },
  { id: 'OBP', name: 'On-Base Percentage', shortName: 'OBP', format: 'ratio', precision: 3 },
  { id: 'SLG', name: 'Slugging Percentage', shortName: 'SLG', format: 'ratio', precision: 3 },
  { id: 'OPS', name: 'On-Base Plus Slugging', shortName: 'OPS', format: 'ratio', precision: 3 },
  
  // Negative stats
  { id: 'SO', name: 'Strikeouts (Batting)', shortName: 'K', isNegative: true, precision: 0 },
  { id: 'CS', name: 'Caught Stealing', shortName: 'CS', isNegative: true, precision: 0 },
  { id: 'GIDP', name: 'Grounded Into Double Play', shortName: 'GIDP', isNegative: true, precision: 0 },
  
  // Advanced
  { id: 'TB', name: 'Total Bases', shortName: 'TB', precision: 0 },
  { id: 'XBH', name: 'Extra Base Hits', shortName: 'XBH', precision: 0 },
  { id: 'NSB', name: 'Net Stolen Bases', shortName: 'NSB', precision: 0 },
]

// =============================================================================
// STATS - PITCHING
// =============================================================================

const pitchingStats: StatDefinition[] = [
  // Counting stats
  { id: 'W', name: 'Wins', shortName: 'W', precision: 0 },
  { id: 'L', name: 'Losses', shortName: 'L', isNegative: true, precision: 0 },
  { id: 'SV', name: 'Saves', shortName: 'SV', precision: 0 },
  { id: 'HLD', name: 'Holds', shortName: 'HLD', precision: 0 },
  { id: 'K', name: 'Strikeouts (Pitching)', shortName: 'K', precision: 0 },
  { id: 'IP', name: 'Innings Pitched', shortName: 'IP', precision: 1 },
  { id: 'QS', name: 'Quality Starts', shortName: 'QS', precision: 0 },
  { id: 'CG', name: 'Complete Games', shortName: 'CG', precision: 0 },
  { id: 'SHO', name: 'Shutouts', shortName: 'SHO', precision: 0 },
  
  // Rate stats (lower is better)
  { id: 'ERA', name: 'Earned Run Average', shortName: 'ERA', isNegative: true, precision: 2 },
  { id: 'WHIP', name: 'Walks + Hits per IP', shortName: 'WHIP', isNegative: true, precision: 2 },
  { id: 'K9', name: 'Strikeouts per 9 IP', shortName: 'K/9', precision: 2 },
  { id: 'BB9', name: 'Walks per 9 IP', shortName: 'BB/9', isNegative: true, precision: 2 },
  { id: 'KBB', name: 'K/BB Ratio', shortName: 'K/BB', precision: 2 },
  
  // Negative counting stats
  { id: 'ER', name: 'Earned Runs', shortName: 'ER', isNegative: true, precision: 0 },
  { id: 'H_P', name: 'Hits Allowed', shortName: 'H', isNegative: true, precision: 0 },
  { id: 'BB_P', name: 'Walks Allowed', shortName: 'BB', isNegative: true, precision: 0 },
  { id: 'HR_P', name: 'Home Runs Allowed', shortName: 'HR', isNegative: true, precision: 0 },
  { id: 'BS', name: 'Blown Saves', shortName: 'BS', isNegative: true, precision: 0 },
  
  // Starts/Games
  { id: 'GS', name: 'Games Started', shortName: 'GS', precision: 0 },
  { id: 'G', name: 'Games Pitched', shortName: 'G', precision: 0 },
]

// =============================================================================
// STAT CATEGORIES
// =============================================================================

const statCategories: StatCategory[] = [
  { id: 'batting', name: 'Batting', stats: battingStats },
  { id: 'pitching', name: 'Pitching', stats: pitchingStats },
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
// POINTS SCORING CONFIG (for points leagues)
// =============================================================================

const pointsConfig = {
  defaults: {
    // Batting
    R: 1,
    HR: 4,
    RBI: 1,
    SB: 2,
    H: 0.5,
    '2B': 1,
    '3B': 2,
    BB: 1,
    HBP: 1,
    SO: -0.5,
    CS: -1,
    
    // Pitching
    W: 5,
    L: -3,
    SV: 5,
    HLD: 2,
    K: 1,
    IP: 3,
    QS: 3,
    ER: -1,
    H_P: -0.5,
    BB_P: -0.5,
    BS: -2,
  },
  statKeys: [
    'R', 'HR', 'RBI', 'SB', 'H', '2B', '3B', 'BB', 'HBP', 'SO', 'CS',
    'W', 'L', 'SV', 'HLD', 'K', 'IP', 'QS', 'ER', 'H_P', 'BB_P', 'BS'
  ]
}

// =============================================================================
// CATEGORY STAT IDS (for category/roto leagues)
// =============================================================================

// Standard 5x5 categories
const categoryStatIds = [
  // Batting (5)
  'R', 'HR', 'RBI', 'SB', 'AVG',
  // Pitching (5)
  'W', 'SV', 'K', 'ERA', 'WHIP'
]

// Extended categories often used
const extendedCategoryStatIds = [
  // Additional batting
  'OBP', 'SLG', 'OPS', 'H', 'BB', 'TB', 'XBH', 'NSB',
  // Additional pitching
  'HLD', 'QS', 'K9', 'KBB', 'IP'
]

// =============================================================================
// PLATFORM MAPPINGS
// =============================================================================

const platformMappings = {
  yahoo: {
    // Yahoo batting stat IDs
    R: '60',
    HR: '12',
    RBI: '13',
    SB: '16',
    AVG: '3',
    H: '7',
    BB: '18',
    OBP: '55',
    SLG: '56',
    OPS: '57',
    // Yahoo pitching stat IDs
    W: '28',
    SV: '32',
    K: '42',
    ERA: '26',
    WHIP: '27',
    QS: '48',
    HLD: '45',
    IP: '50',
  },
  espn: {
    // ESPN batting stat IDs
    H: '0',
    AB: '1',
    R: '2',
    HR: '3',
    RBI: '4',
    SB: '5',
    BB: '6',
    AVG: '7',
    OBP: '8',
    SLG: '9',
    OPS: '10',
    CS: '11',
    TB: '12',
    NSB: '13',
    // ESPN pitching stat IDs
    IP: '17',
    ERA: '18',
    WHIP: '19',
    K: '20',
    W: '21',
    L: '22',
    SV: '23',
    HLD: '24',
    QS: '32',
    BS: '37',
  }
}

// =============================================================================
// EXPORT CONFIG
// =============================================================================

export const baseballConfig: SportConfig = {
  id: 'baseball',
  name: 'Baseball',
  emoji: '⚾',
  color: '#3b82f6', // Blue
  
  positions,
  statCategories,
  allStats,
  pointsConfig,
  categoryStatIds,
  platformMappings,
  
  seasonConfig: {
    regularSeasonWeeks: 22, // ~22 weeks, varies
    playoffWeeks: 3,
    typicalPlayoffTeams: 6,
  }
}

// Export helper for extended categories
export const baseballExtendedCategories = extendedCategoryStatIds

export default baseballConfig

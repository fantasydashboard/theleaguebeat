/**
 * Football Sport Configuration
 * 
 * Supports: Sleeper, Yahoo, ESPN
 * League Types: Points (H2H)
 */

import type { SportConfig, StatDefinition, PositionDefinition, StatCategory } from './types'

// =============================================================================
// POSITIONS
// =============================================================================

const positions: PositionDefinition[] = [
  { id: 'QB', name: 'Quarterback', shortName: 'QB' },
  { id: 'RB', name: 'Running Back', shortName: 'RB' },
  { id: 'WR', name: 'Wide Receiver', shortName: 'WR' },
  { id: 'TE', name: 'Tight End', shortName: 'TE' },
  { id: 'K', name: 'Kicker', shortName: 'K' },
  { id: 'DEF', name: 'Defense/Special Teams', shortName: 'DEF' },
  { id: 'FLEX', name: 'Flex', shortName: 'FLEX', eligible: ['RB', 'WR', 'TE'], isFlex: true },
  { id: 'SUPER_FLEX', name: 'Super Flex', shortName: 'SF', eligible: ['QB', 'RB', 'WR', 'TE'], isFlex: true },
  { id: 'IDP_FLEX', name: 'IDP Flex', shortName: 'IDP', eligible: ['DL', 'LB', 'DB'], isFlex: true },
  { id: 'DL', name: 'Defensive Line', shortName: 'DL' },
  { id: 'LB', name: 'Linebacker', shortName: 'LB' },
  { id: 'DB', name: 'Defensive Back', shortName: 'DB' },
  { id: 'BN', name: 'Bench', shortName: 'BN' },
  { id: 'IR', name: 'Injured Reserve', shortName: 'IR' },
]

// =============================================================================
// STATS - PASSING
// =============================================================================

const passingStats: StatDefinition[] = [
  { id: 'pass_yd', name: 'Passing Yards', shortName: 'Pass Yds', precision: 0 },
  { id: 'pass_td', name: 'Passing Touchdowns', shortName: 'Pass TD', precision: 0 },
  { id: 'pass_int', name: 'Interceptions Thrown', shortName: 'INT', isNegative: true, precision: 0 },
  { id: 'pass_att', name: 'Pass Attempts', shortName: 'Att', precision: 0 },
  { id: 'pass_cmp', name: 'Completions', shortName: 'Cmp', precision: 0 },
  { id: 'pass_cmp_pct', name: 'Completion %', shortName: 'Cmp%', format: 'percentage', precision: 1 },
  { id: 'pass_2pt', name: '2-Point Conversions (Pass)', shortName: '2PT', precision: 0 },
  { id: 'pass_sack', name: 'Sacks Taken', shortName: 'Sack', isNegative: true, precision: 0 },
]

// =============================================================================
// STATS - RUSHING
// =============================================================================

const rushingStats: StatDefinition[] = [
  { id: 'rush_yd', name: 'Rushing Yards', shortName: 'Rush Yds', precision: 0 },
  { id: 'rush_td', name: 'Rushing Touchdowns', shortName: 'Rush TD', precision: 0 },
  { id: 'rush_att', name: 'Rush Attempts', shortName: 'Car', precision: 0 },
  { id: 'rush_2pt', name: '2-Point Conversions (Rush)', shortName: '2PT', precision: 0 },
]

// =============================================================================
// STATS - RECEIVING
// =============================================================================

const receivingStats: StatDefinition[] = [
  { id: 'rec', name: 'Receptions', shortName: 'Rec', precision: 0 },
  { id: 'rec_yd', name: 'Receiving Yards', shortName: 'Rec Yds', precision: 0 },
  { id: 'rec_td', name: 'Receiving Touchdowns', shortName: 'Rec TD', precision: 0 },
  { id: 'rec_tgt', name: 'Targets', shortName: 'Tgt', precision: 0 },
  { id: 'rec_2pt', name: '2-Point Conversions (Rec)', shortName: '2PT', precision: 0 },
]

// =============================================================================
// STATS - MISC OFFENSE
// =============================================================================

const miscOffenseStats: StatDefinition[] = [
  { id: 'fum_lost', name: 'Fumbles Lost', shortName: 'Fum', isNegative: true, precision: 0 },
  { id: 'fum', name: 'Total Fumbles', shortName: 'Fum', precision: 0 },
  { id: 'fum_rec_td', name: 'Fumble Recovery TD', shortName: 'FR TD', precision: 0 },
]

// =============================================================================
// STATS - KICKING
// =============================================================================

const kickingStats: StatDefinition[] = [
  { id: 'fgm', name: 'Field Goals Made', shortName: 'FGM', precision: 0 },
  { id: 'fga', name: 'Field Goals Attempted', shortName: 'FGA', precision: 0 },
  { id: 'fgm_0_19', name: 'FG 0-19 Yards', shortName: 'FG 0-19', precision: 0 },
  { id: 'fgm_20_29', name: 'FG 20-29 Yards', shortName: 'FG 20-29', precision: 0 },
  { id: 'fgm_30_39', name: 'FG 30-39 Yards', shortName: 'FG 30-39', precision: 0 },
  { id: 'fgm_40_49', name: 'FG 40-49 Yards', shortName: 'FG 40-49', precision: 0 },
  { id: 'fgm_50p', name: 'FG 50+ Yards', shortName: 'FG 50+', precision: 0 },
  { id: 'fgmiss', name: 'Field Goals Missed', shortName: 'FGMiss', isNegative: true, precision: 0 },
  { id: 'xpm', name: 'Extra Points Made', shortName: 'XPM', precision: 0 },
  { id: 'xpa', name: 'Extra Points Attempted', shortName: 'XPA', precision: 0 },
  { id: 'xpmiss', name: 'Extra Points Missed', shortName: 'XPMiss', isNegative: true, precision: 0 },
]

// =============================================================================
// STATS - DEFENSE/SPECIAL TEAMS
// =============================================================================

const defenseStats: StatDefinition[] = [
  { id: 'pts_allow', name: 'Points Allowed', shortName: 'PA', precision: 0 },
  { id: 'def_td', name: 'Defensive Touchdowns', shortName: 'Def TD', precision: 0 },
  { id: 'sack', name: 'Sacks', shortName: 'Sack', precision: 0 },
  { id: 'int', name: 'Interceptions', shortName: 'INT', precision: 0 },
  { id: 'fum_rec', name: 'Fumbles Recovered', shortName: 'FR', precision: 0 },
  { id: 'safe', name: 'Safeties', shortName: 'Safe', precision: 0 },
  { id: 'blk_kick', name: 'Blocked Kicks', shortName: 'Blk', precision: 0 },
  { id: 'def_st_td', name: 'Special Teams TD', shortName: 'ST TD', precision: 0 },
  { id: 'def_st_fum_rec', name: 'ST Fumble Recovery', shortName: 'ST FR', precision: 0 },
]

// =============================================================================
// STATS - IDP
// =============================================================================

const idpStats: StatDefinition[] = [
  { id: 'idp_tkl', name: 'Tackles', shortName: 'Tkl', precision: 0 },
  { id: 'idp_ast', name: 'Assisted Tackles', shortName: 'Ast', precision: 0 },
  { id: 'idp_sack', name: 'Sacks', shortName: 'Sack', precision: 1 },
  { id: 'idp_int', name: 'Interceptions', shortName: 'INT', precision: 0 },
  { id: 'idp_ff', name: 'Forced Fumbles', shortName: 'FF', precision: 0 },
  { id: 'idp_fr', name: 'Fumbles Recovered', shortName: 'FR', precision: 0 },
  { id: 'idp_td', name: 'Defensive TD', shortName: 'TD', precision: 0 },
  { id: 'idp_pd', name: 'Passes Defended', shortName: 'PD', precision: 0 },
  { id: 'idp_tfl', name: 'Tackles for Loss', shortName: 'TFL', precision: 0 },
  { id: 'idp_qbhit', name: 'QB Hits', shortName: 'QBH', precision: 0 },
  { id: 'idp_safe', name: 'Safeties', shortName: 'Safe', precision: 0 },
  { id: 'idp_blk', name: 'Blocked Kicks', shortName: 'Blk', precision: 0 },
]

// =============================================================================
// STAT CATEGORIES
// =============================================================================

const statCategories: StatCategory[] = [
  { id: 'passing', name: 'Passing', stats: passingStats },
  { id: 'rushing', name: 'Rushing', stats: rushingStats },
  { id: 'receiving', name: 'Receiving', stats: receivingStats },
  { id: 'misc', name: 'Miscellaneous', stats: miscOffenseStats },
  { id: 'kicking', name: 'Kicking', stats: kickingStats },
  { id: 'defense', name: 'Defense/ST', stats: defenseStats },
  { id: 'idp', name: 'IDP', stats: idpStats },
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
    // Passing
    pass_yd: 0.04,
    pass_td: 4,
    pass_int: -1,
    pass_2pt: 2,
    
    // Rushing
    rush_yd: 0.1,
    rush_td: 6,
    rush_2pt: 2,
    
    // Receiving
    rec: 1, // PPR
    rec_yd: 0.1,
    rec_td: 6,
    rec_2pt: 2,
    
    // Misc
    fum_lost: -2,
    fum_rec_td: 6,
    
    // Kicking
    fgm_0_19: 3,
    fgm_20_29: 3,
    fgm_30_39: 3,
    fgm_40_49: 4,
    fgm_50p: 5,
    fgmiss: -1,
    xpm: 1,
    xpmiss: -1,
    
    // Defense
    def_td: 6,
    sack: 1,
    int: 2,
    fum_rec: 2,
    safe: 2,
    blk_kick: 2,
    def_st_td: 6,
  },
  statKeys: [
    'pass_yd', 'pass_td', 'pass_int', 'pass_2pt',
    'rush_yd', 'rush_td', 'rush_2pt',
    'rec', 'rec_yd', 'rec_td', 'rec_2pt',
    'fum_lost', 'fum_rec_td',
    'fgm_0_19', 'fgm_20_29', 'fgm_30_39', 'fgm_40_49', 'fgm_50p', 'fgmiss', 'xpm', 'xpmiss',
    'def_td', 'sack', 'int', 'fum_rec', 'safe', 'blk_kick', 'def_st_td'
  ]
}

// =============================================================================
// PLATFORM MAPPINGS
// =============================================================================

const platformMappings = {
  sleeper: {
    // Sleeper uses these exact stat keys
    pass_yd: 'pass_yd',
    pass_td: 'pass_td',
    pass_int: 'pass_int',
    rush_yd: 'rush_yd',
    rush_td: 'rush_td',
    rec: 'rec',
    rec_yd: 'rec_yd',
    rec_td: 'rec_td',
    fum_lost: 'fum_lost',
  },
  yahoo: {
    // Yahoo stat IDs
    pass_yd: '4',
    pass_td: '5',
    pass_int: '6',
    rush_yd: '9',
    rush_td: '10',
    rec: '11',
    rec_yd: '12',
    rec_td: '13',
  },
  espn: {
    // ESPN stat IDs
    pass_yd: '3',
    pass_td: '4',
    pass_int: '20',
    rush_yd: '24',
    rush_td: '25',
    rec: '53',
    rec_yd: '42',
    rec_td: '43',
  }
}

// =============================================================================
// EXPORT CONFIG
// =============================================================================

export const footballConfig: SportConfig = {
  id: 'football',
  name: 'Football',
  emoji: '🏈',
  color: '#22c55e', // Green
  
  positions,
  statCategories,
  allStats,
  pointsConfig,
  
  // Football is primarily points-based, no standard categories
  categoryStatIds: [],
  
  platformMappings,
  
  seasonConfig: {
    regularSeasonWeeks: 14,
    playoffWeeks: 4,
    typicalPlayoffTeams: 6,
  }
}

export default footballConfig

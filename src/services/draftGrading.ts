/**
 * Premium Draft Grading System
 * 
 * Key Insights:
 * 1. Elite players are MUCH more valuable than replacement-level
 * 2. Early round busts hurt way more than late round misses
 * 3. Late round steals should be celebrated
 * 4. Position scarcity matters (SS1 vs SS24 is different than UTIL1 vs UTIL24)
 * 
 * The system uses TIER-BASED analysis rather than raw rank differentials.
 */

// Position tiers based on league size
export interface TierConfig {
  elite: number       // Top X are elite (e.g., 1-3)
  starter: number     // Top X are starters (e.g., 1-12)
  bench: number       // X-Y are bench pieces (e.g., 13-24)
  replacement: number // Beyond this is replacement level
}

export function getTierConfig(numTeams: number): TierConfig {
  return {
    elite: Math.ceil(numTeams * 0.25),      // Top 25% = Elite (3 in 12-team)
    starter: numTeams,                       // Top N = Starter
    bench: numTeams * 2,                     // N to 2N = Bench
    replacement: numTeams * 3                // Beyond 3N = Replacement
  }
}

export type Tier = 'ELITE' | 'STARTER' | 'BENCH' | 'REPLACEMENT' | 'WAIVER'

export function getTier(rank: number, config: TierConfig): Tier {
  if (rank <= config.elite) return 'ELITE'
  if (rank <= config.starter) return 'STARTER'
  if (rank <= config.bench) return 'BENCH'
  if (rank <= config.replacement) return 'REPLACEMENT'
  return 'WAIVER'
}

// Tier movement scoring - MORE AGGRESSIVE for better grade distribution
// Positive = good, Negative = bad
const TIER_MOVEMENT_SCORES: Record<string, number> = {
  // Drafted ELITE tier - high expectations, big penalties for missing
  'ELITE→ELITE': 12,         // Got what you paid for - elite stays elite
  'ELITE→STARTER': -5,       // Miss - paid elite price for just a starter
  'ELITE→BENCH': -25,        // Bad - paid elite price for bench guy
  'ELITE→REPLACEMENT': -40,  // Disaster
  'ELITE→WAIVER': -50,       // Complete bust - wasted premium pick
  
  // Drafted STARTER tier - solid expectations
  'STARTER→ELITE': 25,       // Great - found elite value mid-rounds
  'STARTER→STARTER': 5,      // Solid - got what you expected
  'STARTER→BENCH': -10,      // Miss - should have been better
  'STARTER→REPLACEMENT': -20, // Bad pick
  'STARTER→WAIVER': -30,     // Bust
  
  // Drafted BENCH tier - lower expectations, upside potential
  'BENCH→ELITE': 40,         // STEAL - found elite in late rounds
  'BENCH→STARTER': 20,       // Great find
  'BENCH→BENCH': 3,          // Got what you expected (slight positive)
  'BENCH→REPLACEMENT': -5,   // Minor miss
  'BENCH→WAIVER': -10,       // Whatever, late pick
  
  // Drafted REPLACEMENT tier - dart throws
  'REPLACEMENT→ELITE': 50,   // JACKPOT - league winner find
  'REPLACEMENT→STARTER': 30, // Huge steal
  'REPLACEMENT→BENCH': 12,   // Nice find
  'REPLACEMENT→REPLACEMENT': 0, // Who cares
  'REPLACEMENT→WAIVER': -3,  // Whatever
  
  // Drafted WAIVER tier (super late picks) - all upside
  'WAIVER→ELITE': 55,        // Absolute steal
  'WAIVER→STARTER': 35,      // Great find
  'WAIVER→BENCH': 15,        // Nice
  'WAIVER→REPLACEMENT': 2,   // Meh
  'WAIVER→WAIVER': 0         // Expected
}

export function getTierMovementScore(draftedTier: Tier, finishedTier: Tier): number {
  const key = `${draftedTier}→${finishedTier}`
  return TIER_MOVEMENT_SCORES[key] ?? 0
}

/**
 * Calculate comprehensive pick score
 */
export interface PickScoreResult {
  tierScore: number           // Score from tier movement
  eliteBonus: number          // Bonus for finishing elite
  roundMultiplier: number     // Round weight adjustment
  positionScarcityBonus: number // Bonus for scarce positions
  bustPenalty: number         // Extra penalty for early round busts
  totalScore: number          // Final score
  draftedTier: Tier
  finishedTier: Tier
  tierMovement: string        // e.g., "BENCH→ELITE"
  verdict: 'JACKPOT' | 'STEAL' | 'HIT' | 'SOLID' | 'MISS' | 'BUST' | 'DISASTER'
}

// Position scarcity multipliers by sport (scarce positions more valuable)
// Values > 1.0 = scarce/valuable, < 1.0 = easily replaceable
const POSITION_SCARCITY: Record<string, Record<string, number>> = {
  baseball: {
    'C': 1.3,       // Catchers are very scarce
    'SS': 1.2,      // Shortstops traditionally scarce
    '2B': 1.1,      // 2B can be thin
    '3B': 1.0,      // Baseline
    '1B': 0.85,     // Sluggers at 1B easy to find
    'OF': 0.9,      // Outfielders everywhere
    'SP': 1.15,     // Aces are valuable
    'RP': 0.85,     // Relievers are replaceable
    'DH': 0.8,      // DH-only very replaceable
    'UTIL': 0.8,    // Utility slots easy to fill
    'P': 1.0,       // Generic pitcher
    'LF': 0.9,
    'CF': 0.95,
    'RF': 0.9
  },
  football: {
    'QB': 0.9,      // Usually stream-able (unless elite)
    'RB': 1.25,     // Running backs are SCARCE - most valuable
    'WR': 1.0,      // Baseline - deep position
    'TE': 1.3,      // Elite TEs are RARE
    'K': 0.5,       // Kickers don't matter
    'DEF': 0.5,     // Stream defenses
    'FLEX': 0.85,   // Flex is easy to fill
    'IDP': 0.7      // IDP usually deep
  },
  basketball: {
    'PG': 1.0,      // Point guards - baseline
    'SG': 0.95,     // Shooting guards
    'SF': 0.95,     // Small forwards
    'PF': 1.0,      // Power forwards
    'C': 1.15,      // Centers can be scarce for blocks/rebounds
    'G': 0.9,       // Generic guard slot
    'F': 0.9,       // Generic forward slot
    'UTIL': 0.85    // Utility
  },
  hockey: {
    'C': 1.1,       // Centers - good for faceoffs
    'LW': 1.0,      // Left wing
    'RW': 1.0,      // Right wing
    'D': 1.15,      // Defensemen can be scarce for hits/blocks
    'G': 1.2,       // Goalies are valuable and scarce
    'UTIL': 0.85,
    'F': 0.95       // Generic forward
  }
}

// Get scarcity multiplier for a position
export function getPositionScarcity(position: string, sport: string = 'baseball'): number {
  const sportScarcity = POSITION_SCARCITY[sport.toLowerCase()] || POSITION_SCARCITY.baseball
  // Try exact match first, then uppercase, then default
  return sportScarcity[position] || sportScarcity[position.toUpperCase()] || 1.0
}

export function calculatePickScore(
  pickNumber: number,
  round: number,
  draftedPositionRank: number,  // What position rank was this player when drafted?
  finishedPositionRank: number, // What position rank did they finish?
  position: string,
  numTeams: number,
  totalPicks: number,
  sport: string = 'baseball'
): PickScoreResult {
  const config = getTierConfig(numTeams)
  
  // Handle players who didn't produce (injured, cut, etc.)
  const effectiveFinishRank = finishedPositionRank >= 900 ? config.replacement + 50 : finishedPositionRank
  
  const draftedTier = getTier(draftedPositionRank, config)
  const finishedTier = getTier(effectiveFinishRank, config)
  const tierMovement = `${draftedTier}→${finishedTier}`
  
  // Base tier movement score
  let tierScore = getTierMovementScore(draftedTier, finishedTier)
  
  // Elite finish bonus - any time you end up with an elite player, extra credit
  let eliteBonus = 0
  if (finishedTier === 'ELITE') {
    eliteBonus = 8  // Increased from 5
  }
  
  // Bust penalty - extra penalty for early picks that completely bust
  let bustPenalty = 0
  if (round <= 5 && (finishedTier === 'WAIVER' || finishedTier === 'REPLACEMENT')) {
    bustPenalty = -10 * (6 - round) // Round 1 bust = -50 extra, Round 5 = -10 extra
  }
  
  // Round multiplier - early round mistakes hurt MORE, late round finds help MORE
  let roundMultiplier = 1.0
  
  if (tierScore > 0) {
    // Outperformed - late round picks get bigger bonus
    if (round >= 15) roundMultiplier = 1.6
    else if (round >= 10) roundMultiplier = 1.4
    else if (round >= 7) roundMultiplier = 1.2
  } else if (tierScore < 0) {
    // Underperformed - early round picks penalized more heavily
    if (round <= 2) roundMultiplier = 1.5
    else if (round <= 4) roundMultiplier = 1.3
    else if (round <= 6) roundMultiplier = 1.15
  }
  
  // Position scarcity bonus/penalty (use sport-specific scarcity)
  const scarcityFactor = getPositionScarcity(position, sport)
  const positionScarcityBonus = tierScore > 0 ? (scarcityFactor - 1) * 15 : 0  // Increased from 10
  
  // Calculate total score (including bust penalty for early round disasters)
  const totalScore = (tierScore * roundMultiplier) + eliteBonus + positionScarcityBonus + bustPenalty
  
  // Determine verdict with adjusted thresholds
  let verdict: PickScoreResult['verdict']
  if (totalScore >= 40) verdict = 'JACKPOT'
  else if (totalScore >= 22) verdict = 'STEAL'
  else if (totalScore >= 10) verdict = 'HIT'
  else if (totalScore >= -5) verdict = 'SOLID'
  else if (totalScore >= -15) verdict = 'MISS'
  else if (totalScore >= -30) verdict = 'BUST'
  else verdict = 'DISASTER'
  
  return {
    tierScore,
    eliteBonus,
    roundMultiplier,
    positionScarcityBonus,
    bustPenalty,
    totalScore,
    draftedTier,
    finishedTier,
    tierMovement,
    verdict
  }
}

/**
 * Convert score to letter grade with wider distribution
 */
export function scoreToGrade(score: number): string {
  if (score >= 35) return 'A+'   // Jackpot picks only
  if (score >= 25) return 'A'    // Great steals
  if (score >= 15) return 'A-'   // Nice finds
  if (score >= 8) return 'B+'    // Solid outperformance
  if (score >= 3) return 'B'     // Met expectations well
  if (score >= -3) return 'B-'   // Slight underperformance
  if (score >= -8) return 'C+'   // Noticeable miss
  if (score >= -15) return 'C'   // Bad pick
  if (score >= -22) return 'C-'  // Really bad
  if (score >= -30) return 'D'   // Bust
  return 'F'                     // Disaster
}

/**
 * Calculate team draft grade from individual picks
 */
export interface TeamGradeResult {
  grade: string
  gradeScore: number
  totalScore: number
  avgScore: number
  
  // Breakdown by round groups
  earlyRoundScore: number    // Rounds 1-5
  midRoundScore: number      // Rounds 6-12
  lateRoundScore: number     // Rounds 13+
  
  // Pick counts by verdict
  jackpots: number
  steals: number
  hits: number
  solids: number
  misses: number
  busts: number
  disasters: number
  
  // Hit rates
  earlyRoundHitRate: number  // % of early picks that were HIT or better
  stealRate: number          // % of late picks that were STEAL or better
}

export function calculateTeamGrade(
  picks: { round: number; score: number; verdict: string }[]
): TeamGradeResult {
  if (picks.length === 0) {
    return {
      grade: 'N/A',
      gradeScore: 0,
      totalScore: 0,
      avgScore: 0,
      earlyRoundScore: 0,
      midRoundScore: 0,
      lateRoundScore: 0,
      jackpots: 0,
      steals: 0,
      hits: 0,
      solids: 0,
      misses: 0,
      busts: 0,
      disasters: 0,
      earlyRoundHitRate: 0,
      stealRate: 0
    }
  }
  
  // Weighted scoring: early picks count more
  let weightedScore = 0
  let totalWeight = 0
  
  picks.forEach(pick => {
    // Round 1-2: weight 5, Round 3-5: weight 3, Round 6-10: weight 2, Round 11+: weight 1
    let weight = 1
    if (pick.round <= 2) weight = 5
    else if (pick.round <= 5) weight = 3
    else if (pick.round <= 10) weight = 2
    
    weightedScore += pick.score * weight
    totalWeight += weight
  })
  
  const gradeScore = totalWeight > 0 ? weightedScore / totalWeight : 0
  const totalScore = picks.reduce((sum, p) => sum + p.score, 0)
  const avgScore = totalScore / picks.length
  
  // Round group scores
  const earlyPicks = picks.filter(p => p.round <= 5)
  const midPicks = picks.filter(p => p.round >= 6 && p.round <= 12)
  const latePicks = picks.filter(p => p.round >= 13)
  
  const earlyRoundScore = earlyPicks.length > 0 
    ? earlyPicks.reduce((s, p) => s + p.score, 0) / earlyPicks.length 
    : 0
  const midRoundScore = midPicks.length > 0 
    ? midPicks.reduce((s, p) => s + p.score, 0) / midPicks.length 
    : 0
  const lateRoundScore = latePicks.length > 0 
    ? latePicks.reduce((s, p) => s + p.score, 0) / latePicks.length 
    : 0
  
  // Count verdicts
  const jackpots = picks.filter(p => p.verdict === 'JACKPOT').length
  const steals = picks.filter(p => p.verdict === 'STEAL').length
  const hits = picks.filter(p => p.verdict === 'HIT').length
  const solids = picks.filter(p => p.verdict === 'SOLID').length
  const misses = picks.filter(p => p.verdict === 'MISS').length
  const busts = picks.filter(p => p.verdict === 'BUST').length
  const disasters = picks.filter(p => p.verdict === 'DISASTER').length
  
  // Hit rates
  const earlyRoundHitRate = earlyPicks.length > 0
    ? earlyPicks.filter(p => ['JACKPOT', 'STEAL', 'HIT'].includes(p.verdict)).length / earlyPicks.length * 100
    : 0
  const stealRate = latePicks.length > 0
    ? latePicks.filter(p => ['JACKPOT', 'STEAL'].includes(p.verdict)).length / latePicks.length * 100
    : 0
  
  return {
    grade: scoreToGrade(gradeScore),
    gradeScore,
    totalScore,
    avgScore,
    earlyRoundScore,
    midRoundScore,
    lateRoundScore,
    jackpots,
    steals,
    hits,
    solids,
    misses,
    busts,
    disasters,
    earlyRoundHitRate,
    stealRate
  }
}

/**
 * Apply relative grading to a list of teams - ensures grade distribution
 * Best team gets boosted, worst team gets penalized
 */
export function applyRelativeGrading(
  teams: { gradeScore: number; totalScore: number }[]
): { grade: string; relativeBonus: number }[] {
  if (teams.length === 0) return []
  
  // Sort by gradeScore to get rankings
  const sorted = [...teams].map((t, i) => ({ ...t, originalIndex: i }))
    .sort((a, b) => b.gradeScore - a.gradeScore)
  
  const numTeams = teams.length
  
  return teams.map((team, originalIndex) => {
    // Find this team's rank
    const rank = sorted.findIndex(t => t.originalIndex === originalIndex) + 1
    const percentile = ((numTeams - rank) / (numTeams - 1)) * 100
    
    // Calculate relative bonus/penalty based on rank
    // Top team gets +8, bottom team gets -8
    let relativeBonus = 0
    if (rank === 1) relativeBonus = 10  // Best drafter
    else if (rank === 2) relativeBonus = 6
    else if (rank <= Math.ceil(numTeams * 0.25)) relativeBonus = 4  // Top 25%
    else if (rank <= Math.ceil(numTeams * 0.5)) relativeBonus = 0   // Top 50%
    else if (rank <= Math.ceil(numTeams * 0.75)) relativeBonus = -4 // Bottom 50%
    else if (rank === numTeams) relativeBonus = -10 // Worst drafter
    else relativeBonus = -6 // Bottom 25%
    
    // Apply relative bonus to get final grade
    const adjustedScore = team.gradeScore + relativeBonus
    
    return {
      grade: scoreToGrade(adjustedScore),
      relativeBonus
    }
  })
}

/**
 * Grade teams relative to each other - returns grades based on league ranking
 * Guarantees grade distribution: best gets A-range, worst gets C/D/F range
 */
export function getRelativeTeamGrade(
  rank: number,
  numTeams: number,
  gradeScore: number
): string {
  const percentile = ((numTeams - rank) / Math.max(1, numTeams - 1)) * 100
  
  // Force distribution based on ranking
  // Top 10% (rank 1 in 10-team) = A+ to A
  // Top 30% = A- to B+
  // Middle 40% = B to B-
  // Bottom 30% = C+ to F
  
  // But also factor in the actual score - if score is terrible, even #1 shouldn't get A+
  
  if (percentile >= 90) {
    // Top 10% - Best drafter
    if (gradeScore >= 5) return 'A+'
    if (gradeScore >= 0) return 'A'
    return 'A-'
  }
  if (percentile >= 70) {
    // Top 30%
    if (gradeScore >= 8) return 'A'
    if (gradeScore >= 3) return 'A-'
    if (gradeScore >= 0) return 'B+'
    return 'B'
  }
  if (percentile >= 50) {
    // Top 50%
    if (gradeScore >= 5) return 'A-'
    if (gradeScore >= 0) return 'B+'
    if (gradeScore >= -5) return 'B'
    return 'B-'
  }
  if (percentile >= 30) {
    // Middle
    if (gradeScore >= 3) return 'B+'
    if (gradeScore >= -3) return 'B'
    if (gradeScore >= -8) return 'B-'
    return 'C+'
  }
  if (percentile >= 10) {
    // Bottom 30%
    if (gradeScore >= 0) return 'B'
    if (gradeScore >= -5) return 'B-'
    if (gradeScore >= -10) return 'C+'
    if (gradeScore >= -15) return 'C'
    return 'C-'
  }
  // Bottom 10% - Worst drafter
  if (gradeScore >= 0) return 'B-'
  if (gradeScore >= -5) return 'C+'
  if (gradeScore >= -10) return 'C'
  if (gradeScore >= -15) return 'C-'
  if (gradeScore >= -20) return 'D'
  return 'F'
}

/**
 * Get grade color class
 */
export function getGradeColorClass(grade: string): string {
  if (grade === 'A+') return 'text-emerald-400'
  if (grade === 'A') return 'text-green-400'
  if (grade === 'A-') return 'text-green-500'
  if (grade === 'B+') return 'text-lime-400'
  if (grade === 'B') return 'text-lime-500'
  if (grade === 'B-') return 'text-yellow-400'
  if (grade === 'C+') return 'text-yellow-500'
  if (grade === 'C') return 'text-orange-400'
  if (grade === 'C-') return 'text-orange-500'
  if (grade === 'D') return 'text-red-400'
  return 'text-red-600' // F
}

/**
 * Get verdict badge style
 */
export function getVerdictStyle(verdict: string): { bg: string; text: string; label: string } {
  switch (verdict) {
    case 'JACKPOT':
      return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '💎 JACKPOT' }
    case 'STEAL':
      return { bg: 'bg-green-500/20', text: 'text-green-400', label: '🔥 STEAL' }
    case 'HIT':
      return { bg: 'bg-lime-500/20', text: 'text-lime-400', label: '✓ HIT' }
    case 'SOLID':
      return { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '○ SOLID' }
    case 'MISS':
      return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '✗ MISS' }
    case 'BUST':
      return { bg: 'bg-orange-500/20', text: 'text-orange-400', label: '💥 BUST' }
    case 'DISASTER':
      return { bg: 'bg-red-500/20', text: 'text-red-400', label: '💀 DISASTER' }
    default:
      return { bg: 'bg-gray-500/20', text: 'text-gray-400', label: verdict }
  }
}

export default {
  getTierConfig,
  getTier,
  getTierMovementScore,
  calculatePickScore,
  scoreToGrade,
  calculateTeamGrade,
  getGradeColorClass,
  getVerdictStyle
}

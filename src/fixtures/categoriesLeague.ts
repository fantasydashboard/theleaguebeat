// Categories League: a fictional 10-team H2H category baseball league, 2026 season,
// currently mid-week-8. Designed to dramatize a category-style fantasy league:
// owns vs bleeds, category dominance, and identity drift over time. Lives next to
// pillarsLeague.ts but is intentionally a parallel data model (different shape).

/* ─────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────── */

export const currentWeek = 8 as const
export const currentSeason = 2026 as const
export const playoffCutoff = 6 as const

export const categories = [
  // Offense
  { id: 'R',   label: 'R',   name: 'Runs',         side: 'hit' },
  { id: 'H',   label: 'H',   name: 'Hits',         side: 'hit' },
  { id: 'HR',  label: 'HR',  name: 'Home Runs',    side: 'hit' },
  { id: 'RBI', label: 'RBI', name: 'RBI',          side: 'hit' },
  { id: 'SB',  label: 'SB',  name: 'Stolen Bases', side: 'hit' },
  { id: 'AVG', label: 'AVG', name: 'Batting Avg',  side: 'hit' },
  // Pitching
  { id: 'W',   label: 'W',   name: 'Wins',         side: 'pit' },
  { id: 'SV',  label: 'SV',  name: 'Saves',        side: 'pit' },
  { id: 'K',   label: 'K',   name: 'Strikeouts',   side: 'pit' },
  { id: 'HLD', label: 'HLD', name: 'Holds',        side: 'pit' },
  { id: 'ERA', label: 'ERA', name: 'ERA',          side: 'pit' },
] as const

export type CategoryId = typeof categories[number]['id']
export const categoryIds: CategoryId[] = categories.map((c) => c.id)

/* ─────────────────────────────────────────────────────────────────
   TEAMS
───────────────────────────────────────────────────────────────── */

export interface Team {
  id: string
  name: string
  ownerName: string
  ownerInitials: string
  avatarColor: string  // OKLCH gradient stops, comma-separated
  avatarUrl?: string
  isMyTeam?: boolean
  profileDescriptor: string  // small editorial tag shown under team name
}

export const teams: Team[] = [
  { id: 'bt', name: 'Bullpen Theology',     ownerName: 'Marco D.',  ownerInitials: 'MD',
    avatarColor: 'oklch(0.62 0.18 250), oklch(0.50 0.16 255)', avatarUrl: '/demo-categories-logos/bt.jpg',
    profileDescriptor: 'Pitching-pure' },
  { id: 'dd', name: 'Doubles Down',         ownerName: 'Riley K.',  ownerInitials: 'RK',
    avatarColor: 'oklch(0.74 0.16 165), oklch(0.62 0.14 170)', avatarUrl: '/demo-categories-logos/dd.jpg',
    profileDescriptor: 'Gap-power climber' },
  { id: 'wd', name: 'The Whiff Department', ownerName: 'Sasha P.',  ownerInitials: 'SP',
    avatarColor: 'oklch(0.66 0.20 305), oklch(0.54 0.18 310)', avatarUrl: '/demo-categories-logos/wd.jpg',
    profileDescriptor: 'K specialist, low AVG' },
  { id: 'qs', name: 'Quality Start',        ownerName: 'Erin W.',   ownerInitials: 'EW',
    avatarColor: 'oklch(0.68 0.10 220), oklch(0.55 0.08 225)', avatarUrl: '/demo-categories-logos/qs.jpg',
    profileDescriptor: 'Balanced middle' },
  { id: 'fb', name: 'Free Bases',           ownerName: 'Devon T.',  ownerInitials: 'DT',
    avatarColor: 'oklch(0.76 0.18 130), oklch(0.62 0.16 135)', avatarUrl: '/demo-categories-logos/fb.jpg',
    profileDescriptor: 'Speed and patience' },
  { id: 'ch', name: 'Cleanup Hitters',      ownerName: 'Andre L.',  ownerInitials: 'AL',
    avatarColor: 'oklch(0.60 0.21 35), oklch(0.50 0.18 40)', avatarUrl: '/demo-categories-logos/ch.jpg',
    profileDescriptor: 'Power and RBI' },
  { id: 'ie', name: 'Innings Eaters',       ownerName: 'Hana K.',   ownerInitials: 'HK',
    avatarColor: 'oklch(0.72 0.14 80), oklch(0.60 0.12 85)', avatarUrl: '/demo-categories-logos/ie.jpg',
    profileDescriptor: 'Workhorse SP' },
  { id: 'ws', name: 'The Walk-Off Society', ownerName: 'Cole R.',   ownerInitials: 'CR',
    avatarColor: 'oklch(0.58 0.06 280), oklch(0.46 0.05 285)', avatarUrl: '/demo-categories-logos/ws.jpg',
    profileDescriptor: 'Clutch hitters, slipping' },
  { id: 'ct', name: "Closer's Therapy",     ownerName: 'Priya N.',  ownerInitials: 'PN',
    avatarColor: 'oklch(0.60 0.20 0), oklch(0.48 0.18 5)', avatarUrl: '/demo-categories-logos/ct.jpg',
    profileDescriptor: 'Save vulture, defending champ' },
  { id: 'mv', name: 'Mound Visitors',       ownerName: 'Josh D.',   ownerInitials: 'JD',
    avatarColor: 'oklch(0.78 0.18 92), oklch(0.70 0.27 350)', avatarUrl: '/demo-categories-logos/mv.jpg',
    profileDescriptor: 'Analytics-nerd, your team', isMyTeam: true },
]

// Helper
export function getTeam(id: string): Team {
  return teams.find((t) => t.id === id)!
}

/* ─────────────────────────────────────────────────────────────────
   PER-TEAM CATEGORY RANKS — the "fingerprint"
   Each team has a rank (1..10) in each of the 11 categories.
   VERIFIED: each category has exactly one team at each rank 1..10.
───────────────────────────────────────────────────────────────── */

export interface CategoryRank {
  teamId: string
  catRanks: Record<CategoryId, number>
}

export const categoryRanks: CategoryRank[] = [
  // bt — pitching-pure dominator
  { teamId: 'bt', catRanks: { R: 8, H: 7, HR: 9, RBI: 6, SB: 9, AVG: 6, W: 2, SV: 1, K: 2, HLD: 1, ERA: 1 } },
  // dd — gap-power climber, balanced
  { teamId: 'dd', catRanks: { R: 2, H: 2, HR: 3, RBI: 2, SB: 4, AVG: 5, W: 7, SV: 6, K: 6, HLD: 5, ERA: 5 } },
  // wd — K specialist with brutal AVG
  { teamId: 'wd', catRanks: { R: 7, H: 8, HR: 5, RBI: 7, SB: 8, AVG: 10, W: 4, SV: 5, K: 1, HLD: 6, ERA: 4 } },
  // qs — balanced middle
  { teamId: 'qs', catRanks: { R: 4, H: 5, HR: 6, RBI: 5, SB: 6, AVG: 4, W: 6, SV: 4, K: 7, HLD: 7, ERA: 6 } },
  // fb — speed + patience, no power, no pitching
  { teamId: 'fb', catRanks: { R: 1, H: 1, HR: 10, RBI: 9, SB: 1, AVG: 3, W: 8, SV: 9, K: 9, HLD: 8, ERA: 8 } },
  // ch — power + RBI, no pitching at all
  { teamId: 'ch', catRanks: { R: 3, H: 6, HR: 1, RBI: 1, SB: 7, AVG: 7, W: 10, SV: 10, K: 10, HLD: 9, ERA: 10 } },
  // ie — workhorse SP, no bullpen
  { teamId: 'ie', catRanks: { R: 6, H: 4, HR: 8, RBI: 8, SB: 2, AVG: 8, W: 1, SV: 7, K: 4, HLD: 10, ERA: 3 } },
  // ws — clutch hitters slipping, soft pitching
  { teamId: 'ws', catRanks: { R: 9, H: 9, HR: 4, RBI: 10, SB: 3, AVG: 2, W: 5, SV: 8, K: 8, HLD: 3, ERA: 7 } },
  // ct — defending champ, save vulture, fading hitters
  { teamId: 'ct', catRanks: { R: 10, H: 10, HR: 2, RBI: 4, SB: 10, AVG: 9, W: 9, SV: 3, K: 3, HLD: 2, ERA: 9 } },
  // mv — your team, balanced-leaning-analytics
  { teamId: 'mv', catRanks: { R: 5, H: 3, HR: 7, RBI: 3, SB: 5, AVG: 1, W: 3, SV: 2, K: 5, HLD: 4, ERA: 2 } },
]

// Lookup helper.
export function catRanksFor(teamId: string): Record<CategoryId, number> {
  const row = categoryRanks.find((r) => r.teamId === teamId)
  if (!row) throw new Error(`No catRanks for ${teamId}`)
  return row.catRanks
}

// Self-verification: each category should have ranks 1..10 exactly once across teams.
// Throws at module load if the fixture drifts out of shape.
;(function verifyRanks() {
  for (const cat of categoryIds) {
    const seen = new Map<number, string>()
    for (const r of categoryRanks) {
      const rank = r.catRanks[cat]
      if (seen.has(rank)) {
        throw new Error(
          `categoriesLeague fixture: duplicate rank ${rank} in cat ${cat} (${seen.get(rank)} and ${r.teamId})`,
        )
      }
      seen.set(rank, r.teamId)
    }
    const missing: number[] = []
    for (let i = 1; i <= 10; i++) if (!seen.has(i)) missing.push(i)
    if (missing.length) {
      throw new Error(`categoriesLeague fixture: cat ${cat} missing ranks ${missing.join(',')}`)
    }
  }
})()

/* ─────────────────────────────────────────────────────────────────
   STANDINGS — week 8, 2026
───────────────────────────────────────────────────────────────── */

export type WLT = 'W' | 'L' | 'T'

export interface CategoryStanding {
  rank: number
  teamId: string
  catWins: number          // total cat outcomes won across all matchups this season
  catLosses: number
  catTies: number
  winPct: number           // catWins / (catWins + catLosses + catTies)
  ownsCount: number        // cats where team is top-3 in season totals
  bleedingCount: number    // cats where team is bottom-3
  avgCatsPerWeek: number   // avg # of cat wins per H2H matchup
  streak: { type: WLT; length: number }
  lastSix: WLT[]           // last 6 H2H matchup outcomes (overall, not per-cat)
}

// Hand-authored. Ordering:
//   1 bt  – just took #1 from the defending champ
//   2 dd  – climbing
//   3 wd  – K specialist
//   4 qs  – balanced middle
//   5 ie  – workhorse SP
//   6 ct  – defending champ, on the cutoff (the falling-king beat)
//   7 mv  – your team, 1 game out of playoffs
//   8 fb  – speed team, no power/pitching
//   9 ch  – power team, no pitching
//  10 ws  – slipping clutch hitters
// Total matchups so far = 8 weeks × 11 cats = 88 cat outcomes possible per team.
export const standings2026Week8: CategoryStanding[] = [
  { rank:  1, teamId: 'bt', catWins: 66, catLosses: 22, catTies: 0, winPct: 0.750,
    ownsCount: 5, bleedingCount: 3, avgCatsPerWeek: 8.3,
    streak: { type: 'W', length: 5 }, lastSix: ['W','W','W','W','W','L'] },
  { rank:  2, teamId: 'dd', catWins: 60, catLosses: 26, catTies: 2, winPct: 0.682,
    ownsCount: 4, bleedingCount: 0, avgCatsPerWeek: 7.5,
    streak: { type: 'W', length: 3 }, lastSix: ['L','W','W','L','W','W'] },
  { rank:  3, teamId: 'wd', catWins: 56, catLosses: 30, catTies: 2, winPct: 0.636,
    ownsCount: 1, bleedingCount: 3, avgCatsPerWeek: 7.0,
    streak: { type: 'W', length: 1 }, lastSix: ['W','L','W','W','L','W'] },
  { rank:  4, teamId: 'qs', catWins: 50, catLosses: 36, catTies: 2, winPct: 0.568,
    ownsCount: 0, bleedingCount: 0, avgCatsPerWeek: 6.3,
    streak: { type: 'L', length: 1 }, lastSix: ['W','W','L','W','W','L'] },
  { rank:  5, teamId: 'ie', catWins: 47, catLosses: 39, catTies: 2, winPct: 0.534,
    ownsCount: 3, bleedingCount: 4, avgCatsPerWeek: 5.9,
    streak: { type: 'W', length: 2 }, lastSix: ['L','L','W','L','W','W'] },
  { rank:  6, teamId: 'ct', catWins: 44, catLosses: 42, catTies: 2, winPct: 0.500,
    ownsCount: 4, bleedingCount: 6, avgCatsPerWeek: 5.5,
    streak: { type: 'L', length: 3 }, lastSix: ['W','W','L','L','L','L'] },
  { rank:  7, teamId: 'mv', catWins: 42, catLosses: 44, catTies: 2, winPct: 0.477,
    ownsCount: 6, bleedingCount: 0, avgCatsPerWeek: 5.3,
    streak: { type: 'W', length: 1 }, lastSix: ['L','W','L','L','W','W'] },
  { rank:  8, teamId: 'fb', catWins: 36, catLosses: 50, catTies: 2, winPct: 0.409,
    ownsCount: 4, bleedingCount: 7, avgCatsPerWeek: 4.5,
    streak: { type: 'L', length: 2 }, lastSix: ['W','W','L','W','L','L'] },
  { rank:  9, teamId: 'ch', catWins: 30, catLosses: 56, catTies: 2, winPct: 0.341,
    ownsCount: 3, bleedingCount: 5, avgCatsPerWeek: 3.8,
    streak: { type: 'L', length: 1 }, lastSix: ['L','W','L','L','W','L'] },
  { rank: 10, teamId: 'ws', catWins: 25, catLosses: 61, catTies: 2, winPct: 0.284,
    ownsCount: 3, bleedingCount: 5, avgCatsPerWeek: 3.1,
    streak: { type: 'L', length: 4 }, lastSix: ['W','L','L','L','L','L'] },
]

/* ─────────────────────────────────────────────────────────────────
   SEASON RANK HISTORY — for the bump chart
   8 weeks. Each week has each team at a unique 1..10 rank.
   Narrative arcs baked in:
     bt: 4,4,3,2,2,1,1,1   (steady climb to #1)
     ct: 1,1,1,1,3,3,5,6   (the fall from the throne)
     dd: 10,9,8,7,5,4,3,2  (the climber, +8)
     mv: 6,7,7,8,7,6,7,7   (your team, mostly flat near the bubble)
───────────────────────────────────────────────────────────────── */

export interface WeeklyRanks {
  week: number
  ranks: Record<string, number>
}

export const seasonRankHistory: WeeklyRanks[] = [
  { week: 1, ranks: { bt: 4,  ct: 1, dd: 10, mv: 6, wd: 7, qs: 5, fb: 3, ch: 2, ie: 8, ws: 9  } },
  { week: 2, ranks: { bt: 4,  ct: 1, dd: 9,  mv: 7, wd: 6, qs: 5, fb: 2, ch: 3, ie: 8, ws: 10 } },
  { week: 3, ranks: { bt: 3,  ct: 1, dd: 8,  mv: 7, wd: 6, qs: 2, fb: 5, ch: 4, ie: 9, ws: 10 } },
  { week: 4, ranks: { bt: 2,  ct: 1, dd: 7,  mv: 8, wd: 4, qs: 3, fb: 6, ch: 5, ie: 9, ws: 10 } },
  { week: 5, ranks: { bt: 2,  ct: 3, dd: 5,  mv: 7, wd: 4, qs: 1, fb: 6, ch: 8, ie: 9, ws: 10 } },
  { week: 6, ranks: { bt: 1,  ct: 3, dd: 4,  mv: 6, wd: 2, qs: 5, fb: 7, ch: 8, ie: 9, ws: 10 } },
  { week: 7, ranks: { bt: 1,  ct: 5, dd: 3,  mv: 7, wd: 2, qs: 4, fb: 8, ch: 9, ie: 6, ws: 10 } },
  { week: 8, ranks: { bt: 1,  ct: 6, dd: 2,  mv: 7, wd: 3, qs: 4, fb: 8, ch: 9, ie: 5, ws: 10 } },
]

// Verify each week has every team with a unique 1..10 rank.
;(function verifyHistory() {
  for (const w of seasonRankHistory) {
    const ranks = Object.values(w.ranks)
    const set = new Set(ranks)
    if (ranks.length !== 10 || set.size !== 10) {
      throw new Error(`categoriesLeague seasonRankHistory week ${w.week}: not 10 unique ranks (${ranks})`)
    }
    for (let i = 1; i <= 10; i++) {
      if (!set.has(i)) throw new Error(`categoriesLeague seasonRankHistory week ${w.week}: missing rank ${i}`)
    }
  }
})()

/* ─────────────────────────────────────────────────────────────────
   PER-TEAM SCORING BREAKDOWN — the 6 category-league factors
───────────────────────────────────────────────────────────────── */

export interface CategoryFactorScores {
  catWinPct: number            // 0..100 — share of cat outcomes won this season
  categoryDominance: number    // 0..100 — strength in their best cats
  categoryBalance: number      // 0..100 — fewer extreme weaknesses
  weakCategoryPenalty: number  // 0..100 — higher means fewer punt-cat liabilities
  avgCatsWonPerWeek: number    // 0..100 — normalized weekly cat win rate
  outlookForward: number       // 0..100 — projected ROS strength
}

export const teamFactorScores: Record<string, CategoryFactorScores> = {
  // bt — leader: elite catWinPct + dominance + outlook
  bt: { catWinPct: 95, categoryDominance: 96, categoryBalance: 60, weakCategoryPenalty: 65, avgCatsWonPerWeek: 92, outlookForward: 94 },
  // dd — balanced climber, best balance + good outlook
  dd: { catWinPct: 82, categoryDominance: 72, categoryBalance: 92, weakCategoryPenalty: 90, avgCatsWonPerWeek: 80, outlookForward: 82 },
  // wd — K specialist; great dominance in one cat, brutal AVG penalty
  wd: { catWinPct: 76, categoryDominance: 88, categoryBalance: 55, weakCategoryPenalty: 35, avgCatsWonPerWeek: 74, outlookForward: 72 },
  // qs — balanced middle
  qs: { catWinPct: 65, categoryDominance: 60, categoryBalance: 88, weakCategoryPenalty: 86, avgCatsWonPerWeek: 64, outlookForward: 66 },
  // ie — workhorse SP; high dominance in W/ERA but holds is dead
  ie: { catWinPct: 62, categoryDominance: 80, categoryBalance: 50, weakCategoryPenalty: 32, avgCatsWonPerWeek: 60, outlookForward: 70 },
  // ct — defending champ; still strong dominance, slipping outlook (the fall)
  ct: { catWinPct: 58, categoryDominance: 82, categoryBalance: 42, weakCategoryPenalty: 28, avgCatsWonPerWeek: 55, outlookForward: 38 },
  // mv — your team: balanced, decent dominance, strong balance, good outlook
  mv: { catWinPct: 56, categoryDominance: 78, categoryBalance: 86, weakCategoryPenalty: 88, avgCatsWonPerWeek: 54, outlookForward: 80 },
  // fb — speed team, brutal balance + many bleeds
  fb: { catWinPct: 46, categoryDominance: 70, categoryBalance: 28, weakCategoryPenalty: 18, avgCatsWonPerWeek: 45, outlookForward: 42 },
  // ch — power, zero pitching
  ch: { catWinPct: 38, categoryDominance: 75, categoryBalance: 22, weakCategoryPenalty: 14, avgCatsWonPerWeek: 38, outlookForward: 36 },
  // ws — slipping clutch hitters
  ws: { catWinPct: 30, categoryDominance: 55, categoryBalance: 38, weakCategoryPenalty: 30, avgCatsWonPerWeek: 31, outlookForward: 28 },
}

export interface CategoryFactorDef {
  id: keyof CategoryFactorScores
  label: string
  description: string
  defaultWeight: number
  color: string  // OKLCH chip color for the factor bar
}

export const factorDefs: CategoryFactorDef[] = [
  { id: 'catWinPct',           label: 'Category Win %',
    description: 'Share of category outcomes won across the season.',
    defaultWeight: 30, color: 'oklch(0.72 0.18 145)' },  // green
  { id: 'categoryDominance',   label: 'Category Dominance',
    description: 'Strength in the categories this team owns.',
    defaultWeight: 22, color: 'oklch(0.78 0.18 92)' },   // gold/yellow
  { id: 'categoryBalance',     label: 'Category Balance',
    description: 'Fewer extreme strengths and weaknesses across cats.',
    defaultWeight: 13, color: 'oklch(0.65 0.18 240)' },  // blue
  { id: 'weakCategoryPenalty', label: 'Weak Category Penalty',
    description: 'Higher score means fewer punt-cat liabilities.',
    defaultWeight: 13, color: 'oklch(0.65 0.20 25)' },   // red
  { id: 'avgCatsWonPerWeek',   label: 'Avg Cats Won / Week',
    description: 'Average number of cats won per H2H matchup.',
    defaultWeight: 9,  color: 'oklch(0.62 0.22 295)' },  // purple
  { id: 'outlookForward',      label: 'Outlook (Forward)',
    description: 'Projected strength for the rest of the season.',
    defaultWeight: 13, color: 'oklch(0.68 0.14 195)' },  // teal
]

export interface CategoryPreset {
  id: string
  label: string
  weights: Record<keyof CategoryFactorScores, number>
}

export const categoryPresets: CategoryPreset[] = [
  { id: 'balanced',  label: 'Balanced',
    weights: { catWinPct: 30, categoryDominance: 22, categoryBalance: 13, weakCategoryPenalty: 13, avgCatsWonPerWeek:  9, outlookForward: 13 } },
  { id: 'dominance', label: 'Dominance focus',
    weights: { catWinPct: 35, categoryDominance: 35, categoryBalance:  5, weakCategoryPenalty:  5, avgCatsWonPerWeek: 15, outlookForward:  5 } },
  { id: 'forward',   label: 'Forward look',
    weights: { catWinPct: 15, categoryDominance: 15, categoryBalance: 15, weakCategoryPenalty: 10, avgCatsWonPerWeek: 10, outlookForward: 35 } },
  { id: 'records',   label: 'Pure record',
    weights: { catWinPct: 60, categoryDominance: 10, categoryBalance:  5, weakCategoryPenalty:  5, avgCatsWonPerWeek: 15, outlookForward:  5 } },
]

/* ─────────────────────────────────────────────────────────────────
   EDITORIAL STORY-OF-WEEK + WEEKLY BEATS
───────────────────────────────────────────────────────────────── */

export const headlineThisWeek = {
  eyebrow: 'STORY OF WEEK 8',
  headline: 'The defending champ is bleeding cats.',
  body: "Closer's Therapy has won this league two years running. Through eight weeks they've slipped from #1 to #6, lost three straight matchups, and surrendered the saves race they used to own. Bullpen Theology is the new throne.",
  protagonistTeamId: 'bt',
  antagonistTeamId: 'ct',
} as const

export interface CategoryBeat {
  kind: 'king' | 'bleeder' | 'profile-shift'
  eyebrow: string
  headline: string
  body: string
  teamId: string
  // beat-specific data
  cats?: CategoryId[]      // king: cats they swept this week
  weekCatRecord?: string   // king: e.g. "9-2"
  cat?: CategoryId         // bleeder: the specific bleed cat
  bleedStreak?: number     // bleeder: weeks bleeding in that cat
  fromProfile?: string     // profile-shift: e.g. "Innings + ERA"
  toProfile?: string       // profile-shift: e.g. "Strikeouts"
  fromCats?: CategoryId[]  // profile-shift: cats they used to win
  toCats?: CategoryId[]    // profile-shift: cats they're winning now
  monthMarker?: string     // profile-shift: e.g. "since week 4"
}

export const categoryBeats: CategoryBeat[] = [
  {
    kind: 'king',
    eyebrow: 'THE KING THIS WEEK',
    headline: 'Bullpen Theology swept the pitching side.',
    body: 'Won W, K, SV, HLD, and ERA for a 9-2 cat record. The bullpen run rate is unsustainable for anyone trying to catch them.',
    teamId: 'bt',
    cats: ['W', 'K', 'SV', 'HLD', 'ERA'],
    weekCatRecord: '9-2',
  },
  {
    kind: 'bleeder',
    eyebrow: 'THE BLEEDER',
    headline: 'Whiff Department has lost AVG eight weeks in a row.',
    body: "Their K-specialist build is paying off in punchouts but the lineup is hitting .218 as a team. Eight straight weeks 0-1 in AVG.",
    teamId: 'wd',
    cat: 'AVG',
    bleedStreak: 8,
  },
  {
    kind: 'profile-shift',
    eyebrow: 'IDENTITY SHIFT',
    headline: 'Innings Eaters quietly became a strikeout team.',
    body: "Started the year leaning innings and ERA. Since week 4, they're winning K every week and getting beaten on ERA. The roster moves changed who they are.",
    teamId: 'ie',
    fromProfile: 'Innings and ERA',
    toProfile: 'Strikeouts',
    fromCats: ['W', 'ERA'],
    toCats: ['K'],
    monthMarker: 'since week 4',
  },
]

/* ─────────────────────────────────────────────────────────────────
   MOVEMENT BEATS — Pulse Check section editorial copy
   Authored rather than auto-derived so the voice stays consistent.
   Each teamId matches a computable signal from seasonRankHistory:
     onHeater     — biggest climber (dd: W1 #10 → W8 #2, +8 spots)
     longFall     — longest fall   (ct: W1 #1  → W8 #6, -5 spots)
     steadiestHand— lowest rank variance among top-half teams (qs)
───────────────────────────────────────────────────────────────── */

export const movementBeats = {
  onHeater: {
    teamId: 'dd',
    streak: 'W3',
    spotsClimbed: 8,
    body: 'Eight spots since week 1. Gap-power slugging that no one can match right now.',
  },
  longFall: {
    teamId: 'ct',
    fromRank: 1,
    toRank: 6,
    trajectory: [1, 1, 1, 1, 3, 3, 5, 6], // matches seasonRankHistory
  },
  steadiestHand: {
    teamId: 'qs',
    body: 'has been top 5 every week of the season. Always there, never loud.',
  },
} as const

/* ─────────────────────────────────────────────────────────────────
   HERO MOVER — biggest-mover-of-the-week editorial
   bt: W1 #4 → W8 #1 (+3 spots), W5 matchup streak, 9-2 cat record
───────────────────────────────────────────────────────────────── */

export const heroMover = {
  teamId: 'bt',
  eyebrow: 'BIGGEST MOVER OF THE WEEK',
  headline: 'Bullpen Theology just took the throne.',
  body: 'Five straight matchup wins. Owns the entire pitching side. The bullpen is putting the league on notice.',
  spots: 3,            // W1 rank 4 → W8 rank 1
  streak: 'W5',        // matches standings2026Week8 bt streak
  lastWeekRecord: '9-2', // matches kingBeat weekCatRecord
  fromRank: 4,
  toRank: 1,
  kicker: 'FROM #4 TO #1 IN EIGHT WEEKS',
} as const

/* ─────────────────────────────────────────────────────────────────
   WEEK 8 MATCHUPS — Thursday afternoon, 4 days played, 3 days left.
   All five still in progress. Some contested, some coasting.
───────────────────────────────────────────────────────────────── */

export type CategoryMatchupStatus = 'live' | 'coasting' | 'final' | 'upcoming'

export type CategoryCatLineStatus =
  | 'decided-a'
  | 'decided-b'
  | 'contested'
  | 'punted-a'
  | 'punted-b'

export interface CategoryMatchupCatLine {
  catId: CategoryId
  aCurrent: number
  bCurrent: number
  status: CategoryCatLineStatus
}

export interface CategoryDailyTrendPoint {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  aWinProb: number
  bWinProb: number
  isProjection: boolean
}

export interface CategoryMatchup {
  id: string
  weekNumber: number
  homeTeamId: string
  awayTeamId: string
  status: CategoryMatchupStatus
  // Current overall cat record this matchup
  aWins: number
  bWins: number
  ties: number
  contestedCount: number
  // Projected end-of-week cat record
  aProj: number
  bProj: number
  // Win probability for home/away (0..100, sum = 100)
  homeWinProb: number
  awayWinProb: number
  catLines: CategoryMatchupCatLine[]
  dailyTrend: CategoryDailyTrendPoint[]
  // Editorial
  headline: string
  whatToWatch: string
}

export const matchupOfTheWeekId = 'm8-1' as const

// Day labels — all matchups share Mon..Sun with currentDayIndex = 3 (Thu).
const DAY_LABELS: CategoryDailyTrendPoint['day'][] = [
  'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
]
const CURRENT_DAY_INDEX = 3 // Thu

function trend(home: number[], away: number[]): CategoryDailyTrendPoint[] {
  return DAY_LABELS.map((day, i) => ({
    day,
    aWinProb: home[i],
    bWinProb: away[i],
    isProjection: i > CURRENT_DAY_INDEX,
  }))
}

export const matchupsWeek8: CategoryMatchup[] = [
  // ─── m8-1: Closer's Therapy (a) vs Mound Visitors (b) — FEATURED ───
  // a=ct, b=mv. MV leads 5-2, 4 contested, 2 conceded by MV (SV, HLD).
  // catLines: 5 decided-b (R, H, AVG, K, ERA), 4 contested (HR, RBI, SB, W), 2 punted-b (SV, HLD).
  {
    id: 'm8-1',
    weekNumber: 8,
    homeTeamId: 'ct',
    awayTeamId: 'mv',
    status: 'live',
    aWins: 2, bWins: 5, ties: 0, contestedCount: 4,
    aProj: 4, bProj: 7,
    homeWinProb: 32, awayWinProb: 68,
    catLines: [
      { catId: 'R',   aCurrent:  21, bCurrent:  34, status: 'decided-b' },
      { catId: 'H',   aCurrent:  44, bCurrent:  61, status: 'decided-b' },
      { catId: 'HR',  aCurrent:   7, bCurrent:   6, status: 'contested' },
      { catId: 'RBI', aCurrent:  22, bCurrent:  21, status: 'contested' },
      { catId: 'SB',  aCurrent:   3, bCurrent:   4, status: 'contested' },
      { catId: 'AVG', aCurrent: 0.244, bCurrent: 0.291, status: 'decided-b' },
      { catId: 'W',   aCurrent:   3, bCurrent:   3, status: 'contested' },
      { catId: 'SV',  aCurrent:   6, bCurrent:   1, status: 'punted-b' },
      { catId: 'K',   aCurrent:  31, bCurrent:  46, status: 'decided-b' },
      { catId: 'HLD', aCurrent:   8, bCurrent:   2, status: 'punted-b' },
      { catId: 'ERA', aCurrent: 4.42, bCurrent: 2.86, status: 'decided-b' },
    ],
    dailyTrend: trend(
      [52, 48, 41, 32, 28, 26, 28],
      [48, 52, 59, 68, 72, 74, 72],
    ),
    headline: "Closer's Therapy could lose its specialty this week.",
    whatToWatch:
      "If Closer's Therapy doesn't pick up two saves Friday through Sunday, Mound Visitors closes out the upset. The bullpen has been quiet for three weeks.",
  },
  // ─── m8-2: Bullpen Theology (a) vs Doubles Down (b) — top of the table, BT sweeping ───
  // BT leads 9-0 with 2 contested. The "biggest sweep in progress."
  {
    id: 'm8-2',
    weekNumber: 8,
    homeTeamId: 'bt',
    awayTeamId: 'dd',
    status: 'coasting',
    aWins: 9, bWins: 0, ties: 0, contestedCount: 2,
    aProj: 10, bProj: 1,
    homeWinProb: 94, awayWinProb: 6,
    catLines: [
      { catId: 'R',   aCurrent:  28, bCurrent:  24, status: 'decided-a' },
      { catId: 'H',   aCurrent:  58, bCurrent:  50, status: 'decided-a' },
      { catId: 'HR',  aCurrent:   8, bCurrent:   8, status: 'contested' },
      { catId: 'RBI', aCurrent:  26, bCurrent:  22, status: 'decided-a' },
      { catId: 'SB',  aCurrent:   5, bCurrent:   4, status: 'contested' },
      { catId: 'AVG', aCurrent: 0.272, bCurrent: 0.255, status: 'decided-a' },
      { catId: 'W',   aCurrent:   5, bCurrent:   2, status: 'decided-a' },
      { catId: 'SV',  aCurrent:   7, bCurrent:   2, status: 'decided-a' },
      { catId: 'K',   aCurrent:  54, bCurrent:  35, status: 'decided-a' },
      { catId: 'HLD', aCurrent:  10, bCurrent:   3, status: 'decided-a' },
      { catId: 'ERA', aCurrent: 2.61, bCurrent: 3.94, status: 'decided-a' },
    ],
    dailyTrend: trend(
      [62, 78, 88, 94, 95, 96, 96],
      [38, 22, 12,  6,  5,  4,  4],
    ),
    headline: 'Bullpen Theology is rolling toward a sweep.',
    whatToWatch:
      'Doubles Down needs to win both HR and SB to keep this from being a clean nine-cat dismissal. Both are within one swing.',
  },
  // ─── m8-3: Whiff Department (a) vs Innings Eaters (b) — K war ───
  // Tight pitching battle.
  {
    id: 'm8-3',
    weekNumber: 8,
    homeTeamId: 'wd',
    awayTeamId: 'ie',
    status: 'live',
    aWins: 4, bWins: 4, ties: 0, contestedCount: 3,
    aProj: 6, bProj: 5,
    homeWinProb: 56, awayWinProb: 44,
    catLines: [
      { catId: 'R',   aCurrent:  20, bCurrent:  22, status: 'contested' },
      { catId: 'H',   aCurrent:  40, bCurrent:  48, status: 'decided-b' },
      { catId: 'HR',  aCurrent:   6, bCurrent:   5, status: 'decided-a' },
      { catId: 'RBI', aCurrent:  18, bCurrent:  21, status: 'decided-b' },
      { catId: 'SB',  aCurrent:   2, bCurrent:   5, status: 'decided-b' },
      { catId: 'AVG', aCurrent: 0.213, bCurrent: 0.258, status: 'decided-b' },
      { catId: 'W',   aCurrent:   4, bCurrent:   4, status: 'contested' },
      { catId: 'SV',  aCurrent:   3, bCurrent:   2, status: 'decided-a' },
      { catId: 'K',   aCurrent:  58, bCurrent:  52, status: 'contested' },
      { catId: 'HLD', aCurrent:   5, bCurrent:   2, status: 'decided-a' },
      { catId: 'ERA', aCurrent: 3.42, bCurrent: 3.18, status: 'decided-a' },
    ],
    dailyTrend: trend(
      [50, 53, 55, 56, 58, 60, 60],
      [50, 47, 45, 44, 42, 40, 40],
    ),
    headline: 'A strikeout duel that nobody can call.',
    whatToWatch:
      'Both teams have two starts left. The team that gets seven Ks more wins K. The team that loses K loses the matchup.',
  },
  // ─── m8-4: Quality Start (a) vs Free Bases (b) — bubble watch ───
  // qs slightly favored, balanced vs speed.
  {
    id: 'm8-4',
    weekNumber: 8,
    homeTeamId: 'qs',
    awayTeamId: 'fb',
    status: 'live',
    aWins: 5, bWins: 3, ties: 0, contestedCount: 3,
    aProj: 7, bProj: 4,
    homeWinProb: 64, awayWinProb: 36,
    catLines: [
      { catId: 'R',   aCurrent:  24, bCurrent:  30, status: 'decided-b' },
      { catId: 'H',   aCurrent:  46, bCurrent:  58, status: 'decided-b' },
      { catId: 'HR',  aCurrent:   6, bCurrent:   2, status: 'decided-a' },
      { catId: 'RBI', aCurrent:  20, bCurrent:  14, status: 'decided-a' },
      { catId: 'SB',  aCurrent:   3, bCurrent:  10, status: 'decided-b' },
      { catId: 'AVG', aCurrent: 0.258, bCurrent: 0.268, status: 'contested' },
      { catId: 'W',   aCurrent:   4, bCurrent:   2, status: 'decided-a' },
      { catId: 'SV',  aCurrent:   3, bCurrent:   2, status: 'contested' },
      { catId: 'K',   aCurrent:  44, bCurrent:  36, status: 'decided-a' },
      { catId: 'HLD', aCurrent:   5, bCurrent:   3, status: 'contested' },
      { catId: 'ERA', aCurrent: 3.18, bCurrent: 4.05, status: 'decided-a' },
    ],
    dailyTrend: trend(
      [54, 58, 62, 64, 66, 68, 68],
      [46, 42, 38, 36, 34, 32, 32],
    ),
    headline: 'Whoever wins the bubble stays above .500.',
    whatToWatch:
      'Free Bases needs AVG to fall their way to swipe one more cat. Quality Start can lock the matchup with a single HLD pickup Saturday.',
  },
  // ─── m8-5: Cleanup Hitters (a) vs The Walk-Off Society (b) — bottom of table ───
  // CH already conceding 4 pitching cats. Both hitting teams.
  {
    id: 'm8-5',
    weekNumber: 8,
    homeTeamId: 'ch',
    awayTeamId: 'ws',
    status: 'live',
    aWins: 4, bWins: 3, ties: 0, contestedCount: 0,
    aProj: 5, bProj: 6,
    homeWinProb: 46, awayWinProb: 54,
    catLines: [
      { catId: 'R',   aCurrent:  32, bCurrent:  22, status: 'decided-a' },
      { catId: 'H',   aCurrent:  56, bCurrent:  60, status: 'decided-b' },
      { catId: 'HR',  aCurrent:  11, bCurrent:   6, status: 'decided-a' },
      { catId: 'RBI', aCurrent:  30, bCurrent:  18, status: 'decided-a' },
      { catId: 'SB',  aCurrent:   3, bCurrent:   5, status: 'decided-b' },
      { catId: 'AVG', aCurrent: 0.262, bCurrent: 0.281, status: 'decided-b' },
      { catId: 'W',   aCurrent:   1, bCurrent:   3, status: 'punted-a' },
      { catId: 'SV',  aCurrent:   1, bCurrent:   3, status: 'punted-a' },
      { catId: 'K',   aCurrent:  22, bCurrent:  36, status: 'punted-a' },
      { catId: 'HLD', aCurrent:   1, bCurrent:   4, status: 'punted-a' },
      { catId: 'ERA', aCurrent: 5.12, bCurrent: 3.74, status: 'decided-a' },
    ],
    dailyTrend: trend(
      [50, 48, 47, 46, 45, 44, 44],
      [50, 52, 53, 54, 55, 56, 56],
    ),
    headline: 'Cleanup Hitters is conceding four pitching cats. Again.',
    whatToWatch:
      'Cleanup Hitters can dominate the offense and still lose the matchup. The Walk-Off Society only needs one more cat to finish the upset.',
  },
]

export function getMatchup(id: string): CategoryMatchup {
  const m = matchupsWeek8.find((x) => x.id === id)
  if (!m) throw new Error(`No category matchup with id ${id}`)
  return m
}

/* ─────────────────────────────────────────────────────────────────
   WEEK 9 SCHEDULE — pairings only, nothing played yet.
   Deliberately NOT a full CategoryMatchup: no score, cat lines,
   trend, or editorial prose exists for a week that hasn't started —
   fabricating those would be the exact dishonesty this fixture set
   avoids everywhere else. Consumers that only need "who plays whom
   next" (e.g. the video reel's sign-off scene) read this directly;
   nothing here claims a result.
───────────────────────────────────────────────────────────────── */

export interface CategoryScheduledMatchup {
  id: string
  weekNumber: number
  homeTeamId: string
  awayTeamId: string
}

export const matchupsWeek9: CategoryScheduledMatchup[] = [
  // Reshuffled so no pairing repeats a week 8 matchup (week 8 pairs:
  // ct-mv, bt-dd, wd-ie, qs-fb, ch-ws) — otherwise the reel's sign-off
  // scene would preview the exact matchup The Throne just narrated.
  { id: 'm9-1', weekNumber: 9, homeTeamId: 'bt', awayTeamId: 'ch' },
  { id: 'm9-2', weekNumber: 9, homeTeamId: 'dd', awayTeamId: 'ws' },
  { id: 'm9-3', weekNumber: 9, homeTeamId: 'wd', awayTeamId: 'mv' },
  { id: 'm9-4', weekNumber: 9, homeTeamId: 'qs', awayTeamId: 'ie' },
  { id: 'm9-5', weekNumber: 9, homeTeamId: 'ct', awayTeamId: 'fb' },
]

/* ─────────────────────────────────────────────────────────────────
   TEAM SCOUTING PROSE — 10 entries, used in the matchup modal
───────────────────────────────────────────────────────────────── */

export const teamScoutingProse: Record<string, string> = {
  bt: "Bullpen Theology won pitching nine straight weeks. The bullpen vultures saves, the rotation eats Ks, and they're built to punish anyone who comes in with thin pitching. They quietly fixed their AVG hole with the trade deadline pickups.",
  dd: "Doubles Down is the climber story of the year. Up from #10 to #2 on the back of gap-power hitting and a deep lineup. Their weakness is pitching depth, so start them in a roto, not always in H2H.",
  wd: "The Whiff Department is exactly what the name says. Lead the league in K, dead last in AVG. They win the cats they're built for and lose AVG by thirty points every week.",
  qs: "Quality Start has been top-5 every week. They never blow you out and never get blown out. Steady, balanced, occasionally invisible.",
  ie: "Innings Eaters started the year leaning W and ERA. Since week 4 they've quietly become a K-machine and surrendered the ERA edge. Roster moves changed who they are.",
  ct: "Closer's Therapy is the defending champ. Two-time winners. This year they've slipped from #1 to bubble, the bullpen is still elite but the offense is bleeding HR. They will still win SV and HLD against anyone.",
  mv: "Mound Visitors is the analytics build. Top-3 in AVG, ERA, and K. Limited ceiling because they punt SBs and HLDs, but they don't lose categories they target.",
  fb: "Free Bases is the speed-and-patience team. Always #1 in SB. Hits like a Little League team, no power, no RBI. Will steal a category every week they don't get blown out.",
  ch: "Cleanup Hitters has the most HR and RBI in the league and the worst pitching staff in the league. They're built to dominate offense and lose everything that requires a pitcher.",
  ws: "The Walk-Off Society was supposed to be the dark horse. They hit .280 as a team. Their pitching collapsed in June and they've gone L4 since.",
}

/* ─────────────────────────────────────────────────────────────────
   MATCHUP SERIES PROSE — narrative copy per matchup pairing
   Keyed by either "homeId-awayId" or "awayId-homeId" — the modal
   checks both orderings, so we only define one entry per pair.
───────────────────────────────────────────────────────────────── */

export interface MatchupSeriesProse {
  aTeam: string
  bTeam: string
  record: string
  body: string
}

export const matchupSeriesProse: Record<string, MatchupSeriesProse> = {
  'ct-mv': {
    aTeam: "Closer's Therapy",
    bTeam: 'Mound Visitors',
    record: '5-2',
    body: "Closer's Therapy has owned this matchup historically. Five wins in seven meetings going back to 2024. Mound Visitors' two wins both came in stretches when CT's bullpen was injured. If MV closes this out, it's the first time since the dynasty started that the analytics build has beaten the closer-collector head-to-head.",
  },
  'bt-dd': {
    aTeam: 'Bullpen Theology',
    bTeam: 'Doubles Down',
    record: '6-1',
    body: "First meeting of the season. Bullpen Theology has gone 6-1 in seven prior matchups against Doubles Down dating back to last year's regular season. The one loss came in week 12 of 2025 when Doubles Down stacked SB and rode it to a 6-5 win.",
  },
  'wd-ie': {
    aTeam: 'The Whiff Department',
    bTeam: 'Innings Eaters',
    record: '3-2',
    body: 'First meeting of the season. Whiff Department leads the all-time series 3-2 across five matchups, all of them decided by either K or ERA. This one looks like the same shape.',
  },
  'qs-fb': {
    aTeam: 'Quality Start',
    bTeam: 'Free Bases',
    record: '4-1',
    body: 'First meeting of the season. Quality Start has won four of five all-time meetings. Free Bases stole one in week 9 of 2025 when SB and AVG both fell their way.',
  },
  'ch-ws': {
    aTeam: 'Cleanup Hitters',
    bTeam: 'The Walk-Off Society',
    record: '2-2',
    body: 'First meeting of the season. Even at 2-2 across four prior matchups. Every one of them has hinged on whichever team had a starting pitcher show up that week.',
  },
}

/* ─────────────────────────────────────────────────────────────────
   LAST-FIVE H2H — per team. Used in the modal's scouting section.
───────────────────────────────────────────────────────────────── */

export const teamLastFiveH2H: Record<string, ('W' | 'L' | 'T')[]> = {
  bt: ['W', 'W', 'W', 'L', 'W'],
  dd: ['W', 'L', 'W', 'W', 'W'],
  wd: ['W', 'L', 'W', 'W', 'L'],
  qs: ['W', 'W', 'L', 'W', 'L'],
  ie: ['L', 'W', 'L', 'W', 'W'],
  ct: ['L', 'L', 'L', 'W', 'W'],
  mv: ['W', 'L', 'L', 'W', 'W'],
  fb: ['L', 'W', 'L', 'L', 'W'],
  ch: ['L', 'L', 'W', 'L', 'W'],
  ws: ['L', 'L', 'L', 'L', 'W'],
}

/* ─────────────────────────────────────────────────────────────────
   QUICK READS — page footer board
───────────────────────────────────────────────────────────────── */

export const matchupQuickReads = {
  tightestRaceToday:    { matchupId: 'm8-1', label: 'ct vs mv. 5-2-0 with 4 contested.' },
  biggestSweepInProgress: { matchupId: 'm8-2', label: 'Bullpen Theology. 9-0 over Doubles Down.' },
  bubbleWatchMatchup:    { matchupId: 'm8-4', label: 'qs vs fb. Winner stays above .500.' },
  biggestPunt:           { matchupId: 'm8-5', label: 'Cleanup Hitters. Conceding 4 pitching cats.' },
} as const

/* ─────────────────────────────────────────────────────────────────
   DRAFT 2026 — real 2025 MLB names, real-shaped 2025 season stats.
   18 rounds × 10 teams = 180 picks. Snake order, with 2025
   finish driving 2026 draft slot (worst from 2025 picks first).

   Draft slot order (round 1, picks 1..10):
     1 ws, 2 ch, 3 fb, 4 mv, 5 ct, 6 ie, 7 qs, 8 wd, 9 dd, 10 bt
   Even rounds reverse the order so adjacent rounds are back-to-back.
───────────────────────────────────────────────────────────────── */

export type PlayerPosition = 'C' | '1B' | '2B' | '3B' | 'SS' | 'OF' | 'DH' | 'SP' | 'RP'

export type DraftTier =
  | 'jackpot' | 'steal' | 'hit' | 'solid' | 'miss' | 'bust' | 'disaster'

export interface PlayerCatStats {
  // Hitting — undefined for SP/RP
  R?: number
  H?: number
  HR?: number
  RBI?: number
  SB?: number
  AVG?: number
  // Pitching — undefined for hitters/DH
  W?: number
  SV?: number
  K?: number
  HLD?: number
  ERA?: number
}

export interface CategoryDraftPick {
  pickOverall: number      // 1-180
  round: number            // 1-18
  pickInRound: number      // 1-10 (snake)
  playerId: string         // slug, e.g. 'bobby-witt-jr'
  playerName: string
  position: PlayerPosition
  mlbTeam: string          // 3-letter abbrev
  draftedByTeamId: string  // one of the 10 fantasy teams
  stats: PlayerCatStats
  valueScore: number       // positive = steal, negative = bust
  tier: DraftTier
}

// Helper: given (round, pickInRound) compute overall pick number (snake).
function pickOverallOf(round: number, pickInRound: number): number {
  return (round - 1) * 10 + pickInRound
}

// Tier bucket for a value score.
function tierFor(valueScore: number): DraftTier {
  if (valueScore >= 50) return 'jackpot'
  if (valueScore >= 20) return 'steal'
  if (valueScore >= 5) return 'hit'
  if (valueScore >= -4) return 'solid'
  if (valueScore >= -19) return 'miss'
  if (valueScore >= -49) return 'bust'
  return 'disaster'
}

// Draft slot order — index 0 = pick 1 (odd rounds); reversed for even rounds.
const DRAFT_ORDER_ODD = ['ws', 'ch', 'fb', 'mv', 'ct', 'ie', 'qs', 'wd', 'dd', 'bt'] as const
const DRAFT_ORDER_EVEN = [...DRAFT_ORDER_ODD].reverse()
function teamForSlot(round: number, pickInRound: number): string {
  const order = round % 2 === 1 ? DRAFT_ORDER_ODD : DRAFT_ORDER_EVEN
  return order[pickInRound - 1]
}

// Compact helper to build a pick — keeps the 180-row table readable.
function mk(
  round: number,
  pickInRound: number,
  playerId: string,
  playerName: string,
  position: PlayerPosition,
  mlbTeam: string,
  stats: PlayerCatStats,
  valueScore: number,
): CategoryDraftPick {
  return {
    pickOverall: pickOverallOf(round, pickInRound),
    round,
    pickInRound,
    playerId,
    playerName,
    position,
    mlbTeam,
    draftedByTeamId: teamForSlot(round, pickInRound),
    stats,
    valueScore,
    tier: tierFor(valueScore),
  }
}

export const draftPicks2026: CategoryDraftPick[] = [
  /* ─── Round 1 — ws ch fb mv ct ie qs wd dd bt ──────────────── */
  mk(1, 1,  'bobby-witt-jr',     'Bobby Witt Jr.',     'SS', 'KC',  { R: 122, H: 195, HR: 30, RBI: 95, SB: 31, AVG: 0.295 },  18), // ws · HIT
  mk(1, 2,  'aaron-judge',       'Aaron Judge',        'OF', 'NYY', { R: 128, H: 175, HR: 51, RBI: 132, SB: 8, AVG: 0.312 }, 22), // ch · STEAL
  mk(1, 3,  'shohei-ohtani',     'Shohei Ohtani',      'DH', 'LAD', { R: 134, H: 178, HR: 49, RBI: 108, SB: 28, AVG: 0.305 }, 14), // fb · HIT
  mk(1, 4,  'juan-soto',         'Juan Soto',          'OF', 'NYM', { R: 116, H: 160, HR: 38, RBI: 105, SB: 12, AVG: 0.288 }, 6),  // mv · HIT
  mk(1, 5,  'elly-de-la-cruz',   'Elly De La Cruz',    'SS', 'CIN', { R: 102, H: 148, HR: 24, RBI: 78, SB: 42, AVG: 0.252 }, -12), // ct · MISS
  mk(1, 6,  'tarik-skubal',      'Tarik Skubal',       'SP', 'DET', { W: 17, K: 218, ERA: 2.48, SV: 0, HLD: 0 }, 24), // ie · STEAL
  mk(1, 7,  'jose-ramirez',      'José Ramírez',       '3B', 'CLE', { R: 108, H: 175, HR: 34, RBI: 102, SB: 30, AVG: 0.282 }, 12), // qs · HIT
  mk(1, 8,  'paul-skenes',       'Paul Skenes',        'SP', 'PIT', { W: 13, K: 215, ERA: 1.96, SV: 0, HLD: 0 }, 30), // wd · STEAL
  mk(1, 9,  'mookie-betts',      'Mookie Betts',       'SS', 'LAD', { R: 88, H: 142, HR: 18, RBI: 70, SB: 12, AVG: 0.265 }, -25), // dd · BUST
  mk(1, 10, 'garrett-crochet',   'Garrett Crochet',    'SP', 'BOS', { W: 14, K: 224, ERA: 2.74, SV: 0, HLD: 0 }, 18), // bt · HIT

  /* ─── Round 2 — bt dd wd qs ie ct mv fb ch ws ──────────────── */
  mk(2, 1,  'emmanuel-clase',    'Emmanuel Clase',     'RP', 'CLE', { W: 4, SV: 46, K: 72, HLD: 0, ERA: 1.04 }, 28), // bt · STEAL
  mk(2, 2,  'yordan-alvarez',    'Yordan Alvarez',     'DH', 'HOU', { R: 38, H: 65, HR: 10, RBI: 42, SB: 0, AVG: 0.249 }, -55), // dd · DISASTER (bust of draft)
  mk(2, 3,  'gunnar-henderson',  'Gunnar Henderson',   'SS', 'BAL', { R: 105, H: 170, HR: 32, RBI: 92, SB: 18, AVG: 0.283 }, 14), // wd · HIT
  mk(2, 4,  'ronald-acuna-jr',   'Ronald Acuña Jr.',   'OF', 'ATL', { R: 92, H: 145, HR: 22, RBI: 75, SB: 28, AVG: 0.272 }, -8), // qs · MISS
  mk(2, 5,  'logan-webb',        'Logan Webb',         'SP', 'SF',  { W: 14, K: 190, ERA: 2.92, SV: 0, HLD: 0 }, 8), // ie · HIT
  mk(2, 6,  'freddie-freeman',   'Freddie Freeman',    '1B', 'LAD', { R: 95, H: 175, HR: 25, RBI: 95, SB: 8, AVG: 0.301 }, 6), // ct · HIT
  mk(2, 7,  'corbin-carroll',    'Corbin Carroll',     'OF', 'ARI', { R: 98, H: 150, HR: 22, RBI: 72, SB: 35, AVG: 0.262 }, -5), // mv · MISS
  mk(2, 8,  'trea-turner',       'Trea Turner',        'SS', 'PHI', { R: 110, H: 178, HR: 21, RBI: 70, SB: 32, AVG: 0.298 }, 10), // fb · HIT
  mk(2, 9,  'pete-alonso',       'Pete Alonso',        '1B', 'NYM', { R: 88, H: 155, HR: 36, RBI: 108, SB: 2, AVG: 0.272 }, 12), // ch · HIT
  mk(2, 10, 'bryce-harper',      'Bryce Harper',       '1B', 'PHI', { R: 92, H: 158, HR: 28, RBI: 92, SB: 6, AVG: 0.285 }, 4), // ws · SOLID

  /* ─── Round 3 — ws ch fb mv ct ie qs wd dd bt ──────────────── */
  mk(3, 1,  'fernando-tatis-jr', 'Fernando Tatis Jr.', 'OF', 'SD',  { R: 96, H: 148, HR: 30, RBI: 85, SB: 16, AVG: 0.275 }, 8), // ws · HIT
  mk(3, 2,  'kyle-tucker',       'Kyle Tucker',        'OF', 'CHC', { R: 102, H: 155, HR: 30, RBI: 95, SB: 18, AVG: 0.295 }, 16), // ch · HIT
  mk(3, 3,  'jose-altuve',       'José Altuve',        '2B', 'HOU', { R: 92, H: 168, HR: 16, RBI: 65, SB: 12, AVG: 0.292 }, -2), // fb · SOLID
  mk(3, 4,  'rafael-devers',     'Rafael Devers',      '3B', 'SF',  { R: 95, H: 165, HR: 32, RBI: 105, SB: 4, AVG: 0.275 }, 8), // mv · HIT
  mk(3, 5,  'zack-wheeler',      'Zack Wheeler',       'SP', 'PHI', { W: 11, K: 175, ERA: 2.65, SV: 0, HLD: 0 }, 4), // ct · SOLID
  mk(3, 6,  'mason-miller',      'Mason Miller',       'RP', 'ATH', { W: 5, SV: 28, K: 105, HLD: 4, ERA: 2.15 }, 25), // ie · STEAL
  mk(3, 7,  'jackson-merrill',   'Jackson Merrill',    'OF', 'SD',  { R: 88, H: 165, HR: 22, RBI: 88, SB: 14, AVG: 0.298 }, 14), // qs · HIT
  mk(3, 8,  'cole-ragans',       'Cole Ragans',        'SP', 'KC',  { W: 9, K: 162, ERA: 3.65, SV: 0, HLD: 0 }, -10), // wd · MISS
  mk(3, 9,  'will-smith',        'Will Smith',         'C',  'LAD', { R: 78, H: 142, HR: 22, RBI: 82, SB: 4, AVG: 0.288 }, 6), // dd · HIT
  mk(3, 10, 'devin-williams',    'Devin Williams',     'RP', 'NYY', { W: 4, SV: 28, K: 72, HLD: 2, ERA: 3.18 }, -8), // bt · MISS

  /* ─── Round 4 — bt dd wd qs ie ct mv fb ch ws ──────────────── */
  mk(4, 1,  'josh-hader',        'Josh Hader',         'RP', 'HOU', { W: 5, SV: 32, K: 88, HLD: 0, ERA: 1.95 }, 22), // bt · STEAL
  mk(4, 2,  'bryan-reynolds',    'Bryan Reynolds',     'OF', 'PIT', { R: 84, H: 158, HR: 24, RBI: 88, SB: 10, AVG: 0.275 }, 6), // dd · HIT
  mk(4, 3,  'george-kirby',      'George Kirby',       'SP', 'SEA', { W: 12, K: 180, ERA: 3.08, SV: 0, HLD: 0 }, 8), // wd · HIT
  mk(4, 4,  'matt-olson',        'Matt Olson',         '1B', 'ATL', { R: 95, H: 150, HR: 34, RBI: 102, SB: 2, AVG: 0.258 }, 4), // qs · SOLID
  mk(4, 5,  'cristopher-sanchez','Cristopher Sánchez', 'SP', 'PHI', { W: 11, K: 168, ERA: 2.85, SV: 0, HLD: 0 }, 16), // ie · HIT
  mk(4, 6,  'oneil-cruz',        'Oneil Cruz',         'OF', 'PIT', { R: 95, H: 132, HR: 25, RBI: 70, SB: 32, AVG: 0.245 }, 2), // ct · SOLID
  mk(4, 7,  'corbin-burnes',     'Corbin Burnes',      'SP', 'ARI', { W: 8, K: 145, ERA: 3.42, SV: 0, HLD: 0 }, -12), // mv · MISS
  mk(4, 8,  'gleyber-torres',    'Gleyber Torres',     '2B', 'DET', { R: 82, H: 152, HR: 18, RBI: 70, SB: 6, AVG: 0.275 }, 4), // fb · SOLID
  mk(4, 9,  'manny-machado',     'Manny Machado',      '3B', 'SD',  { R: 88, H: 165, HR: 28, RBI: 95, SB: 4, AVG: 0.285 }, 8), // ch · HIT
  mk(4, 10, 'ryan-helsley',      'Ryan Helsley',       'RP', 'NYM', { W: 3, SV: 24, K: 65, HLD: 2, ERA: 2.92 }, -6), // ws · MISS

  /* ─── Round 5 — ws ch fb mv ct ie qs wd dd bt ──────────────── */
  mk(5, 1,  'spencer-strider',   'Spencer Strider',    'SP', 'ATL', { W: 7, K: 142, ERA: 3.78, SV: 0, HLD: 0 }, -18), // ws · MISS
  mk(5, 2,  'vladimir-guerrero-jr','Vladimir Guerrero Jr.','1B','TOR',{ R: 92, H: 175, HR: 26, RBI: 98, SB: 4, AVG: 0.305 }, 16), // ch · HIT
  mk(5, 3,  'jazz-chisholm-jr',  'Jazz Chisholm Jr.',  '2B', 'NYY', { R: 88, H: 142, HR: 24, RBI: 75, SB: 32, AVG: 0.252 }, 8), // fb · HIT
  mk(5, 4,  'william-contreras', 'William Contreras',  'C',  'MIL', { R: 82, H: 165, HR: 22, RBI: 88, SB: 6, AVG: 0.295 }, 14), // mv · HIT
  mk(5, 5,  'andres-munoz',      'Andrés Muñoz',       'RP', 'SEA', { W: 4, SV: 32, K: 80, HLD: 0, ERA: 1.85 }, 28), // ct · STEAL
  mk(5, 6,  'yoshinobu-yamamoto','Yoshinobu Yamamoto', 'SP', 'LAD', { W: 13, K: 170, ERA: 2.62, SV: 0, HLD: 0 }, 22), // ie · STEAL
  mk(5, 7,  'francisco-lindor',  'Francisco Lindor',   'SS', 'NYM', { R: 100, H: 160, HR: 28, RBI: 88, SB: 18, AVG: 0.272 }, 10), // qs · HIT
  mk(5, 8,  'logan-gilbert',     'Logan Gilbert',      'SP', 'SEA', { W: 10, K: 175, ERA: 3.15, SV: 0, HLD: 0 }, 4), // wd · SOLID
  mk(5, 9,  'salvador-perez',    'Salvador Perez',     'C',  'KC',  { R: 72, H: 158, HR: 28, RBI: 102, SB: 0, AVG: 0.272 }, 6), // dd · HIT
  mk(5, 10, 'edwin-diaz',        'Edwin Díaz',         'RP', 'NYM', { W: 5, SV: 35, K: 92, HLD: 0, ERA: 2.45 }, 16), // bt · HIT

  /* ─── Round 6 — bt dd wd qs ie ct mv fb ch ws ──────────────── */
  mk(6, 1,  'raisel-iglesias',   'Raisel Iglesias',    'RP', 'ATL', { W: 4, SV: 30, K: 75, HLD: 0, ERA: 2.40 }, 12), // bt · HIT
  mk(6, 2,  'austin-riley',      'Austin Riley',       '3B', 'ATL', { R: 80, H: 142, HR: 26, RBI: 88, SB: 2, AVG: 0.265 }, -2), // dd · SOLID
  mk(6, 3,  'tyler-glasnow',     'Tyler Glasnow',      'SP', 'LAD', { W: 8, K: 165, ERA: 3.42, SV: 0, HLD: 0 }, -10), // wd · MISS
  mk(6, 4,  'marcell-ozuna',     'Marcell Ozuna',      'DH', 'ATL', { R: 75, H: 140, HR: 28, RBI: 92, SB: 0, AVG: 0.268 }, 2), // qs · SOLID
  mk(6, 5,  'sonny-gray',        'Sonny Gray',         'SP', 'STL', { W: 12, K: 160, ERA: 3.18, SV: 0, HLD: 0 }, 8), // ie · HIT
  mk(6, 6,  'spencer-steer',     'Spencer Steer',      '3B', 'CIN', { R: 78, H: 145, HR: 22, RBI: 82, SB: 14, AVG: 0.260 }, 4), // ct · SOLID
  mk(6, 7,  'sean-murphy',       'Sean Murphy',        'C',  'ATL', { R: 65, H: 125, HR: 24, RBI: 75, SB: 0, AVG: 0.255 }, 0), // mv · SOLID
  mk(6, 8,  'esteury-ruiz',      'Esteury Ruiz',       'OF', 'ATH', { R: 68, H: 130, HR: 6, RBI: 38, SB: 48, AVG: 0.252 }, 8), // fb · HIT
  mk(6, 9,  'kyle-schwarber',    'Kyle Schwarber',     'DH', 'PHI', { R: 95, H: 132, HR: 38, RBI: 95, SB: 8, AVG: 0.235 }, 14), // ch · HIT
  mk(6, 10, 'cedric-mullins',    'Cedric Mullins',     'OF', 'BAL', { R: 75, H: 138, HR: 18, RBI: 62, SB: 28, AVG: 0.245 }, -4), // ws · SOLID

  /* ─── Round 7 — ws ch fb mv ct ie qs wd dd bt ──────────────── */
  mk(7, 1,  'jeremy-pena',       'Jeremy Peña',        'SS', 'HOU', { R: 78, H: 158, HR: 16, RBI: 70, SB: 18, AVG: 0.282 }, 6), // ws · HIT
  mk(7, 2,  'teoscar-hernandez', 'Teoscar Hernández',  'OF', 'LAD', { R: 82, H: 148, HR: 30, RBI: 92, SB: 8, AVG: 0.272 }, 10), // ch · HIT
  mk(7, 3,  'jose-caballero',    'José Caballero',     '2B', 'NYY', { R: 65, H: 110, HR: 8, RBI: 35, SB: 42, AVG: 0.235 }, 6), // fb · HIT
  mk(7, 4,  'shota-imanaga',     'Shota Imanaga',      'SP', 'CHC', { W: 12, K: 158, ERA: 3.08, SV: 0, HLD: 0 }, 8), // mv · HIT
  mk(7, 5,  'kenley-jansen',     'Kenley Jansen',      'RP', 'LAA', { W: 3, SV: 24, K: 62, HLD: 0, ERA: 3.45 }, -8), // ct · MISS
  mk(7, 6,  'pablo-lopez',       'Pablo López',        'SP', 'MIN', { W: 13, K: 180, ERA: 3.32, SV: 0, HLD: 0 }, 10), // ie · HIT
  mk(7, 7,  'matt-mclain',       'Matt McLain',        '2B', 'CIN', { R: 70, H: 130, HR: 14, RBI: 55, SB: 22, AVG: 0.255 }, -8), // qs · MISS
  mk(7, 8,  'framber-valdez',    'Framber Valdez',     'SP', 'HOU', { W: 14, K: 175, ERA: 3.42, SV: 0, HLD: 0 }, 6), // wd · HIT
  mk(7, 9,  'jarren-duran',      'Jarren Duran',       'OF', 'BOS', { R: 95, H: 175, HR: 18, RBI: 75, SB: 26, AVG: 0.282 }, 14), // dd · HIT
  mk(7, 10, 'pete-fairbanks',    'Pete Fairbanks',     'RP', 'TB',  { W: 3, SV: 26, K: 65, HLD: 2, ERA: 2.65 }, 4), // bt · SOLID

  /* ─── Round 8 — bt dd wd qs ie ct mv fb ch ws ──────────────── */
  mk(8, 1,  'jhoan-duran',       'Jhoan Duran',        'RP', 'PHI', { W: 4, SV: 18, K: 78, HLD: 8, ERA: 2.30 }, 14), // bt · HIT
  mk(8, 2,  'colt-keith',        'Colt Keith',         '2B', 'DET', { R: 68, H: 142, HR: 18, RBI: 75, SB: 4, AVG: 0.272 }, 8), // dd · HIT
  mk(8, 3,  'dylan-cease',       'Dylan Cease',        'SP', 'SD',  { W: 11, K: 215, ERA: 3.62, SV: 0, HLD: 0 }, 22), // wd · STEAL
  mk(8, 4,  'tanner-bibee',      'Tanner Bibee',       'SP', 'CLE', { W: 12, K: 170, ERA: 3.15, SV: 0, HLD: 0 }, 12), // qs · HIT
  mk(8, 5,  'sandy-alcantara',   'Sandy Alcantara',    'SP', 'MIA', { W: 8, K: 155, ERA: 3.92, SV: 0, HLD: 0 }, -12), // ie · MISS
  mk(8, 6,  'lawrence-butler',   'Lawrence Butler',    'OF', 'ATH', { R: 78, H: 138, HR: 24, RBI: 75, SB: 22, AVG: 0.262 }, 10), // ct · HIT
  mk(8, 7,  'ranger-suarez',     'Ranger Suárez',      'SP', 'PHI', { W: 12, K: 145, ERA: 3.25, SV: 0, HLD: 0 }, 8), // mv · HIT
  mk(8, 8,  'masyn-winn',        'Masyn Winn',         'SS', 'STL', { R: 75, H: 158, HR: 14, RBI: 62, SB: 18, AVG: 0.268 }, 4), // fb · SOLID
  mk(8, 9,  'isaac-paredes',     'Isaac Paredes',      '3B', 'HOU', { R: 65, H: 130, HR: 24, RBI: 80, SB: 2, AVG: 0.245 }, -2), // ch · SOLID
  mk(8, 10, 'cal-raleigh',       'Cal Raleigh',        'C',  'SEA', { R: 88, H: 142, HR: 38, RBI: 105, SB: 0, AVG: 0.248 }, 22), // ws · STEAL

  /* ─── Round 9 — ws ch fb mv ct ie qs wd dd bt ──────────────── */
  mk(9, 1,  'adolis-garcia',     'Adolis García',      'OF', 'TEX', { R: 72, H: 130, HR: 28, RBI: 88, SB: 14, AVG: 0.232 }, 4), // ws · SOLID
  mk(9, 2,  'anthony-santander', 'Anthony Santander',  'OF', 'TOR', { R: 80, H: 140, HR: 32, RBI: 92, SB: 2, AVG: 0.262 }, 8), // ch · HIT
  mk(9, 3,  'luis-robert-jr',    'Luis Robert Jr.',    'OF', 'CWS', { R: 68, H: 118, HR: 18, RBI: 58, SB: 24, AVG: 0.218 }, -16), // fb · MISS
  mk(9, 4,  'reynaldo-lopez',    'Reynaldo López',     'SP', 'ATL', { W: 10, K: 142, ERA: 3.18, SV: 0, HLD: 0 }, 8), // mv · HIT
  mk(9, 5,  'salvador-acuna',    'Salvador Acuña',     'OF', 'COL', { R: 62, H: 120, HR: 15, RBI: 55, SB: 12, AVG: 0.255 }, -4), // ct · SOLID
  mk(9, 6,  'hunter-greene',     'Hunter Greene',      'SP', 'CIN', { W: 11, K: 195, ERA: 2.92, SV: 0, HLD: 0 }, 16), // ie · HIT
  mk(9, 7,  'ryan-mountcastle',  'Ryan Mountcastle',   '1B', 'BAL', { R: 65, H: 130, HR: 18, RBI: 70, SB: 0, AVG: 0.265 }, 0), // qs · SOLID
  mk(9, 8,  'aaron-civale',      'Aaron Civale',       'SP', 'CWS', { W: 7, K: 130, ERA: 4.05, SV: 0, HLD: 0 }, -10), // wd · MISS
  mk(9, 9,  'royce-lewis',       'Royce Lewis',        '3B', 'MIN', { R: 42, H: 78, HR: 12, RBI: 38, SB: 4, AVG: 0.245 }, -28), // dd · BUST
  mk(9, 10, 'felix-bautista',    'Félix Bautista',     'RP', 'BAL', { W: 4, SV: 32, K: 85, HLD: 0, ERA: 2.18 }, 24), // bt · STEAL

  /* ─── Round 10 — bt dd wd qs ie ct mv fb ch ws ─────────────── */
  mk(10, 1, 'tanner-scott',      'Tanner Scott',       'RP', 'LAD', { W: 3, SV: 12, K: 70, HLD: 14, ERA: 3.45 }, 0), // bt · SOLID
  mk(10, 2, 'nick-castellanos',  'Nick Castellanos',   'OF', 'PHI', { R: 72, H: 145, HR: 22, RBI: 82, SB: 4, AVG: 0.260 }, 4), // dd · SOLID
  mk(10, 3, 'jared-jones',       'Jared Jones',        'SP', 'PIT', { W: 8, K: 158, ERA: 3.52, SV: 0, HLD: 0 }, 2), // wd · SOLID
  mk(10, 4, 'cody-bellinger',    'Cody Bellinger',     'OF', 'NYY', { R: 78, H: 145, HR: 24, RBI: 78, SB: 8, AVG: 0.272 }, 6), // qs · HIT
  mk(10, 5, 'jacob-degrom',      'Jacob deGrom',       'SP', 'TEX', { W: 10, K: 168, ERA: 2.95, SV: 0, HLD: 0 }, 18), // ie · HIT
  mk(10, 6, 'porter-hodge',      'Porter Hodge',       'RP', 'CHC', { W: 5, SV: 14, K: 78, HLD: 12, ERA: 2.85 }, 10), // ct · HIT
  mk(10, 7, 'roki-sasaki',       'Roki Sasaki',        'SP', 'LAD', { W: 9, K: 162, ERA: 3.25, SV: 0, HLD: 0 }, 8), // mv · HIT
  mk(10, 8, 'andrew-benintendi', 'Andrew Benintendi',  'OF', 'CWS', { R: 60, H: 130, HR: 12, RBI: 55, SB: 6, AVG: 0.262 }, -2), // fb · SOLID
  mk(10, 9, 'josh-naylor',       'Josh Naylor',        '1B', 'SEA', { R: 70, H: 148, HR: 22, RBI: 88, SB: 4, AVG: 0.282 }, 8), // ch · HIT
  mk(10, 10,'lucas-giolito',     'Lucas Giolito',      'SP', 'BOS', { W: 9, K: 142, ERA: 3.78, SV: 0, HLD: 0 }, -4), // ws · SOLID

  /* ─── Round 11 — ws ch fb mv ct ie qs wd dd bt ─────────────── */
  mk(11, 1, 'taylor-ward',       'Taylor Ward',        'OF', 'LAA', { R: 65, H: 130, HR: 24, RBI: 78, SB: 4, AVG: 0.252 }, 4), // ws · SOLID
  mk(11, 2, 'willson-contreras', 'Willson Contreras',  'C',  'STL', { R: 62, H: 120, HR: 18, RBI: 60, SB: 0, AVG: 0.262 }, -2), // ch · SOLID
  mk(11, 3, 'victor-robles',     'Víctor Robles',      'OF', 'SEA', { R: 58, H: 110, HR: 6, RBI: 35, SB: 32, AVG: 0.252 }, 8), // fb · HIT
  mk(11, 4, 'max-fried',         'Max Fried',          'SP', 'NYY', { W: 13, K: 150, ERA: 2.95, SV: 0, HLD: 0 }, 10), // mv · HIT
  mk(11, 5, 'ryan-pressly',      'Ryan Pressly',       'RP', 'CHC', { W: 4, SV: 8, K: 65, HLD: 18, ERA: 3.18 }, 2), // ct · SOLID
  mk(11, 6, 'spencer-arrighetti','Spencer Arrighetti', 'SP', 'HOU', { W: 8, K: 165, ERA: 3.65, SV: 0, HLD: 0 }, 0), // ie · SOLID
  mk(11, 7, 'lane-thomas',       'Lane Thomas',        'OF', 'CLE', { R: 60, H: 125, HR: 18, RBI: 65, SB: 14, AVG: 0.248 }, -2), // qs · SOLID
  mk(11, 8, 'kodai-senga',       'Kodai Senga',        'SP', 'NYM', { W: 9, K: 158, ERA: 3.35, SV: 0, HLD: 0 }, 6), // wd · HIT
  mk(11, 9, 'ozzie-albies',      'Ozzie Albies',       '2B', 'ATL', { R: 65, H: 135, HR: 14, RBI: 60, SB: 8, AVG: 0.258 }, -4), // dd · SOLID
  mk(11, 10,'shane-baz',         'Shane Baz',          'SP', 'TB',  { W: 9, K: 165, ERA: 3.42, SV: 0, HLD: 0 }, 4), // bt · SOLID

  /* ─── Round 12 — bt dd wd qs ie ct mv fb ch ws ─────────────── */
  mk(12, 1, 'kyle-finnegan',     'Kyle Finnegan',      'RP', 'WAS', { W: 3, SV: 22, K: 62, HLD: 0, ERA: 3.05 }, 8), // bt · HIT
  mk(12, 2, 'colt-emerson',      'Colt Emerson',       'SS', 'SEA', { R: 55, H: 115, HR: 12, RBI: 50, SB: 14, AVG: 0.255 }, 0), // dd · SOLID
  mk(12, 3, 'gerrit-cole',       'Gerrit Cole',        'SP', 'NYY', { W: 6, K: 95, ERA: 4.15, SV: 0, HLD: 0 }, -22), // wd · BUST
  mk(12, 4, 'bo-bichette',       'Bo Bichette',        'SS', 'TOR', { R: 88, H: 175, HR: 18, RBI: 80, SB: 10, AVG: 0.295 }, 18), // qs · HIT
  mk(12, 5, 'kerry-carpenter',   'Kerry Carpenter',    'OF', 'DET', { R: 62, H: 132, HR: 24, RBI: 78, SB: 0, AVG: 0.282 }, 14), // ie · HIT
  mk(12, 6, 'griffin-jax',       'Griffin Jax',        'RP', 'MIN', { W: 6, SV: 4, K: 92, HLD: 30, ERA: 2.05 }, 22), // ct · STEAL
  mk(12, 7, 'jordan-romano',     'Jordan Romano',      'RP', 'PHI', { W: 2, SV: 18, K: 55, HLD: 0, ERA: 3.18 }, -2), // mv · SOLID
  mk(12, 8, 'andrew-abbott',     'Andrew Abbott',      'SP', 'CIN', { W: 11, K: 152, ERA: 3.15, SV: 0, HLD: 0 }, 16), // fb · HIT
  mk(12, 9, 'kris-bubic',        'Kris Bubic',         'SP', 'KC',  { W: 10, K: 168, ERA: 2.78, SV: 0, HLD: 0 }, 18), // ch · HIT
  mk(12, 10,'evan-carter',       'Evan Carter',        'OF', 'TEX', { R: 42, H: 78, HR: 8, RBI: 32, SB: 8, AVG: 0.218 }, -28), // ws · BUST

  /* ─── Round 13 — ws ch fb mv ct ie qs wd dd bt ─────────────── */
  mk(13, 1, 'colton-cowser',     'Colton Cowser',      'OF', 'BAL', { R: 65, H: 125, HR: 20, RBI: 65, SB: 12, AVG: 0.245 }, 6), // ws · HIT
  mk(13, 2, 'taj-bradley',       'Taj Bradley',        'SP', 'TB',  { W: 7, K: 145, ERA: 3.75, SV: 0, HLD: 0 }, -2), // ch · SOLID
  mk(13, 3, 'cj-abrams',         'CJ Abrams',          'SS', 'WAS', { R: 78, H: 145, HR: 18, RBI: 65, SB: 30, AVG: 0.262 }, 16), // fb · HIT
  mk(13, 4, 'nathan-eovaldi',    'Nathan Eovaldi',     'SP', 'TEX', { W: 10, K: 152, ERA: 3.15, SV: 0, HLD: 0 }, 8), // mv · HIT
  mk(13, 5, 'kyle-bradish',      'Kyle Bradish',       'SP', 'BAL', { W: 8, K: 138, ERA: 3.42, SV: 0, HLD: 0 }, 4), // ct · SOLID
  mk(13, 6, 'jose-soriano',      'José Soriano',       'SP', 'LAA', { W: 9, K: 142, ERA: 3.65, SV: 0, HLD: 0 }, 0), // ie · SOLID
  mk(13, 7, 'jose-quintana',     'José Quintana',      'SP', 'MIL', { W: 9, K: 110, ERA: 3.42, SV: 0, HLD: 0 }, 0), // qs · SOLID
  mk(13, 8, 'bryan-woo',         'Bryan Woo',          'SP', 'SEA', { W: 11, K: 165, ERA: 2.85, SV: 0, HLD: 0 }, 18), // wd · HIT
  mk(13, 9, 'jake-mccarthy',     'Jake McCarthy',      'OF', 'ARI', { R: 58, H: 125, HR: 8, RBI: 42, SB: 28, AVG: 0.272 }, 8), // dd · HIT
  mk(13, 10,'dennis-santana',    'Dennis Santana',     'RP', 'PIT', { W: 6, SV: 4, K: 78, HLD: 32, ERA: 1.85 }, 20), // bt · STEAL

  /* ─── Round 14 — bt dd wd qs ie ct mv fb ch ws ─────────────── */
  mk(14, 1, 'orion-kerkering',   'Orion Kerkering',    'RP', 'PHI', { W: 4, SV: 2, K: 82, HLD: 28, ERA: 2.45 }, 14), // bt · HIT
  mk(14, 2, 'wilyer-abreu',      'Wilyer Abreu',       'OF', 'BOS', { R: 65, H: 130, HR: 22, RBI: 72, SB: 8, AVG: 0.275 }, 8), // dd · HIT
  mk(14, 3, 'tomoyuki-sugano',   'Tomoyuki Sugano',    'SP', 'BAL', { W: 12, K: 132, ERA: 3.25, SV: 0, HLD: 0 }, 6), // wd · HIT
  mk(14, 4, 'colson-montgomery', 'Colson Montgomery',  'SS', 'CWS', { R: 50, H: 105, HR: 14, RBI: 50, SB: 8, AVG: 0.232 }, -4), // qs · SOLID
  mk(14, 5, 'mitch-keller',      'Mitch Keller',       'SP', 'PIT', { W: 8, K: 138, ERA: 3.78, SV: 0, HLD: 0 }, -2), // ie · SOLID
  mk(14, 6, 'mike-trout',        'Mike Trout',         'OF', 'LAA', { R: 38, H: 65, HR: 12, RBI: 32, SB: 4, AVG: 0.232 }, -22), // ct · BUST
  mk(14, 7, 'parker-meadows',    'Parker Meadows',     'OF', 'DET', { R: 52, H: 110, HR: 14, RBI: 52, SB: 18, AVG: 0.248 }, 2), // mv · SOLID
  mk(14, 8, 'maikel-garcia',     'Maikel García',      '3B', 'KC',  { R: 65, H: 145, HR: 8, RBI: 55, SB: 28, AVG: 0.265 }, 8), // fb · HIT
  mk(14, 9, 'gavin-sheets',      'Gavin Sheets',       '1B', 'SD',  { R: 55, H: 125, HR: 22, RBI: 78, SB: 0, AVG: 0.258 }, 10), // ch · HIT
  mk(14, 10,'spencer-schwellenbach','Spencer Schwellenbach','SP','ATL',{ W: 11, K: 160, ERA: 2.92, SV: 0, HLD: 0 }, 22), // ws · STEAL

  /* ─── Round 15 — ws ch fb mv ct ie qs wd dd bt ─────────────── */
  mk(15, 1, 'paul-goldschmidt',  'Paul Goldschmidt',   '1B', 'NYY', { R: 68, H: 142, HR: 16, RBI: 70, SB: 4, AVG: 0.270 }, 0), // ws · SOLID
  mk(15, 2, 'thairo-estrada',    'Thairo Estrada',     '2B', 'COL', { R: 55, H: 115, HR: 10, RBI: 48, SB: 16, AVG: 0.252 }, -2), // ch · SOLID
  mk(15, 3, 'cam-smith',         'Cam Smith',          'OF', 'HOU', { R: 78, H: 138, HR: 18, RBI: 65, SB: 18, AVG: 0.282 }, 28), // fb · STEAL
  mk(15, 4, 'matthew-liberatore','Matthew Liberatore', 'SP', 'STL', { W: 9, K: 140, ERA: 3.55, SV: 0, HLD: 0 }, 8), // mv · HIT
  mk(15, 5, 'tyler-mahle',       'Tyler Mahle',        'SP', 'TEX', { W: 8, K: 105, ERA: 3.92, SV: 0, HLD: 0 }, -4), // ct · SOLID
  mk(15, 6, 'matt-strahm',       'Matt Strahm',        'RP', 'PHI', { W: 5, SV: 0, K: 72, HLD: 26, ERA: 2.65 }, 10), // ie · HIT
  mk(15, 7, 'christopher-morel', 'Christopher Morel',  '3B', 'TB',  { R: 58, H: 105, HR: 18, RBI: 55, SB: 8, AVG: 0.215 }, -10), // qs · MISS
  mk(15, 8, 'jeff-mcneil',       'Jeff McNeil',        '2B', 'NYM', { R: 50, H: 125, HR: 8, RBI: 48, SB: 4, AVG: 0.275 }, 0), // wd · SOLID
  mk(15, 9, 'taylor-trammell',   'Taylor Trammell',    'OF', 'LAD', { R: 42, H: 85, HR: 10, RBI: 38, SB: 18, AVG: 0.232 }, -4), // dd · SOLID
  mk(15, 10,'jake-irvin',        'Jake Irvin',         'SP', 'WAS', { W: 10, K: 145, ERA: 3.45, SV: 0, HLD: 0 }, 8), // bt · HIT

  /* ─── Round 16 — bt dd wd qs ie ct mv fb ch ws ─────────────── */
  mk(16, 1, 'jake-bird',         'Jake Bird',          'RP', 'COL', { W: 4, SV: 0, K: 78, HLD: 28, ERA: 3.15 }, 8), // bt · HIT
  mk(16, 2, 'pete-crow-armstrong','Pete Crow-Armstrong','OF','CHC', { R: 75, H: 135, HR: 26, RBI: 78, SB: 32, AVG: 0.258 }, 28), // dd · STEAL
  mk(16, 3, 'lucas-erceg',       'Lucas Erceg',        'RP', 'KC',  { W: 4, SV: 6, K: 75, HLD: 22, ERA: 2.40 }, 14), // wd · HIT
  mk(16, 4, 'roman-anthony',     'Roman Anthony',      'OF', 'BOS', { R: 72, H: 135, HR: 22, RBI: 78, SB: 12, AVG: 0.295 }, 65), // qs · JACKPOT (steal of draft)
  mk(16, 5, 'griffin-canning',   'Griffin Canning',    'SP', 'NYM', { W: 9, K: 142, ERA: 3.62, SV: 0, HLD: 0 }, 6), // ie · HIT
  mk(16, 6, 'jonathan-india',    'Jonathan India',     '2B', 'KC',  { R: 65, H: 132, HR: 12, RBI: 52, SB: 12, AVG: 0.255 }, 2), // ct · SOLID
  mk(16, 7, 'patrick-bailey',    'Patrick Bailey',     'C',  'SF',  { R: 42, H: 85, HR: 8, RBI: 42, SB: 0, AVG: 0.225 }, -8), // mv · MISS
  mk(16, 8, 'brandon-lowe',      'Brandon Lowe',       '2B', 'TB',  { R: 60, H: 110, HR: 22, RBI: 65, SB: 6, AVG: 0.245 }, 4), // fb · SOLID
  mk(16, 9, 'andrew-vaughn',     'Andrew Vaughn',      '1B', 'MIL', { R: 55, H: 125, HR: 18, RBI: 65, SB: 0, AVG: 0.255 }, 0), // ch · SOLID
  mk(16, 10,'tobias-myers',      'Tobias Myers',       'SP', 'MIL', { W: 8, K: 130, ERA: 3.82, SV: 0, HLD: 0 }, -2), // ws · SOLID

  /* ─── Round 17 — ws ch fb mv ct ie qs wd dd bt ─────────────── */
  mk(17, 1, 'ryan-mcmahon',      'Ryan McMahon',       '3B', 'NYY', { R: 60, H: 120, HR: 18, RBI: 65, SB: 4, AVG: 0.232 }, -2), // ws · SOLID
  mk(17, 2, 'jorge-soler',       'Jorge Soler',        'DH', 'LAA', { R: 55, H: 110, HR: 22, RBI: 72, SB: 0, AVG: 0.245 }, 0), // ch · SOLID
  mk(17, 3, 'jose-tena',         'José Tena',          '3B', 'WAS', { R: 48, H: 110, HR: 12, RBI: 50, SB: 18, AVG: 0.258 }, 6), // fb · HIT
  mk(17, 4, 'agustin-ramirez',   'Agustín Ramírez',    'C',  'MIA', { R: 50, H: 105, HR: 18, RBI: 62, SB: 4, AVG: 0.248 }, 4), // mv · SOLID
  mk(17, 5, 'jose-leclerc',      'José Leclerc',       'RP', 'ATH', { W: 3, SV: 14, K: 58, HLD: 8, ERA: 3.65 }, -4), // ct · SOLID
  mk(17, 6, 'reese-olson',       'Reese Olson',        'SP', 'DET', { W: 7, K: 135, ERA: 3.18, SV: 0, HLD: 0 }, 8), // ie · HIT
  mk(17, 7, 'gavin-stone',       'Gavin Stone',        'SP', 'LAD', { W: 0, K: 0, ERA: 0, SV: 0, HLD: 0 }, -30), // qs · BUST (season-ending injury)
  mk(17, 8, 'eduardo-rodriguez', 'Eduardo Rodriguez',  'SP', 'ARI', { W: 7, K: 122, ERA: 4.15, SV: 0, HLD: 0 }, -8), // wd · MISS
  mk(17, 9, 'kenta-maeda',       'Kenta Maeda',        'SP', 'DET', { W: 6, K: 115, ERA: 4.05, SV: 0, HLD: 0 }, -4), // dd · SOLID
  mk(17, 10,'aroldis-chapman',   'Aroldis Chapman',    'RP', 'BOS', { W: 4, SV: 28, K: 88, HLD: 0, ERA: 1.95 }, 38), // bt · STEAL

  /* ─── Round 18 — bt dd wd qs ie ct mv fb ch ws ─────────────── */
  mk(18, 1, 'bryan-baker',       'Bryan Baker',        'RP', 'TB',  { W: 4, SV: 0, K: 72, HLD: 22, ERA: 2.85 }, 8), // bt · HIT
  mk(18, 2, 'gabriel-arias',     'Gabriel Arias',      'SS', 'CLE', { R: 42, H: 88, HR: 8, RBI: 35, SB: 14, AVG: 0.215 }, -4), // dd · SOLID
  mk(18, 3, 'davis-schneider',   'Davis Schneider',    '2B', 'TOR', { R: 48, H: 102, HR: 14, RBI: 48, SB: 4, AVG: 0.232 }, 0), // wd · SOLID
  mk(18, 4, 'tylor-megill',      'Tylor Megill',       'SP', 'NYM', { W: 7, K: 128, ERA: 3.85, SV: 0, HLD: 0 }, -2), // qs · SOLID
  mk(18, 5, 'jose-suarez',       'José Suárez',        'SP', 'LAA', { W: 5, K: 95, ERA: 4.35, SV: 0, HLD: 0 }, -10), // ie · MISS
  mk(18, 6, 'liam-hicks',        'Liam Hicks',         'C',  'MIA', { R: 38, H: 88, HR: 8, RBI: 40, SB: 2, AVG: 0.255 }, 0), // ct · SOLID
  mk(18, 7, 'jacob-misiorowski', 'Jacob Misiorowski',  'SP', 'MIL', { W: 8, K: 152, ERA: 3.42, SV: 0, HLD: 0 }, 14), // mv · HIT
  mk(18, 8, 'jose-iglesias',     'José Iglesias',      '2B', 'SD',  { R: 38, H: 105, HR: 4, RBI: 38, SB: 6, AVG: 0.275 }, 0), // fb · SOLID
  mk(18, 9, 'junior-caminero',   'Junior Caminero',    '3B', 'TB',  { R: 65, H: 142, HR: 28, RBI: 85, SB: 4, AVG: 0.265 }, 22), // ch · STEAL
  mk(18, 10,'cade-cavalli',      'Cade Cavalli',       'SP', 'WAS', { W: 6, K: 105, ERA: 4.05, SV: 0, HLD: 0 }, -6), // ws · MISS
]

// Self-check: 180 picks, each pick number unique 1..180.
;(function verifyDraft() {
  if (draftPicks2026.length !== 180) {
    throw new Error(`categoriesLeague draftPicks2026: expected 180 picks, got ${draftPicks2026.length}`)
  }
  const seen = new Set<number>()
  for (const p of draftPicks2026) {
    if (seen.has(p.pickOverall)) {
      throw new Error(`categoriesLeague draftPicks2026: duplicate pickOverall ${p.pickOverall}`)
    }
    seen.add(p.pickOverall)
  }
  for (let i = 1; i <= 180; i++) {
    if (!seen.has(i)) {
      throw new Error(`categoriesLeague draftPicks2026: missing pickOverall ${i}`)
    }
  }
})()

export function getDraftPick(pickOverall: number): CategoryDraftPick {
  const p = draftPicks2026.find((x) => x.pickOverall === pickOverall)
  if (!p) throw new Error(`No draft pick with overall ${pickOverall}`)
  return p
}

/* ─────────────────────────────────────────────────────────────────
   PLAYER NOTES — short editorial prose for ~20 featured players.
   Keyed by playerId. Falls back to a generic line in the modal.
───────────────────────────────────────────────────────────────── */

export const playerNotes: Record<string, string> = {
  'roman-anthony':
    "Came up in mid-May, hit .295 with 22 HR in his first 90 games, and never went back down. The 153rd pick of the draft is now hitting cleanup on a contender. Quality Start has the steal of the year.",
  'yordan-alvarez':
    "Drafted as a top-12 player after a 40-HR 2024. Played 60 games in 2025. A wrist that wouldn't heal turned a cornerstone into a sunk cost. Doubles Down has been a player short all year.",
  'paul-skenes':
    "An R1 ace at 22 years old. 13 wins on a bad team and a 1.96 ERA. The Whiff Department took him at pick 8 and got the best K/9 in the league.",
  'bobby-witt-jr':
    "Reliable five-tool production. The Walk-Off Society used pick 1 on the safest non-Judge bet on the board.",
  'aaron-judge':
    "Fifty-one home runs at 33 years old. A .312 average. Cleanup Hitters got the best version of Judge with the second pick.",
  'shohei-ohtani':
    "Forty-nine home runs, 28 steals, .305. Did not pitch in 2025. Free Bases took the most expensive batting line in baseball at pick 3 and still got value.",
  'mookie-betts':
    "Drafted as a top-10 player. Lost weeks to plantar fasciitis. The .265 line is the worst since his rookie year and Doubles Down can't replace what he was supposed to be.",
  'tarik-skubal':
    "Back-to-back Cy Youngs. 17 wins, a 2.48 ERA, 218 strikeouts. Innings Eaters' pick 6 became the ace of every roster he was on this year.",
  'garrett-crochet':
    "Bullpen Theology took him at pick 10. Now sits as a top-five starter. 14 wins and 224 Ks on Boston paid for the entire draft strategy.",
  'emmanuel-clase':
    "Forty-six saves, 1.04 ERA. Bullpen Theology took the best closer in baseball in round 2 and built around him. The pick that defined the draft.",
  'mason-miller':
    "Twenty-eight saves at 102 mph. Innings Eaters picked him in round 3 ahead of the closer run. A top-5 reliever taken at RP10 ADP.",
  'cam-smith':
    "A rookie OF Houston brought up in late April. Hit .282 with 18 HR and 18 SB. Free Bases got a five-cat contributor in round 15.",
  'gerrit-cole':
    "Elbow trouble all spring, ineffective when he pitched, shut down in July. The Whiff Department's round-12 ace returned six wins and a 4.15 ERA. A real bust at SP price.",
  'mike-trout':
    "Played 60 games. The legend whose price had finally come down to round 14 still didn't survive the year. Closer's Therapy lost a roster spot.",
  'royce-lewis':
    "Twelve home runs in 70 games. The hamstring did it again. Doubles Down had no answer in the corner.",
  'cal-raleigh':
    "The catcher who hit 38 home runs. The Walk-Off Society in round 8 got the biggest catcher value in the league.",
  'dylan-cease':
    "Two-fifteen punchouts, ERA in the high threes but the strikeout rate is elite. The Whiff Department drafted for what they were going to do anyway.",
  'pete-crow-armstrong':
    "Twenty-six home runs, 32 stolen bases, plus glove. Doubles Down got the breakout center fielder of the year at pick 152.",
  'junior-caminero':
    "The third baseman drafted in the final round. 28 home runs, .265. Cleanup Hitters got a 22-value steal closing out the draft.",
  'aroldis-chapman':
    "Old man still throwing 102. Twenty-eight saves and a 1.95 ERA in his closer role. Bullpen Theology found him in round 17.",
  'spencer-schwellenbach':
    "Eleven wins and a 2.92 ERA in his second year. The Walk-Off Society got a top-30 SP at pick 140.",
  'felix-bautista':
    "Healthy again. Thirty-two saves and a 2.18 ERA. Bullpen Theology took him in round 9 as RP3.",
  'griffin-jax':
    "Six wins, 30 holds, a 2.05 ERA. The best setup man in the league. Closer's Therapy got him in round 12.",
  'dennis-santana':
    "Thirty-two holds and a 1.85 ERA on Pittsburgh. Bullpen Theology kept reaching for relievers and kept being right.",
  'elly-de-la-cruz':
    "Forty-two steals but the average dropped to .252 and the contact rate followed. Closer's Therapy paid for the upside and got the volatility.",
}

/* ─────────────────────────────────────────────────────────────────
   DRAFT AWARDS — the three hero items at the top of the page
───────────────────────────────────────────────────────────────── */

export interface CategoryDraftAwards {
  bestDraft: {
    teamId: string
    grade: string
    headline: string
    body: string
    stats: { steals: number; hits: number; busts: number; earlyHitRate: string }
  }
  steal: {
    playerId: string
    valueScore: number
    body: string
  }
  bust: {
    playerId: string
    valueScore: number
    body: string
  }
}

export const categoryDraftAwards: CategoryDraftAwards = {
  bestDraft: {
    teamId: 'bt',
    grade: 'A+',
    headline: 'Bullpen Theology drafted pitchers like nobody else would.',
    body: "Crochet at pick 10. Clase at 11. Hader and Diaz back-to-back later. Felix Bautista in round 9. Chapman in round 17. They came out of the draft owning four pitching categories before opening day. The bullpen-pure build that nobody copied is now the best draft in the league.",
    stats: { steals: 7, hits: 6, busts: 0, earlyHitRate: '83%' },
  },
  steal: {
    playerId: 'roman-anthony',
    valueScore: 65,
    body: "Boston's rookie OF came up in mid-May and never went back down. Hit .295 with 22 home runs in 90 games. Drafted 153rd by Quality Start. Now the highest-percentile late-round pick in the league.",
  },
  bust: {
    playerId: 'yordan-alvarez',
    valueScore: -55,
    body: "A top-12 ADP. Sixty games played. Wrist surgery in July. Doubles Down took the safest power bat on the board in round 2 and got nothing back. A disaster grade at a star price.",
  },
}

/* ─────────────────────────────────────────────────────────────────
   TEAM DRAFT GRADES — ranked by draft quality (not current PR rank)
───────────────────────────────────────────────────────────────── */

export interface CategoryTeamDraftGrade {
  teamId: string
  rank: number       // 1-10 in draft grade order
  grade: string      // letter
  headline: string   // 4-8 word sentence
  narrative: string  // 2-4 sentence prose
  stats: { steals: number; hits: number; misses: number; busts: number }
}

export const categoryTeamDraftGrades: CategoryTeamDraftGrade[] = [
  {
    teamId: 'bt', rank: 1, grade: 'A+',
    headline: 'Drafted pitchers like nobody else would.',
    narrative: "Bullpen Theology came out of the draft owning four pitching categories. Crochet, Clase, Hader, Diaz, and Bautista in the first nine rounds. Chapman in round 17 as the cherry. Zero busts. The bullpen-pure build that nobody else attempted is now the best draft in the league.",
    stats: { steals: 7, hits: 6, busts: 0, misses: 1 },
  },
  {
    teamId: 'wd', rank: 2, grade: 'A-',
    headline: 'Loaded up on Ks and got Ks.',
    narrative: "The Whiff Department drafted for one thing and got one thing. Skenes, Cease, Bryan Woo, and Crochet-level strikeout rates. The AVG hole was a known cost. They lead the league in K and they paid for it on the BA line.",
    stats: { steals: 4, hits: 5, busts: 1, misses: 3 },
  },
  {
    teamId: 'mv', rank: 3, grade: 'B+',
    headline: 'Quietly assembled the most balanced draft.',
    narrative: "Mound Visitors didn't take the loudest names. They took Soto, Devers, Imanaga, Fried, and Sasaki across the first 11 rounds. Quiet steady production in every category and no holes. The analytics build worked.",
    stats: { steals: 2, hits: 8, busts: 0, misses: 3 },
  },
  {
    teamId: 'qs', rank: 4, grade: 'B+',
    headline: 'Roman Anthony in round 16 fixed everything.',
    narrative: "Quality Start was on track for a B-minus. Then they took Roman Anthony at pick 153 and the rookie hit .295 with 22 home runs in 90 games. The single biggest value pick in the league erased every miss before it. Bo Bichette in round 12 helped too.",
    stats: { steals: 4, hits: 6, busts: 0, misses: 4 },
  },
  {
    teamId: 'ie', rank: 5, grade: 'B',
    headline: 'Skubal at pick 6 set the ceiling.',
    narrative: "Innings Eaters took the AL Cy Young winner at pick 6 and then bet on rotation depth. Yamamoto, Sánchez, Hunter Greene, Pablo López. The 'workhorse SP' identity is real and the rotation is winning weeks by itself.",
    stats: { steals: 2, hits: 7, busts: 0, misses: 4 },
  },
  {
    teamId: 'ch', rank: 6, grade: 'B-',
    headline: 'All the power. None of the pitching.',
    narrative: "Cleanup Hitters drafted Judge at pick 2 and didn't stop. Alonso, Schwarber, Santander, Machado, Caminero in round 18. The HR and RBI cats are locked. They didn't draft a single closer or workhorse SP and the standings show it.",
    stats: { steals: 2, hits: 6, busts: 0, misses: 4 },
  },
  {
    teamId: 'dd', rank: 7, grade: 'C+',
    headline: 'Pete Crow-Armstrong saved a wasted top of the draft.',
    narrative: "Doubles Down took Mookie Betts in round 1 (down year) and Yordan Alvarez in round 2 (DISASTER, injured). The R16 pick of PCA hit .258 with 26 HR and 32 SB and bailed out the entire roster. Bryan Reynolds and Will Smith added depth.",
    stats: { steals: 2, hits: 5, busts: 2, misses: 4 },
  },
  {
    teamId: 'fb', rank: 8, grade: 'C',
    headline: 'Steals everywhere. No power anywhere.',
    narrative: "Free Bases took Ohtani at pick 3 and then ran speed for 17 more rounds. Trea Turner, Caballero, Esteury Ruiz, CJ Abrams, Cam Smith. They lead the league in SB by 30. The HR and RBI cats were never going to compete.",
    stats: { steals: 2, hits: 7, busts: 0, misses: 4 },
  },
  {
    teamId: 'ct', rank: 9, grade: 'C-',
    headline: 'Defending champ. Drafted like one.',
    narrative: "Closer's Therapy went Elly De La Cruz in round 1 (.252) and Mike Trout in round 14 (60 games). The bullpen depth is still elite but the offense couldn't carry it. Two-time champ aging out of the upside picks.",
    stats: { steals: 2, hits: 4, busts: 2, misses: 6 },
  },
  {
    teamId: 'ws', rank: 10, grade: 'D+',
    headline: 'Auto-drafted half of it. It shows.',
    narrative: "The Walk-Off Society had the #1 overall pick and took Bobby Witt Jr. That worked. Then Bryce Harper in round 2 didn't quite pop. Evan Carter in round 12 (DISASTER). Spencer Strider injured early. The bottom of the draft is filled with names the system picked for them.",
    stats: { steals: 2, hits: 4, busts: 2, misses: 6 },
  },
]

/* ─────────────────────────────────────────────────────────────────
   PUNT REPORTS — three editorial beats about category-strategy outcomes
───────────────────────────────────────────────────────────────── */

export interface PuntReport {
  kind: 'success' | 'failure' | 'balanced'
  teamId: string
  category: string         // the punted cat, or 'NONE' for balanced
  headline: string
  body: string
  thisSeasonRank: number   // team's current rank in the punted cat
}

export const puntReports: PuntReport[] = [
  {
    kind: 'success', teamId: 'ct', category: 'SB',
    headline: "Closer's Therapy punted SBs and still owned the bullpen.",
    body: "Drafted zero base-stealers. Currently last in SB and they don't care. The roster spots they didn't waste on speed-only OFs went to the bullpen depth that's keeping them in playoff contention. A clean punt that paid for itself.",
    thisSeasonRank: 10,
  },
  {
    kind: 'failure', teamId: 'ws', category: 'W',
    headline: 'Walk-Off Society punted SPs. They lost everything pitching.',
    body: "Drafted one starter in the first eight rounds. Spencer Strider got hurt in week 2. Now they're dead last in W and bottom-three in K and ERA. A punt that turned into a four-cat hole. The dark horse never started.",
    thisSeasonRank: 9,
  },
  {
    kind: 'balanced', teamId: 'mv', category: 'NONE',
    headline: "Mound Visitors didn't punt anything. They didn't have to.",
    body: "Took Soto in round 1 and balanced position scarcity for 17 more rounds. Top-three in AVG, ERA, K, and RBI. Bottom-three in nothing. The most boring draft in the league is also the most efficient one.",
    thisSeasonRank: 1,
  },
]

/* ─────────────────────────────────────────────────────────────────
   CATEGORY KING BEATS — three editorial player storylines
───────────────────────────────────────────────────────────────── */

export interface CategoryKingBeat {
  kind: 'five-tool' | 'late-round-gem' | 'broken-cat'
  eyebrow: string
  headline: string
  body: string
  playerId: string
  cats?: string[]            // five-tool: cats they delivered in
  round?: number             // late-round-gem
  draftRoundPick?: string    // late-round-gem
  brokenCat?: string         // broken-cat
  brokenTeamId?: string      // broken-cat
}

export const categoryKingBeats: CategoryKingBeat[] = [
  {
    kind: 'five-tool',
    eyebrow: 'FIVE-TOOL ELITE',
    headline: 'Bobby Witt Jr. delivered five categories.',
    body: "One hundred and twenty-two runs. Thirty-one stolen bases. Thirty home runs. Ninety-five RBI. Two ninety-five AVG. The Walk-Off Society took him with pick #1 and got the only player in 2025 to finish top-twenty in five offensive categories.",
    playerId: 'bobby-witt-jr',
    cats: ['R', 'HR', 'RBI', 'SB', 'AVG'],
  },
  {
    kind: 'late-round-gem',
    eyebrow: 'LATE-ROUND GEM',
    headline: 'Roman Anthony at pick 153 hit .295 with 22 home runs.',
    body: "A rookie OF Boston called up in mid-May. Quality Start used the 153rd pick of the draft on him. Ninety games in, he's a top-twenty OF and the highest-value pick of the year. The pick that turned a B-minus draft into a B-plus.",
    playerId: 'roman-anthony',
    round: 16,
    draftRoundPick: 'R16 PICK #153',
  },
  {
    kind: 'broken-cat',
    eyebrow: 'BROKEN CAT',
    headline: 'Yordan Alvarez took an entire category off the board.',
    body: "Doubles Down used pick 12 on the safest power bat in baseball. Sixty games and a wrist surgery later, they're seventh in RBI and there's no roster move that fixes it. The cost of one first-round bust in a category league.",
    playerId: 'yordan-alvarez',
    brokenCat: 'RBI',
    brokenTeamId: 'dd',
  },
]

/* ─────────────────────────────────────────────────────────────────
   DRAFT QUICK READS — the footer pill grid
───────────────────────────────────────────────────────────────── */

export const draftQuickReads = {
  highestValuePick:     { playerId: 'roman-anthony',  label: 'Roman Anthony, R16. +65 value.' },
  biggestBust:          { playerId: 'yordan-alvarez', label: 'Yordan Alvarez, R2. -55 value.' },
  bestLateRound:        { playerId: 'cam-smith',      label: 'Cam Smith, R15. +28 value.' },
  mostCategoriesDelivered: { playerId: 'bobby-witt-jr', label: 'Bobby Witt Jr. Top-20 in five categories.' },
} as const

/* ─────────────────────────────────────────────────────────────────
   HISTORY — five completed seasons (2021..2025) + 2026 in progress.
   Champion sequence:  2025 ct, 2024 ct, 2023 bt, 2022 ch, 2021 fb.
   All ten current teams have played five full seasons.
   Used by CategoryDemoHistoryView and its modals.
───────────────────────────────────────────────────────────────── */

export interface CategorySeasonHistory {
  year: number
  championTeamId: string
  championRecord: string
  runnerUpTeamId: string
  runnerUpRecord: string
  basementTeamId: string
  basementRecord: string
  scoreboardHeadline: string
  era: string
  totalCatsContested: number
}

// Authored oldest-first. Sort newest-first at render time.
export const seasonHistory: CategorySeasonHistory[] = [
  {
    year: 2021,
    championTeamId: 'fb', championRecord: '142-83-6',
    runnerUpTeamId:  'qs', runnerUpRecord:  '136-89-6',
    basementTeamId:  'ws', basementRecord:  '79-146-6',
    scoreboardHeadline: "Free Bases clinched the title 7-4 in cats over Quality Start.",
    era: 'THE FOUNDING',
    totalCatsContested: 2310,
  },
  {
    year: 2022,
    championTeamId: 'ch', championRecord: '148-77-6',
    runnerUpTeamId:  'bt', runnerUpRecord:  '141-84-6',
    basementTeamId:  'ws', basementRecord:  '76-149-6',
    scoreboardHeadline: "Cleanup Hitters edged Bullpen Theology 6-5 in cats. Closest final on record.",
    era: 'THE POWER ERA',
    totalCatsContested: 2310,
  },
  {
    year: 2023,
    championTeamId: 'bt', championRecord: '154-71-6',
    runnerUpTeamId:  'ct', runnerUpRecord:  '146-79-6',
    basementTeamId:  'ws', basementRecord:  '72-153-6',
    scoreboardHeadline: "Bullpen Theology took their first title 8-3 over Closer's Therapy.",
    era: 'THE BULLPEN AWAKENS',
    totalCatsContested: 2310,
  },
  {
    year: 2024,
    championTeamId: 'ct', championRecord: '159-66-6',
    runnerUpTeamId:  'ch', runnerUpRecord:  '139-86-6',
    basementTeamId:  'ws', basementRecord:  '69-156-6',
    scoreboardHeadline: "Closer's Therapy swept Cleanup Hitters 9-2. The dynasty begins.",
    era: 'THE DYNASTY BEGINS',
    totalCatsContested: 2310,
  },
  {
    year: 2025,
    championTeamId: 'ct', championRecord: '156-69-6',
    runnerUpTeamId:  'bt', runnerUpRecord:  '149-76-6',
    basementTeamId:  'ws', basementRecord:  '74-151-6',
    scoreboardHeadline: "Closer's Therapy held off Bullpen Theology 8-3. Back-to-back rings.",
    era: 'THE DYNASTY YEARS',
    totalCatsContested: 2310,
  },
]

/* Career stats — five completed seasons each. Numbers are tuned so the
   narrative reads: ct best legacy, fb founding champ but pitching weak,
   ch power era + 1 title, bt first title + pitching dominance,
   wd K kings & AVG cellar, qs steady never-wins, mv your team (middling),
   dd rising, ie middling pitching, ws basement. */
export interface CategoryCareerStats {
  teamId: string
  seasonsPlayed: number
  titles: number
  playoffApps: number
  totalCatWins: number
  totalCatLosses: number
  totalCatTies: number
  careerWinPct: number
  hitCatsWon: number
  pitchCatsWon: number
  catDifferential: number
  bestCat: string
  bestCatWinCount: number
  worstCat: string
  worstCatLossCount: number
  legacyScore: number
}

export const teamCareerStats: Record<string, CategoryCareerStats> = {
  ct: { teamId: 'ct', seasonsPlayed: 5, titles: 2, playoffApps: 5,
        totalCatWins: 762, totalCatLosses: 358, totalCatTies: 35,
        careerWinPct: 0.660,
        hitCatsWon: 330, pitchCatsWon: 432,
        catDifferential: 404,
        bestCat: 'SV', bestCatWinCount: 105,
        worstCat: 'SB', worstCatLossCount: 84,
        legacyScore: 1545 },
  bt: { teamId: 'bt', seasonsPlayed: 5, titles: 1, playoffApps: 5,
        totalCatWins: 731, totalCatLosses: 388, totalCatTies: 36,
        careerWinPct: 0.633,
        hitCatsWon: 295, pitchCatsWon: 436,
        catDifferential: 343,
        bestCat: 'ERA', bestCatWinCount: 92,
        worstCat: 'SB', worstCatLossCount: 88,
        legacyScore: 1320 },
  ch: { teamId: 'ch', seasonsPlayed: 5, titles: 1, playoffApps: 4,
        totalCatWins: 668, totalCatLosses: 450, totalCatTies: 37,
        careerWinPct: 0.579,
        hitCatsWon: 426, pitchCatsWon: 242,
        catDifferential: 218,
        bestCat: 'HR', bestCatWinCount: 96,
        worstCat: 'SV', worstCatLossCount: 102,
        legacyScore: 1115 },
  fb: { teamId: 'fb', seasonsPlayed: 5, titles: 1, playoffApps: 4,
        totalCatWins: 631, totalCatLosses: 487, totalCatTies: 37,
        careerWinPct: 0.547,
        hitCatsWon: 398, pitchCatsWon: 233,
        catDifferential: 144,
        bestCat: 'SB', bestCatWinCount: 98,
        worstCat: 'SV', worstCatLossCount: 96,
        legacyScore: 985 },
  dd: { teamId: 'dd', seasonsPlayed: 5, titles: 0, playoffApps: 3,
        totalCatWins: 612, totalCatLosses: 506, totalCatTies: 37,
        careerWinPct: 0.531,
        hitCatsWon: 340, pitchCatsWon: 272,
        catDifferential: 106,
        bestCat: 'H', bestCatWinCount: 74,
        worstCat: 'SV', worstCatLossCount: 70,
        legacyScore: 760 },
  qs: { teamId: 'qs', seasonsPlayed: 5, titles: 0, playoffApps: 5,
        totalCatWins: 594, totalCatLosses: 524, totalCatTies: 37,
        careerWinPct: 0.516,
        hitCatsWon: 304, pitchCatsWon: 290,
        catDifferential: 70,
        bestCat: 'AVG', bestCatWinCount: 68,
        worstCat: 'HR', worstCatLossCount: 64,
        legacyScore: 720 },
  wd: { teamId: 'wd', seasonsPlayed: 5, titles: 0, playoffApps: 3,
        totalCatWins: 561, totalCatLosses: 557, totalCatTies: 37,
        careerWinPct: 0.501,
        hitCatsWon: 252, pitchCatsWon: 309,
        catDifferential: 4,
        bestCat: 'K', bestCatWinCount: 108,
        worstCat: 'AVG', worstCatLossCount: 95,
        legacyScore: 645 },
  ie: { teamId: 'ie', seasonsPlayed: 5, titles: 0, playoffApps: 2,
        totalCatWins: 531, totalCatLosses: 587, totalCatTies: 37,
        careerWinPct: 0.475,
        hitCatsWon: 244, pitchCatsWon: 287,
        catDifferential: -56,
        bestCat: 'W', bestCatWinCount: 84,
        worstCat: 'HLD', worstCatLossCount: 88,
        legacyScore: 495 },
  mv: { teamId: 'mv', seasonsPlayed: 5, titles: 0, playoffApps: 2,
        totalCatWins: 510, totalCatLosses: 608, totalCatTies: 37,
        careerWinPct: 0.456,
        hitCatsWon: 246, pitchCatsWon: 264,
        catDifferential: -98,
        bestCat: 'AVG', bestCatWinCount: 62,
        worstCat: 'HR', worstCatLossCount: 70,
        legacyScore: 460 },
  ws: { teamId: 'ws', seasonsPlayed: 5, titles: 0, playoffApps: 1,
        totalCatWins: 364, totalCatLosses: 754, totalCatTies: 37,
        careerWinPct: 0.326,
        hitCatsWon: 188, pitchCatsWon: 176,
        catDifferential: -390,
        bestCat: 'AVG', bestCatWinCount: 52,
        worstCat: 'RBI', worstCatLossCount: 110,
        legacyScore: 290 },
}

/* Legacy score breakdown — feeds CategoryTeamLegacyModal. Each item lists
   the count and points contribution. Totals roughly track teamCareerStats. */
export interface LegacyScoreBreakdown {
  teamId: string
  total: number
  rank: number
  championships: { count: number; points: number }
  runnerUps: { count: number; points: number }
  playoffApps: { count: number; points: number }
  regularSeasonTitles: { count: number; points: number }
  totalMatchupWins: { count: number; points: number }
  winningSeasons: { count: number; points: number }
  topThreeFinishes: { count: number; points: number }
  categoryLeaderSeasons: { count: number; points: number }
  topThreeCatSeasons: { count: number; points: number }
  bestWeeklyCatPerformances: { count: number; points: number }
  seasonsPlayed: { count: number; points: number }
  fiveYearPlayoffStreak: { count: number; points: number }
  threeYearWinningStreak: { count: number; points: number }
}

export const legacyBreakdowns: Record<string, LegacyScoreBreakdown> = {
  ct: { teamId: 'ct', total: 1545, rank: 1,
        championships:          { count: 2, points: 200 },
        runnerUps:              { count: 1, points: 50  },
        playoffApps:            { count: 5, points: 100 },
        regularSeasonTitles:    { count: 2, points: 60  },
        totalMatchupWins:       { count: 80, points: 80 },
        winningSeasons:         { count: 5, points: 50  },
        topThreeFinishes:       { count: 4, points: 60  },
        categoryLeaderSeasons:  { count: 9, points: 180 },
        topThreeCatSeasons:     { count: 22, points: 220 },
        bestWeeklyCatPerformances: { count: 48, points: 240 },
        seasonsPlayed:          { count: 5, points: 25 },
        fiveYearPlayoffStreak:  { count: 1, points: 30 },
        threeYearWinningStreak: { count: 25, points: 250 } },
  bt: { teamId: 'bt', total: 1320, rank: 2,
        championships:          { count: 1, points: 100 },
        runnerUps:              { count: 2, points: 100 },
        playoffApps:            { count: 5, points: 100 },
        regularSeasonTitles:    { count: 1, points: 30  },
        totalMatchupWins:       { count: 76, points: 76 },
        winningSeasons:         { count: 5, points: 50  },
        topThreeFinishes:       { count: 4, points: 60  },
        categoryLeaderSeasons:  { count: 8, points: 160 },
        topThreeCatSeasons:     { count: 19, points: 190 },
        bestWeeklyCatPerformances: { count: 42, points: 210 },
        seasonsPlayed:          { count: 5, points: 25 },
        fiveYearPlayoffStreak:  { count: 1, points: 30 },
        threeYearWinningStreak: { count: 18, points: 189 } },
  ch: { teamId: 'ch', total: 1115, rank: 3,
        championships:          { count: 1, points: 100 },
        runnerUps:              { count: 1, points: 50  },
        playoffApps:            { count: 4, points: 80  },
        regularSeasonTitles:    { count: 0, points: 0   },
        totalMatchupWins:       { count: 70, points: 70 },
        winningSeasons:         { count: 3, points: 30  },
        topThreeFinishes:       { count: 3, points: 45  },
        categoryLeaderSeasons:  { count: 6, points: 120 },
        topThreeCatSeasons:     { count: 14, points: 140 },
        bestWeeklyCatPerformances: { count: 38, points: 190 },
        seasonsPlayed:          { count: 5, points: 25 },
        fiveYearPlayoffStreak:  { count: 0, points: 0  },
        threeYearWinningStreak: { count: 25, points: 265 } },
  fb: { teamId: 'fb', total: 985, rank: 4,
        championships:          { count: 1, points: 100 },
        runnerUps:              { count: 0, points: 0   },
        playoffApps:            { count: 4, points: 80  },
        regularSeasonTitles:    { count: 1, points: 30  },
        totalMatchupWins:       { count: 66, points: 66 },
        winningSeasons:         { count: 3, points: 30  },
        topThreeFinishes:       { count: 2, points: 30  },
        categoryLeaderSeasons:  { count: 5, points: 100 },
        topThreeCatSeasons:     { count: 13, points: 130 },
        bestWeeklyCatPerformances: { count: 32, points: 160 },
        seasonsPlayed:          { count: 5, points: 25 },
        fiveYearPlayoffStreak:  { count: 0, points: 0  },
        threeYearWinningStreak: { count: 22, points: 234 } },
  dd: { teamId: 'dd', total: 760, rank: 5,
        championships:          { count: 0, points: 0   },
        runnerUps:              { count: 1, points: 50  },
        playoffApps:            { count: 3, points: 60  },
        regularSeasonTitles:    { count: 0, points: 0   },
        totalMatchupWins:       { count: 62, points: 62 },
        winningSeasons:         { count: 2, points: 20  },
        topThreeFinishes:       { count: 2, points: 30  },
        categoryLeaderSeasons:  { count: 2, points: 40  },
        topThreeCatSeasons:     { count: 10, points: 100 },
        bestWeeklyCatPerformances: { count: 26, points: 130 },
        seasonsPlayed:          { count: 5, points: 25 },
        fiveYearPlayoffStreak:  { count: 0, points: 0  },
        threeYearWinningStreak: { count: 23, points: 243 } },
  qs: { teamId: 'qs', total: 720, rank: 6,
        championships:          { count: 0, points: 0   },
        runnerUps:              { count: 1, points: 50  },
        playoffApps:            { count: 5, points: 100 },
        regularSeasonTitles:    { count: 0, points: 0   },
        totalMatchupWins:       { count: 60, points: 60 },
        winningSeasons:         { count: 2, points: 20  },
        topThreeFinishes:       { count: 1, points: 15  },
        categoryLeaderSeasons:  { count: 1, points: 20  },
        topThreeCatSeasons:     { count: 7, points: 70  },
        bestWeeklyCatPerformances: { count: 22, points: 110 },
        seasonsPlayed:          { count: 5, points: 25 },
        fiveYearPlayoffStreak:  { count: 1, points: 30 },
        threeYearWinningStreak: { count: 20, points: 220 } },
  wd: { teamId: 'wd', total: 645, rank: 7,
        championships:          { count: 0, points: 0   },
        runnerUps:              { count: 0, points: 0   },
        playoffApps:            { count: 3, points: 60  },
        regularSeasonTitles:    { count: 0, points: 0   },
        totalMatchupWins:       { count: 56, points: 56 },
        winningSeasons:         { count: 2, points: 20  },
        topThreeFinishes:       { count: 1, points: 15  },
        categoryLeaderSeasons:  { count: 5, points: 100 },
        topThreeCatSeasons:     { count: 9, points: 90  },
        bestWeeklyCatPerformances: { count: 24, points: 120 },
        seasonsPlayed:          { count: 5, points: 25 },
        fiveYearPlayoffStreak:  { count: 0, points: 0  },
        threeYearWinningStreak: { count: 15, points: 159 } },
  ie: { teamId: 'ie', total: 495, rank: 8,
        championships:          { count: 0, points: 0   },
        runnerUps:              { count: 0, points: 0   },
        playoffApps:            { count: 2, points: 40  },
        regularSeasonTitles:    { count: 1, points: 30  },
        totalMatchupWins:       { count: 52, points: 52 },
        winningSeasons:         { count: 1, points: 10  },
        topThreeFinishes:       { count: 0, points: 0   },
        categoryLeaderSeasons:  { count: 3, points: 60  },
        topThreeCatSeasons:     { count: 7, points: 70  },
        bestWeeklyCatPerformances: { count: 18, points: 90 },
        seasonsPlayed:          { count: 5, points: 25 },
        fiveYearPlayoffStreak:  { count: 0, points: 0  },
        threeYearWinningStreak: { count: 11, points: 118 } },
  mv: { teamId: 'mv', total: 460, rank: 9,
        championships:          { count: 0, points: 0   },
        runnerUps:              { count: 0, points: 0   },
        playoffApps:            { count: 2, points: 40  },
        regularSeasonTitles:    { count: 0, points: 0   },
        totalMatchupWins:       { count: 50, points: 50 },
        winningSeasons:         { count: 1, points: 10  },
        topThreeFinishes:       { count: 0, points: 0   },
        categoryLeaderSeasons:  { count: 2, points: 40  },
        topThreeCatSeasons:     { count: 6, points: 60  },
        bestWeeklyCatPerformances: { count: 18, points: 90 },
        seasonsPlayed:          { count: 5, points: 25 },
        fiveYearPlayoffStreak:  { count: 0, points: 0  },
        threeYearWinningStreak: { count: 13, points: 145 } },
  ws: { teamId: 'ws', total: 290, rank: 10,
        championships:          { count: 0, points: 0   },
        runnerUps:              { count: 0, points: 0   },
        playoffApps:            { count: 1, points: 20  },
        regularSeasonTitles:    { count: 0, points: 0   },
        totalMatchupWins:       { count: 36, points: 36 },
        winningSeasons:         { count: 0, points: 0   },
        topThreeFinishes:       { count: 0, points: 0   },
        categoryLeaderSeasons:  { count: 0, points: 0   },
        topThreeCatSeasons:     { count: 3, points: 30  },
        bestWeeklyCatPerformances: { count: 10, points: 50 },
        seasonsPlayed:          { count: 5, points: 25 },
        fiveYearPlayoffStreak:  { count: 0, points: 0  },
        threeYearWinningStreak: { count: 12, points: 129 } },
}

/* Cumulative legacy score per team at end of each season (2021..2026).
   2026 reflects mid-season state (about +20% of the year's typical accrual). */
export interface CategoryLegacyTrendRow {
  teamId: string
  cumulative: number[]  // 0=2021, 1=2022, ... 5=2026 (current)
}

export const legacyTrend: CategoryLegacyTrendRow[] = [
  { teamId: 'ct', cumulative: [ 220,  450,  720, 1090, 1490, 1545] },
  { teamId: 'bt', cumulative: [ 180,  370,  670,  920, 1265, 1320] },
  { teamId: 'ch', cumulative: [ 150,  430,  620,  860, 1080, 1115] },
  { teamId: 'fb', cumulative: [ 270,  420,  570,  745,  945,  985] },
  { teamId: 'dd', cumulative: [ 100,  210,  340,  510,  725,  760] },
  { teamId: 'qs', cumulative: [ 200,  330,  450,  580,  695,  720] },
  { teamId: 'wd', cumulative: [  85,  185,  315,  455,  620,  645] },
  { teamId: 'ie', cumulative: [  80,  170,  265,  380,  475,  495] },
  { teamId: 'mv', cumulative: [  70,  155,  250,  345,  440,  460] },
  { teamId: 'ws', cumulative: [  60,  120,  180,  225,  275,  290] },
]

/* All-time per-category best/worst single-season performances. One per cat (11). */
export interface AllTimeCategoryRecord {
  catId: CategoryId
  side: 'hit' | 'pit'
  bestSingleSeason: { teamId: string; year: number; value: number }
  worstSingleSeason: { teamId: string; year: number; value: number }
}

export const allTimeCatRecords: AllTimeCategoryRecord[] = [
  { catId: 'R',   side: 'hit',
    bestSingleSeason:  { teamId: 'fb', year: 2021, value: 22 },
    worstSingleSeason: { teamId: 'ws', year: 2024, value:  3 } },
  { catId: 'H',   side: 'hit',
    bestSingleSeason:  { teamId: 'fb', year: 2021, value: 21 },
    worstSingleSeason: { teamId: 'ws', year: 2024, value:  4 } },
  { catId: 'HR',  side: 'hit',
    bestSingleSeason:  { teamId: 'ch', year: 2022, value: 22 },
    worstSingleSeason: { teamId: 'fb', year: 2025, value:  3 } },
  { catId: 'RBI', side: 'hit',
    bestSingleSeason:  { teamId: 'ch', year: 2022, value: 23 },
    worstSingleSeason: { teamId: 'ws', year: 2024, value:  2 } },
  { catId: 'SB',  side: 'hit',
    bestSingleSeason:  { teamId: 'fb', year: 2021, value: 22 },
    worstSingleSeason: { teamId: 'ct', year: 2025, value:  4 } },
  { catId: 'AVG', side: 'hit',
    bestSingleSeason:  { teamId: 'mv', year: 2025, value: 19 },
    worstSingleSeason: { teamId: 'wd', year: 2023, value:  3 } },
  { catId: 'W',   side: 'pit',
    bestSingleSeason:  { teamId: 'ie', year: 2024, value: 21 },
    worstSingleSeason: { teamId: 'ch', year: 2022, value:  3 } },
  { catId: 'SV',  side: 'pit',
    bestSingleSeason:  { teamId: 'ct', year: 2024, value: 23 },
    worstSingleSeason: { teamId: 'fb', year: 2023, value:  3 } },
  { catId: 'K',   side: 'pit',
    bestSingleSeason:  { teamId: 'wd', year: 2024, value: 24 },
    worstSingleSeason: { teamId: 'ch', year: 2022, value:  4 } },
  { catId: 'HLD', side: 'pit',
    bestSingleSeason:  { teamId: 'ct', year: 2025, value: 22 },
    worstSingleSeason: { teamId: 'ie', year: 2023, value:  3 } },
  { catId: 'ERA', side: 'pit',
    bestSingleSeason:  { teamId: 'bt', year: 2023, value: 22 },
    worstSingleSeason: { teamId: 'ch', year: 2022, value:  4 } },
]

/* Per-year leader/laggard for each of 11 categories. 5 years × 11 cats = 55 entries.
   These feed the Season scope of the Hall of Fame/Shame section. */
export interface YearlyCatRecord {
  year: number
  catId: CategoryId
  bestTeamId: string
  bestValue: number
  worstTeamId: string
  worstValue: number
}

export const yearlyCatRecords: YearlyCatRecord[] = [
  // 2021 — fb wins (speed + R + H + SB), ws basement
  { year: 2021, catId: 'R',   bestTeamId: 'fb', bestValue: 22, worstTeamId: 'ws', worstValue:  5 },
  { year: 2021, catId: 'H',   bestTeamId: 'fb', bestValue: 21, worstTeamId: 'ws', worstValue:  5 },
  { year: 2021, catId: 'HR',  bestTeamId: 'ch', bestValue: 19, worstTeamId: 'fb', worstValue:  4 },
  { year: 2021, catId: 'RBI', bestTeamId: 'ch', bestValue: 20, worstTeamId: 'ws', worstValue:  4 },
  { year: 2021, catId: 'SB',  bestTeamId: 'fb', bestValue: 22, worstTeamId: 'ch', worstValue:  4 },
  { year: 2021, catId: 'AVG', bestTeamId: 'qs', bestValue: 18, worstTeamId: 'wd', worstValue:  4 },
  { year: 2021, catId: 'W',   bestTeamId: 'bt', bestValue: 19, worstTeamId: 'ch', worstValue:  5 },
  { year: 2021, catId: 'SV',  bestTeamId: 'ct', bestValue: 20, worstTeamId: 'fb', worstValue:  4 },
  { year: 2021, catId: 'K',   bestTeamId: 'wd', bestValue: 21, worstTeamId: 'ch', worstValue:  5 },
  { year: 2021, catId: 'HLD', bestTeamId: 'bt', bestValue: 20, worstTeamId: 'ie', worstValue:  4 },
  { year: 2021, catId: 'ERA', bestTeamId: 'bt', bestValue: 20, worstTeamId: 'ch', worstValue:  5 },

  // 2022 — ch power era
  { year: 2022, catId: 'R',   bestTeamId: 'ch', bestValue: 20, worstTeamId: 'ws', worstValue:  4 },
  { year: 2022, catId: 'H',   bestTeamId: 'fb', bestValue: 19, worstTeamId: 'ws', worstValue:  5 },
  { year: 2022, catId: 'HR',  bestTeamId: 'ch', bestValue: 22, worstTeamId: 'fb', worstValue:  4 },
  { year: 2022, catId: 'RBI', bestTeamId: 'ch', bestValue: 23, worstTeamId: 'ws', worstValue:  3 },
  { year: 2022, catId: 'SB',  bestTeamId: 'fb', bestValue: 21, worstTeamId: 'ch', worstValue:  4 },
  { year: 2022, catId: 'AVG', bestTeamId: 'mv', bestValue: 18, worstTeamId: 'wd', worstValue:  4 },
  { year: 2022, catId: 'W',   bestTeamId: 'bt', bestValue: 20, worstTeamId: 'ch', worstValue:  3 },
  { year: 2022, catId: 'SV',  bestTeamId: 'ct', bestValue: 21, worstTeamId: 'ch', worstValue:  4 },
  { year: 2022, catId: 'K',   bestTeamId: 'wd', bestValue: 22, worstTeamId: 'ch', worstValue:  4 },
  { year: 2022, catId: 'HLD', bestTeamId: 'ct', bestValue: 19, worstTeamId: 'ch', worstValue:  5 },
  { year: 2022, catId: 'ERA', bestTeamId: 'bt', bestValue: 21, worstTeamId: 'ch', worstValue:  4 },

  // 2023 — bt first title (pitching dominance)
  { year: 2023, catId: 'R',   bestTeamId: 'dd', bestValue: 19, worstTeamId: 'ws', worstValue:  4 },
  { year: 2023, catId: 'H',   bestTeamId: 'dd', bestValue: 20, worstTeamId: 'ws', worstValue:  5 },
  { year: 2023, catId: 'HR',  bestTeamId: 'ch', bestValue: 21, worstTeamId: 'fb', worstValue:  4 },
  { year: 2023, catId: 'RBI', bestTeamId: 'ch', bestValue: 22, worstTeamId: 'ws', worstValue:  4 },
  { year: 2023, catId: 'SB',  bestTeamId: 'fb', bestValue: 20, worstTeamId: 'ct', worstValue:  5 },
  { year: 2023, catId: 'AVG', bestTeamId: 'qs', bestValue: 19, worstTeamId: 'wd', worstValue:  3 },
  { year: 2023, catId: 'W',   bestTeamId: 'bt', bestValue: 21, worstTeamId: 'ch', worstValue:  4 },
  { year: 2023, catId: 'SV',  bestTeamId: 'ct', bestValue: 22, worstTeamId: 'fb', worstValue:  3 },
  { year: 2023, catId: 'K',   bestTeamId: 'wd', bestValue: 23, worstTeamId: 'fb', worstValue:  5 },
  { year: 2023, catId: 'HLD', bestTeamId: 'bt', bestValue: 21, worstTeamId: 'ie', worstValue:  3 },
  { year: 2023, catId: 'ERA', bestTeamId: 'bt', bestValue: 22, worstTeamId: 'ch', worstValue:  5 },

  // 2024 — ct dynasty begins
  { year: 2024, catId: 'R',   bestTeamId: 'fb', bestValue: 20, worstTeamId: 'ws', worstValue:  3 },
  { year: 2024, catId: 'H',   bestTeamId: 'fb', bestValue: 19, worstTeamId: 'ws', worstValue:  4 },
  { year: 2024, catId: 'HR',  bestTeamId: 'ch', bestValue: 20, worstTeamId: 'fb', worstValue:  4 },
  { year: 2024, catId: 'RBI', bestTeamId: 'ch', bestValue: 21, worstTeamId: 'ws', worstValue:  2 },
  { year: 2024, catId: 'SB',  bestTeamId: 'fb', bestValue: 19, worstTeamId: 'ct', worstValue:  5 },
  { year: 2024, catId: 'AVG', bestTeamId: 'mv', bestValue: 18, worstTeamId: 'wd', worstValue:  4 },
  { year: 2024, catId: 'W',   bestTeamId: 'ie', bestValue: 21, worstTeamId: 'ch', worstValue:  4 },
  { year: 2024, catId: 'SV',  bestTeamId: 'ct', bestValue: 23, worstTeamId: 'ch', worstValue:  4 },
  { year: 2024, catId: 'K',   bestTeamId: 'wd', bestValue: 24, worstTeamId: 'ch', worstValue:  5 },
  { year: 2024, catId: 'HLD', bestTeamId: 'ct', bestValue: 21, worstTeamId: 'ie', worstValue:  4 },
  { year: 2024, catId: 'ERA', bestTeamId: 'bt', bestValue: 20, worstTeamId: 'ch', worstValue:  5 },

  // 2025 — ct back to back, mv best AVG
  { year: 2025, catId: 'R',   bestTeamId: 'dd', bestValue: 19, worstTeamId: 'ws', worstValue:  4 },
  { year: 2025, catId: 'H',   bestTeamId: 'dd', bestValue: 19, worstTeamId: 'ws', worstValue:  5 },
  { year: 2025, catId: 'HR',  bestTeamId: 'ch', bestValue: 20, worstTeamId: 'fb', worstValue:  3 },
  { year: 2025, catId: 'RBI', bestTeamId: 'ch', bestValue: 21, worstTeamId: 'ws', worstValue:  4 },
  { year: 2025, catId: 'SB',  bestTeamId: 'fb', bestValue: 20, worstTeamId: 'ct', worstValue:  4 },
  { year: 2025, catId: 'AVG', bestTeamId: 'mv', bestValue: 19, worstTeamId: 'wd', worstValue:  4 },
  { year: 2025, catId: 'W',   bestTeamId: 'bt', bestValue: 20, worstTeamId: 'ch', worstValue:  4 },
  { year: 2025, catId: 'SV',  bestTeamId: 'ct', bestValue: 22, worstTeamId: 'fb', worstValue:  4 },
  { year: 2025, catId: 'K',   bestTeamId: 'wd', bestValue: 22, worstTeamId: 'ch', worstValue:  5 },
  { year: 2025, catId: 'HLD', bestTeamId: 'ct', bestValue: 22, worstTeamId: 'ie', worstValue:  4 },
  { year: 2025, catId: 'ERA', bestTeamId: 'bt', bestValue: 21, worstTeamId: 'ch', worstValue:  4 },
]

/* H2H all-time matrix — 45 unique pairings (alphabetized teamId tuples).
   `recordA` is A's W-L-T against B. `catDiffA` is A's signed cat-win advantage.
   Caller can compute B-vs-A by swapping. Meetings = roughly 8-10 per pairing
   (5 seasons × ~2 meetings/season + playoffs). */
export interface CategoryH2HCell {
  teamA: string
  teamB: string
  recordA: string
  catDiffA: number
  meetings: number
}

// Order: alphabetical teamId pairs. Authored so the leader matches careerWinPct.
export const h2hMatrix: CategoryH2HCell[] = [
  // bt vs others
  { teamA: 'bt', teamB: 'ch', recordA: '6-3-1',  catDiffA:  18, meetings: 10 },
  { teamA: 'bt', teamB: 'ct', recordA: '5-4-0',  catDiffA:  -4, meetings:  9 },
  { teamA: 'bt', teamB: 'dd', recordA: '7-2-1',  catDiffA:  26, meetings: 10 },
  { teamA: 'bt', teamB: 'fb', recordA: '7-2-1',  catDiffA:  30, meetings: 10 },
  { teamA: 'bt', teamB: 'ie', recordA: '7-2-0',  catDiffA:  24, meetings:  9 },
  { teamA: 'bt', teamB: 'mv', recordA: '6-3-0',  catDiffA:  16, meetings:  9 },
  { teamA: 'bt', teamB: 'qs', recordA: '6-3-1',  catDiffA:  14, meetings: 10 },
  { teamA: 'bt', teamB: 'wd', recordA: '6-3-1',  catDiffA:  12, meetings: 10 },
  { teamA: 'bt', teamB: 'ws', recordA: '9-0-1',  catDiffA:  48, meetings: 10 },
  // ch vs others (already did bt-ch)
  { teamA: 'ch', teamB: 'ct', recordA: '4-5-1',  catDiffA: -10, meetings: 10 },
  { teamA: 'ch', teamB: 'dd', recordA: '5-4-1',  catDiffA:   2, meetings: 10 },
  { teamA: 'ch', teamB: 'fb', recordA: '5-4-1',  catDiffA:   4, meetings: 10 },
  { teamA: 'ch', teamB: 'ie', recordA: '5-4-0',  catDiffA:   6, meetings:  9 },
  { teamA: 'ch', teamB: 'mv', recordA: '6-3-0',  catDiffA:  12, meetings:  9 },
  { teamA: 'ch', teamB: 'qs', recordA: '5-4-1',  catDiffA:   4, meetings: 10 },
  { teamA: 'ch', teamB: 'wd', recordA: '6-3-1',  catDiffA:  10, meetings: 10 },
  { teamA: 'ch', teamB: 'ws', recordA: '8-1-1',  catDiffA:  34, meetings: 10 },
  // ct vs others
  { teamA: 'ct', teamB: 'dd', recordA: '6-3-1',  catDiffA:  16, meetings: 10 },
  { teamA: 'ct', teamB: 'fb', recordA: '7-2-1',  catDiffA:  28, meetings: 10 },
  { teamA: 'ct', teamB: 'ie', recordA: '6-3-0',  catDiffA:  16, meetings:  9 },
  { teamA: 'ct', teamB: 'mv', recordA: '6-2-1',  catDiffA:  18, meetings:  9 },
  { teamA: 'ct', teamB: 'qs', recordA: '7-2-1',  catDiffA:  22, meetings: 10 },
  { teamA: 'ct', teamB: 'wd', recordA: '7-2-1',  catDiffA:  20, meetings: 10 },
  { teamA: 'ct', teamB: 'ws', recordA: '9-0-1',  catDiffA:  52, meetings: 10 },
  // dd vs others
  { teamA: 'dd', teamB: 'fb', recordA: '5-4-1',  catDiffA:   4, meetings: 10 },
  { teamA: 'dd', teamB: 'ie', recordA: '5-4-0',  catDiffA:   6, meetings:  9 },
  { teamA: 'dd', teamB: 'mv', recordA: '6-3-0',  catDiffA:  10, meetings:  9 },
  { teamA: 'dd', teamB: 'qs', recordA: '5-4-1',  catDiffA:   2, meetings: 10 },
  { teamA: 'dd', teamB: 'wd', recordA: '5-4-1',  catDiffA:   4, meetings: 10 },
  { teamA: 'dd', teamB: 'ws', recordA: '8-1-1',  catDiffA:  32, meetings: 10 },
  // fb vs others
  { teamA: 'fb', teamB: 'ie', recordA: '5-4-0',  catDiffA:   4, meetings:  9 },
  { teamA: 'fb', teamB: 'mv', recordA: '5-4-0',  catDiffA:   6, meetings:  9 },
  { teamA: 'fb', teamB: 'qs', recordA: '4-5-1',  catDiffA:  -4, meetings: 10 },
  { teamA: 'fb', teamB: 'wd', recordA: '5-4-1',  catDiffA:   2, meetings: 10 },
  { teamA: 'fb', teamB: 'ws', recordA: '8-1-1',  catDiffA:  28, meetings: 10 },
  // ie vs others
  { teamA: 'ie', teamB: 'mv', recordA: '5-4-0',  catDiffA:   4, meetings:  9 },
  { teamA: 'ie', teamB: 'qs', recordA: '4-5-0',  catDiffA:  -4, meetings:  9 },
  { teamA: 'ie', teamB: 'wd', recordA: '4-4-1',  catDiffA:   0, meetings:  9 },
  { teamA: 'ie', teamB: 'ws', recordA: '7-1-1',  catDiffA:  22, meetings:  9 },
  // mv vs others
  { teamA: 'mv', teamB: 'qs', recordA: '4-5-0',  catDiffA:  -6, meetings:  9 },
  { teamA: 'mv', teamB: 'wd', recordA: '4-4-1',  catDiffA:  -2, meetings:  9 },
  { teamA: 'mv', teamB: 'ws', recordA: '7-1-1',  catDiffA:  20, meetings:  9 },
  // qs vs others
  { teamA: 'qs', teamB: 'wd', recordA: '5-4-1',  catDiffA:   2, meetings: 10 },
  { teamA: 'qs', teamB: 'ws', recordA: '8-1-1',  catDiffA:  24, meetings: 10 },
  // wd vs others
  { teamA: 'wd', teamB: 'ws', recordA: '7-2-1',  catDiffA:  20, meetings: 10 },
]

// Verify each unique pair appears once and teamA < teamB alphabetically.
;(function verifyH2H() {
  const seen = new Set<string>()
  for (const c of h2hMatrix) {
    if (c.teamA >= c.teamB) {
      throw new Error(`h2hMatrix: pair ${c.teamA}-${c.teamB} not alphabetized`)
    }
    const k = `${c.teamA}-${c.teamB}`
    if (seen.has(k)) throw new Error(`h2hMatrix: duplicate pair ${k}`)
    seen.add(k)
  }
  // 10 choose 2 = 45
  if (h2hMatrix.length !== 45) {
    throw new Error(`h2hMatrix: expected 45 pairings, got ${h2hMatrix.length}`)
  }
})()

/* Rivalry editorial profiles. Featured pairings carry prose + meetings.
   Non-featured pairings fall back to procedural copy at render. */
export interface CategoryRivalryRecentMeeting {
  year: number
  week: number
  recordA: string  // cat wins this matchup, e.g. "7-4"
  catDiffA: number
}

export interface CategoryRivalryProfile {
  pairKey: string  // alphabetized teamIds joined: "bt-ct"
  teamA: string
  teamB: string
  totalMeetings: number
  recordA: string
  catDiffA: number
  biggestBlowoutDescription: string
  closestGameDescription: string
  mostRecentMeetings: CategoryRivalryRecentMeeting[]
  narrative?: string
}

export const rivalryProfiles: CategoryRivalryProfile[] = [
  {
    pairKey: 'bt-ct',
    teamA: 'bt', teamB: 'ct',
    totalMeetings: 9, recordA: '5-4-0', catDiffA: -4,
    biggestBlowoutDescription: "Closer's Therapy 9-2 over Bullpen Theology. 2024 Week 11.",
    closestGameDescription: "Bullpen Theology 6-5 over Closer's Therapy. 2023 Week 14.",
    mostRecentMeetings: [
      { year: 2025, week: 16, recordA: '7-4', catDiffA:  3 },
      { year: 2025, week:  6, recordA: '5-6', catDiffA: -1 },
      { year: 2024, week: 19, recordA: '3-8', catDiffA: -5 },
      { year: 2024, week: 11, recordA: '2-9', catDiffA: -7 },
    ],
    narrative: "The defining rivalry of the league. Bullpen Theology took the 2023 title from Closer's Therapy by one cat. Then Closer's Therapy won the next two. The matchup now decides which dynasty story the league believes.",
  },
  {
    pairKey: 'ct-mv',
    teamA: 'ct', teamB: 'mv',
    totalMeetings: 9, recordA: '6-2-1', catDiffA: 18,
    biggestBlowoutDescription: "Closer's Therapy 10-1 over Mound Visitors. 2024 Week 8.",
    closestGameDescription: "Tied 5-5-1 in 2025 Week 4.",
    mostRecentMeetings: [
      { year: 2026, week:  3, recordA: '6-5', catDiffA:  1 },
      { year: 2025, week: 14, recordA: '7-4', catDiffA:  3 },
      { year: 2025, week:  4, recordA: '5-5', catDiffA:  0 },
      { year: 2024, week:  8, recordA: '10-1', catDiffA:  9 },
    ],
    narrative: "The defending champ versus your team. Closer's Therapy has owned this matchup for three seasons, but the 2025 splits got closer. The 2026 Week 3 meeting was the first one that felt even.",
  },
  {
    pairKey: 'bt-dd',
    teamA: 'bt', teamB: 'dd',
    totalMeetings: 10, recordA: '7-2-1', catDiffA: 26,
    biggestBlowoutDescription: "Bullpen Theology 9-2 over Doubles Down. 2023 Week 5.",
    closestGameDescription: "Doubles Down 6-5 over Bullpen Theology. 2025 Week 12.",
    mostRecentMeetings: [
      { year: 2026, week:  5, recordA: '8-3', catDiffA:  5 },
      { year: 2025, week: 12, recordA: '5-6', catDiffA: -1 },
      { year: 2025, week:  2, recordA: '7-4', catDiffA:  3 },
      { year: 2024, week: 14, recordA: '8-3', catDiffA:  5 },
    ],
    narrative: "The pitching king and the climber. Bullpen Theology dominated the early years. Doubles Down has closed the gap in 2025 and is the only team currently above .500 against the top pitching team.",
  },
  {
    pairKey: 'ch-fb',
    teamA: 'ch', teamB: 'fb',
    totalMeetings: 10, recordA: '5-4-1', catDiffA: 4,
    biggestBlowoutDescription: "Free Bases 9-2 over Cleanup Hitters. 2021 Week 7.",
    closestGameDescription: "Cleanup Hitters 6-5 over Free Bases. 2022 finals.",
    mostRecentMeetings: [
      { year: 2025, week: 15, recordA: '7-4', catDiffA:  3 },
      { year: 2024, week:  9, recordA: '4-7', catDiffA: -3 },
      { year: 2023, week: 11, recordA: '5-6', catDiffA: -1 },
      { year: 2022, week: 22, recordA: '6-5', catDiffA:  1 },
    ],
    narrative: "The 2021 champion versus the 2022 champion. Cleanup Hitters won the league's closest final ever in 2022. The series has stayed within one cat in every meeting since.",
  },
  {
    pairKey: 'ct-ws',
    teamA: 'ct', teamB: 'ws',
    totalMeetings: 10, recordA: '9-0-1', catDiffA: 52,
    biggestBlowoutDescription: "Closer's Therapy 11-0 over Walk-Off Society. 2024 Week 17.",
    closestGameDescription: "Tied 5-5-1 in 2022 Week 3.",
    mostRecentMeetings: [
      { year: 2025, week: 19, recordA: '10-1', catDiffA:  9 },
      { year: 2025, week:  7, recordA: '9-2', catDiffA:  7 },
      { year: 2024, week: 17, recordA: '11-0', catDiffA: 11 },
      { year: 2024, week:  5, recordA: '8-3', catDiffA:  5 },
    ],
    narrative: "The most one-sided matchup in league history. Nine wins and a tie. The 2024 Week 17 sweep is the only 11-0 in league history.",
  },
]

/* Three editorial beats for the Category Dynasties section. */
export interface CategoryDynastyBeat {
  kind: 'hitting-king' | 'pitching-king' | 'punt-kings'
  eyebrow: string
  headline: string
  body: string
  teamId: string
  cats?: string[]
  catWinTotal?: number
  puntedCat?: string
  puntStreak?: number
}

export const categoryDynastyBeats: CategoryDynastyBeat[] = [
  {
    kind: 'hitting-king',
    eyebrow: 'THE HITTING KING',
    headline: 'Cleanup Hitters has owned offense for five years.',
    body: 'Won HR three of five seasons. Won RBI four of five. Their power-first build is the only constant story in this league.',
    teamId: 'ch',
    cats: ['HR', 'RBI'],
    catWinTotal: 426,
  },
  {
    kind: 'pitching-king',
    eyebrow: 'THE PITCHING KING',
    headline: "Closer's Therapy has owned the bullpen for five years.",
    body: 'Won SV all five seasons. Won HLD four of five. The dynasty is built on relief.',
    teamId: 'ct',
    cats: ['SV', 'HLD'],
    catWinTotal: 432,
  },
  {
    kind: 'punt-kings',
    eyebrow: 'THE PUNT KINGS',
    headline: 'Free Bases has punted Saves for five straight seasons.',
    body: 'Never finished above #8 in SV. Always finished top-3 in SB. The strategy worked once. It has not worked since.',
    teamId: 'fb',
    puntedCat: 'SV',
    puntStreak: 5,
  },
]

/* Hall of Fame / Hall of Shame all-time entries. Season-scope records derive
   from yearlyCatRecords at render time. */
export interface CategoryRecordBookEntry {
  id: string
  kind: 'fame' | 'shame'
  eyebrow: string
  metric: string
  teamId: string
  value: string
  context?: string
}

export const recordBook: CategoryRecordBookEntry[] = [
  // FAME — 4 all-time entries (large, medium, medium, full-width strip)
  { id: 'most-career-cat-wins',     kind: 'fame',
    eyebrow: 'MOST CAREER CAT WINS',
    metric: 'Total cat wins across all seasons',
    teamId: 'ct', value: '762',
    context: 'Across five seasons. Forty-two more than #2.' },
  { id: 'most-championships',       kind: 'fame',
    eyebrow: 'MOST CHAMPIONSHIPS',
    metric: 'Total titles won',
    teamId: 'ct', value: '2',
    context: 'Back-to-back in 2024 and 2025.' },
  { id: 'best-cat-win-ratio',       kind: 'fame',
    eyebrow: 'BEST CAT W-L RATIO',
    metric: 'Career cat-win percentage',
    teamId: 'ct', value: '.660',
    context: '762 wins. 358 losses. The only team above .640.' },
  { id: 'most-sweeps-inflicted',    kind: 'fame',
    eyebrow: 'MOST 11-0 SWEEPS INFLICTED',
    metric: 'Career 11-0 weekly sweeps delivered',
    teamId: 'ct', value: '4',
    context: 'Three on Walk-Off Society, one on Cleanup Hitters.' },

  // SHAME — 4 all-time entries
  { id: 'most-career-cat-losses',   kind: 'shame',
    eyebrow: 'MOST CAREER CAT LOSSES',
    metric: 'Total cat losses across all seasons',
    teamId: 'ws', value: '754',
    context: 'More than double the league average.' },
  { id: 'worst-cat-win-ratio',      kind: 'shame',
    eyebrow: 'WORST CAT W-L RATIO',
    metric: 'Career cat-win percentage',
    teamId: 'ws', value: '.326',
    context: 'No team has finished above #9 in cat-win share.' },
  { id: 'most-categories-punted',   kind: 'shame',
    eyebrow: 'MOST CATEGORIES PUNTED',
    metric: 'Cat-seasons finishing dead last',
    teamId: 'ws', value: '12',
    context: 'Twelve cat-seasons at #10. Six of them in RBI.' },
  { id: 'most-sweeps-suffered',     kind: 'shame',
    eyebrow: 'MOST 11-0 SWEEPS SUFFERED',
    metric: 'Career 11-0 weekly sweeps suffered',
    teamId: 'ws', value: '3',
    context: 'All three to Closer\'s Therapy. None survived past Week 17.' },
]

/* Footer pills */
export const historyFootnotes = [
  { label: 'LONGEST DYNASTY',         value: "Closer's Therapy. Two straight in 2024-2025." },
  { label: 'BIGGEST CATEGORY SWEEP',  value: "Closer's Therapy 11-0 over Walk-Off Society. 2024 Week 17." },
  { label: 'CLOSEST CHAMPIONSHIP',    value: '2022 Cleanup Hitters over Bullpen Theology. 6-5 in cats.' },
  { label: 'MOST CONSISTENT',         value: 'Quality Start. Five playoff apps. Zero titles.' },
  { label: 'MOST CATEGORY VOLATILITY', value: 'The Whiff Department. K champ, AVG basement, every year.' },
] as const

/* ─────────────────────────────────────────────────────────────────
   HOME PAGE — Yesterday's Big Swings
   Five player-level daily-impact stories. Each player is verified
   against draftPicks2026, attributed to the team that drafted them.
───────────────────────────────────────────────────────────────── */

export interface PlayerSwing {
  playerId: string                              // slug, matches draftPicks2026.playerId
  playerName: string
  position: PlayerPosition
  mlbTeam: string                               // 3-letter MLB abbreviation
  fantasyTeamId: string                         // owner of the player (draftedByTeamId)
  statLine: string                              // full editorial stat line
  catImpacts: { cat: CategoryId; delta: string }[]  // cat-level deltas
  matchupImpact: string                         // editorial sub-line tying to a matchup
  kind: 'monster' | 'ace' | 'closer' | 'breakout' | 'gem'
}

// All five players exist in draftPicks2026; fantasyTeamId mirrors draftedByTeamId.
//   Aaron Judge       → ch (R1P2)
//   Tarik Skubal      → ie (R1P6)
//   Andrés Muñoz      → ct (R5P5)
//   Roman Anthony     → qs (R16P4)  — JACKPOT, R12+, breakout pick
//   Matt Strahm       → ie (R15P6)  — setup man, HLD specialist, "stealth gem"
export const yesterdayBigSwings: PlayerSwing[] = [
  {
    playerId: 'aaron-judge',
    playerName: 'Aaron Judge',
    position: 'OF',
    mlbTeam: 'NYY',
    fantasyTeamId: 'ch',
    statLine: '3-FOR-4 · 2 HR · SB · 4 RBI · 3 R',
    catImpacts: [
      { cat: 'HR',  delta: '+2' },
      { cat: 'R',   delta: '+3' },
      { cat: 'RBI', delta: '+4' },
      { cat: 'SB',  delta: '+1' },
    ],
    matchupImpact: 'Cleanup Hitters now leads HR over the Walk-Off Society.',
    kind: 'monster',
  },
  {
    playerId: 'tarik-skubal',
    playerName: 'Tarik Skubal',
    position: 'SP',
    mlbTeam: 'DET',
    fantasyTeamId: 'ie',
    statLine: '8 IP · 0 ER · 12 K · WIN',
    catImpacts: [
      { cat: 'K',   delta: '+12' },
      { cat: 'W',   delta: '+1' },
      { cat: 'ERA', delta: 'down' },
    ],
    matchupImpact: "Innings Eaters' K lead over the Whiff Department is now uncatchable for the week.",
    kind: 'ace',
  },
  {
    playerId: 'andres-munoz',
    playerName: 'Andrés Muñoz',
    position: 'RP',
    mlbTeam: 'SEA',
    fantasyTeamId: 'ct',
    statLine: '1 IP · 2 K · 0 ER · SV',
    catImpacts: [
      { cat: 'SV', delta: '+1' },
      { cat: 'K',  delta: '+2' },
    ],
    matchupImpact: "Closer's Therapy keeps the SV race alive. Still 6-1 over Mound Visitors.",
    kind: 'closer',
  },
  {
    playerId: 'roman-anthony',
    playerName: 'Roman Anthony',
    position: 'OF',
    mlbTeam: 'BOS',
    fantasyTeamId: 'qs',
    statLine: '4-FOR-5 · HR · 2B · 2 RBI · 4 R',
    catImpacts: [
      { cat: 'HR', delta: '+1' },
      { cat: 'R',  delta: '+4' },
      { cat: 'H',  delta: '+4' },
    ],
    matchupImpact: 'Quality Start got R and H gains against Free Bases. Pitching side still soft for the week.',
    kind: 'breakout',
  },
  {
    playerId: 'matt-strahm',
    playerName: 'Matt Strahm',
    position: 'RP',
    mlbTeam: 'PHI',
    fantasyTeamId: 'ie',
    statLine: '3.0 IP · 4 K · 0 ER · 3 HLD',
    catImpacts: [
      { cat: 'HLD', delta: '+3' },
      { cat: 'K',   delta: '+4' },
    ],
    matchupImpact: 'Innings Eaters quietly leads HLD over the Whiff Department now.',
    kind: 'gem',
  },
]

/* ─────────────────────────────────────────────────────────────────
   HOME PAGE — Weekly cats-won chart series
   10 teams × 8 weeks. Each week, a 10-team league with 5 matchups
   contests 11 cats per matchup → 55 cat outcomes distributed across
   10 teams = 5.5 league average per team per week (mathematically
   constant, since cat wins are zero-sum).
───────────────────────────────────────────────────────────────── */

export const weeklyCatsWon: Record<string, number[]> = {
  bt: [7,  8, 8, 9, 9, 9,  9, 9],  // sum 68 / steady climb to throne
  ct: [10, 10, 9, 8, 7, 6,  5, 4],  // sum 59 / the fall
  dd: [3,  4, 5, 6, 7, 8,  8, 9],  // sum 50 / the climber
  wd: [6,  7, 6, 8, 7, 8,  7, 7],  // sum 56 / K-specialist plateau
  qs: [6,  7, 6, 7, 6, 7,  6, 6],  // sum 51 / balanced middle
  ie: [5,  5, 4, 5, 4, 5,  7, 7],  // sum 42 / identity shift
  ch: [4,  5, 6, 5, 4, 4,  3, 3],  // sum 34 / power, no pitching
  mv: [5,  4, 5, 4, 5, 6,  6, 6],  // sum 41 / bubble-team analytics
  fb: [5,  6, 5, 4, 4, 5,  4, 4],  // sum 37 / speed-only, fading
  ws: [3,  2, 3, 2, 3, 2,  3, 1],  // sum 19 / basement
}

// Mathematically constant at 5.5 every week (zero-sum cat outcomes
// in a 10-team 5-matchup league × 11 cats per matchup = 55 wins / 10).
export const weeklyCatLeagueAverage: number[] = [5.5, 5.5, 5.5, 5.5, 5.5, 5.5, 5.5, 5.5]

// Self-check: weeks should sum near 55 (5 matchups × 11 cats, less ties).
// Warns on out-of-range values but never throws — fixture slop must not
// brick the router by failing module load.
;(function verifyWeeklyCats() {
  for (let wk = 0; wk < 8; wk++) {
    let total = 0
    for (const team of Object.keys(weeklyCatsWon)) {
      total += weeklyCatsWon[team][wk]
    }
    if (total < 50 || total > 60) {
      console.warn(`categoriesLeague weeklyCatsWon: week ${wk + 1} sums to ${total}, expected ~55`)
    }
  }
})()

/* ─────────────────────────────────────────────────────────────────
   HOME PAGE — Around-the-league beats
   Five editorial rows mirroring the football home page ticker.
───────────────────────────────────────────────────────────────── */

export interface AroundLeagueBeat {
  kind: 'hot-streak' | 'rough-patch' | 'bubble-watch' | 'top-cat-king' | 'blowout'
  eyebrow: string
  body: string
  tone: 'green' | 'magenta' | 'teal' | 'neutral'
}

export const aroundLeagueBeats: AroundLeagueBeat[] = [
  {
    kind: 'hot-streak',
    eyebrow: 'HOT STREAK',
    body: "Doubles Down has climbed eight spots since week 1. The gap-power lineup is the league's scariest matchup.",
    tone: 'green',
  },
  {
    kind: 'rough-patch',
    eyebrow: 'ROUGH PATCH',
    body: "Closer's Therapy. Three straight matchup losses. The defending champ is collapsing.",
    tone: 'magenta',
  },
  {
    kind: 'bubble-watch',
    eyebrow: 'BUBBLE WATCH',
    body: 'Mound Visitors at 7th. One game from the playoff line with three weeks left.',
    tone: 'teal',
  },
  {
    kind: 'top-cat-king',
    eyebrow: 'TOP CAT KING',
    body: 'Cleanup Hitters swept HR last week, 11-0. The power lineup is built for it.',
    tone: 'green',
  },
  {
    kind: 'blowout',
    eyebrow: 'BLOWOUT',
    body: 'Walk-Off Society. Four-game losing streak. The basement is calling.',
    tone: 'magenta',
  },
]

/* ─────────────────────────────────────────────────────────────────
   HOME PAGE — Quick reads (footer pills)
───────────────────────────────────────────────────────────────── */

export const homeQuickReads = {
  topCatThisWeek: { label: 'K. Whiff Department. 4 sweeps.' },
  biggestUpset:   { label: "Mound Visitors over Closer's Therapy. 7-2 in cats." },
  hottestStreak:  { label: 'Bullpen Theology. W5.' },
  onTheBubble:    { label: '7th Mound Visitors vs 6th Closer\'s Therapy.' },
} as const

// utils/simulatedData.ts
// Generates realistic-looking simulated data for demo/preview purposes

// Fantasy Football Simulated Stats
export const SIMULATED_MATCHUP_STATS = {
  projectedPoints: () => Math.floor(Math.random() * 60) + 90, // 90-150
  actualPoints: () => (Math.floor(Math.random() * 6000) + 9000) / 100, // 90.00-150.00
  winProbability: () => Math.floor(Math.random() * 40) + 30, // 30-70%
}

export const SIMULATED_PLAYER_STATS = {
  qb: {
    passYards: () => Math.floor(Math.random() * 200) + 200, // 200-400
    passTD: () => Math.floor(Math.random() * 3) + 1, // 1-3
    int: () => Math.floor(Math.random() * 2), // 0-1
    rushYards: () => Math.floor(Math.random() * 40), // 0-40
    points: () => (Math.floor(Math.random() * 2000) + 1500) / 100, // 15-35
  },
  rb: {
    rushYards: () => Math.floor(Math.random() * 100) + 40, // 40-140
    rushTD: () => Math.floor(Math.random() * 2), // 0-1
    receptions: () => Math.floor(Math.random() * 5) + 1, // 1-5
    recYards: () => Math.floor(Math.random() * 40), // 0-40
    points: () => (Math.floor(Math.random() * 1500) + 800) / 100, // 8-23
  },
  wr: {
    receptions: () => Math.floor(Math.random() * 7) + 3, // 3-10
    recYards: () => Math.floor(Math.random() * 100) + 40, // 40-140
    recTD: () => Math.floor(Math.random() * 2), // 0-1
    points: () => (Math.floor(Math.random() * 1800) + 600) / 100, // 6-24
  },
  te: {
    receptions: () => Math.floor(Math.random() * 5) + 2, // 2-7
    recYards: () => Math.floor(Math.random() * 60) + 20, // 20-80
    recTD: () => Math.floor(Math.random() * 2), // 0-1
    points: () => (Math.floor(Math.random() * 1200) + 400) / 100, // 4-16
  },
  flex: {
    points: () => (Math.floor(Math.random() * 1500) + 600) / 100, // 6-21
  },
  dst: {
    sacks: () => Math.floor(Math.random() * 4) + 1, // 1-4
    int: () => Math.floor(Math.random() * 2), // 0-1
    pointsAllowed: () => Math.floor(Math.random() * 21) + 7, // 7-28
    points: () => (Math.floor(Math.random() * 1000) + 200) / 100, // 2-12
  },
  k: {
    fg: () => Math.floor(Math.random() * 3) + 1, // 1-3
    xp: () => Math.floor(Math.random() * 3) + 1, // 1-3
    points: () => (Math.floor(Math.random() * 800) + 400) / 100, // 4-12
  }
}

// Fake player names for simulated lineups
export const SIMULATED_PLAYERS = {
  qb: ['J. Sample', 'M. Demo', 'T. Preview', 'A. Example'],
  rb: ['S. Simulated', 'D. Dummy', 'R. Random', 'F. Fake', 'P. Preview'],
  wr: ['W. Widget', 'D. Display', 'S. Sample', 'T. Test', 'M. Mock'],
  te: ['T. Testman', 'D. Data', 'S. Showcase'],
  dst: ['Vikings D/ST', 'Sample D/ST', 'Preview D/ST'],
  k: ['K. Kicker', 'S. Sample', 'D. Demo']
}

// Generate a simulated roster for matchup display
export function generateSimulatedRoster(teamName: string, avatarUrl: string) {
  const positions = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'D/ST', 'K']
  const roster = positions.map((pos, idx) => {
    const posKey = pos.toLowerCase().replace('/', '') as keyof typeof SIMULATED_PLAYER_STATS
    const stats = SIMULATED_PLAYER_STATS[posKey] || SIMULATED_PLAYER_STATS.flex
    
    // Get a player name based on position
    let playerName = 'Sample Player'
    if (pos === 'QB') playerName = SIMULATED_PLAYERS.qb[idx % SIMULATED_PLAYERS.qb.length]
    else if (pos === 'RB') playerName = SIMULATED_PLAYERS.rb[idx % SIMULATED_PLAYERS.rb.length]
    else if (pos === 'WR') playerName = SIMULATED_PLAYERS.wr[idx % SIMULATED_PLAYERS.wr.length]
    else if (pos === 'TE') playerName = SIMULATED_PLAYERS.te[idx % SIMULATED_PLAYERS.te.length]
    else if (pos === 'D/ST') playerName = SIMULATED_PLAYERS.dst[idx % SIMULATED_PLAYERS.dst.length]
    else if (pos === 'K') playerName = SIMULATED_PLAYERS.k[idx % SIMULATED_PLAYERS.k.length]
    else playerName = SIMULATED_PLAYERS.rb[idx % SIMULATED_PLAYERS.rb.length] // FLEX

    return {
      position: pos,
      player_name: playerName,
      team: ['PHI', 'KC', 'SF', 'DAL', 'MIA', 'BUF', 'CIN', 'DET'][idx % 8],
      projected: (Math.random() * 15 + 5).toFixed(1),
      actual: stats.points().toFixed(1),
    }
  })

  const totalProjected = roster.reduce((sum, p) => sum + parseFloat(p.projected), 0)
  const totalActual = roster.reduce((sum, p) => sum + parseFloat(p.actual), 0)

  return {
    teamName,
    avatarUrl,
    roster,
    projected: totalProjected.toFixed(1),
    actual: totalActual.toFixed(1),
  }
}

// Generate simulated matchup data
export function generateSimulatedMatchup(
  team1Name: string, 
  team1Avatar: string, 
  team2Name: string, 
  team2Avatar: string
) {
  const team1 = generateSimulatedRoster(team1Name, team1Avatar)
  const team2 = generateSimulatedRoster(team2Name, team2Avatar)
  
  // Determine winner probability
  const team1Total = parseFloat(team1.actual)
  const team2Total = parseFloat(team2.actual)
  const total = team1Total + team2Total
  const team1WinProb = Math.round((team1Total / total) * 100)

  return {
    team1: {
      ...team1,
      winProbability: team1WinProb,
    },
    team2: {
      ...team2,
      winProbability: 100 - team1WinProb,
    },
    isSimulated: true,
  }
}

// Simulated projection grades
export const SIMULATED_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-']

// Generate simulated start/sit recommendations
export function generateSimulatedStartSit() {
  return {
    mustStarts: [
      { player: 'S. Sample', position: 'RB', team: 'PHI', matchup: 'vs DAL', grade: 'A+', projected: '22.4' },
      { player: 'D. Demo', position: 'WR', team: 'MIA', matchup: 'vs NYJ', grade: 'A', projected: '19.8' },
      { player: 'T. Test', position: 'QB', team: 'BUF', matchup: 'vs NE', grade: 'A', projected: '24.1' },
    ],
    sits: [
      { player: 'F. Fake', position: 'RB', team: 'NYG', matchup: 'vs SF', grade: 'C-', projected: '8.2' },
      { player: 'M. Mock', position: 'WR', team: 'CAR', matchup: 'vs TB', grade: 'D+', projected: '6.1' },
    ],
    sleepers: [
      { player: 'P. Preview', position: 'WR', team: 'JAX', matchup: 'vs TEN', grade: 'B+', projected: '14.2' },
      { player: 'W. Widget', position: 'TE', team: 'DET', matchup: 'vs MIN', grade: 'B', projected: '11.8' },
    ],
    isSimulated: true,
  }
}

// Generate simulated waiver recommendations
export function generateSimulatedWaivers() {
  return {
    topPickups: [
      { player: 'S. Simulated', position: 'RB', team: 'GB', percentOwned: '12%', faabSuggestion: '$15-20', reason: 'Starting RB injured' },
      { player: 'D. Dummy', position: 'WR', team: 'LAC', percentOwned: '24%', faabSuggestion: '$8-12', reason: 'Increased target share' },
      { player: 'T. Testcase', position: 'TE', team: 'KC', percentOwned: '8%', faabSuggestion: '$5-8', reason: 'Red zone looks' },
    ],
    streamers: [
      { player: 'Q. Qb', position: 'QB', team: 'MIN', matchup: 'vs CHI', projected: '21.4' },
      { player: 'Sample D/ST', position: 'D/ST', team: 'IND', matchup: 'vs HOU', projected: '9.2' },
    ],
    isSimulated: true,
  }
}

// Generate simulated trade analysis
export function generateSimulatedTradeAnalysis() {
  return {
    giving: [
      { player: 'Player A', position: 'RB', team: 'PHI', value: 85, ros: '14.2 ppg' },
    ],
    receiving: [
      { player: 'Player B', position: 'WR', team: 'MIA', value: 78, ros: '16.8 ppg' },
      { player: 'Player C', position: 'RB', team: 'ATL', value: 45, ros: '9.2 ppg' },
    ],
    analysis: {
      valueGiving: 85,
      valueReceiving: 123,
      verdict: 'ACCEPT',
      winImprovement: '+3.2%',
      rosImpact: '+2.1 ppg',
    },
    isSimulated: true,
  }
}

// Generate simulated comparison data
export function generateSimulatedComparison(
  team1Name: string,
  team1Avatar: string, 
  team2Name: string,
  team2Avatar: string
) {
  return {
    team1: {
      name: team1Name,
      avatar: team1Avatar,
      record: `${Math.floor(Math.random() * 5) + 6}-${Math.floor(Math.random() * 5) + 3}`,
      pointsFor: (Math.random() * 400 + 1200).toFixed(1),
      pointsAgainst: (Math.random() * 400 + 1100).toFixed(1),
      avgScore: (Math.random() * 30 + 100).toFixed(1),
      highScore: (Math.random() * 30 + 140).toFixed(1),
      lowScore: (Math.random() * 30 + 70).toFixed(1),
      consistency: (Math.random() * 20 + 75).toFixed(0),
    },
    team2: {
      name: team2Name,
      avatar: team2Avatar,
      record: `${Math.floor(Math.random() * 5) + 5}-${Math.floor(Math.random() * 5) + 4}`,
      pointsFor: (Math.random() * 400 + 1150).toFixed(1),
      pointsAgainst: (Math.random() * 400 + 1050).toFixed(1),
      avgScore: (Math.random() * 30 + 95).toFixed(1),
      highScore: (Math.random() * 30 + 135).toFixed(1),
      lowScore: (Math.random() * 30 + 65).toFixed(1),
      consistency: (Math.random() * 20 + 70).toFixed(0),
    },
    h2h: {
      team1Wins: Math.floor(Math.random() * 8) + 2,
      team2Wins: Math.floor(Math.random() * 8) + 2,
      ties: Math.floor(Math.random() * 2),
    },
    isSimulated: true,
  }
}

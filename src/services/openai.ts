// OpenAI API Service for League News Generation

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

interface LeagueContext {
  leagueName: string
  season: string
  week: number
  standings: Array<{
    teamName: string
    wins: number
    losses: number
    pointsFor: number
  }>
  recentMatchups?: Array<{
    team1: string
    team2: string
    score1: number
    score2: number
  }>
}

export async function generateLeagueNews(context: LeagueContext, apiKey: string): Promise<string[]> {
  if (!apiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const prompt = `You are a fun, engaging fantasy football analyst. Generate 3-4 short news items (1-2 sentences each) about this fantasy football league:

League: ${context.leagueName}
Season: ${context.season}, Week ${context.week}

Current Standings:
${context.standings.slice(0, 5).map((team, idx) => 
  `${idx + 1}. ${team.teamName}: ${team.wins}-${team.losses} (${team.pointsFor.toFixed(1)} pts)`
).join('\n')}

Focus on:
- Playoff implications and scenarios
- Hot/cold streaks
- Close races
- Notable performances

Keep it exciting and relevant to the current league situation. Return as a JSON array of strings.`

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a fantasy football analyst who writes engaging, concise league news.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || ''
    
    // Try to parse as JSON array, otherwise split by newlines
    try {
      return JSON.parse(content)
    } catch {
      return content
        .split('\n')
        .filter((line: string) => line.trim().length > 0)
        .slice(0, 4)
    }
  } catch (error) {
    console.error('Failed to generate league news:', error)
    throw error
  }
}

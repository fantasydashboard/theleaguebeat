/**
 * Print the preseason board for a real Sleeper league.
 *
 *   npx vite-node scripts/preview-board-deck.ts <leagueId>
 *
 * Mirrors what PresentView assembles: current rosters, Sleeper
 * projections, the published schedule, and last season's scores for
 * the variance estimate.
 */
import { buildDraftBaseline, projectionsUrl, scoringFor } from '../src/editorial/points/sleeperProjections'
import { rankRosterStrength, type RosterPlayer } from '../src/editorial/points/rosterStrength'
import { projectSeason, weeklyScoreSpread, type ScheduledGame } from '../src/editorial/points/projectedSeason'
import { buildBoardDeck } from '../src/editorial/present/buildBoardDeck'

const leagueId = process.argv[2]
if (!leagueId) { console.error('Usage: npx vite-node scripts/preview-board-deck.ts <leagueId>'); process.exit(1) }
const get = async (u: string) => { const r = await fetch(u); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json() }

const league = await get(`https://api.sleeper.app/v1/league/${leagueId}`)
const rosters = await get(`https://api.sleeper.app/v1/league/${leagueId}/rosters`)
const users = await get(`https://api.sleeper.app/v1/league/${leagueId}/users`)
const season = Number(league.season)
const baseline = buildDraftBaseline(await get(projectionsUrl(season)), scoringFor(league.scoring_settings, league.roster_positions))
if (!baseline) throw new Error('No projections.')

const players: RosterPlayer[] = []
for (const r of rosters) for (const pid of (r.players ?? [])) {
  players.push({ playerId: pid, position: baseline.positionOf(pid) ?? '', teamId: String(r.roster_id) })
}
const strength = rankRosterStrength(players, baseline.pointsOf, league.roster_positions)

const pws = Number(league.settings?.playoff_week_start)
const endWeek = Number.isFinite(pws) && pws > 1 ? pws - 1 : 14
const schedule: ScheduledGame[] = []
for (let w = 1; w <= endWeek; w++) {
  const byId = new Map<number, string[]>()
  for (const m of await get(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${w}`)) {
    if (m?.matchup_id == null || m.roster_id == null) continue
    byId.set(m.matchup_id, [...(byId.get(m.matchup_id) ?? []), String(m.roster_id)])
  }
  for (const p of byId.values()) if (p.length === 2) schedule.push({ week: w, homeTeamId: p[0], awayTeamId: p[1] })
}

let measuredSpread: number | undefined
if (league.previous_league_id) {
  const all: number[] = []
  for (let w = 1; w <= endWeek; w++) {
    for (const m of await get(`https://api.sleeper.app/v1/league/${league.previous_league_id}/matchups/${w}`)) all.push(m?.points ?? 0)
  }
  measuredSpread = weeklyScoreSpread(all)
}

const nameOf = new Map<string, string>()
for (const r of rosters) {
  const u = users.find((x: any) => x.user_id === r.owner_id)
  nameOf.set(String(r.roster_id), u?.metadata?.team_name || u?.display_name || `Team ${r.roster_id}`)
}

const projected = schedule.length
  ? projectSeason(strength.map((t) => ({ teamId: t.teamId, pointsPerWeek: t.pointsPerWeek })), schedule, measuredSpread)
  : undefined

console.log(`\n${league.name} — ${season}`)
console.log(`rosters ${rosters.length} · schedule ${schedule.length} games over ${endWeek} weeks`)
console.log(`variance: ${measuredSpread ? measuredSpread.toFixed(1) + ' (measured from ' + (season - 1) + ')' : 'default'}\n`)

const deck = buildBoardDeck({
  leagueName: league.name, season, strength, projected, measuredSpread,
  teamName: (id) => nameOf.get(id) ?? `Team ${id}`,
  formatLabel: baseline.formatLabel,
})
if (!deck) { console.log('No deck built.'); process.exit(0) }
for (const [i, s] of deck.slides.entries()) {
  console.log('─'.repeat(64)); console.log(`SLIDE ${i + 1}  [${s.kind}]`)
  if (s.kind === 'cold-open') console.log(`  ${s.title} — ${s.subtitle}\n  ${s.meta ?? ''}`)
  else if (s.kind === 'statement') {
    console.log(`  ${s.eyebrow.toUpperCase()}\n  ${s.headline}`)
    if (s.support) console.log(`  ~ ${s.support}`)
    if (s.chips) console.log(`  ${s.chips.map((c) => `${c.value} ${c.label}`).join('  ·  ')}`)
  } else if (s.kind === 'list') {
    console.log(`  ${s.eyebrow.toUpperCase()}\n  ${s.headline}`)
    if (s.support) console.log(`  ~ ${s.support}`)
    for (const r of s.rows) console.log(`    ${(r.lead ?? '').padEnd(6)} ${r.label.padEnd(22)} ${(r.value ?? '').padStart(9)}   ${r.sub ?? ''}`)
  } else console.log(`  ${s.headline}\n  ${s.sub ?? ''}`)
}
console.log('─'.repeat(64))

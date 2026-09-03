/**
 * Print the draft deck for a real Sleeper league, against real ADP.
 *
 *   npx vite-node scripts/preview-draft-deck.ts <leagueId>
 *
 * The deck's numbers are the part a league will argue with, so they
 * need to be readable outside a browser. This resolves ADP exactly as
 * PresentView does — same scoring detection, same rank mapping — and
 * prints every slide as text.
 */
import {
  buildDraftBaseline,
  projectionsUrl,
  scoringFor,
  type DraftBaseline,
} from '../src/editorial/points/sleeperProjections'
import { buildDraftDeck } from '../src/editorial/present/buildDraftDeck'
import type { CategoryLeagueDataDraftPick } from '../src/editorial/types'

const leagueId = process.argv[2]
if (!leagueId) {
  console.error('Usage: npx vite-node scripts/preview-draft-deck.ts <leagueId>')
  process.exit(1)
}

const get = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

const league = await get(`https://api.sleeper.app/v1/league/${leagueId}`)
const rosters = await get(`https://api.sleeper.app/v1/league/${leagueId}/rosters`)
const users = await get(`https://api.sleeper.app/v1/league/${leagueId}/users`)
const drafts = await get(`https://api.sleeper.app/v1/league/${leagueId}/drafts`)
if (!drafts.length) throw new Error('No draft on this league.')
const rawPicks = await get(`https://api.sleeper.app/v1/draft/${drafts[0].draft_id}/picks`)

const picks: CategoryLeagueDataDraftPick[] = rawPicks
  .filter((p: any) => p.roster_id != null)
  .map((p: any) => ({
    pickOverall: p.pick_no,
    round: p.round,
    playerId: p.player_id ?? '',
    playerName: `${p.metadata?.first_name ?? ''} ${p.metadata?.last_name ?? ''}`.trim(),
    position: p.metadata?.position ?? '',
    mlbTeam: p.metadata?.team ?? '',
    draftedByTeamId: String(p.roster_id),
  }))
  .sort((a: any, b: any) => a.pickOverall - b.pickOverall)

const ownerName = new Map<string, string>()
for (const r of rosters) {
  const u = users.find((x: any) => x.user_id === r.owner_id)
  ownerName.set(
    String(r.roster_id),
    u?.metadata?.team_name || u?.display_name || `Team ${r.roster_id}`,
  )
}

const scoring = scoringFor(league.scoring_settings, league.roster_positions)
const season = Number(league.season)
const baseline =
  buildDraftBaseline(await get(projectionsUrl(season)), scoring) ?? undefined

const covered = picks.filter((p) => baseline?.adpOf(p.playerId) !== undefined).length
const projected = picks.filter((p) => baseline?.pointsOf(p.playerId) !== undefined).length

console.log(`\n${league.name} — ${season}`)
console.log(`${rosters.length} teams · ${picks.length} picks`)
console.log(`Scoring detected: ${scoring}`)
console.log(`Basis: ${baseline?.basis ?? 'NONE — would fall back to search_rank'}`)
console.log(`ADP coverage:        ${covered}/${picks.length} (${((covered / picks.length) * 100).toFixed(1)}%)`)
console.log(`Projection coverage: ${projected}/${picks.length} (${((projected / picks.length) * 100).toFixed(1)}%)\n`)

const deck = buildDraftDeck({
  leagueName: league.name,
  season,
  picks,
  teamName: (id) => ownerName.get(id) ?? `Team ${id}`,
  baseline,
  rosterPositions: league.roster_positions,
})

if (!deck) {
  console.log('No deck built.')
  process.exit(0)
}

for (const [i, s] of deck.slides.entries()) {
  console.log('─'.repeat(64))
  console.log(`SLIDE ${i + 1}  [${s.kind}]`)
  if (s.kind === 'cold-open') {
    console.log(`  ${s.title} — ${s.subtitle}`)
    console.log(`  ${s.meta ?? ''}`)
  } else if (s.kind === 'statement') {
    console.log(`  ${s.eyebrow.toUpperCase()}`)
    console.log(`  ${s.headline}`)
    if (s.support) console.log(`  ~ ${s.support}`)
    if (s.chips) console.log(`  ${s.chips.map((c) => `${c.value} ${c.label}`).join('  ·  ')}`)
  } else if (s.kind === 'list') {
    console.log(`  ${s.eyebrow.toUpperCase()}`)
    console.log(`  ${s.headline}`)
    if (s.support) console.log(`  ~ ${s.support}`)
    for (const r of s.rows) {
      console.log(
        `    ${(r.lead ?? '').padEnd(7)} ${r.label.padEnd(24)} ${(r.value ?? '').padStart(8)}   ${r.sub ?? ''}`,
      )
    }
  } else {
    console.log(`  ${s.headline}`)
    if (s.sub) console.log(`  ${s.sub}`)
  }
}
console.log('─'.repeat(64))

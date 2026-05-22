import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CURRENT_SEASON = new Date().getFullYear()

// Simple CSV parser (handles quoted fields with commas)
function parseCSV(text: string): Record<string, string>[] {
  // Baseball Savant CSV exports start with a UTF-8 BOM which, if left in,
  // becomes part of the first header key (e.g. "﻿last_name, first_name")
  // and silently breaks row[header] lookups downstream.
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const parseRow = (line: string): string[] => {
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = ''; continue }
      current += ch
    }
    fields.push(current.trim())
    return fields
  }

  const headers = parseRow(lines[0])
  return lines.slice(1).map(line => {
    const values = parseRow(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  }).filter(row => Object.values(row).some(v => v !== ''))
}

function toNum(val: string | undefined): number | null {
  if (!val || val === '' || val === 'null' || val === 'undefined' || val === 'NA' || val === 'Inf' || val === '-Inf') return null
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

function toInt(val: string | undefined): number | null {
  const n = toNum(val)
  return n !== null ? Math.round(n) : null
}

// Baseball Savant CSVs ship the player name as a single "Last, First"
// column keyed literally `last_name, first_name`. Flip it to conventional
// "First Last" so matching against platform player names works.
function savantName(row: Record<string, string>): string {
  const combined = row['last_name, first_name'] || row['last_name,first_name'] || ''
  if (combined.includes(',')) {
    const [last, first] = combined.split(',').map(s => s.trim())
    return `${first} ${last}`.trim()
  }
  // Fallback for any endpoint that does split the columns
  const first = row.first_name || ''
  const last = row.last_name || ''
  return `${first} ${last}`.trim() || row.player_name || ''
}

// ==================== FANGRAPHS ====================

async function fetchFanGraphsProjections(type: 'bat' | 'pit'): Promise<any[]> {
  const url = `https://www.fangraphs.com/api/projections?type=rfangraphsdc&stats=${type}&pos=all&team=0&players=0`
  console.log(`[FanGraphs] Fetching ${type}: ${url}`)

  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
    }
  })

  if (!resp.ok) {
    console.error(`[FanGraphs] ${type} failed: ${resp.status} ${resp.statusText}`)
    throw new Error(`FanGraphs ${type} fetch failed: ${resp.status}`)
  }

  const data = await resp.json()
  console.log(`[FanGraphs] Got ${data.length} ${type} projections`)
  return data
}

function mapFGBatter(p: any) {
  return {
    mlbam_id: p.xMLBAMID || p.xmlbamid,
    player_name: p.PlayerName || p.playerName,
    team: p.Team || p.team,
    position: p.minpos || p.MinPos || null,
    player_type: 'batter',
    g: toInt(p.G), ab: toInt(p.AB), pa: toInt(p.PA), h: toInt(p.H),
    hr: toInt(p.HR), r: toInt(p.R), rbi: toInt(p.RBI), sb: toInt(p.SB),
    bb: toInt(p.BB), so: toInt(p.SO),
    tb: toInt(p['1B']) !== null && toInt(p['2B']) !== null && toInt(p['3B']) !== null && toInt(p.HR) !== null
      ? (toInt(p['1B'])! + toInt(p['2B'])! * 2 + toInt(p['3B'])! * 3 + toInt(p.HR)! * 4) : null,
    avg: toNum(p.AVG), obp: toNum(p.OBP), slg: toNum(p.SLG), ops: toNum(p.OPS),
    woba: toNum(p.wOBA), iso: toNum(p.ISO), babip: toNum(p.BABIP),
    k_pct: toNum(p['K%']), bb_pct: toNum(p['BB%']),
    war: toNum(p.WAR),
    raw_data: p,
    season: CURRENT_SEASON,
  }
}

function mapFGPitcher(p: any) {
  return {
    mlbam_id: p.xMLBAMID || p.xmlbamid,
    player_name: p.PlayerName || p.playerName,
    team: p.Team || p.team,
    position: p.minpos || p.MinPos || null,
    player_type: 'pitcher',
    w: toInt(p.W), l: toInt(p.L), gs: toInt(p.GS), gp: toInt(p.G),
    sv: toInt(p.SV), hld: toInt(p.HLD),
    ip: toNum(p.IP), era: toNum(p.ERA), whip: toNum(p.WHIP),
    k9: toNum(p['K/9']), bb9: toNum(p['BB/9']),
    k_bb_pct: toNum(p['K-BB%']), fip: toNum(p.FIP), hr9: toNum(p['HR/9']),
    so: toInt(p.SO), bb: toInt(p.BB),
    raw_data: p,
    season: CURRENT_SEASON,
  }
}

// ==================== BASEBALL SAVANT ====================

async function fetchSavantData(type: 'batter' | 'pitcher', endpoint: string): Promise<Record<string, string>[]> {
  console.log(`[Savant] Fetching ${type}: ${endpoint}`)

  const resp = await fetch(endpoint, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/csv',
    }
  })

  if (!resp.ok) {
    console.error(`[Savant] ${type} failed: ${resp.status} ${resp.statusText}`)
    throw new Error(`Savant ${type} fetch failed: ${resp.status}`)
  }

  const text = await resp.text()
  const rows = parseCSV(text)
  console.log(`[Savant] Got ${rows.length} ${type} rows`)
  return rows
}

async function fetchAllSavantMetrics() {
  const batXStats = await fetchSavantData('batter',
    `https://baseballsavant.mlb.com/leaderboard/expected_statistics?type=batter&year=${CURRENT_SEASON}&position=&team=&min=25&csv=true`
  )

  const batStatcast = await fetchSavantData('batter',
    `https://baseballsavant.mlb.com/leaderboard/custom?year=${CURRENT_SEASON}&type=batter&min=25&selections=xba,xslg,xwoba,xobp,xiso,exit_velocity_avg,launch_angle_avg,barrel_batted_rate,hard_hit_percent,k_percent,bb_percent,sweet_spot_percent,sprint_speed&csv=true`
  )

  const pitXStats = await fetchSavantData('pitcher',
    `https://baseballsavant.mlb.com/leaderboard/expected_statistics?type=pitcher&year=${CURRENT_SEASON}&position=&team=&min=25&csv=true`
  )

  const pitStatcast = await fetchSavantData('pitcher',
    `https://baseballsavant.mlb.com/leaderboard/custom?year=${CURRENT_SEASON}&type=pitcher&min=25&selections=xba,xslg,xwoba,xera,k_percent,bb_percent,whiff_percent,barrel_batted_rate,hard_hit_percent,exit_velocity_avg&csv=true`
  )

  // Merge batter xStats + Statcast by player_id
  const batMerged = new Map<number, any>()
  for (const row of batXStats) {
    const id = parseInt(row.player_id)
    if (!id) continue
    batMerged.set(id, {
      mlbam_id: id,
      player_name: savantName(row),
      player_type: 'batter',
      pa: toInt(row.pa),
      ba: toNum(row.ba), slg: toNum(row.slg), woba: toNum(row.woba),
      xba: toNum(row.est_ba), xslg: toNum(row.est_slg), xwoba: toNum(row.est_woba),
    })
  }
  for (const row of batStatcast) {
    const id = parseInt(row.player_id)
    if (!id) continue
    const existing = batMerged.get(id) || { mlbam_id: id, player_name: savantName(row), player_type: 'batter' }
    Object.assign(existing, {
      xobp: toNum(row.xobp), xiso: toNum(row.xiso),
      exit_velocity_avg: toNum(row.exit_velocity_avg),
      launch_angle_avg: toNum(row.launch_angle_avg),
      barrel_rate: toNum(row.barrel_batted_rate),
      hard_hit_pct: toNum(row.hard_hit_percent),
      k_pct: toNum(row.k_percent), bb_pct: toNum(row.bb_percent),
      sweet_spot_pct: toNum(row.sweet_spot_percent),
      sprint_speed: toNum(row.sprint_speed),
      raw_data: { xstats: batXStats.find(r => parseInt(r.player_id) === id), statcast: row },
    })
    batMerged.set(id, existing)
  }

  // Merge pitcher xStats + Statcast
  const pitMerged = new Map<number, any>()
  for (const row of pitXStats) {
    const id = parseInt(row.player_id)
    if (!id) continue
    pitMerged.set(id, {
      mlbam_id: id,
      player_name: savantName(row),
      player_type: 'pitcher',
      pa: toInt(row.pa),
      ba: toNum(row.ba), slg: toNum(row.slg), woba: toNum(row.woba),
      xba: toNum(row.est_ba), xslg: toNum(row.est_slg), xwoba: toNum(row.est_woba),
    })
  }
  for (const row of pitStatcast) {
    const id = parseInt(row.player_id)
    if (!id) continue
    const existing = pitMerged.get(id) || { mlbam_id: id, player_name: savantName(row), player_type: 'pitcher' }
    Object.assign(existing, {
      xera: toNum(row.xera),
      exit_velocity_avg: toNum(row.exit_velocity_avg),
      barrel_rate: toNum(row.barrel_batted_rate),
      hard_hit_pct: toNum(row.hard_hit_percent),
      k_pct: toNum(row.k_percent), bb_pct: toNum(row.bb_percent),
      whiff_pct: toNum(row.whiff_percent),
      raw_data: { xstats: pitXStats.find(r => parseInt(r.player_id) === id), statcast: row },
    })
    pitMerged.set(id, existing)
  }

  return {
    batters: Array.from(batMerged.values()),
    pitchers: Array.from(pitMerged.values()),
  }
}

// ==================== MAIN ====================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const results: Record<string, any> = {}

    // 1. FanGraphs Depth Charts ROS
    console.log('=== Fetching FanGraphs Depth Charts ROS ===')
    try {
      const [fgBatters, fgPitchers] = await Promise.all([
        fetchFanGraphsProjections('bat'),
        fetchFanGraphsProjections('pit'),
      ])

      const mappedBatters = fgBatters
        .map(mapFGBatter)
        .filter((p: any) => p.mlbam_id && p.player_name)
      const mappedPitchers = fgPitchers
        .map(mapFGPitcher)
        .filter((p: any) => p.mlbam_id && p.player_name)

      // Clear old data for this season, then insert fresh
      await supabase.from('fangraphs_projections').delete().eq('season', CURRENT_SEASON)

      // Insert in batches of 500
      const allFG = [...mappedBatters, ...mappedPitchers]
      for (let i = 0; i < allFG.length; i += 500) {
        const batch = allFG.slice(i, i + 500)
        const { error } = await supabase.from('fangraphs_projections').insert(batch)
        if (error) {
          console.error(`[FanGraphs] Insert batch ${i} error:`, error.message)
        }
      }

      results.fangraphs = {
        batters: mappedBatters.length,
        pitchers: mappedPitchers.length,
        total: allFG.length,
      }
      console.log(`[FanGraphs] Inserted ${allFG.length} projections`)
    } catch (e) {
      console.error('[FanGraphs] Error:', e)
      results.fangraphs = { error: String(e) }
    }

    // 2. Baseball Savant Statcast
    console.log('=== Fetching Baseball Savant Statcast ===')
    try {
      const savant = await fetchAllSavantMetrics()

      await supabase.from('statcast_metrics').delete().eq('season', CURRENT_SEASON)

      const allSavant = [
        ...savant.batters.map((p: any) => ({ ...p, season: CURRENT_SEASON })),
        ...savant.pitchers.map((p: any) => ({ ...p, season: CURRENT_SEASON })),
      ]

      for (let i = 0; i < allSavant.length; i += 500) {
        const batch = allSavant.slice(i, i + 500)
        const { error } = await supabase.from('statcast_metrics').insert(batch)
        if (error) {
          console.error(`[Savant] Insert batch ${i} error:`, error.message)
        }
      }

      results.statcast = {
        batters: savant.batters.length,
        pitchers: savant.pitchers.length,
        total: allSavant.length,
      }
      console.log(`[Savant] Inserted ${allSavant.length} metrics`)
    } catch (e) {
      console.error('[Savant] Error:', e)
      results.statcast = { error: String(e) }
    }

    return new Response(
      JSON.stringify({ success: true, results, fetchedAt: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('[fetch-projections] Fatal error:', e)
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

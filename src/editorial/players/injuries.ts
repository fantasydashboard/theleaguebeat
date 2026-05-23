/**
 * Injury reports — IL placements + returns, filtered to rostered
 * players. Same matching pipeline as buildPlayerNights (MLB IDs
 * preferred, name fallback). Used by detection/players.ts to emit
 * il-placement and il-return Wire cards.
 */

import { getDayTransactions, yesterdayDate } from '@/services/mlbStats'
import {
  normalizeName,
  type NameRosterIndex,
  type RosterIndex,
} from './buildPlayerNights'

export interface InjuryReport {
  mlbId: number
  playerName: string
  date: string
  /** 'placement' = went on IL; 'return' = reinstated. */
  kind: 'placement' | 'return'
  /** Free-text MLB description, useful as the body copy. */
  description: string
  /** Same shape as PlayerNight.ownedByTeamIds. */
  ownedByTeamIds: string[]
}

export interface BuildInjuriesOpts {
  date?: string
  rosterByMlbId?: RosterIndex
  rosterByName?: NameRosterIndex
  /** Default false: we only surface IL events for ROSTERED players.
   *  League-wide IL gossip is noise; only my-league-rostered guys
   *  matter editorially. */
  includeUnowned?: boolean
}

export async function buildInjuryReports(
  opts: BuildInjuriesOpts,
): Promise<InjuryReport[]> {
  try {
    const date = opts.date ?? yesterdayDate()
    const transactions = await getDayTransactions(date)
    const includeUnowned = opts.includeUnowned === true

    const out: InjuryReport[] = []
    for (const t of transactions) {
      if (!t.isIlPlacement && !t.isIlReturn) continue
      const owned = ownersFor(t.mlbId, t.playerName, opts)
      if (!includeUnowned && owned.length === 0) continue
      out.push({
        mlbId: t.mlbId,
        playerName: t.playerName,
        date: t.date,
        kind: t.isIlPlacement ? 'placement' : 'return',
        description: t.description,
        ownedByTeamIds: owned,
      })
    }
    return out
  } catch (err) {
    console.warn('[buildInjuryReports] failed:', err)
    return []
  }
}

function ownersFor(
  mlbId: number,
  name: string,
  opts: BuildInjuriesOpts,
): string[] {
  if (opts.rosterByMlbId) {
    const direct = opts.rosterByMlbId.get(mlbId)
    if (direct && direct.length > 0) return direct
  }
  if (opts.rosterByName) {
    const key = normalizeName(name)
    const byName = opts.rosterByName.get(key)
    if (byName && byName.length > 0) return byName
  }
  return []
}

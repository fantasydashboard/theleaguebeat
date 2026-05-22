/**
 * Card-share tracking
 * ----------------------------------------------------------------------------
 * Records every time a user downloads/shares a UFD card. Fire-and-forget —
 * never throws, never blocks the actual download. League/sport/platform
 * context is auto-pulled from the league store so call sites only need to
 * pass `dashboard_type`.
 *
 * Wired into every downloadX / shareX handler across the app. Data feeds
 * CommandSite analytics + viral-trigger emails (e.g., "show your commish
 * League Pass" after N shares in trial).
 *
 * Schema: see supabase/migrations/20260430_card_shares.sql
 */

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useLeagueStore } from '@/stores/league'

export interface CardShareMeta {
  /** Slug identifying the card type — e.g. 'power_rankings_points'. */
  dashboard_type: string
}

export function trackCardShare(meta: CardShareMeta): void {
  // Detached from the caller's promise chain on purpose. Tracking is never
  // allowed to throw or delay the share itself.
  void (async () => {
    try {
      if (!supabase) return
      const auth = useAuthStore()
      if (!auth.user?.id) return
      const league = useLeagueStore()
      await supabase.from('card_shares').insert({
        user_id: auth.user.id,
        dashboard_type: meta.dashboard_type,
        league_id: league.activeLeagueId ?? null,
        sport: league.activeSport ?? null,
        platform: league.activePlatform ?? null,
      })
    } catch (e) {
      console.warn('[shareTracking] insert failed', e)
    }
  })()
}

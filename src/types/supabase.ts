/**
 * Supabase Database Types
 * 
 * These types match the database schema for Ultimate Fantasy Dashboard.
 * Supports multi-sport (football, baseball, basketball, hockey) and
 * multi-platform (Sleeper, Yahoo, ESPN, Fantrax).
 */

// Platform and Sport types
export type Platform = 'sleeper' | 'yahoo' | 'espn' | 'fantrax'
export type Sport = 'football' | 'baseball' | 'basketball' | 'hockey'
export type SubscriptionTier = 'free' | 'pro' | 'premium'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing'
export type Theme = 'dark' | 'light' | 'system'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          sleeper_user_id: string | null
          subscription_tier: SubscriptionTier
          subscription_status: SubscriptionStatus | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          sleeper_user_id?: string | null
          subscription_tier?: SubscriptionTier
          subscription_status?: SubscriptionStatus | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          sleeper_user_id?: string | null
          subscription_tier?: SubscriptionTier
          subscription_status?: SubscriptionStatus | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      connected_platforms: {
        Row: {
          id: string
          user_id: string
          platform: Platform
          platform_user_id: string | null
          platform_username: string | null
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          scopes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: Platform
          platform_user_id?: string | null
          platform_username?: string | null
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          scopes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: Platform
          platform_user_id?: string | null
          platform_username?: string | null
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          scopes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leagues: {
        Row: {
          id: string
          user_id: string
          platform: Platform
          sport: Sport
          platform_league_id: string
          league_name: string
          season: string
          team_name: string | null
          team_id: string | null
          scoring_type: string | null
          league_size: number | null
          is_active: boolean
          is_primary: boolean
          last_synced_at: string | null
          settings: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: Platform
          sport: Sport
          platform_league_id: string
          league_name: string
          season: string
          team_name?: string | null
          team_id?: string | null
          scoring_type?: string | null
          league_size?: number | null
          is_active?: boolean
          is_primary?: boolean
          last_synced_at?: string | null
          settings?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: Platform
          sport?: Sport
          platform_league_id?: string
          league_name?: string
          season?: string
          team_name?: string | null
          team_id?: string | null
          scoring_type?: string | null
          league_size?: number | null
          is_active?: boolean
          is_primary?: boolean
          last_synced_at?: string | null
          settings?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          sport: Sport | 'global'
          theme: Theme
          default_league_id: string | null
          ranking_factors: Record<string, any>
          weekly_factors: Record<string, any>
          notification_settings: Record<string, any>
          display_settings: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sport: Sport | 'global'
          theme?: Theme
          default_league_id?: string | null
          ranking_factors?: Record<string, any>
          weekly_factors?: Record<string, any>
          notification_settings?: Record<string, any>
          display_settings?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sport?: Sport | 'global'
          theme?: Theme
          default_league_id?: string | null
          ranking_factors?: Record<string, any>
          weekly_factors?: Record<string, any>
          notification_settings?: Record<string, any>
          display_settings?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      subscription_history: {
        Row: {
          id: string
          user_id: string
          event_type: 'created' | 'upgraded' | 'downgraded' | 'canceled' | 'reactivated' | 'payment_failed' | 'payment_succeeded'
          from_tier: string | null
          to_tier: string | null
          stripe_event_id: string | null
          metadata: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: 'created' | 'upgraded' | 'downgraded' | 'canceled' | 'reactivated' | 'payment_failed' | 'payment_succeeded'
          from_tier?: string | null
          to_tier?: string | null
          stripe_event_id?: string | null
          metadata?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: 'created' | 'upgraded' | 'downgraded' | 'canceled' | 'reactivated' | 'payment_failed' | 'payment_succeeded'
          from_tier?: string | null
          to_tier?: string | null
          stripe_event_id?: string | null
          metadata?: Record<string, any>
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {
      platform: Platform
      sport: Sport
      subscription_tier: SubscriptionTier
      subscription_status: SubscriptionStatus
      theme: Theme
    }
  }
}

// Helper types for easy access
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type ConnectedPlatform = Database['public']['Tables']['connected_platforms']['Row']
export type ConnectedPlatformInsert = Database['public']['Tables']['connected_platforms']['Insert']
export type ConnectedPlatformUpdate = Database['public']['Tables']['connected_platforms']['Update']

export type League = Database['public']['Tables']['leagues']['Row']
export type LeagueInsert = Database['public']['Tables']['leagues']['Insert']
export type LeagueUpdate = Database['public']['Tables']['leagues']['Update']

export type UserPreferences = Database['public']['Tables']['user_preferences']['Row']
export type UserPreferencesInsert = Database['public']['Tables']['user_preferences']['Insert']
export type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update']

export type SubscriptionHistory = Database['public']['Tables']['subscription_history']['Row']

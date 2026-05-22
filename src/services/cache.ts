/**
 * Local caching service for API data
 * Stores data in localStorage with TTL (time-to-live) support
 * Historical/completed data is cached longer than live data
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // milliseconds
}

// Cache durations
export const CACHE_TTL = {
  // Historical data that never changes
  PERMANENT: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Completed season/week data
  COMPLETED: 24 * 60 * 60 * 1000, // 24 hours
  
  // Current week data (might update during games)
  CURRENT: 5 * 60 * 1000, // 5 minutes
  
  // League metadata
  METADATA: 60 * 60 * 1000, // 1 hour
  
  // Standings and teams
  STANDINGS: 15 * 60 * 1000, // 15 minutes
  
  // Settings that rarely change
  SETTINGS: 24 * 60 * 60 * 1000, // 24 hours
}

const CACHE_PREFIX = 'ufd_cache_'
const CACHE_VERSION = 'v1_'

class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map()
  
  /**
   * Generate a cache key
   */
  private getKey(namespace: string, ...parts: (string | number)[]): string {
    return `${CACHE_PREFIX}${CACHE_VERSION}${namespace}_${parts.join('_')}`
  }
  
  /**
   * Get data from cache (memory first, then localStorage)
   */
  get<T>(namespace: string, ...keyParts: (string | number)[]): T | null {
    const key = this.getKey(namespace, ...keyParts)
    
    // Check memory cache first
    const memEntry = this.memoryCache.get(key)
    if (memEntry && !this.isExpired(memEntry)) {
      return memEntry.data as T
    }
    
    // Check localStorage
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored)
        if (!this.isExpired(entry)) {
          // Restore to memory cache
          this.memoryCache.set(key, entry)
          return entry.data
        } else {
          // Clean up expired entry
          localStorage.removeItem(key)
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e)
    }
    
    return null
  }
  
  /**
   * Store data in cache
   */
  set<T>(namespace: string, data: T, ttl: number, ...keyParts: (string | number)[]): void {
    const key = this.getKey(namespace, ...keyParts)
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    }
    
    // Store in memory
    this.memoryCache.set(key, entry)
    
    // Store in localStorage
    try {
      localStorage.setItem(key, JSON.stringify(entry))
    } catch (e) {
      // localStorage might be full - clear old cache entries
      console.warn('Cache write error, attempting cleanup:', e)
      this.cleanup()
      try {
        localStorage.setItem(key, JSON.stringify(entry))
      } catch (e2) {
        console.warn('Cache write failed after cleanup:', e2)
      }
    }
  }
  
  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }
  
  /**
   * Clear specific cache entry
   */
  clear(namespace: string, ...keyParts: (string | number)[]): void {
    const key = this.getKey(namespace, ...keyParts)
    this.memoryCache.delete(key)
    localStorage.removeItem(key)
  }
  
  /**
   * Clear all cache entries for a namespace
   */
  clearNamespace(namespace: string): void {
    const prefix = `${CACHE_PREFIX}${CACHE_VERSION}${namespace}_`
    
    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key)
      }
    }
    
    // Clear localStorage
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
  
  /**
   * Clear all UFD cache entries
   */
  clearAll(): void {
    this.memoryCache.clear()
    
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    console.log(`Cleared ${keysToRemove.length} cache entries`)
  }
  
  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(CACHE_PREFIX)) {
        try {
          const stored = localStorage.getItem(key)
          if (stored) {
            const entry = JSON.parse(stored)
            if (this.isExpired(entry)) {
              keysToRemove.push(key)
            }
          }
        } catch {
          keysToRemove.push(key!)
        }
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      this.memoryCache.delete(key)
    })
    
    if (keysToRemove.length > 0) {
      console.log(`Cache cleanup: removed ${keysToRemove.length} expired entries`)
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { memoryEntries: number; localStorageEntries: number; totalSize: string } {
    let localStorageEntries = 0
    let totalSize = 0
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(CACHE_PREFIX)) {
        localStorageEntries++
        const item = localStorage.getItem(key)
        if (item) {
          totalSize += item.length * 2 // UTF-16 encoding
        }
      }
    }
    
    return {
      memoryEntries: this.memoryCache.size,
      localStorageEntries,
      totalSize: `${(totalSize / 1024).toFixed(1)} KB`
    }
  }
}

// Export singleton instance
export const cache = new CacheService()

// Cache key namespaces
export const CACHE_KEYS = {
  YAHOO_METADATA: 'yahoo_meta',
  YAHOO_STANDINGS: 'yahoo_standings',
  YAHOO_TEAMS: 'yahoo_teams',
  YAHOO_MATCHUPS: 'yahoo_matchups',
  YAHOO_SETTINGS: 'yahoo_settings',
  YAHOO_TRANSACTIONS: 'yahoo_transactions',
  YAHOO_CATEGORY_MATCHUPS: 'yahoo_cat_matchups_v2',
  SLEEPER_MATCHUPS: 'sleeper_matchups',
  SLEEPER_ROSTERS: 'sleeper_rosters',
}

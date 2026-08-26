import { describe, it, expect, vi } from 'vitest'
import { handleAuthStateChange, type AuthStateChangeDeps } from '@/stores/authStateChange'

type S = { token: string }
type U = { id: string }

function deps(over: Partial<AuthStateChangeDeps<S, U>> = {}) {
  const calls = {
    session: [] as (S | null)[],
    user: [] as (U | null)[],
    cleared: 0,
    profileLoads: 0,
    profileErrors: [] as unknown[],
  }
  const scheduled: (() => void)[] = []

  const base: AuthStateChangeDeps<S, U> = {
    setSession: (s) => { calls.session.push(s) },
    setUser: (u) => { calls.user.push(u) },
    clearProfile: () => { calls.cleared++ },
    loadProfile: async () => { calls.profileLoads++ },
    onProfileError: (e) => { calls.profileErrors.push(e) },
    // Capture instead of scheduling, so tests control when deferred work runs.
    defer: (fn) => { scheduled.push(fn) },
    ...over,
  }

  return { deps: base, calls, runScheduled: () => scheduled.forEach((f) => f()) }
}

const session: S = { token: 't' }
const user: U = { id: 'u1' }

describe('handleAuthStateChange', () => {
  /* The regression this module exists for. auth-js awaits every
   * subscriber before signInWithPassword resolves, so a slow profile
   * request used to hold the sign-in spinner open for 20-40s. */
  it('is synchronous — it returns void, never a promise', () => {
    const { deps } = deps0()
    const result = handleAuthStateChange({ session, user }, deps)
    expect(result).toBeUndefined()
  })

  it('returns even when the profile load never settles', () => {
    // A profile request that hangs forever — exactly the proxy cold-start
    // case. The handler must not care.
    const neverSettles = () => new Promise<never>(() => {})
    const { deps } = deps0({ loadProfile: neverSettles })

    let returned = false
    handleAuthStateChange({ session, user }, deps)
    returned = true

    expect(returned).toBe(true)
  })

  it('applies session and user synchronously, before any deferred work', () => {
    const { deps, calls } = deps0()
    handleAuthStateChange({ session, user }, deps)

    // Not after runScheduled() — immediately.
    expect(calls.session).toEqual([session])
    expect(calls.user).toEqual([user])
  })

  it('does not load the profile until the deferred work runs', () => {
    const { deps, calls, runScheduled } = deps0()
    handleAuthStateChange({ session, user }, deps)

    expect(calls.profileLoads).toBe(0)
    runScheduled()
    expect(calls.profileLoads).toBe(1)
  })

  it('swallows a profile-load rejection — a failed profile must not fail auth', async () => {
    const boom = new Error('proxy 504')
    const { deps, calls, runScheduled } = deps0({
      loadProfile: async () => { throw boom },
    })

    handleAuthStateChange({ session, user }, deps)
    runScheduled()
    await Promise.resolve()
    await Promise.resolve()

    expect(calls.profileErrors).toEqual([boom])
  })

  it('does not throw when loadProfile throws synchronously', () => {
    const { deps, runScheduled } = deps0({
      loadProfile: (() => { throw new Error('sync boom') }) as never,
    })

    handleAuthStateChange({ session, user }, deps)
    expect(() => runScheduled()).not.toThrow()
  })

  it('clears the profile and loads nothing when signing out', () => {
    const { deps, calls, runScheduled } = deps0()
    handleAuthStateChange({ session: null, user: null }, deps)
    runScheduled()

    expect(calls.cleared).toBe(1)
    expect(calls.profileLoads).toBe(0)
    expect(calls.session).toEqual([null])
    expect(calls.user).toEqual([null])
  })

  it('defaults to deferring on a macrotask when no defer is injected', async () => {
    vi.useFakeTimers()
    try {
      let loaded = 0
      handleAuthStateChange(
        { session, user },
        {
          setSession: () => {},
          setUser: () => {},
          clearProfile: () => {},
          loadProfile: async () => { loaded++ },
          onProfileError: () => {},
          // no defer — exercise the real setTimeout path
        },
      )

      expect(loaded).toBe(0)
      vi.runAllTimers()
      await Promise.resolve()
      expect(loaded).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

// Named to avoid shadowing the imported `deps` type in each test body.
function deps0(over: Partial<AuthStateChangeDeps<S, U>> = {}) {
  return deps(over)
}

/**
 * handleAuthStateChange — the body of our `onAuthStateChange` listener,
 * extracted so it can be tested without a live Supabase client.
 *
 * WHY THIS EXISTS (do not "simplify" it back into an async callback):
 *
 * auth-js awaits every state-change subscriber before `signInWithPassword`
 * resolves:
 *
 *   signInWithPassword()                       GoTrueClient.js:429
 *     → await _notifyAllSubscribers(...)       :469
 *         → await x.callback(event, session)   :2007
 *         → await Promise.all(promises)        :2013
 *
 * So anything the callback awaits is on the critical path of signing in.
 * We used to `await fetchProfile()` there, which meant a slow profile
 * request held the sign-in button's spinner open for as long as it took —
 * 20-40s through the Vercel Supabase proxy on a cold start, and on a
 * gateway timeout it surfaced as an unparseable error rendered as "{}".
 *
 * Supabase documents this: never make async Supabase calls inside an
 * onAuthStateChange callback; defer them instead.
 *
 * The invariant this module guarantees: **the handler is synchronous.**
 * Session state is applied immediately so `isAuthenticated` is correct the
 * moment sign-in returns; the profile loads afterwards, on its own time,
 * and its failure can never block or fail authentication.
 */

export interface AuthStateChangeDeps<TSession, TUser> {
  /** Apply the new session to store state. Must not do I/O. */
  setSession: (session: TSession | null) => void
  /** Apply the new user to store state. Must not do I/O. */
  setUser: (user: TUser | null) => void
  /** Drop any cached profile when signing out. Must not do I/O. */
  clearProfile: () => void
  /** Loads the profile. May be slow; it is deliberately NOT awaited. */
  loadProfile: () => Promise<unknown>
  /** Reports a profile-load failure. Never rethrown — a profile is not
   *  required to be authenticated. */
  onProfileError: (err: unknown) => void
  /** Schedules the deferred work. Injectable so tests can run it
   *  synchronously; defaults to a macrotask, which is what Supabase's own
   *  guidance recommends for breaking out of the notify chain. */
  defer?: (fn: () => void) => void
}

export interface AuthStateSnapshot<TSession, TUser> {
  session: TSession | null
  user: TUser | null
}

/**
 * Returns `void`, not `Promise<void>`. That return type IS the fix — an
 * async function here would be awaited by auth-js and reintroduce the
 * stall.
 */
export function handleAuthStateChange<TSession, TUser>(
  next: AuthStateSnapshot<TSession, TUser>,
  deps: AuthStateChangeDeps<TSession, TUser>,
): void {
  const defer = deps.defer ?? ((fn: () => void) => { setTimeout(fn, 0) })

  // Session state is applied synchronously: by the time sign-in resolves,
  // the app already knows who the user is.
  deps.setSession(next.session)
  deps.setUser(next.user)

  if (!next.user) {
    deps.clearProfile()
    return
  }

  defer(() => {
    // Started, never awaited — see the module header. Both failure modes
    // are absorbed here: a synchronous throw by the try/catch, an async
    // rejection by the attached .catch. Neither can reach auth-js.
    try {
      const pending = deps.loadProfile()
      if (pending && typeof (pending as Promise<unknown>).catch === 'function') {
        void (pending as Promise<unknown>).catch((err) => deps.onProfileError(err))
      }
    } catch (err) {
      deps.onProfileError(err)
    }
  })
}

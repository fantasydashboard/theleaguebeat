/**
 * ESPN Chrome Extension Communication Service
 * 
 * Communicates with the "ESPN Fantasy Cookie Sync" Chrome extension
 * to automatically retrieve ESPN credentials (espn_s2 and SWID cookies).
 * 
 * Extension ID: dbjbbkdjodblojmhljgdbdlliogkhbjc
 * Install: https://chromewebstore.google.com/detail/dbjbbkdjodblojmhljgdbdlliogkhbjc
 */

const EXTENSION_ID = 'dbjbbkdjodblojmhljgdbdlliogkhbjc'
const CHROME_STORE_URL = `https://chromewebstore.google.com/detail/espn-fantasy-cookie-sync/${EXTENSION_ID}`

export interface EspnCookieResult {
  espn_s2: string | null
  swid: string | null
  error?: string
}

export interface EspnLeague {
  id: string
  name: string
  size: number
  sport: 'football' | 'baseball' | 'basketball' | 'hockey'
  season: number
  scoringType: string
}

export interface EspnLeaguesResult {
  leagues: EspnLeague[]
  espn_s2?: string | null
  swid?: string | null
  error?: string
}

/**
 * Diagnostic — call this from browser console: 
 *   import('/src/services/espnExtension.ts').then(m => m.diagnoseExtension())
 * Or it runs automatically in dev mode when detection fails.
 */
export async function diagnoseExtension(): Promise<void> {
  console.group('[ESPN Extension Diagnostic]')
  console.log('window.chrome exists:', !!window.chrome)
  console.log('window.chrome.runtime exists:', !!window.chrome?.runtime)
  console.log('sendMessage is function:', typeof window.chrome?.runtime?.sendMessage === 'function')
  console.log('Extension ID:', EXTENSION_ID)
  console.log('Current URL:', window.location.href)
  console.log('User agent:', navigator.userAgent)

  if (!window.chrome?.runtime?.sendMessage) {
    console.error('FAIL: chrome.runtime.sendMessage not available — not a Chromium browser or running in iframe')
    console.groupEnd()
    return
  }

  console.log('Attempting sendMessage ping...')
  try {
    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage(EXTENSION_ID, { action: 'ping' }, (response) => {
        const err = chrome.runtime.lastError?.message
        console.log('Raw response:', response)
        console.log('lastError:', err || 'none')
        resolve({ response, err })
      })
    })
    console.log('Ping result:', result)
  } catch (e: any) {
    console.error('sendMessage threw:', e.message)
  }

  console.groupEnd()
}

/**
 * Check if the Chrome extension is installed and responsive.
 * Retries up to 3 times with delay — MV3 service workers can take a moment to wake.
 */
export async function isExtensionInstalled(): Promise<boolean> {
  if (!window.chrome?.runtime?.sendMessage) {
    return false
  }

  const MAX_ATTEMPTS = 3
  const RETRY_DELAY_MS = 800

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`[ESPN Extension] Ping attempt ${attempt}/${MAX_ATTEMPTS}...`)
      const response = await sendExtensionMessage({ action: 'ping' }, 4000)
      if (response?.status === 'ok') {
        console.log('[ESPN Extension] Extension detected on attempt', attempt)
        return true
      }
    } catch (err: any) {
      console.log(`[ESPN Extension] Ping attempt ${attempt} failed:`, err.message)
    }

    // Wait before retrying (except on last attempt)
    if (attempt < MAX_ATTEMPTS) {
      await delay(RETRY_DELAY_MS)
    }
  }

  console.log('[ESPN Extension] Not detected after all attempts')
  return false
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Request ESPN cookies from the Chrome extension
 */
export async function getEspnCookiesFromExtension(): Promise<EspnCookieResult> {
  // Must be in a Chrome-based browser with extension messaging support
  if (!window.chrome?.runtime?.sendMessage) {
    return {
      espn_s2: null,
      swid: null,
      error: 'extension_not_installed'
    }
  }

  try {
    const response = await sendExtensionMessage({ action: 'getEspnCookies' })

    // If response is undefined/null, extension is not installed
    // (Chrome silently fails when extension ID doesn't exist)
    if (!response) {
      console.log('[ESPN Extension] No response received - extension not installed')
      return {
        espn_s2: null,
        swid: null,
        error: 'extension_not_installed'
      }
    }

    if (response.error) {
      // Extension responded but reported an error (e.g. "no cookies found")
      // This means extension IS installed, just no ESPN login
      return {
        espn_s2: null,
        swid: null,
        error: response.error
      }
    }

    return {
      espn_s2: response.espn_s2 || null,
      swid: response.swid || null
    }
  } catch (err: any) {
    // ANY failure to communicate = extension not installed
    console.log('[ESPN Extension] Communication failed:', err.message)
    return {
      espn_s2: null,
      swid: null,
      error: 'extension_not_installed'
    }
  }
}

/**
 * Check if running in a Chromium-based browser that supports extensions
 */
export function isChromiumBrowser(): boolean {
  const ua = navigator.userAgent
  return !!(ua.includes('Chrome') || ua.includes('Chromium') || ua.includes('Edg') || ua.includes('Brave'))
}

/**
 * Get Chrome Web Store install URL
 */
export function getExtensionStoreUrl(): string {
  return CHROME_STORE_URL
}

/**
 * Get the extension ID
 */
export function getExtensionId(): string {
  return EXTENSION_ID
}

/**
 * Request all ESPN leagues for the logged-in user from the Chrome extension
 */
export async function getEspnLeaguesFromExtension(): Promise<EspnLeaguesResult> {
  if (!window.chrome?.runtime?.sendMessage) {
    return { leagues: [], error: 'extension_not_installed' }
  }

  try {
    const response = await sendExtensionMessage({ action: 'getEspnLeagues' }, 10000)

    if (!response) {
      return { leagues: [], error: 'extension_not_installed' }
    }

    if (response.error === 'not_logged_in') {
      return { leagues: [], error: 'not_logged_in' }
    }

    if (response.error) {
      return { leagues: [], error: response.error }
    }

    return {
      leagues: response.leagues || [],
      espn_s2: response.espn_s2 || null,
      swid: response.swid || null,
    }
  } catch (err: any) {
    console.log('[ESPN Extension] getEspnLeagues failed:', err.message)
    return { leagues: [], error: 'extension_not_installed' }
  }
}

// Internal helper to send a message to the extension with timeout
function sendExtensionMessage(message: any, timeoutMs = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Extension response timed out'))
    }, timeoutMs)

    try {
      chrome.runtime.sendMessage(EXTENSION_ID, message, (response: any) => {
        clearTimeout(timer)
        // MUST read lastError immediately — Chrome clears it after the callback returns
        const lastError = chrome.runtime.lastError?.message
        if (lastError) {
          // "Could not establish connection" = extension not installed or inactive
          reject(new Error(lastError))
        } else if (response === undefined || response === null) {
          reject(new Error('No response from extension'))
        } else {
          resolve(response)
        }
      })
    } catch (err) {
      clearTimeout(timer)
      reject(err)
    }
  })
}

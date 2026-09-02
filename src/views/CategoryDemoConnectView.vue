<template>
  <div class="connect">
    <!-- ─── Your saved leagues — only renders when signed in + at
         least one league exists. Lets returning users jump straight
         to their existing leagues without re-entering league IDs. -->
    <section
      v-if="authStore.isAuthenticated && leaguesStore.leagues.length > 0"
      class="saved-leagues"
      aria-labelledby="saved-leagues-heading"
    >
      <header class="saved-leagues-head">
        <p class="connect-eyebrow">
          <span class="connect-eyebrow-bar" aria-hidden="true"></span>
          Your leagues
        </p>
        <h2 id="saved-leagues-heading" class="saved-leagues-headline">
          Pick up where you left off.
        </h2>
      </header>
      <ul class="saved-leagues-list" role="list">
        <li
          v-for="group in savedLeagueGroups"
          :key="group.key"
          class="saved-leagues-row"
        >
          <!-- The card links to the most recent season. Past seasons are
               siblings below, not nested — an anchor inside an anchor is
               invalid and breaks keyboard navigation. -->
          <router-link
            :to="`/leagues/${group.current.id}/the-beat`"
            class="saved-leagues-link"
          >
            <!-- Real alt, not decorative: the mark replaced the word
                 "Yahoo"/"ESPN"/"Sleeper" in the meta line, so without it
                 a screen reader loses the platform entirely. -->
            <img
              :src="platformLogo(group.current.platform)"
              :alt="platformLabel(group.current.platform)"
              class="saved-leagues-logo"
              width="34"
              height="34"
            />
            <span class="saved-leagues-name">{{ group.current.league_name }}</span>
            <span class="saved-leagues-meta">
              <span :class="['saved-leagues-sport', `sport-${group.current.sport}`]">
                {{ group.current.sport }}
              </span>
              <!-- Scoring format and league size only render when the
                   platform actually gave them to us. Yahoo always does;
                   Sleeper never does and ESPN is inconsistent. Blank beats
                   invented. -->
              <span v-if="scoringLabel(group.current.scoring_type)" class="saved-leagues-dot">·</span>
              <span v-if="scoringLabel(group.current.scoring_type)">
                {{ scoringLabel(group.current.scoring_type) }}
              </span>
              <span v-if="group.current.league_size" class="saved-leagues-dot">·</span>
              <span v-if="group.current.league_size">
                {{ group.current.league_size }} teams
              </span>
              <span class="saved-leagues-dot">·</span>
              <span>{{ group.current.season }}</span>
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="saved-leagues-arrow" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </router-link>

          <!-- Prior seasons of the same league, collapsed onto one line
               instead of repeating the whole card per year. -->
          <div v-if="group.past.length > 0" class="saved-leagues-seasons">
            <span class="saved-leagues-seasons-label">Past seasons</span>
            <router-link
              v-for="past in group.past"
              :key="past.id"
              :to="`/leagues/${past.id}/the-beat`"
              class="saved-leagues-season-chip"
            >
              {{ past.season }}
            </router-link>
          </div>
        </li>
      </ul>
      <div class="saved-leagues-sep" aria-hidden="true">
        <span class="saved-leagues-sep-line"></span>
        <span class="saved-leagues-sep-label">or add another</span>
        <span class="saved-leagues-sep-line"></span>
      </div>
    </section>

    <!-- ─── Header ─────────────────────────────────────────────── -->
    <section class="connect-head">
      <p class="connect-eyebrow">
        <span class="connect-eyebrow-bar" aria-hidden="true"></span>
        Connect your league
      </p>
      <h1 class="connect-headline">Which sport?</h1>
      <p class="connect-deck">
        Pick a sport, then connect your league. Editorial recaps for
        every week of the season.
      </p>
    </section>

    <!-- ─── Sport grid (2x2) ───────────────────────────────────── -->
    <section class="sport-grid" aria-label="Choose a sport">
      <button
        type="button"
        class="sport-card sport-card-active"
        :class="{ 'sport-card-selected': selectedSport === 'baseball' }"
        :aria-pressed="selectedSport === 'baseball'"
        @click="pickSport('baseball')"
      >
        <span class="sport-card-art" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <!-- Seams bow along the LEFT and RIGHT edges, the way a real
                 baseball's do. They previously ran corner-to-corner through
                 the middle, which at 40px merged into one diagonal slash and
                 read as a "prohibited" sign on the one sport that is live. -->
            <circle cx="12" cy="12" r="9"/>
            <path d="M6.2 5.4C8.8 8.2 8.8 15.8 6.2 18.6"/>
            <path d="M17.8 5.4C15.2 8.2 15.2 15.8 17.8 18.6"/>
          </svg>
        </span>
        <span class="sport-card-name">Baseball</span>
        <span class="sport-card-pill sport-card-pill-available">Available</span>
      </button>

      <!-- Football is Sleeper-only for now: Sleeper's API is public and
           unauthenticated, so the whole points path is built and tested
           against it. Yahoo and ESPN football are not wired yet, and the
           platform picker below says so rather than offering a dead
           button. -->
      <button
        type="button"
        class="sport-card sport-card-active"
        :class="{ 'sport-card-selected': selectedSport === 'football' }"
        :aria-pressed="selectedSport === 'football'"
        @click="pickSport('football')"
      >
        <span class="sport-card-art" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3c-3.6 1.8-6 5.5-6 9s2.4 7.2 6 9c3.6-1.8 6-5.5 6-9s-2.4-7.2-6-9z"/>
            <path d="M12 3v18"/>
            <path d="M9 7l6 10"/>
          </svg>
        </span>
        <span class="sport-card-name">Football</span>
        <span class="sport-card-pill sport-card-pill-available">Available</span>
      </button>

      <div class="sport-card sport-card-inactive" aria-disabled="true">
        <span class="sport-card-art" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <path d="M3 12h18"/>
            <path d="M12 3a13 13 0 0 1 0 18"/>
            <path d="M12 3a13 13 0 0 0 0 18"/>
          </svg>
        </span>
        <span class="sport-card-name">Basketball</span>
        <span class="sport-card-pill sport-card-pill-soon">Coming soon</span>
      </div>

      <div class="sport-card sport-card-inactive" aria-disabled="true">
        <span class="sport-card-art" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3.5"/>
            <line x1="3" y1="12" x2="8.5" y2="12"/>
            <line x1="15.5" y1="12" x2="21" y2="12"/>
          </svg>
        </span>
        <span class="sport-card-name">Hockey</span>
        <span class="sport-card-pill sport-card-pill-soon">Coming soon</span>
      </div>
    </section>

    <!-- ─── Platform sub-picker (revealed after sport selected) ─── -->
    <section
      v-if="selectedSport === 'baseball' || selectedSport === 'football'"
      class="platform-section"
      aria-label="Choose a platform"
    >
      <p class="connect-eyebrow connect-eyebrow-step">
        <span class="connect-eyebrow-bar" aria-hidden="true"></span>
        Platform
      </p>
      <div class="platform-grid">
        <button
          type="button"
          class="platform-card platform-card-active"
          :class="{ 'platform-card-selected': selectedPlatform === 'sleeper' }"
          :aria-pressed="selectedPlatform === 'sleeper'"
          @click="pickPlatform('sleeper')"
        >
          <span class="platform-card-name">Sleeper</span>
          <span class="platform-card-pill platform-card-pill-available">Available</span>
        </button>
        <button
          type="button"
          class="platform-card platform-card-active"
          :class="{
            'platform-card-selected': selectedPlatform === 'yahoo',
            'platform-card-inactive': selectedSport === 'football',
          }"
          :aria-pressed="selectedPlatform === 'yahoo'"
          :disabled="selectedSport === 'football'"
          @click="pickPlatform('yahoo')"
        >
          <span class="platform-card-name">Yahoo</span>
          <span
            class="platform-card-pill"
            :class="selectedSport === 'football'
              ? 'platform-card-pill-soon'
              : 'platform-card-pill-available'"
          >{{ selectedSport === 'football' ? 'Baseball only' : 'Available' }}</span>
        </button>
        <button
          type="button"
          class="platform-card platform-card-active"
          :class="{
            'platform-card-selected': selectedPlatform === 'espn',
            'platform-card-inactive': selectedSport === 'football',
          }"
          :aria-pressed="selectedPlatform === 'espn'"
          :disabled="selectedSport === 'football'"
          @click="pickPlatform('espn')"
        >
          <span class="platform-card-name">ESPN</span>
          <span
            class="platform-card-pill"
            :class="selectedSport === 'football'
              ? 'platform-card-pill-soon'
              : 'platform-card-pill-available'"
          >{{ selectedSport === 'football' ? 'Baseball only' : 'Available' }}</span>
        </button>
      </div>
    </section>

    <!-- ─── League ID form (Sleeper) ───────────────────────────── -->
    <section
      v-if="(selectedSport === 'baseball' || selectedSport === 'football') && selectedPlatform === 'sleeper'"
      class="form-section"
    >
      <form class="connect-form" @submit.prevent="onSubmit">
        <label class="form-label" for="league-id-input">
          Paste your Sleeper baseball league ID
        </label>
        <input
          id="league-id-input"
          v-model="leagueIdInput"
          type="text"
          class="form-input"
          autocomplete="off"
          spellcheck="false"
          inputmode="numeric"
          placeholder="e.g. 1234567890123456789"
          required
        />
        <p class="form-help">
          Find it in your Sleeper league URL:
          <code>sleeper.app/leagues/<span class="form-help-em">[ID]</span></code>
        </p>
        <button
          type="submit"
          class="form-submit"
          :disabled="!leagueIdInput.trim()"
        >
          Connect
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
        <p v-if="sleeperError" class="form-error">{{ sleeperError }}</p>
      </form>
    </section>

    <!-- ─── Yahoo flow ─────────────────────────────────────────── -->
    <section
      v-if="selectedSport === 'baseball' && selectedPlatform === 'yahoo'"
      class="form-section"
    >
      <!-- Signin gate: Yahoo connections persist to the user's UFD
           account, so we need the user signed in before we can wire
           up the OAuth flow. Shown only when the user is anonymous. -->
      <div v-if="!authStore.isAuthenticated" class="signin-gate">
        <p class="signin-gate-eyebrow">
          <span class="signin-gate-eyebrow-bar" aria-hidden="true"></span>
          Almost there
        </p>
        <h2 class="signin-gate-headline">Sign into UFD to connect Yahoo.</h2>
        <p class="signin-gate-body">
          Your Yahoo connection stays linked to your UFD account so you
          don't have to reconnect every visit.
        </p>
        <button
          type="button"
          class="form-submit"
          @click="openSignup"
        >
          Sign in
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <div v-else class="connect-form">
        <!-- Loading state -->
        <p v-if="yahooLoading" class="form-help">Loading your Yahoo leagues…</p>

        <!-- Authenticated + leagues found -->
        <template v-else-if="yahooConnected && yahooLeagues.length > 0">
          <label class="form-label" for="yahoo-league-select">
            Pick a Yahoo baseball league
          </label>
          <select
            id="yahoo-league-select"
            v-model="selectedYahooLeagueKey"
            class="form-input"
          >
            <option value="" disabled>Select a league…</option>
            <option
              v-for="league in yahooLeaguesClassified"
              :key="league.league_key"
              :value="league.league_key"
              :disabled="!league.supported"
            >
              {{ league.name }} ({{ league.season }}){{ league.suffix }}
            </option>
          </select>
          <p class="form-help">
            The League Beat covers <strong>H2H Categories baseball</strong>
            today. Other formats are tagged in the list — they'll unlock
            on the roadmap (football H2H Points in September, then H2H
            Points baseball, then rotisserie if demand argues for it).
          </p>
          <button
            type="button"
            class="form-submit"
            :disabled="!selectedYahooLeagueKey || !selectedYahooLeagueSupported"
            @click="onYahooSubmit"
          >
            Use this league
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </template>

        <!-- Authenticated but no leagues found -->
        <template v-else-if="yahooConnected && !yahooLoading">
          <label class="form-label">No Yahoo baseball leagues found</label>
          <p class="form-help">
            We couldn't find any Yahoo baseball leagues on your account.
            Double-check that the Yahoo account you signed in with owns
            an MLB fantasy league this season.
          </p>
          <p v-if="yahooError" class="form-help" style="color: var(--accent-secondary);">
            {{ yahooError }}
          </p>
        </template>

        <!-- Not authenticated -->
        <template v-else>
          <label class="form-label">Sign in with Yahoo</label>
          <p class="form-help">
            Connect your Yahoo account once and we'll pull your league's
            standings, matchups, and categories automatically.
          </p>
          <p v-if="yahooError" class="form-help" style="color: var(--accent-secondary);">
            {{ yahooError }}
          </p>
          <button
            type="button"
            class="form-submit"
            @click="connectYahoo"
          >
            Sign in with Yahoo
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </template>
      </div>
    </section>

    <!-- ─── ESPN flow ──────────────────────────────────────────── -->
    <section
      v-if="selectedSport === 'baseball' && selectedPlatform === 'espn'"
      class="form-section"
    >
      <!-- Signin gate: ESPN credentials persist to the user's UFD
           account too. Without an account, the manual cookie / extension
           pull paths would silently lose state next visit. -->
      <div v-if="!authStore.isAuthenticated" class="signin-gate">
        <p class="signin-gate-eyebrow">
          <span class="signin-gate-eyebrow-bar" aria-hidden="true"></span>
          Almost there
        </p>
        <h2 class="signin-gate-headline">Sign into UFD to connect ESPN.</h2>
        <p class="signin-gate-body">
          Your ESPN connection stays linked to your UFD account so you
          don't have to reconnect every visit.
        </p>
        <button
          type="button"
          class="form-submit"
          @click="openSignup"
        >
          Sign in
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <form v-else class="connect-form" @submit.prevent="onEspnSubmit">
        <!-- Two-step ESPN readiness checklist.
             Step 1: Chrome extension installed (so we can read cookies).
             Step 2: User signed in to espn.com (so cookies exist).
             Each step shows checking / ok / missing independently; the
             user can see at a glance which prerequisite still needs
             attention. The "stored cookies" path collapses both steps
             to ok since the user already authed previously. -->
        <ol class="espn-steps" aria-label="ESPN connection prerequisites">
          <!-- Step 1: extension -->
          <li
            class="espn-step"
            :class="[
              `espn-step-${espnExtensionState}`,
              { 'espn-step-done': espnExtensionState === 'ok' },
            ]"
          >
            <span class="espn-step-marker" aria-hidden="true">
              <svg
                v-if="espnExtensionState === 'ok'"
                width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="3.2"
                stroke-linecap="round" stroke-linejoin="round"
              ><polyline points="20 6 9 17 4 12"/></svg>
              <span v-else-if="espnExtensionState === 'checking'" class="espn-step-spinner"></span>
              <span v-else class="espn-step-num">1</span>
            </span>
            <div class="espn-step-body">
              <p class="espn-step-title">Install the UFD Chrome extension</p>
              <p v-if="espnExtensionState === 'ok'" class="espn-step-status espn-step-status-ok">
                Detected.
              </p>
              <p v-else-if="espnExtensionState === 'checking'" class="espn-step-status">
                Checking…
              </p>
              <a
                v-else
                :href="extensionUrl"
                target="_blank"
                rel="noopener"
                class="espn-step-link"
              >
                Install extension
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M7 17L17 7M9 7h8v8"/>
                </svg>
              </a>
            </div>
          </li>

          <!-- Step 2: signed in to ESPN -->
          <li
            class="espn-step"
            :class="[
              `espn-step-${espnSignedInState}`,
              { 'espn-step-done': espnSignedInState === 'ok' },
            ]"
          >
            <span class="espn-step-marker" aria-hidden="true">
              <svg
                v-if="espnSignedInState === 'ok'"
                width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="3.2"
                stroke-linecap="round" stroke-linejoin="round"
              ><polyline points="20 6 9 17 4 12"/></svg>
              <span v-else-if="espnSignedInState === 'checking'" class="espn-step-spinner"></span>
              <span v-else class="espn-step-num">2</span>
            </span>
            <div class="espn-step-body">
              <p class="espn-step-title">Sign in to ESPN in this browser</p>
              <p v-if="espnSignedInState === 'ok'" class="espn-step-status espn-step-status-ok">
                Signed in.
              </p>
              <p v-else-if="espnSignedInState === 'checking'" class="espn-step-status">
                Checking…
              </p>
              <a
                v-else
                :href="espnSignInUrl"
                target="_blank"
                rel="noopener"
                class="espn-step-link"
              >
                Sign in at espn.com
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M7 17L17 7M9 7h8v8"/>
                </svg>
              </a>
            </div>
            <button
              v-if="espnSignedInState === 'missing' && espnExtensionState === 'ok'"
              type="button"
              class="espn-step-recheck"
              @click="refreshEspnCredsStatus"
              aria-label="Re-check ESPN sign-in status"
            >
              Re-check
            </button>
          </li>
        </ol>

        <label class="form-label" for="espn-league-id-input">
          Paste your ESPN baseball league ID
        </label>
        <input
          id="espn-league-id-input"
          v-model="espnLeagueIdInput"
          type="text"
          class="form-input"
          autocomplete="off"
          spellcheck="false"
          inputmode="numeric"
          placeholder="e.g. 123456"
          required
        />
        <p class="form-help">
          Find it in your ESPN league URL:
          <code>fantasy.espn.com/baseball/league?leagueId=<span class="form-help-em">[ID]</span></code>
        </p>

        <!-- Advanced: manual cookie entry (collapsed by default) -->
        <details class="espn-advanced">
          <summary class="espn-advanced-summary">
            Advanced: paste cookies manually
          </summary>
          <div class="espn-advanced-body">
            <label class="form-label form-label-sub" for="espn-s2-input">
              espn_s2
            </label>
            <input
              id="espn-s2-input"
              v-model="manualEspnS2"
              type="text"
              class="form-input form-input-mono"
              autocomplete="off"
              spellcheck="false"
              placeholder="AEA…"
            />
            <label class="form-label form-label-sub" for="espn-swid-input">
              SWID
            </label>
            <input
              id="espn-swid-input"
              v-model="manualSwid"
              type="text"
              class="form-input form-input-mono"
              autocomplete="off"
              spellcheck="false"
              placeholder="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"
            />
            <p class="form-help">
              Find these in your browser's cookies for
              <code>espn.com</code> while signed in to ESPN Fantasy.
            </p>
          </div>
        </details>

        <p v-if="espnError" class="form-error">{{ espnError }}</p>

        <button
          type="submit"
          class="form-submit"
          :disabled="!canSubmitEspn || espnBusy"
        >
          {{ espnBusy ? 'Connecting…' : 'Connect' }}
          <svg v-if="!espnBusy" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </form>
    </section>

    <!-- ─── Quiet back-to-demo escape hatch ────────────────────── -->
    <p class="connect-escape">
      <router-link to="/demo-categories/home" class="connect-escape-link">
        or browse the demo
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'
import { useLeaguesStore } from '@/stores/leaguesNew'
import type { League } from '@/types/supabase'
import { yahooService } from '@/services/yahoo'
import { espnService } from '@/services/espn'
import { classifyLeagueSupport, type UnsupportedKind } from '@/utils/leagueSupport'
import {
  isExtensionInstalled,
  getEspnCookiesFromExtension,
  getExtensionStoreUrl,
} from '@/services/espnExtension'

const router = useRouter()
const authStore = useAuthStore()
const platformsStore = usePlatformsStore()
// Page-level access to saved leagues so we can render the "pick up
// where you left off" section at the top for returning users.
const leaguesStore = useLeaguesStore()

// Hydrate the leagues list on mount if the user is signed in and
// we haven't fetched yet (e.g. deep-link visit straight to /connect).
onMounted(async () => {
  if (authStore.isAuthenticated && leaguesStore.leagues.length === 0) {
    try {
      await leaguesStore.fetchLeagues()
    } catch (err) {
      console.warn('[CategoryDemoConnect] fetchLeagues failed:', err)
    }
  }
})

// Short, friendly platform label for the saved-leagues list.
function platformLabel(p: string): string {
  if (p === 'espn') return 'ESPN'
  if (p === 'yahoo') return 'Yahoo'
  if (p === 'sleeper') return 'Sleeper'
  if (p === 'fantrax') return 'Fantrax'
  return p
}

// The platform's own mark, which does more scanning work in a long list
// than the word ever did. Falls back to the TLB monogram so an unknown
// platform renders a box rather than a broken image.
function platformLogo(p: string): string {
  if (p === 'espn') return '/platform/espn.png'
  if (p === 'yahoo') return '/platform/yahoo.png'
  if (p === 'sleeper') return '/platform/sleeper.svg'
  return '/tlb-favicon.png'
}

/**
 * Human label for a league's scoring format.
 *
 * Values differ per platform: Yahoo sends lowercase (`head`, `headpoint`,
 * `point`, `roto`), ESPN sends screaming snake (`H2H_CATEGORY`,
 * `H2H_POINTS`, `TOTAL_POINTS`, `ROTO`). Sleeper sends nothing at all.
 *
 * Returns null for anything unrecognised — the row then omits the field
 * entirely rather than displaying a raw enum or guessing a format. A
 * wrong "H2H points" badge on a category league would undermine every
 * number on the page it links to.
 */
function scoringLabel(raw: string | null | undefined): string | null {
  if (!raw) return null
  switch (String(raw).toLowerCase()) {
    case 'head':
    case 'h2h_category':
      return 'H2H categories'
    case 'headpoint':
    case 'h2h_points':
      return 'H2H points'
    case 'point':
    case 'total_points':
      return 'Total points'
    case 'roto':
      return 'Roto'
    case 'best_ball':
      return 'Best ball'
    default:
      return null
  }
}

/**
 * Collapse the flat league rows into one entry per league, with its
 * prior seasons attached.
 *
 * A league is one row per SEASON in Supabase (the upsert key is
 * user_id + platform + platform_league_id + season), and platforms mint
 * a fresh id every year — Yahoo's `league_key` changes each season — so
 * `platform_league_id` alone cannot join them.
 *
 * Two signals do the joining, unioned together:
 *   1. Exact lineage, where the platform reports it. Sleeper's league
 *      payload carries `previous_league_id`, which we persist.
 *   2. Name + platform + sport, for everything else.
 *
 * Signal 2 alone splits a league that was renamed between seasons —
 * the honest failure, two real rows rather than one wrong merge — and
 * signal 1 removes that failure wherever a platform supports it.
 */
type SavedLeagueGroup = {
  key: string
  current: League
  past: League[]
}

const savedLeagueGroups = computed<SavedLeagueGroup[]>(() => {
  const rows = leaguesStore.leagues

  // Union-find over two independent signals. Exact lineage merges what
  // it can; the name heuristic catches the rest. Running both means a
  // platform that reports lineage never depends on names matching, and
  // one that doesn't still groups.
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    // Self-seed unknown ids. Without this, `parent.get(x)` is undefined,
    // never equals `x`, and the walk below spins forever — an infinite
    // loop in a computed, which would lock the tab rather than fail
    // loudly. Every caller currently passes a seeded row id, so this is
    // a guard against a future one that does not.
    if (!parent.has(x)) parent.set(x, x)
    let root = x
    while (parent.get(root) !== root) root = parent.get(root)!
    // Path compression, so deep season chains stay cheap.
    let cur = x
    while (cur !== root) {
      const next = parent.get(cur)!
      parent.set(cur, root)
      cur = next
    }
    return root
  }
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  for (const l of rows) parent.set(l.id, l.id)

  // Signal 1 — name identity, within one platform and sport.
  const byName = new Map<string, string>()
  for (const l of rows) {
    const key = [l.platform, l.sport, (l.league_name ?? '').trim().toLowerCase()].join('|')
    const seen = byName.get(key)
    if (seen) union(l.id, seen)
    else byName.set(key, l.id)
  }

  // Signal 2 — exact season lineage. Sleeper hands us `previous_league_id`
  // on the league payload and we persist it; a row whose pointer names
  // another row's platform_league_id is the same league, one year on.
  // (Yahoo has the equivalent in its `renew` field, but it is absent
  // from the leagues-list response — reading it would cost one extra API
  // call per league on every sync, so Yahoo stays on the name signal.)
  const byPlatformId = new Map<string, string>()
  for (const l of rows) {
    byPlatformId.set(`${l.platform}|${l.platform_league_id}`, l.id)
  }
  for (const l of rows) {
    const prev = (l.settings as Record<string, unknown> | null)?.previous_league_id
    if (!prev) continue
    const prevRowId = byPlatformId.get(`${l.platform}|${String(prev)}`)
    if (prevRowId) union(l.id, prevRowId)
  }

  const buckets = new Map<string, League[]>()
  for (const l of rows) {
    const root = find(l.id)
    const bucket = buckets.get(root)
    if (bucket) bucket.push(l)
    else buckets.set(root, [l])
  }

  const seasonOf = (l: League) => Number(l.season) || 0

  const groups: SavedLeagueGroup[] = []
  for (const [key, bucket] of buckets) {
    const sorted = [...bucket].sort((a, b) => seasonOf(b) - seasonOf(a))
    groups.push({ key, current: sorted[0], past: sorted.slice(1) })
  }

  // Most recent season first so the live league is at the top, then
  // alphabetical. The old list was name-ordered only, which scattered
  // 2024 archives among this year's leagues.
  return groups.sort((a, b) => {
    const bySeason = seasonOf(b.current) - seasonOf(a.current)
    if (bySeason !== 0) return bySeason
    return (a.current.league_name ?? '').localeCompare(b.current.league_name ?? '')
  })
})

// Bubbles to App.vue, which owns the AuthModal. The demo layout
// already forwards `open-signup` from its child router-view.
const emit = defineEmits<{ (e: 'open-signup'): void }>()

function openSignup(): void {
  emit('open-signup')
}

type Sport = 'baseball' | 'football' | 'basketball' | 'hockey'
type Platform = 'sleeper' | 'yahoo' | 'espn'

const selectedSport = ref<Sport | null>(null)
const selectedPlatform = ref<Platform | null>(null)
const leagueIdInput = ref('')
const sleeperError = ref('')

/**
 * Map Sleeper's sport code onto our `Sport` vocabulary. Returns null for
 * anything unrecognised so the caller can proceed rather than block on a
 * sport we simply do not know about.
 */
function sleeperSport(raw: string | null | undefined): string | null {
  if (!raw) return null
  switch (String(raw).toLowerCase()) {
    case 'nfl': return 'football'
    case 'mlb': return 'baseball'
    case 'nba': return 'basketball'
    case 'nhl': return 'hockey'
    default: return null
  }
}

// ─── Yahoo state ────────────────────────────────────────────────
interface YahooLeagueOption {
  league_key: string
  name: string
  season: string
  scoring_type: string
}
const yahooConnected = ref(false)
const yahooLoading = ref(false)
const yahooError = ref<string | null>(null)
const yahooLeagues = ref<YahooLeagueOption[]>([])
const selectedYahooLeagueKey = ref('')

/** Yahoo leagues with their support classification attached. Drives the
 *  picker UI: supported leagues are selectable, unsupported are listed
 *  with a "coming soon" tag and disabled — so the user can see what
 *  TLB covers without going through OAuth + connect only to hit the
 *  notice page. */
const yahooLeaguesClassified = computed(() =>
  yahooLeagues.value.map((l) => {
    const support = classifyLeagueSupport({ sport: 'baseball', scoring_type: l.scoring_type })
    const unsupportedKind = support.ok ? null : support.kind
    const suffix = unsupportedKindSuffix(unsupportedKind)
    return {
      ...l,
      supported: support.ok,
      unsupportedKind,
      suffix,
    }
  }),
)

/** Short suffix appended to unsupported league names in the dropdown
 *  so the user knows why a league is disabled at a glance. */
function unsupportedKindSuffix(kind: UnsupportedKind | null): string {
  if (!kind) return ''
  switch (kind) {
    case 'roto':        return ' — Rotisserie, not covered yet'
    case 'points':      return ' — H2H Points, not covered yet'
    case 'football':    return ' — Football coverage lands in September'
    case 'other-sport': return ' — not covered yet'
    case 'unknown':     return ' — format not recognized yet'
  }
}

/** True when the currently-selected Yahoo league is supported, so the
 *  "Use this league" button stays enabled. Belt-and-suspenders — the
 *  unsupported options are disabled too. */
const selectedYahooLeagueSupported = computed(() => {
  const sel = yahooLeaguesClassified.value.find(
    (l) => l.league_key === selectedYahooLeagueKey.value,
  )
  return sel?.supported ?? false
})

// ─── ESPN state ─────────────────────────────────────────────────
// We track the two prerequisites independently so the UI can show
// per-step readiness instead of a single conflated status pill.
type EspnStepState = 'checking' | 'ok' | 'missing'
const espnExtensionState = ref<EspnStepState>('checking')
const espnSignedInState  = ref<EspnStepState>('checking')
// `espnCredsStatus` is kept as a derived signal because downstream
// flows (submit handler, "stored cookies" path) still read it. Maps
// the two-step state back to the existing 4-value status.
const espnCredsStatus = computed<'checking' | 'detected' | 'stored' | 'missing'>(() => {
  if (espnExtensionState.value === 'checking' || espnSignedInState.value === 'checking') {
    return 'checking'
  }
  const stored = platformsStore.getEspnCredentials()
  if (stored?.espn_s2 && stored?.swid) return 'stored'
  if (espnExtensionState.value === 'ok' && espnSignedInState.value === 'ok') return 'detected'
  return 'missing'
})
const espnLeagueIdInput = ref('')
const manualEspnS2 = ref('')
const manualSwid = ref('')
const espnError = ref<string | null>(null)
const espnBusy = ref(false)
const extensionUrl = getExtensionStoreUrl()
// Sign-in target on ESPN — used by step 2's CTA. Generic enough to
// cover any future entry point; the league-detail page works as well.
const espnSignInUrl = 'https://www.espn.com/fantasy/baseball/'

const canSubmitEspn = computed(() => {
  if (!espnLeagueIdInput.value.trim()) return false
  if (espnCredsStatus.value === 'detected' || espnCredsStatus.value === 'stored') return true
  return !!(manualEspnS2.value.trim() && manualSwid.value.trim())
})

function pickSport(sport: Sport): void {
  selectedSport.value = sport
  // Auto-select Sleeper since it's the default; user can switch to Yahoo or ESPN.
  selectedPlatform.value = 'sleeper'
}

function pickPlatform(platform: Platform): void {
  selectedPlatform.value = platform
  if (platform === 'yahoo') {
    void initializeYahoo()
  } else if (platform === 'espn') {
    espnError.value = null
    void refreshEspnCredsStatus()
  }
}

/**
 * Probe both prerequisites independently so the UI can render
 * per-step readiness:
 *   - `espnExtensionState`: is the UFD Chrome extension installed?
 *   - `espnSignedInState`:  are ESPN cookies readable (i.e. the user
 *     is signed in to espn.com in this browser)?
 *
 * If stored cookies exist on the platforms store, both steps short-
 * circuit to "ok" — the user already authed at some point.
 */
async function refreshEspnCredsStatus(): Promise<void> {
  espnExtensionState.value = 'checking'
  espnSignedInState.value  = 'checking'

  // Short-circuit: if cookies were stored from a previous session,
  // both prerequisites are effectively satisfied.
  const stored = platformsStore.getEspnCredentials()
  if (stored?.espn_s2 && stored?.swid) {
    espnExtensionState.value = 'ok'
    espnSignedInState.value  = 'ok'
    return
  }

  try {
    const installed = await isExtensionInstalled()
    espnExtensionState.value = installed ? 'ok' : 'missing'
    if (installed) {
      const cookies = await getEspnCookiesFromExtension()
      espnSignedInState.value =
        cookies.espn_s2 && cookies.swid ? 'ok' : 'missing'
    } else {
      // Without the extension we can't probe ESPN cookies from the
      // browser at all. Treat sign-in as "missing" until the
      // extension is installed.
      espnSignedInState.value = 'missing'
    }
  } catch {
    espnExtensionState.value = 'missing'
    espnSignedInState.value  = 'missing'
  }
}

onMounted(() => {
  // Pre-warm ESPN cred status so the pill is correct the moment the
  // user picks the platform. Cheap — short-circuits in non-Chromium.
  void refreshEspnCredsStatus()
})

async function onSubmit(): Promise<void> {
  const id = leagueIdInput.value.trim()
  if (!id || selectedPlatform.value !== 'sleeper') return
  sleeperError.value = ''
  // Persist the connection so it appears in the switcher across
  // sessions, then route to the live-league URL by Supabase UUID.
  // The fetch is just to grab the league's display name + size from
  // the Sleeper API — best-effort, the row save tolerates failures.
  let leagueRowId: string | undefined
  if (authStore.isAuthenticated) {
    try {
      const meta = await fetch(`https://api.sleeper.app/v1/league/${id}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)

      // Sleeper league IDs carry no sport in them, so nothing stops a
      // football league ID being pasted into the baseball form or vice
      // versa. The payload knows the truth; refuse rather than file a
      // league under the wrong sport and poison every story built on it.
      const chosenSport = selectedSport.value
      const metaSport = sleeperSport(meta?.sport)
      if (metaSport && metaSport !== chosenSport) {
        sleeperError.value =
          `That league ID is a Sleeper ${metaSport} league. ` +
          `You're connecting a ${chosenSport} league — pick ${metaSport} above, or check the ID.`
        return
      }

      const result = await platformsStore.syncSleeperLeague(
        {
          league_id: id,
          name: meta?.name ?? `Sleeper League ${id}`,
          season: String(meta?.season ?? new Date().getFullYear()),
          total_rosters: meta?.total_rosters,
          previous_league_id: meta?.previous_league_id ?? null,
          scoring_settings: meta?.scoring_settings ?? null,
          settings: meta?.settings ?? null,
        },
        // The sport the user picked, validated against the payload
        // above — never a hardcoded default.
        chosenSport as Sport,
      )
      if (result.success) {
        leagueRowId = result.leagueRowId
        // Pull the new row into the store before navigating. The
        // destination resolves the league from the store, and without
        // this it reports "this league couldn't be resolved" for a
        // league that was just created successfully.
        try {
          await leaguesStore.fetchLeagues()
        } catch (err) {
          console.warn('[CategoryDemoConnect] refresh after connect failed:', err)
        }
      }
    } catch (err) {
      console.warn('[CategoryDemoConnect] Sleeper persist failed:', err)
    }
  }
  if (leagueRowId) {
    router.push(`/leagues/${leagueRowId}/the-beat`)
  } else {
    // Anonymous user or save failed — fall back to legacy query-param
    // route so the demo still works without the persisted record.
    router.push({
      path: '/demo-categories/home',
      query: { leagueId: id, platform: 'sleeper', sport: selectedSport.value },
    })
  }
}

/**
 * Check the user's Yahoo connection state and, if connected, fetch
 * their baseball leagues. The check uses `platformsStore` (loaded
 * from `connected_platforms` in Supabase on app init); if the user
 * isn't signed in to the app at all, we fall back to the "Sign in
 * with Yahoo" CTA which will surface the auth flow.
 */
async function initializeYahoo(): Promise<void> {
  yahooError.value = null

  // Refresh platforms store if it's empty but user is authenticated
  // (handles direct-link visits where the store wasn't pre-populated).
  if (
    authStore.isAuthenticated &&
    platformsStore.connectedPlatforms.length === 0
  ) {
    try {
      await platformsStore.fetchConnectedPlatforms()
    } catch (err) {
      console.warn('[CategoryDemoConnect] failed to refresh platforms:', err)
    }
  }

  yahooConnected.value = platformsStore.isYahooConnected
  if (!yahooConnected.value) return

  yahooLoading.value = true
  try {
    if (!authStore.user?.id) {
      throw new Error('Please sign in to load your Yahoo leagues.')
    }
    const initialized = await yahooService.initialize(authStore.user.id)
    if (!initialized) {
      throw new Error('Yahoo connection is invalid. Please reconnect.')
    }
    const leagues = await yahooService.getLeagues('baseball')
    // Prefer this season's leagues at the top; the service already
    // sorts by season desc, so just normalize the shape.
    yahooLeagues.value = leagues.map((l) => ({
      league_key: l.league_key,
      name: l.name,
      season: l.season,
      scoring_type: l.scoring_type,
    }))
  } catch (err) {
    console.error('[CategoryDemoConnect] Yahoo league fetch failed:', err)
    yahooError.value = (err as Error).message || 'Failed to load Yahoo leagues.'
  } finally {
    yahooLoading.value = false
  }
}

function connectYahoo(): void {
  if (!authStore.isAuthenticated) {
    // Should not be reachable — the signin gate above hides the
    // Yahoo CTA when anonymous — but keep the fallback for safety.
    emit('open-signup')
    return
  }
  // Remember where we came from so the Yahoo callback can drop the
  // user back on the connect picker (instead of the app shell home)
  // and resume the league-selection step.
  try {
    localStorage.setItem('ufd_yahoo_oauth_origin', '/demo-categories/connect')
  } catch {
    // Private mode or quota — non-fatal; callback will use its default.
  }
  platformsStore.connectYahoo()
}

async function onYahooSubmit(): Promise<void> {
  const key = selectedYahooLeagueKey.value.trim()
  if (!key) return
  // syncYahooLeagues already persists every league the OAuth account
  // can see; we just need to fetch the freshly-saved row to learn its
  // UUID for the redirect target.
  let leagueRowId: string | undefined
  if (authStore.isAuthenticated) {
    try {
      await platformsStore.syncYahooLeagues('baseball')
      // The store updates `leagues` rows; re-read to find the one the
      // user just picked. We match by platform_league_id (= league_key
      // in Yahoo's vocabulary).
      const leaguesStore = useLeaguesStore()
      if (leaguesStore.leagues.length === 0) await leaguesStore.fetchLeagues()
      const row = leaguesStore.leagues.find(
        (l) => l.platform === 'yahoo' && l.platform_league_id === key,
      )
      if (row) leagueRowId = row.id
    } catch (err) {
      console.warn('[CategoryDemoConnect] Yahoo persist failed:', err)
    }
  }
  if (leagueRowId) {
    router.push(`/leagues/${leagueRowId}/the-beat`)
  } else {
    router.push({
      path: '/demo-categories/home',
      query: { leagueId: key, platform: 'yahoo' },
    })
  }
}

/**
 * ESPN connect flow. Three credential paths:
 *   1) Chrome extension already detected — just navigate; the adapter
 *      pulls cookies on demand at page load.
 *   2) Cookies already stored — same, adapter reads from platformsStore.
 *   3) User pasted manual creds — persist via platformsStore (which
 *      also validates against the target league), then navigate.
 */
async function onEspnSubmit(): Promise<void> {
  const id = espnLeagueIdInput.value.trim()
  if (!id || selectedPlatform.value !== 'espn') return
  espnError.value = null
  espnBusy.value = true
  try {
    if (manualEspnS2.value.trim() && manualSwid.value.trim()) {
      const result = await platformsStore.storeEspnCredentials({
        espn_s2: manualEspnS2.value.trim(),
        swid: manualSwid.value.trim(),
        leagueId: id,
        sport: 'baseball',
        season: new Date().getFullYear(),
      })
      if (!result.success) {
        espnError.value = result.error || 'Could not validate ESPN cookies.'
        return
      }
    }
    // Attempt to fetch the real league info (name, size) from ESPN
    // before persisting. Without this the syncEspnLeague fallback
    // writes a placeholder name like "ESPN baseball League 6416",
    // which then surfaces on the masthead until the user manually
    // renames. Non-fatal — if the fetch fails (creds not yet warm,
    // league not accessible), the placeholder ships and the
    // backfill in loadBeat/loadIssue self-heals on first page load.
    let leagueInfo: { name: string; size: number; scoringType?: string } | undefined
    try {
      const espnLeague = await espnService.getLeague(
        'baseball',
        id,
        new Date().getFullYear(),
      )
      if (espnLeague?.name) {
        leagueInfo = {
          name: espnLeague.name,
          size: espnLeague.size || 0,
          // ESPN reports the format on the league itself
          // (H2H_CATEGORY / H2H_POINTS / ROTO / TOTAL_POINTS).
          // syncEspnLeague has always accepted it; it was simply never
          // passed, which is why ESPN rows showed no scoring format.
          scoringType: espnLeague.scoringType,
        }
      }
    } catch (err) {
      console.warn('[CategoryDemoConnect] ESPN league pre-fetch failed:', err)
    }

    // Persist the league row to power the switcher across sessions.
    let leagueRowId: string | undefined
    if (authStore.isAuthenticated) {
      try {
        const result = await platformsStore.syncEspnLeague(
          id,
          'baseball',
          new Date().getFullYear(),
          leagueInfo,
        )
        if (result.success) leagueRowId = result.leagueRowId
      } catch (err) {
        console.warn('[CategoryDemoConnect] ESPN persist failed:', err)
      }
    }
    if (leagueRowId) {
      router.push(`/leagues/${leagueRowId}/the-beat`)
    } else {
      router.push({
        path: '/demo-categories/home',
        query: { leagueId: id, platform: 'espn' },
      })
    }
  } catch (err) {
    espnError.value = (err as Error).message || 'Failed to connect ESPN league.'
  } finally {
    espnBusy.value = false
  }
}
</script>

<style scoped>
/* Tokens (--ink-N, --accent-*) inherited from .demo-shell. */
.connect {
  display: flex;
  flex-direction: column;
  gap: 40px;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
  max-width: 880px;
  margin: 0 auto;
  padding-top: 16px;
}

/* ─── Saved leagues (pick-up-where-you-left-off) ──────────────── */
.saved-leagues {
  margin-bottom: 56px;
  padding: 28px;
  border-radius: 14px;
  background: oklch(0.10 0.015 90 / 0.55);
  border: 1px solid oklch(0.20 0.015 90);
}
.saved-leagues-head {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}
.saved-leagues-headline {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 800;
  font-size: clamp(1.4rem, 2.6vw, 2rem);
  letter-spacing: -0.015em;
  line-height: 1.05;
  color: var(--ink-1);
}
.saved-leagues-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
/* The card frame lives on the row, not the link, so the past-seasons
   strip sits INSIDE the same box as the league it belongs to. With the
   frame on the link, that strip floated between cards and read as
   belonging to neither. */
.saved-leagues-row {
  border-radius: 10px;
  background: oklch(0.07 0.014 90 / 0.55);
  border: 1px solid oklch(0.18 0.015 90);
  overflow: hidden;
  transition: background-color 140ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .saved-leagues-row:hover {
    background: oklch(0.10 0.014 90);
    border-color: oklch(0.78 0.18 92 / 0.40);
  }
}
.saved-leagues-link {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-areas:
    "logo name arrow"
    "logo meta arrow";
  align-items: center;
  gap: 2px 14px;
  padding: 14px 20px;
  text-decoration: none;
  color: var(--ink-1);
}
@media (hover: hover) and (pointer: fine) {
  .saved-leagues-row:hover .saved-leagues-arrow {
    transform: translateX(2px);
  }
}
.saved-leagues-link:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: -2px;
  border-radius: 10px;
}
.saved-leagues-name {
  grid-area: name;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: var(--ink-1);
}
.saved-leagues-meta {
  grid-area: meta;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.saved-leagues-dot { opacity: 0.5; }

.saved-leagues-logo {
  grid-area: logo;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  object-fit: contain;
  flex-shrink: 0;
}

/* Sport carries a colour so a mixed baseball/football list is scannable
   without reading a word of it. */
.saved-leagues-sport { color: var(--ink-2); }
.saved-leagues-sport.sport-baseball   { color: oklch(0.74 0.18 145); }
.saved-leagues-sport.sport-football   { color: oklch(0.78 0.18 92); }
.saved-leagues-sport.sport-basketball { color: oklch(0.72 0.19 55); }
.saved-leagues-sport.sport-hockey     { color: oklch(0.72 0.18 195); }

/* Past seasons of the same league. Deliberately quiet — this is an
   archive, not the thing most people came for. */
.saved-leagues-seasons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0 20px 0 68px;
  padding: 10px 0 12px;
  border-top: 1px solid oklch(0.16 0.015 90);
}
.saved-leagues-seasons-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: oklch(0.45 0.010 90);
}
.saved-leagues-season-chip {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--ink-3);
  text-decoration: none;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid oklch(0.22 0.015 90);
  transition: color 140ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .saved-leagues-season-chip:hover {
    color: var(--ink-1);
    border-color: oklch(0.78 0.18 92 / 0.50);
  }
}
.saved-leagues-season-chip:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

@media (max-width: 560px) {
  .saved-leagues-seasons { margin-left: 20px; }
}
.saved-leagues-arrow {
  grid-area: arrow;
  color: var(--ink-3);
  transition: transform 140ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* "or add another" divider — kept quiet so the saved-leagues list
   reads as the primary CTA. */
.saved-leagues-sep {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 24px;
  color: var(--ink-3);
}
.saved-leagues-sep-line {
  flex: 1;
  height: 1px;
  background: oklch(0.18 0.015 90);
}
.saved-leagues-sep-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

/* ─── Header ──────────────────────────────────────────────────── */
.connect-head { display: flex; flex-direction: column; gap: 10px; }
.connect-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 0;
}
.connect-eyebrow-bar {
  display: inline-block;
  width: 28px;
  height: 2px;
  background: var(--accent-secondary);
  border-radius: 1px;
}
.connect-eyebrow-step {
  color: var(--accent-tertiary);
  margin-bottom: 16px;
}
.connect-eyebrow-step .connect-eyebrow-bar {
  background: var(--accent-tertiary);
}
.connect-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.6rem, 6vw, 4.2rem);
  line-height: 0.96;
  letter-spacing: -0.01em;
  margin: 0;
  color: var(--ink-1);
}
.connect-deck {
  font-size: 1.02rem;
  line-height: 1.4;
  color: var(--ink-2);
  max-width: 540px;
  margin: 0;
}

/* ─── Sport grid ──────────────────────────────────────────────── */
.sport-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.sport-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  padding: 22px 22px 18px;
  background: oklch(0.10 0.014 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 14px;
  text-align: left;
  font: inherit;
  color: var(--ink-1);
  transition:
    transform 200ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 200ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
.sport-card-active { cursor: pointer; }
@media (hover: hover) and (pointer: fine) {
  .sport-card-active:hover {
    background: oklch(0.13 0.016 90);
    border-color: oklch(0.32 0.012 90);
    transform: translateY(-2px);
  }
}
.sport-card-active:active { transform: scale(0.985); transition-duration: 100ms; }
.sport-card-active:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
.sport-card-selected {
  background: oklch(0.13 0.016 90);
  border-color: var(--accent-primary);
  box-shadow: inset 0 0 0 1px oklch(0.78 0.18 92 / 0.40);
}
.sport-card-inactive { opacity: 0.45; pointer-events: none; }
.sport-card-art { color: var(--accent-tertiary); display: inline-flex; }
.sport-card-selected .sport-card-art { color: var(--accent-primary); }
.sport-card-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.5rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--ink-1);
}
.sport-card-pill {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 999px;
}
.sport-card-pill-available {
  color: var(--accent-up);
  background: oklch(0.74 0.18 145 / 0.10);
  border: 1px solid oklch(0.74 0.18 145 / 0.32);
}
.sport-card-pill-soon {
  color: var(--ink-3);
  background: oklch(0.20 0.015 90 / 0.5);
  border: 1px solid oklch(0.32 0.012 90);
}

/* ─── Platform sub-picker ─────────────────────────────────────── */
.platform-section { display: flex; flex-direction: column; }
.platform-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.platform-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px 18px;
  background: oklch(0.10 0.014 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 12px;
  text-align: left;
  font: inherit;
  color: var(--ink-1);
  transition:
    transform 200ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 200ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
.platform-card-active { cursor: pointer; }
@media (hover: hover) and (pointer: fine) {
  .platform-card-active:hover {
    background: oklch(0.13 0.016 90);
    border-color: oklch(0.32 0.012 90);
    transform: translateY(-1px);
  }
}
.platform-card-active:active { transform: scale(0.985); transition-duration: 100ms; }
.platform-card-active:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
.platform-card-selected {
  background: oklch(0.13 0.016 90);
  border-color: var(--accent-primary);
  box-shadow: inset 0 0 0 1px oklch(0.78 0.18 92 / 0.40);
}
.platform-card-inactive { opacity: 0.40; pointer-events: none; }
.platform-card-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.platform-card-pill {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.60rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 999px;
}
.platform-card-pill-available {
  color: var(--accent-up);
  background: oklch(0.74 0.18 145 / 0.10);
  border: 1px solid oklch(0.74 0.18 145 / 0.32);
}
.platform-card-pill-soon {
  color: var(--ink-3);
  background: oklch(0.20 0.015 90 / 0.5);
  border: 1px solid oklch(0.32 0.012 90);
}

/* ─── Form ────────────────────────────────────────────────────── */
.form-section { display: flex; flex-direction: column; }
.connect-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: oklch(0.10 0.014 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 14px;
  padding: 22px;
}
.form-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-2);
}
.form-label-sub {
  font-size: 0.7rem;
  margin-top: 4px;
  color: var(--ink-3);
}
.form-input {
  font: inherit;
  font-size: 1rem;
  color: var(--ink-1);
  background: oklch(0.06 0.014 90);
  border: 1px solid oklch(0.32 0.012 90);
  border-radius: 10px;
  padding: 12px 14px;
  outline: none;
  transition: border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.form-input-mono {
  font-family: 'Barlow Condensed', monospace;
  font-size: 0.86rem;
  letter-spacing: 0.02em;
}
.form-input::placeholder { color: oklch(0.36 0.010 90); }
.form-input:focus { border-color: var(--accent-primary); }
.form-help {
  margin: 0;
  font-size: 0.84rem;
  color: var(--ink-3);
}
.form-help code {
  font-family: 'Barlow Condensed', monospace;
  font-size: 0.82rem;
  background: oklch(0.06 0.014 90);
  border: 1px solid oklch(0.20 0.015 90);
  padding: 1px 6px;
  border-radius: 5px;
  color: var(--ink-2);
}
.form-help-em { color: var(--accent-tertiary); }
.form-error {
  margin: 0;
  font-size: 0.86rem;
  color: oklch(0.66 0.18 30);
}
.form-submit {
  align-self: flex-start;
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--accent-primary);
  color: oklch(0.10 0.012 90);
  border: none;
  padding: 11px 18px;
  border-radius: 999px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.96rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), filter 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.form-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
@media (prefers-reduced-motion: no-preference) {
  .form-submit:not(:disabled):hover { transform: translateY(-1px); }
}
.form-submit:not(:disabled):active { transform: scale(0.97); transition-duration: 100ms; }
.form-submit:focus-visible {
  outline: 2px solid var(--ink-1);
  outline-offset: 2px;
}

/* ─── Signin gate (shown when anonymous + picked Yahoo or ESPN) ── */
.signin-gate {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: oklch(0.10 0.014 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 14px;
  padding: 22px;
}
.signin-gate-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
  margin: 0;
}
.signin-gate-eyebrow-bar {
  display: inline-block;
  width: 22px;
  height: 2px;
  background: var(--accent-tertiary);
  border-radius: 1px;
}
.signin-gate-headline {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.5rem, 3vw, 1.9rem);
  line-height: 1.05;
  letter-spacing: -0.005em;
  color: var(--ink-1);
}
.signin-gate-body {
  margin: 0 0 4px;
  font-size: 0.94rem;
  line-height: 1.45;
  color: var(--ink-2);
  max-width: 520px;
}

/* ─── ESPN credential status pill ─────────────────────────────── */
.espn-status {
  display: flex;
  margin-bottom: 6px;
}
.espn-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 6px 12px;
  border-radius: 999px;
}
.espn-status-pill-ok {
  color: var(--accent-up);
  background: oklch(0.74 0.18 145 / 0.10);
  border: 1px solid oklch(0.74 0.18 145 / 0.32);
}
.espn-status-pill-warn {
  color: oklch(0.78 0.16 60);
  background: oklch(0.78 0.16 60 / 0.10);
  border: 1px solid oklch(0.78 0.16 60 / 0.32);
}
.espn-status-pill-mute {
  color: var(--ink-3);
  background: oklch(0.20 0.015 90 / 0.5);
  border: 1px solid oklch(0.32 0.012 90);
}
.espn-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  display: inline-block;
}
.espn-status-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ─── ESPN two-step prerequisite checklist ────────────────────── */
.espn-steps {
  list-style: none;
  margin: 0 0 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: 10px;
  background: oklch(0.10 0.015 90 / 0.55);
  border: 1px solid oklch(0.20 0.015 90);
}
.espn-step {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: oklch(0.07 0.014 90 / 0.55);
  border: 1px solid transparent;
  transition: background-color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.espn-step-ok      { border-color: oklch(0.74 0.18 145 / 0.30); background: oklch(0.74 0.18 145 / 0.06); }
.espn-step-missing { border-color: oklch(0.78 0.16 60  / 0.30); background: oklch(0.78 0.16 60  / 0.06); }
.espn-step-checking { border-color: oklch(0.32 0.012 90); }

.espn-step-marker {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.85rem;
  font-weight: 800;
  background: oklch(0.20 0.015 90);
  color: var(--ink-2);
}
.espn-step-ok .espn-step-marker {
  background: var(--accent-up);
  color: oklch(0.10 0.05 145);
}
.espn-step-missing .espn-step-marker {
  background: oklch(0.78 0.16 60);
  color: oklch(0.10 0.05 60);
}
.espn-step-num {
  line-height: 1;
}
.espn-step-spinner {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid oklch(0.32 0.012 90);
  border-top-color: var(--ink-2);
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes espn-step-spin { to { transform: rotate(360deg); } }
  .espn-step-spinner { animation: espn-step-spin 0.85s linear infinite; }
}

.espn-step-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
}
.espn-step-title {
  margin: 0;
  font-size: 0.94rem;
  font-weight: 700;
  color: var(--ink-1);
}
.espn-step-done .espn-step-title {
  color: var(--ink-2);
}
.espn-step-status {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.espn-step-status-ok {
  color: var(--accent-up);
}
.espn-step-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: oklch(0.78 0.16 60);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
.espn-step-link:hover {
  color: oklch(0.85 0.16 60);
}
.espn-step-recheck {
  align-self: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-2);
  background: transparent;
  border: 1px solid oklch(0.32 0.012 90);
  border-radius: 999px;
  padding: 4px 10px;
  cursor: pointer;
  transition: border-color 140ms cubic-bezier(0.22, 1, 0.36, 1),
              color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
.espn-step-recheck:hover {
  color: var(--ink-1);
  border-color: oklch(0.55 0.010 90);
}
.espn-step-recheck:active {
  transform: scale(0.97);
}

/* ─── ESPN advanced (manual cookie entry) ─────────────────────── */
.espn-advanced {
  margin-top: 4px;
  border-top: 1px dashed oklch(0.20 0.015 90);
  padding-top: 12px;
}
.espn-advanced-summary {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  cursor: pointer;
  user-select: none;
  list-style: none;
}
.espn-advanced-summary::-webkit-details-marker { display: none; }
.espn-advanced-summary::before {
  content: '+ ';
  color: var(--accent-tertiary);
}
.espn-advanced[open] .espn-advanced-summary::before { content: '\2212 '; }
.espn-advanced-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

/* ─── Escape hatch ────────────────────────────────────────────── */
.connect-escape {
  margin: 8px 0 0;
  text-align: center;
}
.connect-escape-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.84rem;
  color: var(--ink-3);
  text-decoration: none;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .connect-escape-link:hover { color: var(--ink-1); }
}
.connect-escape-link:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* ─── Responsive ──────────────────────────────────────────────── */
@media (max-width: 720px) {
  .connect { gap: 32px; padding-top: 8px; }
  .sport-grid { grid-template-columns: 1fr; }
  .platform-grid { grid-template-columns: 1fr; }
  .connect-form { padding: 18px; }
}
</style>

<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="$emit('close')"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      
      <!-- Modal -->
      <div class="relative bg-dark-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-dark-border/50">
        <!-- Header -->
        <div class="p-6 text-center border-b border-dark-border/30">
          <div class="text-4xl mb-2">🏆</div>
          <h2 class="text-2xl font-bold text-dark-text">Add a League</h2>
          <p class="text-sm text-dark-textMuted mt-1">
            Connect your fantasy league to get started
          </p>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4">
          <!-- Step 0: Choose Platform -->
          <div v-if="step === 0">
            <p class="text-sm text-dark-textMuted mb-4 text-center">Choose your fantasy platform</p>
            
            <div class="space-y-3">
              <!-- Sleeper Option -->
              <button
                @click="selectPlatform('sleeper')"
                class="w-full flex items-center gap-4 p-4 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-blue-500/50 hover:bg-dark-border/30 transition-all text-left"
              >
                <img src="/sleeper.svg" alt="Sleeper" class="w-12 h-12 rounded-xl flex-shrink-0" />
                <div class="flex-1">
                  <div class="font-semibold text-dark-text">Sleeper</div>
                  <div class="text-xs text-dark-textMuted">Enter username to find leagues</div>
                </div>
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <!-- Yahoo Option -->
              <button
                @click="selectPlatform('yahoo')"
                class="w-full flex items-center gap-4 p-4 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-purple-500/50 hover:bg-dark-border/30 transition-all text-left"
              >
                <img src="/yahoo-fantasy.svg" alt="Yahoo" class="w-12 h-12 rounded-xl flex-shrink-0" />
                <div class="flex-1">
                  <div class="font-semibold text-dark-text flex items-center gap-2">
                    Yahoo Fantasy
                    <span v-if="platformsStore.isYahooConnected" class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                      Connected
                    </span>
                  </div>
                  <div class="text-xs text-dark-textMuted">
                    {{ platformsStore.isYahooConnected ? 'Select from your Yahoo leagues' : 'Sign in with Yahoo to connect' }}
                  </div>
                </div>
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <!-- ESPN Option (Now Enabled!) -->
              <button
                @click="selectPlatform('espn')"
                class="w-full flex items-center gap-4 p-4 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-[#0719b2]/50 hover:bg-dark-border/30 transition-all text-left"
              >
                <img src="/espn-logo.svg" alt="ESPN" class="w-12 h-12 rounded-xl flex-shrink-0" />
                <div class="flex-1">
                  <div class="font-semibold text-dark-text flex items-center gap-2">
                    ESPN Fantasy
                    <span v-if="platformsStore.hasEspnCredentials" class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                      Connected
                    </span>
                  </div>
                  <div class="text-xs text-dark-textMuted">Enter league ID to connect</div>
                </div>
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Step 1: Enter Sleeper Username -->
          <div v-if="step === 1 && selectedPlatform === 'sleeper'">
            <div class="flex items-center gap-2 mb-4">
              <button @click="step = 0" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <img src="/sleeper.svg" alt="Sleeper" class="w-8 h-8 rounded-lg" />
              <span class="text-sm text-dark-textMuted">Connect Sleeper</span>
            </div>
            
            <label class="block text-sm font-medium text-dark-textMuted mb-2">
              Sleeper Username
            </label>
            <input
              v-model="username"
              type="text"
              placeholder="Enter your Sleeper username"
              class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-dark-text"
              @keyup.enter="searchSleeperLeagues"
            />
            
            <div v-if="errorMessage" class="text-red-400 text-sm mt-2">
              {{ errorMessage }}
            </div>
            
            <button
              @click="searchSleeperLeagues"
              :disabled="!username.trim() || loading"
              class="w-full mt-4 px-4 py-3 rounded-xl bg-primary text-gray-900 font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <span v-if="loading">Searching...</span>
              <span v-else>Find Leagues</span>
            </button>
          </div>
          
          <!-- Step 1: Yahoo - Not connected -->
          <div v-if="step === 1 && selectedPlatform === 'yahoo' && !platformsStore.isYahooConnected">
            <div class="flex items-center gap-2 mb-4">
              <button @click="step = 0" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <img src="/yahoo-fantasy.svg" alt="Yahoo" class="w-8 h-8 rounded-lg" />
              <span class="text-sm text-dark-textMuted">Connect Yahoo</span>
            </div>
            
            <div class="text-center py-4">
              <p class="text-sm text-dark-textMuted mb-4">
                Sign in with Yahoo to view and connect your fantasy leagues
              </p>
              <button
                @click="connectYahoo"
                class="w-full px-4 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-500 transition-colors flex items-center justify-center gap-2"
              >
                <span>Sign in with Yahoo</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Step 1: Yahoo - Connected, show leagues grouped by sport -->
          <div v-if="step === 1 && selectedPlatform === 'yahoo' && platformsStore.isYahooConnected">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <button @click="step = 0" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                  <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <img src="/yahoo-fantasy.svg" alt="Yahoo" class="w-8 h-8 rounded-lg" />
                <span class="text-sm text-dark-textMuted">Yahoo Leagues</span>
              </div>
              <button
                @click="showYahooAccountMenu = !showYahooAccountMenu"
                class="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Account
              </button>
            </div>
            
            <!-- Yahoo Account Menu -->
            <div v-if="showYahooAccountMenu" class="mb-4 p-3 rounded-lg bg-dark-bg border border-dark-border">
              <p class="text-xs text-dark-textMuted mb-2">Yahoo Account</p>
              <div class="flex items-center justify-between">
                <span class="text-sm text-dark-text">Connected</span>
                <button
                  @click="switchYahooAccount"
                  class="text-xs px-3 py-1 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors"
                >
                  Switch Account
                </button>
              </div>
            </div>
            
            <!-- Loading -->
            <div v-if="loadingYahooLeagues" class="text-center py-8">
              <LoadingSpinner size="md" />
              <p class="text-sm text-dark-textMuted">Loading your Yahoo leagues...</p>
            </div>
            
            <!-- Yahoo Leagues List (grouped by sport) -->
            <div v-else class="space-y-3 max-h-80 overflow-y-auto">
              <!-- Football Leagues -->
              <div v-if="footballYahooLeagues.length > 0">
                <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2 sticky top-0 bg-dark-card">
                  <span class="text-base">🏈</span>
                  <span>Football</span>
                  <span class="text-green-400 ml-auto">{{ footballYahooLeagues.length }}</span>
                </div>
                <button
                  v-for="league in footballYahooLeagues"
                  :key="league.league_key"
                  @click="selectYahooLeague(league, 'football')"
                  class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-purple-500/50 hover:bg-dark-border/30 transition-all text-left"
                >
                  <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <span class="text-sm font-bold text-green-400">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                    <div class="text-xs text-dark-textMuted">
                      {{ formatScoringType(league, 'football') }} • {{ league.num_teams }} teams
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              <!-- Baseball Leagues -->
              <div v-if="baseballYahooLeagues.length > 0" :class="footballYahooLeagues.length > 0 ? 'border-t border-dark-border/50 pt-3' : ''">
                <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2 sticky top-0 bg-dark-card">
                  <span class="text-base">⚾</span>
                  <span>Baseball</span>
                  <span class="text-blue-400 ml-auto">{{ baseballYahooLeagues.length }}</span>
                </div>
                <button
                  v-for="league in baseballYahooLeagues"
                  :key="league.league_key"
                  @click="selectYahooLeague(league, 'baseball')"
                  class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-purple-500/50 hover:bg-dark-border/30 transition-all text-left"
                >
                  <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span class="text-sm font-bold text-blue-400">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                    <div class="text-xs text-dark-textMuted">
                      {{ formatScoringType(league, 'baseball') }} • {{ league.num_teams }} teams
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              <!-- Basketball Leagues -->
              <div v-if="basketballYahooLeagues.length > 0" :class="(footballYahooLeagues.length > 0 || baseballYahooLeagues.length > 0) ? 'border-t border-dark-border/50 pt-3' : ''">
                <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2 sticky top-0 bg-dark-card">
                  <span class="text-base">🏀</span>
                  <span>Basketball</span>
                  <span class="text-orange-400 ml-auto">{{ basketballYahooLeagues.length }}</span>
                </div>
                <button
                  v-for="league in basketballYahooLeagues"
                  :key="league.league_key"
                  @click="selectYahooLeague(league, 'basketball')"
                  class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-purple-500/50 hover:bg-dark-border/30 transition-all text-left"
                >
                  <div class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <span class="text-sm font-bold text-orange-400">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                    <div class="text-xs text-dark-textMuted">
                      {{ formatScoringType(league, 'basketball') }} • {{ league.num_teams }} teams
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              <!-- Hockey Leagues -->
              <div v-if="hockeyYahooLeagues.length > 0" :class="(footballYahooLeagues.length > 0 || baseballYahooLeagues.length > 0 || basketballYahooLeagues.length > 0) ? 'border-t border-dark-border/50 pt-3' : ''">
                <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2 sticky top-0 bg-dark-card">
                  <span class="text-base">🏒</span>
                  <span>Hockey</span>
                  <span class="text-blue-500 ml-auto">{{ hockeyYahooLeagues.length }}</span>
                </div>
                <button
                  v-for="league in hockeyYahooLeagues"
                  :key="league.league_key"
                  @click="selectYahooLeague(league, 'hockey')"
                  class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-purple-500/50 hover:bg-dark-border/30 transition-all text-left"
                >
                  <div class="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                    <span class="text-sm font-bold text-blue-500">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                    <div class="text-xs text-dark-textMuted">
                      {{ formatScoringType(league, 'hockey') }} • {{ league.num_teams }} teams
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              <!-- No leagues found -->
              <div v-if="totalYahooLeagues === 0 && !loadingYahooLeagues" class="text-center py-8 text-dark-textMuted">
                <p>No Yahoo leagues found</p>
                <p class="text-sm mt-1">Try syncing or check your Yahoo account</p>
                <button
                  @click="syncYahooLeagues"
                  class="mt-4 px-4 py-2 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors text-sm"
                >
                  Sync Yahoo Leagues
                </button>
              </div>
            </div>
          </div>
          
          <!-- Step 1: ESPN - Auto-fetch leagues via extension, or manual fallback -->
          <!-- Step 1: ESPN on Mobile — desktop required -->
          <div v-if="step === 1 && selectedPlatform === 'espn' && isMobile">
            <div class="flex items-center gap-2 mb-4">
              <button @click="step = 0" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <img src="/espn-logo.svg" class="w-8 h-8 rounded-lg" alt="ESPN" />
              <span class="text-sm text-dark-textMuted">Connect ESPN League</span>
            </div>
            <div class="space-y-4">
              <!-- Option 2: Auto-sync hint -->
              <div class="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-3">
                <div class="text-emerald-400 text-lg flex-shrink-0">✓</div>
                <div>
                  <p class="text-emerald-300 text-xs font-medium">Already set up on desktop?</p>
                  <p class="text-dark-textMuted text-xs mt-0.5">Your ESPN leagues should load automatically when you sign in. If they don't appear, use the options below.</p>
                </div>
              </div>

              <!-- Option 3 + 1: League ID first, then auth if needed -->
              <div class="space-y-3">
                <label class="block text-sm font-medium text-dark-textMuted">League ID</label>
                <input
                  v-model="espnLeagueId"
                  type="text"
                  inputmode="numeric"
                  placeholder="e.g., 12345678"
                  class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border focus:border-[#0719b2] focus:ring-1 focus:ring-[#0719b2] transition-colors text-dark-text"
                  @keyup.enter="validateEspnLeague"
                />
                <p class="text-xs text-dark-textMuted">
                  Find this in your ESPN league URL: fantasy.espn.com/.../<span class="text-[#4d6bff]">leagueId</span>=12345678
                </p>
                <div v-if="espnDiscoveryStatus" class="text-dark-textMuted text-sm flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4 text-[#0719b2]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ espnDiscoveryStatus }}
                </div>
                <div v-if="errorMessage" class="text-red-400 text-sm">{{ errorMessage }}</div>
                <button
                  @click="validateEspnLeague"
                  :disabled="!espnLeagueId.trim() || loading"
                  class="w-full px-4 py-3 rounded-xl bg-[#0719b2] text-white font-semibold hover:bg-[#0719b2]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span v-if="loading">Discovering League...</span>
                  <span v-else>Find League</span>
                </button>
              </div>

              <!-- Option 1: Email/password login (for private leagues) -->
              <div class="border-t border-dark-border/50 pt-4">
                <button @click="espnMobileShowLogin = !espnMobileShowLogin" class="w-full text-xs text-dark-textMuted hover:text-dark-text transition-colors py-1 flex items-center justify-center gap-1">
                  <span>{{ espnMobileShowLogin ? '▲ Hide' : '▼ Private league? Sign in with ESPN' }}</span>
                </button>
                <div v-if="espnMobileShowLogin" class="mt-3 space-y-3">
                  <div v-if="!espnLoginSuccess" class="bg-dark-bg/60 border border-dark-border rounded-xl p-4">
                    <div class="flex items-center gap-3 mb-3">
                      <div class="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <img src="/espn-logo.svg" class="w-6 h-6" alt="ESPN" />
                      </div>
                      <div>
                        <p class="text-sm text-dark-text font-semibold">Sign in with ESPN</p>
                        <p class="text-xs text-dark-textMuted">Use your ESPN account credentials</p>
                      </div>
                    </div>
                    <div class="space-y-3">
                      <div>
                        <label class="block text-xs font-medium text-dark-textMuted mb-1">ESPN Email</label>
                        <input v-model="espnLoginEmail" type="email" placeholder="your@email.com" autocomplete="email"
                          class="w-full px-3 py-2.5 rounded-lg bg-dark-bg border border-dark-border focus:border-[#0719b2] focus:ring-1 focus:ring-[#0719b2] transition-colors text-dark-text text-sm"
                          @keyup.enter="espnLoginPassword && loginToEspn()" />
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-dark-textMuted mb-1">Password</label>
                        <input v-model="espnLoginPassword" type="password" placeholder="Your ESPN password" autocomplete="current-password"
                          class="w-full px-3 py-2.5 rounded-lg bg-dark-bg border border-dark-border focus:border-[#0719b2] focus:ring-1 focus:ring-[#0719b2] transition-colors text-dark-text text-sm"
                          @keyup.enter="espnLoginEmail && loginToEspn()" />
                      </div>
                      <div v-if="espnLoginError" class="text-red-400 text-xs py-1">{{ espnLoginError }}</div>
                      <button @click="loginToEspn" :disabled="!espnLoginEmail.trim() || !espnLoginPassword.trim() || espnLoginLoading"
                        class="w-full px-4 py-2.5 rounded-xl bg-[#0719b2] text-white text-sm font-semibold hover:bg-[#0719b2]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                        <svg v-if="espnLoginLoading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{{ espnLoginLoading ? 'Signing in...' : 'Sign In to ESPN' }}</span>
                      </button>
                    </div>
                    <p class="text-center text-xs text-dark-textMuted mt-3">Credentials go directly to ESPN and are never stored by UFD.</p>
                  </div>
                  <div v-if="espnLoginSuccess" class="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-center gap-3">
                    <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p class="text-xs text-green-300">Signed in to ESPN — now enter your League ID above</p>
                  </div>
                </div>
              </div>

              <!-- Option 4: Manual cookie paste -->
              <div class="border-t border-dark-border/50 pt-3">
                <button @click="espnMobileShowCookies = !espnMobileShowCookies" class="w-full text-xs text-dark-textMuted hover:text-dark-text transition-colors py-1">
                  {{ espnMobileShowCookies ? '▲ Hide cookie entry' : '▼ Advanced: paste cookies manually' }}
                </button>
                <div v-if="espnMobileShowCookies" class="mt-3 space-y-3">
                  <div>
                    <label class="block text-xs font-medium text-dark-textMuted mb-1">espn_s2 cookie</label>
                    <textarea v-model="espnS2Cookie" rows="2" placeholder="Paste espn_s2 value..."
                      class="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border focus:border-[#0719b2] focus:ring-1 focus:ring-[#0719b2] transition-colors text-dark-text text-xs font-mono"></textarea>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-dark-textMuted mb-1">SWID cookie</label>
                    <input v-model="espnSwidCookie" type="text" placeholder="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"
                      class="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border focus:border-[#0719b2] focus:ring-1 focus:ring-[#0719b2] transition-colors text-dark-text text-xs font-mono" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="step === 1 && selectedPlatform === 'espn' && !espnNeedsCredentials && !isMobile">
            <div class="flex items-center gap-2 mb-4">
              <button @click="step = 0" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <img src="/espn-logo.svg" class="w-8 h-8 rounded-lg" alt="ESPN" />
              <span class="text-sm text-dark-textMuted">Connect ESPN League</span>
            </div>

            <!-- STATE: Not Chrome — email/password login -->
            <div v-if="!espnIsChrome" class="space-y-3">
              <div v-if="!espnLoginSuccess" class="space-y-3">
                <div class="bg-dark-bg/60 border border-dark-border rounded-xl p-4">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <img src="/espn-logo.svg" class="w-6 h-6" alt="ESPN" />
                    </div>
                    <div>
                      <p class="text-sm text-dark-text font-semibold">Sign in with ESPN</p>
                      <p class="text-xs text-dark-textMuted">Use your ESPN account credentials</p>
                    </div>
                  </div>
                  <div class="space-y-3">
                    <div>
                      <label class="block text-xs font-medium text-dark-textMuted mb-1">ESPN Email</label>
                      <input v-model="espnLoginEmail" type="email" placeholder="your@email.com" autocomplete="email"
                        class="w-full px-3 py-2.5 rounded-lg bg-dark-bg border border-dark-border focus:border-[#0719b2] focus:ring-1 focus:ring-[#0719b2] transition-colors text-dark-text text-sm"
                        @keyup.enter="espnLoginPassword && loginToEspn()" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-dark-textMuted mb-1">Password</label>
                      <input v-model="espnLoginPassword" type="password" placeholder="Your ESPN password" autocomplete="current-password"
                        class="w-full px-3 py-2.5 rounded-lg bg-dark-bg border border-dark-border focus:border-[#0719b2] focus:ring-1 focus:ring-[#0719b2] transition-colors text-dark-text text-sm"
                        @keyup.enter="espnLoginEmail && loginToEspn()" />
                    </div>
                    <div v-if="espnLoginError" class="text-red-400 text-xs py-1">{{ espnLoginError }}</div>
                    <button @click="loginToEspn" :disabled="!espnLoginEmail.trim() || !espnLoginPassword.trim() || espnLoginLoading"
                      class="w-full px-4 py-2.5 rounded-xl bg-[#0719b2] text-white text-sm font-semibold hover:bg-[#0719b2]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                      <svg v-if="espnLoginLoading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{{ espnLoginLoading ? 'Signing in...' : 'Sign In to ESPN' }}</span>
                    </button>
                  </div>
                </div>
                <p class="text-center text-xs text-dark-textMuted">Credentials go directly to ESPN and are never stored by UFD.</p>
              </div>
              <div v-if="espnLoginSuccess" class="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-center gap-3">
                <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-xs text-green-300">Signed in to ESPN ✓</p>
              </div>
              <button @click="espnShowManualFields = !espnShowManualFields" class="w-full text-xs text-dark-textMuted hover:text-dark-text transition-colors py-1">
                {{ espnShowManualFields ? '▲ Hide manual cookie entry' : '▼ Or enter cookies manually' }}
              </button>
            </div>

            <!-- STATE: Chrome, checking for extension -->
            <div v-else-if="espnExtensionChecking" class="flex items-center justify-center gap-3 py-10 text-dark-textMuted">
              <svg class="animate-spin h-5 w-5 text-[#4d6bff]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-sm">Checking for ESPN extension...</span>
            </div>

            <!-- STATE: Chrome, extension not installed -->
            <div v-else-if="espnIsChrome && !espnExtensionInstalled" class="space-y-3">
              <div class="bg-dark-bg/60 border border-dark-border rounded-xl p-4">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-10 h-10 rounded-xl bg-[#0719b2]/20 flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-[#4d6bff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm text-dark-text font-semibold">Install the ESPN Extension</p>
                    <p class="text-xs text-dark-textMuted">Free • One-click league import • No manual ID needed</p>
                  </div>
                </div>
                <p class="text-xs text-dark-textMuted mb-4 leading-relaxed">
                  Install our free extension and make sure you're signed into ESPN in Chrome. Your leagues will appear here automatically — no League ID hunting required.
                </p>
                <a
                  :href="getExtensionStoreUrl()"
                  target="_blank"
                  class="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-[#0719b2] text-white text-sm font-semibold hover:bg-[#0719b2]/80 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Install Extension (Free)
                </a>
                <button @click="checkEspnExtension" class="w-full mt-2 text-xs text-[#4d6bff] hover:text-[#6b85ff] transition-colors py-1">
                  Already installed? Click to detect
                </button>

              </div>
              <button @click="espnShowManualFields = !espnShowManualFields" class="w-full text-xs text-dark-textMuted hover:text-dark-text transition-colors py-1">
                {{ espnShowManualFields ? '▲ Hide manual entry' : '▼ Enter League ID manually instead' }}
              </button>
            </div>

            <!-- STATE: Loading cookies from extension -->
            <div v-else-if="espnLoadingLeagues" class="flex flex-col items-center justify-center gap-3 py-10 text-dark-textMuted">
              <svg class="animate-spin h-6 w-6 text-[#4d6bff]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p class="text-sm">Reading ESPN cookies...</p>
            </div>

            <!-- STATE: Cookies grabbed — just need league ID now -->
            <div v-else-if="espnLeaguesError === 'enter_league_id'" class="space-y-4">
              <div class="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-center gap-3">
                <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p class="text-xs text-green-300">ESPN cookies imported ✓ — just enter your League ID below</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-dark-textMuted mb-2">League ID</label>
                <input
                  v-model="espnLeagueId"
                  type="text"
                  placeholder="e.g., 12345678"
                  class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border focus:border-[#0719b2] focus:ring-1 focus:ring-[#0719b2] transition-colors text-dark-text"
                  @keyup.enter="validateEspnLeague"
                />
                <p class="text-xs text-dark-textMuted mt-2">
                  Find this in your ESPN league URL: fantasy.espn.com/.../<span class="text-[#4d6bff]">leagueId</span>=12345678
                </p>
              </div>

              <div v-if="espnDiscoveryStatus" class="text-dark-textMuted text-sm flex items-center gap-2">
                <svg class="animate-spin h-4 w-4 text-[#0719b2]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ espnDiscoveryStatus }}
              </div>
              <div v-if="errorMessage" class="text-red-400 text-sm">{{ errorMessage }}</div>

              <button
                @click="validateEspnLeagueWithExtensionCreds"
                :disabled="!espnLeagueId.trim() || loading"
                class="w-full px-4 py-3 rounded-xl bg-[#0719b2] text-white font-semibold hover:bg-[#0719b2]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="loading">Finding League...</span>
                <span v-else>Connect League</span>
              </button>
            </div>

            <!-- STATE: Not signed in to ESPN -->
            <div v-else-if="espnLeaguesError === 'not_logged_in'" class="space-y-3">
              <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <div class="flex items-start gap-3">
                  <svg class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p class="text-sm text-amber-200 font-medium mb-1">Not signed in to ESPN</p>
                    <p class="text-xs text-amber-200/70 leading-relaxed">Sign in to ESPN in this Chrome browser, then click Refresh.</p>
                    <div class="flex items-center gap-3 mt-3">
                      <a href="https://www.espn.com/fantasy/" target="_blank" class="text-xs px-3 py-1.5 rounded-lg bg-[#0719b2] text-white hover:bg-[#0719b2]/80 transition-colors">Sign in to ESPN</a>
                      <button @click="loadEspnLeaguesFromExtension" class="text-xs text-[#4d6bff] hover:text-[#6b85ff] transition-colors">Refresh</button>
                    </div>
                  </div>
                </div>
              </div>
              <button @click="espnShowManualFields = !espnShowManualFields" class="w-full text-xs text-dark-textMuted hover:text-dark-text transition-colors py-1">
                {{ espnShowManualFields ? '▲ Hide manual entry' : '▼ Enter League ID manually instead' }}
              </button>
            </div>

            <!-- Manual entry fallback (shared across all non-league-picker states) -->
            <div v-if="espnShowManualFields" class="mt-4 space-y-3 border-t border-dark-border/50 pt-4">
              <label class="block text-sm font-medium text-dark-textMuted">League ID</label>
              <input
                v-model="espnLeagueId"
                type="text"
                placeholder="e.g., 12345678"
                class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border focus:border-[#0719b2] focus:ring-1 focus:ring-[#0719b2] transition-colors text-dark-text"
                @keyup.enter="validateEspnLeague"
              />
              <p class="text-xs text-dark-textMuted">
                Find this in your ESPN league URL: fantasy.espn.com/.../<span class="text-[#4d6bff]">leagueId</span>=12345678
              </p>
              <div v-if="espnDiscoveryStatus" class="text-dark-textMuted text-sm flex items-center gap-2">
                <svg class="animate-spin h-4 w-4 text-[#0719b2]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ espnDiscoveryStatus }}
              </div>
              <div v-if="errorMessage" class="text-red-400 text-sm">{{ errorMessage }}</div>
              <button
                @click="validateEspnLeague"
                :disabled="!espnLeagueId.trim() || loading"
                class="w-full px-4 py-3 rounded-xl bg-[#0719b2] text-white font-semibold hover:bg-[#0719b2]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="loading">Discovering League...</span>
                <span v-else>Find League</span>
              </button>
            </div>
          </div>
          
          <!-- Step 1b: ESPN - Private League, need credentials -->
          <div v-else-if="step === 1 && selectedPlatform === 'espn' && espnNeedsCredentials">
            <div class="flex items-center gap-2 mb-4">
              <button @click="espnNeedsCredentials = false; errorMessage = ''; espnShowManualFields = false" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <img src="/espn-logo.svg" alt="ESPN" class="w-8 h-8 rounded-lg" />
              <span class="text-sm text-dark-textMuted">Connect ESPN Account</span>
            </div>

            <!-- Found League Info -->
            <div v-if="espnDiscoveredLeague" class="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4">
              <div class="flex items-center gap-3">
                <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p class="text-sm text-green-200 font-medium">Found: {{ espnDiscoveredLeague.name }}</p>
                  <p class="text-xs text-green-200/70">{{ espnDiscoveredLeague.size }} teams • {{ espnDiscoveredLeague.sport.toUpperCase() }}</p>
                </div>
              </div>
            </div>

            <!-- ESPN requires authentication explanation -->
            <div class="bg-[#0719b2]/10 border border-[#0719b2]/30 rounded-xl p-4 mb-4">
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 text-[#4d6bff] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <p class="text-sm text-[#a0b4ff] font-medium mb-1">ESPN requires authentication</p>
                  <p class="text-xs text-[#a0b4ff]/70 leading-relaxed">
                    ESPN uses browser cookies for private league access. The easiest way is our Chrome extension — it imports your cookies automatically in one click.
                  </p>
                </div>
              </div>
            </div>

            <!-- ── NOT CHROME: Show requirement ── -->
            <div v-if="!espnIsChrome" class="space-y-3">
              <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <div class="flex items-start gap-3">
                  <svg class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p class="text-sm text-amber-200 font-medium mb-1">Chrome required for ESPN</p>
                    <p class="text-xs text-amber-200/70 leading-relaxed">
                      ESPN leagues require our Chrome extension to securely import your login cookies. Please open this page in Chrome to connect your ESPN league.
                    </p>
                    <a
                      href="https://www.google.com/chrome/"
                      target="_blank"
                      class="inline-flex items-center gap-1 mt-2 text-xs text-amber-300 hover:text-amber-200 underline"
                    >
                      Download Chrome
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              <!-- Manual fallback toggle for non-Chrome -->
              <button
                @click="espnShowManualFields = !espnShowManualFields"
                class="w-full text-xs text-dark-textMuted hover:text-dark-text transition-colors py-1"
              >
                {{ espnShowManualFields ? '▲ Hide manual entry' : '▼ Or enter cookies manually' }}
              </button>
            </div>

            <!-- ── CHROME, checking / not installed: Show install CTA ── -->
            <div v-else-if="espnIsChrome && !espnExtensionInstalled" class="space-y-3">
              <!-- Checking state -->
              <div v-if="espnExtensionChecking" class="flex items-center justify-center gap-2 py-4 text-dark-textMuted text-sm">
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking for extension...
              </div>

              <!-- Not installed -->
              <div v-else class="bg-dark-bg/60 border border-dark-border rounded-xl p-4">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-10 h-10 rounded-xl bg-[#0719b2]/20 flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-[#4d6bff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm text-dark-text font-medium">ESPN Fantasy Cookie Sync</p>
                    <p class="text-xs text-dark-textMuted">Free Chrome extension • One-click import</p>
                  </div>
                </div>
                <p class="text-xs text-dark-textMuted mb-3 leading-relaxed">
                  Install our free extension, then come back and click <strong class="text-dark-text">Import from Extension</strong> — it automatically imports your ESPN cookies in one click. No manual copying required.
                </p>
                <a
                  :href="getExtensionStoreUrl()"
                  target="_blank"
                  class="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#0719b2] text-white text-sm font-semibold hover:bg-[#0719b2]/80 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Install Extension (Free)
                </a>
                <button
                  @click="checkEspnExtension"
                  class="w-full mt-2 text-xs text-[#4d6bff] hover:text-[#6b85ff] transition-colors py-1"
                >
                  Already installed? Click to refresh
                </button>
              </div>

              <!-- Manual fallback toggle -->
              <button
                @click="espnShowManualFields = !espnShowManualFields"
                class="w-full text-xs text-dark-textMuted hover:text-dark-text transition-colors py-1"
              >
                {{ espnShowManualFields ? '▲ Hide manual entry' : '▼ Or enter cookies manually instead' }}
              </button>
            </div>

            <!-- ── CHROME + EXTENSION INSTALLED: One-click import ── -->
            <div v-else-if="espnIsChrome && espnExtensionInstalled" class="space-y-3">
              <button
                @click="importFromExtension"
                :disabled="espnExtensionImporting || loading"
                class="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl bg-[#0719b2] hover:bg-[#0719b2]/80 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg v-if="!espnExtensionImporting" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <svg v-else class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ espnExtensionImporting ? 'Importing cookies...' : 'Import from Extension' }}</span>
              </button>

              <div class="flex items-center gap-2 px-1">
                <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p class="text-xs text-dark-textMuted">
                  Extension detected ✓ — your ESPN cookies are imported securely and never stored in plain text
                </p>
              </div>

              <!-- Manual fallback toggle -->
              <button
                @click="espnShowManualFields = !espnShowManualFields"
                class="w-full text-xs text-dark-textMuted hover:text-dark-text transition-colors py-1"
              >
                {{ espnShowManualFields ? '▲ Hide manual entry' : '▼ Enter cookies manually instead' }}
              </button>
            </div>

            <!-- Extension error -->
            <div v-if="espnExtensionError" class="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p class="text-xs text-red-300">{{ espnExtensionError }}</p>
            </div>

            <!-- ── MANUAL FIELDS (always available as fallback) ── -->
            <div v-if="espnShowManualFields || (!espnIsChrome)" class="mt-4 space-y-3 border-t border-dark-border/50 pt-4">
              <p class="text-xs text-dark-textMuted">
                <strong class="text-dark-text">Manual entry:</strong> Open
                <a href="https://www.espn.com/fantasy/" target="_blank" class="text-[#4d6bff] hover:underline">ESPN Fantasy</a>
                in Chrome → press <kbd class="px-1 py-0.5 rounded bg-dark-border text-dark-text text-xs">F12</kbd> →
                <strong>Application</strong> → <strong>Cookies</strong> → <strong>espn.com</strong> → copy <strong>espn_s2</strong> and <strong>SWID</strong>
              </p>

              <div>
                <label class="block text-sm font-medium text-dark-textMuted mb-1">espn_s2 Cookie</label>
                <textarea
                  v-model="espnS2Cookie"
                  placeholder="Paste your espn_s2 cookie value here..."
                  rows="2"
                  class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border focus:border-[#0719b2] focus:ring-1 focus:ring-[#0719b2] transition-colors text-dark-text text-xs font-mono resize-none"
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-dark-textMuted mb-1">SWID Cookie</label>
                <input
                  v-model="espnSwidCookie"
                  type="text"
                  placeholder="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"
                  class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border focus:border-[#0719b2] focus:ring-1 focus:ring-[#0719b2] transition-colors text-dark-text text-xs font-mono"
                />
              </div>

              <div v-if="errorMessage" class="text-red-400 text-sm">
                {{ errorMessage }}
              </div>

              <button
                @click="connectEspnPrivate"
                :disabled="!espnS2Cookie.trim() || !espnSwidCookie.trim() || loading"
                class="w-full px-4 py-3 rounded-xl bg-[#0719b2] text-white font-semibold hover:bg-[#0719b2]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="loading">Connecting...</span>
                <span v-else>Connect & Save</span>
              </button>
            </div>

            <!-- General error (non-manual flow) -->
            <div v-if="errorMessage && !espnShowManualFields" class="mt-3 text-red-400 text-sm">
              {{ errorMessage }}
            </div>
          </div>
          
          <!-- Step 2: Select Sleeper League -->
          <div v-else-if="step === 2 && selectedPlatform === 'sleeper'">
            <div class="flex items-center gap-2 mb-4">
              <button @click="step = 1" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span class="text-sm text-dark-textMuted">
                Found {{ availableLeagues.length }} league{{ availableLeagues.length !== 1 ? 's' : '' }} for <span class="text-primary">{{ username }}</span>
              </span>
            </div>
            
            <div class="space-y-3 max-h-80 overflow-y-auto">
              <!-- NFL Leagues -->
              <div v-if="sleeperNflLeagues.length > 0">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-lg">🏈</span>
                  <span class="text-sm font-medium text-dark-text">NFL</span>
                  <span class="text-green-400 ml-auto">{{ sleeperNflLeagues.length }}</span>
                </div>
                <div class="space-y-2">
                  <button
                    v-for="league in sleeperNflLeagues"
                    :key="league.league_id"
                    @click="selectSleeperLeague(league)"
                    class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-primary/50 hover:bg-dark-border/30 transition-all text-left"
                  >
                    <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <span class="text-sm font-bold text-green-400">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                      <div class="text-xs text-dark-textMuted">
                        H2H Points • {{ league.total_rosters }} teams
                      </div>
                    </div>
                    <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <!-- NBA Leagues -->
              <div v-if="sleeperNbaLeagues.length > 0" :class="sleeperNflLeagues.length > 0 ? 'border-t border-dark-border/50 pt-3' : ''">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-lg">🏀</span>
                  <span class="text-sm font-medium text-dark-text">NBA</span>
                  <span class="text-orange-400 ml-auto">{{ sleeperNbaLeagues.length }}</span>
                </div>
                <div class="space-y-2">
                  <button
                    v-for="league in sleeperNbaLeagues"
                    :key="league.league_id"
                    @click="selectSleeperLeague(league)"
                    class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-primary/50 hover:bg-dark-border/30 transition-all text-left"
                  >
                    <div class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <span class="text-sm font-bold text-orange-400">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                      <div class="text-xs text-dark-textMuted">
                        H2H Points • {{ league.total_rosters }} teams
                      </div>
                    </div>
                    <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- MLB Leagues -->
              <div v-if="sleeperMlbLeagues.length > 0" :class="(sleeperNflLeagues.length > 0 || sleeperNbaLeagues.length > 0) ? 'border-t border-dark-border/50 pt-3' : ''">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-lg">⚾</span>
                  <span class="text-sm font-medium text-dark-text">MLB</span>
                  <span class="text-blue-400 ml-auto">{{ sleeperMlbLeagues.length }}</span>
                </div>
                <div class="space-y-2">
                  <button
                    v-for="league in sleeperMlbLeagues"
                    :key="league.league_id"
                    @click="selectSleeperLeague(league)"
                    class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-primary/50 hover:bg-dark-border/30 transition-all text-left"
                  >
                    <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <span class="text-sm font-bold text-blue-400">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ league.total_rosters }} teams</div>
                    </div>
                    <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- NHL Leagues -->
              <div v-if="sleeperNhlLeagues.length > 0" :class="(sleeperNflLeagues.length > 0 || sleeperNbaLeagues.length > 0 || sleeperMlbLeagues.length > 0) ? 'border-t border-dark-border/50 pt-3' : ''">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-lg">🏒</span>
                  <span class="text-sm font-medium text-dark-text">NHL</span>
                  <span class="text-purple-400 ml-auto">{{ sleeperNhlLeagues.length }}</span>
                </div>
                <div class="space-y-2">
                  <button
                    v-for="league in sleeperNhlLeagues"
                    :key="league.league_id"
                    @click="selectSleeperLeague(league)"
                    class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-primary/50 hover:bg-dark-border/30 transition-all text-left"
                  >
                    <div class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <span class="text-sm font-bold text-purple-400">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ league.total_rosters }} teams</div>
                    </div>
                    <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-dark-border/30 flex justify-end">
          <button
            @click="$emit('close')"
            class="px-4 py-2 text-sm font-medium text-dark-textMuted hover:text-dark-text transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { usePlatformsStore } from '@/stores/platforms'
import { useSportStore } from '@/stores/sport'
import { yahooService } from '@/services/yahoo'
import { espnService } from '@/services/espn'
import { useAuthStore } from '@/stores/auth'
import {
  isChromiumBrowser,
  isExtensionInstalled,
  getEspnCookiesFromExtension,
  getEspnLeaguesFromExtension,
  getExtensionStoreUrl
} from '@/services/espnExtension'
import type { EspnLeague } from '@/services/espnExtension'
import type { SleeperLeague } from '@/types/sleeper'
import type { Sport } from '@/types/supabase'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

interface GroupedYahooLeague {
  name: string
  league_key: string
  league_id: string
  num_teams: number
  season: string
  oldest_season: string
  seasons_count: number
  all_seasons: Array<{ league_key: string; season: string }>
  sport?: Sport
  scoring_type?: string
}

interface EspnLeagueResult {
  id: number
  name: string
  size: number
  scoringType: string
  isPublic: boolean
}

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'league-added', league: SleeperLeague): void
  (e: 'yahoo-league-added', league: GroupedYahooLeague & { sport: Sport }): void
  (e: 'espn-league-added', league: { leagueId: string; sport: Sport; season: number; league: EspnLeagueResult }): void
}>()

const leagueStore = useLeagueStore()
const platformsStore = usePlatformsStore()
const sportStore = useSportStore()
const authStore = useAuthStore()

// General state
const step = ref(0)
const selectedPlatform = ref<'sleeper' | 'yahoo' | 'espn' | null>(null)

// Detect mobile — ESPN new league setup requires desktop Chrome
const isMobile = ref(false)
onMounted(() => {
  isMobile.value = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
    || window.innerWidth <= 768
})

// ESPN email/password login state (used when extension unavailable)
const espnLoginEmail = ref('')
const espnLoginPassword = ref('')
const espnLoginLoading = ref(false)
const espnLoginError = ref('')
const espnLoginSuccess = ref(false)
const loading = ref(false)
const errorMessage = ref('')

// Sleeper state
const username = ref('')
const availableLeagues = ref<SleeperLeague[]>([])

// Yahoo state
const loadingYahooLeagues = ref(false)
const showYahooAccountMenu = ref(false)
const yahooLeaguesBySport = ref<Record<Sport, any[]>>({
  football: [],
  baseball: [],
  basketball: [],
  hockey: []
})

// ESPN state
const espnLeagueId = ref('')
const espnSport = ref<Sport>('football')
const espnSeason = ref(new Date().getFullYear())
const espnNeedsCredentials = ref(false)
const espnDiscoveryStatus = ref('')
const espnDiscoveredLeague = ref<any>(null)
const espnS2Cookie = ref('')
const espnSwidCookie = ref('')

// ESPN Extension state
const espnIsChrome = ref(false)
const espnExtensionInstalled = ref(false)
const espnExtensionChecking = ref(false)
const espnExtensionImporting = ref(false)
const espnExtensionError = ref('')
const espnShowManualFields = ref(false)
const espnMobileShowLogin = ref(false)
const espnMobileShowCookies = ref(false)

// ESPN Extension league list
const espnExtensionLeagues = ref<EspnLeague[]>([])
const espnLoadingLeagues = ref(false)
const espnLeaguesError = ref('')
const espnExtensionCredentials = ref<{ espn_s2: string; swid: string } | null>(null)

// Available sports for ESPN
const availableSports = [
  { id: 'football' as Sport, label: 'NFL', icon: '🏈' },
  { id: 'baseball' as Sport, label: 'MLB', icon: '⚾' },
  { id: 'basketball' as Sport, label: 'NBA', icon: '🏀' },
  { id: 'hockey' as Sport, label: 'NHL', icon: '🏒' }
]

// Calculate current season year based on sport
const currentSeasonYear = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  
  // Different sports have different season start months
  const seasonStartMonth: Record<Sport, number> = {
    football: 8,   // September
    baseball: 2,   // March
    basketball: 9, // October
    hockey: 9      // October
  }
  
  return month < seasonStartMonth[espnSport.value] ? year - 1 : year
})

// Available seasons (last 6 years)
const availableSeasons = computed(() => {
  const years = []
  const currentYear = new Date().getFullYear()
  for (let i = 0; i < 6; i++) {
    years.push(currentYear - i)
  }
  return years
})

// Format scoring type for display
function formatScoringType(league: any, sport?: string): string {
  const scoringType = league?.scoring_type || league?.scoringType || ''
  const type = scoringType.toLowerCase()
  
  // Handle ESPN-style explicit types (H2H_CATEGORY, H2H_POINTS, ROTO, TOTAL_POINTS)
  if (type === 'h2h_category' || type === 'h2h category') return 'H2H Categories'
  if (type === 'h2h_points' || type === 'h2h points') return 'H2H Points'
  if (type === 'total_points' || type === 'total points') return 'H2H Points'
  if (type === 'roto' || type === 'rotisserie') return 'Rotisserie'
  
  // Handle Yahoo-style types
  if (type === 'headpoint' || type === 'head_point') return 'H2H Points'
  if (type === 'head' || type === 'headone' || type === 'headcategory' || type === 'head_category') return 'H2H Categories'
  if (type === 'point' || type === 'points') return 'H2H Points'
  
  // Check if type contains keywords
  if (type.includes('roto')) return 'Rotisserie'
  if (type.includes('categor')) return 'H2H Categories'
  if (type.includes('point')) return 'H2H Points'
  
  // Default based on sport
  if (sport === 'baseball') return 'H2H Categories'
  
  return 'H2H Points'
}

// Group leagues by name for each sport
function groupLeagues(leagues: any[]): GroupedYahooLeague[] {
  const leaguesByName = new Map<string, any[]>()
  
  for (const league of leagues) {
    const name = league.name
    if (!leaguesByName.has(name)) {
      leaguesByName.set(name, [])
    }
    leaguesByName.get(name)!.push(league)
  }
  
  const grouped: GroupedYahooLeague[] = []
  
  for (const [name, seasons] of leaguesByName) {
    seasons.sort((a, b) => parseInt(b.season) - parseInt(a.season))
    
    const mostRecent = seasons[0]
    const oldest = seasons[seasons.length - 1]
    
    grouped.push({
      name,
      league_key: mostRecent.league_key,
      league_id: mostRecent.league_id,
      num_teams: mostRecent.num_teams,
      season: mostRecent.season,
      oldest_season: oldest.season,
      seasons_count: seasons.length,
      all_seasons: seasons.map(s => ({ 
        league_key: s.league_key, 
        season: s.season 
      })),
      scoring_type: mostRecent.scoring_type
    })
  }
  
  grouped.sort((a, b) => parseInt(b.season) - parseInt(a.season))
  return grouped
}

// Computed grouped leagues by sport
const footballYahooLeagues = computed(() => groupLeagues(yahooLeaguesBySport.value.football))
const baseballYahooLeagues = computed(() => groupLeagues(yahooLeaguesBySport.value.baseball))
const basketballYahooLeagues = computed(() => groupLeagues(yahooLeaguesBySport.value.basketball))
const hockeyYahooLeagues = computed(() => groupLeagues(yahooLeaguesBySport.value.hockey))

const totalYahooLeagues = computed(() => 
  footballYahooLeagues.value.length + 
  baseballYahooLeagues.value.length + 
  basketballYahooLeagues.value.length + 
  hockeyYahooLeagues.value.length
)

// Sleeper leagues by sport
const sleeperNflLeagues = computed(() => availableLeagues.value.filter(l => l.sport === 'nfl'))
const sleeperNbaLeagues = computed(() => availableLeagues.value.filter(l => l.sport === 'nba'))
const sleeperMlbLeagues = computed(() => availableLeagues.value.filter(l => l.sport === 'mlb'))
const sleeperNhlLeagues = computed(() => availableLeagues.value.filter(l => l.sport === 'nhl'))

// Reset when modal opens
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    step.value = 0
    selectedPlatform.value = null
    username.value = ''
    errorMessage.value = ''
    availableLeagues.value = []
    yahooLeaguesBySport.value = {
      football: [],
      baseball: [],
      basketball: [],
      hockey: []
    }
    showYahooAccountMenu.value = false
    
    // Reset ESPN state
    espnLeagueId.value = ''
  espnLoginEmail.value = ''
  espnLoginPassword.value = ''
  espnLoginError.value = ''
  espnLoginSuccess.value = false
    espnSport.value = 'football'
    espnSeason.value = currentSeasonYear.value
    espnNeedsCredentials.value = false
    espnS2Cookie.value = ''
    espnSwidCookie.value = ''
    espnDiscoveryStatus.value = ''
    espnDiscoveredLeague.value = null
    espnExtensionInstalled.value = false
    espnExtensionChecking.value = false
    espnExtensionError.value = ''
    espnShowManualFields.value = false
    espnExtensionLeagues.value = []
    espnLoadingLeagues.value = false
    espnLeaguesError.value = ''
    espnExtensionCredentials.value = null
    
    // Fetch platforms status
    if (authStore.isAuthenticated) {
      await platformsStore.fetchConnectedPlatforms()
    }
  }
}, { immediate: true })

// Update season when sport changes
watch(espnSport, () => {
  espnSeason.value = currentSeasonYear.value
})

function selectPlatform(platform: 'sleeper' | 'yahoo' | 'espn') {
  selectedPlatform.value = platform
  step.value = 1
  
  if (platform === 'yahoo' && platformsStore.isYahooConnected) {
    loadAllYahooLeagues()
  }

  if (platform === 'espn') {
    initEspnFlow()
  }
}

// ============================================================
// ESPN Extension Methods
// ============================================================

async function initEspnFlow() {
  espnIsChrome.value = isChromiumBrowser()
  if (!espnIsChrome.value) return

  espnExtensionChecking.value = true
  try {
    // MV3 service workers need up to 1s to wake from sleep — 800ms is safe
    await new Promise(resolve => setTimeout(resolve, 800))
    espnExtensionInstalled.value = await isExtensionInstalled()
  } finally {
    espnExtensionChecking.value = false
  }

  if (espnExtensionInstalled.value) {
    await loadEspnLeaguesFromExtension()
  }
}

async function checkEspnExtension() {
  espnIsChrome.value = isChromiumBrowser()
  if (!espnIsChrome.value) return

  espnExtensionChecking.value = true
  try {
    espnExtensionInstalled.value = await isExtensionInstalled()
  } finally {
    espnExtensionChecking.value = false
  }

  if (espnExtensionInstalled.value) {
    await loadEspnLeaguesFromExtension()
  }
}

async function loadEspnLeaguesFromExtension() {
  espnLoadingLeagues.value = true
  espnLeaguesError.value = ''
  espnExtensionLeagues.value = []

  // Chrome MV3 service workers go to sleep when idle and can take 1-2 seconds
  // to wake up. We retry up to 3 times with increasing delays to handle this.
  const MAX_RETRIES = 3
  const RETRY_DELAYS = [500, 1000, 2000] // ms between retries

  let cookieResult: any = null
  let lastError = ''

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[ESPN Modal] Retry ${attempt}/${MAX_RETRIES - 1} — waiting ${RETRY_DELAYS[attempt - 1]}ms for service worker...`)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt - 1]))
      }

      console.log(`[ESPN Modal] Getting cookies from extension (attempt ${attempt + 1})...`)
      cookieResult = await getEspnCookiesFromExtension()

      if (cookieResult.error === 'extension_not_installed') {
        espnExtensionInstalled.value = false
        return
      }

      // Got a valid response — break out of retry loop
      if (cookieResult.espn_s2 || cookieResult.swid || cookieResult.error) break

    } catch (err: any) {
      lastError = err.message || 'Unknown error'
      console.warn(`[ESPN Modal] Attempt ${attempt + 1} failed: ${lastError}`)
      // If not last attempt, continue retrying
      if (attempt < MAX_RETRIES - 1) continue
      // Last attempt failed
      espnLeaguesError.value = 'Extension took too long to respond. Please click "Retry" or add your league ID manually.'
      espnLoadingLeagues.value = false
      return
    }
  }

  try {
    if (!cookieResult?.espn_s2 || !cookieResult?.swid) {
      espnLeaguesError.value = 'not_logged_in'
      return
    }

    // Store credentials — used automatically when user enters league ID
    espnExtensionCredentials.value = {
      espn_s2: cookieResult.espn_s2,
      swid: cookieResult.swid
    }

    // Pre-fill the cookie fields and show the league ID step
    espnS2Cookie.value = cookieResult.espn_s2
    espnSwidCookie.value = cookieResult.swid
    espnLeaguesError.value = 'enter_league_id'

  } catch (err: any) {
    console.error('[ESPN Modal] cookie fetch threw:', err.message)
    espnLeaguesError.value = err.message || 'Failed to read ESPN cookies.'
  } finally {
    espnLoadingLeagues.value = false
  }
}

async function selectEspnLeagueFromExtension(league: EspnLeague) {
  if (!espnExtensionCredentials.value) {
    errorMessage.value = 'Credentials not available. Please try again.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    // Store credentials
    const credResult = await platformsStore.storeEspnCredentials({
      espn_s2: espnExtensionCredentials.value.espn_s2,
      swid: espnExtensionCredentials.value.swid,
      leagueId: league.id,
      sport: league.sport,
      season: league.season
    })

    if (!credResult.success) {
      errorMessage.value = credResult.error || 'Failed to save credentials.'
      return
    }

    // Sync the league
    const syncResult = await platformsStore.syncEspnLeague(
      league.id,
      league.sport,
      league.season,
      { name: league.name, size: league.size }
    )

    if (!syncResult.success) {
      errorMessage.value = syncResult.error || 'Failed to save league.'
      return
    }

    emit('espn-league-added', {
      leagueId: league.id,
      sport: league.sport,
      season: league.season,
      league: { id: Number(league.id), name: league.name, size: league.size, scoringType: league.scoringType, isPublic: true }
    })

  } catch (err: any) {
    errorMessage.value = err.message || 'An error occurred.'
  } finally {
    loading.value = false
  }
}

// Validate ESPN league using cookies already grabbed from extension
async function validateEspnLeagueWithExtensionCreds() {
  if (!espnExtensionCredentials.value || !espnLeagueId.value.trim()) return

  // Set the cookie fields that connectEspnPrivate reads directly.
  // We intentionally call connectEspnPrivate() here instead of validateEspnLeague().
  // validateEspnLeague re-reads credentials via platformsStore.getEspnCredentials(),
  // which can return null if the async storeEspnCredentials hasn't flushed yet —
  // causing a completely silent early return with no error or loading state shown.
  // connectEspnPrivate() uses espnS2Cookie / espnSwidCookie directly, which we set below.
  espnS2Cookie.value = espnExtensionCredentials.value.espn_s2
  espnSwidCookie.value = espnExtensionCredentials.value.swid

  // Prime espnService so discoverLeague has credentials immediately
  if (authStore.user?.id) {
    await espnService.initialize(authStore.user.id)
  }
  espnService.setCredentials(espnExtensionCredentials.value.espn_s2, espnExtensionCredentials.value.swid)

  // connectEspnPrivate handles: store creds -> discover league -> syncEspnLeague -> emit
  await connectEspnPrivate()
}

async function importFromExtension() {
  espnExtensionImporting.value = true
  espnExtensionError.value = ''

  try {
    const result = await getEspnCookiesFromExtension()

    if (result.error === 'extension_not_installed') {
      espnExtensionInstalled.value = false
      espnExtensionError.value = 'Extension not found. Please install it and try again.'
      return
    }

    if (!result.espn_s2 || !result.swid) {
      espnExtensionError.value = 'No ESPN cookies found. Make sure you are logged in to ESPN in this browser, then try again.'
      espnShowManualFields.value = true
      return
    }

    espnS2Cookie.value = result.espn_s2
    espnSwidCookie.value = result.swid
    await connectEspnPrivate()
  } catch (err: any) {
    espnExtensionError.value = err.message || 'Failed to import cookies from extension.'
    espnShowManualFields.value = true
  } finally {
    espnExtensionImporting.value = false
  }
}

// Computed: group extension leagues by sport
const espnFootballLeagues = computed(() => espnExtensionLeagues.value.filter(l => l.sport === 'football'))
const espnBaseballLeagues = computed(() => espnExtensionLeagues.value.filter(l => l.sport === 'baseball'))
const espnBasketballLeagues = computed(() => espnExtensionLeagues.value.filter(l => l.sport === 'basketball'))
const espnHockeyLeagues = computed(() => espnExtensionLeagues.value.filter(l => l.sport === 'hockey'))

// ============================================================
// Sleeper Methods
// ============================================================

async function searchSleeperLeagues() {
  if (!username.value.trim()) return
  
  loading.value = true
  errorMessage.value = ''
  
  try {
    console.log('Searching for Sleeper user:', username.value)
    const response = await fetch(`https://api.sleeper.app/v1/user/${username.value}`)
    console.log('User response status:', response.status)
    
    if (!response.ok) {
      errorMessage.value = 'User not found. Please check the username and try again.'
      return
    }
    
    const user = await response.json()
    console.log('User data:', user)
    
    if (!user?.user_id) {
      errorMessage.value = 'User not found. Please check the username and try again.'
      return
    }
    
    // Save username for later
    leagueStore.setCurrentUsername(username.value)
    
    // Calculate season years for each sport
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-indexed
    
    // Season year logic per sport
    const nflSeasonYear  = currentMonth < 8 ? currentYear - 1 : currentYear   // starts Sept
    const nbaSeasonYear  = currentMonth < 9 ? currentYear - 1 : currentYear   // starts Oct
    const mlbSeasonYear  = currentYear                                          // starts March/April
    const nhlSeasonYear  = currentMonth < 9 ? currentYear - 1 : currentYear   // starts Oct
    
    console.log('Fetching Sleeper leagues - NFL:', nflSeasonYear, 'NBA:', nbaSeasonYear, 'MLB:', mlbSeasonYear, 'NHL:', nhlSeasonYear, 'user_id:', user.user_id)
    
    // Fetch all 4 sports in parallel
    const [nflResponse, nbaResponse, mlbResponse, nhlResponse] = await Promise.allSettled([
      fetch(`https://api.sleeper.app/v1/user/${user.user_id}/leagues/nfl/${nflSeasonYear}`),
      fetch(`https://api.sleeper.app/v1/user/${user.user_id}/leagues/nba/${nbaSeasonYear}`),
      fetch(`https://api.sleeper.app/v1/user/${user.user_id}/leagues/mlb/${mlbSeasonYear}`),
      fetch(`https://api.sleeper.app/v1/user/${user.user_id}/leagues/nhl/${nhlSeasonYear}`)
    ])
    
    const allLeagues: any[] = []
    
    const processSport = async (response: PromiseSettledResult<Response>, sportTag: string) => {
      if (response.status === 'fulfilled' && response.value.ok) {
        try {
          const leagues = await response.value.json()
          console.log(`${sportTag} leagues:`, leagues?.length || 0)
          if (Array.isArray(leagues) && leagues.length > 0) {
            allLeagues.push(...leagues.map((l: any) => ({ ...l, sport: sportTag })))
          }
        } catch (e) {
          console.log(`${sportTag} leagues: parse error (none)`)
        }
      }
    }
    
    await Promise.all([
      processSport(nflResponse, 'nfl'),
      processSport(nbaResponse, 'nba'),
      processSport(mlbResponse, 'mlb'),
      processSport(nhlResponse, 'nhl'),
    ])
    
    availableLeagues.value = allLeagues
    
    if (availableLeagues.value.length === 0) {
      errorMessage.value = `No active leagues found for "${username.value}". Make sure the username is correct and you have leagues in the current season.`
      return
    }
    
    step.value = 2
  } catch (err: any) {
    console.error('Error searching leagues:', err)
    errorMessage.value = err?.message || 'An error occurred while connecting to Sleeper. Please try again.'
  } finally {
    loading.value = false
  }
}

function selectSleeperLeague(league: SleeperLeague) {
  // Map Sleeper sport tag (added by loadSleeperLeagues) to UFD Sport type
  // and persist to the leagues table so CommandSite analytics see it.
  const sleeperSport = (league as any).sport as string | undefined
  const sport: Sport | null =
    sleeperSport === 'nfl' ? 'football'
    : sleeperSport === 'nba' ? 'basketball'
    : sleeperSport === 'mlb' ? 'baseball'
    : sleeperSport === 'nhl' ? 'hockey'
    : null

  if (sport) {
    platformsStore
      .syncSleeperLeague(league as any, sport)
      .catch((e) => console.error('[Sleeper] sync failed', e))
  }

  emit('league-added', league)
}

// ============================================================
// Yahoo Methods
// ============================================================

function connectYahoo() {
  emit('close')
  platformsStore.connectYahoo()
}

async function switchYahooAccount() {
  await platformsStore.disconnectPlatform('yahoo')
  emit('close')
  platformsStore.connectYahoo()
}

async function loadAllYahooLeagues() {
  if (!authStore.user?.id) return
  
  loadingYahooLeagues.value = true
  
  try {
    // Try Yahoo API for all sports. Even if some fail, use Supabase as fill-in for those.
    const sports: Sport[] = ['football', 'baseball', 'basketball', 'hockey']
    const failedSports: Sport[] = []

    const initialized = await yahooService.initialize(authStore.user.id)
    if (initialized) {
      const results = await Promise.allSettled(
        sports.map(sport => yahooService.getLeagues(sport))
      )
      sports.forEach((sport, index) => {
        const result = results[index]
        if (result.status === 'fulfilled' && result.value.length > 0) {
          yahooLeaguesBySport.value[sport] = result.value
          console.log(`[Yahoo Modal] ${result.value.length} ${sport} leagues from Yahoo API`)
        } else {
          if (result.status === 'rejected') console.error(`Yahoo API failed for ${sport}:`, result.reason)
          yahooLeaguesBySport.value[sport] = []
          failedSports.push(sport)
        }
      })
    } else {
      // Can't reach Yahoo at all — fall back all sports from Supabase
      sports.forEach(s => failedSports.push(s))
    }

    // For any sports that didn't load from Yahoo, check Supabase
    if (failedSports.length > 0) {
      console.log(`[Yahoo Modal] Filling ${failedSports.join(', ')} from Supabase...`)
      const { supabase } = await import('@/lib/supabase')
      if (supabase) {
        const { data, error } = await supabase
          .from('leagues')
          .select('*')
          .eq('user_id', authStore.user.id)
          .eq('platform', 'yahoo')
          .in('sport', failedSports)
          .order('season', { ascending: false })

        if (!error && data && data.length > 0) {
          console.log(`[Yahoo Modal] ${data.length} leagues from Supabase for failed sports`)
          for (const row of data) {
            const sport = row.sport as Sport
            if (failedSports.includes(sport)) {
              yahooLeaguesBySport.value[sport].push({
                league_key: row.platform_league_id,
                league_id: row.platform_league_id?.split('.l.')[1] || row.platform_league_id,
                name: row.league_name,
                season: row.season,
                num_teams: row.league_size || 0,
                scoring_type: row.scoring_type,
                league_type: row.settings?.league_type || '',
                current_week: row.settings?.current_week || 1,
                start_week: row.settings?.start_week || 1,
                end_week: row.settings?.end_week || 25,
                is_finished: !row.is_active
              })
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error loading Yahoo leagues:', err)
  } finally {
    loadingYahooLeagues.value = false
  }
}

async function syncYahooLeagues() {
  loadingYahooLeagues.value = true
  try {
    // Sync all sports
    const sports: Sport[] = ['football', 'baseball', 'basketball', 'hockey']
    await Promise.allSettled(
      sports.map(sport => platformsStore.syncYahooLeagues(sport))
    )
    await loadAllYahooLeagues()
  } finally {
    loadingYahooLeagues.value = false
  }
}

function selectYahooLeague(league: GroupedYahooLeague, sport: Sport) {
  emit('yahoo-league-added', { ...league, sport })
}

// ============================================================
// ESPN Methods
// ============================================================

async function validateEspnLeague() {
  if (!espnLeagueId.value.trim()) return
  
  loading.value = true
  errorMessage.value = ''
  espnDiscoveryStatus.value = 'Finding league...'
  
  try {
    // Initialize ESPN service
    if (authStore.user?.id) {
      console.log('[ESPN] Initializing service for user:', authStore.user.id)
      await espnService.initialize(authStore.user.id)
    } else {
      console.error('[ESPN] No user ID available')
      errorMessage.value = 'Please sign in first.'
      return
    }
    
    // Check if we have stored credentials
    const credentials = platformsStore.getEspnCredentials()
    if (credentials) {
      console.log('[ESPN] Using stored credentials')
      espnService.setCredentials(credentials.espn_s2, credentials.swid)
    }
    
    const leagueId = espnLeagueId.value.trim()
    console.log('[ESPN] Discovering league:', leagueId)
    
    // Quick discovery - just detect sport and get basic info
    const discovered = await espnService.discoverLeague(leagueId)
    
    console.log('[ESPN] Discovery result:', discovered)
    
    if (!discovered) {
      errorMessage.value = 'Could not find this league in any sport (football, baseball, basketball, hockey) for the last 3 seasons. Please double-check the League ID.'
      return
    }
    
    // Ask for credentials if:
    // 1. League is private (required), OR
    // 2. First ESPN league ever (needed for "my team" highlighting)
    if (!credentials) {
      espnNeedsCredentials.value = true
      espnSport.value = discovered.sport
      espnDiscoveredLeague.value = discovered
      errorMessage.value = ''
      espnDiscoveryStatus.value = ''
      // Check for Chrome extension while showing credential step
      checkEspnExtension()
      return
    }
    
    console.log('[ESPN] League discovered:', discovered)
    espnSport.value = discovered.sport
    espnSeason.value = discovered.currentSeason
    
    // Save just the current season (fast - no re-fetch needed!)
    espnDiscoveryStatus.value = `Found ${discovered.name} - saving...`
    
    const syncResult = await platformsStore.syncEspnLeague(
      discovered.leagueId,
      discovered.sport,
      discovered.currentSeason,
      { name: discovered.name, size: discovered.size }
    )
    
    if (!syncResult.success) {
      errorMessage.value = syncResult.error || 'Failed to save league.'
      return
    }
    
    espnDiscoveryStatus.value = ''
    
    // Emit success
    emit('espn-league-added', {
      leagueId: discovered.leagueId,
      sport: discovered.sport,
      season: discovered.currentSeason,
      league: discovered
    })
    
  } catch (err: any) {
    console.error('[ESPN] Error discovering league:', err)
    
    if (err.message?.includes('private') || err.message?.includes('403')) {
      espnNeedsCredentials.value = true
      errorMessage.value = ''
    } else if (err.message?.includes('Not authenticated') || err.message?.includes('sign in')) {
      errorMessage.value = 'Please sign in to add ESPN leagues.'
    } else if (err.message?.includes('session may have expired') || err.message?.includes('credentials expired') || err.message?.includes('authentication failed')) {
      errorMessage.value = 'Your session appears to have expired. Try signing out and back in, then try again.'
    } else if (err.message?.includes('Unable to reach ESPN') || err.message?.includes('proxy')) {
      errorMessage.value = 'Unable to reach the ESPN API service. Please try again in a few minutes. If the problem persists, the proxy service may need to be restarted.'
    } else if (err.message?.includes('timed out')) {
      errorMessage.value = 'Request timed out. ESPN servers may be slow. Please try again.'
    } else if (err.message?.includes('server error') || err.message?.includes('500') || err.message?.includes('502') || err.message?.includes('503')) {
      errorMessage.value = 'ESPN API is returning server errors. Please try again later.'
    } else {
      errorMessage.value = err.message || 'An error occurred. Please try again.'
    }
  } finally {
    loading.value = false
    espnDiscoveryStatus.value = ''
  }
}

async function connectEspnPrivate() {
  if (!espnS2Cookie.value.trim() || !espnSwidCookie.value.trim()) return
  
  loading.value = true
  errorMessage.value = ''
  espnDiscoveryStatus.value = 'Validating credentials...'
  
  try {
    console.log('[ESPN] Connecting league with credentials')
    
    // Store and validate credentials
    const result = await platformsStore.storeEspnCredentials({
      espn_s2: espnS2Cookie.value.trim(),
      swid: espnSwidCookie.value.trim(),
      leagueId: espnLeagueId.value,
      sport: espnSport.value,
      season: espnSeason.value
    })
    
    if (!result.success) {
      errorMessage.value = result.error || 'Invalid credentials. Please check and try again.'
      espnDiscoveryStatus.value = ''
      return
    }
    
    // Use already-discovered league if available, otherwise re-discover
    let discovered = espnDiscoveredLeague.value
    if (!discovered) {
      espnDiscoveryStatus.value = 'Finding league...'
      discovered = await espnService.discoverLeague(espnLeagueId.value)
    }
    
    if (!discovered) {
      errorMessage.value = 'Could not access league. Please check your credentials.'
      espnDiscoveryStatus.value = ''
      return
    }
    
    console.log('[ESPN] League discovered:', discovered)
    espnSport.value = discovered.sport
    espnSeason.value = discovered.currentSeason
    
    // Save just the current season (no re-fetch needed!)
    espnDiscoveryStatus.value = `Found ${discovered.name} - saving...`
    
    const syncResult = await platformsStore.syncEspnLeague(
      discovered.leagueId,
      discovered.sport,
      discovered.currentSeason,
      { name: discovered.name, size: discovered.size }
    )
    
    if (!syncResult.success) {
      errorMessage.value = syncResult.error || 'Failed to save league.'
      return
    }
    
    espnDiscoveryStatus.value = ''
    
    // Emit success
    emit('espn-league-added', {
      leagueId: discovered.leagueId,
      sport: discovered.sport,
      season: discovered.currentSeason,
      league: discovered
    })
    
  } catch (err: any) {
    console.error('[ESPN] Error connecting private league:', err)
    errorMessage.value = err.message || 'Failed to connect. Please make sure you are logged in to ESPN and try again.'
  } finally {
    loading.value = false
    espnDiscoveryStatus.value = ''
  }
}

// ── ESPN Email/Password Login ─────────────────────────────────────────────
async function loginToEspn() {
  if (!espnLoginEmail.value.trim() || !espnLoginPassword.value.trim()) return
  espnLoginLoading.value = true
  espnLoginError.value = ''
  espnLoginSuccess.value = false
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
    let accessToken = ''
    try {
      const keys = Object.keys(localStorage)
      const authKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      if (authKey) {
        const parsed = JSON.parse(localStorage.getItem(authKey) || '{}')
        accessToken = parsed?.access_token || ''
      }
    } catch {}
    const resp = await fetch(`${supabaseUrl}/functions/v1/espn-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ email: espnLoginEmail.value.trim(), password: espnLoginPassword.value }),
    })
    const data = await resp.json()
    if (!resp.ok || data.error) {
      if (data.error === 'invalid_credentials') espnLoginError.value = 'Incorrect email or password.'
      else if (data.error === 'rate_limited') espnLoginError.value = 'Too many attempts. Please wait a few minutes.'
      else espnLoginError.value = data.message || 'Login failed. Please try again.'
      return
    }
    if (!data.espn_s2 || !data.swid) {
      espnLoginError.value = 'Login succeeded but credentials could not be read. Try entering cookies manually.'
      return
    }
    espnExtensionCredentials.value = { espn_s2: data.espn_s2, swid: data.swid }
    espnS2Cookie.value = data.espn_s2
    espnSwidCookie.value = data.swid
    const { espnService } = await import('@/services/espn')
    espnService.setCredentials(data.espn_s2, data.swid)
    espnLoginSuccess.value = true
  } catch (err: any) {
    espnLoginError.value = 'Could not reach ESPN. Please try again.'
  } finally {
    espnLoginLoading.value = false
    espnLoginPassword.value = ''
  }
}

</script>

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'instant' }
  },
  routes: [
    // Landing — for now, drop visitors straight into the demo until
    // a proper marketing landing page exists.
    {
      path: '/',
      redirect: '/demo-categories/connect',
    },

    // Auth flow
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('@/views/AuthCallbackView.vue'),
    },
    {
      path: '/auth/yahoo-callback',
      name: 'yahoo-callback',
      component: () => import('@/views/YahooCallbackView.vue'),
    },
    {
      path: '/auth/yahoo-error',
      name: 'yahoo-error',
      component: () => import('@/views/YahooErrorView.vue'),
    },

    // Privacy (public)
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('@/views/PrivacyView.vue'),
      meta: { public: true },
    },

    // Settings (authenticated — manage connected leagues)
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },

    // Signup landing
    {
      path: '/signup',
      name: 'signup-page',
      component: () => import('@/views/SignupPage.vue'),
    },

    // Internal brand exploration — wordmark mockups for the logo.
    // Hidden from production via the hostname guard below.
    {
      path: '/internal/logo-mockups',
      name: 'internal-logo-mockups',
      component: () => import('@/views/LogoMockupsView.vue'),
    },

    // Live league routes — your real connected leagues. URL is keyed
    // by the Supabase `leagues.id` UUID so the switcher can deep-link
    // without exposing platform identifiers.
    {
      path: '/leagues/:leagueId',
      component: () => import('@/views/MyLeagueLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: (to) => `/leagues/${to.params.leagueId}/home` },
        {
          path: 'home',
          name: 'my-league-home',
          component: () => import('@/views/CategoryDemoHomeView.vue'),
        },
        {
          path: 'power-rankings',
          name: 'my-league-power-rankings',
          component: () => import('@/views/CategoryDemoPowerRankingsView.vue'),
        },
        {
          path: 'matchups',
          name: 'my-league-matchups',
          component: () => import('@/views/CategoryDemoMatchupsView.vue'),
        },
        {
          path: 'draft',
          name: 'my-league-draft',
          component: () => import('@/views/CategoryDemoDraftView.vue'),
        },
        {
          path: 'history',
          name: 'my-league-history',
          component: () => import('@/views/CategoryDemoHistoryView.vue'),
        },
      ],
    },

    // Category-league demo (fixture data — for unauthenticated visitors
    // exploring the product before connecting a league).
    {
      path: '/demo-categories',
      component: () => import('@/views/CategoryDemoLayout.vue'),
      children: [
        // First-time visitors land on the connect picker.
        { path: '', redirect: '/demo-categories/connect' },
        {
          path: 'connect',
          name: 'demo-cat-connect',
          component: () => import('@/views/CategoryDemoConnectView.vue'),
        },
        {
          path: 'home',
          name: 'demo-cat-home',
          component: () => import('@/views/CategoryDemoHomeView.vue'),
        },
        {
          path: 'power-rankings',
          name: 'demo-cat-power-rankings',
          component: () => import('@/views/CategoryDemoPowerRankingsView.vue'),
        },
        {
          path: 'matchups',
          name: 'demo-cat-matchups',
          component: () => import('@/views/CategoryDemoMatchupsView.vue'),
        },
        {
          path: 'draft',
          name: 'demo-cat-draft',
          component: () => import('@/views/CategoryDemoDraftView.vue'),
        },
        {
          path: 'history',
          name: 'demo-cat-history',
          component: () => import('@/views/CategoryDemoHistoryView.vue'),
        },
      ],
    },

    // Catch-all: anything we don't recognize redirects to the demo.
    {
      path: '/:pathMatch(.*)*',
      redirect: '/demo-categories/connect',
    },
  ],
})

// Navigation guards
router.beforeEach((to, _from, next) => {
  // Hide internal brand-exploration surfaces from production.
  if (to.path.startsWith('/internal') && typeof window !== 'undefined') {
    const host = window.location.hostname
    const isProdHost =
      host === 'theleaguebeat.com' || host === 'www.theleaguebeat.com'
    if (isProdHost) {
      next({ path: '/' })
      return
    }
  }

  if (to.meta.requiresAuth) {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      next({ path: '/', query: { redirect: to.fullPath, showLogin: 'true' } })
      return
    }
  }
  next()
})

router.afterEach(() => {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'PageView')
  }
})

export default router

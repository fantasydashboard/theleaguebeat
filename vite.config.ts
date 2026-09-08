import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    proxy: {
      /**
       * Slide export needs same-origin images.
       *
       * Rasterising a slide to PNG reads it back off a canvas, and any
       * cross-origin image without CORS headers taints that canvas so
       * the read throws. Sleeper's CDN sends no `Access-Control-Allow-
       * Origin` on avatars, uploads or headshots — verified — so every
       * team crest and player face has to come through our own origin.
       *
       * `api/proxy-image.js` already does that in production. Vite does
       * not run Vercel functions, so in dev the same path is forwarded
       * to the deployed one; without this, exports work in production
       * and silently lose every logo on localhost.
       *
       * Scoped to this ONE endpoint on purpose. Proxying all of `/api`
       * would point `share` and `supabase` at production too, which
       * means local development writing to the live database.
       */
      '/api/proxy-image': {
        // www, not the apex: the apex 307s to www and vite's proxy
        // does not follow redirects, so every image came back as a
        // 15-byte redirect body instead of a PNG.
        target: 'https://www.theleaguebeat.com',
        changeOrigin: true,
      },
    },
  },
})

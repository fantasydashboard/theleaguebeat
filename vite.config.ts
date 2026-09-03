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
      // `npm run dev` is vite alone — it never runs anything in api/,
      // so /api/adp would 404 locally and the draft slides would
      // silently fall back to Sleeper's ranking. Standing in for
      // api/adp.js here means local dev exercises the same ADP path
      // production does. Keep the two in step: this rewrite mirrors
      // the URL that handler builds.
      '/api/adp': {
        target: 'https://fantasyfootballcalculator.com',
        changeOrigin: true,
        rewrite: (p: string) => {
          const q = new URLSearchParams(p.split('?')[1] ?? '')
          const format = q.get('format') ?? 'ppr'
          const year = q.get('year') ?? ''
          return `/api/v1/adp/${format}?year=${year}`
        },
      },
    },
  },
})

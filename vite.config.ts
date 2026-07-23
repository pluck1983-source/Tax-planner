import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Served from a GitHub Pages project site (https://<user>.github.io/Tax-planner/)
// in production, but from the root locally.
const base = process.env.GITHUB_PAGES ? '/Tax-planner/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-32.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Childminder Income Tracker',
        short_name: 'Childminder',
        description: 'Income tracker and forecaster for childminders - funding rates, term dates, holidays and attendance.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#0d9488',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the app needs is bundled at build time and all data is
        // local (localStorage) - precache the whole app shell so it works
        // fully offline after the first load.
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
    }),
  ],
})

import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Served from a GitHub Pages project site (https://<user>.github.io/Tax-planner/)
// in production, but from the root locally.
const base = process.env.GITHUB_PAGES ? '/Tax-planner/' : '/'

// Content-Security-Policy, added to the built index.html only. The dev server
// needs an inline React-refresh script and a websocket for hot reload, which
// this policy would block. Google sign-in is a full-page redirect (no Google
// script or iframe), so only the Drive/OAuth API hosts the app fetches from
// are allowed out. frame-ancestors can't be set from a meta tag.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "connect-src 'self' https://www.googleapis.com https://oauth2.googleapis.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const cspMetaTag: Plugin = {
  name: 'csp-meta-tag',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
  ],
}

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    cspMetaTag,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-32.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Director Tax Planner',
        short_name: 'Tax Planner',
        description: 'Plan how much to save each month for your self-assessment tax bill.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#4f46e5',
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

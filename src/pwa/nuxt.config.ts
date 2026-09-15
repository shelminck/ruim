import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string }

export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  ssr: false,
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      // Used by the tamper-heuristic consent flow (ADR 0005 §3) to decide
      // whether a re-triggered signal is "new" (different app version) or
      // already acknowledged.
      appVersion: pkg.version,
    },
  },

  css: ['~/assets/css/tokens.css', '~/assets/css/base.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'nl' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Caprasimo&display=swap',
        },
      ],
    },
  },

  modules: ['@vite-pwa/nuxt'],

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Ruim',
      short_name: 'Ruim',
      description: 'Huishoudboekje met potjes — lokaal-eerst',
      lang: 'nl',
      theme_color: '#2c3a54',
      background_color: '#f5ead8',
      display: 'standalone',
      icons: [],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wasm}'],
    },
    devOptions: {
      enabled: false,
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },
})

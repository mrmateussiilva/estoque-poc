import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'S.G.E. - Smart Stock',
        short_name: 'SGE',
        description: 'Sistema de Gestão de Estoque - Controle inteligente de estoque',
        theme_color: '#e11d48',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Acessar dashboard',
            url: '/?page=dashboard',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Estoque',
            short_name: 'Estoque',
            description: 'Ver estoque',
            url: '/?page=stock',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Não interceptar requisições de API - deixar passar direto
        // O Service Worker não deve interferir com requisições cross-origin
        runtimeCaching: [
          {
            // Apenas cachear imagens de domínios externos
            urlPattern: /^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 dias
              }
            }
          }
        ],
        skipWaiting: true,
        clientsClaim: true,
        // Não interceptar requisições de API
        navigateFallback: null,
        navigateFallbackDenylist: [/^\/api\//, /^\/_/, /\/[^/?]+\.[^/]+$/]
      },
      devOptions: {
        enabled: false // Desabilitar em dev para evitar problemas
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8003',
        changeOrigin: true,
      },
    }
  }
})

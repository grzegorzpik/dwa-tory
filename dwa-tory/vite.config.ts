import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Wdrożenie: GitHub Pages pod https://<user>.github.io/dwa-tory/ — base musi
// odpowiadać nazwie repo. Zmienna środowiskowa zamiast hardkodu na wypadek
// zmiany nazwy repo/forka bez edycji tego pliku.
const base = process.env.VITE_BASE_PATH ?? '/dwa-tory/';

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png'],
      // injectManifest zamiast domyślnego generateSW — Push API (krok 8,
      // dokończenie) wymaga własnych event listenerów w service workerze
      // ('push', 'notificationclick'), których generateSW nie obsługuje.
      // Własny SW: src/sw.ts (precacheAndRoute + te same trasy cache'owania
      // fontów co niżej w `workbox`, przeniesione tam 1:1, plus obsługa push).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        id: base,
        name: 'Dwa Tory',
        short_name: 'Dwa Tory',
        description: 'Aplikacja do świadomego gospodarowania czasem i realizacji celów dla dwóch osób.',
        lang: 'pl',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0B1512',
        theme_color: '#12211D',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Praca offline: dane aplikacji żyją w IndexedDB, więc powłoka
      // (HTML/JS/CSS) wystarczy zserwować z cache, żeby appka wystartowała
      // bez sieci — precache'owanie tego manifestu robi src/sw.ts.
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})

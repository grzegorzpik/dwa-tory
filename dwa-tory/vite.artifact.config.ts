import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Build pomocniczy tylko do podglądu (np. jako artefakt) — jeden
// samowystarczalny plik HTML, bez service workera (rejestracja PWA nie ma
// sensu poza prawdziwym originem). Prawdziwy build produkcyjny to
// `npm run build` (vite.config.ts).
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: 'dist-artifact',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
})

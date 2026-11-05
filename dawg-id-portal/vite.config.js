import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves this repo at /DAWG-ID/ — asset paths must include it.
  // Dev mode keeps '/' so `npm run dev` works unchanged.
  base: mode === 'production' ? '/DAWG-ID/' : '/',
  plugins: [react()],
}))

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves this repo at /DAWG-ID/ — asset paths must include it.
  // Vercel serves at the domain root. Dev server keeps '/'.
  base: process.env.VERCEL ? '/' : mode === 'production' ? '/DAWG-ID/' : '/',
  plugins: [react()],
}))

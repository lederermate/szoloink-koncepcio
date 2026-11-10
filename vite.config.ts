import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages demó: https://<user>.github.io/szoloink-koncepcio/
  base: process.env.VITE_DEMO === '1' ? (process.env.DEMO_BASE ?? '/szoloink-koncepcio/') : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: { '/api': 'http://localhost:3001' },
  },
})

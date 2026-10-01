import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // React, React Query, the router and zod make up most of the main bundle.
    chunkSizeWarningLimit: 700,
  },
  resolve: {
    alias: { '@': '/src' },
  },
})

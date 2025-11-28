import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    middlewareMode: false,
  },
  preview: {
    headers: {
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    },
  },
})

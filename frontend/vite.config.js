import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Builds into ../static/dist, which app.py serves directly (static_folder=frontend/dist).
// During `npm run dev`, API calls are proxied to the Flask backend on :5000 so the
// dev server and the backend can run side by side without a CORS dance.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/health': 'http://localhost:5000',
    },
  },
})

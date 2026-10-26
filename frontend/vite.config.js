import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// API calls to /api go to the FastAPI server. Inside Docker the backend is
// reachable as http://backend:8000, which docker-compose sets below.
const apiTarget = process.env.VITE_API_PROXY || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
})

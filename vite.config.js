import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The app and the demo video (rendered by scripts/render-video.mjs).
    rollupOptions: { input: { main: 'index.html', video: 'video.html' } },
  },
})

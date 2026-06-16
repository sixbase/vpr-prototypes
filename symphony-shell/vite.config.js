import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standalone Current Left Nav shell prototype.
// node_modules is a symlink to ../scope-navigator/node_modules, so keep the
// dep pre-bundle cache LOCAL (not inside the shared node_modules) to avoid
// clobbering scope-navigator's cache.
export default defineConfig({
  plugins: [react()],
  cacheDir: '.vite',
  server: {
    port: parseInt(process.env.PORT || '5186'),
  },
})

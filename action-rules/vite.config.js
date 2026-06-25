import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/vipre-prototypes/action-rules/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5181,
  },
}))

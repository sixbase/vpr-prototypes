import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import Icons from 'unplugin-icons/vite'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/vipre-prototypes/scope-navigator/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    // Material Symbols via Iconify — only the icons referenced get inlined + tree-shaken.
    Icons({ compiler: 'jsx', jsx: 'react' }),
  ],
  resolve: {
    alias: {
      // lucide-react drop-in shim → Material Symbols (Rounded). See src/icons.jsx.
      '@icons': fileURLToPath(new URL('./src/icons.jsx', import.meta.url)),
    },
  },
  server: {
    port: parseInt(process.env.PORT || '5179'),
  },
}))

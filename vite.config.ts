import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    minify: 'terser',
    cssCodeSplit: true,
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
    },
    rollupOptions: {
      output: {
        // Mantem o vendor React separado do codigo do quiz pra cache longo.
        manualChunks(id) {
          if (id.includes('node_modules/react')) return 'react'
        },
      },
    },
  },
})

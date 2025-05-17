import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path
      }
    },
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: [
      '3533372c-d471-4845-9a9f-ff61515497c6-00-2f3z6v0oq80ha.worf.replit.dev',
      '.replit.dev'
    ]
  },
  build: {
    outDir: '../static/react',
    emptyOutDir: true,
    assetsDir: 'assets'
  }
})
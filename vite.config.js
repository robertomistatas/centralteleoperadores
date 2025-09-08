import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/centralteleoperadores/',
  build: {
    outDir: 'dist',
  },
  server: {
    host: '0.0.0.0', // Permite acceso desde cualquier IP en la red
    port: 5173,      // Puerto específico
    open: false      // No abrir automáticamente el navegador
  }
})

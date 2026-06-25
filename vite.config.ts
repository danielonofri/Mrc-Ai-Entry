import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Define la ruta base en minúsculas para la subcarpeta del IIS
  base: '/inventario/mrc-ai-entry/',
  
  plugins: [
    react()
  ],
  server: {
    host: true,
    port: 5174,
    strictPort: true
  }
})
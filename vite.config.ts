import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // three.js pesa ~950 kB y va en su propio archivo, que se carga después de la página (lazy).
    chunkSizeWarningLimit: 1100,
  },
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
})

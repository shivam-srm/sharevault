import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5600'

  return {
    plugins: [react()],
    server: {
      host: '::',
      port: 8080,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.{test,spec}.{js,jsx}'],
      setupFiles: './src/test/setup.js',
      coverage: {
        provider: 'v8',
        include: ['src/components/Auth/NotRequireAuth.jsx'],
        thresholds: {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
      },
    },
  }
})

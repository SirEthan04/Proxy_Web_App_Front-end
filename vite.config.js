import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import { resolveApiBase } from './src/shared/infrastructure/api-config.js'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') resolveApiBase({ ...loadEnv(mode, process.cwd(), 'VITE_'), PROD: true })
  return {
  plugins: [vue()],
  server: { host: 'localhost', port: 5174, strictPort: true, open: false },
  }
})

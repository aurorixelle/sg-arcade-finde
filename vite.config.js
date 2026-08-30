import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this at https://abc12354a.github.io/sg-arcade-finde/
  // (base matches the repo name, which is missing the trailing "r")
  base: '/sg-arcade-finde/',
})

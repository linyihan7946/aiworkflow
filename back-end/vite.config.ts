import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'server',
      formats: ['es']
    },
    rollupOptions: {
      external: ['http', 'https', 'fs', 'path'],
      output: {
        dir: 'dist',
        entryFileNames: '[name].js',
        format: 'es'
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'assets/chat-[hash].js',
        chunkFileNames: 'assets/chat-[hash].js',
        assetFileNames: 'assets/chat-[hash].[ext]'
      }
    }
  },
  plugins: [
    react(),
    {
      name: 'rename-index',
      closeBundle() {
        const fs = require('fs')
        const path = require('path')
        const outDir = resolve(__dirname, '../')
        const oldPath = path.join(outDir, 'index.html')
        const newPath = path.join(outDir, 'chat.html')
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath)
        }
      }
    }
  ]
})
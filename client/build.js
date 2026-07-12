import { execSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync, writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const docs = join(__dirname, '..', 'docs')

console.log('Building...')
execSync('npx vite build', { stdio: 'inherit', cwd: __dirname })

// 404.html = copia de index.html (para que las rutas de React funcionen en GitHub Pages)
copyFileSync(join(docs, 'index.html'), join(docs, '404.html'))

// CNAME: mantiene el dominio conocecr.com conectado
writeFileSync(join(docs, 'CNAME'), 'conocecr.com')

console.log('Build completado y publicado en /docs.')
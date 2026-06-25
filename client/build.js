import { execSync } from 'child_process'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

console.log('Building...')
execSync('npx vite build', { stdio: 'inherit', cwd: __dirname })
console.log('Build completado exitosamente.')
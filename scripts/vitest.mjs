// Lanza Vitest con la letra de unidad en mayúscula (solo afecta a Windows).
// Si la carpeta se abre como "c:\..." (por ejemplo, desde VS Code), Vitest carga su módulo
// dos veces (c:\ y C:\) y todas las pruebas fallan con "Vitest failed to find the current suite".
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const upperDrive = (p) => p.replace(/^[a-z]:/, (d) => d.toUpperCase())

const cwd = upperDrive(process.cwd())
const vitestDir = dirname(createRequire(import.meta.url).resolve('vitest/package.json'))
const vitestBin = upperDrive(join(vitestDir, 'vitest.mjs'))

const { status } = spawnSync(process.execPath, [vitestBin, ...process.argv.slice(2)], {
  cwd,
  stdio: 'inherit',
})
process.exit(status ?? 1)

/**
 * Запуск Vitest с явным --root: при symlink `frontend/node_modules` на другой проект
 * `vitest run` без этого подхватывает чужой каталог и не находит тесты.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.dirname(fileURLToPath(import.meta.url))
const vitest = path.join(frontendRoot, 'node_modules/vitest/vitest.mjs')
const mode = process.argv[2] || 'run'
const r = spawnSync(process.execPath, [vitest, mode, '--root', frontendRoot], {
  stdio: 'inherit',
  cwd: frontendRoot,
})
process.exit(r.status ?? 1)

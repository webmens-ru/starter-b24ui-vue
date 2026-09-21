import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import styles from './main.css?raw'

const source = styles || readFileSync(resolve(process.cwd(), 'src/assets/main.css'), 'utf8')

describe('global frontend typography', () => {
  it('inherits the host font without resetting every descendant', () => {
    expect(source).toContain(`#app {
  font-family: inherit;
}`)
    expect(source).toContain(`:where(
  #app button,
  #app input,
  #app select,
  #app textarea
) {
  font: inherit;
}`)
    expect(source).not.toMatch(/#app\s+\*[^\{]*\{[^}]*font(?:-family)?\s*:/s)
  })
})

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import styles from './main.css?raw'

const source = styles || readFileSync(resolve(process.cwd(), 'src/assets/main.css'), 'utf8')

describe('global frontend typography', () => {
  it('inherits native controls from the base layer so typography utilities keep precedence', () => {
    expect(source).toMatch(/@layer\s+base\s*\{\s*#app\s*\{\s*font-family:\s*inherit;\s*\}\s*:where\(\s*#app button,\s*#app input,\s*#app select,\s*#app textarea\s*\)\s*\{\s*font:\s*inherit;\s*\}/s)
  })

  it('does not reset every descendant font', () => {
    expect(source).not.toMatch(/#app\s+\*[^\{]*\{[^}]*font(?:-family)?\s*:/s)
  })
})

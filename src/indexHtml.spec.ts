import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('frontend entry document', () => {
  it('does not commit credentials or environment-specific runtime fixtures', () => {
    const html = readFileSync('index.html', 'utf8')

    expect(html).not.toContain('window._ACCESS_TOKEN_')
    expect(html).not.toContain('window._PARAMS_')
    expect(html).not.toContain('test-lk.doorhan-krd.ru')
  })
})

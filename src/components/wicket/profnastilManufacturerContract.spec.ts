import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const componentFiles = [
  'type1/ProfnastilFacade.vue',
  'type1/ProfnastilYard.vue',
  'type2/T2ProfnastilFacade.vue',
  'type2/T2ProfnastilYard.vue',
  'type9/T9ProfnastilFacade.vue',
  'type10/T10ProfnastilFacade.vue',
  'type11/T11ProfnastilFacade.vue',
]

describe('shared profnastil manufacturer contract', () => {
  it.each(componentFiles)('%s does not consume manufacturer', (file) => {
    const source = readFileSync(resolve(__dirname, file), 'utf8')

    expect(source).not.toContain('row.company')
    expect(source).not.toContain('selectedRow.company')
    expect(source).not.toContain('data-key="company"')
    expect(source).not.toContain('filters.companies')
    expect(source).not.toContain('Производитель материала')
  })

  it('removes manufacturer from API types and mock data', () => {
    const types = readFileSync(resolve(__dirname, '../../app/api/wicket.types.ts'), 'utf8')
    const mock = readFileSync(resolve(__dirname, '../../app/api/mockWicket.ts'), 'utf8')
    const profnastilRows = mock.match(/const PROFNASTIL_ROWS:[\s\S]*?\n\]/)?.[0] ?? ''
    const profnastilTable = mock.match(/mockGetProfnastilTable[\s\S]*?return \{ table, pagination/)?.[0] ?? ''

    expect(types.match(/interface ProfnastilFilters \{([\s\S]*?)\}/)?.[1]).not.toContain('companies')
    expect(types.match(/interface ProfnastilRow \{([\s\S]*?)\}/)?.[1]).not.toContain('company')
    expect(profnastilTable).not.toContain('filters.companies')
    expect(profnastilRows).not.toContain('company')
  })
})

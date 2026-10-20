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

describe('shared profnastil contract', () => {
  it.each(componentFiles)('%s keeps manufacturer and color out of table data', (file) => {
    const source = readFileSync(resolve(__dirname, file), 'utf8')
    const table = source.match(/<table\b[\s\S]*?<\/table>/)?.[0] ?? ''

    expect(source).not.toContain('row.company')
    expect(source).not.toContain('selectedRow.company')
    expect(source).not.toContain('data-key="company"')
    expect(source).not.toContain('filters.companies')
    expect(source).not.toContain('row.color')
    expect(source).not.toContain('selectedRow.color')
    expect(source).not.toContain('data-key="color"')
    expect(source).not.toContain('filters.colors')
    if (table) {
      expect(table).not.toMatch(/<th\b[^>]*>\s*Производитель(?: материала)?\s*<\/th>/)
      expect(table).not.toMatch(/<th\b[^>]*>\s*Цвет\s*<\/th>/)
    }
  })

  it('keeps profnastil name and material separate in API types and mock data', () => {
    const types = readFileSync(resolve(__dirname, '../../app/api/wicket.types.ts'), 'utf8')
    const mock = readFileSync(resolve(__dirname, '../../app/api/mockWicket.ts'), 'utf8')
    const profnastilRows = mock.match(/const PROFNASTIL_ROWS:[\s\S]*?\n\]/)?.[0] ?? ''
    const profnastilTable = mock.match(/mockGetProfnastilTable[\s\S]*?return \{ table, pagination/)?.[0] ?? ''
    const profnastilFilters = types.match(/interface ProfnastilFilters \{([\s\S]*?)\}/)?.[1] ?? ''
    const profnastilRow = types.match(/interface ProfnastilRow \{([\s\S]*?)\}/)?.[1] ?? ''

    expect(profnastilFilters).not.toContain('companies')
    expect(profnastilFilters).not.toContain('colors')
    expect(profnastilRow).not.toContain('company')
    expect(profnastilRow).not.toMatch(/\bcolor/)
    expect(profnastilRow).toMatch(/\bname:\s*string/)
    expect(profnastilRow).toMatch(/\bmaterial:\s*string/)
    expect(profnastilTable).not.toContain('filters.companies')
    expect(profnastilTable).not.toContain('filters.colors')
    expect(profnastilRows).not.toContain('company')
    expect(profnastilRows).not.toMatch(/\bcolor/)
    const rows = [...profnastilRows.matchAll(/^\s*\{ id: \d+,[^\n]*\},?$/gm)]
    expect(rows.length).toBeGreaterThan(0)
    for (const [row] of rows) {
      expect(row).toMatch(/\bname:\s*'[^']+'/)
      expect(row).toMatch(/\bmaterial:\s*'[^']+'/)
    }
  })
})

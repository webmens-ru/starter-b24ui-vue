import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const components = [
  ['type1/ProfnastilFacade.vue', 3],
  ['type1/ProfnastilYard.vue', 3],
  ['type9/T9ProfnastilFacade.vue', 3],
  ['type10/T10ProfnastilFacade.vue', 3],
  ['type11/T11ProfnastilFacade.vue', 3],
] as const

const nonProfnastilComponents = [
  ['type5/T5SpFacade.vue', 8],
  ['type5/T5SpYard.vue', 8],
  ['type6/T6ZhalyuziFacade.vue', 7],
  ['type7/T7SpFacade.vue', 8],
  ['type8/T8SheetFacade.vue', 8],
] as const

describe('filling thickness presentation contract', () => {
  it.each(components)('%s filters by coating and hides thickness from the table', (file, columnCount) => {
    const source = readFileSync(resolve(__dirname, file), 'utf8')
    const template = source.slice(source.indexOf('<template>') + '<template>'.length, source.lastIndexOf('</template>'))

    expect(source).toContain('typeOfCoating: [] as string[]')
    expect(template).toMatch(/label="Тип покрытия"[\s\S]*?data-key="typeOfCoating"[\s\S]*?v-model="filters\.typeOfCoating"/)
    expect(template).not.toContain('>Толщина листа</th>')
    expect(template).not.toContain('{{ selectedRow.thickness }}')
    expect(template).not.toContain('{{ row.thickness }}')
    expect(template).toContain(`colspan="${columnCount}"`)

    expect(source).toMatch(/calc\.thickness(?:Facade|Yard)\.value\s*=\s*String\(row\.thickness\)/)
  })

  it.each(nonProfnastilComponents)('%s keeps its thickness filter and column', (file, columnCount) => {
    const source = readFileSync(resolve(__dirname, file), 'utf8')
    const template = source.slice(source.indexOf('<template>') + '<template>'.length, source.lastIndexOf('</template>'))

    expect(source).toContain('thickness:')
    expect(template).toMatch(/label="Толщина листа"[\s\S]*?data-key="thickness"[\s\S]*?v-model="filters\.thickness"/)
    expect(template).toContain('>Толщина листа</th>')
    expect(template).toContain('{{ selectedRow.thickness }}')
    expect(template).toContain('{{ row.thickness }}')
    expect(template).toContain(`colspan="${columnCount}"`)
  })
})

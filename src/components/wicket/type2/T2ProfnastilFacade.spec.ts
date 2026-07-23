import { describe, expect, it } from 'vitest'
import facade from './T2ProfnastilFacade.vue?raw'
import yard from './T2ProfnastilYard.vue?raw'

describe('Type 2 profnastil pages', () => {
  it('replaces the facade table with the dependent form', () => {
    expect(facade).toContain('<T2ProfnastilForm ref="formRef" side="facade" />')
    expect(facade).not.toContain('<table')
    expect(facade).not.toContain('Толщина листа')
  })

  it('uses an independent form for the yard', () => {
    expect(yard).toContain('<T2ProfnastilForm ref="formRef" side="yard" />')
    expect(yard).not.toContain('<table')
    expect(yard).not.toContain('Толщина листа')
  })
})

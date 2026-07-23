import { describe, expect, it } from 'vitest'
import facade from './T2ProfnastilFacade.vue?raw'
import form from './T2ProfnastilForm.vue?raw'
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

  it('uses the page background and fills the available width', () => {
    expect(form).toContain('class="profnastil-form"')
    expect(form).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
    expect(form).not.toContain('bg-white')
    expect(form).not.toContain('shadow-sm')
    expect(form).not.toContain('max-w-2xl')
  })

  it('places manufacturer before profile', () => {
    expect(form.indexOf('>Производитель<')).toBeLessThan(form.indexOf('>Тип профиля '))
  })

  it('uses the searchable dropdown for dictionary colors', () => {
    expect(form).toContain('<B24SelectMenu')
    expect(form).toContain(':items="colorSelectItems"')
    expect(form).toContain('value-key="id"')
    expect(form).toContain('@update:model-value="onColorChange"')
    expect(form).not.toContain('<select v-model="colorId"')
  })
})

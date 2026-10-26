import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProviderChoice from '../components/wicket/ProviderChoice.vue'
import { applyWicketApiFieldMappings } from '../stores/wicket/wicketLoadApiApply'

describe('participant role properties', () => {
  it('keeps code radio values when every presentation label changes', async () => {
    const wrapper = mount(ProviderChoice, { props: { title: 'Роль', modelValue: 'customer', options: [
      { value: 'manufacturer', label: 'Первый участник' }, { value: 'customer', label: 'Второй участник' },
    ] } })
    expect(wrapper.get<HTMLInputElement>('input[value="customer"]').element.checked).toBe(true)
    await wrapper.get('input[value="manufacturer"]').setValue()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['manufacturer'])
    expect(wrapper.text()).toContain('Первый участник')
  })

  it('hydrates modern code before a conflicting legacy caption independently of response key order', () => {
    for (const response of [
      { providesPaint: 'Предоставляет изготовитель', providesPaintCode: 'customer' },
      { providesPaintCode: 'customer', providesPaint: 'Произвольное название' },
    ]) {
      const refs = { providesPaint: { value: 'manufacturer' } }
      applyWicketApiFieldMappings(response, refs)
      expect(refs.providesPaint.value).toBe('customer')
    }
  })

  it('isolates legacy captions and retains blank legacy defaults without guessing invalid selections', () => {
    for (const [response, expected] of [
      [{ providesPaint: 'Предоставляет заказчик' }, 'customer'],
      [{ providesPaint: null }, 'manufacturer'],
      [{ providesPaint: 'manufacturer' }, ''],
      [{ providesPaint: 'Неизвестно' }, ''],
      [{ providesPaint: 'Предоставляет изготовитель', providesPaintCode: 'unknown' }, ''],
      [{ providesPaint: 'Предоставляет заказчик', providesPaintCode: null }, 'customer'],
    ] as const) {
      const refs = { providesPaint: { value: 'customer' } }
      applyWicketApiFieldMappings(response, refs)
      expect(refs.providesPaint.value).toBe(expected)
    }
  })

  it('preserves independent primer and painter roles plus server diagnostics without mutation', () => {
    const response = { providesPaintCode: 'customer', providesPrimerCode: 'manufacturer',
      doesPaintingFrameCode: 'manufacturer', participantRoleProblems: { providesMaterial: { code: 'missing', message: 'Выберите' } } }
    const refs = { providesPaint: { value: '' }, providesPrimer: { value: '' }, doesPaintingFrame: { value: '' },
      participantRoleProblems: { value: null as unknown } }
    applyWicketApiFieldMappings(response, refs)
    expect(refs.providesPaint.value).toBe('customer')
    expect(refs.providesPrimer.value).toBe('manufacturer')
    expect(refs.doesPaintingFrame.value).toBe('manufacturer')
    expect(refs.participantRoleProblems.value).toEqual(response.participantRoleProblems)
    expect(response.providesPaintCode).toBe('customer')
  })

  it('does not revive a legacy caption when the API masks an invalid stored code as null with diagnostics', () => {
    const refs = { providesPaint: { value: 'customer' } }
    applyWicketApiFieldMappings({ providesPaintCode: null, providesPaint: 'Предоставляет изготовитель',
      participantRoleProblems: { providesPaint: { code: 'invalid', message: 'Выберите участника' } } }, refs)
    expect(refs.providesPaint.value).toBe('')
  })
})

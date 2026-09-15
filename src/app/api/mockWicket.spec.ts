import { describe, expect, it } from 'vitest'
import { mockGetFillingAppearanceOptions, mockGetSidingTable } from './mockWicket'

describe('mock wicket filling API', () => {
  it('возвращает строки сайдинга без данных внешнего вида', async () => {
    const result = await mockGetSidingTable({
      materials: ['Сайдинг «Бревно»'],
      form: [],
      typeOfCoating: [],
    })

    expect(result.table[0]).not.toHaveProperty('company')
    expect(result.table[0]).not.toHaveProperty('color')
  })

  it('возвращает справочники внешнего вида отдельно от строк сайдинга', async () => {
    await expect(mockGetFillingAppearanceOptions('Сайдинг')).resolves.toEqual({
      manufacturers: expect.arrayContaining([
        expect.objectContaining({ id: expect.any(Number), name: expect.any(String) }),
      ]),
      colors: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          hex: expect.toSatisfy((value: unknown) => value === null || typeof value === 'string'),
          image: expect.toSatisfy((value: unknown) => value === null || typeof value === 'string'),
        }),
      ]),
    })
  })
})

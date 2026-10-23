import { describe, expect, it } from 'vitest'
import { mockGetFillingAppearanceOptions, mockGetSidingTable, mockGetAssortmentStolb, mockGetAssortmentJumper, mockLoadWicketData } from './mockWicket'
import { createPinia, setActivePinia } from 'pinia'
import { useWicketFormStore } from '../../stores/wicket/wicketFormStore'

it('hydrates a mock draft with explicit used and unused pipe profiles', async () => {
  setActivePinia(createPinia())
  const store = useWicketFormStore()
  store.loadFromApi(await mockLoadWicketData(42))
  expect(store.postProfile).toEqual({ sizeA: 60, sizeB: 60 })
  expect(store.postProfileProblem).toBeNull()
  expect(store.jumperProfile).toBeNull()
  expect(store.jumperProfileProblem).toBeNull()
})

it('supplies explicit numeric pipe properties in mock options', async () => {
  const posts = await mockGetAssortmentStolb()
  const jumpers = await mockGetAssortmentJumper()
  expect(posts.assortmentPipe.map(item => 'profile' in item ? item.profile : null)).toEqual([
    { sizeA: 60, sizeB: 60 }, { sizeA: 60, sizeB: 40 }, { sizeA: 60, sizeB: 30 }, { sizeA: 60, sizeB: 40 },
  ])
  expect(jumpers.assortmentJumper.map(item => 'profile' in item ? item.profile : null)).toEqual([
    { sizeA: 20, sizeB: 20 }, { sizeA: 25, sizeB: 25 }, { sizeA: 30, sizeB: 30 },
    { sizeA: 40, sizeB: 20 }, { sizeA: 40, sizeB: 40 }, { sizeA: 50, sizeB: 25 }, { sizeA: 50, sizeB: 50 },
  ])
})

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

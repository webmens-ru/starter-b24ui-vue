import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useCalculation } from '../../composables/useCalculation'
import ShieldType from './ShieldType.vue'

vi.mock('../../app/api/wicket', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/api/wicket')>()),
  getColorShield: vi.fn().mockResolvedValue({ colorShield: [] }),
  getNetWidths: vi.fn().mockResolvedValue({ netWidths: [{ id: '150', name: '150' }] }),
  getNetsByWidth: vi.fn().mockResolvedValue({
    items: [{ id: 31, model: 'Сетка 150', imageUrl: '/net.png', sizeA: 150, sizeB: 150, thickness: 1, price: 100 }],
  }),
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  recalculate: vi.fn().mockResolvedValue({ priceDealer: 0, priceRetail: 0 }),
}))

const { saveWicketData, recalculate } = await import('../../app/api/wicket')

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
})

function mountShieldType() {
  return mount(ShieldType, {
    global: {
      plugins: [router],
      stubs: {
        B24Button: true,
        B24Modal: true,
        B24SelectMenu: true,
      },
    },
  })
}

async function validateBeforeLeave(wrapper: VueWrapper): Promise<boolean> {
  return await (wrapper.vm as unknown as {
    validateBeforeLeave: () => boolean | Promise<boolean>
  }).validateBeforeLeave()
}

function getNextButton(wrapper: VueWrapper) {
  const button = wrapper.findAll('button').find(candidate => candidate.text() === 'Далее')
  if (!button) throw new Error('Кнопка «Далее» не найдена')
  return button
}

describe('ShieldType top-only subtype', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.reset()
    calc.number.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '1'
    calc.openingOrientation.value = { opensOutward: true, hingeSide: 'left' }
    vi.mocked(saveWicketData).mockClear()
    vi.mocked(recalculate).mockClear()
  })

  it('does not save unresolved active side; explicit repair keeps subtype, size, net and provider', async () => {
    const calc = useCalculation()
    calc.shieldType.value = 'sideNet'
    calc.grilleLocation.value = ''
    calc.widthSidePart.value = '150'
    calc.assortmentSideGrilleNetId.value = 31
    calc.netWidthProviderSide.value = 'executor'
    calc.priceRetail.value = '1000'
    const wrapper = mountShieldType()
    await flushPromises()
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(recalculate).not.toHaveBeenCalled()
    expect(wrapper.find('img[alt="Сетка сбоку"]').exists()).toBe(false)
    expect(calc.widthSidePart.value).toBe('150')
    expect(calc.assortmentSideGrilleNetId.value).toBe(31)
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    await wrapper.find('input[value="lock"]').setValue(true)
    await flushPromises()
    expect(calc.shieldType.value).toBe('sideNet')
    expect(calc.grilleLocation.value).toBe('lock')
    expect(calc.widthSidePart.value).toBe('150')
    expect(calc.assortmentSideGrilleNetId.value).toBe(31)
    expect(calc.netWidthProviderSide.value).toBe('executor')
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ grilleSideCode: 'lock' }))
    expect(vi.mocked(saveWicketData).mock.lastCall?.[0]).not.toHaveProperty('grilleLocation')
    expect(wrapper.find('img[alt="Сетка сбоку"]').attributes('src')).toContain('/w_v_1.4_z.png')
    wrapper.unmount()
  })

  it('explicitly clears side property when selecting a shape without side nets', async () => {
    const calc = useCalculation()
    calc.grilleLocation.value = ''
    const wrapper = mountShieldType()
    await flushPromises()
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ grilleSideCode: null }))
    expect(vi.mocked(saveWicketData).mock.lastCall?.[0]).not.toHaveProperty('grilleLocation')
    wrapper.unmount()
  })

  it('does not save, calculate or clear nets for unresolved hydrated subtype', async () => {
    const calc = useCalculation()
    calc.shieldType.value = ''
    calc.heightTopPart.value = '150'
    calc.assortmentHeightUpperNetId.value = 31
    const wrapper = mountShieldType()
    await flushPromises()
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(calc.shieldType.value).toBe('')
    expect(calc.heightTopPart.value).toBe('150')
    expect(calc.assortmentHeightUpperNetId.value).toBe(31)
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(saveWicketData).not.toHaveBeenCalled()
    await wrapper.find('input[value="upperNet"]').setValue(true)
    await flushPromises()
    expect(calc.shieldType.value).toBe('upperNet')
    expect(calc.heightTopPart.value).toBe('150')
    expect(calc.assortmentHeightUpperNetId.value).toBe(31)
    expect(saveWicketData).toHaveBeenCalled()
    wrapper.unmount()
  })

  it.each([['right', 'g'], ['left', 'v']] as const)('chooses images from %s hinge property, never opening ID', async (hingeSide, suffix) => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.openingOrientation.value = { opensOutward: false, hingeSide }
    const wrapper = mountShieldType()
    await flushPromises()
    expect(wrapper.find('img[alt="Без сеток"]').attributes('src')).toContain(`/w_${suffix}_1.1.png`)
    wrapper.unmount()
  })

  it('does not guess image direction without opening properties', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 1
    calc.openingOrientation.value = null
    const wrapper = mountShieldType()
    await flushPromises()
    expect(wrapper.find('img[alt="Без сеток"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('rejects an invalid visible upper mesh and blocks Next', async () => {
    const calc = useCalculation()
    calc.shieldType.value = 'upperNet'
    calc.heightTopPart.value = '0'
    const wrapper = mountShieldType()
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()

    expect(await validateBeforeLeave(wrapper)).toBe(false)
    await flushPromises()
    expect(document.body.textContent).toContain('Выберите значение больше 0: Высота верхней части')
    expect(saveWicketData).not.toHaveBeenCalled()
    await getNextButton(wrapper).trigger('click')
    expect(wrapper.emitted('next')).toBeUndefined()
  })

  it('saves valid upper mesh and emits Next once', async () => {
    const calc = useCalculation()
    calc.shieldType.value = 'upperNet'
    calc.heightTopPart.value = '150'
    calc.assortmentHeightUpperNetId.value = 31
    const wrapper = mountShieldType()
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()

    expect(await validateBeforeLeave(wrapper)).toBe(true)
    expect(saveWicketData).toHaveBeenCalledTimes(1)
    await getNextButton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('explicitly clears the upper net assortment when the customer provides it', async () => {
    const calc = useCalculation()
    calc.shieldType.value = 'upperNet'
    calc.heightTopPart.value = '150'
    calc.netWidthProviderTop.value = 'customer'
    calc.assortmentHeightUpperNetId.value = 31

    const wrapper = mountShieldType()
    await flushPromises()

    expect(vi.mocked(saveWicketData).mock.lastCall?.[0]).toMatchObject({
      netWidthProviderTop: 'customer',
      assortmentHeightUpperNetId: null,
    })
    wrapper.unmount()
  })

  it('allows only one Next attempt while saving and rejects an overlapping guard call', async () => {
    const calc = useCalculation()
    calc.shieldType.value = 'upperNet'
    calc.heightTopPart.value = '150'
    calc.assortmentHeightUpperNetId.value = 31
    const wrapper = mountShieldType()
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()
    let finishSave!: (response: { lockVersion: number }) => void
    vi.mocked(saveWicketData).mockImplementationOnce(() => new Promise(resolve => {
      finishSave = resolve
    }))

    await getNextButton(wrapper).trigger('click')
    await getNextButton(wrapper).trigger('click')
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(saveWicketData).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('next')).toBeUndefined()

    finishSave({ lockVersion: 1 })
    await flushPromises()
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('places Type 5 between Type 2 and Type 3', async () => {
    const wrapper = mountShieldType()
    await flushPromises()

    expect(wrapper.findAll('.shield-grid input').map(input => input.attributes('value'))).toEqual([
      'noNet',
      'lowerNet',
      'upperNet',
      'upperAndLowerNet',
      'sideNet',
    ])
    expect(wrapper.findAll('.shield-grid img').map(image => image.attributes('alt'))).toEqual([
      'Без сеток',
      'Сетка снизу',
      'Сетка сверху',
      'Сетка снизу и сверху',
      'Сетка сбоку',
    ])
    wrapper.unmount()
  })

  it('keeps upper mesh and clears stale lower and side values on selection', async () => {
    const calc = useCalculation()
    calc.shieldType.value = 'upperAndLowerNet'
    calc.heightTopPart.value = '150'
    calc.assortmentHeightUpperNetId.value = 31
    calc.heightLowerPart.value = '200'
    calc.assortmentHeightLowerNetId.value = 32
    calc.widthSidePart.value = '100'
    calc.assortmentSideGrilleNetId.value = 33

    const wrapper = mountShieldType()
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()

    expect(wrapper.find('input[value="upperNet"]').exists()).toBe(true)
    await wrapper.get('input[value="upperNet"]').setValue(true)
    await flushPromises()

    expect(wrapper.text()).toContain('Высота сетки верхней части')
    expect(wrapper.text()).not.toContain('Высота сетки нижней части')
    expect(wrapper.text()).not.toContain('Ширина сетки боковой решётки')
    expect(wrapper.get('img[alt="Сетка сверху"]').attributes('src')).toMatch(/\/img\/wicket\/type1\/w_[gv]_1\.5\.png$/)
    expect(vi.mocked(saveWicketData).mock.lastCall?.[0]).toMatchObject({
      shieldType: 'upperNet',
      heightTopPart: '150',
      heightLowerPart: '0',
      widthSidePart: '0',
      netWidthProviderTop: 'executor',
      assortmentHeightUpperNetId: 31,
    })
    const payload = vi.mocked(saveWicketData).mock.lastCall?.[0]
    expect(payload?.netWidthProviderLower).toBeUndefined()
    expect(payload?.netWidthProviderSide).toBeUndefined()
    expect(payload?.assortmentHeightLowerNetId).toBeUndefined()
    expect(payload?.assortmentSideGrilleNetId).toBeUndefined()
    expect(calc.heightLowerPart.value).toBe('')
    expect(calc.widthSidePart.value).toBe('')
    wrapper.unmount()
  })

  it('restores Type 5 upper mesh and uses the shared preview directory for another model', async () => {
    const calc = useCalculation()
    calc.modelId.value = '11'
    calc.shieldType.value = 'upperNet'
    calc.heightTopPart.value = '150'
    calc.assortmentHeightUpperNetId.value = 31
    calc.netWidthProviderTop.value = 'executor'

    const wrapper = mountShieldType()
    await flushPromises()

    expect((wrapper.get('input[value="upperNet"]').element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.text()).toContain('Высота сетки верхней части')
    expect(wrapper.find('#heightTopPart').exists()).toBe(true)
    expect(calc.heightTopPart.value).toBe('150')
    expect(wrapper.get('img[alt="Сетка сверху"]').attributes('src')).toMatch(/\/img\/wicket\/type1\/w_[gv]_1\.5\.png$/)
    expect(vi.mocked(saveWicketData).mock.lastCall?.[0]).toMatchObject({
      shieldType: 'upperNet',
      heightTopPart: '150',
      assortmentHeightUpperNetId: 31,
    })
    wrapper.unmount()
  })
})

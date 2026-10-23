import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAssortmentStolb, getAssortmentJumper, getOpeningOptions, getPolozhenieJumper, recalculate, saveWicketData } from '../../app/api/wicket'
import { useCalculation } from '../../composables/useCalculation'
import StolbVariantOtkritiya from './StolbVariantOtkritiya.vue'

vi.mock('../../app/api/wicket', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/api/wicket')>()),
  getAssortmentStolb: vi.fn().mockResolvedValue({ assortmentPipe: [] }),
  getOpeningOptions: vi.fn(),
  getPolozhenieJumper: vi.fn().mockResolvedValue({ availablePolozheniyeJumper: [] }),
  getAssortmentJumper: vi.fn().mockResolvedValue({ assortmentJumper: [] }),
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  recalculate: vi.fn(),
}))

async function validateBeforeLeave(wrapper: VueWrapper): Promise<boolean> {
  return await (wrapper.vm as unknown as {
    validateBeforeLeave: () => boolean | Promise<boolean>
  }).validateBeforeLeave()
}

function mountComponent() {
  return mount(StolbVariantOtkritiya, {
    global: { stubs: { B24Button: true, B24Modal: true, B24SelectMenu: true } },
  })
}

function mountPipeComponent() {
  const select = {
    props: ['modelValue', 'items'], emits: ['update:modelValue'],
    template: `<select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
      <option value=""></option><option v-for="item in items" :key="item.id" :value="item.id" :disabled="item.disabled">{{ item.label }}</option>
    </select>`,
  }
  return mount(StolbVariantOtkritiya, { global: { stubs: { SelectMenu: select, B24SelectMenu: select } } })
}

function getNextButton(wrapper: VueWrapper) {
  const button = wrapper.findAll('button').find(candidate => candidate.text() === 'Далее')
  if (!button) throw new Error('Кнопка «Далее» не найдена')
  return button
}

describe('StolbVariantOtkritiya navigation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.reset()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '1'
    calc.hasStolby.value = 0
    calc.peremichkaPolozheniyeId.value = '1733'
    calc.jumperPlacement.value = 'none'
    vi.mocked(saveWicketData).mockClear()
    vi.mocked(recalculate).mockClear()
    vi.mocked(getAssortmentStolb).mockReset().mockResolvedValue({ assortmentPipe: [] })
    vi.mocked(getPolozhenieJumper).mockReset().mockResolvedValue({ availablePolozheniyeJumper: [
      { id: 1733, name: 'Любая подпись', placement: 'none', hasJumper: false },
    ] })
    vi.mocked(getOpeningOptions).mockResolvedValue({ options: [
      { id: 819, name: 'Одинаковая подпись', pathPhoto: '/img/wicket_opening_diagram_02.jpg', opensOutward: true, hingeSide: 'right' },
      { id: 920, name: 'Одинаковая подпись', pathPhoto: '/img/wicket_opening_diagram_04.jpg', opensOutward: false, hingeSide: 'left' },
    ], problems: [] })
  })

  it('loads opening diagrams and arbitrary references from the API', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.findAll('img').map(image => image.attributes('src'))).toEqual([
      '/img/wicket_opening_diagram_02.jpg',
      '/img/wicket_opening_diagram_04.jpg',
    ])
    expect(wrapper.findAll('input[type="radio"]').map(input => input.attributes('value'))).toContain('819')
    expect(getOpeningOptions).toHaveBeenCalledOnce()
  })

  it('commits numeric post profiles with FK and caption, without echoing derived fields', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.hasStolby.value = 1
    vi.mocked(getAssortmentStolb).mockResolvedValueOnce({ assortmentPipe: [
      { id: 985, name: '60/60 (не размеры)', profile: { sizeA: 80, sizeB: 40 }, profileProblem: null, disabled: false },
    ] })
    const wrapper = mountPipeComponent()
    await flushPromises()
    await wrapper.findAll('select')[0]!.setValue('985')
    await flushPromises()
    expect(calc.stolbId.value).toBe('985')
    expect(calc.stolbName.value).toBe('60/60 (не размеры)')
    expect(calc.postProfile.value).toEqual({ sizeA: 80, sizeB: 40 })
    expect(calc.postProfileProblem.value).toBeNull()
    expect(await validateBeforeLeave(wrapper)).toBe(true)
    expect(vi.mocked(saveWicketData).mock.lastCall?.[0]).not.toHaveProperty('postProfile')
    await wrapper.get('input[type="radio"][value="0"]').setValue()
    expect(calc.postProfile.value).toBeNull()
  })

  it('updates post identity and profile together even while an unrelated list blocks saving', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.hasStolby.value = 1
    calc.stolbId.value = 111
    calc.postProfile.value = { sizeA: 60, sizeB: 60 }
    vi.mocked(getAssortmentStolb).mockResolvedValueOnce({ assortmentPipe: [
      { id: 985, name: 'Новая труба', profile: { sizeA: 80, sizeB: 40 }, profileProblem: null, disabled: false },
    ] })
    let finish!: (value: Awaited<ReturnType<typeof getPolozhenieJumper>>) => void
    vi.mocked(getPolozhenieJumper).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const wrapper = mountPipeComponent()
    await flushPromises()
    await wrapper.findAll('select')[0]!.setValue('985')
    expect(calc.stolbId.value).toBe('985')
    expect(calc.stolbName.value).toBe('Новая труба')
    expect(calc.postProfile.value).toEqual({ sizeA: 80, sizeB: 40 })
    expect(saveWicketData).not.toHaveBeenCalled()
    wrapper.unmount()
    finish({ availablePolozheniyeJumper: [] })
    await flushPromises()
  })

  it('keeps unavailable saved pipe visible and blocks Next/recalculation', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.hasStolby.value = 1
    calc.stolbId.value = 985
    calc.stolbName.value = 'Историческая труба'
    calc.postProfileProblem.value = { code: 'unavailable', message: 'Труба недоступна' }
    calc.priceRetail.value = 123
    const wrapper = mountPipeComponent()
    await flushPromises()
    expect(wrapper.text()).toContain('Историческая труба')
    expect(wrapper.text()).toContain('Труба недоступна')
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(calc.stolbId.value).toBe(985)
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(recalculate).not.toHaveBeenCalled()
  })

  it('disables catalog pipes with invalid dimensions and rejects a saved invalid selection', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.hasStolby.value = 1
    calc.stolbId.value = 985
    calc.postProfile.value = { sizeA: 60, sizeB: 40 }
    vi.mocked(getAssortmentStolb).mockResolvedValueOnce({ assortmentPipe: [
      { id: 985, name: '60/40', profile: null, profileProblem: { code: 'invalid', message: 'Размеры не настроены' }, disabled: true },
    ] })
    const wrapper = mountPipeComponent()
    await flushPromises()
    expect(wrapper.get('option[value="985"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Размеры не настроены')
    expect(calc.postProfile.value).toBeNull()
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(saveWicketData).not.toHaveBeenCalled()
  })

  it('commits jumper properties independently of its caption and clears them on opening change', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.peremichkaPolozheniyeId.value = '55'
    vi.mocked(getPolozhenieJumper).mockResolvedValueOnce({ availablePolozheniyeJumper: [
      { id: 55, name: 'Положение', placement: 'above', hasJumper: true },
    ] })
    vi.mocked(getAssortmentJumper).mockResolvedValueOnce({ assortmentJumper: [
      { id: 984, name: '80/80', profile: { sizeA: 50, sizeB: 25 }, profileProblem: null, disabled: false },
    ] })
    const wrapper = mountPipeComponent()
    await flushPromises()
    await wrapper.findAll('select')[2]!.setValue('984')
    await flushPromises()
    expect(calc.assortmentJumperId.value).toBe('984')
    expect(calc.peremichkaSortamentName.value).toBe('80/80')
    expect(calc.jumperProfile.value).toEqual({ sizeA: 50, sizeB: 25 })
    expect(await validateBeforeLeave(wrapper)).toBe(true)
    expect(vi.mocked(saveWicketData).mock.lastCall?.[0]).not.toHaveProperty('jumperProfile')
    await wrapper.get('input[type="radio"][value="920"]').setValue()
    expect(calc.jumperProfile.value).toBeNull()
    expect(calc.assortmentJumperId.value).toBeNull()
  })

  it('permits a partial save with an invalid used profile but never recalculates', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.hasStolby.value = 1
    calc.stolbId.value = 985
    calc.priceRetail.value = 123
    vi.mocked(getAssortmentStolb).mockResolvedValueOnce({ assortmentPipe: [
      { id: 985, name: 'Труба', profile: null, profileProblem: { code: 'invalid', message: 'Нет размеров' }, disabled: true },
    ] })
    const wrapper = mountPipeComponent()
    await flushPromises()
    await wrapper.get('input[type="radio"][value="920"]').setValue()
    await flushPromises()
    expect(saveWicketData).toHaveBeenCalledOnce()
    expect(vi.mocked(saveWicketData).mock.lastCall?.[0]).toMatchObject({ stolbId: '985', openingOptionId: 920 })
    expect(recalculate).not.toHaveBeenCalled()
    expect(calc.postProfile.value).toBeNull()
    expect(await validateBeforeLeave(wrapper)).toBe(false)
  })

  it('retains an unavailable pipe caption during an unrelated partial save', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.hasStolby.value = 1
    calc.stolbId.value = 985
    calc.stolbName.value = 'Старая труба'
    calc.postProfileProblem.value = { code: 'unavailable', message: 'Труба недоступна' }
    const wrapper = mountPipeComponent()
    await flushPromises()
    await wrapper.get('input[type="radio"][value="920"]').setValue()
    await flushPromises()
    expect(calc.stolbName.value).toBe('Старая труба')
    expect(wrapper.text()).toContain('Старая труба')
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(recalculate).not.toHaveBeenCalled()
  })

  it('blocks an invalid saved jumper pipe even when the FK is in the catalog', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.assortmentJumperId.value = 984
    calc.jumperPlacement.value = 'above'
    calc.priceRetail.value = 123
    vi.mocked(getPolozhenieJumper).mockResolvedValueOnce({ availablePolozheniyeJumper: [
      { id: 1733, name: 'Любое', placement: 'above', hasJumper: true },
    ] })
    vi.mocked(getAssortmentJumper).mockResolvedValueOnce({ assortmentJumper: [
      { id: 984, name: '60/40', profile: null, profileProblem: { code: 'invalid', message: 'Размеры перемычки не настроены' }, disabled: true },
    ] })
    const wrapper = mountPipeComponent()
    await flushPromises()
    expect(wrapper.get('option[value="984"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Размеры перемычки не настроены')
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(calc.jumperProfile.value).toBeNull()
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(recalculate).not.toHaveBeenCalled()
  })

  it('clears a jumper profile immediately while a different placement list is loading', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.peremichkaPolozheniyeId.value = '55'
    calc.assortmentJumperId.value = 984
    calc.jumperProfile.value = { sizeA: 50, sizeB: 25 }
    vi.mocked(getPolozhenieJumper).mockResolvedValueOnce({ availablePolozheniyeJumper: [
      { id: 55, name: 'А', placement: 'above', hasJumper: true },
      { id: 66, name: 'Б', placement: 'behind', hasJumper: true },
    ] })
    vi.mocked(getAssortmentJumper).mockResolvedValueOnce({ assortmentJumper: [
      { id: 984, name: 'Подпись', profile: { sizeA: 50, sizeB: 25 }, profileProblem: null, disabled: false },
    ] })
    const wrapper = mountPipeComponent()
    await flushPromises()
    let finish!: (value: Awaited<ReturnType<typeof getAssortmentJumper>>) => void
    vi.mocked(getAssortmentJumper).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await wrapper.findAll('select')[1]!.setValue('66')
    expect(calc.assortmentJumperId.value).toBeNull()
    expect(calc.jumperProfile.value).toBeNull()
    wrapper.unmount()
    finish({ assortmentJumper: [{ id: 984, name: 'Поздно', profile: { sizeA: 80, sizeB: 60 }, profileProblem: null, disabled: false }] })
    await flushPromises()
    expect(calc.jumperProfile.value).toBeNull()
  })

  it('rejects a missing opening option and keeps the existing modal message', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()

    expect(await validateBeforeLeave(wrapper)).toBe(false)
    await flushPromises()
    expect(document.body.textContent).toContain('Выберите вариант открытия')
    expect(saveWicketData).not.toHaveBeenCalled()
    await getNextButton(wrapper).trigger('click')
    expect(wrapper.emitted('next')).toBeUndefined()
  })

  it('awaits saving a selected opening option and allows Next once', async () => {
    useCalculation().openingOptionId.value = 819
    const wrapper = mountComponent()
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()
    let finishSave!: (response: { lockVersion: number }) => void
    vi.mocked(saveWicketData).mockImplementationOnce(() => new Promise<{ lockVersion: number }>(resolve => {
      finishSave = resolve
    }))

    const validation = validateBeforeLeave(wrapper)
    let finished = false
    void validation.then(() => { finished = true })
    await flushPromises()
    expect(finished).toBe(false)
    expect(saveWicketData).toHaveBeenCalledTimes(1)
    finishSave({ lockVersion: 1 })
    expect(await validation).toBe(true)
    await getNextButton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('allows only one Next attempt while saving and rejects an overlapping guard call', async () => {
    useCalculation().openingOptionId.value = 819
    const wrapper = mountComponent()
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

  it('does not save or recalculate while restoring a saved selection', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.priceRetail.value = 123
    mountComponent()
    await flushPromises()
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(recalculate).not.toHaveBeenCalled()
    expect(calc.openingOrientation.value).toEqual({ opensOutward: true, hingeSide: 'right' })
  })

  it('selects duplicate captions by FK and properties, never by the caption', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.get('input[type="radio"][value="920"]').setValue()
    await flushPromises()
    const calc = useCalculation()
    expect(calc.openingOptionId.value).toBe(920)
    expect(calc.openingOrientation.value).toEqual({ opensOutward: false, hingeSide: 'left' })
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ openingOptionId: 920 }))
    expect(vi.mocked(saveWicketData).mock.lastCall?.[0]).not.toHaveProperty('openingOrientation')
  })

  it('keeps unavailable historical selection visible and blocks writes, Next and recalculation', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 777
    calc.openingOptionName.value = 'Исторический вариант'
    calc.openingOrientation.value = { opensOutward: false, hingeSide: 'right' }
    calc.openingOrientationProblem.value = { code: 'inactive', message: 'Вариант неактивен' }
    calc.priceRetail.value = 123
    const wrapper = mountComponent()
    await flushPromises()
    expect(wrapper.text()).toContain('Исторический вариант')
    expect(wrapper.text()).toContain('Вариант неактивен')
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(recalculate).not.toHaveBeenCalled()
    expect(getPolozhenieJumper).not.toHaveBeenCalled()
    expect(calc.openingOptionId.value).toBe(777)
  })

  it('blocks a saved selection on catalog load error without inventing options', async () => {
    vi.mocked(getOpeningOptions).mockRejectedValueOnce(new Error('offline'))
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.openingOptionName.value = 'Сохранённый вариант'
    const wrapper = mountComponent()
    await flushPromises()
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(wrapper.text()).toContain('Не удалось загрузить варианты открытия')
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(recalculate).not.toHaveBeenCalled()
  })

  it('does not advance or recalculate when saving is rejected', async () => {
    useCalculation().openingOptionId.value = 819
    const wrapper = mountComponent()
    await flushPromises()
    vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('HTTP 422'))
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(recalculate).not.toHaveBeenCalled()
  })

  it('blocks Next until the opening catalog has finished loading', async () => {
    let finish!: (value: Awaited<ReturnType<typeof getOpeningOptions>>) => void
    vi.mocked(getOpeningOptions).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    useCalculation().openingOptionId.value = 819
    const wrapper = mountComponent()
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(saveWicketData).not.toHaveBeenCalled()
    finish({ options: [{ id: 819, name: 'Переименовано', pathPhoto: null, opensOutward: false, hingeSide: 'right' }], problems: [] })
    await flushPromises()
    expect(useCalculation().openingOrientation.value).toEqual({ opensOutward: false, hingeSide: 'right' })
    expect(saveWicketData).not.toHaveBeenCalled()
  })

  it('does not let a stale dependent-list response save or overwrite the newest choice', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    let finishOld!: (value: Awaited<ReturnType<typeof getPolozhenieJumper>>) => void
    let finishNew!: (value: Awaited<ReturnType<typeof getPolozhenieJumper>>) => void
    vi.mocked(getPolozhenieJumper)
      .mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
      .mockImplementationOnce(() => new Promise(resolve => { finishNew = resolve }))
    await wrapper.get('input[type="radio"][value="819"]').setValue()
    await wrapper.get('input[type="radio"][value="920"]').setValue()
    finishNew({ availablePolozheniyeJumper: [{ id: 55, name: 'Актуальное положение', placement: 'above', hasJumper: true }] })
    await flushPromises()
    finishOld({ availablePolozheniyeJumper: [{ id: 66, name: 'Устаревшее положение', placement: 'behind', hasJumper: true }] })
    await flushPromises()
    expect(saveWicketData).toHaveBeenCalledTimes(1)
    expect(useCalculation().openingOptionId.value).toBe(920)
    expect(useCalculation().peremichkaPolozheniyeId.value).toBe('')
    expect(useCalculation().jumperPlacement.value).toBeNull()
  })

  it('does not overwrite another form after unmounting during catalog loading', async () => {
    let finish!: (value: Awaited<ReturnType<typeof getOpeningOptions>>) => void
    vi.mocked(getOpeningOptions).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    const wrapper = mountComponent()
    wrapper.unmount()
    calc.reset()
    finish({ options: [{ id: 819, name: 'Старый ответ', pathPhoto: null, opensOutward: true, hingeSide: 'right' }], problems: [] })
    await flushPromises()
    expect(calc.openingOptionId.value).toBeNull()
    expect(calc.openingOrientation.value).toBeNull()
    expect(saveWicketData).not.toHaveBeenCalled()
  })

  it('does not save after unmounting during a dependent-list request', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    let finish!: (value: Awaited<ReturnType<typeof getPolozhenieJumper>>) => void
    vi.mocked(getPolozhenieJumper).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await wrapper.get('input[type="radio"][value="819"]').setValue()
    wrapper.unmount()
    finish({ availablePolozheniyeJumper: [] })
    await flushPromises()
    expect(saveWicketData).not.toHaveBeenCalled()
  })

  it('does not guess missing posts from a display label', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.hasStolby.value = null
    calc.nalichieStolbovName.value = 'Со столбами'
    const wrapper = mountComponent()
    await flushPromises()
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(saveWicketData).not.toHaveBeenCalled()
  })

  it('persists numeric posts independent of the displayed labels', async () => {
    useCalculation().openingOptionId.value = 819
    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.get('input[type="radio"][value="1"]').setValue()
    await flushPromises()
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ hasStolby: 1 }))
    await wrapper.get('input[type="radio"][value="0"]').setValue()
    await flushPromises()
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ hasStolby: 0 }))
  })

  it.each([
    { id: 1, name: 'Без перемычки', placement: 'above' as const, hasJumper: true, visible: true },
    { id: 2941, name: 'Перемычка за створкой', placement: 'none' as const, hasJumper: false, visible: false },
  ])('uses properties rather than caption or semantic ID for pipe visibility: $placement', async option => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.peremichkaPolozheniyeId.value = String(option.id)
    calc.jumperPlacement.value = option.placement
    vi.mocked(getPolozhenieJumper).mockResolvedValueOnce({ availablePolozheniyeJumper: [option] })
    const wrapper = mountComponent()
    await flushPromises()
    const pipe = wrapper.findAll('.peremichka-select-wrap').find(element => element.text().startsWith('Труба:'))
    expect(pipe).toBeDefined()
    expect((pipe!.element as HTMLElement).style.display !== 'none').toBe(option.visible)
    expect(saveWicketData).not.toHaveBeenCalled()
  })

  it('keeps an unavailable jumper visible and blocks Next and recalculation', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.peremichkaPolozheniyeId.value = '777'
    calc.peremichkaPolozheniyeName.value = 'Историческая перемычка'
    calc.jumperPlacementProblem.value = { code: 'inactive', message: 'Перемычка неактивна' }
    calc.priceRetail.value = 123
    const wrapper = mountComponent()
    await flushPromises()
    expect(wrapper.text()).toContain('Перемычка неактивна')
    expect(wrapper.text()).toContain('Историческая перемычка')
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(calc.peremichkaPolozheniyeId.value).toBe('777')
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(recalculate).not.toHaveBeenCalled()
  })

  it('does not pick the first jumper when there is no saved choice', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.peremichkaPolozheniyeId.value = ''
    calc.jumperPlacement.value = null
    const wrapper = mountComponent()
    await flushPromises()
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(calc.peremichkaPolozheniyeId.value).toBe('')
    expect(saveWicketData).not.toHaveBeenCalled()
  })

  it('blocks Next while the jumper list is loading or failed', async () => {
    useCalculation().openingOptionId.value = 819
    let fail!: (error: Error) => void
    vi.mocked(getPolozhenieJumper).mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject }))
    const wrapper = mountComponent()
    await flushPromises()
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    fail(new Error('offline'))
    await flushPromises()
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(saveWicketData).not.toHaveBeenCalled()
  })

  it('blocks Next when a required jumper pipe is missing', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.jumperPlacement.value = 'above'
    vi.mocked(getPolozhenieJumper).mockResolvedValueOnce({ availablePolozheniyeJumper: [
      { id: 1733, name: 'Без перемычки', placement: 'above', hasJumper: true },
    ] })
    vi.mocked(getAssortmentJumper).mockResolvedValueOnce({ assortmentJumper: [] })
    const wrapper = mountComponent()
    await flushPromises()
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(saveWicketData).not.toHaveBeenCalled()
  })

  it('ignores a late opening response after the product-row context changed', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    let finish!: (value: Awaited<ReturnType<typeof getOpeningOptions>>) => void
    vi.mocked(getOpeningOptions).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    mountComponent()
    calc.productRowId.value = 8
    calc.openingOptionName.value = 'Другая позиция'
    finish({ options: [{ id: 819, name: 'Старый ответ', pathPhoto: null, opensOutward: true, hingeSide: 'right' }], problems: [] })
    await flushPromises()
    expect(calc.openingOptionName.value).toBe('Другая позиция')
    expect(saveWicketData).not.toHaveBeenCalled()
  })

  it('blocks Next while the required pipe list is loading and ignores its result after unmount', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.jumperPlacement.value = 'above'
    vi.mocked(getPolozhenieJumper).mockResolvedValueOnce({ availablePolozheniyeJumper: [
      { id: 1733, name: 'Любая подпись', placement: 'above', hasJumper: true },
    ] })
    let finish!: (value: Awaited<ReturnType<typeof getAssortmentJumper>>) => void
    vi.mocked(getAssortmentJumper).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const wrapper = mountComponent()
    await flushPromises()
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    wrapper.unmount()
    calc.reset()
    finish({ assortmentJumper: [{ id: 984, name: 'Новый сортамент', profile: { sizeA: 60, sizeB: 40 }, profileProblem: null, disabled: false }] })
    await flushPromises()
    expect(calc.assortmentJumperId.value).toBeNull()
    expect(saveWicketData).not.toHaveBeenCalled()
  })

  it('does not advance or recalculate a different product row after a late successful save', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.priceRetail.value = 123
    const wrapper = mountComponent()
    await flushPromises()
    let finish!: (value: { lockVersion: number }) => void
    vi.mocked(saveWicketData).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await getNextButton(wrapper).trigger('click')
    calc.productRowId.value = 8
    finish({ lockVersion: 2 })
    await flushPromises()
    expect(wrapper.emitted('next')).toBeUndefined()
    expect(recalculate).not.toHaveBeenCalled()
    expect(calc.priceRetail.value).toBe(123)
  })

  it('does not apply a late calculation price to a different product row', async () => {
    const calc = useCalculation()
    calc.openingOptionId.value = 819
    calc.priceRetail.value = 123
    const wrapper = mountComponent()
    await flushPromises()
    let finish!: (value: Awaited<ReturnType<typeof recalculate>>) => void
    vi.mocked(recalculate).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await getNextButton(wrapper).trigger('click')
    await flushPromises()
    expect(recalculate).toHaveBeenCalledOnce()
    calc.productRowId.value = 8
    finish({ priceDealer: '999', priceRetail: '999' })
    await flushPromises()
    expect(calc.priceRetail.value).toBe(123)
    expect(wrapper.emitted('next')).toBeUndefined()
  })
})

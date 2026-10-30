import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recalculate } from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import api from '../../../app/api/wicket.ts?raw'
import facade from './T2ProfnastilFacade.vue?raw'
import form from './T2ProfnastilForm.vue?raw'
import yard from './T2ProfnastilYard.vue?raw'
import T2ProfnastilFacade from './T2ProfnastilFacade.vue'
import T2ProfnastilYard from './T2ProfnastilYard.vue'

vi.mock('../../../app/api/wicket', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../app/api/wicket')>()),
  recalculate: vi.fn().mockResolvedValue({ priceDealer: 10, priceRetail: 20 }),
}))

const formValidate = vi.fn<() => Promise<boolean>>()
const FormStub = defineComponent({
  setup(_props, { expose }) {
    expose({ validate: formValidate })
    return () => h('div')
  },
})

function mountPage(component: typeof T2ProfnastilFacade | typeof T2ProfnastilYard) {
  return mount(component, {
    global: {
      stubs: {
        T2ProfnastilForm: FormStub,
        B24Button: { props: ['label'], template: '<button @click="$emit(\'click\')">{{ label }}</button>' },
        Button: { props: ['label'], template: '<button @click="$emit(\'click\')">{{ label }}</button>' },
      },
    },
  })
}

async function validateBeforeLeave(wrapper: VueWrapper): Promise<boolean> {
  return await (wrapper.vm as unknown as { validateBeforeLeave: () => Promise<boolean> }).validateBeforeLeave()
}

function nextButton(wrapper: VueWrapper) {
  const button = wrapper.findAll('button').find(candidate => candidate.text() === 'Далее')
  if (!button) throw new Error('Кнопка «Далее» не найдена')
  return button
}

describe('Type 2 profnastil leave guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.reset()
    calc.orderId.value = 42
    calc.number.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '2'
    formValidate.mockReset()
    vi.mocked(recalculate).mockClear()
  })

  it.each([
    ['facade', T2ProfnastilFacade],
    ['yard', T2ProfnastilYard],
  ] as const)('%s rejects leave when the form rejects validation', async (_side, component) => {
    formValidate.mockResolvedValue(false)
    const wrapper = mountPage(component)

    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(formValidate).toHaveBeenCalledTimes(1)
    expect(recalculate).not.toHaveBeenCalled()
  })

  it.each([
    ['facade', T2ProfnastilFacade],
    ['yard', T2ProfnastilYard],
  ] as const)('%s saves on valid leave without recalculating', async (_side, component) => {
    formValidate.mockResolvedValue(true)
    const wrapper = mountPage(component)

    expect(await validateBeforeLeave(wrapper)).toBe(true)
    expect(formValidate).toHaveBeenCalledTimes(1)
    expect(recalculate).not.toHaveBeenCalled()
  })

  it.each([
    ['facade', T2ProfnastilFacade],
    ['yard', T2ProfnastilYard],
  ] as const)('%s blocks invalid Next before recalculation', async (_side, component) => {
    formValidate.mockResolvedValue(false)
    const wrapper = mountPage(component)
    useCalculation().priceRetail.value = 100

    await nextButton(wrapper).trigger('click')
    await flushPromises()
    expect(formValidate).toHaveBeenCalledTimes(1)
    expect(recalculate).not.toHaveBeenCalled()
    expect(wrapper.emitted('next')).toBeUndefined()
  })

  it.each([
    ['facade', T2ProfnastilFacade],
    ['yard', T2ProfnastilYard],
  ] as const)('%s serializes double Next and guard during the save', async (_side, component) => {
    let finishSave!: (allowed: boolean) => void
    formValidate.mockImplementationOnce(() => new Promise(resolve => { finishSave = resolve }))
    const wrapper = mountPage(component)
    const calc = useCalculation()
    calc.priceRetail.value = 0

    await nextButton(wrapper).trigger('click')
    await nextButton(wrapper).trigger('click')
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(formValidate).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('next')).toBeUndefined()

    finishSave(true)
    await flushPromises()
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it.each([
    ['facade', T2ProfnastilFacade],
    ['yard', T2ProfnastilYard],
  ] as const)('%s advances after saving even when an earlier price exists and the other side is incomplete', async (_side, component) => {
    formValidate.mockResolvedValue(true)
    vi.mocked(recalculate).mockImplementationOnce(() => new Promise(() => {}))
    const wrapper = mountPage(component)
    const calc = useCalculation()
    calc.priceRetail.value = 100
    calc.fillSide.value = 2
    calc.idFacade.value = 1
    calc.idYard.value = ''

    await nextButton(wrapper).trigger('click')
    await flushPromises()
    expect(formValidate).toHaveBeenCalledTimes(1)
    expect(recalculate).not.toHaveBeenCalled()
    expect(wrapper.emitted('next')).toHaveLength(1)
    wrapper.unmount()
  })
})

describe('Type 2 profnastil pages', () => {
  it('layers the color menu above surrounding content', () => {
    expect(form).toContain(`:b24ui="{ content: 'z-50' }"`)
  })

  it('replaces the facade table with the dependent form', () => {
    expect(facade).toContain('<T2ProfnastilForm ref="formRef" side="facade" table-mode />')
    expect(facade).not.toContain('<table')
    expect(facade).not.toContain('Толщина листа')
  })

  it('uses an independent form for the yard', () => {
    expect(yard).toContain('<T2ProfnastilForm ref="formRef" side="yard" table-mode />')
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

  it('uses Bitrix searchable dropdowns for all dictionary fields', () => {
    expect(form).not.toContain('<select')
    expect(form).toContain(':items="manufacturerSelectItems"')
    expect(form).toContain(':items="profileSelectItems"')
    expect(form).toContain(':items="coatingSelectItems"')
    expect(form).toContain('@update:model-value="onManufacturerChange"')
    expect(form).toContain('@update:model-value="onProfileSelectChange"')
    expect(form).toContain('@update:model-value="onCoatingSelectChange"')
  })

  it('uses the searchable dropdown for dictionary colors', () => {
    expect(form).toContain('<B24SelectMenu')
    expect(form).toContain(':items="colorSelectItems"')
    expect(form).toContain('value-key="id"')
    expect(form).toContain('@update:model-value="onDictionaryColorChange"')
    expect(form).not.toContain('<select v-model="colorId"')
  })

  it('reloads colors for the selected coating', () => {
    expect(api).toContain('typeOfCoatingId?: number')
    expect(api).toContain('typeOfCoatingId: typeOfCoatingId ?? null')
    expect(form).toContain('await load(profile.value, coating.value)')
    expect(form).toContain('getPrintechSelectItems')
  })
})

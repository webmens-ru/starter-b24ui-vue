import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import End from './End.vue'
import WicketWizardPage from '../../pages/wicket/WicketWizardPage.vue'
import type { WicketRouteDefinition } from '../../pages/wicket/wicketRoute'

const { api } = vi.hoisted(() => ({ api: {
  get: vi.fn(),
  post: vi.fn(),
} }))

const router = {
  push: vi.fn(),
  replace: vi.fn(),
}

const route = reactive({ path: '/wicket/type1', query: { orderId: '42', productRowId: '7' } })

vi.mock('../../app/api', () => ({ default: api }))
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router,
}))

const ButtonStub = {
  props: ['label', 'disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}<slot /></button>',
}
const ModalStub = {
  props: ['open', 'title', 'description'],
  template: '<section v-if="open"><h2>{{ title }}</h2><p>{{ description }}</p><slot /><slot name="footer" :close="() => undefined" /></section>',
}
const EmptyStep = { template: '<div>Шаг</div>' }
const wicketRoute: WicketRouteDefinition = {
  sections: [],
  menu: () => [],
  validations: () => new Map(),
  next: () => null,
  prev: () => null,
}

function response(data: unknown) {
  return { data: { data } }
}

describe('End lock-conflict integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    route.path = '/wicket/type1'
    route.query = { orderId: '42', productRowId: '7' }
    api.get.mockImplementation((url: string) => {
      if (url === '/api/wicket/type1/get-data') {
        return Promise.resolve(response({
          orderId: 42,
          productRowId: 7,
          modelId: '1',
          lockVersion: 4,
          activePage: 'page12',
          visitedPages: ['page12'],
        }))
      }
      if (url === '/api/order/saved-price') {
        return Promise.resolve(response({ hasSavedPrice: false, isActual: false }))
      }
      if (url === '/api/wicket/accessory-composition') {
        return Promise.resolve(response({
          lockVersion: 4,
          lockComponents: [],
          skud: [],
          doorClosers: [],
          bumpers: [],
          orderTotals: { priceRetail: 0, priceDealer: 0 },
        }))
      }
      return Promise.resolve(response({ items: [] }))
    })
    api.post
      .mockResolvedValueOnce(response({ lockVersion: 5 }))
      .mockRejectedValueOnce({ response: { status: 409 } })
  })

  it('propagates an End delete 409 through the registry to the wizard reload modal without retrying', async () => {
    const wrapper = mount(WicketWizardPage, {
      props: { stepComponents: { page1: EmptyStep, page12: End }, route: wicketRoute },
      global: {
        stubs: {
          App: { template: '<div><slot /></div>' },
          B24App: { template: '<div><slot /></div>' },
          B24Button: ButtonStub,
          B24Modal: ModalStub,
          WicketMenu: true,
          DrawingPanel: true,
          CalculateTable: true,
          Transition: false,
        },
      },
    })
    await vi.waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    await flushPromises()

    const deleteButton = wrapper.findAll('button').find(button => button.text().includes('Не сохранять расчёт'))
    expect(deleteButton).toBeDefined()
    await deleteButton!.trigger('click')
    await flushPromises()

    const confirmButton = [...document.body.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Да, удалить'))
    expect(confirmButton).toBeDefined()
    confirmButton!.click()
    await flushPromises()

    expect(api.post).toHaveBeenCalledTimes(2)
    expect(api.post).toHaveBeenLastCalledWith('/api/wicket/type1/delete', {
      orderId: 42,
      productRowId: 7,
      modelId: '1',
      lockVersion: 5,
    })
    expect(document.body.innerHTML).toContain('Требуется перезагрузка')
    expect(document.body.innerHTML).not.toContain('Произошла ошибка при удалении расчёта.')
    wrapper.unmount()
  })
})

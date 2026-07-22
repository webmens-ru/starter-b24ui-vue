import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import WicketModel from './WicketModel.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const SlotStub = { template: '<div><slot /></div>' }

describe('WicketModel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('делает третий тип доступным без метки «Скоро»', () => {
    const wrapper = mount(WicketModel, {
      global: {
        stubs: {
          B24App: SlotStub,
          B24SidebarLayout: SlotStub,
          B24Button: true,
          B24Modal: true,
          Teleport: true,
          Transition: false,
        },
      },
    })

    const type3Button = wrapper.findAll('button').find(button => button.text().includes('штакетник'))

    expect(type3Button).toBeDefined()
    expect(type3Button?.attributes('disabled')).toBeUndefined()
    expect(type3Button?.text()).not.toContain('Скоро')
  })
})

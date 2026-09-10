import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useCalculation } from '../../composables/useCalculation'
import { loadCoherentWicketState, loadWicketData, recalculate, saveWicketData } from '../../app/api/wicket'
import IsTherelock from './IsTherelock.vue'
import LockType from './LockType.vue'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('../../app/api', () => ({ default: api }))

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

function emptyComposition(lockVersion: number) {
  return {
    lockVersion,
    lockComponents: [],
    skud: [],
    doorClosers: [],
    bumpers: [],
    orderTotals: { priceRetail: 0, priceDealer: 0 },
  }
}

function mountOptions() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  return {
    global: {
      plugins: [router],
      stubs: ['B24Button', 'B24SelectMenu', 'ImageViewer'],
    },
  }
}

describe('wicket root/accessory version flow', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    setActivePinia(createPinia())
  })

  it('saves the real IsTherelock → LockType sequence without conflicting with its own root saves', async () => {
    const context = { orderId: 42, productRowId: 7, modelId: '1' }
    let serverLockVersion = 3
    let acceptedComposition: Record<string, unknown> | null = null
    let conflicts = 0

    api.get.mockImplementation(async (url: string) => {
      if (url === '/api/wicket/type1/get-data') {
        return { data: { data: { ...context, lockVersion: serverLockVersion } } }
      }
      if (url === '/api/wicket/accessory-composition') {
        return { data: { data: emptyComposition(serverLockVersion) } }
      }
      if (url === '/api/dict/lock/get-list') {
        return {
          data: {
            data: {
              items: [{ id: 7, marking: 'Комплект 7', imageUrls: [], materialItemIds: [701, 702] }],
            },
          },
        }
      }
      if (url === '/api/dict/pen/get-by-lock') {
        return {
          data: {
            data: {
              items: [{ id: 3, marking: 'Ручка 3', colors: [{ id: 5, name: 'Чёрный' }], imageUrls: [] }],
            },
          },
        }
      }
      throw new Error(`Unexpected GET ${url}`)
    })
    api.post.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      if (url === '/api/wicket/type1/data') {
        if (payload.lockVersion !== serverLockVersion) {
          conflicts += 1
          return Promise.reject({ response: { status: 409 } })
        }
        serverLockVersion += 1
        return { data: { data: { lockVersion: serverLockVersion } } }
      }
      if (url === '/api/wicket/accessory-composition') {
        if (payload.lockVersion !== serverLockVersion) {
          conflicts += 1
          return Promise.reject({ response: { status: 409 } })
        }
        acceptedComposition = payload
        serverLockVersion += 1
        return { data: { data: emptyComposition(serverLockVersion) } }
      }
      throw new Error(`Unexpected POST ${url}`)
    })

    const calc = useCalculation()
    calc.orderId.value = context.orderId
    calc.productRowId.value = context.productRowId
    calc.modelId.value = context.modelId
    const coherent = await loadCoherentWicketState(context)
    calc.loadFromApi(coherent.wicketData)
    calc.applyAccessoryComposition(coherent.accessoryComposition)

    const lockPresence = mount(IsTherelock, mountOptions())
    await vi.waitFor(() => {
      expect(lockPresence.find('input[value="Нет"]:checked').exists()).toBe(true)
    })
    await lockPresence.find('input[value="Есть"]').setValue()
    await vi.waitFor(() => expect(serverLockVersion).toBe(4))
    await lockPresence.find('input[value="Предоставляет заказчик"]').setValue()
    await vi.waitFor(() => expect(serverLockVersion).toBe(5))
    lockPresence.unmount()

    const lockType = mount(LockType, mountOptions())
    await vi.waitFor(() => {
      expect(lockType.find('input[type="radio"][value="7"]').exists()).toBe(true)
    })
    await lockType.find('input[type="radio"][value="7"]').setValue()
    await vi.waitFor(() => expect(acceptedComposition).not.toBeNull())

    expect(conflicts).toBe(0)
    expect(acceptedComposition).toMatchObject({
      orderId: context.orderId,
      productRowId: context.productRowId,
      lockVersion: 6,
      lockComponents: [],
    })
    expect(serverLockVersion).toBe(7)
    lockType.unmount()
  })

  it.each([
    ['manufacturer product + manufacturer install', 70, 'Предоставляет изготовитель', 'Выполняет изготовитель', '590.00'],
    ['manufacturer product + customer install', 71, 'Предоставляет изготовитель', 'Выполняет заказчик', '500.00'],
    ['customer product + manufacturer install', 72, 'Предоставляет заказчик', 'Выполняет изготовитель', '90.00'],
    ['customer product + customer install', 73, 'Предоставляет заказчик', 'Выполняет заказчик', '0.00'],
  ])('request/reload/recalculate round trip: %s', async (_case, productRowId, providesLock, lockInstaller, expectedPrice) => {
    const context = { orderId: 42, productRowId, modelId: '1' }
    let serverLockVersion = 10
    const serverWicket: Record<string, unknown> = {
      ...context,
      lockSetId: null,
      providesLock: null,
      lockInstaller: null,
    }
    const standaloneRows = [{ materialItemId: 701, relationRole: 'lock_component_installation' }]

    api.get.mockImplementation(async (url: string) => {
      if (url === '/api/wicket/type1/get-data') {
        return { data: { data: { ...serverWicket, lockVersion: serverLockVersion } } }
      }
      if (url === '/api/wicket/accessory-composition') {
        return { data: { data: { ...emptyComposition(serverLockVersion), lockComponents: standaloneRows } } }
      }
      throw new Error(`Unexpected GET ${url}`)
    })
    api.post.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      expect(payload.lockVersion).toBe(serverLockVersion)
      if (url === '/api/wicket/type1/data') {
        for (const key of ['lockSetId', 'providesLock', 'lockInstaller']) {
          if (Object.prototype.hasOwnProperty.call(payload, key)) serverWicket[key] = payload[key]
        }
        serverLockVersion += 1
        return { data: { data: { lockVersion: serverLockVersion } } }
      }
      if (url === '/api/order/calculate') {
        expect(serverWicket).toMatchObject({ lockSetId: 7, providesLock, lockInstaller })
        serverLockVersion += 1
        return {
          data: { data: { priceDealer: expectedPrice, priceRetail: expectedPrice, lockVersion: serverLockVersion } },
        }
      }
      throw new Error(`Unexpected POST ${url}`)
    })

    const calc = useCalculation()
    calc.orderId.value = context.orderId
    calc.productRowId.value = context.productRowId
    calc.modelId.value = context.modelId
    const initial = await loadCoherentWicketState(context)
    calc.applyAccessoryComposition(initial.accessoryComposition)
    calc.loadFromApi(initial.wicketData)
    calc.lockSetId.value = 7
    calc.providesLock.value = providesLock
    calc.lockInstaller.value = lockInstaller

    await saveWicketData(calc.getFullSavePayload())

    calc.reset()
    const reloaded = await loadCoherentWicketState(context)
    calc.applyAccessoryComposition(reloaded.accessoryComposition)
    calc.loadFromApi(reloaded.wicketData)
    expect(calc.lockSetId.value).toBe(7)
    expect(calc.isThereLock.value).toBe(1)
    expect(calc.providesLock.value).toBe(providesLock)
    expect(calc.lockInstaller.value).toBe(lockInstaller)
    expect(calc.getAccessorySelections().lockComponents).toEqual([{
      role: 'lock_component',
      materialItemId: 701,
      providedByManufacturer: false,
      installedByManufacturer: true,
    }])

    const calculated = await recalculate(context)
    expect(calculated.priceRetail).toBe(expectedPrice)
  })

  it('clears an existing root set through a real request and preserves standalone rows after reload/recalculate', async () => {
    const context = { orderId: 42, productRowId: 74, modelId: '1' }
    let serverLockVersion = 20
    let compositionWrites = 0
    const serverWicket: Record<string, unknown> = {
      ...context,
      lockSetId: 7,
      providesLock: 'Предоставляет изготовитель',
      lockInstaller: 'Выполняет изготовитель',
    }
    let standaloneRows = [{ materialItemId: 701, relationRole: 'lock_component' }]

    api.get.mockImplementation(async (url: string) => {
      if (url === '/api/wicket/type1/get-data') {
        return { data: { data: { ...serverWicket, lockVersion: serverLockVersion } } }
      }
      if (url === '/api/wicket/accessory-composition') {
        return { data: { data: { ...emptyComposition(serverLockVersion), lockComponents: standaloneRows } } }
      }
      throw new Error(`Unexpected GET ${url}`)
    })
    api.post.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      expect(payload.lockVersion).toBe(serverLockVersion)
      if (url === '/api/wicket/type1/data') {
        for (const key of ['lockSetId', 'providesLock', 'lockInstaller']) {
          if (Object.prototype.hasOwnProperty.call(payload, key)) serverWicket[key] = payload[key]
        }
      } else if (url === '/api/wicket/accessory-composition') {
        compositionWrites += 1
        standaloneRows = Array.isArray(payload.lockComponents)
          ? payload.lockComponents.map(row => ({
              materialItemId: Number((row as Record<string, unknown>).materialItemId),
              relationRole: 'lock_component',
            }))
          : []
      } else if (url === '/api/order/calculate') {
        expect(serverWicket.lockSetId).toBeNull()
        serverLockVersion += 1
        return { data: { data: { priceDealer: '0.00', priceRetail: '0.00', lockVersion: serverLockVersion } } }
      } else {
        throw new Error(`Unexpected POST ${url}`)
      }
      serverLockVersion += 1
      return { data: { data: { ...emptyComposition(serverLockVersion), lockVersion: serverLockVersion } } }
    })

    const calc = useCalculation()
    calc.orderId.value = context.orderId
    calc.productRowId.value = context.productRowId
    calc.modelId.value = context.modelId
    const initial = await loadCoherentWicketState(context)
    calc.applyAccessoryComposition(initial.accessoryComposition)
    calc.loadFromApi(initial.wicketData)
    const wrapper = mount(IsTherelock, mountOptions())
    await flushPromises()

    await wrapper.find('input[value="Нет"]').setValue()
    await vi.waitFor(() => expect(serverWicket.lockSetId).toBeNull())

    calc.reset()
    const reloaded = await loadCoherentWicketState(context)
    calc.applyAccessoryComposition(reloaded.accessoryComposition)
    calc.loadFromApi(reloaded.wicketData)
    expect(compositionWrites).toBe(0)
    expect(calc.isThereLock.value).toBe(0)
    expect(calc.getAccessorySelections().lockComponents).toEqual([{
      role: 'lock_component',
      materialItemId: 701,
      providedByManufacturer: true,
      installedByManufacturer: false,
    }])
    await expect(recalculate(context)).resolves.toMatchObject({ priceRetail: '0.00' })
    wrapper.unmount()
  })

  it('does not advance a composition snapshot after its root save completes on another route', async () => {
    const context = { orderId: 42, productRowId: 17, modelId: '1' }
    const saveResponse = deferred<{ data: { data: { lockVersion: number } } }>()
    api.get.mockImplementation(async (url: string) => {
      if (url === '/api/wicket/type1/get-data') {
        return { data: { data: { ...context, lockVersion: 20 } } }
      }
      if (url === '/api/wicket/accessory-composition') {
        return { data: { data: emptyComposition(20) } }
      }
      throw new Error(`Unexpected GET ${url}`)
    })
    api.post.mockImplementation((url: string) => {
      if (url === '/api/wicket/type1/data') return saveResponse.promise
      throw new Error(`Unexpected POST ${url}`)
    })

    const calc = useCalculation()
    calc.orderId.value = context.orderId
    calc.productRowId.value = context.productRowId
    calc.modelId.value = context.modelId
    const coherent = await loadCoherentWicketState(context)
    calc.loadFromApi(coherent.wicketData)
    calc.applyAccessoryComposition(coherent.accessoryComposition)
    const lockPresence = mount(IsTherelock, mountOptions())
    await vi.waitFor(() => {
      expect(lockPresence.find('input[value="Нет"]:checked').exists()).toBe(true)
    })

    await lockPresence.find('input[value="Есть"]').setValue()
    await vi.waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    calc.productRowId.value = 18
    calc.accessoryCompositionLockVersion.value = 99
    saveResponse.resolve({ data: { data: { lockVersion: 21 } } })
    await flushPromises()

    expect(calc.productRowId.value).toBe(18)
    expect(calc.accessoryCompositionLockVersion.value).toBe(99)
    lockPresence.unmount()
  })

  it('advances after a same-snapshot calculation but not after an unrelated version read', async () => {
    const context = { orderId: 42, productRowId: 27, modelId: '1' }
    let serverLockVersion = 30
    api.get.mockImplementation(async (url: string) => {
      if (url === '/api/wicket/type1/get-data') {
        return { data: { data: { ...context, lockVersion: serverLockVersion } } }
      }
      if (url === '/api/wicket/accessory-composition') {
        return { data: { data: emptyComposition(serverLockVersion) } }
      }
      throw new Error(`Unexpected GET ${url}`)
    })
    api.post.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      if (url !== '/api/order/calculate') throw new Error(`Unexpected POST ${url}`)
      expect(payload.lockVersion).toBe(serverLockVersion)
      serverLockVersion += 1
      return {
        data: {
          data: { priceRetail: '1000.00', priceDealer: '800.00', lockVersion: serverLockVersion },
        },
      }
    })

    const calc = useCalculation()
    calc.orderId.value = context.orderId
    calc.productRowId.value = context.productRowId
    calc.modelId.value = context.modelId
    const coherent = await loadCoherentWicketState(context)
    calc.loadFromApi(coherent.wicketData)
    calc.applyAccessoryComposition(coherent.accessoryComposition)

    await recalculate(context)
    expect(calc.accessoryCompositionLockVersion.value).toBe(31)

    serverLockVersion = 40
    await loadWicketData(context)
    await recalculate(context)

    expect(calc.accessoryCompositionLockVersion.value).toBe(31)
  })
})

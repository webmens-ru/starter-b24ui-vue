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
    await vi.waitFor(() => expect(serverLockVersion).toBe(6))

    expect(conflicts).toBe(0)
    expect(api.post).not.toHaveBeenCalledWith('/api/wicket/accessory-composition', expect.anything())
    lockType.unmount()
  })

  it('No → Yes → select set persists the manufacturer defaults shown by the UI before reload/recalculate', async () => {
    const context = { orderId: 42, productRowId: 75, modelId: '1' }
    let serverLockVersion = 30
    const serverWicket: Record<string, unknown> = {
      ...context,
      lockSetId: 7,
      providesLock: 'Предоставляет изготовитель',
      lockInstaller: 'Выполняет изготовитель',
    }

    api.get.mockImplementation(async (url: string) => {
      if (url === '/api/wicket/type1/get-data') {
        return { data: { data: { ...serverWicket, lockVersion: serverLockVersion } } }
      }
      if (url === '/api/wicket/accessory-composition') {
        return { data: { data: emptyComposition(serverLockVersion) } }
      }
      if (url === '/api/dict/lock/get-list') {
        return { data: { data: { items: [{ id: 7, marking: 'Комплект 7', imageUrls: [], materialItemIds: [] }] } } }
      }
      if (url === '/api/dict/pen/get-by-lock') {
        return { data: { data: { items: [] } } }
      }
      throw new Error(`Unexpected GET ${url}`)
    })
    api.post.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      if (url === '/api/wicket/type1/data') {
        for (const key of ['lockSetId', 'providesLock', 'lockInstaller']) {
          if (Object.prototype.hasOwnProperty.call(payload, key)) serverWicket[key] = payload[key]
        }
        serverLockVersion += 1
        return { data: { data: { lockVersion: serverLockVersion } } }
      }
      if (url === '/api/wicket/accessory-composition') {
        serverLockVersion += 1
        return { data: { data: emptyComposition(serverLockVersion) } }
      }
      if (url === '/api/order/calculate') {
        const productPrice = serverWicket.providesLock === 'Предоставляет изготовитель' ? 500 : 0
        const installPrice = serverWicket.lockInstaller === 'Выполняет изготовитель' ? 90 : 0
        serverLockVersion += 1
        const price = `${productPrice + installPrice}.00`
        return { data: { data: { priceDealer: price, priceRetail: price, lockVersion: serverLockVersion } } }
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

    const presence = mount(IsTherelock, mountOptions())
    await presence.find('input[value="Нет"]').setValue()
    await vi.waitFor(() => expect(serverWicket.lockSetId).toBeNull())
    await presence.find('input[value="Есть"]').setValue()
    await vi.waitFor(() => expect(serverLockVersion).toBe(32))
    expect(presence.find('input[value="Предоставляет изготовитель"]:checked').exists()).toBe(true)
    expect(presence.find('input[value="Выполняет изготовитель"]:checked').exists()).toBe(true)
    presence.unmount()

    const lockType = mount(LockType, mountOptions())
    await vi.waitFor(() => expect(lockType.find('input[type="radio"][value="7"]').exists()).toBe(true))
    await lockType.find('input[type="radio"][value="7"]').setValue()
    await vi.waitFor(() => expect(serverWicket.lockSetId).toBe(7))
    lockType.unmount()

    calc.reset()
    const reloaded = await loadCoherentWicketState(context)
    calc.applyAccessoryComposition(reloaded.accessoryComposition)
    calc.loadFromApi(reloaded.wicketData)
    expect(calc.providesLock.value).toBe('Предоставляет изготовитель')
    expect(calc.lockInstaller.value).toBe('Выполняет изготовитель')
    await expect(recalculate(context)).resolves.toMatchObject({ priceRetail: '590.00' })
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

  it('replaces stale handle IDs with a colored lock set without posting its internal components', async () => {
    const context = { orderId: 42, productRowId: 74, modelId: '1' }
    let serverLockVersion = 20
    let compositionWrites = 0
    const serverWicket: Record<string, unknown> = {
      ...context,
      lockSetId: null,
      providesLock: 'Предоставляет изготовитель',
      lockInstaller: 'Выполняет изготовитель',
      lockPenId: 3,
      lockPenColorId: 5,
    }
    const standaloneRows = [{ materialItemId: 900, relationRole: 'lock_component_installation' }]
    const existingStandaloneRows = [{
      role: 'lock_component' as const,
      materialItemId: 900,
      providedByManufacturer: false,
      installedByManufacturer: true,
    }]
    const internalSetComponentIds = [701, 702]
    const lockSetPrices = new Map([
      [7, { product: 500, installation: 90 }],
      [8, { product: 325, installation: 65 }],
    ])
    let rootSavePayload: Record<string, unknown> | null = null
    const calculatedPrices: string[] = []

    api.get.mockImplementation(async (url: string) => {
      if (url === '/api/wicket/type1/get-data') {
        return { data: { data: { ...serverWicket, lockVersion: serverLockVersion } } }
      }
      if (url === '/api/wicket/accessory-composition') {
        return { data: { data: { ...emptyComposition(serverLockVersion), lockComponents: standaloneRows } } }
      }
      if (url === '/api/dict/lock/get-list') {
        return {
          data: {
            data: {
              items: [
                {
                  id: 7,
                  marking: 'Комплект механический чёрный',
                  imageUrls: [],
                  materialItemIds: internalSetComponentIds,
                  components: [
                    { id: 701, name: 'Корпус чёрный', imageUrls: [] },
                    { id: 702, name: 'Ответная планка', imageUrls: [] },
                  ],
                },
                {
                  id: 8,
                  marking: 'Комплект механический белый',
                  imageUrls: [],
                  materialItemIds: [801],
                  components: [{ id: 801, name: 'Корпус белый', imageUrls: [] }],
                },
              ],
            },
          },
        }
      }
      throw new Error(`Unexpected GET ${url}`)
    })
    api.post.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      expect(payload.lockVersion).toBe(serverLockVersion)
      if (url === '/api/wicket/type1/data') {
        rootSavePayload = payload
        for (const key of ['lockSetId', 'providesLock', 'lockInstaller', 'lockPenId', 'lockPenColorId']) {
          if (Object.prototype.hasOwnProperty.call(payload, key)) serverWicket[key] = payload[key]
        }
      } else if (url === '/api/wicket/accessory-composition') {
        compositionWrites += 1
        const postedIds = Array.isArray(payload.lockComponents)
          ? payload.lockComponents.map(row => Number((row as Record<string, unknown>).materialItemId))
          : []
        expect(postedIds.some(id => internalSetComponentIds.includes(id))).toBe(false)
        throw new Error('The lock-set selection must not write accessory composition')
      } else if (url === '/api/order/calculate') {
        expect(serverWicket).toMatchObject({
          lockSetId: 7,
          lockPenId: null,
          lockPenColorId: null,
        })
        expect(serverWicket).toMatchObject({
          providesLock: 'Предоставляет изготовитель',
          lockInstaller: 'Выполняет изготовитель',
        })
        const lockSetPrice = lockSetPrices.get(Number(serverWicket.lockSetId))
        expect(lockSetPrice).toBeDefined()
        const price = `${lockSetPrice!.product + lockSetPrice!.installation}.00`
        calculatedPrices.push(price)
        serverLockVersion += 1
        return { data: { data: { priceDealer: price, priceRetail: price, lockVersion: serverLockVersion } } }
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
    expect(calc.lockPenId.value).toBe(3)
    expect(calc.lockPenColorId.value).toBe(5)
    expect(calc.getAccessorySelections().lockComponents).toEqual(existingStandaloneRows)
    const wrapper = mount(LockType, mountOptions())
    await vi.waitFor(() => expect(wrapper.find('input[type="radio"][value="7"]').exists()).toBe(true))

    await wrapper.find('input[type="radio"][value="7"]').setValue()
    await vi.waitFor(() => expect(serverWicket.lockSetId).toBe(7))
    expect(rootSavePayload).toMatchObject({
      lockSetId: 7,
      providesLock: 'Предоставляет изготовитель',
      lockInstaller: 'Выполняет изготовитель',
      lockPenId: null,
      lockPenColorId: null,
    })
    expect(serverWicket).toMatchObject({
      lockSetId: 7,
      lockPenId: null,
      lockPenColorId: null,
    })

    calc.reset()
    const reloaded = await loadCoherentWicketState(context)
    calc.applyAccessoryComposition(reloaded.accessoryComposition)
    calc.loadFromApi(reloaded.wicketData)
    expect(compositionWrites).toBe(0)
    expect(calc.lockSetId.value).toBe(7)
    expect(calc.isThereLock.value).toBe(1)
    expect(calc.lockPenId.value).toBeNull()
    expect(calc.lockPenColorId.value).toBeNull()
    expect(calc.getAccessorySelections().lockComponents).toEqual(existingStandaloneRows)
    const calculated = await recalculate(context)
    expect(calculated.priceRetail).toBe('590.00')
    expect(calculatedPrices).toEqual(['590.00'])
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

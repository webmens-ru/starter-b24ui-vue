import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it } from 'vitest'
import { useWicketFormStore } from './wicketFormStore'

beforeEach(() => setActivePinia(createPinia()))

it('hydrates palette HEX and textures while discarding deprecated coating HEX metadata', () => {
  const store = useWicketFormStore()
  store.loadFromApi({
    colorFacadeHex: '#123456', colorYardHex: '#654321',
    colorFacadeImage: '/palette/front.webp', colorYardImage: '/palette/back.webp',
    coatingFacadeHex: '#ABCDEF', coatingYardHex: '#FEDCBA',
    coatingFacadeImage: '/coating/front.webp', coatingYardImage: '/coating/back.webp',
  })
  expect(store.colorFacadeHex).toBe('#123456')
  expect(store.colorYardHex).toBe('#654321')
  expect(store.colorFacadeImage).toBe('/palette/front.webp')
  expect(store.colorYardImage).toBe('/palette/back.webp')
  expect(store.coatingFacadeImage).toBe('/coating/front.webp')
  expect(store.coatingYardImage).toBe('/coating/back.webp')
  expect('coatingFacadeHex' in store).toBe(false)
  expect('coatingYardHex' in store).toBe(false)
})

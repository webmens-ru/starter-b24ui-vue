import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { normalizeSummaryBlocks, withoutSummaryBlock } from './summaryCodes'
import { useWicketFormStore } from '../stores/wicket/wicketFormStore'

describe('stable summary codes', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('updates by code despite renamed labels and keeps distinct roles sharing a label', () => {
    const store = useWicketFormStore()
    store.updateOrCreateBlock('price', [{ paramCode: 'retailPrice', name: 'Renamed price', value: '1200' }], 'First')
    store.updateOrCreateBlock('painting', [], 'First')
    store.updateOrCreateBlock('price', [{ paramCode: 'retailPrice', name: 'Other price', value: '1300' }], 'Changed')
    expect(store.data).toHaveLength(2)
    expect(store.data[0]).toMatchObject({ blockCode: 'price', blockName: 'Changed', params: [{ paramCode: 'retailPrice', value: '1300' }] })
    expect(withoutSummaryBlock(store.data, 'price')).toEqual([expect.objectContaining({ blockCode: 'painting' })])
  })

  it('adapts only missing old codes and preserves values without mutating input', () => {
    const old = [{ blockName: 'Цена', params: [{ name: 'Рек. розн. цена', value: '1200' }] }]
    expect(normalizeSummaryBlocks(old)).toEqual([{ blockCode: 'price', blockName: 'Цена', params: [{ paramCode: 'retailPrice', name: 'Рек. розн. цена', value: '1200' }] }])
    expect(old[0]).not.toHaveProperty('blockCode')
    const current = [{ blockCode: 'painting', blockName: 'Цена', params: [{ paramCode: 'paint', name: 'Рек. розн. цена', value: 'x' }] }]
    expect(normalizeSummaryBlocks(current)).toEqual(current)
    expect(normalizeSummaryBlocks([{ blockCode: '', blockName: 'Цена', params: [{ paramCode: '', name: 'Рек. розн. цена', value: '0' }] }])[0]?.blockCode).toBe('')
  })

  it('preserves unknown old text without assigning a semantic role', () => {
    const blocks = normalizeSummaryBlocks([{ blockName: 'Unknown', params: [{ name: 'Unknown', value: 'Text' }] }])
    expect(blocks[0]).toMatchObject({ blockName: 'Unknown', params: [{ name: 'Unknown', value: 'Text' }] })
    expect(blocks[0]?.blockCode).toBeUndefined()
    expect(blocks[0]?.params[0]?.paramCode).toBeUndefined()
  })

  it.each(['__proto__', 'constructor', 'toString'])('does not treat inherited object key %s as a historical role', name => {
    const block = normalizeSummaryBlocks([{ blockName: name, params: [{ name, value: 'text' }] }])[0]
    expect(block?.blockCode).toBeUndefined()
    expect(block?.params[0]?.paramCode).toBeUndefined()
  })
})

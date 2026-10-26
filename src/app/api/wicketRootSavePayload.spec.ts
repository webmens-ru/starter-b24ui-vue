import { describe, expect, it } from 'vitest'
import { canonicalizeWicketRootSavePayload } from './wicketRootSavePayload'
describe('canonical painting root payload', () => {
  it('sends the canonical pair and drops response-owned paint behavior and compatibility aliases', () => {
    const result = canonicalizeWicketRootSavePayload({ orderId:42,productRowId:7,modelId:'1',paintId:7,paintColorId:92,colorShieldId:999,paintSelection:{isFixedColor:false},paintSelectionUnavailable:true,paintName:'Response paint' })
    expect(result).toMatchObject({paintId:7,paintColorId:92})
    expect(result).not.toHaveProperty('colorShieldId')
    expect(result).not.toHaveProperty('paintSelection')
    expect(result).not.toHaveProperty('paintSelectionUnavailable')
    expect(result).not.toHaveProperty('paintName')
  })
})

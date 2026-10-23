import { expect, it } from 'vitest'
import { canonicalizeWicketRootSavePayload } from './wicketRootSavePayload'

it('sends the selected reference but never derived opening properties', () => {
  const payload = canonicalizeWicketRootSavePayload({
    orderId: 42, productRowId: 7, modelId: '1', openingOptionId: 819,
    openingOrientation: { opensOutward: true, hingeSide: 'left' },
    openingOrientationProblem: { code: 'inactive', message: 'История' },
  })
  expect(payload.openingOptionId).toBe(819)
  expect(payload).not.toHaveProperty('openingOrientation')
  expect(payload).not.toHaveProperty('openingOrientationProblem')
})

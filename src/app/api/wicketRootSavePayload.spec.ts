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

it('persists jumper FK and numeric posts but strips server-derived behavior and diagnostics', () => {
  const payload = canonicalizeWicketRootSavePayload({
    orderId: 42, productRowId: 7, modelId: '1', peremichkaPolozheniyeId: 1733, hasStolby: 0,
    jumperPlacement: 'behind', hasJumper: true,
    jumperPlacementProblem: { code: 'inactive', message: 'История' },
    postsPresenceProblem: { code: 'invalid', message: 'Ошибка' },
  })
  expect(payload.peremichkaPolozheniyeId).toBe(1733)
  expect(payload.hasStolby).toBe(0)
  for (const key of ['jumperPlacement', 'hasJumper', 'jumperPlacementProblem', 'postsPresenceProblem']) {
    expect(payload).not.toHaveProperty(key)
  }
})

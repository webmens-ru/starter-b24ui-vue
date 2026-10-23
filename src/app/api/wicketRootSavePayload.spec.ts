import { expect, it } from 'vitest'
import { canonicalizeWicketRootSavePayload } from './wicketRootSavePayload'

it('serializes independent code properties and strips legacy captions and derived diagnostics', () => {
  const source = { orderId: 42, productRowId: 7, modelId: '1', providesPaint: 'customer',
    providesPrimer: 'manufacturer', doesPaintingFrame: 'manufacturer',
    penProvided: '', participantRoleProblems: { providesPaint: null } }
  const payload = canonicalizeWicketRootSavePayload(source)
  expect(payload).toMatchObject({ providesPaintCode: 'customer', providesPrimerCode: 'manufacturer', doesPaintingFrameCode: 'manufacturer' })
  for (const key of ['providesPaint', 'providesPrimer', 'doesPaintingFrame', 'penProvided', 'participantRoleProblems']) expect(payload).not.toHaveProperty(key)
  expect(payload).not.toHaveProperty('penProvidedCode')
  expect(source.providesPaint).toBe('customer')
})

it('explicit valid code dominates a stale caption; invalid nonempty choices are never guessed', () => {
  const base = { orderId: 42, productRowId: 7, modelId: '1' }
  expect(canonicalizeWicketRootSavePayload({ ...base, providesPaintCode: 'customer', providesPaint: 'Старая подпись' }).providesPaintCode).toBe('customer')
  expect(() => canonicalizeWicketRootSavePayload({ ...base, providesPaintCode: 'unknown' } as never)).toThrow()
  expect(() => canonicalizeWicketRootSavePayload({ ...base, providesPaint: 'Предоставляет изготовитель' })).toThrow()
})

it('submits material FKs but strips both sides of server-owned filling metadata without changing the source', () => {
  const source = { orderId: 42, productRowId: 7, modelId: '1', idFacade: 725, idYard: 819,
    fillingProfileFacade: { kind: 'logSiding' }, fillingProfileFacadeProblem: null,
    fillingProfileYard: null, fillingProfileYardProblem: { code: 'missing', message: 'Не настроен' } }
  const payload = canonicalizeWicketRootSavePayload(source)
  expect(payload).toMatchObject({ idFacade: 725, idYard: 819 })
  for (const key of ['fillingProfileFacade', 'fillingProfileFacadeProblem', 'fillingProfileYard', 'fillingProfileYardProblem']) {
    expect(payload).not.toHaveProperty(key)
  }
  expect(source.fillingProfileFacade).toEqual({ kind: 'logSiding' })
})

it('sends pipe references but strips all server-derived pipe profiles and diagnostics', () => {
  const source = {
    orderId: 42, productRowId: 7, modelId: '1', stolbId: 707, assortmentJumperId: 819,
    postProfile: { sizeA: 999, sizeB: 999 }, jumperProfile: null,
    postProfileProblem: { code: 'invalid', message: 'Ошибка' }, jumperProfileProblem: null,
  }
  const payload = canonicalizeWicketRootSavePayload(source)
  expect(payload.stolbId).toBe(707)
  expect(payload.assortmentJumperId).toBe(819)
  for (const key of ['postProfile', 'postProfileProblem', 'jumperProfile', 'jumperProfileProblem']) {
    expect(payload).not.toHaveProperty(key)
  }
  expect(source.postProfile).toEqual({ sizeA: 999, sizeB: 999 })
})

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

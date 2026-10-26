import { describe, expect, it } from 'vitest'
import { fillingMaterialGroupLabel, isFillingMaterialGroup } from './fillingMaterialGroups'
import { readFillingMaterialGroup } from './api/legacyFillingMaterialGroups'
import { canonicalizeWicketRootSavePayload } from './api/wicketRootSavePayload'
import { applyWicketApiFieldMappings } from '../stores/wicket/wicketLoadApiApply'

describe('filling group property boundary', () => {
  it('separates all seven codes from display labels', () => {
    for (const code of ['siding', 'profnastil', 'fence', 'lamella', 'spSiding', 'louver', 'sheet']) {
      expect(isFillingMaterialGroup(code)).toBe(true)
      expect(fillingMaterialGroupLabel(code)).not.toBe(code)
    }
    expect(isFillingMaterialGroup('Сайдинг')).toBe(false)
    expect(fillingMaterialGroupLabel('unknown')).toBe('')
  })
  it('prefers modern properties without reviving invalid saved selections', () => {
    expect(readFillingMaterialGroup({ materialFacadeGroupCode: 'sheet', materialFacadeGlob: 'Сайдинг' }, 'facade')).toBe('sheet')
    expect(readFillingMaterialGroup({ materialYardGroupCode: 'bad', materialYardGlob: 'Сайдинг' }, 'yard')).toBe('')
    expect(readFillingMaterialGroup({ materialFacadeGroupCode: null, materialFacadeGlob: 'Сайдинг',
      fillingGroupProblems: { facade: { code: 'invalid' } } }, 'facade')).toBe('')
    expect(readFillingMaterialGroup({ materialFacadeGlob: ' Профнастил ' }, 'facade')).toBe('profnastil')
    expect(readFillingMaterialGroup({ materialFacadeGlob: 'siding' }, 'facade')).toBe('')
    expect(readFillingMaterialGroup({}, 'facade')).toBe(null)
    expect(readFillingMaterialGroup({ materialFacadeGlob: 'constructor' }, 'facade')).toBe('')
    expect(readFillingMaterialGroup({ materialFacadeGlob: '__proto__' }, 'facade')).toBe('')
    expect(readFillingMaterialGroup({ materialFacadeGlob: 'SP сайдинг' }, 'facade')).toBe('spSiding')
  })
  it('hydrates actual form refs from properties rather than stale captions', () => {
    const refs = { materialFacadeGlob: { value: 'siding' as unknown }, materialYardGlob: { value: null as unknown } }
    applyWicketApiFieldMappings({ materialFacadeGroupCode: 'sheet', materialFacadeGlob: 'Сайдинг',
      materialYardGroupCode: null, materialYardGlob: 'Профлист', fillingGroupProblems: { yard: { code: 'invalid' } } }, refs)
    expect(refs.materialFacadeGlob.value).toBe('sheet')
    expect(refs.materialYardGlob.value).toBe('')
    applyWicketApiFieldMappings({ materialFacadeGlob: null }, refs)
    expect(refs.materialFacadeGlob.value).toBe(null)
    expect(refs.materialYardGlob.value).toBe('')
  })
  it('sends codes and explicit clears, omits unresolved state, and preserves its source', () => {
    const source = { orderId: 42, productRowId: 7, modelId: '1', materialFacadeGlob: 'siding', materialYardGlob: null,
      fillingGroupProblems: { facade: null, yard: null } }
    const output = canonicalizeWicketRootSavePayload(source)
    expect(output).toMatchObject({ materialFacadeGroupCode: 'siding', materialYardGroupCode: null })
    for (const key of ['materialFacadeGlob', 'materialYardGlob', 'fillingGroupProblems']) expect(output).not.toHaveProperty(key)
    expect(source.materialFacadeGlob).toBe('siding')
    expect(canonicalizeWicketRootSavePayload({ ...source, materialFacadeGlob: '' })).not.toHaveProperty('materialFacadeGroupCode')
    expect(canonicalizeWicketRootSavePayload({ ...source, materialFacadeGroupCode: 'sheet' }).materialFacadeGroupCode).toBe('sheet')
    expect(canonicalizeWicketRootSavePayload({ ...source, materialFacadeGroupCode: null }).materialFacadeGroupCode).toBe(null)
    expect(() => canonicalizeWicketRootSavePayload({ ...source, materialFacadeGroupCode: 'bad' } as never)).toThrow()
    expect(() => canonicalizeWicketRootSavePayload({ ...source, materialFacadeGlob: 'Сайдинг' })).toThrow()
  })
})

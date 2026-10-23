import { parseFillingDrawingDescriptor, type FillingDrawingKind, type FillingDrawingProfile } from '../../../../app/api/fillingDrawingProfiles'
import { isPositiveSafeInteger, parsePositiveDecimalId } from '../../../../app/positiveDecimalId'

export function resolveFillingType(profile: unknown): FillingDrawingKind | null {
  return parseFillingDrawingDescriptor(profile, null).profile?.kind ?? null
}

export function resolveFillingPreview(materialId: unknown, profile: unknown, problem: unknown, visible: boolean): { profile: FillingDrawingProfile | null; error: string } {
  if (!visible || materialId === null || materialId === undefined || materialId === '') return { profile: null, error: '' }
  if (!isPositiveSafeInteger(materialId) && parsePositiveDecimalId(materialId).kind !== 'valid') {
    return { profile: null, error: 'Некорректный идентификатор материала заполнения.' }
  }
  const descriptor = parseFillingDrawingDescriptor(profile, problem)
  return descriptor.profile === null
    ? { profile: null, error: descriptor.problem?.message ?? 'Для выбранного материала не настроен профиль отрисовки.' }
    : { profile: descriptor.profile, error: '' }
}

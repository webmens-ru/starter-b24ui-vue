import { applyWicketApiFieldMappings } from './wicketLoadApiApply'

type RefLike = { value: unknown }

/**
 * Точка расширения: разные типы калиток могут получить разный маппинг API → состояние.
 * Сейчас контракт общий; при расхождении полей — ветвление по `modelId`.
 */
export function applyWicketApiPayloadForModel(
  _modelId: string,
  apiData: Record<string, unknown>,
  refMap: Record<string, RefLike>,
): void {
  applyWicketApiFieldMappings(apiData, refMap)
}

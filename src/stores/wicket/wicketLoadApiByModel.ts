import { applyWicketApiFieldMappings } from './wicketLoadApiApply'

type RefLike = { value: unknown }

/**
 * Точка расширения: разные типы калиток могут получить разный маппинг API → состояние.
 * Сейчас контракт общий; при расхождении полей — ветвление по `modelId`.
 */
export function applyWicketApiPayloadForModel(
  modelId: string,
  apiData: Record<string, unknown>,
  refMap: Record<string, RefLike>,
): void {
  applyWicketApiFieldMappings(apiData, refMap)
  if (modelId === '3') {
    for (const side of ['Facade', 'Yard'] as const) {
      const widthKey = `widthFence${side}`
      const target = refMap[`thickness${side}`]
      if (target && Object.prototype.hasOwnProperty.call(apiData, widthKey)) {
        target.value = apiData[widthKey] == null ? '' : String(apiData[widthKey])
      }
    }
  }
}

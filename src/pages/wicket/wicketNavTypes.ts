/**
 * Общее состояние для ветвления навигации (type1 / type2 — одинаковая форма полей).
 * См. type1Navigation / type2Navigation.
 */
export interface WicketSharedNavState {
  modelId: string
  materialFacadeGlob: string
  fillSide: string
  materialYardGlob: string | null
  isThereLock: number
  providesLock: string
}

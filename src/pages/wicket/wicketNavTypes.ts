/**
 * Общее состояние для ветвления навигации (type1 / type2 — одинаковая форма полей).
 * См. type1Navigation / type2Navigation.
 */
export interface WicketSharedNavState {
  modelId: string
  materialFacadeGlob: string
  fill_side: string
  materialYardGlob: string | null
  is_there_lock_id: number
  providesLock: string
}

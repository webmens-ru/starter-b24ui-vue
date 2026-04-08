/**
 * Общее состояние для ветвления навигации (type1 / type2 — одинаковая форма полей).
 * См. type1Navigation / type2Navigation.
 */
export interface WicketSharedNavState {
  modelId: string
  material_facade_glob: string
  fill_side: string
  material_yard_glob: string | null
  is_there_lock_id: number
  provides_lock: string
}

/**
 * Общее состояние для ветвления маршрутов всех типов калиток.
 */
export interface WicketSharedNavState {
  modelId: string
  materialFacadeGlob: string | null
  fillSide: number | null | ''
  materialYardGlob: string | null
  isThereLock: number
  providesLock: string
  availableSections: string[]
  idFacade?: string | number | null
  idYard?: string | number | null
  lockSetId?: number | null
  widthProyema?: string | number
  heightProyema?: string | number
  raspolozheniyePolotna?: string | null
  shieldType?: string | null
}

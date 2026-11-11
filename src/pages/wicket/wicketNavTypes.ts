import type { CoverStripDraft } from '../../components/wicket/coverStripState'
/**
 * Общее состояние для ветвления маршрутов всех типов калиток.
 */
export interface WicketSharedNavState {
  fillingNeedsRecalculation?: boolean
  coverStripDrafts?: CoverStripDraft[]
  modelId: string
  materialFacadeGlob: string | null
  fillSide: number | null | ''
  materialYardGlob: string | null
  isThereLock: number | null
  providesLock: string
  availableSections: string[]
  layingFacadeCode?: 'butt' | 'gap' | null
  facadeButtTrimCode?: 'none' | 'both' | 'single' | null
  facadeButtTrimSide?: 'hinge' | 'lock' | 'top' | 'bottom' | null
  facadeButtTrim?: { mode: string } | null
  yardTrimCode?: 'none' | 'edge' | null
  layingYardCode?: 'butt' | 'gap' | null
  gapName?: number | null
  gapYardMm?: number | null
  thicknessFacade?: string | number
  thicknessYard?: string | number
  idFacade?: string | number | null
  idYard?: string | number | null
  lockSetId?: number | null
  widthProyema?: string | number
  heightProyema?: string | number
  raspolozheniyePolotna?: string | null
  shieldType?: string | null
  grilleLocation?: string | null
}

import type { WicketRouteSection } from './wicketRoute'
import { isFillingSideCount } from '../../app/fillingSideCounts'
import { isFillingOrientation } from '../../app/fillingOrientations'
import { isFrameSubtypeCode } from '../../app/frameSubtypes'
import { isGrilleSide } from '../../app/grilleSides'
import { isOptionPresence } from '../../app/optionPresence'
import type { WicketSharedNavState } from './wicketNavTypes'

const ok = () => ({ valid: true, errors: [] })
const always = () => true

function section(
  page: string,
  label: string,
  url: string,
  pages = [page],
): WicketRouteSection {
  return {
    menu: { page, label, url },
    pages,
    visible: always,
    validate: ok,
  }
}

export function openingSection(): WicketRouteSection {
  const result = section('page7', 'Проем', 'razmery-proyema')
  result.validate = state => {
    if (!String(state.widthProyema ?? '').trim()) {
      return { valid: false, errors: ['Не указана ширина проёма'] }
    }
    if (!String(state.heightProyema ?? '').trim()) {
      return { valid: false, errors: ['Не указана высота проёма'] }
    }
    return ok()
  }
  return result
}

export function fillingSection(
  pages: string[],
  next: NonNullable<WicketRouteSection['next']>,
  prev: NonNullable<WicketRouteSection['prev']>,
  last: NonNullable<WicketRouteSection['last']>,
): WicketRouteSection {
  const result = section('page2', 'Заполнение', 'fill-side', pages)
  result.next = (from, state) => state.fillSide === 0 ? undefined : isFillingSideCount(state.fillSide) ? next(from, state) : 'page2'
  result.prev = prev
  result.last = state => state.fillSide === 0 ? 'page2' : isFillingSideCount(state.fillSide) ? last(state) : 'page2'
  result.validate = state => {
    if (!isFillingSideCount(state.fillSide)) return { valid: false, errors: ['Не выбрано количество сторон заполнения'] }
    if (state.fillSide === 0) return ok()
    const hasFacade = state.idFacade != null && String(state.idFacade).trim() !== ''
    const needsYard = state.fillSide === 2
    const hasYard = state.idYard != null && String(state.idYard).trim() !== ''
    if (!hasFacade) return { valid: false, errors: ['Не выбран материал фасада'] }
    if (needsYard && !hasYard) return { valid: false, errors: ['Не выбран материал двора'] }
    return ok()
  }
  return result
}

export function fixedFillingSection(
  facadePage: string,
  yardPage?: string,
): WicketRouteSection {
  const pages = ['page2', facadePage, ...(yardPage ? [yardPage] : [])]
  return fillingSection(
    pages,
    (from, state) => {
      if (from === 'page2') return facadePage
      if (from === facadePage && yardPage && state.fillSide === 2) return yardPage
      return undefined
    },
    from => {
      if (from === facadePage) return 'page2'
      if (yardPage && from === yardPage) return facadePage
      return undefined
    },
    state => yardPage && state.fillSide === 2 ? yardPage : facadePage,
  )
}

export function postsSection(): WicketRouteSection {
  return section(
    'page5',
    'Столбы / Вариант открытия / Перемычка',
    'stolb-variant-otkritiya-peremichka-2',
  )
}

export function shieldSection(): WicketRouteSection {
  const result = section('page3', 'Тип щита', 'shield-type')
  const valid = (state: WicketSharedNavState) => (state.shieldType === undefined || isFrameSubtypeCode(state.shieldType))
    && (state.shieldType !== 'sideNet' || state.grilleLocation === undefined || isGrilleSide(state.grilleLocation))
  result.validate = state => valid(state) ? ok() : { valid: false,
    errors: [isFrameSubtypeCode(state.shieldType) ? 'Выберите расположение решётки' : 'Выберите тип щита'] }
  result.next = (_from, state) => valid(state) ? undefined : 'page3'
  return result
}

export function canvasSection(): WicketRouteSection {
  const result = section('page6', 'Расположение полотна', 'raspolozheniye-polotna')
  result.visible = state => state.fillSide !== 0
  const valid = (state: WicketSharedNavState) => state.fillSide === 0 || state.raspolozheniyePolotna === undefined
    || isFillingOrientation(state.raspolozheniyePolotna)
  result.validate = state => valid(state) ? ok() : { valid: false, errors: ['Выберите расположение полотна'] }
  result.next = (_from, state) => valid(state) ? undefined : 'page6'
  return result
}

export function paintingSection(): WicketRouteSection {
  return section('page_painting', 'Окраска', 'painting')
}

export function lockSection(): WicketRouteSection {
  const result = section('page9', 'Комплект замка', 'is-there-lock', ['page9', 'page_lock_type'])
  result.next = (from, state) => {
    if (!isOptionPresence(state.isThereLock)) return 'page9'
    if (from === 'page9' && state.isThereLock === 1 && state.providesLock !== 'customer') {
      return 'page_lock_type'
    }
    return undefined
  }
  result.prev = from => from === 'page_lock_type' ? 'page9' : undefined
  result.last = state => state.isThereLock === 1 && state.providesLock !== 'customer' ? 'page_lock_type' : 'page9'
  result.validate = state => {
    if (!isOptionPresence(state.isThereLock)) return { valid: false, errors: ['Выберите наличие замка'] }
    if (state.isThereLock !== 1 || state.providesLock === 'customer') return ok()
    return state.lockSetId == null
      ? { valid: false, errors: ['Не выбран тип замка'] }
      : ok()
  }
  return result
}

export function penSection(): WicketRouteSection {
  return section('page10', 'Дополнительная ручка', 'pen')
}

export function calculateSection(): WicketRouteSection {
  return section('page12', 'Рассчитать', 'end')
}

export function standardTailSections(): WicketRouteSection[] {
  return [
    canvasSection(),
    shieldSection(),
    paintingSection(),
    lockSection(),
    penSection(),
    calculateSection(),
  ]
}

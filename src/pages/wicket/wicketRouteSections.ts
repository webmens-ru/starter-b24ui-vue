import type { WicketSharedNavState } from './wicketNavTypes'
import type { WicketRouteSection } from './wicketRoute'

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

export function manufacturingSection(): WicketRouteSection {
  return section('page1', 'Вариант изготовления', 'manufacturing-option')
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
  result.next = next
  result.prev = prev
  result.last = last
  result.validate = state => {
    const hasFacade = state.idFacade != null && String(state.idFacade).trim() !== ''
    const needsYard = state.fillSide === 'Две стороны'
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
      if (from === facadePage && yardPage && state.fillSide === 'Две стороны') return yardPage
      return undefined
    },
    from => {
      if (from === facadePage) return 'page2'
      if (yardPage && from === yardPage) return facadePage
      return undefined
    },
    state => yardPage && state.fillSide === 'Две стороны' ? yardPage : facadePage,
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
  return section('page3', 'Тип щита', 'shield-type')
}

export function canvasSection(): WicketRouteSection {
  return section('page6', 'Расположение полотна', 'raspolozheniye-polotna')
}

export function lockSection(): WicketRouteSection {
  const result = section('page9', 'Комплект замка', 'is-there-lock', ['page9', 'page_lock_type'])
  result.next = (from, state) => {
    if (from === 'page9' && state.isThereLock === 1) {
      return 'page_lock_type'
    }
    return undefined
  }
  result.prev = from => from === 'page_lock_type' ? 'page9' : undefined
  result.last = state => state.isThereLock === 1 ? 'page_lock_type' : 'page9'
  result.validate = state => {
    if (state.isThereLock !== 1) return ok()
    return state.lockSetId == null
      ? { valid: false, errors: ['Не выбран тип замка'] }
      : ok()
  }
  return result
}

export function lockComponentsSection(): WicketRouteSection {
  const result = section('page_lock_components', 'Комплектующие замка', 'lock-components')
  result.visible = state => state.isThereLock === 1
  return result
}

export function penSection(): WicketRouteSection {
  return section('page10', 'Дополнительная ручка', 'pen')
}

export function addonSection(
  page: 'page_door_closer' | 'page_bumper' | 'page_skud',
  label: string,
  url: string,
): WicketRouteSection {
  const result = section(page, label, url)
  result.visible = (state: WicketSharedNavState) => state.availableSections.includes(page)
  return result
}

export function clientSection(): WicketRouteSection {
  return section('page11', 'Клиент', 'client')
}

export function calculateSection(): WicketRouteSection {
  return section('page12', 'Рассчитать', 'end')
}

export function standardTailSections(): WicketRouteSection[] {
  return [
    postsSection(),
    shieldSection(),
    canvasSection(),
    lockSection(),
    lockComponentsSection(),
    penSection(),
    addonSection('page_door_closer', 'Доводчик', 'door-closer'),
    addonSection('page_bumper', 'Отбойник', 'bumper'),
    addonSection('page_skud', 'СКУД', 'skud'),
    clientSection(),
    calculateSection(),
  ]
}

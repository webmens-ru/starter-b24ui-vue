import type { WicketMenuItem } from './wicketMenuConfig'

export interface SectionValidation {
  valid: boolean
  errors: string[]
}

export interface SectionDefinition {
  menu: WicketMenuItem
  subPages: string[]
  visible: (state: Record<string, unknown>) => boolean
  validate: (state: Record<string, unknown>) => SectionValidation
}

function ok(): SectionValidation {
  return { valid: true, errors: [] }
}

function fail(...errors: string[]): SectionValidation {
  return { valid: false, errors }
}

export const WICKET_SECTIONS: SectionDefinition[] = [
  {
    menu: { page: 'page1', label: 'Вариант изготовления', url: 'manufacturing-option' },
    subPages: ['page1'],
    visible: () => true,
    validate: () => ok(),
  },
  {
    menu: { page: 'page2', label: 'Заполнение', url: 'fill-side' },
    subPages: [
      'page2',
      'page2_facade_siding', 'page2_facade_profnastil', 'page2_facade_lamel',
      'page2_facade_fence', 'page2_facade_sp', 'page2_facade_zhalyuzi', 'page2_facade_sheet',
      'page2_yard_profnastil', 'page2_yard_lamel', 'page2_yard_fence', 'page2_yard_sp',
    ],
    visible: () => true,
    validate: (s) => {
      const idFacade = s.idFacade as string | number | null
      const fillSide = s.fillSide as string
      const idYard = s.idYard as string | number | null
      const hasFacade = idFacade != null && String(idFacade).trim() !== ''
      const needYard = fillSide === 'Две стороны'
      const hasYard = idYard != null && String(idYard).trim() !== ''
      if (!hasFacade) return fail('Не выбран материал фасада')
      if (needYard && !hasYard) return fail('Не выбран материал двора')
      return ok()
    },
  },
  {
    menu: { page: 'page5', label: 'Столбы / Вариант открытия / Перемычка', url: 'stolb-variant-otkritiya-peremichka-2' },
    subPages: ['page5'],
    visible: () => true,
    validate: () => ok(),
  },
  {
    menu: { page: 'page3', label: 'Тип щита', url: 'shield-type' },
    subPages: ['page3'],
    visible: () => true,
    validate: () => ok(),
  },
  {
    menu: { page: 'page6', label: 'Расположение полотна', url: 'raspolozheniye-polotna' },
    subPages: ['page6'],
    visible: () => true,
    validate: () => ok(),
  },
  {
    menu: { page: 'page7', label: 'Проем', url: 'razmery-proyema' },
    subPages: ['page7'],
    visible: () => true,
    validate: (s) => {
      const w = String(s.widthProyema ?? '')
      const h = String(s.heightProyema ?? '')
      if (!w.trim()) return fail('Не указана ширина проёма')
      if (!h.trim()) return fail('Не указана высота проёма')
      return ok()
    },
  },
  {
    menu: { page: 'page9', label: 'Комплект замка', url: 'is-there-lock' },
    subPages: ['page9', 'page_lock_type'],
    visible: () => true,
    validate: (s) => {
      const isThereLock = s.isThereLock as number
      const providesLock = s.providesLock as string
      const lockSetId = s.lockSetId as number | null
      if (isThereLock !== 1 || providesLock === 'Предоставляет заказчик') return ok()
      if (lockSetId == null) return fail('Не выбран тип замка')
      return ok()
    },
  },
  {
    menu: { page: 'page_lock_components', label: 'Комплектующие замка', url: 'lock-components' },
    subPages: ['page_lock_components'],
    visible: (s) => {
      const isThereLock = s.isThereLock as number
      const providesLock = s.providesLock as string
      return isThereLock === 1 && providesLock !== 'Предоставляет заказчик'
    },
    validate: () => ok(),
  },
  {
    menu: { page: 'page10', label: 'Дополнительная ручка', url: 'pen' },
    subPages: ['page10'],
    visible: () => true,
    validate: () => ok(),
  },
  {
    menu: { page: 'page_door_closer', label: 'Доводчик', url: 'door-closer' },
    subPages: ['page_door_closer'],
    visible: (s) => (s.availableSections as string[]).includes('page_door_closer'),
    validate: () => ok(),
  },
  {
    menu: { page: 'page_bumper', label: 'Отбойник', url: 'bumper' },
    subPages: ['page_bumper'],
    visible: (s) => (s.availableSections as string[]).includes('page_bumper'),
    validate: () => ok(),
  },
  {
    menu: { page: 'page_skud', label: 'СКУД', url: 'skud' },
    subPages: ['page_skud'],
    visible: (s) => (s.availableSections as string[]).includes('page_skud'),
    validate: () => ok(),
  },
  {
    menu: { page: 'page11', label: 'Клиент', url: 'client' },
    subPages: ['page11'],
    visible: () => true,
    validate: () => ok(),
  },
  {
    menu: { page: 'page12', label: 'Рассчитать', url: 'end' },
    subPages: ['page12'],
    visible: () => true,
    validate: () => ok(),
  },
]

export function computeSectionValidation(
  sections: SectionDefinition[],
  state: Record<string, unknown>,
): Map<string, SectionValidation> {
  const result = new Map<string, SectionValidation>()
  for (const section of sections) {
    if (section.visible(state)) {
      result.set(section.menu.page, section.validate(state))
    }
  }
  return result
}

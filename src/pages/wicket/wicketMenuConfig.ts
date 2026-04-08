/** Общий список пунктов левого меню мастера калитки (type1 / type2 / …). */

export interface WicketMenuItem {
  url: string
  page: string
  label: string
}

export const WICKET_MENU_ITEMS: WicketMenuItem[] = [
  { url: 'manufacturing-option', page: 'page1', label: 'Вариант изготовления' },
  { url: 'fill-side', page: 'page2', label: 'Заполнение' },
  { url: 'stolb-variant-otkritiya-peremichka-2', page: 'page5', label: 'Столбы / Вариант открытия / Перемычка' },
  { url: 'shield-type', page: 'page3', label: 'Тип щита' },
  { url: 'raspolozheniye-polotna', page: 'page6', label: 'Расположение полотна' },
  { url: 'razmery-proyema', page: 'page7', label: 'Проем' },
  { url: 'is-there-lock', page: 'page9', label: 'Комплект замка' },
  { url: 'pen', page: 'page10', label: 'Дополнительная ручка' },
  { url: 'client', page: 'page11', label: 'Клиент' },
  { url: 'end', page: 'page12', label: 'Рассчитать' },
]

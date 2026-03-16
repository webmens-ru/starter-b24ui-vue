import { describe, it, expect, beforeEach } from 'vitest'
import { useCalculation } from './useCalculation'

describe('useCalculation', () => {
  let calc: ReturnType<typeof useCalculation>

  beforeEach(() => {
    calc = useCalculation()
    calc.reset()
  })

  describe('loadFromApi — данные не теряются при загрузке', () => {
    const fullApiData: Record<string, unknown> = {
      order_id: 42,
      orderId: 42,
      model_id: '1',
      product_type: 'wicket',
      model: 'Калитка Тип 1',
      provides_material: 'Предоставляет изготовитель',
      provides_paint: 'Предоставляет изготовитель',
      does_painting_frame: 'Выполняет изготовитель',
      does_assembly: 'Выполняет изготовитель',
      fill_side: 'Две стороны',
      material_facade_glob: 'Профлист',
      material_yard_glob: 'Сайдинг',
      nalichie_stolbov_name: 'Со столбами',
      nalichie_stolbov_id: 1,
      stolb_id: 7,
      stolb_name: '60/60/2',
      opening_option_id: 2,
      opening_option_name: 'Внутрь / Левая',
      peremichka_polozheniye_id: '2',
      peremichka_polozheniye_name: 'Перемычка над створкой',
      peremichka_sortament_id: 11,
      peremichka_sortament_name: '40/40/2',
      calculation_name: 'Тест расчёта',
      client_name: 'Иван',
      client_last_name: 'Петров',
      client_surname: 'Сергеевич',
      client_phone: '+7 (999) 111-22-33',
      client_email: 'ivan@test.ru',
      client_address: 'Москва, ул. Пушкина, 1',
      client_comment: 'Позвонить',
      country_code: '+7',
      is_there_pen_id: 1,
      is_there_pen_name: 'Будет',
      pen_provided: 'Предоставляет заказчик',
      pen_installed: 'Устанавливает заказчик',
      pen_color: 'Белая',
      type_lock: 'Тип_2',
      is_there_lock_id: 0,
      is_there_lock_name: 'Нет',
      provides_lock: 'Предоставляет изготовитель',
      lock_installer: 'Выполняет изготовитель',
      is_there_cable: 'Изготовитель устанавливает',
      width_proyema: '1100',
      height_proyema: '2100',
      clearance_proyema: '30',
      sostoyaniye_proyema: 'Готов',
      raspolozheniye_polotna: 'Горизонтально',
      shield_type: 'Тип_3',
      color_shield_id: 2,
      color_shield_name: 'RAL 8017',
      height_top_part: '150',
      height_lower_part: '200',
      width_side_part: '0',
      grille_location: 'Возле петель',
      id_facade: 5,
      material_supplier_facade: 'Кровельный центр',
      material_facade: 'Профлист С-20',
      form_facade: '',
      thickness_facade: '0.45',
      type_of_coating_facade: 'Глянец',
      color_facade: 'RAL 7004',
      id_yard: 12,
      material_supplier_yard: 'Кровельный центр',
      material_yard: 'Сайдинг «Бревно»',
      form_yard: 'Гладкая',
      thickness_yard: '',
      type_of_coating_yard: 'Глянец',
      color_yard: 'RAL 9003',
      price_retail: '18500',
      price_dealer: '12500',
      visitedPages: [
        'page1', 'page2', 'page2_facade_siding', 'page2_facade_profnastil',
        'page2_yard_siding', 'page2_yard_profnastil', 'page5', 'page3', 'page6',
        'page7', 'page9', 'page_lock_type', 'page10', 'page11', 'page12',
      ],
      activePage: 'page12',
    }

    it('восстанавливает все поля из API-ответа', () => {
      calc.loadFromApi(fullApiData)

      expect(calc.number.value).toBe(42)
      expect(calc.fill_side.value).toBe('Две стороны')
      expect(calc.material_facade_glob.value).toBe('Профлист')
      expect(calc.material_yard_glob.value).toBe('Сайдинг')
      expect(calc.nalichie_stolbov_id.value).toBe(1)
      expect(calc.opening_option_id.value).toBe(2)
      expect(calc.peremichka_sortament_id.value).toBe(11)
      expect(calc.client_name.value).toBe('Иван')
      expect(calc.client_phone.value).toBe('+7 (999) 111-22-33')
      expect(calc.is_there_pen_id.value).toBe(1)
      expect(calc.is_there_lock_id.value).toBe(0)
      expect(calc.width_proyema.value).toBe('1100')
      expect(calc.shield_type.value).toBe('Тип_3')
      expect(calc.height_top_part.value).toBe('150')
      expect(calc.id_facade.value).toBe(5)
      expect(calc.id_yard.value).toBe(12)
      expect(calc.price_retail.value).toBe('18500')
    })

    it('корректно обрабатывает numeric-поля (строгие числа)', () => {
      calc.loadFromApi({
        nalichie_stolbov_id: '1',
        opening_option_id: '2',
        is_there_pen_id: '1',
        is_there_lock_id: '0',
      })

      expect(calc.nalichie_stolbov_id.value).toBe(1)
      expect(typeof calc.nalichie_stolbov_id.value).toBe('number')
    })

    it('при material_yard_glob=null оставляет null (при Одна сторона)', () => {
      calc.loadFromApi({
        fill_side: 'Одна сторона',
        material_yard_glob: null,
      })

      expect(calc.material_yard_glob.value).toBeNull()
    })

    it('visitedPages содержит все шаги после загрузки (доступ к любому шагу)', () => {
      calc.loadFromApi(fullApiData)

      const allPages = [
        'page1', 'page2', 'page2_facade_siding', 'page2_facade_profnastil',
        'page2_yard_siding', 'page2_yard_profnastil', 'page5', 'page3', 'page6',
        'page7', 'page9', 'page_lock_type', 'page10', 'page11', 'page12',
      ]

      for (const page of allPages) {
        expect(calc.isPageAccessible(page)).toBe(true)
      }
    })

    it('при редактировании пустого заказа — доступны только достигнутые этапы', () => {
      calc.loadFromApi({
        order_id: 42,
        visitedPages: ['page1'],
        activePage: 'page2',
      })

      expect(calc.isPageAccessible('page1')).toBe(true)
      expect(calc.isPageAccessible('page2')).toBe(true)
      expect(calc.isPageAccessible('page5')).toBe(false)
      expect(calc.isPageAccessible('page12')).toBe(false)
    })
  })

  describe('rebuildSummaryBlocks (через loadFromApi)', () => {
    it('сводка отражает состояние после loadFromApi', () => {
      calc.loadFromApi({
        order_id: 42,
        fill_side: 'Две стороны',
        material_facade_glob: 'Сайдинг',
        material_yard_glob: 'Профлист',
        is_there_lock_id: 1,
        client_name: 'Тест',
      })

      const blockNames = calc.data.value.map(b => b.blockName)

      expect(blockNames).toContain('Вариант изготовления')
      expect(blockNames).toContain('Заполнение')
      expect(blockNames).toContain('Столбы / вариант открытия / перемычка')
      expect(blockNames).toContain('Замок')
      expect(blockNames).toContain('Клиент')

      const fillBlock = calc.data.value.find(b => b.blockName === 'Заполнение')
      expect(fillBlock?.params.map(p => p.name)).toContain('Материал заполнения (двор)')
    })
  })

  describe('reset', () => {
    it('сбрасывает все поля к дефолтным значениям', () => {
      calc.number.value = '123'
      calc.client_name.value = 'Иван'
      calc.fill_side.value = 'Две стороны'

      calc.reset()

      expect(calc.number.value).toBe('')
      expect(calc.client_name.value).toBe('')
      expect(calc.fill_side.value).toBe('Одна сторона')
      expect(calc.data.value).toHaveLength(0)
      expect(calc.visitedPages.value).toHaveLength(0)
    })
  })
})

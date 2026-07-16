import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from './useCalculation'

describe('useCalculation', () => {
  let calc: ReturnType<typeof useCalculation>

  beforeEach(() => {
    setActivePinia(createPinia())
    calc = useCalculation()
    calc.reset()
  })

  describe('loadFromApi — данные не теряются при загрузке', () => {
    const fullApiData: Record<string, unknown> = {
      orderId: 42,
      modelId: '1',
      productType: 'wicket',
      model: 'Калитка Тип 1',
      providesMaterial: 'Предоставляет изготовитель',
      providesPaint: 'Предоставляет изготовитель',
      doesPaintingFrame: 'Выполняет изготовитель',
      doesAssembly: 'Выполняет изготовитель',
      fillSide: 'Две стороны',
      materialFacadeGlob: 'Профлист',
      materialYardGlob: 'Сайдинг',
      nalichieStolbovName: 'Со столбами',
      hasStolby: 1,
      stolbId: 7,
      stolbName: '60/60/2',
      openingOptionId: 2,
      openingOptionName: 'Внутрь / Левая',
      peremichkaPolozheniyeId: '2',
      peremichkaPolozheniyeName: 'Перемычка над створкой',
      peremichkaSortamentId: 11,
      peremichkaSortamentName: '40/40/2',
      calculationName: 'Тест расчёта',
      clientName: 'Иван',
      clientLastName: 'Петров',
      clientSurname: 'Сергеевич',
      clientPhone: '+7 (999) 111-22-33',
      clientEmail: 'ivan@test.ru',
      clientAddress: 'Москва, ул. Пушкина, 1',
      clientComment: 'Позвонить',
      countryCode: '+7',
      isTherePen: 1,
      isTherePenName: 'Будет',
      penProvided: 'Предоставляет заказчик',
      penInstalled: 'Устанавливает заказчик',
      penColor: 'Белая',
      typeLock: 'Тип_2',
      isThereLock: 0,
      isThereLockName: 'Нет',
      providesLock: 'Предоставляет изготовитель',
      lockInstaller: 'Выполняет изготовитель',
      isThereCable: 'Изготовитель устанавливает',
      widthProyema: '1100',
      heightProyema: '2100',
      clearanceProyema: '30',
      sostoyaniyeProyema: 'Готов',
      raspolozheniyePolotna: 'Горизонтально',
      shieldType: 'Тип_3',
      colorShieldId: 2,
      colorShieldName: 'RAL 8017',
      heightTopPart: '150',
      heightLowerPart: '200',
      widthSidePart: '0',
      grilleLocation: 'Возле петель',
      idFacade: 5,
      materialSupplierFacade: 'Кровельный центр',
      materialFacade: 'Профлист С-20',
      formFacade: '',
      thicknessFacade: '0.45',
      typeOfCoatingFacade: 'Глянец',
      colorFacade: 'RAL 7004',
      colorFacadeHex: '#704214',
      colorFacadeImage: '/uploads/colors/wood.jpg',
      idYard: 12,
      materialSupplierYard: 'Кровельный центр',
      materialYard: 'Сайдинг «Бревно»',
      formYard: 'Гладкая',
      thicknessYard: '',
      typeOfCoatingYard: 'Глянец',
      colorYard: 'RAL 9003',
      priceRetail: '18500',
      priceDealer: '12500',
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
      expect(calc.fillSide.value).toBe('Две стороны')
      expect(calc.materialFacadeGlob.value).toBe('Профлист')
      expect(calc.materialYardGlob.value).toBe('Сайдинг')
      expect(calc.hasStolby.value).toBe(1)
      expect(calc.openingOptionId.value).toBe(2)
      expect(calc.peremichkaSortamentId.value).toBe(11)
      expect(calc.clientName.value).toBe('Иван')
      expect(calc.clientPhone.value).toBe('+7 (999) 111-22-33')
      expect(calc.isTherePen.value).toBe(1)
      expect(calc.isThereLock.value).toBe(0)
      expect(calc.widthProyema.value).toBe('1100')
      expect(calc.shieldType.value).toBe('Тип_3')
      expect(calc.heightTopPart.value).toBe('150')
      expect(calc.idFacade.value).toBe(5)
      expect(calc.colorFacadeHex.value).toBe('#704214')
      expect(calc.colorFacadeImage.value).toBe('/uploads/colors/wood.jpg')
      expect(calc.idYard.value).toBe(12)
      expect(calc.priceRetail.value).toBe('18500')
    })

    it('корректно обрабатывает numeric-поля (строгие числа)', () => {
      calc.loadFromApi({
        hasStolby: '1',
        openingOptionId: '2',
        isTherePen: '1',
        isThereLock: '0',
      })

      expect(calc.hasStolby.value).toBe(1)
      expect(typeof calc.hasStolby.value).toBe('number')
    })

    it('восстанавливает lockComponentIds из JSON-строки API', () => {
      calc.loadFromApi({
        lockComponentIds: '[2,5]',
        lockComponentsInstalled: 'Устанавливает заказчик',
      })

      expect(calc.lockComponentIds.value).toEqual([2, 5])
      expect(calc.lockComponentsInstalled.value).toBe('Устанавливает заказчик')
    })

    it('при materialYardGlob=null оставляет null (при Одна сторона)', () => {
      calc.loadFromApi({
        fillSide: 'Одна сторона',
        materialYardGlob: null,
      })

      expect(calc.materialYardGlob.value).toBeNull()
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
        orderId: 42,
        visitedPages: ['page1'],
        activePage: 'page2',
      })

      expect(calc.isPageAccessible('page1')).toBe(true)
      expect(calc.isPageAccessible('page2')).toBe(true)
      expect(calc.isPageAccessible('page5')).toBe(false)
      expect(calc.isPageAccessible('page12')).toBe(false)
    })

    it('для type2 при редактировании восстанавливает реальный маршрут заполнения с первого шага', () => {
      calc.loadFromApi({
        orderId: 42,
        modelId: '2',
        providesMaterial: 'Предоставляет изготовитель',
        providesPaint: 'Предоставляет изготовитель',
        doesPaintingFrame: 'Выполняет изготовитель',
        fillSide: 'Одна сторона',
        materialFacadeGlob: 'Профлист',
        idFacade: 5,
        openingOptionId: 1,
        raspolozheniyePolotna: 'Вертикально',
        widthProyema: '1000',
        heightProyema: '2000',
        isThereLock: 1,
        isTherePen: 0,
      })

      expect(calc.activePage.value).toBe('page1')
      expect(calc.isPageAccessible('page1')).toBe(true)
      expect(calc.isPageAccessible('page2')).toBe(true)
      expect(calc.isPageAccessible('page2_facade_profnastil')).toBe(true)
      expect(calc.isPageAccessible('page5')).toBe(true)
      expect(calc.visitedPages.value.indexOf('page2_facade_profnastil'))
        .toBeLessThan(calc.visitedPages.value.indexOf('page5'))
    })

    it('для type2 при редактировании не блокирует вложенные шаги замка из старого visitedPages', () => {
      calc.loadFromApi({
        orderId: 42,
        modelId: '2',
        visitedPages: [
          'page1', 'page2', 'page5', 'page3', 'page6',
          'page7', 'page9', 'page10', 'page11', 'page12',
        ],
        activePage: 'page12',
        providesMaterial: 'Предоставляет изготовитель',
        providesPaint: 'Предоставляет изготовитель',
        doesPaintingFrame: 'Выполняет изготовитель',
        fillSide: 'Одна сторона',
        materialFacadeGlob: 'Профлист',
        idFacade: 5,
        openingOptionId: 1,
        raspolozheniyePolotna: 'Вертикально',
        widthProyema: '1000',
        heightProyema: '2000',
        isThereLock: 1,
        providesLock: 'Предоставляет изготовитель',
        lockSetId: 7,
        lockComponentIds: '[2]',
        lockComponentsInstalled: 'Устанавливает изготовитель',
        isTherePen: 0,
        clientName: 'Иван',
        priceRetail: '1000',
      })

      expect(calc.activePage.value).toBe('page1')
      expect(calc.isPageAccessible('page_lock_type')).toBe(true)
      expect(calc.isPageAccessible('page_lock_components')).toBe(true)
      expect(calc.visitedPages.value.indexOf('page9'))
        .toBeLessThan(calc.visitedPages.value.indexOf('page_lock_type'))
      expect(calc.visitedPages.value.indexOf('page_lock_type'))
        .toBeLessThan(calc.visitedPages.value.indexOf('page_lock_components'))
    })

    it('при сохранённом page11 и уже рассчитанной цене открывает page12', () => {
      calc.loadFromApi({
        orderId: 42,
        visitedPages: ['page1', 'page2', 'page3', 'page5', 'page6', 'page7', 'page9', 'page10', 'page11'],
        activePage: 'page11',
        priceRetail: '19978.49',
        priceDealer: '17980.64',
        providesMaterial: 'Предоставляет изготовитель',
        providesPaint: 'Предоставляет изготовитель',
        doesPaintingFrame: 'Выполняет изготовитель',
        fillSide: 'Одна сторона',
        shieldType: 'Тип_1',
        openingOptionId: 1,
        raspolozheniyePolotna: 'Вертикально',
        widthProyema: '1000',
        heightProyema: '2000',
        isThereLock: 1,
        isTherePen: 0,
        clientName: 'Иван',
      })

      expect(calc.activePage.value).toBe('page12')
      expect(calc.isPageAccessible('page12')).toBe(true)
    })
  })

  describe('rebuildSummaryBlocks (через loadFromApi)', () => {
    it('сводка отражает состояние после loadFromApi', () => {
      calc.loadFromApi({
        orderId: 42,
        fillSide: 'Две стороны',
        materialFacadeGlob: 'Сайдинг',
        materialYardGlob: 'Профлист',
        isThereLock: 1,
        clientName: 'Тест',
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

  describe('getBaseSavePayload', () => {
    it('возвращает orderId, modelId, reachedStep, visitedPages', () => {
      calc.number.value = 42
      calc.modelId.value = '1'
      calc.setActivePage('page5')

      const payload = calc.getBaseSavePayload()

      expect(payload).toEqual({
        orderId: 42,
        modelId: '1',
        reachedStep: 'page5',
        visitedPages: JSON.stringify(calc.visitedPages.value),
      })
      expect(JSON.parse(payload.visitedPages)).toContain('page5')
    })

    it('getFullSavePayload досылает данные второго типа вместе с прогрессом', () => {
      calc.number.value = 42
      calc.modelId.value = '2'
      calc.setActivePage('page12')
      calc.lockSetId.value = 7
      calc.lockPenId.value = 3
      calc.lockPenColorId.value = 5
      calc.lockComponentIds.value = [2, 4]
      calc.lockComponentsInstalled.value = 'Устанавливает заказчик'
      calc.addons.value.doorCloser.isThere = 1
      calc.addons.value.doorCloser.itemId = 9
      calc.addons.value.skud.itemIds = [10, 11]

      const payload = calc.getFullSavePayload()

      expect(payload).toMatchObject({
        orderId: 42,
        modelId: '2',
        reachedStep: 'page12',
        lockSetId: 7,
        lockPenId: 3,
        lockPenColorId: 5,
        lockComponentsInstalled: 'Устанавливает заказчик',
        isThereDoorCloser: 1,
        doorCloserId: 9,
      })
      expect(payload.lockComponentIds).toBe('[2,4]')
      expect(payload.skudIds).toBe('[10,11]')
    })

    it('не сохраняет вычисляемый внешний вид заполнения в payload заказа', () => {
      calc.colorFacadeHex.value = '#704214'
      calc.colorFacadeImage.value = '/uploads/colors/wood.jpg'

      const payload = calc.getFullSavePayload()

      expect(payload).not.toHaveProperty('colorFacadeHex')
      expect(payload).not.toHaveProperty('colorFacadeImage')
    })
  })

  describe('reset', () => {
    it('сбрасывает все поля к дефолтным значениям', () => {
      calc.number.value = '123'
      calc.clientName.value = 'Иван'
      calc.fillSide.value = 'Две стороны'
      calc.colorFacadeHex.value = '#704214'
      calc.colorFacadeImage.value = '/uploads/colors/wood.jpg'

      calc.reset()

      expect(calc.number.value).toBe('')
      expect(calc.clientName.value).toBe('')
      expect(calc.fillSide.value).toBe('Одна сторона')
      expect(calc.colorFacadeHex.value).toBe('')
      expect(calc.colorFacadeImage.value).toBe('')
      expect(calc.data.value).toHaveLength(0)
      expect(calc.visitedPages.value).toHaveLength(0)
    })
  })
})

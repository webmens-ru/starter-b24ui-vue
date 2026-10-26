import api from '.'
import { parseJumperOptions, type JumperOptionsResponse } from './jumperProperties'
export type { JumperPlacement, JumperOption, JumperOptionsResponse } from './jumperProperties'
import { parseOpeningOrientation } from '../../components/wicket/openingOrientation'
import { isPositiveSafeInteger, parsePositiveDecimalId } from '../positiveDecimalId'
import { canonicalizeWicketRootSavePayload } from './wicketRootSavePayload'
import { parsePipeOptions, type PipeOption } from './pipeProfiles'
import { parseFillingDrawingRow } from './fillingDrawingProfiles'
import { parseFenceGapOptions } from './fenceGapOptions'
export type { PipeProfile, PipeProfileProblem, PipeOption } from './pipeProfiles'
import {
  forgetWicketProductRowLockVersion,
  initializeWicketProductRowLockVersion,
  notifyWicketProductRowLockVersionAdvanced,
  rememberWicketProductRowLockVersion,
  runWicketProductRowLockMutation,
} from './wicketProductRowLockVersion'
import {
  mockFetchWicketPage,
  mockSaveWicketData,
  mockRecalculate,
  mockGetFilterOptions,
  mockGetSidingTable,
  mockGetFillingAppearanceOptions,
  mockGetProfnastilTable,
  mockGetProfnastilColors,
  mockGetAssortmentStolb,
  mockGetPolozhenieJumper,
  mockGetOpeningOptions,
  mockGetAssortmentJumper,
  mockGetColorShield,
  mockGetNetWidths,
  mockGetNetsByWidth,
  mockGetLocks,
  mockGetPensByLock,
  mockGetAdditionalPens,
  mockGetAddressSuggestions,
  mockFinalCalculate,
  mockDeleteCalculation,
  mockLoadWicketData,
  mockCreateOrder,
  mockFetchSavedOrderPrice,
} from './mockWicket'
import type {
  PaintCategory,
  OpeningOrientation,
  OpeningOrientationProblem,
  OpeningOption,
  OpeningOptionsResponse,
  SelectItem,
  ColorShieldItem,
  FilterOptionItem,
  FilterOptions,
  FillingAppearanceOptions,
  SidingFilters,
  SidingRow,
  SidingPagination,
  SidingTableResponse,
  ProfnastilFilters,
  ProfnastilRow,
  ProfnastilTableResponse,
  ProfnastilFormOptions,
  ProfnastilColorOption,
  ZhalyuziFilters,
  ZhalyuziRow,
  ZhalyuziTableResponse,
  SpFilters,
  SpRow,
  SpTableResponse,
  SheetFilters,
  SheetRow,
  SheetTableResponse,
  FenceFilters,
  FenceRow,
  FenceTableResponse,
  LamelFilters,
  LamelRow,
  LamelTableResponse,
  RecalculateResponse,
  OrderSavedPriceResponse,
  CompanyScopedPayload,
  ProductRowContext,
  WicketCalculationPayload,
  WicketMainMenuPayload,
  WicketSavePayload,
  WicketRootMutationResponse,
  WicketAccessoryCompositionContext,
  WicketAccessoryCompositionPayload,
  WicketAccessoryCompositionResponse,
} from './wicket.types'

export type {
  OpeningOrientation,
  OpeningOrientationProblem,
  OpeningOption,
  OpeningOptionsResponse,
  SelectItem,
  ColorShieldItem,
  FilterOptionItem,
  FilterOptions,
  FillingAppearanceOptions,
  SidingFilters,
  SidingRow,
  SidingPagination,
  SidingTableResponse,
  ProfnastilFilters,
  ProfnastilRow,
  ProfnastilTableResponse,
  ProfnastilFormOptions,
  ProfnastilColorOption,
  ZhalyuziFilters,
  ZhalyuziRow,
  ZhalyuziTableResponse,
  SpFilters,
  SpRow,
  SpTableResponse,
  SheetFilters,
  SheetRow,
  SheetTableResponse,
  FenceFilters,
  FenceRow,
  FenceTableResponse,
  LamelFilters,
  LamelRow,
  LamelTableResponse,
  RecalculateResponse,
  OrderSavedPriceResponse,
  CompanyScopedPayload,
  ProductRowContext,
  WicketCalculationPayload,
  WicketMainMenuPayload,
  WicketSavePayload,
  WicketRootMutationResponse,
  WicketAccessoryCompositionContext,
  WicketAccessoryCompositionPayload,
  WicketAccessoryCompositionResponse,
}

export { onWicketProductRowLockConflict } from './wicketProductRowLockVersion'

const isMock = import.meta.env.VITE_MOCK === 'true'

export async function getWicketAccessoryComposition(
  context: WicketAccessoryCompositionContext,
): Promise<WicketAccessoryCompositionResponse> {
  return fetchWicketAccessoryComposition(context, true)
}

export async function saveWicketAccessoryComposition(
  payload: WicketAccessoryCompositionPayload,
): Promise<WicketAccessoryCompositionResponse> {
  const context = accessoryCompositionLockContext(payload)
  initializeWicketProductRowLockVersion(context, payload.lockVersion)
  return runWicketProductRowLockMutation(context, async () => {
    const { data } = await api.post('/api/wicket/accessory-composition', payload)
    rememberWicketProductRowLockVersion(context, data.data.lockVersion)
    return data.data
  })
}

async function fetchWicketAccessoryComposition(
  context: WicketAccessoryCompositionContext,
  rememberVersion: boolean,
): Promise<WicketAccessoryCompositionResponse> {
  const { data } = await api.get('/api/wicket/accessory-composition', { params: context })
  if (rememberVersion) {
    rememberWicketProductRowLockVersion(accessoryCompositionLockContext(context), data.data.lockVersion)
  }
  return data.data
}

function accessoryCompositionLockContext(
  context: WicketAccessoryCompositionContext,
): ProductRowContext {
  return { ...context, modelId: 'accessory-composition' }
}

function assertProductRowContext(context: Partial<ProductRowContext>): asserts context is ProductRowContext {
  const { orderId, productRowId, modelId } = context
  if (!isPositiveSafeInteger(orderId)) {
    throw new Error('Не указан корректный orderId текущей позиции.')
  }
  if (!isPositiveSafeInteger(productRowId)) {
    throw new Error('Не указан корректный productRowId текущей позиции.')
  }
  if (typeof modelId !== 'string' || modelId.trim() === '') {
    throw new Error('Не указан modelId текущей позиции.')
  }
}

function assertWicketCalculationPayload(payload: WicketCalculationPayload): void {
  if (!isPositiveSafeInteger(payload.orderId)) {
    throw new Error('Не указан корректный orderId текущей позиции.')
  }
  if (!isPositiveSafeInteger(payload.productRowId)) {
    throw new Error('Не указан корректный productRowId текущей позиции.')
  }
  if (String(payload.modelId).trim() === '') {
    throw new Error('Не указан modelId текущей позиции.')
  }
}

/** Создаёт новый заказ и возвращает orderId. Вызывать один раз при открытии новой формы. */
export async function createOrder(payload: CompanyScopedPayload = {}): Promise<{
  orderId: number
  companyId: number | null
  managerId: number
}> {
  if (isMock) return mockCreateOrder()
  const { data } = await api.post('/api/order/create', payload)
  return data.data
}

/** Создаёт запись расчёта в БД при первом открытии новой формы. */
export async function createWicketMainMenu(payload: WicketMainMenuPayload): Promise<void> {
  assertProductRowContext(payload)
  if (isMock) return
  await api.post(`/api/wicket/type${payload.modelId}/main-menu`, {
    orderId: payload.orderId,
    productRowId: payload.productRowId,
    modelId: String(payload.modelId),
    model: payload.model,
    productType: payload.productType ?? 'Калитка',
  })
}

/** Загружает данные расчёта для редактирования (при открытии из Bitrix24 с placementOptions.id). */
export async function loadWicketData(context: ProductRowContext): Promise<Record<string, unknown>> {
  assertProductRowContext(context)
  if (isMock) return mockLoadWicketData(context.orderId)
  return fetchWicketData(context, true)
}

async function fetchWicketData(
  context: ProductRowContext,
  rememberVersion: boolean,
): Promise<Record<string, unknown>> {
  const { data } = await api.get(`/api/wicket/type${context.modelId}/get-data`, { params: context })
  if (rememberVersion) rememberWicketProductRowLockVersion(context, data.data.lockVersion)
  return data.data
}

export async function loadCoherentWicketState(context: ProductRowContext): Promise<{
  wicketData: Record<string, unknown>
  accessoryComposition: WicketAccessoryCompositionResponse
}> {
  assertProductRowContext(context)
  const compositionContext = { orderId: context.orderId, productRowId: context.productRowId }
  const maxAttempts = 3

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const [wicketData, accessoryComposition] = isMock
      ? await Promise.all([loadWicketData(context), getWicketAccessoryComposition(compositionContext)])
      : await Promise.all([
          fetchWicketData(context, false),
          fetchWicketAccessoryComposition(compositionContext, false),
        ])
    const wicketVersion = wicketData.lockVersion
    const compositionVersion = accessoryComposition.lockVersion
    if (
      isPositiveSafeInteger(wicketVersion)
      && wicketVersion === compositionVersion
    ) {
      rememberWicketProductRowLockVersion(context, wicketVersion)
      return { wicketData, accessoryComposition }
    }
  }

  throw new Error('Не удалось загрузить согласованное состояние товарной позиции. Повторите загрузку.')
}

export async function getFilterOptions(url: string, type?: string): Promise<FilterOptions> {
  if (isMock) return mockGetFilterOptions(url, type)
  const { data } = await api.post(url, type ? { type } : undefined)
  return data.data
}

function directoryFilterIds(values: string[]): number[] {
  return values.map(value => {
    const id = parsePositiveDecimalId(value)
    if (id.kind !== 'valid') throw new Error('Некорректный ID справочника')
    return id.value
  })
}

export async function getSidingTable(
  modelId: string | number,
  filters: SidingFilters,
  page = 1,
): Promise<SidingTableResponse> {
  const result: SidingTableResponse = isMock ? await mockGetSidingTable(filters, page)
    : (await api.post(`/api/wicket/type${modelId}/get-filling-siding`, {
    materials: filters.materials,
    sidingFormIds: directoryFilterIds(filters.form),
    typeOfCoatingIds: directoryFilterIds(filters.typeOfCoating),
    page,
  })).data.data
  return { ...result, table: result.table.map(parseFillingDrawingRow) }
}

export async function getFillingAppearanceOptions(
  modelId: string | number,
  materialGroup: string,
): Promise<FillingAppearanceOptions> {
  if (materialGroup !== 'siding' && materialGroup !== 'profnastil') throw new TypeError('Некорректная группа заполнения')
  if (isMock) return mockGetFillingAppearanceOptions(materialGroup)
  const { data } = await api.post(
    `/api/wicket/type${modelId}/get-filling-appearance-options`,
    { materialGroupCode: materialGroup },
  )
  return data.data
}

export async function getProfnastilTable(
  modelId: string | number,
  filters: ProfnastilFilters,
  page = 1,
): Promise<Required<ProfnastilTableResponse>> {
  const result: ProfnastilTableResponse = isMock ? await mockGetProfnastilTable(filters, page)
    : await api.post(`/api/wicket/type${modelId}/get-filling-profnastil`, {
    profileTypeIds: directoryFilterIds(filters.materials),
    typeOfCoatingIds: directoryFilterIds(filters.typeOfCoating),
    page,
  }).then(({ data }) => data.data ?? data)
  const table = (result.table ?? []).map(parseFillingDrawingRow)
  const pagination = result.pagination ?? {
    page:       1,
    pageSize:   table.length,
    totalCount: table.length,
    pageCount:  1,
  }
  return { table, pagination }
}

export async function getProfnastilColors(
  modelId: string | number,
): Promise<{ colors: ProfnastilColorOption[] }> {
  if (isMock) return mockGetProfnastilColors()
  const { data } = await api.post(`/api/wicket/type${modelId}/get-profnastil-colors`)
  return data.data
}

export async function getType2ProfnastilFormOptions(
  profileTypeId?: number,
  typeOfCoatingId?: number,
): Promise<ProfnastilFormOptions> {
  let result: ProfnastilFormOptions
  if (isMock) {
    result = {
      profiles: [{ id: 1, name: 'С-8' }],
      coatings: profileTypeId
        ? [{
            id: 1,
            name: 'Глянец',
            profnastilId: 1,
            colorInputMode: 'list',
            isDoubleSided: false,
            thickness: '0.45',
            coatingHex: null,
            coatingImage: null,
            reliefImage: null,
            reliefAlongMode: 'stretch',
            reliefAcrossMode: 'repeat',
            drawingProfile: { kind: 'c8' },
            drawingProfileProblem: null,
          }]
        : [],
      manufacturers: [],
      colors: typeOfCoatingId
        ? [{ id: 1, name: 'RAL 7016', hex: '#383E42', image: null }]
        : [],
    }
  } else {
    const { data } = await api.post('/api/wicket/type2/get-profnastil-form-options', {
      profileTypeId: profileTypeId ?? null,
      typeOfCoatingId: typeOfCoatingId ?? null,
    })
    result = data.data
  }
  return { ...result, coatings: result.coatings.map(parseFillingDrawingRow) }
}

export async function getZhalyuziTable(
  modelId: string | number,
  filters: import('./wicket.types').ZhalyuziFilters,
  page = 1,
): Promise<Required<import('./wicket.types').ZhalyuziTableResponse>> {
  const { typeOfCoating, ...otherFilters } = filters
  const { data } = await api.post(`/api/wicket/type${modelId}/get-filling-zhalyuzi`, {
    ...otherFilters, typeOfCoatingIds: directoryFilterIds(typeOfCoating), page,
  })
  const result: import('./wicket.types').ZhalyuziTableResponse = data.data ?? data
  const table = result.table ?? []
  const pagination = result.pagination ?? {
    page:       1,
    pageSize:   table.length,
    totalCount: table.length,
    pageCount:  1,
  }
  return { table, pagination }
}

export async function getSpTable(
  modelId: string | number,
  filters: import('./wicket.types').SpFilters,
  page = 1,
): Promise<Required<import('./wicket.types').SpTableResponse>> {
  const { data } = await api.post(`/api/wicket/type${modelId}/get-filling-sp`, { ...filters, page })
  const result: import('./wicket.types').SpTableResponse = data.data ?? data
  const table = result.table ?? []
  const pagination = result.pagination ?? {
    page:       1,
    pageSize:   table.length,
    totalCount: table.length,
    pageCount:  1,
  }
  return { table, pagination }
}

export async function getSheetTable(
  modelId: string | number,
  filters: import('./wicket.types').SheetFilters,
  page = 1,
): Promise<Required<import('./wicket.types').SheetTableResponse>> {
  const { data } = await api.post(`/api/wicket/type${modelId}/get-filling-sheet`, { ...filters, page })
  const result: import('./wicket.types').SheetTableResponse = data.data ?? data
  const table = result.table ?? []
  const pagination = result.pagination ?? {
    page:       1,
    pageSize:   table.length,
    totalCount: table.length,
    pageCount:  1,
  }
  return { table, pagination }
}

export async function getFenceTable(
  modelId: string | number,
  filters: import('./wicket.types').FenceFilters,
  page = 1,
): Promise<Required<import('./wicket.types').FenceTableResponse>> {
  const { typeOfCoating, ...otherFilters } = filters
  const { data } = await api.post(`/api/wicket/type${modelId}/get-filling-fence`, {
    ...otherFilters, typeOfCoatingIds: directoryFilterIds(typeOfCoating), page,
  })
  const result: import('./wicket.types').FenceTableResponse = data.data ?? data
  const table = result.table ?? []
  const pagination = result.pagination ?? {
    page:       1,
    pageSize:   table.length,
    totalCount: table.length,
    pageCount:  1,
  }
  return { table, pagination }
}

export async function getFenceGapOptions(
  payload: Record<string, unknown>,
): Promise<import('./wicket.types').FenceGapOption[]> {
  const { data } = await api.post('/api/wicket/type3/get-gap', payload)
  const result = data.data ?? data
  return parseFenceGapOptions(result.gaps)
}

export async function getLamelTable(
  modelId: string | number,
  filters: import('./wicket.types').LamelFilters,
  page = 1,
): Promise<Required<import('./wicket.types').LamelTableResponse>> {
  const { data } = await api.post(`/api/wicket/type${modelId}/get-filling-lamel`, { ...filters, page })
  const result: import('./wicket.types').LamelTableResponse = data.data ?? data
  const table = result.table ?? []
  const pagination = result.pagination ?? {
    page:       1,
    pageSize:   table.length,
    totalCount: table.length,
    pageCount:  1,
  }
  return { table, pagination }
}

export async function fetchWicketPage(modelId: number | string, url: string): Promise<string> {
  if (isMock) return mockFetchWicketPage(modelId, url)
  const { data } = await api.post(`/api/wicket/type${modelId}/${url}`)
  return data
}

export async function saveWicketData(payload: WicketSavePayload): Promise<WicketRootMutationResponse> {
  const canonicalPayload = canonicalizeWicketRootSavePayload(payload)
  assertProductRowContext(canonicalPayload)
  if (isMock) return mockSaveWicketData(canonicalPayload)
  const context = {
    orderId: canonicalPayload.orderId,
    productRowId: canonicalPayload.productRowId,
    modelId: canonicalPayload.modelId,
  }
  return runWicketProductRowLockMutation(context, async lockVersion => {
    const { data } = await api.post(`/api/wicket/type${canonicalPayload.modelId}/data`, {
      ...canonicalPayload,
      lockVersion,
    })
    rememberWicketProductRowLockVersion(context, data.data.lockVersion)
    notifyWicketProductRowLockVersionAdvanced(context, lockVersion, data.data.lockVersion)
    return { lockVersion: data.data.lockVersion }
  })
}

export async function getAssortmentStolb(
  modelId: string | number
): Promise<{ assortmentPipe: PipeOption[] }> {
  const raw: unknown = isMock ? await mockGetAssortmentStolb()
    : (await api.get(`/api/wicket/type${modelId}/get-available-assortment-stolb`)).data.data
  return { assortmentPipe: parsePipeOptions(raw, 'assortmentPipe') }
}

export async function getPolozhenieJumper(
  modelId: string | number,
  openingOptionId: number
): Promise<JumperOptionsResponse> {
  if (isMock) return parseJumperOptions(await mockGetPolozhenieJumper(openingOptionId))
  const { data } = await api.post(`/api/wicket/type${modelId}/get-available-polozheniye-jumper`, {
    openingOptionId,
  })
  return parseJumperOptions(data.data)
}

export async function getOpeningOptions(): Promise<OpeningOptionsResponse> {
  const raw: unknown = isMock ? await mockGetOpeningOptions()
    : (await api.get('/api/wicket/base-model/get-opening-options')).data.data
  if (!raw || typeof raw !== 'object' || !('options' in raw) || !('problems' in raw)
    || !Array.isArray(raw.options) || !Array.isArray(raw.problems)) {
    throw new Error('Некорректный ответ справочника вариантов открытия.')
  }
  const seen = new Set<number>()
  const options = raw.options.map((item: unknown) => {
    if (!item || typeof item !== 'object' || !('id' in item) || !isPositiveSafeInteger(item.id)
      || !('name' in item) || typeof item.name !== 'string'
      || !('pathPhoto' in item) || (item.pathPhoto !== null && typeof item.pathPhoto !== 'string')
      || seen.has(item.id)) {
      throw new Error('Некорректный вариант открытия.')
    }
    seen.add(item.id)
    return { id: item.id, name: item.name, pathPhoto: item.pathPhoto, ...parseOpeningOrientation(item) }
  })
  const problems = raw.problems.map((item: unknown) => {
    if (!item || typeof item !== 'object' || !('id' in item) || !isPositiveSafeInteger(item.id)
      || !('message' in item) || typeof item.message !== 'string') {
      throw new Error('Некорректная диагностика вариантов открытия.')
    }
    return { id: item.id, message: item.message }
  })
  return { options, problems }
}

export async function getAssortmentJumper(
  modelId: string | number
): Promise<{ assortmentJumper: PipeOption[] }> {
  const raw: unknown = isMock ? await mockGetAssortmentJumper()
    : (await api.get(`/api/wicket/type${modelId}/get-available-assortment-jumper`)).data.data
  return { assortmentJumper: parsePipeOptions(raw, 'assortmentJumper') }
}

export async function getColorShield(
  modelId: string | number
): Promise<{ colorShield: ColorShieldItem[]; paintCategories?: PaintCategory[] }> {
  if (isMock) return mockGetColorShield()
  const { data } = await api.get(`/api/wicket/type${modelId}/get-color-shield`)
  return data.data
}

/** Список доступной ширины сетки (sizeA из справочника dir_net). */
export async function getNetWidths(): Promise<{ netWidths: { id: string; name: string }[] }> {
  if (isMock) return mockGetNetWidths()
  const { data } = await api.get('/api/dict/net/get-available-widths')
  return data.data
}

/** Сетки по ширине (sizeA) — для выбора карточкой. */
export async function getNetsByWidth(sizeA: number | string): Promise<{
  items: Array<{ id: number; model: string; imageUrl: string | null; sizeA: number; sizeB: number; thickness: number; price: number }>
}> {
  if (isMock) return mockGetNetsByWidth(sizeA)
  const { data } = await api.get('/api/dict/net/get-by-width', { params: { sizeA } })
  return data.data
}

/** Комплект замка, доступный для выбора карточкой. */
export interface LockSetListItem {
  id: number
  marking: string
  imageUrls: string[]
  components: LockSetComponentListItem[]
}

export interface LockSetComponentListItem {
  id: number
  name: string
  imageUrls: string[]
}

/** Список комплектов замка с картинками — для выбора карточкой. */
export async function getLocks(modelId: number): Promise<{
  items: LockSetListItem[]
}> {
  if (isMock) return mockGetLocks()
  const { data } = await api.get('/api/dict/lock/get-list', { params: { modelId } })
  return data.data
}

/** Ручки, совместимые с выбранным комплектом замка (dir_pen_lock). */
export async function getPensByLock(lockSetId: number): Promise<{
  items: Array<{ id: number; marking: string; colors: { id: number; name: string }[]; imageUrls?: string[] }>
}> {
  if (isMock) return mockGetPensByLock(lockSetId)
  const { data } = await api.get('/api/dict/pen/get-by-lock', { params: { lockSetId } })
  return data.data
}

/** Список дополнительных ручек (скоб) из dir_additional_pen. */
export async function getAdditionalPens(): Promise<{
  items: Array<{ id: number; marking: string; canUseFrameColor: boolean; colors: { id: number; name: string }[]; imageUrls?: string[] }>
}> {
  if (isMock) return mockGetAdditionalPens()
  const { data } = await api.get('/api/dict/additional-pen/get-list')
  return data.data
}

export async function getAddressSuggestions(
  query: string
): Promise<{ suggestions: { value: string }[] }> {
  if (isMock) return mockGetAddressSuggestions(query)
  const { data } = await api.post('/address/suggest', { query })
  return data
}

/** Переименовать расчёт (обновить calculationName). */
export async function saveOrderData(payload: {
  orderId: number
  companyId?: number | null
  calculationName: string
}): Promise<void> {
  if (isMock) return
  await api.post('/api/order/data', payload)
}

export async function saveClientInfo(payload: Record<string, unknown>): Promise<void> {
  if (isMock) return
  await api.post('/client/data', payload)
}

/** Проверка сохранённых цен заказа на актуальность (шаг «Рассчитать»). */
export async function fetchSavedOrderPrice(context: ProductRowContext): Promise<OrderSavedPriceResponse> {
  assertProductRowContext(context)
  if (isMock) return mockFetchSavedOrderPrice()
  const { data } = await api.get('/api/order/saved-price', {
    params: context,
  })
  return data.data
}

export async function finalCalculate(payload: WicketCalculationPayload): Promise<{ priceDealer: string; priceRetail: string }> {
  assertWicketCalculationPayload(payload)
  if (isMock) return mockFinalCalculate()
  const context = {
    orderId: payload.orderId,
    productRowId: payload.productRowId,
    modelId: String(payload.modelId),
  }
  return runWicketProductRowLockMutation(context, async lockVersion => {
    const { data } = await api.post('/api/order/calculate', {
      orderId: payload.orderId,
      productRowId: payload.productRowId,
      companyId: payload.companyId,
      modelId: String(payload.modelId),
      lockVersion,
    })
    rememberWicketProductRowLockVersion(context, data.data.lockVersion)
    notifyWicketProductRowLockVersionAdvanced(context, lockVersion, data.data.lockVersion)
    return data.data
  })
}

export async function deleteCalculation(payload: ProductRowContext): Promise<void> {
  assertProductRowContext(payload)
  if (isMock) return mockDeleteCalculation()
  await runWicketProductRowLockMutation(payload, async lockVersion => {
    const { data } = await api.post(`/api/wicket/type${payload.modelId}/delete`, { ...payload, lockVersion })
    rememberWicketProductRowLockVersion(payload, data.data.lockVersion)
    forgetWicketProductRowLockVersion(payload)
  })
}

export async function recalculate(payload: WicketCalculationPayload): Promise<RecalculateResponse> {
  assertWicketCalculationPayload(payload)
  if (isMock) return mockRecalculate(payload)
  const context = {
    orderId: payload.orderId,
    productRowId: payload.productRowId,
    modelId: String(payload.modelId),
  }
  return runWicketProductRowLockMutation(context, async lockVersion => {
    try {
      const { data } = await api.post('/api/order/calculate', {
        orderId: payload.orderId,
        productRowId: payload.productRowId,
        companyId: payload.companyId,
        modelId: String(payload.modelId),
        lockVersion,
      })
      rememberWicketProductRowLockVersion(context, data.data.lockVersion)
      notifyWicketProductRowLockVersionAdvanced(context, lockVersion, data.data.lockVersion)
      return data.data
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = error.response
        if (
          typeof response === 'object'
          && response !== null
          && 'status' in response
          && response.status === 422
          && 'data' in response
        ) {
          const data = response.data
          if (typeof data === 'object' && data !== null && 'lockVersion' in data) {
            rememberWicketProductRowLockVersion(context, data.lockVersion)
            notifyWicketProductRowLockVersionAdvanced(context, lockVersion, data.lockVersion)
          }
        }
      }
      throw error
    }
  })
}

export type MaterialAttributeDataType = 'string' | 'integer' | 'decimal' | 'boolean' | 'option'

export interface MaterialUnitDto {
  code: string
  name: string
  symbol: string
}

export interface MaterialTypeDto {
  id: number
  code: string
  name: string
}

export interface MaterialAttributeOptionDto {
  id: number
  code: string
  name: string
}

export interface MaterialAttributeDefinitionDto {
  id: number
  code: string
  name: string
  dataType: MaterialAttributeDataType
  unit: MaterialUnitDto | null
  isRequired: boolean
  isFilterable: boolean
  options: MaterialAttributeOptionDto[]
}

export interface MaterialDocumentDto {
  name: string
  url: string
  mimeType: string
  sizeBytes: number
}

export interface MaterialItemDto {
  id: number
  typeCode: string
  name: string
  article: string
  price: number
  unit: MaterialUnitDto
  attributes: Record<string, string | number | boolean>
  imageUrls: string[]
  documents: MaterialDocumentDto[]
}

export interface MaterialItemQuery {
  typeCode: string
  productType: 'wicket'
  modelId: number
  attributes?: Record<string, string | number | boolean>
}

export async function getMaterialTypes(): Promise<MaterialTypeDto[]> {
  const { data } = await api.get('/api/dict/material/types')
  return data.data.items
}

export async function getMaterialAttributes(typeCode: string): Promise<MaterialAttributeDefinitionDto[]> {
  const { data } = await api.get('/api/dict/material/attributes', { params: { typeCode } })
  return data.data.items
}

export async function getMaterialItems(params: MaterialItemQuery): Promise<MaterialItemDto[]> {
  const attributes = params.attributes === undefined
    ? undefined
    : Object.fromEntries(Object.entries(params.attributes).map(([code, value]) => [
        code,
        typeof value === 'boolean' ? Number(value) : value,
      ]))
  const { data } = await api.get('/api/dict/material/items', {
    params: { ...params, attributes },
  })
  return data.data.items
}

export async function getStandaloneMaterialItems(typeCode: string): Promise<MaterialItemDto[]> {
  const { data } = await api.get('/api/dict/material/standalone-items', { params: { typeCode } })
  return data.data.items
}

export async function getMaterialItem(id: number): Promise<MaterialItemDto> {
  const { data } = await api.get('/api/dict/material/view', { params: { id } })
  return data.data.items[0]
}

<script setup lang="ts">
import type { SelectItem } from '@bitrix24/b24ui-nuxt'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import * as yup from 'yup'
import { setLocale } from 'yup'
import { currencyList, type Currency, type Good, fetchGoods } from '../app/api/goods'
import api from '../app/api'
import goodsStubJson from '../data/goodsStub.json'
import discountTypeDirectoryJson from '../data/discountTypeDirectory.json'
import markupTypeDirectoryJson from '../data/markupTypeDirectory.json'
import currencyDirectoryJson from '../data/currencyDirectory.json'
import areaDirectoryJson from '../data/areaDirectory.json'

const widgetParams = typeof window !== 'undefined' ? (window as any)._PARAMS_ : undefined
const placementParams = widgetParams?.placementOptions?.params ?? {}
const dealTypeBuildingId = placementParams.dealTypeBuildingId ?? 1
const productTypeId = placementParams.productTypeId
// recordId должен приходить явно, id слайдера использовать нельзя — иначе грузится чужая запись
const recordId = placementParams.recordId ?? placementParams.id
const dealId = placementParams.dealId
const dealArea = Number(placementParams.dealArea ?? placementParams.area ?? 0) || 0
const areasObj = placementParams.areas && !Array.isArray(placementParams.areas) ? placementParams.areas : {}
const dealAreasArray = Array.isArray(placementParams.areas) ? placementParams.areas : []
const dealAreaById: Record<number, number> = {}
for (const a of dealAreasArray) {
  const id = Number((a as any)?.id)
  const value = Number((a as any)?.value)
  if (!Number.isNaN(id) && !Number.isNaN(value)) {
    dealAreaById[id] = value
  }
}
// Поддержка альтернативного формата: значения площадей по ключам из справочника
for (const item of areaDirectoryJson as any[]) {
  const id = Number((item as any)?.id)
  const key = (item as any)?.key
  if (!id || !key) continue
  const raw = (placementParams as any)[key] ?? (areasObj as any)?.[key]
  const val = Number(raw)
  if (!Number.isNaN(val)) {
    dealAreaById[id] = val
  }
}

type DirectoryItem = { id: number; title: string }
type AreaDirectoryItem = { id: number; title: string; key?: string; editable?: boolean }

const goodsStub = goodsStubJson as Good[]
const discountTypeDirectory = discountTypeDirectoryJson as DirectoryItem[]
const markupTypeDirectory = markupTypeDirectoryJson as DirectoryItem[]
const currencyDirectory = currencyDirectoryJson as DirectoryItem[]
const areaDirectory = areaDirectoryJson as AreaDirectoryItem[]
const currencyCodeToTitle: Record<string, string> = {
  руб: 'Рубль',
  usd: 'Доллар США',
  eur: 'Евро',
  cny: 'Юань',
  try: 'Турецкая лира',
}
const currencyTitleToCode: Record<string, string> = Object.fromEntries(
  Object.entries(currencyCodeToTitle).map(([code, title]) => [title, code]),
)
const currencyCodeToId: Record<string, number> = Object.fromEntries(
  currencyDirectory
    .map(item => {
      const code = currencyTitleToCode[item.title] ?? item.title
      return [code, item.id] as const
    })
    .filter(([code]) => Boolean(code)),
)
const currencyIdToCode: Record<number, string> = Object.fromEntries(
  currencyDirectory
    .map(item => {
      const code = currencyTitleToCode[item.title] ?? item.title
      return [item.id, code] as const
    })
    .filter(([, code]) => Boolean(code)),
)

const dealCurrency: Currency | string = 'руб' // валюта сделки (пример)
const discountTypes = discountTypeDirectory.map(i => i.title)
const markupTypes = markupTypeDirectory.map(i => i.title)

// Получаем список товаров с бэка с резервной заглушкой
// goodsFromApi = null означает, что запрос ещё не завершился, поэтому не показываем заглушку
const goodsFromApi = ref<Good[] | null>(null)
const detailLoading = ref(false)
const submitLoading = ref(false)
const costUpdateGuard = ref(false)
const productSearch = ref('')
const isEdit = computed(() => Boolean(recordId))
onMounted(async () => {
  goodsFromApi.value = await fetchGoods({
    dealTypeBuildingId,
    productTypeId,
  })

  if (isEdit.value) {
    await loadDetail()
  }
})

setLocale({
  mixed: {
    required: 'Обязательное поле',
    default: 'Неверное значение',
  },
  number: {
    min: 'Минимум ${min}',
    max: 'Максимум ${max}',
    integer: 'Введите целое число',
    positive: 'Введите положительное число',
  },
  string: {
    email: 'Введите корректный email',
  },
})

const schema = yup.object({
  product: yup.number().nullable().default(undefined).required('Выберите товар'),
  quantity: yup.number().required('Укажите количество').min(1),
  discountValue: yup.number().required().default(0),
  discountType: yup.string().oneOf(discountTypes).required(),
  markupValue: yup.number().required().default(0),
  markupType: yup.string().oneOf(markupTypes).required(),
  autoRecalc: yup.boolean().default(true),
  serviceDates: yup.array().of(yup.string()).default([]),
  // остальные поля — не редактируемые или вычисляются автоматически
})

type Schema = yup.InferType<typeof schema>
type FormSubmitEvent<T> = SubmitEvent & { data: T }

const state = reactive({
  product: undefined as number | undefined, // id товара
  quantity: 1,
  unit: '', // единица измерения
  totalQuantity: 0,
  baseUnitPrice: '',
  finalUnitPrice: '',
  hoursCount: 0,
  daysCount: 1,
  discountValue: 0,
  discountType: '%',
  markupValue: 0,
  markupType: '%',
  finalPrice: 0,
  currency: 'руб' as Currency, // храним код валюты
  costPerUnit: '',
  totalCost: '',
  costCurrency: 'Рубль',
  costSource: 'unit' as 'unit' | 'total',
  invoiceIssued: false,
  contractor: '',
  comment: '',
  autoRecalc: true,
  areaTypeId: undefined as number | undefined,
  areaValue: '',
  serviceDates: [] as string[], // для посуточных
  serviceDate: '' as string, // для почасовых
  serviceTimeFrom: '' as string,
  serviceTimeTo: '' as string,
})

type ProductItem = {
  value: string
  label: string
  goodType: string
  unit: string
  contractor: string
  price: number
  currency: Currency
}

const allGoods = computed<Good[]>(() => {
  if (goodsFromApi.value === null) return [] // ждём ответ
  return goodsFromApi.value.length ? goodsFromApi.value : goodsStub
})
const filteredGoods = computed<Good[]>(() => {
  const list = allGoods.value
  const query = productSearch.value.trim().toLowerCase()
  if (!query) return list

  return list.filter(g => {
    const haystack = [
      g.title,
      g.type?.title,
      g.unit?.title,
      g.contractor?.title,
    ]
    return haystack.some(v => (v ?? '').toString().toLowerCase().includes(query))
  })
})
const productItems = computed<SelectItem[]>(() => {
  const goods = [...filteredGoods.value]
  const current =
    state.product !== undefined ? allGoods.value.find(g => Number(g.id) === Number(state.product)) : undefined

  // обеспечиваем наличие выбранного товара в списке даже при активном поиске
  if (current && !goods.some(g => Number(g.id) === Number(current.id))) {
    goods.unshift(current)
  }

  // храним id товара числом, чтобы выборка по v-model работала сразу после загрузки деталей
  return goods.map((g: Good) => ({
    value: g.id,
    label: g.title,
    goodType: g.type?.title ?? '',
    unit: g.unit?.title ?? '',
    contractor: g.contractor?.title ?? '',
    price: state.currency === 'руб' ? g.price_rub : state.currency === 'usd' ? g.price_usd : g.price_eur,
    currency: state.currency,
  }))
})
const selectedProduct = computed<Good | undefined>(() =>
  allGoods.value.find((g: Good) => Number(g.id) === Number(state.product ?? NaN)),
)
const isCurrencyMismatch = computed(() => state.currency !== dealCurrency)
const isFinalOverCost = computed(() => {
  if (state.currency !== 'руб') return false
  const final = Number(state.finalPrice) || 0
  const cost = Number(state.totalCost) || 0
  return cost > 0 && final < cost
})
const isDailyService = computed(() => {
  const period = selectedProduct.value?.servicePeriod
  return period?.id === 3 || period?.title === 'Посуточно'
})
const isHourlyService = computed(() => {
  const period = selectedProduct.value?.servicePeriod
  return period?.id === 5 || period?.title === 'Почасовая'
})
const showTotalQuantity = computed(
  () => selectedProduct.value?.quantityFactorArea || isDailyService.value || isHourlyService.value,
)
const hasCustomDayCount = computed(() => selectedProduct.value?.id === 1)
const isDaysFieldReadOnly = computed(() => isDailyService.value)
const areaTypeOptions = computed<SelectItem[]>(() => areaDirectory.map(a => ({ value: a.id, label: a.title })))
const enabledAreaTypeOptions = computed<SelectItem[]>(() => {
  const allowed = selectedProduct.value?.enableArea
  if (!allowed || !allowed.length) return areaTypeOptions.value
  const allowedSet = new Set(allowed.map(Number))
  return areaTypeOptions.value.filter(opt => allowedSet.has(Number((opt as any).value)))
})
const selectedAreaType = computed(() => areaDirectory.find(a => Number(a.id) === Number(state.areaTypeId)))
const selectedAreaEditable = computed(() => Boolean(selectedAreaType.value?.editable))
function normalizeDateString(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') {
    // берём только YYYY-MM-DD, или парсим ISO с TZ
    if (val.length >= 10) return val.slice(0, 10)
    return val
  }
  if (typeof val.toString === 'function') {
    const asString = val.toString()
    if (asString.length >= 10) return asString.slice(0, 10)
  }
  try {
    const d = new Date(val)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  } catch (e) {
    // ignore
  }
  return ''
}

function normalizeTimeString(val: any): string {
  if (!val) return ''
  const raw = typeof val === 'string' ? val.trim() : String(val)
  const [hRaw, mRaw] = raw.split(':')
  const h = Number(hRaw)
  const m = Number(mRaw)
  if (Number.isNaN(h) || Number.isNaN(m)) return ''
  if (h < 0 || h > 24 || m < 0 || m > 59) return ''
  if (h === 24 && m !== 0) return ''
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return ''
  const total = h * 60 + m + minutesToAdd
  if (total < 0 || total > 24 * 60) return ''
  const hh = Math.floor(total / 60)
  const mm = total % 60
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`
}

const allowedServiceDates = computed<string[]>(() =>
  (selectedProduct.value?.enableDates ?? []).map(d => normalizeDateString(d)).filter(Boolean),
)

const serviceDateOptions = computed<SelectItem[]>(() =>
  allowedServiceDates.value.map(d => ({
    value: d,
    label: formatDateDisplay(d),
  })),
)

const costPerUnitLabel = computed(() =>
  state.costSource === 'unit' ? '✔ Себестоимость ед.' : 'Себестоимость ед.',
)
const totalCostLabel = computed(() => (state.costSource === 'total' ? '✔ Себестоимость' : 'Себестоимость'))

const allowedServiceStartTimes = computed<string[]>(() =>
  (selectedProduct.value?.serviceStartTimes ?? []).map(t => normalizeTimeString(t)).filter(Boolean),
)
const minServiceDurationMinutes = computed(() => {
  const val = Number(selectedProduct.value?.minServiceDurationMinutes)
  return Number.isFinite(val) && val > 0 ? val : 0
})
const serviceDurationMinutes = computed(() => {
  const val = Number(selectedProduct.value?.serviceDurationMinutes)
  return Number.isFinite(val) && val > 0 ? val : 0
})

const timeOptions = computed<SelectItem[]>(() => {
  const opts: SelectItem[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = h.toString().padStart(2, '0')
      const mm = m.toString().padStart(2, '0')
      const label = `${hh}:${mm}`
      opts.push({ value: label, label })
    }
  }
  return opts
})

const timeOptionsStart = computed<SelectItem[]>(() => {
  if (!isHourlyService.value) return timeOptions.value
  const list = allowedServiceStartTimes.value
  if (!list.length) return timeOptions.value
  return list.map(t => ({ value: t, label: t }))
})

const timeOptionsEnd = computed<SelectItem[]>(() => {
  const base = [...timeOptions.value, { value: '24:00', label: '24:00' }]
  if (!state.serviceTimeFrom) return base
  const [fh, fm] = state.serviceTimeFrom.split(':').map(Number)
  if (Number.isNaN(fh) || Number.isNaN(fm)) return base
  if (serviceDurationMinutes.value > 0) {
    const end = addMinutesToTime(state.serviceTimeFrom, serviceDurationMinutes.value)
    return end ? base.filter(opt => (opt as any).value === end) : []
  }
  const minDuration = minServiceDurationMinutes.value || 1
  const minMinutes = fh * 60 + fm + minDuration
  return base.filter(opt => {
    const val = (opt as any).value ?? opt
    const [h, m] = String(val).split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) return false
    const minutes = h * 60 + m
    return minutes > minMinutes - 1
  })
})

function formatDateDisplay(val: string): string {
  const norm = normalizeDateString(val)
  if (!norm || norm.length < 10) return val ?? ''
  const [y, m, d] = norm.split('-')
  return `${d}.${m}.${y}`
}

const currencyOptions = computed<SelectItem[]>(() => {
  const baseCurrencies =
    currencyDirectory.length > 0
      ? currencyDirectory.map(c => {
          const code = currencyTitleToCode[c.title] ?? c.title
          return { value: code, label: c.title }
        })
      : currencyList.map(c => ({ value: c, label: c }))

  const product = selectedProduct.value
  if (!product) return baseCurrencies

  const allowedCodes: string[] = []
  if (product.price_rub > 0 && currencyCodeToTitle.руб) allowedCodes.push('руб')
  if (product.price_usd > 0 && currencyCodeToTitle.usd) allowedCodes.push('usd')
  if (product.price_eur > 0 && currencyCodeToTitle.eur) allowedCodes.push('eur')

  if (!allowedCodes.length) return baseCurrencies

  const byCode = new Set(allowedCodes)
  return baseCurrencies.filter(c => byCode.has((c as any).value as string))
})

watch(
  selectedProduct,
  () => {
    costUpdateGuard.value = true
    // сбрасываем площадь и тип при смене товара
    state.areaTypeId = undefined
    state.areaValue = ''
    // подтягиваем себестоимость из товара по умолчанию
    state.costPerUnit = selectedProduct.value?.cost_per_unit?.toString() ?? ''
    state.costCurrency = 'Рубль'

    if (!isDailyService.value) {
      state.serviceDates = []
    } else {
      // оставляем только разрешённые даты, если справочник задан
      const allowed = allowedServiceDates.value
      if (allowed.length) {
        state.serviceDates = state.serviceDates.filter(d => allowed.includes(d))
      }
    }
    if (!isHourlyService.value) {
      state.serviceDate = ''
      state.serviceTimeFrom = ''
      state.serviceTimeTo = ''
    } else {
      const allowed = allowedServiceStartTimes.value
      if (allowed.length && state.serviceTimeFrom && !allowed.includes(state.serviceTimeFrom)) {
        state.serviceTimeFrom = ''
        state.serviceTimeTo = ''
      }
      if (serviceDurationMinutes.value > 0 && state.serviceTimeFrom) {
        const end = addMinutesToTime(state.serviceTimeFrom, serviceDurationMinutes.value)
        state.serviceTimeTo = end || ''
      }
    }
    if (selectedProduct.value?.quantityFactorArea) {
      const allowed = selectedProduct.value.enableArea ?? []
      const firstAllowed = allowed.length ? allowed[0] : undefined
      if (firstAllowed) {
        state.areaTypeId = Number(firstAllowed)
        const val = dealAreaById[state.areaTypeId]
        state.areaValue = Number.isFinite(val) ? String(val) : ''
      }
    }
    const options = currencyOptions.value ?? []
    const first = options[0]
    if (options.length && first && !options.some((o: SelectItem) => (o as any).value === state.currency)) {
      state.currency = (first as any).value as Currency
    }
    nextTick(() => {
      costUpdateGuard.value = false
    })
  },
  { immediate: true },
)

watch(
  () => state.product,
  () => {
    productSearch.value = ''
  },
)

watch(
  () => state.quantity,
  val => {
    const value = val as unknown
    // allow пустое значение пока пользователь печатает — нормализуем при blur
    if (typeof value === 'string' && value.trim() === '') return
    if (value === null || Number.isNaN(Number(value))) state.quantity = 1
  },
)

watch(
  () => state.discountValue,
  val => {
    const value = val as unknown
    if ((typeof value === 'string' && value.trim() === '') || value === null || Number.isNaN(Number(value))) {
      state.discountValue = 0
    }
  },
)

watch(
  () => state.markupValue,
  val => {
    const value = val as unknown
    if ((typeof value === 'string' && value.trim() === '') || value === null || Number.isNaN(Number(value))) {
      state.markupValue = 0
    }
  },
)

// Автопересчёт при изменении себестоимости
watch(
  () => state.costPerUnit,
  () => {
    if (costUpdateGuard.value) return
    recalcPrices()
  },
)

watch(
  () => state.totalCost,
  () => {
    if (costUpdateGuard.value) return
    recalcPrices()
  },
)

function onQuantityBlur() {
  const value = state.quantity as unknown
  if (
    (typeof value === 'string' && value.trim() === '') ||
    value === null ||
    Number.isNaN(Number(value)) ||
    Number(value) < 1
  ) {
    state.quantity = 1
  }
}

function onCostPerUnitInput() {
  state.costSource = 'unit'
  recalcPrices()
}

function onTotalCostInput() {
  state.costSource = 'total'
  const total = Number(state.totalCost)
  const qty =
    showTotalQuantity.value ? state.totalQuantity || Number(state.quantity) || 0 : Number(state.quantity) || 0
  if (qty > 0 && Number.isFinite(total)) {
    costUpdateGuard.value = true
    state.costPerUnit = Number((total / qty).toFixed(2)).toString()
    costUpdateGuard.value = false
  }
  recalcPrices()
}

function recalcPrices() {
  costUpdateGuard.value = true
  try {
    const product = selectedProduct.value
    if (!product) {
      state.unit = ''
      state.finalPrice = 0
      state.costPerUnit = ''
      state.totalCost = ''
    state.costSource = 'unit'
      state.contractor = ''
      return
    }

  state.unit = product.unit?.title ?? ''
  state.contractor = product.contractor?.title ?? ''
  const currency = state.currency
  const basePrice = currency === 'руб' ? product.price_rub : currency === 'usd' ? product.price_usd : product.price_eur
  state.baseUnitPrice = Number(basePrice || 0).toFixed(2)
  const costPerUnitRaw = Number(state.costPerUnit)

  const quantityRaw = Number(state.quantity) || 0
  const areaFactor = product.quantityFactorArea
    ? Number(state.areaValue || dealArea || 1) || 1
    : 1
  const daysFactor = hasCustomDayCount.value
    ? Number(state.daysCount) || 1
    : isDailyService.value
      ? state.daysCount || state.serviceDates.length || 0
      : 1
  const hoursFactor = isHourlyService.value ? (state.hoursCount || 0) : 1
  const quantity = quantityRaw * areaFactor * daysFactor * hoursFactor
  let discountVal = Number(state.discountValue) || 0
  const markupVal = Number(state.markupValue) || 0

  if (state.discountType === '%' && discountVal > 100) {
    discountVal = 100
    state.discountValue = 100
  }

  const baseTotal = basePrice * quantity
  const discount = state.discountType === '%' ? (baseTotal * discountVal) / 100 : discountVal
  const markup = state.markupType === '%' ? (baseTotal * markupVal) / 100 : markupVal
  const totalPrice = Math.max(baseTotal - discount + markup, 0)

  state.finalPrice = Number(totalPrice.toFixed(2))
  const quantityForCost = showTotalQuantity.value ? (state.totalQuantity || quantity) : quantity

  if (state.costSource === 'total') {
    const totalCostNum = Number(state.totalCost)
    if (quantityForCost > 0 && Number.isFinite(totalCostNum)) {
      const cpu = totalCostNum / quantityForCost
      state.costPerUnit = Number(cpu.toFixed(2)).toString()
    }
  } else {
    if (Number.isFinite(costPerUnitRaw)) {
      state.totalCost = Number((costPerUnitRaw * quantityForCost).toFixed(2)).toString()
    } else {
      state.totalCost = ''
    }
  }

  if (showTotalQuantity.value) {
    state.totalQuantity = quantity
  }

    const totalQty = quantity || quantityRaw || 0
    state.finalUnitPrice = totalQty > 0 ? Number(totalPrice / totalQty).toFixed(2) : ''
  } finally {
    costUpdateGuard.value = false
  }
}

function recalcHourlyQuantity() {
  if (!isHourlyService.value) return
  const from = state.serviceTimeFrom
  const to = state.serviceTimeTo
  if (!from || !to) return
  const [fh, fm] = from.split(':').map(Number)
  const [th, tm] = to.split(':').map(Number)
  if (Number.isNaN(fh) || Number.isNaN(fm) || Number.isNaN(th) || Number.isNaN(tm)) return
  const start = fh * 60 + fm
  const end = th * 60 + tm
  if (end <= start) {
    state.hoursCount = 0
    return
  }
  const diffMinutes = end - start
  const hours = Math.ceil(diffMinutes / 60)
  state.hoursCount = hours
}


watch(
  [
    selectedProduct,
    () => state.quantity,
    () => state.discountValue,
    () => state.discountType,
    () => state.markupValue,
    () => state.markupType,
    () => state.currency,
    () => state.serviceDates.length,
    () => state.serviceDate,
    () => state.serviceTimeFrom,
    () => state.serviceTimeTo,
  ],
  () => {
    if (!state.autoRecalc) return
    if (isHourlyService.value) {
      recalcHourlyQuantity()
    }
    recalcPrices()
  },
  { immediate: true },
)

// Если автоперерасчёт включили — пересчитать сразу
watch(
  () => state.autoRecalc,
  val => {
    if (val) recalcPrices()
  },
)

const toast = useToast()
watch(
  [isHourlyService, () => state.serviceDate, () => state.serviceTimeFrom, () => state.serviceTimeTo],
  ([isHourly]) => {
    if (isHourly) {
      recalcHourlyQuantity()
      // сбрасываем конец, если стал недопустим
      if (state.serviceTimeFrom && state.serviceTimeTo) {
        const [fh, fm] = state.serviceTimeFrom.split(':').map(Number)
        const [th, tm] = state.serviceTimeTo.split(':').map(Number)
        const start = fh * 60 + fm
        const end = th * 60 + tm
        const fixedDuration = serviceDurationMinutes.value
        if (fixedDuration > 0) {
          if (Number.isNaN(start) || Number.isNaN(end) || end - start !== fixedDuration) {
            state.serviceTimeTo = ''
          }
          return
        }
        const minDuration = minServiceDurationMinutes.value || 1
        if (Number.isNaN(start) || Number.isNaN(end) || end - start < minDuration) {
          state.serviceTimeTo = ''
        }
      }
    }
  },
  { immediate: true },
)

watch(
  [isHourlyService, allowedServiceStartTimes, () => state.serviceTimeFrom],
  ([isHourly, allowed]) => {
    if (!isHourly) return
    if (!allowed.length) return
    if (state.serviceTimeFrom && !allowed.includes(state.serviceTimeFrom)) {
      state.serviceTimeFrom = ''
      state.serviceTimeTo = ''
    }
    if (serviceDurationMinutes.value > 0 && state.serviceTimeFrom) {
      const end = addMinutesToTime(state.serviceTimeFrom, serviceDurationMinutes.value)
      state.serviceTimeTo = end || ''
    }
  },
  { immediate: true },
)

watch(
  () => state.daysCount,
  () => {
    if (hasCustomDayCount.value) {
      recalcPrices()
    }
  },
)

watch(
  () => state.serviceDates.length,
  len => {
    if (isDailyService.value) {
      state.daysCount = len || 0
      recalcPrices()
    }
  },
)

watch(
  () => state.areaTypeId,
  id => {
    if (!selectedProduct.value?.quantityFactorArea) return
    const val = id ? dealAreaById[Number(id)] : undefined
    state.areaValue = Number.isFinite(val) ? String(val) : ''
    recalcPrices()
  },
)

watch(
  () => state.areaValue,
  () => {
    if (!selectedProduct.value?.quantityFactorArea) return
    if (!selectedAreaEditable.value) return
    recalcPrices()
  },
)
async function loadDetail() {
  if (!recordId) return

  detailLoading.value = true
  try {
    costUpdateGuard.value = true
    const response = await api.get(`/api/sp1040/view?id=${recordId}`)
    const detail = response.data ?? {}

    // Заполняем состояние, если поля пришли
    if (detail.product ?? detail.productId) {
      state.product = Number(detail.product ?? detail.productId)
    }
    if (detail.quantity !== undefined) state.quantity = Number(detail.quantity) || 1
    if (detail.discountValue !== undefined) state.discountValue = Number(detail.discountValue) || 0
    if (detail.discountType) state.discountType = detail.discountType
    if (detail.markupValue !== undefined) state.markupValue = Number(detail.markupValue) || 0
    if (detail.markupType) state.markupType = detail.markupType
    if (detail.currency) state.currency = detail.currency
    else if (detail.currencyId) {
      const code = currencyIdToCode[Number(detail.currencyId)]
      if (code) state.currency = code as Currency
    }
    if (detail.unit) state.unit = detail.unit
    if (detail.contractor) state.contractor = detail.contractor
    if (detail.comment) state.comment = detail.comment
    if (detail.finalPrice !== undefined) state.finalPrice = Number(detail.finalPrice) || 0
    if (detail.costPerUnit !== undefined) state.costPerUnit = String(detail.costPerUnit)
    if (detail.totalCost !== undefined) state.totalCost = String(detail.totalCost)
    if (detail.invoiceIssued !== undefined) state.invoiceIssued = Boolean(detail.invoiceIssued)
    if (detail.autoRecalc !== undefined) state.autoRecalc = Boolean(detail.autoRecalc)
    if (Array.isArray(detail.serviceDates)) state.serviceDates = detail.serviceDates.filter(Boolean)
    if (detail.serviceDate) state.serviceDate = normalizeDateString(detail.serviceDate)
    if (detail.serviceTimeFrom) state.serviceTimeFrom = normalizeTimeString(detail.serviceTimeFrom)
    if (detail.serviceTimeTo) state.serviceTimeTo = normalizeTimeString(detail.serviceTimeTo)

    recalcPrices()
  } catch (error) {
    console.warn('[load detail error]', error)
    toast.add({ title: 'Ошибка', description: 'Не удалось загрузить данные', color: 'air-primary-alert' })
  } finally {
    nextTick(() => {
      costUpdateGuard.value = false
    })
    detailLoading.value = false
  }
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const product = selectedProduct.value
  const currency = state.currency
  const unitPrice =
    currency === 'руб'
      ? product?.price_rub ?? 0
      : currency === 'usd'
        ? product?.price_usd ?? 0
        : product?.price_eur ?? 0
  const costPerUnit = Number(state.costPerUnit) || 0
  const requiresToApproval =
    (product as any)?.requiresToApproval ??
    (product as any)?.needToApprove ??
    (product as any)?.need_approval ??
    false
  const unitId = product?.unit?.id ?? null
  const contractorId = product?.contractor?.id ?? null
  const discountTitleToId = Object.fromEntries(discountTypeDirectory.map(i => [i.title, i.id]))
  const markupTitleToId = Object.fromEntries(markupTypeDirectory.map(i => [i.title, i.id]))
  const currencyIdFromCode = currencyCodeToId
  const discountTypeId = discountTitleToId[state.discountType] ?? null
  const markupTypeId = markupTitleToId[state.markupType] ?? null
  const currencyId = currencyIdFromCode[state.currency] ?? null
  const serviceDatesPayload = isDailyService.value ? state.serviceDates : null
  const serviceDateSingle = isHourlyService.value ? state.serviceDate : null
  const serviceTimeFromPayload = isHourlyService.value ? state.serviceTimeFrom : null
  const serviceTimeToPayload = isHourlyService.value ? state.serviceTimeTo : null
  const areaValueNumber = Number(state.areaValue || dealArea || 0) || 0
  if (product?.quantityFactorArea) {
    if (!state.areaTypeId) {
      toast.add({ title: 'Укажите тип площади', description: 'Выберите тип площади', color: 'air-primary-alert' })
      return
    }
    if (!areaValueNumber) {
      toast.add({ title: 'Не указана площадь', description: 'Заполните площадь для расчёта', color: 'air-primary-alert' })
      return
    }
  }
  const quantityRaw = Number(state.quantity) || 0
  const areaFactor = product?.quantityFactorArea ? (areaValueNumber || 1) : 1
  const daysFactor = hasCustomDayCount.value
    ? Number(state.daysCount) || 1
    : isDailyService.value
      ? state.daysCount || state.serviceDates.length || 0
      : 1
  const hoursFactor = isHourlyService.value ? (state.hoursCount || 0) : 1
  const quantityWithArea = quantityRaw * areaFactor * daysFactor * hoursFactor
  if (isDailyService.value) {
    if (!serviceDatesPayload || serviceDatesPayload.length === 0) {
      toast.add({ title: 'Укажите даты', description: 'Для посуточной услуги выберите даты', color: 'air-primary-alert' })
      return
    }
    if (allowedServiceDates.value.length) {
      const allAllowed = serviceDatesPayload?.every(d => allowedServiceDates.value.includes(d))
      if (!allAllowed) {
        toast.add({ title: 'Нельзя выбрать эту дату', description: 'Выберите дату из разрешённых', color: 'air-primary-alert' })
        return
      }
    }
  }
  if (isHourlyService.value) {
    if (!serviceDateSingle) {
      toast.add({ title: 'Укажите дату', description: 'Для почасовой услуги выберите дату', color: 'air-primary-alert' })
      return
    }
    if (allowedServiceDates.value.length && !allowedServiceDates.value.includes(serviceDateSingle)) {
      toast.add({ title: 'Нельзя выбрать эту дату', description: 'Выберите дату из разрешённых', color: 'air-primary-alert' })
      return
    }
    const from = state.serviceTimeFrom
    const to = state.serviceTimeTo
    if (!from || !to) {
      toast.add({ title: 'Укажите время', description: 'Нужно выбрать начало и окончание', color: 'air-primary-alert' })
      return
    }
    const [fh, fm] = from.split(':').map(Number)
    const [th, tm] = to.split(':').map(Number)
    if (Number.isNaN(fh) || Number.isNaN(fm) || Number.isNaN(th) || Number.isNaN(tm)) {
      toast.add({ title: 'Неверный формат времени', description: 'Проверьте время', color: 'air-primary-alert' })
      return
    }
    const start = fh * 60 + fm
    const end = th * 60 + tm
    if (end <= start) {
      toast.add({ title: 'Время некорректно', description: 'Окончание должно быть позже начала', color: 'air-primary-alert' })
      return
    }
    const fixedDuration = serviceDurationMinutes.value || 0
    if (fixedDuration > 0 && end - start !== fixedDuration) {
      toast.add({
        title: 'Неверная длительность',
        description: `Продолжительность должна быть ${fixedDuration} мин`,
        color: 'air-primary-alert',
      })
      return
    }
    const minDuration = minServiceDurationMinutes.value || 0
    if (minDuration > 0 && end - start < minDuration) {
      toast.add({
        title: 'Слишком короткая услуга',
        description: `Минимальная продолжительность ${minDuration} мин`,
        color: 'air-primary-alert',
      })
      return
    }
    state.hoursCount = Math.ceil((end - start) / 60)
  }

  const hasTimeFlag = isHourlyService.value
  const hasDaysFlag = isDailyService.value || hasCustomDayCount.value
  const hasAreaFlag = !!product?.quantityFactorArea

  const daysCountPayload = hasCustomDayCount.value
    ? Number(state.daysCount) || 1
    : isDailyService.value
      ? state.daysCount || state.serviceDates.length || 0
      : null
  const hoursCountPayload = isHourlyService.value ? state.hoursCount : null
  const areaTypeIdPayload = product?.quantityFactorArea ? state.areaTypeId ?? null : null
  const areaValuePayload = product?.quantityFactorArea ? areaValueNumber : null

  const payload = {
    ...event.data,
    productTypeId,
    dealTypeBuildingId,
    recordId: recordId ?? undefined,
    dealId: dealId ?? undefined,
    unitPrice,
    costPerUnit,
    requiresToApproval,
    // передаём id единицы измерения
    unitId: unitId ?? undefined,
    contractorId: contractorId ?? undefined,
    discountType: discountTypeId ?? undefined,
    discountTypeTitle: state.discountType,
    markupType: markupTypeId ?? undefined,
    markupTypeTitle: state.markupType,
    currencyId: currencyId ?? undefined,
    currency: state.currency,
    serviceDates: serviceDatesPayload,
    serviceDate: serviceDateSingle,
    serviceTimeFrom: serviceTimeFromPayload,
    serviceTimeTo: serviceTimeToPayload,
    quantityWithArea,
    areaTypeId: areaTypeIdPayload,
    areaValue: areaValuePayload,
    daysCount: daysCountPayload,
    hoursCount: hoursCountPayload,
    costSource: state.costSource, // 'unit' | 'total'
    hasTime: hasTimeFlag,
    hasDays: hasDaysFlag,
    hasArea: hasAreaFlag,
  }

  try {
    submitLoading.value = true

    if (isEdit.value && recordId) {
      await api.put(`/api/sp1222/update?id=${recordId}`, payload)
      toast.add({ title: 'Готово', description: 'Изменения сохранены', color: 'air-primary-success' })
    } else {
      await api.post('/api/sp1222/create', payload)
      toast.add({ title: 'Готово', description: 'Форма отправлена', color: 'air-primary-success' })
    }
  } catch (error) {
    console.warn('[form send error]', error)
    toast.add({ title: 'Ошибка', description: 'Ошибка при отправке', color: 'air-primary-alert' })
  } finally {
    submitLoading.value = false
  }
}
</script>

<style scoped>
.form-field-600px {
  width: 600px !important;
  min-width: 600px !important;
  max-width: 600px !important;
}
.form-flex-row {
  display: flex;
  flex-direction: row;
  gap: 10px;
}
.flex-align-bottom {
  align-items: flex-end;
}
:deep(.input-danger input) {
  border-color: #e53935 !important;
  color: #e53935 !important;
}
:deep(.input-danger .b24-select__trigger),
:deep(.input-danger .b24-select__inner),
:deep(.input-danger .b24-select__value) {
  border-color: #e53935 !important;
  color: #e53935 !important;
}
:deep(.b24-select__menu),
:deep(.b24-select__option),
:deep(.b24-select__option-label) {
  white-space: normal;
}
</style>

<template>
  <B24App>
    <B24Form
      :schema="schema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <!-- Товар -->
      <B24FormField label="Товар" name="product" required>
        <B24Select
          class="form-field-600px"
          :style="{ width: '600px' }"
          v-model="state.product"
          :items="productItems"
          value-key="value"
          label-key="label"
          placeholder="Выберите товар"
          :b24ui="{
            base: 'text-base-760 hover:ring-1 hover:ring-inset hover:ring-blue-500 dark:hover:ring-blue-600 data-[state=open]:ring-1 data-[state=open]:ring-inset data-[state=open]:ring-blue-500 dark:data-[state=open]:ring-blue-600',
            trailingIcon: 'text-base-760 size-lg',
            content: 'rounded-[18px] min-w-[590px] shadow-lg ring-0 border-0',
            viewport: 'relative scroll-py-1 w-[590px] max-h-[40vh] overflow-x-hidden overflow-y-auto scrollbar-thin ring-0 border-0',
            group: 'p-0 my-[2px] -mx-1 w-full !max-w-none',
            item: 'ps-[16px] pe-[16px] py-2 whitespace-normal min-w-[590px] break-all overflow-visible text-ellipsis line-clamp-3 hover:line-clamp-none min-h-[24px] items-start gap-1',
            itemTrailingIcon: 'hidden',
          }"
        >
          <template #content-top>
            <div class="px-3 pt-3 pb-1">
              <B24Input
                v-model="productSearch"
                type="search"
                placeholder="Поиск товара..."
                size="sm"
                class="w-full"
                autofocus
                @keydown.stop
                @click.stop
              />
            </div>
          </template>
          <template #item-label="{ item }">
            <template v-if="item">
              <div class="flex flex-col gap-1">
                <span class="font-medium">{{ (item as ProductItem).label }}</span>
              </div>
            </template>
          </template>
          <template #content-bottom>
            <div v-if="!productItems.length" class="px-3 pb-2 text-sm text-slate-600">Ничего не найдено</div>
          </template>
        </B24Select>
      </B24FormField>
      <!-- Даты предоставления услуги (посуточно) -->
      <template v-if="isDailyService">
        <div class="form-field-600px form-flex-row flex-align-bottom" style="gap: 12px;">
          <B24FormField label="Даты" name="serviceDates" required style="flex:1;">
            <B24Select
              v-model="state.serviceDates"
              :items="serviceDateOptions"
              value-key="value"
              label-key="label"
              multiple
              placeholder="Выберите даты"
              :style="{ width: '400px' }"
              :b24ui="{
                base: 'text-base-760 hover:ring-1 hover:ring-inset hover:ring-blue-500 dark:hover:ring-blue-600 data-[state=open]:ring-1 data-[state=open]:ring-inset data-[state=open]:ring-blue-500 dark:data-[state=open]:ring-blue-600',
                trailingIcon: 'text-base-760 size-lg',
                content: 'rounded-[18px] min-w-[390px] shadow-lg ring-0 border-0',
                viewport: 'relative scroll-py-1 w-[390px] max-h-[40vh] overflow-x-hidden overflow-y-auto scrollbar-thin ring-0 border-0',
                group: 'p-0 my-[2px] -mx-1 w-full !max-w-none',
                item: 'ps-[16px] pe-[16px] py-2 whitespace-normal min-w-[590px] break-all overflow-visible text-ellipsis line-clamp-3 hover:line-clamp-none min-h-[24px] items-start gap-1',
                itemTrailingIcon: 'hidden',
              }"
            />
            <div v-if="!serviceDateOptions.length" class="text-sm text-slate-600">Нет доступных дат</div>
          </B24FormField>
          <B24FormField label="Количество дней" name="daysCount" style="width: 190px;">
            <B24Input
              type="number"
              min="1"
              v-model="state.daysCount"
              placeholder="1"
              :disabled="isDaysFieldReadOnly"
            />
          </B24FormField>
        </div>
      </template>
      <!-- Даты/время для почасовой услуги -->
      <template v-else-if="isHourlyService">
        <div class="form-field-600px form-flex-row flex-align-bottom" style="gap: 10px;">
          <B24FormField label="Дата" name="serviceDateSingle" style="flex:1;">
            <B24Select
              v-model="state.serviceDate"
              :items="serviceDateOptions"
              value-key="value"
              label-key="label"
              placeholder="Выберите дату"
              :style="{ width: '150px' }"

            />
          </B24FormField>
          <B24FormField label="Время начала" name="serviceTimeFrom" style="width: 150px;">
            <B24Select
              v-model="state.serviceTimeFrom"
              :items="timeOptionsStart"
              value-key="value"
              label-key="label"
              placeholder="Выберите время"
              :style="{ width: '150px' }"
            />
          </B24FormField>
          <B24FormField label="Время окончания" name="serviceTimeTo" style="width: 150px;">
            <B24Select
              v-model="state.serviceTimeTo"
              :items="timeOptionsEnd"
              value-key="value"
              label-key="label"
              placeholder="Выберите время"
              :style="{ width: '150px' }"
              :disabled="serviceDurationMinutes > 0"
            />
          </B24FormField>
          <B24FormField label="Количество часов" name="hoursCount" style="width: 150px;">
            <B24Input :model-value="state.hoursCount" disabled placeholder="0" />
          </B24FormField>
        </div>
        <div v-if="!serviceDateOptions.length" class="text-sm text-slate-600">Нет доступных дат</div>
        <div v-if="minServiceDurationMinutes > 0" class="text-sm text-slate-600">
          Минимальная продолжительность: {{ minServiceDurationMinutes }} мин
        </div>
        
      </template>
      <template v-if="selectedProduct?.quantityFactorArea">
        <div class="form-field-600px form-flex-row flex-align-bottom" style="gap: 12px; margin-top: 10px;">
          <B24FormField label="Тип площади" name="areaTypeHourly" style="width: 400px;">
            <B24Select
              v-model="state.areaTypeId"
              :items="enabledAreaTypeOptions"
              value-key="value"
              label-key="label"
              placeholder="Выберите тип площади"
              class="w-full"
              :style="{ width: '400px' }"
              required
              :b24ui="{
                base: 'text-base-760 hover:ring-1 hover:ring-inset hover:ring-blue-500 dark:hover:ring-blue-600 data-[state=open]:ring-1 data-[state=open]:ring-inset data-[state=open]:ring-blue-500 dark:data-[state=open]:ring-blue-600',
                trailingIcon: 'text-base-760 size-lg',
                content: 'rounded-[18px] min-w-[390px] shadow-lg ring-0 border-0',
                viewport: 'relative scroll-py-1 w-[390px] max-h-[40vh] overflow-x-hidden overflow-y-auto scrollbar-thin ring-0 border-0',
                group: 'p-0 my-[2px] -mx-1 w-full !max-w-none',
                item: 'ps-[16px] pe-[16px] py-2 whitespace-normal min-w-[590px] break-all overflow-visible text-ellipsis line-clamp-3 hover:line-clamp-none min-h-[24px] items-start gap-1',
                itemTrailingIcon: 'hidden',
              }"
            />
          </B24FormField>
          <B24FormField label="Площадь" name="dealAreaHourly" style="width: 190px;">
            <B24Input
              v-model="state.areaValue"
              :disabled="!selectedAreaEditable"
              type="number"
              min="0"
              step="0.01"
              placeholder="-"
            />
          </B24FormField>
        </div>
        </template>



      <div class="form-field-600px form-flex-row flex-align-bottom" v-if="showTotalQuantity">
        <B24FormField label="Количество" name="quantity" required style="flex:1;">
          <B24Input
            type="number"
            min="1"
            v-model="state.quantity"
            placeholder="1"
            @blur="onQuantityBlur"
          />
        </B24FormField>
        <B24FormField label="Количество итого" name="totalQuantity" style="flex:1;">
          <B24Input :model-value="state.totalQuantity" disabled placeholder="0" />
        </B24FormField>
        <B24FormField label="Ед. измерения" name="unit" style="flex:1;">
          <B24Input v-model="state.unit" disabled placeholder="Авто из товара" />
        </B24FormField>
      </div>
      <div class="form-field-600px form-flex-row flex-align-bottom" v-else>
        <B24FormField label="Количество" name="quantity" required style="flex:1;">
          <B24Input
            type="number"
            min="1"
            v-model="state.quantity"
            placeholder="1"
            style="width: 400px"
            @blur="onQuantityBlur"
          />
        </B24FormField>
        <B24FormField label="Ед. измерения" name="unit" style="flex:1;">
          <B24Input v-model="state.unit" disabled placeholder="Авто из товара" />
        </B24FormField>
      </div>      
      <!-- Скидка и тип скидки: выравнивание по нижнему краю -->
      <div class="form-field-600px form-flex-row flex-align-bottom">
        <B24FormField label="Скидка" name="discountValue" required>
          <B24Input
            type="number"
            min="0"
            :max="state.discountType === '%' ? 100 : undefined"
            v-model="state.discountValue"
            placeholder="0"
            style="width:400px"
          />
        </B24FormField>
        <div style="width: 190px;">
          <B24Select
            v-model="state.discountType"
            :items="discountTypes.map(t => ({ value: t, label: t }))"
            :style="{ width: '190px' }"
            :b24ui="{
              content: 'max-w-[185px]',
              viewport: 'max-w-[185px]',
              item: 'max-w-[185px]',
            }"
          />
        </div>
      </div>
      <!-- Наценка и тип наценки: выравнивание по нижнему краю -->
      <div class="form-field-600px form-flex-row flex-align-bottom">
        <B24FormField label="Наценка" name="markupValue" required>
          <B24Input type="number" min="0" v-model="state.markupValue" placeholder="0" style="width:400px" />
        </B24FormField>
        <div style="width: 190px;">
          <B24Select 
          v-model="state.markupType" 
          :items="markupTypes.map(t => ({ value: t, label: t }))" 
          :style="{width: '190px'}" 
          :b24ui="{
              content: 'max-w-[185px]',
              viewport: 'max-w-[185px]',
              item: 'max-w-[185px]',
            }"
          />
        </div>
      </div>
      <div class="form-field-600px form-flex-row flex-align-bottom">
        <!-- Стоимость итоговая -->
        <B24FormField label="Стоимость ед. базовая" name="baseUnitPrice">
          <B24Input 
          :model-value="state.baseUnitPrice" 
          disabled 
          placeholder="0" 
          style="width:140px"
          />
        </B24FormField>
        <B24FormField label="Стоимость ед." name="finalUnitPrice">
          <B24Input 
          :model-value="state.finalUnitPrice" 
          disabled 
          placeholder="0" 
          style="width:140px"
          />
        </B24FormField>
        <B24FormField label="Стоимость итог" name="finalPrice">
          <B24Input
            :class="isFinalOverCost ? 'input-danger' : ''"
            v-model="state.finalPrice"
            disabled
            placeholder="0"
            style="width:140px"
          />
        </B24FormField>
          <B24FormField label="Валюта" name="currency" required>
            <B24Select
              v-model="state.currency"
              :items="currencyOptions"
              :class="isCurrencyMismatch ? 'input-danger' : ''"
              :style="{width:'150px'}"
              :b24ui="{
              content: 'max-w-[145px]',
              viewport: 'max-w-[145px]',
              item: 'max-w-[145px]',
            }"
            />
          </B24FormField>
      </div>
      <div class="form-field-600px form-flex-row flex-align-bottom">
        <!-- Себестоимость ед. -->
        <B24FormField :label="costPerUnitLabel" name="costPerUnit">
          <B24Input
            class="form-field-300px"
            v-model="state.costPerUnit"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            @input="onCostPerUnitInput"
          />
        </B24FormField>
        <!-- Себестоимость -->
        <B24FormField :label="totalCostLabel" name="totalCost">
          <B24Input
            class="form-field-300px"
            v-model="state.totalCost"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            @input="onTotalCostInput"
          />
        </B24FormField>
        <B24FormField label="Валюта" name="costCurrency">
          <B24Input class="form-field-300px" v-model="state.costCurrency" disabled placeholder="-" />
        </B24FormField>
      </div>
      
      <!-- Автоперерасчёт -->
      <B24FormField label="Автоматический перерасчёт" name="autoRecalc">
        <B24Checkbox class="form-field-600px" v-model="state.autoRecalc" />
      </B24FormField>
      <!-- Был выставлен счет -->
      <B24FormField label="Был выставлен счет" name="invoiceIssued">
        <B24Checkbox class="form-field-600px" v-model="state.invoiceIssued" />
      </B24FormField>
      <!-- Подрядчик -->
      <B24FormField label="Подрядчик" name="contractor">
        <B24Input class="form-field-600px" v-model="state.contractor" disabled placeholder="-" />
      </B24FormField>
      <!-- Комментарий -->
      <B24FormField label="Комментарий" name="comment">
        <B24Textarea class="form-field-600px" v-model="state.comment" placeholder="Комментарий по заказу..." />
      </B24FormField>
      <B24Button class="form-field-600px" color="air-primary" type="submit" :loading="submitLoading">
        {{ isEdit ? 'Сохранить изменения' : 'Создать' }}
      </B24Button>
    </B24Form>
  </B24App>
</template>
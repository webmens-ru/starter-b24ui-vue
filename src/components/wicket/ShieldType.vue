<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

declare const window: Window & { _HOSTNAME_: string }
import { useCalculation } from '../../composables/useCalculation'
import { getColorShield, getNetWidths, getNetsByWidth, saveWicketData, recalculate } from '../../app/api/wicket'
import type { ColorShieldItem } from '../../app/api/wicket'

interface GrilleNetItem {
  id: number
  model: string
  imageUrl: string | null
  sizeA: number
  sizeB: number
  thickness: number
  price: number
}

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"%3E%3Crect fill="%23e5e7eb" width="120" height="120"/%3E%3Ctext x="60" y="65" text-anchor="middle" fill="%239ca3af" font-size="12" font-family="sans-serif"%3ENет фото%3C/text%3E%3C/svg%3E'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

// ─── Модальное окно ───────────────────────────────────────────────────────────
const showModal  = ref(false)
const modalTitle = ref('Внимание')
const modalMsg   = ref('')

function openModal(msg: string, title = 'Внимание') {
  modalTitle.value = title
  modalMsg.value   = msg
  showModal.value  = true
}

// ─── Цвет рамы ────────────────────────────────────────────────────────────────
const colorOptions    = ref<ColorShieldItem[]>([])
const colorShieldId = ref<string | number>('')

// ─── Тип щита ────────────────────────────────────────────────────────────────
const shieldType = ref<string>('Тип_1')

const TYPES_WITH_HEIGHT_TOP   = ['Тип_3']
const TYPES_WITH_HEIGHT_LOWER = ['Тип_2', 'Тип_3']
const TYPES_WITH_SIDE_PART    = ['Тип_4']

const providerOptions = [
  { value: 'executor', label: 'Предоставляет исполнитель' },
  { value: 'customer', label: 'Предоставляет заказчик' },
  { value: '', label: 'Оставляем не заполненным' },
]

const grilleLocationOptions = [
  { value: 'Возле петель', label: 'Возле петель' },
  { value: 'Возле замка', label: 'Возле замка' },
]

// Локальные refs для переключателя (надёжная реактивность в шаблоне)
const providerTop   = ref<string>('executor')
const providerLower = ref<string>('executor')
const providerSide  = ref<string>('executor')

const showHeightTop   = computed(() => TYPES_WITH_HEIGHT_TOP.includes(shieldType.value))
const showHeightLower = computed(() => TYPES_WITH_HEIGHT_LOWER.includes(shieldType.value))
const showSidePart    = computed(() => TYPES_WITH_SIDE_PART.includes(shieldType.value))

const isExecutorTop   = computed(() => providerTop.value === 'executor')
const isExecutorLower = computed(() => providerLower.value === 'executor')
const isExecutorSide  = computed(() => providerSide.value === 'executor')
const showInputTop    = computed(() => !isExecutorTop.value)
const showInputLower  = computed(() => !isExecutorLower.value)
const showInputSide   = computed(() => !isExecutorSide.value)

// Переключатель «кто предоставляет ширину сетки» — используем refs из calc
const netWidthOptions = ref<{ id: string; name: string }[]>([])

// ─── Размеры ─────────────────────────────────────────────────────────────────
const heightTopPart   = ref<string>('')  // select
const heightLowerPart = ref<string>('')  // select
const widthSidePart   = ref<string>('')  // select
const grilleLocation   = ref<string>('Возле петель')

const grilleNetItems         = ref<GrilleNetItem[]>([])
const assortmentSideGrilleNetId = ref<number | null>(null)
const errGrilleNet            = ref(false)
const heightLowerNetItems     = ref<GrilleNetItem[]>([])
const assortmentHeightLowerNetId = ref<number | null>(null)
const errHeightLowerNet       = ref(false)
const heightUpperNetItems     = ref<GrilleNetItem[]>([])
const assortmentHeightUpperNetId = ref<number | null>(null)
const errHeightUpperNet       = ref(false)

// ─── Ошибки валидации ────────────────────────────────────────────────────────
const errHeightTop   = ref(false)
const errHeightLower = ref(false)
const errWidthSide   = ref(false)

// ─── Изображения щитов ───────────────────────────────────────────────────────
// g - горизонтально, v - вертикально; right→g, left→v
const panelOrientation = computed(() => {
  const id = calc.openingOptionId.value
  return id === 1 || id === 4 ? 'g' : 'v'
})

/** База URL для схем щита: /img/wicket/type{N}/… (N — modelId калитки). */
const shieldImgBase = computed(() => {
  const hostRaw = typeof window !== 'undefined' ? window._HOSTNAME_ : ''
  const host = hostRaw ? String(hostRaw).replace(/\/$/, '') : 'https://test-lk.doorhan-krd.ru'
  const folder = `type${String(calc.modelId.value || '1')}`
  return `${host}/img/wicket/${folder}`
})

const shieldOptions = computed(() => {
  const orient = panelOrientation.value
  const base = shieldImgBase.value
  // z - замок, p - петля (только для Тип_4)
  const type4Suffix = grilleLocation.value === 'Возле замка' ? 'z' : 'p'
  return [
    { value: 'Тип_1', label: 'Тип 1', img: `${base}/w_${orient}_1.1.png` },
    { value: 'Тип_2', label: 'Тип 2', img: `${base}/w_${orient}_1.2.png` },
    { value: 'Тип_3', label: 'Тип 3', img: `${base}/w_${orient}_1.3.png` },
    { value: 'Тип_4', label: 'Тип 4', img: `${base}/w_${orient}_1.4_${type4Suffix}.png` },
  ]
})

// Группировка: Стандартная краска / Не стандартная (для B24SelectMenu)
// id приводим к string — B24SelectMenu сравнивает по value-key строго, colorShieldId хранится как string
const colorSelectItems = computed(() => {
  const standard = colorOptions.value.filter(i => (i.isStandard ?? 1) === 1)
  const custom   = colorOptions.value.filter(i => (i.isStandard ?? 1) === 0)
  const rows: Array<{ type?: 'label' | 'separator'; label?: string; id?: string | number }> = []
  if (standard.length) {
    rows.push({ type: 'label', label: 'Стандартная краска' })
    rows.push(...standard.map(i => ({ id: String(i.id), label: i.name })))
  }
  if (custom.length) {
    if (rows.length) rows.push({ type: 'separator' })
    rows.push({ type: 'label', label: 'Не стандартная краска' })
    rows.push(...custom.map(i => ({ id: String(i.id), label: i.name })))
  }
  return rows
})

// ─── Загрузка цветов ─────────────────────────────────────────────────────────
async function loadColorShield() {
  try {
    const res = await getColorShield(calc.modelId.value)
    colorOptions.value = res.colorShield
    if (!colorShieldId.value && colorOptions.value.length) {
      colorShieldId.value = String(colorOptions.value[0].id)
    }
  } catch (e) {
    console.warn('getColorShield:', e)
    openModal('Не удалось загрузить данные для выпадающего списка color-shield.')
  }
}

// ─── Загрузка ширины сетки ───────────────────────────────────────────────────
async function loadNetWidths() {
  try {
    const res = await getNetWidths()
    netWidthOptions.value = res.netWidths
  } catch (e) {
    console.warn('getNetWidths:', e)
    openModal('Не удалось загрузить список ширины сетки.')
  }
}

// ─── Загрузка сеток по ширине (для карточек выбора) ───────────────────────────
async function loadGrilleNetsByWidth(width: string) {
  if (!width || Number(width) <= 0) {
    grilleNetItems.value = []
    assortmentSideGrilleNetId.value = null
    return
  }
  try {
    const res = await getNetsByWidth(width)
    grilleNetItems.value = res.items
    assortmentSideGrilleNetId.value = null
  } catch (e) {
    console.warn('getNetsByWidth:', e)
    grilleNetItems.value = []
    assortmentSideGrilleNetId.value = null
  }
}

function onWidthSidePartChange(val: string | number) {
  widthSidePart.value = String(val ?? '')
  loadGrilleNetsByWidth(widthSidePart.value).then(() => debouncedSave())
}

function onGrilleNetSelect(net: GrilleNetItem) {
  assortmentSideGrilleNetId.value = net.id
  errGrilleNet.value = false
  debouncedSave()
}

async function loadHeightLowerNetsBySize(size: string) {
  if (!size || Number(size) <= 0) {
    heightLowerNetItems.value = []
    assortmentHeightLowerNetId.value = null
    return
  }
  try {
    const res = await getNetsByWidth(size)
    heightLowerNetItems.value = res.items
    assortmentHeightLowerNetId.value = null
  } catch (e) {
    console.warn('getNetsByWidth (height_lower):', e)
    heightLowerNetItems.value = []
    assortmentHeightLowerNetId.value = null
  }
}

async function loadHeightUpperNetsBySize(size: string) {
  if (!size || Number(size) <= 0) {
    heightUpperNetItems.value = []
    assortmentHeightUpperNetId.value = null
    return
  }
  try {
    const res = await getNetsByWidth(size)
    heightUpperNetItems.value = res.items
    assortmentHeightUpperNetId.value = null
  } catch (e) {
    console.warn('getNetsByWidth (height_upper):', e)
    heightUpperNetItems.value = []
    assortmentHeightUpperNetId.value = null
  }
}

function onHeightTopPartChange(val: string | number) {
  heightTopPart.value = String(val ?? '')
  loadHeightUpperNetsBySize(heightTopPart.value).then(() => debouncedSave())
}

function onHeightLowerPartChange(val: string | number) {
  heightLowerPart.value = String(val ?? '')
  loadHeightLowerNetsBySize(heightLowerPart.value).then(() => debouncedSave())
}

function onHeightLowerNetSelect(net: GrilleNetItem) {
  assortmentHeightLowerNetId.value = net.id
  errHeightLowerNet.value = false
  debouncedSave()
}

function onHeightUpperNetSelect(net: GrilleNetItem) {
  assortmentHeightUpperNetId.value = net.id
  errHeightUpperNet.value = false
  debouncedSave()
}

// ─── Debounce ────────────────────────────────────────────────────────────────
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSave() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => save(), 500)
}

function onProviderTopChange() {
  if (providerTop.value === '') {
    heightTopPart.value = ''
    heightUpperNetItems.value = []
    assortmentHeightUpperNetId.value = null
  } else if (providerTop.value === 'customer') {
    assortmentHeightUpperNetId.value = null
    heightUpperNetItems.value = []
  } else if (providerTop.value === 'executor') {
    heightTopPart.value = ''
    heightUpperNetItems.value = []
    assortmentHeightUpperNetId.value = null
  }
  errHeightTop.value = false
  errHeightUpperNet.value = false
  debouncedSave()
}

function onProviderLowerChange() {
  if (providerLower.value === '') {
    heightLowerPart.value = ''
    heightLowerNetItems.value = []
    assortmentHeightLowerNetId.value = null
  } else if (providerLower.value === 'customer') {
    assortmentHeightLowerNetId.value = null
    heightLowerNetItems.value = []
  } else if (providerLower.value === 'executor') {
    heightLowerPart.value = ''
    heightLowerNetItems.value = []
    assortmentHeightLowerNetId.value = null
  }
  errHeightLower.value = false
  errHeightLowerNet.value = false
  debouncedSave()
}

function onProviderSideChange() {
  if (providerSide.value === '') {
    widthSidePart.value = ''
    grilleNetItems.value = []
    assortmentSideGrilleNetId.value = null
  } else if (providerSide.value === 'customer') {
    assortmentSideGrilleNetId.value = null
    grilleNetItems.value = []
  } else if (providerSide.value === 'executor') {
    widthSidePart.value = ''
    grilleNetItems.value = []
    assortmentSideGrilleNetId.value = null
  }
  errWidthSide.value = false
  errGrilleNet.value = false
  debouncedSave()
}

// ─── Обработчики ─────────────────────────────────────────────────────────────
async function onShieldTypeChange() {
  if (!showHeightTop.value) {
    heightTopPart.value = ''
    heightUpperNetItems.value = []
    assortmentHeightUpperNetId.value = null
  }
  if (!showHeightLower.value) {
    heightLowerPart.value = ''
    heightLowerNetItems.value = []
    assortmentHeightLowerNetId.value = null
  }
  if (!showSidePart.value) {
    widthSidePart.value  = ''
    grilleNetItems.value   = []
    assortmentSideGrilleNetId.value = null
    grilleLocation.value  = 'Возле петель'
  }
  errHeightTop.value       = false
  errHeightUpperNet.value  = false
  errGrilleNet.value       = false
  errHeightLowerNet.value  = false
  errHeightLower.value     = false
  errWidthSide.value   = false
  await save()
}

function onColorChange() {
  save().then(() => {
    const sid = String(colorShieldId.value ?? '')
    const name = colorOptions.value.find(i => String(i.id) === sid)?.name ?? ''
    openModal(`Внесены изменения: Цвет рамы '${name}'`, 'Изменения сохранены')
  })
}

// ─── Синхронизация + сохранение ──────────────────────────────────────────────
function syncCalcFields() {
  calc.shieldType.value       = shieldType.value
  calc.colorShieldId.value   = String(colorShieldId.value ?? '')
  const colorItem = colorOptions.value.find(i => String(i.id) === String(colorShieldId.value))
  calc.colorShieldName.value = colorItem?.name ?? ''
  calc.colorShieldHex.value  = colorItem?.hex ?? ''
  calc.heightTopPart.value   = heightTopPart.value
  calc.heightLowerPart.value = heightLowerPart.value
  calc.widthSidePart.value   = widthSidePart.value
  if (showHeightLower.value) {
    calc.assortmentHeightLowerNetId.value = assortmentHeightLowerNetId.value
    calc.assortmentSideGrilleNetId.value = null
  } else {
    calc.assortmentHeightLowerNetId.value = null
    if (showSidePart.value) {
      calc.assortmentSideGrilleNetId.value = assortmentSideGrilleNetId.value
    } else {
      calc.assortmentSideGrilleNetId.value = null
    }
  }
  calc.assortmentHeightUpperNetId.value = showHeightTop.value ? assortmentHeightUpperNetId.value : null
  calc.grilleLocation.value = grilleLocation.value
  calc.netWidthProviderTop.value = providerTop.value
  calc.netWidthProviderLower.value = providerLower.value
  calc.netWidthProviderSide.value = providerSide.value
}

function buildBlock() {
  const params: { name: string; value: string }[] = [
    { name: 'Тип щита', value: calc.shieldType.value },
  ]
  if (calc.colorShieldName.value) {
    params.push({ name: 'Цвет рамы', value: calc.colorShieldName.value })
  }
  const provTop = providerTop.value
  const topVal = calc.heightTopPart.value
  if (showHeightTop.value && provTop !== '' && topVal && topVal !== '0' && Number(topVal) > 0) {
    params.push({ name: 'Высота верхней части', value: topVal })
    if (provTop === 'executor') {
      const selUpperNet = heightUpperNetItems.value.find(n => n.id === assortmentHeightUpperNetId.value)
      if (selUpperNet) params.push({ name: 'Сетка верхней части', value: selUpperNet.model })
    }
  }
  const provLower = providerLower.value
  const lowerVal = calc.heightLowerPart.value
  if (showHeightLower.value && provLower !== '' && lowerVal && lowerVal !== '0' && Number(lowerVal) > 0) {
    params.push({ name: 'Высота нижней части', value: lowerVal })
    if (provLower === 'executor') {
      const selLowerNet = heightLowerNetItems.value.find(n => n.id === assortmentHeightLowerNetId.value)
      if (selLowerNet) params.push({ name: 'Сетка нижней части', value: selLowerNet.model })
    }
  }
  const provSide = providerSide.value
  const sideVal = calc.widthSidePart.value
  if (showSidePart.value && provSide !== '' && sideVal && sideVal !== '0' && Number(sideVal) > 0) {
    params.push({ name: 'Ширина боковой части', value: sideVal })
    if (provSide === 'executor') {
      const selNet = grilleNetItems.value.find(n => n.id === assortmentSideGrilleNetId.value)
      if (selNet) params.push({ name: 'Сетка боковой решётки', value: selNet.model })
    }
  }
  if (showSidePart.value && calc.grilleLocation.value) {
    params.push({ name: 'Расположение решётки', value: calc.grilleLocation.value })
  }
  calc.updateOrCreateBlock('Тип щита', params)
}

async function save() {
  syncCalcFields()
  buildBlock()

  const provTop = providerTop.value
  const provLower = providerLower.value
  const provSide = providerSide.value

  const topVal = showHeightTop.value ? (calc.heightTopPart.value || '0') : '0'
  const lowerVal = showHeightLower.value ? (calc.heightLowerPart.value || '0') : '0'
  const sideVal = showSidePart.value ? (calc.widthSidePart.value || '0') : '0'

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      shieldType:        calc.shieldType.value,
      colorShieldName:  calc.colorShieldName.value,
      colorShieldId:    calc.colorShieldId.value,
      heightTopPart:    topVal,
      heightLowerPart:  lowerVal,
      widthSidePart:    sideVal,
      netWidthProviderTop:  showHeightTop.value ? provTop : undefined,
      netWidthProviderLower: showHeightLower.value ? provLower : undefined,
      netWidthProviderSide:  showSidePart.value ? provSide : undefined,
      assortmentHeightLowerNetId: showHeightLower.value && provLower === 'executor' ? (assortmentHeightLowerNetId.value ?? undefined) : undefined,
      assortmentSideGrilleNetId: showSidePart.value && provSide === 'executor' ? (assortmentSideGrilleNetId.value ?? undefined) : undefined,
      assortmentHeightUpperNetId: showHeightTop.value && provTop === 'executor' ? (assortmentHeightUpperNetId.value ?? undefined) : undefined,
      grilleLocation:         calc.grilleLocation.value,
    })
  } catch (e) {
    console.warn('saveWicketData:', e)
  }

  if (calc.priceRetail.value) {
    try {
      const result = await recalculate({
        orderId: Number(calc.number.value),
        productType:       calc.productType.value,
        model:              calc.model.value,
        modelId:           calc.modelId.value,
      })
      calc.updatePriceBlock(result.priceDealer, result.priceRetail)
    } catch (e) {
      console.warn('recalculate:', e)
    }
  }
}

// ─── Валидация ───────────────────────────────────────────────────────────────
function validate(): boolean {
  errHeightTop.value   = false
  errHeightLower.value = false
  errWidthSide.value   = false

  const msgs: string[] = []
  const provTop = providerTop.value
  const provLower = providerLower.value
  const provSide = providerSide.value

  if (showHeightTop.value) {
    const v = heightTopPart.value
    if (!v || v === '0' || Number(v) <= 0) {
      errHeightTop.value = true
      msgs.push('Выберите значение больше 0: Высота верхней части')
    } else {
      errHeightTop.value = false
      if (provTop === 'executor' && !assortmentHeightUpperNetId.value) {
        errHeightUpperNet.value = true
        msgs.push('Выберите конкретную сетку верхней части')
      } else {
        errHeightUpperNet.value = false
      }
    }
  }
  if (showHeightLower.value) {
    const v = heightLowerPart.value
    if (!v || v === '0' || Number(v) <= 0) {
      errHeightLower.value = true
      msgs.push('Выберите значение больше 0: Высота нижней части')
    } else {
      errHeightLower.value = false
      if (provLower === 'executor' && !assortmentHeightLowerNetId.value) {
        errHeightLowerNet.value = true
        msgs.push('Выберите конкретную сетку нижней части')
      } else {
        errHeightLowerNet.value = false
      }
    }
  }
  if (showSidePart.value) {
    const v = widthSidePart.value
    if (!v || v === '0' || Number(v) <= 0) {
      errWidthSide.value = true
      msgs.push('Выберите значение больше 0: Ширина боковой решётки')
    } else {
      errWidthSide.value = false
      if (provSide === 'executor' && !assortmentSideGrilleNetId.value) {
        errGrilleNet.value = true
        msgs.push('Выберите конкретную сетку боковой решётки')
      } else {
        errGrilleNet.value = false
      }
    }
  }

  if (msgs.length) {
    openModal(msgs.join('\n'))
    return false
  }
  return true
}

function handleNext() {
  if (!validate()) return
  emit('next')
}

// ─── Монтирование ────────────────────────────────────────────────────────────
onMounted(async () => {
  calc.setActivePage('page3')

  // Восстанавливаем сохранённые значения
  if (calc.shieldType.value)       shieldType.value       = calc.shieldType.value
  // Инициализация provider из calc (при загрузке сохранённых данных)
  const savedProvTop = calc.netWidthProviderTop.value
  const savedProvLower = calc.netWidthProviderLower.value
  const savedProvSide = calc.netWidthProviderSide.value
  providerTop.value = savedProvTop === 'customer' || savedProvTop === 'executor' ? savedProvTop : 'executor'
  providerLower.value = savedProvLower === 'customer' || savedProvLower === 'executor' ? savedProvLower : 'executor'
  providerSide.value = savedProvSide === 'customer' || savedProvSide === 'executor' ? savedProvSide : 'executor'
  const savedTop = calc.heightTopPart.value
  if (savedTop && savedTop !== '0' && Number(savedTop) > 0) {
    heightTopPart.value = String(savedTop)
  }
  const savedLower = calc.heightLowerPart.value
  if (savedLower && savedLower !== '0' && Number(savedLower) > 0) {
    heightLowerPart.value = String(savedLower)
  }
  const savedSide = calc.widthSidePart.value
  if (savedSide && savedSide !== '0' && Number(savedSide) > 0) {
    widthSidePart.value = String(savedSide)
  }
  if (calc.grilleLocation.value)   grilleLocation.value   = calc.grilleLocation.value

  await loadColorShield()
  await loadNetWidths()
  if (widthSidePart.value) await loadGrilleNetsByWidth(widthSidePart.value)
  if (heightLowerPart.value) await loadHeightLowerNetsBySize(heightLowerPart.value)
  if (heightTopPart.value) await loadHeightUpperNetsBySize(heightTopPart.value)
  // Восстанавливаем выбор сеток после загрузки (loadXXX сбрасывает selection)
  if (showHeightLower.value) {
    const lowerId = calc.assortmentHeightLowerNetId.value ?? calc.assortmentSideGrilleNetId.value
    if (lowerId) assortmentHeightLowerNetId.value = Number(lowerId)
  } else if (showSidePart.value && calc.assortmentSideGrilleNetId.value) {
    assortmentSideGrilleNetId.value = Number(calc.assortmentSideGrilleNetId.value)
  }
  if (calc.assortmentHeightUpperNetId.value && showHeightTop.value) {
    assortmentHeightUpperNetId.value = Number(calc.assortmentHeightUpperNetId.value)
  }

  if (calc.colorShieldId.value) {
    colorShieldId.value = String(calc.colorShieldId.value)
  }

  await save()
})
</script>

<template>
  <div class="flex flex-col gap-4">

    <B24Modal
      v-model:open="showModal"
      :title="modalTitle"
      :description="modalMsg"
    >
      <template #footer="{ close }">
        <B24Button color="air-primary" @click="close">Понятно</B24Button>
      </template>
    </B24Modal>

    <!-- Заголовок + кнопки -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Щит</span>
      <B24Button label="Далее" color="air-secondary" @click="handleNext" />
    </div>

    <div class="flex flex-col gap-5 px-1">

      <!-- Цвет рамы -->
      <div class="flex flex-col gap-2">
        <span class="font-bold text-base whitespace-nowrap">Цвет рамы:</span>
        <div class="select-full-width">
          <B24SelectMenu
            v-model="colorShieldId"
            value-key="id"
            :items="colorSelectItems"
            placeholder="Выберите цвет"
            class="w-full"
            :b24ui="{ content: 'min-w-fit max-w-[90vw]', viewport: 'min-w-fit', item: 'whitespace-normal' }"
            @update:model-value="onColorChange"
          />
        </div>
      </div>

      <!-- Типы щита -->
      <div class="shield-grid">
        <label
          v-for="opt in shieldOptions"
          :key="opt.value"
          class="lock-card"
        >
          <input
            v-model="shieldType"
            type="radio"
            :value="opt.value"
            class="sr-only"
            @change="onShieldTypeChange"
          />
          <div class="card-content">
            <img
              :src="opt.img"
              :alt="opt.label"
              class="w-full h-[120px] object-contain mb-2"
            />
            <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
          </div>
        </label>
      </div>

      <!-- Высота верхней части (Тип_3) -->
      <div v-if="showHeightTop" class="flex flex-col gap-3">
        <span class="font-semibold text-sm">Высота сетки верхней части:</span>
        <div class="provider-cards-grid">
          <label
            v-for="opt in providerOptions"
            :key="'top-' + opt.value"
            class="lock-card provider-card"
          >
            <input
              v-model="providerTop"
              type="radio"
              name="provider-top"
              :value="opt.value"
              class="sr-only"
              @change="onProviderTopChange"
            />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
            </div>
          </label>
        </div>
        <template v-if="showHeightTop">
          <div v-if="isExecutorTop" class="flex flex-col gap-2">
            <label class="font-semibold text-sm whitespace-nowrap" for="heightTopPart">
              Высота сетки (мм):
            </label>
            <div class="select-full-width">
              <B24SelectMenu
                id="heightTopPart"
                v-model="heightTopPart"
                value-key="id"
                :items="netWidthOptions.map(o => ({ id: o.id, label: o.name }))"
                placeholder="Выберите ширину из справочника..."
                class="w-full"
                :class="errHeightTop ? 'border-red-500' : ''"
                @update:model-value="onHeightTopPartChange"
              />
            </div>
          </div>
          <div v-if="showInputTop" class="flex flex-col gap-2">
            <label class="font-semibold text-sm whitespace-nowrap" for="heightTopPartCustom">
              Высота верхней части (мм):
            </label>
            <input
              id="heightTopPartCustom"
              v-model="heightTopPart"
              type="number"
              min="1"
              class="w-full px-3 py-2 border rounded border-gray-300"
              :class="errHeightTop ? 'border-red-500' : ''"
              placeholder="Введите произвольное значение"
              @input="debouncedSave"
            />
          </div>
          <!-- Карточки выбора сетки верхней части (только для executor) -->
          <div
            v-if="isExecutorTop && heightTopPart && Number(heightTopPart) > 0"
            class="w-full p-3 rounded-lg"
            :class="errHeightUpperNet ? 'ring-2 ring-red-500 bg-red-50' : ''"
          >
            <p class="font-semibold text-sm mb-2">Выберите сетку верхней части:</p>
            <div class="net-cards-row">
              <div
                v-for="net in heightUpperNetItems"
                :key="net.id"
                role="button"
                tabindex="0"
                class="lock-card grille-net-card"
                :class="{ 'card-selected': assortmentHeightUpperNetId === net.id }"
                @click="onHeightUpperNetSelect(net)"
                @keydown.enter="onHeightUpperNetSelect(net)"
              >
                <div class="card-content">
                  <img
                    :src="net.imageUrl || PLACEHOLDER_IMAGE"
                    :alt="net.model"
                    class="w-full h-[100px] object-contain mb-2 bg-gray-100 rounded"
                  />
                  <span class="block text-sm font-semibold text-center">{{ net.model }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Высота нижней части (Тип_2, Тип_3) -->
      <div v-if="showHeightLower" class="flex flex-col gap-3">
        <span class="font-semibold text-sm">Высота сетки нижней части:</span>
        <div class="provider-cards-grid">
          <label
            v-for="opt in providerOptions"
            :key="'lower-' + opt.value"
            class="lock-card provider-card"
          >
            <input
              v-model="providerLower"
              type="radio"
              name="provider-lower"
              :value="opt.value"
              class="sr-only"
              @change="onProviderLowerChange"
            />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
            </div>
          </label>
        </div>
        <template v-if="showHeightLower">
          <div v-if="isExecutorLower" class="flex flex-col gap-2">
            <label class="font-semibold text-sm whitespace-nowrap" for="heightLowerPart">
              Высота сетки (мм):
            </label>
            <div class="select-full-width">
              <B24SelectMenu
                id="heightLowerPart"
                v-model="heightLowerPart"
                value-key="id"
                :items="netWidthOptions.map(o => ({ id: o.id, label: o.name }))"
                placeholder="Выберите ширину из справочника..."
                class="w-full"
                :class="errHeightLower ? 'border-red-500' : ''"
                @update:model-value="onHeightLowerPartChange"
              />
            </div>
          </div>
          <div v-if="showInputLower" class="flex flex-col gap-2">
            <label class="font-semibold text-sm whitespace-nowrap" for="heightLowerPartCustom">
              Высота нижней части (мм):
            </label>
            <input
              id="heightLowerPartCustom"
              v-model="heightLowerPart"
              type="number"
              min="1"
              class="w-full px-3 py-2 border rounded border-gray-300"
              :class="errHeightLower ? 'border-red-500' : ''"
              placeholder="Введите произвольное значение"
              @input="debouncedSave"
            />
          </div>
          <div
            v-if="isExecutorLower && heightLowerPart && Number(heightLowerPart) > 0"
            class="w-full p-3 rounded-lg"
            :class="errHeightLowerNet ? 'ring-2 ring-red-500 bg-red-50' : ''"
          >
            <p class="font-semibold text-sm mb-2">Выберите сетку:</p>
            <div class="net-cards-row">
              <div
                v-for="net in heightLowerNetItems"
                :key="net.id"
                role="button"
                tabindex="0"
                class="lock-card grille-net-card"
                :class="{ 'card-selected': assortmentHeightLowerNetId === net.id }"
                @click="onHeightLowerNetSelect(net)"
                @keydown.enter="onHeightLowerNetSelect(net)"
              >
                <div class="card-content">
                  <img
                    :src="net.imageUrl || PLACEHOLDER_IMAGE"
                    :alt="net.model"
                    class="w-full h-[100px] object-contain mb-2 bg-gray-100 rounded"
                  />
                  <span class="block text-sm font-semibold text-center">{{ net.model }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Ширина боковой решётки (Тип_4) -->
      <div v-if="showSidePart" class="flex flex-col gap-3">
        <span class="font-semibold text-sm">Ширина сетки боковой решётки:</span>
        <div class="provider-cards-grid">
          <label
            v-for="opt in providerOptions"
            :key="'side-' + opt.value"
            class="lock-card provider-card"
          >
            <input
              v-model="providerSide"
              type="radio"
              name="provider-side"
              :value="opt.value"
              class="sr-only"
              @change="onProviderSideChange"
            />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
            </div>
          </label>
        </div>
        <template v-if="showSidePart">
          <div v-if="isExecutorSide" class="flex flex-col gap-2">
            <label class="font-semibold text-sm whitespace-nowrap" for="widthSidePart">
              Ширина сетки (мм):
            </label>
            <div class="select-full-width">
              <B24SelectMenu
                id="widthSidePart"
                v-model="widthSidePart"
                value-key="id"
                :items="netWidthOptions.map(o => ({ id: o.id, label: o.name }))"
                placeholder="Выберите ширину из справочника..."
                class="w-full"
                :class="errWidthSide ? 'border-red-500' : ''"
                @update:model-value="onWidthSidePartChange"
              />
            </div>
          </div>
          <div v-if="showInputSide" class="flex flex-col gap-2">
            <label class="font-semibold text-sm whitespace-nowrap" for="widthSidePartCustom">
              Ширина боковой решётки (мм):
            </label>
            <input
              id="widthSidePartCustom"
              v-model="widthSidePart"
              type="number"
              min="1"
              class="w-full px-3 py-2 border rounded border-gray-300"
              :class="errWidthSide ? 'border-red-500' : ''"
              placeholder="Введите произвольное значение"
              @input="debouncedSave"
            />
          </div>
          <div
            v-if="isExecutorSide && widthSidePart && Number(widthSidePart) > 0"
            class="w-full mt-2 p-3 rounded-lg"
            :class="errGrilleNet ? 'ring-2 ring-red-500 bg-red-50' : ''"
          >
            <p class="font-semibold text-sm mb-2">Выберите сетку:</p>
            <div class="net-cards-row">
              <div
                v-for="net in grilleNetItems"
                :key="net.id"
                role="button"
                tabindex="0"
                class="lock-card grille-net-card"
                :class="{ 'card-selected': assortmentSideGrilleNetId === net.id }"
                @click="onGrilleNetSelect(net)"
                @keydown.enter="onGrilleNetSelect(net)"
              >
                <div class="card-content">
                  <img
                    :src="net.imageUrl || PLACEHOLDER_IMAGE"
                    :alt="net.model"
                    class="w-full h-[100px] object-contain mb-2 bg-gray-100 rounded"
                  />
                  <span class="block text-sm font-semibold text-center">{{ net.model }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
        <span class="font-semibold text-sm">Расположение решётки:</span>
        <div class="grille-location-cards">
          <label
            v-for="opt in grilleLocationOptions"
            :key="opt.value"
            class="lock-card provider-card"
          >
            <input
              v-model="grilleLocation"
              type="radio"
              :value="opt.value"
              class="sr-only"
              @change="save"
            />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
            </div>
          </label>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.shield-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  padding: 4px;
}

.provider-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 4px;
}

.grille-location-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 4px;
}

@media (max-width: 640px) {
  .provider-cards-grid,
  .grille-location-cards {
    grid-template-columns: 1fr;
  }
}

.provider-card .card-content {
  height: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
}

.net-cards-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  padding: 4px;
  overflow-x: auto;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
}

.net-cards-row .lock-card,
.net-cards-row .grille-net-card {
  flex-shrink: 0;
  width: 140px;
}

.lock-card {
  cursor: pointer;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.lock-card:hover {
  border-color: #93c5fd;
}

.lock-card:has(input[type="radio"]:checked),
.card-selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.card-selected .card-content {
  background: #eff6ff;
}

.card-content {
  padding: 12px;
  background: transparent;
  transition: background 0.15s ease;
}

.lock-card:has(input[type="radio"]:checked) .card-content {
  background: #eff6ff;
}
</style>

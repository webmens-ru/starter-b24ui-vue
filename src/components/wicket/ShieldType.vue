<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

declare const window: Window & { _HOSTNAME_: string }
import { useCalculation } from '../../composables/useCalculation'
import { getColorShield, getNetWidths, getNetsByWidth, saveWicketData, recalculate } from '../../app/api/wicket'
import type { ColorShieldItem } from '../../app/api/wicket'

interface GrilleNetItem {
  id: number
  model: string
  image_url: string | null
  size_a: number
  size_b: number
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
const color_shield_id = ref<string | number>('')

// ─── Тип щита ────────────────────────────────────────────────────────────────
const shield_type = ref<string>('Тип_1')

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

const showHeightTop   = computed(() => TYPES_WITH_HEIGHT_TOP.includes(shield_type.value))
const showHeightLower = computed(() => TYPES_WITH_HEIGHT_LOWER.includes(shield_type.value))
const showSidePart    = computed(() => TYPES_WITH_SIDE_PART.includes(shield_type.value))

const isExecutorTop   = computed(() => providerTop.value === 'executor')
const isExecutorLower = computed(() => providerLower.value === 'executor')
const isExecutorSide  = computed(() => providerSide.value === 'executor')
const showInputTop    = computed(() => !isExecutorTop.value)
const showInputLower  = computed(() => !isExecutorLower.value)
const showInputSide   = computed(() => !isExecutorSide.value)

// Переключатель «кто предоставляет ширину сетки» — используем refs из calc
const netWidthOptions = ref<{ id: string; name: string }[]>([])

// ─── Размеры ─────────────────────────────────────────────────────────────────
const height_top_part   = ref<string>('')  // select
const height_lower_part = ref<string>('')  // select
const width_side_part   = ref<string>('')  // select
const grille_location   = ref<string>('Возле петель')

const grilleNetItems         = ref<GrilleNetItem[]>([])
const assortment_grille_net_id = ref<number | null>(null)
const errGrilleNet            = ref(false)
const heightLowerNetItems     = ref<GrilleNetItem[]>([])
const assortment_height_lower_net_id = ref<number | null>(null)
const errHeightLowerNet       = ref(false)
const heightUpperNetItems     = ref<GrilleNetItem[]>([])
const assortment_height_upper_net_id = ref<number | null>(null)
const errHeightUpperNet       = ref(false)

// ─── Ошибки валидации ────────────────────────────────────────────────────────
const errHeightTop   = ref(false)
const errHeightLower = ref(false)
const errWidthSide   = ref(false)

// ─── Изображения щитов ───────────────────────────────────────────────────────
// g - горизонтально, v - вертикально; right→g, left→v
const panelOrientation = computed(() => {
  const id = calc.opening_option_id.value
  return id === 1 || id === 4 ? 'g' : 'v'
})

const IMG_BASE = 'https://test-lk.doorhan-krd.ru/img/wicket/type1'

const shieldOptions = computed(() => {
  const orient = panelOrientation.value
  // z - замок, p - петля (только для Тип_4)
  const type4Suffix = grille_location.value === 'Возле замка' ? 'z' : 'p'
  return [
    { value: 'Тип_1', label: 'Тип 1', img: `${IMG_BASE}/w_${orient}_1.1.png` },
    { value: 'Тип_2', label: 'Тип 2', img: `${IMG_BASE}/w_${orient}_1.2.png` },
    { value: 'Тип_3', label: 'Тип 3', img: `${IMG_BASE}/w_${orient}_1.3.png` },
    { value: 'Тип_4', label: 'Тип 4', img: `${IMG_BASE}/w_${orient}_1.4_${type4Suffix}.png` },
  ]
})

// Группировка: Стандартная краска / Не стандартная (для B24SelectMenu)
// id приводим к string — B24SelectMenu сравнивает по value-key строго, color_shield_id хранится как string
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
    colorOptions.value = res.arr_color_shield
    if (!color_shield_id.value && colorOptions.value.length) {
      color_shield_id.value = String(colorOptions.value[0].id)
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
    netWidthOptions.value = res.arr_net_width
  } catch (e) {
    console.warn('getNetWidths:', e)
    openModal('Не удалось загрузить список ширины сетки.')
  }
}

// ─── Загрузка сеток по ширине (для карточек выбора) ───────────────────────────
async function loadGrilleNetsByWidth(width: string) {
  if (!width || Number(width) <= 0) {
    grilleNetItems.value = []
    assortment_grille_net_id.value = null
    return
  }
  try {
    const res = await getNetsByWidth(width)
    grilleNetItems.value = res.items
    assortment_grille_net_id.value = null
  } catch (e) {
    console.warn('getNetsByWidth:', e)
    grilleNetItems.value = []
    assortment_grille_net_id.value = null
  }
}

function onWidthSidePartChange(val: string | number) {
  width_side_part.value = String(val ?? '')
  loadGrilleNetsByWidth(width_side_part.value).then(() => debouncedSave())
}

function onGrilleNetSelect(net: GrilleNetItem) {
  assortment_grille_net_id.value = net.id
  errGrilleNet.value = false
  debouncedSave()
}

async function loadHeightLowerNetsBySize(size: string) {
  if (!size || Number(size) <= 0) {
    heightLowerNetItems.value = []
    assortment_height_lower_net_id.value = null
    return
  }
  try {
    const res = await getNetsByWidth(size)
    heightLowerNetItems.value = res.items
    assortment_height_lower_net_id.value = null
  } catch (e) {
    console.warn('getNetsByWidth (height_lower):', e)
    heightLowerNetItems.value = []
    assortment_height_lower_net_id.value = null
  }
}

async function loadHeightUpperNetsBySize(size: string) {
  if (!size || Number(size) <= 0) {
    heightUpperNetItems.value = []
    assortment_height_upper_net_id.value = null
    return
  }
  try {
    const res = await getNetsByWidth(size)
    heightUpperNetItems.value = res.items
    assortment_height_upper_net_id.value = null
  } catch (e) {
    console.warn('getNetsByWidth (height_upper):', e)
    heightUpperNetItems.value = []
    assortment_height_upper_net_id.value = null
  }
}

function onHeightTopPartChange(val: string | number) {
  height_top_part.value = String(val ?? '')
  loadHeightUpperNetsBySize(height_top_part.value).then(() => debouncedSave())
}

function onHeightLowerPartChange(val: string | number) {
  height_lower_part.value = String(val ?? '')
  loadHeightLowerNetsBySize(height_lower_part.value).then(() => debouncedSave())
}

function onHeightLowerNetSelect(net: GrilleNetItem) {
  assortment_height_lower_net_id.value = net.id
  errHeightLowerNet.value = false
  debouncedSave()
}

function onHeightUpperNetSelect(net: GrilleNetItem) {
  assortment_height_upper_net_id.value = net.id
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
    height_top_part.value = ''
    heightUpperNetItems.value = []
    assortment_height_upper_net_id.value = null
  } else if (providerTop.value === 'customer') {
    assortment_height_upper_net_id.value = null
    heightUpperNetItems.value = []
  } else if (providerTop.value === 'executor') {
    height_top_part.value = ''
    heightUpperNetItems.value = []
    assortment_height_upper_net_id.value = null
  }
  errHeightTop.value = false
  errHeightUpperNet.value = false
  debouncedSave()
}

function onProviderLowerChange() {
  if (providerLower.value === '') {
    height_lower_part.value = ''
    heightLowerNetItems.value = []
    assortment_height_lower_net_id.value = null
  } else if (providerLower.value === 'customer') {
    assortment_height_lower_net_id.value = null
    heightLowerNetItems.value = []
  } else if (providerLower.value === 'executor') {
    height_lower_part.value = ''
    heightLowerNetItems.value = []
    assortment_height_lower_net_id.value = null
  }
  errHeightLower.value = false
  errHeightLowerNet.value = false
  debouncedSave()
}

function onProviderSideChange() {
  if (providerSide.value === '') {
    width_side_part.value = ''
    grilleNetItems.value = []
    assortment_grille_net_id.value = null
  } else if (providerSide.value === 'customer') {
    assortment_grille_net_id.value = null
    grilleNetItems.value = []
  } else if (providerSide.value === 'executor') {
    width_side_part.value = ''
    grilleNetItems.value = []
    assortment_grille_net_id.value = null
  }
  errWidthSide.value = false
  errGrilleNet.value = false
  debouncedSave()
}

// ─── Обработчики ─────────────────────────────────────────────────────────────
async function onShieldTypeChange() {
  if (!showHeightTop.value) {
    height_top_part.value = ''
    heightUpperNetItems.value = []
    assortment_height_upper_net_id.value = null
  }
  if (!showHeightLower.value) {
    height_lower_part.value = ''
    heightLowerNetItems.value = []
    assortment_height_lower_net_id.value = null
  }
  if (!showSidePart.value) {
    width_side_part.value  = ''
    grilleNetItems.value   = []
    assortment_grille_net_id.value = null
    grille_location.value  = 'Возле петель'
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
    const sid = String(color_shield_id.value ?? '')
    const name = colorOptions.value.find(i => String(i.id) === sid)?.name ?? ''
    openModal(`Внесены изменения: Цвет рамы '${name}'`, 'Изменения сохранены')
  })
}

// ─── Синхронизация + сохранение ──────────────────────────────────────────────
function syncCalcFields() {
  calc.shield_type.value       = shield_type.value
  calc.color_shield_id.value   = String(color_shield_id.value ?? '')
  const colorItem = colorOptions.value.find(i => String(i.id) === String(color_shield_id.value))
  calc.color_shield_name.value = colorItem?.name ?? ''
  calc.height_top_part.value   = height_top_part.value
  calc.height_lower_part.value = height_lower_part.value
  calc.width_side_part.value   = width_side_part.value
  if (showHeightLower.value) {
    calc.assortment_height_lower_net_id.value = assortment_height_lower_net_id.value
    calc.assortment_side_grille_net_id.value = null
  } else {
    calc.assortment_height_lower_net_id.value = null
    if (showSidePart.value) {
      calc.assortment_side_grille_net_id.value = assortment_grille_net_id.value
    } else {
      calc.assortment_side_grille_net_id.value = null
    }
  }
  calc.assortment_height_upper_net_id.value = showHeightTop.value ? assortment_height_upper_net_id.value : null
  calc.grille_location.value = grille_location.value
  calc.net_width_provider_top.value = providerTop.value
  calc.net_width_provider_lower.value = providerLower.value
  calc.net_width_provider_side.value = providerSide.value
}

function buildBlock() {
  const params: { name: string; value: string }[] = [
    { name: 'Тип щита', value: calc.shield_type.value },
  ]
  if (calc.color_shield_name.value) {
    params.push({ name: 'Цвет рамы', value: calc.color_shield_name.value })
  }
  const provTop = providerTop.value
  const topVal = calc.height_top_part.value
  if (showHeightTop.value && provTop !== '' && topVal && topVal !== '0' && Number(topVal) > 0) {
    params.push({ name: 'Высота верхней части', value: topVal })
    if (provTop === 'executor') {
      const selUpperNet = heightUpperNetItems.value.find(n => n.id === assortment_height_upper_net_id.value)
      if (selUpperNet) params.push({ name: 'Сетка верхней части', value: selUpperNet.model })
    }
  }
  const provLower = providerLower.value
  const lowerVal = calc.height_lower_part.value
  if (showHeightLower.value && provLower !== '' && lowerVal && lowerVal !== '0' && Number(lowerVal) > 0) {
    params.push({ name: 'Высота нижней части', value: lowerVal })
    if (provLower === 'executor') {
      const selLowerNet = heightLowerNetItems.value.find(n => n.id === assortment_height_lower_net_id.value)
      if (selLowerNet) params.push({ name: 'Сетка нижней части', value: selLowerNet.model })
    }
  }
  const provSide = providerSide.value
  const sideVal = calc.width_side_part.value
  if (showSidePart.value && provSide !== '' && sideVal && sideVal !== '0' && Number(sideVal) > 0) {
    params.push({ name: 'Ширина боковой части', value: sideVal })
    if (provSide === 'executor') {
      const selNet = grilleNetItems.value.find(n => n.id === assortment_grille_net_id.value)
      if (selNet) params.push({ name: 'Сетка боковой решётки', value: selNet.model })
    }
  }
  if (showSidePart.value && calc.grille_location.value) {
    params.push({ name: 'Расположение решётки', value: calc.grille_location.value })
  }
  calc.updateOrCreateBlock('Тип щита', params)
}

async function save() {
  syncCalcFields()
  buildBlock()

  const provTop = providerTop.value
  const provLower = providerLower.value
  const provSide = providerSide.value

  const topVal = showHeightTop.value ? (calc.height_top_part.value || '0') : '0'
  const lowerVal = showHeightLower.value ? (calc.height_lower_part.value || '0') : '0'
  const sideVal = showSidePart.value ? (calc.width_side_part.value || '0') : '0'

  try {
    await saveWicketData({
      order_id: Number(calc.number.value),
      shield_type:        calc.shield_type.value,
      color_shield_name:  calc.color_shield_name.value,
      color_shield_id:    calc.color_shield_id.value,
      height_top_part:    topVal,
      height_lower_part:  lowerVal,
      width_side_part:    sideVal,
      net_width_provider_top:  showHeightTop.value ? provTop : undefined,
      net_width_provider_lower: showHeightLower.value ? provLower : undefined,
      net_width_provider_side:  showSidePart.value ? provSide : undefined,
      assortment_height_lower_net_id: showHeightLower.value && provLower === 'executor' ? (assortment_height_lower_net_id.value ?? undefined) : undefined,
      assortment_side_grille_net_id: showSidePart.value && provSide === 'executor' ? (assortment_grille_net_id.value ?? undefined) : undefined,
      assortment_height_upper_net_id: showHeightTop.value && provTop === 'executor' ? (assortment_height_upper_net_id.value ?? undefined) : undefined,
      grille_location:         calc.grille_location.value,
      model_id:           calc.modelId.value,
    })
  } catch (e) {
    console.warn('saveWicketData:', e)
  }

  if (calc.price_retail.value) {
    try {
      const result = await recalculate({
        order_id: Number(calc.number.value),
        product_type:       calc.productType.value,
        model:              calc.model.value,
        model_id:           calc.modelId.value,
      })
      calc.updatePriceBlock(result.price_dealer, result.price_retail)
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
    const v = height_top_part.value
    if (!v || v === '0' || Number(v) <= 0) {
      errHeightTop.value = true
      msgs.push('Выберите значение больше 0: Высота верхней части')
    } else {
      errHeightTop.value = false
      if (provTop === 'executor' && !assortment_height_upper_net_id.value) {
        errHeightUpperNet.value = true
        msgs.push('Выберите конкретную сетку верхней части')
      } else {
        errHeightUpperNet.value = false
      }
    }
  }
  if (showHeightLower.value) {
    const v = height_lower_part.value
    if (!v || v === '0' || Number(v) <= 0) {
      errHeightLower.value = true
      msgs.push('Выберите значение больше 0: Высота нижней части')
    } else {
      errHeightLower.value = false
      if (provLower === 'executor' && !assortment_height_lower_net_id.value) {
        errHeightLowerNet.value = true
        msgs.push('Выберите конкретную сетку нижней части')
      } else {
        errHeightLowerNet.value = false
      }
    }
  }
  if (showSidePart.value) {
    const v = width_side_part.value
    if (!v || v === '0' || Number(v) <= 0) {
      errWidthSide.value = true
      msgs.push('Выберите значение больше 0: Ширина боковой решётки')
    } else {
      errWidthSide.value = false
      if (provSide === 'executor' && !assortment_grille_net_id.value) {
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
  if (calc.shield_type.value)       shield_type.value       = calc.shield_type.value
  // Инициализация provider из calc (при загрузке сохранённых данных)
  const savedProvTop = calc.net_width_provider_top.value
  const savedProvLower = calc.net_width_provider_lower.value
  const savedProvSide = calc.net_width_provider_side.value
  providerTop.value = savedProvTop === 'customer' || savedProvTop === 'executor' ? savedProvTop : 'executor'
  providerLower.value = savedProvLower === 'customer' || savedProvLower === 'executor' ? savedProvLower : 'executor'
  providerSide.value = savedProvSide === 'customer' || savedProvSide === 'executor' ? savedProvSide : 'executor'
  const savedTop = calc.height_top_part.value
  if (savedTop && savedTop !== '0' && Number(savedTop) > 0) {
    height_top_part.value = String(savedTop)
  }
  const savedLower = calc.height_lower_part.value
  if (savedLower && savedLower !== '0' && Number(savedLower) > 0) {
    height_lower_part.value = String(savedLower)
  }
  const savedSide = calc.width_side_part.value
  if (savedSide && savedSide !== '0' && Number(savedSide) > 0) {
    width_side_part.value = String(savedSide)
  }
  if (calc.grille_location.value)   grille_location.value   = calc.grille_location.value

  await loadColorShield()
  await loadNetWidths()
  if (width_side_part.value) await loadGrilleNetsByWidth(width_side_part.value)
  if (height_lower_part.value) await loadHeightLowerNetsBySize(height_lower_part.value)
  if (height_top_part.value) await loadHeightUpperNetsBySize(height_top_part.value)
  // Восстанавливаем выбор сеток после загрузки (loadXXX сбрасывает selection)
  if (showHeightLower.value) {
    const lowerId = calc.assortment_height_lower_net_id.value ?? calc.assortment_side_grille_net_id.value
    if (lowerId) assortment_height_lower_net_id.value = Number(lowerId)
  } else if (showSidePart.value && calc.assortment_side_grille_net_id.value) {
    assortment_grille_net_id.value = Number(calc.assortment_side_grille_net_id.value)
  }
  if (calc.assortment_height_upper_net_id.value && showHeightTop.value) {
    assortment_height_upper_net_id.value = Number(calc.assortment_height_upper_net_id.value)
  }

  if (calc.color_shield_id.value) {
    color_shield_id.value = calc.color_shield_id.value
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
    <div class="flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Щит</span>
      <B24Button label="Далее" color="air-secondary" @click="handleNext" />
    </div>

    <div class="flex flex-col gap-5 overflow-y-auto max-h-[calc(100vh-56px)] px-1">

      <!-- Цвет рамы -->
      <div class="flex flex-wrap items-center gap-3">
        <span class="font-bold text-base whitespace-nowrap">Цвет рамы:</span>
        <div class="flex-1 min-w-[320px] max-w-[540px] w-full">
          <B24SelectMenu
            v-model="color_shield_id"
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
            v-model="shield_type"
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
          <div v-if="isExecutorTop" class="flex items-center gap-3 flex-wrap">
            <label class="font-semibold text-sm whitespace-nowrap" for="height_top_part">
              Высота сетки (мм):
            </label>
            <div class="min-w-[140px] max-w-[200px]">
              <B24SelectMenu
                id="height_top_part"
                v-model="height_top_part"
                value-key="id"
                :items="netWidthOptions.map(o => ({ id: o.id, label: o.name }))"
                placeholder="Выберите ширину из справочника..."
                class="w-full"
                :class="errHeightTop ? 'border-red-500' : ''"
                @update:model-value="onHeightTopPartChange"
              />
            </div>
          </div>
          <div v-if="showInputTop" class="flex items-center gap-3 flex-wrap">
            <label class="font-semibold text-sm whitespace-nowrap" for="height_top_part_custom">
              Высота верхней части (мм):
            </label>
            <input
              id="height_top_part_custom"
              v-model="height_top_part"
              type="number"
              min="1"
              class="min-w-[120px] max-w-[160px] px-3 py-2 border rounded border-gray-300"
              :class="errHeightTop ? 'border-red-500' : ''"
              placeholder="Введите произвольное значение"
              @input="debouncedSave"
            />
          </div>
          <!-- Карточки выбора сетки верхней части (только для executor) -->
          <div
            v-if="isExecutorTop && height_top_part && Number(height_top_part) > 0"
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
                :class="{ 'card-selected': assortment_height_upper_net_id === net.id }"
                @click="onHeightUpperNetSelect(net)"
                @keydown.enter="onHeightUpperNetSelect(net)"
              >
                <div class="card-content">
                  <img
                    :src="net.image_url || PLACEHOLDER_IMAGE"
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
          <div v-if="isExecutorLower" class="flex items-center gap-3 flex-wrap">
            <label class="font-semibold text-sm whitespace-nowrap" for="height_lower_part">
              Высота сетки (мм):
            </label>
            <div class="min-w-[140px] max-w-[200px]">
              <B24SelectMenu
                id="height_lower_part"
                v-model="height_lower_part"
                value-key="id"
                :items="netWidthOptions.map(o => ({ id: o.id, label: o.name }))"
                placeholder="Выберите ширину из справочника..."
                class="w-full"
                :class="errHeightLower ? 'border-red-500' : ''"
                @update:model-value="onHeightLowerPartChange"
              />
            </div>
          </div>
          <div v-if="showInputLower" class="flex items-center gap-3 flex-wrap">
            <label class="font-semibold text-sm whitespace-nowrap" for="height_lower_part_custom">
              Высота нижней части (мм):
            </label>
            <input
              id="height_lower_part_custom"
              v-model="height_lower_part"
              type="number"
              min="1"
              class="min-w-[120px] max-w-[160px] px-3 py-2 border rounded border-gray-300"
              :class="errHeightLower ? 'border-red-500' : ''"
              placeholder="Введите произвольное значение"
              @input="debouncedSave"
            />
          </div>
          <div
            v-if="isExecutorLower && height_lower_part && Number(height_lower_part) > 0"
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
                :class="{ 'card-selected': assortment_height_lower_net_id === net.id }"
                @click="onHeightLowerNetSelect(net)"
                @keydown.enter="onHeightLowerNetSelect(net)"
              >
                <div class="card-content">
                  <img
                    :src="net.image_url || PLACEHOLDER_IMAGE"
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
          <div v-if="isExecutorSide" class="flex items-center gap-3">
            <label class="font-semibold text-sm whitespace-nowrap" for="width_side_part">
              Ширина сетки (мм):
            </label>
            <div class="min-w-[140px] max-w-[200px]">
              <B24SelectMenu
                id="width_side_part"
                v-model="width_side_part"
                value-key="id"
                :items="netWidthOptions.map(o => ({ id: o.id, label: o.name }))"
                placeholder="Выберите ширину из справочника..."
                class="w-full"
                :class="errWidthSide ? 'border-red-500' : ''"
                @update:model-value="onWidthSidePartChange"
              />
            </div>
          </div>
          <div v-if="showInputSide" class="flex items-center gap-3">
            <label class="font-semibold text-sm whitespace-nowrap" for="width_side_part_custom">
              Ширина боковой решётки (мм):
            </label>
            <input
              id="width_side_part_custom"
              v-model="width_side_part"
              type="number"
              min="1"
              class="min-w-[120px] max-w-[160px] px-3 py-2 border rounded border-gray-300"
              :class="errWidthSide ? 'border-red-500' : ''"
              placeholder="Введите произвольное значение"
              @input="debouncedSave"
            />
          </div>
          <div
            v-if="isExecutorSide && width_side_part && Number(width_side_part) > 0"
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
                :class="{ 'card-selected': assortment_grille_net_id === net.id }"
                @click="onGrilleNetSelect(net)"
                @keydown.enter="onGrilleNetSelect(net)"
              >
                <div class="card-content">
                  <img
                    :src="net.image_url || PLACEHOLDER_IMAGE"
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
              v-model="grille_location"
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
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 12px;
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

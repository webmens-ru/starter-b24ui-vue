<script setup lang="ts">
import PaintingProviders from './PaintingProviders.vue'
import ProviderChoice from './ProviderChoice.vue'
import { computed, onMounted, ref } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { getColorShield, recalculate, saveWicketData } from '../../app/api/wicket'
import type { ColorShieldItem } from '../../app/api/wicket'
import { createStepLeaveAttempt } from './stepLeaveAttempt'

const emit = defineEmits<{ (e: 'next'): void; (e: 'back'): void }>()
const calc = useCalculation()
const colors = ref<ColorShieldItem[]>([])
const categoryNames = ['Стандартная', 'Не стандартная', 'Индивидуальная', 'Давальческая']
const categories = ref<Array<{ id: number; name: string }>>([])
const category = ref('Стандартная')
function colorCategory(item: ColorShieldItem): string {
  return item.paintCategoryName ?? (item.isStandard === 0 ? 'Не стандартная' : 'Стандартная')
}
const filteredColors = computed(() => colors.value.filter(item => colorCategory(item) === category.value
  || (legacyCustomerPaint.value && String(item.id) === String(calc.colorShieldId.value))))
const legacyCustomerPaint = ref(false)
const primerProviders = ['Предоставляет изготовитель', 'Предоставляет заказчик']
const loading = ref(true)
const submitted = ref(false)
const error = ref('')
const catalogError = ref('')
const calculationWarning = ref('')
const selectedColor = computed(() => colors.value.find(item => String(item.id) === String(calc.colorShieldId.value)))
const customerPainting = computed(() => calc.doesPaintingFrame.value === 'Выполняет заказчик')
const individual = computed(() => selectedColor.value?.isFixedColor === false)
const primers = computed(() => selectedColor.value?.primers ?? [])
const colorItems = computed(() => {
  const groups = new Map<string, ColorShieldItem[]>()
  for (const item of filteredColors.value) {
    const name = item.paintCategoryName ?? (item.isStandard === 0 ? 'Не стандартная' : 'Стандартная')
    groups.set(name, [...(groups.get(name) ?? []), item])
  }
  return [...groups.entries()].flatMap(([label, items]) => [
    { type: 'label' as const, label },
    ...items.map(item => ({ id: String(item.id), label: item.name })),
  ])
})
async function onCategoryChange(name: string): Promise<void> {
  legacyCustomerPaint.value = false
  category.value = name
  calc.providesPaint.value = name === 'Давальческая' ? 'Предоставляет заказчик' : 'Предоставляет изготовитель'
  if (!filteredColors.value.some(item => String(item.id) === String(calc.colorShieldId.value))) {
    calc.colorShieldId.value = filteredColors.value[0] ? String(filteredColors.value[0].id) : ''
  }
  syncSelection()
  await save()
}
const primerItems = computed(() => [
  { id: 'none', label: 'Без грунтовки' },
  ...primers.value.map(item => ({ id: String(item.id), label: item.name })),
])

function requestErrorMessage(cause: unknown, fallback: string): string {
  if (typeof cause === 'object' && cause !== null && 'response' in cause) {
    const response = cause.response
    if (typeof response === 'object' && response !== null && 'data' in response) {
      const data = response.data
      if (typeof data === 'object' && data !== null) {
        const messages: string[] = []
        if ('problems' in data && Array.isArray(data.problems)) {
          for (const problem of data.problems) {
            if (typeof problem === 'object' && problem !== null && typeof problem.message === 'string') messages.push(problem.message)
          }
        }
        if ('errors' in data && typeof data.errors === 'object' && data.errors !== null) {
          for (const value of Object.values(data.errors).flat()) {
            if (typeof value === 'string') messages.push(value)
          }
        }
        if (messages.length) return [...new Set(messages)].join('\n')
        if ('error' in data && typeof data.error === 'string') return data.error
        if ('message' in data && typeof data.message === 'string') return data.message
      }
    }
  }
  return cause instanceof Error ? cause.message : fallback
}

function syncSelection(): void {
  calc.colorShieldName.value = selectedColor.value?.name ?? ''
  calc.colorShieldHex.value = selectedColor.value?.hex ?? ''
  if (!individual.value) calc.colorShieldNote.value = ''
  const primer = primers.value.find(item => item.id === calc.primerId.value)
  calc.primerId.value = primer?.id ?? null
  calc.primerName.value = primer?.name ?? ''
  const params = [
    { name: 'Краска', value: calc.providesPaint.value },
    { name: 'Окраска каркаса', value: calc.doesPaintingFrame.value },
    { name: 'Цвет рамы', value: calc.colorShieldName.value },
  ]
  if (individual.value && calc.colorShieldNote.value.trim()) {
    params.push({ name: 'Примечание к цвету краски', value: calc.colorShieldNote.value.trim() })
  }
  if (primer) params.push(
    { name: 'Грунтовка', value: primer.name },
    { name: 'Поставщик грунтовки', value: calc.providesPrimer.value },
  )
  calc.updateOrCreateBlock('Окраска', params)
}

async function save(): Promise<boolean> {
  if (loading.value && !customerPainting.value) return false
  if (!customerPainting.value && !selectedColor.value) {
    error.value = 'Выберите краску из списка.'
    return false
  }
  if (!customerPainting.value) syncSelection()
  else {
    const params = calc.data.value.find(block => block.blockName === 'Окраска')?.params ?? []
    calc.updateOrCreateBlock('Окраска', [
      ...params.filter(param => param.name !== 'Окраска каркаса'),
      { name: 'Окраска каркаса', value: calc.doesPaintingFrame.value },
    ])
  }
  if (!customerPainting.value && individual.value && !calc.colorShieldNote.value.trim()) return false
  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      providesPaint: calc.providesPaint.value,
      providesPrimer: calc.providesPrimer.value,
      doesPaintingFrame: calc.doesPaintingFrame.value,
      doesAssembly: calc.doesAssembly.value,
      colorShieldId: calc.colorShieldId.value,
      colorShieldNote: calc.colorShieldNote.value.trim(),
      primerId: calc.primerId.value,
    })
    error.value = ''
  } catch (e) {
    error.value = requestErrorMessage(e, 'Не удалось сохранить окраску')
    return false
  }
  if (calc.priceRetail.value) {
    try {
      const result = await recalculate({
        ...calc.getCurrentProductRowContext(),
        productType: calc.productType.value,
        model: calc.model.value,
      })
      calc.updatePriceBlock(result.priceDealer, result.priceRetail)
      calculationWarning.value = ''
    } catch (e) {
      calculationWarning.value = `Окраска сохранена. Стоимость не пересчитана:\n${requestErrorMessage(e, 'Не удалось пересчитать стоимость')}`
      calc.priceRetail.value = ''
      calc.priceDealer.value = ''
      calc.data.value = calc.data.value.filter(block => block.blockName !== 'Цена')
    }
  }
  return true
}

async function onColorChange(value: string | number): Promise<void> {
  legacyCustomerPaint.value = false
  calc.colorShieldId.value = String(value ?? '')
  calc.providesPaint.value = category.value === 'Давальческая' ? 'Предоставляет заказчик' : 'Предоставляет изготовитель'
  syncSelection()
  await save()
}
async function onPrimerChange(value: string | number | null): Promise<void> {
  calc.primerId.value = value === 'none' || value === '' || value == null ? null : Number(value)
  await save()
}
async function validateAndSave(): Promise<boolean> {
  submitted.value = true
  return await save()
}
const { validateBeforeLeave, next } = createStepLeaveAttempt(validateAndSave, () => emit('next'))
defineExpose({ validateBeforeLeave })

async function load(): Promise<void> {
  loading.value = true
  catalogError.value = ''
  try {
    const response = await getColorShield(calc.modelId.value)
    colors.value = response.colorShield
    categories.value = response.paintCategories ?? categoryNames.map((name, id) => ({ id, name }))
    legacyCustomerPaint.value = calc.providesPaint.value === 'Предоставляет заказчик'
      && !!selectedColor.value && colorCategory(selectedColor.value) !== 'Давальческая'
    if (!customerPainting.value && !calc.colorShieldId.value && calc.providesPaint.value !== 'Предоставляет заказчик' && colors.value.length) calc.colorShieldId.value = String(colors.value[0]!.id)
    category.value = calc.providesPaint.value === 'Предоставляет заказчик' ? 'Давальческая'
      : selectedColor.value ? colorCategory(selectedColor.value) : 'Стандартная'
    if (!customerPainting.value && category.value === 'Давальческая') calc.providesPaint.value = 'Предоставляет заказчик'
    if (selectedColor.value) {
      if (!customerPainting.value) syncSelection()
    } else catalogError.value = 'Выбранная краска недоступна. Выберите краску из списка.'
  } catch (e) {
    catalogError.value = e instanceof Error ? e.message : 'Не удалось загрузить краски'
  } finally {
    loading.value = false
  }
}
onMounted(async () => {
  calc.setActivePage('page_painting')
  await load()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Окраска</span>
      <B24Button label="Далее" color="air-secondary" :disabled="loading && !customerPainting" @click="next" />
    </div>
    <PaintingProviders @change="save" />
    <div v-if="error && customerPainting" role="alert" class="text-red-600 whitespace-pre-line">{{ error }}</div>
    <template v-if="!customerPainting">
    <div role="group" aria-label="Категория краски" class="grid grid-cols-2 lg:grid-cols-4 gap-3 p-1">
      <button v-for="item in categories" :key="item.id" type="button" class="paint-category-card"
        :data-paint-category="item.name" :aria-pressed="category === item.name"
        :disabled="loading" @click="onCategoryChange(item.name)">
        {{ item.name }}
      </button>
    </div>
    <p v-if="legacyCustomerPaint" role="status" class="text-amber-700">В старом заказе краску «{{ selectedColor?.name }}» предоставляет заказчик. Выбор сохранён. Для замены выберите категорию и краску заново.</p>
    <p v-if="!loading && !filteredColors.length" role="status">В этой категории пока нет доступных красок.</p>
    <p v-if="loading">Загрузка красок…</p>
    <div v-if="error || catalogError" role="alert" class="text-red-600 whitespace-pre-line">
      {{ error || catalogError }}
      <B24Button v-if="!colors.length" label="Повторить загрузку" color="air-secondary" @click="load" />
    </div>
    <p v-if="calculationWarning" role="status" class="text-amber-700 whitespace-pre-line">{{ calculationWarning }}</p>
    <div class="flex flex-col gap-5 px-1">
      <label class="flex flex-col gap-2">
        <span class="font-semibold">Цвет рамы</span>
        <B24SelectMenu
          data-testid="paint-color"
          :model-value="String(calc.colorShieldId.value)"
          :items="colorItems"
          value-key="id"
          placeholder="Выберите краску"
          class="w-full"
          :disabled="loading"
          :b24ui="{ content: 'min-w-fit max-w-[90vw]', viewport: 'min-w-fit', item: 'whitespace-normal' }"
          @update:model-value="onColorChange"
        />
      </label>
      <label v-if="individual" class="flex flex-col gap-2">
        <span class="font-semibold">Примечание к цвету краски <span class="text-red-600">*</span></span>
        <textarea
          v-model="calc.colorShieldNote.value"
          required
          maxlength="1000"
          rows="3"
          class="w-full px-3 py-2 border rounded border-gray-300 bg-white"
          :aria-invalid="submitted && !calc.colorShieldNote.value.trim()"
          placeholder="Укажите индивидуальный цвет и требования к нему"
          @change="save"
        />
        <span v-if="submitted && !calc.colorShieldNote.value.trim()" role="alert" class="text-sm text-red-600">Укажите примечание к цвету краски</span>
      </label>
      <label v-if="selectedColor" class="flex flex-col gap-2">
        <span class="font-semibold">Грунтовка <span class="font-normal text-gray-500">(необязательно)</span></span>
        <B24SelectMenu
          data-testid="paint-primer"
          :model-value="calc.primerId.value == null ? 'none' : String(calc.primerId.value)"
          :items="primerItems"
          value-key="id"
          class="w-full"
          :disabled="!primers.length"
          @update:model-value="onPrimerChange"
        />
        <span v-if="!primers.length" class="text-sm text-gray-500">Для выбранной краски совместимые грунтовки не заданы.</span>
      </label>
      <ProviderChoice v-if="calc.primerId.value != null" v-model="calc.providesPrimer.value"
        title="Поставщик грунтовки" :options="primerProviders" :disabled="loading" @change="save" />
    </div>
    </template>
  </div>
</template>

<style scoped>
.paint-category-card {
  cursor: pointer;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  color: #000;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}
.paint-category-card:hover { border-color: #93c5fd; }
.paint-category-card[aria-pressed="true"] {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 15%);
  background: #eff6ff;
}
.paint-category-card:focus-visible { outline: 2px solid #2563eb; outline-offset: 3px; }
.paint-category-card:disabled { cursor: wait; opacity: .6; }
</style>

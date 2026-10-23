<script setup lang="ts">
import { findSummaryBlock, withoutSummaryBlock } from '../../app/summaryCodes'
import { participantRoleLabel, participantRoleOptions } from '../../app/participantRoles'
import PaintingProviders from './PaintingProviders.vue'
import ProviderChoice from './ProviderChoice.vue'
import { computed, onMounted, ref } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { getColorShield, recalculate, saveWicketData } from '../../app/api/wicket'
import type { ColorShieldItem } from '../../app/api/wicket'
import type { PaintCategory } from '../../app/api/wicket.types'
import { createStepLeaveAttempt } from './stepLeaveAttempt'

const emit = defineEmits<{ (e: 'next'): void; (e: 'back'): void }>()
const calc = useCalculation()
const colors = ref<ColorShieldItem[]>([])
const categories = ref<PaintCategory[]>([])
const category = ref<number | null>(null)
const selectedCategory = computed(() => categories.value.find(item => item.id === category.value))
const filteredColors = computed(() => colors.value.filter(item => item.paintCategoryId === category.value))
const legacyCustomerPaint = ref(false)
const primerProviders = participantRoleOptions('provide')
const loading = ref(true)
const submitted = ref(false)
const error = ref('')
const catalogError = ref('')
const calculationWarning = ref('')
const selectedColor = computed(() => colors.value.find(item => String(item.id) === String(calc.colorShieldId.value)))
const customerPainting = computed(() => calc.doesPaintingFrame.value === 'customer')
const individual = computed(() => selectedCategory.value?.isFixedColor === false)
const primers = computed(() => selectedColor.value?.primers ?? [])
const colorItems = computed(() => {
  const groups = new Map<number, ColorShieldItem[]>()
  for (const item of filteredColors.value) {
    if (item.paintCategoryId == null) continue
    groups.set(item.paintCategoryId, [...(groups.get(item.paintCategoryId) ?? []), item])
  }
  return [...groups.entries()].flatMap(([id, items]) => [
    { type: 'label' as const, label: categories.value.find(item => item.id === id)?.name ?? '' },
    ...items.map(item => ({ id: String(item.id), label: item.name })),
  ])
})
async function onCategoryChange(id: number): Promise<void> {
  if (!categories.value.some(item => item.id === id)) return
  catalogError.value = ''
  legacyCustomerPaint.value = false
  category.value = id
  calc.providesPaint.value = selectedCategory.value?.isCustomerSupplied ? 'customer' : 'manufacturer'
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
    { paramCode: 'paintProvider', name: 'Краска', value: participantRoleLabel('provide', calc.providesPaint.value) },
    { paramCode: 'paintingPerformer', name: 'Окраска каркаса', value: participantRoleLabel('perform', calc.doesPaintingFrame.value) },
    { paramCode: 'paint', name: 'Цвет рамы', value: calc.colorShieldName.value },
  ]
  if (individual.value && calc.colorShieldNote.value.trim()) {
    params.push({ paramCode: 'paintNote', name: 'Примечание к цвету краски', value: calc.colorShieldNote.value.trim() })
  }
  if (primer) params.push(
    { paramCode: 'primer', name: 'Грунтовка', value: primer.name },
    { paramCode: 'primerProvider', name: 'Поставщик грунтовки', value: participantRoleLabel('provide', calc.providesPrimer.value) },
  )
  calc.updateOrCreateBlock('painting', params, 'Окраска')
}

async function save(): Promise<boolean> {
  if (loading.value && !customerPainting.value) return false
  if (!customerPainting.value && (!selectedCategory.value || catalogError.value)) return false
  if (!customerPainting.value && !selectedColor.value) {
    error.value = 'Выберите краску из списка.'
    return false
  }
  if (!customerPainting.value) syncSelection()
  else {
    const params = findSummaryBlock(calc.data.value, 'painting')?.params ?? []
    calc.updateOrCreateBlock('painting', [
      ...params.filter(param => param.paramCode !== 'paintingPerformer'),
      { paramCode: 'paintingPerformer', name: 'Окраска каркаса', value: participantRoleLabel('perform', calc.doesPaintingFrame.value) },
    ], 'Окраска')
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
      calc.data.value = withoutSummaryBlock(calc.data.value, 'price')
    }
  }
  return true
}

async function onColorChange(value: string | number): Promise<void> {
  if (!selectedCategory.value) return
  catalogError.value = ''
  legacyCustomerPaint.value = false
  calc.colorShieldId.value = String(value ?? '')
  calc.providesPaint.value = selectedCategory.value?.isCustomerSupplied ? 'customer' : 'manufacturer'
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
    categories.value = response.paintCategories ?? []
    if (!categories.value.length || categories.value.some(item =>
      typeof item.isFixedColor !== 'boolean' || typeof item.isCustomerSupplied !== 'boolean'
      || typeof item.requiresPaintType !== 'boolean' || typeof item.allowsAnyPrimer !== 'boolean'
      || !['consumption', 'ceilKg'].includes(item.quantityCalculationMode)
      || !Number.isFinite(item.costCoefficient) || item.costCoefficient <= 0)
      || colors.value.some(item => !categories.value.some(entry => entry.id === item.paintCategoryId))) {
      categories.value = []
      throw new Error('Не удалось загрузить свойства категорий краски. Повторите загрузку.')
    }
    if (!customerPainting.value && !calc.colorShieldId.value) {
      const available = categories.value.filter(item => colors.value.some(color => color.paintCategoryId === item.id))
      const initial = available.find(item => item.isCustomerSupplied === (calc.providesPaint.value === 'customer')) ?? available[0] ?? categories.value[0]
      category.value = initial?.id ?? null
      const first = colors.value.find(item => item.paintCategoryId === category.value)
      if (first) calc.colorShieldId.value = String(first.id)
    }
    category.value = selectedColor.value?.paintCategoryId ?? category.value ?? categories.value[0]?.id ?? null
    legacyCustomerPaint.value = calc.providesPaint.value === 'customer'
      && !!selectedColor.value && selectedCategory.value?.isCustomerSupplied === false
    if (!customerPainting.value && calc.providesPaint.value !== '' && selectedCategory.value?.isCustomerSupplied) calc.providesPaint.value = 'customer'
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
    <div role="group" aria-labelledby="paint-category-heading">
    <h2 id="paint-category-heading" class="text-center text-xl font-semibold mb-3">Категория краски</h2>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 p-1">
      <button v-for="item in categories" :key="item.id" type="button" class="paint-category-card"
        :data-paint-category="item.id" :aria-pressed="category === item.id"
        :disabled="loading" @click="onCategoryChange(item.id)">
        {{ item.name }}
      </button>
    </div>
    </div>
    <p v-if="legacyCustomerPaint" role="status" class="text-amber-700">В старом заказе краску «{{ selectedColor?.name }}» предоставляет заказчик. Выбор сохранён. Для замены выберите категорию и краску заново.</p>
    <p v-if="!loading && !filteredColors.length" role="status">В этой категории пока нет доступных красок.</p>
    <p v-if="loading">Загрузка красок…</p>
    <div v-if="error || catalogError" role="alert" class="text-red-600 whitespace-pre-line">
      {{ error || catalogError }}
      <B24Button v-if="catalogError" label="Повторить загрузку" color="air-secondary" @click="load" />
    </div>
    <p v-if="calculationWarning" role="status" class="text-amber-700 whitespace-pre-line">{{ calculationWarning }}</p>
    <div class="flex flex-col gap-5 px-1">
      <label class="flex flex-col gap-2">
        <span class="font-semibold">Краска</span>
        <B24SelectMenu
          data-testid="paint-color"
          :model-value="String(calc.colorShieldId.value)"
          :items="colorItems"
          value-key="id"
          placeholder="Выберите краску"
          class="w-full"
          :disabled="loading || !selectedCategory"
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
      <ProviderChoice name="providesPrimer" v-if="calc.primerId.value != null" v-model="calc.providesPrimer.value"
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

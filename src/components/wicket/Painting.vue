<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { getColorShield, recalculate, saveWicketData } from '../../app/api/wicket'
import type { ColorShieldItem } from '../../app/api/wicket'
import { createStepLeaveAttempt } from './stepLeaveAttempt'

const emit = defineEmits<{ (e: 'next'): void; (e: 'back'): void }>()
const calc = useCalculation()
const colors = ref<ColorShieldItem[]>([])
const loading = ref(true)
const submitted = ref(false)
const error = ref('')
const calculationWarning = ref('')
const selectedColor = computed(() => colors.value.find(item => String(item.id) === String(calc.colorShieldId.value)))
const individual = computed(() => selectedColor.value?.isFixedColor === false)
const primers = computed(() => selectedColor.value?.primers ?? [])
const colorItems = computed(() => {
  const groups = new Map<string, ColorShieldItem[]>()
  for (const item of colors.value) {
    const name = item.paintCategoryName ?? (item.isStandard === 0 ? 'Не стандартная' : 'Стандартная')
    groups.set(name, [...(groups.get(name) ?? []), item])
  }
  return [...groups.entries()].flatMap(([label, items]) => [
    { type: 'label' as const, label },
    ...items.map(item => ({ id: String(item.id), label: item.name })),
  ])
})
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
  const params = [{ name: 'Цвет рамы', value: calc.colorShieldName.value }]
  if (individual.value && calc.colorShieldNote.value.trim()) {
    params.push({ name: 'Примечание к цвету краски', value: calc.colorShieldNote.value.trim() })
  }
  if (primer) params.push({ name: 'Грунтовка', value: primer.name })
  calc.updateOrCreateBlock('Окраска', params)
}

async function save(): Promise<boolean> {
  if (loading.value) return false
  if (!selectedColor.value) {
    error.value = 'Выберите краску из списка.'
    return false
  }
  syncSelection()
  if (individual.value && !calc.colorShieldNote.value.trim()) return false
  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
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
  calc.colorShieldId.value = String(value ?? '')
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
  error.value = ''
  try {
    colors.value = (await getColorShield(calc.modelId.value)).colorShield
    if (!calc.colorShieldId.value && colors.value.length) calc.colorShieldId.value = String(colors.value[0]!.id)
    if (selectedColor.value) syncSelection()
    else error.value = 'Выбранная краска недоступна. Выберите краску из списка.'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить краски'
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
      <B24Button label="Далее" color="air-secondary" :disabled="loading" @click="next" />
    </div>
    <p v-if="loading">Загрузка красок…</p>
    <div v-if="error" role="alert" class="text-red-600 whitespace-pre-line">
      {{ error }}
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
    </div>
  </div>
</template>

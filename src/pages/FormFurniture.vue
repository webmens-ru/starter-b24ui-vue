<script setup lang="ts">
import type { SelectItem } from '@bitrix24/b24ui-nuxt'
import { computed, reactive, watch } from 'vue'
import * as yup from 'yup'
/*
 * import api from '../app/api'
 * Раскомментируйте, если нужно реальное API
 */

// Справочники (заглушки, заменить на реальные источники)
const goods = [
  { id: 1, name: 'Диван', type: 'Жилой', unit: 'шт', base_price: 10000, contractor: 'Поставщик А', cost_per_unit: 8000 },
  { id: 3, name: 'Стул', type: 'Жилой', unit: 'шт', base_price: 1000, contractor: 'Поставщик А', cost_per_unit: 800 },
  { id: 2, name: 'Стол', type: 'Офис', unit: 'компл', base_price: 5000, contractor: 'Поставщик Б', cost_per_unit: 4000 },
]
const dealType = 'Жилой' // тип застройки сделки, пример
const currencyList = ['руб', 'usd', 'eur']
const discountTypes = ['%', '₽']
const markupTypes = ['%', '₽']

const schema = yup.object({
  product: yup.number().nullable().default(undefined).required('Выберите товар'),
  quantity: yup.number().required('Укажите количество').min(1),
  discountValue: yup.number().required().default(0),
  discountType: yup.string().oneOf(discountTypes).required(),
  markupValue: yup.number().required().default(0),
  markupType: yup.string().oneOf(markupTypes).required(),
  // остальные поля — не редактируемые или вычисляются автоматически
})

type Schema = yup.InferType<typeof schema>
type FormSubmitEvent<T> = SubmitEvent & { data: T }

const state = reactive({
  product: undefined as number | undefined, // id товара
  quantity: 1,
  unit: '', // единица измерения
  discountValue: 0,
  discountType: '%',
  markupValue: 0,
  markupType: '%',
  finalPrice: 0,
  currency: 'руб',
  costPerUnit: '',
  totalCost: '',
  invoiceIssued: false,
  contractor: '',
  comment: '',
})

const filteredGoods = computed(() => goods.filter(g => !dealType || g.type === dealType))
const productItems = computed<SelectItem[]>(() => filteredGoods.value.map(g => ({ value: g.id.toString(), label: g.name })))
const selectedProduct = computed(() => filteredGoods.value.find(g => g.id.toString() === String(state.product ?? '')))

function recalcPrices() {
  const product = selectedProduct.value
  if (!product) {
    state.unit = ''
    state.finalPrice = 0
    state.costPerUnit = ''
    state.totalCost = ''
    state.contractor = ''
    return
  }

  state.unit = product.unit
  state.contractor = product.contractor
  state.costPerUnit = product.cost_per_unit?.toString() ?? ''

  const quantity = Number(state.quantity) || 0
  const discountVal = Number(state.discountValue) || 0
  const markupVal = Number(state.markupValue) || 0

  const discount = state.discountType === '%' ? (product.base_price * discountVal) / 100 : discountVal
  const markup = state.markupType === '%' ? (product.base_price * markupVal) / 100 : markupVal
  const unitPrice = Math.max(product.base_price - discount + markup, 0)

  state.finalPrice = Number((unitPrice * quantity).toFixed(2))
  state.totalCost = product.cost_per_unit
    ? Number((product.cost_per_unit * quantity).toFixed(2)).toString()
    : ''
}

watch([selectedProduct, () => state.quantity, () => state.discountValue, () => state.discountType, () => state.markupValue, () => state.markupType], recalcPrices, { immediate: true })

const toast = useToast()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  console.log(event.data)
  try {
    // await api.post('/furniture/send', event.data)
    toast.add({ title: 'Готово', description: 'Форма отправлена', color: 'air-primary-success' })
  } catch (error) {
    toast.add({ title: 'Ошибка', description: 'Ошибка при отправке', color: 'air-primary-alert' })
  }
}
</script>

<style scoped>
.form-field-400px {
  width: 400px !important;
  min-width: 400px !important;
  max-width: 400px !important;
}
.form-flex-row {
  display: flex;
  flex-direction: row;
  gap: 10px;
}
.flex-align-bottom {
  align-items: flex-end;
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
          class="form-field-400px"
          :style="{width: '400px'}"
          v-model="state.product"
          :items="productItems"
          placeholder="Выберите товар" />
      </B24FormField>
      <!-- Количество -->
      <B24FormField label="Количество" name="quantity" required>
        <B24Input class="form-field-400px" type="number" min="1" v-model="state.quantity" placeholder="1" />
      </B24FormField>
      <!-- Ед. измерения -->
      <B24FormField label="Ед. измерения" name="unit">
        <B24Input class="form-field-400px" v-model="state.unit" disabled placeholder="Авто из товара" />
      </B24FormField>
      <!-- Скидка и тип скидки: выравнивание по нижнему краю -->
      <div class="form-field-400px form-flex-row flex-align-bottom">
        <B24FormField label="Скидка" name="discountValue" required>
          <B24Input type="number" min="0" v-model="state.discountValue" placeholder="0" style="width:310px" />
        </B24FormField>
        <div style="flex:1;">
          <B24Select v-model="state.discountType" :items="discountTypes.map(t => ({ value: t, label: t }))" :style="{width: '100%'}" />
        </div>
      </div>
      <!-- Наценка и тип наценки: выравнивание по нижнему краю -->
      <div class="form-field-400px form-flex-row flex-align-bottom">
        <B24FormField label="Наценка" name="markupValue" required>
          <B24Input type="number" min="0" v-model="state.markupValue" placeholder="0" style="width:310px" />
        </B24FormField>
        <div style="flex:1;">
          <B24Select v-model="state.markupType" :items="markupTypes.map(t => ({ value: t, label: t }))" :style="{width: '100%'}" />
        </div>
      </div>
      <!-- Стоимость итоговая -->
      <B24FormField label="Стоимость итог" name="finalPrice">
        <B24Input class="form-field-400px" v-model="state.finalPrice" disabled placeholder="0" />
      </B24FormField>
      <!-- Валюта -->
      <B24FormField label="Валюта" name="currency" required>
        <B24Select class="form-field-400px" :style="{width: '400px'}" v-model="state.currency" :items="currencyList.map(c => ({ value: c, label: c }))" placeholder="Валюта" />
      </B24FormField>
      <!-- Себестоимость ед. -->
      <B24FormField label="Себестоимость ед." name="costPerUnit">
        <B24Input class="form-field-400px" v-model="state.costPerUnit" disabled placeholder="-" />
      </B24FormField>
      <!-- Себестоимость -->
      <B24FormField label="Себестоимость" name="totalCost">
        <B24Input class="form-field-400px" v-model="state.totalCost" disabled placeholder="-" />
      </B24FormField>
      <!-- Был выставлен счет -->
      <B24FormField label="Был выставлен счет" name="invoiceIssued">
        <B24Checkbox class="form-field-400px" v-model="state.invoiceIssued" />
      </B24FormField>
      <!-- Подрядчик -->
      <B24FormField label="Подрядчик" name="contractor">
        <B24Input class="form-field-400px" v-model="state.contractor" disabled placeholder="-" />
      </B24FormField>
      <!-- Комментарий -->
      <B24FormField label="Комментарий" name="comment">
        <B24Textarea class="form-field-400px" v-model="state.comment" placeholder="Комментарий по заказу..." />
      </B24FormField>
      <B24Button class="form-field-400px" color="air-primary" type="submit">Сохранить</B24Button>
    </B24Form>
  </B24App>
</template>
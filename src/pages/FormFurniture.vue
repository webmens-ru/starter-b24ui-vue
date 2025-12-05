<script setup lang="ts">
import type { FormSubmitEvent } from '@bitrix24/b24ui-nuxt'
import { reactive } from 'vue'
import * as yup from 'yup'
// import api from '../app/api' // Раскомментируйте, если нужно реальное API

// Справочники (заглушки, заменить на реальные источники)
const goods = [
  { id: 1, name: 'Диван', type: 'Жилой', unit: 'шт', base_price: 10000, contractor: 'Поставщик А', cost_per_unit: 8000 },
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

const state = reactive({
  product: undefined as number | undefined, // id товара
  quantity: 1,
  unit: '', // единица измерения
  discountValue: 0,
  discountType: '%',
  markupValue: 0,
  markupType: '%',
  baseUnitPrice: 0,
  finalPrice: 0,
  currency: 'руб',
  costPerUnit: '',
  totalCost: '',
  invoiceIssued: false,
  contractor: '',
  comment: '',
})
// Реактивные вычисления и обработчики будут ниже

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
          :options="goods
            .filter(g => !dealType || g.type === dealType)
            .map(g => ({ value: g.id, label: g.name }))"
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
      <!-- Скидка число -->
      <B24FormField label="Скидка" name="discountValue" required>
        <B24Input class="form-field-400px" type="number" min="0" v-model="state.discountValue" placeholder="0" />
      </B24FormField>
      <!-- Скидка тип -->
      <B24FormField label="Тип скидки" name="discountType" required>
        <B24Select class="form-field-400px" :style="{width: '400px'}" v-model="state.discountType" :options="discountTypes.map(t => ({ value: t, label: t }))" />
      </B24FormField>
      <!-- Наценка число -->
      <B24FormField label="Наценка" name="markupValue" required>
        <B24Input class="form-field-400px" type="number" min="0" v-model="state.markupValue" placeholder="0" />
      </B24FormField>
      <!-- Наценка тип -->
      <B24FormField label="Тип наценки" name="markupType" required>
        <B24Select class="form-field-400px" :style="{width: '400px'}" v-model="state.markupType" :options="markupTypes.map(t => ({ value: t, label: t }))" />
      </B24FormField>
      <!-- Стоимость ед базовая --!>
      <B24FormField label="Стоимость ед. базовая" name="baseUnitPrice">
        <B24Input class="form-field-400px" v-model="state.baseUnitPrice" disabled placeholder="0" />
      </B24FormField>
      <!-- Стоимость итоговая -->
      <B24FormField label="Стоимость итог" name="finalPrice">
        <B24Input class="form-field-400px" v-model="state.finalPrice" disabled placeholder="0" />
      </B24FormField>
      <!-- Валюта -->
      <B24FormField label="Валюта" name="currency" required>
        <B24Select class="form-field-400px" :style="{width: '400px'}" v-model="state.currency" :options="currencyList.map(c => ({ value: c, label: c }))" placeholder="Валюта" />
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
        <B24Input class="form-field-400px" v-model="state.comment" type="text" placeholder="Комментарий по заказу..." />
      </B24FormField>
      <B24Button class="form-field-400px" color="air-primary" type="submit">Отправить</B24Button>
    </B24Form>
  </B24App>
</template>
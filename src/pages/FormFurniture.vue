<script setup lang="ts">
import type { SelectItem } from '@bitrix24/b24ui-nuxt'
import { computed, reactive, watch } from 'vue'
import * as yup from 'yup'
import { setLocale } from 'yup'
import Expand1Icon from '@bitrix24/b24icons-vue/actions/Expand1Icon'
/*
 * import api from '../app/api'
 * Раскомментируйте, если нужно реальное API
 */

// Справочники (заглушки, заменить на реальные источники)
const currencyList = ['руб', 'usd', 'eur'] as const
type Currency = (typeof currencyList)[number]

type Good = {
  id: number
  name: string
  type: string
  unit: string
  base_price: number
  priceByCurrency: Record<Currency, number>
  contractor: string
  cost_per_unit: number
  costByCurrency: Record<Currency, number>
}

const goods: Good[] = [
  {
    id: 1,
    name: 'Услуга организации электроподключения 10 кВт, 220в/ 380в',
    type: 'Жилой',
    unit: 'шт',
    base_price: 10000,
    priceByCurrency: { руб: 10000, usd: 120, eur: 110 },
    contractor: 'Поставщик А',
    cost_per_unit: 8000,
    costByCurrency: { руб: 8000, usd: 96, eur: 88 },
  },
  {
    id: 3,
    name: 'Стул',
    type: 'Жилой',
    unit: 'шт',
    base_price: 1000,
    priceByCurrency: { руб: 1000, usd: 12, eur: 11 },
    contractor: 'Поставщик А',
    cost_per_unit: 800,
    costByCurrency: { руб: 800, usd: 9.6, eur: 8.8 },
  },
  {
    id: 2,
    name: 'Стол',
    type: 'Офис',
    unit: 'компл',
    base_price: 5000,
    priceByCurrency: { руб: 5000, usd: 60, eur: 55 },
    contractor: 'Поставщик Б',
    cost_per_unit: 4000,
    costByCurrency: { руб: 4000, usd: 48, eur: 44 },
  },
]
const dealType = 'Жилой' // тип застройки сделки, пример
const dealCurrency: Currency = 'руб' // валюта сделки (пример)
const discountTypes = ['%', '₽']
const markupTypes = ['%', '₽']

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

const trailingIcon = Expand1Icon

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
  currency: 'руб' as Currency,
  costPerUnit: '',
  totalCost: '',
  invoiceIssued: false,
  contractor: '',
  comment: '',
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

const filteredGoods = computed(() => goods.filter(g => !dealType || g.type === dealType))
const productItems = computed<SelectItem[]>(() => {
  const currency = state.currency

  return filteredGoods.value.map(g => ({
    value: g.id.toString(),
    label: g.name,
    goodType: g.type,
    unit: g.unit,
    contractor: g.contractor,
    price: g.priceByCurrency?.[currency] ?? g.base_price,
    currency,
  }))
})
const selectedProduct = computed(() => filteredGoods.value.find(g => g.id.toString() === String(state.product ?? '')))
const isCurrencyMismatch = computed(() => state.currency !== dealCurrency)
const isFinalOverCost = computed(() => {
  const final = Number(state.finalPrice) || 0
  const cost = Number(state.totalCost) || 0
  return cost > 0 && final < cost
})

watch(
  () => state.quantity,
  val => {
    const value = val as unknown
    if ((typeof value === 'string' && value.trim() === '') || value === null || Number.isNaN(Number(value))) {
      state.quantity = 1
    }
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
  const currency = state.currency
  const basePrice = product.priceByCurrency?.[currency] ?? product.base_price
  const costPerUnit = product.costByCurrency?.[currency] ?? product.cost_per_unit
  state.costPerUnit = costPerUnit?.toString() ?? ''

  const quantity = Number(state.quantity) || 0
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
  state.totalCost = costPerUnit
    ? Number((costPerUnit * quantity).toFixed(2)).toString()
    : ''
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
  ],
  recalcPrices,
  { immediate: true },
)

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
          :style="{width: '600px'}"
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
          <template #item-label="{ item }">
            <template v-if="item">
              <div class="flex flex-col gap-1">
                <span class="font-medium">{{ (item as ProductItem).label }}</span>
              </div>
            </template>
          </template>
        </B24Select>
      </B24FormField>
      <!-- Количество и ед. измерения в одну строку -->
      <div class="form-field-600px form-flex-row flex-align-bottom">
        <B24FormField label="Количество" name="quantity" required style="flex:1;">
          <B24Input type="number" min="1" v-model="state.quantity" placeholder="1" style="width: 400px" />
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
          <B24Select v-model="state.discountType" :items="discountTypes.map(t => ({ value: t, label: t }))" :style="{width: '190px'}" />
        </div>
      </div>
      <!-- Наценка и тип наценки: выравнивание по нижнему краю -->
      <div class="form-field-600px form-flex-row flex-align-bottom">
        <B24FormField label="Наценка" name="markupValue" required>
          <B24Input type="number" min="0" v-model="state.markupValue" placeholder="0" style="width:400px" />
        </B24FormField>
        <div style="width: 190px;">
          <B24Select v-model="state.markupType" :items="markupTypes.map(t => ({ value: t, label: t }))" :style="{width: '190px'}" />
        </div>
      </div>
      <div class="form-field-600px form-flex-row flex-align-bottom">
        <!-- Стоимость итоговая -->
        <B24FormField label="Стоимость итог" name="finalPrice">
          <B24Input
            :class="isFinalOverCost ? 'input-danger' : ''"
            v-model="state.finalPrice"
            disabled
            placeholder="0"
            style="width:400px"
          />
        </B24FormField>
        <div style="flex:1;">
          <B24FormField label="Валюта" name="currency" required>
            <B24Select
              v-model="state.currency"
              :items="currencyList.map(c => ({ value: c, label: c }))"
              :class="isCurrencyMismatch ? 'input-danger' : ''"
              :style="{width:'190px'}"
              placeholder="Валюта"
            />
          </B24FormField>
        </div>
      </div>
      <!-- Себестоимость ед. -->
      <B24FormField label="Себестоимость ед." name="costPerUnit">
        <B24Input class="form-field-600px" v-model="state.costPerUnit" disabled placeholder="-" />
      </B24FormField>
      <!-- Себестоимость -->
      <B24FormField label="Себестоимость" name="totalCost">
        <B24Input class="form-field-600px" v-model="state.totalCost" disabled placeholder="-" />
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
      <B24Button class="form-field-600px" color="air-primary" type="submit">Сохранить</B24Button>
    </B24Form>
  </B24App>
</template>
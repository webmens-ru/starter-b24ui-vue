<script setup lang="ts">
import type { SelectItem } from '@bitrix24/b24ui-nuxt'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import * as yup from 'yup'
import { setLocale } from 'yup'
import { currencyList, type Currency, type Good, fetchGoods } from '../app/api/goods'
import api from '../app/api'
import goodsStubJson from '../data/goodsStub.json'
import discountTypeDirectoryJson from '../data/discountTypeDirectory.json'
import markupTypeDirectoryJson from '../data/markupTypeDirectory.json'
import currencyDirectoryJson from '../data/currencyDirectory.json'

const widgetParams = typeof window !== 'undefined' ? (window as any)._PARAMS_ : undefined
const placementParams = widgetParams?.placementOptions?.params ?? {}
const dealTypeBuildingId = placementParams.dealTypeBuildingId ?? 1
const productTypeId = placementParams.productTypeId
const recordId = placementParams.recordId ?? placementParams.id
const dealId = placementParams.dealId

type DirectoryItem = { id: number; title: string }

const goodsStub = goodsStubJson as Good[]
const discountTypeDirectory = discountTypeDirectoryJson as DirectoryItem[]
const markupTypeDirectory = markupTypeDirectoryJson as DirectoryItem[]
const currencyDirectory = currencyDirectoryJson as DirectoryItem[]
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
  currency: 'руб' as Currency, // храним код валюты
  costPerUnit: '',
  totalCost: '',
  invoiceIssued: false,
  contractor: '',
  comment: '',
  autoRecalc: true,
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
const filteredGoods = computed<Good[]>(() => allGoods.value)
const productItems = computed<SelectItem[]>(() => {
  return filteredGoods.value.map((g: Good) => ({
    value: g.id.toString(),
    label: g.title,
    goodType: g.type?.title ?? '',
    unit: g.unit?.title ?? '',
    contractor: g.contractor?.title ?? '',
    price: state.currency === 'руб' ? g.price_rub : state.currency === 'usd' ? g.price_usd : g.price_eur,
    currency: state.currency,
  }))
})
const selectedProduct = computed<Good | undefined>(() =>
  filteredGoods.value.find((g: Good) => g.id.toString() === String(state.product ?? '')),
)
const isCurrencyMismatch = computed(() => state.currency !== dealCurrency)
const isFinalOverCost = computed(() => {
  const final = Number(state.finalPrice) || 0
  const cost = Number(state.totalCost) || 0
  return cost > 0 && final < cost
})

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
    const options = currencyOptions.value ?? []
    const first = options[0]
    if (options.length && first && !options.some((o: SelectItem) => (o as any).value === state.currency)) {
      state.currency = (first as any).value as Currency
    }
  },
  { immediate: true },
)

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

  state.unit = product.unit?.title ?? ''
  state.contractor = product.contractor?.title ?? ''
  const currency = state.currency
  const basePrice = currency === 'руб' ? product.price_rub : currency === 'usd' ? product.price_usd : product.price_eur
  // Себестоимость у нас только в рублях, используем её без пересчёта
  const costPerUnit = product.cost_per_unit
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
  () => {
    if (!state.autoRecalc) return
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
async function loadDetail() {
  if (!recordId) return

  detailLoading.value = true
  try {
    const response = await api.get(`/api/sp1222/get/id=${recordId}`)
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

    recalcPrices()
  } catch (error) {
    console.warn('[load detail error]', error)
    toast.add({ title: 'Ошибка', description: 'Не удалось загрузить данные', color: 'air-primary-alert' })
  } finally {
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
  const costPerUnit = product?.cost_per_unit ?? 0
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
              :items="currencyOptions"
              :class="isCurrencyMismatch ? 'input-danger' : ''"
              :style="{width:'190px'}"
              :b24ui="{
              content: 'max-w-[185px]',
              viewport: 'max-w-[185px]',
              item: 'max-w-[185px]',
            }"
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
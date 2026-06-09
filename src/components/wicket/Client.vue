<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import {
  saveWicketData,
  saveOrderData,
  saveClientInfo,
  getAddressSuggestions,
} from '../../app/api/wicket'
import * as yup from 'yup'

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

// ─── Поля формы ──────────────────────────────────────────────────────────────
const calculationName = ref('')
const clientName      = ref('')
const clientLastName  = ref('')
const clientSurname   = ref('')
const countryCode     = ref('+7')
const phone           = ref('')
const clientEmail     = ref('')
const address         = ref('')
const clientComment   = ref('')

// ─── Ошибки ──────────────────────────────────────────────────────────────────
const errName  = ref('')
const errPhone = ref('')
const errEmail = ref('')

// ─── Yup схема ───────────────────────────────────────────────────────────────
const schema = yup.object({
  clientName:  yup.string().nullable(),
  phone:       yup.string().nullable().test(
    'digits',
    'Введите корректный номер (10 цифр)',
    v => !v || (v ?? '').replace(/\D/g, '').length === 0 || (v ?? '').replace(/\D/g, '').length === 10,
  ),
  clientEmail: yup.string().email('Некорректный email').nullable(),
})

type FieldName = 'clientName' | 'phone' | 'clientEmail'
const errRefs: Record<FieldName, typeof errName> = {
  clientName:  errName,
  phone:       errPhone,
  clientEmail: errEmail,
}

async function validateField(field: FieldName, value: string) {
  try {
    await schema.validateAt(field, { [field]: value || null })
    errRefs[field].value = ''
  } catch (e: any) {
    errRefs[field].value = e.message
  }
}

async function validateAll(): Promise<boolean> {
  try {
    await schema.validate(
      { clientName: clientName.value, phone: phone.value, clientEmail: clientEmail.value || null },
      { abortEarly: false },
    )
    errName.value = errPhone.value = errEmail.value = ''
    return true
  } catch (e: any) {
    errName.value = errPhone.value = errEmail.value = ''
    for (const err of e.inner as yup.ValidationError[]) {
      if (err.path && err.path in errRefs) errRefs[err.path as FieldName].value = err.message
    }
    return false
  }
}

// ─── Телефонная маска ─────────────────────────────────────────────────────────
function applyPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  let result = ''
  if (digits.length > 0) result += '(' + digits.slice(0, 3)
  if (digits.length >= 3) result += ') '
  if (digits.length >= 4) result += digits.slice(3, 6)
  if (digits.length >= 6) result += '-' + digits.slice(6, 8)
  if (digits.length >= 8) result += '-' + digits.slice(8, 10)
  return result
}

function onPhoneInput(e: Event) {
  const input = e.target as HTMLInputElement
  const raw = input.value
  const masked = applyPhoneMask(raw)
  phone.value = masked
  input.value = masked
  debouncedSync()
}

function onPhoneKeydown(e: KeyboardEvent) {
  if (e.key === 'Backspace') {
    e.preventDefault()
    const digits = phone.value.replace(/\D/g, '')
    phone.value = applyPhoneMask(digits.slice(0, -1))
    debouncedSync()
  }
}

const VALID_CODES = ['+1', '+7', '+31', '+33', '+44', '+49', '+380', '+375']

function onCountryCodeBlur() {
  if (!VALID_CODES.includes(countryCode.value)) {
    openModal('Неверный код страны!')
    countryCode.value = ''
  }
}

// ─── Подсказки адреса ─────────────────────────────────────────────────────────
const suggestions      = ref<string[]>([])
const showSuggestions  = ref(false)
let   suggestTimer: ReturnType<typeof setTimeout> | null = null

async function onAddressInput() {
  if (suggestTimer) clearTimeout(suggestTimer)
  const q = address.value
  if (q.length < 3) {
    suggestions.value    = []
    showSuggestions.value = false
    debouncedSync()
    return
  }
  suggestTimer = setTimeout(async () => {
    try {
      const res = await getAddressSuggestions(q)
      suggestions.value    = res.suggestions.map(s => s.value)
      showSuggestions.value = suggestions.value.length > 0
    } catch {
      suggestions.value    = []
      showSuggestions.value = false
    }
    debouncedSync()
  }, 300)
}

function selectSuggestion(val: string) {
  address.value         = val
  showSuggestions.value = false
  syncCalcFields()
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.address-wrapper')) {
    showSuggestions.value = false
  }
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
let syncTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSync() {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => syncCalcFields(), 500)
}

// ─── Синхронизация ───────────────────────────────────────────────────────────
function syncCalcFields() {
  calc.calculationName.value = calculationName.value
  calc.clientName.value      = clientName.value
  calc.clientLastName.value  = clientLastName.value
  calc.clientSurname.value   = clientSurname.value
  calc.clientPhone.value     = countryCode.value + ' ' + phone.value
  calc.clientEmail.value     = clientEmail.value
  calc.clientAddress.value   = address.value
  calc.clientComment.value   = clientComment.value
  calc.countryCode.value     = countryCode.value

  calc.updateOrCreateBlock('Клиент', [
    { name: 'Название расчета', value: calc.calculationName.value },
    { name: 'Имя',             value: calc.clientName.value },
    { name: 'Фамилия',         value: calc.clientLastName.value },
    { name: 'Отчество',        value: calc.clientSurname.value },
    { name: 'Телефон',         value: calc.clientPhone.value },
    { name: 'Эл. почта',       value: calc.clientEmail.value },
    { name: 'Адрес',           value: calc.clientAddress.value },
    { name: 'Комментарий',     value: calc.clientComment.value },
  ])
}

async function handleNext() {
  syncCalcFields()
  if (!(await validateAll())) return

  const clientPhoneRaw = calc.clientPhone.value || ''
  const clientPhoneValue =
    clientPhoneRaw.replace(/\D/g, '').length >= 10 ? clientPhoneRaw : ''

  const payload = {
    ...calc.getBaseSavePayload(),
    calculationName:   calc.calculationName.value,
    clientName:        calc.clientName.value,
    clientLastName:   calc.clientLastName.value,
    clientSurname:     calc.clientSurname.value,
    clientPhone: clientPhoneValue,
    clientEmail:       calc.clientEmail.value,
    clientAddress:     calc.clientAddress.value,
    clientComment:     calc.clientComment.value,
  }

  const clientFilled =
    clientPhoneValue !== '' ||
    (payload.clientName || '').trim() !== '' ||
    (payload.clientLastName || '').trim() !== '' ||
    (payload.clientSurname || '').trim() !== '' ||
    (payload.clientEmail || '').trim() !== '' ||
    (payload.clientAddress || '').trim() !== '' ||
    (payload.clientComment || '').trim() !== ''

  try {
    await saveWicketData(payload)
    await saveOrderData({ orderId: payload.orderId, calculationName: payload.calculationName })
    if (clientFilled) {
      await saveClientInfo(payload)
    }
  } catch (e) {
    console.warn('saveClientData:', e)
  }

  emit('next')
}

// ─── Монтирование ─────────────────────────────────────────────────────────────
onMounted(() => {
  calc.setActivePage('page11')

  calculationName.value = calc.calculationName.value
  clientName.value      = calc.clientName.value
  clientLastName.value  = calc.clientLastName.value
  clientSurname.value   = calc.clientSurname.value
  clientEmail.value     = calc.clientEmail.value
  address.value         = calc.clientAddress.value
  clientComment.value   = calc.clientComment.value

  if (calc.countryCode.value) countryCode.value = calc.countryCode.value
  if (calc.clientPhone.value) {
    const parts = calc.clientPhone.value.split(' ')
    if (parts.length > 1) phone.value = parts.slice(1).join(' ')
  }

  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <div class="flex flex-col gap-4 h-full">

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
      <span class="text-2xl font-bold flex-1 text-center">Клиент</span>
      <B24Button label="Далее" color="air-secondary" @click="handleNext" />
    </div>

    <div class="flex flex-col gap-4 flex-1 overflow-y-auto" style="padding-inline: 4px;">

      <!-- Название расчёта -->
      <div class="flex flex-col gap-1">
        <label class="font-semibold text-sm">Название расчета:</label>
        <input
          v-model="calculationName"
          type="text"
          placeholder="Введите название расчета"
          class="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          @input="debouncedSync"
        />
      </div>

      <!-- Имя -->
      <div class="flex flex-col gap-1">
        <label class="font-semibold text-sm">Имя:</label>
        <input
          v-model="clientName"
          type="text"
          placeholder="Введите имя"
          class="w-full border rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          :class="errName ? 'border-red-500' : 'border-gray-300'"
          @blur="validateField('clientName', clientName)"
          @input="errName ? validateField('clientName', clientName) : debouncedSync()"
        />
        <span v-if="errName" class="text-xs text-red-500">{{ errName }}</span>
      </div>

      <!-- Фамилия -->
      <div class="flex flex-col gap-1">
        <label class="font-semibold text-sm">Фамилия:</label>
        <input
          v-model="clientLastName"
          type="text"
          placeholder="Введите фамилию"
          class="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          @input="debouncedSync"
        />
      </div>

      <!-- Отчество -->
      <div class="flex flex-col gap-1">
        <label class="font-semibold text-sm">Отчество:</label>
        <input
          v-model="clientSurname"
          type="text"
          placeholder="Введите отчество"
          class="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          @input="debouncedSync"
        />
      </div>

      <!-- Телефон -->
      <div class="flex flex-col gap-1">
        <label class="font-semibold text-sm">Телефон:</label>
        <div class="flex gap-2">
          <input
            v-model="countryCode"
            type="text"
            list="country-codes"
            placeholder="+7"
            style="width: 70px; text-align: center;"
            class="border border-gray-300 rounded px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
            @blur="onCountryCodeBlur"
          />
          <datalist id="country-codes">
            <option value="+7">Россия / Казахстан</option>
            <option value="+375">Беларусь</option>
          </datalist>
          <input
            :value="phone"
            type="text"
            placeholder="(___) ___-__-__"
            class="flex-1 border rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
            :class="errPhone ? 'border-red-500' : 'border-gray-300'"
            @input="onPhoneInput"
            @keydown="onPhoneKeydown"
            @blur="validateField('phone', phone)"
          />
        </div>
        <span v-if="errPhone" class="text-xs text-red-500">{{ errPhone }}</span>
      </div>

      <!-- Эл. почта -->
      <div class="flex flex-col gap-1">
        <label class="font-semibold text-sm">Электронная почта:</label>
        <input
          v-model="clientEmail"
          type="email"
          placeholder="Введите электронную почту"
          class="w-full border rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          :class="errEmail ? 'border-red-500' : 'border-gray-300'"
          @blur="validateField('clientEmail', clientEmail)"
          @input="errEmail ? validateField('clientEmail', clientEmail) : debouncedSync()"
        />
        <span v-if="errEmail" class="text-xs text-red-500">{{ errEmail }}</span>
      </div>

      <!-- Адрес с подсказками -->
      <div class="flex flex-col gap-1 address-wrapper relative">
        <label class="font-semibold text-sm">Адрес:</label>
        <input
          v-model="address"
          type="text"
          placeholder="Введите адрес полностью"
          autocomplete="off"
          class="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          @input="onAddressInput"
        />
        <ul
          v-if="showSuggestions"
          class="absolute top-full left-0 right-0 z-50 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto"
        >
          <li
            v-for="s in suggestions"
            :key="s"
            class="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
            @mousedown.prevent="selectSuggestion(s)"
          >
            {{ s }}
          </li>
        </ul>
      </div>

      <!-- Комментарий -->
      <div class="flex flex-col gap-1">
        <label class="font-semibold text-sm">Комментарий:</label>
        <textarea
          v-model="clientComment"
          rows="4"
          placeholder="Ваш комментарий"
          class="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
          @input="debouncedSync"
        />
      </div>

    </div>
  </div>
</template>

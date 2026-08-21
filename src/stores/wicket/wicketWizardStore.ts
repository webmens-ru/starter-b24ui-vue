import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * Сессия мастера калитки: заказ, модель, шаги.
 * Отделено от полей формы — другие изделия могут иметь свой wizard-store.
 */
export const useWicketWizardStore = defineStore('wicket-wizard', () => {
  const orderId = ref<number | null>(null)
  const orderItemId = ref<number | null>(null)
  /** @deprecated Use orderId. Kept until all legacy consumers migrate. */
  const number = computed<string | number>({
    get: () => orderId.value ?? '',
    set: (value) => {
      orderId.value = value === '' ? null : Number(value)
    },
  })
  const modelId = ref<string | number>('')
  const productType = ref<string>('')
  const model = ref<string>('')
  const activePage = ref<string>('page1')
  const visitedPages = ref<string[]>([])

  function setActivePage(page: string) {
    if (!visitedPages.value.includes(page)) {
      visitedPages.value.push(page)
    }
    activePage.value = page
    document.dispatchEvent(new Event('updatedActivePage'))
  }

  function isPageAccessible(page: string) {
    return visitedPages.value.includes(page) || activePage.value === page
  }

  function resetSession() {
    orderId.value = null
    orderItemId.value = null
    modelId.value = ''
    productType.value = ''
    model.value = ''
    visitedPages.value = []
    activePage.value = 'page1'
  }

  return {
    number,
    orderId,
    orderItemId,
    modelId,
    productType,
    model,
    activePage,
    visitedPages,
    setActivePage,
    isPageAccessible,
    resetSession,
  }
})

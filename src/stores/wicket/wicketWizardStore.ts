import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Сессия мастера калитки: заказ, модель, шаги.
 * Отделено от полей формы — другие изделия могут иметь свой wizard-store.
 */
export const useWicketWizardStore = defineStore('wicket-wizard', () => {
  const number = ref<string | number>('')
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
    number.value = ''
    modelId.value = ''
    productType.value = ''
    model.value = ''
    visitedPages.value = []
    activePage.value = 'page1'
  }

  return {
    number,
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

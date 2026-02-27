import { ref } from 'vue'

const modelId = ref<string | number>('')
const activePage = ref<string>('page1')
const visitedPages = ref<string[]>([])

export function useCalculation() {
  function setActivePage(page: string) {
    activePage.value = page
    document.dispatchEvent(new Event('updatedActivePage'))
  }

  function markVisited(page: string) {
    if (!visitedPages.value.includes(page)) {
      visitedPages.value.push(page)
    }
  }

  function isPageAccessible(page: string) {
    return visitedPages.value.includes(page) || activePage.value === page
  }

  return {
    modelId,
    activePage,
    visitedPages,
    setActivePage,
    markVisited,
    isPageAccessible,
  }
}

import { defineStore } from 'pinia'
import { ref } from 'vue'

import { getLocks, type LockSetListItem } from '../../app/api/wicket'

/** Shared lock-set catalog for wizard bootstrap and the lock selection step. */
export const useWicketLockCatalogStore = defineStore('wicket-lock-catalog', () => {
  const items = ref<LockSetListItem[]>([])
  const loadedModelId = ref<number | null>(null)
  const loading = ref(false)
  let pendingModelId: number | null = null
  let pendingRequest: Promise<LockSetListItem[]> | null = null

  async function load(modelId: number): Promise<LockSetListItem[]> {
    if (loadedModelId.value === modelId) return items.value
    if (pendingRequest && pendingModelId === modelId) return pendingRequest

    loading.value = true
    pendingModelId = modelId
    const request = getLocks(modelId)
      .then(response => {
        if (pendingRequest === request) {
          items.value = response.items
          loadedModelId.value = modelId
        }
        return response.items
      })
      .catch(error => {
        if (pendingRequest === request) {
          items.value = []
          loadedModelId.value = null
        }
        throw error
      })
      .finally(() => {
        if (pendingRequest === request) {
          loading.value = false
          pendingModelId = null
          pendingRequest = null
        }
      })
    pendingRequest = request
    return request
  }

  return { items, loadedModelId, loading, load }
})

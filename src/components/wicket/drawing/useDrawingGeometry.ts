import { computed } from 'vue'

/** Never substitute guessed geometry when the API contract is unavailable. */
export function useDrawingGeometry<T>(compute: () => T) {
  const state = computed(() => {
    try {
      return { value: compute(), error: '' }
    } catch (error) {
      return { value: null, error: error instanceof Error ? error.message : 'Не удалось построить чертёж.' }
    }
  })
  const error = computed(() => state.value.error)
  const geometry = computed(() => {
    if (state.value.value === null) throw new Error(state.value.error)
    return state.value.value
  })
  return { geometry, error }
}

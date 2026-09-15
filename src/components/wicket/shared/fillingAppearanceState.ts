import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { useCalculation } from '../../../composables/useCalculation'

export type FillingSide = 'facade' | 'yard'

export interface FillingAppearanceSnapshot {
  manufacturerId: string | number | null
  manufacturer: string
  colorId: string | number | null
  color: string
  colorHex: string
  colorImage: string
}

type Calculation = ReturnType<typeof useCalculation>

export interface FillingAppearanceAttempt {
  generation: number
  snapshot: FillingAppearanceSnapshot
}

export interface FillingAppearanceSaveCoordinator {
  saving: ComputedRef<boolean>
  failed: Ref<boolean>
  beginRevision: () => FillingAppearanceAttempt
  beginSave: () => FillingAppearanceAttempt
  recordSuccess: (attempt: FillingAppearanceAttempt) => boolean
  recordFailure: (attempt: FillingAppearanceAttempt) => boolean
  finishSave: () => void
  resetToCurrent: () => void
  getFailedSnapshot: () => FillingAppearanceSnapshot | null
}

export function captureFillingAppearance(
  calc: Calculation,
  side: FillingSide,
): FillingAppearanceSnapshot {
  return side === 'facade'
    ? {
        manufacturerId: calc.manufacturerFacadeId.value,
        manufacturer: calc.materialSupplierFacade.value,
        colorId: calc.colorFacadeId.value,
        color: calc.colorFacade.value,
        colorHex: calc.colorFacadeHex.value,
        colorImage: calc.colorFacadeImage.value,
      }
    : {
        manufacturerId: calc.manufacturerYardId.value,
        manufacturer: calc.materialSupplierYard.value,
        colorId: calc.colorYardId.value,
        color: calc.colorYard.value,
        colorHex: calc.colorYardHex.value,
        colorImage: calc.colorYardImage.value,
      }
}

export function restoreFillingAppearance(
  calc: Calculation,
  side: FillingSide,
  snapshot: FillingAppearanceSnapshot,
): void {
  if (side === 'facade') {
    calc.manufacturerFacadeId.value = snapshot.manufacturerId
    calc.materialSupplierFacade.value = snapshot.manufacturer
    calc.colorFacadeId.value = snapshot.colorId
    calc.colorFacade.value = snapshot.color
    calc.colorFacadeHex.value = snapshot.colorHex
    calc.colorFacadeImage.value = snapshot.colorImage
    return
  }

  calc.manufacturerYardId.value = snapshot.manufacturerId
  calc.materialSupplierYard.value = snapshot.manufacturer
  calc.colorYardId.value = snapshot.colorId
  calc.colorYard.value = snapshot.color
  calc.colorYardHex.value = snapshot.colorHex
  calc.colorYardImage.value = snapshot.colorImage
}

export function createFillingAppearanceSaveCoordinator(
  calc: Calculation,
  side: FillingSide,
): FillingAppearanceSaveCoordinator {
  const pendingSaves = ref(0)
  const failed = ref(false)
  const saving = computed(() => pendingSaves.value > 0)
  let generation = 0
  let persisted = captureFillingAppearance(calc, side)
  let failedSnapshot: FillingAppearanceSnapshot | null = null

  function nextAttempt(): FillingAppearanceAttempt {
    return {
      generation: ++generation,
      snapshot: captureFillingAppearance(calc, side),
    }
  }

  function beginRevision(): FillingAppearanceAttempt {
    failed.value = false
    failedSnapshot = null
    return nextAttempt()
  }

  function beginSave(): FillingAppearanceAttempt {
    pendingSaves.value += 1
    return beginRevision()
  }

  function recordSuccess(attempt: FillingAppearanceAttempt): boolean {
    // API root saves are serialized. Every successful completion therefore
    // advances the rollback baseline, while only the newest UI attempt may
    // alter visible state or navigation flags.
    persisted = attempt.snapshot
    if (attempt.generation !== generation) return false

    restoreFillingAppearance(calc, side, attempt.snapshot)
    failedSnapshot = null
    failed.value = false
    return true
  }

  function recordFailure(attempt: FillingAppearanceAttempt): boolean {
    if (attempt.generation !== generation) return false

    restoreFillingAppearance(calc, side, persisted)
    failedSnapshot = attempt.snapshot
    failed.value = true
    return true
  }

  function finishSave(): void {
    pendingSaves.value = Math.max(0, pendingSaves.value - 1)
  }

  function resetToCurrent(): void {
    generation += 1
    persisted = captureFillingAppearance(calc, side)
    failedSnapshot = null
    failed.value = false
  }

  function getFailedSnapshot(): FillingAppearanceSnapshot | null {
    return failedSnapshot === null ? null : { ...failedSnapshot }
  }

  return {
    saving,
    failed,
    beginRevision,
    beginSave,
    recordSuccess,
    recordFailure,
    finishSave,
    resetToCurrent,
    getFailedSnapshot,
  }
}

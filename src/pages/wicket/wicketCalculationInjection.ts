import { inject, type InjectionKey } from 'vue'
import { useCalculation } from '../../composables/useCalculation'

export type WicketCalculationApi = ReturnType<typeof useCalculation>

export const WICKET_CALCULATION_KEY: InjectionKey<WicketCalculationApi> = Symbol('wicketCalculation')

/**
 * Контекст калькуляции из provide (WicketWizardPage) или fallback на глобальные сторы.
 * Постепенно можно переводить шаги с прямого useCalculation() на этот вызов.
 */
export function useWicketCalculation(): WicketCalculationApi {
  return inject(WICKET_CALCULATION_KEY, useCalculation())
}

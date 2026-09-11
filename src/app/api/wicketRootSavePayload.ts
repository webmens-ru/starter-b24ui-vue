import type { WicketSavePayload } from './wicket.types'

/** Legacy handles are no longer part of a selected lock set. */
export function canonicalizeWicketRootSavePayload(
  payload: WicketSavePayload,
): WicketSavePayload {
  return {
    ...payload,
    lockPenId: null,
    lockPenColorId: null,
  }
}

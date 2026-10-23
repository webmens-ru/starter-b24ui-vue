import { parseOptionPresence, type OptionPresenceSelection } from '../optionPresence'

/** Old captions are decoded only when the existing numeric property is absent. */
export function readPenPresence(response: Record<string, unknown>): OptionPresenceSelection {
  const raw = response.isTherePen
  if (raw !== null && raw !== undefined && raw !== '') return parseOptionPresence(raw)
  switch (response.isTherePenName) {
    case 'Будет': return 1
    case 'Не будет': return 0
    case null:
    case undefined:
    case '': return 0
    default: return null
  }
}

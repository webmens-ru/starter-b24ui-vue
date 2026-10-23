import type { WicketSavePayload } from './wicket.types'

/** Remove legacy handles, retired fields and server-derived opening properties. */
export function canonicalizeWicketRootSavePayload(
  payload: WicketSavePayload,
): WicketSavePayload {
  const {
    calculationName: _calculationName,
    clientName: _clientName,
    clientLastName: _clientLastName,
    clientSurname: _clientSurname,
    clientPhone: _clientPhone,
    clientEmail: _clientEmail,
    clientAddress: _clientAddress,
    clientComment: _clientComment,
    countryCode: _countryCode,
    openingOrientation: _openingOrientation,
    openingOrientationProblem: _openingOrientationProblem,
    ...canonicalPayload
  } = payload
  void _calculationName
  void _clientName
  void _clientLastName
  void _clientSurname
  void _clientPhone
  void _clientEmail
  void _clientAddress
  void _clientComment
  void _countryCode
  void _openingOrientation
  void _openingOrientationProblem

  return {
    ...canonicalPayload,
    lockPenId: null,
    lockPenColorId: null,
  }
}

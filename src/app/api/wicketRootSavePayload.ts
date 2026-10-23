import type { WicketSavePayload } from './wicket.types'

/** Remove legacy handles, retired fields and server-derived drawing properties. */
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
    jumperPlacement: _jumperPlacement,
    jumperPlacementProblem: _jumperPlacementProblem,
    postsPresenceProblem: _postsPresenceProblem,
    hasJumper: _hasJumper,
    postProfile: _postProfile,
    postProfileProblem: _postProfileProblem,
    jumperProfile: _jumperProfile,
    jumperProfileProblem: _jumperProfileProblem,
    fillingProfileFacade: _fillingProfileFacade,
    fillingProfileFacadeProblem: _fillingProfileFacadeProblem,
    fillingProfileYard: _fillingProfileYard,
    fillingProfileYardProblem: _fillingProfileYardProblem,
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
  void _jumperPlacement
  void _jumperPlacementProblem
  void _postsPresenceProblem
  void _hasJumper
  void _postProfile
  void _postProfileProblem
  void _jumperProfile
  void _jumperProfileProblem
  void _fillingProfileFacade
  void _fillingProfileFacadeProblem
  void _fillingProfileYard
  void _fillingProfileYardProblem

  return {
    ...canonicalPayload,
    lockPenId: null,
    lockPenColorId: null,
  }
}

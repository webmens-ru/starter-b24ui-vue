import { coverStripWire, parseCoverStripSelections } from '../../components/wicket/coverStripState'
import type { WicketSavePayload } from './wicket.types'
import { isParticipantRole, participantRoleFields } from '../participantRoles'
import { isFillingMaterialGroup } from '../fillingMaterialGroups'
import { isFillingSideCount } from '../fillingSideCounts'
import { isFillingOrientation } from '../fillingOrientations'
import { isFrameSubtypeCode } from '../frameSubtypes'
import { isGrilleSide } from '../grilleSides'

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
    colorShieldId: _colorShieldId,
    paintSelection: _paintSelection,
    paintSelectionUnavailable: _paintSelectionUnavailable,
    paintName: _paintName,
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
  void _paintSelection
  void _paintSelectionUnavailable
  void _paintName
  void _colorShieldId
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

  delete canonicalPayload.coverStripFrameColor
  delete canonicalPayload.coverStripDrafts
  delete canonicalPayload.coverStripDescriptions
  if (Object.prototype.hasOwnProperty.call(canonicalPayload, 'coverStrips')) canonicalPayload.coverStrips = coverStripWire(parseCoverStripSelections(canonicalPayload.coverStrips))
  delete canonicalPayload.participantRoleProblems
  delete canonicalPayload.isThereLock
  delete canonicalPayload.isThereLockName
  delete canonicalPayload.isTherePenName
  delete canonicalPayload.grilleSideProblem
  const explicitGrilleSide = Object.prototype.hasOwnProperty.call(canonicalPayload, 'grilleSideCode')
  const grilleSide = explicitGrilleSide ? canonicalPayload.grilleSideCode : canonicalPayload.grilleLocation
  delete canonicalPayload.grilleLocation
  if (explicitGrilleSide || (grilleSide !== undefined && grilleSide !== '')) {
    if (grilleSide !== null && !isGrilleSide(grilleSide)) throw new TypeError('Некорректное положение решётки: grilleSideCode')
    canonicalPayload.grilleSideCode = grilleSide
  }
  delete canonicalPayload.frameSubtypeProblem
  const explicitSubtype = Object.prototype.hasOwnProperty.call(canonicalPayload, 'frameSubtypeCode')
  const subtype = explicitSubtype ? canonicalPayload.frameSubtypeCode : canonicalPayload.shieldType
  delete canonicalPayload.shieldType
  if (explicitSubtype || (subtype !== undefined && subtype !== '')) {
    if (subtype !== null && !isFrameSubtypeCode(subtype)) throw new TypeError('Некорректный тип щита: frameSubtypeCode')
    canonicalPayload.frameSubtypeCode = subtype
  }
  delete canonicalPayload.fillingOrientationProblem
  const explicitOrientation = Object.prototype.hasOwnProperty.call(canonicalPayload, 'fillingOrientationCode')
  const orientation = explicitOrientation ? canonicalPayload.fillingOrientationCode : canonicalPayload.raspolozheniyePolotna
  delete canonicalPayload.raspolozheniyePolotna
  if (explicitOrientation || (orientation !== undefined && orientation !== '')) {
    if (orientation !== null && !isFillingOrientation(orientation)) throw new TypeError('Некорректное направление заполнения: fillingOrientationCode')
    canonicalPayload.fillingOrientationCode = orientation
  }
  delete canonicalPayload.fillingSideCountProblem
  const explicitCount = Object.prototype.hasOwnProperty.call(canonicalPayload, 'fillingSideCount')
  const count = explicitCount ? canonicalPayload.fillingSideCount : canonicalPayload.fillSide
  delete canonicalPayload.fillSide
  if (explicitCount || (count !== undefined && count !== '')) {
    if (count !== null && !isFillingSideCount(count)) throw new TypeError('Некорректное количество сторон заполнения: fillingSideCount')
    canonicalPayload.fillingSideCount = count
  }
  delete canonicalPayload.fillingGroupProblems
  for (const prefix of ['materialFacade', 'materialYard']) {
    const codeKey = `${prefix}GroupCode`
    const oldKey = `${prefix}Glob`
    const explicit = Object.prototype.hasOwnProperty.call(canonicalPayload, codeKey)
    const value = explicit ? canonicalPayload[codeKey] : canonicalPayload[oldKey]
    delete canonicalPayload[oldKey]
    if (!explicit && (value === undefined || value === '')) continue
    if (value !== null && !isFillingMaterialGroup(value)) throw new TypeError(`Некорректная группа заполнения: ${codeKey}`)
    canonicalPayload[codeKey] = value
  }
  for (const field of participantRoleFields) {
    const codeKey = `${field}Code`
    const explicit = Object.prototype.hasOwnProperty.call(canonicalPayload, codeKey)
    const value = explicit ? canonicalPayload[codeKey] : canonicalPayload[field]
    delete canonicalPayload[field]
    if (!explicit && (value === undefined || value === null || value === '')) continue
    if (!isParticipantRole(value)) throw new TypeError(`Некорректная роль: ${codeKey}`)
    canonicalPayload[codeKey] = value
  }
  return {
    ...canonicalPayload,
    lockPenId: null,
    lockPenColorId: null,
  }
}

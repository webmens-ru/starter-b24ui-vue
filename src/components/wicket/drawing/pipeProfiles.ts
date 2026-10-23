import type { JumperPlacement } from '../../../app/api/jumperProperties'
import { parsePipeProfile, type PipeProfile } from '../../../app/api/pipeProfiles'
import { isPositiveSafeInteger } from '../../../app/positiveDecimalId'
import { parseDrawingJumperProperties } from './jumperProperties'

export interface DrawingPipeSource {
  hasStolby?: unknown
  postsPresenceProblem?: unknown
  jumperPlacement?: unknown
  jumperPlacementProblem?: unknown
  postProfile?: unknown
  postProfileProblem?: unknown
  jumperProfile?: unknown
  jumperProfileProblem?: unknown
}

export interface DrawingPipeProfiles {
  hasPosts: boolean
  placement: JumperPlacement
  postWidth: number
  postDepth: number
  lowerPostDepth: number
  postPlugDepth: number
  jumperFaceSize: number
  rearJumperHeight: number
  rearJumperDepth: number
  overheadJumperHeight: number
}

function selectedProfile(raw: unknown, problem: unknown, used: boolean): PipeProfile | null {
  if (problem != null) throw new Error('Не настроены достоверные размеры выбранной трубы.')
  if (!used) {
    if (raw !== null) throw new Error('Неиспользуемый профиль трубы должен быть null.')
    return null
  }
  return parsePipeProfile(raw)
}

function orient(profile: PipeProfile | null, frameSize: number): [number, number] {
  if (profile === null) return [0, 0]
  return profile.sizeA === frameSize ? [profile.sizeB, profile.sizeA] : [profile.sizeA, profile.sizeB]
}

export function parseDrawingPipeProfiles(source: DrawingPipeSource, frameSize: number): DrawingPipeProfiles {
  if (!isPositiveSafeInteger(frameSize)) throw new Error('Некорректный размер рамы.')
  const { hasPosts, placement } = parseDrawingJumperProperties(source)
  const post = selectedProfile(source.postProfile, source.postProfileProblem, hasPosts)
  const jumper = selectedProfile(source.jumperProfile, source.jumperProfileProblem, placement !== 'none')
  const [postWidth, postDepth] = orient(post, frameSize)
  const [jumperFaceSize] = orient(jumper, frameSize)
  let overheadJumperHeight = 0
  if (placement === 'above' && jumper !== null) {
    if (jumper.sizeA !== frameSize && jumper.sizeB !== frameSize) {
      throw new Error('Профиль верхней перемычки несовместим с размером рамы.')
    }
    overheadJumperHeight = jumperFaceSize
  }
  return { hasPosts, placement, postWidth, postDepth, lowerPostDepth: post?.sizeA ?? 0,
    postPlugDepth: postDepth, jumperFaceSize, rearJumperHeight: jumper?.sizeA ?? 0,
    rearJumperDepth: jumper?.sizeB ?? 0, overheadJumperHeight }
}

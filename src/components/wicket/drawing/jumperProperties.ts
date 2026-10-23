import { isJumperPlacement, parsePostsSelection, type JumperPlacement } from '../../../app/api/jumperProperties'

/** Rendering accepts explicit configuration only, never display captions. */
export function parseDrawingJumperProperties(source: {
  hasStolby?: unknown
  jumperPlacement?: unknown
  jumperPlacementProblem?: unknown
  postsPresenceProblem?: unknown
}): { hasPosts: boolean; placement: JumperPlacement } {
  const posts = parsePostsSelection(source.hasStolby, source.postsPresenceProblem)
  if (posts.hasStolby === null) throw new Error(posts.postsPresenceProblem!.message)
  if (!isJumperPlacement(source.jumperPlacement) || source.jumperPlacementProblem != null) {
    throw new Error('Не настроены свойства выбранной перемычки.')
  }
  return { hasPosts: posts.hasStolby === 1, placement: source.jumperPlacement }
}

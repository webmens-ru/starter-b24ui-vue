import type { ProductRowContext, WicketRootMutationResponse } from './wicket.types'

type Completion = (response: WicketRootMutationResponse | undefined) => void
type Observer = (context: ProductRowContext) => Completion
const observers = new Set<Observer>()

/** Capture the current form generation before sending a serialized mutation. */
export function beginWicketConfigurationMutation(context: ProductRowContext): Completion {
  const completions = [...observers].map(observer => observer(context))
  return response => { for (const complete of completions) complete(response) }
}
export function onWicketConfigurationMutation(observer: Observer): () => void {
  observers.add(observer)
  return () => { observers.delete(observer) }
}

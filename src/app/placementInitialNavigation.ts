import type { Router } from 'vue-router'

export function navigateToPlacementPath(router: Router, path: string) {
  return router.replace(path)
}

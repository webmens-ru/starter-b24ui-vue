export interface WicketStepNavigationGuard {
  validateBeforeLeave?: () => boolean | Promise<boolean>
}

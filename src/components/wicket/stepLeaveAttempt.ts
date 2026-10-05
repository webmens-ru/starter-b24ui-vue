/** Serializes navigation attempts made by a step's Next button and its parent guard. */
export function createStepLeaveAttempt(validateAndSave: () => Promise<boolean>, emitNext: () => void | Promise<void>): {
  validateBeforeLeave: () => Promise<boolean>
  next: () => Promise<void>
} {
  let pending = false

  async function run(advance: boolean): Promise<boolean> {
    if (pending) return false
    pending = true
    try {
      const allowed = await validateAndSave()
      if (allowed && advance) await emitNext()
      return allowed
    } finally {
      pending = false
    }
  }

  return {
    validateBeforeLeave: () => run(false),
    next: async () => { await run(true) },
  }
}

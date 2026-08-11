import { DEFAULT_REQUEST_TIMEOUT_MS } from '../services/http'

// Ranked Scryfall candidates can require two transport calls, so callers reserve
// two units for them. This keeps the actual workflow-wide request count bounded.
export const DRAW_WORKFLOW_CALL_BUDGET = 24

// The caller deadline intentionally expires before a single transport timeout,
// allowing one signal to cap the complete multi-request workflow.
export const DRAW_WORKFLOW_DEADLINE_MS = Math.max(
  1,
  Math.min(10_000, DEFAULT_REQUEST_TIMEOUT_MS - 1_000)
)

export type DrawWorkflowStopReason =
  | 'budget'
  | 'configuration'
  | 'superseded'
  | 'timeout'
  | 'user'

export class DrawWorkflowNoMatchError extends Error {
  constructor(callBudget: number) {
    super(
      `No legal match was found within this draw's ${callBudget}-call limit. Try another filter.`
    )
    this.name = 'DrawWorkflowNoMatchError'
  }
}

export class DrawWorkflowTimeoutError extends Error {
  constructor(deadlineMs: number) {
    super(
      `This draw timed out after ${Math.ceil(deadlineMs / 1000)} seconds. Try again or simplify the filters.`
    )
    this.name = 'DrawWorkflowTimeoutError'
  }
}

const abortError = () =>
  new DOMException('The draw workflow was cancelled.', 'AbortError')

export type DrawWorkflowContext<Configuration> = Readonly<{
  id: string
  config: Configuration
  signal: AbortSignal
  deadlineAt: number
  callBudget: number
  callsUsed: number
  stopReason: DrawWorkflowStopReason | null
  consumeCalls: (count?: number) => void
  cancel: (reason: DrawWorkflowStopReason) => void
  finish: () => void
}>

export const createDrawWorkflowContext = <Configuration>(
  id: string,
  config: Configuration,
  now = Date.now()
): DrawWorkflowContext<Configuration> => {
  const controller = new AbortController()
  const deadlineAt = now + DRAW_WORKFLOW_DEADLINE_MS
  let callsUsed = 0
  let stopReason: DrawWorkflowStopReason | null = null
  let finished = false

  const cancel = (reason: DrawWorkflowStopReason) => {
    if (finished || stopReason !== null) return
    stopReason = reason
    controller.abort()
  }

  const timeoutId = globalThis.setTimeout(() => {
    cancel('timeout')
  }, DRAW_WORKFLOW_DEADLINE_MS)

  const context: DrawWorkflowContext<Configuration> = {
    id,
    config,
    signal: controller.signal,
    deadlineAt,
    callBudget: DRAW_WORKFLOW_CALL_BUDGET,
    get callsUsed() {
      return callsUsed
    },
    get stopReason() {
      return stopReason
    },
    consumeCalls(count = 1) {
      if (stopReason === 'timeout' || Date.now() >= deadlineAt) {
        cancel('timeout')
        throw new DrawWorkflowTimeoutError(DRAW_WORKFLOW_DEADLINE_MS)
      }
      if (controller.signal.aborted) throw abortError()

      const safeCount = Number.isFinite(count) ? Math.max(1, Math.ceil(count)) : 1
      if (callsUsed + safeCount > DRAW_WORKFLOW_CALL_BUDGET) {
        cancel('budget')
        throw new DrawWorkflowNoMatchError(DRAW_WORKFLOW_CALL_BUDGET)
      }
      callsUsed += safeCount
    },
    cancel,
    finish() {
      if (finished) return
      finished = true
      globalThis.clearTimeout(timeoutId)
    },
  }

  return Object.freeze(context)
}

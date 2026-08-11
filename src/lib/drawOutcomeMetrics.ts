import { RuntimeDataError } from './runtimeValidation'
import { HttpError, RequestTimeoutError } from '../services/http'
import { isScryfallRequestError } from '../services/scryfall'
import {
  DrawWorkflowNoMatchError,
  DrawWorkflowTimeoutError,
  type DrawWorkflowStopReason,
} from '../stores/drawWorkflow'
import type { DrawOutcome } from './operationalMetrics'

export type DrawOutcomeInput = Readonly<{
  completed: boolean
  stopReason: DrawWorkflowStopReason | null
  error?: unknown
}>

// This mapper intentionally returns only a fixed enum. Error messages, card
// identities, filter values, URLs, and request payloads never enter metrics.
export const mapDrawOutcome = ({
  completed,
  stopReason,
  error,
}: DrawOutcomeInput): DrawOutcome => {
  if (completed && stopReason === null && error === undefined) return 'success'
  if (
    stopReason === 'timeout' ||
    error instanceof DrawWorkflowTimeoutError ||
    error instanceof RequestTimeoutError
  ) {
    return 'timeout'
  }
  if (
    stopReason === 'budget' ||
    error instanceof DrawWorkflowNoMatchError
  ) {
    return 'no-match'
  }
  if (
    stopReason === 'configuration'
  ) {
    return 'configuration-error'
  }
  if (
    stopReason === 'user' ||
    stopReason === 'superseded' ||
    (error instanceof Error && error.name === 'AbortError')
  ) {
    return 'cancelled'
  }
  if (
    isScryfallRequestError(error) ||
    error instanceof HttpError ||
    error instanceof RuntimeDataError
  ) {
    return 'upstream-error'
  }
  return 'unknown-error'
}

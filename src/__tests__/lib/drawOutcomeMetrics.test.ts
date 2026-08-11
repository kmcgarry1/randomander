import { describe, expect, it } from 'vitest'
import { mapDrawOutcome } from '../../lib/drawOutcomeMetrics'
import { RuntimeDataError } from '../../lib/runtimeValidation'
import { RequestTimeoutError } from '../../services/http'
import { ScryfallRequestError } from '../../services/scryfall'
import { DrawWorkflowNoMatchError } from '../../stores/drawWorkflow'

describe('draw outcome metric mapping', () => {
  it.each([
    [{ completed: true, stopReason: null }, 'success'],
    [{ completed: false, stopReason: 'user' }, 'cancelled'],
    [{ completed: false, stopReason: 'configuration' }, 'configuration-error'],
    [{ completed: false, stopReason: 'budget' }, 'no-match'],
    [{ completed: false, stopReason: 'timeout' }, 'timeout'],
  ] as const)('maps a bounded workflow state to %s', (input, outcome) => {
    expect(mapDrawOutcome(input)).toBe(outcome)
  })

  it.each([
    [new RequestTimeoutError(1_000), 'timeout'],
    [new DrawWorkflowNoMatchError(24), 'no-match'],
    [new ScryfallRequestError('sensitive upstream detail', 'request'), 'upstream-error'],
    [new RuntimeDataError('scryfall', 'card', 'sensitive data'), 'upstream-error'],
    [new Error('sensitive unknown detail'), 'unknown-error'],
  ] as const)('maps typed errors without returning their detail', (error, outcome) => {
    const result = mapDrawOutcome({
      completed: false,
      stopReason: null,
      error,
    })
    expect(result).toBe(outcome)
    expect(result).not.toContain(error.message)
  })
})

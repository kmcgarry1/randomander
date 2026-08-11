import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  configureOperationalMetricSink,
  getOperationalMetricSnapshot,
  recordDrawMetric,
  recordStorageMetric,
  resetOperationalMetrics,
} from '../../lib/operationalMetrics'

describe('privacy-safe operational metrics', () => {
  beforeEach(() => {
    resetOperationalMetrics()
  })

  it.each([
    [0, 'under-250ms'],
    [249, 'under-250ms'],
    [250, '250ms-1s'],
    [999, '250ms-1s'],
    [1_000, '1s-3s'],
    [3_000, '3s-10s'],
    [10_000, '10s-or-more'],
    [Number.NaN, 'unknown'],
  ] as const)('buckets a %s ms draw without raw timing', (durationMs, expected) => {
    expect(
      recordDrawMetric({
        outcome: 'success',
        durationMs,
        requestCount: 1,
      })
    ).toMatchObject({ latency: expected })
  })

  it.each([
    [0, '0'],
    [1, '1-3'],
    [4, '4-8'],
    [9, '9-16'],
    [17, '17-24'],
    [25, 'over-budget'],
    [-1, 'unknown'],
  ] as const)('buckets %s requests without endpoint or card data', (requestCount, expected) => {
    expect(
      recordDrawMetric({
        outcome: 'upstream-error',
        durationMs: 500,
        requestCount,
      })
    ).toMatchObject({ requests: expected })
  })

  it('retains only aggregate outcome and bucket counts in memory', () => {
    recordDrawMetric({
      outcome: 'timeout',
      durationMs: 10_001,
      requestCount: 24,
    })
    recordStorageMetric('quota')

    const snapshot = getOperationalMetricSnapshot()
    expect(snapshot.draw.outcomes.timeout).toBe(1)
    expect(snapshot.draw.latency['10s-or-more']).toBe(1)
    expect(snapshot.draw.requestCounts['17-24']).toBe(1)
    expect(snapshot.storage.outcomes.quota).toBe(1)
    expect(JSON.stringify(snapshot)).not.toMatch(
      /card|filter|history|saved|https?:|identifier/i
    )
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(Object.isFrozen(snapshot.draw.outcomes)).toBe(true)
  })

  it('emits the same bounded shape to an optional sink', () => {
    const sink = vi.fn()
    configureOperationalMetricSink(sink)

    const metric = recordDrawMetric({
      outcome: 'cancelled',
      durationMs: 125,
      requestCount: 2,
    })

    expect(sink).toHaveBeenCalledWith(metric)
    expect(metric).toEqual({
      type: 'draw',
      outcome: 'cancelled',
      latency: 'under-250ms',
      requests: '1-3',
    })
  })

  it('cannot let an observability sink break product behavior', () => {
    configureOperationalMetricSink(() => {
      throw new Error('diagnostics unavailable')
    })

    expect(() => recordStorageMetric('security')).not.toThrow()
    expect(getOperationalMetricSnapshot().storage.outcomes.security).toBe(1)
  })
})


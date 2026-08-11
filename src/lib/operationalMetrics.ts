export const DRAW_OUTCOMES = [
  'success',
  'cancelled',
  'timeout',
  'upstream-error',
  'no-match',
  'configuration-error',
  'unknown-error',
] as const

export const STORAGE_OUTCOMES = [
  'success',
  'quota',
  'security',
  'unavailable',
  'invalid-data',
  'unknown-error',
] as const

export type DrawOutcome = (typeof DRAW_OUTCOMES)[number]
export type StorageOutcome = (typeof STORAGE_OUTCOMES)[number]
export type LatencyBucket =
  | 'under-250ms'
  | '250ms-1s'
  | '1s-3s'
  | '3s-10s'
  | '10s-or-more'
  | 'unknown'
export type RequestCountBucket =
  | '0'
  | '1-3'
  | '4-8'
  | '9-16'
  | '17-24'
  | 'over-budget'
  | 'unknown'

export type OperationalMetric =
  | Readonly<{
      type: 'draw'
      outcome: DrawOutcome
      latency: LatencyBucket
      requests: RequestCountBucket
    }>
  | Readonly<{
      type: 'storage'
      outcome: StorageOutcome
    }>

export type OperationalMetricSink = (metric: OperationalMetric) => void

const createCounts = <Value extends string>(values: readonly Value[]) =>
  Object.fromEntries(values.map((value) => [value, 0])) as Record<Value, number>

const LATENCY_BUCKETS: readonly LatencyBucket[] = [
  'under-250ms',
  '250ms-1s',
  '1s-3s',
  '3s-10s',
  '10s-or-more',
  'unknown',
]

const REQUEST_COUNT_BUCKETS: readonly RequestCountBucket[] = [
  '0',
  '1-3',
  '4-8',
  '9-16',
  '17-24',
  'over-budget',
  'unknown',
]

const drawOutcomes = createCounts(DRAW_OUTCOMES)
const drawLatencies = createCounts(LATENCY_BUCKETS)
const drawRequestCounts = createCounts(REQUEST_COUNT_BUCKETS)
const storageOutcomes = createCounts(STORAGE_OUTCOMES)

let metricSink: OperationalMetricSink | null = null

const latencyBucket = (durationMs: number): LatencyBucket => {
  if (!Number.isFinite(durationMs) || durationMs < 0) return 'unknown'
  if (durationMs < 250) return 'under-250ms'
  if (durationMs < 1_000) return '250ms-1s'
  if (durationMs < 3_000) return '1s-3s'
  if (durationMs < 10_000) return '3s-10s'
  return '10s-or-more'
}

const requestCountBucket = (requestCount: number): RequestCountBucket => {
  if (!Number.isFinite(requestCount) || requestCount < 0) return 'unknown'
  const count = Math.floor(requestCount)
  if (count === 0) return '0'
  if (count <= 3) return '1-3'
  if (count <= 8) return '4-8'
  if (count <= 16) return '9-16'
  if (count <= 24) return '17-24'
  return 'over-budget'
}

const emitMetric = (metric: OperationalMetric) => {
  try {
    metricSink?.(metric)
  } catch {
    // Diagnostics must never change product behavior or error recovery.
  }
}

export const configureOperationalMetricSink = (
  sink: OperationalMetricSink | null
) => {
  metricSink = sink
}

export const recordDrawMetric = (input: {
  outcome: DrawOutcome
  durationMs: number
  requestCount: number
}): OperationalMetric => {
  const metric = Object.freeze({
    type: 'draw' as const,
    outcome: input.outcome,
    latency: latencyBucket(input.durationMs),
    requests: requestCountBucket(input.requestCount),
  })

  drawOutcomes[metric.outcome] += 1
  drawLatencies[metric.latency] += 1
  drawRequestCounts[metric.requests] += 1
  emitMetric(metric)
  return metric
}

export const recordStorageMetric = (
  outcome: StorageOutcome
): OperationalMetric => {
  const metric = Object.freeze({ type: 'storage' as const, outcome })
  storageOutcomes[outcome] += 1
  emitMetric(metric)
  return metric
}

export const getOperationalMetricSnapshot = () =>
  Object.freeze({
    draw: Object.freeze({
      outcomes: Object.freeze({ ...drawOutcomes }),
      latency: Object.freeze({ ...drawLatencies }),
      requestCounts: Object.freeze({ ...drawRequestCounts }),
    }),
    storage: Object.freeze({
      outcomes: Object.freeze({ ...storageOutcomes }),
    }),
  })

export const resetOperationalMetrics = () => {
  DRAW_OUTCOMES.forEach((key) => {
    drawOutcomes[key] = 0
  })
  LATENCY_BUCKETS.forEach((key) => {
    drawLatencies[key] = 0
  })
  REQUEST_COUNT_BUCKETS.forEach((key) => {
    drawRequestCounts[key] = 0
  })
  STORAGE_OUTCOMES.forEach((key) => {
    storageOutcomes[key] = 0
  })
  metricSink = null
}


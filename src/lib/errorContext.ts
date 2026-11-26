/**
 * ErrorContext: Structured error metadata builder.
 *
 * Provides a type-safe interface and factory function for building
 * complete error context objects with all relevant metadata.
 */

export interface ErrorContext {
  /**
   * Unique identifier for correlating logs from the same request/operation.
   */
  requestId?: string

  /**
   * Source identifier: URL, field name, storage key, etc.
   */
  sourceId?: string

  /**
   * Structured metadata about the error.
   */
  metadata: Record<string, unknown>

  /**
   * Timestamp when error occurred (milliseconds since epoch).
   */
  timestamp: number

  /**
   * Breadcrumbs: sequence of recent operations before error.
   */
  breadcrumbs?: Breadcrumb[]

  /**
   * Operation name that failed.
   */
  operation?: string

  /**
   * HTTP status code (if applicable).
   */
  statusCode?: number

  /**
   * HTTP headers (if applicable).
   */
  headers?: Record<string, string>

  /**
   * Request body (if applicable and safe to log).
   */
  requestBody?: unknown

  /**
   * Response body (if applicable).
   */
  responseBody?: unknown
}

export interface Breadcrumb {
  /**
   * Operation name.
   */
  operation: string

  /**
   * Timestamp (milliseconds since epoch).
   */
  timestamp: number

  /**
   * Outcome: 'success', 'error', or 'pending'.
   */
  outcome: 'success' | 'error' | 'pending'

  /**
   * Optional error code if outcome is 'error'.
   */
  errorCode?: string
}

/**
 * Creates an ErrorContext object with structured metadata.
 *
 * @param options Options to build the context.
 * @returns Complete ErrorContext with timestamp and defaults.
 *
 * @example
 * const ctx = createErrorContext({
 *   requestId: 'req-123',
 *   sourceId: 'https://api.example.com/card',
 *   metadata: { status: 500 },
 * })
 */
export function createErrorContext(
  options: Partial<ErrorContext> = {}
): ErrorContext {
  return {
    requestId: options.requestId,
    sourceId: options.sourceId,
    metadata: options.metadata ?? {},
    timestamp: options.timestamp ?? Date.now(),
    breadcrumbs: options.breadcrumbs ?? [],
    operation: options.operation,
    statusCode: options.statusCode,
    headers: options.headers,
    requestBody: options.requestBody,
    responseBody: options.responseBody,
  }
}

/**
 * Adds a breadcrumb to an ErrorContext.
 *
 * @param context The error context to modify.
 * @param breadcrumb The breadcrumb to add.
 * @returns The modified context.
 */
export function addBreadcrumb(
  context: ErrorContext,
  breadcrumb: Breadcrumb
): ErrorContext {
  const breadcrumbs = context.breadcrumbs ?? []
  // Keep only last 5 breadcrumbs to avoid unbounded growth
  breadcrumbs.push(breadcrumb)
  if (breadcrumbs.length > 5) {
    breadcrumbs.shift()
  }
  return { ...context, breadcrumbs }
}

/**
 * Merges two ErrorContext objects, with later overwriting earlier.
 *
 * @param context1 First context.
 * @param context2 Second context (wins in case of conflicts).
 * @returns Merged context.
 */
export function mergeErrorContexts(
  context1: ErrorContext,
  context2: Partial<ErrorContext>
): ErrorContext {
  return createErrorContext({
    ...context1,
    ...context2,
    metadata: { ...context1.metadata, ...context2.metadata },
    breadcrumbs: [
      ...(context1.breadcrumbs ?? []),
      ...(context2.breadcrumbs ?? []),
    ],
  })
}

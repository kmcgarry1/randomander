/**
 * Unified error class hierarchy for consistent error handling across the app.
 *
 * All errors in randomander inherit from AppError, which provides:
 * - Type classification (network, validation, storage, cache)
 * - Structured metadata for debugging
 * - Recovery hints for automatic recovery strategies
 * - Request/trace IDs for correlation
 */

export type ErrorType = 'network' | 'validation' | 'storage' | 'cache'

export type ErrorCode =
  | 'timeout'
  | 'http-error'
  | 'connection-failed'
  | 'malformed-data'
  | 'schema-mismatch'
  | 'quota-exceeded'
  | 'write-failed'
  | 'corrupted'
  | 'repair-failed'

export type RecoveryHint =
  | 'retry'
  | 'clear-cache'
  | 'clear-cache-retry'
  | 'export-then-clear'
  | 'reset-state'

export interface AppErrorOptions {
  metadata?: Record<string, unknown>
  recoveryHints?: RecoveryHint[]
  sourceId?: string
  requestId?: string
  originalError?: unknown
}

/**
 * Base error class for all application errors.
 *
 * @example
 * try {
 *   const data = await fetchJson(url)
 * } catch (error) {
 *   if (error instanceof NetworkError) {
 *     console.error(`Network error: ${error.code}`, error.metadata)
 *   }
 * }
 */
export abstract class AppError extends Error {
  readonly type: ErrorType
  readonly code: ErrorCode
  readonly metadata: Record<string, unknown>
  readonly recoveryHints: RecoveryHint[]
  readonly timestamp: number
  readonly sourceId?: string
  readonly requestId?: string
  readonly originalError?: unknown

  constructor(
    type: ErrorType,
    code: ErrorCode,
    message: string,
    options: AppErrorOptions = {}
  ) {
    super(message)
    this.name = this.constructor.name
    this.type = type
    this.code = code
    this.metadata = options.metadata ?? {}
    this.recoveryHints = options.recoveryHints ?? ['retry']
    this.timestamp = Date.now()
    this.sourceId = options.sourceId
    this.requestId = options.requestId
    this.originalError = options.originalError

    // Maintain proper prototype chain for instanceof
    Object.setPrototypeOf(this, AppError.prototype)
  }

  /**
   * Serialize error fields for logging and storage. The original error is omitted.
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      code: this.code,
      message: this.message,
      metadata: this.metadata,
      recoveryHints: this.recoveryHints,
      timestamp: this.timestamp,
      sourceId: this.sourceId,
      requestId: this.requestId,
      stack: this.stack,
    }
  }
}

/**
 * Network-related errors: timeouts, HTTP errors, connection failures.
 */
export class NetworkError extends AppError {
  constructor(
    code: 'timeout' | 'http-error' | 'connection-failed',
    message: string,
    options?: AppErrorOptions
  ) {
    super('network', code, message, {
      ...options,
      recoveryHints: options?.recoveryHints ?? ['retry'],
    })
    Object.setPrototypeOf(this, NetworkError.prototype)
  }
}

/**
 * Data validation errors: malformed JSON, schema mismatches.
 */
export class ValidationError extends AppError {
  constructor(
    code: 'malformed-data' | 'schema-mismatch',
    message: string,
    options?: AppErrorOptions
  ) {
    super('validation', code, message, {
      ...options,
      recoveryHints: options?.recoveryHints ?? ['clear-cache-retry'],
    })
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * Storage-related errors: quota exceeded, write failures.
 */
export class StorageError extends AppError {
  constructor(
    code: 'quota-exceeded' | 'write-failed',
    message: string,
    options?: AppErrorOptions
  ) {
    const defaultHints: RecoveryHint[] =
      code === 'quota-exceeded'
        ? ['clear-cache', 'export-then-clear']
        : ['retry']

    super('storage', code, message, {
      ...options,
      recoveryHints: options?.recoveryHints ?? defaultHints,
    })
    Object.setPrototypeOf(this, StorageError.prototype)
  }
}

/**
 * Cache-related errors: corruption, repair failures.
 */
export class CacheError extends AppError {
  constructor(
    code: 'corrupted' | 'repair-failed',
    message: string,
    options?: AppErrorOptions
  ) {
    const defaultHints: RecoveryHint[] = code === 'corrupted' ? ['clear-cache'] : ['retry']

    super('cache', code, message, {
      ...options,
      recoveryHints: options?.recoveryHints ?? defaultHints,
    })
    Object.setPrototypeOf(this, CacheError.prototype)
  }
}

/**
 * Check whether a value is an application error.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Check whether a value is a network error.
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

/** Check whether a value is a validation error. */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

/** Check whether a value is a storage error. */
export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError
}

/** Check whether a value is a cache error. */
export function isCacheError(error: unknown): error is CacheError {
  return error instanceof CacheError
}

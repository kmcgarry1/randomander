import { ValidationError } from './appError'

export type RuntimeDataSource =
  | 'cache'
  | 'edhrec'
  | 'persisted-state'
  | 'scryfall'

/**
 * Error thrown when runtime data validation fails.
 * Extends ValidationError to integrate with unified error handling.
 */
export class RuntimeDataError extends ValidationError {
  readonly source: RuntimeDataSource

  constructor(source: RuntimeDataSource, path: string, message: string) {
    super('schema-mismatch', `${source} data is invalid at ${path}: ${message}`, {
      sourceId: source,
      requestId: '', // Will be populated if part of an HTTP flow
      metadata: {
        source,
        fieldPath: path,
        schema: '', // Can be populated with expected schema info
      },
    })
    this.source = source
    Object.setPrototypeOf(this, RuntimeDataError.prototype)
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const nonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

export const finiteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

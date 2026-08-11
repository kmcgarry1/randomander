export type RuntimeDataSource =
  | 'cache'
  | 'edhrec'
  | 'persisted-state'
  | 'scryfall'

export class RuntimeDataError extends Error {
  readonly source: RuntimeDataSource
  readonly path: string
  readonly recoverable = true

  constructor(source: RuntimeDataSource, path: string, message: string) {
    super(`${source} data is invalid at ${path}: ${message}`)
    this.name = 'RuntimeDataError'
    this.source = source
    this.path = path
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const nonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

export const finiteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

import { describe, it, expect } from 'vitest'
import {
  AppError,
  NetworkError,
  ValidationError,
  StorageError,
  CacheError,
  isAppError,
  isNetworkError,
  isValidationError,
  isStorageError,
  isCacheError,
} from '../../lib/appError'

describe('AppError - Error class hierarchy', () => {
  it('creates NetworkError with timeout code', () => {
    const error = new NetworkError('timeout', 'Request timed out', {
      sourceId: 'https://api.example.com/card',
      requestId: 'req-123',
    })

    expect(error.type).toBe('network')
    expect(error.code).toBe('timeout')
    expect(error.message).toBe('Request timed out')
    expect(error.sourceId).toBe('https://api.example.com/card')
    expect(error.requestId).toBe('req-123')
    expect(error.recoveryHints).toContain('retry')
  })

  it('creates ValidationError with schema-mismatch code', () => {
    const error = new ValidationError('schema-mismatch', 'Unexpected field', {
      metadata: { field: 'oracle_text', expectedType: 'string' },
    })

    expect(error.type).toBe('validation')
    expect(error.code).toBe('schema-mismatch')
    expect(error.metadata.field).toBe('oracle_text')
    expect(error.recoveryHints).toContain('clear-cache-retry')
  })

  it('creates StorageError with quota-exceeded code', () => {
    const error = new StorageError('quota-exceeded', 'Storage full', {
      metadata: { used: 4900000, limit: 5000000 },
    })

    expect(error.type).toBe('storage')
    expect(error.code).toBe('quota-exceeded')
    expect(error.recoveryHints).toContain('clear-cache')
    expect(error.recoveryHints).toContain('export-then-clear')
  })

  it('creates CacheError with corrupted code', () => {
    const error = new CacheError('corrupted', 'Cache data is invalid', {
      sourceId: 'scryfall-cards',
    })

    expect(error.type).toBe('cache')
    expect(error.code).toBe('corrupted')
    expect(error.recoveryHints).toContain('clear-cache')
  })

  it('serializes to JSON with all fields', () => {
    const error = new NetworkError('http-error', 'Server error', {
      metadata: { status: 500, url: 'https://api.example.com' },
      requestId: 'req-456',
      sourceId: '/api/cards',
    })

    const json = error.toJSON()

    expect(json.name).toBe('NetworkError')
    expect(json.type).toBe('network')
    expect(json.code).toBe('http-error')
    expect(json.message).toBe('Server error')
    expect(json.metadata.status).toBe(500)
    expect(json.requestId).toBe('req-456')
    expect(json.timestamp).toBeDefined()
    expect(json.stack).toBeDefined()
  })

  it('stores original error reference', () => {
    const originalError = new Error('Original')
    const error = new NetworkError('connection-failed', 'Failed to connect', {
      originalError,
    })

    expect(error.originalError).toBe(originalError)
  })

  it('handles undefined/partial metadata gracefully', () => {
    const errorNoMetadata = new ValidationError(
      'malformed-data',
      'Bad JSON'
    )
    expect(errorNoMetadata.metadata).toEqual({})

    const errorPartialOptions = new StorageError(
      'quota-exceeded',
      'No space'
    )
    expect(errorPartialOptions.recoveryHints).toBeDefined()
  })

  it('type guards work correctly', () => {
    const networkErr = new NetworkError('timeout', 'Timeout')
    const validationErr = new ValidationError('schema-mismatch', 'Schema')
    const storageErr = new StorageError('quota-exceeded', 'Quota')
    const cacheErr = new CacheError('corrupted', 'Corrupt')

    expect(isAppError(networkErr)).toBe(true)
    expect(isAppError(validationErr)).toBe(true)
    expect(isNetworkError(networkErr)).toBe(true)
    expect(isNetworkError(validationErr)).toBe(false)
    expect(isValidationError(validationErr)).toBe(true)
    expect(isValidationError(networkErr)).toBe(false)
    expect(isStorageError(storageErr)).toBe(true)
    expect(isStorageError(networkErr)).toBe(false)
    expect(isCacheError(cacheErr)).toBe(true)
    expect(isCacheError(storageErr)).toBe(false)
  })

  it('type guards reject non-errors', () => {
    const notAnError = { type: 'network', code: 'timeout' }

    expect(isAppError(notAnError)).toBe(false)
    expect(isNetworkError(notAnError)).toBe(false)
    expect(isValidationError(notAnError)).toBe(false)
  })

  it('maintains instanceof relationships', () => {
    const error = new NetworkError('timeout', 'Timeout')

    expect(error instanceof NetworkError).toBe(true)
    expect(error instanceof AppError).toBe(true)
    expect(error instanceof Error).toBe(true)
  })
})

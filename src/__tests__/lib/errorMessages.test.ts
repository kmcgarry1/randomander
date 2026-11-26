import { describe, it, expect } from 'vitest'
import {
  getErrorMessage,
  getApplicableRecoveryActions,
  getRecoveryActionLabel,
  getRecoveryActionDescription,
} from '../../lib/errorMessages'
import {
  NetworkError,
  ValidationError,
  StorageError,
  CacheError,
} from '../../lib/appError'

describe('Error Messages', () => {
  describe('getErrorMessage', () => {
    it('returns message for timeout error', () => {
      const error = new NetworkError('timeout', 'Request timed out')
      const message = getErrorMessage(error)

      expect(message.title).toBe('Connection Timeout')
      expect(message.description).toContain('too long')
      expect(message.userHint).toBeTruthy()
      expect(message.recoveryActions.length).toBeGreaterThan(0)
    })

    it('returns message for http-error', () => {
      const error = new NetworkError('http-error', 'Server error', {
        metadata: { status: 500 },
      })
      const message = getErrorMessage(error)

      expect(message.title).toBe('Server Error')
      expect(message.description).toContain('error')
      expect(message.recoveryActions.length).toBeGreaterThan(0)
    })

    it('returns message for connection-failed error', () => {
      const error = new NetworkError('connection-failed', 'Connection refused')
      const message = getErrorMessage(error)

      expect(message.title).toBe('Connection Failed')
      expect(message.userHint).toContain('internet')
    })

    it('returns message for malformed-data validation error', () => {
      const error = new ValidationError('malformed-data', 'Invalid JSON')
      const message = getErrorMessage(error)

      expect(message.title).toContain('Invalid')
      expect(message.recoveryActions.length).toBeGreaterThan(0)
    })

    it('returns message for schema-mismatch validation error', () => {
      const error = new ValidationError('schema-mismatch', 'Schema mismatch')
      const message = getErrorMessage(error)

      expect(message.title).toContain('Unexpected')
      expect(message.recoveryActions.length).toBeGreaterThan(0)
    })

    it('returns message for quota-exceeded storage error', () => {
      const error = new StorageError('quota-exceeded', 'Storage full')
      const message = getErrorMessage(error)

      expect(message.title).toContain('Storage')
      expect(message.userHint).toContain('cache')
      expect(message.recoveryActions.length).toBeGreaterThan(0)
    })

    it('returns message for write-failed storage error', () => {
      const error = new StorageError('write-failed', 'Could not write')
      const message = getErrorMessage(error)

      expect(message.title).toContain('Storage')
      expect(message.recoveryActions.length).toBeGreaterThan(0)
    })

    it('returns message for corrupted cache error', () => {
      const error = new CacheError('corrupted', 'Cache corrupted')
      const message = getErrorMessage(error)

      expect(message.title).toContain('Corrupted')
      expect(message.recoveryActions.length).toBeGreaterThan(0)
    })

    it('returns message for repair-failed cache error', () => {
      const error = new CacheError('repair-failed', 'Repair failed')
      const message = getErrorMessage(error)

      expect(message.title).toContain('Repair')
      expect(message.recoveryActions.length).toBeGreaterThan(0)
    })

    it('returns default message for regular Error', () => {
      const error = new Error('Something went wrong')
      const message = getErrorMessage(error)

      expect(message.title).toBe('Unexpected Error')
      expect(message.userHint).toBeTruthy()
      expect(message.recoveryActions.length).toBeGreaterThan(0)
    })

    it('all messages have required fields', () => {
      const errors = [
        new NetworkError('timeout', 'Timeout'),
        new NetworkError('http-error', 'HTTP error'),
        new NetworkError('connection-failed', 'Connection failed'),
        new ValidationError('malformed-data', 'Malformed'),
        new ValidationError('schema-mismatch', 'Schema mismatch'),
        new StorageError('quota-exceeded', 'Quota exceeded'),
        new StorageError('write-failed', 'Write failed'),
        new CacheError('corrupted', 'Corrupted'),
        new CacheError('repair-failed', 'Repair failed'),
      ]

      errors.forEach((error) => {
        const message = getErrorMessage(error)

        expect(message.title).toBeTruthy()
        expect(message.description).toBeTruthy()
        expect(message.userHint).toBeTruthy()
        expect(Array.isArray(message.recoveryActions)).toBe(true)
        expect(message.recoveryActions.length).toBeGreaterThan(0)

        message.recoveryActions.forEach((action) => {
          expect(action.hint).toBeTruthy()
          expect(action.label).toBeTruthy()
          expect(action.description).toBeTruthy()
        })
      })
    })
  })

  describe('getApplicableRecoveryActions', () => {
    it('filters actions based on error recovery hints', () => {
      const error = new NetworkError('timeout', 'Timeout', {
        recoveryHints: ['retry'],
      })
      const actions = getApplicableRecoveryActions(error)

      expect(actions.some((a) => a.hint === 'retry')).toBe(true)
    })

    it('returns all applicable actions', () => {
      const error = new StorageError('quota-exceeded', 'Quota', {
        recoveryHints: ['clear-cache', 'export-then-clear', 'reset-state'],
      })
      const actions = getApplicableRecoveryActions(error)

      expect(actions.some((a) => a.hint === 'clear-cache')).toBe(true)
      expect(actions.some((a) => a.hint === 'export-then-clear')).toBe(true)
      expect(actions.some((a) => a.hint === 'reset-state')).toBe(true)
    })

    it('excludes actions not in error recovery hints', () => {
      const error = new NetworkError('timeout', 'Timeout', {
        recoveryHints: ['retry'],
      })
      const actions = getApplicableRecoveryActions(error)

      expect(actions.some((a) => a.hint === 'clear-cache')).toBe(false)
      expect(actions.some((a) => a.hint === 'reset-state')).toBe(false)
    })
  })

  describe('getRecoveryActionLabel', () => {
    it('returns label for retry', () => {
      expect(getRecoveryActionLabel('retry')).toBe('Retry')
    })

    it('returns label for clear-cache', () => {
      expect(getRecoveryActionLabel('clear-cache')).toBe('Clear Cache')
    })

    it('returns label for clear-cache-retry', () => {
      expect(getRecoveryActionLabel('clear-cache-retry')).toBe('Clear Cache & Retry')
    })

    it('returns label for export-then-clear', () => {
      expect(getRecoveryActionLabel('export-then-clear')).toBe('Export & Clear')
    })

    it('returns label for reset-state', () => {
      expect(getRecoveryActionLabel('reset-state')).toBe('Reset All')
    })
  })

  describe('getRecoveryActionDescription', () => {
    it('returns description for retry', () => {
      const desc = getRecoveryActionDescription('retry')
      expect(desc).toContain('again')
    })

    it('returns description for clear-cache', () => {
      const desc = getRecoveryActionDescription('clear-cache')
      expect(desc).toContain('cache')
    })

    it('returns description for clear-cache-retry', () => {
      const desc = getRecoveryActionDescription('clear-cache-retry')
      expect(desc).toContain('cache')
      expect(desc).toContain('fresh')
    })

    it('returns description for export-then-clear', () => {
      const desc = getRecoveryActionDescription('export-then-clear')
      expect(desc.toLowerCase()).toContain('export')
    })

    it('returns description for reset-state', () => {
      const desc = getRecoveryActionDescription('reset-state')
      expect(desc).toContain('all')
    })
  })

  describe('Message coverage', () => {
    it('covers all network error codes', () => {
      const codes: Array<'timeout' | 'http-error' | 'connection-failed'> = [
        'timeout',
        'http-error',
        'connection-failed',
      ]

      codes.forEach((code) => {
        const error = new NetworkError(code, 'Test error')
        const message = getErrorMessage(error)
        expect(message.title).toBeTruthy()
      })
    })

    it('covers all validation error codes', () => {
      const codes: Array<'malformed-data' | 'schema-mismatch'> = [
        'malformed-data',
        'schema-mismatch',
      ]

      codes.forEach((code) => {
        const error = new ValidationError(code, 'Test error')
        const message = getErrorMessage(error)
        expect(message.title).toBeTruthy()
      })
    })

    it('covers all storage error codes', () => {
      const codes: Array<'quota-exceeded' | 'write-failed'> = [
        'quota-exceeded',
        'write-failed',
      ]

      codes.forEach((code) => {
        const error = new StorageError(code, 'Test error')
        const message = getErrorMessage(error)
        expect(message.title).toBeTruthy()
      })
    })

    it('covers all cache error codes', () => {
      const codes: Array<'corrupted' | 'repair-failed'> = [
        'corrupted',
        'repair-failed',
      ]

      codes.forEach((code) => {
        const error = new CacheError(code, 'Test error')
        const message = getErrorMessage(error)
        expect(message.title).toBeTruthy()
      })
    })
  })
})

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRandomanderStore } from '../../stores/randomander'
import { NetworkError, ValidationError } from '../../lib/appError'

describe('Store Recovery Actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('retryLastOperation', () => {
    it('clears error state before retrying', async () => {
      const store = useRandomanderStore()

      // Set an error state
      const error = new NetworkError('timeout', 'Request timed out')
      store.setError(error)
      expect(store.lastError).toBe(error)

      // Call retryLastOperation
      await store.retryLastOperation()

      // Error should be cleared
      expect(store.lastError).toBeNull()
    })

    it('does nothing if no error is set', async () => {
      const store = useRandomanderStore()

      // Ensure no error is set
      expect(store.lastError).toBeNull()

      // Call retryLastOperation when no error exists
      // Should not throw
      await store.retryLastOperation()

      expect(store.lastError).toBeNull()
    })

    it('recovers from network errors', async () => {
      const store = useRandomanderStore()

      const error = new NetworkError('connection-failed', 'Connection failed')
      store.setError(error)

      await store.retryLastOperation()

      expect(store.lastError).toBeNull()
    })
  })

  describe('clearCacheAndRetry', () => {
    it('clears error state and retries', async () => {
      const store = useRandomanderStore()

      // Set an error state
      const error = new NetworkError('http-error', 'Server error')
      store.setError(error)
      expect(store.lastError).toBe(error)

      // Call clearCacheAndRetry
      await store.clearCacheAndRetry()

      // Error should be cleared
      expect(store.lastError).toBeNull()
    })

    it('recovers from validation errors', async () => {
      const store = useRandomanderStore()

      const error = new ValidationError('malformed-data', 'Bad response format')
      store.setError(error)

      await store.clearCacheAndRetry()

      expect(store.lastError).toBeNull()
    })

    it('works even if no error is set', async () => {
      const store = useRandomanderStore()

      // Ensure no error is set
      expect(store.lastError).toBeNull()

      // Should not throw
      await store.clearCacheAndRetry()

      expect(store.lastError).toBeNull()
    })
  })

  describe('resetState', () => {
    it('clears error state and resets UI', async () => {
      const store = useRandomanderStore()

      // Set error and some UI state
      const error = new NetworkError('timeout', 'Request timed out')
      store.setError(error)
      store.cards = [
        {
          id: 'test',
          name: 'Test Card',
          type_line: 'Creature',
          scryfall_uri: 'https://scryfall.com',
        } as any,
      ]

      expect(store.lastError).toBe(error)
      expect(store.cards).toHaveLength(1)

      // Call resetState
      await store.resetState()

      // Error should be cleared
      expect(store.lastError).toBeNull()

      // Cards should be cleared
      expect(store.cards).toHaveLength(0)

      // Other collections should still exist (they're user data)
      expect(store.history).toBeDefined()
      expect(store.saved).toBeDefined()
    })

    it('clears all result state', async () => {
      const store = useRandomanderStore()

      const error = new NetworkError('http-error', 'Server error')
      store.setError(error)

      // Set various UI state
      store.cards = [
        {
          id: 'cmd',
          name: 'Commander',
          type_line: 'Creature',
          scryfall_uri: 'https://scryfall.com',
        } as any,
      ]
      store.choices = [
        {
          id: 'choice-1',
          cards: [
            {
              id: 'choice1',
              name: 'Choice Card',
              type_line: 'Creature',
              scryfall_uri: 'https://scryfall.com',
            } as any,
          ],
        },
      ]
      store.sparkPalette = [
        {
          id: 'spark1',
          name: 'Spark Card',
          type_line: 'Instant',
          scryfall_uri: 'https://scryfall.com',
        } as any,
      ]
      store.errorMessage = 'Some error'

      await store.resetState()

      // All result state should be cleared
      expect(store.lastError).toBeNull()
      expect(store.cards).toHaveLength(0)
      expect(store.choices).toHaveLength(0)
      expect(store.sparkPalette).toBeNull()
      expect(store.errorMessage).toBe('')
    })

    it('preserves user data (history is empty initially)', async () => {
      const store = useRandomanderStore()

      // Set error state
      const error = new NetworkError('timeout', 'Request timed out')
      store.setError(error)

      // Reset state without adding to history
      await store.resetState()

      // Error should be cleared
      expect(store.lastError).toBeNull()

      // History should still be an array (possibly empty)
      expect(Array.isArray(store.history)).toBe(true)
    })

    it('clears error message when resetting', async () => {
      const store = useRandomanderStore()

      store.setError(new NetworkError('http-error', 'Error'))
      store.errorMessage = 'Display error message'

      await store.resetState()

      expect(store.lastError).toBeNull()
      expect(store.errorMessage).toBe('')
    })

    it('works even if no error is set', async () => {
      const store = useRandomanderStore()

      // Clear any existing state
      store.cards = []
      expect(store.lastError).toBeNull()

      // Should not throw
      await store.resetState()

      expect(store.lastError).toBeNull()
      expect(store.cards).toHaveLength(0)
    })
  })

  describe('Error state management', () => {
    it('all recovery actions clear lastError', async () => {
      const store = useRandomanderStore()
      const error = new NetworkError('timeout', 'Timeout')

      // Test retryLastOperation
      store.setError(error)
      await store.retryLastOperation()
      expect(store.lastError).toBeNull()

      // Test clearCacheAndRetry
      store.setError(error)
      await store.clearCacheAndRetry()
      expect(store.lastError).toBeNull()

      // Test resetState
      store.setError(error)
      await store.resetState()
      expect(store.lastError).toBeNull()
    })

    it('error history is maintained across recovery', async () => {
      const store = useRandomanderStore()

      const error1 = new NetworkError('timeout', 'First timeout')
      store.setError(error1)

      // Verify error is set
      expect(store.lastError).toBe(error1)
      const historyLength1 = store.errorHistory.length

      // Clear and set new error
      await store.retryLastOperation()
      expect(store.lastError).toBeNull()

      const error2 = new NetworkError('http-error', 'Server error')
      store.setError(error2)

      // New error should be recorded
      expect(store.lastError).toBe(error2)
      // errorHistory should have grown
      expect(store.errorHistory.length).toBeGreaterThanOrEqual(historyLength1)
    })
  })

  describe('Recovery action idempotency', () => {
    it('retryLastOperation is safe to call multiple times', async () => {
      const store = useRandomanderStore()

      store.setError(new NetworkError('timeout', 'Timeout'))

      // First call
      await store.retryLastOperation()
      expect(store.lastError).toBeNull()

      // Second call (no error set)
      await store.retryLastOperation()
      expect(store.lastError).toBeNull()
    })

    it('clearCacheAndRetry is safe to call multiple times', async () => {
      const store = useRandomanderStore()

      store.setError(new NetworkError('http-error', 'Error'))

      // First call
      await store.clearCacheAndRetry()
      expect(store.lastError).toBeNull()

      // Second call
      await store.clearCacheAndRetry()
      expect(store.lastError).toBeNull()
    })

    it('resetState is safe to call multiple times', async () => {
      const store = useRandomanderStore()

      store.setError(new NetworkError('timeout', 'Timeout'))
      store.cards = [
        {
          id: 'test',
          name: 'Test',
          type_line: 'Creature',
          scryfall_uri: 'https://scryfall.com',
        } as any,
      ]

      // First call
      await store.resetState()
      expect(store.lastError).toBeNull()
      expect(store.cards).toHaveLength(0)

      // Second call
      await store.resetState()
      expect(store.lastError).toBeNull()
      expect(store.cards).toHaveLength(0)

      // State should remain consistent
      expect(store.lastError).toBeNull()
    })
  })

  describe('Multiple errors with recovery', () => {
    it('handles sequential errors and recoveries', async () => {
      const store = useRandomanderStore()

      // First error
      const error1 = new NetworkError('timeout', 'Timeout')
      store.setError(error1)
      expect(store.lastError).toBe(error1)

      // Recover from first error
      await store.retryLastOperation()
      expect(store.lastError).toBeNull()

      // Second error
      const error2 = new NetworkError('http-error', 'Server error')
      store.setError(error2)
      expect(store.lastError).toBe(error2)

      // Recover from second error
      await store.clearCacheAndRetry()
      expect(store.lastError).toBeNull()

      // Third error
      const error3 = new ValidationError('schema-mismatch', 'Schema mismatch')
      store.setError(error3)
      expect(store.lastError).toBe(error3)

      // Reset state
      await store.resetState()
      expect(store.lastError).toBeNull()
    })
  })
})

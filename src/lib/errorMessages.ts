import {
  type ErrorType,
  type ErrorCode,
  type RecoveryHint,
  AppError,
} from './appError'

export interface ErrorMessageTemplate {
  title: string
  description: string
  userHint: string
  recoveryActions: Array<{
    hint: RecoveryHint
    label: string
    description: string
  }>
}

type ErrorMessageMap = Record<
  ErrorType,
  Record<ErrorCode, ErrorMessageTemplate>
>

/**
 * User-friendly error messages mapped by error type and code.
 * Each message includes a title, description, hint, and recovery actions.
 */
const ERROR_MESSAGES: ErrorMessageMap = {
  network: {
    timeout: {
      title: 'Connection Timeout',
      description:
        'The request took too long to complete. This usually happens when the connection is slow or the server is not responding.',
      userHint:
        'Your internet connection might be slow or unstable. Try again or check your connection.',
      recoveryActions: [
        {
          hint: 'retry',
          label: 'Retry',
          description: 'Try the request again',
        },
      ],
    },
    'http-error': {
      title: 'Server Error',
      description:
        'The server encountered an error while processing your request. This is usually temporary.',
      userHint:
        'The card service is having issues. Please try again in a moment.',
      recoveryActions: [
        {
          hint: 'retry',
          label: 'Retry',
          description: 'Try the request again',
        },
        {
          hint: 'clear-cache',
          label: 'Clear Cache',
          description: 'Clear cached data and try again',
        },
      ],
    },
    'connection-failed': {
      title: 'Connection Failed',
      description:
        'Unable to establish a connection to the server. Check your internet connection.',
      userHint:
        'Please check your internet connection and try again.',
      recoveryActions: [
        {
          hint: 'retry',
          label: 'Retry',
          description: 'Try connecting again',
        },
      ],
    },
  },

  validation: {
    'malformed-data': {
      title: 'Invalid Response Format',
      description:
        'The server sent data in an unexpected format. The data might be corrupted.',
      userHint:
        'The card data appears to be corrupted. Try clearing the cache and try again.',
      recoveryActions: [
        {
          hint: 'clear-cache-retry',
          label: 'Clear Cache & Retry',
          description: 'Clear cached data and fetch fresh data',
        },
        {
          hint: 'clear-cache',
          label: 'Clear Cache',
          description: 'Clear all cached card data',
        },
      ],
    },
    'schema-mismatch': {
      title: 'Unexpected Data Structure',
      description:
        'The server sent data with an unexpected structure. This might be a compatibility issue.',
      userHint:
        'The card data format is not recognized. Try refreshing the page or clearing the cache.',
      recoveryActions: [
        {
          hint: 'clear-cache-retry',
          label: 'Clear Cache & Retry',
          description: 'Clear cached data and fetch fresh data',
        },
        {
          hint: 'reset-state',
          label: 'Reset All',
          description: 'Clear all data and start fresh',
        },
      ],
    },
  },

  storage: {
    'quota-exceeded': {
      title: 'Storage Full',
      description:
        'Your browser storage is full. Randomander cannot save more cards.',
      userHint:
        'Your browser is running out of storage space. Remove some saved cards or clear the cache.',
      recoveryActions: [
        {
          hint: 'clear-cache',
          label: 'Clear Cache',
          description: 'Remove cached card data',
        },
        {
          hint: 'export-then-clear',
          label: 'Export & Clear',
          description: 'Export saved cards before clearing',
        },
        {
          hint: 'reset-state',
          label: 'Reset All',
          description: 'Clear all data and start fresh',
        },
      ],
    },
    'write-failed': {
      title: 'Storage Error',
      description: 'Could not save data to your browser storage.',
      userHint:
        'Your browser storage is not accessible. Try refreshing the page or using a different browser.',
      recoveryActions: [
        {
          hint: 'retry',
          label: 'Retry',
          description: 'Try saving again',
        },
        {
          hint: 'clear-cache',
          label: 'Clear Cache',
          description: 'Clear some space and retry',
        },
      ],
    },
  },

  cache: {
    corrupted: {
      title: 'Cache Corrupted',
      description:
        'The cached card data is corrupted and cannot be used. A fresh copy will be loaded.',
      userHint:
        'Your cached card data was damaged. It will be refreshed automatically.',
      recoveryActions: [
        {
          hint: 'clear-cache',
          label: 'Clear Cache',
          description: 'Remove all cached data',
        },
        {
          hint: 'retry',
          label: 'Retry',
          description: 'Try fetching fresh data',
        },
      ],
    },
    'repair-failed': {
      title: 'Cache Repair Failed',
      description:
        'The cached card data could not be repaired and must be cleared.',
      userHint:
        'The card data cache is damaged and must be cleared. Fresh data will be loaded.',
      recoveryActions: [
        {
          hint: 'clear-cache',
          label: 'Clear Cache',
          description: 'Remove the corrupted cache',
        },
        {
          hint: 'clear-cache-retry',
          label: 'Clear & Refresh',
          description: 'Clear cache and reload data',
        },
      ],
    },
  },
}

/**
 * Get a user-friendly error message for a given error.
 * Falls back to generic message if specific error type/code not found.
 */
export function getErrorMessage(error: AppError | Error): ErrorMessageTemplate {
  if (!(error instanceof AppError)) {
    return {
      title: 'Unexpected Error',
      description: 'An unexpected error occurred.',
      userHint: 'Please refresh the page and try again.',
      recoveryActions: [
        {
          hint: 'retry',
          label: 'Retry',
          description: 'Try again',
        },
      ],
    }
  }

  const typeMessages = ERROR_MESSAGES[error.type]
  if (!typeMessages) {
    return {
      title: 'Error',
      description: error.message || 'An error occurred.',
      userHint: 'Something went wrong. Please try again.',
      recoveryActions: [
        {
          hint: 'retry',
          label: 'Retry',
          description: 'Try again',
        },
      ],
    }
  }

  const codeMessage = typeMessages[error.code]
  if (!codeMessage) {
    return {
      title: 'Error',
      description: error.message || 'An error occurred.',
      userHint: 'Something went wrong. Please try again.',
      recoveryActions: [
        {
          hint: 'retry',
          label: 'Retry',
          description: 'Try again',
        },
      ],
    }
  }

  return codeMessage
}

/**
 * Filter recovery actions to only include those applicable to this error.
 */
export function getApplicableRecoveryActions(
  error: AppError
): ErrorMessageTemplate['recoveryActions'] {
  const message = getErrorMessage(error)
  const applicableHints = new Set(error.recoveryHints)

  return message.recoveryActions.filter((action) =>
    applicableHints.has(action.hint)
  )
}

/**
 * Get a human-readable label for a recovery action hint.
 */
export function getRecoveryActionLabel(
  hint: RecoveryHint
): string {
  const labels: Record<RecoveryHint, string> = {
    retry: 'Retry',
    'clear-cache': 'Clear Cache',
    'clear-cache-retry': 'Clear Cache & Retry',
    'export-then-clear': 'Export & Clear',
    'reset-state': 'Reset All',
  }

  return labels[hint] || hint
}

/**
 * Get a human-readable description for a recovery action hint.
 */
export function getRecoveryActionDescription(
  hint: RecoveryHint
): string {
  const descriptions: Record<RecoveryHint, string> = {
    retry: 'Try the operation again',
    'clear-cache': 'Remove cached card data',
    'clear-cache-retry': 'Clear cache and fetch fresh data',
    'export-then-clear': 'Export saved cards before clearing',
    'reset-state': 'Clear all data and start fresh',
  }

  return descriptions[hint] || hint
}

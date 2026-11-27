# Proposal

## Why

Randomander currently handles errors inconsistently across network requests, data validation, storage, and caching. When failures occur—network timeouts, malformed API responses, storage quota issues, cache corruption—the app either silently fails, throws unhandled errors, or shows generic messages. This prevents users from understanding what went wrong and prevents developers from diagnosing issues. A unified error handling strategy will improve reliability, debuggability, and user experience.

## What Changes

- **Error Classification**: Define and standardize error types for network, data validation, storage, and cache failures
- **User Feedback**: Display clear, actionable error messages to users instead of silent failures or generic alerts
- **Developer Diagnostics**: Add structured logging and error context (error type, source, metadata) for debugging
- **Graceful Degradation**: Implement fallback strategies (retry, cache fallback, partial results) for recoverable errors
- **Error Recovery**: Persist error state and validated operation inputs for recovery after reload, using IndexedDB when localStorage fails; provide recovery options (clear cache, reload, try again) and report persistence failures
- **Consistency**: Extend error handling across all data sources (Scryfall, EDHREC, local storage, cache)

## Capabilities

### New Capabilities

- `error-handling-classification`: System-wide error type definitions (network, validation, storage, cache) with structured metadata
- `error-handling-recovery`: Automatic and user-initiated recovery strategies for different error classes (retry, cache fallback, state reset)
- `error-handling-user-feedback`: Error messages and UI indicators that communicate failures to users clearly and actionably
- `error-handling-diagnostics`: Structured logging and error context for developer debugging and observability

### Impacted Areas

- Cache management: Error handling and recovery for cache read/write failures, corruption detection, and fallback to fresh API responses
- Data validation: Validation errors that surface to users with context about what failed and why (not just silent rejection)
- API requests: Network error handling with timeout detection, partial failure recovery, and automatic retries for transient failures

## Impact

- **Services**: `src/services/http.ts`, `src/services/scryfall.ts`, `src/services/edhrec.ts` — HTTP error handling, API-specific errors
- **Libraries**: `src/lib/cache.ts`, `src/lib/storage.ts`, `src/lib/runtimeValidation.ts` — Validation, persistence, and cache errors
- **Stores**: `src/stores/randomander.ts`, `src/stores/persistenceCoordinator.ts` — Error state tracking and recovery
- **UI**: Views and components will display error states and recovery options (not yet specified in detail)
- **Tests**: Existing error tests in `src/__tests__/services/` and `src/__tests__/lib/` will be updated to match new error patterns

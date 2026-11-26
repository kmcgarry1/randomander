# Spec Delta

## Purpose

Defines automatic and user-initiated recovery strategies that allow the system to recover from classified errors, restoring functionality after transient or recoverable failures.

## ADDED Requirements

### Requirement: Automatic retry with exponential backoff
The system SHALL automatically retry failed network requests (network type errors) with exponential backoff: initial delay 100ms, max delay 10s, up to 3 attempts. Each retry SHALL use the same request parameters and timeout.

#### Scenario: First network error triggers automatic retry
- **WHEN** an HTTP request fails with type `network`, code `timeout`
- **THEN** the system waits 100ms and retries the same request

#### Scenario: Retry fails after max attempts
- **WHEN** a request fails and all 3 retry attempts exhaust
- **THEN** the error is surfaced to the caller with code `max-retries-exceeded`

#### Scenario: Backoff increases exponentially
- **WHEN** retry attempt N fails and N < 3
- **THEN** the next attempt waits (100ms * 2^N) milliseconds before retrying

### Requirement: Cache-driven fallback for validation errors
When validation fails on freshly fetched data, the system SHALL attempt to recover by using cached data from the previous successful fetch, if available, while logging the validation error for diagnostics.

#### Scenario: Validation error falls back to cache
- **WHEN** JSON validation fails on new data with recovery hint `clear-cache-retry`
- **THEN** the system checks cache; if valid cached data exists, it returns the cache entry and queues a background refresh; if no cache, it surfaces the validation error

#### Scenario: Failed validation with no cached alternative
- **WHEN** validation fails and no valid cache entry exists
- **THEN** the error is surfaced to calling code with type `validation` and recovery hints

### Requirement: User-initiated recovery actions
The system SHALL track the last error state (type, code, timestamp, message, recovery hints). Users or calling code MAY invoke recovery actions: `clear-cache`, `retry`, `export-data`, `reset-state`.

#### Scenario: User clears cache to recover from storage error
- **WHEN** a storage `quota-exceeded` error occurs and user invokes recovery action `clear-cache`
- **THEN** the system clears the response cache (not persisted state), retries the failed operation, and reports success or new error

#### Scenario: Retry after user action
- **WHEN** a previous error is recorded and user invokes `retry`
- **THEN** the system reattempts the last failed operation with fresh request parameters

#### Scenario: State reset clears error and cached results
- **WHEN** user invokes recovery action `reset-state`
- **THEN** the system clears the last error, clears response cache, and resets in-memory choice state; persisted History and Saved records remain intact

### Requirement: Recovery state is persistent across reloads
The system SHALL persist the last error state (type, code, message, recovery hints, timestamp) so users can retry after a page reload if needed. Persisted error state SHALL be cleared once recovery succeeds.

#### Scenario: Error persists across reload
- **WHEN** an error occurs, page reloads, and error state is queried
- **THEN** the error state from before reload is available for retry

#### Scenario: Successful recovery clears persisted error
- **WHEN** error state is persisted and a retry succeeds
- **THEN** the persisted error is cleared

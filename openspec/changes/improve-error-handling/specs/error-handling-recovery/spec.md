# Spec Delta

## Purpose

Defines automatic and user-initiated recovery strategies that allow the system to recover from classified errors, restoring functionality after transient or recoverable failures.

## ADDED Requirements

### Requirement: Automatic retry with exponential backoff
The system SHALL automatically retry timeouts, connection failures, HTTP 408 and 5xx responses, with at most 3 total attempts and minimum backoffs of 100ms and 200ms after the first and second failures. Upstream pacing MAY delay an attempt further. Other 4xx responses, including 429, SHALL NOT be retried automatically by the HTTP layer. Each retry SHALL use the same request parameters and timeout, and cancellation SHALL interrupt the wait.

#### Scenario: First network error triggers automatic retry
- **WHEN** an HTTP request fails with type `network`, code `timeout`
- **THEN** the system waits at least 100ms and retries the same request when upstream pacing permits

#### Scenario: Retry fails after max attempts
- **WHEN** a retryable request fails on all 3 attempts
- **THEN** the final classified network error is surfaced with its original code and retry exhaustion recorded in its context

#### Scenario: Backoff increases exponentially
- **WHEN** the first or second attempt fails with a retryable error
- **THEN** the next attempt waits at least 100ms or 200ms respectively before retrying

#### Scenario: Connection failure is retried
- **WHEN** an attempt fails because a connection cannot be established
- **THEN** the system retries it within the same attempt limit and backoff schedule

#### Scenario: Rate limiting is not retried by HTTP
- **WHEN** an attempt receives HTTP 429
- **THEN** the HTTP layer surfaces the error without retrying so service-specific rate-limit handling can run

### Requirement: Retries respect upstream and workflow limits
Every Scryfall HTTP attempt SHALL obey the global minimum 150ms spacing between request starts and the Scryfall 429 cooldown. Every actual HTTP attempt in a draw or follow-up workflow, including retries, SHALL count once against its shared 24-call budget. The workflow deadline and cancellation SHALL apply while waiting for backoff or pacing.

#### Scenario: Scryfall retry follows backoff and pacing
- **WHEN** a Scryfall attempt fails immediately with a retryable error
- **THEN** its retry starts no sooner than 100ms after the failure and no sooner than 150ms after the previous Scryfall request start

#### Scenario: Concurrent Scryfall requests include retries
- **WHEN** multiple Scryfall operations and retries are scheduled
- **THEN** all request starts remain at least 150ms apart and no attempt starts during a 429 cooldown

#### Scenario: Draw attempt budget is exhausted
- **WHEN** a draw or follow-up workflow has started 24 HTTP attempts and needs another
- **THEN** no further attempt starts and the workflow reports its budget stop reason rather than retry exhaustion

#### Scenario: Cached or cancelled request consumes no call
- **WHEN** a request is served from cache or cancelled before its HTTP attempt starts
- **THEN** that request consumes no draw-workflow call budget

#### Scenario: Workflow deadline expires while waiting
- **WHEN** the draw deadline expires during retry backoff or upstream pacing
- **THEN** the pending attempt does not start and the workflow reports its timeout stop reason

### Requirement: Cache-driven fallback for validation errors
When validation fails on freshly fetched data, the system SHALL attempt to recover using validated cached data from a previous successful fetch, including expired data, while logging the validation error for diagnostics.

#### Scenario: Validation error falls back to cache
- **WHEN** JSON validation fails on new data and valid cached data exists
- **THEN** the system returns the cached entry with stale-data provenance, warns the user, and queues one background refresh

#### Scenario: Background refresh is a separate operation
- **WHEN** a stale-cache fallback queues a background refresh
- **THEN** its attempts use the normal HTTP attempt limit and Scryfall pacing and cooldown, without consuming the originating draw's call budget or deadline

#### Scenario: Failed validation with no cached alternative
- **WHEN** validation fails and no valid cache entry exists
- **THEN** the error is surfaced to calling code with type `validation` and recovery hints

#### Scenario: Cache cleared while refresh is pending
- **WHEN** the cache is cleared while a fallback refresh is pending
- **THEN** the pending refresh does not repopulate the cleared cache

### Requirement: User-initiated recovery actions
The system SHALL track the last error state (type, code, timestamp, message, recovery hints) and a validated, serializable descriptor of the failed operation and its required inputs. Users or calling code MAY invoke supported recovery actions: `clear-cache`, `retry`, `export-data`, `reset-state`. The `export-then-clear` hint directs the user to export data before clearing storage.

#### Scenario: User clears cache to recover from storage error
- **WHEN** a storage `quota-exceeded` error occurs and user invokes recovery action `clear-cache`
- **THEN** the system verifies the affected targets first; if safe, it clears the response cache (not persisted state), retries the failed operation, and reports success or the failure

#### Scenario: Retry after user action
- **WHEN** a previous error is recorded and user invokes `retry`
- **THEN** the system reattempts the actual failed operation with its captured inputs when its recovery preconditions are satisfied

#### Scenario: Recovery fails again
- **WHEN** a recovery action fails
- **THEN** the system retains an error and a usable recovery descriptor instead of clearing the error as if recovery succeeded

#### Scenario: State reset clears error and cached results
- **WHEN** user invokes recovery action `reset-state`
- **THEN** the system clears the last error, clears response cache, and resets in-memory choice state; persisted History and Saved records remain intact

### Requirement: Storage recovery protects changed data
Before replaying a failed storage operation, the system SHALL verify affected targets against recorded baselines and coordinate the check and replay with other app-tab writes. If targets have changed, cannot be verified, or cannot be safely coordinated, it SHALL stop without overwriting current data, preserve recovery state, and report the issue.

#### Scenario: Unchanged target is retried
- **WHEN** the affected storage targets match their recorded baselines and replay can be coordinated safely
- **THEN** the system retries the failed operation with its captured inputs

#### Scenario: Another tab changes the target
- **WHEN** a failed clear or save operation is retried after another app tab changes an affected target
- **THEN** the system does not apply the old operation or overwrite the newer data and reports the conflict

#### Scenario: A target cannot be verified
- **WHEN** a target baseline is missing or invalid, or the current target cannot be read or safely coordinated
- **THEN** the system does not replay the operation and reports that it cannot safely retry

#### Scenario: A change races a retry
- **WHEN** another app tab attempts to change an affected target during a storage retry
- **THEN** the check and replay do not overwrite that intervening change

#### Scenario: Failure left known partial effects
- **WHEN** the failed operation already completed some storage changes before failing
- **THEN** its recovery baseline accounts for those known effects before deciding whether replay is safe

### Requirement: Recovery state is persistent across reloads
The system SHALL persist the last error and its validated operation descriptor so users can retry draw, partner/choice and storage operations after reload. It SHALL use localStorage first and IndexedDB if localStorage fails. Persisted copies SHALL be cleared after successful recovery or dismissal; cleanup failures SHALL be reported.

#### Scenario: Error persists across reload
- **WHEN** an error occurs, page reloads, and error state is queried
- **THEN** the error and validated operation inputs from before reload are available to retry the same operation

#### Scenario: Successful recovery clears persisted error
- **WHEN** error state is persisted and a retry succeeds
- **THEN** persisted copies in both backends are cleared so an older error does not reappear after reload

#### Scenario: Recovery state falls back to IndexedDB
- **WHEN** localStorage cannot persist a recovery record and IndexedDB is available
- **THEN** the record is persisted to IndexedDB and restored after reload

#### Scenario: Neither persistence backend is available
- **WHEN** both localStorage and IndexedDB fail to save the recovery record
- **THEN** the system keeps it in memory and warns that recovery cannot be restored after reload

#### Scenario: User dismisses an error
- **WHEN** the user dismisses the recorded error
- **THEN** the system clears in-memory and persisted copies, reporting any failure to clear persistent copies

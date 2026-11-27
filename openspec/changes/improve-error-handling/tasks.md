# Tasks

## 1. Error Class Hierarchy

- [x] 1.1 Create `src/lib/appError.ts` with `AppError` base class and subclasses (`NetworkError`, `ValidationError`, `StorageError`, `CacheError`) with `type`, `code`, `message`, `metadata`, `recoveryHints`, `timestamp`, `sourceId`, `requestId` properties; verify unit tests cover all error types and serialization to JSON
- [x] 1.2 Create `src/lib/errorContext.ts` with `ErrorContext` interface and `createErrorContext()` function that builds structured error objects; verify functions handle undefined/partial metadata gracefully
- [x] 1.3 Update `src/services/http.ts` to throw `NetworkError` (instead of `HttpError`/`RequestTimeoutError`) with appropriate code (`timeout`, `http-error`, `connection-failed`) and recovery hints; verify existing http tests still pass and new error types are thrown correctly

## 2. HTTP Retry Logic

- [x] 2.1 Configure `src/services/http.ts` for at most 3 total attempts with 100ms and 200ms delays; retry timeouts, connection failures, 408 and 5xx, but not other 4xx including 429; verify each case and cancellable backoff
- [ ] 2.2 Update `retryAsync()` and `fetchJson()` to preserve the final classified network error code and record retry exhaustion in context; test exhaustion and successful retries

## 3. Runtime Validation Error Handling

- [x] 3.1 Update `src/lib/runtimeValidation.ts` to extend `ValidationError` for `RuntimeDataError`; include field path and expected schema in metadata; verify validation tests pass and error includes structured field context

## 4. Cache Error Classification and Fallback

- [x] 4.1 Update `src/lib/cache.ts` decode/encode functions to classify cache errors explicitly (throw `CacheError` with code `corrupted`, `quota-exceeded`, etc.) instead of generic errors; verify cache tests pass and error types are correct
- [x] 4.2 Implement cache fallback logic in `src/services/scryfall.ts`: when validation fails, check cache for valid entry; if found, return cache and queue refresh; if not found, surface validation error; verify tests cover cache hit, cache miss, and refresh scenarios

## 5. Error State Management in Pinia Store

- [ ] 5.1 Update `lastError`, `errorHistory`, `setError()`, `clearError()`, and `retryLastOperation()` in `src/stores/randomander.ts` to retain recovery state on failure and explicitly report persistence and cleanup failures; verify state changes and failure paths in store tests
- [ ] 5.2 Update error handling in drawing workflow (`src/stores/drawWorkflow.ts`) to call store's `setError()` on failures; verify workflow tests confirm errors are captured and stored

## 6. Structured Logging

- [x] 6.1 Create `src/lib/errorLogger.ts` with `ErrorLogger` class that emits structured logs to console (JSON format) and in-memory buffer (max 50 entries); include timestamp, error type, source, metadata, breadcrumbs; verify tests confirm logging, buffer management, and export functionality
- [ ] 6.2 Generate one operation ID per user operation and a distinct request ID per HTTP attempt; propagate IDs across retries and multiple requests, and test correlation
- [ ] 6.3 Integrate `ErrorLogger` into HTTP service, cache, and storage to emit logs on errors with the applicable operation and attempt IDs; verify logs and context correlate correctly

## 7. User-Facing Error Messages

- [x] 7.1 Create `src/lib/errorMessages.ts` with mapping from error type/code to user-friendly message template; include recovery action descriptions; verify message coverage for network, validation, storage, and cache errors
- [ ] 7.2 Add error display support to `src/features/draw/DrawView.vue` (or appropriate component): show the error and only applicable, working recovery actions; verify error display, stale-cache warning, and persistence or cleanup failure warnings

## 8. Recovery Actions UI Integration

- [ ] 8.1 Implement recovery action handlers in store: `retryLastOperation()`, `clearCacheAndRetry()`, `resetState()` as Pinia actions; verify they perform the correct operation, clear errors only on success or dismissal, and preserve recovery state on failure
- [ ] 8.2 Connect error UI recovery buttons to store actions; verify clicking each button invokes the correct action and updates UI state (loading → success/error)

## 9. Persistence and Cross-Session Recovery

- [ ] 9.1 Persist and restore the last error and a validated, serializable operation descriptor with inputs for draw, partner/choice, and storage operations; test reload and replay of each operation and reject invalid descriptors without offering a broken retry
- [ ] 9.2 Clear persisted recovery records from both backends after successful recovery or dismissal; verify reload cannot resurrect old records and cleanup failures are reported
- [ ] 9.3 Use localStorage first and IndexedDB when localStorage fails; test fallback, reload, and explicit warning with in-memory recovery when both backends fail

## 10. Test Coverage and Verification

- [ ] 10.1 Add integration tests in `src/__tests__/stores/errorHandling.integration.test.ts` covering error → store state → UI → retry → success or failure, including recovery after reload and persistence fallback; verify tests pass and coverage meets thresholds (>85% statements, >80% branches)
- [ ] 10.2 Update existing tests in `src/__tests__/services/` and `src/__tests__/lib/` to verify error types are thrown correctly and error metadata is complete; verify all existing tests still pass

## 11. Documentation

- [ ] 11.1 Create `docs/error-handling.md` documenting error class hierarchy, recovery strategies, and logging; include examples of handling network, validation, storage, and cache errors; verify documentation is consistent with code and specs
- [ ] 11.2 Add JSDoc comments to all public error classes and functions in appError.ts, errorContext.ts, and errorLogger.ts; verify documentation renders correctly

## 12. Verification and Cleanup

- [ ] 12.1 Run full test suite and verify all tests pass with coverage ≥85% statements, ≥80% branches, ≥88% functions; verify `npm run build` succeeds
- [ ] 12.2 Manual smoke test: trigger network error (disable API), validation error (bad response), storage error (quota); verify error messages display, recovery buttons work, and errors persist across reload; verify app remains functional and shows cached data when applicable

## Workflow follow-up

- Archive the change after all tasks are complete and verification passes.
- Verify the archived result merges error handling specifications into the main spec.

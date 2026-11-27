# Tasks

## 1. Error Class Hierarchy

- [x] 1.1 Create `src/lib/appError.ts` with `AppError` base class and subclasses (`NetworkError`, `ValidationError`, `StorageError`, `CacheError`) with `type`, `code`, `message`, `metadata`, `recoveryHints`, `timestamp`, `sourceId`, `requestId` properties; verify unit tests cover all error types and serialization to JSON
- [x] 1.2 Create `src/lib/errorContext.ts` with `ErrorContext` interface and `createErrorContext()` function that builds structured error objects; verify functions handle undefined/partial metadata gracefully
- [x] 1.3 Update `src/services/http.ts` to throw `NetworkError` (instead of `HttpError`/`RequestTimeoutError`) with appropriate code (`timeout`, `http-error`, `connection-failed`) and recovery hints; verify existing http tests still pass and new error types are thrown correctly

## 2. HTTP Retry Logic

- [x] 2.1 Add retry configuration to `src/services/http.ts`: exponential backoff (100ms, 200ms, 400ms), max 3 attempts, skip retry on 4xx errors (except 408); verify unit tests confirm retry happens on timeout and 503, skips on 404
- [x] 2.2 Implement `retryAsync()` helper function in `src/services/http.ts` and use it in `fetchJson()`; verify tests cover all retry scenarios and final failure after max attempts

## 3. Runtime Validation Error Handling

- [x] 3.1 Update `src/lib/runtimeValidation.ts` to extend `ValidationError` for `RuntimeDataError`; include field path and expected schema in metadata; verify validation tests pass and error includes structured field context

## 4. Cache Error Classification and Fallback

- [x] 4.1 Update `src/lib/cache.ts` decode/encode functions to classify cache errors explicitly (throw `CacheError` with code `corrupted`, `quota-exceeded`, etc.) instead of generic errors; verify cache tests pass and error types are correct
- [x] 4.2 Implement cache fallback logic in `src/services/scryfall.ts`: when validation fails, check cache for valid entry; if found, return cache and queue refresh; if not found, surface validation error; verify tests cover cache hit, cache miss, and refresh scenarios

## 5. Error State Management in Pinia Store

- [x] 5.1 Add `lastError` and `errorHistory` properties to `src/stores/randomander.ts`; add `setError()`, `clearError()`, `retryLastOperation()` actions; persist `lastError` to `randomander:state:v3:error` localStorage key; verify store tests confirm state is set, persisted, and cleared correctly
- [ ] 5.2 Update error handling in drawing workflow (`src/stores/drawWorkflow.ts`) to call store's `setError()` on failures; verify workflow tests confirm errors are captured and stored

## 6. Structured Logging

- [x] 6.1 Create `src/lib/errorLogger.ts` with `ErrorLogger` class that emits structured logs to console (JSON format) and in-memory buffer (max 50 entries); include timestamp, error type, source, metadata, breadcrumbs; verify tests confirm logging, buffer management, and export functionality
- [ ] 6.2 Add request ID generation to `src/services/http.ts`: generate UUID for each request and include it in log entries; verify tests confirm all logs from same request share same request ID
- [x] 6.3 Integrate `ErrorLogger` into HTTP service, cache, and storage to emit logs on all errors; verify unit tests confirm logs are emitted with correct structure

## 7. User-Facing Error Messages

- [x] 7.1 Create `src/lib/errorMessages.ts` with mapping from error type/code to user-friendly message template; include recovery action descriptions; verify message coverage for network, validation, storage, and cache errors
- [ ] 7.2 Add error display support to `src/features/draw/DrawView.vue` (or appropriate component): show error message banner with recovery buttons ([Retry], [Clear Cache], [Reset State]) based on `store.lastError`; verify error UI appears when error is set and disappears when cleared

## 8. Recovery Actions UI Integration

- [ ] 8.1 Implement recovery action handlers in store: `retryLastOperation()`, `clearCacheAndRetry()`, `resetState()` as Pinia actions; verify tests confirm each action clears error state and triggers appropriate recovery logic
- [ ] 8.2 Connect error UI recovery buttons to store actions; verify clicking each button invokes the correct action and updates UI state (loading → success/error)

## 9. Persistence and Cross-Session Recovery

- [ ] 9.1 Persist `lastError` to localStorage on every error; load persisted error on app init and display recovery message if error state exists; verify tests confirm persistence, reload, and display of persisted errors
- [ ] 9.2 Verify that successful recovery (retry succeeds) clears persisted error; verify tests confirm persisted error is removed after successful operation

## 10. Test Coverage and Verification

- [ ] 10.1 Add integration tests in `src/__tests__/stores/errorHandling.integration.test.ts` covering full error flow: API error → store error state → UI display → user retry → recovery; verify tests pass and coverage meets thresholds (>85% statements, >80% branches)
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

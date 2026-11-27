# Design

## Context

Randomander already has error types in place:
- `HttpError` and `RequestTimeoutError` in `src/services/http.ts` for network failures
- `RuntimeDataError` in `src/lib/runtimeValidation.ts` for validation failures
- Implicit cache and storage errors handled in `src/lib/cache.ts` and `src/lib/storage.ts`

Currently, errors are inconsistently handled: some are caught and logged, some propagate uncaught, and some fail silently. There is no unified way to classify errors, track recovery state, or surface errors to the UI. The app lacks structured logging for diagnostics and does not persist error state across reloads.

See proposal.md for motivation and business drivers.

## Goals / Non-Goals

**Goals:**
- Create a unified `AppError` base class and subclasses for each error type (network, validation, storage, cache) with structured metadata
- Classify errors consistently across all services and libraries
- Track last error state in Pinia store for UI access and recovery
- Implement automatic retry logic with exponential backoff for network errors
- Provide cache fallback when validation fails on fresh data
- Persist error state and operation inputs for recovery across reloads, with an IndexedDB fallback
- Emit structured logs (console, in-memory buffer) with full context for developer diagnostics
- Extend HTTP service with retry logic and timeout standardization
- Update cache decode/encode to classify cache errors explicitly
- Update validation functions to throw or return classified errors with field context

**Non-Goals:**
- Implement browser-side error reporting to external services (e.g., Sentry) — logging stays local
- Build a UI for error history or error analytics — only last error is tracked
- Add HTTP circuit breaker or complex fallback policies — simple retry/cache-fallback only
- Modify persisted application state beyond the recovery record
- Change Scryfall or EDHREC API contract or add caching layers beyond existing cache

## Decisions

### Decision: Unified Error Class Hierarchy
Create an `AppError` base class (extends `Error`) with subclasses for each error type. Each error includes: `type` (network|validation|storage|cache), `code` (specific code like `timeout`, `quota-exceeded`), `message`, `metadata` (structured context), `recoveryHints` (array of applicable recovery actions), `timestamp`, `sourceId` (URL, field name, etc.), `requestId` (for correlation).

**Rationale:** Allows type-safe error handling in calling code and consistent serialization for logging.

**Alternatives considered:**
- Use error codes only (e.g., `E001`, `E002`): requires separate error message lookup table; less type-safe
- Extend each built-in error type (TypeError, etc.): pollutes Error semantics; harder to track metadata

### Decision: Retry at HTTP Service Layer
Implement automatic retry in `src/services/http.ts` `fetchJson()` for timeouts, connection failures, 5xx responses and HTTP 408. Use at most 3 total attempts with minimum backoffs of 100ms and 200ms after the first and second failures. Do not retry other 4xx responses, including 429. Cancellation interrupts backoff. When attempts are exhausted, preserve the final classified network error code and record retry exhaustion in its context.

Every Scryfall HTTP attempt, including a retry or background refresh attempt, must pass through the global request-start pacing and cooldown policy: starts are at least 150ms apart, and a 429 blocks subsequent starts during cooldown. Service pacing may extend the HTTP backoff. Queue waits and backoff remain cancellable, and a draw's deadline continues to apply while waiting.

Count each actual HTTP attempt belonging to a draw or follow-up workflow against its shared 24-call budget, including retries and both requests in a ranked lookup. Do not also charge the existing ranked-request reservations. Cache hits and attempts cancelled before starting consume no calls. If the budget or deadline prevents another attempt, stop the workflow with the corresponding reason instead of reporting retry exhaustion. A stale-cache background refresh is a separate operation outside the originating draw's budget and deadline; it still obeys Scryfall pacing, cooldown, and the HTTP attempt limit.

**Rationale:** Network errors are transient; retrying at the HTTP layer is transparent to callers. Backoff avoids overwhelming the server.

**Alternatives considered:**
- Retry at each service level (scryfall, edhrec): duplicates logic; inconsistent backoff
- Caller-driven retry: requires each call site to implement retry; verbose

### Decision: Error State in Pinia Store
Add a `lastError` property to `randomanderStore` (Pinia) to track the last error and recovery hints. Include `clearError()` and `retryLastOperation()` actions. Persist the error and a validated, serializable descriptor containing the operation type and inputs needed to retry draw, partner/choice, and storage operations. Restore and validate the descriptor before offering retry after reload; do not offer a retry that cannot reproduce the failed operation.

Write the recovery record to localStorage under `randomander:state:v3:error` first; if that fails, use IndexedDB. If both fail, retain the record in memory and notify the user that recovery across reloads is unavailable. On successful recovery or dismissal, clear persisted copies from both backends so an older error cannot reappear; report cleanup failures rather than silently claiming durable clearance. A failed recovery retains the error or replaces it with the new failure and its retryable operation.

For storage operations, the descriptor also records a validated baseline for each affected target, including any known partial effects of the failed operation. Before replay, verify that the current targets still match that baseline. Coordinate the check and replay with other app-tab writes so a concurrent change cannot be overwritten between them. If a target has changed, its baseline cannot be verified, or safe coordination is unavailable, stop without applying the retry, preserve the current data and recovery state, and explain the conflict. The user may initiate a fresh operation against the current data.

All app-tab writes to recovery targets must participate in the same coordination. When coordination is unavailable, block those persistent writes and warn the user; otherwise an uncoordinated tab could race a recovery in another tab. In-memory use may continue. Recovery-record persistence remains separate and can still use its IndexedDB fallback.

Preferences should be queued for coordinated persistence immediately rather than waiting for the former debounce, with a warning while writes are pending. A page may still terminate before an asynchronous lock is acquired; no successful save should be reported until the write completes.

**Rationale:** UI needs access to current error state for display; persistence allows recovery across reloads. Centralizing in Pinia keeps state consistent.

**Alternatives considered:**
- Global variable or React context: not applicable (Vue 3/Pinia); less integrated with app state
- Emit error events: harder to query current error state; event-driven recovery is complex

### Decision: Cache Fallback on Validation Error
When JSON validation fails on fresh API data, check the previously successful cache entry, including an expired entry, and validate it before use. If valid cached data exists, return it with provenance, log the validation failure, show a stale-data warning, and queue one background refresh; if no valid entry exists, surface the validation error. Clearing the cache must prevent an outstanding refresh from restoring cleared data.

**Rationale:** Users tolerate slightly stale data better than a broken app; background refresh keeps data fresh.

**Alternatives considered:**
- Fail immediately on validation error: poor UX; no recovery path
- Automatically clear cache and retry: could retry indefinitely on bad API responses; wasteful

### Decision: Structured Logging to Memory Buffer + Console
Emit error logs (JSON format) to both console and an in-memory buffer. Buffer holds last 50 errors; oldest entries are discarded. Developers can export logs via console API or future debug panel.

**Rationale:** Console logs are visible during development; in-memory buffer persists across page content changes (useful for diagnosing issues that happen during navigation).

**Alternatives considered:**
- IndexedDB log storage: overkill for 50 errors; IndexedDB is used only as a fallback for the recovery record
- Cloud logging: out of scope; privacy concern
- Console only: not persisted; lost on page navigation

### Decision: Operation and Request ID Correlation
Generate an operation ID for each user operation and a distinct request ID for each HTTP attempt. Propagate the operation ID across its requests and retries, and include both identifiers in related logs and error context. Send request identifiers in headers where supported.

**Rationale:** Developers can trace a complete operation across attempts while distinguishing individual HTTP requests.

**Alternatives considered:**
- Use timestamp + URL as ID: not unique; two simultaneous requests to same URL collide
- No ID at all: harder to correlate errors from same request across logs

### Decision: Recovery Actions are Store Actions
Implement recovery actions (`retry`, `clearCache`, `resetState`, etc.) as Pinia store actions. Each action knows how to undo its corresponding error. Calling code invokes store actions, not error methods directly.

**Rationale:** Keeps recovery logic centralized in state management; UI can dispatch actions without knowing error details.

## Risks / Trade-offs

**[Risk]** Retry backoff and upstream pacing may delay user action if network is intermittently down.
→ **Mitigation:** Use short minimum backoffs, respect the workflow deadline, and show loading state so users know the operation is retrying. If retries fail, surface the error.

**[Risk]** Cache fallback returns stale data, potentially hiding real API issues.
→ **Mitigation:** Always queue a background refresh and surface a warning badge to users ("Showing cached data"). Log validation error for diagnostics.

**[Risk]** In-memory error buffer is lost on page reload (design intent, but means no persistent error history).
→ **Mitigation:** Persist the last error and recovery descriptor using localStorage or the IndexedDB fallback; app can display it on next load. Full history is not needed for recovery.

**[Risk]** Both recovery persistence backends can be unavailable or full.
→ **Mitigation:** Retain the current recovery state in memory and explicitly warn that it cannot be restored after reload.

**[Risk]** Retrying an old storage operation could delete or overwrite newer data.
→ **Mitigation:** Validate target baselines and coordinate with app-tab writes; refuse unsafe replay and report the conflict.

## Open Questions

1. Should error messages be internationalized (i18n) or English-only initially? → Deferred to implementation; MVP can be English-only.
2. Should error UI include a "Report Issue" button linking to GitHub issues? → Deferred; not in specs; can add in future.
3. Should recovery actions (retry, clear cache) be queued if error occurs during another recovery? → Treat as independent actions; ignore concurrent recovery attempts (spec allows this).

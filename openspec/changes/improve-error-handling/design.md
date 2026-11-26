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
- Persist error state to localStorage for recovery across reloads
- Emit structured logs (console, in-memory buffer) with full context for developer diagnostics
- Extend HTTP service with retry logic and timeout standardization
- Update cache decode/encode to classify cache errors explicitly
- Update validation functions to throw or return classified errors with field context

**Non-Goals:**
- Implement browser-side error reporting to external services (e.g., Sentry) — logging stays local
- Build a UI for error history or error analytics — only last error is tracked
- Add HTTP circuit breaker or complex fallback policies — simple retry/cache-fallback only
- Modify persisted state storage beyond persisting last error state
- Change Scryfall or EDHREC API contract or add caching layers beyond existing cache

## Decisions

### Decision: Unified Error Class Hierarchy
Create an `AppError` base class (extends `Error`) with subclasses for each error type. Each error includes: `type` (network|validation|storage|cache), `code` (specific code like `timeout`, `quota-exceeded`), `message`, `metadata` (structured context), `recoveryHints` (array of applicable recovery actions), `timestamp`, `sourceId` (URL, field name, etc.), `requestId` (for correlation).

**Rationale:** Allows type-safe error handling in calling code and consistent serialization for logging.

**Alternatives considered:**
- Use error codes only (e.g., `E001`, `E002`): requires separate error message lookup table; less type-safe
- Extend each built-in error type (TypeError, etc.): pollutes Error semantics; harder to track metadata

### Decision: Retry at HTTP Service Layer
Implement automatic retry in `src/services/http.ts` `fetchJson()` for network errors (timeout, non-5xx errors like 503, connection refused). Retry logic: 3 attempts, exponential backoff (100ms, 200ms, 400ms). Do NOT retry on 4xx (client errors) except 408 (timeout).

**Rationale:** Network errors are transient; retrying at the HTTP layer is transparent to callers. Backoff avoids overwhelming the server.

**Alternatives considered:**
- Retry at each service level (scryfall, edhrec): duplicates logic; inconsistent backoff
- Caller-driven retry: requires each call site to implement retry; verbose

### Decision: Error State in Pinia Store
Add an `lastError` property to `randomanderStore` (Pinia) to track the last error and recovery hints. Include a `clearError()` and `retryLastOperation()` action. Persist last error to localStorage under `randomander:state:v3:error`.

**Rationale:** UI needs access to current error state for display; persistence allows recovery across reloads. Centralizing in Pinia keeps state consistent.

**Alternatives considered:**
- Global variable or React context: not applicable (Vue 3/Pinia); less integrated with app state
- Emit error events: harder to query current error state; event-driven recovery is complex

### Decision: Cache Fallback on Validation Error
When JSON validation fails on fresh API data, check cache for valid data from previous fetch. If cache hit, return cached data and queue a background refresh; if cache miss, surface validation error.

**Rationale:** Users tolerate slightly stale data better than a broken app; background refresh keeps data fresh.

**Alternatives considered:**
- Fail immediately on validation error: poor UX; no recovery path
- Automatically clear cache and retry: could retry indefinitely on bad API responses; wasteful

### Decision: Structured Logging to Memory Buffer + Console
Emit error logs (JSON format) to both console and an in-memory buffer. Buffer holds last 50 errors; oldest entries are discarded. Developers can export logs via console API or future debug panel.

**Rationale:** Console logs are visible during development; in-memory buffer persists across page content changes (useful for diagnosing issues that happen during navigation).

**Alternatives considered:**
- IndexedDB storage: overkill for 50 errors; adds complexity
- Cloud logging: out of scope; privacy concern
- Console only: not persisted; lost on page navigation

### Decision: Request ID Correlation
Generate a UUID for each HTTP request. Store it in request headers and include it in all related error logs. This enables tracing a single user request through multiple API calls and error events.

**Rationale:** Developers can grep logs by request ID to understand what happened to a specific API call.

**Alternatives considered:**
- Use timestamp + URL as ID: not unique; two simultaneous requests to same URL collide
- No ID at all: harder to correlate errors from same request across logs

### Decision: Recovery Actions are Store Actions
Implement recovery actions (`retry`, `clearCache`, `resetState`, etc.) as Pinia store actions. Each action knows how to undo its corresponding error. Calling code invokes store actions, not error methods directly.

**Rationale:** Keeps recovery logic centralized in state management; UI can dispatch actions without knowing error details.

## Risks / Trade-offs

**[Risk]** Retry backoff may delay user action if network is intermittently down.
→ **Mitigation:** Use short initial delay (100ms) and fast backoff; show loading state so users know operation is retrying. If retries fail, surface error immediately.

**[Risk]** Cache fallback returns stale data, potentially hiding real API issues.
→ **Mitigation:** Always queue a background refresh and surface a warning badge to users ("Showing cached data"). Log validation error for diagnostics.

**[Risk]** In-memory error buffer is lost on page reload (design intent, but means no persistent error history).
→ **Mitigation:** Persist last error to localStorage; app can display it on next load. Full history is not needed for recovery.

**[Risk]** Request ID correlation only works for single-request operations; multi-request workflows (e.g., fetch card then fetch EDHREC data) need separate IDs.
→ **Mitigation:** Accept this limitation for initial release. Future work can add operation/session IDs if needed.

## Open Questions

1. Should error messages be internationalized (i18n) or English-only initially? → Deferred to implementation; MVP can be English-only.
2. Should error UI include a "Report Issue" button linking to GitHub issues? → Deferred; not in specs; can add in future.
3. Should recovery actions (retry, clear cache) be queued if error occurs during another recovery? → Treat as independent actions; ignore concurrent recovery attempts (spec allows this).

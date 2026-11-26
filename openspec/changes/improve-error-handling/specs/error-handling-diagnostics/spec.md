# Spec Delta

## Purpose

Provides structured logging and error context for developers to diagnose failures, trace error sources, and understand system behavior during troubleshooting and debugging.

## ADDED Requirements

### Requirement: Errors emit structured logs with full context
When an error occurs, the system SHALL emit a structured log entry (console or storage) containing: timestamp, error type, source, code, message, metadata, stack trace, and recovery hints. Logs SHALL be JSON-serializable for aggregation and analysis.

#### Scenario: Network error is logged with request details
- **WHEN** an HTTP request fails
- **THEN** a log entry includes timestamp, `type: network`, source URL, HTTP method, status code (if available), response headers, and stack trace

#### Scenario: Validation error is logged with data context
- **WHEN** JSON validation fails
- **THEN** a log entry includes timestamp, `type: validation`, source identifier (e.g., `scryfall`), field name, expected schema, actual value, and stack trace

#### Scenario: Storage error is logged with quota context
- **WHEN** localStorage.setItem fails
- **THEN** a log entry includes timestamp, `type: storage`, code `quota-exceeded`, current usage, quota limit, and stack trace

### Requirement: Error logs are retained in-session
The system SHALL retain error logs (last 50 errors) in memory during the current session. Logs are cleared on page reload or when user invokes `clear-cache` recovery action. Developers MAY export error logs for offline analysis.

#### Scenario: Error log accumulates during session
- **WHEN** errors occur throughout a session
- **THEN** each error is added to the in-session log; oldest entries are discarded when count exceeds 50

#### Scenario: Logs are cleared on cache clear
- **WHEN** user invokes recovery action `clear-cache`
- **THEN** in-session error logs are also cleared

#### Scenario: Logs can be exported by developer
- **WHEN** developer invokes export (via console API or debug panel, if present)
- **THEN** error logs are formatted as JSON and can be copied or downloaded

### Requirement: Error logs include breadcrumb context
Each error log entry SHALL reference the previous 5 operations (breadcrumbs): operation name, timestamp, and outcome (success/failure). This helps developers understand what preceded the error.

#### Scenario: Breadcrumbs trace operation sequence
- **WHEN** an error occurs after several successful operations
- **THEN** the error log includes breadcrumbs: "fetch scryfall card → cache write → fetch edhrec → validation error ← current"

### Requirement: Errors are tagged with request/trace IDs for correlation
Each HTTP request SHALL receive a unique request ID (UUID or sequence). Errors from that request (validation, timeout, etc.) SHALL reference the request ID, enabling end-to-end tracing across logs.

#### Scenario: Multiple errors from same request are correlated
- **WHEN** an HTTP request fails and generates network, validation, and cache errors
- **THEN** all three errors share the same request ID, linkable in logs

#### Scenario: Retry attempt has new request ID
- **WHEN** a request is retried
- **THEN** the retry generates a new request ID distinct from the original
